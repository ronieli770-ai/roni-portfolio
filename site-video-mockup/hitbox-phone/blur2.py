# Face blur that stays inside each video tile.
# Faces are found on the grid's own loop files (full size, reliable), then mapped into each tile on screen
# through the playback time and the object-fit:cover crop the page logged on every paint.
import json, os, glob, bisect, subprocess
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter

FF = '/Users/ronieliyahu/bin/ffmpeg'
SRC = '/Users/ronieliyahu/Documents/Claude/פרוייקטים/דף נחיתה היטבוקס/assets/vid'
det = cv2.FaceDetectorYN.create('models/yunet.onnx', '', (320, 320), 0.5, 0.3, 50)

def detect(img):  # PIL RGB -> boxes normalised to img [x, y, w, h]
    a = cv2.cvtColor(np.asarray(img), cv2.COLOR_RGB2BGR)
    det.setInputSize((a.shape[1], a.shape[0])); _, f = det.detect(a)
    return [] if f is None else [[float(r[0])/a.shape[1], float(r[1])/a.shape[0], float(r[2])/a.shape[1], float(r[3])/a.shape[0]] for r in f]

def blur_inside(tile, boxes, pad=0.42):   # boxes in tile pixels
    if not boxes: return tile
    m = Image.new('L', tile.size, 0); dr = ImageDraw.Draw(m)
    for x, y, bw, bh in boxes:
        dr.ellipse((x - bw*pad, y - bh*pad*1.1, x + bw*(1+pad), y + bh*(1+pad*.9)), fill=255)
    big = float(max(b[2] for b in boxes))
    soft = m.filter(ImageFilter.GaussianBlur(max(2, big/14)))
    return Image.composite(tile.filter(ImageFilter.GaussianBlur(max(6, big/4.5))), tile, soft)

d = json.load(open('rec.json')); M = d['marks']; frames = d['frames']
ids = sorted({c['id'] for c in M['grid']['cells']})

# ---------- the loops: detect every frame, write blurred copies for the burst ----------
loops = {}
for cid in ids:
    raw, od = f'burst/{cid}_raw', f'burst/{cid}'
    os.makedirs(raw, exist_ok=True); os.makedirs(od, exist_ok=True)
    for f in glob.glob(raw + '/*.jpg') + glob.glob(od + '/*.jpg'): os.remove(f)
    subprocess.run([FF, '-loglevel', 'error', '-y', '-i', f'{SRC}/{cid}.mp4', '-vf', 'fps=30', '-q:v', '2', f'{raw}/%04d.jpg'], check=True)
    names = sorted(glob.glob(raw + '/*.jpg'))
    vw, vh = Image.open(names[0]).size
    per = [detect(Image.open(p).convert('RGB').resize((vw*2, vh*2))) for p in names]
    sm = [[b for j in range(max(0, i-3), min(len(per), i+4)) for b in per[j]] for i in range(len(per))]
    for p, bx in zip(names, sm):
        blur_inside(Image.open(p).convert('RGB'), [[x*vw, y*vh, w*vw, h*vh] for x, y, w, h in bx]).save(p.replace('_raw', ''), quality=92)
    loops[cid] = {'size': (vw, vh), 'boxes': sm, 'n': len(names)}
    print(cid, vw, vh, len(names), sum(1 for b in per if b), 'frames with a face')
json.dump({k: {'size': v['size'], 'n': v['n']} for k, v in loops.items()}, open('burst/loops.json', 'w'))

# ---------- the screen frames ----------
paints = M['tiles']; pt = [p[0] for p in paints]
os.makedirs('frames_b', exist_ok=True)
for f in glob.glob('frames_b/*.jpg'): os.remove(f)   # stale frames from the last recording
sel = [(n, t) for n, t in frames if pt[0] - .05 <= t <= pt[-1] + .05]
for n, t in sel:
    k = max(0, bisect.bisect_right(pt, t) - 1)
    im = Image.open(n).convert('RGB'); W, H = im.size
    for x, y, w, h, cid, ct, fit in paints[k][1]:
        if cid not in loops: continue
        L = loops[cid]; vw, vh = L['size']
        ct += max(0, t - pt[k])
        bx = L['boxes'][int(ct * 30) % L['n']]
        if not bx: continue
        x, y, w, h = x*3, y*3, w*3, h*3
        s = max(w / vw, h / vh); ox, oy = (w - vw*s) / 2, (h - vh*s) / 2
        boxes = [[ox + a*vw*s, oy + b*vh*s, c*vw*s, e*vh*s] for a, b, c, e in bx]
        box = (int(x), int(y), int(x + w), int(y + h))
        cx0, cy0, cx1, cy1 = max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3])
        if cx1 - cx0 < 4 or cy1 - cy0 < 4: continue
        full = Image.new('RGB', (box[2]-box[0], box[3]-box[1])); full.paste(im.crop((cx0, cy0, cx1, cy1)), (cx0-box[0], cy0-box[1]))
        full = blur_inside(full, boxes)
        im.paste(full.crop((cx0-box[0], cy0-box[1], cx1-box[0], cy1-box[1])), (cx0, cy0))
    im.save(n.replace('frames/', 'frames_b/'), quality=93)
print('screen frames', len(sel))
