'use client';

// Silhouette humaine animee : le squelette et la cinematique inverse vivent
// dans lib/rig.ts, ce fichier ne s'occupe que du dessin du corps.
//
// Parti pris : le corps est une silhouette sombre et discrete, et seuls les
// muscles sollicites par le mouvement s'allument dans la couleur du groupe.
import { useId, useMemo } from 'react';
import {
  FOREARM,
  GROUND,
  HIP,
  SHIN,
  THIGH,
  TORSO,
  UPPER_ARM,
  getAnimation,
  musclesOf,
  solve,
  type ExerciseAnim,
  type HeldKind,
  type MuscleKey,
  type PropKind,
} from '@/lib/rig';

/** Une fonction qui donne le style d'une articulation (anime ou fige). */
export type JointStyle = (
  joint: 'root' | 'torso' | 'sh' | 'el' | 'hp' | 'kn' | 'held',
  delay?: number
) => React.CSSProperties;

/** Vrai si le muscle est sollicite par le mouvement affiche. */
type IsOn = (m: MuscleKey) => boolean;

interface Skin {
  /** Couleur du cote proche du spectateur. */
  near: string;
  /** Couleur du cote oppose, en retrait. */
  far: string;
  /** Couleur du muscle allume. */
  glow: string;
  on: IsOn;
  /** Trait des lignes de definition musculaire. */
  ink?: string;
  /** Animation de pulsation appliquee aux muscles allumes. */
  pulse?: React.CSSProperties;
}

/* ------------------------------------------------------------------ */
/*  Morphologie                                                        */
/* ------------------------------------------------------------------ */
const W = {
  shoulder: 7.8,
  elbow: 5,
  wrist: 4,
  hip: 10.2,
  knee: 7.2,
  ankle: 4.6,
};

/** Segment fusele : deux articulations rondes reliees par un tronc conique. */
function Seg({ len, w1, w2, fill }: { len: number; w1: number; w2: number; fill: string }) {
  return (
    <g>
      <path d={`M${-w1} 0 L${w1} 0 L${w2} ${len} L${-w2} ${len} Z`} fill={fill} />
      <circle cx="0" cy="0" r={w1} fill={fill} />
      <circle cx="0" cy={len} r={w2} fill={fill} />
    </g>
  );
}

/* -- Masses musculaires. Coordonnees locales du segment : +x = avant. ---- */
const M_DELT = 'M-8.5 1.5 C-9 -5.4 -5 -9.6 0.3 -9.6 C5.6 -9.6 9.2 -5.6 8.6 1.6 C8.4 7 4.8 9.8 0 9.8 C-4.8 9.8 -8.3 7 -8.5 1.5 Z';
const M_BICEPS = 'M1.9 5.4 C7.2 6.8 8.9 11.4 7.6 17 C6.8 20.5 4.8 22.8 2.5 23.6 L1.9 5.4 Z';
const M_TRICEPS = 'M-1.9 4.4 C-7.4 6.1 -9.1 11 -7.8 17.1 C-7 20.6 -5 22.9 -2.5 23.6 L-1.9 4.4 Z';
const M_QUAD = 'M2.1 3.8 C9.4 6 11.8 12.2 10.5 20.2 C9.9 24.3 8.4 26.9 6.7 28.2 L2.1 28.2 Z';
const M_HAM = 'M-2.1 5.8 C-8.9 8 -10.8 13.2 -9.7 20.2 C-9.1 24.3 -7.6 26.9 -6.1 28.2 L-2.1 28.2 Z';
const M_CALF = 'M-1.7 1.8 C-7.6 4 -9.3 9.2 -8.2 15.2 C-7.6 19.2 -5.7 21.9 -3.6 23.2 L-1.7 23.2 Z';

// Taille marquee, cage thoracique profonde : le fameux V vu de profil.
const TORSO_PATH =
  'M11.6 5 C13.4 -3 11.8 -12 11.4 -19 C11.2 -29 16.2 -35.5 15.4 -43 ' +
  'C14.8 -47 11 -49.4 6.8 -49.4 L-6.8 -49.4 ' +
  'C-11.8 -49.4 -15.6 -46 -15 -40.8 C-14 -33 -12 -27 -11.6 -21 ' +
  'C-11.4 -13 -13 -4 -11.8 5 C-6 9.5 6 9.5 11.6 5 Z';

const M_PEC = 'M2 -45 C8.4 -45.8 13.8 -44 15.2 -40.6 C15.8 -35.6 15.2 -31 13.8 -27.2 C8.8 -25.4 4.2 -27.2 2 -30.6 Z';
const M_LAT = 'M-2.2 -45.8 C-8.6 -46.6 -14.2 -44.6 -14.9 -40.8 C-14 -34 -12.4 -29 -12 -23.4 C-7.8 -21.6 -4.2 -23.8 -2.2 -27.6 Z';
const M_ABS = 'M11.4 -25 C11.6 -18 11.4 -11 11.2 -5.4 C7 -3.6 3 -5.2 2 -8.8 C1.8 -14.4 2.6 -20.6 3.8 -25 Z';
const M_GLUTE = 'M-12.6 -6.4 C-15.2 -2.6 -14.8 3.4 -12.4 6.6 C-8 8.8 -4.4 8 -2.6 5.4 C-3.4 -0.4 -6.8 -4.8 -12.6 -6.4 Z';

/* -- Lignes de definition : separations musculaires, facon planche anatomique.
      Tracees par-dessus les masses, elles ne changent pas avec l'eclairage. --- */
const D_ARM = [
  'M-6.6 -2.2 C-2 3.2 3.2 3.4 7.1 -1.8', // capsule du deltoide
  'M2.4 -8.4 C3.5 -3.4 3.7 1.2 3.1 5.8', // faisceau anterieur
  'M0.6 7.6 L0.4 21.8', // gouttiere biceps / triceps
  'M4.7 9 C6.5 12.6 6.7 17.6 5.1 21.4', // long chef du biceps
  'M-4.5 8.6 C-6.5 12 -6.9 16.6 -5.5 20.4', // fer a cheval du triceps
  'M-3 23.8 C-1 25.4 1.4 25.4 3.4 23.8', // pli du coude
];
const D_FOREARM = [
  'M2 3.4 C4.6 6.4 5 10 4.2 13.6',
  'M-1.6 4 C-2.6 9 -2.4 14 -1.4 18.2',
  'M-2.9 19.4 L3 19.4',
];
const D_THIGH = [
  'M4.6 6 C7.6 10.6 8.2 18 7 25.2', // droit anterieur
  'M9.4 12 C10.7 17 10.5 22.4 8.6 26.4', // vaste externe
  'M-4.6 8 C-6.6 13 -6.8 19.6 -5.4 25.4', // ischio-jambiers
  'M2.6 26.2 C4.7 28.4 4.7 31.4 2.4 33.2', // rotule
];
const D_SHIN = [
  'M-3 4 C-6 7.4 -6.9 12.6 -5.6 17',
  'M3.4 3 C4.2 9 4 15.6 3 21',
  'M-2.6 18 C-2.4 21.4 -2.6 24.4 -3.2 26.4',
];
const D_TORSO = [
  'M1.6 -44.4 C6.2 -45.2 11 -44 14.6 -41.2', // clavicule
  'M2.6 -43.4 C2.9 -38 2.7 -33.4 2.7 -29.8', // sternum
  'M2.6 -29.6 C6.2 -26.4 10.6 -25.8 14 -27.6', // bord bas du pectoral
  'M4.6 -26.2 L7.6 -23.4', // dentele
  'M7.4 -25 L10.4 -22.4',
  'M3.4 -23.4 C6.4 -21.6 9 -21.8 11.4 -23', // abdominaux
  'M2.8 -17.4 C5.8 -15.6 8.6 -15.8 11.3 -17',
  'M2.4 -11.4 C5.4 -9.8 8.4 -10 11.1 -11.2',
  'M10.9 -5.8 C8.6 -2.2 5.2 -0.4 1.8 -0.2', // oblique
  'M-3 -28 C-6.6 -25.6 -9.6 -24.2 -12 -23.8', // bord du grand dorsal
  'M-12.2 -39.8 C-11 -32 -10 -22 -10.4 -12', // sillon dorsal
  'M-11.8 -43.6 C-8 -47.8 -3.8 -50 0.6 -50.8', // trapeze
  'M1.6 -55.2 C2.2 -50.6 2.6 -46.6 2.4 -43.4', // sterno-cleido
];
const D_HEAD = [
  'M-2.4 -56.4 C1.6 -56.2 4.6 -57.4 6.6 -59.8', // machoire
  'M6.9 -68.4 C8.4 -68 9.4 -67.2 9.9 -66.3', // arcade
];

function Lines({ d, ink }: { d: string[]; ink: string }) {
  return (
    <g fill="none" stroke={ink} strokeWidth="0.85" strokeLinecap="round" opacity="0.5">
      {d.map((p) => (
        <path key={p} d={p} />
      ))}
    </g>
  );
}

/** Fill d'une masse : couleur du muscle si sollicite, sinon la peau. */
function Muscle({
  d,
  k,
  sk,
  base,
}: {
  d: string;
  k: MuscleKey;
  sk: Skin;
  base: string;
}) {
  const on = sk.on(k);
  return <path d={d} fill={on ? sk.glow : base} style={on ? sk.pulse : undefined} />;
}

function Arm({
  s,
  sk,
  base,
  delay,
  lit,
  ink,
}: {
  s: JointStyle;
  sk: Skin;
  base: string;
  delay: number;
  lit: boolean;
  ink?: string;
}) {
  const skin: Skin = lit ? sk : { ...sk, on: () => false };
  return (
    <g style={s('sh', delay)}>
      <Seg len={UPPER_ARM} w1={W.shoulder} w2={W.elbow} fill={base} />
      <Muscle d={M_DELT} k="epaules" sk={skin} base={base} />
      <Muscle d={M_BICEPS} k="biceps" sk={skin} base={base} />
      <Muscle d={M_TRICEPS} k="triceps" sk={skin} base={base} />
      {ink && <Lines d={D_ARM} ink={ink} />}
      <g transform={`translate(0,${UPPER_ARM})`}>
        <g style={s('el', delay)}>
          <Seg len={FOREARM} w1={W.elbow} w2={W.wrist} fill={base} />
          {/* avant-bras : leger renflement pres du coude */}
          <path d="M1.6 2.4 C5.4 4 6.4 8 5.6 12.4 L1.6 13 Z" fill={base} />
          {ink && <Lines d={D_FOREARM} ink={ink} />}
          {/* main : paume + pouce */}
          <g transform={`translate(0.4,${FOREARM + 1.5})`}>
            <path
              d="M-3.9 -2.6 C-5.2 0.4 -4.6 4.4 -2 6.4 C0.8 8.6 4.4 7.4 5.2 4 C5.9 1 5.2 -1.6 3.6 -3.4 Z"
              fill={base}
            />
            <path d="M3.4 -3.2 C6 -2.6 6.8 -0.6 6 1.4 L3.8 0.4 Z" fill={base} />
          </g>
        </g>
      </g>
    </g>
  );
}

function Leg({
  s,
  sk,
  base,
  delay,
  lit,
  ink,
}: {
  s: JointStyle;
  sk: Skin;
  base: string;
  delay: number;
  lit: boolean;
  ink?: string;
}) {
  const skin: Skin = lit ? sk : { ...sk, on: () => false };
  return (
    <g style={s('hp', delay)}>
      <Seg len={THIGH} w1={W.hip} w2={W.knee} fill={base} />
      <Muscle d={M_QUAD} k="quadriceps" sk={skin} base={base} />
      <Muscle d={M_HAM} k="ischios" sk={skin} base={base} />
      {ink && <Lines d={D_THIGH} ink={ink} />}
      <g transform={`translate(0,${THIGH})`}>
        <g style={s('kn', delay)}>
          <Seg len={SHIN} w1={W.knee} w2={W.ankle} fill={base} />
          <Muscle d={M_CALF} k="mollets" sk={skin} base={base} />
          {ink && <Lines d={D_SHIN} ink={ink} />}
          {/* pied : talon, voute, orteils */}
          <path
            d={`M-5 ${SHIN - 3.4} L9 ${SHIN - 3} C13.6 ${SHIN - 2} 14.2 ${SHIN + 3.4} 10.4 ${SHIN + 4.2} L-5.2 ${SHIN + 4.2} C-7.6 ${SHIN + 4.2} -7.8 ${SHIN - 3.4} -5 ${SHIN - 3.4} Z`}
            fill={base}
          />
          {ink && (
            <path
              d={`M-1.4 ${SHIN - 1} C1.6 ${SHIN + 0.6} 5.6 ${SHIN + 1} 9.6 ${SHIN + 0.8}`}
              fill="none"
              stroke={ink}
              strokeWidth="0.85"
              strokeLinecap="round"
              opacity="0.5"
            />
          )}
        </g>
      </g>
    </g>
  );
}

/**
 * Le corps complet. `s` fournit les transformations : l'ecran de l'app passe
 * des animations CSS, les planches-contact passent des angles figes.
 */
export function Body({
  s,
  sk,
  held,
  delay = 0,
  opacity = 1,
  flat,
}: {
  s: JointStyle;
  sk: Skin;
  held?: HeldKind;
  delay?: number;
  opacity?: number;
  /** Silhouette monochrome (fantomes de trajectoire). */
  flat?: string;
}) {
  const near = flat ?? sk.near;
  const far = flat ?? sk.far;
  const lit = !flat;
  const ink = lit ? sk.ink : undefined;

  return (
    <g style={s('root', delay)} opacity={opacity}>
      <g transform={`translate(${HIP[0]},${HIP[1]})`}>
        {/* jambe arriere */}
        <g transform="translate(-5.5,0)">
          <Leg s={s} sk={sk} base={far} delay={delay} lit={false} />
        </g>

        <g style={s('torso', delay)}>
          {/* bras arriere */}
          <g transform={`translate(-5.5,${-TORSO + 2})`}>
            <Arm s={s} sk={sk} base={far} delay={delay} lit={false} />
          </g>

          {/* buste */}
          <path d={TORSO_PATH} fill={near} />
          <Muscle d={M_PEC} k="pectoraux" sk={sk} base={near} />
          <Muscle d={M_LAT} k="dos" sk={sk} base={near} />
          <Muscle d={M_ABS} k="abdos" sk={sk} base={near} />
          <Muscle d={M_GLUTE} k="fessiers" sk={sk} base={near} />
          {ink && <Lines d={D_TORSO} ink={ink} />}

          {/* trapeze : relie le cou aux epaules */}
          <path d="M-13.2 -42.8 C-9 -48.4 -4.4 -51 0.4 -51.4 L1 -44 Z" fill={near} />
          {/* cou */}
          <path d="M-5.4 -43 L5.6 -43 L5.8 -53.6 C5.8 -56.6 -5.2 -56.6 -5.4 -53.6 Z" fill={near} />
          {/* crane */}
          <path
            d="M-8.4 -64 C-8.8 -71.6 -4 -76.2 1.6 -75.8 C7.4 -75.4 10.4 -70.6 10 -65 C9.8 -61 8.6 -57.4 6.4 -55.2 L-2 -54.8 C-6 -55.4 -8.2 -59.4 -8.4 -64 Z"
            fill={near}
          />
          {/* nez : donne le sens du regard */}
          <path d="M9.9 -66.6 L13.5 -64.5 L9.6 -62.4 Z" fill={near} />
          {/* chevelure : masse plus sombre a l'arriere du crane */}
          {lit && (
            <path
              d="M-8.5 -65.4 C-9 -72.4 -3.6 -76.4 2.2 -75.9 C5.4 -75.6 8 -74 9.4 -71.6 C5.2 -73.6 -1.4 -73.6 -4.8 -70.8 C-7.2 -68.8 -8.1 -67 -8.5 -65.4 Z"
              fill={far}
            />
          )}
          {/* oreille */}
          {lit && <ellipse cx="0.2" cy="-62.6" rx="1.9" ry="2.4" fill={far} />}
          {ink && <Lines d={D_HEAD} ink={ink} />}

          {/* bras avant */}
          <g transform={`translate(1,${-TORSO + 2})`}>
            <Arm s={s} sk={sk} base={near} delay={delay} lit={lit} ink={ink} />
          </g>
        </g>

        {/* jambe avant */}
        <Leg s={s} sk={sk} base={near} delay={delay} lit={lit} ink={ink} />
      </g>

      {held && held !== 'none' && (
        <g style={s('held', delay)}>
          <Held kind={held} color={flat ?? sk.glow} />
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Composant anime                                                    */
/* ------------------------------------------------------------------ */
interface Props {
  animationKey?: string | null;
  color?: string;
  className?: string;
  paused?: boolean;
  trail?: boolean;
  ghosts?: number;
}

export default function ExerciseAnimation({
  animationKey,
  color = '#6C5CE7',
  className,
  paused = false,
  trail = true,
  ghosts = 1,
}: Props) {
  const raw = useId();
  const uid = useMemo(() => 'a' + raw.replace(/[^a-zA-Z0-9]/g, ''), [raw]);
  const anim: ExerciseAnim = useMemo(() => getAnimation(animationKey), [animationKey]);
  const solved = useMemo(() => anim.poses.map(solve), [anim]);
  const muscles = useMemo(() => new Set(musclesOf(animationKey)), [animationKey]);

  const css = useMemo(() => {
    const frames = (name: string, get: (p: (typeof solved)[number]) => string) =>
      `@keyframes ${uid}-${name}{${solved.map((p) => `${p.t}%{transform:${get(p)}}`).join('')}}`;
    return [
      frames('root', (p) => `translate(0px,${p.bodyY.toFixed(2)}px)`),
      frames('torso', (p) => `rotate(${p.torso.toFixed(2)}deg)`),
      frames('sh', (p) => `rotate(${p.shoulder.toFixed(2)}deg)`),
      frames('el', (p) => `rotate(${p.elbow.toFixed(2)}deg)`),
      frames('hp', (p) => `rotate(${p.hipA.toFixed(2)}deg)`),
      frames('kn', (p) => `rotate(${p.knee.toFixed(2)}deg)`),
      frames('held', (p) => {
        const v = anim.heldOnFoot ? p.foot : p.hand;
        return `translate(${v[0].toFixed(2)}px,${v[1].toFixed(2)}px)`;
      }),
      `@keyframes ${uid}-glow{0%,100%{opacity:.62}50%{opacity:1}}`,
    ].join('');
  }, [solved, uid, anim.heldOnFoot]);

  const ease = anim.ease ?? 'cubic-bezier(0.45,0.05,0.35,1)';
  const dur = anim.duration;

  const style: JointStyle = (joint, delay = 0) => ({
    animation: `${uid}-${joint} ${dur}s ${ease} infinite`,
    animationDelay: `${delay}s`,
    animationPlayState: paused ? 'paused' : 'running',
    transformOrigin: '0px 0px',
    transformBox: 'view-box' as React.CSSProperties['transformBox'],
  });

  const sk: Skin = {
    near: `url(#${uid}-body)`,
    far: '#2E3542',
    glow: color,
    ink: '#161A22',
    on: (m) => muscles.has(m),
    pulse: {
      animation: `${uid}-glow ${dur}s ease-in-out infinite`,
      animationPlayState: paused ? 'paused' : 'running',
    },
  };

  const handPath = useMemo(
    () => 'M' + solved.map((p) => `${p.hand[0]},${p.hand[1] + p.bodyY}`).join(' L'),
    [solved]
  );

  const ghostList = Array.from({ length: Math.max(0, ghosts) }, (_, i) => i + 1);

  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label={anim.label ?? 'Mouvement'}>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#5C6577" />
          <stop offset="60%" stopColor="#4A5364" />
          <stop offset="100%" stopColor="#3B4353" />
        </linearGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <style>{css}</style>

      {!anim.propLocal && <Equipment kind={anim.prop ?? 'none'} color={color} />}

      <line x1="26" y1={GROUND + 4} x2="214" y2={GROUND + 4} stroke={`url(#${uid}-floor)`} strokeWidth="2.5" />

      {trail && (
        <path d={handPath} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 6" opacity="0.4" />
      )}

      <g
        transform={`translate(${anim.offset?.[0] ?? 0},${anim.offset?.[1] ?? 0}) rotate(${anim.baseRot ?? 0} ${HIP[0]} ${HIP[1]})`}
      >
        {/* Materiel solidaire du corps : le dos ne peut pas le quitter. */}
        {anim.propLocal && <Equipment kind={anim.prop ?? 'none'} color={color} />}

        {ghostList.map((i) => (
          <Body
            key={i}
            s={style}
            sk={sk}
            flat={color}
            delay={-0.1 * i * (dur / 2.6)}
            opacity={0.14 / i}
            held={anim.held}
          />
        ))}
        <Body s={style} sk={sk} held={anim.held} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Materiel tenu en main                                              */
/* ------------------------------------------------------------------ */
function Held({ kind, color }: { kind: HeldKind; color: string }) {
  const steel = '#9AA3B4';
  switch (kind) {
    case 'dumbbell':
      return (
        <g>
          <rect x="-12" y="-3" width="24" height="6" rx="3" fill={steel} />
          <rect x="-20" y="-9.5" width="8" height="19" rx="3.5" fill={color} />
          <rect x="12" y="-9.5" width="8" height="19" rx="3.5" fill={color} />
        </g>
      );
    case 'barbell':
      return (
        <g>
          <rect x="-46" y="-3" width="92" height="6" rx="3" fill={steel} />
          <rect x="-44" y="-14" width="9" height="28" rx="4" fill={color} />
          <rect x="35" y="-14" width="9" height="28" rx="4" fill={color} />
        </g>
      );
    case 'plate-back':
      return (
        <g>
          <rect x="-44" y="-3" width="88" height="6" rx="3" fill={steel} />
          <rect x="-42" y="-16" width="10" height="32" rx="4.5" fill={color} />
          <rect x="32" y="-16" width="10" height="32" rx="4.5" fill={color} />
        </g>
      );
    case 'handle':
      return (
        <g>
          <rect x="-3.5" y="-14" width="7" height="28" rx="3.5" fill={steel} />
          <circle cx="0" cy="0" r="4.5" fill={color} />
        </g>
      );
    case 'rope':
      return (
        <g>
          <path d="M-2 -3 L-8 15" stroke={steel} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M2 -3 L8 15" stroke={steel} strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="-8" cy="16" r="3.2" fill={color} />
          <circle cx="8" cy="16" r="3.2" fill={color} />
        </g>
      );
    case 'sled':
      return (
        <g>
          <rect x="-3" y="-27" width="11" height="54" rx="5" fill={steel} />
          <rect x="8" y="-19" width="8" height="38" rx="4" fill={color} />
        </g>
      );
    case 'roller':
      return (
        <g>
          <rect x="-16" y="-7" width="32" height="14" rx="7" fill={steel} />
          <circle cx="-14" cy="0" r="7.5" fill={color} />
          <circle cx="14" cy="0" r="7.5" fill={color} />
        </g>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Materiel fixe                                                      */
/* ------------------------------------------------------------------ */
export function Equipment({ kind, color }: { kind: PropKind; color: string }) {
  const frame = 'rgba(255,255,255,0.14)';
  const solid = 'rgba(255,255,255,0.28)';
  const pad = 'rgba(255,255,255,0.34)';

  switch (kind) {
    case 'bar-high':
      return (
        <g>
          <line x1="46" y1="42" x2="46" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <line x1="194" y1="42" x2="194" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <line x1="42" y1="54" x2="198" y2="54" stroke={solid} strokeWidth="8" strokeLinecap="round" />
          <line x1="102" y1="54" x2="146" y2="54" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
        </g>
      );
    case 'dip-bars':
      // Deux barres courtes de part et d'autre du corps, montees sur un chassis :
      // le sujet est suspendu entre les deux, pas assis dessus.
      return (
        <g>
          <line x1="70" y1="136" x2="106" y2="136" stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <line x1="124" y1="140" x2="164" y2="140" stroke={solid} strokeWidth="8" strokeLinecap="round" />
          <line x1="126" y1="140" x2="146" y2="140" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          <line x1="160" y1="140" x2="172" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <line x1="76" y1="136" x2="64" y2={GROUND + 4} stroke={frame} strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        </g>
      );
    case 'seat':
      // Assise + dossier : la hanche repose sur le coussin, le dos sur le dossier.
      return (
        <g>
          <rect x="98" y="177" width="78" height="13" rx="6.5" fill={pad} />
          <rect x="91" y="116" width="14" height="66" rx="7" fill={pad} />
          <line x1="136" y1="190" x2="136" y2={GROUND + 4} stroke={frame} strokeWidth="8" strokeLinecap="round" />
          <line x1="110" y1={GROUND + 4} x2="166" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case 'bench-flat':
      return (
        <g>
          <rect x="66" y="150" width="126" height="13" rx="6.5" fill={pad} />
          <line x1="86" y1="163" x2="86" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <line x1="174" y1="163" x2="174" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    // Bancs inclines et declines : dessines dans le repere du corps. Le dossier
    // est un rectangle vertical colle au dos (le dos est en x = 104), c'est la
    // rotation de la scene qui lui donne son inclinaison.
    case 'bench-incline':
    case 'bench-decline':
      return (
        <g>
          <rect x="89" y="70" width="15" height="118" rx="7.5" fill={pad} />
          <rect x="92" y="186" width="9" height="30" rx="4" fill={frame} />
          <rect x="80" y="210" width="34" height="8" rx="4" fill={frame} />
        </g>
      );
    case 'wall':
      return <rect x="91" y="44" width="13" height={GROUND - 40} rx="4" fill={solid} />;
    // Repere du corps : dossier colle au dos, assise sous le bassin.
    case 'legpress':
      return (
        <g>
          <rect x="88" y="80" width="15" height="106" rx="7.5" fill={pad} />
        </g>
      );
    // Repere du corps : le sujet est a plat ventre, le coussin est cote face.
    case 'legcurl':
      return (
        <g>
          <rect x="130" y="82" width="15" height="106" rx="7.5" fill={pad} />
          <rect x="118" y="188" width="10" height="26" rx="5" fill={frame} />
        </g>
      );
    case 'cable-high':
      return (
        <g>
          <line x1="198" y1="32" x2="198" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <circle cx="198" cy="40" r="8" fill="none" stroke={solid} strokeWidth="4" />
          <line x1="198" y1="40" x2="150" y2="52" stroke={solid} strokeWidth="2" />
        </g>
      );
    case 'cable-mid':
      return (
        <g>
          <line x1="208" y1="44" x2="208" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <circle cx="208" cy="88" r="8" fill="none" stroke={solid} strokeWidth="4" />
          <line x1="208" y1="88" x2="178" y2="90" stroke={solid} strokeWidth="2" />
        </g>
      );
    case 'step':
      // Plateforme basse : les orteils dessus, le talon dans le vide derriere.
      return (
        <g>
          <rect x="108" y="206" width="84" height="9" rx="4.5" fill={pad} />
          <rect x="112" y="213" width="76" height="7" rx="3.5" fill={frame} />
        </g>
      );
    default:
      return null;
  }
}
