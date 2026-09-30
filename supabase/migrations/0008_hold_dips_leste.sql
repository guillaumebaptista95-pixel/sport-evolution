-- ---------------------------------------------------------------------
--  HOLD DIPS : passage au maintien leste.
--  Le maintien se chronometre toujours, mais on peut desormais y ajouter
--  une charge (ceinture de lest), comme sur la chaise contre le mur.
-- ---------------------------------------------------------------------
update public.exercises
set    tracking_type = 'weighted_time',
       tips = array[
         'Epaules basses et verrouillees : c''est ce qui protege l''articulation.',
         'Ajoute la charge a la ceinture des que tu tiens plus de 45 secondes.'
       ]
where  slug = 'hold-dips';
