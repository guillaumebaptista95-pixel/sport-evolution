'use client';

// Petit histogramme du volume hebdomadaire.
import { motion } from 'framer-motion';

export default function VolumeSpark({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="mt-5 flex h-[74px] items-end gap-1.5">
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * 100);
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <motion.div
              initial={{ height: 4, opacity: 0 }}
              animate={{ height: `${h}%`, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className={
                isLast
                  ? 'w-full rounded-md bg-gradient-to-t from-lime-600 to-lime-400'
                  : 'w-full rounded-md bg-gradient-to-t from-brand-600/50 to-brand-400/80'
              }
              style={{ minHeight: 4 }}
            />
            <span className="text-[9px] font-medium text-ink-500">{isLast ? 'now' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
