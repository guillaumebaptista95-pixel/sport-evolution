// Liste de la bibliotheque d'exercices.
import { getExercises, getMuscleGroups } from '@/lib/queries';
import ExerciseLibrary from '@/components/ExerciseLibrary';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Exercices — Sport Evolution' };

export default async function ExercicesPage() {
  const [exercises, groups] = await Promise.all([getExercises(), getMuscleGroups()]);
  return <ExerciseLibrary exercises={exercises} groups={groups} />;
}
