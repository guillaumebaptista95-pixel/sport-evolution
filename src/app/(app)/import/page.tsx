// Import d'un historique depuis un tableur.
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getExercises } from '@/lib/queries';
import ImportClient from '@/components/ImportClient';
import { Reveal } from '@/components/Reveal';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Importer mon historique — Sport Evolution' };

export default async function ImportPage() {
  const exercises = await getExercises();

  return (
    <div className="pb-8 pt-4">
      <Reveal className="mb-5 flex items-center gap-3">
        <Link
          href="/profil"
          className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[21px] font-extrabold leading-tight">Importer mon historique</h1>
          <p className="text-[12.5px] text-ink-400">Depuis un tableur Numbers ou Excel</p>
        </div>
      </Reveal>

      <Reveal delay={0.05} className="mb-4">
        <div className="card p-4">
          <p className="label mb-2">Colonnes attendues</p>
          <p className="text-[13px] leading-relaxed text-ink-300">
            Une ligne par exercice. Il faut au minimum une colonne{' '}
            <span className="font-semibold text-ink-100">date</span> et une colonne{' '}
            <span className="font-semibold text-ink-100">exercice</span>. Les colonnes{' '}
            <span className="font-semibold text-ink-100">charge</span>,{' '}
            <span className="font-semibold text-ink-100">reps</span>,{' '}
            <span className="font-semibold text-ink-100">series</span> et{' '}
            <span className="font-semibold text-ink-100">temps</span> sont reconnues si elles sont
            la. Une ligne sans date reprend celle du dessus.
          </p>
          <pre className="num mt-3 overflow-x-auto rounded-xl bg-white/[0.04] p-3 text-[11.5px] leading-relaxed text-ink-300">
{`date;exercice;charge;reps;series
12/03/2026;Developpe couche;60;10;4
12/03/2026;Dips;0;12;3
14/03/2026;Squat;80;8;5`}
          </pre>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <ImportClient exercises={exercises.map((e) => ({ id: e.id, name: e.name, slug: e.slug }))} />
      </Reveal>
    </div>
  );
}
