import { groundTime, positionAt, predictLanding, descendingTimeAtHeight, type BallState } from './ball';
import { CONTACT_RADIUS, type ContactMemory, tryContact } from './contact';
import type { Vector2, PlayerState, MovementInput, MovementBounds } from './movement';
import { createPlayerState, stepPlayer } from './movement';
import { COURT, PLAYER_START, RIVAL_MOVEMENT_BOUNDS, RIVAL_START as COURT_RIVAL_START } from './court';
import { chooseShot, DIFFICULTIES, type ShotLearning } from './shot-learning';

export type OpponentMode = 'recover' | 'track' | 'intercept' | 'return';
export type OpponentState = {
  mode: OpponentMode;
  trackedFlight: number;
  reactionRemaining: number;
  returnRemaining: number;
  target: Vector2;
  shot?: ReturnType<typeof chooseShot>;
};

export const RIVAL_BOUNDS: MovementBounds = RIVAL_MOVEMENT_BOUNDS;
export const RIVAL_START: Vector2 = COURT_RIVAL_START;
export const RIVAL_SPEED = 1.8;
export const REACTION_MIN = 0.28;
export const REACTION_MAX = 0.38;
const RECOVER_SPOT: Vector2 = RIVAL_START;
const CONTACT_HEIGHTS = [2.4, 2.1, 1.8, 1.5, 1.2, 0.9, 0.65];
const MAX_CONTACT_ERROR = 0.38;

export function createOpponentState(): OpponentState {
  return { mode: 'recover', trackedFlight: -1, reactionRemaining: 0, returnRemaining: 0, target: { ...RECOVER_SPOT } };
}

export function createRivalPlayer(): PlayerState {
  const rival = createPlayerState();
  rival.position = { ...RIVAL_START };
  rival.previousPosition = { ...RIVAL_START };
  rival.facing = { x: 0, z: 1 };
  return rival;
}

export function resetOpponent(state: OpponentState): void {
  state.shot = undefined;
  state.mode = 'recover';
  state.trackedFlight = -1;
  state.reactionRemaining = 0;
  state.returnRemaining = 0;
  state.target = { ...RECOVER_SPOT };
}

function deterministicUnit(flight: number, salt: number): number {
  const hash = Math.imul(flight + salt, 0x45d9f3b) >>> 0;
  return hash / 0xffffffff;
}

export function reactionDelay(flight: number): number {
  return REACTION_MIN + deterministicUnit(flight, 11) * (REACTION_MAX - REACTION_MIN);
}

function contactError(flight: number): Vector2 {
  const angle = deterministicUnit(flight, 31) * Math.PI * 2;
  const magnitude = deterministicUnit(flight, 53) * MAX_CONTACT_ERROR;
  return { x: Math.cos(angle) * magnitude, z: Math.sin(angle) * magnitude };
}

export type InterceptPlan = { position: Vector2; ballPosition: { x: number; y: number; z: number }; time: number; reachable: boolean };

/** Predict a descending strike point and a bounded, deterministic target error. */
export function predictIntercept(ball: BallState, from?: Vector2): InterceptPlan | undefined {
  if (ball.receiver !== 'rival') return undefined;
  const error = contactError(ball.flight);
  let closestMiss: { plan: InterceptPlan; deficit: number } | undefined;
  for (const height of CONTACT_HEIGHTS) {
    const time = descendingTimeAtHeight(ball, height);
    if (time === undefined || time <= 0) continue;
    const at = positionAt(ball.position, ball.velocity, time);
    if (at.z >= COURT.netZ || at.z < COURT.rivalEndZ || at.x < COURT.minX || at.x > COURT.maxX) continue;
    const x = clamp(at.x + error.x, RIVAL_BOUNDS.minX, RIVAL_BOUNDS.maxX);
    const z = clamp(at.z + error.z, RIVAL_BOUNDS.minZ, RIVAL_BOUNDS.maxZ);
    // Stay close enough to the predicted path for the shared 0.9-unit contact window.
    if (Math.hypot(x - at.x, z - at.z) > CONTACT_RADIUS) continue;
    const distance = from ? Math.hypot(x - from.x, z - from.z) : 0;
    const plan = { position: { x, z }, ballPosition: at, time, reachable: !from || distance <= RIVAL_SPEED * time };
    if (plan.reachable) return plan;
    const deficit = distance - RIVAL_SPEED * time;
    if (!closestMiss || deficit < closestMiss.deficit) closestMiss = { plan, deficit };
  }
  if (closestMiss) return closestMiss.plan;

  // If the ball is already below the lowest strike sample, chase its legal bounce point.
  const time = groundTime(ball.position, ball.velocity);
  const at = predictLanding(ball);
  if (time > 0 && at.z < COURT.netZ && at.z >= COURT.rivalEndZ && at.x >= COURT.minX && at.x <= COURT.maxX) {
    const x = clamp(at.x + error.x, RIVAL_BOUNDS.minX, RIVAL_BOUNDS.maxX);
    const z = clamp(at.z + error.z, RIVAL_BOUNDS.minZ, RIVAL_BOUNDS.maxZ);
    return { position: { x, z }, ballPosition: at, time, reachable: !!from && Math.hypot(x - from.x, z - from.z) <= RIVAL_SPEED * time };
  }
  return undefined;
}

function inputToward(from: Vector2, target: Vector2): MovementInput {
  return {
    left: target.x < from.x - 0.015,
    right: target.x > from.x + 0.015,
    forward: target.z < from.z - 0.015,
    backward: target.z > from.z + 0.015,
  };
}

function moveToward(rival: PlayerState, target: Vector2, dt: number): void {
  const bounded = {
    x: clamp(target.x, RIVAL_BOUNDS.minX, RIVAL_BOUNDS.maxX),
    z: clamp(target.z, RIVAL_BOUNDS.minZ, RIVAL_BOUNDS.maxZ),
  };
  stepPlayer(rival, inputToward(rival.position, bounded), dt, RIVAL_SPEED, RIVAL_BOUNDS);
}

function aiShotTarget(ball: BallState, player: Vector2, forgiving: boolean): Vector2 {
  if (forgiving) {
    const centerError = deterministicUnit(ball.flight, 73) * 1.2 - 0.6;
    return { x: centerError, z: PLAYER_START.z };
  }
  const noise = deterministicUnit(ball.flight, 71) * 0.7 - 0.35;
  return {
    x: clamp((player.x >= 0 ? -2.4 : 2.4) + noise, -3.1, 3.1),
    z: clamp(player.z > 4.6 ? 3.8 : 6.2, 0.8, 7.2),
  };
}

/** Advances the local rival once; shared contact rules remain authoritative. */
export function stepOpponent(
  state: OpponentState,
  rival: PlayerState,
  ball: BallState | undefined,
  player: Vector2,
  time: number,
  dt: number,
  contact: ContactMemory,
  forgivingServe: boolean,
  learning?: ShotLearning,
): boolean {
  if (dt <= 0) return false;

  if (!ball || ball.receiver !== 'rival') {
    state.trackedFlight = -1;
    state.reactionRemaining = 0;
    if (state.mode === 'return' && state.returnRemaining > 0) {
      state.returnRemaining = Math.max(0, state.returnRemaining - dt);
      state.target = { ...RECOVER_SPOT };
      moveToward(rival, state.target, dt);
      if (state.returnRemaining === 0) state.mode = 'recover';
      return false;
    }
    state.mode = 'recover';
    state.returnRemaining = 0;
    state.target = { ...RECOVER_SPOT };
    moveToward(rival, state.target, dt);
    return false;
  }

  if (state.trackedFlight !== ball.flight) {
    state.shot = undefined;
    state.trackedFlight = ball.flight;
    state.mode = 'track';
    state.reactionRemaining = reactionDelay(ball.flight) * (learning ? DIFFICULTIES[learning.difficulty].reaction : 1);
    state.target = { ...rival.position };
    rival.previousPosition = { ...rival.position };
    return false;
  }

  if (state.mode === 'track') {
    state.reactionRemaining = Math.max(0, state.reactionRemaining - dt);
    if (state.reactionRemaining > 0) {
      rival.previousPosition = { ...rival.position };
      return false;
    }
    state.mode = 'intercept';
  }

  state.mode = 'intercept';
  const plan = predictIntercept(ball, rival.position);
  state.target = plan?.position ?? RECOVER_SPOT;
  moveToward(rival, state.target, dt);
  if (learning && !state.shot) state.shot = chooseShot(learning, forgivingServe);
  if (tryContact(ball, 'rival', rival.position, state.shot?.target ?? aiShotTarget(ball, player, forgivingServe), time, contact)) {
    if (learning && state.shot) learning.pending = { arm: state.shot.arm, flight: ball.flight };
    state.mode = 'return';
    state.trackedFlight = -1;
    state.reactionRemaining = 0;
    state.returnRemaining = 0.18;
    state.target = { ...RECOVER_SPOT };
    return true;
  }
  return false;
}

export function isInsideRivalBounds(position: Vector2): boolean {
  return position.x >= RIVAL_BOUNDS.minX && position.x <= RIVAL_BOUNDS.maxX &&
    position.z >= RIVAL_BOUNDS.minZ && position.z <= RIVAL_BOUNDS.maxZ;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
