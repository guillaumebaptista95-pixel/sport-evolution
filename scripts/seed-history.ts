/**
 * Injecte scripts/history.json (issu du tableur Numbers) dans Supabase.
 *
 *   1. Renseigne SUPABASE_SERVICE_ROLE_KEY et SEED_USER_EMAIL dans .env.local
 *   2. Connecte-toi une premiere fois a l'app avec ton compte Google
 *   3. npm run seed
 *
 * Le script est idempotent : il supprime d'abord les seances precedemment
 * importees (titre commencant par « Import »), puis les recree.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.SEED_USER_EMAIL;

if (!URL || !KEY || !EMAIL) {
  console.error(
    'Variables manquantes. Il faut NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et SEED_USER_EMAIL dans .env.local'
  );
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

interface RawSet {
  reps?: number;
  weight?: number;
  duration?: number;
  assist?: number;
}
interface RawExercise {
  slug: string;
  raw: string;
  sets: RawSet[];
}
interface RawSession {
  day: string;
  date: string;
  exercises: RawExercise[];
}

async function main() {
  const file = join(process.cwd(), 'scripts', 'history.json');
  const { sessions } = JSON.parse(readFileSync(file, 'utf8')) as { sessions: RawSession[] };

  // --- Utilisateur cible --------------------------------------------------
  const { data: list, error: uErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (uErr) throw uErr;
  const user = list.users.find((u) => u.email?.toLowerCase() === EMAIL!.toLowerCase());
  if (!user) {
    console.error(
      `Aucun compte trouve pour ${EMAIL}. Connecte-toi une premiere fois dans l'app, puis relance.`
    );
    process.exit(1);
  }
  console.log(`Compte cible : ${user.email}`);

  // --- Referentiel des exercices -----------------------------------------
  const { data: exos, error: eErr } = await db
    .from('exercises')
    .select('id, slug, tracking_type')
    .is('user_id', null);
  if (eErr) throw eErr;
  const bySlug = new Map(exos!.map((e) => [e.slug, e]));

  // --- Nettoyage des imports precedents -----------------------------------
  const { data: old } = await db
    .from('workouts')
    .select('id')
    .eq('user_id', user.id)
    .like('title', 'Import%');
  if (old?.length) {
    await db.from('workouts').delete().in('id', old.map((w) => w.id));
    console.log(`${old.length} seances importees precedemment supprimees.`);
  }

  // --- Insertion ----------------------------------------------------------
  let totalSets = 0;

  for (const session of sessions) {
    const { data: workout, error: wErr } = await db
      .from('workouts')
      .insert({
        user_id: user.id,
        title: `Import · jour ${session.day}`,
        performed_on: session.date,
        started_at: `${session.date}T18:00:00Z`,
        ended_at: `${session.date}T19:15:00Z`,
        notes: 'Seance importee depuis le tableur Numbers. Les dates sont approximatives.',
      })
      .select('id')
      .single();

    if (wErr) {
      console.error(`Jour ${session.day} :`, wErr.message);
      continue;
    }

    const rows: Record<string, unknown>[] = [];
    let order = 0;

    for (const ex of session.exercises) {
      const meta = bySlug.get(ex.slug);
      if (!meta) {
        console.warn(`Exercice inconnu : ${ex.slug}`);
        continue;
      }
      const isTime = meta.tracking_type === 'time' || meta.tracking_type === 'weighted_time';

      ex.sets.forEach((s, i) => {
        const reps =
          s.reps ?? (isTime ? null : s.weight !== undefined || s.assist !== undefined ? 10 : null);

        rows.push({
          workout_id: workout!.id,
          user_id: user.id,
          exercise_id: meta.id,
          exercise_order: order,
          set_index: i + 1,
          weight_kg: s.weight ?? null,
          reps,
          duration_seconds: s.duration ?? null,
          assist_kg: s.assist ?? null,
          performed_at: `${session.date}T18:${String(10 + order * 2).padStart(2, '0')}:00Z`,
          notes: i === 0 ? `Tableur : « ${ex.raw} »` : null,
        });
      });
      order++;
    }

    if (rows.length) {
      const { error: sErr } = await db.from('workout_sets').insert(rows);
      if (sErr) console.error(`Series jour ${session.day} :`, sErr.message);
      else totalSets += rows.length;
    }
  }

  console.log(`\nTermine : ${sessions.length} seances et ${totalSets} series importees.`);
  console.log(
    'Note : quand le tableur ne precisait pas le nombre de repetitions, la valeur 10 a ete utilisee. La cellule d\'origine est conservee dans les notes de la premiere serie.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
