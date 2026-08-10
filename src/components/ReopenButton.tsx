'use client';

// Rouvre une seance validee pour y ajouter une serie oubliee.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle } from 'lucide-react';
import { reopenWorkout } from '@/app/actions';
import { fmtDateLong } from '@/lib/format';

export default function ReopenButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [blocked, setBlocked] = useState<string | null>(null);

  function go() {
    setBlocked(null);
    start(async () => {
      const res = await reopenWorkout(workoutId);
      if ('error' in res) {
        setBlocked(res.date);
        return;
      }
      router.push('/seance');
      router.refresh();
    });
  }

  return (
    <div className="mt-4">
      <button onClick={go} disabled={pending} className="btn-ghost w-full disabled:opacity-50">
        <PlusCircle size={16} />
        {pending ? 'Ouverture...' : 'Completer cette seance'}
      </button>
      {blocked && (
        <p className="mt-2 text-center text-[12px] leading-snug text-rose-300">
          Une seance du {fmtDateLong(blocked)} est en cours. Termine-la d&apos;abord.
        </p>
      )}
    </div>
  );
}
