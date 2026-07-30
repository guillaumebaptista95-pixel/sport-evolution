# Sport Évolution

Ton carnet de musculation, pensé pour le téléphone. Il remplace le tableur : tu notes chaque série pendant la séance, l'app garde l'historique, calcule tes records et te montre ta progression.

---

## Ce qu'il y a dans la V1

**Séance en cours**

- Chronomètre de séance et compteur de volume en direct
- Choix d'un exercice par groupe musculaire ou par recherche
- Saisie **série par série** : poids, répétitions, durée, ou poids d'assistance selon l'exercice
- Ta performance de la dernière séance affichée en permanence comme cible
- Minuteur de repos automatique après chaque série, avec vibration
- Tout est enregistré au fur et à mesure : si le téléphone se verrouille, rien n'est perdu

**Bibliothèque d'exercices**

- 25 exercices repris de ton tableur, classés en 7 groupes musculaires
- Chaque mouvement est **animé** : silhouette articulée en boucle, avec le matériel, la trajectoire de la main et le muscle ciblé en surbrillance
- Fiche technique : étapes d'exécution et points à retenir
- Historique complet et courbe de progression par exercice

**Statistiques**

- Volume hebdomadaire sur 12 semaines
- Grille de régularité sur 16 semaines
- Répartition des séries par groupe musculaire
- Records personnels avec 1RM estimé (formule d'Epley)

**Espace membre**

- Connexion Google (aucun mot de passe à retenir)
- Poids de corps, taille, objectif hebdomadaire, temps de repos par défaut
- Données strictement privées : chaque compte ne voit que ses propres séances

**Technique**

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase : base Postgres, authentification Google, sécurité au niveau des lignes (RLS)
- PWA installable sur l'écran d'accueil iOS et Android, zones sûres gérées (encoche, barre du bas)
- Les animations sont du SVG compilé en keyframes CSS : quelques kilo-octets, aucune vidéo à charger en salle

---

## Mise en route — environ 15 minutes

### 1. Créer la base Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project** (le plan gratuit suffit largement)
2. Note le mot de passe de la base, choisis la région **Europe (Paris ou Francfort)**
3. Une fois le projet créé : **SQL Editor → New query**
4. Colle le contenu de `supabase/migrations/0001_schema.sql` → **Run**
5. Nouvelle requête : colle `supabase/migrations/0002_referentiel.sql` → **Run**

Tu dois voir apparaître les tables dans **Table Editor** : `profiles`, `muscle_groups`, `exercises`, `workouts`, `workout_sets`.

### 2. Activer la connexion Google

**Côté Google Cloud**

1. [console.cloud.google.com](https://console.cloud.google.com) → crée un projet
2. **APIs & Services → OAuth consent screen** : type *External*, renseigne le nom de l'app et ton email
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Type : *Web application*
   - **Authorized redirect URI** : `https://<ton-projet>.supabase.co/auth/v1/callback`
4. Copie le **Client ID** et le **Client Secret**

**Côté Supabase**

1. **Authentication → Providers → Google** : active, colle Client ID et Client Secret
2. **Authentication → URL Configuration** :
   - Site URL : `http://localhost:3000` (puis ton URL Vercel une fois déployé)
   - Redirect URLs : ajoute `http://localhost:3000/auth/callback` et `https://<ton-domaine>/auth/callback`

### 3. Lancer en local

```bash
cp .env.local.example .env.local
```

Remplis `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → **Project Settings → API**).

```bash
npm install
npm run dev
```

Ouvre `http://localhost:3000` et connecte-toi avec Google.

### 4. Déployer sur Vercel

1. Pousse le dossier sur un dépôt GitHub
2. [vercel.com](https://vercel.com) → **Add New → Project** → importe le dépôt
3. Dans **Environment Variables**, ajoute :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` = ton URL Vercel
4. **Deploy**
5. Retourne dans Supabase → **Authentication → URL Configuration** et ajoute l'URL Vercel dans *Site URL* et *Redirect URLs*

### 5. Installer sur ton téléphone

- **iPhone** : ouvre le site dans Safari → Partager → *Sur l'écran d'accueil*
- **Android** : Chrome → menu → *Ajouter à l'écran d'accueil*

L'app s'ouvre alors en plein écran, sans barre de navigateur.

---

## Importer l'historique du tableur

33 séances et environ 1 400 séries ont déjà été extraites de `Sport Évolution.numbers` dans `scripts/history.json`.

```bash
# 1. Connecte-toi une première fois dans l'app (le compte doit exister)
# 2. Ajoute dans .env.local :
#    SUPABASE_SERVICE_ROLE_KEY=...   (Supabase → Project Settings → API → service_role)
#    SEED_USER_EMAIL=guillaume.baptista95@gmail.com
npm run seed
```

Le script est rejouable : il supprime les séances déjà importées avant de les recréer.

**Deux limites à connaître :**

- Le tableur ne contenait pas les dates réelles des séances. Elles ont été reconstituées à raison d'une séance tous les 3 à 4 jours, la dernière il y a deux jours. Tu peux les corriger dans Supabase → Table Editor → `workouts` → colonne `performed_on`.
- Quand une cellule donnait seulement une charge (par exemple `3x45Kg`), le nombre de répétitions a été fixé à 10 pour que les calculs de volume fonctionnent. Le texte d'origine de la cellule est conservé dans les notes de la première série de chaque exercice, tu peux donc toujours vérifier.

Pour régénérer le fichier depuis une version plus récente du tableur :

```bash
pip install numbers-parser
python3 scripts/parse-numbers.py "/chemin/vers/Sport Évolution.numbers"
```

---

## Structure du projet

```
src/
  app/
    (app)/              écrans connectés
      page.tsx            tableau de bord
      seance/             séance en cours + détail d'une séance
      exercices/          bibliothèque + fiche exercice
      stats/              reporting
      profil/             espace membre
    login/              connexion Google
    auth/               callback OAuth et déconnexion
    actions.ts          Server Actions (écritures)
  components/           interface et animations
  lib/
    rig.ts              moteur d'animation : squelette, IK, bibliothèque de mouvements
    queries.ts          lectures serveur
    format.ts           formatage, volume, 1RM
    supabase/           clients navigateur et serveur
supabase/migrations/    schéma SQL et référentiel des exercices
scripts/                extraction du tableur et import dans Supabase
```

### Ajouter un exercice au référentiel

Ajoute une ligne dans `supabase/migrations/0002_referentiel.sql` puis relance ce fichier dans le SQL Editor (il est écrit pour être rejouable). Les valeurs de `tracking_type` disponibles :

| Valeur | Saisie | Exemple |
|---|---|---|
| `weight_reps` | charge + répétitions | Chest press |
| `bodyweight` | répétitions (+ lest optionnel) | Dips |
| `assisted` | répétitions + poids d'assistance | Tractions assistées |
| `time` | durée | Hold dips |
| `weighted_time` | durée + charge | Wall sit lesté |

Les clés d'animation disponibles sont listées dans `ANIMATIONS` en bas de `src/lib/rig.ts`.

---

## Pistes pour la suite

- Modèles de séance (Push / Pull / Jambes) à charger en un tap
- Détection automatique des records avec animation de célébration
- Suggestion de charge pour la série suivante à partir de la progression
- Mode hors-ligne complet avec synchronisation au retour du réseau
- Export CSV et partage d'une séance
