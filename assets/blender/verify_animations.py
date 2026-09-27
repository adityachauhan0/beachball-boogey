import bpy,json,numpy as np
from mathutils import Vector
BASE='/Users/adityachauhan/Documents/GameJam'
s=bpy.data.scenes['SWAPPABLE SKINS • one rig']; bpy.context.window.scene=s
r=bpy.data.objects['ChibiRig']; skins=[bpy.data.objects['Skin_'+v] for v in ['orange','bunny','brown']]
for sk in skins: sk.hide_set(False)
manifest=json.load(open(BASE+'/assets/blender/animation-manifest.json')); report={}
for name,info in manifest['clips'].items():
 a=bpy.data.actions[name]; r.animation_data.action=a; r.animation_data.action_slot=a.slots[0]
 end=round(info['duration']*60)+1; minimum=1e10; maxlift=0; start=None; finish=None; motion=[]
 for frame in range(1,end+1):
  s.frame_set(frame); dg=bpy.context.evaluated_depsgraph_get()
  floor=[]
  for sk in skins:
   me=sk.evaluated_get(dg).data; co=np.empty(len(me.vertices)*3,dtype=np.float32); me.vertices.foreach_get('co',co)
   floor.append(float(co.reshape((-1,3))[:,2].min()))
  minimum=min(minimum,*floor); maxlift=max(maxlift,float(r.pose.bones['root'].matrix.translation.z))
  matrices=np.array([list(v) for pb in r.pose.bones for v in pb.matrix],dtype=np.float32)
  if frame==1: start=matrices.copy()
  if frame==end: finish=matrices.copy()
  motion.append(matrices)
 report[name]={'duration':info['duration'],'frame_range':[1,end],'samples':end,'floor_min':minimum,'max_root_lift':maxlift,'loop_endpoint_delta':float(np.max(np.abs(start-finish))),'pose_motion':float(np.max(np.abs(np.array(motion)-start)))}
 assert report[name]['pose_motion']>.005,(name,'no movement')
 assert minimum>-.001,(name,'floor penetration',minimum)
 if info['loop']: assert report[name]['loop_endpoint_delta']<1e-5,(name,'loop pop')
manifest['validation']=report; open(BASE+'/assets/blender/animation-manifest.json','w').write(json.dumps(manifest,indent=2))
r.animation_data.action=bpy.data.actions['idle']; r.animation_data.action_slot=bpy.data.actions['idle'].slots[0]; s.frame_set(1)
for sk in skins: sk.hide_set(sk.name!='Skin_orange')
bpy.context.window.scene=bpy.data.scenes['Chibi Reference Lineup']
print(json.dumps(report))
