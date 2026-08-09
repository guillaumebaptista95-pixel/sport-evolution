# -*- coding: utf-8 -*-
"""
Rendu 3D hors-ligne des mouvements de musculation.

Le corps et le materiel sont decrits par des primitives volumiques (capsules,
spheres, boites) fondues entre elles ; l'image est obtenue par ray marching,
avec ombres douces et occlusion ambiante. Les poses viennent du meme moteur
d'angles que l'application (src/lib/rig.ts), exportees dans poses.json.
"""
import json, math, os, sys
import numpy as np
from PIL import Image

F = np.float32

HIPX, HIPY = 118.0, 148.0
GROUND_Y = 209.0

# ---------------------------------------------------------------- primitives
def _norm(v, axis=-1):
    return np.sqrt((v * v).sum(axis))

class Scene:
    """Accumule les primitives puis evalue la distance et la couleur."""
    def __init__(self):
        self.groups = [[]]   # chaque groupe fond ses primitives entre elles
        self.ks = [6.0]      # douceur du fondu, groupe par groupe
        self.hard = []       # materiel : aretes nettes

    @property
    def soft(self):
        return self.groups[-1]

    def group(self, k=3.2):
        """Ouvre un nouveau groupe : il ne se fondra pas avec le precedent."""
        self.groups.append([])
        self.ks.append(k)

    def sphere(self, c, r, col, soft=True):
        (self.soft if soft else self.hard).append(('s', np.array(c, F), float(r), np.array(col, F)))

    def capsule(self, a, b, r, col, soft=True):
        (self.soft if soft else self.hard).append(('c', np.array(a, F), np.array(b, F), float(r), np.array(col, F)))

    def cone(self, a, b, r1, r2, col, soft=True):
        """Capsule effilee : un membre qui s'affine vers l'articulation."""
        (self.soft if soft else self.hard).append(
            ('k', np.array(a, F), np.array(b, F), float(r1), float(r2), np.array(col, F)))

    def plate(self, c, r, h, col):
        """Disque d'axe Z : un disque de fonte vu de trois quarts."""
        self.hard.append(('z', np.array(c, F), float(r), float(h), np.array(col, F)))

    def ellip(self, c, r, col, soft=True):
        """Ellipsoide : le tronc et le bassin."""
        (self.soft if soft else self.hard).append(('e', np.array(c, F), np.array(r, F), np.array(col, F)))

    def disc(self, c, r, h, col):
        """Cylindre d'axe vertical : le socle au sol."""
        self.hard.append(('y', np.array(c, F), float(r), float(h), np.array(col, F)))

    def box(self, c, half, col, rot=None, rd=1.2, soft=False):
        (self.soft if soft else self.hard).append(('b', np.array(c, F), np.array(half, F), rot, float(rd), np.array(col, F)))

    # -- distances
    @staticmethod
    def _d(prim, p):
        k = prim[0]
        if k == 's':
            return _norm(p - prim[1]) - prim[2], prim[3]
        if k == 'c':
            a, b, r = prim[1], prim[2], prim[3]
            pa = p - a; ba = b - a
            h = np.clip((pa * ba).sum(-1) / max((ba * ba).sum(), 1e-9), 0.0, 1.0)[:, None]
            return _norm(pa - ba * h) - r, prim[4]
        if k == 'z':
            c, r, h, col = prim[1], prim[2], prim[3], prim[4]
            q = p - c
            dxy = np.sqrt(q[:, 0] ** 2 + q[:, 1] ** 2) - r
            dz = np.abs(q[:, 2]) - h
            return (np.sqrt(np.maximum(dxy, 0) ** 2 + np.maximum(dz, 0) ** 2)
                    + np.minimum(np.maximum(dxy, dz), 0.0) - 0.8), col
        if k == 'e':
            c, r, col = prim[1], prim[2], prim[3]
            q = (p - c) / r
            k0 = _norm(q)
            k1 = _norm(q / r)
            return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9), col
        if k == 'k':
            a, b, r1, r2, col = prim[1], prim[2], prim[3], prim[4], prim[5]
            ba = b - a; l2 = float((ba * ba).sum()); rr = r1 - r2
            a2 = l2 - rr * rr; il2 = 1.0 / max(l2, 1e-9)
            pa = p - a
            y = pa @ ba; z = y - l2
            w = pa * l2 - ba * y[:, None]
            x2 = (w * w).sum(-1)
            y2 = y * y * l2; z2 = z * z * l2
            kk = np.sign(rr) * rr * rr * x2
            d_cap2 = np.sqrt(np.maximum(x2 + z2, 0)) * il2 - r2
            d_cap1 = np.sqrt(np.maximum(x2 + y2, 0)) * il2 - r1
            d_side = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
            d = np.where(np.sign(z) * a2 * z2 > kk, d_cap2,
                         np.where(np.sign(y) * a2 * y2 < kk, d_cap1, d_side))
            return d, col
        if k == 'y':
            c, r, h, col = prim[1], prim[2], prim[3], prim[4]
            q = p - c
            dxz = np.sqrt(q[:, 0] ** 2 + q[:, 2] ** 2) - r
            dy = np.abs(q[:, 1]) - h
            out = np.sqrt(np.maximum(dxz, 0) ** 2 + np.maximum(dy, 0) ** 2)
            return out + np.minimum(np.maximum(dxz, dy), 0.0), col
        c, half, rot, rd, col = prim[1], prim[2], prim[3], prim[4], prim[5]
        q = p - c
        if rot is not None:
            q = q @ rot
        q = np.abs(q) - half
        d = _norm(np.maximum(q, 0.0)) + np.minimum(q.max(-1), 0.0) - rd
        return d, col

    def eval(self, p, K=None):
        n = p.shape[0]
        d = None
        col = None
        for gi, grp in enumerate(self.groups):
            if not grp:
                continue
            K = self.ks[gi]
            gd = None
            gc = None
            for prim in grp:
                di, ci = self._d(prim, p)
                if gd is None:
                    gd = di
                    gc = np.broadcast_to(ci, (n, 3)).copy()
                    continue
                h = np.clip(0.5 + 0.5 * (gd - di) / K, 0.0, 1.0)
                gd = gd + (di - gd) * h - K * h * (1.0 - h)
                gc = gc + (ci - gc) * h[:, None]
            if d is None:
                d, col = gd, gc
                continue
            # entre groupes : fondu tres court, juste pour lisser les jonctions
            h = np.clip(0.5 + 0.5 * (d - gd) / 2.2, 0.0, 1.0)
            d = d + (gd - d) * h - 2.2 * h * (1.0 - h)
            col = col + (gc - col) * h[:, None]
        for prim in self.hard:
            di, ci = self._d(prim, p)
            if d is None:
                d = di
                col = np.broadcast_to(ci, (n, 3)).copy()
                continue
            m = di < d
            d = np.where(m, di, d)
            col[m] = ci
        if d is None:
            return np.full(n, F(1e6), F), np.zeros((n, 3), F)
        return d, col

    def dist(self, p, K=None):
        return self.eval(p)[0]

# ---------------------------------------------------------------- rendu
def render(scene, W=256, cam_az=26.0, cam_el=7.0, dist=430.0, target=(0, -6, 0),
           bg=None, ss=2):
    R = W * ss
    az, el = math.radians(cam_az), math.radians(cam_el)
    T = np.array(target, float)
    eye = T + np.array([math.sin(az) * math.cos(el), math.sin(el), math.cos(az) * math.cos(el)]) * dist
    fwd = T - eye; fwd /= np.linalg.norm(fwd)
    right = np.cross(fwd, [0, 1, 0]); right /= np.linalg.norm(right)
    up = np.cross(right, fwd)

    fov = math.radians(31.0)
    ys, xs = np.mgrid[0:R, 0:R]
    sx = (xs + 0.5) / R * 2 - 1
    sy = 1 - (ys + 0.5) / R * 2
    scale = math.tan(fov / 2)
    rd = fwd + right * (sx * scale)[..., None] + up * (sy * scale)[..., None]
    rd = (rd / _norm(rd)[..., None]).reshape(-1, 3).astype(F)
    ro = np.repeat(eye[None, :].astype(F), rd.shape[0], 0)

    n = rd.shape[0]
    t = np.zeros(n, F); alive = np.ones(n, bool); hit = np.zeros(n, bool)
    for _ in range(72):
        idx = np.flatnonzero(alive)
        if idx.size == 0:
            break
        p = ro[idx] + rd[idx] * t[idx][:, None]
        d = scene.dist(p)
        t[idx] += np.maximum(d, 0.02) * 0.92
        done = d < 0.28
        hit[idx[done]] = True
        alive[idx[done]] = False
        far = t[idx] > 620
        alive[idx[far]] = False

    img = np.zeros((n, 4))
    hi = np.flatnonzero(hit)
    if hi.size:
        p = ro[hi] + rd[hi] * t[hi][:, None]
        _, base = scene.eval(p)
        # normale par differences centrees
        e = 0.28
        nrm = np.zeros((hi.size, 3))
        for k, off in enumerate(([1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1])):
            o = np.array(off, float) * e
            nrm += np.array(off, float) * scene.dist(p + o)[:, None]
        nrm /= np.maximum(_norm(nrm)[:, None], 1e-9)

        key = np.array([-0.42, 0.72, 0.55]); key /= np.linalg.norm(key)
        ndl = np.clip(nrm @ key, 0, 1)

        # ombre douce
        sh = np.ones(hi.size)
        tp = np.full(hi.size, 1.6)
        q = p + nrm * 0.9
        for _ in range(15):
            dd = scene.dist(q + key * tp[:, None])
            sh = np.minimum(sh, np.clip(9.0 * dd / np.maximum(tp, 1e-4), 0, 1))
            tp += np.clip(dd, 0.25, 9.0)
        sh = np.clip(sh, 0.12, 1.0)

        # occlusion ambiante
        ao = np.ones(hi.size)
        for i in range(1, 4):
            h = 0.5 * i
            ao -= (h - np.clip(scene.dist(p + nrm * h), None, h)) * (0.52 / i)
        ao = np.clip(ao, 0.22, 1.0)

        sky = 0.46 + 0.30 * np.clip(nrm[:, 1], -1, 1)
        rim = np.power(1.0 - np.clip((nrm * -rd[hi]).sum(-1), 0, 1), 3.2)
        hv = key - rd[hi]
        hv /= np.maximum(_norm(hv)[:, None], 1e-9)
        spec = np.power(np.clip((nrm * hv).sum(-1), 0, 1), 26.0) * sh * 0.30
        lit = (base * ((sky * ao)[:, None] + (ndl * sh * 1.02)[:, None])
               + spec[:, None] + rim[:, None] * 0.26)
        img[hi, :3] = np.clip(lit, 0, 1)
        img[hi, 3] = 1.0

    img = img.reshape(R, R, 4)
    out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA')
    if ss > 1:
        out = out.resize((W, W), Image.LANCZOS)
    return out
