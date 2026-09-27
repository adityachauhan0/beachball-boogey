import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, groundTime, NET_HALF_DEPTH, NET_TOP, positionAt, stepBall, type BallState } from '../src/game/ball';
import { createContactMemory, tryContact, type ShotQuality } from '../src/game/contact';
import { advanceFeedback, classifyShot, clearPointFeedback, createFeedback, drainFeedback, emitFeedback, tryPlayerShot, updateTiming } from '../src/game/feedback';
import { clearRallyKick, createRally, stepRally } from '../src/game/rally';
import { createMatch, startMatch, stepMatch } from '../src/game/match';
import { createPlayerState, FIXED_STEP } from '../src/game/movement';
import { createRivalPlayer, createOpponentState, stepOpponent } from '../src/game/opponent';
import { KeyboardInput } from '../src/input';

const idle = { left: false, right: false, forward: false, backward: false };
function ball(flight = 1): BallState {
  const position = { x: 0, y: 1.2, z: 5.65 };
  return { position, previousPosition: { ...position }, velocity: { x: 0, y: -1, z: 0 }, flight, receiver: 'player', bounces: 0 };
}

describe('timing and charge accounting', () => {
  it('classifies both inclusive ±50ms boundaries and early/late presses', () => {
    expect(classifyShot(0, 1.95, 2)).toBe('perfect');
    expect(classifyShot(0, 2.05, 2)).toBe('perfect');
    expect(classifyShot(0, 1.949, 2)).toBe('regular');
    expect(classifyShot(0, 2.051, 2)).toBe('regular');
    expect(classifyShot(0, 2, undefined)).toBe('regular');
    expect(classifyShot(3, 0, undefined)).toBe('powered');
  });
  it('fixes the reference per incoming trajectory and recalculates on the legal bounce', () => {
    const state = createFeedback(); const incoming = ball();
    incoming.position.y = 2; incoming.velocity.y = -1;
    updateTiming(state, incoming, 4);
    const reference = state.timing!.at!;
    expect(reference).toBeGreaterThan(4);
    stepBall(incoming, 0.1, { completeRivalLanding: false });
    updateTiming(state, incoming, 4.1);
    expect(state.timing!.at).toBe(reference);
    incoming.bounces = 1; incoming.position.y = BALL_RADIUS; incoming.velocity.y = 4.8;
    updateTiming(state, incoming, 5);
    expect(state.timing!.bounce).toBe(1);
    expect(state.timing!.at).toBeGreaterThan(5.6);
  });
  it('third perfect fills and the fourth valid shot spends without awarding again', () => {
    const state = createFeedback(); const memory = createContactMemory();
    for (let i = 0; i < 3; i++) {
      state.requestTime = i;
      expect(tryPlayerShot(state, ball(i + 1), { x: 0, z: 5.65 }, { x: 0, z: -5 }, i, memory)).toBe(true);
      expect(state.quality).toBe('perfect'); expect(state.charge).toBe(i + 1);
    }
    state.requestTime = 3;
    expect(tryPlayerShot(state, ball(4), { x: 0, z: 5.65 }, { x: 0, z: -5 }, 3, memory)).toBe(true);
    expect(state.charge).toBe(0); expect(state.quality).toBe('powered'); expect(state.poseRemaining).toBe(0.55);
    expect(drainFeedback(state).map(e => e.quality)).toEqual(['perfect', 'perfect', 'perfect', 'powered']);
    expect(drainFeedback(state)).toEqual([]);
  });
  it('invalid height/side/radius and repeated incoming flight neither spend nor reward', () => {
    const state = createFeedback(); state.charge = 3; state.requestTime = 0;
    for (const bad of [ball(), { ...ball(), receiver: 'rival' as const }, { ...ball(), position: { x: 0, y: 3, z: 5.65 } }]) {
      expect(tryPlayerShot(state, bad, { x: 4, z: 5.65 }, { x: 0, z: -5 }, 0, createContactMemory())).toBe(false);
      expect(state.charge).toBe(3); expect(state.sequence).toBe(0);
    }
    const memory = createContactMemory(); memory.contactedFlight = 1;
    expect(tryPlayerShot(state, ball(), { x: 0, z: 5.65 }, { x: 0, z: -5 }, 1, memory)).toBe(false);
    expect(state.charge).toBe(3);
  });
  it('keeps early buffered press timing and discards expired inputs', () => {
    const player = createPlayerState(); const rival = createRivalPlayer();
    const rally = createRally(); rally.phase = 'playing'; rally.nextServe = Infinity;
    rally.ball = ball(); rally.ball.position.y = 1.38;
    rally.ball.velocity.y = -1;
    player.position.z = 6.62; // initially outside radius; approach during buffer
    stepRally(rally, player, rival, idle, { time: -0.12 }, FIXED_STEP);
    expect(rally.contactCount).toBe(0);
    player.position.z = 5.65;
    stepRally(rally, player, rival, idle, false, FIXED_STEP);
    expect(rally.contactCount).toBe(1); expect(rally.feedback.quality).toBe('regular'); expect(rally.feedback.charge).toBe(0);
    const expired = createRally(); expired.phase = 'playing'; expired.nextServe = Infinity; expired.ball = ball();
    stepRally(expired, player, rival, idle, { time: -0.2 }, FIXED_STEP);
    expect(expired.contactCount).toBe(0); expect(expired.feedback.requestTime).toBeUndefined();
  });
  it('preserves F kick time, maps Space to jump and E to header, and ignores held/repeated edges', () => {
    const keyboard = new KeyboardInput(); keyboard.keyDown('KeyF', false, 2);
    keyboard.keyDown('KeyF', true, 3);
    expect(keyboard.takeTimedKick(3)).toEqual({ time: 2 });
    expect(keyboard.takeTimedKick(4)).toBe(false);
    keyboard.keyDown('Space', false, 4); expect(keyboard.takeTimedJump(4)).toEqual({ time: 4 });
    keyboard.keyDown('KeyE', false, 5); expect(keyboard.takeTimedHeader(5)).toEqual({ time: 5 });
    keyboard.clear(); expect(keyboard.takeTimedKick(6)).toBe(false); expect(keyboard.takeTimedJump(6)).toBe(false);
  });
  it('buffers mouse kick and header requests through the same timed action path', () => {
    const input = new KeyboardInput();
    input.requestKick(1.25);
    input.requestHeader(1.5);
    expect(input.takeTimedKick(2)).toEqual({ time: 1.25 });
    expect(input.takeTimedHeader(2)).toEqual({ time: 1.5 });
    expect(input.takeTimedKick(2)).toBe(false);
    expect(input.takeTimedHeader(2)).toBe(false);
  });
  it('pause clears only the pending request and zero time freezes visual state', () => {
    const rally = createRally(); rally.feedback.charge = 2; rally.feedback.poseRemaining = 0.4; rally.feedback.cueRemaining = 0.6;
    rally.feedback.requestTime = 2; rally.kickUntil = 2.18; rally.contacts.player.contactedFlight = 7;
    clearRallyKick(rally); advanceFeedback(rally.feedback, 0);
    expect(rally.feedback.requestTime).toBeUndefined(); expect(rally.feedback.charge).toBe(2);
    expect(rally.contacts.player.contactedFlight).toBe(7); expect(rally.feedback.poseRemaining).toBe(0.4); expect(rally.feedback.cueRemaining).toBe(0.6);
  });
  it('point transitions preserve charge while full reset clears all run feedback', () => {
    const match = createMatch(); const player = createPlayerState(); const rival = createRivalPlayer();
    startMatch(match, player, rival); stepMatch(match, player, rival, idle, false, 0.36);
    match.feedback.charge = 3; match.rally.ball = ball(); match.rally.ball.bounces = 1;
    match.rally.ball.position.y = BALL_RADIUS; match.rally.ball.velocity.y = 0;
    stepMatch(match, player, rival, idle, false, FIXED_STEP);
    expect(match.phase).toBe('point_result'); expect(match.feedback.charge).toBe(3);
    const event = drainFeedback(match.feedback).filter(e => e.type === 'point'); expect(event).toHaveLength(1);
    stepMatch(match, player, rival, idle, false, 1.1); stepMatch(match, player, rival, idle, false, 0.36);
    expect(match.rally.feedback).toBe(match.feedback); expect(match.feedback.charge).toBe(3);
    expect(drainFeedback(match.feedback).filter(e => e.type === 'serve')[0].sequence).toBeGreaterThan(event[0].sequence);
    startMatch(match, player, rival);
    expect(match.feedback).toEqual(createFeedback()); expect(match.rally.feedback).toBe(match.feedback);
  });
});

describe('shot trajectories and explicit events', () => {
  it('all qualities clear the slab and land at mirrored left/right/deep/short/neutral targets, with actual speed differences', () => {
    for (const side of ['player', 'rival'] as const) for (const height of [0.35, 1.2, 2.8]) for (const depth of [0.62, 5.65, 7.22]) for (const x of [-3, 0, 3]) for (const z of [3.2, 5, 6.8]) {
      const orientation = side === 'player' ? 1 : -1;
      const durations: number[] = [];
      for (const quality of ['regular', 'perfect', 'powered'] as ShotQuality[]) {
        const incoming = ball(); incoming.receiver = side; incoming.position = { x: 0, y: height, z: orientation * depth };
        const start = { ...incoming.position }; const target = { x, z: -orientation * z };
        expect(tryContact(incoming, side, { x: 0, z: start.z }, target, 0, createContactMemory(), quality)).toBe(true);
        const duration = groundTime(start, incoming.velocity); durations.push(duration);
        const landing = positionAt(start, incoming.velocity, duration);
        expect(landing.x).toBeCloseTo(x); expect(landing.z).toBeCloseTo(target.z);
        for (const edge of [-NET_HALF_DEPTH - BALL_RADIUS, NET_HALF_DEPTH + BALL_RADIUS]) {
          const crossing = (edge - start.z) / incoming.velocity.z;
          expect(positionAt(start, incoming.velocity, crossing).y - BALL_RADIUS).toBeGreaterThan(NET_TOP);
        }
      }
      expect(durations[1]).toBeLessThan(durations[0]); expect(durations[2]).toBeLessThan(durations[1]);
    }
  });
  it('a positioned rival returns a powered neutral shot with the unmodified shared controller', () => {
    const incoming = ball(); incoming.position.y = 1.2;
    expect(tryContact(incoming, 'player', { x: 0, z: 5.65 }, { x: 0, z: -5 }, 0, createContactMemory(), 'powered')).toBe(true);
    const rival = createRivalPlayer(); const opponent = createOpponentState(); const memory = createContactMemory();
    let returned = false;
    for (let i = 0; i < 150; i++) {
      if (stepOpponent(opponent, rival, incoming, { x: 0, z: 5.65 }, i * FIXED_STEP, FIXED_STEP, memory, true)) { returned = true; break; }
      if (stepBall(incoming, FIXED_STEP, { completeRivalLanding: false })) break;
    }
    expect(returned).toBe(true); expect(incoming.receiver).toBe('player'); expect(memory.contactedFlight).toBe(2);
  });
  it('reports both bounces once during catch-up and contact resets do not fabricate bounces', () => {
    const incoming = ball(); incoming.position.y = BALL_RADIUS + 0.001; incoming.velocity.y = -1;
    const bounces: number[] = [];
    expect(stepBall(incoming, 1.4, { completeRivalLanding: false, onBounce: (_, number) => bounces.push(number) })).toBe('Second bounce');
    expect(bounces).toEqual([1, 2]);
    const rally = createRally(); rally.phase = 'playing'; rally.ball = ball(); rally.nextServe = Infinity;
    stepRally(rally, createPlayerState(), createRivalPlayer(), idle, true, FIXED_STEP);
    expect(drainFeedback(rally.feedback).map(e => e.type)).toEqual(['contact']);
  });
  it('events drain once, remain bounded and keep identities after point cleanup', () => {
    const state = createFeedback();
    for (let i = 0; i < 80; i++) emitFeedback(state, { type: 'bounce', position: { x: 0, y: 0, z: 0 }, side: 'player', quality: 'regular', flight: 1 });
    expect(state.events).toHaveLength(64); expect(drainFeedback(state)[0].sequence).toBe(17);
    clearPointFeedback(state);
    emitFeedback(state, { type: 'contact', position: { x: 0, y: 1, z: 5 }, side: 'player', quality: 'regular', flight: 1 });
    expect(drainFeedback(state)[0].sequence).toBe(81); expect(drainFeedback(state)).toEqual([]);
  });
  it('every shot still scores one point and emits one final result with no later serves', () => {
    for (const quality of ['regular', 'perfect', 'powered'] as ShotQuality[]) {
      const match = createMatch(); const player = createPlayerState(); const rival = createRivalPlayer();
      startMatch(match, player, rival); stepMatch(match, player, rival, idle, false, 0.36); drainFeedback(match.feedback);
      match.score.rival = 4; match.feedback.quality = quality;
      match.rally.ball = ball(); match.rally.ball.bounces = 1; match.rally.ball.position.y = BALL_RADIUS; match.rally.ball.velocity.y = 0;
      stepMatch(match, player, rival, idle, false, FIXED_STEP); stepMatch(match, player, rival, idle, false, 1.1);
      const events = drainFeedback(match.feedback); expect(events.filter(e => e.type === 'point')).toHaveLength(1); expect(events.filter(e => e.type === 'match')).toHaveLength(1);
      expect(match.score.rival).toBe(5); stepMatch(match, player, rival, idle, true, 20); expect(drainFeedback(match.feedback)).toEqual([]); expect(match.runServes).toBe(1);
    }
  });
  it('unreachable strike heights give no perfect reference', () => {
    const state = createFeedback(); const incoming = ball(); incoming.position.x = 7;
    updateTiming(state, incoming, 0); expect(state.timing!.at).toBeUndefined();
    incoming.flight++; incoming.position.x = 0; incoming.position.y = 0.4; incoming.velocity.y = -1;
    updateTiming(state, incoming, 0); expect(state.timing!.at).toBeUndefined();
  });
});
