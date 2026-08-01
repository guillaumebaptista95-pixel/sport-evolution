// Lectures serveur. Les policies RLS filtrent deja par utilisateur.
import { createClient } from '@/lib/supabase/server';
import type {
  Exercise,
  MuscleGroup,
  PlanDay,
  Profile,
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
