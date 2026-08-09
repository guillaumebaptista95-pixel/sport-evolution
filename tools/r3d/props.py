# -*- coding: utf-8 -*-
"""Materiel de salle en volumes."""
import math
import numpy as np
from body import W, STEEL, STEEL_D, PAD, FRAME, unit

def Rz(deg):
    r = math.radians(-deg); c, s = math.cos(r), math.sin(r)
    return np.array([[c, -s, 0.0], [s, c, 0.0], [0.0, 0.0, 1.0]])

def lbox(sc, rig, c2, half, col, rd=1.4):
    """Boite definie en coordonnees SVG, orientee par la rotation de scene."""
    sc.box(rig(c2), half, col, rot=Rz(rig.rot) if rig.rot else None, rd=rd)

def stack(sc, x, ytop, glow, n=5, z=0.0, depth=13.0):
    for i in range(n):
        y = ytop + i * 9.0
        sc.box(W([x, y], z), (14.0, 3.6, depth), glow if i < 3 else STEEL_D, rd=1.0)
    sc.box(W([x, ytop + n * 9.0 + 26], z), (17.0, 34.0, depth + 2), FRAME, rd=2.0)

def pulley(sc, p2, r, glow, z=0.0):
    p = W(p2, z)
    sc.capsule(p + [0, 0, 3.2], p - [0, 0, 3.2], r, STEEL_D, soft=False)
    sc.capsule(p + [0, 0, 3.6], p - [0, 0, 3.6], r * 0.3, glow, soft=False)

def build_prop(sc, kind, rig, glow, f):
    if kind == 'bar-high':
        sc.capsule(W([121, 54], -44), W([121, 54], 44), 3.0, STEEL, soft=False)
        for z in (-40, 40):
            sc.box(W([121, (54 + 209) / 2], z), (3.4, 78.0, 3.4), FRAME, rd=1.2)
            sc.box(W([121, 212], z), (18.0, 3.4, 5.0), FRAME, rd=1.2)
        sc.capsule(W([121, 54], -13), W([121, 54], 13), 3.3, glow, soft=False)

    elif kind == 'dip-bars':
        for z in (-14.0, 14.0):
            sc.capsule(W([100, 140], z), W([176, 140], z), 3.0, STEEL, soft=False)
            sc.box(W([170, 176], z), (3.2, 34.0, 3.2), FRAME, rd=1.2)
            sc.box(W([158, 212], z), (26.0, 3.2, 4.6), FRAME, rd=1.2)
        sc.capsule(W([124, 140], 14), W([150, 140], 14), 3.3, glow, soft=False)

    elif kind == 'seat':
        sc.box(W([137, 184], 0), (39.0, 5.5, 17.0), PAD, rd=3.0)
        sc.box(W([98, 149], 0), (6.5, 33.0, 16.0), PAD, rd=3.0)
        sc.box(W([135, 200], 0), (5.0, 12.0, 5.0), FRAME, rd=1.2)
        sc.box(W([135, 212], 0), (34.0, 3.4, 12.0), FRAME, rd=1.2)
        stack(sc, 55, 112, glow)
        pulley(sc, [55, 78], 8.0, glow)

    elif kind in ('bench-incline', 'bench-decline'):
        lbox(sc, rig, [96, 129], (7.5, 59.0, 17.0), PAD, rd=3.0)
        lbox(sc, rig, [96, 198], (4.5, 14.0, 5.0), FRAME)
        lbox(sc, rig, [98, 215], (22.0, 3.4, 12.0), FRAME)

    elif kind == 'wall':
        sc.box(W([97, 126], 0), (5.5, 84.0, 34.0), (0.17, 0.19, 0.23), rd=1.0)

    elif kind == 'legpress':
        lbox(sc, rig, [95, 133], (7.5, 53.0, 17.0), PAD, rd=3.0)
        lbox(sc, rig, [82, 136], (4.0, 40.0, 12.0), FRAME)

    elif kind == 'legcurl':
        lbox(sc, rig, [137, 135], (7.5, 53.0, 17.0), PAD, rd=3.0)
        lbox(sc, rig, [149, 134], (4.0, 38.0, 12.0), FRAME)

    elif kind in ('cable-high', 'cable-mid'):
        x = 197 if kind == 'cable-high' else 207
        py = 42 if kind == 'cable-high' else 88
        sc.box(W([x, (py + 209) / 2], 0), (5.0, (209 - py) / 2, 12.0), FRAME, rd=1.5)
        sc.box(W([x, 212], 0), (20.0, 3.4, 16.0), FRAME, rd=1.2)
        stack(sc, x, py + 62, glow, n=5)
        pulley(sc, [x, py], 8.0, glow)
        hand = f['held']
        sc.capsule(W([x, py], 0), W(hand, 0), 1.0, STEEL_D, soft=False)

    elif kind == 'step':
        sc.box(W([150, 212], 0), (42.0, 4.5, 24.0), PAD, rd=1.6)


def build_held(sc, kind, p, glow, front):
    """Materiel tenu : il est place a la main (ou au pied)."""
    if kind == 'none':
        return
    if kind == 'dumbbell':
        sc.capsule(p + [0, 0, 12], p - [0, 0, 12], 2.2, STEEL, soft=False)
        for z in (15.0, -15.0):
            sc.plate(p + [0, 0, z], 8.6, 2.6, glow)
    elif kind in ('barbell', 'plate-back'):
        sc.capsule(p + [0, 0, 46], p - [0, 0, 46], 2.4, STEEL, soft=False)
        for z in (31.0, -31.0):
            s = np.sign(z)
            sc.plate(p + [0, 0, z], 13.4, 2.4, glow)
            sc.plate(p + [0, 0, z + s * 5.4], 9.4, 2.2, glow)
    elif kind == 'handle':
        sc.capsule(p + [0, 0, 7], p - [0, 0, 7], 2.4, STEEL, soft=False)
        for z in (8.5, -8.5):
            sc.box(p + [0, 0, z], (1.6, 8.0, 1.6), glow, rd=1.0)
    elif kind == 'rope':
        for z in (6.0, -6.0):
            e = p + front * 4 + [0, -14, z * 1.9]
            sc.capsule(p + [0, 0, z * 0.5], e, 2.2, glow, soft=False)
            sc.capsule(e, e - [0, 4, 0], 2.8, STEEL_D, soft=False)
    elif kind == 'sled':
        sc.box(p + front * 6, (4.0, 30.0, 26.0), STEEL, rd=1.6)
        sc.box(p + front * 12, (3.0, 22.0, 20.0), glow, rd=1.6)
    elif kind == 'roller':
        sc.capsule(p + [0, 0, 15], p - [0, 0, 15], 2.0, STEEL_D, soft=False)
        for z in (9.5, -9.5):
            s = np.sign(z)
            sc.capsule(p + [0, 0, z - s * 5.0], p + [0, 0, z + s * 5.0], 5.4, glow, soft=False)
