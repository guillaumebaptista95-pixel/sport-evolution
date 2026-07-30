// Reporting : volume, regularite, repartition, records.
import Link from 'next/link';
import { Award, ChevronRight } from 'lucide-react';
import { getExercises, getProfile, getRecentWorkouts } from '@/lib/queries';
import {
  estimate1RM,
  fmtNumber,
  fmtWeight,
  parseDate,
  relativeDay,
  setVolume,
} from '@/lib/format';
import ProgressChart from '@/components/ProgressChart';
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

  /* ---- Volume par semaine (12 dernieres) ---- */
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const weekly: { label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
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
        (a, w) =>
          a +
          w.workout_sets.reduce(
            (x, s) => x + setVolume(s, exById.get(s.exercise_id)?.tracking_type ?? 'weight_reps', bw),
            0
          ),
        0
      );
    weekly.push({
      label: `${start.getDate()}/${start.getMonth() + 1}`,
      value: Math.round(vol / 100) / 10,
    });
  }

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
        <div className="card p-4 pb-2">
          <p className="label mb-1">Volume hebdomadaire (centaines de kg)</p>
          <ProgressChart data={weekly} color="#8A78FF" height={200} />
        </div>
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
