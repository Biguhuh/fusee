'use strict';
// Les 19 astres jouables. Valeurs réelles, arrondies.
//
// type         : 'solide' (on peut se poser), 'gazeuse' (pas de sol), 'etoile'
// distanceUA   : distance au Soleil (UA). Les lunes prennent celle de leur planète.
// rayonKm      : rayon moyen (km)
// g            : gravité de surface (m/s²). Pour les géantes : au niveau 1 bar.
// tempSurface  : température de surface (°C). Géantes : au niveau 1 bar.
// vMax         : vitesse d'atterrissage maximale (m/s), selon le terrain.
// radiationLocale : rayonnement ajouté par une magnétosphère (ceintures de Jupiter).
// atm          : null si pas d'atmosphère, sinon
//    p0 (bar), rho0 (kg/m³) au niveau de référence (sol ou 1 bar),
//    H : hauteur d'échelle (km),
//    t0 : température au niveau de référence (°C),
//    gradient : baisse de température en montant (K/km) — hausse en descendant,
//    tHaut : température minimale en altitude (°C).
// cible        : géantes seulement, pression à atteindre avant de remonter (bar).
// depart       : altitude (m) et vitesse de descente (m/s) au début du vol.

const ASTRES = [
  {
    id: 'soleil', nom: 'Soleil', type: 'etoile', parent: null,
    distanceUA: 0, rayonKm: 696340, g: 274, tempSurface: 5500, vMax: 0,
    atm: { p0: 0.0868, rho0: 2e-4, H: 150, t0: 5500, gradient: -10, tHaut: 5500 },
    depart: { alt: 5e9, vitesse: 200000 },
    couleurs: { sol: '#ffb300', ciel: '#ff8f00', disque: '#ffd54f' },
    surface: 'plasma',
    note: "Aucune fusée ne peut s'y poser : elle brûle bien avant la photosphère.",
  },
  {
    id: 'mercure', nom: 'Mercure', type: 'solide', parent: null,
    distanceUA: 0.387, rayonKm: 2440, g: 3.70, tempSurface: 430, vMax: 4,
    atm: null,
    depart: { alt: 4000, vitesse: 60 },
    couleurs: { sol: '#8d8478', ciel: '#000000', disque: '#9e9e9e' },
    surface: 'roche cratérisée (face éclairée)',
    note: 'Pas d’air, mais 430 °C côté jour et un vent solaire 7 fois plus fort que sur Terre.',
  },
  {
    id: 'venus', nom: 'Vénus', type: 'solide', parent: null,
    distanceUA: 0.723, rayonKm: 6052, g: 8.87, tempSurface: 464, vMax: 3,
    // H ajustée pour retrouver ~1 bar vers 50 km d'altitude.
    atm: { p0: 92, rho0: 65, H: 11, t0: 464, gradient: 8, tHaut: -45 },
    depart: { alt: 50000, vitesse: 100 },
    couleurs: { sol: '#a0672b', ciel: '#e0a95a', disque: '#e8c37a' },
    surface: 'basalte brûlant',
    note: '92 bar et 464 °C au sol : il faut une coque lourde et un bouclier.',
  },
  {
    id: 'terre', nom: 'Terre', type: 'solide', parent: null,
    distanceUA: 1.0, rayonKm: 6371, g: 9.81, tempSurface: 15, vMax: 5,
    atm: { p0: 1.013, rho0: 1.225, H: 8.5, t0: 15, gradient: 6.5, tHaut: -56 },
    depart: { alt: 15000, vitesse: 250 },
    couleurs: { sol: '#3f7d3a', ciel: '#5aa9f0', disque: '#4f8fe0' },
    surface: 'prairie',
    note: 'La référence : 1 g, 1 bar, 15 °C.',
  },
  {
    id: 'mars', nom: 'Mars', type: 'solide', parent: null,
    distanceUA: 1.524, rayonKm: 3390, g: 3.72, tempSurface: -63, vMax: 4,
    atm: { p0: 0.006, rho0: 0.020, H: 11.1, t0: -63, gradient: 2.5, tHaut: -110 },
    depart: { alt: 12000, vitesse: 300 },
    couleurs: { sol: '#b5532c', ciel: '#d9a37a', disque: '#c1440e' },
    surface: 'poussière rouge',
    note: 'Air très fin : il freine à peine, les moteurs font presque tout.',
  },
  {
    id: 'jupiter', nom: 'Jupiter', type: 'gazeuse', parent: null,
    distanceUA: 5.203, rayonKm: 69911, g: 24.79, tempSurface: -108, vMax: 0,
    radiationLocale: 2,
    atm: { p0: 1, rho0: 0.16, H: 27, t0: -108, gradient: 2.0, tHaut: -160 },
    cible: 2,
    depart: { alt: 20000, vitesse: 150 },
    couleurs: { sol: '#8a5a3c', ciel: '#d8b48a', disque: '#d8ca9d' },
    surface: 'aucune (gaz)',
    note: 'Gravité 2,5 fois celle de la Terre : le défi le plus dur. Il faut le plus gros moteur et le plus gros réservoir.',
  },
  {
    id: 'saturne', nom: 'Saturne', type: 'gazeuse', parent: null,
    distanceUA: 9.537, rayonKm: 58232, g: 10.44, tempSurface: -139, vMax: 0,
    atm: { p0: 1, rho0: 0.19, H: 59.5, t0: -139, gradient: 0.85, tHaut: -190 },
    cible: 1.5,
    depart: { alt: 30000, vitesse: 150 },
    couleurs: { sol: '#9c8150', ciel: '#e3cf9a', disque: '#ead6a6' },
    surface: 'aucune (gaz)',
    note: 'Atmosphère très étendue : la pression monte lentement, la plongée est longue.',
  },
  {
    id: 'uranus', nom: 'Uranus', type: 'gazeuse', parent: null,
    distanceUA: 19.19, rayonKm: 25362, g: 8.69, tempSurface: -197, vMax: 0,
    atm: { p0: 1, rho0: 0.42, H: 27.7, t0: -197, gradient: 0.75, tHaut: -220 },
    cible: 2,
    depart: { alt: 20000, vitesse: 120 },
    couleurs: { sol: '#3f8f95', ciel: '#9fe0e4', disque: '#a6e3e9' },
    surface: 'aucune (gaz)',
    note: 'Géante de glaces, très froide.',
  },
  {
    id: 'neptune', nom: 'Neptune', type: 'gazeuse', parent: null,
    distanceUA: 30.07, rayonKm: 24622, g: 11.15, tempSurface: -201, vMax: 0,
    atm: { p0: 1, rho0: 0.45, H: 19.7, t0: -201, gradient: 0.95, tHaut: -225 },
    cible: 2,
    depart: { alt: 15000, vitesse: 150 },
    couleurs: { sol: '#1f3f9a', ciel: '#4b70dd', disque: '#4b70dd' },
    surface: 'aucune (gaz)',
    note: 'La plus lointaine, la plus ventée.',
  },
  // --- Les 10 plus gros satellites, du plus grand au plus petit ---
  {
    id: 'ganymede', nom: 'Ganymède', type: 'solide', parent: 'jupiter',
    distanceUA: 5.203, rayonKm: 2634, g: 1.428, tempSurface: -163, vMax: 3,
    radiationLocale: 1,
    atm: null,
    depart: { alt: 3000, vitesse: 40 },
    couleurs: { sol: '#8f8577', ciel: '#000000', disque: '#8f8577' },
    surface: 'glace et roche',
    note: 'Plus grosse lune du système, plus grande que Mercure.',
  },
  {
    id: 'titan', nom: 'Titan', type: 'solide', parent: 'saturne',
    distanceUA: 9.537, rayonKm: 2575, g: 1.352, tempSurface: -179, vMax: 4,
    atm: { p0: 1.467, rho0: 5.3, H: 21, t0: -179, gradient: 1.0, tHaut: -203 },
    depart: { alt: 10000, vitesse: 30 },
    couleurs: { sol: '#7a5a2a', ciel: '#d39a3c', disque: '#d8a24a' },
    surface: 'sable organique',
    note: 'Air 4 fois plus dense que sur Terre et gravité faible : la chute est lente.',
  },
  {
    id: 'callisto', nom: 'Callisto', type: 'solide', parent: 'jupiter',
    distanceUA: 5.203, rayonKm: 2410, g: 1.235, tempSurface: -139, vMax: 3,
    atm: null,
    depart: { alt: 3000, vitesse: 40 },
    couleurs: { sol: '#5e5448', ciel: '#000000', disque: '#6b5f52' },
    surface: 'glace sombre cratérisée',
    note: 'Hors des ceintures de radiation de Jupiter.',
  },
  {
    id: 'io', nom: 'Io', type: 'solide', parent: 'jupiter',
    distanceUA: 5.203, rayonKm: 1822, g: 1.796, tempSurface: -143, vMax: 3,
    radiationLocale: 20,
    atm: null,
    depart: { alt: 3000, vitesse: 45 },
    couleurs: { sol: '#d8c34a', ciel: '#000000', disque: '#e3d25c' },
    surface: 'soufre volcanique',
    note: 'En plein cœur des ceintures de radiation de Jupiter.',
  },
  {
    id: 'lune', nom: 'Lune', type: 'solide', parent: 'terre',
    distanceUA: 1.0, rayonKm: 1737, g: 1.62, tempSurface: -20, vMax: 4,
    atm: null,
    depart: { alt: 3000, vitesse: 40 },
    couleurs: { sol: '#9a9a9a', ciel: '#000000', disque: '#bdbdbd' },
    surface: 'régolithe',
    note: 'Le bon endroit pour apprendre.',
  },
  {
    id: 'europe', nom: 'Europe', type: 'solide', parent: 'jupiter',
    distanceUA: 5.203, rayonKm: 1561, g: 1.314, tempSurface: -160, vMax: 3,
    radiationLocale: 6,
    atm: null,
    depart: { alt: 3000, vitesse: 35 },
    couleurs: { sol: '#c9bfa8', ciel: '#000000', disque: '#d6ccb4' },
    surface: 'banquise striée',
    note: 'Un océan sous la glace, et beaucoup de radiations.',
  },
  {
    id: 'triton', nom: 'Triton', type: 'solide', parent: 'neptune',
    distanceUA: 30.07, rayonKm: 1353, g: 0.779, tempSurface: -235, vMax: 3,
    atm: { p0: 1.4e-5, rho0: 1.2e-4, H: 14, t0: -235, gradient: 0, tHaut: -235 },
    depart: { alt: 3000, vitesse: 30 },
    couleurs: { sol: '#c9a9a0', ciel: '#05060a', disque: '#d4b8ae' },
    surface: 'glace d’azote',
    note: 'L’un des endroits les plus froids du système solaire.',
  },
  {
    id: 'titania', nom: 'Titania', type: 'solide', parent: 'uranus',
    distanceUA: 19.19, rayonKm: 788, g: 0.379, tempSurface: -203, vMax: 3,
    atm: null,
    depart: { alt: 2500, vitesse: 25 },
    couleurs: { sol: '#8c8580', ciel: '#000000', disque: '#9b938d' },
    surface: 'glace et canyons',
    note: 'Plus grosse lune d’Uranus.',
  },
  {
    id: 'oberon', nom: 'Obéron', type: 'solide', parent: 'uranus',
    distanceUA: 19.19, rayonKm: 761, g: 0.346, tempSurface: -198, vMax: 3,
    atm: null,
    depart: { alt: 2500, vitesse: 25 },
    couleurs: { sol: '#7d736b', ciel: '#000000', disque: '#8a8078' },
    surface: 'glace sombre',
    note: 'Lune externe d’Uranus, très cratérisée.',
  },
  {
    id: 'rhea', nom: 'Rhéa', type: 'solide', parent: 'saturne',
    distanceUA: 9.537, rayonKm: 764, g: 0.264, tempSurface: -199, vMax: 3,
    atm: null,
    depart: { alt: 2500, vitesse: 20 },
    couleurs: { sol: '#b8b4ae', ciel: '#000000', disque: '#c8c4be' },
    surface: 'glace claire',
    note: 'Gravité la plus faible du jeu : 1/37 de la Terre.',
  },
];

const ASTRES_PAR_ID = Object.fromEntries(ASTRES.map((a) => [a.id, a]));
