-- =====================================================================
--  SPORT EVOLUTION — Planning hebdomadaire + illustration des machines
--  A executer APRES 0002_referentiel.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quelle machine illustre chaque exercice
-- ---------------------------------------------------------------------
alter table public.exercises
  add column if not exists machine text not null default 'aucun';

update public.exercises set machine = v.machine
from (values
  ('tractions',                   'cage-traction'),
  ('tractions-rapides',           'cage-traction'),
  ('tractions-pause-haut',        'cage-traction'),
  ('row-machine-vertical',        'tirage-vertical'),
  ('row-machine-horizontal',      'rowing-assis'),
  ('pull-machine',                'poulie-haute'),
  ('tirage-poulie-haute-serre',   'poulie-haute'),
  ('tirage-poulies-cotes-dos',    'poulie-haute'),
  ('chest-press',                 'chest-press'),
  ('developpe-incline',           'banc-incline'),
  ('developpe-decline',           'banc-decline'),
  ('dips',                        'station-dips'),
  ('dips-negatives',              'station-dips'),
  ('hold-dips',                   'station-dips'),
  ('extension-triceps-cable',     'poulie-haute'),
  ('curl-halteres',               'halteres'),
  ('epaules-machine',             'barre-rack'),
  ('face-pull',                   'poulie-haute'),
  ('squat',                       'rack-squat'),
  ('fentes-marchees',             'halteres'),
  ('wall-sit',                    'mur'),
  ('leg-press',                   'presse-cuisses'),
  ('press-legere',                'presse-cuisses'),
  ('leg-curl-allonge',            'leg-curl'),
  ('mollet-assist-squat',         'mollets')
) as v(slug, machine)
where public.exercises.slug = v.slug and public.exercises.user_id is null;

-- ---------------------------------------------------------------------
-- 2. Planning de la semaine
--    Une ligne par jour de la semaine (1 = lundi ... 7 = dimanche).
--    Le planning se repete a l'identique chaque semaine tant qu'il n'est
--    pas modifie : il n'y a donc aucune date, seulement le jour.
-- ---------------------------------------------------------------------
create table if not exists public.plan_days (
  user_id   uuid not null references auth.users(id) on delete cascade,
  weekday   smallint not null check (weekday between 1 and 7),
  groups    text[] not null default '{}',   -- slugs de muscle_groups
  label     text,                           -- nom libre : « Haut du corps »...
  is_rest   boolean not null default false,
  updated_at timestamptz default now(),
  primary key (user_id, weekday)
);

alter table public.plan_days enable row level security;

drop policy if exists "plan_days_all_own" on public.plan_days;
create policy "plan_days_all_own" on public.plan_days for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. Planning par defaut a la creation d'un compte
--    Repris du tableur : trois seances completes par semaine.
-- ---------------------------------------------------------------------
create or replace function public.seed_default_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.plan_days (user_id, weekday, groups, label, is_rest) values
    (new.id, 1, array['dos','pectoraux','triceps'], 'Haut du corps',   false),
    (new.id, 2, array[]::text[],                    'Repos',           true),
    (new.id, 3, array['jambes','epaules'],          'Jambes et epaules', false),
    (new.id, 4, array[]::text[],                    'Repos',           true),
    (new.id, 5, array['dos','pectoraux','biceps'],  'Haut du corps',   false),
    (new.id, 6, array[]::text[],                    'Repos',           true),
    (new.id, 7, array[]::text[],                    'Repos',           true)
  on conflict (user_id, weekday) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_seed_plan on public.profiles;
create trigger on_profile_created_seed_plan
  after insert on public.profiles
  for each row execute function public.seed_default_plan();

-- Pour les comptes deja crees avant cette migration
insert into public.plan_days (user_id, weekday, groups, label, is_rest)
select p.id, d.weekday, d.groups, d.label, d.is_rest
from public.profiles p
cross join (values
  (1, array['dos','pectoraux','triceps'], 'Haut du corps',     false),
  (2, array[]::text[],                    'Repos',             true),
  (3, array['jambes','epaules'],          'Jambes et epaules', false),
  (4, array[]::text[],                    'Repos',             true),
  (5, array['dos','pectoraux','biceps'],  'Haut du corps',     false),
  (6, array[]::text[],                    'Repos',             true),
  (7, array[]::text[],                    'Repos',             true)
) as d(weekday, groups, label, is_rest)
on conflict (user_id, weekday) do nothing;
