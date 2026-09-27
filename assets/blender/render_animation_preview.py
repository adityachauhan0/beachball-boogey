import bpy,json,math
BASE='/Users/adityachauhan/Documents/GameJam'
def render_chunk(start,end):
 s=bpy.data.scenes['Animation showcase • Play timeline']; bpy.context.window.scene=s
 schedule=json.loads(s['animation_schedule']); label=bpy.data.objects['Action title']
 for i in range(start,end):
  frame=1+i*60/24
  s.frame_set(math.floor(frame),subframe=frame%1)
  name=next((part['name'] for part in reversed(schedule) if frame>=part['start']),'idle')
  label.data.body=name.replace('_',' ').upper()
  s.render.filepath=BASE+'/assets/blender/animation-preview/frame-'+str(i).zfill(4)+'.png'
  bpy.ops.render.render(write_still=True)
 print('Rendered',start,end)
