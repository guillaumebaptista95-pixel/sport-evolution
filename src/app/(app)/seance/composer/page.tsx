// Composition de la seance : on coche les exercices par groupe.
// Avec ?date=YYYY-MM-DD on rattrape une seance oubliee : le programme affiche
// est celui du jour de la semaine correspondant, et la seance est datee ainsi.
import { redirect } from 'next/navigation';
import {
  getExercises,
  getLastPerformances,
  getMuscleGroups,
  getOpenWorkout,
  getPlan,
} from '@/lib/queries';
import { WEEKDAYS, todayWeekday, weekdayOf } from '@/lib/plan';
import { todayISO } from '@/lib/format';
import SessionBuilder from '@/components/SessionBuilder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Composer ma seance — Sport Evolution' };

export default async function ComposerPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const [plan, groups, exercises, lastPerf, open] = await Promise.all([
    getPlan(),
    getMuscleGroups(),
    getExercises(),
    getLastPerformances(),
    getOpenWorkout(),
  ]);

  const today = todayISO();
  const raw = searchParams.date;
  const valid = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : null;
  const date = valid ?? today;
  const isPast = date !== today;

  const weekday = isPast ? weekdayOf(date) : todayWeekday();
  const day = plan.find((d) => d.weekday === weekday);
  const rest = !day || day.is_rest || day.groups.length === 0;

  // Aujourd'hui, un jour de repos n'a rien a composer : retour a l'accueil.
  if (rest && !isPast) redirect('/');

  // Sur une date passee tombant un jour de repos, on ouvre tous les groupes
  // pour pouvoir saisir librement ce qui a ete fait.
  const free = rest;

  return (
    <SessionBuilder
      label={free ? 'Seance libre' : day!.label || WEEKDAYS[weekday - 1]}
      groups={free ? groups.map((g) => g.slug) : day!.groups}
      targets={free ? {} : (day!.targets ?? {})}
      showTargets={!free}
      exercises={exercises}
      muscleGroups={groups}
      lastPerf={lastPerf}
      preselected={open?.performed_on === date ? (open?.planned_exercise_ids ?? []) : []}
      date={date}
      isPast={isPast}
    />
  );
}
