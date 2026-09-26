// Composition de la seance : on coche les exercices par groupe.
//
// ?date=YYYY-MM-DD : rattraper une seance oubliee (le programme affiche est
//                    celui du jour de la semaine correspondant).
// ?jour=1..7       : faire aujourd'hui le programme d'un autre jour, quand le
//                    cycle a ete decale. Ne modifie pas le planning.
// ?libre=1         : seance libre, tous les groupes disponibles.
// ?preset=<id>     : ouvre directement sur une seance type enregistree.
// ?mode=preset     : fabrique d'une seance type, rien ne demarre.
import { redirect } from 'next/navigation';
import {
  getExercises,
  getLastPerformances,
  getMuscleGroups,
  getOpenWorkout,
  getPlan,
  getTemplates,
} from '@/lib/queries';
import { WEEKDAYS, todayWeekday, weekdayOf } from '@/lib/plan';
import { todayISO } from '@/lib/format';
import SessionBuilder from '@/components/SessionBuilder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Composer ma seance — Sport Evolution' };

export default async function ComposerPage({
  searchParams,
}: {
  searchParams: { date?: string; jour?: string; libre?: string; preset?: string; mode?: string };
}) {
  const [plan, groups, exercises, lastPerf, open, templates] = await Promise.all([
    getPlan(),
    getMuscleGroups(),
    getExercises(),
    getLastPerformances(),
    getOpenWorkout(),
    getTemplates(),
  ]);

  const preset = searchParams.preset
    ? templates.find((t) => t.id === searchParams.preset)
    : undefined;
  // Fabrique : on compose une seance type sans toucher aux seances reelles.
  const presetMode = searchParams.mode === 'preset';

  const today = todayISO();
  const rawDate = searchParams.date;
  const date =
    rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate) && rawDate <= today ? rawDate : today;
  const isPast = date !== today;

  // Jour de la semaine reel de la date, puis eventuelle bascule manuelle.
  const natural = isPast ? weekdayOf(date) : todayWeekday();
  const asked = Number(searchParams.jour);
  const picked = asked >= 1 && asked <= 7 ? asked : natural;

  const day = plan.find((d) => d.weekday === picked);
  const rest = !day || day.is_rest || day.groups.length === 0;
  // Une seance type ouvre tous les groupes : elle ne suit pas le planning.
  const free = presetMode || searchParams.libre === '1' || Boolean(preset) || rest;

  // Aujourd'hui, un jour de repos non force n'a rien a composer : retour accueil.
  if (rest && !isPast && !searchParams.jour && !searchParams.libre && !preset && !presetMode)
    redirect('/');

  // Les autres jours du planning proposes en bascule.
  const options = plan
    .filter((d) => !d.is_rest && d.groups.length > 0)
    .map((d) => ({
      weekday: d.weekday,
      label: d.label || WEEKDAYS[d.weekday - 1],
      short: WEEKDAYS[d.weekday - 1].slice(0, 3),
    }))
    .sort((a, b) => a.weekday - b.weekday);

  return (
    <SessionBuilder
      key={`${date}-${picked}-${free}-${preset?.id ?? ''}-${presetMode}`}
      label={preset ? preset.name : free ? 'Seance libre' : day!.label || WEEKDAYS[picked - 1]}
      groups={free ? groups.map((g) => g.slug) : day!.groups}
      targets={free ? {} : (day!.targets ?? {})}
      showTargets={!free}
      exercises={exercises}
      muscleGroups={groups}
      lastPerf={lastPerf}
      preselected={
        presetMode ? [] : open?.performed_on === date ? (open?.planned_exercise_ids ?? []) : []
      }
      date={date}
      isPast={isPast}
      dayOptions={options}
      activeWeekday={free ? null : picked}
      naturalWeekday={natural}
      templates={templates}
      initialTemplateId={preset?.id ?? null}
      presetMode={presetMode}
    />
  );
}
