import bpy,json,math
from mathutils import Vector
BASE='/Users/adityachauhan/Documents/GameJam'
manifest=json.load(open(BASE+'/assets/blender/animation-manifest.json'))
source=bpy.data.scenes['Chibi Reference Lineup']
scene=bpy.data.scenes.new('Animation showcase • Play timeline'); bpy.context.window.scene=scene
scene.world=source.world; scene.render.fps=60; scene.render.fps_base=1
scene.render.engine=source.render.engine; scene.view_settings.view_transform=source.view_settings.view_transform
scene.render.resolution_x=960; scene.render.resolution_y=540; scene.render.resolution_percentage=100
scene.render.image_settings.file_format=source.render.image_settings.file_format
stage=bpy.data.objects['brown_stage']; scene.collection.objects.link(stage)
light=bpy.data.objects['Large softbox']; scene.collection.objects.link(light)
cam=source.camera.copy(); cam.data=source.camera.data.copy(); cam.name='Animation camera'; scene.collection.objects.link(cam)
cam.location=(3.0,-13,5.3); cam.rotation_euler=(Vector((0,0,1.8))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale=9.3; scene.camera=cam
schedule=[]; frame=1
for name,info in manifest['clips'].items():
 repeat=3 if name=='run' else 1
 duration=round(info['duration']*60)*repeat
 schedule.append({'name':name,'start':frame,'end':frame+duration,'repeat':repeat})
 marker=scene.timeline_markers.new(name,frame=frame); frame+=duration+6
scene.frame_start=1; scene.frame_end=frame-6
for i,variant in enumerate(['orange','bunny','brown']):
 rig=bpy.data.objects['ChibiRig'].copy(); rig.name='PreviewRig_'+variant; rig.animation_data_clear(); scene.collection.objects.link(rig); rig.location.x=(i-1)*2.4
 skin=bpy.data.objects['Skin_'+variant].copy(); skin.name='PreviewSkin_'+variant; skin.parent=rig; skin.hide_render=False; scene.collection.objects.link(skin); skin.hide_set(False)
 for m in skin.modifiers:
  if m.type=='ARMATURE': m.object=rig
 rig.animation_data_create(); track=rig.animation_data.nla_tracks.new(); track.name='All sports actions'
 for segment in schedule:
  action=bpy.data.actions[segment['name']]; strip=track.strips.new(segment['name'],segment['start'],action); strip.action_slot=action.slots[0]
  strip.repeat=segment['repeat']; strip.blend_type='REPLACE'; strip.extrapolation='HOLD_FORWARD'
# Clip title billboard, authored in Blender and included in rendered preview.
font=bpy.data.curves.new('Action title','FONT'); font.size=.18; font.align_x='CENTER'; font.body='IDLE'
label=bpy.data.objects.new('Action title',font); scene.collection.objects.link(label); label.location=(0,-.35,3.90); label.rotation_euler=cam.rotation_euler; font.materials.append(bpy.data.materials['Ink • near black'])
scene['animation_schedule']=json.dumps(schedule); scene['instructions']='Press Play to preview the shared animations on all three skins. Actions are editable on ChibiRig in SWAPPABLE SKINS scene.'
scene.frame_set(1)
for a in bpy.context.screen.areas:
 if a.type=='VIEW_3D': a.spaces.active.region_3d.view_perspective='CAMERA'; a.spaces.active.overlay.show_overlays=False; a.spaces.active.region_3d.view_camera_zoom=12
notes=bpy.data.texts.get('READ ME • character skins')
notes.write('\nANIMATIONS: idle, run, jump, ground_kick, aerial_kick, header, jump_header, bicycle_kick, celebration, loss.\nAnimation showcase scene: Play timeline for all clips on all three appearances.\nSWAPPABLE SKINS scene: edit/select individual shared Actions on ChibiRig.\nSelf-contained export: public/assets/characters/chibi-animated.glb. One skeleton, 3 skin groups, 10 clips.\nContact/takeoff/landing times are in action markers and animation-manifest.json.\nAnimations are presentation-only assets; not yet wired into gameplay.\n')
bpy.ops.wm.save_as_mainfile(filepath=BASE+'/assets/blender/chibi-lineup.blend')
# Representative poses for visual QA, each showing all three variants.
for name in ['run','jump','ground_kick','aerial_kick','header','jump_header','bicycle_kick','celebration','loss']:
 seg=next(x for x in schedule if x['name']==name); info=manifest['clips'][name]
 sample=info.get('contact',info.get('apex',info['duration']*.45))
 scene.frame_set(seg['start']+round(sample*60)); font.body=name.replace('_',' ').upper()
 scene.render.filepath=BASE+'/assets/blender/animation-preview/'+name+'.png'; bpy.ops.render.render(write_still=True)
scene.frame_set(1); font.body='IDLE'
print(json.dumps({'scene':scene.name,'schedule':schedule,'end':scene.frame_end}))
