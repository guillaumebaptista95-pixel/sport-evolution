'use client';

// Grille filtrable des exercices.
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import type { Exercise, MuscleGroup } from '@/lib/database.types';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import { cn, trackingLabel } from '@/lib/format';

export default function ExerciseLibrary({
  exercises,
  groups,
}: {
  exercises: Exercise[];
  groups: MuscleGroup[];
}) {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const filtered = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (!group || e.muscle_group_id === group) &&
          (!q.trim() || norm(e.name).includes(norm(q.trim())))
      ),
    [exercises, group, q]
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of exercises) {
      if (!e.muscle_group_id) continue;
      m.set(e.muscle_group_id, (m.get(e.muscle_group_id) ?? 0) + 1);
    }
    return m;
  }, [exercises]);

  return (
    <div className="pb-6 pt-4">
      <div className="mb-4">
        <h1 className="text-[26px] font-extrabold leading-tight">Bibliotheque</h1>
        <p className="mt-0.5 text-[13px] text-ink-400">
          {exercises.length} mouvements, chacun anime pour la technique
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
        <Search size={17} className="shrink-0 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un exercice..."
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-500"
        />
      </div>

      <div className="no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
        <button
          onClick={() => setGroup(null)}
          className={cn('chip press', !group && '!border-white/25 !bg-white/[0.12] !text-white')}
        >
          Tous · {exercises.length}
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroup(group === g.id ? null : g.id)}
            className={cn('chip press', group === g.id && '!text-white')}
            style={
              group === g.id ? { borderColor: `${g.color}66`, background: `${g.color}26` } : undefined
            }
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />
            {g.name} · {counts.get(g.id) ?? 0}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((e, i) => {
          const g = groups.find((x) => x.id === e.muscle_group_id);
          const color = g?.color ?? '#6C5CE7';
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.4), ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/exercices/${e.slug}`} className="press card block overflow-hidden">
                <div
                  className="relative grid h-[132px] place-items-center"
                  style={{ background: `linear-gradient(150deg, ${color}22, transparent 70%)` }}
                >
                  <ExerciseAnimation
                    animationKey={e.animation_key}
                    color={color}
                    className="h-[140px] w-[140px]"
                    trail={false}
                    ghosts={1}
                  />
                </div>
                <div className="px-3 pb-3 pt-2.5">
                  <p className="truncate text-[13.5px] font-semibold leading-tight">{e.name}</p>
                  <p className="mt-1 truncate text-[11px] text-ink-400">
                    {g?.name} · {trackingLabel(e.tracking_type)}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-14 text-center text-[13px] text-ink-400">Aucun exercice ne correspond.</p>
      )}
    </div>
  );
}
