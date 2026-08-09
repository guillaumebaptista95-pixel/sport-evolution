// Exporte, pour chaque mouvement, les positions 3D des articulations image par
// image. Le demi-cycle suffit : la lecture fera l'aller-retour.
import { ANIMATIONS, HIP, TORSO, UPPER_ARM, FOREARM, THIGH, SHIN, solve, musclesOf } from '../../src/lib/rig';

const N = Number(process.env.FRAMES ?? 12);
type V = [number, number];

function rot(deg: number, v: V): V {
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];

const out: Record<string, unknown> = {};

for (const [key, anim] of Object.entries(ANIMATIONS)) {
  const solved = anim.poses.map(solve);
  // Le demi-cycle : de t=0 au sommet du mouvement (pose la plus eloignee).
  const mid = solved.reduce((best, p, i) => (p.t <= 60 && p.t > solved[best].t ? i : best), 0);
  const seq = solved.slice(0, mid + 1);

  const frames = [];
  for (let f = 0; f < N; f++) {
    const t = (f / (N - 1)) * seq[seq.length - 1].t;
    // interpolation lineaire des angles, comme le fait le navigateur
    let i = 0;
    while (i < seq.length - 2 && seq[i + 1].t < t) i++;
    const a = seq[i], b = seq[Math.min(i + 1, seq.length - 1)];
    const u = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
    const L = (x: number, y: number) => x + (y - x) * u;

    const bodyY = L(a.bodyY, b.bodyY);
    const torso = L(a.torso, b.torso);
    const sh = L(a.shoulder, b.shoulder);
    const el = L(a.elbow, b.elbow);
    const hp = L(a.hipA, b.hipA);
    const kn = L(a.knee, b.knee);

    const hip: V = [HIP[0], HIP[1] + bodyY];
    const shoulder = add(hip, rot(torso, [0, -TORSO]));
    const elbow = add(shoulder, rot(torso + sh, [0, UPPER_ARM]));
    const wrist = add(elbow, rot(torso + sh + el, [0, FOREARM]));
    const knee = add(hip, rot(hp, [0, THIGH]));
    const ankle = add(knee, rot(hp + kn, [0, SHIN]));
    const neck = add(hip, rot(torso, [0, -TORSO - 9]));
    const head = add(hip, rot(torso, [0, -TORSO - 20]));
    const held: V = anim.heldOnFoot
      ? [L(a.foot[0], b.foot[0]), L(a.foot[1], b.foot[1]) + bodyY]
      : [L(a.hand[0], b.hand[0]), L(a.hand[1], b.hand[1]) + bodyY];

    frames.push({
      hip, shoulder, elbow, wrist, knee, ankle, neck, head, held,
      torso, sh: torso + sh, el: torso + sh + el, hp, kn: hp + kn,
    });
  }

  out[key] = {
    frames,
    prop: anim.prop ?? 'none',
    propLocal: !!anim.propLocal,
    held: anim.held ?? 'none',
    baseRot: anim.baseRot ?? 0,
    offset: anim.offset ?? [0, 0],
    muscles: musclesOf(key),
    label: anim.label ?? '',
    duration: anim.duration,
  };
}

process.stdout.write(JSON.stringify(out));
