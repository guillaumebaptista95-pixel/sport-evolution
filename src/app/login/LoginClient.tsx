'use client';

// Accueil : connexion Google, ou creation de compte avec mot de passe choisi
// directement. Aucun e-mail a attendre pour entrer dans l'application.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ExerciseAnimation from '@/components/ExerciseAnimation';
import { cn } from '@/lib/format';

type Mode = 'signup' | 'signin';

const HIGHLIGHTS = [
  { k: 'Programme', v: 'Ta semaine definie une fois pour toutes' },
  { k: 'Suivi', v: 'Chaque serie, chaque kilo' },
  { k: 'Technique', v: 'Le mouvement et la machine, en image' },
];

function messageFr(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Un compte existe deja avec cette adresse. Choisis « J’ai deja un compte ».';
  if (m.includes('password should be at least'))
    return 'Le mot de passe doit faire au moins 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return "Cette adresse e-mail n'est pas valide.";
  if (m.includes('provider is not enabled') || m.includes('unsupported provider'))
    return "La connexion Google n'est pas encore activee sur ce projet.";
  if (m.includes('rate limit')) return 'Trop de tentatives. Reessaie dans quelques minutes.';
  return raw;
}

export default function LoginClient({ next, error }: { next?: string; error?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [google, setGoogle] = useState(false);
  const [msg, setMsg] = useState<string | null>(
    error ? 'La connexion a echoue. Reessaie.' : null
  );

  const origin = () =>
    process.env.NEXT_PUBLIC_SITE_URL && process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_SITE_URL
      : window.location.origin;

  async function withGoogle() {
    setGoogle(true);
    setMsg(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${origin()}/auth/callback?next=${encodeURIComponent(next ?? '/')}` },
    });
    if (err) {
      setMsg(messageFr(err.message));
      setGoogle(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = createClient();

    if (mode === 'signup') {
      const full = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: full,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });
      setLoading(false);
      if (err) return setMsg(messageFr(err.message));
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);
      if (err) return setMsg(messageFr(err.message));
    }

    router.push(next ?? '/');
    router.refresh();
  }

  const isSignup = mode === 'signup';

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <div className="mesh pointer-events-none absolute inset-0" />

      <div className="app-shell relative flex min-h-[100dvh] flex-col px-6 pb-10">
        <div className="flex items-center gap-3 pt-9">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <span className="font-display text-lg font-extrabold text-white">E</span>
          </div>
          <span className="font-display text-[15px] font-bold tracking-tight">Sport Evolution</span>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-4 w-full max-w-[200px]"
        >
          <div className="absolute inset-0 -z-10 rounded-full bg-brand-500/20 blur-3xl" />
          <ExerciseAnimation animationKey="pullup" color="#8A78FF" className="w-full" hd />
        </motion.div>

        <h1 className="mt-1 text-[30px] font-extrabold leading-[1.08]">
          Ta progression,
          <br />
          <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-lime-400 bg-clip-text text-transparent">
            serie par serie.
          </span>
        </h1>

        <ul className="mt-4 space-y-2">
          {HIGHLIGHTS.map((h) => (
            <li key={h.k} className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500" />
              <span className="text-[13.5px] text-ink-200">
                <span className="font-semibold text-white">{h.k}.</span> {h.v}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-7">
          {/* Google en premier : c'est le chemin le plus court */}
          <button
            onClick={withGoogle}
            disabled={google}
            className="press flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-semibold text-ink-950 disabled:opacity-60"
          >
            {google ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-400 border-t-ink-950" />
            ) : (
              <GoogleMark />
            )}
            Continuer avec Google
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[12px] font-medium text-ink-500">ou avec ton e-mail</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* Bascule creation / connexion */}
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
            {(['signup', 'signin'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setMsg(null);
                }}
                className={cn(
                  'press rounded-xl py-2.5 text-[13.5px] font-semibold transition-colors',
                  mode === m ? 'bg-white/[0.10] text-white' : 'text-ink-400'
                )}
              >
                {m === 'signup' ? 'Creer mon compte' : "J'ai deja un compte"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {msg && (
              <p className="rounded-2xl border border-coral-500/30 bg-coral-500/10 px-4 py-3 text-[13px] leading-relaxed text-coral-400">
                {msg}
              </p>
            )}

            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Prenom"
                  value={firstName}
                  onChange={setFirstName}
                  autoComplete="given-name"
                  required
                />
                <Field
                  label="Nom"
                  value={lastName}
                  onChange={setLastName}
                  autoComplete="family-name"
                  required
                />
              </div>
            )}

            <Field
              label="Adresse e-mail"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />

            <label className="block">
              <span className="label">Mot de passe</span>
              <div className="relative mt-2">
                <input
                  type={show ? 'text' : 'password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? '6 caracteres minimum' : ''}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 pr-12 text-[16px] outline-none transition-colors placeholder:text-ink-500 focus:border-brand-400/60"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Masquer' : 'Afficher'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-ink-400"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>
                  {isSignup ? 'Creer mon compte' : 'Me connecter'}
                  <ArrowRight size={17} strokeWidth={2.6} />
                </>
              )}
            </button>

            <p className="px-2 text-center text-[12px] leading-relaxed text-ink-400">
              {isSignup
                ? 'Ton compte est cree immediatement, sans e-mail a attendre. Tes seances restent privees.'
                : 'Content de te revoir.'}
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        type={type}
        inputMode={type === 'email' ? 'email' : undefined}
        autoComplete={autoComplete}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[16px] outline-none transition-colors placeholder:text-ink-500 focus:border-brand-400/60"
      />
    </label>
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
