// Lecture d'un export de tableur (CSV) et rapprochement avec le referentiel
// d'exercices. Volontairement tolerant : les tableaux perso sont rarement propres.

export interface RawRow {
  date: string;
  exercise: string;
  weight: number | null;
  reps: number | null;
  seconds: number | null;
  sets: number;
}

export interface MappedRow extends RawRow {
  exerciseId: string | null;
  matchedName: string | null;
}

/** Enleve accents, ponctuation et casse : « Développé couché » -> « developpe couche ». */
export function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Decoupe une ligne CSV en tenant compte des guillemets. */
function splitLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === sep && !q) {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function toNumber(v: string): number | null {
  if (!v) return null;
  const n = parseFloat(v.replace(',', '.').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Ramene une date ecrite a la francaise, a l'americaine ou en ISO au format YYYY-MM-DD. */
export function toISODate(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

const KEYS = {
  date: ['date', 'jour', 'seance', 'day'],
  exercise: ['exercice', 'exercise', 'mouvement', 'nom', 'name'],
  weight: ['poids', 'charge', 'kg', 'weight', 'load'],
  reps: ['reps', 'repetitions', 'rep', 'repetition', 'nombre'],
  seconds: ['temps', 'duree', 'secondes', 'time', 'duration'],
  sets: ['series', 'serie', 'sets', 'set'],
};

function findCol(headers: string[], names: string[]) {
  return headers.findIndex((h) => names.some((n) => h === n || h.includes(n)));
}

/**
 * Transforme le texte d'un CSV en lignes exploitables.
 * Une ligne sans date reprend la date de la ligne precedente : c'est la mise
 * en page habituelle des tableaux de suivi.
 */
export function parseCsv(text: string): { rows: RawRow[]; error?: string } {
  const clean = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length);
  if (clean.length < 2) return { rows: [], error: 'Fichier vide ou sans donnees.' };

  const sep = (clean[0].match(/;/g) ?? []).length > (clean[0].match(/,/g) ?? []).length ? ';' : ',';
  const headers = splitLine(clean[0], sep).map(norm);

  const ci = {
    date: findCol(headers, KEYS.date),
    exercise: findCol(headers, KEYS.exercise),
    weight: findCol(headers, KEYS.weight),
    reps: findCol(headers, KEYS.reps),
    seconds: findCol(headers, KEYS.seconds),
    sets: findCol(headers, KEYS.sets),
  };

  if (ci.date < 0 || ci.exercise < 0)
    return {
      rows: [],
      error: 'Il faut au minimum une colonne date et une colonne exercice.',
    };

  const rows: RawRow[] = [];
  let lastDate = '';

  for (const line of clean.slice(1)) {
    const c = splitLine(line, sep);
    const d = toISODate(c[ci.date] ?? '') ?? lastDate;
    if (d) lastDate = d;
    const name = (c[ci.exercise] ?? '').trim();
    if (!d || !name) continue;

    const sets = Math.max(1, Math.min(20, Math.round(toNumber(c[ci.sets] ?? '') ?? 1)));
    rows.push({
      date: d,
      exercise: name,
      weight: ci.weight >= 0 ? toNumber(c[ci.weight]) : null,
      reps: ci.reps >= 0 ? toNumber(c[ci.reps]) : null,
      seconds: ci.seconds >= 0 ? toNumber(c[ci.seconds]) : null,
      sets,
    });
  }

  return { rows };
}

/** Rapproche chaque nom du tableau d'un exercice du referentiel. */
export function mapRows(
  rows: RawRow[],
  exercises: { id: string; name: string; slug: string }[]
): MappedRow[] {
  const index = exercises.map((e) => ({ ...e, key: norm(e.name), skey: norm(e.slug) }));

  return rows.map((r) => {
    const k = norm(r.exercise);
    let hit =
      index.find((e) => e.key === k || e.skey === k) ??
      index.find((e) => e.key.includes(k) || k.includes(e.key));

    if (!hit) {
      // dernier recours : le plus de mots en commun
      const words = k.split(' ').filter((w) => w.length > 2);
      let best = 0;
      for (const e of index) {
        const score = words.filter((w) => e.key.includes(w)).length;
        if (score > best) {
          best = score;
          hit = e;
        }
      }
      if (best === 0) hit = undefined;
    }

    return { ...r, exerciseId: hit?.id ?? null, matchedName: hit?.name ?? null };
  });
}
