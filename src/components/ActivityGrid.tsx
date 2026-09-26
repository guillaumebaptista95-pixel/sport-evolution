'use client';

// Regularite. Deux lectures : les huit dernieres semaines en un coup d'oeil,
// et, en deplie, les derniers mois sous forme de vrais calendriers.
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/format';

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTH_NAMES = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Lundi de la semaine contenant d. */
function monday(d: Date) {
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

export default function ActivityGrid({
  dates,
  weeks = 8,
  months = 6,
}: {
  dates: string[];
  weeks?: number;
  months?: number;
}) {
  const [open, setOpen] = useState(false);
  const done = useMemo(() => new Set(dates.map((d) => d.slice(0, 10))), [dates]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = iso(today);

  /* ---- Vue compacte : une colonne par semaine ---- */
  const firstMonday = monday(today);
  firstMonday.setDate(firstMonday.getDate() - (weeks - 1) * 7);

  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(firstMonday);
      day.setDate(firstMonday.getDate() + w * 7 + d);
      return day;
    })
  );

  const totalRecent = cols
    .flat()
    .filter((d) => d <= today && done.has(iso(d))).length;

  /* ---- Vue depliee : les derniers mois, en calendrier ---- */
  const monthBlocks = useMemo(() => {
    const out: { label: string; cells: (Date | null)[]; count: number }[] = [];
    for (let m = months - 1; m >= 0; m--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - m, 1);
      const first = new Date(ref);
      const blanks = (first.getDay() + 6) % 7;
      const nbDays = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
      const cells: (Date | null)[] = Array.from({ length: blanks }, () => null);
      let count = 0;
      for (let i = 1; i <= nbDays; i++) {
        const d = new Date(ref.getFullYear(), ref.getMonth(), i);
        cells.push(d);
        if (d <= today && done.has(iso(d))) count += 1;
      }
      out.push({
        label: `${MONTH_NAMES[ref.getMonth()]} ${ref.getFullYear()}`,
        cells,
        count,
      });
    }
    return out;
  }, [done, months, today]);

  /** Pastille d'un jour : fait, a faire, ou a venir. */
  function cellStyle(d: Date) {
    const future = d > today;
    const active = !future && done.has(iso(d));
    const isToday = iso(d) === todayIso;
    return {
      background: active
        ? 'linear-gradient(140deg,#9BE23C,#7CC323)'
        : future
          ? 'rgba(255,255,255,0.03)'
          : 'rgba(255,255,255,0.08)',
      boxShadow: isToday && !active ? 'inset 0 0 0 1.5px rgba(138,120,255,.85)' : undefined,
      color: active ? '#16200B' : future ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.45)',
    };
  }

  return (
    <div>
      {/* ------- Huit dernieres semaines ------- */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-[4px] pt-[18px]">
          {DAY_LETTERS.map((l, i) => (
            <span
              key={i}
              className={cn(
                'h-[15px] w-3 text-center text-[9.5px] font-bold leading-[15px]',
                i >= 5 ? 'text-brand-300' : 'text-ink-300'
              )}
            >
              {l}
            </span>
          ))}
        </div>

        <div className="no-scrollbar flex flex-1 gap-[4px] overflow-x-auto">
          {cols.map((col, ci) => {
            const m = col[0].getMonth();
            const showMonth = ci === 0 || cols[ci - 1][0].getMonth() !== m;
            return (
              <div key={ci} className="flex flex-col gap-[4px]">
                <span className="h-[14px] text-[9.5px] font-semibold leading-[14px] text-ink-400">
                  {showMonth ? MONTH_NAMES[m].slice(0, 3) : ''}
                </span>
                {col.map((d, di) => (
                  <motion.span
                    key={di}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: ci * 0.015 + di * 0.004 }}
                    title={iso(d)}
                    className="h-[15px] w-[15px] rounded-[5px]"
                    style={cellStyle(d)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[12.5px] text-ink-400">
          <span className="num font-bold text-lime-400">{totalRecent}</span> seance
          {totalRecent > 1 ? 's' : ''} sur {weeks} semaines
        </p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="press flex items-center gap-1 text-[12.5px] font-semibold text-ink-300"
        >
          {open ? 'Replier' : 'Tout voir'}
          <ChevronDown
            size={14}
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      {/* ------- Derniers mois, en calendrier ------- */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 space-y-4 border-t border-white/[0.06] pt-4"
        >
          {monthBlocks.map((mb) => (
            <div key={mb.label}>
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[13.5px] font-bold capitalize">{mb.label}</p>
                <p className="num text-[11.5px] text-ink-400">
                  {mb.count} seance{mb.count > 1 ? 's' : ''}
                </p>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-[4px]">
                {DAY_LETTERS.map((l, i) => (
                  <span
                    key={i}
                    className={cn(
                      'text-center text-[9.5px] font-bold',
                      i >= 5 ? 'text-brand-300' : 'text-ink-500'
                    )}
                  >
                    {l}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-[4px]">
                {mb.cells.map((d, i) =>
                  d === null ? (
                    <span key={i} />
                  ) : (
                    <span
                      key={i}
                      title={iso(d)}
                      className="num grid aspect-square place-items-center rounded-[6px] text-[10.5px] font-bold"
                      style={cellStyle(d)}
                    >
                      {d.getDate()}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
