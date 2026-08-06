'use client';

// Le panneau « La machine » : la photo prise par l'utilisateur si elle existe,
// sinon l'illustration. Le bouton ouvre directement l'appareil photo sur mobile.
import { useRef, useState } from 'react';
import { Camera, Loader2, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { saveMachinePhoto } from '@/app/actions';
import MachineArt, { MACHINE_LABEL, type MachineKey } from '@/components/MachineArt';

const BUCKET = 'machines';

/**
 * Visuels de machines fournis avec l'application, dans public/machines/.
 * Ils servent de valeur par defaut tant que l'utilisateur n'a pas photographie
 * la machine de sa propre salle : sa photo passe toujours devant.
 * On liste les cles explicitement pour ne jamais demander un fichier absent.
 */
const BUNDLED: Partial<Record<MachineKey, string>> = {
  // 'tirage-vertical': '/machines/tirage-vertical.webp',
  // 'rowing-assis': '/machines/rowing-assis.webp',
  // 'poulie-haute': '/machines/poulie-haute.webp',
  // 'chest-press': '/machines/chest-press.webp',
  // 'presse-cuisses': '/machines/presse-cuisses.webp',
};

/** Redimensionne et compresse avant envoi : une photo de telephone fait 3 a 8 Mo. */
async function compress(file: File, maxSide = 1400, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality)
  );
}

export default function MachinePanel({
  machine,
  color,
  photoUrl,
  label = true,
}: {
  machine: MachineKey;
  color: string;
  photoUrl?: string | null;
  label?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(photoUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Photo de l'utilisateur en priorite, puis visuel fourni, puis illustration.
  const shown = url ?? BUNDLED[machine] ?? null;
  const isOwnPhoto = Boolean(url);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setErr(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Session expiree, reconnecte-toi.');

      const blob = await compress(file);
      const path = `${user.id}/${machine}.jpg`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
      if (upErr) throw upErr;

      await saveMachinePhoto(machine, path);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setUrl(`${data.publicUrl}?v=${Date.now()}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "L'envoi a echoue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card relative grid place-items-center overflow-hidden">
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />

      {shown ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shown} alt={MACHINE_LABEL[machine]} className="h-full w-full object-cover" />
      ) : (
        <MachineArt kind={machine} color={color} className="w-full px-2 pt-2 pb-6" />
      )}

      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-sm">
          <Loader2 size={22} className="animate-spin text-white" />
        </div>
      )}

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="press absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-black/55 backdrop-blur disabled:opacity-50"
        aria-label={url ? 'Remplacer la photo' : 'Prendre la machine en photo'}
      >
        {isOwnPhoto ? <RotateCcw size={15} /> : <Camera size={16} />}
      </button>

      {label && (
        <span className="absolute inset-x-0 bottom-1.5 px-2 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-ink-400">
          {MACHINE_LABEL[machine]}
        </span>
      )}

      {!shown && !busy && (
        <span className="absolute inset-x-0 bottom-6 px-3 text-center text-[10.5px] leading-tight text-ink-500">
          Prends-la en photo a ta salle
        </span>
      )}

      {err && (
        <p className="absolute inset-x-1 bottom-1 rounded-lg bg-coral-500/20 px-2 py-1 text-center text-[10px] text-coral-400">
          {err}
        </p>
      )}
    </div>
  );
}
