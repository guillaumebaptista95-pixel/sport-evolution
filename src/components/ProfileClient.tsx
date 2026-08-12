'use client';

// Espace membre : mesures, reglages et deconnexion.
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, FileUp, LogOut, Ruler, Target, Timer, Weight, type LucideIcon } from 'lucide-react';
import type { Profile } from '@/lib/database.types';
import { updateProfile } from '@/app/actions';
import { fmtDateShort, initials } from '@/lib/format';
import Stepper from '@/components/Stepper';
import { Reveal } from '@/components/Reveal';

const GOALS = [
  { key: 'force', label: 'Force' },
  { key: 'hypertrophie', label: 'Volume' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'seche', label: 'Seche' },
];

export default function ProfileClient({
  profile,
  stats,
}: {
  profile: Profile | null;
  stats: { workouts: number; sets: number; since: string | null };
}) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const [weight, setWeight] = useState(profile?.weight_kg ?? 75);
  const [height, setHeight] = useState(profile?.height_cm ?? 178);
  const [weeklyGoal, setWeeklyGoal] = useState(profile?.weekly_goal ?? 4);
  const [rest, setRest] = useState(profile?.rest_seconds ?? 120);
  const [goal, setGoal] = useState(profile?.goal ?? 'force');

  function save() {
    start(async () => {
      await updateProfile({
        weight_kg: weight,
        height_cm: height,
        weekly_goal: weeklyGoal,
        rest_seconds: rest,
        goal,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    });
  }

  return (
    <div className="pb-8 pt-4">
      <Reveal className="mb-6 flex items-center gap-4">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-16 w-16 rounded-3xl border border-white/10 object-cover"
          />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500 to-brand-700 text-[18px] font-bold">
            {initials(profile?.full_name, profile?.email)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[21px] font-extrabold leading-tight">
            {profile?.full_name ?? 'Athlete'}
          </h1>
          <p className="truncate text-[13px] text-ink-400">{profile?.email}</p>
        </div>
      </Reveal>

      <Reveal delay={0.05} className="mb-5">
        <div className="card grid grid-cols-3 divide-x divide-white/[0.06]">
          <div className="px-3 py-4 text-center">
            <p className="num text-[19px] font-extrabold leading-none">{stats.workouts}</p>
            <p className="mt-1 text-[10.5px] text-ink-400">seances</p>
          </div>
          <div className="px-3 py-4 text-center">
            <p className="num text-[19px] font-extrabold leading-none">{stats.sets}</p>
            <p className="mt-1 text-[10.5px] text-ink-400">series</p>
          </div>
          <div className="px-3 py-4 text-center">
            <p className="num text-[19px] font-extrabold leading-none">
              {stats.since ? fmtDateShort(stats.since) : '—'}
            </p>
            <p className="mt-1 text-[10.5px] text-ink-400">depuis</p>
          </div>
        </div>
      </Reveal>

      <h2 className="mb-3 text-[17px] font-bold">Mes mesures</h2>
      <div className="mb-5 grid grid-cols-2 gap-3">
        <Stepper label="Poids de corps" value={weight} onChange={setWeight} step={0.5} min={30} max={250} suffix="kg" decimals={weight % 1 === 0 ? 0 : 1} />
        <Stepper label="Taille" value={height} onChange={setHeight} step={1} min={120} max={230} suffix="cm" />
      </div>

      <h2 className="mb-3 text-[17px] font-bold">Mes reglages</h2>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stepper label="Seances / semaine" value={weeklyGoal} onChange={setWeeklyGoal} step={1} min={1} max={14} />
        <Stepper label="Repos par defaut" value={rest} onChange={setRest} step={15} min={30} max={480} suffix="s" />
      </div>

      <div className="card mb-5 p-4">
        <p className="label mb-3">Objectif principal</p>
        <div className="grid grid-cols-4 gap-2">
          {GOALS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGoal(g.key)}
              className={
                'press rounded-xl border px-2 py-2.5 text-[12.5px] font-semibold transition-colors ' +
                (goal === g.key
                  ? 'border-brand-400/60 bg-brand-500/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-ink-300')
              }
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {saved ? (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2"
          >
            <Check size={17} strokeWidth={3} /> Enregistre
          </motion.span>
        ) : pending ? (
          'Enregistrement...'
        ) : (
          'Enregistrer mes reglages'
        )}
      </button>

      <div className="mt-8 space-y-2.5">
        <InfoRow Icon={Weight} label="Poids de corps" value={`${weight} kg`} />
        <InfoRow Icon={Ruler} label="Taille" value={`${height} cm`} />
        <InfoRow Icon={Target} label="Objectif hebdo" value={`${weeklyGoal} seances`} />
        <InfoRow Icon={Timer} label="Repos" value={`${rest} s`} />
      </div>

      <Link href="/import" className="press btn-ghost mt-4 w-full">
        <FileUp size={17} />
        Importer mon historique
      </Link>

      <form action="/auth/signout" method="post" className="mt-8">
        <button type="submit" className="btn-ghost w-full !text-coral-400">
          <LogOut size={17} />
          Se deconnecter
        </button>
      </form>

      <p className="mt-6 text-center text-[11.5px] text-ink-600">
        Sport Evolution · tes donnees restent privees
      </p>
    </div>
  );
}

function InfoRow({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="card-flat flex items-center gap-3 px-4 py-3">
      <Icon size={16} className="shrink-0 text-ink-400" />
      <span className="flex-1 text-[13.5px] text-ink-300">{label}</span>
      <span className="num text-[13.5px] font-semibold">{value}</span>
    </div>
  );
}
