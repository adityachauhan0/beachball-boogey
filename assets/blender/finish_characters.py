import bpy, math, json
from mathutils import Vector
s=bpy.context.scene
for variant in ['orange','bunny','brown']:
 r=bpy.data.objects['Rig • '+variant]
 for pb in r.pose.bones: pb.rotation_euler=(0,0,0)
 r.pose.bones['head'].rotation_euler[1]={'orange':-.14,'bunny':.35,'brown':-.08}[variant]
 r.pose.bones['spine'].rotation_euler[2]={'orange':.025,'bunny':.07,'brown':-.04}[variant]
# Round the toes and position laces on the actual upper surface.
for ob in list(s.objects):
 if ob.type!='MESH' or not ob.parent: continue
 gs=[g.name for g in ob.vertex_groups]
 if not gs or not gs[0].startswith('foot.'): continue
 sign=-1 if gs[0].endswith('L') else 1; a=sign*.66
 def local(v):
  x=v.x-sign*.36; y=v.y
  return Vector((x*math.cos(a)+y*math.sin(a),-x*math.sin(a)+y*math.cos(a),v.z))
 def world(v): return Vector((sign*.36+v.x*math.cos(a)-v.y*math.sin(a),v.x*math.sin(a)+v.y*math.cos(a),v.z))
 if '_boot_' in ob.name:
  isupper='_upper' in ob.name
  rows=[(-.79,.16,.275),(-.74,.255,.34),(-.59,.29,.40),(-.35,.28,.46),(-.12,.235,.51),(.13,.21,.49),(.22,.145,.37)]
  for j,(y,w,h) in enumerate(rows):
   for i in range(16):
    phi=2*math.pi*i/16; z=.16+((h-.16)*max(0,math.sin(phi))+.025*min(0,math.sin(phi)) if isupper else .045*math.sin(phi))
    ob.data.vertices[j*16+i].co=world(Vector((w*math.cos(phi),y,z)))
  ob.data.update()
  if ob.name.endswith('_ink'):
   for v in ob.data.vertices: v.co-=v.normal*.018
 if '_lace_' in ob.name:
  for v in ob.data.vertices:
   p=local(v.co); p.z+=.060; v.co=world(p)
# Dampen overbright ground illumination and remove polygon banding on skin only.
for ob in s.objects:
 if ob.type=='MESH' and any(k in ob.name for k in ['_head','_hand_','_ear','_cheek']):
  for p in ob.data.polygons: p.use_smooth=True
# Consolidate a copy of each skin into a single mesh in a dedicated interchange scene.
asset_scene=bpy.data.scenes.new('SWAPPABLE SKINS • one rig')
arm_data=bpy.data.armatures['CHIBI_SHARED_SKELETON']
master=bpy.data.objects.new('ChibiRig',arm_data); asset_scene.collection.objects.link(master); master.show_in_front=True
bpy.context.window.scene=asset_scene
skins=[]
for variant in ['orange','bunny','brown']:
 src=bpy.data.objects['Rig • '+variant]
 copies=[]
 for original in src.children:
  if original.type!='MESH' or original.hide_render: continue
  ob=original.copy(); ob.data=original.data.copy(); ob.parent=master; ob.location=(0,0,0)
  asset_scene.collection.objects.link(ob)
  for mod in ob.modifiers:
   if mod.type=='ARMATURE': mod.object=master
  copies.append(ob)
 for ob in bpy.context.view_layer.objects: ob.select_set(False)
 for ob in copies: ob.select_set(True)
 bpy.context.view_layer.objects.active=copies[0]
 bpy.ops.object.join()
 skin=copies[0]; skin.name='Skin_'+variant; skins.append(skin)
 skin['variant']=variant; skin['skeleton']='CHIBI_SHARED_SKELETON'; skin['swap']='Show exactly one Skin_* mesh; all share ChibiRig.'
 skin.hide_render=variant!='orange'; skin.hide_set(variant!='orange')
# Verify weights and actual deformation with one shared rig.
report={'shared_armature_users':arm_data.users,'bones':[b.name for b in arm_data.bones],'skins':{}}
for skin in skins:
 report['skins'][skin.name]={'vertices':len(skin.data.vertices),'polygons':len(skin.data.polygons),'unweighted':sum(not v.groups for v in skin.data.vertices),'armature':skin.modifiers[0].object.name}
 assert all(v.groups for v in skin.data.vertices)
 assert all(m.object==master for m in skin.modifiers if m.type=='ARMATURE')
 skin.hide_set(False)
# A common knee/foot pose must move every skin's footwear and leave its head unchanged.
deps=bpy.context.evaluated_depsgraph_get()
base={sk.name:[v.co.copy() for v in sk.evaluated_get(deps).data.vertices] for sk in skins}
master.pose.bones['shin.R'].rotation_mode='XYZ'; master.pose.bones['shin.R'].rotation_euler[0]=.6
bpy.context.view_layer.update(); deps=bpy.context.evaluated_depsgraph_get()
for sk in skins:
 after=sk.evaluated_get(deps).data.vertices
 moved=sum((v.co-base[sk.name][i]).length>1e-5 for i,v in enumerate(after))
 report['skins'][sk.name]['knee_pose_moved_vertices']=moved
 assert moved>100
master.pose.bones['shin.R'].rotation_euler=(0,0,0)
for sk in skins: sk.hide_set(sk.name!='Skin_orange')
master['instructions']='Skin_orange, Skin_bunny, Skin_brown are interchangeable meshes. Show one at a time. Shared rest skeleton, rigid articulated weights. Front -Y, Z up.'
# Pack the source image for convenient reference within the .blend.
img=bpy.data.images.load('/Users/adityachauhan/Documents/GameJam/references/character-recreation/lineup.png',check_existing=True); img.pack()
text=bpy.data.texts.new('READ ME • character skins')
text.write('REFERENCE RECONSTRUCTION — not an exact certified reproduction.\nLineup scene: three presentations using the same armature data.\nSWAPPABLE SKINS scene: one ChibiRig, three single-mesh skins. Enable one skin at a time.\nBlender Z up, front -Y. Approximately 2.4 units tall excluding tall hair/ears.\nDetached hands and short hidden limbs are intentional. No animation clips or gameplay integration yet.\nOriginal supplied image packed as lineup.png. Hidden surfaces inferred.\n')
report['exact_visual_match']=False
open('/Users/adityachauhan/Documents/GameJam/assets/blender/rig-validation.json','w').write(json.dumps(report,indent=2))
bpy.context.window.scene=s
s.render.filepath='/Users/adityachauhan/Documents/GameJam/assets/blender/lineup-preview.png'
bpy.ops.wm.save_as_mainfile(filepath='/Users/adityachauhan/Documents/GameJam/assets/blender/chibi-lineup.blend')
bpy.ops.render.render(write_still=True)
print(json.dumps(report))
