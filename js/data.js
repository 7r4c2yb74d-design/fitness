/* ============================================================
   data.js — Données de référence de l'application (programme,
   bibliothèque d'exercices, plan alimentaire, listes de courses).

   >>> C'EST ICI QUE TU MODIFIES LE CONTENU DE COACH <<<
   - Programme sportif 4 semaines : voir PROGRAM plus bas
   - Repas / plan alimentaire : voir MEAL_PLAN
   - Remplacements d'aliments : voir FOOD_SWAPS
   - URLs images d'exercices : champ "imageUrl" dans EXERCISES
   - URLs vidéos YouTube : champ "videoUrl" dans EXERCISES
     (laisser "" si tu n'as pas encore de lien : un bouton de
     recherche YouTube s'affichera automatiquement à la place)
   ============================================================ */

// ---------------------------------------------------------------
// BIBLIOTHÈQUE D'EXERCICES
// Ajoute/édite "imageUrl" (image libre de droits, ex: Wikimedia
// Commons) et "videoUrl" (lien YouTube) quand tu en as sous la main.
// Laissés vides ici par défaut => l'app affiche une illustration
// CSS propre + un bouton "Chercher la technique sur YouTube".
// ---------------------------------------------------------------
const EXERCISES = [
  {
    id: 'presse-cuisses', nom: 'Presse à cuisses', groupe: 'Jambes', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 12, reposDefaut: 90,
    description: "Exercice de base pour quadriceps, fessiers et ischio-jambiers, réalisé sur machine guidée. Assis, dos plaqué au dossier, tu pousses la plateforme avec les pieds.",
    conseils: [
      'Pieds écartés largeur de bassin, légèrement plus haut sur la plateforme pour cibler fessiers/ischios',
      'Descends jusqu’à ce que les genoux forment un angle d’environ 90°',
      'Pousse en gardant les talons bien à plat',
      'Ne verrouille jamais complètement les genoux en haut'
    ],
    erreurs: [
      'Décoller le bas du dos du dossier',
      'Verrouiller les genoux en extension complète',
      'Descendre trop bas et arrondir le bas du dos'
    ]
  },
  {
    id: 'squat-guide', nom: 'Squat guidé', groupe: 'Jambes', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 12, reposDefaut: 90,
    description: "Squat effectué sur machine à guidage (Smith machine ou équivalent), pour apprendre le mouvement en toute sécurité.",
    conseils: [
      'Pieds légèrement devant l’axe de la barre, largeur épaules',
      'Descends en poussant les hanches vers l’arrière',
      'Garde le regard horizontal et le dos droit',
      'Descends jusqu’à cuisses parallèles au sol si la mobilité le permet'
    ],
    erreurs: [
      'Genoux qui rentrent vers l’intérieur',
      'Talons qui décollent du sol',
      'Descente trop rapide et non contrôlée'
    ]
  },
  {
    id: 'leg-curl', nom: 'Leg curl', groupe: 'Jambes (ischios)', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 2, repsDefaut: 12, reposDefaut: 75,
    description: "Machine de flexion des jambes, allongé ou assis, qui isole les ischio-jambiers.",
    conseils: [
      'Contracte volontairement les ischios en fin de mouvement',
      'Redescends lentement, ne lâche pas la charge',
      'Ajuste le coussin sur le tendon d’Achille, pas sur la cheville'
    ],
    erreurs: [
      'Décoller les hanches du banc',
      'Utiliser l’élan au lieu de la contraction musculaire'
    ]
  },
  {
    id: 'leg-extension', nom: 'Leg extension', groupe: 'Jambes (quadriceps)', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 2, repsDefaut: 12, reposDefaut: 75,
    description: "Machine d’extension des jambes en position assise, isole les quadriceps.",
    conseils: [
      'Monte jusqu’à extension quasi complète sans à-coups',
      'Redescends lentement (2-3 secondes)',
      'Garde le dos plaqué au dossier'
    ],
    erreurs: [
      'Claquer la charge en haut du mouvement',
      'Cambrer le dos pour tricher'
    ]
  },
  {
    id: 'developpe-poitrine-machine', nom: 'Développé poitrine machine', groupe: 'Pectoraux', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 12, reposDefaut: 90,
    description: "Développé couché guidé sur machine, pour travailler les pectoraux en toute sécurité.",
    conseils: [
      'Poignées à hauteur de poitrine avant de pousser',
      'Pousse en expirant, sans verrouiller violemment les coudes',
      'Garde les omoplates serrées contre le dossier'
    ],
    erreurs: [
      'Décoller le bassin du siège',
      'Amplitude trop courte'
    ]
  },
  {
    id: 'developpe-couche', nom: 'Développé couché', groupe: 'Pectoraux', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 10, reposDefaut: 120,
    description: "Développé couché à la barre ou aux haltères, exercice polyarticulaire majeur pour le haut du corps.",
    conseils: [
      'Omoplates serrées, légère cambrure naturelle du dos',
      'Barre descend jusqu’au milieu de la poitrine',
      'Toujours s’entraîner avec un pareur ou en sécurité au début'
    ],
    erreurs: [
      'Rebondir la barre sur la poitrine',
      'Coudes trop écartés à 90° (risque épaules)'
    ]
  },
  {
    id: 'developpe-epaules', nom: 'Développé épaules', groupe: 'Épaules', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 2, repsDefaut: 12, reposDefaut: 90,
    description: "Développé militaire à la machine ou aux haltères pour les épaules (deltoïdes).",
    conseils: [
      'Pousse la charge au-dessus de la tête sans cambrer excessivement',
      'Contrôle la descente',
      'Garde le tronc gainé'
    ],
    erreurs: [
      'Cambrer fortement le bas du dos',
      'Descendre trop vite sans contrôle'
    ]
  },
  {
    id: 'tirage-vertical', nom: 'Tirage vertical', groupe: 'Dos', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 12, reposDefaut: 90,
    description: "Tirage à la poulie haute, exercice de base pour construire le dos (grand dorsal).",
    conseils: [
      'Tire la barre vers le haut de la poitrine',
      'Sors la poitrine, garde le buste légèrement incliné en arrière',
      'Contrôle la remontée, ne relâche pas d’un coup'
    ],
    erreurs: [
      'Tirer derrière la nuque (risque épaules)',
      'Utiliser l’élan du buste pour tricher'
    ]
  },
  {
    id: 'rowing-assis', nom: 'Rowing assis', groupe: 'Dos', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 12, reposDefaut: 90,
    description: "Tirage horizontal à la poulie basse, assis, pour l’épaisseur du dos.",
    conseils: [
      'Tire les coudes vers l’arrière, proches du buste',
      'Garde le dos droit, ne t’affale pas en arrière',
      'Serre les omoplates en fin de mouvement'
    ],
    erreurs: [
      'Balancer le buste d’avant en arrière',
      'Arrondir le dos'
    ]
  },
  {
    id: 'curl-biceps', nom: 'Curl biceps', groupe: 'Bras (biceps)', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 2, repsDefaut: 12, reposDefaut: 60,
    description: "Flexion des avant-bras à la barre, haltères ou machine pour isoler les biceps.",
    conseils: [
      'Coudes fixes le long du corps',
      'Monte en contractant, redescends lentement',
      'Évite de balancer le buste'
    ],
    erreurs: [
      'Utiliser l’élan des épaules',
      'Amplitude incomplète'
    ]
  },
  {
    id: 'extension-triceps', nom: 'Extension triceps', groupe: 'Bras (triceps)', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 2, repsDefaut: 12, reposDefaut: 60,
    description: "Extension à la poulie haute ou aux haltères pour isoler les triceps.",
    conseils: [
      'Coudes fixes, proches de la tête ou du buste selon la variante',
      'Extension complète du bras sans verrouiller violemment',
      'Retour contrôlé'
    ],
    erreurs: [
      'Bouger les coudes pendant le mouvement',
      'Utiliser une charge trop lourde au détriment de la forme'
    ]
  },
  {
    id: 'gainage', nom: 'Gainage', groupe: 'Sangle abdominale', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 1, reposDefaut: 45,
    description: "Gainage en planche (avant-bras au sol), corps aligné, pour renforcer la sangle abdominale profonde.",
    conseils: [
      'Corps aligné tête-épaules-hanches-talons',
      'Contracte les abdos et les fessiers',
      'Respire normalement, ne bloque pas ta respiration'
    ],
    erreurs: [
      'Cambrer ou casser le bas du dos',
      'Lever les fessiers trop haut'
    ]
  },
  {
    id: 'crunch', nom: 'Crunch', groupe: 'Abdominaux', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 2, repsDefaut: 15, reposDefaut: 45,
    description: "Flexion du buste au sol pour cibler les grands droits de l’abdomen.",
    conseils: [
      'Décolle uniquement les omoplates du sol',
      'Regarde vers le plafond, pas vers les pieds',
      'Souffle en montant'
    ],
    erreurs: [
      'Tirer sur la nuque avec les mains',
      'Faire l’amplitude trop grande avec le bas du dos'
    ]
  },
  {
    id: 'mollets', nom: 'Mollets', groupe: 'Mollets', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 15, reposDefaut: 45,
    description: "Extension des mollets debout ou assis sur machine, pour développer les mollets.",
    conseils: [
      'Amplitude complète : étirement en bas, contraction en haut',
      'Marque une pause d’une seconde en haut',
      'Mouvement lent et contrôlé'
    ],
    erreurs: [
      'Rebondir sans contrôle',
      'Amplitude trop courte'
    ]
  },
  {
    id: 'hip-thrust', nom: 'Hip thrust', groupe: 'Fessiers', couleur: 'muscu',
    imageUrl: '', videoUrl: '',
    seriesDefaut: 3, repsDefaut: 12, reposDefaut: 90,
    description: "Poussée de bassin, haut du dos appuyé sur un banc, barre ou charge sur les hanches. Exercice roi pour les fessiers.",
    conseils: [
      'Menton rentré, regard vers l’avant',
      'Monte jusqu’à l’alignement genoux-hanches-épaules',
      'Contracte fort les fessiers en haut'
    ],
    erreurs: [
      'Hyperextension du bas du dos en haut du mouvement',
      'Pieds trop proches ou trop loin du bassin'
    ]
  }
];

function getExerciseById(id) { return EXERCISES.find(e => e.id === id); }

// ---------------------------------------------------------------
// PROGRAMME 4 SEMAINES
// ---------------------------------------------------------------
const PROGRAM = {
  semaine1: {
    lundi: { titre: 'Musculation Full Body A', type: 'muscu', couleur: 'muscu',
      echauffement: '10 min vélo échauffement',
      blocs: [
        { exerciceId: 'presse-cuisses', series: 3, reps: 12 },
        { exerciceId: 'developpe-poitrine-machine', series: 3, reps: 12 },
        { exerciceId: 'tirage-vertical', series: 3, reps: 12 },
        { exerciceId: 'leg-curl', series: 2, reps: 12 },
        { exerciceId: 'rowing-assis', series: 2, reps: 12 },
        { exerciceId: 'gainage', series: 3, reps: '20 sec' }
      ],
      recuperation: '10 minutes de marche tranquille.' },
    mardi: { titre: 'Vélo endurance', type: 'velo', couleur: 'velo',
      duree: 45, description: '45 minutes tranquille.',
      etapes: ['5 min échauffement', '35 min vélo facile', '5 min récupération'] },
    mercredi: { titre: 'Récupération active', type: 'repos', couleur: 'repos',
      description: '35 à 45 minutes de marche.', etapes: ['35 à 45 minutes de marche', '10 minutes de mobilité'] },
    jeudi: { titre: 'Musculation Full Body B', type: 'muscu', couleur: 'muscu',
      blocs: [
        { exerciceId: 'presse-cuisses', series: 3, reps: 12 },
        { exerciceId: 'developpe-epaules', series: 2, reps: 12 },
        { exerciceId: 'rowing-assis', series: 3, reps: 12 },
        { exerciceId: 'leg-extension', series: 2, reps: 12 },
        { exerciceId: 'tirage-vertical', series: 2, reps: 12 },
        { exerciceId: 'curl-biceps', series: 2, reps: 12 },
        { exerciceId: 'extension-triceps', series: 2, reps: 12 }
      ] },
    vendredi: { titre: 'Marche + jogging', type: 'course', couleur: 'course',
      etapes: ['5 minutes marche', '6 × (1 min jogging très lent + 2 min marche)', '5 à 10 minutes marche'],
      intervalles: { repetitions: 6, jogging: 60, marche: 120 } },
    samedi: { titre: 'Vélo', type: 'velo', couleur: 'velo', duree: 60, description: '60 minutes tranquille.',
      etapes: ['5 min échauffement', '50 min vélo tranquille', '5 min récupération'] },
    dimanche: { titre: 'Repos', type: 'repos', couleur: 'repos', description: 'Journée de repos complet.' }
  },
  semaine2: {
    lundi: 'like:semaine1.lundi', mercredi: 'like:semaine1.mercredi', jeudi: 'like:semaine1.jeudi', dimanche: 'like:semaine1.dimanche',
    mardi: { titre: 'Vélo endurance', type: 'velo', couleur: 'velo', duree: 50, description: '50 minutes tranquille.',
      etapes: ['5 min échauffement', '40 min vélo facile', '5 min récupération'] },
    vendredi: { titre: 'Marche + jogging', type: 'course', couleur: 'course',
      etapes: ['5 minutes marche', '7 × (1 min jogging + 2 min marche)', '5 à 10 minutes marche'],
      intervalles: { repetitions: 7, jogging: 60, marche: 120 } },
    samedi: { titre: 'Vélo', type: 'velo', couleur: 'velo', duree: 65, description: '65 minutes tranquille.',
      etapes: ['5 min échauffement', '55 min vélo tranquille', '5 min récupération'] }
  },
  semaine3: {
    lundi: 'like:semaine1.lundi', mercredi: 'like:semaine1.mercredi', jeudi: 'like:semaine1.jeudi', dimanche: 'like:semaine1.dimanche',
    mardi: { titre: 'Vélo endurance', type: 'velo', couleur: 'velo', duree: 55, description: '55 minutes avec 3 × 3 minutes plus soutenues.',
      etapes: ['5 min échauffement', '3 × (3 min soutenu + 4 min facile)', 'reste en vélo facile', '5 min récupération'] },
    vendredi: { titre: 'Marche + jogging', type: 'course', couleur: 'course',
      etapes: ['5 minutes marche', '7 × (90 sec jogging + 2 min marche)', '5 à 10 minutes marche'],
      intervalles: { repetitions: 7, jogging: 90, marche: 120 } },
    samedi: { titre: 'Vélo', type: 'velo', couleur: 'velo', duree: 70, description: '70 minutes tranquille.',
      etapes: ['5 min échauffement', '60 min vélo tranquille', '5 min récupération'] }
  },
  semaine4: {
    lundi: 'like:semaine1.lundi', mercredi: 'like:semaine1.mercredi', jeudi: 'like:semaine1.jeudi', dimanche: 'like:semaine1.dimanche',
    mardi: { titre: 'Vélo endurance', type: 'velo', couleur: 'velo', duree: 60, description: '60 minutes tranquille.',
      etapes: ['5 min échauffement', '50 min vélo tranquille', '5 min récupération'] },
    vendredi: { titre: 'Marche + jogging', type: 'course', couleur: 'course',
      etapes: ['5 minutes marche', '8 × (90 sec jogging + 90 sec marche)', '5 à 10 minutes marche'],
      intervalles: { repetitions: 8, jogging: 90, marche: 90 } },
    samedi: { titre: 'Vélo', type: 'velo', couleur: 'velo', duree: 75, description: '75 minutes tranquille.',
      etapes: ['5 min échauffement', '65 min vélo tranquille', '5 min récupération'] }
  }
};

const JOURS_ORDRE = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

// Résout les entrées "like:semaineX.jour" pour dédupliquer les jours identiques
function getJourProgramme(semaine, jour) {
  const key = 'semaine' + semaine;
  const sem = PROGRAM[key];
  if (!sem) return null;
  let entry = sem[jour];
  if (typeof entry === 'string' && entry.startsWith('like:')) {
    const [, ref] = entry.split('like:');
    const [refSem, refJour] = ref.split('.');
    entry = PROGRAM[refSem][refJour];
  }
  return entry || null;
}

function getSemaineComplete(semaine) {
  const out = {};
  JOURS_ORDRE.forEach(j => { out[j] = getJourProgramme(semaine, j); });
  return out;
}

// ---------------------------------------------------------------
// PLAN ALIMENTAIRE PAR DÉFAUT
// Chaque aliment : { nom, quantite, calories, proteines, glucides, lipides }
// ---------------------------------------------------------------
const MEAL_PLAN = {
  petitDejeuner: {
    nom: 'Petit-déjeuner', heure: '07:30',
    aliments: [
      { nom: 'Œufs', quantite: '3 pièces', calories: 220, proteines: 19, glucides: 1, lipides: 15 },
      { nom: 'Skyr ou fromage blanc 0%', quantite: '200 g', calories: 116, proteines: 22, glucides: 8, lipides: 0 },
      { nom: "Flocons d'avoine", quantite: '50 g', calories: 190, proteines: 7, glucides: 33, lipides: 3 },
      { nom: 'Fruit', quantite: '1 pièce', calories: 80, proteines: 1, glucides: 19, lipides: 0 }
    ]
  },
  collationMatin: {
    nom: 'Collation matin (optionnelle)', heure: '10:30', optionnelle: true,
    aliments: [
      { nom: 'Fruit', quantite: '1 pièce', calories: 80, proteines: 1, glucides: 19, lipides: 0 },
      { nom: 'Skyr ou fromage blanc', quantite: '100 à 150 g', calories: 75, proteines: 14, glucides: 5, lipides: 0 }
    ]
  },
  dejeuner: {
    nom: 'Déjeuner', heure: '12:30',
    aliments: [
      { nom: 'Poulet ou dinde', quantite: '180 g', calories: 297, proteines: 56, glucides: 0, lipides: 6 },
      { nom: 'Riz cuit', quantite: '200 g', calories: 260, proteines: 5, glucides: 56, lipides: 1 },
      { nom: 'Légumes', quantite: '300 g', calories: 90, proteines: 4, glucides: 15, lipides: 1 },
      { nom: "Huile d'olive", quantite: '10 g', calories: 90, proteines: 0, glucides: 0, lipides: 10 }
    ]
  },
  collationAM: {
    nom: 'Collation', heure: '16:30',
    aliments: [
      { nom: 'Skyr', quantite: '200 g', calories: 116, proteines: 22, glucides: 8, lipides: 0 },
      { nom: 'Banane', quantite: '1 pièce', calories: 105, proteines: 1, glucides: 27, lipides: 0 },
      { nom: 'Amandes', quantite: '15 g', calories: 87, proteines: 3, glucides: 3, lipides: 8 }
    ]
  },
  diner: {
    nom: 'Dîner', heure: '20:00',
    aliments: [
      { nom: 'Poisson ou poulet', quantite: '180 g', calories: 250, proteines: 45, glucides: 0, lipides: 6 },
      { nom: 'Pommes de terre', quantite: '250 g', calories: 215, proteines: 5, glucides: 47, lipides: 0 },
      { nom: 'Légumes', quantite: '300 g', calories: 90, proteines: 4, glucides: 15, lipides: 1 },
      { nom: "Huile d'olive", quantite: '10 g', calories: 90, proteines: 0, glucides: 0, lipides: 10 }
    ]
  }
};

const OBJECTIFS_NUTRITION = { caloriesMin: 2300, caloriesMax: 2400, proteinesMin: 150, proteinesMax: 170, eauMin: 2500 };

// ---------------------------------------------------------------
// REMPLACEMENTS D'ALIMENTS (quantités ajustées pour rester proche
// des calories/protéines d'origine)
// ---------------------------------------------------------------
const FOOD_SWAPS = {
  'Poulet ou dinde': [
    { nom: 'Poulet', quantite: '180 g', calories: 297, proteines: 56, glucides: 0, lipides: 6 },
    { nom: 'Dinde', quantite: '180 g', calories: 290, proteines: 55, glucides: 0, lipides: 5 },
    { nom: 'Steak haché 5%', quantite: '180 g', calories: 275, proteines: 50, glucides: 0, lipides: 9 },
    { nom: 'Thon (au naturel)', quantite: '200 g', calories: 240, proteines: 52, glucides: 0, lipides: 2 },
    { nom: 'Poisson blanc (cabillaud...)', quantite: '220 g', calories: 220, proteines: 48, glucides: 0, lipides: 2 }
  ],
  'Poisson ou poulet': [
    { nom: 'Poisson blanc', quantite: '200 g', calories: 200, proteines: 44, glucides: 0, lipides: 2 },
    { nom: 'Poulet', quantite: '180 g', calories: 297, proteines: 56, glucides: 0, lipides: 6 },
    { nom: 'Saumon', quantite: '150 g', calories: 280, proteines: 30, glucides: 0, lipides: 18 },
    { nom: 'Dinde', quantite: '180 g', calories: 290, proteines: 55, glucides: 0, lipides: 5 }
  ],
  'Riz cuit': [
    { nom: 'Riz cuit', quantite: '200 g', calories: 260, proteines: 5, glucides: 56, lipides: 1 },
    { nom: 'Pâtes cuites', quantite: '200 g', calories: 260, proteines: 9, glucides: 50, lipides: 1 },
    { nom: 'Pommes de terre', quantite: '300 g', calories: 258, proteines: 6, glucides: 57, lipides: 0 }
  ],
  'Pommes de terre': [
    { nom: 'Pommes de terre', quantite: '250 g', calories: 215, proteines: 5, glucides: 47, lipides: 0 },
    { nom: 'Riz cuit', quantite: '190 g', calories: 247, proteines: 5, glucides: 53, lipides: 1 },
    { nom: 'Pâtes cuites', quantite: '190 g', calories: 247, proteines: 8, glucides: 47, lipides: 1 }
  ]
};

function getSwapsFor(aliment) { return FOOD_SWAPS[aliment.nom] || null; }

// ---------------------------------------------------------------
// LISTE DE COURSES (7 jours) — base par défaut alignée sur MEAL_PLAN
// ---------------------------------------------------------------
const SHOPPING_LIST_7J = [
  { item: 'Œufs', quantite: '21 pièces' },
  { item: 'Skyr / fromage blanc 0%', quantite: '3 kg' },
  { item: 'Poulet / dinde', quantite: '1,5 kg' },
  { item: 'Poisson / viande maigre', quantite: '1,3 kg' },
  { item: "Flocons d'avoine", quantite: '350 g' },
  { item: 'Riz ou pâtes secs', quantite: '500 à 600 g' },
  { item: 'Pommes de terre', quantite: '2 kg' },
  { item: 'Fruits (pommes, bananes...)', quantite: '14 à 18 pièces' },
  { item: 'Légumes variés', quantite: '4 à 5 kg' },
  { item: "Huile d'olive", quantite: '1 bouteille' },
  { item: 'Amandes', quantite: '1 sachet' },
  { item: 'Épices', quantite: 'au besoin' },
  { item: 'Sriracha', quantite: '1 flacon' },
  { item: 'Moutarde', quantite: '1 pot' }
];

window.APP_DATA = {
  EXERCISES, getExerciseById,
  PROGRAM, JOURS_ORDRE, getJourProgramme, getSemaineComplete,
  MEAL_PLAN, OBJECTIFS_NUTRITION, FOOD_SWAPS, getSwapsFor,
  SHOPPING_LIST_7J
};
