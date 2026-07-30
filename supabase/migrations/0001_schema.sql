-- =====================================================================
--  SPORT EVOLUTION — Schema initial
--  A coller dans Supabase > SQL Editor > New query > Run
-- =====================================================================

-- Etape 1 sur 2. Executer ensuite 0002_referentiel.sql.
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. PROFILS
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  full_name    text,
  avatar_url   text,
  birth_date   date,
  height_cm    numeric(5,1),
  weight_kg    numeric(5,1),
  goal         text default 'force',           -- force | hypertrophie | endurance | seche
  weekly_goal  smallint default 4,             -- nb de seances visees / semaine
  rest_seconds smallint default 120,           -- duree de repos par defaut
  unit         text default 'kg',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ---------------------------------------------------------------------
-- 2. GROUPES MUSCULAIRES (referentiel global)
-- ---------------------------------------------------------------------
create table if not exists public.muscle_groups (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  color       text not null default '#6C5CE7',
  sort_order  smallint not null default 0
);

-- ---------------------------------------------------------------------
-- 3. EXERCICES
--    user_id null  => exercice du referentiel, visible par tous
--    user_id set   => exercice personnel
-- ---------------------------------------------------------------------
create table if not exists public.exercises (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade,
  slug             text not null,
  name             text not null,
  muscle_group_id  uuid references public.muscle_groups(id) on delete set null,
  secondary        text[] default '{}',
  equipment        text default 'machine',   -- machine | barre | halteres | poulie | poids-du-corps | elastique
  -- Comment on mesure une serie :
  --   weight_reps  -> poids + repetitions   (cas standard)
  --   bodyweight   -> repetitions seules    (tractions, dips)
  --   assisted     -> aide en kg + reps     (tractions assistees : plus l'aide baisse, mieux c'est)
  --   time         -> duree en secondes     (wall sit, hold dips)
  --   weighted_time-> poids + duree         (wall sit leste)
  tracking_type    text not null default 'weight_reps',
  animation_key    text not null default 'generic',
  instructions     text[] default '{}',
  tips             text[] default '{}',
  is_unilateral    boolean default false,
  sort_order       smallint default 0,
  archived         boolean default false,
  created_at       timestamptz default now(),
  unique nulls not distinct (user_id, slug)
);

create index if not exists exercises_group_idx on public.exercises(muscle_group_id);
create index if not exists exercises_user_idx  on public.exercises(user_id);

-- ---------------------------------------------------------------------
-- 4. SEANCES
-- ---------------------------------------------------------------------
create table if not exists public.workouts (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text,
  performed_on date not null default (now() at time zone 'utc')::date,
  started_at   timestamptz default now(),
  ended_at     timestamptz,
  notes        text,
  feeling      smallint,                     -- 1 a 5
  created_at   timestamptz default now()
);

create index if not exists workouts_user_date_idx on public.workouts(user_id, performed_on desc);

-- ---------------------------------------------------------------------
-- 5. SERIES  (le coeur du suivi : une ligne = une serie)
-- ---------------------------------------------------------------------
create table if not exists public.workout_sets (
  id               uuid primary key default uuid_generate_v4(),
  workout_id       uuid not null references public.workouts(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  exercise_id      uuid not null references public.exercises(id) on delete cascade,
  exercise_order   smallint not null default 0,   -- ordre de l'exercice dans la seance
  set_index        smallint not null default 1,   -- numero de la serie
  weight_kg        numeric(6,2),
  reps             smallint,
  duration_seconds smallint,
  assist_kg        numeric(6,2),                  -- aide (tractions assistees)
  rpe              numeric(3,1),
  is_warmup        boolean default false,
  is_pr            boolean default false,
  notes            text,
  performed_at     timestamptz default now()
);

create index if not exists sets_workout_idx  on public.workout_sets(workout_id);
create index if not exists sets_user_ex_idx  on public.workout_sets(user_id, exercise_id, performed_at desc);

-- ---------------------------------------------------------------------
-- 6. MODELES DE SEANCE (routines)
-- ---------------------------------------------------------------------
create table if not exists public.routines (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      text default '#6C5CE7',
  created_at timestamptz default now()
);

create table if not exists public.routine_exercises (
  id          uuid primary key default uuid_generate_v4(),
  routine_id  uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position    smallint not null default 0,
  target_sets smallint default 3,
  target_reps smallint default 10
);

-- =====================================================================
--  VUES DE REPORTING
-- =====================================================================

-- Volume par seance.
-- security_invoker : la vue applique les policies RLS de l'appelant.
create or replace view public.v_workout_volume with (security_invoker = true) as
select
  w.id            as workout_id,
  w.user_id,
  w.performed_on,
  count(distinct s.exercise_id)                                as exercises_count,
  count(s.id)                                                  as sets_count,
  coalesce(sum(s.reps), 0)                                     as total_reps,
  coalesce(sum(coalesce(s.weight_kg, 0) * coalesce(s.reps, 0)), 0)::numeric(12,2) as volume_kg,
  extract(epoch from (w.ended_at - w.started_at))::int          as duration_seconds
from public.workouts w
left join public.workout_sets s on s.workout_id = w.id and s.is_warmup = false
group by w.id;

-- Meilleure performance par exercice (1RM estime, formule Epley)
create or replace view public.v_exercise_records with (security_invoker = true) as
select
  s.user_id,
  s.exercise_id,
  max(s.weight_kg)                                                       as max_weight_kg,
  max(s.reps)                                                            as max_reps,
  max(s.duration_seconds)                                                as max_duration_seconds,
  max(coalesce(s.weight_kg, 0) * (1 + coalesce(s.reps, 0)::numeric / 30))::numeric(8,2) as estimated_1rm,
  max(s.performed_at)                                                    as last_performed_at,
  count(*)                                                               as total_sets
from public.workout_sets s
group by s.user_id, s.exercise_id;

-- =====================================================================
--  ROW LEVEL SECURITY
-- =====================================================================

alter table public.profiles          enable row level security;
alter table public.muscle_groups     enable row level security;
alter table public.exercises         enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_sets      enable row level security;
alter table public.routines          enable row level security;
alter table public.routine_exercises enable row level security;

-- Profils : chacun le sien
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Groupes musculaires : lecture pour tous les connectes
drop policy if exists "muscle_groups_read" on public.muscle_groups;
create policy "muscle_groups_read" on public.muscle_groups for select using (auth.role() = 'authenticated');

-- Exercices : referentiel lisible par tous + exercices perso
drop policy if exists "exercises_read" on public.exercises;
create policy "exercises_read" on public.exercises for select
  using (user_id is null or user_id = auth.uid());
drop policy if exists "exercises_write_own" on public.exercises;
create policy "exercises_write_own" on public.exercises for insert with check (user_id = auth.uid());
drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own" on public.exercises for update using (user_id = auth.uid());
drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own" on public.exercises for delete using (user_id = auth.uid());

-- Seances / series / routines : strictement prives
drop policy if exists "workouts_all_own" on public.workouts;
create policy "workouts_all_own" on public.workouts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "sets_all_own" on public.workout_sets;
create policy "sets_all_own" on public.workout_sets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "routines_all_own" on public.routines;
create policy "routines_all_own" on public.routines for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "routine_ex_all_own" on public.routine_exercises;
create policy "routine_ex_all_own" on public.routine_exercises for all
  using (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.routines r where r.id = routine_id and r.user_id = auth.uid()));

-- =====================================================================
--  TRIGGER : creation automatique du profil a l'inscription Google
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
