"""Run through Blender MCP in the open authored beach scene.

The source uses Eevee ShaderToRGB and Window coordinates, neither of which
glTF supports. Bake the fixed match-camera appearance, retain evaluated 3D
geometry for depth/occlusion, and export the camera and embedded unlit atlas.
The runtime uses projective sampling (not affine UV interpolation) of this
atlas. This is intentionally a static, fixed-camera environment export.
Original objects, materials, animation, selection and render settings survive.
"""
import bpy
import json
from pathlib import Path
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path('/Users/adityachauhan/Documents/GameJam')
source = bpy.context.scene
assert source.camera and 'CAM-reference_playfield' in source.camera.name
original = {
    'frame': source.frame_current,
    'filepath': source.render.filepath,
    'percentage': source.render.resolution_percentage,
    'selection': list(bpy.context.selected_objects),
    'active': bpy.context.view_layer.objects.active,
}
temporary_scene = None
temporary_meshes = []
temporary_objects = []
material = None
atlas = None
try:
    source.frame_set(1)
    source.render.resolution_percentage = 100
    atlas_path = ROOT / 'assets/blender/beach-court-runtime-bake.png'
    source.render.filepath = str(atlas_path)
    bpy.ops.render.render(write_still=True)
    atlas = bpy.data.images.load(str(atlas_path), check_existing=False)
    atlas.pack()

    material = bpy.data.materials.new('Beach court baked authored appearance')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = atlas
    emission = nodes.new('ShaderNodeEmission')
    output = nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(tex.outputs['Color'], emission.inputs['Color'])
    material.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])

    temporary_scene = bpy.data.scenes.new('Beach court runtime export only')
    depsgraph = bpy.context.evaluated_depsgraph_get()
    for obj in source.objects:
        if obj.hide_render or obj.type not in {'MESH', 'CURVE'}:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=depsgraph)
        temporary_meshes.append(mesh)
        mesh.transform(obj.matrix_world)
        mesh.materials.clear()
        mesh.materials.append(material)
        for polygon in mesh.polygons:
            polygon.material_index = 0
        # UV fallback for ordinary GLB viewers. The game replaces interpolation
        # with exact camera projection so large court planes do not warp.
        while mesh.uv_layers:
            mesh.uv_layers.remove(mesh.uv_layers[0])
        uv = mesh.uv_layers.new(name='Authored camera projection')
        for loop in mesh.loops:
            projected = world_to_camera_view(source, source.camera, mesh.vertices[loop.vertex_index].co)
            uv.data[loop.index].uv = projected.xy
        copy = bpy.data.objects.new(obj.name, mesh)
        temporary_objects.append(copy)
        temporary_scene.collection.objects.link(copy)

    camera = source.camera.copy()
    camera.animation_data_clear()
    temporary_scene.collection.objects.link(camera)
    temporary_objects.append(camera)
    temporary_scene.camera = camera
    temporary_scene.render.resolution_x = source.render.resolution_x
    temporary_scene.render.resolution_y = source.render.resolution_y

    bpy.context.window.scene = temporary_scene
    for obj in temporary_objects:
        obj.select_set(obj.type == 'MESH')
    bpy.context.view_layer.objects.active = next(o for o in temporary_objects if o.type == 'MESH')
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = 'BeachCourt_Baked3D'
    joined['camera_projected_bake'] = True
    joined['bake_aspect'] = source.render.resolution_x / source.render.resolution_y
    camera.select_set(True)
    destination = ROOT / 'public/assets/environments/beach-court.glb'
    # export_format is a dynamic enum: the installed export operator validates
    # the file-format identifier; the explicit .glb filepath selects binary.
    bpy.ops.export_scene.gltf(
        filepath=str(destination), use_selection=True, use_active_scene=True,
        export_cameras=True, export_extras=True, export_animations=False,
        export_current_frame=True, export_yup=True,
    )
    report = {
        'source': str(Path(bpy.data.filepath).relative_to(ROOT)),
        'frame': 1, 'export': str(destination.relative_to(ROOT)),
        'bytes': destination.stat().st_size,
        'vertices': len(joined.data.vertices),
        'polygons': len(joined.data.polygons),
        'appearance': 'Eevee frame-1 camera bake on evaluated 3D geometry',
        'aspect': joined['bake_aspect'],
        'static_environment': True,
        'runtime_requirement': 'Exact projective sampling in src/render/court-appearance.ts',
    }
    (ROOT / 'assets/blender/beach-court-export.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
finally:
    bpy.context.window.scene = source
    source.frame_set(original['frame'])
    source.render.filepath = original['filepath']
    source.render.resolution_percentage = original['percentage']
    for obj in source.objects:
        obj.select_set(obj in original['selection'])
    bpy.context.view_layer.objects.active = original['active']
    if temporary_scene:
        for obj in list(temporary_scene.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.scenes.remove(temporary_scene)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0 and mesh in temporary_meshes:
            bpy.data.meshes.remove(mesh)
    if material and material.users == 0:
        bpy.data.materials.remove(material)
    if atlas and atlas.users == 0:
        bpy.data.images.remove(atlas)
