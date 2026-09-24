// Programme hebdomadaire : les groupes travailles et le nombre d'exercices
// attendu pour chacun, jour par jour. Puis les seances types enregistrees.
import { getMuscleGroups, getPlan, getTemplates } from '@/lib/queries';
import PlanClient from '@/components/PlanClient';
import TemplateManager from '@/components/TemplateManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Programme — Sport Evolution' };

export default async function ProgrammePage() {
  const [plan, groups, templates] = await Promise.all([
    getPlan(),
    getMuscleGroups(),
    getTemplates(),
  ]);

  return (
    <>
      <PlanClient plan={plan} groups={groups} />
      <TemplateManager templates={templates} />
    </>
  );
}
