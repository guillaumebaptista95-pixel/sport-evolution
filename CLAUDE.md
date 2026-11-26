# Sport Evolution

Carnet de musculation mobile de Guillaume, qui remplace un tableur Numbers.
En ligne sur **https://sport-evolution-seven.vercel.app**

## Pile technique

- **Next.js 14 App Router**, TypeScript, Tailwind v3, framer-motion, recharts, lucide-react
- **Supabase** : Postgres + Auth (e-mail/mot de passe et Google) + RLS. Projet `qkbhfixsybuunmsiurcj`
- **Vercel** : déploiement automatique à chaque push sur `main`
- Dépôt : `github.com/guillaumebaptista95-pixel/sport-evolution`

## Règles de travail

- **Les migrations SQL ne sont pas automatisées.** Chaque fichier de
  `supabase/migrations/` doit être collé à la main dans le SQL Editor de
  Supabase. Un commit seul ne crée jamais la table : toujours le rappeler.
- **Claude commite et pousse lui-même** sur `main` une fois le build vérifié
  (Guillaume l'a autorisé le 27/11/2026) ; Vercel déploie ensuite.
- **Commentaires et interface en français**, sans accents dans le code (la base
  et les chaînes sont en ASCII : « seance », « regularite »). Les accents sont
  autorisés dans ce fichier et dans la documentation.
- Les commentaires expliquent **l'intention**, pas la mécanique.
- Vérifier que `npx next build` passe avant de livrer.

## Carte du code

| Fichier | Rôle |
|---|---|
| `src/lib/rig.ts` | Moteur d'animation : squelette, cinématique inverse, 34 mouvements, muscles sollicités |
| `src/components/ExerciseAnimation.tsx` | Lecteur des planches de sprites, plus l'ancien rendu vectoriel en secours |
| `src/lib/queries.ts` | Toutes les lectures Supabase |
| `src/app/actions.ts` | Toutes les écritures (Server Actions) |
| `src/components/SessionClient.tsx` | Écran de séance : saisie série par série, chrono, annulation |
| `src/components/SessionBuilder.tsx` | Composition d'une séance **et** fabrique de séances types (`presetMode`) |
| `src/components/LoadProgress.tsx` | Courbe de progression par exercice, avec vue détaillée |
| `src/components/ActivityGrid.tsx` | Régularité : 8 semaines, puis calendriers mensuels dépliables |
| `src/lib/import.ts` | Lecture d'un CSV d'historique, tolérante aux formats libres |
| `tools/r3d/` | Moteur de rendu 3D hors-ligne (Python, ray marching) — a produit les planches avant le passage à la photo |
| `tools/mouvements-a-filmer.md` | Les 28 mouvements à produire en photo, avec la description du geste |

## Les animations

Chaque mouvement est une **planche de sprites verticale de 10 images** dans
`public/anim/<cle>.png` (160 px) et `<cle>-sm.png` (80 px). Le lecteur les
parcourt par pas puis en sens inverse, ce qui donne l'aller-retour du geste.
La clé est celle de `ANIMATIONS` dans `rig.ts`.

Deux générations coexistent :

- **3D calculée** pour la plupart des mouvements (silhouette, muscle travaillé
  qui s'allume). Reproductible via `tools/r3d/main.py`.
- **Photo réelle** pour `biceps-curl`, `dip`, `dip-negative`, `dip-hold`,
  `squat`, `gainage`. Produites avec Higgsfield : une image de position de
  départ (1 crédit) puis une vidéo de 4 s (6 crédits), dont dix images sont
  extraites avec ffmpeg.

Recette de prompt qui marche, à réutiliser :

> Same man, same face, same build, grey tank top, black shorts, white trainers.
> Strict side profile, full body, FACING THE RIGHT EDGE of the image.
> [position de départ décrite précisément] [matériel décrit pièce par pièce]
> Dim gym interior with dark walls, soft directional lighting. Sharp
> photorealistic gym photography, full figure visible with margin around them.

Le personnage de référence est le job Higgsfield `9985ffff-8a9c-4b8a-a63e-63dc62bcc7c2`
(profil), et `c6d4ec12-2297-4cf6-955c-488b8ddc7a50` (de dos, pour les tractions).
Toujours le passer en `image_references` pour garder la même identité.

Les vidéos se déposent dans `public/anim/src/<cle>.mp4`, puis on extrait la
phase utile du geste (souvent la première seconde et demie) en dix images.

## Fonctionnalités en place

Programme hebdomadaire, composition de séance avec quotas par groupe, séances
types enregistrables et relançables n'importe quel jour, saisie série par série
avec pré-remplissage de la dernière charge, chronomètre pour les exercices
tenus, rattrapage d'une séance oubliée, réouverture d'une séance validée,
annulation d'une séance en cours, historique jour par jour, courbes de
progression par exercice, records, régularité, import CSV, photos de machines.

## Ce qui reste à faire

1. **Importer l'historique Numbers.** Le fichier `scripts/import-historique.csv`
   est prêt : 1402 séries sur 91 journées, du 15/12/2025 au 01/08/2026, Bali
   inclus. À déposer dans Profil → Importer mon historique. Non fait à ce jour.
2. **Refaire la vidéo de traction** (6 crédits) : la précédente ne montrait pas
   le mouvement complet, l'athlète partait déjà à moitié tracté.
3. **Animer les mouvements sur machine** — chest press, tirages, poulies,
   presse, leg curl. Nécessite des photos des vraies machines Basic-Fit à
   passer en seconde référence : sans elles le modèle invente du matériel.
4. Éventuellement supprimer `public/anim/_old.png`, fichier orphelin vide.

## Contexte utile sur Guillaume

Il s'entraîne au Basic-Fit d'Ermont. Son tableur couvrait 33 semaines sans
jamais contenir de date — les dates ont été reconstituées en croisant l'ordre
des semaines avec son historique de passages Basic-Fit. Il demande qu'on lui
demande toujours avant de dépenser des crédits Higgsfield.
