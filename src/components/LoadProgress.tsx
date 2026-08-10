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
      <div className="mb-3 flex items-center gap-2">
        <select
          value={ex.id}
          onChange={(e) => setId(e.target.value)}
          className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[13.5px] font-semibold text-ink-100 outline-none"
        >
          {series.map((s) => (
            <option key={s.id} value={s.id} className="bg-ink-900">
              {s.name}
            </option>
          ))}
        </select>

        {!isTime && hasLoad && (
          <div className="flex shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-0.5">
            {(['charge', 'reps'] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={cn(
                  'press rounded-[10px] px-2.5 py-1.5 text-[12px] font-bold transition-colors',
                  shown === m ? 'text-ink-950' : 'text-ink-400'
                )}
                style={shown === m ? { background: ex.color } : undefined}
              >
                {m === 'charge' ? 'kg' : 'reps'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-1 flex items-baseline gap-2">
        <span className="num text-[22px] font-extrabold leading-none">
          {unit === 'kg' ? fmtWeight(last) : `${last} ${unit}`}
        </span>
        {data.length > 1 && (
          <span
            className="num text-[12.5px] font-bold"
            style={{ color: delta > 0 ? '#9BE23C' : delta < 0 ? '#F87171' : '#8A94A6' }}
          >
            {delta > 0 ? '+' : ''}
            {Math.round(delta * 10) / 10} depuis le debut
          </span>
        )}
      </div>

      <ProgressChart data={data} color={ex.color} height={168} />
    </div>
  );
}
