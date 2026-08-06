// Programme hebdomadaire : les groupes travailles et le nombre d'exercices
// attendu pour chacun, jour par jour.
import { getMuscleGroups, getPlan } from '@/lib/queries';
import PlanClient from '@/components/PlanClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Programme — Sport Evolution' };

export default async function ProgrammePage() {
  const [plan, groups] = await Promise.all([getPlan(), getMuscleGroups()]);
  return <PlanClient plan={plan} groups={groups} />;
}
