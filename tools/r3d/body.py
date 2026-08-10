# -*- coding: utf-8 -*-
"""Construction du personnage et du materiel en volumes."""
import math
import numpy as np
from render import Scene

HIP2 = np.array([118.0, 148.0])
GROUND = 209.0

SKIN = (0.855, 0.660, 0.530)
SKIN_D = (0.605, 0.445, 0.355)
STEEL = (0.60, 0.635, 0.695)
HAIR = (0.115, 0.095, 0.105)
SHORT = (0.150, 0.180, 0.255)
SHORT_D = (0.105, 0.130, 0.185)
SHOE = (0.900, 0.905, 0.925)
EYE = (0.075, 0.065, 0.080)
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
    mix = tuple(0.45 * a + 0.55 * b for a, b in zip(SKIN, glow))

    def on(m):
        return mix if m in lit else None

    hipC = rig(f['hip']); shC = rig(f['shoulder'])
    front = unit(np.array(rot2(f['torso'] + rig.rot, [1.0, 0.0]).tolist() + [0.0]) * np.array([1, -1, 1]))
    up = unit(shC - hipC)
    Z = np.array([0.0, 0.0, 1.0])
    DZ_SH, DZ_HIP = 14.2, 8.4

    def alongT(t):
        return hipC + (shC - hipC) * t

    # ---------------------------------------------------------------- tronc
    sc.group(1.7)
    sc.ellip(alongT(0.76), (10.6, 14.6, 19.6), SKIN)          # cage thoracique
    sc.ellip(alongT(0.40), (7.6, 11.0, 10.2), SKIN)           # taille
    sc.ellip(hipC + up * 2.0, (10.0, 10.4, 15.0), SHORT)      # bassin, sous le short
    sc.ellip(hipC - up * 3.0, (10.4, 7.0, 15.4), SHORT)      # ceinture du short

    pecY = alongT(0.78)
    for z in (7.2, -7.2):
        sc.ellip(pecY + front * 5.2 + Z * z, (6.4, 6.8, 8.0), on('pectoraux') or SKIN)
        sc.ellip(alongT(0.70) - front * 3.6 + Z * z * 1.55, (6.0, 9.6, 7.4), on('dos') or SKIN)
    # abdominaux : trois etages, le fondu court laisse apparaitre les sillons
    for i, t in enumerate((0.50, 0.38, 0.26)):
        sc.ellip(alongT(t) + front * 4.2, (4.6, 3.6, 6.6 - i * 0.5), on('abdos') or SKIN)
    for z in (6.4, -6.4):
        sc.ellip(alongT(0.30) + front * 1.2 + Z * z, (4.4, 5.4, 4.2), SKIN)   # obliques
        sc.ellip(hipC - front * 4.0 + Z * (z * 0.9), (5.6, 6.4, 6.4), on('fessiers') or SKIN)
        sc.ellip(alongT(0.94) - front * 1.6 + Z * (z * 1.1), (5.0, 4.4, 6.4), SKIN)  # trapezes

    # ---------------------------------------------------------------- tete
    neck = rig(f['neck']); head = rig(f['head'])
    sc.group(1.8)
    sc.cone(shC + up * 2.0, neck, 6.0, 4.2, SKIN)
    sc.ellip(head, (7.8, 8.8, 7.6), SKIN)                     # crane
    sc.ellip(head + front * 3.0 - up * 3.6, (5.4, 4.2, 5.4), SKIN)  # machoire
    sc.sphere(head + front * 6.2 - up * 1.4, 2.0, SKIN)       # nez
    for z in (6.6, -6.6):
        sc.sphere(head + Z * z - up * 0.6, 1.9, SKIN_D)
    # chevelure : une masse posee sur le crane, plus epaisse a l'arriere
    sc.ellip(head - front * 1.2 + up * 2.2, (7.6, 7.4, 7.6), HAIR)
    sc.ellip(head - front * 5.0 + up * 0.4, (4.6, 6.4, 6.8), HAIR)
    # visage : yeux et sourcils, nets pour ne pas se diluer
    for z in (2.9, -2.9):
        e = head + front * 5.2 + up * 0.8 + Z * z
        sc.sphere(e, 1.35, EYE, soft=False)
        sc.capsule(e + front * 0.6 + up * 2.5 - Z * 1.2,
                   e + front * 0.6 + up * 2.6 + Z * 1.2, 0.62, HAIR, soft=False)

    # ---------------------------------------------------------------- bras
    for z, dark in ((DZ_SH, False), (-DZ_SH, True)):
        col = SKIN_D if dark else SKIN
        M = (lambda m: None) if dark else on
        sh = shC + Z * z + up * 1.0
        el = rig(f['elbow'], z); wr = rig(f['wrist'], z)
        u1 = unit(el - sh); n1 = side(sh, el, front)
        lat = Z * (1.0 if z > 0 else -1.0)

        sc.group(1.5)
        sc.ellip(sh + lat * 1.4, (6.4, 7.2, 6.6), M('epaules') or col)     # deltoide
        sc.sphere(sh + n1 * 2.8 + lat * 0.8, 4.2, M('epaules') or col)     # faisceau avant
        sc.sphere(sh - n1 * 2.8 + lat * 0.8, 4.0, M('epaules') or col)     # faisceau arriere
        sc.cone(sh + u1 * 3.0, el, 4.3, 3.1, col)                          # humerus
        sc.ellip(sh + u1 * 10.5 + n1 * 2.4, (4.5, 6.2, 4.7), M('biceps') or col)
        sc.ellip(sh + u1 * 11.5 - n1 * 2.4, (4.2, 6.8, 4.3), M('triceps') or col)
        sc.sphere(el, 3.3, col)                                            # coude
        u2 = unit(wr - el); n2 = side(el, wr, front)
        sc.cone(el, wr, 3.4, 2.4, col)
        sc.ellip(el + u2 * 6.0 + n2 * 1.4, (3.5, 5.0, 3.6), col)           # avant-bras
        # main : paume, pouce, doigts
        pm = wr + u2 * 2.6
        sc.ellip(pm, (2.4, 3.7, 3.3), col)
        sc.sphere(pm + n2 * 1.8 - u2 * 1.0, 1.5, col)
        sc.ellip(pm + u2 * 3.0, (1.9, 2.4, 2.8), col)

    # ---------------------------------------------------------------- jambes
    for z, dark in ((DZ_HIP, False), (-DZ_HIP, True)):
        col = SKIN_D if dark else SKIN
        M = (lambda m: None) if dark else on
        hp = hipC + Z * z; kn = rig(f['knee'], z); an = rig(f['ankle'], z)
        u1 = unit(kn - hp); n1 = side(hp, kn, front)
        lat = Z * (1.0 if z > 0 else -1.0)

        sc.group(1.5)
        sc.cone(hp, kn, 6.6, 4.3, col)                                     # femur
        sc.cone(hp - u1 * 3.0, hp + u1 * 13.0, 8.6, 7.4, SHORT if not dark else SHORT_D)  # jambe du short
        sc.ellip(hp + u1 * 13.0 + n1 * 2.9, (4.8, 9.2, 5.0), M('quadriceps') or col)   # droit anterieur
        sc.ellip(hp + u1 * 12.0 + n1 * 1.0 + lat * 3.4, (4.8, 8.6, 4.4), M('quadriceps') or col)
        sc.ellip(hp + u1 * 20.0 + n1 * 1.6 - lat * 2.6, (4.0, 5.6, 3.8), M('quadriceps') or col)  # vaste interne
        sc.ellip(hp + u1 * 12.0 - n1 * 3.0, (4.8, 9.0, 5.2), M('ischios') or col)
        sc.sphere(kn, 4.2, col)                                            # genou
        u2 = unit(an - kn); n2 = side(kn, an, front)
        sc.cone(kn, an, 4.3, 2.5, col)
        for sgn in (1.0, -1.0):
            sc.ellip(kn + u2 * 8.5 - n2 * 2.0 + lat * (1.8 * sgn), (3.8, 6.2, 3.3), M('mollets') or col)
        sc.sphere(an, 2.7, col)                                            # cheville
        shoe = SHOE if not dark else tuple(c * 0.72 for c in SHOE)
        toe = an + unit(np.array([n2[0], n2[1], 0.0])) * 7.6 - np.array([0.0, 2.8, 0.0])
        sc.cone(an - np.array([0.0, 1.2, 0.0]), toe, 3.8, 3.0, shoe)
        sc.sphere(an - n2 * 2.8 - np.array([0.0, 1.4, 0.0]), 3.3, shoe)    # talon
