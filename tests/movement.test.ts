import { describe, expect, it } from 'vitest';
import { COURT_BOUNDS, FIXED_STEP, PLAYER_SPEED, createPlayerState, facingLabel, interpolatePlayer, movementVector, stepPlayer } from '../src/game/movement';
import { KeyboardInput } from '../src/input';

describe('foot-tennis player movement', () => {
  it('moves forward at the configured units-per-second speed', () => {
    const player = createPlayerState();
    const startingZ = player.position.z;
    stepPlayer(player, { left: false, right: false, forward: true, backward: false }, FIXED_STEP);
    expect(startingZ - player.position.z).toBeCloseTo(PLAYER_SPEED * FIXED_STEP);
    expect(player.facing).toEqual({ x: 0, z: -1 });
  });

  it('normalizes diagonal movement to the same speed as cardinal movement', () => {
    const vector = movementVector({ left: false, right: true, forward: true, backward: false });
    expect(Math.hypot(vector.x, vector.z)).toBeCloseTo(1);

    const player = createPlayerState();
    const before = { ...player.position };
    stepPlayer(player, { left: false, right: true, forward: true, backward: false }, FIXED_STEP);
    const moved = Math.hypot(player.position.x - before.x, player.position.z - before.z);
    expect(moved).toBeCloseTo(PLAYER_SPEED * FIXED_STEP);
  });

  it('clamps the logical position to the near half and preserves facing while idle', () => {
    const player = createPlayerState();
    stepPlayer(player, { left: false, right: true, forward: false, backward: true }, 4);
    expect(player.position.x).toBe(COURT_BOUNDS.maxX);
    expect(player.position.z).toBe(COURT_BOUNDS.maxZ);
    const facing = { ...player.facing };
    stepPlayer(player, { left: false, right: false, forward: false, backward: false }, FIXED_STEP);
    expect(player.position.z).toBeGreaterThan(0);
    expect(player.facing).toEqual(facing);
  });

  it('interpolates between simulation states without changing the logical state', () => {
    const player = createPlayerState();
    stepPlayer(player, { left: false, right: true, forward: false, backward: false }, FIXED_STEP);
    const logicalX = player.position.x;
    const halfway = interpolatePlayer(player, 0.5);
    expect(halfway.x).toBeCloseTo(logicalX / 2);
    expect(player.position.x).toBe(logicalX);
  });

  it('labels the last travel direction for the movement marker', () => {
    expect(facingLabel({ x: 0.8, z: -0.6 })).toBe('right');
    expect(facingLabel({ x: 0, z: 1 })).toBe('down');
  });

  it('jumps on an edge while keeping air movement responsive, then lands cleanly', () => {
    const player = createPlayerState();
    const right = { left: false, right: true, forward: false, backward: false };
    stepPlayer(player, right, FIXED_STEP, undefined, undefined, true);
    expect(player.jumpHeight).toBeGreaterThan(0);
    expect(player.action).toBe('jump');
    const xAfterTakeoff = player.position.x;
    stepPlayer(player, right, FIXED_STEP);
    expect(player.position.x).toBeGreaterThan(xAfterTakeoff);
    for (let i = 0; i < 60; i++) stepPlayer(player, { left: false, right: false, forward: false, backward: false }, FIXED_STEP);
    expect(player.jumpHeight).toBe(0);
    expect(player.jumpVelocity).toBe(0);
    expect(player.action).toBe('idle');
  });
});

describe('keyboard input sampling', () => {
  it('maps WASD and arrows and preserves a press until one simulation sample', () => {
    const keyboard = new KeyboardInput();
    keyboard.keyDown('ArrowUp');
    keyboard.keyUp('ArrowUp');
    expect(keyboard.sample()).toEqual({ left: false, right: false, forward: true, backward: false });
    expect(keyboard.sample()).toEqual({ left: false, right: false, forward: false, backward: false });
  });

  it('cancels opposed inputs and clears all held and tapped state on pause', () => {
    const keyboard = new KeyboardInput();
    keyboard.keyDown('KeyA');
    keyboard.keyDown('ArrowRight');
    expect(movementVector(keyboard.sample())).toEqual({ x: 0, z: 0 });
    keyboard.keyDown('KeyW');
    keyboard.clear();
    expect(keyboard.sample()).toEqual({ left: false, right: false, forward: false, backward: false });
  });
});
