import { safeLaunch, type BallState } from './ball';
import { targetInsideOpponentHalf } from './court';
import type { MovementInput, Vector2 } from './movement';

export type ShotQuality = 'regular' | 'perfect' | 'powered';
export const SHOT_DURATIONS: Record<ShotQuality, number> = { regular: 1.65, perfect: 1.4, powered: 1.2 };
const SHOT_CLEARANCE: Record<ShotQuality, number> = { regular: 0.18, perfect: 0.12, powered: 0.06 };

export type Side = BallState['receiver'];
export type ContactAction = 'ground_kick' | 'aerial_kick' | 'header' | 'jump_header';
export type ContactMemory = { cooldownUntil: number; contactedFlight: number };
export const CONTACT_RADIUS = 0.9;
export const CONTACT_MIN_HEIGHT = 0.35;
export const CONTACT_MAX_HEIGHT = 2.8;
export const CONTACT_COOLDOWN = 0.3;
export const SHOT_DURATION = 1.65;

export function createContactMemory(): ContactMemory {
  return { cooldownUntil: 0, contactedFlight: -1 };
}

export function oppositeSide(side: Side): Side {
  return side === 'player' ? 'rival' : 'player';
}

/** Shared receiver, half, height, radius, cooldown, and per-flight checks. */
export function canContact(
  ball: BallState | undefined,
  side: Side,
  actor: Vector2,
  time: number,
  memory: ContactMemory,
  actorHeight = 0,
): ball is BallState {
  if (!ball || ball.receiver !== side) return false;
  const onActorHalf = side === 'player' ? ball.position.z > 0 : ball.position.z < 0;
  return onActorHalf &&
    ball.position.y >= CONTACT_MIN_HEIGHT && ball.position.y <= actorHeight + CONTACT_MAX_HEIGHT &&
    Math.hypot(ball.position.x - actor.x, ball.position.z - actor.z) <= CONTACT_RADIUS &&
    time >= memory.cooldownUntil && memory.contactedFlight !== ball.flight;
}

/** Aim controls are interpreted from the hitter's side of the court. */
export function shotTarget(input: MovementInput, side: Side = 'player'): Vector2 {
  const orientation = side === 'player' ? 1 : -1;
  return {
    x: orientation * (Number(input.right) - Number(input.left)) * 3,
    z: orientation * (input.forward === input.backward ? -5 : input.forward ? -6.8 : -3.2),
  };
}

/** The one accepted-shot operation used by both actors and practice feeds. */
export function tryContact(
  ball: BallState | undefined,
  side: Side,
  actor: Vector2,
  target: Vector2,
  time: number,
  memory: ContactMemory,
  quality: ShotQuality = 'regular',
  action?: ContactAction,
  actorHeight = 0,
): ball is BallState {
  if (!canContact(ball, side, actor, time, memory, actorHeight)) return false;
  const relativeHeight = ball.position.y - actorHeight;
  const inActionWindow = action === undefined || (action === 'ground_kick'
    ? actorHeight < 0.12 && relativeHeight >= 0.35 && relativeHeight <= 1.45
    : action === 'aerial_kick'
      ? actorHeight >= 0.12 && relativeHeight >= -0.2 && relativeHeight <= 1.45
      : action === 'header'
        ? actorHeight < 0.12 && relativeHeight >= 1.15 && relativeHeight <= 2.8
        : actorHeight >= 0.12 && relativeHeight >= 0.9 && relativeHeight <= 2.25);
  if (!inActionWindow) return false;
  if (!targetInsideOpponentHalf(target, side)) return false;

  memory.contactedFlight = ball.flight;
  memory.cooldownUntil = time + CONTACT_COOLDOWN;
  ball.velocity = safeLaunch(ball.position, target, SHOT_DURATIONS[quality], SHOT_CLEARANCE[quality]);
  ball.receiver = oppositeSide(side);
  ball.bounces = 0;
  ball.flight += 1;
  return true;
}
