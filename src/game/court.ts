import type { MovementBounds, Vector2 } from './movement';

/**
 * Gameplay measurements taken from the authored beach-court white lines and net.
 * The environment root is shifted so the net is z=0 and the playable width is
 * centred on x=0. The authored baselines are slightly asymmetric around the net.
 */
export const COURT = {
  minX: -5.46,
  maxX: 5.46,
  playerEndZ: 7.99,
  rivalEndZ: -8.27,
  netZ: 0,
  netTop: 1.435,
  netHalfDepth: 0.039,
  netHalfWidth: 5.67,
} as const;

export const PLAYER_START: Vector2 = { x: 0, z: 5.59 };
export const RIVAL_START: Vector2 = { x: 0, z: -5.79 };

const PLAYER_INSET_X = 0.65;
const PLAYER_INSET_END = 0.77;
const PLAYER_INSET_NET = 0.62;

export const PLAYER_MOVEMENT_BOUNDS: MovementBounds = {
  minX: COURT.minX + PLAYER_INSET_X,
  maxX: COURT.maxX - PLAYER_INSET_X,
  minZ: COURT.netZ + PLAYER_INSET_NET,
  maxZ: COURT.playerEndZ - PLAYER_INSET_END,
};

export const RIVAL_MOVEMENT_BOUNDS: MovementBounds = {
  minX: PLAYER_MOVEMENT_BOUNDS.minX,
  maxX: PLAYER_MOVEMENT_BOUNDS.maxX,
  minZ: COURT.rivalEndZ + PLAYER_INSET_END,
  maxZ: COURT.netZ - PLAYER_INSET_NET,
};

export const PLAYER_AIM_BOUNDS = {
  minX: COURT.minX + 0.3,
  maxX: COURT.maxX - 0.3,
  minZ: COURT.rivalEndZ + 0.3,
  maxZ: COURT.netZ - 0.65,
} as const;

export function landingInsideCourt(point: Vector2, receiver: 'player' | 'rival'): boolean {
  const epsilon = 1e-8;
  const insideWidth = point.x >= COURT.minX - epsilon && point.x <= COURT.maxX + epsilon;
  const insideDepth = receiver === 'player'
    ? point.z >= COURT.netZ - epsilon && point.z <= COURT.playerEndZ + epsilon
    : point.z <= COURT.netZ + epsilon && point.z >= COURT.rivalEndZ - epsilon;
  return insideWidth && insideDepth;
}

export function targetInsideOpponentHalf(point: Vector2, hitter: 'player' | 'rival'): boolean {
  return landingInsideCourt(point, hitter === 'player' ? 'rival' : 'player');
}
