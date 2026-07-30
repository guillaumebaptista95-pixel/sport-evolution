#!/usr/bin/env python3
"""
Convertit le tableur « Sport Evolution.numbers » en scripts/history.json.

Usage :
    pip install numbers-parser
    python3 scripts/parse-numbers.py "/chemin/vers/Sport Evolution.numbers"

Le fichier produit est ensuite injecte dans Supabase par `npm run seed`.
"""
import json
import re
import sys
from datetime import date, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Correspondance ligne du tableur -> slug de l'exercice dans la base
# ---------------------------------------------------------------------------
SLUGS = {
    "tractions": "tractions",
    "tractions rapides": "tractions-rapides",
    "tractions pause 3 sec en haut": "tractions-pause-haut",
    "row machine vertical": "row-machine-vertical",
    "row machine horizontal": "row-machine-horizontal",
    "2 alteres biceps droits": "curl-halteres",
    "pull machine": "pull-machine",
    "dips": "dips",
    "dips negatives": "dips-negatives",
    "hold dips": "hold-dips",
    "chess press": "chest-press",
    "extension triceps cable": "extension-triceps-cable",
    "epaules machine": "epaules-machine",
    "squat": "squat",
    "fentes marches": "fentes-marchees",
    "wall sit": "wall-sit",
    "leg press": "leg-press",
    "mollet assist squat": "mollet-assist-squat",
    "leg curl allonges": "leg-curl-allonge",
    "press legere": "press-legere",
    "face pull": "face-pull",
    "tirage poulie haute prise serre": "tirage-poulie-haute-serre",
    "developpe decline": "developpe-decline",
    "developpe incline": "developpe-incline",
    "tirage poulies cotes dos": "tirage-poulies-cotes-dos",
}

TIME_SLUGS = {"hold-dips", "wall-sit"}
ASSISTED_SLUGS = {"tractions", "tractions-rapides", "tractions-pause-haut"}


def strip_accents(s: str) -> str:
    table = str.maketrans("àâäéèêëïîôöùûüçÀÂÄÉÈÊËÏÎÔÖÙÛÜÇ", "aaaeeeeiioouuucAAAEEEEIIOOUUUC")
    return s.translate(table)


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", strip_accents(s).lower()).strip()


TOKEN = re.compile(
    r"(?P<n>\d+)\s*[xX*]\s*(?P<v>\d+(?:[.,]\d+)?)\s*(?P<u>kg|sec|min|reps?)?"
    r"|(?P<w>\d+(?:[.,]\d+)?)\s*(?P<u2>kg|sec|min)",
    re.IGNORECASE,
)

# Numbers convertit parfois « 5-4-2 » en date : on ne reconnait que ce format exact.
DATEISH = re.compile(r"^0*(\d{1,4})-0*(\d{1,2})-0*(\d{1,2})\s+\d{2}:\d{2}:\d{2}$")


def num(x: str) -> float:
    return float(x.replace(",", "."))


def parse_cell(raw: str, slug: str):
    """Retourne une liste de series a partir d'une cellule du tableur."""
    s = (raw or "").strip()
    if not s or s in {"/", "—", "-"}:
        return []

    lowered = norm(s)
    is_time = slug in TIME_SLUGS
    is_assist = slug in ASSISTED_SLUGS and "aide" in lowered

    # --- Cas 1 : Numbers a transforme « 5-4-2 » en date -------------------
    m = DATEISH.match(s)
    if m:
        return [{"reps": int(g)} for g in m.groups() if int(g) > 0]

    # --- Cas 2 : Numbers a transforme « 4-4-3-4 » en nombre ---------------
    if re.fullmatch(r"\d+(\.0)?", s):
        digits = s.split(".")[0]
        if len(digits) >= 3 and all(1 <= int(c) <= 9 for c in digits):
            return [{"reps": int(c)} for c in digits]

    # --- Cas 3 : suite de repetitions « 8-9-9-10-8 » ----------------------
    if re.fullmatch(r"[\d\s-]+", s) and "-" in s:
        vals = [int(v) for v in re.findall(r"\d+", s)]
        if vals and all(v <= 40 for v in vals):
            return [{"reps": v} for v in vals]

    # --- Cas 4 : notation « NxM », « NxMKg », « NxMsec »... ---------------
    groups = []
    for mt in TOKEN.finditer(s):
        if mt.group("n"):
            n = int(mt.group("n"))
            v = num(mt.group("v"))
            u = (mt.group("u") or "").lower()
            if n > 12:  # « 4x15 25Kg » mal ordonne : n = reps
                n, v = int(v), float(n)
            if u == "kg":
                groups.append({"count": n, "weight": v})
            elif u == "sec":
                groups.append({"count": n, "duration": int(v)})
            elif u == "min":
                groups.append({"count": n, "duration": int(v * 60)})
            else:
                if is_time:
                    groups.append({"count": n, "duration": int(v)})
                else:
                    groups.append({"count": n, "reps": int(v)})
        else:
            w = num(mt.group("w"))
            u2 = (mt.group("u2") or "").lower()
            key = "weight" if u2 == "kg" else "duration"
            val = w if u2 == "kg" else (int(w * 60) if u2 == "min" else int(w))
            if groups and key not in groups[-1]:
                groups[-1][key] = val
            else:
                groups.append({"count": 1, key: val})

    sets = []
    for g in groups:
        c = min(int(g.get("count", 1)), 10)
        for _ in range(c):
            item = {}
            if "reps" in g:
                item["reps"] = int(g["reps"])
            if "duration" in g and is_time:
                item["duration"] = int(g["duration"])
            if "weight" in g:
                if is_assist:
                    item["assist"] = float(g["weight"])
                else:
                    item["weight"] = float(g["weight"])
            if item:
                sets.append(item)

    return sets[:10]


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "Sport Evolution.numbers"
    from numbers_parser import Document  # import tardif : dependance optionnelle

    doc = Document(src)
    table = doc.sheets[0].tables[0]
    rows = [["" if c is None else str(c) for c in r] for r in table.rows(values_only=True)]

    header = rows[0]
    ncols = len(header)

    # Colonnes reellement utilisees (celles qui portent un numero de jour)
    day_cols = [i for i in range(1, ncols) if header[i].strip()]

    # Dates synthetiques : une seance tous les 3-4 jours, la derniere il y a 2 jours
    today = date.today()
    n = len(day_cols)
    dates = [(today - timedelta(days=2 + int(round((n - 1 - k) * 3.5)))).isoformat() for k in range(n)]

    sessions = []
    for k, col in enumerate(day_cols):
        entries = []
        for r in rows[1:]:
            name = norm(r[0])
            slug = SLUGS.get(name)
            if not slug or col >= len(r):
                continue
            raw = r[col]
            parsed = parse_cell(raw, slug)
            if parsed:
                entries.append({"slug": slug, "raw": raw.strip(), "sets": parsed})
        if entries:
            sessions.append({"day": header[col].split(".")[0], "date": dates[k], "exercises": entries})

    out = Path(__file__).parent / "history.json"
    out.write_text(json.dumps({"sessions": sessions}, ensure_ascii=False, indent=1), encoding="utf-8")

    total = sum(len(e["sets"]) for s in sessions for e in s["exercises"])
    print(f"{len(sessions)} seances, {total} series -> {out}")


if __name__ == "__main__":
    main()
