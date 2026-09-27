import { createFeedback, advanceFeedback, clearPointFeedback, emitFeedback, type FeedbackState, type HeaderRequest, type KickRequest } from './feedback';
import { FIXED_STEP, createPlayerState, type MovementInput, type PlayerState, type Vector2 } from './movement';
import { createRally, startRallyServe, stepRally, type RallyState } from './rally';
import { createRivalPlayer } from './opponent';
import { oppositeSide, type Side } from './contact';
import { createShotLearning } from './shot-learning';

export type MatchPhase = 'menu' | 'ready' | 'rally' | 'point_result' | 'match_result';
export type MatchState = {
  feedback: FeedbackState;
  phase: MatchPhase;
  score: Record<Side, number>;
  server: Side;
  pointWinner: Side | undefined;
  winner: Side | undefined;
  result: RallyState['result'];
  delay: number;
  time: number;
  pointSequence: number;
  runServes: number;
  terminalResolutions: number;
  rally: RallyState;
};

export const MATCH_TARGET_SCORE = 5;
export const READY_DELAY = 0.35;
export const POINT_RESULT_DELAY = 1;

export function createMatch(): MatchState {
  const feedback = createFeedback();
  return {
    feedback,
    phase: 'menu',
    score: { player: 0, rival: 0 },
    server: 'rival',
    pointWinner: undefined,
    winner: undefined,
    result: undefined,
    delay: 0,
    time: 0,
    pointSequence: 0,
    runServes: 0,
    terminalResolutions: 0,
    rally: createRally(feedback),
  };
}

function resetActors(player: PlayerState, rival: PlayerState): void {
  const freshPlayer = createPlayerState();
  player.position = { ...freshPlayer.position };
  player.previousPosition = { ...freshPlayer.previousPosition };
  player.facing = { ...freshPlayer.facing };
  player.jumpHeight = freshPlayer.jumpHeight;
  player.previousJumpHeight = 0;
  player.jumpVelocity = freshPlayer.jumpVelocity;
  player.action = freshPlayer.action;

  const freshRival = createRivalPlayer();
  rival.position = { ...freshRival.position };
  rival.previousPosition = { ...freshRival.previousPosition };
  rival.facing = { ...freshRival.facing };
}

/** Begin a clean match. The app may preserve its paused shell around this reset. */
export function startMatch(state: MatchState, player: PlayerState, rival: PlayerState): void {
  state.phase = 'ready';
  state.score.player = 0;
  state.score.rival = 0;
  state.server = 'rival';
  state.pointWinner = undefined;
  state.winner = undefined;
  state.result = undefined;
  state.delay = READY_DELAY;
  state.time = 0;
  state.pointSequence = 0;
  state.runServes = 0;
  state.terminalResolutions = 0;
  state.feedback = createFeedback();
  state.rally = createRally(state.feedback, createShotLearning(state.rally.learning.difficulty));
  resetActors(player, rival);
}

function beginPoint(state: MatchState): void {
  state.rally.serves = state.runServes;
  startRallyServe(state.rally, state.server);
  state.runServes = state.rally.serves;
  state.pointSequence += 1;
  state.pointWinner = undefined;
  state.winner = undefined;
  state.result = undefined;
  state.phase = 'rally';
}

function finishPoint(state: MatchState): void {
  const rallyWinner = state.rally.winner;
  if (state.phase !== 'rally' || !rallyWinner || !state.rally.result || state.rally.result === 'Returned') return;

  emitFeedback(state.feedback, { type: 'point', side: rallyWinner, quality: state.feedback.quality, position: state.rally.ball!.position, flight: state.rally.ball!.flight });
  state.score[rallyWinner] += 1;
  state.terminalResolutions += 1;
  state.pointWinner = rallyWinner;
  state.result = state.rally.result;
  clearPointFeedback(state.feedback);
  state.rally.kickFlash = 0;
  state.phase = 'point_result';
  state.delay = POINT_RESULT_DELAY;
}

function advancePointResult(state: MatchState, player: PlayerState, rival: PlayerState, dt: number): void {
  state.delay = Math.max(0, state.delay - dt);
  if (state.delay > 0) return;

  if (state.score.player >= MATCH_TARGET_SCORE || state.score.rival >= MATCH_TARGET_SCORE) {
    state.winner = state.score.player >= MATCH_TARGET_SCORE ? 'player' : 'rival';
    clearPointFeedback(state.feedback);
    emitFeedback(state.feedback, { type: 'match', side: state.winner, quality: 'regular', position: { x: 0, y: 0, z: 0 }, flight: 0 });
    state.phase = 'match_result';
    return;
  }

  state.server = oppositeSide(state.pointWinner!);
  clearPointFeedback(state.feedback);
  state.rally = createRally(state.feedback, state.rally.learning);
  state.rally.serves = state.runServes;
  resetActors(player, rival);
  state.phase = 'ready';
  state.delay = READY_DELAY;
}

/** Deterministic match controller. Call only from the app's fixed-step, unpaused loop. */
export function stepMatch(
  state: MatchState,
  player: PlayerState,
  rival: PlayerState,
  input: MovementInput,
  kick: KickRequest,
  dt = FIXED_STEP,
  header: HeaderRequest = false,
  aimTarget?: Vector2,
): void {
  if (dt <= 0 || state.phase === 'menu' || state.phase === 'match_result') return;
  state.time += dt;
  if (state.phase !== 'rally') advanceFeedback(state.feedback, dt);

  if (state.phase === 'ready') {
    state.delay = Math.max(0, state.delay - dt);
    if (state.delay === 0) beginPoint(state);
    return;
  }

  if (state.phase === 'point_result') {
    advancePointResult(state, player, rival, dt);
    return;
  }

  stepRally(state.rally, player, rival, input, kick, dt, header, aimTarget);
  if (state.rally.phase === 'result') finishPoint(state);
}
