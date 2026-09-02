# À faire : les séances types

## Le besoin

Pouvoir enregistrer une séance habituelle sous un nom — « Dos / Biceps », « Pecs / Triceps » —
et la relancer en un clic n'importe quel jour, y compris un jour de repos ou un jour dont
le programme ne correspond pas. Aujourd'hui il faut recomposer la séance exercice par
exercice à chaque fois que le planning ne colle pas.

## 1. Base de données — migration `0007_seances_types.sql`

```sql
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

alter table public.workout_templates enable row level security;

create policy "templates: lecture" on public.workout_templates
  for select using (auth.uid() = user_id);
create policy "templates: ecriture" on public.workout_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists workout_templates_user_idx
  on public.workout_templates (user_id, sort_order);
```

## 2. Requêtes — `src/lib/queries.ts`

```ts
export interface WorkoutTemplate {
  id: string; name: string; exercise_ids: string[];
  color: string | null; sort_order: number;
}

export async function getTemplates(): Promise<WorkoutTemplate[]>
```
Trier par `sort_order` puis `created_at`.

## 3. Actions — `src/app/actions.ts`

```ts
saveTemplate(name: string, exerciseIds: string[], color?: string)   // upsert
renameTemplate(id: string, name: string)
deleteTemplate(id: string)
```
Toutes avec `requireUser()` et `revalidatePath('/', 'layout')`, comme les autres.

## 4. Écran de composition — `SessionBuilder.tsx`

**En haut, sous la date** : une rangée de pastilles horizontales, une par séance type,
dans le même style que les pastilles de la page Progrès. Un appui **remplace** la sélection
courante par les exercices du modèle et déplie automatiquement les groupes concernés
(réutiliser l'état `showAll` existant).

**En bas, à côté du bouton de validation** : un bouton « Enregistrer comme séance type »
qui ouvre un champ de nom et appelle `saveTemplate` avec les exercices cochés.
S'il existe déjà un modèle du même nom, on le met à jour.

Point d'attention : les exercices d'un modèle peuvent appartenir à des groupes absents
du jour. Il faut donc forcer `showAll = true` à la sélection, sinon les exercices cochés
seraient invisibles.

## 5. Accueil — `src/app/(app)/page.tsx`

Sur la carte « Repos aujourd'hui », remplacer le lien unique par les pastilles des séances
types, plus « Séance libre » en dernier. C'est le cas d'usage principal : jour de repos au
planning, mais on va quand même s'entraîner et on sait déjà quoi faire.

Même logique dans le cas non-repos : les séances types restent accessibles en second rideau,
sous la carte du jour.

## 6. Gestion

Une section « Mes séances types » dans l'onglet **Programme**, sous le planning hebdomadaire :
liste des modèles, renommer, supprimer, réordonner. Pas d'écran dédié, ça vit avec le planning.

## Amorce utile

Proposer à la première ouverture de créer un modèle à partir de chaque jour non-repos du
planning existant — « Lundi · Dos/Biceps » devient une séance type du même nom. L'utilisateur
a ses modèles sans rien saisir.
