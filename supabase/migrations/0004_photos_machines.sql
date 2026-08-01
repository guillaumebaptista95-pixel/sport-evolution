-- =====================================================================
--  SPORT EVOLUTION — Photos des machines
--  Chaque utilisateur photographie les machines de SA salle.
--  La photo est rattachee a la machine (et non a l'exercice) : une seule
--  photo de la poulie haute sert aux 4 exercices qui l'utilisent.
--  A executer APRES 0003_planning.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Table de correspondance machine -> photo
-- ---------------------------------------------------------------------
create table if not exists public.machine_photos (
  user_id    uuid not null references auth.users(id) on delete cascade,
  machine    text not null,               -- cle d'illustration : 'poulie-haute', 'rack-squat'...
  path       text not null,               -- chemin dans le bucket de stockage
  updated_at timestamptz default now(),
  primary key (user_id, machine)
);

alter table public.machine_photos enable row level security;

drop policy if exists "machine_photos_all_own" on public.machine_photos;
create policy "machine_photos_all_own" on public.machine_photos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. Espace de stockage des images
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('machines', 'machines', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Lecture publique : les images s'affichent sans jeton, elles ne contiennent
-- rien de sensible. L'ecriture reste strictement limitee a son propre dossier.
drop policy if exists "machines_public_read" on storage.objects;
create policy "machines_public_read" on storage.objects for select
  using (bucket_id = 'machines');

drop policy if exists "machines_insert_own" on storage.objects;
create policy "machines_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'machines'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "machines_update_own" on storage.objects;
create policy "machines_update_own" on storage.objects for update to authenticated
  using (
    bucket_id = 'machines'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "machines_delete_own" on storage.objects;
create policy "machines_delete_own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'machines'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
