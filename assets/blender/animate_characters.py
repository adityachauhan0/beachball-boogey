"""Author reusable in-place sports actions in the existing Blender MCP session."""
import bpy, math, json, numpy as np
from mathutils import Vector, Euler, Quaternion
from math import sin, cos, pi
BASE='/Users/adityachauhan/Documents/GameJam'
scene=bpy.data.scenes['SWAPPABLE SKINS • one rig']; bpy.context.window.scene=scene
scene.render.fps=60; scene.render.fps_base=1.0
rig=bpy.data.objects['ChibiRig']; skins=[bpy.data.objects['Skin_'+v] for v in ['orange','bunny','brown']]
for sk in skins: sk.hide_set(False)
rig.animation_data_create()
if rig.animation_data.action: rig.animation_data.action=None
for track in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(track)
rest={b.name:b.matrix_local.to_quaternion() for b in rig.data.bones}
for pb in rig.pose.bones: pb.rotation_mode='QUATERNION'

def smooth(t): return t*t*(3-2*t)
def curve(t,keys):
    if t<=keys[0][0]: return keys[0][1]
    for (a,x),(b,y) in zip(keys,keys[1:]):
        if t<=b: return x+(y-x)*smooth((t-a)/(b-a))
    return keys[-1][1]
def reset():
    for pb in rig.pose.bones:
        pb.location=(0,0,0); pb.rotation_quaternion=(1,0,0,0); pb.scale=(1,1,1)
def rot(bone,x=0,y=0,z=0):
    q=Euler((x,y,z),'XYZ').to_quaternion(); r=rest[bone]
    rig.pose.bones[bone].rotation_quaternion=r.inverted()@q@r

def move(bone,x=0,y=0,z=0): rig.pose.bones[bone].location=rest[bone].inverted()@Vector((x,y,z))
def leg(side,thigh=0,knee=0,toe=0):
    rot('thigh.'+side,x=-thigh); rot('shin.'+side,x=-knee); rot('foot.'+side,x=thigh+knee-toe)
def hands(pitch=0,spread=0,height=0):
    for side,sign in [('L',-1),('R',1)]: move('hand.'+side,x=sign*spread,y=pitch,z=height)

clips={
'idle':{'duration':1.2,'loop':True,'description':'Quiet ready stance; head and hands breathe while soles stay planted.'},
'run':{'duration':.4,'loop':True,'description':'Fast alternating cleat shuffle, opposite hands, forward body lean; authored for 4.8 units/s.'},
'jump':{'duration':.7,'loop':False,'takeoff':.12,'apex':.32,'land':.57,'description':'Crouch, takeoff, tucked feet, airborne arc and soft landing.'},
'ground_kick':{'duration':.30,'loop':False,'contact':.10,'description':'Right-foot backswing, low forward strike, follow-through and planted recovery.'},
'aerial_kick':{'duration':.55,'loop':False,'takeoff':.08,'contact':.20,'land':.45,'description':'Hop into a raised instep volley, counterbalanced hands, cushioned landing.'},
'header':{'duration':.35,'loop':False,'contact':.10,'description':'Short backward load followed by a forward neck/torso snap at head height.'},
'jump_header':{'duration':.60,'loop':False,'takeoff':.10,'contact':.24,'land':.49,'description':'Airborne header with torso drive, tucked cleats and recovery.'},
'bicycle_kick':{'duration':.55,'loop':False,'takeoff':.06,'contact':.20,'land':.48,'description':'Backflip with scissoring cleats and an overhead strike; matches the existing 0.55s power cue.'},
'celebration':{'duration':.85,'loop':False,'description':'Two quick hops, lifted hands, happy head tilt, return to ready.'},
'loss':{'duration':.8,'loop':False,'description':'Head droop, sagging torso and hands, then return to ready.'},
}

def pose(name,t):
    reset(); lift=0
    if name=='idle':
        wave=sin(t*2*pi); rot('spine',x=.015*wave); rot('head',x=-.01*wave,z=.015*wave)
        hands(height=.015*wave)
    elif name=='run':
        wave=sin(t*2*pi); rot('spine',x=.14,z=.035*wave); rot('head',x=-.10)
        for side,sign in [('L',1),('R',-1)]:
            swing=.70*wave*sign; knee=-.35*max(0,-wave*sign)
            leg(side,swing,knee,toe=.08*max(0,wave*sign))
            move('hand.'+side,y=.19*wave*sign,z=.045*cos(t*4*pi))
        lift=.025*(1-cos(t*4*pi))
    elif name=='jump':
        lift=curve(t,[(0,0),(.17,-.10),(.46,.68),(.80,0),(.90,-.06),(1,0)])
        tuck=curve(t,[(0,0),(.17,.35),(.43,.65),(.68,.55),(.82,.20),(1,0)])
        for side in ['L','R']: leg(side,tuck,-tuck*1.65,toe=.12*tuck)
        rot('spine',x=-.08*tuck); hands(spread=.10*tuck,height=.30*tuck)
    elif name=='ground_kick':
        kick=curve(t,[(0,0),(.15,-.35),(1/3,1.05),(.55,.74),(1,0)])
        knee=curve(t,[(0,0),(.15,-.40),(1/3,.04),(.6,-.10),(1,0)])
        leg('R',kick,knee,toe=.15*max(0,kick)); leg('L',-.06*sin(t*pi),.04*sin(t*pi))
        rot('spine',x=-.10*sin(t*pi),z=.07*sin(t*pi)); rot('head',x=.04*sin(t*pi))
        hands(spread=.07*sin(t*pi),height=.04*sin(t*pi)); move('hand.R',y=.12*sin(t*pi),z=.05*sin(t*pi))
    elif name=='aerial_kick':
        lift=curve(t,[(0,0),(.12,-.07),(.36,.55),(.60,.38),(.82,0),(.92,-.05),(1,0)])
        kick=curve(t,[(0,0),(.16,.3),(.20/.55,1.70),(.58,1.30),(.82,.30),(1,0)])
        knee=curve(t,[(0,0),(.16,-.7),(.20/.55,-.10),(.58,-.45),(.82,-.25),(1,0)])
        leg('R',kick,knee,toe=.15*sin(t*pi)); leg('L',-.30*sin(t*pi),-.70*sin(t*pi),toe=.1*sin(t*pi))
        rot('spine',x=-.22*sin(t*pi),z=.10*sin(t*pi)); rot('head',x=.12*sin(t*pi))
        hands(spread=.13*sin(t*pi),height=.20*sin(t*pi))
    elif name in ['header','jump_header']:
        contact=(.10/.35 if name=='header' else .24/.60)
        snap=curve(t,[(0,0),(contact*.45,-.16),(contact,.25),(contact+.15,.14),(1,0)])
        rot('spine',x=snap); rot('neck',x=snap*.40); rot('head',x=snap*.55)
        hands(spread=.08*sin(t*pi),height=.12*sin(t*pi));
        if name=='jump_header':
            lift=curve(t,[(0,0),(.12,-.06),(.40,.58),(.65,.40),(.82,0),(.91,-.05),(1,0)])
            for side in ['L','R']: leg(side,.25*sin(t*pi),-.85*sin(t*pi),toe=.08*sin(t*pi))
    elif name=='bicycle_kick':
        flip=curve(t,[(0,0),(.11,-.20),(.20/.55,-1.75),(.62,-3.55),(.84,-5.9),(1,-2*pi)])
        rot('hips',x=flip)
        lift=curve(t,[(0,0),(.11,.20),(.20/.55,.95),(.62,1.20),(.84,.45),(1,0)])
        scissor=curve(t,[(0,0),(.12,.4),(.20/.55,1.6),(.62,-.8),(.84,.5),(1,0)])
        leg('R',scissor,-.35*sin(t*pi),toe=.05*sin(t*pi)); leg('L',-scissor*.65,-.85*sin(t*pi))
        rot('spine',x=-.12*sin(t*pi)); rot('head',x=.12*sin(t*pi)); hands(spread=.12*sin(t*pi),height=.3*sin(t*pi))
    elif name=='celebration':
        burst=sin(t*pi)**2; lift=.24*max(0,sin(t*4*pi))*burst
        hands(spread=.12*burst,height=.77*burst); rot('head',z=.14*sin(t*4*pi)*burst)
        for side in ['L','R']: leg(side,.18*burst,-.35*burst)
    elif name=='loss':
        droop=curve(t,[(0,0),(.28,1),(.72,1),(1,0)])
        rot('spine',x=.17*droop); rot('head',x=.40*droop); hands(pitch=.06*droop,height=-.09*droop)
    move('root',z=lift)

# Key every bone so each clip resets the prior pose and works on every appearance.
# Correct the whole rig upward when the oversized shoes or tall ears would enter the floor.
validation={}
for name,info in clips.items():
    old=bpy.data.actions.get(name)
    if old: bpy.data.actions.remove(old)
    action=bpy.data.actions.new(name); action.use_fake_user=True; rig.animation_data.action=action
    end=round(info['duration']*60); action.use_frame_range=True; action.frame_start=1; action.frame_end=end+1
    action['duration_seconds']=info['duration']; action['loop']=info['loop']; action['description']=info['description']
    action['gameplay_root_motion']=False
    for marker in ['contact','takeoff','land','apex']:
        if marker in info:
            m=action.pose_markers.new(marker); m.frame=1+round(info[marker]*60)
            action[marker+'_seconds']=info[marker]
    samples=[]; lastq={}
    for frame in range(end+1):
        pose(name,frame/end); bpy.context.view_layer.update()
        dg=bpy.context.evaluated_depsgraph_get(); mins=[]
        for skin in skins:
            me=skin.evaluated_get(dg).data; co=np.empty(len(me.vertices)*3,dtype=np.float32); me.vertices.foreach_get('co',co)
            mins.append(float(co.reshape((-1,3))[:,2].min()))
        # Shared correction accounts for every skin, especially the rabbit ears during inversion.
        clearance=.008+(.06*sin(pi*frame/end) if name=='bicycle_kick' else 0)
        correction=max(0,clearance-min(mins))
        if correction: rig.pose.bones['root'].location+=rest['root'].inverted()@Vector((0,0,correction))
        for pb in rig.pose.bones:
            q=pb.rotation_quaternion.copy()
            if pb.name in lastq and q.dot(lastq[pb.name])<0: q.negate(); pb.rotation_quaternion=q
            lastq[pb.name]=q.copy()
            pb.keyframe_insert(data_path='rotation_quaternion',frame=frame+1,group=pb.name)
            pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
        samples.append({'frame':frame+1,'floor_min':min(mins)+correction,'root_lift':float((rest['root']@rig.pose.bones['root'].location).z)})
    # Sampled curves use linear interpolation to avoid overshoot between authored poses.
    for layer in action.layers:
        for strip in layer.strips:
            for slot in action.slots:
                bag=strip.channelbag(slot)
                if bag:
                    for fc in bag.fcurves:
                        for key in fc.keyframe_points: key.interpolation='LINEAR'
    action.asset_mark(); action.asset_data.description=info['description']
    validation[name]={'duration':info['duration'],'frame_range':[1,end+1],'floor_min':min(p['floor_min'] for p in samples),'max_root_lift':max(p['root_lift'] for p in samples),'samples':len(samples)}
rig.animation_data.action=bpy.data.actions['idle']; scene.frame_start=1; scene.frame_end=73; scene.frame_set(1)
for skin in skins: skin.hide_set(skin.name!='Skin_orange')
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
