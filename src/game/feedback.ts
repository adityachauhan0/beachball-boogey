import { descendingTimeAtHeight, positionAt, type BallState, type Vec3 } from './ball';
import { CONTACT_RADIUS, tryContact, type ContactAction, type ContactMemory, type ShotQuality, type Side } from './contact';
import { COURT_BOUNDS, type Vector2 } from './movement';

export const PERFECT_TOLERANCE = 0.05;
export const POWER_CAPACITY = 3;
export const POWER_POSE_DURATION = 0.55;
export type KickRequest = boolean | { time: number };
export type HeaderRequest = boolean | { time: number };
export type ContactVariant = ContactAction;
export type FeedbackEvent = {
  sequence: number;
  type: 'contact' | 'bounce' | 'point' | 'match' | 'serve';
  position: Vec3;
  side: Side;
  quality: ShotQuality;
  flight: number;
  bounce?: number;
  action?: ContactVariant;
};
export type TimingReference = { flight: number; bounce: number; at: number | undefined };
export type FeedbackState = {
  lastShot: { quality: ShotQuality; action: ContactVariant; pressTime: number | undefined; reference: number | undefined; acceptedAt: number; flight: number } | undefined;
  charge: number;
  quality: ShotQuality;
  cueRemaining: number;
  poseRemaining: number;
  timing: TimingReference | undefined;
  requestTime: number | undefined;
  sequence: number;
  events: FeedbackEvent[];
};
export function createFeedback(): FeedbackState {
  return { lastShot: undefined, charge: 0, quality: 'regular', cueRemaining: 0, poseRemaining: 0, timing: undefined, requestTime: undefined, sequence: 0, events: [] };
}
export function emitFeedback(state: FeedbackState, event: Omit<FeedbackEvent, 'sequence'>): void {
  state.events.push({ ...event, position: { ...event.position }, sequence: ++state.sequence });
  if (state.events.length > 64) state.events.shift();
}
export function drainFeedback(state: FeedbackState): FeedbackEvent[] {
  return state.events.splice(0);
}
export function advanceFeedback(state: FeedbackState, dt: number): void {
  if (dt <= 0) return;
  state.cueRemaining = Math.max(0, state.cueRemaining - dt);
  state.poseRemaining = Math.max(0, state.poseRemaining - dt);
}
/** Clear shot-local state, keeping charge and run-scoped event identity. */
export function clearPointFeedback(state: FeedbackState): void {
  state.timing = undefined;
  state.requestTime = undefined;
  state.cueRemaining = state.poseRemaining = 0;
  state.quality = 'regular';
}
/** Fixed descending references, once per flight and legal bounce trajectory. */
export function updateTiming(state: FeedbackState, ball: BallState, time: number): void {
  if (state.timing?.flight === ball.flight && state.timing.bounce === ball.bounces) return;
  const height = ball.bounces === 0 ? 1.2 : 0.9;
  const crossing = descendingTimeAtHeight(ball, height);
  let at: number | undefined;
  if (crossing !== undefined) {
    const strike = positionAt(ball.position, ball.velocity, crossing);
    const bounded = { x: Math.max(COURT_BOUNDS.minX, Math.min(COURT_BOUNDS.maxX, strike.x)), z: Math.max(COURT_BOUNDS.minZ, Math.min(COURT_BOUNDS.maxZ, strike.z)) };
    if (strike.z > 0 && Math.hypot(strike.x - bounded.x, strike.z - bounded.z) <= CONTACT_RADIUS) at = time + crossing;
  }
  state.timing = { flight: ball.flight, bounce: ball.bounces, at };
}
export function classifyShot(charge: number, pressTime: number | undefined, reference: number | undefined, allowPower = true): ShotQuality {
  if (allowPower && charge >= POWER_CAPACITY) return 'powered';
  return pressTime !== undefined && reference !== undefined && Math.abs(pressTime - reference) <= PERFECT_TOLERANCE + 1e-9 ? 'perfect' : 'regular';
}
/** Charge and cues change only after the shared eligibility operation accepts. */
export function tryPlayerShot(state: FeedbackState, ball: BallState, actor: Vector2, target: Vector2, time: number, memory: ContactMemory, action: ContactVariant = 'ground_kick', actorHeight = 0): boolean {
  updateTiming(state, ball, time);
  const isKick = action === 'ground_kick' || action === 'aerial_kick';
  const quality = classifyShot(state.charge, state.requestTime, state.timing?.at, isKick);
  const flight = ball.flight;
  const position = { ...ball.position };
  if (!tryContact(ball, 'player', actor, target, time, memory, quality, action, actorHeight)) return false;
  state.lastShot = { quality, action, pressTime: state.requestTime, reference: state.timing?.at, acceptedAt: time, flight };
  if (quality === 'powered') state.charge = 0;
  else if (quality === 'perfect') state.charge = Math.min(POWER_CAPACITY, state.charge + 1);
  state.quality = quality;
  state.cueRemaining = quality === 'regular' ? 0.45 : 0.8;
  state.poseRemaining = quality === 'powered' ? POWER_POSE_DURATION : 0;
  emitFeedback(state, { type: 'contact', side: 'player', quality, position, flight, action });
  return true;
}
