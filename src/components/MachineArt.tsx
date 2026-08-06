// Illustrations vectorielles du materiel, utilisees tant qu'aucune photo n'est
// disponible. Dessinees a la main : aucune image
// externe, aucun probleme de droits, et le style reste coherent avec l'app.
// La couleur d'accent marque toujours l'endroit ou l'on pose les mains ou le corps.

export type MachineKey =
  | 'cage-traction'
  | 'tirage-vertical'
  | 'rowing-assis'
  | 'poulie-haute'
  | 'chest-press'
  | 'banc-incline'
  | 'banc-decline'
  | 'station-dips'
  | 'halteres'
  | 'barre-rack'
  | 'rack-squat'
  | 'presse-cuisses'
  | 'leg-curl'
  | 'mollets'
  | 'mur'
  | 'aucun';

export const MACHINE_LABEL: Record<MachineKey, string> = {
  'cage-traction': 'Barre de traction',
  'tirage-vertical': 'Machine de tirage vertical',
  'rowing-assis': 'Machine de rowing assis',
  'poulie-haute': 'Poulie haute',
  'chest-press': 'Machine chest press',
  'banc-incline': 'Banc incline + halteres',
  'banc-decline': 'Banc decline + halteres',
  'station-dips': 'Station a dips',
  halteres: 'Halteres',
  'barre-rack': 'Barre + rack',
  'rack-squat': 'Rack a squat',
  'presse-cuisses': 'Presse a cuisses',
  'leg-curl': 'Machine leg curl',
  mollets: 'Machine a mollets',
  mur: 'Un simple mur',
  aucun: 'Poids du corps',
};

const F = 'rgba(255,255,255,0.20)'; // structure
const S = 'rgba(255,255,255,0.38)'; // pieces principales
const P = 'rgba(255,255,255,0.13)'; // arriere-plan

export default function MachineArt({
  kind,
  color = '#6C5CE7',
  className,
}: {
  kind: MachineKey;
  color?: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 160 140" className={className} role="img" aria-label={MACHINE_LABEL[kind]}>
      <Shape kind={kind} color={color} />
      <line x1="14" y1="130" x2="146" y2="130" stroke={P} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Shape({ kind, color }: { kind: MachineKey; color: string }) {
  switch (kind) {
    case 'cage-traction':
      return (
        <g>
          <rect x="28" y="18" width="10" height="112" rx="5" fill={F} />
          <rect x="122" y="18" width="10" height="112" rx="5" fill={F} />
          <rect x="24" y="18" width="112" height="10" rx="5" fill={S} />
          <rect x="60" y="18" width="40" height="10" rx="5" fill={color} />
          <rect x="24" y="120" width="112" height="8" rx="4" fill={F} />
        </g>
      );

    case 'tirage-vertical':
      return (
        <g>
          <rect x="112" y="16" width="11" height="114" rx="5" fill={F} />
          <circle cx="117" cy="26" r="9" fill="none" stroke={S} strokeWidth="4" />
          <line x1="117" y1="26" x2="72" y2="40" stroke={S} strokeWidth="2.5" />
          <rect x="46" y="36" width="52" height="8" rx="4" fill={color} />
          <rect x="40" y="92" width="70" height="11" rx="5.5" fill={S} />
          <rect x="34" y="60" width="12" height="36" rx="6" fill={S} />
          <rect x="52" y="112" width="46" height="9" rx="4.5" fill={F} />
          <rect x="126" y="52" width="22" height="58" rx="4" fill={P} />
          <rect x="126" y="52" width="22" height="12" rx="4" fill={color} opacity="0.55" />
        </g>
      );

    case 'rowing-assis':
      return (
        <g>
          <rect x="36" y="92" width="76" height="11" rx="5.5" fill={S} />
          <rect x="104" y="52" width="12" height="44" rx="6" fill={S} />
          <rect x="26" y="60" width="10" height="42" rx="5" fill={F} />
          <circle cx="31" cy="66" r="7" fill={color} />
          <line x1="38" y1="66" x2="96" y2="72" stroke={S} strokeWidth="3" strokeLinecap="round" />
          <rect x="92" y="64" width="8" height="18" rx="4" fill={color} />
          <rect x="60" y="112" width="50" height="9" rx="4.5" fill={F} />
          <rect x="120" y="56" width="22" height="54" rx="4" fill={P} />
        </g>
      );

    case 'poulie-haute':
      return (
        <g>
          <rect x="116" y="12" width="12" height="118" rx="6" fill={F} />
          <circle cx="122" cy="24" r="9" fill="none" stroke={S} strokeWidth="4" />
          <line x1="122" y1="24" x2="86" y2="48" stroke={S} strokeWidth="2.5" />
          <path d="M86 48 L78 76 M86 48 L94 76" stroke={S} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <circle cx="77" cy="79" r="5" fill={color} />
          <circle cx="95" cy="79" r="5" fill={color} />
          <rect x="132" y="46" width="20" height="66" rx="4" fill={P} />
          <rect x="132" y="46" width="20" height="11" rx="4" fill={color} opacity="0.55" />
        </g>
      );

    case 'chest-press':
      return (
        <g>
          <rect x="44" y="96" width="74" height="11" rx="5.5" fill={S} />
          <rect x="102" y="50" width="13" height="50" rx="6" fill={S} />
          <rect x="30" y="30" width="10" height="80" rx="5" fill={F} />
          <rect x="38" y="52" width="34" height="9" rx="4.5" fill={color} />
          <circle cx="72" cy="56" r="6" fill={color} />
          <rect x="126" y="44" width="22" height="66" rx="4" fill={P} />
          <rect x="126" y="44" width="22" height="13" rx="4" fill={color} opacity="0.55" />
          <rect x="64" y="118" width="48" height="9" rx="4.5" fill={F} />
        </g>
      );

    case 'banc-incline':
      return (
        <g>
          <g transform="rotate(-28 80 76)">
            <rect x="34" y="70" width="94" height="13" rx="6.5" fill={color} opacity="0.75" />
          </g>
          <line x1="52" y1="98" x2="44" y2="128" stroke={F} strokeWidth="7" strokeLinecap="round" />
          <line x1="112" y1="62" x2="120" y2="128" stroke={F} strokeWidth="7" strokeLinecap="round" />
          <g>
            <rect x="18" y="104" width="30" height="6" rx="3" fill={S} />
            <rect x="14" y="98" width="8" height="18" rx="3.5" fill={color} />
            <rect x="44" y="98" width="8" height="18" rx="3.5" fill={color} />
          </g>
        </g>
      );

    case 'banc-decline':
      return (
        <g>
          <g transform="rotate(20 80 78)">
            <rect x="34" y="72" width="94" height="13" rx="6.5" fill={color} opacity="0.75" />
          </g>
          <line x1="50" y1="70" x2="44" y2="128" stroke={F} strokeWidth="7" strokeLinecap="round" />
          <line x1="114" y1="92" x2="120" y2="128" stroke={F} strokeWidth="7" strokeLinecap="round" />
          <rect x="18" y="104" width="30" height="6" rx="3" fill={S} />
          <rect x="14" y="98" width="8" height="18" rx="3.5" fill={color} />
          <rect x="44" y="98" width="8" height="18" rx="3.5" fill={color} />
        </g>
      );

    case 'station-dips':
      return (
        <g>
          <rect x="34" y="56" width="92" height="10" rx="5" fill={S} />
          <rect x="34" y="44" width="92" height="8" rx="4" fill={P} />
          <rect x="52" y="56" width="34" height="10" rx="5" fill={color} />
          <rect x="38" y="60" width="10" height="70" rx="5" fill={F} />
          <rect x="112" y="60" width="10" height="70" rx="5" fill={F} />
          <rect x="34" y="120" width="92" height="8" rx="4" fill={F} />
        </g>
      );

    case 'halteres':
      return (
        <g>
          <g transform="translate(0,-14)">
            <rect x="46" y="70" width="46" height="8" rx="4" fill={S} />
            <rect x="34" y="60" width="14" height="28" rx="6" fill={color} />
            <rect x="90" y="60" width="14" height="28" rx="6" fill={color} />
          </g>
          <g transform="translate(24,26) scale(0.78)">
            <rect x="46" y="70" width="46" height="8" rx="4" fill={S} />
            <rect x="34" y="60" width="14" height="28" rx="6" fill={color} opacity="0.7" />
            <rect x="90" y="60" width="14" height="28" rx="6" fill={color} opacity="0.7" />
          </g>
        </g>
      );

    case 'barre-rack':
      return (
        <g>
          <rect x="30" y="46" width="9" height="84" rx="4.5" fill={F} />
          <rect x="121" y="46" width="9" height="84" rx="4.5" fill={F} />
          <path d="M30 52 l-8 -10 M130 52 l8 -10" stroke={F} strokeWidth="6" strokeLinecap="round" />
          <rect x="20" y="60" width="120" height="8" rx="4" fill={S} />
          <rect x="24" y="50" width="12" height="28" rx="5" fill={color} />
          <rect x="124" y="50" width="12" height="28" rx="5" fill={color} />
          <rect x="60" y="60" width="40" height="8" rx="4" fill={color} opacity="0.55" />
        </g>
      );

    case 'rack-squat':
      return (
        <g>
          <rect x="26" y="24" width="10" height="106" rx="5" fill={F} />
          <rect x="124" y="24" width="10" height="106" rx="5" fill={F} />
          <rect x="18" y="58" width="124" height="8" rx="4" fill={S} />
          <rect x="12" y="46" width="13" height="32" rx="6" fill={color} />
          <rect x="135" y="46" width="13" height="32" rx="6" fill={color} />
          <rect x="60" y="58" width="40" height="8" rx="4" fill={color} opacity="0.55" />
          <rect x="26" y="86" width="10" height="8" rx="4" fill={S} />
          <rect x="124" y="86" width="10" height="8" rx="4" fill={S} />
        </g>
      );

    case 'presse-cuisses':
      return (
        <g>
          <g transform="rotate(-38 84 74)">
            <rect x="42" y="68" width="86" height="12" rx="6" fill={F} />
            <rect x="104" y="46" width="14" height="56" rx="6" fill={color} opacity="0.8" />
          </g>
          <rect x="26" y="94" width="62" height="12" rx="6" fill={S} />
          <rect x="22" y="66" width="12" height="34" rx="6" fill={S} />
          <line x1="56" y1="106" x2="56" y2="128" stroke={F} strokeWidth="7" strokeLinecap="round" />
        </g>
      );

    case 'leg-curl':
      return (
        <g>
          <rect x="28" y="76" width="98" height="13" rx="6.5" fill={S} />
          <line x1="46" y1="89" x2="42" y2="128" stroke={F} strokeWidth="7" strokeLinecap="round" />
          <line x1="110" y1="89" x2="116" y2="128" stroke={F} strokeWidth="7" strokeLinecap="round" />
          <rect x="112" y="98" width="30" height="12" rx="6" fill={S} />
          <circle cx="114" cy="104" r="8" fill={color} />
          <circle cx="140" cy="104" r="8" fill={color} />
          <rect x="24" y="60" width="26" height="10" rx="5" fill={P} />
        </g>
      );

    case 'mollets':
      return (
        <g>
          <rect x="34" y="104" width="92" height="14" rx="7" fill={S} />
          <rect x="52" y="104" width="56" height="14" rx="7" fill={color} opacity="0.7" />
          <rect x="38" y="40" width="11" height="66" rx="5.5" fill={F} />
          <rect x="111" y="40" width="11" height="66" rx="5.5" fill={F} />
          <rect x="34" y="34" width="92" height="12" rx="6" fill={color} opacity="0.55" />
        </g>
      );

    case 'mur':
      return (
        <g>
          <rect x="30" y="16" width="16" height="114" rx="5" fill={S} />
          <g opacity="0.5">
            <line x1="52" y1="40" x2="128" y2="40" stroke={P} strokeWidth="3" />
            <line x1="52" y1="70" x2="128" y2="70" stroke={P} strokeWidth="3" />
            <line x1="52" y1="100" x2="128" y2="100" stroke={P} strokeWidth="3" />
          </g>
          <rect x="46" y="58" width="10" height="24" rx="5" fill={color} opacity="0.7" />
        </g>
      );

    default:
      return (
        <g>
          <circle cx="80" cy="70" r="30" fill="none" stroke={F} strokeWidth="6" strokeDasharray="6 8" />
          <path d="M66 70 h28 M80 56 v28" stroke={color} strokeWidth="6" strokeLinecap="round" />
        </g>
      );
  }
}
