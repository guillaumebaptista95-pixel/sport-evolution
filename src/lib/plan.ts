// Helpers du programme hebdomadaire, utilisables cote client comme serveur.

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
