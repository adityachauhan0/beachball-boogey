import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COURT, PLAYER_START, RIVAL_START } from '../game/court';
import { applyCourtAppearance, fitCourtViewport } from './court-appearance';

export type CourtScene = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  player: THREE.Group;
  playerFacing: THREE.Mesh;
  playerPose: THREE.Group;
  playerCube: THREE.Group;
  rivalPose: THREE.Group;
  rivalCube: THREE.Group;
  rival: THREE.Group;
  update: (dt: number) => void;
  resize: () => void;
  dispose: () => void;
};

export const COURT_ASSET = '/assets/environments/beach-court.glb';
// Measured in the source .blend: centre the playable sidelines on x=0 and
// place the authored net plane on z=0 after Blender's +Y -> glTF -Z mapping.
const COURT_ASSET_OFFSET = { x: -0.1122, z: 2.7535 } as const;

/**
 * Adapted from `createPlayer` in Soccer_ThreeJS (MIT, unknown11-svg,
 * d96313359611303e0ba1a47fdc2402fdb9957d23): retain the minimal BoxGeometry
 * placeholder idea, with our smaller court-scale proportions and presentation.
 */
function createPlayer(color: number, isControlled: boolean): { root: THREE.Group; pose: THREE.Group; cube: THREE.Group } {
  const root = new THREE.Group();
  const pose = new THREE.Group();
  const cube = new THREE.Group();
  root.add(pose);
  pose.add(cube);
  const bodyGeometry = new THREE.BoxGeometry(0.9, 1.35, 0.78);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.68 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.77;
  body.castShadow = true;
  body.receiveShadow = true;
  cube.add(body);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(bodyGeometry),
    new THREE.LineBasicMaterial({ color: isControlled ? 0x123b57 : 0x593a49, transparent: true, opacity: 0.74 }),
  );
  edges.position.copy(body.position);
  cube.add(edges);

  const ringGeometry = new THREE.RingGeometry(isControlled ? 0.58 : 0.48, isControlled ? 0.72 : 0.57, 48);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: isControlled ? 0x22d3db : 0xffe7dc,
    transparent: true,
    opacity: isControlled ? 0.96 : 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.075; // Above the authored sand patches and painted lines.
  root.add(ring);

  return { root, pose, cube };
}

function createFacingIndicator(): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0.065, -0.65,
    -0.18, 0.065, -0.34,
    0.18, 0.065, -0.34,
  ], 3));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({ color: 0xffbb63, side: THREE.DoubleSide, depthWrite: false });
  return new THREE.Mesh(geometry, material);
}

export function createCourtScene(host: HTMLElement): CourtScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ae3e2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe7ffff, 0xc28f60, 2.1));
  const sun = new THREE.DirectionalLight(0xfff4d8, 3.1);
  sun.position.set(-8, 16, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -13;
  sun.shadow.camera.right = 13;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -10;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // Baked scenery already contains its own shadows. Only live actors and the
  // ball cast onto this transparent receiver above the authored line meshes.
  const liveShadows = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT.maxX - COURT.minX, COURT.playerEndZ - COURT.rivalEndZ),
    new THREE.ShadowMaterial({ opacity: 0.24, depthWrite: false }),
  );
  liveShadows.rotation.x = -Math.PI / 2;
  liveShadows.position.set(0, 0.061, (COURT.playerEndZ + COURT.rivalEndZ) / 2);
  liveShadows.receiveShadow = true;
  scene.add(liveShadows);

  const fallback = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.MeshStandardMaterial({ color: 0xe8bd78, roughness: 1 }),
  );
  fallback.rotation.x = -Math.PI / 2;
  fallback.position.y = -0.03;
  fallback.receiveShadow = true;
  scene.add(fallback);

  let environment: THREE.Object3D | undefined;
  let disposed = false;
  new GLTFLoader().loadAsync(COURT_ASSET).then((gltf) => {
    if (disposed) return;
    environment = gltf.scene;
    environment.position.set(COURT_ASSET_OFFSET.x, 0, COURT_ASSET_OFFSET.z);
    environment.updateMatrixWorld(true);
    const authoredCamera = gltf.cameras[0];
    if (!(authoredCamera instanceof THREE.PerspectiveCamera)) throw new Error('Beach court export is missing its authored camera.');
    camera.copy(authoredCamera, false);
    authoredCamera.getWorldPosition(camera.position);
    authoredCamera.getWorldQuaternion(camera.quaternion);
    camera.updateMatrixWorld(true);
    applyCourtAppearance(environment, camera);
    scene.add(environment);
    fallback.visible = false;
    resize();
  }).catch((error: unknown) => {
    console.warn('Beach court asset unavailable; retaining sand fallback.', error);
  });

  const { root: player, pose: playerPose, cube: playerCube } = createPlayer(0x2386ef, true);
  player.position.set(PLAYER_START.x, 0, PLAYER_START.z);
  scene.add(player);
  const playerFacing = createFacingIndicator();
  player.add(playerFacing);

  const { root: rival, pose: rivalPose, cube: rivalCube } = createPlayer(0xf06d78, false);
  rival.position.set(RIVAL_START.x, 0, RIVAL_START.z);
  rival.rotation.y = Math.PI;
  scene.add(rival);

  // Source-camera fallback until the exact camera loads from the GLB.
  const camera = new THREE.PerspectiveCamera(25.434, 1584 / 993, 0.1, 500);
  camera.position.set(COURT_ASSET_OFFSET.x, 18, 22 + COURT_ASSET_OFFSET.z);
  camera.lookAt(COURT_ASSET_OFFSET.x, 0, COURT_ASSET_OFFSET.z - 2);

  const resize = () => {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    // Contain the authored composition; don't stretch the court or crop a
    // baseline on wider/narrower screens. Pointer rays use this canvas rect.
    const fitted = fitCourtViewport(width, height, camera.aspect);
    renderer.setSize(fitted.width, fitted.height, false);
    Object.assign(renderer.domElement.style, {
      width: `${fitted.width}px`, height: `${fitted.height}px`,
      position: 'absolute', left: `${(width - fitted.width) / 2}px`, top: `${(height - fitted.height) / 2}px`,
    });
  };
  resize();

  const update = (_dt: number) => { /* Scenery is baked; actors use their own mixers. */ };

  const dispose = () => {
    disposed = true;
    renderer.dispose();
    renderer.domElement.remove();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
          material.dispose();
        });
      }
    });
  };

  return { scene, camera, renderer, player, playerFacing, playerPose, playerCube, rivalPose, rivalCube, rival, update, resize, dispose };
}

export function setPlayerFacingIndicator(indicator: THREE.Mesh, direction: { x: number; z: number }): void {
  indicator.rotation.y = Math.atan2(-direction.x, -direction.z);
}

export function placePlayer(group: THREE.Group, position: { x: number; z: number }): void {
  group.position.set(position.x, 0, position.z);
}
