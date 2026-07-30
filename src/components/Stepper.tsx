'use client';

// Selecteur numerique tactile : appui long pour defiler, tap pour saisir.
import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

export default function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  label,
  decimals = 0,
  accent = '#6C5CE7',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  label: string;
  decimals?: number;
  accent?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveRef = useRef(value);

  useEffect(() => {
    setDraft(String(value));
    liveRef.current = value;
  }, [value]);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));

  const bump = (dir: number) => {
    const next = clamp(liveRef.current + dir * step);
    liveRef.current = next;
    onChange(next);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(8);
  };

  const startHold = (dir: number) => {
    bump(dir);
    holdRef.current = setInterval(() => bump(dir), 110);
  };

  const stopHold = () => {
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = null;
  };

  useEffect(() => () => stopHold(), []);

  return (
    <div className="card-flat px-3 py-3">
      <p className="label mb-2 text-center">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Diminuer"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-ink-200"
        >
          <Minus size={18} strokeWidth={2.6} />
        </button>

        {editing ? (
          <input
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(',', '.'))}
            onBlur={() => {
              const n = parseFloat(draft);
              onChange(Number.isFinite(n) ? clamp(n) : value);
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            className="num w-full min-w-0 bg-transparent text-center text-[27px] font-extrabold outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="num min-w-0 flex-1 text-center text-[27px] font-extrabold leading-none"
            style={{ color: value > 0 ? undefined : '#5A6376' }}
          >
            {value.toFixed(decimals)}
            {suffix && <span className="ml-0.5 text-[13px] font-semibold text-ink-400">{suffix}</span>}
          </button>
        )}

        <button
          type="button"
          aria-label="Augmenter"
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-white"
          style={{ borderColor: `${accent}55`, background: `${accent}22` }}
        >
          <Plus size={18} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
