'use client';

// Composition de la seance : tous les groupes du jour a l'ecran, un compteur
// par groupe (0/2), on coche jusqu'a atteindre le compte, puis on valide.
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Play } from 'lucide-react';
import type { Exercise, MuscleGroup, WorkoutSet } from '@/lib/database.types';
import { composeWorkout } from '@/app/actions';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import { MACHINE_LABEL, type MachineKey } from '@/components/MachineArt';
import { cn, describeSet } from '@/lib/format';

export default function SessionBuilder({
  label,
  groups,
  targets,
  exercises,
  muscleGroups,
  lastPerf,
  preselected,
}: {
  label: string;
  groups: string[];
  targets: Record<string, number>;
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  lastPerf: Record<string, WorkoutSet[]>;
  preselected: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string[]>(preselected);

  const gBySlug = useMemo(
    () => new Map(muscleGroups.map((g) => [g.slug, g])),
    [muscleGroups]
  );
  const gById = useMemo(
    () => new Map(muscleGroups.map((g) => [g.id, g])),
    [muscleGroups]
  );

  function toggle(id: string) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(8);
  }

  const countIn = (slug: string) =>
    chosen.filter((id) => {
      const ex = exercises.find((e) => e.id === id);
      return ex && gById.get(ex.muscle_group_id ?? '')?.slug === slug;
    }).length;

  const total = groups.reduce((a, s) => a + (targets[s] ?? 2), 0);
  const complete = groups.every((s) => countIn(s) >= (targets[s] ?? 2));

  function validate() {
    if (chosen.length === 0) return;
    start(async () => {
      await composeWorkout(chosen, label);
      router.push('/seance');
      router.refresh();
    });
  }

  return (
    <div className="pb-32 pt-4">
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          aria-label="Retour"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[21px] font-extrabold leading-tight">{label}</h1>
          <p className="text-[12.5px] text-ink-400">
            Choisis tes exercices · {chosen.length}/{total}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((slug) => {
          const g = gBySlug.get(slug);
          const target = targets[slug] ?? 2;
          const n = countIn(slug);
          const list = exercises.filter(
            (e) => gById.get(e.muscle_group_id ?? '')?.slug === slug
          );
          const done = n >= target;

          return (
            <section key={slug}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: g?.color ?? '#6C5CE7' }}
                />
                <h2 className="flex-1 text-[17px] font-bold">{g?.name ?? slug}</h2>
                <span
                  className={cn(
                    'num rounded-full px-2.5 py-1 text-[12px] font-bold',
                    done ? 'text-ink-950' : 'text-ink-300'
                  )}
                  style={done ? { background: g?.color ?? '#6C5CE7' } : { background: 'rgba(255,255,255,.07)' }}
                >
                  {n}/{target}
                </span>
              </div>

              <div className="space-y-2">
                {list.map((e) => {
                  const on = chosen.includes(e.id);
                  const prev = lastPerf[e.id] ?? [];
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggle(e.id)}
                      className={cn(
                        'press flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors',
                        on ? 'border-white/20' : 'border-white/[0.06] bg-ink-850/90'
                      )}
                      style={on ? { background: `${g?.color ?? '#6C5CE7'}1F` } : undefined}
                    >
                      <span
                        className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl"
                        style={{ background: `${g?.color ?? '#6C5CE7'}18` }}
                      >
                        <ExerciseAnimation
                          animationKey={e.animation_key}
                          color={g?.color ?? '#6C5CE7'}
                          className="h-[72px] w-[72px]"
                          trail={false}
                          ghosts={0}
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{e.name}</span>
                        <span className="block truncate text-[11.5px] text-ink-400">
                          {MACHINE_LABEL[(e.machine ?? 'aucun') as MachineKey]}
                        </span>
                        {prev.length > 0 && (
                          <span className="num block truncate text-[11.5px] text-ink-500">
                            Derniere fois : {describeSet(prev[0], e.tracking_type)}
                          </span>
                        )}
                      </span>

                      <span
                        className={cn(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors',
                          on ? 'border-transparent' : 'border-white/15'
                        )}
                        style={on ? { background: g?.color ?? '#6C5CE7' } : undefined}
                      >
                        {on && <Check size={15} strokeWidth={3} className="text-ink-950" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Barre de validation */}
      <div
        className="fixed inset-x-0 z-30 px-5"
        style={{ bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="mx-auto w-full max-w-[520px]">
          <button
            onClick={validate}
            disabled={chosen.length === 0 || pending}
            className="btn-primary w-full disabled:opacity-40"
          >
            <Play size={16} strokeWidth={2.8} className="fill-current" />
            {pending
              ? 'Preparation...'
              : chosen.length === 0
                ? 'Selectionne au moins un exercice'
                : `Commencer (${chosen.length} exercice${chosen.length > 1 ? 's' : ''})`}
          </button>
          {!complete && chosen.length > 0 && (
            <p className="mt-2 text-center text-[11.5px] text-ink-500">
              Tu peux commencer maintenant et completer en cours de seance.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
