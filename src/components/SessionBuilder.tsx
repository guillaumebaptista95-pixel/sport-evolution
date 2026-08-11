'use client';

// Composition de la seance : tous les groupes du jour a l'ecran, un compteur
// par groupe (0/2), on coche jusqu'a atteindre le compte, puis on valide.
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Check, Play, Plus } from 'lucide-react';
import type { Exercise, MuscleGroup, WorkoutSet } from '@/lib/database.types';
import { composeWorkout } from '@/app/actions';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import { MACHINE_LABEL, type MachineKey } from '@/components/MachineArt';
import { cn, describeSet, fmtDateLong, todayISO } from '@/lib/format';

export default function SessionBuilder({
  label,
  groups,
  targets,
  showTargets = true,
  exercises,
  muscleGroups,
  lastPerf,
  preselected,
  date,
  isPast,
  dayOptions,
  activeWeekday,
  naturalWeekday,
}: {
  label: string;
  groups: string[];
  targets: Record<string, number>;
  showTargets?: boolean;
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  lastPerf: Record<string, WorkoutSet[]>;
  preselected: string[];
  date: string;
  isPast: boolean;
  dayOptions: { weekday: number; label: string; short: string }[];
  activeWeekday: number | null;
  naturalWeekday: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string[]>(preselected);
  const [blocked, setBlocked] = useState<string | null>(null);
  // Rien n'oblige a s'en tenir aux groupes du jour : on peut tout ouvrir.
  const [showAll, setShowAll] = useState(false);
  const today = todayISO();

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

  const extra = muscleGroups.map((g) => g.slug).filter((s) => !groups.includes(s));
  const visible = showAll ? [...groups, ...extra] : groups;

  const total = showTargets ? groups.reduce((a, s) => a + (targets[s] ?? 2), 0) : 0;
  const complete = !showTargets || groups.every((s) => countIn(s) >= (targets[s] ?? 2));

  function validate() {
    if (chosen.length === 0) return;
    setBlocked(null);
    start(async () => {
      const res = await composeWorkout(chosen, label, isPast ? date : undefined);
      if ('error' in res) {
        setBlocked(res.date);
        return;
      }
      router.push('/seance');
      router.refresh();
    });
  }

  /** Construit l'URL de l'ecran : la date, et le programme choisi. */
  function href(opts: { date?: string; weekday?: number | 'libre' }) {
    const d = opts.date ?? date;
    const p = new URLSearchParams();
    if (d !== today) p.set('date', d);
    if (opts.weekday === 'libre') p.set('libre', '1');
    else if (typeof opts.weekday === 'number') p.set('jour', String(opts.weekday));
    const q = p.toString();
    return q ? `/seance/composer?${q}` : '/seance/composer';
  }

  function changeDate(value: string) {
    if (!value || value > today) return;
    // Nouvelle date : on repart du programme naturel de ce jour-la.
    router.push(value === today ? '/seance/composer' : `/seance/composer?date=${value}`);
  }

  const shifted = activeWeekday !== null && activeWeekday !== naturalWeekday;

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
            {showTargets
              ? `Choisis tes exercices · ${chosen.length}/${total}`
              : `Choisis tes exercices · ${chosen.length}`}
          </p>
        </div>
      </div>

      {/* Date de la seance : par defaut aujourd'hui, modifiable pour rattraper. */}
      <label
        className={cn(
          'mb-5 flex items-center gap-3 rounded-2xl border p-3.5',
          isPast ? 'border-gold-400/40 bg-gold-400/[0.08]' : 'border-white/[0.06] bg-ink-850/90'
        )}
      >
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
            isPast ? 'bg-gold-400/15 text-gold-400' : 'bg-white/[0.06] text-ink-300'
          )}
        >
          <CalendarDays size={17} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
            {isPast ? 'Seance oubliee' : 'Date de la seance'}
          </span>
          <span className="block truncate text-[14.5px] font-semibold capitalize">
            {isPast ? fmtDateLong(date) : "Aujourd'hui"}
          </span>
        </span>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => changeDate(e.target.value)}
          aria-label="Date de la seance"
          className="shrink-0 rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-2 text-[12.5px] font-medium text-ink-200 [color-scheme:dark]"
        />
      </label>

      {/* Bascule de programme : utile quand le cycle a ete decale. */}
      <div className="mb-5">
        <p className="label mb-2">
          Programme {shifted || activeWeekday === null ? '· modifie pour cette seance' : 'du jour'}
        </p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dayOptions.map((o) => {
            const on = activeWeekday === o.weekday;
            return (
              <button
                key={o.weekday}
                onClick={() => router.push(href({ weekday: o.weekday }))}
                className={cn(
                  'press shrink-0 rounded-xl border px-3 py-2 text-left transition-colors',
                  on
                    ? 'border-brand-400/60 bg-brand-500/20'
                    : 'border-white/[0.08] bg-ink-850/90'
                )}
              >
                <span
                  className={cn(
                    'block text-[10px] font-bold uppercase tracking-[0.12em]',
                    on ? 'text-brand-200' : 'text-ink-500'
                  )}
                >
                  {o.short}
                  {o.weekday === naturalWeekday ? ' · prevu' : ''}
                </span>
                <span className="block whitespace-nowrap text-[13px] font-semibold">
                  {o.label}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => router.push(href({ weekday: 'libre' }))}
            className={cn(
              'press shrink-0 rounded-xl border px-3 py-2 text-left transition-colors',
              activeWeekday === null
                ? 'border-brand-400/60 bg-brand-500/20'
                : 'border-white/[0.08] bg-ink-850/90'
            )}
          >
            <span
              className={cn(
                'block text-[10px] font-bold uppercase tracking-[0.12em]',
                activeWeekday === null ? 'text-brand-200' : 'text-ink-500'
              )}
            >
              Au choix
            </span>
            <span className="block whitespace-nowrap text-[13px] font-semibold">Seance libre</span>
          </button>
        </div>
        {shifted && (
          <p className="mt-2 text-[11.5px] leading-snug text-ink-500">
            Ton planning n&apos;est pas modifie : ce changement ne vaut que pour cette seance.
          </p>
        )}
      </div>

      {blocked && (
        <div className="mb-5 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3.5 text-[13px] leading-snug text-rose-200">
          Une seance du {fmtDateLong(blocked)} est encore en cours. Termine-la avant
          d&apos;en enregistrer une autre.
        </div>
      )}

      <div className="space-y-6">
        {visible.map((slug) => {
          const g = gBySlug.get(slug);
          const withTarget = showTargets && groups.includes(slug);
          const target = targets[slug] ?? 2;
          const n = countIn(slug);
          const list = exercises.filter(
            (e) => gById.get(e.muscle_group_id ?? '')?.slug === slug
          );
          if (list.length === 0) return null;
          const done = withTarget && n >= target;

          return (
            <section key={slug}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: g?.color ?? '#6C5CE7' }}
                />
                <h2 className="flex-1 text-[17px] font-bold">{g?.name ?? slug}</h2>
                {(withTarget || n > 0) && (
                  <span
                    className={cn(
                      'num rounded-full px-2.5 py-1 text-[12px] font-bold',
                      done ? 'text-ink-950' : 'text-ink-300'
                    )}
                    style={
                      done
                        ? { background: g?.color ?? '#6C5CE7' }
                        : { background: 'rgba(255,255,255,.07)' }
                    }
                  >
                    {withTarget ? `${n}/${target}` : n}
                  </span>
                )}
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

      {extra.length > 0 && (
        <button onClick={() => setShowAll((v) => !v)} className="btn-ghost mt-6 w-full">
          <Plus size={16} className={showAll ? 'rotate-45 transition-transform' : 'transition-transform'} />
          {showAll ? 'Ne montrer que la seance du jour' : 'Choisir un autre exercice'}
        </button>
      )}

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
                : isPast
                  ? `Saisir la seance (${chosen.length} exercice${chosen.length > 1 ? 's' : ''})`
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
