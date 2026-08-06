/** Modes de suivi disponibles pour un exercice. */
export type TrackingType =
  | 'weight_reps'
  | 'bodyweight'
  | 'assisted'
  | 'time'
  | 'weighted_time';

export interface MuscleGroup {
  id: string;
  slug: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface Exercise {
  id: string;
  user_id: string | null;
  slug: string;
  name: string;
  muscle_group_id: string | null;
  secondary: string[] | null;
  equipment: string | null;
  tracking_type: TrackingType;
  animation_key: string;
  instructions: string[] | null;
  tips: string[] | null;
  is_unilateral: boolean | null;
  sort_order: number | null;
  archived: boolean | null;
  created_at: string;
  /** Cle d'illustration du materiel, voir components/MachineArt. */
  machine: string;
  muscle_groups?: MuscleGroup | null;
}

/** Une journee du programme hebdomadaire (1 = lundi ... 7 = dimanche). */
export interface PlanDay {
  user_id: string;
  weekday: number;
  groups: string[];
  label: string | null;
  is_rest: boolean;
  /** Nombre d'exercices attendu par groupe : { "pectoraux": 2, "triceps": 2 } */
  targets: Record<string, number>;
  updated_at: string;
}

/** Une journee d'entrainement telle qu'affichee dans l'historique. */
export interface SessionDay {
  date: string;
  workoutIds: string[];
  entries: Array<{
    exerciseId: string;
    name: string;
    color: string;
    groupName: string;
    trackingType: TrackingType;
    machine: string;
    sets: WorkoutSet[];
  }>;
  totalSets: number;
  volumeKg: number;
}

export interface Workout {
  id: string;
  user_id: string;
  title: string | null;
  performed_on: string;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  feeling: number | null;
  /** Exercices retenus au moment de composer la seance, dans l'ordre. */
  planned_exercise_ids: string[];
  created_at: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  user_id: string;
  exercise_id: string;
  exercise_order: number;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  assist_kg: number | null;
  rpe: number | null;
  is_warmup: boolean | null;
  is_pr: boolean | null;
  notes: string | null;
  performed_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  weekly_goal: number | null;
  rest_seconds: number | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Les clients Supabase ne sont volontairement pas generiques : les resultats
 * sont convertis explicitement vers les interfaces ci-dessus dans lib/queries.
 * Pour un typage genere automatiquement :
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */
