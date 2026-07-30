'use client';

// Silhouette animee d'un exercice, compilee en keyframes CSS.
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
  type PropKind,
  type HeldKind,
} from '@/lib/rig';

interface Props {
  animationKey?: string | null;
  color?: string;
  className?: string;
  /** Desactive la boucle (utile pour les listes tres longues) */
  paused?: boolean;
  /** Affiche la trajectoire de la main */
  trail?: boolean;
  /** Nombre de silhouettes fantomes derriere le sujet */
  ghosts?: number;
}

export default function ExerciseAnimation({
  animationKey,
  color = '#6C5CE7',
  className,
  paused = false,
  trail = true,
  ghosts = 2,
}: Props) {
  const raw = useId();
  const uid = useMemo(() => 'a' + raw.replace(/[^a-zA-Z0-9]/g, ''), [raw]);
  const anim: ExerciseAnim = useMemo(() => getAnimation(animationKey), [animationKey]);

  const solved = useMemo(() => anim.poses.map(solve), [anim]);

  const css = useMemo(() => {
    const frames = (name: string, get: (p: (typeof solved)[number]) => string) =>
      `@keyframes ${uid}-${name}{` +
      solved.map((p) => `${p.t}%{transform:${get(p)}}`).join('') +
      '}';

    return [
      frames('root', (p) => `translate(0px, ${p.bodyY.toFixed(2)}px)`),
      frames('torso', (p) => `rotate(${p.torso.toFixed(2)}deg)`),
      frames('sh', (p) => `rotate(${p.shoulder.toFixed(2)}deg)`),
      frames('el', (p) => `rotate(${p.elbow.toFixed(2)}deg)`),
      frames('hp', (p) => `rotate(${p.hipA.toFixed(2)}deg)`),
      frames('kn', (p) => `rotate(${p.knee.toFixed(2)}deg)`),
      frames(
        'held',
        (p) =>
          `translate(${(anim.heldOnFoot ? p.foot[0] : p.hand[0]).toFixed(2)}px, ${(anim.heldOnFoot
            ? p.foot[1]
            : p.hand[1]
          ).toFixed(2)}px)`
      ),
    ].join('');
  }, [solved, uid, anim.heldOnFoot]);

  const ease = anim.ease ?? 'cubic-bezier(0.45, 0.05, 0.35, 1)';
  const dur = anim.duration;

  const a = (name: string, delay = 0): React.CSSProperties => ({
    animation: `${uid}-${name} ${dur}s ${ease} infinite`,
    animationDelay: `${delay}s`,
    animationPlayState: paused ? 'paused' : 'running',
    transformOrigin: '0px 0px',
    transformBox: 'view-box' as React.CSSProperties['transformBox'],
  });

  const handPath = useMemo(() => {
    const pts = solved.map((p) => `${p.hand[0]},${p.hand[1] + p.bodyY}`);
    return 'M' + pts.join(' L');
  }, [solved]);

  const Figure = ({ delay = 0, dim = 1 }: { delay?: number; dim?: number }) => (
    <g style={a('root', delay)} opacity={dim}>
      <g transform={`translate(${HIP[0]},${HIP[1]})`}>
        {/* jambe arriere */}
        <g transform="translate(-7,0)" opacity={0.4}>
          <g style={a('hp', delay)}>
            <line x1="0" y1="0" x2="0" y2={THIGH} stroke={`url(#${uid}-limb)`} strokeWidth="9" strokeLinecap="round" />
            <g transform={`translate(0,${THIGH})`}>
              <g style={a('kn', delay)}>
                <line x1="0" y1="0" x2="0" y2={SHIN} stroke={`url(#${uid}-limb)`} strokeWidth="8" strokeLinecap="round" />
                <line x1="0" y1={SHIN} x2="11" y2={SHIN} stroke={`url(#${uid}-limb)`} strokeWidth="7" strokeLinecap="round" />
              </g>
            </g>
          </g>
        </g>

        {/* buste + tete + bras */}
        <g style={a('torso', delay)}>
          <line x1="0" y1="2" x2="0" y2={-TORSO} stroke={`url(#${uid}-limb)`} strokeWidth="14" strokeLinecap="round" />
          <line x1="0" y1={-TORSO} x2="0" y2={-TORSO - 8} stroke={`url(#${uid}-limb)`} strokeWidth="7" strokeLinecap="round" />
          <circle cx="1" cy={-TORSO - 19} r="11" fill={`url(#${uid}-limb)`} />

          {/* bras arriere */}
          <g transform={`translate(-6,${-TORSO})`} opacity={0.4}>
            <g style={a('sh', delay)}>
              <line x1="0" y1="0" x2="0" y2={UPPER_ARM} stroke={`url(#${uid}-limb)`} strokeWidth="8" strokeLinecap="round" />
              <g transform={`translate(0,${UPPER_ARM})`}>
                <g style={a('el', delay)}>
                  <line x1="0" y1="0" x2="0" y2={FOREARM} stroke={`url(#${uid}-limb)`} strokeWidth="7" strokeLinecap="round" />
                </g>
              </g>
            </g>
          </g>

          {/* bras avant */}
          <g transform={`translate(0,${-TORSO})`}>
            <g style={a('sh', delay)}>
              <line x1="0" y1="0" x2="0" y2={UPPER_ARM} stroke={`url(#${uid}-limb)`} strokeWidth="9" strokeLinecap="round" />
              <g transform={`translate(0,${UPPER_ARM})`}>
                <g style={a('el', delay)}>
                  <line x1="0" y1="0" x2="0" y2={FOREARM} stroke={`url(#${uid}-limb)`} strokeWidth="8" strokeLinecap="round" />
                  <circle cx="0" cy={FOREARM} r="4.5" fill={color} />
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* jambe avant */}
        <g style={a('hp', delay)}>
          <line x1="0" y1="0" x2="0" y2={THIGH} stroke={`url(#${uid}-limb)`} strokeWidth="10" strokeLinecap="round" />
          <g transform={`translate(0,${THIGH})`}>
            <g style={a('kn', delay)}>
              <line x1="0" y1="0" x2="0" y2={SHIN} stroke={`url(#${uid}-limb)`} strokeWidth="9" strokeLinecap="round" />
              <line x1="0" y1={SHIN} x2="12" y2={SHIN} stroke={`url(#${uid}-limb)`} strokeWidth="7" strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>

      {/* materiel tenu */}
      {anim.held && anim.held !== 'none' && (
        <g style={a('held', delay)}>
          <Held kind={anim.held} color={color} />
        </g>
      )}
    </g>
  );

  const ghostList = Array.from({ length: Math.max(0, ghosts) }, (_, i) => i + 1);

  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role="img"
      aria-label={anim.label ?? 'Animation du mouvement'}
    >
      <defs>
        <linearGradient id={`${uid}-limb`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#EEF1F7" />
          <stop offset="55%" stopColor="#C3CAD8" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <radialGradient id={`${uid}-focus`}>
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="70%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <style>{css}</style>

      {/* halo du groupe musculaire cible */}
      {anim.focus && (
        <circle
          cx={anim.focus[0]}
          cy={anim.focus[1]}
          r="46"
          fill={`url(#${uid}-focus)`}
          style={{
            animation: `${uid}-pulse ${dur}s ease-in-out infinite`,
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      )}
      <style>{`@keyframes ${uid}-pulse{0%,100%{opacity:.35}50%{opacity:.9}}`}</style>

      {/* materiel fixe */}
      <Equipment kind={anim.prop ?? 'none'} color={color} />

      {/* sol */}
      <line x1="30" y1={GROUND + 2} x2="210" y2={GROUND + 2} stroke={`url(#${uid}-floor)`} strokeWidth="2.5" />

      {/* trajectoire de la main */}
      {trail && (
        <path
          d={handPath}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeDasharray="3 6"
          opacity="0.5"
        />
      )}

      <g transform={`translate(${anim.offset?.[0] ?? 0},${anim.offset?.[1] ?? 0}) rotate(${anim.baseRot ?? 0} ${HIP[0]} ${HIP[1]})`}>
        {ghostList.map((i) => (
          <Figure key={i} delay={-0.09 * i * (dur / 2.6)} dim={0.22 / i} />
        ))}
        <Figure />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Materiel tenu en main                                              */
/* ------------------------------------------------------------------ */
function Held({ kind, color }: { kind: HeldKind; color: string }) {
  const steel = '#9AA4B8';
  switch (kind) {
    case 'dumbbell':
      return (
        <g>
          <rect x="-13" y="-2.5" width="26" height="5" rx="2.5" fill={steel} />
          <rect x="-19" y="-8" width="7" height="16" rx="3" fill={color} />
          <rect x="12" y="-8" width="7" height="16" rx="3" fill={color} />
        </g>
      );
    case 'barbell':
      return (
        <g>
          <rect x="-42" y="-2.5" width="84" height="5" rx="2.5" fill={steel} />
          <rect x="-40" y="-13" width="8" height="26" rx="3.5" fill={color} />
          <rect x="32" y="-13" width="8" height="26" rx="3.5" fill={color} />
        </g>
      );
    case 'plate-back':
      return (
        <g>
          <rect x="-40" y="-2.5" width="80" height="5" rx="2.5" fill={steel} />
          <rect x="-38" y="-15" width="9" height="30" rx="4" fill={color} />
          <rect x="29" y="-15" width="9" height="30" rx="4" fill={color} />
        </g>
      );
    case 'handle':
      return (
        <g>
          <rect x="-3" y="-13" width="6" height="26" rx="3" fill={steel} />
          <circle cx="0" cy="0" r="4" fill={color} />
        </g>
      );
    case 'rope':
      return (
        <g>
          <path d="M-2 -2 L-7 14" stroke={steel} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M2 -2 L7 14" stroke={steel} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <circle cx="-7" cy="15" r="3" fill={color} />
          <circle cx="7" cy="15" r="3" fill={color} />
        </g>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Materiel fixe (machines, bancs, barres)                            */
/* ------------------------------------------------------------------ */
function Equipment({ kind, color }: { kind: PropKind; color: string }) {
  const frame = 'rgba(255,255,255,0.16)';
  const solid = 'rgba(255,255,255,0.30)';

  switch (kind) {
    case 'bar-high':
      return (
        <g>
          <line x1="48" y1="40" x2="48" y2={GROUND} stroke={frame} strokeWidth="6" strokeLinecap="round" />
          <line x1="192" y1="40" x2="192" y2={GROUND} stroke={frame} strokeWidth="6" strokeLinecap="round" />
          <line x1="44" y1="54" x2="196" y2="54" stroke={solid} strokeWidth="7" strokeLinecap="round" />
          <line x1="100" y1="54" x2="144" y2="54" stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0.85" />
        </g>
      );
    case 'dip-bars':
      return (
        <g>
          <line x1="96" y1="142" x2="196" y2="142" stroke={solid} strokeWidth="7" strokeLinecap="round" />
          <line x1="120" y1="142" x2="152" y2="142" stroke={color} strokeWidth="7" strokeLinecap="round" opacity="0.85" />
          <line x1="104" y1="142" x2="104" y2={GROUND} stroke={frame} strokeWidth="6" strokeLinecap="round" />
          <line x1="188" y1="142" x2="188" y2={GROUND} stroke={frame} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case 'seat':
      return (
        <g>
          <rect x="120" y="190" width="80" height="10" rx="5" fill={solid} />
          <rect x="188" y="126" width="11" height="66" rx="5.5" fill={frame} />
          <line x1="160" y1="200" x2="160" y2={GROUND} stroke={frame} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
    case 'bench-incline':
      return (
        <g transform="rotate(-32 132 152)">
          <rect x="78" y="152" width="112" height="11" rx="5.5" fill={solid} />
        </g>
      );
    case 'bench-decline':
      return (
        <g transform="rotate(22 132 152)">
          <rect x="78" y="152" width="112" height="11" rx="5.5" fill={solid} />
        </g>
      );
    case 'wall':
      return (
        <g>
          <rect x="88" y="52" width="10" height={GROUND - 52} rx="4" fill={solid} />
          <line x1="98" y1="70" x2="98" y2={GROUND} stroke={color} strokeWidth="2" opacity="0.4" strokeDasharray="4 6" />
        </g>
      );
    case 'legpress':
      return (
        <g>
          <rect x="150" y="70" width="12" height="86" rx="5" fill={frame} transform="rotate(52 156 113)" />
          <rect x="118" y="58" width="76" height="12" rx="6" fill={solid} transform="rotate(52 156 64)" />
        </g>
      );
    case 'legcurl':
      return (
        <g>
          <rect x="66" y="150" width="118" height="11" rx="5.5" fill={solid} />
          <circle cx="184" cy="132" r="9" fill={color} opacity="0.75" />
        </g>
      );
    case 'cable-high':
      return (
        <g>
          <line x1="196" y1="34" x2="196" y2={GROUND} stroke={frame} strokeWidth="6" strokeLinecap="round" />
          <circle cx="196" cy="40" r="7" fill="none" stroke={solid} strokeWidth="4" />
          <line x1="196" y1="40" x2="150" y2="52" stroke={solid} strokeWidth="2" />
        </g>
      );
    case 'cable-mid':
      return (
        <g>
          <line x1="208" y1="46" x2="208" y2={GROUND} stroke={frame} strokeWidth="6" strokeLinecap="round" />
          <circle cx="208" cy="88" r="7" fill="none" stroke={solid} strokeWidth="4" />
          <line x1="208" y1="88" x2="176" y2="90" stroke={solid} strokeWidth="2" />
        </g>
      );
    case 'step':
      return <rect x="82" y="200" width="76" height="10" rx="5" fill={solid} />;
    default:
      return null;
  }
}
