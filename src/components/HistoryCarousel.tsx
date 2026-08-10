'use client';

// Historique par journee : une carte par jour d'entrainement, que l'on fait
// glisser horizontalement. La plus recente est affichee en premier ; on va
// vers la droite pour remonter le temps.
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SessionDay } from '@/lib/database.types';
import { describeSet, fmtDateLong, fmtNumber, relativeDay } from '@/lib/format';
import { cn } from '@/lib/format';

export default function HistoryCarousel({ days }: { days: SessionDay[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const step = card.offsetWidth + 12;
      setIndex(Math.round(el.scrollLeft / step));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  function go(dir: -1 | 1) {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 12), behavior: 'smooth' });
  }

  if (days.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[14px] font-semibold">Aucune seance enregistree</p>
        <p className="mt-1 text-[13px] text-ink-400">
          Ta premiere seance apparaitra ici, jour par jour.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Mes seances</h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Seance plus recente"
            className="press grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => go(1)}
            disabled={index >= days.length - 1}
            aria-label="Seance precedente"
            className="press grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={track}
        className="no-scrollbar -mx-5 flex snap-x-mandatory gap-3 overflow-x-auto px-5 pb-1"
      >
        {days.map((day) => (
          <article
            key={day.date}
            className="card snap-center-item w-[calc(100%-8px)] shrink-0 overflow-hidden"
          >
            <header className="flex items-baseline justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold capitalize">
                  {fmtDateLong(day.date)}
                </p>
                <p className="text-[11.5px] text-ink-400">{relativeDay(day.date)}</p>
              </div>
              <p className="num shrink-0 text-[11.5px] text-ink-400">
                {day.totalSets} series · {fmtNumber(day.volumeKg)} kg
              </p>
            </header>

            <div className="max-h-[320px] divide-y divide-white/[0.05] overflow-y-auto">
              {day.entries.map((e) => (
                <div key={e.exerciseId} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: e.color }}
                    />
                    <p className="truncate text-[13.5px] font-semibold">{e.name}</p>
                  </div>
                  <p className="num mt-1 pl-4 text-[12.5px] leading-relaxed text-ink-300">
                    {e.sets.map((s) => describeSet(s, e.trackingType)).join('   ·   ')}
                  </p>
                </div>
              ))}
            </div>

            {day.workoutIds.length > 0 && (
              <Link
                href={`/seance/${day.workoutIds[0]}`}
                className="press flex items-center justify-center gap-1.5 border-t border-white/[0.06] py-2.5 text-[12.5px] font-semibold text-ink-300"
              >
                Ouvrir · completer
                <ChevronRight size={14} />
              </Link>
            )}
          </article>
        ))}
      </div>

      <div className="mt-3 flex justify-center gap-1.5">
        {days.slice(0, 12).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === index ? 'w-5 bg-brand-400' : 'w-1.5 bg-white/15'
            )}
          />
        ))}
      </div>
    </div>
  );
}
