-- ---------------------------------------------------------------------
--  SEANCES TYPES
--  Une seance habituelle enregistree sous un nom, relancable en un clic
--  n'importe quel jour, meme si le planning dit autre chose.
-- ---------------------------------------------------------------------
create table if not exists public.workout_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  exercise_ids  uuid[] not null default '{}',
  color         text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Un seul modele par nom et par personne : reenregistrer met a jour.
create unique index if not exists workout_templates_user_name_idx
  on public.workout_templates (user_id, lower(name));

create index if not exists workout_templates_user_idx
  on public.workout_templates (user_id, sort_order, created_at);

alter table public.workout_templates enable row level security;

drop policy if exists "templates lecture" on public.workout_templates;
create policy "templates lecture" on public.workout_templates
  for select using (auth.uid() = user_id);

drop policy if exists "templates ecriture" on public.workout_templates;
create policy "templates ecriture" on public.workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
