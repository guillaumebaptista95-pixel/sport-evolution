// Fiche exercice : animation, technique, historique, records.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Award, Repeat, Zap } from 'lucide-react';
import {
  getExerciseBySlug,
  getExerciseHistory,
  getMachinePhotos,
  getProfile,
} from '@/lib/queries';
import {
  describeSet,
  estimate1RM,
  fmtDateShort,
  fmtWeight,
  relativeDay,
  trackingLabel,
} from '@/lib/format';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import { type MachineKey } from '@/components/MachineArt';
import MachinePanel from '@/components/MachinePanel';
import ProgressChart from '@/components/ProgressChart';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';

export const dynamic = 'force-dynamic';

export default async function ExerciseDetail({ params }: { params: { slug: string } }) {
  const exercise = await getExerciseBySlug(params.slug);
  if (!exercise) notFound();

  const [history, profile, photos] = await Promise.all([
    getExerciseHistory(exercise.id),
    getProfile(),
    getMachinePhotos(),
  ]);
  const color = exercise.muscle_groups?.color ?? '#6C5CE7';
  const type = exercise.tracking_type;
  const isTime = type === 'time' || type === 'weighted_time';

  // Regroupement par seance
  const byDate = new Map<string, typeof history>();
  for (const s of history) {
    const d = s.workouts?.performed_on ?? s.performed_at.slice(0, 10);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(s);
  }

  const chart = Array.from(byDate.entries())
    .map(([date, list]) => ({
      date,
      label: fmtDateShort(date),
      value: isTime
        ? Math.max(...list.map((s) => s.duration_seconds ?? 0))
        : type === 'assisted'
          ? Math.max(...list.map((s) => (s.reps ?? 0)))
          : Math.round(Math.max(...list.map((s) => estimate1RM(s.weight_kg ?? 0, s.reps ?? 0)))),
    }))
    .slice(-24);

  const bestValue = chart.length ? Math.max(...chart.map((c) => c.value)) : 0;
  const totalSets = history.length;
  const totalReps = history.reduce((a, s) => a + (s.reps ?? 0), 0);

  const sessions = Array.from(byDate.entries()).reverse().slice(0, 12);

  const chartLabel = isTime
    ? 'Meilleur maintien (s)'
    : type === 'assisted'
      ? 'Meilleure serie (reps)'
      : '1RM estime (kg)';

  return (
    <div className="pb-8 pt-4">
      <Reveal className="mb-4 flex items-center gap-3">
        <Link
          href="/exercices"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-extrabold leading-tight">{exercise.name}</h1>
          <p className="text-[12.5px] text-ink-400">
            {exercise.muscle_groups?.name} · {trackingLabel(type)}
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <div
            className="card relative overflow-hidden pb-6"
            style={{ background: `linear-gradient(160deg, ${color}22, transparent 65%)` }}
          >
            <ExerciseAnimation animationKey={exercise.animation_key} color={color} className="w-full" />
            <span className="absolute inset-x-0 bottom-2 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
              Le mouvement
            </span>
          </div>
          <MachinePanel
            machine={(exercise.machine ?? 'aucun') as MachineKey}
            color={color}
            photoUrl={photos[exercise.machine ?? 'aucun']}
          />
        </div>
      </Reveal>

      <Stagger className="mb-5 grid grid-cols-3 gap-2.5">
        <StaggerItem className="card px-3 py-3.5">
          <Award size={15} className="mb-2" style={{ color }} />
          <p className="num text-[17px] font-bold leading-none">
            {isTime ? `${bestValue}s` : type === 'assisted' ? bestValue : fmtWeight(bestValue)}
          </p>
          <p className="mt-1 text-[10.5px] text-ink-400">record</p>
        </StaggerItem>
        <StaggerItem className="card px-3 py-3.5">
          <Repeat size={15} className="mb-2 text-lime-400" />
          <p className="num text-[17px] font-bold leading-none">{totalSets}</p>
          <p className="mt-1 text-[10.5px] text-ink-400">series au total</p>
        </StaggerItem>
        <StaggerItem className="card px-3 py-3.5">
          <Zap size={15} className="mb-2 text-gold-400" />
          <p className="num text-[17px] font-bold leading-none">{totalReps}</p>
          <p className="mt-1 text-[10.5px] text-ink-400">repetitions</p>
        </StaggerItem>
      </Stagger>

      {chart.length > 1 && (
        <Reveal delay={0.12} className="mb-5">
          <div className="card p-4 pb-2">
            <p className="label mb-1">{chartLabel}</p>
            <ProgressChart data={chart} color={color} />
          </div>
        </Reveal>
      )}

      {(exercise.instructions ?? []).length > 0 && (
        <Reveal delay={0.16} className="mb-5">
          <div className="card p-4">
            <p className="label mb-2.5">Execution</p>
            <ol className="space-y-2">
              {(exercise.instructions ?? []).map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-200">
                  <span
                    className="mt-[3px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md text-[10px] font-bold"
                    style={{ background: `${color}30`, color }}
                  >
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
            {(exercise.tips ?? []).length > 0 && (
              <>
                <p className="label mb-2 mt-4">A retenir</p>
                <ul className="space-y-2">
                  {(exercise.tips ?? []).map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-300">
                      <Zap size={13} className="mt-1 shrink-0" style={{ color }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Reveal>
      )}

      <h2 className="mb-3 text-[17px] font-bold">Historique</h2>
      {sessions.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-[13.5px] text-ink-400">
            Pas encore de donnees pour cet exercice. Ajoute-le a ta prochaine seance.
          </p>
        </div>
      ) : (
        <Stagger className="space-y-2.5">
          {sessions.map(([date, list]) => (
            <StaggerItem key={date}>
              <div className="card px-4 py-3">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold capitalize">{fmtDateShort(date)}</p>
                  <p className="text-[11.5px] text-ink-500">{relativeDay(date)}</p>
                </div>
                <p className="num text-[13.5px] text-ink-200">
                  {list
                    .sort((a, b) => a.set_index - b.set_index)
                    .map((s) => describeSet(s, type))
                    .join('  ·  ')}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {profile && null}
    </div>
  );
}
