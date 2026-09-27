import { describe, expect, it } from 'vitest';
import { clampPlayerAim, resolvePlayerAim, PLAYER_AIM_BOUNDS } from '../src/input/mouse-aim';

describe('mouse aim', () => {
  it('preserves legal continuous targets', () => {
    expect(clampPlayerAim({ x: 1.37, z: -4.42 })).toEqual({ x: 1.37, z: -4.42 });
  });

  it('clamps pointer projections inside the rival court', () => {
    expect(clampPlayerAim({ x: -20, z: 10 })).toEqual({ x: PLAYER_AIM_BOUNDS.minX, z: PLAYER_AIM_BOUNDS.maxZ });
    expect(clampPlayerAim({ x: 20, z: -20 })).toEqual({ x: PLAYER_AIM_BOUNDS.maxX, z: PLAYER_AIM_BOUNDS.minZ });
  });
});

import { predictLanding, safeLaunch } from '../src/game/ball';

describe('directional player returns', () => {
  const player = { x: 0, z: 5.5 };
  it('sends own-half straight aim deep instead of dropping at the net', () => {
    expect(resolvePlayerAim({ x: 0, z: 4 }, player)).toEqual({ x: 0, z: -6 });
  });
  it('produces different left, straight and right flight landings', () => {
    const landings = [-0.6, 0, 0.6].map((x) => {
      const target = resolvePlayerAim({ x, z: 4 }, player);
      const position = { ...player, y: 1 };
      return predictLanding({ position, previousPosition: position, velocity: safeLaunch(position, target), receiver: 'rival', bounces: 0, flight: 1 });
    });
    expect(landings[0].x).toBeLessThan(-3);
    expect(landings[1].x).toBeCloseTo(0);
    expect(landings[2].x).toBeGreaterThan(3);
    expect(landings.every((p) => p.z < -4)).toBe(true);
    expect(landings[1].z).toBeLessThan(landings[0].z);
  });
  it('recomputes the hitting angle when the player moves under a stationary cursor', () => {
    const point = { x: 0, z: 3 };
    expect(resolvePlayerAim(point, { x: -1, z: 5.5 }).x).toBeGreaterThan(0);
    expect(resolvePlayerAim(point, { x: 1, z: 5.5 }).x).toBeLessThan(0);
  });
  it('preserves direct placement deeper in the opposing court and legal bounds', () => {
    expect(resolvePlayerAim({ x: 1.37, z: -4.42 }, player)).toEqual({ x: 1.37, z: -4.42 });
    for (const point of [{ x: -20, z: 10 }, { x: 20, z: -20 }, player]) {
      const target = resolvePlayerAim(point, player);
      expect(target.x).toBeGreaterThanOrEqual(PLAYER_AIM_BOUNDS.minX);
      expect(target.x).toBeLessThanOrEqual(PLAYER_AIM_BOUNDS.maxX);
      expect(target.z).toBeGreaterThanOrEqual(PLAYER_AIM_BOUNDS.minZ);
      expect(target.z).toBeLessThanOrEqual(PLAYER_AIM_BOUNDS.maxZ);
    }
  });
});
