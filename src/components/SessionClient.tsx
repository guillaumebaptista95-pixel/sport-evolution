'use client';

// Orchestrateur de la seance : exercices et saisie des series.
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Flag,
  Info,
  Plus,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import type { Exercise, MuscleGroup, WorkoutSet } from '@/lib/database.types';
import type { WorkoutWithSets } from '@/lib/queries';
import { deleteSet, finishWorkout, saveSet, startWorkout } from '@/app/actions';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import ExercisePicker from '@/components/ExercisePicker';
import { MACHINE_LABEL, type MachineKey } from '@/components/MachineArt';
import MachinePanel from '@/components/MachinePanel';
import RestTimer from '@/components/RestTimer';
import Stepper from '@/components/Stepper';
import {
  cn,
  describeSet,
  estimate1RM,
  fmtClock,
  fmtDateLong,
  fmtNumber,
  fmtWeight,
  relativeDay,
  setVolume,
  todayISO,
  trackingLabel,
} from '@/lib/format';

type LocalSet = WorkoutSet & { _pending?: boolean };

export default function SessionClient({
  workout,
  exercises,
  groups,
  lastPerf,
  restDefault,
  bodyweight,
  initialGroupId = null,
  photos = {},
}: {
  workout: WorkoutWithSets | null;
  exercises: Exercise[];
  groups: MuscleGroup[];
  lastPerf: Record<string, WorkoutSet[]>;
  restDefault: number;
  bodyweight: number;
  initialGroupId?: string | null;
  photos?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [workoutId, setWorkoutId] = useState<string | null>(workout?.id ?? null);
  const [startedAt] = useState<number>(
    workout?.started_at ? new Date(workout.started_at).getTime() : Date.now()
  );
  const [sets, setSets] = useState<LocalSet[]>((workout?.workout_sets ?? []) as LocalSet[]);
  const [active, setActive] = useState<Exercise | null>(null);
  const [pickerOpen, setPickerOpen] = useState(Boolean(initialGroupId));
  const planned = workout?.planned_exercise_ids ?? [];
  // Seance rattrapee : elle porte une date anterieure a aujourd'hui.
  const isBackfill = !!workout && workout.performed_on !== todayISO();
  const [rest, setRest] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const groupOf = useMemo(() => {
    const m = new Map(groups.map((g) => [g.id, g]));
    return (e?: Exercise | null) => (e?.muscle_group_id ? m.get(e.muscle_group_id) : undefined);
  }, [groups]);

  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  // Seance fraichement composee : on ouvre directement le premier exercice.
  useEffect(() => {
    if (sets.length > 0 || planned.length === 0) return;
    const first = exercises.find((e) => e.id === planned[0]);
    if (first) setActive(first);
    // volontairement au montage uniquement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Demarrage                                                        */
  /* ---------------------------------------------------------------- */
  async function ensureWorkout(): Promise<string> {
    if (workoutId) return workoutId;
    const { id } = await startWorkout();
    setWorkoutId(id);
    return id;
  }

  /* ---------------------------------------------------------------- */
  /*  Enregistrement d'une serie                                       */
  /* ---------------------------------------------------------------- */
  async function addSet(payload: {
    weightKg?: number | null;
    reps?: number | null;
    durationSeconds?: number | null;
    assistKg?: number | null;
  }) {
    if (!active) return;
    const wid = await ensureWorkout();
    const idx = sets.filter((s) => s.exercise_id === active.id).length + 1;
    const order = new Set(sets.map((s) => s.exercise_id)).has(active.id)
      ? sets.find((s) => s.exercise_id === active.id)!.exercise_order
      : new Set(sets.map((s) => s.exercise_id)).size;

    const optimistic: LocalSet = {
      id: `tmp-${Date.now()}`,
      workout_id: wid,
      user_id: '',
      exercise_id: active.id,
      exercise_order: order,
      set_index: idx,
      weight_kg: payload.weightKg ?? null,
      reps: payload.reps ?? null,
      duration_seconds: payload.durationSeconds ?? null,
      assist_kg: payload.assistKg ?? null,
      rpe: null,
      is_warmup: false,
      is_pr: false,
      notes: null,
      performed_at: new Date().toISOString(),
      _pending: true,
    };

    setSets((s) => [...s, optimistic]);
    setRest(restDefault);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(16);

    try {
      const saved = await saveSet({
        workoutId: wid,
        exerciseId: active.id,
        setIndex: idx,
        exerciseOrder: order,
        ...payload,
      });
      setSets((s) => s.map((x) => (x.id === optimistic.id ? ({ ...saved } as LocalSet) : x)));
    } catch {
      setSets((s) => s.filter((x) => x.id !== optimistic.id));
    }
  }

  async function removeSet(id: string) {
    setSets((s) => s.filter((x) => x.id !== id));
    if (!id.startsWith('tmp-')) await deleteSet(id);
  }

  async function onFinish() {
    if (!workoutId) return router.push('/');
    setFinishing(true);
    await finishWorkout(workoutId);
    router.push(`/seance/${workoutId}`);
    router.refresh();
  }

  /* ---------------------------------------------------------------- */
  /*  Rendu                                                            */
  /* ---------------------------------------------------------------- */
  // Les exercices prevus a la composition, puis ceux ajoutes en cours de route.
  const usedExerciseIds = Array.from(
    new Set([...planned, ...sets.map((s) => s.exercise_id)])
  ).filter((id) => exById.has(id));
  const totalVolume = sets.reduce(
    (a, s) => a + setVolume(s, exById.get(s.exercise_id)?.tracking_type ?? 'weight_reps', bodyweight),
    0
  );

  return (
    <div className="pb-8 pt-4">
      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key="logger"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logger
              exercise={active}
              color={groupOf(active)?.color ?? '#6C5CE7'}
              sets={sets.filter((s) => s.exercise_id === active.id)}
              last={lastPerf[active.id] ?? []}
              onBack={() => setActive(null)}
              onAdd={addSet}
              onRemove={removeSet}
              bodyweight={bodyweight}
              photoUrl={photos[active.machine ?? 'aucun']}
            />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* En-tete de seance */}
            <div className="mb-5 flex items-end justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-400">
                  {isBackfill
                    ? 'Seance oubliee'
                    : workoutId
                      ? 'Seance en cours'
                      : 'Nouvelle seance'}
                </p>
                {isBackfill ? (
                  <h1 className="mt-0.5 truncate text-[22px] font-extrabold capitalize leading-tight text-gold-400">
                    {fmtDateLong(workout!.performed_on)}
                  </h1>
                ) : (
                  <h1 className="num mt-0.5 text-[32px] font-extrabold leading-none">
                    {workoutId ? fmtClock(elapsed) : '0:00'}
                  </h1>
                )}
              </div>
              <div className="text-right">
                <p className="num text-[19px] font-bold leading-none">{sets.length}</p>
                <p className="text-[11px] text-ink-400">series</p>
              </div>
              <div className="text-right">
                <p className="num text-[19px] font-bold leading-none">
                  {fmtNumber(Math.round(totalVolume))}
                </p>
                <p className="text-[11px] text-ink-400">kg souleves</p>
              </div>
            </div>

            {usedExerciseIds.length === 0 && (
              <div className="card mb-4 overflow-hidden">
                <div className="relative px-5 pb-5 pt-6">
                  <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-brand-500/20 blur-2xl" />
                  <h2 className="relative text-[20px] font-extrabold leading-tight">
                    Ajoute ton premier exercice
                  </h2>
                  <p className="relative mt-1.5 text-[13.5px] leading-relaxed text-ink-300">
                    Choisis un mouvement, puis note chaque serie : le poids, les repetitions. Ta
                    derniere performance s&apos;affiche pour te donner la cible.
                  </p>
                </div>
              </div>
            )}

            {/* Exercices de la seance */}
            <div className="space-y-2.5">
              {usedExerciseIds.map((eid) => {
                const ex = exById.get(eid);
                if (!ex) return null;
                const g = groupOf(ex);
                const list = sets.filter((s) => s.exercise_id === eid);
                return (
                  <button
                    key={eid}
                    onClick={() => setActive(ex)}
                    className="press card flex w-full items-center gap-3 p-3 text-left"
                  >
                    <span
                      className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl"
                      style={{ background: `${g?.color ?? '#6C5CE7'}18` }}
                    >
                      <ExerciseAnimation
                        animationKey={ex.animation_key}
                        color={g?.color ?? '#6C5CE7'}
                        className="h-[74px] w-[74px]"
                        trail={false}
                        ghosts={0}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{ex.name}</span>
                      <span className="num mt-0.5 block truncate text-[12.5px] text-ink-400">
                        {list.length === 0
                          ? 'A faire'
                          : list.map((s) => describeSet(s, ex.tracking_type)).join('  ·  ')}
                      </span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-ink-500" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setPickerOpen(true)}
              className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-4 text-[14.5px] font-semibold text-ink-200"
            >
              <Plus size={18} strokeWidth={2.6} />
              Ajouter un exercice
            </button>

            {sets.length > 0 && (
              <button
                onClick={onFinish}
                disabled={finishing || pending}
                className="btn-primary mt-6 w-full disabled:opacity-60"
              >
                <Flag size={17} strokeWidth={2.4} />
                {finishing ? 'Enregistrement...' : 'Terminer la seance'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises}
        groups={groups}
        defaultGroupId={initialGroupId}
        onPick={(e) => start(() => setActive(e))}
        onClose={() => setPickerOpen(false)}
      />

      {rest !== null && (
        <RestTimer
          key={rest + '-' + sets.length}
          seconds={rest}
          onClose={() => setRest(null)}
          accent={groupOf(active)?.color ?? '#6C5CE7'}
        />
      )}
    </div>
  );
}

/* ==================================================================== */
/*  Ecran de saisie d'un exercice                                       */
/* ==================================================================== */
function Logger({
  exercise,
  color,
  sets,
  last,
  onBack,
  onAdd,
  onRemove,
  bodyweight,
  photoUrl,
}: {
  exercise: Exercise;
  color: string;
  sets: LocalSet[];
  last: WorkoutSet[];
  photoUrl?: string;
  onBack: () => void;
  onAdd: (p: {
    weightKg?: number | null;
    reps?: number | null;
    durationSeconds?: number | null;
    assistKg?: number | null;
  }) => void;
  onRemove: (id: string) => void;
  bodyweight: number;
}) {
  const type = exercise.tracking_type;
  const nextIndex = sets.length + 1;
  const reference = last[Math.min(sets.length, Math.max(0, last.length - 1))] ?? last[0];

  const [weight, setWeight] = useState<number>(reference?.weight_kg ?? 20);
  const [reps, setReps] = useState<number>(reference?.reps ?? 10);
  const [duration, setDuration] = useState<number>(reference?.duration_seconds ?? 30);
  const [assist, setAssist] = useState<number>(reference?.assist_kg ?? 0);
  const [showHow, setShowHow] = useState(false);

  const best = useMemo(() => {
    if (!last.length) return null;
    if (type === 'time' || type === 'weighted_time')
      return Math.max(...last.map((s) => s.duration_seconds ?? 0));
    return Math.max(...last.map((s) => estimate1RM(s.weight_kg ?? 0, s.reps ?? 0)));
  }, [last, type]);

  const submit = () => {
    if (type === 'time') return onAdd({ durationSeconds: duration });
    if (type === 'weighted_time') return onAdd({ durationSeconds: duration, weightKg: weight });
    if (type === 'bodyweight') return onAdd({ reps, weightKg: weight || null });
    if (type === 'assisted') return onAdd({ reps, assistKg: assist || null });
    return onAdd({ weightKg: weight, reps });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Retour"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[19px] font-extrabold leading-tight">{exercise.name}</h1>
          <p className="text-[12px] text-ink-400">
            {trackingLabel(type)} · serie {nextIndex}
          </p>
        </div>
        <button
          onClick={() => setShowHow((v) => !v)}
          aria-label="Comment faire"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"
        >
          <Info size={17} />
        </button>
      </div>

      {/* Le mouvement, et la machine sur laquelle le faire */}
      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div
          className="card relative overflow-hidden pb-6"
          style={{ background: `linear-gradient(160deg, ${color}20, transparent 60%)` }}
        >
          <ExerciseAnimation animationKey={exercise.animation_key} color={color} className="w-full" />
          <span className="absolute inset-x-0 bottom-2 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
            Le mouvement
          </span>
        </div>
        <MachinePanel
          machine={(exercise.machine ?? 'aucun') as MachineKey}
          color={color}
          photoUrl={photoUrl}
        />
      </div>

      {best !== null && (
        <div className="card-flat mb-4 flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-semibold">
          <TrendingUp size={13} style={{ color }} />
          {type === 'time' || type === 'weighted_time'
            ? `Ton record : ${best} s`
            : `Ta force estimee : ${fmtWeight(best)}`}
        </div>
      )}

      <AnimatePresence>
        {showHow && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="card mb-4 p-4">
              <p className="label mb-2">Execution</p>
              <ol className="space-y-1.5">
                {(exercise.instructions ?? []).map((t, i) => (
                  <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-200">
                    <span
                      className="mt-[3px] grid h-[17px] w-[17px] shrink-0 place-items-center rounded-md text-[10px] font-bold"
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
                  <ul className="space-y-1.5">
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Derniere seance */}
      {last.length > 0 && (
        <div className="card-flat mb-4 flex items-center gap-3 px-4 py-3">
          <span className="label shrink-0">Derniere fois</span>
          <span className="num min-w-0 flex-1 truncate text-right text-[13px] font-semibold text-ink-200">
            {last.map((s) => describeSet(s, type)).join('  ·  ')}
          </span>
        </div>
      )}

      {/* Series deja faites */}
      {sets.length > 0 && (
        <div className="mb-4 space-y-2">
          {sets.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                'card flex items-center gap-3 px-4 py-3',
                s._pending && 'opacity-60'
              )}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[12px] font-bold"
                style={{ background: `${color}26`, color }}
              >
                {s.set_index}
              </span>
              <span className="num flex-1 text-[15px] font-semibold">{describeSet(s, type)}</span>
              {!s._pending && (
                <span className="num text-[12px] text-ink-500">
                  {Math.round(setVolume(s, type, bodyweight))} kg
                </span>
              )}
              <button
                onClick={() => onRemove(s.id)}
                aria-label="Supprimer la serie"
                className="press grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500"
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Saisie */}
      <div className="grid grid-cols-2 gap-3">
        {(type === 'weight_reps' || type === 'weighted_time' || type === 'bodyweight') && (
          <Stepper
            label={type === 'bodyweight' ? 'Lest' : 'Charge'}
            value={weight}
            onChange={setWeight}
            step={2.5}
            max={500}
            suffix="kg"
            decimals={weight % 1 === 0 ? 0 : 1}
            accent={color}
          />
        )}
        {type === 'assisted' && (
          <Stepper
            label="Aide"
            value={assist}
            onChange={setAssist}
            step={2.5}
            max={120}
            suffix="kg"
            decimals={assist % 1 === 0 ? 0 : 1}
            accent={color}
          />
        )}
        {(type === 'time' || type === 'weighted_time') && (
          <Stepper
            label="Duree"
            value={duration}
            onChange={setDuration}
            step={5}
            max={600}
            suffix="s"
            accent={color}
          />
        )}
        {type !== 'time' && type !== 'weighted_time' && (
          <Stepper label="Repetitions" value={reps} onChange={setReps} step={1} max={100} accent={color} />
        )}
      </div>

      <button
        onClick={submit}
        className="press mt-3 flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-[15px] font-bold text-white"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 18px 40px -18px ${color}` }}
      >
        <Check size={18} strokeWidth={3} />
        Valider la serie {nextIndex}
      </button>

      <button onClick={onBack} className="btn-ghost mt-2.5 w-full">
        Exercice suivant
      </button>

      <p className="mt-4 text-center text-[12px] text-ink-500">
        {relativeDay(new Date().toISOString().slice(0, 10))} · les series sont enregistrees
        automatiquement
      </p>
    </div>
  );
}
