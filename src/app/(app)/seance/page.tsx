// Seance : saisie serie par serie.
import SessionClient from '@/components/SessionClient';
import {
  getExercises,
  getLastPerformances,
  getMuscleGroups,
  getOpenWorkout,
  getProfile,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seance — Sport Evolution' };

export default async function SeancePage() {
  const [exercises, groups, workout, lastPerf, profile] = await Promise.all([
    getExercises(),
    getMuscleGroups(),
    getOpenWorkout(),
    getLastPerformances(),
    getProfile(),
  ]);

  return (
    <SessionClient
      workout={workout}
      exercises={exercises}
      groups={groups}
      lastPerf={lastPerf}
      restDefault={profile?.rest_seconds ?? 120}
      bodyweight={profile?.weight_kg ?? 75}
    />
  );
}
