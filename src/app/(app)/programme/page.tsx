// Programme hebdomadaire : ce que l'on travaille chaque jour de la semaine.
import { getMuscleGroups, getPlan } from '@/lib/queries';
import PlanClient from '@/components/PlanClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Programme — Sport Evolution' };

export default async function ProgrammePage() {
  const [plan, groups] = await Promise.all([getPlan(), getMuscleGroups()]);
  return <PlanClient plan={plan} groups={groups} />;
}
