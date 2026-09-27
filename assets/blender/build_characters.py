"""Reference-driven character authoring, executed in the live Blender MCP session."""
import bpy, bmesh, math, json, os
from mathutils import Vector
from math import sin, cos, pi
BASE='/Users/adityachauhan/Documents/GameJam'
# Keep the user's starting scene intact; create a separate authoring scene.
scene=bpy.data.scenes.new('Chibi Reference Lineup')
bpy.context.window.scene=scene
COL=scene.collection

def enum_set(owner, prop, value):
    valid=[i.identifier for i in owner.bl_rna.properties[prop].enum_items]
    if value not in valid: raise ValueError((prop,value,valid))
    setattr(owner,prop,value)

def mat(name, rgb):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*rgb,1); p.inputs['Roughness'].default_value=.95
    p.inputs['Specular IOR Level'].default_value=0
    p.inputs['Emission Color'].default_value=(*rgb,1); p.inputs['Emission Strength'].default_value=.32
    return m
ink=mat('Ink • near black',(.006,.007,.009)); ink.use_backface_culling=True
white=mat('Jersey • ivory white',(.91,.92,.9)); black=mat('Cleat • charcoal',(.025,.029,.033))
sole=mat('Rubber • charcoal grey',(.085,.09,.095)); blue=mat('Cleat • royal blue',(.015,.14,.65))
shortblue=mat('Shorts • cyan blue',(.015,.40,.8)); green=mat('Jersey • vivid green',(.03,.8,.005)); greenso=mat('Cleat • green sole',(.005,.22,.012))
yellow=mat('Hair • golden yellow',(.98,.64,.005)); orange=mat('Hair • orange',(.95,.25,.002)); brown=mat('Hair • chestnut',(.15,.066,.005))
pink=mat('Mouth • pink',(.95,.13,.23)); skinm=[mat('Skin • pale',(.86,.73,.57)),mat('Skin • warm brown',(.47,.25,.105)),mat('Skin • peach',(.88,.66,.38))]
inner=mat('Ears • inner tan',(.42,.23,.10))

# One data-block for all rigs, identical bone positions and names.
ad=bpy.data.armatures.new('CHIBI_SHARED_SKELETON')
rig=bpy.data.objects.new('Rig • orange',ad); COL.objects.link(rig)
bpy.context.view_layer.objects.active=rig; rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
spec=[('root',(0,0,0),(0,0,.2),None),('hips',(0,0,.62),(0,0,.83),'root'),('spine',(0,0,.83),(0,0,1.3),'hips'),('neck',(0,0,1.3),(0,0,1.43),'spine'),('head',(0,0,1.43),(0,0,2.05),'neck')]
for suffix,s in [('L',-1),('R',1)]:
    spec += [(f'upper_arm.{suffix}',(s*.20,0,1.26),(s*.43,0,1.02),'spine'),(f'forearm.{suffix}',(s*.43,0,1.02),(s*.58,-.015,.73),f'upper_arm.{suffix}'),(f'hand.{suffix}',(s*.58,-.015,.73),(s*.58,-.015,.86),f'forearm.{suffix}'),(f'thigh.{suffix}',(s*.18,0,.7),(s*.26,0,.47),'hips'),(f'shin.{suffix}',(s*.26,0,.47),(s*.35,0,.25),f'thigh.{suffix}'),(f'foot.{suffix}',(s*.35,0,.25),(s*.35,-.48,.20),f'shin.{suffix}')]
for name,h,t,parent in spec:
    b=ad.edit_bones.new(name); b.head=h; b.tail=t
    if parent: b.parent=ad.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT'); rig.select_set(False)
rig.show_in_front=True
parts=[]; current_rig=rig; prefix='orange'

def mesh(name,vs,fs,material,bone=None,outline=True):
    me=bpy.data.meshes.new(prefix+'_'+name); me.from_pydata(vs,[],fs); me.update()
    bm=bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(me); bm.free()
    ob=bpy.data.objects.new(prefix+'_'+name,me); COL.objects.link(ob); ob.data.materials.append(material)
    if bone:
        ob.parent=current_rig; vg=ob.vertex_groups.new(name=bone); vg.add(list(range(len(vs))),1,'REPLACE')
        mod=ob.modifiers.new('Shared skeleton','ARMATURE'); mod.object=current_rig
        parts.append(ob)
    if outline:
        om=me.copy(); om.materials.clear(); om.materials.append(ink)
        for v in om.vertices: v.co+=v.normal*.012
        bm=bmesh.new(); bm.from_mesh(om); bmesh.ops.reverse_faces(bm,faces=list(bm.faces)); bm.to_mesh(om); bm.free()
        oo=bpy.data.objects.new(ob.name+'_ink',om); COL.objects.link(oo)
        if bone:
            oo.parent=current_rig; vg=oo.vertex_groups.new(name=bone); vg.add(list(range(len(vs))),1,'REPLACE')
            mod=oo.modifiers.new('Shared skeleton','ARMATURE'); mod.object=current_rig; parts.append(oo)
    return ob

def ell(name,c,r,ma,bone,outline=True,n=20,k=12):
    vs=[]
    for j in range(k+1):
        ph=pi*j/k
        for i in range(n):
            th=2*pi*i/n; vs.append((c[0]+r[0]*sin(ph)*cos(th),c[1]+r[1]*sin(ph)*sin(th),c[2]+r[2]*cos(ph)))
    fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(k) for i in range(n)]
    return mesh(name,vs,fs,ma,bone,outline)

def tube(name,pts,r,ma,bone,outline=False):
    vs=[]; n=8
    for j,p in enumerate(pts):
        tangent=Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(0,j-1)])
        tangent.normalize(); axis=tangent.cross(Vector((0,1,0)))
        if axis.length<.1: axis=tangent.cross(Vector((1,0,0)))
        axis.normalize(); other=tangent.cross(axis).normalized()
        for i in range(n): vs.append(Vector(p)+r*(axis*cos(2*pi*i/n)+other*sin(2*pi*i/n)))
    fs=[tuple(reversed(range(n))),tuple((len(pts)-1)*n+i for i in range(n))]
    fs += [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(pts)-1) for i in range(n)]
    return mesh(name,vs,fs,ma,bone,outline)

def panel(name,coords,front,depth,ma,bone='head',outline=True):
    # Sculpted polygon prism; each silhouette point may carry its own front depth.
    vs=[(x,front,z) for x,z in coords]+[(x,front+depth,z) for x,z in coords]
    n=len(coords); fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,vs,fs,ma,bone,outline)

def rings(name,rows,ma,bone,n=20,outline=True):
    vs=[]
    for z,rx,ry,cy in rows:
        for i in range(n):
            a=2*pi*i/n; vs.append((rx*cos(a),cy+ry*sin(a),z))
    fs=[tuple(reversed(range(n))),tuple((len(rows)-1)*n+i for i in range(n))]
    fs += [(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(rows)-1) for i in range(n)]
    return mesh(name,vs,fs,ma,bone,outline)

def shoe(s,ma,sm,swoosh=False):
    side='L' if s<0 else 'R'; bone='foot.'+side
    # Each boot fans outward, broad rounded toe, raised heel and tongue.
    def tr(p):
        x,y,z=p; a=s*.20
        return (s*.36+x*cos(a)-y*sin(a),x*sin(a)+y*cos(a),z)
    rows=[(-.79,.09,.24),(-.74,.24,.32),(-.59,.29,.40),(-.35,.28,.46),(-.12,.235,.51),(.13,.21,.49),(.22,.145,.37)]
    for label,under in [('upper',False),('sole',True)]:
        vs=[]; n=16
        for y,w,h in rows:
            for i in range(n):
                a=2*pi*i/n
                z=.16+(.045*sin(a) if under else (h-.16)*max(0,sin(a)))
                vs.append(tr((w*cos(a),y,z)))
        fs=[tuple(reversed(range(n))),tuple((len(rows)-1)*n+i for i in range(n))]+[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(rows)-1) for i in range(n)]
        mesh('boot_'+side+'_'+label,vs,fs,sm if under else ma,bone)
    # Cleat studs deliberately visible beneath the rubber rim.
    for y in [-.64,-.39,-.12,.12]:
        for x in [-.17,.17]:
            ell('stud_'+side,tr((x,y,.095)),(.055,.06,.075),sm,bone,n=10,k=6)
    ell('collar_'+side,tr((0,.07,.47)),(.155,.15,.065),black,bone)
    ell('tongue_'+side,tr((0,-.10,.475)),(.12,.21,.045),ma,bone)
    for j in range(5):
        y=-.40+j*.075; z=.425+j*.017
        tube('lace_'+side,[tr((-.095,y,z)),tr((0,y-.025,z+.015)),tr((.095,y+.01,z))],.012,black if swoosh else white,bone,True)
    # White side markings, conforming to both boot flanks.
    for flank in [-1,1]:
        if not swoosh:
            for j in range(3):
                yy=-.52+j*.095
                vs=[tr((flank*.276,yy,.205)),tr((flank*.282,yy+.040,.205)),tr((flank*.257,yy+.17,.36)),tr((flank*.254,yy+.12,.375))]
                mesh('three_stripes_'+side,vs,[(0,1,2,3)],white,bone,False)
        else:
            pts=[(-.52,.27),(-.46,.235),(-.39,.23),(-.28,.265),(-.01,.425),(-.33,.31),(-.39,.30),(-.42,.325)]
            mesh('swoosh_'+side,[tr((flank*(.28 if y<-.3 else .242),y,z)) for y,z in pts],[tuple(range(len(pts)))],white,bone,False)

rigs=[]
for idx,variant in enumerate(['orange','bunny','brown']):
    prefix=variant
    if idx:
        current_rig=bpy.data.objects.new('Rig • '+variant,ad); COL.objects.link(current_rig); current_rig.show_in_front=True
    else: current_rig=rig
    rigs.append(current_rig); skin=skinm[idx]
    current_rig['variant']=variant; current_rig['shared_skeleton']='CHIBI_SHARED_SKELETON'; current_rig['forward']='-Y (Blender); +Z after glTF conversion'
    rings('shirt',[(.67,.265,.17,0),(.76,.23,.155,0),(1.06,.205,.14,0),(1.27,.19,.13,0),(1.35,.125,.10,0)],green if idx==1 else white,'spine')
    rings('shorts',[(.57,.255,.17,0),(.70,.25,.17,0),(.75,.22,.15,0)],shortblue if idx==0 else black,'hips')
    for s in [-1,1]:
        side='L' if s<0 else 'R'
        ell('hand_'+side,(s*.58,-.015,.73),(.16,.145,.165),skin,'hand.'+side)
        ell('ankle_'+side,(s*.29,.02,.52),(.072,.075,.12),skin,'shin.'+side)
        shoe(s,blue if idx==0 else black,greenso if idx==1 else sole,idx==1)
    ell('head',(0,0,1.72),(.415,.335,.425),skin,'head',n=24,k=16)
    for s in [-1,1]: ell('ear', (s*.415,-.005,1.72),(.085,.07,.12),skin,'head')
    # Face lines sit on a curved face, no flat image billboard.
    def facepoint(x,z,offset=.013):
        y=-.335*math.sqrt(max(.08,1-(x/.415)**2-((z-1.72)/.425)**2))-offset
        return (x,y,z)
    def facecurve(name,coords,r=.008,ma=ink): return tube(name,[facepoint(x,z) for x,z in coords],r,ma,'head')
    for s in [-1,1]:
        x=s*.16
        ell('eye',facepoint(x,1.77,.023),(.029,.015,.030 if idx==2 else .018),ink,'head',False,n=12,k=8)
        facecurve('brow',[(x-.045,1.885),(x,1.894),(x+.045,1.885)],.007)
        if idx<2: facecurve('lash',[(x-.049,1.792),(x-.015,1.777),(x+.047,1.794)],.012)
    if idx==1:
        panel('smile',[(-.12,1.667),(-.01,1.667),(-.025,1.618),(-.075,1.61),(-.112,1.63)],-.339,.012,pink,outline=True)
    else:
        facecurve('smile',[(-.060,1.60),(-.033,1.585),(0,1.6),(.025,1.584),(.058,1.6)],.006)
    facecurve('nose',[(.018,1.716),(.003,1.688),(.025,1.678)],.005)
    if idx==2:
        blush=mat('Cheeks • peach',(.69,.43,.21))
        for s in [-1,1]: ell('cheek',facepoint(s*.24,1.686,.017),(.061,.008,.031),blush,'head',False)
        # Low domed scalp and irregular, pointed curtain fringe.
        ell('hair_cap',(0,.075,1.985),(.44,.34,.325),brown,'head')
        panel('fringe',[(-.415,2.03),(-.31,2.18),(-.10,2.27),(.13,2.26),(.34,2.15),(.405,2.0),(.34,1.84),(.26,2.02),(.16,1.85),(.01,2.075),(-.16,1.92),(-.25,1.86),(-.30,2.03),(-.34,1.89)],-.27,.15,brown)
    elif idx==0:
        ell('hair_core',(0,.065,2.02),(.425,.32,.30),orange,'head')
        # Angular perimeter faithfully follows the orange silhouette rather than radial cones.
        spikes=[(-.43,1.88),(-.51,2.035),(-.46,2.15),(-.61,2.18),(-.58,2.29),(-.47,2.34),(-.53,2.43),(-.48,2.57),(-.36,2.48),(-.46,2.66),(-.21,2.61),(-.08,2.79),(-.04,2.55),(.14,2.65),(.35,2.67),(.28,2.59),(.52,2.63),(.43,2.43),(.62,2.40),(.48,2.22),(.62,2.17),(.43,2.02),(.41,1.84)]
        panel('spike_silhouette',spikes,.005,.22,orange)
        panel('fringe_left',[(-.43,2.23),(-.26,2.42),(-.20,2.24),(-.25,2.03),(-.34,1.80),(-.41,1.96)],-.28,.2,orange)
        panel('fringe_center',[(-.22,2.46),(.02,2.57),(.075,2.21),(-.08,1.83),(-.17,1.98)],-.35,.23,orange)
        panel('fringe_right',[(.01,2.48),(.31,2.43),(.43,2.15),(.36,1.84),(.23,2.015),(.09,2.20)],-.31,.25,orange)
    else:
        # Long back curtain, cheek framing panels, and tall brown rabbit ears.
        panel('long_back',[(-.44,1.15),(-.46,1.87),(-.34,2.22),(-.12,2.31),(.22,2.29),(.44,2.1),(.49,1.17),(.31,1.25),(.15,1.12),(-.12,1.30),(-.30,1.27)],.11,.25,yellow)
        panel('bangs',[(-.43,1.98),(-.35,2.22),(-.1,2.31),(.20,2.29),(.38,2.12),(.27,1.89),(.08,1.93),(-.16,2.115),(-.29,1.975)],-.29,.30,yellow)
        panel('long_left',[(-.43,2.02),(-.32,1.99),(-.32,1.29),(-.44,1.19),(-.49,1.79)],-.21,.23,yellow)
        panel('long_right',[(.11,1.96),(.31,2.16),(.46,2.0),(.49,1.19),(.30,1.12),(.20,1.01),(.19,1.78)],-.34,.30,yellow)
        for s in [-1,1]:
            panel('rabbit_ear',[(s*.10,2.23),(s*.11,2.77),(s*.21,2.94),(s*.34,2.87),(s*.36,2.69),(s*.29,2.22)],.06,.13,inner)
    current_rig.location.x=(idx-1)*2.35

# Neutral lineup stage and an orthographic reference-comparison camera.
sand=mat('Stage • sand',(.70,.58,.36))
mesh('stage',[(-200,-200,-.012),(200,-200,-.012),(200,200,-.012),(-200,200,-.012)],[(0,1,2,3)],sand,None,False)
world=bpy.data.worlds.new('Warm studio'); world.use_nodes=True
bg=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND'); bg.inputs[0].default_value=(.65,.73,.85,1); bg.inputs[1].default_value=.65; scene.world=world
ld=bpy.data.lights.new('Large softbox','AREA'); lo=bpy.data.objects.new('Large softbox',ld); COL.objects.link(lo); lo.location=(-3,-4,7); ld.energy=1400; ld.size=5
lo.rotation_euler=(Vector((0,0,1))-lo.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Lineup Camera'); cam=bpy.data.objects.new('Lineup Camera',cd); COL.objects.link(cam); cam.location=(0,-13,5.0); target=Vector((0,0,1.3)); cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler(); enum_set(cd,'type','ORTHO'); cd.ortho_scale=7.65; scene.camera=cam
scene.render.resolution_x=1600; scene.render.resolution_y=800; scene.render.resolution_percentage=100
try: scene.render.engine='BLENDER_EEVEE'
except TypeError: pass
# Standard is present in the installed OCIO config; dynamic RNA reports NONE.
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'; scene.render.filepath=BASE+'/assets/blender/lineup-preview.png'
scene['reference']=BASE+'/references/character-recreation/lineup.png'
scene['status']='Reference reconstruction; inferred hidden geometry. Not certified exact.'
for area in bpy.context.screen.areas:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_perspective='CAMERA'
        area.spaces.active.overlay.show_overlays=False
        area.spaces.active.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=BASE+'/assets/blender/chibi-lineup.blend')
print(json.dumps({'rigs':[r.name for r in rigs],'shared_armature':ad.name,'bones':len(ad.bones),'mesh_objects':len(parts),'source':bpy.data.filepath}))
