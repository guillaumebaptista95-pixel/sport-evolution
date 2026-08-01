'use client';

// Ecran d'accueil : connexion par lien magique, sans mot de passe.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ExerciseAnimation from '@/components/ExerciseAnimation';

const HIGHLIGHTS = [
  { k: 'Programme', v: 'Ta semaine definie une fois pour toutes' },
  { k: 'Suivi', v: 'Chaque serie, chaque kilo' },
  { k: 'Technique', v: 'Le mouvement et la machine, en image' },
];

export default function LoginClient({ next, error }: { next?: string; error?: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(
    error ? "Le lien n'a pas fonctionne. Demande-en un nouveau." : null
  );

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setMsg(null);

    const supabase = createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_SITE_URL
        : window.location.origin;

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next ?? '/')}`,
      },
    });

    setLoading(false);
    if (err) setMsg(err.message);
    else setSent(true);
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
            className="relative mx-auto mb-8 w-full max-w-[280px]"
          >
            <div className="absolute inset-0 -z-10 rounded-full bg-brand-500/20 blur-3xl" />
            <ExerciseAnimation animationKey="pullup" color="#8A78FF" className="w-full" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-[36px] font-extrabold leading-[1.05]"
          >
            Ta progression,
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-lime-400 bg-clip-text text-transparent">
              serie par serie.
            </span>
          </motion.h1>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}
            className="mt-6 space-y-2.5"
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
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {sent ? (
            <div className="card p-6 text-center">
              <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-lime-500/15 text-lime-400">
                <MailCheck size={22} />
              </span>
              <p className="text-[17px] font-bold">Regarde tes mails</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-300">
                On vient d&apos;envoyer un lien a <span className="text-white">{email}</span>. Clique
                dessus depuis ce telephone et tu seras connecte.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setMsg(null);
                }}
                className="press mt-4 text-[13px] font-semibold text-brand-300"
              >
                Utiliser une autre adresse
              </button>
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-3">
              {msg && (
                <p className="rounded-2xl border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-[13px] text-coral-400">
                  {msg}
                </p>
              )}

              <label className="block">
                <span className="label">Ton adresse e-mail</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="prenom@exemple.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[16px] outline-none transition-colors placeholder:text-ink-500 focus:border-brand-400/60"
                />
              </label>

              <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    Recevoir mon lien
                    <ArrowRight size={17} strokeWidth={2.6} />
                  </>
                )}
              </button>

              <p className="px-2 text-center text-[12px] leading-relaxed text-ink-400">
                Pas de mot de passe a retenir. Tu recois un lien, tu cliques, c&apos;est fait. Tes
                seances restent privees, personne d&apos;autre n&apos;y a acces.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}
