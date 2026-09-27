import bpy, math, bmesh
from mathutils import Vector
s=bpy.context.scene
# Standard is defined by the installed Blender OCIO config (dynamic RNA enum reports NONE).
s.view_settings.view_transform='Standard'
for m in bpy.data.materials:
 if m.use_nodes:
  p=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
  if p: p.inputs['Emission Strength'].default_value=.18
bpy.data.lights['Large softbox'].energy=650
next(n for n in s.world.node_tree.nodes if n.type=='BACKGROUND').inputs[1].default_value=.65
for ob in list(s.objects):
 if ob.type!='MESH' or not ob.parent: continue
 # Round cheeks toward a more pointed chin.
 if '_head' in ob.name:
  for v in ob.data.vertices:
   if v.co.z<1.70: v.co.x*=.88+.12*max(0,(v.co.z-1.295)/.405)
 if '_ankle_' in ob.name:
  ob.hide_render=True; ob.hide_set(True)
 if '_shirt' in ob.name:
  for v in ob.data.vertices:
   if v.co.z<.80: v.co.z+=.045
 if '_shorts' in ob.name:
  for v in ob.data.vertices:
   v.co.z-=.01; v.co.x*=.94; v.co.y*=.92
 # Rotate ALL boot components around the same ankle; shoe topology stays rig-compatible.
 groups=[g.name for g in ob.vertex_groups]
 if groups and groups[0].startswith('foot.'):
  sign=-1 if groups[0].endswith('L') else 1
  a=sign*.46
  for v in ob.data.vertices:
   x=v.co.x-sign*.36; y=v.co.y
   v.co.x=sign*.36+x*math.cos(a)-y*math.sin(a)
   v.co.y=x*math.sin(a)+y*math.cos(a)
 # Inflate ink shells; normals are inward.
 if ob.name.endswith('_ink'):
  for v in ob.data.vertices: v.co-=v.normal*.006
# Correct skin hues under Standard display.
for name,col in [('Skin • pale',(.76,.64,.49)),('Skin • peach',(.82,.60,.34)),('Skin • warm brown',(.42,.23,.10))]:
 m=bpy.data.materials[name]; p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'); p.inputs['Base Color'].default_value=(*col,1); p.inputs['Emission Color'].default_value=(*col,1)
# Avoid a horizontal double outline over the brown crown by embedding the fringe into cap.
for name in ['brown_fringe','brown_fringe_ink']:
 ob=bpy.data.objects[name]
 for v in ob.data.vertices:
  if v.co.z>2.10: v.co.y+=.13
# A slightly oblique head and torso pose matches the less rigid reference attitude.
for name,angle,lean in [('orange',-.12,-.06),('bunny',.24,.09),('brown',-.07,-.035)]:
 rig=bpy.data.objects['Rig • '+name]
 for bn in ['head','spine']:
  pb=rig.pose.bones[bn]; pb.rotation_mode='XYZ'; pb.rotation_euler[1]=lean if bn=='spine' else 0
 rig.pose.bones['head'].rotation_euler[2]=angle
s.camera.location=(0,-13,4.4); s.camera.rotation_euler=(Vector((0,0,1.35))-s.camera.location).to_track_quat('-Z','Y').to_euler()
s.render.filepath='/Users/adityachauhan/Documents/GameJam/assets/blender/lineup-preview.png'
bpy.ops.wm.save_as_mainfile(filepath='/Users/adityachauhan/Documents/GameJam/assets/blender/chibi-lineup.blend')
bpy.ops.render.render(write_still=True)
print('Refined and saved')
