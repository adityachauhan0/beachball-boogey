import fs from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AnimationMixer, Box3, Vector3, LoopOnce } from 'three';
const root = '/Users/adityachauhan/Documents/GameJam';
const buffer = fs.readFileSync(`${root}/public/assets/characters/chibi-animated.glb`);
const gltf = await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
const manifest = JSON.parse(fs.readFileSync(`${root}/assets/blender/animation-manifest.json`));
const expected = Object.keys(manifest.clips);
if (gltf.scenes.length !== 1) throw new Error('Export includes extra scenes');
const meshes=[]; gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});
const skeleton=meshes[0].skeleton;
if (!meshes.every(m=>m.skeleton===skeleton)) throw new Error('Skins do not share the same skeleton');
const mixer=new AnimationMixer(gltf.scene); const report={scenes:gltf.scenes.length,bones:skeleton.bones.length,skinnedPrimitives:meshes.length,sharedSkeleton:true,clips:{}};
for (const name of expected) {
 const clip=gltf.animations.find(c=>c.name===name); if (!clip) throw new Error(`Missing ${name}`);
 if (Math.abs(clip.duration-manifest.clips[name].duration)>1e-5) throw new Error(`Duration mismatch ${name}: ${clip.duration}`);
 mixer.stopAllAction(); const action=mixer.clipAction(clip); action.setLoop(LoopOnce,1); action.clampWhenFinished=true; action.play();
 let floor=Infinity, max=0;
 for(let i=0;i<=20;i++){
  action.time=clip.duration*i/20; mixer.update(0); gltf.scene.updateMatrixWorld(true);
  for (const mesh of meshes) { mesh.skeleton.update(); mesh.computeBoundingBox(); const b=mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld); floor=Math.min(floor,b.min.y); max=Math.max(max,b.max.y); }
 }
 if(floor<-.008) throw new Error(`Export floor intersection ${name}: ${floor}`);
 report.clips[name]={duration:clip.duration,tracks:clip.tracks.length,minY:floor,maxY:max};
}
mixer.stopAllAction();
fs.writeFileSync(`${root}/assets/blender/export-validation.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
