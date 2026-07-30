'use client';

// Minuteur de repos entre deux series.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { fmtClock } from '@/lib/format';

export default function RestTimer({
  seconds,
  onDone,
  onClose,
  accent = '#6C5CE7',
}: {
  seconds: number;
  onDone?: () => void;
  onClose: () => void;
  accent?: string;
}) {
  const [total, setTotal] = useState(seconds);
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setLeft((v) => v - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left <= 0 && !doneRef.current) {
      doneRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([60, 80, 60, 80, 140]);
      }
      onDone?.();
      const t = setTimeout(onClose, 1400);
      return () => clearTimeout(t);
    }
  }, [left, onDone, onClose]);

  const pct = Math.max(0, Math.min(1, left / Math.max(1, total)));
  const R = 26;
  const C = 2 * Math.PI * R;
  const over = left <= 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 90, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        className="fixed inset-x-0 z-50 px-5"
        style={{ bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="mx-auto flex w-full max-w-[520px] items-center gap-3 rounded-3xl border border-white/10 bg-ink-800/95 p-3 pr-4 shadow-card backdrop-blur-2xl">
          <div className="relative h-[62px] w-[62px] shrink-0">
            <svg width="62" height="62" className="-rotate-90">
              <circle cx="31" cy="31" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle
                cx="31"
                cy="31"
                r={R}
                fill="none"
                stroke={over ? '#9BE23C' : accent}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct)}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <span className="num absolute inset-0 grid place-items-center text-[13px] font-bold">
              {over ? 'GO' : fmtClock(Math.max(0, left))}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold">{over ? 'Repos termine' : 'Repos en cours'}</p>
            <p className="truncate text-[12px] text-ink-400">
              {over ? 'Enchaine la serie suivante' : 'Respire, relache, prepare la prochaine serie'}
            </p>
          </div>

          <button
            onClick={() => {
              setTotal((t) => t + 30);
              setLeft((v) => v + 30);
              doneRef.current = false;
            }}
            className="press grid h-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] px-2.5 text-[12px] font-semibold"
          >
            <span className="flex items-center gap-0.5">
              <Plus size={13} strokeWidth={2.6} />
              30
            </span>
          </button>
          <button
            onClick={onClose}
            aria-label="Fermer le minuteur"
            className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
