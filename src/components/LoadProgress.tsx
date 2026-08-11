'use client';

// Evolution par exercice : la charge portee ou les repetitions, seance apres
// seance. C'est la courbe qui dit si on progresse vraiment.
import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import ProgressChart from '@/components/ProgressChart';
import { cn, fmtWeight } from '@/lib/format';

export interface ExerciseSerie {
  id: string;
  name: string;
  color: string;
  /** weight_reps | bodyweight | assisted | time | weighted_time */
  type: string;
  points: { label: string; weight: number; reps: number; seconds: number }[];
}

type Metric = 'charge' | 'reps';

export default function LoadProgress({ series }: { series: ExerciseSerie[] }) {
  const [id, setId] = useState(series[0]?.id ?? '');
  const [metric, setMetric] = useState<Metric>('charge');

  const ex = useMemo(() => series.find((s) => s.id === id) ?? series[0], [series, id]);

  if (!ex) {
    return (
      <div className="card p-5 text-center">
        <TrendingUp size={20} className="mx-auto text-ink-500" />
        <p className="mt-2 text-[13.5px] font-semibold">Pas encore de courbe</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
          Enregistre le meme exercice sur deux seances et sa progression apparaitra ici.
        </p>
      </div>
    );
  }

  const isTime = ex.type === 'time' || ex.type === 'weighted_time';
  // Sans charge a suivre, on bascule d'office sur les repetitions.
  const hasLoad = ex.type === 'weight_reps' || ex.type === 'weighted_time';
  const shown: Metric = isTime ? 'charge' : hasLoad ? metric : 'reps';

  const data = ex.points.map((p) => ({
    label: p.label,
    value: isTime ? p.seconds : shown === 'charge' ? p.weight : p.reps,
  }));

  const unit = isTime ? 's' : shown === 'charge' ? 'kg' : 'reps';
  const first = data[0]?.value ?? 0;
  const last = data[data.length - 1]?.value ?? 0;
  const delta = last - first;

  return (
    <div className="card p-4 pb-2">
      {/* Le choix de l'exercice : une rangee de pastilles qui defile. */}
      <div className="-mx-4 mb-3.5 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {series.map((s) => {
          const on = s.id === ex.id;
          return (
            <button
              key={s.id}
              onClick={() => setId(s.id)}
              className={cn(
                'press flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors',
                on ? 'border-transparent text-ink-950' : 'border-white/[0.09] bg-white/[0.03] text-ink-300'
              )}
              style={on ? { background: s.color } : undefined}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: on ? 'rgba(0,0,0,.45)' : s.color }}
              />
              {s.name}
            </button>
          );
        })}
      </div>

      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
            {isTime ? 'Meilleur temps' : shown === 'charge' ? 'Charge max' : 'Repetitions max'}
          </p>
          <p className="mt-0.5 flex items-baseline gap-2">
            <span className="num text-[26px] font-extrabold leading-none" style={{ color: ex.color }}>
              {unit === 'kg' ? fmtWeight(last) : `${last} ${unit}`}
            </span>
            {data.length > 1 && delta !== 0 && (
              <span
                className="num text-[12.5px] font-bold"
                style={{ color: delta > 0 ? '#9BE23C' : '#F87171' }}
              >
                {delta > 0 ? '+' : ''}
                {Math.round(delta * 10) / 10}
              </span>
            )}
          </p>
        </div>

        {!isTime && hasLoad && (
          <div className="flex shrink-0 rounded-xl bg-white/[0.05] p-0.5">
            {(['charge', 'reps'] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  'press rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-bold transition-colors',
                  shown === m ? 'bg-white/[0.12] text-white' : 'text-ink-500'
                )}
              >
                {m === 'charge' ? 'kg' : 'reps'}
              </button>
            ))}
          </div>
        )}
      </div>

      {data.length > 1 && (
        <p className="mb-1 text-[11.5px] text-ink-500">
          {data.length} seances · depuis le {data[0].label}
        </p>
      )}

      <ProgressChart data={data} color={ex.color} height={160} />
    </div>
  );
}
