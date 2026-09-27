import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, predictLanding, stepBall, type BallState } from '../src/game/ball';
import { canContact, createContactMemory, shotTarget, tryContact } from '../src/game/contact';
import { FIXED_STEP, createPlayerState, stepPlayer, type MovementInput, type Vector2 } from '../src/game/movement';
import {
  createOpponentState,
  createRivalPlayer,
  isInsideRivalBounds,
  predictIntercept,
  reactionDelay,
  RIVAL_SPEED,
  stepOpponent,
} from '../src/game/opponent';
import { clearRallyKick, createRally, stepRally } from '../src/game/rally';

const idle: MovementInput = { left: false, right: false, forward: false, backward: false };
const atPlayer = { x: 0, z: 2 };

function makeBall(overrides: Partial<BallState> = {}): BallState {
  const position = { x: 0, y: 1, z: 2 };
  return {
    position,
    previousPosition: { ...position },
    velocity: { x: 0, y: 0, z: 0 },
    receiver: 'player',
    bounces: 0,
    flight: 1,
    ...overrides,
  };
}

function toward(from: Vector2, target: Vector2): MovementInput {
  return {
    left: target.x < from.x - 0.02,
    right: target.x > from.x + 0.02,
    forward: target.z < from.z - 0.02,
    backward: target.z > from.z + 0.02,
  };
}

type ShotPlan = 'neutral' | 'alternating-short-flanks';

/** Closed-loop player policy using only legal movement and the public contact window. */
function playUntilPoint(plan: ShotPlan, maxSeconds = 45) {
  const rally = createRally();
  const player = createPlayerState();
  const rival = createRivalPlayer();
  let playerShots = 0;
  let maxContacts = 0;
  const maxSteps = Math.ceil(maxSeconds / FIXED_STEP);

  for (let i = 0; i < maxSteps; i += 1) {
    const ball = rally.ball;
    const legalContact = !!ball && rally.phase === 'playing' && canContact(
      ball,
      'player',
      player.position,
      rally.time,
      rally.contacts.player,
    );
    let input = idle;
    let kick = false;
    if (ball && rally.phase === 'playing' && ball.receiver === 'player') {
      if (legalContact) {
        if (plan === 'alternating-short-flanks') {
          input = playerShots % 2 === 0
            ? { left: true, right: false, forward: false, backward: true }
            : { left: false, right: true, forward: false, backward: true };
        }
        kick = true;
      } else {
        const landing = predictLanding(ball);
        input = toward(player.position, {
          x: clamp(landing.x, -4.35, 4.35),
          z: clamp(landing.z, 0.62, 7.22),
        });
      }
    }

    const priorFlight = ball?.flight;
    stepPlayer(player, input, FIXED_STEP);
    stepRally(rally, player, rival, input, kick, FIXED_STEP);
    if (priorFlight !== undefined && rally.ball?.flight !== priorFlight && rally.ball?.receiver === 'rival') playerShots += 1;
    maxContacts = Math.max(maxContacts, rally.contactCount);
    if (rally.phase === 'result') return { rally, player, rival, playerShots, maxContacts };
  }
  return { rally, player, rival, playerShots, maxContacts };
}

describe('shared two-sided rally mechanics', () => {
  it('mirrors aim targets and lets each receiver return the newly identified flight', () => {
    const aimedLeftShort = { left: true, right: false, forward: false, backward: true };
    expect(shotTarget(aimedLeftShort, 'player')).toEqual({ x: -3, z: -3.2 });
    expect(shotTarget(aimedLeftShort, 'rival')).toEqual({ x: 3, z: 3.2 });

    const ball = makeBall();
    const playerContact = createContactMemory();
    const rivalContact = createContactMemory();
    expect(tryContact(ball, 'player', atPlayer, { x: -3, z: -3.2 }, 0, playerContact)).toBe(true);
    expect(ball.flight).toBe(2);
    expect(ball.receiver).toBe('rival');
    expect(playerContact.contactedFlight).toBe(1);

    ball.position = { x: 0, y: 1, z: -2 };
    ball.previousPosition = { ...ball.position };
    ball.velocity = { x: 0, y: 1, z: 0 };
    expect(tryContact(ball, 'rival', { x: 0, z: -2 }, { x: 2, z: 5 }, 0, rivalContact)).toBe(true);
    expect(ball.flight).toBe(3);
    expect(ball.receiver).toBe('player');
    expect(rivalContact.contactedFlight).toBe(2);
    expect(tryContact(ball, 'rival', { x: 0, z: -2 }, { x: 2, z: 5 }, 1, rivalContact)).toBe(false);
  });

  it('allows the first valid bounce on either side and only ends on a second bounce', () => {
    const playerSide = makeBall({
      position: { x: 0, y: BALL_RADIUS + 0.01, z: 2 },
      previousPosition: { x: 0, y: BALL_RADIUS + 0.01, z: 2 },
      velocity: { x: 0, y: -5, z: 0 },
    });
    expect(stepBall(playerSide, 0.01, { completeRivalLanding: false })).toBeUndefined();
    expect(playerSide.bounces).toBe(1);

    const rivalSide = makeBall({
      position: { x: 0, y: BALL_RADIUS + 0.01, z: -2 },
      previousPosition: { x: 0, y: BALL_RADIUS + 0.01, z: -2 },
      velocity: { x: 0, y: -5, z: 0 },
      receiver: 'rival',
    });
    expect(stepBall(rivalSide, 0.01, { completeRivalLanding: false })).toBeUndefined();
    expect(rivalSide.bounces).toBe(1);
    expect(stepBall(rivalSide, 1.21, { completeRivalLanding: false })).toBe('Second bounce');
  });

  it('keeps practice-compatible rival landing completion opt-in for rallies', () => {
    const ball = makeBall({
      position: { x: 0, y: BALL_RADIUS + 0.01, z: -2 },
      previousPosition: { x: 0, y: BALL_RADIUS + 0.01, z: -2 },
      velocity: { x: 0, y: -5, z: 0 },
      receiver: 'rival',
    });
    expect(stepBall(ball, 0.01)).toBe('Returned');
    expect(ball.bounces).toBe(1);
  });
});

describe('local rival state machine', () => {
  it('uses a finite deterministic reaction delay and pursues without teleporting or crossing its half', () => {
    const rival = createRivalPlayer();
    const state = createOpponentState();
    const memory = createContactMemory();
    const ball = makeBall({
      position: { x: 3, y: 1.8, z: 0.4 },
      previousPosition: { x: 3, y: 1.8, z: 0.4 },
      velocity: { x: 0, y: 1, z: -5 },
      receiver: 'rival',
      flight: 8,
    });
    const delay = reactionDelay(ball.flight);
    expect(delay).toBeGreaterThanOrEqual(0.28);
    expect(delay).toBeLessThanOrEqual(0.38);
    expect(reactionDelay(ball.flight)).toBe(delay);

    stepOpponent(state, rival, ball, { x: 0, z: 5.65 }, 0, FIXED_STEP, memory, false);
    expect(state.mode).toBe('track');
    expect(state.reactionRemaining).toBeCloseTo(delay);
    const start = { ...rival.position };
    for (let i = 0; i < Math.ceil(delay / FIXED_STEP); i += 1) {
      const previous = { ...rival.position };
      stepOpponent(state, rival, ball, { x: 0, z: 5.65 }, (i + 1) * FIXED_STEP, FIXED_STEP, memory, false);
      expect(isInsideRivalBounds(rival.position)).toBe(true);
      expect(Math.hypot(rival.position.x - previous.x, rival.position.z - previous.z)).toBeLessThanOrEqual(RIVAL_SPEED * FIXED_STEP + 1e-8);
    }
    expect(state.mode).toBe('intercept');
    expect(rival.position).not.toEqual(start);
  });

  it('predicts a reachable strike sample and marks an out-of-reach sample', () => {
    const reachable = makeBall({
      position: { x: 0, y: 1.8, z: -3 },
      previousPosition: { x: 0, y: 1.8, z: -3 },
      velocity: { x: 0, y: 2, z: -1 },
      receiver: 'rival',
    });
    expect(predictIntercept(reachable, { x: 0, z: -3.6 })).toMatchObject({ reachable: true });
    const far = makeBall({
      position: { x: 4, y: 1.4, z: 0.2 },
      previousPosition: { x: 4, y: 1.4, z: 0.2 },
      velocity: { x: 0, y: 0, z: -2 },
      receiver: 'rival',
    });
    const plan = predictIntercept(far, { x: 0, z: -5.6 });
    expect(plan).toBeDefined();
    expect(plan?.reachable).toBe(false);
  });
});

describe('rally lifecycle and playable difficulty', () => {
  it('sustains six neutral contacts with legal player movement', () => {
    const result = playUntilPoint('neutral', 45);
    expect(result.maxContacts).toBeGreaterThanOrEqual(6);
    expect(result.rally.totalContacts).toBeGreaterThanOrEqual(6);
  });

  it('lets alternating short flank placement beat the rival through the real shared controller', () => {
    const result = playUntilPoint('alternating-short-flanks', 45);
    expect(result.rally.phase).toBe('result');
    expect(result.rally.winner).toBe('player');
    expect(result.playerShots).toBeGreaterThanOrEqual(1);
    expect(result.rally.terminalResolutions).toBe(1);
  });

  it('awards a missed player return to the rival once and holds the terminal ball until serve', () => {
    const rally = createRally();
    const player = createPlayerState();
    const rival = createRivalPlayer();
    rally.phase = 'playing';
    rally.time = 1;
    rally.nextServe = 99;
    rally.ball = makeBall({
      position: { x: 0, y: BALL_RADIUS, z: 4 },
      previousPosition: { x: 0, y: BALL_RADIUS, z: 4 },
      velocity: { x: 0, y: 0, z: 0 },
      receiver: 'player',
      bounces: 1,
    });
    stepRally(rally, player, rival, idle, false, FIXED_STEP);
    expect(rally.result).toBe('Second bounce');
    expect(rally.winner).toBe('rival');
    expect(rally.terminalResolutions).toBe(1);
    const stopped = { ...rally.ball!.position };
    stepRally(rally, player, rival, idle, false, 0.2);
    expect(rally.ball!.position).toEqual(stopped);
    expect(rally.terminalResolutions).toBe(1);
  });

  it('awards a net fault to the receiver and restarts with a new flight id', () => {
    const rally = createRally();
    const player = createPlayerState();
    const rival = createRivalPlayer();
    rally.phase = 'playing';
    rally.time = 1;
    rally.nextServe = 99;
    rally.ball = makeBall({
      position: { x: 0, y: 1, z: 0.5 },
      previousPosition: { x: 0, y: 1, z: 0.5 },
      velocity: { x: 0, y: 0, z: -100 },
      receiver: 'player',
    });
    stepRally(rally, player, rival, idle, false, 0.02);
    expect(rally.result).toBe('Net');
    expect(rally.winner).toBe('player');
    const endedFlight = rally.ball!.flight;
    rally.nextServe = rally.time;
    stepRally(rally, player, rival, idle, false, FIXED_STEP);
    expect(rally.phase).toBe('playing');
    expect(rally.ball!.flight).toBeGreaterThan(endedFlight);
    expect(rally.terminalResolutions).toBe(1);
  });

  it('clears pending kicks on pause without clearing contact IDs, and reset starts clean', () => {
    const rally = createRally();
    rally.time = 8;
    rally.kickUntil = 9;
    rally.contacts.player.contactedFlight = 17;
    rally.contacts.player.cooldownUntil = 8.3;
    rally.opponent.mode = 'track';
    rally.opponent.trackedFlight = 18;
    rally.opponent.reactionRemaining = 0.21;
    clearRallyKick(rally);
    expect(rally.kickUntil).toBe(-1);
    expect(rally.time).toBe(8);
    expect(rally.contacts.player.contactedFlight).toBe(17);
    expect(rally.contacts.player.cooldownUntil).toBe(8.3);
    expect(rally.opponent.trackedFlight).toBe(18);
    expect(rally.opponent.reactionRemaining).toBe(0.21);

    const reset = createRally();
    expect(reset.ball).toBeUndefined();
    expect(reset.time).toBe(0);
    expect(reset.contacts.player.contactedFlight).toBe(-1);
    expect(reset.contacts.rival.contactedFlight).toBe(-1);
    expect(reset.opponent.mode).toBe('recover');
    expect(reset.opponent.trackedFlight).toBe(-1);
  });
});

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
