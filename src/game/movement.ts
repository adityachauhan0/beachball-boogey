export type Vector2 = { x: number; z: number };

export type PlayerState = {
  position: Vector2;
  previousPosition: Vector2;
  facing: Vector2;
  jumpHeight: number;
  previousJumpHeight: number;
  jumpVelocity: number;
  action: 'idle' | 'jump' | 'ground_kick' | 'aerial_kick' | 'header' | 'jump_header';
};

export type MovementInput = {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
};

export type MovementBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export const COURT_BOUNDS: MovementBounds = PLAYER_MOVEMENT_BOUNDS;

export const PLAYER_SPEED = 4.8;
export const JUMP_SPEED = 6;
export const JUMP_GRAVITY = 12;
export const JUMP_DURATION = 2 * JUMP_SPEED / JUMP_GRAVITY;
export const FIXED_STEP = 1 / 60;

export function createPlayerState(): PlayerState {
  return {
    position: { ...PLAYER_START },
    previousPosition: { ...PLAYER_START },
    facing: { x: 0, z: -1 },
    jumpHeight: 0,
    previousJumpHeight: 0,
    jumpVelocity: 0,
    action: 'idle',
  };
}

/**
 * Adapted from the `updatePlayer` input-vector and normalization pattern in
 * Soccer_ThreeJS (MIT, unknown11-svg, d96313359611303e0ba1a47fdc2402fdb9957d23).
 * Axes and bounds are foot-tennis-specific; speed is expressed per second and
 * applied by the fixed-step simulation rather than once per rendered frame.
 */
export function movementVector(input: MovementInput): Vector2 {
  const x = Number(input.right) - Number(input.left);
  const z = Number(input.backward) - Number(input.forward);
  const magnitude = Math.hypot(x, z);

  if (magnitude === 0) return { x: 0, z: 0 };
  return { x: x / magnitude, z: z / magnitude };
}

/** Advances the logical player state by one fixed simulation step. */
export function stepPlayer(
  player: PlayerState,
  input: MovementInput,
  deltaSeconds: number,
  speed = PLAYER_SPEED,
  bounds = COURT_BOUNDS,
  jump = false,
): void {
  if (deltaSeconds <= 0) return;
  player.previousPosition = { ...player.position };
  player.previousJumpHeight = player.jumpHeight;
  const direction = movementVector(input);

  if (direction.x !== 0 || direction.z !== 0) {
    player.facing = direction;
    player.position = {
      x: clamp(player.position.x + direction.x * speed * deltaSeconds, bounds.minX, bounds.maxX),
      z: clamp(player.position.z + direction.z * speed * deltaSeconds, bounds.minZ, bounds.maxZ),
    };
  }

  if (jump && player.jumpHeight === 0) {
    player.jumpVelocity = JUMP_SPEED;
    player.action = 'jump';
  }
  if (player.jumpHeight > 0 || player.jumpVelocity > 0) {
    player.jumpHeight = Math.max(0, player.jumpHeight + player.jumpVelocity * deltaSeconds - 0.5 * JUMP_GRAVITY * deltaSeconds ** 2);
    player.jumpVelocity -= JUMP_GRAVITY * deltaSeconds;
    if (player.jumpHeight < 1e-8) {
      player.jumpHeight = 0;
      player.jumpVelocity = 0;
      if (player.action === 'jump') player.action = 'idle';
    }
  }
}

export function interpolatePlayer(player: PlayerState, alpha: number): Vector2 {
  const blend = clamp(alpha, 0, 1);
  return {
    x: player.previousPosition.x + (player.position.x - player.previousPosition.x) * blend,
    z: player.previousPosition.z + (player.position.z - player.previousPosition.z) * blend,
  };
}

export function facingLabel(facing: Vector2): string {
  if (Math.abs(facing.x) > Math.abs(facing.z)) return facing.x < 0 ? 'left' : 'right';
  return facing.z < 0 ? 'up' : 'down';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
import { PLAYER_MOVEMENT_BOUNDS, PLAYER_START } from './court';
