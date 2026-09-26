'use client';

// Evolution par exercice : la charge portee ou les repetitions, seance apres
// seance. C'est la courbe qui dit si on progresse vraiment.
import { useMemo, useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import ProgressChart from '@/components/ProgressChart';
import { cn, fmtNumber, fmtWeight } from '@/lib/format';

export interface ExerciseSerie {
  id: string;
  name: string;
  color: string;
  /** weight_reps | bodyweight | assisted | time | weighted_time */
  type: string;
  points: {
    date: string;
    label: string;
    weight: number;
    reps: number;
    seconds: number;
    sets: number;
    volume: number;
    oneRm: number;
  }[];
}

type Metric = 'charge' | 'reps';

export default function LoadProgress({ series }: { series: ExerciseSerie[] }) {
  const [id, setId] = useState(series[0]?.id ?? '');
  const [metric, setMetric] = useState<Metric>('charge');
  const [open, setOpen] = useState(false);

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

      <ProgressChart data={data} color={ex.color} height={open ? 230 : 160} />

      <button
        onClick={() => setOpen((v) => !v)}
        className="press mt-1 flex w-full items-center justify-center gap-1 py-2 text-[12.5px] font-semibold text-ink-300"
      >
        {open ? 'Replier' : 'Tout voir'}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && <Details ex={ex} isTime={isTime} />}
    </div>
  );
}

/** Le detail complet d'un exercice : records, cumuls, et seance par seance. */
function Details({ ex, isTime }: { ex: ExerciseSerie; isTime: boolean }) {
  const pts = ex.points;
  const best = {
    weight: Math.max(...pts.map((p) => p.weight)),
    reps: Math.max(...pts.map((p) => p.reps)),
    seconds: Math.max(...pts.map((p) => p.seconds)),
    oneRm: Math.max(...pts.map((p) => p.oneRm)),
  };
  const totalSets = pts.reduce((a, p) => a + p.sets, 0);
  const totalVol = pts.reduce((a, p) => a + p.volume, 0);

  const stats: [string, string][] = isTime
    ? [
        ['Meilleur temps', `${best.seconds} s`],
        ['Series', String(totalSets)],
        ['Seances', String(pts.length)],
      ]
    : [
        ['Record', fmtWeight(best.weight)],
        ['1RM estime', `${best.oneRm} kg`],
        ['Meilleures reps', String(best.reps)],
        ['Series', String(totalSets)],
        ['Volume', `${fmtNumber(Math.round(totalVol / 1000))} t`],
        ['Seances', String(pts.length)],
      ];

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3.5">
      <div className="mb-3 grid grid-cols-3 gap-2">
        {stats.map(([l, v]) => (
          <div key={l} className="card-flat px-2.5 py-2.5 text-center">
            <p className="num text-[15px] font-extrabold leading-none" style={{ color: ex.color }}>
              {v}
            </p>
            <p className="mt-1 text-[9.5px] leading-tight text-ink-400">{l}</p>
          </div>
        ))}
      </div>

      <p className="label mb-1.5">Seance par seance</p>
      <div className="max-h-[260px] divide-y divide-white/[0.05] overflow-y-auto">
        {[...pts].reverse().map((p) => (
          <div key={p.date} className="flex items-center gap-3 py-2">
            <span className="num w-[54px] shrink-0 text-[11.5px] text-ink-500">{p.label}</span>
            <span className="num min-w-0 flex-1 text-[13px] font-semibold">
              {isTime
                ? `${p.seconds} s`
                : `${fmtWeight(p.weight)} × ${p.reps}`}
            </span>
            <span className="num shrink-0 text-[11.5px] text-ink-400">
              {p.sets} serie{p.sets > 1 ? 's' : ''}
              {!isTime && p.volume > 0 ? ` · ${fmtNumber(p.volume)} kg` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
