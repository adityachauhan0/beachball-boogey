export type Vec3 = { x: number; y: number; z: number };
export const BALL_RADIUS = 0.22;
export const GRAVITY = 8;
export const NET_TOP = COURT.netTop;
export const NET_HALF_DEPTH = COURT.netHalfDepth;
export const NET_HALF_WIDTH = COURT.netHalfWidth;
export type BallState = {
  position: Vec3; previousPosition: Vec3; velocity: Vec3;
  receiver: 'player' | 'rival'; bounces: number; flight: number;
};
export type BallResult = 'Net' | 'Out' | 'Second bounce' | 'Returned';
export type StepBallOptions = { completeRivalLanding?: boolean; onBounce?: (position: Vec3, bounce: number) => void };

export function positionAt(p: Vec3, v: Vec3, t: number): Vec3 {
  return { x: p.x + v.x * t, y: p.y + v.y * t - GRAVITY * t * t / 2, z: p.z + v.z * t };
}
export function launchToTarget(p: Vec3, target: { x: number; z: number }, duration: number): Vec3 {
  if (duration <= 0) throw new Error('Flight duration must be positive');
  return { x: (target.x - p.x) / duration, y: (BALL_RADIUS - p.y) / duration + GRAVITY * duration / 2, z: (target.z - p.z) / duration };
}
export function groundTime(p: Vec3, v: Vec3): number {
  return (v.y + Math.sqrt(Math.max(0, v.y * v.y + 2 * GRAVITY * (p.y - BALL_RADIUS)))) / GRAVITY;
}
export function predictLanding(ball: BallState): Vec3 {
  return positionAt(ball.position, ball.velocity, groundTime(ball.position, ball.velocity));
}
/** Time to the descending crossing of a given height, if the trajectory reaches it. */
export function descendingTimeAtHeight(ball: BallState, height: number): number | undefined {
  const discriminant = ball.velocity.y ** 2 + 2 * GRAVITY * (ball.position.y - height);
  if (discriminant < 0) return undefined;
  const time = (ball.velocity.y + Math.sqrt(discriminant)) / GRAVITY;
  if (time < 0 || ball.velocity.y - GRAVITY * time > 1e-7) return undefined;
  return time;
}
export function safeLaunch(p: Vec3, target: { x: number; z: number }, duration = 1.65, clearance = 0.18): Vec3 {
  // At each edge of the net slab the sphere's bottom must clear the tape.
  for (const z of [-NET_HALF_DEPTH - BALL_RADIUS, NET_HALF_DEPTH + BALL_RADIUS]) {
    const fraction = (z - p.z) / (target.z - p.z);
    if (fraction > 0 && fraction < 1) {
      const linearY = p.y + (BALL_RADIUS - p.y) * fraction;
      const needed = 2 * (NET_TOP + BALL_RADIUS + clearance - linearY) / (GRAVITY * fraction * (1 - fraction));
      duration = Math.max(duration, Math.sqrt(Math.max(0, needed)));
    }
  }
  return launchToTarget(p, target, duration);
}
export function landingIn(p: Vec3, receiver: BallState['receiver']): boolean {
  return landingInsideCourt(p, receiver);
}
function netTime(p: Vec3, v: Vec3, dt: number): number | undefined {
  const extent = NET_HALF_DEPTH + BALL_RADIUS;
  const width = NET_HALF_WIDTH + BALL_RADIUS;
  let start = 0;
  let end = dt;
  for (const [position, velocity, limit] of [[p.z, v.z, extent], [p.x, v.x, width]]) {
    if (velocity === 0) {
      if (Math.abs(position) > limit) return undefined;
    } else {
      const a = (-limit - position) / velocity;
      const b = (limit - position) / velocity;
      start = Math.max(start, Math.min(a, b));
      end = Math.min(end, Math.max(a, b));
    }
  }
  if (start > end) return undefined;
  const height = NET_TOP + BALL_RADIUS;
  if (positionAt(p, v, start).y <= height) return start;
  const discriminant = v.y * v.y + 2 * GRAVITY * (p.y - height);
  if (discriminant < 0) return undefined;
  const descending = (v.y + Math.sqrt(discriminant)) / GRAVITY;
  return descending >= start && descending <= end ? descending : undefined;
}
/** Analytic event times preserve ground/net events even across large steps. */
export function stepBall(ball: BallState, dt: number, options: StepBallOptions = {}): BallResult | undefined {
  ball.previousPosition = { ...ball.position };
  let remaining = dt;
  for (let event = 0; event < 3 && remaining > 1e-9; event++) {
    const ground = groundTime(ball.position, ball.velocity);
    const net = netTime(ball.position, ball.velocity, remaining);
    const time = Math.min(remaining, ground, net ?? Infinity);
    ball.position = positionAt(ball.position, ball.velocity, time);
    ball.velocity.y -= GRAVITY * time;
    remaining -= time;
    if (net !== undefined && net <= ground && net <= time + 1e-9) return 'Net';
    if (ground <= time + 1e-9) {
      ball.position.y = BALL_RADIUS;
      if (ball.bounces >= 1) { ball.bounces++; options.onBounce?.({ ...ball.position }, ball.bounces); return 'Second bounce'; }
      if (!landingIn(ball.position, ball.receiver)) return 'Out';
      ball.bounces++;
      options.onBounce?.({ ...ball.position }, ball.bounces);
      if (ball.receiver === 'rival' && options.completeRivalLanding !== false) return 'Returned';
      ball.velocity.y = 4.8;
      ball.velocity.x *= 0.35;
      ball.velocity.z *= 0.35;
    }
  }
  return undefined;
}
import { COURT, landingInsideCourt } from './court';
