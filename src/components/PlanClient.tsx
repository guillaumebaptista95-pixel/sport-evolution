'use client';

// Choix des groupes musculaires pour chaque jour de la semaine.
// Le programme se repete a l'identique tant qu'il n'est pas modifie.
import { useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, Moon } from 'lucide-react';
import type { MuscleGroup, PlanDay } from '@/lib/database.types';
import { savePlanDay } from '@/app/actions';
import { todayWeekday } from '@/lib/plan';
import { cn } from '@/lib/format';
import { Reveal } from '@/components/Reveal';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function PlanClient({
  plan,
  groups,
}: {
  plan: PlanDay[];
  groups: MuscleGroup[];
}) {
  const [days, setDays] = useState<PlanDay[]>(plan);
  const [open, setOpen] = useState<number | null>(null);
  const [, start] = useTransition();
  const today = todayWeekday();

  const byId = new Map(groups.map((g) => [g.slug, g]));

  function apply(weekday: number, next: string[], nextTargets?: Record<string, number>) {
    const label = next.length
      ? next.map((s) => byId.get(s)?.name ?? s).join(' + ')
      : 'Repos';

    const current = days.find((d) => d.weekday === weekday);
    const targets =
      nextTargets ??
      Object.fromEntries(next.map((s) => [s, current?.targets?.[s] ?? 2]));

    setDays((d) =>
      d.map((x) =>
        x.weekday === weekday
          ? { ...x, groups: next, label, targets, is_rest: next.length === 0 }
          : x
      )
    );
    start(async () => {
      await savePlanDay(weekday, next, label, targets);
    });
  }

  /** Nombre d'exercices attendu pour un groupe donne. */
  function bumpTarget(weekday: number, slug: string, delta: number) {
    const day = days.find((d) => d.weekday === weekday);
    if (!day) return;
    const value = Math.min(6, Math.max(1, (day.targets?.[slug] ?? 2) + delta));
    apply(weekday, day.groups, { ...(day.targets ?? {}), [slug]: value });
  }

  return (
    <div className="pb-8 pt-4">
      <Reveal>
        <h1 className="text-[26px] font-extrabold leading-tight">Mon programme</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
          Choisis ce que tu travailles chaque jour. Le programme se repete automatiquement chaque
          semaine, jusqu&apos;a ce que tu le changes.
        </p>
      </Reveal>

      <div className="mt-6 space-y-2.5">
        {days.map((d) => {
          const isToday = d.weekday === today;
          const isOpen = open === d.weekday;
          return (
            <div
              key={d.weekday}
              className={cn('card overflow-hidden', isToday && '!border-brand-400/45')}
            >
              <button
                onClick={() => setOpen(isOpen ? null : d.weekday)}
                className="press flex w-full items-center gap-3 p-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-bold">{DAYS[d.weekday - 1]}</span>
                    {isToday && (
                      <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-brand-200">
                        aujourd&apos;hui
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-[12.5px] text-ink-300">
                    {d.is_rest ? 'Repos' : d.groups.map((s) => byId.get(s)?.name ?? s).join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.groups.map((s) => (
                    <span
                      key={s}
                      className="h-2 w-2 rounded-full"
                      style={{ background: byId.get(s)?.color ?? '#6C5CE7' }}
                    />
                  ))}
                  <ChevronRight
                    size={18}
                    className={cn('text-ink-500 transition-transform', isOpen && 'rotate-90')}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        {groups.map((g) => {
                          const on = d.groups.includes(g.slug);
                          return (
                            <button
                              key={g.slug}
                              onClick={() =>
                                apply(
                                  d.weekday,
                                  on
                                    ? d.groups.filter((x) => x !== g.slug)
                                    : [...d.groups, g.slug]
                                )
                              }
                              className={cn(
                                'press flex items-center gap-2 rounded-2xl border px-3 py-3 text-[14px] font-semibold transition-colors',
                                on
                                  ? 'text-white'
                                  : 'border-white/10 bg-white/[0.03] text-ink-300'
                              )}
                              style={
                                on
                                  ? { borderColor: `${g.color}88`, background: `${g.color}22` }
                                  : undefined
                              }
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ background: g.color }}
                              />
                              <span className="truncate">{g.name}</span>
                              {on && <Check size={15} className="ml-auto shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      {d.groups.length > 0 && (
                        <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                          <p className="label mb-2.5">Exercices par groupe</p>
                          <div className="space-y-2">
                            {d.groups.map((s) => (
                              <div key={s} className="flex items-center gap-3">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ background: byId.get(s)?.color ?? '#6C5CE7' }}
                                />
                                <span className="flex-1 truncate text-[13.5px]">
                                  {byId.get(s)?.name ?? s}
                                </span>
                                <button
                                  onClick={() => bumpTarget(d.weekday, s, -1)}
                                  aria-label="Moins"
                                  className="press grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-[17px] font-bold"
                                >
                                  &minus;
                                </button>
                                <span className="num w-5 text-center text-[15px] font-bold">
                                  {d.targets?.[s] ?? 2}
                                </span>
                                <button
                                  onClick={() => bumpTarget(d.weekday, s, 1)}
                                  aria-label="Plus"
                                  className="press grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-[17px] font-bold"
                                >
                                  +
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => apply(d.weekday, [])}
                        className="btn-ghost mt-3 w-full"
                      >
                        <Moon size={16} />
                        Journee de repos
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[12px] text-ink-500">
        Chaque changement est enregistre immediatement.
      </p>
    </div>
  );
}
