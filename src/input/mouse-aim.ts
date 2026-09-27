import * as THREE from 'three';
import type { Vector2 } from '../game/movement';
import { PLAYER_AIM_BOUNDS } from '../game/court';

export { PLAYER_AIM_BOUNDS } from '../game/court';

export function clampPlayerAim(point: Vector2): Vector2 {
  return {
    x: Math.max(PLAYER_AIM_BOUNDS.minX, Math.min(PLAYER_AIM_BOUNDS.maxX, point.x)),
    z: Math.max(PLAYER_AIM_BOUNDS.minZ, Math.min(PLAYER_AIM_BOUNDS.maxZ, point.z)),
  };
}

/** Own-half cursor positions express a hitting direction, not a net drop. */
export function resolvePlayerAim(point: Vector2, player: Vector2): Vector2 {
  const dx = point.x - player.x;
  const forward = Math.max(0.75, player.z - point.z);
  const angle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, Math.atan2(dx, forward)));
  // Straighter strikes travel deeper; angled strikes trade depth for width.
  const depth = 3 + 3 * Math.cos(angle);
  const directional = clampPlayerAim({
    x: player.x + Math.tan(angle) * (player.z + depth),
    z: -depth,
  });
  // Blend near the net to avoid a sudden target jump as the cursor crosses it.
  const directWeight = Math.max(0, Math.min(1, -point.z / 2.5));
  const direct = clampPlayerAim(point);
  return {
    x: directional.x + (direct.x - directional.x) * directWeight,
    z: directional.z + (direct.z - directional.z) * directWeight,
  };
}

export function createMouseAim(canvas: HTMLCanvasElement, camera: THREE.Camera, playerRoot: THREE.Object3D) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const courtPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  let target: Vector2 | undefined;

  const guide = new THREE.Group();
  guide.position.y = 2.7;
  guide.renderOrder = 20;
  const blackMaterial = new THREE.MeshBasicMaterial({ color: 0x101820, depthTest: false });
  const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
  const lineOutline = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.5, 12), blackMaterial);
  const lineFill = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 1.5, 12), whiteMaterial);
  for (const line of [lineOutline, lineFill]) {
    line.position.z = -0.75;
    line.rotation.x = -Math.PI / 2;
  }
  const arrowOutline = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 16), blackMaterial);
  const arrowFill = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.36, 16), whiteMaterial);
  for (const arrow of [arrowOutline, arrowFill]) {
    arrow.position.z = -1.66;
    arrow.rotation.x = -Math.PI / 2;
  }
  guide.add(lineOutline, lineFill, arrowOutline, arrowFill);
  guide.visible = false;
  playerRoot.add(guide);

  function onPointerMove(event: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(courtPlane, intersection)) {
      target = { x: intersection.x, z: intersection.z };
    }
  }
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerMove);

  return {
    get active(): boolean { return target !== undefined; },
    get target(): Vector2 | undefined { return target ? resolvePlayerAim(target, playerRoot.position) : undefined; },
    reset(): void { target = undefined; guide.visible = false; },
    update(player: Vector2, visible: boolean): void {
      guide.visible = visible && target !== undefined;
      if (!target) return;
      const resolved = resolvePlayerAim(target, player);
      guide.rotation.y = -Math.atan2(resolved.x - player.x, -(resolved.z - player.z));
    },
    dispose(): void {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerMove);
      playerRoot.remove(guide);
      lineOutline.geometry.dispose(); lineFill.geometry.dispose(); arrowOutline.geometry.dispose(); arrowFill.geometry.dispose();
      blackMaterial.dispose(); whiteMaterial.dispose();
    },
  };
}
