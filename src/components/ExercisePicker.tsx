'use client';

// Feuille modale de selection d'un exercice.
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import type { Exercise, MuscleGroup } from '@/lib/database.types';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import { cn } from '@/lib/format';

export default function ExercisePicker({
  open,
  exercises,
  groups,
  onPick,
  onClose,
}: {
  open: boolean;
  exercises: Exercise[];
  groups: MuscleGroup[];
  onPick: (e: Exercise) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      if (group && e.muscle_group_id !== group) return false;
      if (q.trim() && !norm(e.name).includes(norm(q.trim()))) return false;
      return true;
    });
  }, [exercises, group, q]);

  const byGroup = useMemo(() => {
    const map = new Map<string, Exercise[]>();
    for (const e of filtered) {
      const k = e.muscle_group_id ?? 'autre';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col rounded-t-[28px] border-t border-white/10 bg-ink-900"
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/15" />
              <h2 className="text-[19px] font-bold">Choisir un exercice</h2>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="press grid h-9 w-9 place-items-center rounded-xl bg-white/[0.06]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-5">
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
                <Search size={17} className="shrink-0 text-ink-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-500"
                />
              </div>
            </div>

            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
              <button
                onClick={() => setGroup(null)}
                className={cn('chip press', !group && '!border-white/25 !bg-white/[0.12] !text-white')}
              >
                Tous
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroup(group === g.id ? null : g.id)}
                  className={cn('chip press', group === g.id && '!text-white')}
                  style={
                    group === g.id
                      ? { borderColor: `${g.color}66`, background: `${g.color}26` }
                      : undefined
                  }
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />
                  {g.name}
                </button>
              ))}
            </div>

            <div className="no-scrollbar mt-2 flex-1 space-y-5 overflow-y-auto px-5 pb-8 pt-2">
              {Array.from(byGroup.entries()).map(([gid, list]) => {
                const g = groups.find((x) => x.id === gid);
                return (
                  <div key={gid}>
                    <p className="label mb-2">{g?.name ?? 'Autres'}</p>
                    <div className="space-y-2">
                      {list.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => {
                            onPick(e);
                            onClose();
                          }}
                          className="press card-flat flex w-full items-center gap-3 p-2.5 text-left"
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
                            <span className="block truncate text-[12px] capitalize text-ink-400">
                              {e.equipment?.replace(/-/g, ' ')}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <p className="py-10 text-center text-[13px] text-ink-400">
                  Aucun exercice ne correspond.
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
