# -*- coding: utf-8 -*-
"""Construction du personnage et du materiel en volumes."""
import math
import numpy as np
from render import Scene

HIP2 = np.array([118.0, 148.0])
GROUND = 209.0

SKIN = (0.435, 0.475, 0.555)
SKIN_D = (0.275, 0.305, 0.375)
STEEL = (0.60, 0.635, 0.695)
STEEL_D = (0.34, 0.365, 0.415)
PAD = (0.30, 0.325, 0.375)
FRAME = (0.215, 0.235, 0.280)
FLOOR = (0.105, 0.120, 0.150)


def hexcol(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def rot2(deg, v):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    return np.array([v[0] * c - v[1] * s, v[0] * s + v[1] * c])


def W(p2, z=0.0):
    """Coordonnees SVG -> monde 3D (y vers le haut)."""
    return np.array([p2[0] - 120.0, 120.0 - p2[1], z])


class Rig:
    """Applique la rotation globale de la scene aux points d'une pose."""
    def __init__(self, base_rot, offset):
        self.rot = base_rot
        self.off = np.array(offset, float)

    def __call__(self, p2, z=0.0):
        p = np.array(p2, float)
        if self.rot:
            p = HIP2 + rot2(self.rot, p - HIP2)
        return W(p + self.off, z)


def unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def limb(sc, a, b, r1, r2, col):
    """Segment de membre : capsule effilee."""
    sc.cone(a, b, r1, r2, col)


def side(a, b, front):
    """Perpendiculaire au segment, orientee du cote anterieur du corps."""
    u = unit(b - a)
    n = np.array([u[1], -u[0], 0.0])
    if np.dot(n, front) < 0:
        n = -n
    return unit(n)


def build_body(sc, f, rig, lit, glow):
    """Le personnage : tronc, tete, membres et masses musculaires detaillees."""
    def on(m):
        return glow if m in lit else None

    hipC = rig(f['hip']); shC = rig(f['shoulder'])
    front = unit(np.array(rot2(f['torso'] + rig.rot, [1.0, 0.0]).tolist() + [0.0]) * np.array([1, -1, 1]))
    up = unit(shC - hipC)
    Z = np.array([0.0, 0.0, 1.0])
    DZ_SH, DZ_HIP = 12.5, 8.0

    def alongT(t):
        return hipC + (shC - hipC) * t

    # ---------------------------------------------------------------- tronc
    sc.group(2.6)
    sc.ellip(alongT(0.76), (10.6, 14.0, 18.0), SKIN)          # cage thoracique
    sc.ellip(alongT(0.40), (8.8, 11.0, 13.2), SKIN)           # taille
    sc.ellip(hipC + up * 2.0, (10.0, 10.4, 15.0), SKIN)       # bassin

    pecY = alongT(0.78)
    for z in (7.2, -7.2):
        sc.ellip(pecY + front * 5.2 + Z * z, (5.6, 6.2, 7.2), on('pectoraux') or SKIN)
        sc.ellip(alongT(0.70) - front * 3.6 + Z * z * 1.55, (5.4, 9.0, 6.6), on('dos') or SKIN)
    # abdominaux : trois etages, le fondu court laisse apparaitre les sillons
    for i, t in enumerate((0.50, 0.38, 0.26)):
        sc.ellip(alongT(t) + front * 4.2, (4.6, 3.6, 6.6 - i * 0.5), on('abdos') or SKIN)
    for z in (6.4, -6.4):
        sc.ellip(alongT(0.30) + front * 1.2 + Z * z, (4.4, 5.4, 4.2), SKIN)   # obliques
        sc.ellip(hipC - front * 4.0 + Z * (z * 0.9), (5.6, 6.4, 6.4), on('fessiers') or SKIN)
        sc.ellip(alongT(0.94) - front * 1.6 + Z * (z * 1.1), (5.0, 4.4, 6.4), SKIN)  # trapezes

    # ---------------------------------------------------------------- tete
    neck = rig(f['neck']); head = rig(f['head'])
    sc.group(2.4)
    sc.cone(shC + up * 2.0, neck, 6.0, 4.2, SKIN)
    sc.ellip(head, (7.4, 8.4, 7.2), SKIN)                     # crane
    sc.ellip(head + front * 3.0 - up * 3.6, (5.4, 4.2, 5.4), SKIN)  # machoire
    sc.sphere(head + front * 6.2 - up * 1.4, 2.2, SKIN)       # nez
    for z in (6.6, -6.6):
        sc.sphere(head + Z * z - up * 0.6, 1.9, SKIN_D)

    # ---------------------------------------------------------------- bras
    for z, dark in ((DZ_SH, False), (-DZ_SH, True)):
        col = SKIN_D if dark else SKIN
        M = (lambda m: None) if dark else on
        sh = shC + Z * z + up * 1.0
        el = rig(f['elbow'], z); wr = rig(f['wrist'], z)
        u1 = unit(el - sh); n1 = side(sh, el, front)
        lat = Z * (1.0 if z > 0 else -1.0)

        sc.group(2.2)
        sc.ellip(sh + lat * 1.2, (5.4, 6.2, 5.6), M('epaules') or col)     # deltoide
        sc.sphere(sh + n1 * 2.6 + lat * 0.6, 3.6, M('epaules') or col)     # faisceau avant
        sc.sphere(sh - n1 * 2.6 + lat * 0.6, 3.4, M('epaules') or col)     # faisceau arriere
        sc.cone(sh + u1 * 3.0, el, 4.4, 3.3, col)                          # humerus
        sc.ellip(sh + u1 * 10.5 + n1 * 2.4, (3.7, 5.6, 3.9), M('biceps') or col)
        sc.ellip(sh + u1 * 11.5 - n1 * 2.4, (3.5, 6.2, 3.5), M('triceps') or col)
        sc.sphere(el, 3.4, col)                                            # coude
        u2 = unit(wr - el); n2 = side(el, wr, front)
        sc.cone(el, wr, 3.6, 2.5, col)
        sc.ellip(el + u2 * 6.0 + n2 * 1.3, (2.9, 4.6, 3.0), col)           # avant-bras
        # main : paume, pouce, doigts
        pm = wr + u2 * 2.6
        sc.ellip(pm, (2.1, 3.4, 3.0), col)
        sc.sphere(pm + n2 * 1.8 - u2 * 1.0, 1.5, col)
        sc.ellip(pm + u2 * 3.0, (1.9, 2.4, 2.8), col)

    # ---------------------------------------------------------------- jambes
    for z, dark in ((DZ_HIP, False), (-DZ_HIP, True)):
        col = SKIN_D if dark else SKIN
        M = (lambda m: None) if dark else on
        hp = hipC + Z * z; kn = rig(f['knee'], z); an = rig(f['ankle'], z)
        u1 = unit(kn - hp); n1 = side(hp, kn, front)
        lat = Z * (1.0 if z > 0 else -1.0)

        sc.group(2.2)
        sc.cone(hp, kn, 6.8, 4.6, col)                                     # femur
        sc.ellip(hp + u1 * 13.0 + n1 * 2.9, (4.0, 8.6, 4.2), M('quadriceps') or col)   # droit anterieur
        sc.ellip(hp + u1 * 12.0 + n1 * 1.0 + lat * 3.4, (4.2, 8.0, 3.8), M('quadriceps') or col)
        sc.ellip(hp + u1 * 20.0 + n1 * 1.6 - lat * 2.6, (3.4, 5.0, 3.2), M('quadriceps') or col)  # vaste interne
        sc.ellip(hp + u1 * 12.0 - n1 * 3.0, (4.0, 8.4, 4.6), M('ischios') or col)
        sc.sphere(kn, 4.3, col)                                            # genou
        u2 = unit(an - kn); n2 = side(kn, an, front)
        sc.cone(kn, an, 4.6, 2.7, col)
        for sgn in (1.0, -1.0):
            sc.ellip(kn + u2 * 8.5 - n2 * 2.0 + lat * (1.8 * sgn), (3.2, 5.6, 2.8), M('mollets') or col)
        sc.sphere(an, 2.7, col)                                            # cheville
        toe = an + unit(np.array([n2[0], n2[1], 0.0])) * 7.0 - np.array([0.0, 2.6, 0.0])
        sc.cone(an - np.array([0.0, 1.4, 0.0]), toe, 3.2, 2.4, col)
        sc.sphere(an - n2 * 2.4 - np.array([0.0, 1.2, 0.0]), 2.8, col)     # talon
