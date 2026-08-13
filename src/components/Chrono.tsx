'use client';

// Chronometre pour les exercices tenus : gainage, hollow hold, maintien.
// A l'arret, le temps mesure remplit directement le champ de la serie.
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/format';

export default function Chrono({
  accent,
  onStop,
}: {
  accent: string;
  onStop: (seconds: number) => void;
}) {
  const [running, setRunning] = useState(false);
  const [ms, setMs] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = Date.now() - ms;
    const id = setInterval(() => setMs(Date.now() - startedAt.current), 60);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const total = ms / 1000;
  const mm = Math.floor(total / 60);
  const ss = Math.floor(total % 60);
  const tenth = Math.floor((total * 10) % 10);

  function toggle() {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(12);
    if (running) {
      setRunning(false);
      const s = Math.round(total);
      if (s > 0) onStop(s);
    } else {
      setRunning(true);
    }
  }

  function reset() {
    setRunning(false);
    setMs(0);
  }

  return (
    <div className="card mb-3 flex items-center gap-3 p-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-500">
          Chronometre
        </p>
        <p className="num mt-0.5 text-[30px] font-extrabold leading-none tabular-nums">
          {mm > 0 && <span>{mm}:</span>}
          <span>{mm > 0 ? String(ss).padStart(2, '0') : ss}</span>
          <span className="text-[18px] font-bold text-ink-500">,{tenth}</span>
        </p>
      </div>

      {ms > 0 && !running && (
        <button
          onClick={reset}
          aria-label="Remettre a zero"
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-ink-400"
        >
          <RotateCcw size={17} />
        </button>
      )}

      <button
        onClick={toggle}
        className={cn(
          'press grid h-13 w-[104px] shrink-0 place-items-center rounded-2xl py-3.5 text-[14px] font-bold',
          running ? 'text-ink-950' : 'text-white'
        )}
        style={{
          background: running ? accent : `linear-gradient(135deg, ${accent}, ${accent}CC)`,
          boxShadow: `0 14px 30px -16px ${accent}`,
        }}
      >
        <span className="flex items-center gap-1.5">
          {running ? <Pause size={16} strokeWidth={3} /> : <Play size={15} strokeWidth={3} className="fill-current" />}
          {running ? 'Arreter' : ms > 0 ? 'Reprendre' : 'Demarrer'}
        </span>
      </button>
    </div>
  );
}
