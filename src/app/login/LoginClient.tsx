'use client';

// Ecran d'accueil : connexion Google, demonstration animee.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import ExerciseAnimation from '@/components/ExerciseAnimation';

const HIGHLIGHTS = [
  { k: 'Suivi', v: 'Chaque serie, chaque kilo' },
  { k: 'Progression', v: 'Records et 1RM automatiques' },
  { k: 'Technique', v: 'Le mouvement anime pour chaque exercice' },
];

export default function LoginClient({ next, error }: { next?: string; error?: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(
    error ? "La connexion n'a pas abouti. Reessaie." : null
  );

  async function signInWithGoogle() {
    setLoading(true);
    setMsg(null);
    const supabase = createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL
        : window.location.origin;

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next ?? '/')}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (err) {
      setMsg(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <div className="mesh pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(255,255,255,0.06),transparent_55%)]" />

      <div className="app-shell relative flex min-h-[100dvh] flex-col px-6 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3 pt-10"
        >
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <span className="font-display text-lg font-extrabold text-white">E</span>
          </div>
          <span className="font-display text-[15px] font-bold tracking-tight">Sport Evolution</span>
        </motion.div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto mb-8 w-full max-w-[300px]"
          >
            <div className="absolute inset-0 -z-10 rounded-full bg-brand-500/20 blur-3xl" />
            <ExerciseAnimation animationKey="pullup" color="#8A78FF" className="w-full" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-[38px] font-extrabold leading-[1.03]"
          >
            Ta progression,
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-lime-400 bg-clip-text text-transparent">
              serie par serie.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4 max-w-[330px] text-[15px] leading-relaxed text-ink-300"
          >
            Le carnet qui remplace ton tableur. Tu notes, il analyse, tu progresses.
          </motion.p>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } } }}
            className="mt-8 space-y-2.5"
          >
            {HIGHLIGHTS.map((h) => (
              <motion.li
                key={h.k}
                variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                className="flex items-center gap-3"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                <span className="text-[14px] text-ink-200">
                  <span className="font-semibold text-white">{h.k}.</span> {h.v}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="space-y-3"
        >
          {msg && (
            <p className="rounded-2xl border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-[13px] text-coral-400">
              {msg}
            </p>
          )}

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="press flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-semibold text-ink-950 disabled:opacity-60"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-400 border-t-ink-950" />
            ) : (
              <GoogleMark />
            )}
            {loading ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          <p className="px-2 text-center text-[12px] leading-relaxed text-ink-400">
            En continuant, tu acceptes que tes seances soient stockees de maniere privee sur ton
            compte. Personne d&apos;autre n&apos;y a acces.
          </p>
        </motion.div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.6.28-3.14.77-4.59l-7.98-6.19A23.94 23.94 0 000 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
