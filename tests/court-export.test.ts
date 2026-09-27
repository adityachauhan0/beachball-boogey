import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { fitCourtViewport } from '../src/render/court-appearance';
import { COURT } from '../src/game/court';

const bytes = readFileSync('public/assets/environments/beach-court.glb');
const jsonLength = bytes.readUInt32LE(12);
const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
// Load actual exported geometry/camera in Node, without requiring a browser
// image decoder. The embedded texture is checked independently below.
const binary = bytes.subarray(28 + jsonLength);
const geometryDocument = structuredClone(document);
delete geometryDocument.images;
delete geometryDocument.textures;
delete geometryDocument.materials;
for (const mesh of geometryDocument.meshes) for (const primitive of mesh.primitives) delete primitive.material;
const geometryJson = Buffer.from(JSON.stringify(geometryDocument));
const paddedLength = Math.ceil(geometryJson.length / 4) * 4;
const geometryGlb = Buffer.alloc(28 + paddedLength + binary.length, 0x20);
geometryGlb.writeUInt32LE(0x46546c67, 0);
geometryGlb.writeUInt32LE(2, 4);
geometryGlb.writeUInt32LE(geometryGlb.length, 8);
geometryGlb.writeUInt32LE(paddedLength, 12);
geometryGlb.writeUInt32LE(0x4e4f534a, 16);
geometryJson.copy(geometryGlb, 20);
geometryGlb.writeUInt32LE(binary.length, 20 + paddedLength);
geometryGlb.writeUInt32LE(0x004e4942, 24 + paddedLength);
binary.copy(geometryGlb, 28 + paddedLength);
const gltf = await new GLTFLoader().parseAsync(geometryGlb.buffer.slice(geometryGlb.byteOffset, geometryGlb.byteOffset + geometryGlb.byteLength), '');
const root = gltf.scene;
root.position.set(-0.1122, 0, 2.7535);
root.updateMatrixWorld(true);

describe('authored beach court export', () => {
  it('bundles one textured 3D scene, its camera, and no broken scenery animation tracks', () => {
    expect(document.scenes).toHaveLength(1);
    expect(document.meshes).toHaveLength(1);
    expect(document.images).toHaveLength(1);
    expect(document.images[0].mimeType).toBe('image/png');
    expect(document.bufferViews[document.images[0].bufferView].byteLength).toBeGreaterThan(500_000);
    expect(document.animations ?? []).toHaveLength(0);
    expect(document.nodes.some((node: { extras?: { camera_projected_bake?: boolean } }) => node.extras?.camera_projected_bake)).toBe(true);
    expect(bytes.length).toBeLessThan(4_000_000);
  });

  it('retains ground and real net geometry at the simulation boundaries', () => {
    const ray = new THREE.Raycaster();
    ray.set(new THREE.Vector3(2, 0.5, 5), new THREE.Vector3(0, -1, 0));
    const floor = ray.intersectObject(root, true)[0];
    expect(floor.point.y).toBeGreaterThanOrEqual(0.019);
    expect(floor.point.y).toBeLessThan(0.06);
    ray.set(new THREE.Vector3(0, COURT.netTop - 0.015, 1), new THREE.Vector3(0, 0, -1));
    const net = ray.intersectObject(root, true)[0];
    expect(net).toBeDefined();
    expect(Math.abs(net.point.z)).toBeLessThan(COURT.netHalfDepth + 0.01);
  });

  it('keeps every court corner in frame and mouse rays aligned with world coordinates', () => {
    const camera = gltf.cameras[0] as THREE.PerspectiveCamera;
    expect(camera.isPerspectiveCamera).toBe(true);
    expect(camera.aspect).toBeCloseTo(1584 / 993);
    for (const x of [COURT.minX, COURT.maxX]) for (const z of [COURT.rivalEndZ, COURT.playerEndZ]) {
      const position = new THREE.Vector3(x, 0, z);
      const screen = position.clone().project(camera);
      expect(Math.abs(screen.x)).toBeLessThan(1);
      expect(Math.abs(screen.y)).toBeLessThan(1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(screen.x, screen.y), camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())!;
      expect(hit.distanceTo(position)).toBeLessThan(0.0001);
    }
  });

  it.each([[1280, 720], [1920, 1080], [900, 900]])('contains the composition at %i × %i without stretching', (width, height) => {
    const fit = fitCourtViewport(width, height, 1584 / 993);
    expect(fit.width).toBeLessThanOrEqual(width);
    expect(fit.height).toBeLessThanOrEqual(height + 0.00001);
    expect(fit.width / fit.height).toBeCloseTo(1584 / 993);
  });
});
