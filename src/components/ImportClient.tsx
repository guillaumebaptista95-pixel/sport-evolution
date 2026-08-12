'use client';

// Import d'un historique depuis un tableur : on lit le CSV, on rapproche les
// noms d'exercices du referentiel, on montre le resultat, puis on enregistre.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, FileUp, Upload } from 'lucide-react';
import { importHistory } from '@/app/actions';
import { mapRows, parseCsv, type MappedRow } from '@/lib/import';
import { fmtDateShort } from '@/lib/format';
import { cn } from '@/lib/format';

export default function ImportClient({
  exercises,
}: {
  exercises: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<MappedRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ days: number; sets: number; skipped: number } | null>(null);

  async function onFile(file: File) {
    setError(null);
    setDone(null);
    const text = await file.text();
    const { rows: raw, error: e } = parseCsv(text);
    if (e) {
      setError(e);
      setRows(null);
      return;
    }
    setRows(mapRows(raw, exercises));
  }

  const ok = (rows ?? []).filter((r) => r.exerciseId);
  const ko = (rows ?? []).filter((r) => !r.exerciseId);
  const days = new Set(ok.map((r) => r.date)).size;

  function run() {
    start(async () => {
      const res = await importHistory(
        ok.map((r) => ({
          date: r.date,
          exerciseId: r.exerciseId!,
          weight: r.weight,
          reps: r.reps,
          seconds: r.seconds,
          sets: r.sets,
        }))
      );
      setDone(res);
      setRows(null);
      router.refresh();
    });
  }

  return (
    <div>
      <label className="press card mb-4 flex cursor-pointer flex-col items-center gap-2 border-dashed p-7 text-center">
        <FileUp size={22} className="text-brand-300" />
        <span className="text-[14.5px] font-bold">Choisir un fichier CSV</span>
        <span className="text-[12.5px] leading-relaxed text-ink-400">
          Depuis Numbers ou Excel : Fichier → Exporter → CSV
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </label>

      {error && (
        <div className="card-flat mb-4 flex gap-2.5 p-3.5 text-[13px] leading-snug text-rose-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {done && (
        <div className="card-flat mb-4 flex gap-2.5 p-3.5 text-[13px] leading-snug text-lime-200">
          <Check size={16} className="mt-0.5 shrink-0" />
          {done.days} seances et {done.sets} series importees.
          {done.skipped > 0 && ` ${done.skipped} lignes ignorees : ces journees existaient deja.`}
        </div>
      )}

      {rows && (
        <>
          <div className="mb-3 grid grid-cols-3 gap-2.5">
            {[
              ['journees', days],
              ['lignes lues', ok.length],
              ['non reconnues', ko.length],
            ].map(([l, v]) => (
              <div key={l as string} className="card px-3 py-3.5 text-center">
                <p className="num text-[19px] font-extrabold leading-none">{v as number}</p>
                <p className="mt-1 text-[10.5px] text-ink-400">{l as string}</p>
              </div>
            ))}
          </div>

          <div className="card mb-3 max-h-[300px] divide-y divide-white/[0.05] overflow-y-auto">
            {(rows ?? []).slice(0, 200).map((r, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2">
                <span className="num w-[52px] shrink-0 text-[11.5px] text-ink-500">
                  {fmtDateShort(r.date)}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[13px]',
                    r.exerciseId ? 'font-semibold' : 'text-rose-300'
                  )}
                >
                  {r.matchedName ?? r.exercise}
                </span>
                <span className="num shrink-0 text-[12px] text-ink-400">
                  {r.sets}x
                  {r.weight ? ` ${r.weight}kg` : ''}
                  {r.reps ? ` ${r.reps}` : ''}
                  {r.seconds ? ` ${r.seconds}s` : ''}
                </span>
              </div>
            ))}
          </div>

          {ko.length > 0 && (
            <p className="mb-3 text-[12px] leading-relaxed text-ink-400">
              Les lignes en rouge n&apos;ont pas trouve d&apos;exercice correspondant et ne seront
              pas importees. Renomme-les dans ton tableau comme dans l&apos;appli, ou cree
              l&apos;exercice manquant.
            </p>
          )}

          <button
            onClick={run}
            disabled={pending || ok.length === 0}
            className="btn-primary w-full disabled:opacity-40"
          >
            <Upload size={16} />
            {pending ? 'Import en cours...' : `Importer ${days} journees`}
          </button>
        </>
      )}
    </div>
  );
}
