'use client';

// Gestion des seances types : renommer, supprimer, lancer.
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ListPlus, Pencil, Play, Plus, Star, Trash2, X } from 'lucide-react';
import type { WorkoutTemplate } from '@/lib/queries';
import { deleteTemplate, renameTemplate } from '@/app/actions';

export default function TemplateManager({ templates }: { templates: WorkoutTemplate[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  function rename(id: string) {
    const name = draft.trim();
    if (!name) return setEditing(null);
    start(async () => {
      await renameTemplate(id, name);
      setEditing(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await deleteTemplate(id);
      setConfirming(null);
      router.refresh();
    });
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 flex items-center gap-2 text-[17px] font-bold">
        <Star size={16} className="text-gold-400" />
        Mes seances types
      </h2>
      <p className="mb-3 text-[12.5px] leading-relaxed text-ink-400">
        Des seances enregistrees que tu peux lancer n&apos;importe quel jour, meme un jour de
        repos. Pour en creer une, compose ta seance puis touche « Enregistrer comme seance
        type ».
      </p>

      {templates.length === 0 ? (
        <div className="card p-5 text-center">
          <p className="text-[13.5px] font-semibold">Aucune seance type pour l&apos;instant</p>
          <Link href="/seance/composer?mode=preset" className="btn-primary mt-3 w-full">
            <Plus size={16} strokeWidth={3} />
            Creer ma premiere seance type
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          <Link href="/seance/composer?mode=preset" className="btn-ghost w-full">
            <Plus size={16} strokeWidth={3} />
            Nouvelle seance type
          </Link>
          {templates.map((t) => (
            <div key={t.id} className="card p-3.5">
              {editing === t.id ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && rename(t.id)}
                    maxLength={40}
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[14px] font-semibold text-ink-100 outline-none"
                  />
                  <button
                    onClick={() => setEditing(null)}
                    aria-label="Annuler"
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-400"
                  >
                    <X size={16} />
                  </button>
                  <button
                    onClick={() => rename(t.id)}
                    disabled={pending}
                    aria-label="Valider"
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-white"
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              ) : confirming === t.id ? (
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-200">
                    Supprimer « {t.name} » ?
                  </p>
                  <button
                    onClick={() => setConfirming(null)}
                    className="press shrink-0 rounded-xl px-3 py-2 text-[13px] font-semibold text-ink-400"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    disabled={pending}
                    className="press shrink-0 rounded-xl bg-coral-500/20 px-3 py-2 text-[13px] font-bold text-coral-400"
                  >
                    Supprimer
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-bold">{t.name}</p>
                    <p className="num text-[11.5px] text-ink-500">
                      {t.exercise_ids.length} exercice{t.exercise_ids.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Link
                    href={`/seance/composer?mode=preset&preset=${t.id}`}
                    aria-label="Modifier les exercices"
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-ink-300"
                  >
                    <ListPlus size={15} />
                  </Link>
                  <button
                    onClick={() => {
                      setDraft(t.name);
                      setEditing(t.id);
                    }}
                    aria-label="Renommer"
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-ink-300"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirming(t.id)}
                    aria-label="Supprimer"
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-ink-400"
                  >
                    <Trash2 size={15} />
                  </button>
                  <Link
                    href={`/seance/composer?preset=${t.id}`}
                    aria-label="Lancer"
                    className="press grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-white"
                  >
                    <Play size={14} strokeWidth={3} className="fill-current" />
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
