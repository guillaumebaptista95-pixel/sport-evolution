'use client';

// Silhouette humaine animee : le squelette et la cinematique inverse vivent
// dans lib/rig.ts, ce fichier ne s'occupe que du dessin du corps.
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
  solve,
  type ExerciseAnim,
  type HeldKind,
  type PropKind,
} from '@/lib/rig';

/** Une fonction qui donne le style d'une articulation (anime ou fige). */
export type JointStyle = (
  joint: 'root' | 'torso' | 'sh' | 'el' | 'hp' | 'kn' | 'held',
  delay?: number
) => React.CSSProperties;

/* ------------------------------------------------------------------ */
/*  Morphologie                                                        */
/* ------------------------------------------------------------------ */
const W = {
  shoulder: 7,
  elbow: 5.2,
  wrist: 3.9,
  hip: 9.6,
  knee: 7,
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

const TORSO_PATH =
  'M11 6 C12 -3 9 -8 9 -16 C9 -26 13 -30 14 -39 C14.6 -44.5 12 -47 8 -47.5 ' +
  'L-8 -47.5 C-12 -47 -14.6 -44.5 -14 -39 C-13 -30 -9 -26 -9 -16 ' +
  'C-9 -8 -12 -3 -11 6 C-6 9.5 6 9.5 11 6 Z';

function Arm({ s, fill, delay, hand }: { s: JointStyle; fill: string; delay: number; hand?: string }) {
  return (
    <g style={s('sh', delay)}>
      <Seg len={UPPER_ARM} w1={W.shoulder} w2={W.elbow} fill={fill} />
      <g transform={`translate(0,${UPPER_ARM})`}>
        <g style={s('el', delay)}>
          <Seg len={FOREARM} w1={W.elbow} w2={W.wrist} fill={fill} />
          <ellipse cx="0.5" cy={FOREARM + 2.5} rx="4.4" ry="5.4" fill={hand ?? fill} />
        </g>
      </g>
    </g>
  );
}

function Leg({ s, fill, delay }: { s: JointStyle; fill: string; delay: number }) {
  return (
    <g style={s('hp', delay)}>
      <Seg len={THIGH} w1={W.hip} w2={W.knee} fill={fill} />
      <g transform={`translate(0,${THIGH})`}>
        <g style={s('kn', delay)}>
          <Seg len={SHIN} w1={W.knee} w2={W.ankle} fill={fill} />
          <path
            d={`M-4.6 ${SHIN - 3} L10 ${SHIN - 2.5} C13.5 ${SHIN - 1.5} 13.5 ${SHIN + 3.5} 10 ${SHIN + 4} L-4.6 ${SHIN + 4} C-7 ${SHIN + 4} -7 ${SHIN - 3} -4.6 ${SHIN - 3} Z`}
            fill={fill}
          />
        </g>
      </g>
    </g>
  );
}

/**
 * Le corps complet. `s` fournit les transformations : l'ecran de l'app passe
 * des animations CSS, les tests de rendu passent des angles figes.
 */
export function Body({
  s,
  skin,
  far,
  accent,
  held,
  delay = 0,
  opacity = 1,
}: {
  s: JointStyle;
  skin: string;
  far: string;
  accent: string;
  held?: HeldKind;
  delay?: number;
  opacity?: number;
}) {
  return (
    <g style={s('root', delay)} opacity={opacity}>
      <g transform={`translate(${HIP[0]},${HIP[1]})`}>
        {/* jambe arriere */}
        <g transform="translate(-5,0)">
          <Leg s={s} fill={far} delay={delay} />
        </g>

        <g style={s('torso', delay)}>
          {/* bras arriere */}
          <g transform={`translate(-5,${-TORSO + 2})`}>
            <Arm s={s} fill={far} delay={delay} />
          </g>

          {/* buste */}
          <path d={TORSO_PATH} fill={skin} />
          {/* ceinture abdominale, donne du relief */}
          <path d="M-8.4 -14 C-4 -11 4 -11 8.4 -14 L8.6 -8 C4 -5 -4 -5 -8.6 -8 Z" fill={accent} opacity="0.18" />
          {/* cou */}
          <rect x="-4.6" y="-56" width="9.2" height="12" rx="4.4" fill={skin} />
          {/* tete */}
          <ellipse cx="1" cy="-63.5" rx="8.9" ry="10.6" fill={skin} />
          {/* nez : indique le sens du regard */}
          <path d="M9.4 -63.5 L12.6 -62 L9.2 -60.4 Z" fill={skin} />
          {/* oreille */}
          <circle cx="-1.6" cy="-62.5" r="2.1" fill={accent} opacity="0.5" />

          {/* bras avant */}
          <g transform={`translate(0.5,${-TORSO + 2})`}>
            <Arm s={s} fill={skin} delay={delay} hand={skin} />
          </g>
        </g>

        {/* jambe avant */}
        <Leg s={s} fill={skin} delay={delay} />
      </g>

      {held && held !== 'none' && (
        <g style={s('held', delay)}>
          <Held kind={held} color={accent} />
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
      `@keyframes ${uid}-pulse{0%,100%{opacity:.3}50%{opacity:.8}}`,
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

  const handPath = useMemo(
    () => 'M' + solved.map((p) => `${p.hand[0]},${p.hand[1] + p.bodyY}`).join(' L'),
    [solved]
  );

  const ghostList = Array.from({ length: Math.max(0, ghosts) }, (_, i) => i + 1);

  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label={anim.label ?? 'Mouvement'}>
      <defs>
        <linearGradient id={`${uid}-skin`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#F4F6FA" />
          <stop offset="52%" stopColor="#CBD2DF" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <radialGradient id={`${uid}-focus`}>
          <stop offset="0%" stopColor={color} stopOpacity="0.5" />
          <stop offset="70%" stopColor={color} stopOpacity="0.1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <style>{css}</style>

      {anim.focus && (
        <circle
          cx={anim.focus[0]}
          cy={anim.focus[1]}
          r="44"
          fill={`url(#${uid}-focus)`}
          style={{
            animation: `${uid}-pulse ${dur}s ease-in-out infinite`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      )}

      <Equipment kind={anim.prop ?? 'none'} color={color} />

      <line x1="26" y1={GROUND + 4} x2="214" y2={GROUND + 4} stroke={`url(#${uid}-floor)`} strokeWidth="2.5" />

      {trail && (
        <path d={handPath} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 6" opacity="0.45" />
      )}

      <g
        transform={`translate(${anim.offset?.[0] ?? 0},${anim.offset?.[1] ?? 0}) rotate(${anim.baseRot ?? 0} ${HIP[0]} ${HIP[1]})`}
      >
        {ghostList.map((i) => (
          <Body
            key={i}
            s={style}
            delay={-0.1 * i * (dur / 2.6)}
            opacity={0.16 / i}
            skin={color}
            far={color}
            accent={color}
            held={anim.held}
          />
        ))}
        <Body
          s={style}
          skin={`url(#${uid}-skin)`}
          far="#48505F"
          accent={color}
          held={anim.held}
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Materiel tenu en main                                              */
/* ------------------------------------------------------------------ */
function Held({ kind, color }: { kind: HeldKind; color: string }) {
  const steel = '#AEB7C7';
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
          <rect x="-4" y="-34" width="13" height="68" rx="5" fill={steel} />
          <rect x="9" y="-24" width="9" height="48" rx="4" fill={color} />
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
      // Barre arriere estompee, barre avant nette : le corps reste lisible entre les deux.
      return (
        <g>
          <line x1="48" y1="138" x2="110" y2="138" stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <line x1="130" y1="142" x2="200" y2="142" stroke={solid} strokeWidth="8" strokeLinecap="round" />
          <line x1="132" y1="142" x2="156" y2="142" stroke={color} strokeWidth="8" strokeLinecap="round" opacity="0.9" />
          <line x1="192" y1="142" x2="192" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
          <line x1="56" y1="138" x2="56" y2={GROUND + 4} stroke={frame} strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case 'seat':
      // Assise + dossier : la hanche du sujet repose sur le coussin.
      return (
        <g>
          <rect x="96" y="176" width="80" height="12" rx="6" fill={solid} />
          <rect x="90" y="112" width="13" height="70" rx="6" fill={solid} />
          <line x1="136" y1="188" x2="136" y2={GROUND + 4} stroke={frame} strokeWidth="8" strokeLinecap="round" />
          <line x1="112" y1={GROUND + 4} x2="164" y2={GROUND + 4} stroke={frame} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case 'bench-incline':
      return (
        <g transform="rotate(-32 132 152)">
          <rect x="74" y="152" width="118" height="12" rx="6" fill={solid} />
        </g>
      );
    case 'bench-decline':
      return (
        <g transform="rotate(22 132 152)">
          <rect x="74" y="152" width="118" height="12" rx="6" fill={solid} />
        </g>
      );
    case 'wall':
      return (
        <g>
          <rect x="84" y="48" width="12" height={GROUND - 44} rx="4" fill={solid} />
        </g>
      );
    case 'legpress':
      return (
        <g>
          <rect x="148" y="66" width="13" height="92" rx="6" fill={frame} transform="rotate(52 155 112)" />
          <rect x="114" y="54" width="82" height="13" rx="6.5" fill={solid} transform="rotate(52 155 60)" />
        </g>
      );
    case 'legcurl':
      return (
        <g>
          <rect x="62" y="150" width="124" height="12" rx="6" fill={solid} />
          <circle cx="186" cy="130" r="10" fill={color} opacity="0.8" />
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
      return <rect x="78" y="202" width="84" height="11" rx="5.5" fill={solid} />;
    default:
      return null;
  }
}
