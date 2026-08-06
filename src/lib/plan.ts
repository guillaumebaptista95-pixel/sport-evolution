// Helpers du programme hebdomadaire, utilisables cote client comme serveur.
// Volontairement sans dependance a Supabase pour rester importable partout.

export const WEEKDAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

/** 1 = lundi ... 7 = dimanche. */
export function todayWeekday(): number {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

/** Jour de la semaine (1 = lundi) d'une date au format YYYY-MM-DD. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const day = new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
  return day === 0 ? 7 : day;
}
