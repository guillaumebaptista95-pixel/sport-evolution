// Lectures serveur. Les policies RLS filtrent deja par utilisateur.
import { createClient } from '@/lib/supabase/server';
import type {
  Exercise,
  MuscleGroup,
  PlanDay,
  Profile,
  SessionDay,
  Workout,
  WorkoutSet,
} from '@/lib/database.types';

export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  if (data) return data as Profile;

  // Filet de securite si le trigger n'a pas tourne
  const fallback = {
    id: user.id,
    email: user.email ?? null,
    full_name:
      (user.user_metadata?.full_name as string) ?? (user.user_metadata?.name as string) ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
  };
  await supabase.from('profiles').upsert(fallback);
  return fallback as Profile;
}

export async function getMuscleGroups(): Promise<MuscleGroup[]> {
  const supabase = createClient();
  const { data } = await supabase.from('muscle_groups').select('*').order('sort_order');
  return (data ?? []) as MuscleGroup[];
}

export async function getExercises(): Promise<Exercise[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('exercises')
    .select('*, muscle_groups(*)')
    .eq('archived', false)
    .order('sort_order');
  return (data ?? []) as Exercise[];
}

export async function getExerciseBySlug(slug: string): Promise<Exercise | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('exercises')
    .select('*, muscle_groups(*)')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Exercise) ?? null;
}

export interface WorkoutWithSets extends Workout {
  workout_sets: WorkoutSet[];
}

export async function getRecentWorkouts(limit = 12): Promise<WorkoutWithSets[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workouts')
    .select('*, workout_sets(*)')
    .order('performed_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as WorkoutWithSets[];
}

export async function getWorkout(id: string): Promise<WorkoutWithSets | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workouts')
    .select('*, workout_sets(*)')
    .eq('id', id)
    .maybeSingle();
  return (data as WorkoutWithSets) ?? null;
}

/** Toutes les series depuis une date, pour le reporting. */
export async function getSetsSince(sinceISO: string): Promise<
  Array<WorkoutSet & { workouts: { performed_on: string } | null }>
> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workout_sets')
    .select('*, workouts!inner(performed_on)')
    .gte('workouts.performed_on', sinceISO)
    .order('performed_at', { ascending: true });
  return (data ?? []) as Array<WorkoutSet & { workouts: { performed_on: string } | null }>;
}

/** Historique complet d'un exercice. */
export async function getExerciseHistory(exerciseId: string): Promise<
  Array<WorkoutSet & { workouts: { performed_on: string } | null }>
> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workout_sets')
    .select('*, workouts(performed_on)')
    .eq('exercise_id', exerciseId)
    .order('performed_at', { ascending: true });
  return (data ?? []) as Array<WorkoutSet & { workouts: { performed_on: string } | null }>;
}

/** Derniere performance connue pour chaque exercice (pour pre-remplir la saisie). */
export async function getLastPerformances(): Promise<Record<string, WorkoutSet[]>> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workout_sets')
    .select('*')
    .order('performed_at', { ascending: false })
    .limit(600);

  const byExercise: Record<string, WorkoutSet[]> = {};
  const seenWorkout: Record<string, string> = {};

  for (const s of (data ?? []) as WorkoutSet[]) {
    if (!seenWorkout[s.exercise_id]) seenWorkout[s.exercise_id] = s.workout_id;
    if (seenWorkout[s.exercise_id] !== s.workout_id) continue;
    (byExercise[s.exercise_id] ||= []).push(s);
  }

  for (const k of Object.keys(byExercise)) {
    byExercise[k].sort((a, b) => a.set_index - b.set_index);
  }
  return byExercise;
}

/** Programme de la semaine, toujours 7 lignes triees du lundi au dimanche. */
export async function getPlan(): Promise<PlanDay[]> {
  const supabase = createClient();
  const { data } = await supabase.from('plan_days').select('*').order('weekday');
  const rows = (data ?? []) as PlanDay[];
  if (rows.length === 7) return rows;

  // Filet de securite si le trigger n'a pas tourne
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return rows;

  const defaults: Array<Pick<PlanDay, 'weekday' | 'groups' | 'label' | 'is_rest'>> = [
    { weekday: 1, groups: ['dos', 'pectoraux', 'triceps'], label: 'Haut du corps', is_rest: false },
    { weekday: 2, groups: [], label: 'Repos', is_rest: true },
    { weekday: 3, groups: ['jambes', 'epaules'], label: 'Jambes et epaules', is_rest: false },
    { weekday: 4, groups: [], label: 'Repos', is_rest: true },
    { weekday: 5, groups: ['dos', 'pectoraux', 'biceps'], label: 'Haut du corps', is_rest: false },
    { weekday: 6, groups: [], label: 'Repos', is_rest: true },
    { weekday: 7, groups: [], label: 'Repos', is_rest: true },
  ];
  const missing = defaults.filter((d) => !rows.some((r) => r.weekday === d.weekday));
  if (missing.length) {
    await supabase.from('plan_days').upsert(missing.map((d) => ({ ...d, user_id: user.id })));
    const { data: again } = await supabase.from('plan_days').select('*').order('weekday');
    return (again ?? []) as PlanDay[];
  }
  return rows;
}

/**
 * Historique regroupe par journee, du plus recent au plus ancien.
 * Une journee peut contenir plusieurs seances : elles sont fusionnees,
 * puisque l'utilisateur raisonne en jours et non en sessions.
 */
export async function getSessionDays(limit = 30): Promise<SessionDay[]> {
  const [workouts, exercises] = await Promise.all([getRecentWorkouts(120), getExercises()]);
  const exById = new Map(exercises.map((e) => [e.id, e]));

  const byDate = new Map<string, SessionDay>();

  for (const w of workouts) {
    if (!w.ended_at) continue;
    const date = w.performed_on;
    let day = byDate.get(date);
    if (!day) {
      day = { date, workoutIds: [], entries: [], totalSets: 0, volumeKg: 0 };
      byDate.set(date, day);
    }
    day.workoutIds.push(w.id);

    const ordered = [...w.workout_sets].sort(
      (a, b) => a.exercise_order - b.exercise_order || a.set_index - b.set_index
    );

    for (const s of ordered) {
      const ex = exById.get(s.exercise_id);
      if (!ex) continue;
      let entry = day.entries.find((e) => e.exerciseId === s.exercise_id);
      if (!entry) {
        entry = {
          exerciseId: ex.id,
          name: ex.name,
          color: ex.muscle_groups?.color ?? '#6C5CE7',
          groupName: ex.muscle_groups?.name ?? '',
          trackingType: ex.tracking_type,
          machine: ex.machine ?? 'aucun',
          sets: [],
        };
        day.entries.push(entry);
      }
      entry.sets.push(s);
      day.totalSets += 1;
    }
  }

  // Volume calcule une fois toutes les series rassemblees
  const { setVolume } = await import('@/lib/format');
  const profile = await getProfile();
  const bw = profile?.weight_kg ?? 75;
  for (const day of byDate.values()) {
    day.volumeKg = day.entries.reduce(
      (a, e) => a + e.sets.reduce((x, s) => x + setVolume(s, e.trackingType, bw), 0),
      0
    );
  }

  return Array.from(byDate.values())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}

/** Jours distincts d'entrainement depuis le lundi de la semaine en cours. */
export async function getTrainedDaysThisWeek(): Promise<number> {
  const workouts = await getRecentWorkouts(60);
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const days = new Set<string>();
  for (const w of workouts) {
    if (!w.ended_at) continue;
    const [y, m, d] = w.performed_on.slice(0, 10).split('-').map(Number);
    if (new Date(y, m - 1, d) >= monday) days.add(w.performed_on.slice(0, 10));
  }
  return days.size;
}

export interface WeekDot {
  letter: string;
  date: string;
  done: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** Les 7 jours de la semaine en cours, avec ceux ou l'on s'est entraine. */
export async function getWeekStrip(): Promise<WeekDot[]> {
  const workouts = await getRecentWorkouts(60);
  const trained = new Set(
    workouts.filter((w) => w.ended_at).map((w) => w.performed_on.slice(0, 10))
  );

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const letters = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return letters.map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    return {
      letter,
      date: iso,
      done: trained.has(iso),
      isToday: d.getTime() === now.getTime(),
      isFuture: d.getTime() > now.getTime(),
    };
  });
}

/**
 * Nombre de semaines consecutives avec au moins une seance.
 * La semaine en cours ne casse pas la serie tant qu'elle est en cours :
 * si elle est encore vide, on repart de la semaine derniere.
 */
export async function getWeekStreak(): Promise<number> {
  const workouts = await getRecentWorkouts(200);
  const dates = workouts
    .filter((w) => w.ended_at)
    .map((w) => {
      const [y, m, d] = w.performed_on.slice(0, 10).split('-').map(Number);
      return new Date(y, m - 1, d).getTime();
    });
  if (dates.length === 0) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  const hasWeek = (offset: number) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() - offset * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return dates.some((t) => t >= start.getTime() && t < end.getTime());
  };

  let streak = 0;
  let i = hasWeek(0) ? 0 : 1;
  const from = i;
  while (hasWeek(i) && i < 260) {
    streak++;
    i++;
  }
  // Aucune seance ni cette semaine ni la precedente : la serie est rompue.
  return from === 1 && streak === 0 ? 0 : streak;
}

export interface RecordRow {
  slug: string;
  name: string;
  color: string;
  value: number;
  unit: string;
  date: string;
}

/** Meilleures performances, toutes seances confondues. */
export async function getTopRecords(limit = 3): Promise<RecordRow[]> {
  const [workouts, exercises] = await Promise.all([getRecentWorkouts(200), getExercises()]);
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const { estimate1RM } = await import('@/lib/format');

  const best = new Map<string, RecordRow>();

  for (const w of workouts) {
    if (!w.ended_at) continue;
    for (const s of w.workout_sets) {
      const ex = exById.get(s.exercise_id);
      if (!ex) continue;
      const isTime = ex.tracking_type === 'time' || ex.tracking_type === 'weighted_time';
      const isCount = ex.tracking_type === 'assisted' || ex.tracking_type === 'bodyweight';
      const value = isTime
        ? (s.duration_seconds ?? 0)
        : isCount
          ? (s.reps ?? 0)
          : estimate1RM(s.weight_kg ?? 0, s.reps ?? 0);
      if (value <= 0) continue;

      const prev = best.get(ex.id);
      if (!prev || value > prev.value) {
        best.set(ex.id, {
          slug: ex.slug,
          name: ex.name,
          color: ex.muscle_groups?.color ?? '#6C5CE7',
          value: Math.round(value),
          unit: isTime ? 's' : isCount ? 'reps' : 'kg',
          date: w.performed_on,
        });
      }
    }
  }

  return Array.from(best.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Photos de machines de l'utilisateur, indexees par cle de machine. */
export async function getMachinePhotos(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.from('machine_photos').select('machine, path');
  const out: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{ machine: string; path: string }>) {
    const { data: pub } = supabase.storage.from('machines').getPublicUrl(row.path);
    out[row.machine] = pub.publicUrl;
  }
  return out;
}

/** Derniere seance ouverte, s'il y en a une. */
export async function getOpenWorkout(): Promise<WorkoutWithSets | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('workouts')
    .select('*, workout_sets(*)')
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as WorkoutWithSets) ?? null;
}
