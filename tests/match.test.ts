import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, type BallState } from '../src/game/ball';
import { createContactMemory } from '../src/game/contact';
import { createMatch, POINT_RESULT_DELAY, READY_DELAY, startMatch, stepMatch } from '../src/game/match';
import { FIXED_STEP, createPlayerState, type MovementInput } from '../src/game/movement';
import { createRivalPlayer } from '../src/game/opponent';
import { COURT, PLAYER_START, RIVAL_START } from '../src/game/court';

const idle: MovementInput = { left: false, right: false, forward: false, backward: false };

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

function startRally() {
  const match = createMatch();
  const player = createPlayerState();
  const rival = createRivalPlayer();
  startMatch(match, player, rival);
  stepMatch(match, player, rival, idle, false, READY_DELAY + FIXED_STEP);
  expect(match.phase).toBe('rally');
  return { match, player, rival };
}

function causeFault(
  match: ReturnType<typeof createMatch>,
  player: ReturnType<typeof createPlayerState>,
  rival: ReturnType<typeof createRivalPlayer>,
  result: 'Net' | 'Out' | 'Second bounce',
): void {
  const ball = result === 'Net'
    ? makeBall({
      position: { x: 0, y: 1, z: 0.5 },
      previousPosition: { x: 0, y: 1, z: 0.5 },
      velocity: { x: 0, y: 0, z: -100 },
      receiver: 'player',
    })
    : result === 'Out'
      ? makeBall({
        position: { x: 5.5, y: BALL_RADIUS + 0.01, z: -4 },
        previousPosition: { x: 5.5, y: BALL_RADIUS + 0.01, z: -4 },
        velocity: { x: 0, y: -5, z: 0 },
        receiver: 'rival',
      })
      : makeBall({
        position: { x: 0, y: BALL_RADIUS, z: 4 },
        previousPosition: { x: 0, y: BALL_RADIUS, z: 4 },
        velocity: { x: 0, y: 0, z: 0 },
        receiver: 'player',
        bounces: 1,
      });
  match.phase = 'rally';
  match.rally.phase = 'playing';
  match.rally.time = 1;
  match.rally.nextServe = 99;
  match.rally.ball = ball;
  stepMatch(match, player, rival, idle, false, FIXED_STEP);
}

describe('first-to-five match lifecycle', () => {
  it('starts ready with a rival serve and receives it on the player half', () => {
    const match = createMatch();
    const player = createPlayerState();
    const rival = createRivalPlayer();
    player.position = { x: 3, z: 2 };
    player.previousPosition = { x: 2, z: 1 };
    rival.position = { x: 2, z: -2 };
    rival.previousPosition = { x: 1, z: -1 };

    startMatch(match, player, rival);
    expect(match.phase).toBe('ready');
    expect(match.server).toBe('rival');
    expect(match.score).toEqual({ player: 0, rival: 0 });
    expect(player.position).toEqual(PLAYER_START);
    expect(player.previousPosition).toEqual(player.position);
    expect(rival.position).toEqual(RIVAL_START);
    expect(rival.previousPosition).toEqual(rival.position);

    stepMatch(match, player, rival, idle, false, READY_DELAY + FIXED_STEP);
    expect(match.phase).toBe('rally');
    expect(match.runServes).toBe(1);
    expect(match.rally.ball?.receiver).toBe('player');
    expect(match.rally.ball?.position.z).toBeLessThan(0);
    expect(match.rally.serves).toBe(1);
  });

  it('maps net, first landing out, and second bounce to the proper point winner once', () => {
    const net = startRally();
    causeFault(net.match, net.player, net.rival, 'Net');
    expect(net.match.score).toEqual({ player: 1, rival: 0 });
    expect(net.match.pointWinner).toBe('player');
    expect(net.match.result).toBe('Net');
    expect(net.match.terminalResolutions).toBe(1);
    stepMatch(net.match, net.player, net.rival, idle, false, FIXED_STEP * 4);
    expect(net.match.score).toEqual({ player: 1, rival: 0 });
    expect(net.match.terminalResolutions).toBe(1);

    const out = startRally();
    causeFault(out.match, out.player, out.rival, 'Out');
    expect(out.match.score).toEqual({ player: 0, rival: 1 });
    expect(out.match.result).toBe('Out');

    const bounce = startRally();
    causeFault(bounce.match, bounce.player, bounce.rival, 'Second bounce');
    expect(bounce.match.score).toEqual({ player: 0, rival: 1 });
    expect(bounce.match.pointWinner).toBe('rival');
    expect(bounce.match.result).toBe('Second bounce');
  });

  it('counts a court-line landing in without awarding a point', () => {
    const { match, player, rival } = startRally();
    match.rally.ball = makeBall({
      position: { x: COURT.maxX, y: BALL_RADIUS + 0.01, z: COURT.playerEndZ },
      previousPosition: { x: COURT.maxX, y: BALL_RADIUS + 0.01, z: COURT.playerEndZ },
      velocity: { x: 0, y: -5, z: 0 },
      receiver: 'player',
    });
    stepMatch(match, player, rival, idle, false, 0.005);
    expect(match.phase).toBe('rally');
    expect(match.rally.ball?.bounces).toBe(1);
    expect(match.score).toEqual({ player: 0, rival: 0 });
  });

  it('has no win-by-two and stops after either side reaches five', () => {
    const playerWin = startRally();
    playerWin.match.score.player = 4;
    playerWin.match.score.rival = 4;
    causeFault(playerWin.match, playerWin.player, playerWin.rival, 'Net');
    expect(playerWin.match.score.player).toBe(5);
    expect(playerWin.match.phase).toBe('point_result');
    stepMatch(playerWin.match, playerWin.player, playerWin.rival, idle, false, POINT_RESULT_DELAY + FIXED_STEP);
    expect(playerWin.match.phase).toBe('match_result');
    expect(playerWin.match.winner).toBe('player');
    const servesAtEnd = playerWin.match.runServes;
    stepMatch(playerWin.match, playerWin.player, playerWin.rival, idle, false, 20);
    expect(playerWin.match.runServes).toBe(servesAtEnd);
    expect(playerWin.match.phase).toBe('match_result');

    const rivalWin = startRally();
    rivalWin.match.score.player = 3;
    rivalWin.match.score.rival = 4;
    causeFault(rivalWin.match, rivalWin.player, rivalWin.rival, 'Out');
    stepMatch(rivalWin.match, rivalWin.player, rivalWin.rival, idle, false, POINT_RESULT_DELAY + FIXED_STEP);
    expect(rivalWin.match.score.rival).toBe(5);
    expect(rivalWin.match.winner).toBe('rival');
    expect(rivalWin.match.phase).toBe('match_result');
  });

  it('gives the next serve to the point loser and resets only point state at the boundary', () => {
    const { match, player, rival } = startRally();
    causeFault(match, player, rival, 'Net');
    player.position = { x: 3, z: 3 };
    player.previousPosition = { x: 2, z: 2 };
    player.jumpHeight = 0.7;
    player.jumpVelocity = 2;
    player.action = 'jump_header';
    rival.position = { x: 2, z: -2 };
    rival.previousPosition = { x: 1, z: -1 };
    match.rally.contacts.player.contactedFlight = 11;
    match.rally.contacts.player.cooldownUntil = 12;
    match.rally.contacts.rival.contactedFlight = 12;
    match.rally.contacts.rival.cooldownUntil = 13;

    stepMatch(match, player, rival, idle, false, POINT_RESULT_DELAY + FIXED_STEP);
    expect(match.phase).toBe('ready');
    expect(match.server).toBe('rival');
    expect(match.delay).toBe(READY_DELAY);
    expect(match.score.player).toBe(1);
    expect(player.position).toEqual(PLAYER_START);
    expect(player.previousPosition).toEqual(player.position);
    expect(player.jumpHeight).toBe(0);
    expect(player.jumpVelocity).toBe(0);
    expect(player.action).toBe('idle');
    expect(rival.position).toEqual(RIVAL_START);
    expect(rival.previousPosition).toEqual(rival.position);

    stepMatch(match, player, rival, idle, false, READY_DELAY + FIXED_STEP);
    expect(match.phase).toBe('rally');
    expect(match.server).toBe('rival');
    expect(match.runServes).toBe(2);
    expect(match.rally.ball?.receiver).toBe('player');
    expect(match.rally.contacts.player).toEqual(createContactMemory());
    expect(match.rally.contacts.rival).toEqual(createContactMemory());
    expect(match.score).toEqual({ player: 1, rival: 0 });

    const rivalPoint = startRally();
    causeFault(rivalPoint.match, rivalPoint.player, rivalPoint.rival, 'Out');
    stepMatch(rivalPoint.match, rivalPoint.player, rivalPoint.rival, idle, false, POINT_RESULT_DELAY + FIXED_STEP);
    expect(rivalPoint.match.server).toBe('player');
    stepMatch(rivalPoint.match, rivalPoint.player, rivalPoint.rival, idle, false, READY_DELAY + FIXED_STEP);
    expect(rivalPoint.match.rally.ball?.receiver).toBe('rival');
    expect(rivalPoint.match.rally.ball?.position.z).toBeGreaterThan(0);
  });

  it('rematch clears score, run counters and contact state, restoring the rival opening serve', () => {
    const { match, player, rival } = startRally();
    match.score.player = 3;
    match.score.rival = 4;
    match.pointSequence = 7;
    match.runServes = 7;
    match.terminalResolutions = 7;
    match.rally.contacts.player.contactedFlight = 99;
    match.rally.contacts.rival.cooldownUntil = 88;
    startMatch(match, player, rival);

    expect(match.phase).toBe('ready');
    expect(match.score).toEqual({ player: 0, rival: 0 });
    expect(match.pointSequence).toBe(0);
    expect(match.runServes).toBe(0);
    expect(match.terminalResolutions).toBe(0);
    expect(match.server).toBe('rival');
    expect(match.rally.ball).toBeUndefined();
    stepMatch(match, player, rival, idle, false, READY_DELAY + FIXED_STEP);
    expect(match.rally.ball?.receiver).toBe('player');
    expect(match.rally.contacts.player).toEqual(createContactMemory());
    expect(match.rally.contacts.rival).toEqual(createContactMemory());
  });

  it('does not score a practice-only Returned result and carries serve counts across rallies', () => {
    const returned = startRally();
    returned.match.rally.phase = 'result';
    returned.match.rally.result = 'Returned';
    returned.match.rally.winner = 'player';
    returned.match.rally.nextServe = Number.POSITIVE_INFINITY;
    stepMatch(returned.match, returned.player, returned.rival, idle, false, FIXED_STEP);
    expect(returned.match.score).toEqual({ player: 0, rival: 0 });
    expect(returned.match.terminalResolutions).toBe(0);

    const run = startRally();
    for (let point = 0; point < 3; point += 1) {
      causeFault(run.match, run.player, run.rival, 'Net');
      stepMatch(run.match, run.player, run.rival, idle, false, POINT_RESULT_DELAY + FIXED_STEP);
      stepMatch(run.match, run.player, run.rival, idle, false, READY_DELAY + FIXED_STEP);
    }
    expect(run.match.runServes).toBe(4);
    expect(run.match.rally.serves).toBe(4);
    expect(run.match.pointSequence).toBe(4);
  });

  it('holds ready and point-result timers when given no simulation time', () => {
    const ready = createMatch();
    startMatch(ready, createPlayerState(), createRivalPlayer());
    const readyDelay = ready.delay;
    stepMatch(ready, createPlayerState(), createRivalPlayer(), idle, false, 0);
    expect(ready.phase).toBe('ready');
    expect(ready.delay).toBe(readyDelay);

    const pointResult = startRally();
    causeFault(pointResult.match, pointResult.player, pointResult.rival, 'Net');
    const delay = pointResult.match.delay;
    stepMatch(pointResult.match, pointResult.player, pointResult.rival, idle, false, 0);
    expect(pointResult.match.phase).toBe('point_result');
    expect(pointResult.match.delay).toBe(delay);
  });
});
