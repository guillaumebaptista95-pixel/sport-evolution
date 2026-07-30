'use client';

// Grille de regularite, facon calendrier.
import { motion } from 'framer-motion';

const DAY_LABELS = ['L', '', 'M', '', 'V', '', 'D'];

export default function ActivityGrid({ dates }: { dates: string[] }) {
  const set = new Set(dates.map((d) => d.slice(0, 10)));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + (7 - ((today.getDay() + 6) % 7) - 1));

  const weeks = 16;
  const cols: Date[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col: Date[] = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date(end);
      day.setDate(end.getDate() - (w * 7 + d));
      col.push(day);
    }
    cols.push(col);
  }

  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex gap-1.5">
      <div className="flex flex-col justify-between py-[1px] pr-0.5">
        {DAY_LABELS.map((l, i) => (
          <span key={i} className="h-[13px] text-[8px] leading-[13px] text-ink-600">
            {l}
          </span>
        ))}
      </div>
      <div className="no-scrollbar flex flex-1 gap-[3px] overflow-x-auto">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((d, di) => {
              const active = set.has(iso(d));
              const future = d > today;
              return (
                <motion.span
                  key={di}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: ci * 0.012 + di * 0.004 }}
                  title={iso(d)}
                  className="h-[13px] w-[13px] rounded-[4px]"
                  style={{
                    background: future
                      ? 'rgba(255,255,255,0.02)'
                      : active
                        ? 'linear-gradient(140deg,#9BE23C,#7CC323)'
                        : 'rgba(255,255,255,0.06)',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
