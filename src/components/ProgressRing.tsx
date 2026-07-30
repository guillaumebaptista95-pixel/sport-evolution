'use client';

// Anneau de progression de l'objectif hebdomadaire.
import { motion } from 'framer-motion';

export default function ProgressRing({
  value,
  max,
  size = 92,
  stroke = 9,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
}) {
  const pct = Math.min(1, max > 0 ? value / max : 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8A78FF" />
            <stop offset="100%" stopColor="#9BE23C" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="num text-[22px] font-extrabold leading-none">{value}</span>
        <span className="num absolute bottom-[22px] text-[11px] font-medium text-ink-400">
          / {max}
        </span>
      </div>
    </div>
  );
}
