/**
 * Moteur d'animation des exercices.
 *
 * Une silhouette articulee est decrite par un squelette (hanche -> buste -> bras,
 * hanche -> jambes). Chaque exercice est defini par une suite de POSES : on donne
 * la position de la main et du pied, et une resolution de cinematique inverse
 * (IK 2 segments) calcule les angles des articulations. Les angles sont ensuite
 * compiles en @keyframes CSS : aucune librairie, aucune video, ~3 Ko par exercice.
 */

/** Dimension du viewBox SVG. */
export const VB = 240;
export const HIP: Vec = [118, 148];
export const TORSO = 46;
export const UPPER_ARM = 25;
export const FOREARM = 23;
export const THIGH = 30;
export const SHIN = 30;
export const GROUND = 209;

export type Vec = [number, number];

export interface Pose {
  /** Position sur la timeline, 0 -> 100 */
  t: number;
  /** Translation verticale de toute la silhouette (unites viewBox) */
  bodyY?: number;
  /** Rotation du buste autour de la hanche, en degres */
  torso?: number;
  /** Cible de la main, en coordonnees locales (avant translation bodyY) */
  hand: Vec;
  /** Cible du pied, en coordonnees locales */
  foot: Vec;
  /** Sens de flexion du coude (+1 vers l'arriere, -1 vers l'avant) */
  handBend?: 1 | -1;
  /** Sens de flexion du genou */
  footBend?: 1 | -1;
}

export type PropKind =
  | 'none'
  | 'bar-high'
  | 'dip-bars'
  | 'bench-flat'
  | 'bench-incline'
  | 'bench-decline'
  | 'seat'
  | 'wall'
  | 'legpress'
  | 'legcurl'
  | 'cable-high'
  | 'cable-mid'
  | 'step';

export type HeldKind =
  | 'none' | 'dumbbell' | 'barbell' | 'handle' | 'rope' | 'plate-back' | 'sled' | 'roller';

export interface ExerciseAnim {
  /** Duree d'un cycle complet, en secondes */
  duration: number;
  /** Rotation globale de la silhouette (mouvements allonges) */
  baseRot?: number;
  /** Decalage global de la silhouette */
  offset?: Vec;
  poses: Pose[];
  prop?: PropKind;
  held?: HeldKind;
  /** Le materiel tenu suit le pied plutot que la main (leg press) */
  heldOnFoot?: boolean;
  ease?: string;
  /** Zone musculaire mise en avant : coordonnees locales du halo */
  focus?: Vec;
  label?: string;
}

/* ------------------------------------------------------------------ */
/*  Maths                                                              */
/* ------------------------------------------------------------------ */

export function rotate(deg: number, v: Vec): Vec {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

/**
 * IK a deux segments. Retourne [angleRacine, angleArticulation] en degres,
 * dans la convention SVG : 0 = segment dirige vers le bas, rotation horaire positive.
 */
export function ik(origin: Vec, target: Vec, l1: number, l2: number, bend: number): [number, number] {
  let dx = target[0] - origin[0];
  let dy = target[1] - origin[1];
  let d = Math.hypot(dx, dy) || 1e-6;

  const max = l1 + l2 - 0.8;
  const min = Math.abs(l1 - l2) + 1.2;
  if (d > max) {
    const k = max / d;
    dx *= k;
    dy *= k;
    d = max;
  } else if (d < min) {
    const k = min / d;
    dx *= k;
    dy *= k;
    d = min;
  }

  const base = Math.atan2(-dx, dy);
  const clamp = (x: number) => Math.min(1, Math.max(-1, x));
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
  const g = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2)));

  const root = ((base + bend * a) * 180) / Math.PI;
  const joint = ((-bend * (Math.PI - g)) * 180) / Math.PI;
  return [root, joint];
}

export interface SolvedPose {
  t: number;
  bodyY: number;
  torso: number;
  shoulder: number;
  elbow: number;
  hipA: number;
  knee: number;
  hand: Vec;
  foot: Vec;
}

export function solve(pose: Pose): SolvedPose {
  const torso = pose.torso ?? 0;
  const bodyY = pose.bodyY ?? 0;
  const shoulderPos: Vec = [
    HIP[0] + rotate(torso, [0, -TORSO])[0],
    HIP[1] + rotate(torso, [0, -TORSO])[1],
  ];
  const [sAbs, elbow] = ik(shoulderPos, pose.hand, UPPER_ARM, FOREARM, pose.handBend ?? 1);
  const [hipA, knee] = ik(HIP, pose.foot, THIGH, SHIN, pose.footBend ?? 1);
  return {
    t: pose.t,
    bodyY,
    torso,
    shoulder: sAbs - torso,
    elbow,
    hipA,
    knee,
    hand: pose.hand,
    foot: pose.foot,
  };
}

/* ------------------------------------------------------------------ */
/*  Bibliotheque de mouvements                                         */
/* ------------------------------------------------------------------ */

const P = (o: Pose): Pose => o;

export const ANIMATIONS: Record<string, ExerciseAnim> = {
  /* ------------------------------- DOS ---------------------------- */
  pullup: {
    duration: 2.8,
    prop: 'bar-high',
    focus: [110, 112],
    label: 'Traction',
    poses: [
      P({ t: 0, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
      P({ t: 48, bodyY: -27, torso: -7, hand: [122, 83], foot: [100, 199], footBend: -1 }),
      P({ t: 100, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
    ],
  },

  'pullup-fast': {
    duration: 1.7,
    prop: 'bar-high',
    focus: [110, 112],
    label: 'Traction explosive',
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
    poses: [
      P({ t: 0, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
      P({ t: 22, bodyY: -28, torso: -8, hand: [122, 84], foot: [100, 199], footBend: -1 }),
      P({ t: 78, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
      P({ t: 100, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
    ],
  },

  'pullup-hold': {
    duration: 4.2,
    prop: 'bar-high',
    focus: [110, 112],
    label: 'Traction + maintien 3 s',
    poses: [
      P({ t: 0, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
      P({ t: 20, bodyY: -28, torso: -8, hand: [122, 84], foot: [100, 199], footBend: -1 }),
      P({ t: 62, bodyY: -28, torso: -8, hand: [122, 84], foot: [100, 199], footBend: -1 }),
      P({ t: 92, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
      P({ t: 100, bodyY: 0, torso: -3, hand: [122, 56], foot: [100, 199], footBend: -1 }),
    ],
  },

  'row-vertical': {
    duration: 2.6,
    prop: 'seat',
    held: 'handle',
    focus: [104, 140],
    label: 'Tirage vertical',
    poses: [
      P({ t: 0, bodyY: 24, torso: -7, hand: [148, 84], foot: [150, 178], footBend: -1 }),
      P({ t: 46, bodyY: 24, torso: 7, hand: [142, 122], foot: [150, 178], footBend: -1 }),
      P({ t: 100, bodyY: 24, torso: -7, hand: [148, 84], foot: [150, 178], footBend: -1 }),
    ],
  },

  'lat-pulldown': {
    duration: 2.6,
    prop: 'cable-high',
    held: 'handle',
    focus: [106, 116],
    label: 'Tirage poulie haute',
    poses: [
      P({ t: 0, torso: -8, hand: [136, 58], foot: [114, 205] }),
      P({ t: 46, torso: 6, hand: [128, 118], foot: [114, 205] }),
      P({ t: 100, torso: -8, hand: [136, 58], foot: [114, 205] }),
    ],
  },

  'row-horizontal': {
    duration: 2.6,
    prop: 'seat',
    held: 'handle',
    focus: [104, 140],
    label: 'Rowing horizontal',
    poses: [
      P({ t: 0, bodyY: 24, torso: -14, hand: [162, 112], foot: [150, 178], footBend: -1 }),
      P({ t: 46, bodyY: 24, torso: 8, hand: [136, 122], foot: [150, 178], footBend: -1 }),
      P({ t: 100, bodyY: 24, torso: -14, hand: [162, 112], foot: [150, 178], footBend: -1 }),
    ],
  },

  'straight-arm-pulldown': {
    duration: 2.4,
    prop: 'cable-high',
    held: 'handle',
    focus: [108, 116],
    label: 'Tirage bras tendus',
    poses: [
      P({ t: 0, torso: -10, hand: [156, 70], foot: [112, 205] }),
      P({ t: 48, torso: -14, hand: [140, 150], foot: [112, 205] }),
      P({ t: 100, torso: -10, hand: [156, 70], foot: [112, 205] }),
    ],
  },

  /* ---------------------------- PECTORAUX ------------------------- */
  'chest-press': {
    duration: 2.5,
    prop: 'seat',
    held: 'handle',
    focus: [126, 128],
    label: 'Chest press',
    poses: [
      P({ t: 0, bodyY: 24, torso: 5, hand: [134, 116], foot: [150, 178], footBend: -1, handBend: 1 }),
      P({ t: 46, bodyY: 24, torso: 3, hand: [168, 106], foot: [150, 178], footBend: -1, handBend: 1 }),
      P({ t: 100, bodyY: 24, torso: 5, hand: [134, 116], foot: [150, 178], footBend: -1, handBend: 1 }),
    ],
  },

  'bench-incline': {
    duration: 2.6,
    prop: 'bench-incline',
    held: 'dumbbell',
    baseRot: -32,
    offset: [4, 12],
    focus: [124, 104],
    label: 'Developpe incline',
    poses: [
      P({ t: 0, torso: 0, hand: [128, 116], foot: [128, 200], footBend: -1 }),
      P({ t: 46, torso: 0, hand: [122, 60], foot: [128, 200], footBend: -1 }),
      P({ t: 100, torso: 0, hand: [128, 116], foot: [128, 200], footBend: -1 }),
    ],
  },

  'bench-decline': {
    duration: 2.6,
    prop: 'bench-decline',
    held: 'dumbbell',
    baseRot: 22,
    offset: [-2, 4],
    focus: [124, 110],
    label: 'Developpe decline',
    poses: [
      P({ t: 0, torso: 0, hand: [130, 118], foot: [128, 200], footBend: -1 }),
      P({ t: 46, torso: 0, hand: [124, 62], foot: [128, 200], footBend: -1 }),
      P({ t: 100, torso: 0, hand: [130, 118], foot: [128, 200], footBend: -1 }),
    ],
  },

  dip: {
    duration: 2.6,
    prop: 'dip-bars',
    focus: [126, 108],
    label: 'Dips',
    poses: [
      P({ t: 0, bodyY: 0, torso: -10, hand: [136, 142], foot: [92, 196], footBend: -1 }),
      P({ t: 46, bodyY: 26, torso: -16, hand: [136, 116], foot: [92, 196], footBend: -1 }),
      P({ t: 100, bodyY: 0, torso: -10, hand: [136, 142], foot: [92, 196], footBend: -1 }),
    ],
  },

  'dip-negative': {
    duration: 4.2,
    prop: 'dip-bars',
    focus: [126, 108],
    label: 'Dips negatives',
    ease: 'linear',
    poses: [
      P({ t: 0, bodyY: 0, torso: -10, hand: [136, 142], foot: [92, 196], footBend: -1 }),
      P({ t: 55, bodyY: 26, torso: -16, hand: [136, 116], foot: [92, 196], footBend: -1 }),
      P({ t: 74, bodyY: 26, torso: -16, hand: [136, 116], foot: [92, 196], footBend: -1 }),
      P({ t: 88, bodyY: 0, torso: -10, hand: [136, 142], foot: [92, 196], footBend: -1 }),
      P({ t: 100, bodyY: 0, torso: -10, hand: [136, 142], foot: [92, 196], footBend: -1 }),
    ],
  },

  'dip-hold': {
    duration: 3.6,
    prop: 'dip-bars',
    focus: [126, 108],
    label: 'Maintien bras tendus',
    ease: 'ease-in-out',
    poses: [
      P({ t: 0, bodyY: 0, torso: -8, hand: [136, 142], foot: [92, 196], footBend: -1 }),
      P({ t: 50, bodyY: 2.5, torso: -10, hand: [136, 142], foot: [92, 194], footBend: -1 }),
      P({ t: 100, bodyY: 0, torso: -8, hand: [136, 142], foot: [92, 196], footBend: -1 }),
    ],
  },

  /* ----------------------------- TRICEPS -------------------------- */
  'triceps-pushdown': {
    duration: 2.2,
    prop: 'cable-high',
    held: 'rope',
    focus: [104, 118],
    label: 'Extension triceps',
    poses: [
      P({ t: 0, torso: -6, hand: [140, 106], foot: [112, 205], handBend: 1 }),
      P({ t: 44, torso: -6, hand: [134, 150], foot: [112, 205], handBend: 1 }),
      P({ t: 100, torso: -6, hand: [140, 106], foot: [112, 205], handBend: 1 }),
    ],
  },

  /* ------------------------------ BICEPS -------------------------- */
  'biceps-curl': {
    duration: 2.4,
    held: 'dumbbell',
    focus: [128, 122],
    label: 'Curl biceps',
    poses: [
      P({ t: 0, torso: -2, hand: [124, 148], foot: [112, 205], handBend: -1 }),
      P({ t: 46, torso: -2, hand: [136, 96], foot: [112, 205], handBend: -1 }),
      P({ t: 100, torso: -2, hand: [124, 148], foot: [112, 205], handBend: -1 }),
    ],
  },

  /* ----------------------------- EPAULES -------------------------- */
  'shoulder-press': {
    duration: 2.6,
    held: 'barbell',
    focus: [118, 100],
    label: 'Developpe militaire',
    poses: [
      P({ t: 0, torso: -2, hand: [130, 106], foot: [112, 205], handBend: 1 }),
      P({ t: 46, torso: -2, hand: [120, 52], foot: [112, 205], handBend: 1 }),
      P({ t: 100, torso: -2, hand: [130, 106], foot: [112, 205], handBend: 1 }),
    ],
  },

  'face-pull': {
    duration: 2.4,
    prop: 'cable-mid',
    held: 'rope',
    focus: [116, 100],
    label: 'Face pull',
    poses: [
      P({ t: 0, torso: -4, hand: [180, 92], foot: [112, 205], handBend: 1 }),
      P({ t: 46, torso: -4, hand: [136, 84], foot: [112, 205], handBend: 1 }),
      P({ t: 100, torso: -4, hand: [180, 92], foot: [112, 205], handBend: 1 }),
    ],
  },

  /* ------------------------------ JAMBES -------------------------- */
  squat: {
    duration: 3,
    held: 'plate-back',
    focus: [108, 172],
    label: 'Squat',
    poses: [
      P({ t: 0, bodyY: 0, torso: -4, hand: [106, 100], foot: [112, 206], footBend: 1 }),
      P({ t: 48, bodyY: 22, torso: -17, hand: [96, 102], foot: [114, 184], footBend: 1 }),
      P({ t: 100, bodyY: 0, torso: -4, hand: [106, 100], foot: [112, 206], footBend: 1 }),
    ],
  },

  lunge: {
    duration: 3.2,
    held: 'dumbbell',
    focus: [112, 174],
    label: 'Fente marchee',
    poses: [
      P({ t: 0, bodyY: 0, torso: -3, hand: [122, 152], foot: [112, 206], footBend: 1 }),
      P({ t: 30, bodyY: 5, torso: -5, hand: [122, 152], foot: [152, 201], footBend: 1 }),
      P({ t: 58, bodyY: 22, torso: -7, hand: [122, 152], foot: [152, 184], footBend: 1 }),
      P({ t: 86, bodyY: 0, torso: -3, hand: [122, 152], foot: [126, 206], footBend: 1 }),
      P({ t: 100, bodyY: 0, torso: -3, hand: [122, 152], foot: [112, 206], footBend: 1 }),
    ],
  },

  'wall-sit': {
    duration: 4,
    prop: 'wall',
    focus: [112, 172],
    label: 'Chaise contre le mur',
    ease: 'ease-in-out',
    poses: [
      P({ t: 0, bodyY: 28, torso: 2, hand: [128, 150], foot: [154, 178], footBend: -1 }),
      P({ t: 50, bodyY: 30, torso: 2, hand: [128, 152], foot: [154, 176], footBend: -1 }),
      P({ t: 100, bodyY: 28, torso: 2, hand: [128, 150], foot: [154, 178], footBend: -1 }),
    ],
  },

  'leg-press': {
    duration: 2.8,
    prop: 'legpress',
    held: 'sled',
    heldOnFoot: true,
    baseRot: 52,
    offset: [-16, 6],
    focus: [110, 176],
    label: 'Presse a cuisses',
    poses: [
      P({ t: 0, torso: 0, hand: [92, 128], foot: [120, 208], footBend: 1 }),
      P({ t: 46, torso: 0, hand: [92, 128], foot: [136, 162], footBend: 1 }),
      P({ t: 100, torso: 0, hand: [92, 128], foot: [120, 208], footBend: 1 }),
    ],
  },

  'leg-curl': {
    duration: 2.6,
    prop: 'legcurl',
    held: 'roller',
    heldOnFoot: true,
    baseRot: -92,
    offset: [26, -18],
    focus: [108, 182],
    label: 'Leg curl allonge',
    poses: [
      P({ t: 0, torso: 4, hand: [140, 130], foot: [114, 206], footBend: 1 }),
      P({ t: 46, torso: 4, hand: [140, 130], foot: [86, 166], footBend: 1 }),
      P({ t: 100, torso: 4, hand: [140, 130], foot: [114, 206], footBend: 1 }),
    ],
  },

  'calf-raise': {
    duration: 2,
    prop: 'step',
    focus: [110, 198],
    label: 'Mollets',
    poses: [
      P({ t: 0, bodyY: 6, torso: -2, hand: [122, 150], foot: [112, 206], footBend: 1 }),
      P({ t: 46, bodyY: -8, torso: -2, hand: [122, 150], foot: [112, 206], footBend: 1 }),
      P({ t: 100, bodyY: 6, torso: -2, hand: [122, 150], foot: [112, 206], footBend: 1 }),
    ],
  },

  /* ----------------------------- DEFAUT --------------------------- */
  generic: {
    duration: 3,
    focus: [118, 130],
    label: 'Mouvement',
    ease: 'ease-in-out',
    poses: [
      P({ t: 0, bodyY: 0, torso: -2, hand: [124, 150], foot: [112, 205] }),
      P({ t: 50, bodyY: -4, torso: 2, hand: [128, 138], foot: [112, 205] }),
      P({ t: 100, bodyY: 0, torso: -2, hand: [124, 150], foot: [112, 205] }),
    ],
  },
};

export function getAnimation(key: string | undefined | null): ExerciseAnim {
  return (key && ANIMATIONS[key]) || ANIMATIONS.generic;
}
