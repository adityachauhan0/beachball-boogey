import * as THREE from 'three';

/** The authored scene uses a fixed perspective camera and Eevee-only shaders.
 * Sample its baked appearance on the exported 3D mesh, preserving depth for
 * players/ball. Divide AFTER interpolation: ordinary UVs warp large planes.
 * The bake camera must stay fixed even when the presentation viewport resizes.
 */
export function applyCourtAppearance(root: THREE.Object3D, bakeCamera: THREE.PerspectiveCamera): void {
  bakeCamera.updateMatrixWorld(true);
  const projection = new THREE.Matrix4().multiplyMatrices(bakeCamera.projectionMatrix, bakeCamera.matrixWorldInverse);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.userData.camera_projected_bake) return;
    const original = object.material as THREE.MeshStandardMaterial;
    const map = original.emissiveMap;
    if (!map) throw new Error('Beach court export is missing its embedded appearance texture.');
    const material = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false, fog: false });
    material.name = 'Authored beach appearance (projective bake)';
    material.onBeforeCompile = (shader) => {
      shader.uniforms.courtBakeProjection = { value: projection };
      shader.vertexShader = `uniform mat4 courtBakeProjection;\nvarying vec4 courtBakePosition;\n${shader.vertexShader}`
        .replace('#include <project_vertex>', `#include <project_vertex>
          courtBakePosition = courtBakeProjection * modelMatrix * vec4(transformed, 1.0);`);
      shader.fragmentShader = `varying vec4 courtBakePosition;\n${shader.fragmentShader}`
        .replace('#include <map_fragment>', `
          vec2 courtUv = courtBakePosition.xy / courtBakePosition.w * 0.5 + 0.5;
          // glTF image textures use top-left image coordinates (flipY=false).
          courtUv.y = 1.0 - courtUv.y;
          diffuseColor *= texture2D(map, courtUv);
        `);
    };
    material.customProgramCacheKey = () => 'beach-court-projective-bake-v1';
    object.material = material;
    object.castShadow = false;
    object.receiveShadow = false;
    original.dispose();
  });
}

export function fitCourtViewport(width: number, height: number, aspect: number): { width: number; height: number } {
  const fittedWidth = Math.min(width, height * aspect);
  return { width: fittedWidth, height: fittedWidth / aspect };
}
