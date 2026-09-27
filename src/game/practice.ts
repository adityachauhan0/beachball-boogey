import { createFeedback, advanceFeedback, clearPointFeedback, emitFeedback, tryPlayerShot, updateTiming, type FeedbackState, type HeaderRequest, type KickRequest } from './feedback';
import { predictLanding, safeLaunch, stepBall, type BallState, type BallResult } from './ball';
import type { MovementInput, Vector2 } from './movement';
import { canContact, shotTarget as sharedShotTarget, type Side } from './contact';
import { PLAYER_START, RIVAL_START } from './court';
export const KICK_BUFFER = 0.18;
export type PracticeState = {
  feedback: FeedbackState;
  ball: BallState | undefined; time: number; nextFeed: number; kickUntil: number; kickRequestTime: number | undefined; headerUntil: number; headerRequestTime: number | undefined;
  cooldownUntil: number; contactedFlight: number; nextFlight: number; feeds: number; returns: number;
  message: string; kickFlash: number; result: BallResult | undefined;
};
export function createPractice(): PracticeState {
  return { feedback: createFeedback(), ball: undefined, time: 0, nextFeed: 0.35, kickUntil: -1, kickRequestTime: undefined, headerUntil: -1, headerRequestTime: undefined, cooldownUntil: 0, contactedFlight: -1, nextFlight: 0, feeds: 0, returns: 0, message: 'Get ready · follow the landing ring', kickFlash: 0, result: undefined };
}
export function clearKick(state: PracticeState): void { state.kickUntil = -1; state.kickRequestTime = undefined; state.headerUntil = -1; state.headerRequestTime = undefined; state.feedback.requestTime = undefined; }
export function shotTarget(input: MovementInput, side: Side = 'player'): Vector2 {
  return sharedShotTarget(input, side);
}
export function canKick(state: PracticeState, player: Vector2): boolean {
  return !state.result && canContact(state.ball, 'player', player, state.time, state);
}
export function stepPractice(state: PracticeState, player: Vector2, input: MovementInput, kick: KickRequest, dt: number, header: HeaderRequest = false, actorHeight = 0, aimTarget?: Vector2): void {
  if (dt <= 0) return;
  advanceFeedback(state.feedback, dt);
  if (kick && state.ball && !state.result) {
    state.kickRequestTime = typeof kick === 'object' ? kick.time : state.time;
    state.kickUntil = state.kickRequestTime + KICK_BUFFER;
  }
  if (header && state.ball && !state.result) {
    state.headerRequestTime = typeof header === 'object' ? header.time : state.time;
    state.headerUntil = state.headerRequestTime + KICK_BUFFER;
  }
  state.kickFlash = Math.max(0, state.kickFlash - dt);
  if (state.time >= state.nextFeed && (!state.ball || state.result)) {
    state.feeds++;
    const p = { x: RIVAL_START.x, y: 1.8, z: RIVAL_START.z };
    const target = { x: [0, -0.6, 0.6][(state.feeds - 1) % 3], z: PLAYER_START.z };
    const flight = Math.max(state.nextFlight, state.ball?.flight ?? 0) + 1;
    state.nextFlight = flight;
    state.ball = { position: p, previousPosition: { ...p }, velocity: safeLaunch(p, target, 1.9), receiver: 'player', bounces: 0, flight };
    clearPointFeedback(state.feedback);
    emitFeedback(state.feedback, { type: 'serve', position: p, side: 'rival', quality: 'regular', flight });
    state.result = undefined;
    clearKick(state);
    state.message = 'Move to the ring · LMB kick · RMB header';
  }
  if (state.ball && !state.result) {
    updateTiming(state.feedback, state.ball, state.time);
    const useHeader = state.headerUntil >= state.time && state.headerUntil >= state.kickUntil;
    const action = useHeader ? (actorHeight >= 0.12 ? 'jump_header' : 'header') : actorHeight >= 0.12 ? 'aerial_kick' : 'ground_kick';
    state.feedback.requestTime = useHeader ? state.headerRequestTime : state.kickRequestTime;
    if ((useHeader ? state.headerUntil >= state.time : state.kickUntil >= state.time) && tryPlayerShot(state.feedback, state.ball, player, aimTarget ?? shotTarget(input), state.time, state, action, actorHeight)) {
      state.nextFlight = Math.max(state.nextFlight, state.ball.flight);
      state.returns++;
      state.kickFlash = 0.22;
      state.message = state.feedback.quality === 'powered' ? 'POWER KICK!' : state.feedback.quality === 'perfect' ? 'PERFECT!' : useHeader ? 'Header!' : 'Nice kick!';
      clearKick(state);
    }
    const result = stepBall(state.ball, dt, { onBounce: (position, bounce) => emitFeedback(state.feedback, { type: 'bounce', position, bounce, side: state.ball!.receiver, quality: 'regular', flight: state.ball!.flight }) });
    if (result) {
      state.result = result;
      state.message = result === 'Returned' ? 'Return landed! · next feed' : `${result} · try the next feed`;
      state.nextFeed = state.time + 0.85;
      clearKick(state);
    } else if (state.ball.bounces === 1 && state.ball.receiver === 'player') state.message = 'One bounce · LMB kick or RMB header!';
  }
  state.time += dt;
  if (state.kickUntil < state.time) { state.kickUntil = -1; state.kickRequestTime = undefined; }
  if (state.headerUntil < state.time) { state.headerUntil = -1; state.headerRequestTime = undefined; }
  if (state.kickUntil < state.time && state.headerUntil < state.time) state.feedback.requestTime = undefined;
}
export function practiceLanding(state: PracticeState) {
  return state.ball && !state.result ? predictLanding(state.ball) : undefined;
}
