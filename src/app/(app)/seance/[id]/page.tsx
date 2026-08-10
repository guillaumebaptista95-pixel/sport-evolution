// Detail d'une seance passee.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Layers, Weight } from 'lucide-react';
import { getExercises, getProfile, getWorkout } from '@/lib/queries';
import {
  describeSet,
  fmtDateLong,
  fmtDuration,
  fmtNumber,
  setVolume,
} from '@/lib/format';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import ReopenButton from '@/components/ReopenButton';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';

export const dynamic = 'force-dynamic';

export default async function WorkoutDetail({ params }: { params: { id: string } }) {
  const [workout, exercises, profile] = await Promise.all([
    getWorkout(params.id),
    getExercises(),
    getProfile(),
  ]);

  if (!workout) notFound();

  const exById = new Map(exercises.map((e) => [e.id, e]));
  const bw = profile?.weight_kg ?? 75;

  const byExercise = new Map<string, typeof workout.workout_sets>();
  for (const s of [...workout.workout_sets].sort(
    (a, b) => a.exercise_order - b.exercise_order || a.set_index - b.set_index
  )) {
    if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
    byExercise.get(s.exercise_id)!.push(s);
  }

  const volume = workout.workout_sets.reduce(
    (a, s) => a + setVolume(s, exById.get(s.exercise_id)?.tracking_type ?? 'weight_reps', bw),
    0
  );
  const duration =
    workout.started_at && workout.ended_at
      ? Math.round(
          (new Date(workout.ended_at).getTime() - new Date(workout.started_at).getTime()) / 1000
        )
      : null;

  return (
    <div className="pb-8 pt-4">
      <Reveal className="mb-5 flex items-center gap-3">
        <Link
          href="/"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-extrabold leading-tight">
            {workout.title || 'Seance'}
          </h1>
          <p className="text-[12.5px] capitalize text-ink-400">
            {fmtDateLong(workout.performed_on)}
          </p>
        </div>
      </Reveal>

      <Stagger className="mb-6 grid grid-cols-3 gap-2.5">
        <StaggerItem className="card px-3 py-3.5">
          <Weight size={15} className="mb-2 text-brand-300" />
          <p className="num text-[17px] font-bold leading-none">{fmtNumber(Math.round(volume))}</p>
          <p className="mt-1 text-[10.5px] text-ink-400">kg souleves</p>
        </StaggerItem>
        <StaggerItem className="card px-3 py-3.5">
          <Layers size={15} className="mb-2 text-lime-400" />
          <p className="num text-[17px] font-bold leading-none">{workout.workout_sets.length}</p>
          <p className="mt-1 text-[10.5px] text-ink-400">series</p>
        </StaggerItem>
        <StaggerItem className="card px-3 py-3.5">
          <Clock size={15} className="mb-2 text-gold-400" />
          <p className="num text-[17px] font-bold leading-none">
            {duration ? fmtDuration(duration).replace(' min', '') : '—'}
          </p>
          <p className="mt-1 text-[10.5px] text-ink-400">minutes</p>
        </StaggerItem>
      </Stagger>

      <Stagger className="space-y-3">
        {Array.from(byExercise.entries()).map(([eid, list]) => {
          const ex = exById.get(eid);
          const color = ex?.muscle_groups?.color ?? '#6C5CE7';
          return (
            <StaggerItem key={eid}>
              <div className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-white/[0.06] p-3">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl"
                    style={{ background: `${color}18` }}
                  >
                    <ExerciseAnimation
                      animationKey={ex?.animation_key}
                      color={color}
                      className="h-[64px] w-[64px]"
                      trail={false}
                      ghosts={0}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold">{ex?.name ?? 'Exercice'}</p>
                    <p className="text-[12px] text-ink-400">{list.length} series</p>
                  </div>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {list.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="num w-5 text-[12px] font-bold text-ink-500">{s.set_index}</span>
                      <span className="num flex-1 text-[14px] font-medium">
                        {describeSet(s, ex?.tracking_type ?? 'weight_reps')}
                      </span>
                      <span className="num text-[12px] text-ink-500">
                        {Math.round(setVolume(s, ex?.tracking_type ?? 'weight_reps', bw))} kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </Stagger>

      {workout.notes && (
        <div className="card mt-4 p-4">
          <p className="label mb-1.5">Notes</p>
          <p className="text-[13.5px] leading-relaxed text-ink-200">{workout.notes}</p>
        </div>
      )}

      {/* Un exercice oublie ? On rouvre la seance pour le rajouter. */}
      {workout.ended_at && <ReopenButton workoutId={workout.id} />}
    </div>
  );
}
