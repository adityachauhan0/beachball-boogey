import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { JUMP_SPEED } from '../game/movement';
import type { ContactAction } from '../game/contact';
import type { FeedbackEvent } from '../game/feedback';

export const CHARACTER_ASSET = '/assets/characters/chibi-animated.glb';
export const CHARACTER_SCALE = 0.72;
export const PROVISIONAL_SKINS = { player: 'orange', rival: 'brown' } as const;
export const CHARACTER_SKINS = ['orange', 'bunny', 'brown'] as const;
export type CharacterSkin = typeof CHARACTER_SKINS[number];

export type CharacterClip =
  | 'idle' | 'run' | 'jump'
  | 'ground_kick' | 'aerial_kick' | 'header' | 'jump_header'
  | 'bicycle_kick' | 'celebration' | 'loss';

export type CharacterMotion = {
  moving: boolean;
  jumping: boolean;
  jumpVelocity?: number;
};

export type CharacterPresentation = {
  readonly ready: Promise<void>;
  readonly status: 'loading' | 'characters' | 'cubes' | 'disposed';
  requestAction: (action: ContactAction) => void;
  readonly playerClip: CharacterClip | undefined;
  readonly rivalClip: CharacterClip | undefined;
  consume: (event: FeedbackEvent) => void;
  update: (dt: number, player: CharacterMotion, rival: CharacterMotion) => void;
  reset: () => void;
  setReducedMotion: (reduced: boolean) => void;
  setSkins: (player: CharacterSkin, rival: CharacterSkin) => void;
  dispose: () => void;
};

const STRIKE_MARKERS: Partial<Record<CharacterClip, number>> = {
  ground_kick: 0.1,
  aerial_kick: 0.2,
  header: 0.1,
  jump_header: 0.24,
  bicycle_kick: 0.2,
};

export function clipForFeedback(event: FeedbackEvent, reducedMotion = false): CharacterClip | undefined {
  if (event.type === 'contact') {
    if (event.quality === 'powered') return reducedMotion ? 'ground_kick' : 'bicycle_kick';
    return event.action ?? 'ground_kick';
  }
  return undefined;
}

export function characterSkin(value: string | null, fallback: CharacterSkin): CharacterSkin {
  return CHARACTER_SKINS.includes(value as CharacterSkin) ? value as CharacterSkin : fallback;
}

function baseClip(motion: CharacterMotion): CharacterClip {
  return motion.jumping ? 'jump' : motion.moving ? 'run' : 'idle';
}

export class AnimatedActor {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<CharacterClip, THREE.AnimationAction>();
  private current: CharacterClip | undefined;
  private readonly rootBone: THREE.Object3D | undefined;
  get clip(): CharacterClip | undefined { return this.current; }
  private oneShotRemaining = 0;

  constructor(readonly object: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(object);
    this.rootBone = object.getObjectByName('root');
    for (const clip of clips) this.actions.set(clip.name as CharacterClip, this.mixer.clipAction(clip));
    this.playBase('idle');
  }

  private activate(name: CharacterClip, once: boolean, startAt = 0): void {
    const next = this.actions.get(name);
    if (!next) return;
    this.mixer.stopAllAction();
    next.reset();
    next.enabled = true;
    next.clampWhenFinished = once;
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.time = Math.min(startAt, Math.max(0, next.getClip().duration - 1 / 60));
    next.play();
    this.current = name;
  }

  private playBase(name: CharacterClip): void {
    if (this.oneShotRemaining > 0 || this.current === name) return;
    this.activate(name, name === 'jump');
  }

  trigger(name: CharacterClip, accepted = true): void {
    const action = this.actions.get(name);
    if (!action) return;
    const marker = accepted ? STRIKE_MARKERS[name] ?? 0 : 0;
    this.oneShotRemaining = Math.max(1 / 60, action.getClip().duration - marker);
    this.activate(name, true, marker);
  }

  update(dt: number, motion: CharacterMotion): void {
    if (dt <= 0) return;
    if (this.oneShotRemaining > 0) {
      this.oneShotRemaining = Math.max(0, this.oneShotRemaining - dt);
      if (this.oneShotRemaining === 0) this.current = undefined;
    }
    this.playBase(baseClip(motion));
    // Sample the authored takeoff/apex/landing poses against the ballistic phase.
    // Returning from a strike while airborne resumes that phase, not a new jump.
    const jump = this.actions.get('jump');
    if (this.current === 'jump' && jump) {
      const phase = THREE.MathUtils.clamp((JUMP_SPEED - (motion.jumpVelocity ?? 0)) / (2 * JUMP_SPEED), 0, 1);
      jump.time = phase < 0.5 ? 0.12 + phase * 2 * 0.20 : 0.32 + (phase - 0.5) * 2 * 0.25;
      jump.paused = true;
    }
    this.mixer.update(dt);
    // Manual airtime belongs to physics. Remove the baked hop only from the
    // manual airborne clips; bicycle/celebration retain their authored clearance.
    const physicsJump = this.current === 'jump' || this.current === 'aerial_kick' || this.current === 'jump_header';
    this.object.position.y = physicsJump && this.rootBone ? -this.rootBone.position.y * this.object.scale.y : 0;
  }

  reset(): void {
    this.oneShotRemaining = 0;
    this.object.position.y = 0;
    this.current = undefined;
    this.mixer.stopAllAction();
    this.playBase('idle');
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.object);
  }
}

function configureInstance(scene: THREE.Object3D, skin: string): void {
  scene.scale.setScalar(CHARACTER_SCALE);
  // Exported glTF faces +Z; gameplay's neutral forward is -Z.
  scene.rotation.y = Math.PI;
  scene.traverse((object) => {
    if (object.name.startsWith('Skin_')) object.visible = object.name === `Skin_${skin}`;
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

export function createCharacterPresentation(
  playerPose: THREE.Group,
  rivalPose: THREE.Group,
  playerCube: THREE.Object3D,
  rivalCube: THREE.Object3D,
  skins: { player: CharacterSkin; rival: CharacterSkin } = PROVISIONAL_SKINS,
): CharacterPresentation {
  let currentStatus: CharacterPresentation['status'] = 'loading';
  let disposed = false;
  let reducedMotion = false;
  let playerActor: AnimatedActor | undefined;
  let rivalActor: AnimatedActor | undefined;
  let playerObject: THREE.Object3D | undefined;
  let rivalObject: THREE.Object3D | undefined;

  const ready = new GLTFLoader().loadAsync(CHARACTER_ASSET).then((gltf) => {
    if (disposed) return;
    playerObject = clone(gltf.scene);
    rivalObject = clone(gltf.scene);
    configureInstance(playerObject, skins.player);
    configureInstance(rivalObject, skins.rival);
    playerPose.add(playerObject);
    rivalPose.add(rivalObject);
    playerActor = new AnimatedActor(playerObject, gltf.animations);
    rivalActor = new AnimatedActor(rivalObject, gltf.animations);
    playerCube.visible = false;
    rivalCube.visible = false;
    currentStatus = 'characters';
  }).catch((error: unknown) => {
    console.warn('Character asset unavailable; retaining cube presentation.', error);
    if (!disposed) currentStatus = 'cubes';
  });

  return {
    ready,
    get status() { return currentStatus; },
    get playerClip() { return playerActor?.clip; },
    get rivalClip() { return rivalActor?.clip; },
    requestAction(action) { playerActor?.trigger(action, false); },
    consume(event) {
      if (event.type === 'serve' || event.type === 'point') {
        playerActor?.reset();
        rivalActor?.reset();
        return;
      }
      if (event.type === 'match') {
        const winner = event.side === 'player' ? playerActor : rivalActor;
        const loser = event.side === 'player' ? rivalActor : playerActor;
        if (!reducedMotion) winner?.trigger('celebration');
        loser?.trigger('loss');
        return;
      }
      const clip = clipForFeedback(event, reducedMotion);
      if (clip) (event.side === 'player' ? playerActor : rivalActor)?.trigger(clip);
    },
    update(dt, player, rival) {
      playerActor?.update(dt, player);
      rivalActor?.update(dt, rival);
    },
    reset() {
      playerActor?.reset();
      rivalActor?.reset();
    },
    setReducedMotion(reduced) { reducedMotion = reduced; },
    setSkins(player, rival) {
      skins = { player, rival };
      if (playerObject) configureInstance(playerObject, player);
      if (rivalObject) configureInstance(rivalObject, rival);
    },
    dispose() {
      disposed = true;
      currentStatus = 'disposed';
      playerActor?.dispose();
      rivalActor?.dispose();
      const roots = [playerObject, rivalObject].filter((root): root is THREE.Object3D => Boolean(root));
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      for (const root of roots) {
        root.removeFromParent();
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          geometries.add(object.geometry);
          const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
          meshMaterials.forEach((material) => materials.add(material));
        });
      }
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
