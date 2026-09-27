import bpy, bmesh, math
from mathutils import Vector
s=bpy.context.scene
bpy.data.objects['Rig • bunny'].pose.bones['head'].rotation_euler[1]=-.30
# Smooth the broad uppers while keeping the source topology editable through modifiers.
for ob in list(s.objects):
 if ob.type!='MESH' or '_boot_' not in ob.name or ob.name.endswith('_ink'): continue
 mod=ob.modifiers.new('Rounded cleat form','SUBSURF'); mod.subdivision_type='CATMULL_CLARK'; mod.levels=1; mod.render_levels=1
 # Apply only shape modifier before skinning (rest geometry).
 bpy.context.view_layer.objects.active=ob
 bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in ob.data.polygons: p.use_smooth=True
 outline=bpy.data.objects.get(ob.name+'_ink')
 if outline:
  me=ob.data.copy(); me.materials.clear(); me.materials.append(bpy.data.materials['Ink • near black'])
  for v in me.vertices: v.co+=v.normal*.018
  bm=bmesh.new(); bm.from_mesh(me); bmesh.ops.reverse_faces(bm,faces=list(bm.faces)); bm.to_mesh(me); bm.free()
  outline.data=me
# Laces follow the upper instead of hovering above it.
for ob in s.objects:
 if ob.type!='MESH' or '_lace_' not in ob.name: continue
 for v in ob.data.vertices: v.co.z-=.035
# A continuous cap silhouette and tapered bangs reduce the cut-paper appearance.
for variant in ['orange','bunny','brown']:
 for ob in list(s.objects):
  if not ob.name.startswith(variant+'_') or ob.type!='MESH' or ob.name.endswith('_ink'): continue
  if not any(k in ob.name for k in ['fringe','bangs','long_right','long_left']): continue
  # Give hair fronts a subtle convex crown rather than an entirely planar front.
  ys=[v.co.y for v in ob.data.vertices]; front=min(ys)
  for v in ob.data.vertices:
   if v.co.y<front+.03:
    v.co.y-=.045*max(0,1-abs(v.co.x)/.5)
  ob.data.update()
  out=bpy.data.objects.get(ob.name+'_ink')
  if out:
   for a,b in zip(out.data.vertices,ob.data.vertices): a.co=b.co+b.normal*.018
# Rebuild the three consolidated skins from the refined editable components.
a=bpy.data.scenes['SWAPPABLE SKINS • one rig']; master=bpy.data.objects['ChibiRig']
bpy.context.window.scene=a
for variant in ['orange','bunny','brown']:
 old=bpy.data.objects['Skin_'+variant]; old.name='previous_Skin_'+variant
 copies=[]
 for src in bpy.data.objects['Rig • '+variant].children:
  if src.type!='MESH' or src.hide_render: continue
  ob=src.copy(); ob.data=src.data.copy(); ob.parent=master; ob.location=(0,0,0); a.collection.objects.link(ob)
  for m in ob.modifiers:
   if m.type=='ARMATURE': m.object=master
  copies.append(ob)
 bpy.context.view_layer.update()
 for o in bpy.context.view_layer.objects:
  if o: o.select_set(False)
 for o in copies: o.select_set(True)
 bpy.context.view_layer.objects.active=copies[0]; bpy.ops.object.join()
 new=copies[0]; new.name='Skin_'+variant; new.hide_render=variant!='orange'; new.hide_set(variant!='orange')
 new['variant']=variant; new['swap']='Show exactly one Skin_* mesh. All bind to ChibiRig.'
 # Remove only the generated intermediate consolidated copy, preserving authoring geometry.
 bpy.data.objects.remove(old,do_unlink=True)
bpy.context.window.scene=s
bpy.ops.wm.save_as_mainfile(filepath='/Users/adityachauhan/Documents/GameJam/assets/blender/chibi-lineup.blend')
bpy.ops.render.render(write_still=True)
print('Polished, consolidated, saved')
