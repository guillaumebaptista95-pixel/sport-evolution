// Composition de la seance du jour : on coche les exercices par groupe.
import { redirect } from 'next/navigation';
import {
  getExercises,
  getLastPerformances,
  getMuscleGroups,
  getOpenWorkout,
  getPlan,
} from '@/lib/queries';
import { WEEKDAYS, todayWeekday } from '@/lib/plan';
import SessionBuilder from '@/components/SessionBuilder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Composer ma seance — Sport Evolution' };

export default async function ComposerPage() {
  const [plan, groups, exercises, lastPerf, open] = await Promise.all([
    getPlan(),
    getMuscleGroups(),
    getExercises(),
    getLastPerformances(),
    getOpenWorkout(),
  ]);

  const weekday = todayWeekday();
  const today = plan.find((d) => d.weekday === weekday);

  // Jour de repos : rien a composer, on renvoie a l'accueil.
  if (!today || today.is_rest || today.groups.length === 0) redirect('/');

  return (
    <SessionBuilder
      label={today.label || WEEKDAYS[weekday - 1]}
      groups={today.groups}
      targets={today.targets ?? {}}
      exercises={exercises}
      muscleGroups={groups}
      lastPerf={lastPerf}
      preselected={open?.planned_exercise_ids ?? []}
    />
  );
}
