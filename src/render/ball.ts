import * as THREE from 'three';
import { BALL_RADIUS, type BallState, type Vec3 } from '../game/ball';
import type { Vector2 } from '../game/movement';

export type BallRenderInput = {
  ball: BallState | undefined;
  time: number;
  visible: boolean;
  landing: Vec3 | undefined;
  aim: Vector2 | undefined;
};

export function createBallVisual(scene: THREE.Scene) {
  const ball = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 24, 16), new THREE.MeshStandardMaterial({ color: 0xfffbef, roughness: 0.6 }));
  sphere.castShadow = true;
  ball.add(sphere);
  // Contrasting panels make rotation readable without a texture dependency.
  for (const direction of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.085, 5), new THREE.MeshStandardMaterial({ color: 0x203447, side: THREE.DoubleSide }));
    patch.position.copy(direction.clone().multiplyScalar(BALL_RADIUS + 0.002));
    patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    ball.add(patch);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.28, 32), new THREE.MeshBasicMaterial({ color: 0x62432c, transparent: true, opacity: 0.3, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  const landing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.46, 48), new THREE.MeshBasicMaterial({ color: 0xff8b39, side: THREE.DoubleSide, depthWrite: false }));
  landing.rotation.x = -Math.PI / 2;
  const aim = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.29, 32), new THREE.MeshBasicMaterial({ color: 0x22bfc7, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
  aim.rotation.x = -Math.PI / 2;
  scene.add(ball, shadow, landing, aim);
  return {
    update(input: BallRenderInput, alpha: number) {
      const b = input.ball;
      ball.visible = shadow.visible = !!b && input.visible;
      if (b) {
        ball.position.set(b.previousPosition.x + (b.position.x - b.previousPosition.x) * alpha, b.previousPosition.y + (b.position.y - b.previousPosition.y) * alpha, b.previousPosition.z + (b.position.z - b.previousPosition.z) * alpha);
        ball.rotation.set(input.time * 2, input.time * 1.4, input.time * 0.7);
        shadow.position.set(ball.position.x, 0.07, ball.position.z);
        shadow.scale.setScalar(1 + ball.position.y * 0.12);
      }
      const next = input.visible ? input.landing : undefined;
      landing.visible = !!next;
      if (next) landing.position.set(next.x, 0.065, next.z);
      aim.visible = !!input.visible && !!b && b.receiver === 'player' && !!input.aim;
      if (input.aim) aim.position.set(input.aim.x, 0.07, input.aim.z);
    },
  };
}
