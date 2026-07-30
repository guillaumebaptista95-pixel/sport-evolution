-- =====================================================================
--  SPORT EVOLUTION — Referentiel : groupes musculaires + exercices
--  A executer APRES 0001_schema.sql
-- =====================================================================

-- Etape 2 sur 2.
insert into public.muscle_groups (slug, name, color, sort_order) values
  ('dos',        'Dos',        '#6C5CE7', 1),
  ('pectoraux',  'Pectoraux',  '#FF6B4A', 2),
  ('epaules',    'Epaules',    '#FFB627', 3),
  ('biceps',     'Biceps',     '#22D3EE', 4),
  ('triceps',    'Triceps',    '#F472B6', 5),
  ('jambes',     'Jambes',     '#9BE23C', 6),
  ('abdos',      'Abdos',      '#38BDF8', 7)
on conflict (slug) do update set name = excluded.name, color = excluded.color, sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------
--  EXERCICES
-- ---------------------------------------------------------------------
insert into public.exercises
  (user_id, slug, name, muscle_group_id, secondary, equipment, tracking_type, animation_key, instructions, tips, is_unilateral, sort_order)
values

-- ============================ DOS ====================================
(null, 'tractions', 'Tractions', (select id from public.muscle_groups where slug='dos'),
 array['biceps','epaules'], 'poids-du-corps', 'assisted', 'pullup',
 array[
   'Suspends-toi a la barre, mains en pronation, ecartement un peu plus large que les epaules.',
   'Engage les omoplates vers le bas et l''arriere avant de tirer.',
   'Tire jusqu''a passer le menton au-dessus de la barre, coudes vers le sol.',
   'Redescends en 2 a 3 secondes jusqu''a extension complete des bras.'],
 array[
   'Ne balance pas les jambes : le buste reste gaine.',
   'Si tu utilises l''assistance, l''objectif est de faire baisser le poids d''aide seance apres seance.'],
 false, 1),

(null, 'tractions-rapides', 'Tractions rapides', (select id from public.muscle_groups where slug='dos'),
 array['biceps'], 'poids-du-corps', 'assisted', 'pullup-fast',
 array[
   'Meme placement que la traction classique.',
   'Phase de montee explosive, la plus rapide possible.',
   'Descente controlee mais sans temps mort en bas.'],
 array['Privilegie la vitesse d''execution a la charge : c''est un travail de puissance.'],
 false, 2),

(null, 'tractions-pause-haut', 'Tractions pause 3 sec en haut', (select id from public.muscle_groups where slug='dos'),
 array['biceps'], 'poids-du-corps', 'assisted', 'pullup-hold',
 array[
   'Monte en traction classique.',
   'Maintiens 3 secondes menton au-dessus de la barre, poitrine vers la barre.',
   'Descends lentement.'],
 array['Le maintien en haut developpe la force dans la zone la plus faible du mouvement.'],
 false, 3),

(null, 'row-machine-vertical', 'Row machine vertical', (select id from public.muscle_groups where slug='dos'),
 array['biceps'], 'machine', 'weight_reps', 'row-vertical',
 array[
   'Assieds-toi, cuisses bloquees sous les cales.',
   'Saisis la poignee haute, buste droit legerement incline en arriere.',
   'Tire les coudes vers le bas le long du corps jusqu''aux cotes.',
   'Remonte en controlant, sans laisser les epaules partir en avant.'],
 array['Pense a rapprocher les omoplates plutot qu''a tirer avec les bras.'],
 false, 4),

(null, 'row-machine-horizontal', 'Row machine horizontal', (select id from public.muscle_groups where slug='dos'),
 array['epaules'], 'machine', 'weight_reps', 'row-horizontal',
 array[
   'Assieds-toi, poitrine contre le support.',
   'Saisis les poignees bras tendus.',
   'Tire vers toi en serrant les omoplates, coudes proches du corps.',
   'Reviens lentement en etirement complet.'],
 array['Garde la nuque dans le prolongement du dos, ne tire pas la tete en avant.'],
 false, 5),

(null, 'pull-machine', 'Pull machine', (select id from public.muscle_groups where slug='dos'),
 array['pectoraux'], 'machine', 'weight_reps', 'lat-pulldown',
 array[
   'Reglage du siege pour que les poignees soient au niveau des epaules.',
   'Tire vers le bas et l''avant en gardant les bras semi-tendus.',
   'Contracte les dorsaux en fin de mouvement.'],
 array['Mouvement d''isolation : reste leger et concentre-toi sur la sensation.'],
 false, 6),

(null, 'tirage-poulie-haute-serre', 'Tirage poulie haute prise serree', (select id from public.muscle_groups where slug='dos'),
 array['biceps'], 'poulie', 'weight_reps', 'lat-pulldown',
 array[
   'Prise serree en supination ou neutre.',
   'Buste legerement incline en arriere, poitrine sortie.',
   'Tire la barre vers le haut de la poitrine.',
   'Remonte bras tendus en controlant l''etirement.'],
 array['La prise serree cible davantage le milieu du dos et les biceps.'],
 false, 7),

(null, 'tirage-poulies-cotes-dos', 'Tirage poulies cotes dos', (select id from public.muscle_groups where slug='dos'),
 array[]::text[], 'poulie', 'weight_reps', 'straight-arm-pulldown',
 array[
   'Debout face a la poulie haute, bras tendus devant.',
   'Descends les bras tendus jusqu''aux cuisses en gardant les coudes verrouilles.',
   'Remonte lentement.'],
 array['Isolation pure du grand dorsal : charge legere, amplitude maximale.'],
 false, 8),

-- ========================= PECTORAUX =================================
(null, 'chest-press', 'Chest Press', (select id from public.muscle_groups where slug='pectoraux'),
 array['triceps','epaules'], 'machine', 'weight_reps', 'chest-press',
 array[
   'Regle le siege : les poignees arrivent au niveau du milieu de la poitrine.',
   'Dos plaque, omoplates serrees, pieds au sol.',
   'Pousse jusqu''a extension quasi complete sans verrouiller les coudes.',
   'Reviens en 2 a 3 secondes.'],
 array['Ne laisse pas les epaules s''enrouler vers l''avant en fin de poussee.'],
 false, 10),

(null, 'developpe-incline', 'Developpe incline', (select id from public.muscle_groups where slug='pectoraux'),
 array['epaules','triceps'], 'halteres', 'weight_reps', 'bench-incline',
 array[
   'Banc incline a 30-45 degres.',
   'Halteres au niveau des pectoraux, coudes a 45 degres du buste.',
   'Pousse vers le haut en rapprochant legerement les halteres.',
   'Descends en controlant jusqu''a l''etirement.'],
 array['Un banc trop incline transfere le travail sur les epaules.'],
 false, 11),

(null, 'developpe-decline', 'Developpe decline', (select id from public.muscle_groups where slug='pectoraux'),
 array['triceps'], 'halteres', 'weight_reps', 'bench-decline',
 array[
   'Banc decline, pieds bien cales.',
   'Descends les halteres au niveau du bas des pectoraux.',
   'Pousse en gardant les poignets alignes avec les avant-bras.'],
 array['Cible le faisceau inferieur des pectoraux.'],
 false, 12),

(null, 'dips', 'Dips', (select id from public.muscle_groups where slug='pectoraux'),
 array['triceps','epaules'], 'poids-du-corps', 'bodyweight', 'dip',
 array[
   'Bras tendus sur les barres paralleles, epaules basses.',
   'Descends en inclinant legerement le buste en avant pour cibler les pectoraux.',
   'Descends jusqu''a ce que les bras forment un angle droit.',
   'Remonte en poussant fort sans verrouiller violemment les coudes.'],
 array[
   'Buste vertical = plus de triceps. Buste penche = plus de pectoraux.',
   'Garde les epaules loin des oreilles pendant toute la serie.'],
 false, 13),

-- ========================== TRICEPS ==================================
(null, 'dips-negatives', 'Dips negatives', (select id from public.muscle_groups where slug='triceps'),
 array['pectoraux'], 'poids-du-corps', 'bodyweight', 'dip-negative',
 array[
   'Pars bras tendus en haut des barres.',
   'Descends le plus lentement possible (4 a 6 secondes).',
   'Marque une pause 2 secondes en bas.',
   'Remonte avec de l''aide ou en sautant.'],
 array['Le travail excentrique est la voie la plus rapide vers les dips completes.'],
 false, 20),

(null, 'hold-dips', 'Hold Dips', (select id from public.muscle_groups where slug='triceps'),
 array['pectoraux','epaules'], 'poids-du-corps', 'time', 'dip-hold',
 array[
   'Position bras tendus, corps gaine, epaules basses.',
   'Maintiens la position sans bouger.',
   'Respire calmement pendant le maintien.'],
 array['Excellent pour renforcer les tendons et stabiliser l''epaule.'],
 false, 21),

(null, 'extension-triceps-cable', 'Extension triceps cable', (select id from public.muscle_groups where slug='triceps'),
 array[]::text[], 'poulie', 'weight_reps', 'triceps-pushdown',
 array[
   'Debout face a la poulie haute, coudes colles au corps.',
   'Descends en tendant completement les bras.',
   'Contracte 1 seconde en bas.',
   'Remonte sans laisser les coudes partir en avant.'],
 array['Seuls les avant-bras bougent : les coudes restent fixes.'],
 false, 22),

-- =========================== BICEPS ==================================
(null, 'curl-halteres', 'Curl halteres bras droits', (select id from public.muscle_groups where slug='biceps'),
 array['avant-bras'], 'halteres', 'weight_reps', 'biceps-curl',
 array[
   'Debout, halteres le long du corps, paumes vers l''avant.',
   'Monte sans bouger les coudes ni le buste.',
   'Contracte en haut 1 seconde.',
   'Descends en 3 secondes jusqu''a extension complete.'],
 array['Interdiction de balancer le buste : si tu triches, baisse la charge.'],
 false, 30),

-- =========================== EPAULES =================================
(null, 'epaules-machine', 'Epaules / barre debout', (select id from public.muscle_groups where slug='epaules'),
 array['triceps'], 'barre', 'weight_reps', 'shoulder-press',
 array[
   'Debout, barre au niveau des clavicules, mains largeur epaules.',
   'Gaine les abdos et les fessiers.',
   'Pousse a la verticale jusqu''a extension complete au-dessus de la tete.',
   'Redescends en controlant jusqu''aux clavicules.'],
 array['Ne cambre pas le bas du dos : le gainage fait partie du mouvement.'],
 false, 40),

(null, 'face-pull', 'Face Pull', (select id from public.muscle_groups where slug='epaules'),
 array['dos'], 'poulie', 'weight_reps', 'face-pull',
 array[
   'Poulie reglee a hauteur de visage, corde en prise neutre.',
   'Tire la corde vers le front en ecartant les mains.',
   'Termine coudes hauts, omoplates serrees.',
   'Reviens lentement.'],
 array['Le meilleur exercice de prevention pour les epaules. Reste leger.'],
 false, 41),

-- =========================== JAMBES ==================================
(null, 'squat', 'Squat', (select id from public.muscle_groups where slug='jambes'),
 array['fessiers','abdos'], 'barre', 'weight_reps', 'squat',
 array[
   'Barre sur le haut du dos, pieds largeur epaules, pointes legerement ouvertes.',
   'Inspire, gaine, puis descends en poussant les hanches en arriere.',
   'Descends jusqu''a ce que les cuisses soient au moins paralleles au sol.',
   'Remonte en poussant dans les talons.'],
 array[
   'Les genoux suivent l''axe des pieds, ils ne rentrent pas vers l''interieur.',
   'Le dos reste neutre : pas d''arrondi en bas.'],
 false, 50),

(null, 'fentes-marchees', 'Fentes marchees', (select id from public.muscle_groups where slug='jambes'),
 array['fessiers'], 'halteres', 'weight_reps', 'lunge',
 array[
   'Un haltere dans chaque main, buste droit.',
   'Fais un grand pas en avant et descends le genou arriere vers le sol.',
   'Pousse dans le talon avant pour enchainer le pas suivant.'],
 array['Le genou avant ne depasse pas trop la pointe du pied. Grande foulee = plus de fessiers.'],
 true, 51),

(null, 'wall-sit', 'Wall sit', (select id from public.muscle_groups where slug='jambes'),
 array['abdos'], 'poids-du-corps', 'weighted_time', 'wall-sit',
 array[
   'Dos plaque contre le mur, cuisses paralleles au sol, genoux a 90 degres.',
   'Pose la charge sur les cuisses si tu lestes.',
   'Tiens la position en respirant.'],
 array['Le bas du dos reste colle au mur du debut a la fin.'],
 false, 52),

(null, 'leg-press', 'Leg Press', (select id from public.muscle_groups where slug='jambes'),
 array['fessiers'], 'machine', 'weight_reps', 'leg-press',
 array[
   'Pieds a largeur des hanches au milieu du plateau.',
   'Descends jusqu''a 90 degres aux genoux sans decoller le bassin.',
   'Pousse sans verrouiller completement les genoux en haut.'],
 array['Ne laisse jamais le bas du dos se decoller du dossier en bas du mouvement.'],
 false, 53),

(null, 'press-legere', 'Press legere', (select id from public.muscle_groups where slug='jambes'),
 array['fessiers'], 'machine', 'weight_reps', 'leg-press',
 array[
   'Meme placement que la Leg Press, charge allegee.',
   'Series longues, tempo regulier, amplitude complete.'],
 array['Utilise-la en finisher ou en echauffement articulaire.'],
 false, 54),

(null, 'leg-curl-allonge', 'Leg Curl allonge', (select id from public.muscle_groups where slug='jambes'),
 array['ischios'], 'machine', 'weight_reps', 'leg-curl',
 array[
   'Allonge sur le ventre, le rouleau juste au-dessus des talons.',
   'Flechis les genoux pour amener les talons vers les fessiers.',
   'Contracte 1 seconde puis redescends lentement.'],
 array['Ne decolle pas le bassin du banc : c''est le signe d''une charge trop lourde.'],
 false, 55),

(null, 'mollet-assist-squat', 'Mollets', (select id from public.muscle_groups where slug='jambes'),
 array['mollets'], 'machine', 'weight_reps', 'calf-raise',
 array[
   'Pointes de pieds sur la plateforme, talons dans le vide.',
   'Descends les talons au maximum pour etirer le mollet.',
   'Monte sur la pointe des pieds et contracte 1 seconde en haut.'],
 array['Amplitude complete et tempo lent : les mollets repondent au temps sous tension.'],
 false, 56)

on conflict (user_id, slug) do update set
  name            = excluded.name,
  muscle_group_id = excluded.muscle_group_id,
  secondary       = excluded.secondary,
  equipment       = excluded.equipment,
  tracking_type   = excluded.tracking_type,
  animation_key   = excluded.animation_key,
  instructions    = excluded.instructions,
  tips            = excluded.tips,
  is_unilateral   = excluded.is_unilateral,
  sort_order      = excluded.sort_order;
