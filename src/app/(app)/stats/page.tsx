// Reporting : volume, regularite, repartition, records.
import Link from 'next/link';
import { Award, ChevronRight } from 'lucide-react';
import { getExercises, getProfile, getRecentWorkouts } from '@/lib/queries';
import {
  estimate1RM,
  fmtDateShort,
  fmtNumber,
  parseDate,
  fmtWeight,
  relativeDay,
  setVolume,
} from '@/lib/format';
import LoadProgress, { type ExerciseSerie } from '@/components/LoadProgress';
import ActivityGrid from '@/components/ActivityGrid';
import { Reveal, Stagger, StaggerItem } from '@/components/Reveal';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Statistiques — Sport Evolution' };

export default async function StatsPage() {
  const [workouts, exercises, profile] = await Promise.all([
    getRecentWorkouts(200),
    getExercises(),
    getProfile(),
  ]);

  const exById = new Map(exercises.map((e) => [e.id, e]));
  const bw = profile?.weight_kg ?? 75;
  const done = workouts.filter((w) => w.ended_at);

  /* ---- Evolution par exercice : charge et repetitions ---- */
  const byEx = new Map<
    string,
    { name: string; color: string; type: string; days: Map<string, { w: number; r: number; d: number }> }
  >();
  for (const w of done) {
    for (const s of w.workout_sets) {
      const ex = exById.get(s.exercise_id);
      if (!ex) continue;
      const e =
        byEx.get(ex.id) ??
        {
          name: ex.name,
          color: ex.muscle_groups?.color ?? '#6C5CE7',
          type: ex.tracking_type,
          days: new Map<string, { w: number; r: number; d: number }>(),
        };
      const cur = e.days.get(w.performed_on) ?? { w: 0, r: 0, d: 0 };
      cur.w = Math.max(cur.w, s.weight_kg ?? 0);
      cur.r = Math.max(cur.r, s.reps ?? 0);
      cur.d = Math.max(cur.d, s.duration_seconds ?? 0);
      e.days.set(w.performed_on, cur);
      byEx.set(ex.id, e);
    }
  }

  const series: ExerciseSerie[] = Array.from(byEx.entries())
    .filter(([, e]) => e.days.size >= 2)
    .sort((a, b) => b[1].days.size - a[1].days.size)
    .map(([id, e]) => ({
      id,
      name: e.name,
      color: e.color,
      type: e.type,
      points: Array.from(e.days.entries())
        .sort((a, b) => (a[0] < b[0] ? -1 : 1))
        .slice(-20)
        .map(([date, v]) => ({
          label: fmtDateShort(date),
          weight: v.w,
          reps: v.r,
          seconds: v.d,
        })),
    }));

  /* ---- Repartition par groupe musculaire (90 j) ---- */
  const recent = done.filter(
    (w) => (Date.now() - parseDate(w.performed_on).getTime()) / 86_400_000 <= 90
  );
  const perGroup = new Map<string, { name: string; color: string; sets: number }>();
  for (const w of recent) {
    for (const s of w.workout_sets) {
      const g = exById.get(s.exercise_id)?.muscle_groups;
      if (!g) continue;
      const cur = perGroup.get(g.id) ?? { name: g.name, color: g.color, sets: 0 };
      cur.sets += 1;
      perGroup.set(g.id, cur);
    }
  }
  const groupList = Array.from(perGroup.values()).sort((a, b) => b.sets - a.sets);
  const groupTotal = groupList.reduce((a, g) => a + g.sets, 0) || 1;

  /* ---- Records ---- */
  const records = new Map<
    string,
    { name: string; slug: string; color: string; value: number; date: string; unit: string }
  >();
  for (const w of done) {
    for (const s of w.workout_sets) {
      const ex = exById.get(s.exercise_id);
      if (!ex) continue;
      const isTime = ex.tracking_type === 'time' || ex.tracking_type === 'weighted_time';
      const value = isTime
        ? s.duration_seconds ?? 0
        : ex.tracking_type === 'assisted' || ex.tracking_type === 'bodyweight'
          ? s.reps ?? 0
          : estimate1RM(s.weight_kg ?? 0, s.reps ?? 0);
      if (value <= 0) continue;
      const prev = records.get(ex.id);
      if (!prev || value > prev.value) {
        records.set(ex.id, {
          name: ex.name,
          slug: ex.slug,
          color: ex.muscle_groups?.color ?? '#6C5CE7',
          value,
          date: w.performed_on,
          unit: isTime ? 's' : ex.tracking_type === 'weight_reps' ? 'kg' : 'reps',
        });
      }
    }
  }
  const topRecords = Array.from(records.values()).sort((a, b) => b.value - a.value).slice(0, 8);

  /* ---- Grille d'activite ---- */
  const activity = done.map((w) => w.performed_on);

  const totalVolume = done.reduce(
    (a, w) =>
      a +
      w.workout_sets.reduce(
        (x, s) => x + setVolume(s, exById.get(s.exercise_id)?.tracking_type ?? 'weight_reps', bw),
        0
      ),
    0
  );
  const totalSets = done.reduce((a, w) => a + w.workout_sets.length, 0);

  return (
    <div className="pb-8 pt-4">
      <Reveal className="mb-5">
        <h1 className="text-[26px] font-extrabold leading-tight">Statistiques</h1>
        <p className="mt-0.5 text-[13px] text-ink-400">Ta progression, chiffres a l&apos;appui</p>
      </Reveal>

      <Stagger className="mb-4 grid grid-cols-3 gap-2.5">
        <StaggerItem className="card px-3 py-4">
          <p className="num text-[19px] font-extrabold leading-none">{done.length}</p>
          <p className="mt-1 text-[10.5px] text-ink-400">seances</p>
        </StaggerItem>
        <StaggerItem className="card px-3 py-4">
          <p className="num text-[19px] font-extrabold leading-none">{fmtNumber(totalSets)}</p>
          <p className="mt-1 text-[10.5px] text-ink-400">series</p>
        </StaggerItem>
        <StaggerItem className="card px-3 py-4">
          <p className="num text-[19px] font-extrabold leading-none">
            {fmtNumber(Math.round(totalVolume / 1000))}
            <span className="text-[11px] font-semibold text-ink-400">t</span>
          </p>
          <p className="mt-1 text-[10.5px] text-ink-400">souleves</p>
        </StaggerItem>
      </Stagger>

      <Reveal delay={0.08} className="mb-4">
        <p className="label mb-2">Progression par exercice</p>
        <LoadProgress series={series} />
      </Reveal>

      <Reveal delay={0.12} className="mb-4">
        <div className="card p-4">
          <p className="label mb-3">Regularite · 16 dernieres semaines</p>
          <ActivityGrid dates={activity} />
        </div>
      </Reveal>

      {groupList.length > 0 && (
        <Reveal delay={0.16} className="mb-4">
          <div className="card p-4">
            <p className="label mb-3">Repartition par groupe · 90 jours</p>
            <div className="mb-4 flex h-2.5 overflow-hidden rounded-full">
              {groupList.map((g) => (
                <div
                  key={g.name}
                  style={{ width: `${(g.sets / groupTotal) * 100}%`, background: g.color }}
                />
              ))}
            </div>
            <div className="space-y-2.5">
              {groupList.map((g) => (
                <div key={g.name} className="flex items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
                  <span className="flex-1 text-[13.5px] font-medium">{g.name}</span>
                  <span className="num text-[13px] text-ink-400">
                    {Math.round((g.sets / groupTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {topRecords.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 flex items-center gap-2 text-[17px] font-bold">
            <Award size={17} className="text-gold-400" />
            Records personnels
          </h2>
          <Stagger className="space-y-2.5">
            {topRecords.map((r) => (
              <StaggerItem key={r.slug}>
                <Link href={`/exercices/${r.slug}`} className="press card flex items-center gap-3 p-3.5">
                  <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: r.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">{r.name}</p>
                    <p className="text-[11.5px] text-ink-500">{relativeDay(r.date)}</p>
                  </div>
                  <span className="num shrink-0 text-[15px] font-bold" style={{ color: r.color }}>
                    {r.unit === 'kg' ? fmtWeight(r.value) : `${Math.round(r.value)} ${r.unit}`}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ink-600" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      )}

      {done.length === 0 && (
        <div className="card mt-4 p-6 text-center">
          <p className="text-[14px] font-semibold">Rien a analyser pour l&apos;instant</p>
          <p className="mt-1 text-[13px] text-ink-400">
            Les graphiques se construisent au fil de tes seances.
          </p>
        </div>
      )}
    </div>
  );
}
