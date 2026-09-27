import bpy,ast,json
BASE='/Users/adityachauhan/Documents/GameJam'
source=open(BASE+'/assets/blender/animate_characters.py').read()
node=next(n for n in ast.parse(source).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='clips' for t in n.targets))
clips=ast.literal_eval(node.value); validation={}
scene=bpy.data.scenes['SWAPPABLE SKINS • one rig']; bpy.context.window.scene=scene
rig=bpy.data.objects['ChibiRig']; skins=[bpy.data.objects['Skin_'+v] for v in ['orange','bunny','brown']]
rig.animation_data.action=bpy.data.actions['idle']; scene.frame_set(1)
# Export a single rig with all three interchangeable skinned meshes and all shared clips.
for skin in skins: skin.hide_set(False); skin.hide_render=False
bpy.context.view_layer.update()
for o in bpy.context.view_layer.objects:
    if o: o.select_set(False)
rig.select_set(True)
for sk in skins: sk.select_set(True)
bpy.context.view_layer.objects.active=rig
# Format uses the exporter's dynamic enum; derive the valid identifiers from its implementation.
from io_scene_gltf2 import get_format_items
formats=get_format_items(None,bpy.context)
valid=[item[0] for item in formats]; assert 'GLB' in valid,valid
bpy.ops.export_scene.gltf(filepath=BASE+'/public/assets/characters/chibi-animated.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIONS',export_frame_range=False,export_force_sampling=True,export_anim_slide_to_zero=True,export_anim_single_armature=True,export_extras=True,export_yup=True)
for skin in skins: skin.hide_set(skin.name!='Skin_orange'); skin.hide_render=skin.name!='Skin_orange'
# Link the SAME actions to the lineup instances for an immediate three-character preview.
lineup=bpy.data.scenes['Chibi Reference Lineup']; lineup.render.fps=60; lineup.render.fps_base=1
for variant in ['orange','bunny','brown']:
    r=bpy.data.objects['Rig • '+variant]; r.animation_data_create(); r.animation_data.action=bpy.data.actions['run']
    r.animation_data.action_slot=bpy.data.actions['run'].slots[0]
lineup.frame_start=1; lineup.frame_end=25; lineup.frame_set(1)
# Named strips make the complete clip set easy to browse without replacing a shared action.
rig['animation_clips']=json.dumps(clips)
open(BASE+'/assets/blender/animation-manifest.json','w').write(json.dumps({'fps':60,'clips':clips,'validation':validation,'source_game':{'speed':4.8,'contact_height':[.35,2.8],'power_pose_duration':.55,'manual_jump':False,'header_command':False},'export':'public/assets/characters/chibi-animated.glb'},indent=2))
bpy.context.window.scene=lineup
for a in bpy.context.screen.areas:
    if a.type=='VIEW_3D': a.spaces.active.region_3d.view_perspective='CAMERA'; a.spaces.active.region_3d.view_camera_zoom=12
bpy.ops.wm.save_as_mainfile(filepath=BASE+'/assets/blender/chibi-lineup.blend')
print(json.dumps({'actions':list(clips),'validation':validation,'file':bpy.data.filepath}))
