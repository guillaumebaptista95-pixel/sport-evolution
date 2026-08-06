// Accueil : le programme du jour, l'objectif de la semaine, l'historique jour par jour.
import Link from 'next/link';
import { ArrowRight, Moon } from 'lucide-react';
import {
  getMuscleGroups,
  getOpenWorkout,
  getPlan,
  getProfile,
  getSessionDays,
  getTrainedDaysThisWeek,
} from '@/lib/queries';
import { WEEKDAYS, todayWeekday } from '@/lib/plan';
import { greeting, initials } from '@/lib/format';
import { Reveal } from '@/components/Reveal';
import ProgressRing from '@/components/ProgressRing';
import HistoryCarousel from '@/components/HistoryCarousel';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [profile, plan, muscleGroups, days, trainedDays, open] = await Promise.all([
    getProfile(),
    getPlan(),
    getMuscleGroups(),
    getSessionDays(30),
    getTrainedDaysThisWeek(),
    getOpenWorkout(),
  ]);

  const weekday = todayWeekday();
  const today = plan.find((d) => d.weekday === weekday);
  const groupBySlug = new Map(muscleGroups.map((g) => [g.slug, g]));
  const weeklyGoal = profile?.weekly_goal ?? 4;

  const targets = today?.targets ?? {};
  const totalExercises = (today?.groups ?? []).reduce(
    (a, slug) => a + (targets[slug] ?? 2),
    0
  );

  return (
    <div className="pb-6 pt-4">
      {/* -------- En-tete -------- */}
      <Reveal className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink-400">{greeting()}</p>
          <h1 className="mt-0.5 text-[26px] font-extrabold leading-tight">
            {profile?.full_name?.split(' ')[0] ?? 'Athlete'}
          </h1>
        </div>
        <Link href="/profil" className="press">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-11 w-11 rounded-2xl border border-white/10 object-cover"
            />
          ) : (
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06] text-[13px] font-bold">
              {initials(profile?.full_name, profile?.email)}
            </span>
          )}
        </Link>
      </Reveal>

      {/* -------- Le jour + l'objectif -------- */}
      <Reveal delay={0.05}>
        <div className="flex items-stretch gap-3">
          {today?.is_rest ? (
            <div className="card flex flex-1 flex-col justify-center p-5">
              <Moon size={20} className="text-ink-400" />
              <p className="mt-3 text-[19px] font-extrabold leading-tight">
                Repos
                <br />
                aujourd&apos;hui
              </p>
              <Link href="/programme" className="mt-3 text-[12.5px] font-semibold text-brand-300">
                Modifier
              </Link>
            </div>
          ) : (
            <Link
              href="/seance/composer"
              className="press relative flex flex-1 flex-col justify-between overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-brand-500 via-brand-600 to-[#2C2270] p-5 shadow-glow"
            >
              <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/60">
                  {WEEKDAYS[weekday - 1]}
                </p>
                <p className="mt-2 font-display text-[24px] font-extrabold leading-[1.1] text-white">
                  {today?.label || 'Seance libre'}
                </p>
              </div>
              <p className="relative mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-white">
                {open ? 'Reprendre' : `Composer ma seance`}
                <ArrowRight size={15} />
              </p>
            </Link>
          )}

          <div className="card grid w-[124px] shrink-0 place-items-center p-4">
            <ProgressRing value={trainedDays} max={weeklyGoal} size={80} stroke={8} />
            <p className="mt-2 text-center text-[11px] leading-tight text-ink-400">
              jours cette
              <br />
              semaine
            </p>
          </div>
        </div>
      </Reveal>

      {!today?.is_rest && (today?.groups ?? []).length > 0 && (
        <Reveal delay={0.1} className="mt-3">
          <div className="flex flex-wrap gap-2">
            {(today?.groups ?? []).map((slug) => {
              const g = groupBySlug.get(slug);
              return (
                <span
                  key={slug}
                  className="chip"
                  style={{ borderColor: `${g?.color ?? '#6C5CE7'}55`, background: `${g?.color ?? '#6C5CE7'}1A` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: g?.color }} />
                  {g?.name ?? slug}
                  <span className="num text-ink-400">{targets[slug] ?? 2}</span>
                </span>
              );
            })}
            <span className="chip !text-ink-400">{totalExercises} exercices</span>
          </div>
        </Reveal>
      )}

      {/* -------- Historique jour par jour -------- */}
      <Reveal delay={0.15} className="mt-8">
        <HistoryCarousel days={days} />
      </Reveal>
    </div>
  );
}
