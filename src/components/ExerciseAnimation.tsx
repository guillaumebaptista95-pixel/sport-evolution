'use client';

// Silhouette humaine animee : le squelette et la cinematique inverse vivent
// dans lib/rig.ts, ce fichier ne s'occupe que du dessin du corps.
//
// Parti pris : le corps est une silhouette sombre et discrete, et seuls les
// muscles sollicites par le mouvement s'allument dans la couleur du groupe.
import { useId, useMemo } from 'react';
import {
  ANIMATIONS,
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
import { cn } from '@/lib/format';

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
          <Held kind={held} color={flat ?? sk.glow} grip={near} ink={ink} />
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

/**
 * Lecteur des sequences rendues en 3D. Chaque mouvement est une planche
 * verticale de 12 images (le demi-cycle) : l'animation la parcourt par pas,
 * puis repart en sens inverse, ce qui donne le va-et-vient du geste.
 */
export default function ExerciseAnimation({
  animationKey,
  color = '#6C5CE7',
  className,
  paused = false,
  trail = true,
  ghosts = 1,
  hd = false,
}: Props & { hd?: boolean }) {
  const key = animationKey && animationKey in ANIMATIONS ? animationKey : 'generic';
  const anim = getAnimation(key);

  return (
    <div className={cn('relative aspect-square overflow-hidden', className)}>
      <div
        className="sprite3d absolute inset-0"
        style={{
          backgroundImage: `url(/anim/${key}${hd ? '' : '-sm'}.png)`,
          animationDuration: `${(anim.duration / 2).toFixed(2)}s`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
        role="img"
        aria-label={anim.label ?? 'Mouvement'}
      />
    </div>
  );
}

/** Ancien rendu vectoriel, conserve comme secours. */
export function SvgAnimation({
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
const STEEL = '#9AA3B4';
const STEEL_D = '#6E7787';

/** Moletage : les stries de la zone de prise d'une barre. */
function Knurl({ x, w, y = 0 }: { x: number; w: number; y?: number }) {
  const n = Math.max(2, Math.round(w / 3));
  return (
    <g stroke={STEEL_D} strokeWidth="0.8" opacity="0.65">
      {Array.from({ length: n }, (_, i) => {
        const cx = x + ((i + 0.5) * w) / n;
        return <line key={i} x1={cx} y1={y - 2.2} x2={cx} y2={y + 2.2} />;
      })}
    </g>
  );
}

/** Disque olympique vu de cote : jante, bord et moyeu. */
function Plate({ cx, r, color }: { cx: number; r: number; color: string }) {
  return (
    <g>
      <ellipse cx={cx} cy="0" rx={r * 0.34} ry={r} fill={color} />
      <ellipse cx={cx} cy="0" rx={r * 0.34} ry={r} fill="none" stroke={STEEL_D} strokeWidth="0.8" opacity="0.5" />
      <ellipse cx={cx} cy="0" rx={r * 0.12} ry={r * 0.34} fill={STEEL_D} opacity="0.55" />
    </g>
  );
}

/** Les doigts refermes par-dessus la barre : c'est ce qui fait la prise. */
function Grip({ skin, ink, tall = 5.6 }: { skin: string; ink?: string; tall?: number }) {
  return (
    <g>
      <path
        d={`M-4.2 ${-tall} C-0.8 ${-tall - 1.2} 3.2 ${-tall - 0.9} 4.8 ${-tall + 1} L4.8 ${tall - 0.8} C3.2 ${tall + 1} -0.8 ${tall + 1.2} -4.2 ${tall} Z`}
        fill={skin}
      />
      {ink && (
        <g stroke={ink} strokeWidth="0.7" opacity="0.45" fill="none">
          <path d={`M-3.4 ${-tall / 2} L4.3 ${-tall / 2 + 0.2}`} />
          <path d="M-3.4 0.4 L4.4 0.5" />
          <path d={`M-3.4 ${tall / 2} L4.3 ${tall / 2 - 0.1}`} />
        </g>
      )}
    </g>
  );
}

function Held({
  kind,
  color,
  grip,
  ink,
}: {
  kind: HeldKind;
  color: string;
  grip: string;
  ink?: string;
}) {
  switch (kind) {
    case 'dumbbell':
      return (
        <g>
          <rect x="-11" y="-2.4" width="22" height="4.8" rx="2.4" fill={STEEL} />
          <Knurl x={-6} w={12} />
          <rect x="-13.5" y="-5" width="3" height="10" rx="1.5" fill={STEEL_D} />
          <rect x="10.5" y="-5" width="3" height="10" rx="1.5" fill={STEEL_D} />
          <Plate cx={-17.5} r={10} color={color} />
          <Plate cx={17.5} r={10} color={color} />
          <Grip skin={grip} ink={ink} />
        </g>
      );
    case 'barbell':
    case 'plate-back':
      return (
        <g>
          <rect x="-46" y="-2.6" width="92" height="5.2" rx="2.6" fill={STEEL} />
          <Knurl x={-16} w={32} />
          <rect x="-33" y="-5.4" width="3.4" height="10.8" rx="1.7" fill={STEEL_D} />
          <rect x="29.6" y="-5.4" width="3.4" height="10.8" rx="1.7" fill={STEEL_D} />
          <Plate cx={-38} r={15} color={color} />
          <Plate cx={-30} r={11} color={color} />
          <Plate cx={38} r={15} color={color} />
          <Plate cx={30} r={11} color={color} />
          <Grip skin={grip} ink={ink} />
        </g>
      );
    case 'handle':
      // Poignee en D : etrier, mousqueton et cable qui repart vers la poulie.
      return (
        <g>
          <path d="M0 -20 L0 -12" stroke={STEEL_D} strokeWidth="1.3" strokeLinecap="round" fill="none" />
          <rect x="-1.7" y="-12.4" width="3.4" height="4.4" rx="1.2" fill={STEEL_D} />
          <path
            d="M-6.2 -8 C-9.4 -3.6 -9.4 3.6 -6.2 8 L-3 8 C-5.8 3.6 -5.8 -3.6 -3 -8 Z"
            fill={color}
            opacity="0.9"
          />
          <rect x="-3.6" y="-8.4" width="7.2" height="16.8" rx="3.6" fill={STEEL} />
          <Grip skin={grip} ink={ink} tall={5} />
        </g>
      );
    case 'rope':
      // Corde a triceps : deux brins tresses et leurs embouts.
      return (
        <g>
          <path d="M0 -26 L0 -8" stroke={STEEL_D} strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <rect x="-3" y="-9" width="6" height="6" rx="2" fill={STEEL_D} />
          <path d="M-1.6 -3 C-4 4 -6.4 10 -8.4 15" stroke={color} strokeWidth="4.2" strokeLinecap="round" fill="none" opacity="0.9" />
          <path d="M1.6 -3 C4 4 6.4 10 8.4 15" stroke={color} strokeWidth="4.2" strokeLinecap="round" fill="none" opacity="0.9" />
          <g stroke={STEEL_D} strokeWidth="0.7" opacity="0.5" fill="none">
            <path d="M-3.4 3 L-1.2 4.4" />
            <path d="M-5 8 L-2.8 9.4" />
            <path d="M3.4 3 L1.2 4.4" />
            <path d="M5 8 L2.8 9.4" />
          </g>
          <ellipse cx="-9.2" cy="17.4" rx="3.6" ry="4.4" fill={STEEL_D} />
          <ellipse cx="9.2" cy="17.4" rx="3.6" ry="4.4" fill={STEEL_D} />
          <Grip skin={grip} ink={ink} tall={5} />
        </g>
      );
    case 'sled':
      // Plateau de presse a cuisses : platine, raidisseur et rail.
      return (
        <g>
          <rect x="-2" y="-30" width="9" height="60" rx="3" fill={STEEL} />
          <g stroke={STEEL_D} strokeWidth="0.9" opacity="0.5">
            <line x1="-1" y1="-20" x2="6" y2="-20" />
            <line x1="-1" y1="0" x2="6" y2="0" />
            <line x1="-1" y1="20" x2="6" y2="20" />
          </g>
          <rect x="7" y="-22" width="7" height="44" rx="3" fill={color} />
          <rect x="14" y="-10" width="14" height="20" rx="4" fill={STEEL_D} opacity="0.7" />
        </g>
      );
    case 'roller':
      // Boudins de leg curl : deux mousses sur un axe.
      return (
        <g>
          <rect x="-15" y="-2.4" width="30" height="4.8" rx="2.4" fill={STEEL_D} />
          <rect x="-19" y="-8" width="13" height="16" rx="6.5" fill={color} />
          <rect x="6" y="-8" width="13" height="16" rx="6.5" fill={color} />
          <g stroke={STEEL_D} strokeWidth="0.8" opacity="0.4" fill="none">
            <path d="M-12.6 -6.4 L-12.6 6.4" />
            <path d="M12.6 -6.4 L12.6 6.4" />
          </g>
        </g>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Materiel fixe                                                      */
/* ------------------------------------------------------------------ */
/** Coussin capitonne : mousse + surpiqure, comme sur les machines. */
function Pad({
  x,
  y,
  w,
  h,
  fill,
  seams = 3,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  seams?: number;
}) {
  const horiz = w >= h;
  const r = Math.min(w, h) / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
      <g stroke="rgba(0,0,0,0.3)" strokeWidth="0.9" strokeLinecap="round">
        {Array.from({ length: seams }, (_, i) => {
          const k = (i + 1) / (seams + 1);
          return horiz ? (
            <line key={i} x1={x + w * k} y1={y + 2.6} x2={x + w * k} y2={y + h - 2.6} />
          ) : (
            <line key={i} x1={x + 2.6} y1={y + h * k} x2={x + w - 2.6} y2={y + h * k} />
          );
        })}
      </g>
    </g>
  );
}

/** Colonne de charges : les plaques empilees d'une machine a poulie. */
function Stack({ x, y, w = 30, n = 7, color }: { x: number; y: number; w?: number; n?: number; color: string }) {
  const h = 7.5;
  return (
    <g>
      <rect x={x - 4} y={y - 8} width={w + 8} height={n * h + 20} rx="5" fill="rgba(255,255,255,0.05)" />
      <line x1={x + w / 2} y1={y - 6} x2={x + w / 2} y2={y + n * h + 8} stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
      {Array.from({ length: n }, (_, i) => (
        <rect
          key={i}
          x={x}
          y={y + i * h}
          width={w}
          height={h - 1.6}
          rx="2"
          fill={i < 3 ? color : 'rgba(255,255,255,0.2)'}
          opacity={i < 3 ? 0.75 : 1}
        />
      ))}
    </g>
  );
}

/** Poulie : gorge, rayons et chape. */
function Pulley({ cx, cy, r = 8, color }: { cx: number; cy: number; r?: number; color: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.32)" strokeWidth="2.4" />
      <circle cx={cx} cy={cy} r={r * 0.34} fill={color} opacity="0.85" />
      <g stroke="rgba(255,255,255,0.28)" strokeWidth="1.1">
        <line x1={cx - r * 0.7} y1={cy} x2={cx + r * 0.7} y2={cy} />
        <line x1={cx} y1={cy - r * 0.7} x2={cx} y2={cy + r * 0.7} />
      </g>
    </g>
  );
}

export function Equipment({ kind, color }: { kind: PropKind; color: string }) {
  const frame = 'rgba(255,255,255,0.14)';
  const solid = 'rgba(255,255,255,0.28)';
  const pad = 'rgba(255,255,255,0.34)';
  const cable = 'rgba(255,255,255,0.42)';

  switch (kind) {
    case 'bar-high':
      // Cage a tractions : montants, pieds au sol, barre moletee au centre.
      return (
        <g>
          <rect x="42" y="44" width="8" height={GROUND - 40} rx="4" fill={frame} />
          <rect x="190" y="44" width="8" height={GROUND - 40} rx="4" fill={frame} />
          <rect x="30" y={GROUND + 1} width="32" height="7" rx="3.5" fill={frame} />
          <rect x="178" y={GROUND + 1} width="32" height="7" rx="3.5" fill={frame} />
          <rect x="38" y="50" width="164" height="8" rx="4" fill={solid} />
          <rect x="100" y="49" width="48" height="10" rx="5" fill={color} opacity="0.85" />
          <g stroke="rgba(0,0,0,0.35)" strokeWidth="0.9">
            {Array.from({ length: 11 }, (_, i) => (
              <line key={i} x1={103 + i * 4.2} y1="51" x2={103 + i * 4.2} y2="57" />
            ))}
          </g>
        </g>
      );
    case 'dip-bars':
      // Deux barres paralleles sur un chassis en A : on est suspendu entre elles.
      return (
        <g>
          <rect x="68" y="133" width="40" height="6" rx="3" fill={frame} />
          <rect x="122" y="136" width="44" height="8" rx="4" fill={solid} />
          <rect x="124" y="136" width="24" height="8" rx="4" fill={color} opacity="0.85" />
          <g stroke="rgba(0,0,0,0.32)" strokeWidth="0.9">
            {Array.from({ length: 6 }, (_, i) => (
              <line key={i} x1={127 + i * 3.6} y1="137.4" x2={127 + i * 3.6} y2="142.6" />
            ))}
          </g>
          <path d="M160 144 L172 205" stroke={frame} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M76 139 L64 205" stroke={frame} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5" />
          <rect x="56" y={GROUND + 1} width="30" height="7" rx="3.5" fill={frame} opacity="0.6" />
          <rect x="156" y={GROUND + 1} width="32" height="7" rx="3.5" fill={frame} />
        </g>
      );
    case 'seat':
      // Machine assise : colonne de charges, poulie, assise et dossier capitonnes.
      return (
        <g>
          <rect x="34" y="62" width="42" height={GROUND - 58} rx="6" fill="rgba(255,255,255,0.05)" />
          <rect x="30" y={GROUND + 1} width="50" height="7" rx="3.5" fill={frame} />
          <Stack x={40} y={112} color={color} />
          <Pulley cx={55} cy={76} r={7} color={color} />
          <line x1="55" y1="83" x2="55" y2="104" stroke={cable} strokeWidth="1.6" />
          <line x1="62" y1="74" x2="104" y2="88" stroke={cable} strokeWidth="1.6" />
          <Pad x={98} y={177} w={78} h={13} fill={pad} seams={4} />
          <Pad x={91} y={116} w={14} h={66} fill={pad} seams={4} />
          <rect x="130" y="188" width="10" height={GROUND - 186} rx="4" fill={frame} />
          <rect x="106" y={GROUND + 1} width="62" height="7" rx="3.5" fill={frame} />
          <rect x="96" y="180" width="12" height="30" rx="4" fill={frame} opacity="0.7" />
        </g>
      );
    case 'bench-flat':
      return (
        <g>
          <Pad x={66} y={150} w={126} h={13} fill={pad} seams={5} />
          <path d="M86 163 L80 205" stroke={frame} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M174 163 L180 205" stroke={frame} strokeWidth="7" strokeLinecap="round" fill="none" />
          <rect x="66" y={GROUND + 1} width="28" height="7" rx="3.5" fill={frame} />
          <rect x="166" y={GROUND + 1} width="28" height="7" rx="3.5" fill={frame} />
        </g>
      );
    // Bancs inclines et declines : dessines dans le repere du corps. Le dossier
    // est un rectangle vertical colle au dos (le dos est en x = 104), c'est la
    // rotation de la scene qui lui donne son inclinaison.
    case 'bench-incline':
    case 'bench-decline':
      return (
        <g>
          <Pad x={89} y={70} w={15} h={118} fill={pad} seams={6} />
          <rect x="92" y="186" width="9" height="30" rx="4" fill={frame} />
          <rect x="80" y="212" width="36" height="8" rx="4" fill={frame} />
          <rect x="86" y="66" width="21" height="7" rx="3.5" fill={frame} opacity="0.7" />
        </g>
      );
    case 'wall':
      return (
        <g>
          <rect x="91" y="44" width="13" height={GROUND - 40} rx="4" fill={solid} />
          <g stroke="rgba(0,0,0,0.22)" strokeWidth="1">
            <line x1="93" y1="100" x2="102" y2="100" />
            <line x1="93" y1="150" x2="102" y2="150" />
          </g>
        </g>
      );
    // Repere du corps : dossier colle au dos, rail de la presse derriere.
    case 'legpress':
      return (
        <g>
          <Pad x={88} y={80} w={15} h={106} fill={pad} seams={5} />
          <rect x="78" y="96" width="9" height="80" rx="4" fill={frame} opacity="0.8" />
          <rect x="82" y="186" width="26" height="8" rx="4" fill={frame} />
        </g>
      );
    // Repere du corps : le sujet est a plat ventre, le coussin est cote face.
    case 'legcurl':
      return (
        <g>
          <Pad x={130} y={82} w={15} h={106} fill={pad} seams={5} />
          <rect x="145" y="96" width="8" height="76" rx="4" fill={frame} opacity="0.8" />
          <rect x="118" y="188" width="10" height="26" rx="5" fill={frame} />
          <rect x="108" y="212" width="32" height="8" rx="4" fill={frame} />
        </g>
      );
    case 'cable-high':
      // Colonne a poulie haute : bati, charges, poulie et cable tendu.
      return (
        <g>
          <rect x="192" y="30" width="10" height={GROUND - 26} rx="5" fill={frame} />
          <rect x="178" y={GROUND + 1} width="38" height="7" rx="3.5" fill={frame} />
          <Stack x={182} y={110} w={26} n={7} color={color} />
          <Pulley cx={197} cy={42} color={color} />
          <line x1="197" y1="34" x2="150" y2="46" stroke={cable} strokeWidth="1.8" />
        </g>
      );
    case 'cable-mid':
      return (
        <g>
          <rect x="202" y="42" width="10" height={GROUND - 38} rx="5" fill={frame} />
          <rect x="188" y={GROUND + 1} width="38" height="7" rx="3.5" fill={frame} />
          <Stack x={192} y={122} w={26} n={6} color={color} />
          <Pulley cx={207} cy={88} color={color} />
          <line x1="207" y1="80" x2="176" y2="84" stroke={cable} strokeWidth="1.8" />
        </g>
      );
    case 'step':
      // Plateforme basse : les orteils dessus, le talon dans le vide derriere.
      return (
        <g>
          <rect x="108" y="206" width="84" height="9" rx="3" fill={pad} />
          <rect x="110" y="207" width="80" height="3.4" rx="1.7" fill="rgba(0,0,0,0.25)" />
          <rect x="112" y="215" width="76" height="7" rx="2" fill={frame} />
        </g>
      );
    default:
      return null;
  }
}
