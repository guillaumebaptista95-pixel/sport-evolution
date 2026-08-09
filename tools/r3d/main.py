# -*- coding: utf-8 -*-
"""Rend chaque mouvement en une planche de sprites verticale."""
import json, math, os, sys, time
import numpy as np
from PIL import Image
from render import Scene, render
from body import Rig, build_body, hexcol, FLOOR, W, unit, rot2
from props import build_prop, build_held

HERE = os.path.dirname(os.path.abspath(__file__))
POSES = json.load(open(os.path.join(HERE, 'poses.json')))

GROUP = {
    'dos': '#6C5CE7', 'pectoraux': '#FF6B4A', 'epaules': '#FFB627',
    'biceps': '#22D3EE', 'triceps': '#F472B6', 'abdos': '#38BDF8',
    'quadriceps': '#9BE23C', 'ischios': '#9BE23C', 'mollets': '#9BE23C',
    'fessiers': '#9BE23C',
}

def color_of(muscles):
    return hexcol(GROUP.get(muscles[0], '#6C5CE7')) if muscles else hexcol('#6C5CE7')

JOINTS = ('hip', 'shoulder', 'elbow', 'wrist', 'knee', 'ankle', 'head', 'held')

def framing(key):
    """Cadre la scene sur l'amplitude reelle du mouvement."""
    a = POSES[key]
    rig = Rig(a['baseRot'], a['offset'])
    pts = [rig(fr[j]) for fr in a['frames'] for j in JOINTS]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    cx = (min(xs) + max(xs)) / 2; cy = (min(ys) + max(ys)) / 2
    h = max(max(ys) - min(ys), (max(xs) - min(xs)) * 0.95) + 62.0
    dist = (h / 2) / math.tan(math.radians(31.0) / 2)
    return (cx * 0.5, cy - 4.0, 0.0), max(210.0, min(dist, 470.0))


def build(key, fi, size):
    a = POSES[key]
    f = a['frames'][fi]
    rig = Rig(a['baseRot'], a['offset'])
    glow = color_of(a['muscles'])
    sc = Scene()
    # sol : un disque, il donne l'appui et recoit l'ombre
    sc.disc(np.array([4.0, -92.0, 0.0]), 54.0, 3.0, FLOOR)
    build_prop(sc, a['prop'], rig, glow, f)
    build_body(sc, f, rig, set(a['muscles']), glow)
    front = unit(np.array(list(rot2(f['torso'] + rig.rot, [1.0, 0.0])) + [0.0]) * np.array([1, -1, 1]))
    build_held(sc, a['held'], rig(f['held']), glow, front)
    return sc

if __name__ == '__main__':
    keys = sys.argv[1].split(',') if len(sys.argv) > 1 else list(POSES)
    size = int(os.environ.get('SIZE', 160))
    ss = int(os.environ.get('SS', 2))
    budget = float(os.environ.get('BUDGET', 30))
    outdir = os.path.join(HERE, 'out')
    fdir = os.path.join(outdir, 'frames')
    os.makedirs(fdir, exist_ok=True)
    t0 = time.time()
    done = 0
    for key in keys:
        n = len(POSES[key]['frames'])
        tg, ds = framing(key)
        for i in range(n):
            fp = os.path.join(fdir, '%s_%02d.png' % (key, i))
            if os.path.exists(fp):
                continue
            if time.time() - t0 > budget:
                print('pause: %d images' % done, flush=True)
                sys.exit(0)
            render(build(key, i, size), W=size, ss=ss, target=tg, dist=ds).save(fp)
            done += 1
        # planche complete : on assemble
        sheet = os.path.join(outdir, key + '.png')
        if not os.path.exists(sheet):
            im = Image.new('RGBA', (size, size * n), (0, 0, 0, 0))
            for i in range(n):
                im.paste(Image.open(os.path.join(fdir, '%s_%02d.png' % (key, i))), (0, i * size))
            im.save(sheet)
            im.resize((80, 80 * n), Image.LANCZOS).save(os.path.join(outdir, key + '-sm.png'))
            print('planche %s' % key, flush=True)
    print('termine: %d images' % done, flush=True)
