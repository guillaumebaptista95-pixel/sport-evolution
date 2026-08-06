-- =====================================================================
--  SPORT EVOLUTION — Composition de la seance
--  1. Un nombre d'exercices attendu par groupe musculaire et par jour
--  2. La liste des exercices choisis, memorisee sur la seance
--  A executer APRES 0004_photos_machines.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Quotas par groupe : { "pectoraux": 2, "triceps": 2 }
-- ---------------------------------------------------------------------
alter table public.plan_days
  add column if not exists targets jsonb not null default '{}'::jsonb;

-- Valeur de depart : 2 exercices pour chaque groupe deja programme
update public.plan_days p
set targets = (
  select coalesce(jsonb_object_agg(g, 2), '{}'::jsonb)
  from unnest(p.groups) as g
)
where p.targets = '{}'::jsonb and array_length(p.groups, 1) > 0;

-- ---------------------------------------------------------------------
-- 2. Exercices retenus au moment de composer la seance
--    Sert a afficher la seance dans l'ordre choisi, meme avant que la
--    premiere serie ne soit enregistree.
-- ---------------------------------------------------------------------
alter table public.workouts
  add column if not exists planned_exercise_ids uuid[] not null default '{}';

-- ---------------------------------------------------------------------
-- 3. Le trigger de creation de compte pose aussi les quotas par defaut
-- ---------------------------------------------------------------------
create or replace function public.seed_default_plan()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.plan_days (user_id, weekday, groups, label, is_rest, targets) values
    (new.id, 1, array['dos','pectoraux','triceps'], 'Haut du corps', false,
     '{"dos":2,"pectoraux":2,"triceps":2}'::jsonb),
    (new.id, 2, array[]::text[], 'Repos', true, '{}'::jsonb),
    (new.id, 3, array['jambes','epaules'], 'Jambes et epaules', false,
     '{"jambes":3,"epaules":2}'::jsonb),
    (new.id, 4, array[]::text[], 'Repos', true, '{}'::jsonb),
    (new.id, 5, array['dos','pectoraux','biceps'], 'Haut du corps', false,
     '{"dos":2,"pectoraux":2,"biceps":2}'::jsonb),
    (new.id, 6, array[]::text[], 'Repos', true, '{}'::jsonb),
    (new.id, 7, array[]::text[], 'Repos', true, '{}'::jsonb)
  on conflict (user_id, weekday) do nothing;
  return new;
end;
$$;
