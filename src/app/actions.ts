'use server';

// Server Actions : seances, series, profil, exercices personnels.
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/format';

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifie');
  return { supabase, user };
}

/* ------------------------------------------------------------------ */
/*  Seances                                                            */
/* ------------------------------------------------------------------ */

export async function startWorkout(title?: string) {
  const { supabase, user } = await requireUser();

  const { data: open } = await supabase
    .from('workouts')
    .select('id')
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) return { id: open.id as string };

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      title: title ?? null,
      performed_on: todayISO(),
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
  return { id: data!.id as string };
}

/**
 * Compose la seance : enregistre la liste d'exercices retenus et ouvre la
 * seance si elle ne l'est pas deja.
 */
export async function composeWorkout(exerciseIds: string[], title?: string) {
  const { supabase, user } = await requireUser();

  const { data: open } = await supabase
    .from('workouts')
    .select('id')
    .is('ended_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (open) {
    const { error } = await supabase
      .from('workouts')
      .update({ planned_exercise_ids: exerciseIds, title: title ?? null })
      .eq('id', open.id);
    if (error) throw new Error(error.message);
    revalidatePath('/', 'layout');
    return { id: open.id as string };
  }

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      title: title ?? null,
      performed_on: todayISO(),
      started_at: new Date().toISOString(),
      planned_exercise_ids: exerciseIds,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
  return { id: data!.id as string };
}

export async function finishWorkout(workoutId: string, notes?: string, feeling?: number) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from('workouts')
    .update({
      ended_at: new Date().toISOString(),
      notes: notes ?? null,
      feeling: feeling ?? null,
    })
    .eq('id', workoutId);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

export async function deleteWorkout(workoutId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('workouts').delete().eq('id', workoutId);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

export async function renameWorkout(workoutId: string, title: string) {
  const { supabase } = await requireUser();
  await supabase.from('workouts').update({ title }).eq('id', workoutId);
  revalidatePath('/', 'layout');
}

/* ------------------------------------------------------------------ */
/*  Series                                                             */
/* ------------------------------------------------------------------ */

export interface SetPayload {
  workoutId: string;
  exerciseId: string;
  setIndex: number;
  exerciseOrder?: number;
  weightKg?: number | null;
  reps?: number | null;
  durationSeconds?: number | null;
  assistKg?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  notes?: string | null;
}

export async function saveSet(p: SetPayload) {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      workout_id: p.workoutId,
      user_id: user.id,
      exercise_id: p.exerciseId,
      set_index: p.setIndex,
      exercise_order: p.exerciseOrder ?? 0,
      weight_kg: p.weightKg ?? null,
      reps: p.reps ?? null,
      duration_seconds: p.durationSeconds ?? null,
      assist_kg: p.assistKg ?? null,
      rpe: p.rpe ?? null,
      is_warmup: p.isWarmup ?? false,
      notes: p.notes ?? null,
      performed_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/seance');
  return data;
}

export async function updateSet(setId: string, patch: Partial<SetPayload>) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from('workout_sets')
    .update({
      weight_kg: patch.weightKg ?? null,
      reps: patch.reps ?? null,
      duration_seconds: patch.durationSeconds ?? null,
      assist_kg: patch.assistKg ?? null,
    })
    .eq('id', setId);
  if (error) throw new Error(error.message);
  revalidatePath('/seance');
}

export async function deleteSet(setId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from('workout_sets').delete().eq('id', setId);
  if (error) throw new Error(error.message);
  revalidatePath('/seance');
}

/* ------------------------------------------------------------------ */
/*  Profil                                                             */
/* ------------------------------------------------------------------ */

export async function updateProfile(patch: {
  full_name?: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  goal?: string;
  weekly_goal?: number;
  rest_seconds?: number;
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/* ------------------------------------------------------------------ */
/*  Photos des machines                                                */
/* ------------------------------------------------------------------ */

export async function saveMachinePhoto(machine: string, path: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('machine_photos').upsert({
    user_id: user.id,
    machine,
    path,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/* ------------------------------------------------------------------ */
/*  Programme hebdomadaire                                             */
/* ------------------------------------------------------------------ */

export async function savePlanDay(
  weekday: number,
  groups: string[],
  label: string,
  targets: Record<string, number> = {}
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from('plan_days').upsert({
    user_id: user.id,
    weekday,
    groups,
    label,
    targets,
    is_rest: groups.length === 0,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/* ------------------------------------------------------------------ */
/*  Exercices personnels                                               */
/* ------------------------------------------------------------------ */

export async function createExercise(p: {
  name: string;
  muscleGroupId: string;
  trackingType: string;
  equipment: string;
  animationKey?: string;
}) {
  const { supabase, user } = await requireUser();
  const slug =
    p.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 6);

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      user_id: user.id,
      slug,
      name: p.name,
      muscle_group_id: p.muscleGroupId,
      tracking_type: p.trackingType,
      equipment: p.equipment,
      animation_key: p.animationKey ?? 'generic',
      sort_order: 900,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/exercices');
  return data;
}
