import { createFeedback, advanceFeedback, clearPointFeedback, emitFeedback, tryPlayerShot, updateTiming, type FeedbackState, type HeaderRequest, type KickRequest } from './feedback';
import { predictLanding, safeLaunch, stepBall, type BallResult, type BallState } from './ball';
import { createContactMemory, shotTarget, oppositeSide, type ContactMemory, type Side } from './contact';
import { FIXED_STEP, type MovementInput, type PlayerState, type Vector2 } from './movement';
import { createOpponentState, createRivalPlayer, resetOpponent, stepOpponent, type OpponentState } from './opponent';
import { KICK_BUFFER } from './practice';
import { PLAYER_START, RIVAL_START } from './court';
import { createShotLearning, settleShot, type ShotLearning } from './shot-learning';

export type RallyPhase = 'waiting' | 'playing' | 'result';
export type RallyState = {
  learning: ShotLearning;
  phase: RallyPhase;
  ball: BallState | undefined;
  time: number;
  nextServe: number;
  nextFlight: number;
  serves: number;
  kickUntil: number;
  kickRequestTime: number | undefined;
  headerUntil: number;
  headerRequestTime: number | undefined;
  kickFlash: number;
  contacts: Record<Side, ContactMemory>;
  contactCount: number;
  totalContacts: number;
  result: BallResult | undefined;
  winner: Side | undefined;
  terminalResolutions: number;
  message: string;
  opponent: OpponentState;
  feedback: FeedbackState;
};

const FIRST_SERVE_DELAY = 0.35;
const NEXT_SERVE_DELAY = 0.85;

export function createRally(feedback = createFeedback(), learning = createShotLearning()): RallyState {
  return {
    feedback, learning, phase: 'waiting', ball: undefined, time: 0, nextServe: FIRST_SERVE_DELAY, nextFlight: 0, serves: 0,
    kickUntil: -1, kickRequestTime: undefined, headerUntil: -1, headerRequestTime: undefined, kickFlash: 0,
    contacts: { player: createContactMemory(), rival: createContactMemory() },
    contactCount: 0, totalContacts: 0, result: undefined, winner: undefined, terminalResolutions: 0,
    message: 'Get ready · follow the ring · LMB kick · RMB header', opponent: createOpponentState(),
  };
}

/** Clear only an unconsumed input request; pause must retain timers and flight IDs. */
export function clearRallyKick(state: RallyState): void {
  state.kickUntil = -1;
  state.kickRequestTime = undefined;
  state.headerUntil = -1;
  state.headerRequestTime = undefined;
  state.feedback.requestTime = undefined;
}

export function createRivalForRally(): PlayerState {
  return createRivalPlayer();
}

function serve(state: RallyState, server: Side = 'rival'): void {
  state.learning.pending = undefined;
  const receiver = oppositeSide(server);
  const start = server === 'rival' ? RIVAL_START : PLAYER_START;
  const position = { x: start.x, y: 1.8, z: start.z };
  const target = {
    x: [0, -0.35, 0.35][state.serves % 3],
    z: receiver === 'player' ? PLAYER_START.z : RIVAL_START.z,
  };
  const flight = Math.max(state.nextFlight, state.ball?.flight ?? 0) + 1;
  state.nextFlight = flight;
  state.ball = {
    position,
    previousPosition: { ...position },
    velocity: safeLaunch(position, target, 1.9),
    receiver,
    bounces: 0,
    flight,
  };
  clearPointFeedback(state.feedback);
  emitFeedback(state.feedback, { type: 'serve', side: server, quality: 'regular', position, flight });
  state.serves += 1;
  state.phase = 'playing';
  state.result = undefined;
  state.winner = undefined;
  state.contactCount = 0;
  state.kickUntil = -1;
  state.kickRequestTime = undefined;
  state.headerUntil = -1;
  state.headerRequestTime = undefined;
  resetOpponent(state.opponent);
  state.message = 'Move to the ring · LMB kick · RMB header';
}

/** Start a point with a regular safe serve while preserving the match-run serve count. */
export function startRallyServe(state: RallyState, server: Side): void {
  state.nextServe = Number.POSITIVE_INFINITY;
  serve(state, server);
}

function winnerFor(result: BallResult, receiver: Side): Side {
  return result === 'Second bounce' ? oppositeSide(receiver) : receiver;
}

function resolvePoint(state: RallyState, result: BallResult): void {
  if (state.phase !== 'playing' || !state.ball) return;
  settleShot(state.learning, state.ball.flight, result === 'Second bounce' && state.ball.receiver === 'player');
  state.phase = 'result';
  state.result = result;
  state.winner = winnerFor(result, state.ball.receiver);
  state.terminalResolutions += 1;
  state.nextServe = state.time + NEXT_SERVE_DELAY;
  clearRallyKick(state);
  state.message = `${result} · ${state.winner === 'player' ? 'you win' : 'rival wins'} the rally`;
}

/** One deterministic fixed step for shared human/rival contact and rally physics. */
export function stepRally(
  state: RallyState,
  player: PlayerState,
  rival: PlayerState,
  input: MovementInput,
  kick: KickRequest,
  dt = FIXED_STEP,
  header: HeaderRequest = false,
  aimTarget?: Vector2,
): void {
  if (dt <= 0) return;
  advanceFeedback(state.feedback, dt);
  state.kickFlash = Math.max(0, state.kickFlash - dt);
  if (state.phase !== 'playing' && state.time >= state.nextServe) serve(state);
  if (state.phase !== 'playing' || !state.ball) {
    state.time += dt;
    return;
  }

  updateTiming(state.feedback, state.ball, state.time);
  if (kick) {
    state.kickRequestTime = typeof kick === 'object' ? kick.time : state.time;
    state.kickUntil = state.kickRequestTime + KICK_BUFFER;
  }
  if (header) {
    state.headerRequestTime = typeof header === 'object' ? header.time : state.time;
    state.headerUntil = state.headerRequestTime + KICK_BUFFER;
  }
  const useHeader = state.headerUntil >= state.time && state.headerUntil >= state.kickUntil;
  const action = useHeader ? (player.jumpHeight >= 0.12 ? 'jump_header' : 'header') : player.jumpHeight >= 0.12 ? 'aerial_kick' : 'ground_kick';
  state.feedback.requestTime = useHeader ? state.headerRequestTime : state.kickRequestTime;
  if ((useHeader ? state.headerUntil >= state.time : state.kickUntil >= state.time) && tryPlayerShot(
    state.feedback,
    state.ball,
    player.position,
    aimTarget ?? shotTarget(input, 'player'),
    state.time,
    state.contacts.player,
    action,
    player.jumpHeight,
  )) {
    settleShot(state.learning, state.ball.flight - 1, false);
    state.nextFlight = Math.max(state.nextFlight, state.ball.flight);
    state.contactCount += 1;
    state.totalContacts += 1;
    state.kickFlash = 0.22;
    state.message = state.feedback.quality === 'powered' ? 'POWER KICK!' : state.feedback.quality === 'perfect' ? 'PERFECT!' : useHeader ? 'Header!' : 'Nice kick! · the rival is reading the ball';
    clearRallyKick(state);
  }

  const rivalContactPosition = { ...state.ball.position };
  const rivalIncomingFlight = state.ball.flight;
  const rivalReturned = stepOpponent(
    state.opponent,
    rival,
    state.ball,
    player.position,
    state.time,
    dt,
    state.contacts.rival,
    state.serves <= 2,
    state.learning,
  );
  if (rivalReturned) {
    emitFeedback(state.feedback, { type: 'contact', side: 'rival', quality: 'regular', position: rivalContactPosition, flight: rivalIncomingFlight, action: rivalContactPosition.y > 1.45 ? 'header' : 'ground_kick' });
    state.nextFlight = Math.max(state.nextFlight, state.ball.flight);
    state.contactCount += 1;
    state.totalContacts += 1;
    state.message = 'Rival return · get ready';
  }

  const result = stepBall(state.ball, dt, { completeRivalLanding: false, onBounce: (position, bounce) => emitFeedback(state.feedback, { type: 'bounce', position, bounce, side: state.ball!.receiver, quality: 'regular', flight: state.ball!.flight }) });
  if (result) resolvePoint(state, result);
  else if (state.ball.bounces === 1) {
    state.message = state.ball.receiver === 'player' ? 'One bounce · LMB kick or RMB header!' : 'One bounce · rival is setting up';
  }

  state.time += dt;
  if (state.kickUntil < state.time) { state.kickUntil = -1; state.kickRequestTime = undefined; }
  if (state.headerUntil < state.time) { state.headerUntil = -1; state.headerRequestTime = undefined; }
  if (state.kickUntil < state.time && state.headerUntil < state.time) state.feedback.requestTime = undefined;
}

export function rallyLanding(state: RallyState) {
  return state.ball && state.phase === 'playing' ? predictLanding(state.ball) : undefined;
}
