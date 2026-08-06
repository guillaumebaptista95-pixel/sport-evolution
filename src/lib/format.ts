import type { TrackingType, WorkoutSet } from '@/lib/database.types';

/** Couleur par defaut quand un exercice n'a pas de groupe musculaire. */
export const MUSCLE_FALLBACK = '#6C5CE7';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function fmtWeight(kg: number | null | undefined) {
  if (kg === null || kg === undefined) return '—';
  const rounded = Math.round(kg * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
}

export function fmtNumber(n: number, digits = 0) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function fmtDuration(seconds: number | null | undefined) {
  if (!seconds && seconds !== 0) return '—';
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s.toString().padStart(2, '0')}`;
}

export function fmtClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
];

export function parseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** Date d'hier au format YYYY-MM-DD (valeur par defaut du rattrapage). */
export function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export function fmtDateLong(iso: string) {
  const d = parseDate(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtDateShort(iso: string) {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 4)}.`;
}

export function relativeDay(iso: string) {
  const target = parseDate(iso);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((base.getTime() - target.getTime()) / 86_400_000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} jours`;
  if (diff < 14) return 'la semaine derniere';
  if (diff < 60) return `il y a ${Math.round(diff / 7)} semaines`;
  return `il y a ${Math.round(diff / 30)} mois`;
}

/** Resume lisible d'une serie selon le mode de suivi de l'exercice. */
export function describeSet(set: WorkoutSet, type: TrackingType): string {
  switch (type) {
    case 'time':
      return fmtDuration(set.duration_seconds);
    case 'weighted_time':
      return set.weight_kg
        ? `${fmtDuration(set.duration_seconds)} · ${fmtWeight(set.weight_kg)}`
        : fmtDuration(set.duration_seconds);
    case 'bodyweight':
      return `${set.reps ?? '—'} reps${set.weight_kg ? ` +${fmtWeight(set.weight_kg)}` : ''}`;
    case 'assisted':
      if (set.assist_kg && set.assist_kg > 0)
        return `${set.reps ?? '—'} reps · aide ${fmtWeight(set.assist_kg)}`;
      return `${set.reps ?? '—'} reps${set.weight_kg ? ` +${fmtWeight(set.weight_kg)}` : ''}`;
    default:
      return `${fmtWeight(set.weight_kg)} × ${set.reps ?? '—'}`;
  }
}

/** Charge effective d'une serie, utilisee pour le volume et les records. */
export function effectiveLoad(set: WorkoutSet, type: TrackingType, bodyweight = 75): number {
  switch (type) {
    case 'bodyweight':
      return bodyweight + (set.weight_kg ?? 0);
    case 'assisted':
      return bodyweight + (set.weight_kg ?? 0) - (set.assist_kg ?? 0);
    case 'time':
    case 'weighted_time':
      return set.weight_kg ?? 0;
    default:
      return set.weight_kg ?? 0;
  }
}

/** Volume d'une serie (kg soulevés). Les maintiens comptent en kg·seconde/10. */
export function setVolume(set: WorkoutSet, type: TrackingType, bodyweight = 75): number {
  if (type === 'time' || type === 'weighted_time') {
    return ((set.weight_kg ?? 0) + (type === 'time' ? bodyweight * 0.35 : 0)) * ((set.duration_seconds ?? 0) / 10);
  }
  return effectiveLoad(set, type, bodyweight) * (set.reps ?? 0);
}

/** 1RM estime, formule d'Epley. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function trackingLabel(type: TrackingType): string {
  switch (type) {
    case 'time':
      return 'Duree';
    case 'weighted_time':
      return 'Duree lestee';
    case 'bodyweight':
      return 'Poids du corps';
    case 'assisted':
      return 'Assiste';
    default:
      return 'Charge';
  }
}

export function initials(name?: string | null, email?: string | null) {
  const src = name?.trim() || email?.split('@')[0] || '?';
  return src
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Bonne nuit';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon apres-midi';
  return 'Bonsoir';
}
