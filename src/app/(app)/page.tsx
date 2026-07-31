// Tableau de bord : objectif hebdo, volume, dernieres seances.
import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Flame, Play, Timer, TrendingUp } from 'lucide-react';
import {
  getExercises,
  getMuscleGroups,
  getOpenWorkout,
  getPlan,
  getProfile,
  getRecentWorkouts,
} from '@/lib/queries';
import { WEEKDAYS, todayWeekday } from '@/lib/plan';
import {
  fmtDateLong,
  fmtNumber,
  greeting,
  initials,
  parseDate,
  relativeDay,
  setVolume,
  todayISO,
} from '@/lib/format';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';
import ProgressRing from '@/components/ProgressRing';
import VolumeSpark from '@/components/VolumeSpark';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [profile, workouts, exercises, open, plan, muscleGroups] = await Promise.all([
    getProfile(),
    getRecentWorkouts(40),
    getExercises(),
    getOpenWorkout(),
    getPlan(),
    getMuscleGroups(),
  ]);

  const weekday = todayWeekday();
  const today = plan.find((d) => d.weekday === weekday);
  const groupBySlug = new Map(muscleGroups.map((g) => [g.slug, g]));

  const typeById = new Map(exercises.map((e) => [e.id, e.tracking_type]));
  const groupById = new Map(exercises.map((e) => [e.id, e.muscle_groups]));
  const bw = profile?.weight_kg ?? 75;

  const done = workouts.filter((w) => w.ended_at);

  // --- Semaine en cours -------------------------------------------------
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const thisWeek = done.filter((w) => parseDate(w.performed_on) >= monday);
  const weeklyGoal = profile?.weekly_goal ?? 4;

  // --- Volume par semaine (8 dernieres) ---------------------------------
  const weeks: { label: string; value: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const vol = done
      .filter((w) => {
        const d = parseDate(w.performed_on);
        return d >= start && d < end;
      })
      .reduce(
        (acc, w) =>
          acc +
          w.workout_sets.reduce(
            (a, s) => a + setVolume(s, typeById.get(s.exercise_id) ?? 'weight_reps', bw),
            0
          ),
        0
      );
    weeks.push({ label: `S-${i}`, value: Math.round(vol) });
  }

  const last30 = done.filter(
    (w) => (Date.now() - parseDate(w.performed_on).getTime()) / 86_400_000 <= 30
  );
  const volume30 = last30.reduce(
    (acc, w) =>
      acc +
      w.workout_sets.reduce(
        (a, s) => a + setVolume(s, typeById.get(s.exercise_id) ?? 'weight_reps', bw),
        0
      ),
    0
  );
  const sets30 = last30.reduce((a, w) => a + w.workout_sets.length, 0);

  // --- Serie de semaines actives ----------------------------------------
  let streak = 0;
  for (let i = 0; i < 52; i++) {
    const start = new Date(monday);
    start.setDate(monday.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const has = done.some((w) => {
      const d = parseDate(w.performed_on);
      return d >= start && d < end;
    });
    if (has) streak++;
    else if (i > 0) break;
  }

  const lastWorkout = done[0];

  return (
    <div className="pb-6 pt-4">
      {/* -------- En-tete -------- */}
      <Reveal className="mb-7 flex items-center justify-between">
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

      {/* -------- Programme du jour -------- */}
      {today?.is_rest ? (
        <Reveal delay={0.05}>
          <div className="card p-6 text-center">
            <p className="text-[32px]">🌙</p>
            <h2 className="mt-2 text-[21px] font-extrabold">Aujourd&apos;hui, c&apos;est repos</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
              Ton programme ne prevoit pas de seance. Le muscle se construit pendant la
              recuperation.
            </p>
            <Link href="/programme" className="btn-ghost mt-5 w-full">
              Modifier mon programme
            </Link>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.05}>
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-brand-500 via-brand-600 to-[#2C2270] p-5 shadow-glow">
            <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                {open ? 'Seance en cours' : `${WEEKDAYS[weekday - 1]} · programme du jour`}
              </p>
              <p className="mt-2 font-display text-[26px] font-extrabold leading-[1.1] text-white">
                {open ? 'Reprendre ou tu en etais' : today?.label || 'Seance libre'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(today?.groups ?? []).map((slug) => (
                  <span
                    key={slug}
                    className="rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold text-white"
                  >
                    {groupBySlug.get(slug)?.name ?? slug}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* -------- Par quoi tu commences -------- */}
      {!today?.is_rest && (today?.groups ?? []).length > 0 && (
        <>
          <p className="label mt-6">
            {open ? 'Continue ta seance' : 'Choisis par quoi tu commences'}
          </p>
          <Stagger className="mt-3 space-y-2.5">
            {(today?.groups ?? []).map((slug) => {
              const g = groupBySlug.get(slug);
              const count = exercises.filter((e) => e.muscle_group_id === g?.id).length;
              return (
                <StaggerItem key={slug}>
                  <Link
                    href={`/seance?groupe=${slug}`}
                    className="press card flex items-center gap-3.5 p-4"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: g?.color ?? '#6C5CE7' }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-bold">{g?.name ?? slug}</span>
                      <span className="block text-[12.5px] text-ink-300">
                        {count} exercices possibles
                      </span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-ink-500" />
                  </Link>
                </StaggerItem>
              );
            })}
          </Stagger>

          <Link href="/seance" className="btn-primary mt-3 w-full">
            <Play size={17} strokeWidth={2.6} className="fill-current" />
            {open ? 'Reprendre la seance' : 'Voir tous les exercices'}
            <ArrowUpRight size={15} />
          </Link>
        </>
      )}

      {/* -------- Objectif hebdo + stats -------- */}
      <Stagger className="mt-4 grid grid-cols-2 gap-3">
        <StaggerItem className="card col-span-1 flex flex-col items-center justify-center p-5">
          <ProgressRing value={thisWeek.length} max={weeklyGoal} />
          <p className="mt-3 text-center text-[12px] font-medium leading-tight text-ink-300">
            Cette semaine
            <br />
            <span className="text-ink-400">objectif {weeklyGoal} seances</span>
          </p>
        </StaggerItem>

        <StaggerItem className="col-span-1 grid grid-rows-2 gap-3">
          <div className="card flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime-500/15 text-lime-400">
              <Flame size={17} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="num text-[19px] font-bold leading-none">{streak}</p>
              <p className="truncate text-[11px] text-ink-400">semaines d&apos;affilee</p>
            </div>
          </div>
          <div className="card flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/20 text-brand-300">
              <Timer size={17} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="num text-[19px] font-bold leading-none">{sets30}</p>
              <p className="truncate text-[11px] text-ink-400">series sur 30 j</p>
            </div>
          </div>
        </StaggerItem>
      </Stagger>

      {/* -------- Volume -------- */}
      <Reveal delay={0.16} className="mt-4">
        <div className="card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="label">Volume total · 30 jours</p>
              <p className="num mt-1.5 text-[30px] font-extrabold leading-none">
                {fmtNumber(Math.round(volume30 / 1000))}
                <span className="ml-1 text-[15px] font-semibold text-ink-400">tonnes</span>
              </p>
            </div>
            <span className="chip !py-1.5 text-lime-400">
              <TrendingUp size={13} /> {last30.length} seances
            </span>
          </div>
          <VolumeSpark data={weeks} />
        </div>
      </Reveal>

      {/* -------- Dernieres seances -------- */}
      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Dernieres seances</h2>
        <Link href="/stats" className="press text-[13px] font-medium text-ink-400">
          Tout voir
        </Link>
      </div>

      {done.length === 0 ? (
        <div className="card mt-3 p-6 text-center">
          <p className="text-[14px] font-semibold">Aucune seance enregistree</p>
          <p className="mt-1 text-[13px] text-ink-400">
            Lance ta premiere seance, tout le reste se remplira tout seul.
          </p>
        </div>
      ) : (
        <Stagger className="mt-3 space-y-2.5">
          {done.slice(0, 6).map((w) => {
            const vol = w.workout_sets.reduce(
              (a, s) => a + setVolume(s, typeById.get(s.exercise_id) ?? 'weight_reps', bw),
              0
            );
            const groups = Array.from(
              new Set(
                w.workout_sets
                  .map((s) => groupById.get(s.exercise_id)?.name)
                  .filter(Boolean) as string[]
              )
            );
            const color =
              w.workout_sets.length > 0
                ? groupById.get(w.workout_sets[0].exercise_id)?.color ?? '#6C5CE7'
                : '#6C5CE7';

            return (
              <StaggerItem key={w.id}>
                <Link href={`/seance/${w.id}`} className="press card flex items-center gap-3.5 p-3.5">
                  <span
                    className="h-11 w-1.5 shrink-0 rounded-full"
                    style={{ background: color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-semibold">
                      {w.title || groups.slice(0, 2).join(' · ') || 'Seance'}
                    </p>
                    <p className="num mt-0.5 truncate text-[12.5px] text-ink-400">
                      {relativeDay(w.performed_on)} · {w.workout_sets.length} series ·{' '}
                      {fmtNumber(Math.round(vol))} kg
                    </p>
                  </div>
                  <ChevronRight size={17} className="shrink-0 text-ink-500" />
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {lastWorkout && (
        <p className="mt-5 text-center text-[12px] text-ink-500">
          Derniere seance {relativeDay(lastWorkout.performed_on)}
        </p>
      )}
    </div>
  );
}
