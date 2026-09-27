import bpy
# Rebuild the three consolidated skins from the refined editable components.
s=bpy.data.scenes['Chibi Reference Lineup']
a=bpy.data.scenes['SWAPPABLE SKINS • one rig']; master=bpy.data.objects['ChibiRig']
for ob in list(a.objects):
 if ob.type=='MESH' and not ob.name.startswith(('Skin_', 'previous_Skin_')): bpy.data.objects.remove(ob,do_unlink=True)
if bpy.data.objects.get('previous_Skin_orange'): bpy.data.objects['previous_Skin_orange'].name='Skin_orange'
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
