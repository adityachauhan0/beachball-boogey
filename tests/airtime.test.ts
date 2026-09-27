import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { AnimatedActor, CHARACTER_SCALE, type CharacterClip } from '../src/render/character-presentation';
import { createPlayerState, stepPlayer, FIXED_STEP, JUMP_DURATION } from '../src/game/movement';
import { createPractice, stepPractice } from '../src/game/practice';
import { createContactMemory, tryContact } from '../src/game/contact';
import type { BallState } from '../src/game/ball';

const idle = { left: false, right: false, forward: false, backward: false };
const bytes = readFileSync('public/assets/characters/chibi-animated.glb');
const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
function actor() {
  const object = clone(gltf.scene);
  object.scale.setScalar(CHARACTER_SCALE);
  const parent = new THREE.Group();
  parent.add(object);
  return { object, parent, visual: new AnimatedActor(object, gltf.animations) };
}

describe('physics and actual GLB integration', () => {
  it('stays visibly airborne for a full ballistic jump, including after a strike', () => {
    const player = createPlayerState();
    const { object, parent, visual } = actor();
    const root = object.getObjectByName('root')!;
    let apex = 0;
    for (let frame = 0; frame < 60; frame++) {
      stepPlayer(player, idle, FIXED_STEP, undefined, undefined, frame === 0);
      if (frame === 15) visual.trigger('aerial_kick');
      visual.update(FIXED_STEP, { moving: false, jumping: player.jumpHeight > 0, jumpVelocity: player.jumpVelocity });
      parent.position.y = player.jumpHeight;
      parent.updateMatrixWorld(true);
      if (frame < 59) expect(root.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(player.jumpHeight, 5);
      if (frame < 59) expect(player.jumpHeight).toBeGreaterThan(0);
      apex = Math.max(apex, player.jumpHeight);
      if (frame === 45) expect(visual.clip).toBe('jump');
    }
    expect(JUMP_DURATION).toBe(1);
    expect(apex).toBeCloseTo(1.5);
    expect(player.jumpHeight).toBe(0);
    expect(visual.clip).toBe('idle');
    visual.dispose();
  });

  it.each(['ground_kick', 'aerial_kick', 'header', 'jump_header', 'bicycle_kick', 'celebration', 'loss'] as CharacterClip[])(
    'plays the real %s clip and returns to locomotion', (name) => {
      const { visual, object } = actor();
      const bones: THREE.Object3D[] = [];
      object.traverse(child => { if (child instanceof THREE.Bone) bones.push(child); });
      const rest = bones.map(bone => bone.quaternion.clone());
      visual.trigger(name, false);
      visual.update(0.1, { moving: false, jumping: false });
      expect(visual.clip).toBe(name);
      expect(Math.max(...bones.map((bone, i) => bone.quaternion.angleTo(rest[i])))).toBeGreaterThan(0.001);
      visual.update(0, { moving: true, jumping: false });
      expect(visual.clip).toBe(name);
      visual.update(1, { moving: true, jumping: false });
      expect(visual.clip).toBe('run');
      visual.reset();
      expect(visual.clip).toBe('idle');
      expect(object.position.y).toBe(0);
      visual.dispose();
    },
  );

  it.each(['kick', 'header'] as const)('accepts a %s using a real jump and the practice action buffer', (request) => {
    const player = createPlayerState();
    for (let i = 0; i < 30; i++) stepPlayer(player, idle, FIXED_STEP, undefined, undefined, i === 0);
    const state = createPractice();
    const position = { ...player.position, y: player.jumpHeight + (request === 'header' ? 1.7 : 0.8) };
    state.ball = { position, previousPosition: { ...position }, velocity: { x: 0, y: -1, z: 0 }, receiver: 'player', bounces: 0, flight: 1 };
    stepPractice(state, player.position, idle, request === 'kick', FIXED_STEP, request === 'header', player.jumpHeight);
    expect(state.returns).toBe(1);
    expect(state.feedback.lastShot?.action).toBe(request === 'header' ? 'jump_header' : 'aerial_kick');
    expect(state.ball.receiver).toBe('rival');
  });

  it('keeps high headers unavailable on the ground and rejects balls above jumping reach', () => {
    for (const height of [0, 1.5]) {
      const position = { x: 0, y: height === 0 ? 3.2 : 4, z: 4 };
      const ball: BallState = { position, previousPosition: { ...position }, velocity: { x: 0, y: -1, z: 0 }, receiver: 'player', bounces: 0, flight: 1 };
      expect(tryContact(ball, 'player', position, { x: 0, z: -4 }, 0, createContactMemory(), 'regular', height === 0 ? 'header' : 'jump_header', height)).toBe(false);
    }
  });
});
