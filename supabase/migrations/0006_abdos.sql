-- ---------------------------------------------------------------------
--  ABDOS : 10 mouvements, du plus simple au plus exigeant.
--  Rejouable : le on conflict met a jour sans creer de doublon.
-- ---------------------------------------------------------------------
insert into public.exercises
  (user_id, slug, name, muscle_group_id, secondary, equipment, tracking_type, animation_key, instructions, tips, is_unilateral, sort_order)
values

(null, 'crunch', 'Crunch', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'poids-du-corps', 'bodyweight', 'crunch',
 array[
   'Allonge sur le dos, genoux flechis, pieds au sol, mains sur les tempes.',
   'Enroule le buste en decollant les omoplates, sans tirer sur la nuque.',
   'Souffle en montant, contracte une seconde en haut.',
   'Redescends lentement sans reposer completement la tete.'],
 array[
   'Le bas du dos reste plaque au sol : seul le haut du buste s''enroule.',
   'Garde un poing d''ecart entre le menton et la poitrine.'],
 false, 60),

(null, 'gainage', 'Gainage', (select id from public.muscle_groups where slug='abdos'),
 array['epaules','fessiers'], 'poids-du-corps', 'weighted_time', 'gainage',
 array[
   'Appuis sur les avant-bras, coudes a l''aplomb des epaules, pointes de pieds au sol.',
   'Aligne chevilles, hanches et epaules sur une meme ligne.',
   'Serre les fessiers et rentre le nombril, respire normalement.',
   'Tiens la position sans laisser le bassin descendre.'],
 array[
   'Des que les hanches s''affaissent ou remontent, la serie est finie.',
   'Pose un disque sur le haut du dos pour lester quand tu depasses 90 secondes.'],
 false, 61),

(null, 'mountain-climbers', 'Mountain Climbers', (select id from public.muscle_groups where slug='abdos'),
 array['epaules','jambes'], 'poids-du-corps', 'time', 'mountain-climbers',
 array[
   'Position de pompe, bras tendus, mains sous les epaules.',
   'Ramene un genou vers la poitrine, puis alterne rapidement.',
   'Garde le bassin bas et stable, ne le laisse pas rebondir.',
   'Enchaine sur toute la duree de la serie.'],
 array[
   'C''est un exercice de gainage dynamique : la vitesse ne doit jamais casser l''alignement.',
   'Respire en rythme plutot qu''en apnee.'],
 false, 62),

(null, 'releve-jambes-suspendu', 'Releve de jambes suspendu', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'poids-du-corps', 'bodyweight', 'releve-jambes-suspendu',
 array[
   'Suspendu a la barre, bras tendus, corps immobile.',
   'Enroule le bassin et monte les genoux vers la poitrine.',
   'Monte jusqu''a ce que les cuisses depassent l''horizontale.',
   'Redescends lentement sans balancer.'],
 array[
   'Le mouvement part du bassin, pas des hanches : c''est l''enroulement qui travaille.',
   'Jambes tendues quand tu maitrises la version genoux flechis.'],
 false, 63),

(null, 'crunch-inverse', 'Crunch inverse', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'poids-du-corps', 'bodyweight', 'crunch-inverse',
 array[
   'Allonge sur le dos, bras le long du corps, genoux ramenes a 90 degres.',
   'Decolle le bassin en enroulant les genoux vers la poitrine.',
   'Marque un temps d''arret en haut.',
   'Redescends sans laisser les pieds toucher le sol.'],
 array['Cible le bas des abdominaux, la ou le crunch classique travaille peu.'],
 false, 64),

(null, 'gainage-lateral', 'Gainage lateral', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'poids-du-corps', 'time', 'gainage-lateral',
 array[
   'Sur le cote, appui sur l''avant-bras, coude sous l''epaule.',
   'Pieds superposes, monte le bassin jusqu''a aligner le corps.',
   'Tiens la position, puis change de cote.'],
 array[
   'Travaille les obliques et la stabilite laterale du tronc.',
   'Compte le meme temps des deux cotes.'],
 true, 65),

(null, 'russian-twist', 'Russian Twist', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'halteres', 'weight_reps', 'russian-twist',
 array[
   'Assis, buste incline en arriere a 45 degres, pieds decolles.',
   'Tiens un disque ou un haltere a deux mains devant la poitrine.',
   'Fais pivoter le buste d''un cote puis de l''autre.',
   'Compte une repetition par aller-retour complet.'],
 array['C''est le buste qui tourne, pas seulement les bras.'],
 false, 66),

(null, 'crunch-poulie', 'Crunch a la poulie', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'poulie', 'weight_reps', 'crunch-poulie',
 array[
   'A genoux face a la poulie haute, corde tenue de part et d''autre du visage.',
   'Enroule le buste vers le sol en rapprochant les coudes des cuisses.',
   'Contracte en bas, puis remonte lentement.'],
 array[
   'Le seul exercice d''abdos ou tu peux vraiment progresser en charge.',
   'Les hanches restent fixes : ce sont les abdos qui enroulent, pas les bras qui tirent.'],
 false, 67),

(null, 'hollow-hold', 'Hollow Hold', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'poids-du-corps', 'time', 'hollow-hold',
 array[
   'Allonge sur le dos, bras tendus derriere la tete, jambes tendues.',
   'Decolle epaules et jambes du sol en creusant le ventre.',
   'Le bas du dos reste plaque au sol du debut a la fin.',
   'Tiens la position en respirant.'],
 array['Si le bas du dos decolle, rapproche les genoux pour raccourcir le levier.'],
 false, 68),

(null, 'bicycle-crunch', 'Crunch velo', (select id from public.muscle_groups where slug='abdos'),
 array['abdos'], 'poids-du-corps', 'bodyweight', 'bicycle-crunch',
 array[
   'Allonge sur le dos, mains sur les tempes, jambes decollees.',
   'Amene le coude vers le genou oppose en tendant l''autre jambe.',
   'Alterne sans reposer les pieds au sol.',
   'Compte une repetition par cote.'],
 array['Le mouvement vient de la rotation du buste, pas du coude qui va chercher le genou.'],
 false, 69)

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
