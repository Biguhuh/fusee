'use strict';
// Catalogue complet du système solaire.
// Complète les 19 astres détaillés (astres.js) avec : masses, orbites, Pluton, la ceinture
// d'astéroïdes et toutes les lunes connues (données NASA/JPL, donnees-jpl.js).
//
// Orbites simplifiées en 2D (plan de l'écliptique) : on garde a, e, la longitude du périhélie,
// l'anomalie moyenne et le sens de rotation. Les inclinaisons sont ignorées.

const UA_KM = 149597870.7;
const J2000_JD = 2451545.0;
const JOUR = 86400;
const GM_SOLEIL = 1.32712440041e11; // km³/s²

// Planètes : éléments moyens J2000 (Standish, JPL) : a (UA), e, L (°), ϖ (°), GM (km³/s²).
const ORBITES_PLANETES = {
  mercure: [0.38709927, 0.20563593, 252.25032350, 77.45779628, 22031.868551],
  venus: [0.72333566, 0.00677672, 181.97909950, 131.60246718, 324858.592],
  terre: [1.00000261, 0.01671123, 100.46457166, 102.93768193, 398600.435436],
  mars: [1.52371034, 0.09339410, -4.55343205, -23.94362959, 42828.375214],
  jupiter: [5.20288700, 0.04838624, 34.39644051, 14.72847983, 126686531.9],
  saturne: [9.53667594, 0.05386179, 49.95424423, 92.59887831, 37931206.2],
  uranus: [19.18916464, 0.04725744, 313.23810451, 170.95427630, 5793951.3],
  neptune: [30.06992276, 0.00859048, -55.12002969, 44.96476227, 6835099.5],
  pluton: [39.48211675, 0.24882730, 238.92903833, 224.06891629, 869.326],
};

const PLANETE_PAR_NOM_JPL = { Earth: 'terre', Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturne', Uranus: 'uranus', Neptune: 'neptune', Pluto: 'pluton' };
const ID_DETAILLE_PAR_CODE = { 301: 'lune', 501: 'io', 502: 'europe', 503: 'ganymede', 504: 'callisto', 605: 'rhea', 606: 'titan', 703: 'titania', 704: 'oberon', 801: 'triton' };

// Noms français des lunes et astéroïdes connus.
const NOMS_FR = {
  Moon: 'Lune', Europa: 'Europe', Ganymede: 'Ganymède', Rhea: 'Rhéa', Iapetus: 'Japet', Tethys: 'Téthys',
  Enceladus: 'Encelade', Hyperion: 'Hypérion', Phoebe: 'Phœbé', Epimetheus: 'Épiméthée', Prometheus: 'Prométhée',
  Pandora: 'Pandore', Helene: 'Hélène', Oberon: 'Obéron', Proteus: 'Protée', Nereid: 'Néréide',
  Amalthea: 'Amalthée', Thebe: 'Thébé', Pasiphae: 'Pasiphaé', Sinope: 'Sinopé', Carme: 'Carmé', Ananke: 'Ananké',
  Leda: 'Léda', Kerberos: 'Cerbère', Telesto: 'Télesto', Galatea: 'Galatée', Naiad: 'Naïade', Metis: 'Métis',
  Adrastea: 'Adrastée', Callirrhoe: 'Callirrhoé', Magaclite: 'Mégaclité', Megaclite: 'Mégaclité', Taygete: 'Taygète',
  Ceres: 'Cérès', Hygiea: 'Hygie', Juno: 'Junon', Psyche: 'Psyché', Hydra: 'Hydre', Cupid: 'Cupidon',
  Juliet: 'Juliette', Ophelia: 'Ophélie', Cressida: 'Cressida', Desdemona: 'Desdémone', Rosalind: 'Rosalinde',
  Margaret: 'Marguerite', Prospero: 'Prospéro', Stephano: 'Stéphano', Daphnis: 'Daphnis', Calypso: 'Calypso',
  Polydeuces: 'Pollux', Methone: 'Méthone', Pallene: 'Pallène', Aegaeon: 'Égéon', Atlas: 'Atlas', Pan: 'Pan',
};

function nomFrancais(nom) {
  if (NOMS_FR[nom]) return NOMS_FR[nom];
  // Désignations provisoires : S2004_S_54 → S/2004 S 54
  const m = /^S(\d{4})_?([A-Z])_?(\d+)$/.exec(nom);
  if (m) return `S/${m[1]} ${m[2]} ${m[3]}`;
  return nom.replace(/_/g, ' ');
}

// ---------- Pluton (détaillé) ----------
ASTRES.push({
  id: 'pluton', nom: 'Pluton', type: 'solide', parent: null, naine: true,
  distanceUA: 39.48, rayonKm: 1188.3, g: 0.62, tempSurface: -229, vMax: 3,
  atm: { p0: 1e-5, rho0: 6e-5, H: 60, t0: -229, gradient: 0, tHaut: -229 },
  depart: { alt: 3000, vitesse: 30 },
  couleurs: { sol: '#cdb79e', ciel: '#05060a', disque: '#d9c3a5' },
  surface: "plaine de glace d'azote",
  note: "Planète naine. Plaine de glace d'azote Spoutnik, montagnes de glace d'eau, atmosphère ténue d'azote.",
});
ASTRES_PAR_ID.pluton = ASTRES[ASTRES.length - 1];
ASTRES_PAR_ID.pluton.relief = { amplitude: 140, longueur: 1800, crateres: 0.3 };

// ---------- Astres génériques (lunes et astéroïdes sans fiche détaillée) ----------
const COULEURS_FAMILLE = {
  terre: '#9a9a9a', mars: '#6f5b4b', jupiter: '#6d6259', saturne: '#bdb7ad', uranus: '#8a8580',
  neptune: '#9a9aa2', pluton: '#b9a690', ceinture: '#7d7468',
};

function astreGenerique(o) {
  const R = o.rayonKm * 1000;
  const g = (o.gm * 1e9) / (R * R);
  const tEq = (278.6 / Math.sqrt(o.distanceUA)) * 0.915 - KELVIN;
  const alt = Math.min(3000, Math.max(300, R * 0.3));
  const base = COULEURS_FAMILLE[o.famille] || '#8a8580';
  const ton = 0.8 + 0.4 * hash2(o.rayonKm * 13.1, 3);
  const sol = assombrirHex(base, ton);
  return {
    id: o.id, nom: o.nom, type: 'solide', parent: o.parent,
    distanceUA: o.distanceUA, rayonKm: o.rayonKm, g, tempSurface: Math.round(tEq), vMax: 3,
    atm: null,
    depart: { alt, vitesse: Math.max(0.3, Math.min(40, 0.5 * Math.sqrt(2 * g * alt))) },
    couleurs: { sol, ciel: '#000000', disque: sol },
    surface: o.surface,
    note: o.note,
    relief: {
      amplitude: Math.max(15, Math.min(150, R * 0.04)),
      longueur: Math.max(200, Math.min(1500, R * 0.3)),
      crateres: 0.6,
    },
    rayonEstime: !!o.estime,
    generique: true,
  };
}

function assombrirHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0');
  return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255);
}

// ---------- Orbites et masses ----------
// orbite : { centre, a (km), e, varpi (°), M0 (° à J2000), n (°/jour), retro }
function orbitePlanete(id) {
  const [a, e, L, varpi, gm] = ORBITES_PLANETES[id];
  const astre = ASTRES_PAR_ID[id];
  astre.gm = gm;
  astre.orbite = { centre: 'soleil', a: a * UA_KM, e, varpi, M0: L - varpi, n: 360 / (365.256363 * Math.pow(a, 1.5)), retro: false };
}

ASTRES_PAR_ID.soleil.gm = GM_SOLEIL;
ASTRES_PAR_ID.soleil.orbite = null;
for (const id in ORBITES_PLANETES) orbitePlanete(id);

// Lunes (toutes)
const FAMILLE_SURFACE = {
  terre: 'régolithe', mars: 'roche poreuse et poussière', jupiter: 'roche sombre', saturne: 'glace et poussière',
  uranus: 'glace sombre', neptune: 'glace', pluton: 'glace',
};
for (const l of LUNES_JPL) {
  const [code, planeteJpl, nomJpl, gmJpl, rayon, estime, densite, a, e, w, M, inc, noeud, P] = l;
  const parent = PLANETE_PAR_NOM_JPL[planeteJpl];
  const idDetaille = ID_DETAILLE_PAR_CODE[code];
  const rho = densite || (rayon > 100 ? 1.6 : 1.3); // g/cm³ : estimation si inconnue
  const gm = gmJpl || (6.674e-20 * (4 / 3) * Math.PI * Math.pow(rayon, 3) * rho * 1e12); // km³/s²
  let astre;
  if (idDetaille) {
    astre = ASTRES_PAR_ID[idDetaille];
  } else {
    const nom = nomFrancais(nomJpl);
    const provisoire = /^S\//.test(nom);
    astre = astreGenerique({
      id: 'l' + code, nom, parent, rayonKm: rayon, gm, estime,
      distanceUA: ORBITES_PLANETES[parent][0], famille: parent,
      surface: FAMILLE_SURFACE[parent],
      note: (inc > 90 ? 'Lune irrégulière rétrograde' : rayon < 20 ? 'Petite lune' : 'Lune') + ` de ${ASTRES_PAR_ID[parent].nom}` +
        (provisoire ? ', désignation provisoire (découverte récente).' : '.') +
        (estime ? ' Taille non mesurée : estimation.' : ''),
    });
    ASTRES.push(astre);
    ASTRES_PAR_ID[astre.id] = astre;
  }
  astre.parent = parent;
  astre.codeJpl = code;
  astre.nomJpl = nomJpl;
  astre.gm = gm;
  astre.densite = densite || null;
  astre.inclinaison = inc;
  astre.orbite = { centre: parent, a, e, varpi: (noeud || 0) + (w || 0), M0: M || 0, n: 360 / P, retro: inc > 90, periodeJours: P };
}

// Astéroïdes de la ceinture principale
for (const s of ASTEROIDES_JPL) {
  const nom = nomFrancais(s.nom);
  const rayon = (s.diametre || 100) / 2;
  const rho = s.densite || 2.0;
  const gm = s.gm || (6.674e-20 * (4 / 3) * Math.PI * Math.pow(rayon, 3) * rho * 1e12);
  const astre = astreGenerique({
    id: 'a' + s.num, nom, parent: null, rayonKm: rayon, gm, distanceUA: s.a, famille: 'ceinture',
    surface: s.type ? `astéroïde de type ${s.type}` : 'roche',
    note: (s.num === '1' ? 'Planète naine, le plus gros objet de la ceinture d’astéroïdes.' : `Astéroïde n° ${s.num} de la ceinture principale.`) +
      (s.rotation ? ` Tourne sur lui-même en ${fmtNombre(s.rotation, 1)} h.` : ''),
  });
  astre.asteroide = true;
  if (s.num === '1') astre.naine = true;
  astre.numero = s.num;
  astre.gm = gm;
  astre.densite = s.densite;
  astre.albedo = s.albedo;
  astre.rotationH = s.rotation;
  astre.inclinaison = s.i;
  astre.orbite = {
    centre: 'soleil', a: s.a * UA_KM, e: s.e, varpi: s.om + s.w,
    M0: s.ma - s.n * (s.epoqueJD - J2000_JD), n: s.n, retro: false,
  };
  ASTRES.push(astre);
  ASTRES_PAR_ID[astre.id] = astre;
}

function fmtNombre(n, dec) { return n.toLocaleString('fr-FR', { maximumFractionDigits: dec }); }

// ---------- Grandeurs dérivées ----------
for (const a of ASTRES) {
  if (!a.gm) a.gm = (a.g * Math.pow(a.rayonKm * 1000, 2)) / 1e9;
  // Les géantes : g au niveau 1 bar déjà donné. Les autres : cohérence g ↔ GM.
  if (a.orbite) {
    const gmCentre = ASTRES_PAR_ID[a.orbite.centre].gm;
    // Sphère d'influence (km). Pour les très petites lunes (Phobos…), elle est plus petite que l'astre :
    // on impose 3 rayons pour pouvoir quand même tourner autour (entorse au modèle).
    a.soiReelle = a.orbite.a * Math.pow(a.gm / gmCentre, 0.4);
    a.soi = Math.max(a.soiReelle, a.rayonKm * 3);
  } else a.soi = Infinity;
  // Le masque « grosses lunes » : diamètre ≥ 100 km.
  a.grosse = !a.parent || a.rayonKm >= 50;
}

// Enfants de chaque astre (pour les sphères d'influence).
const ENFANTS = {};
for (const a of ASTRES) if (a.orbite) (ENFANTS[a.orbite.centre] = ENFANTS[a.orbite.centre] || []).push(a);

// ---------- Catégories ----------
// Ordre d'affichage, nom, icône et définition courte (affichée dans la fiche).
const CATEGORIES = {
  etoile: { nom: 'Étoile', icone: '☀️', def: 'Boule de gaz qui produit sa propre lumière par fusion nucléaire.' },
  tellurique: { nom: 'Planète tellurique', icone: '🌍', def: 'Planète rocheuse, avec une surface solide, proche du Soleil.' },
  gazeuse: { nom: 'Géante gazeuse', icone: '🪐', def: 'Planète géante faite surtout d’hydrogène et d’hélium, sans surface solide.' },
  glaces: { nom: 'Géante de glaces', icone: '🧊', def: 'Planète géante formée surtout d’eau, d’ammoniac et de méthane (les « glaces »), sous une atmosphère d’hydrogène.' },
  naine: { nom: 'Planète naine', icone: '⚪', def: 'Assez massive pour être ronde, mais elle n’a pas fait le ménage sur son orbite.' },
  luneMajeure: { nom: 'Lune majeure', icone: '🌕', def: 'Satellite assez gros (plus de 190 km de rayon) pour être à peu près rond.' },
  luneReguliere: { nom: 'Petite lune régulière', icone: '🌘', def: 'Petit satellite né avec sa planète : orbite proche, presque circulaire, dans le sens de rotation.' },
  luneIrreguliere: { nom: 'Lune irrégulière', icone: '🪨', def: 'Objet capturé par sa planète : orbite lointaine, inclinée ou très allongée, souvent rétrograde.' },
  asteroide: { nom: 'Astéroïde', icone: '☄️', def: 'Petit corps rocheux ou métallique qui tourne autour du Soleil, ici dans la ceinture principale.' },
};
// Catégorie calculée à partir des données (type, orbite, inclinaison, sens, taille).
function categorieDe(a) {
  if (a.type === 'etoile') return 'etoile';
  if (a.naine) return 'naine';
  if (a.asteroide) return 'asteroide';
  if (!a.parent) return a.id === 'uranus' || a.id === 'neptune' ? 'glaces' : a.type === 'gazeuse' ? 'gazeuse' : 'tellurique';
  if (a.rayonKm >= 190) return 'luneMajeure';   // Mimas (198 km) est le plus petit astre rond connu
  // Irrégulière : rétrograde, très inclinée, très allongée, ou loin dans la sphère d'influence de sa planète.
  const o = a.orbite, p = ASTRES_PAR_ID[a.parent];
  const loin = p && p.soi < Infinity && o.a > 0.08 * p.soi;
  if (o.retro || (a.inclinaison || 0) > 30 || o.e > 0.3 || loin) return 'luneIrreguliere';
  return 'luneReguliere';
}
for (const a of ASTRES) a.categorie = categorieDe(a);

// ---------- Rotation propre ----------
// Périodes en heures (négatif = sens rétrograde). Planètes et Soleil : valeurs de référence.
// Uranus et Pluton ont l'axe très incliné (98° et 120°) : le jeu, en 2D, ne modélise pas l'inclinaison
// de l'axe, on les fait donc tourner dans le sens de leurs lunes (qui orbitent dans leur plan équatorial).
// Pluton et Charon restent ainsi bloqués face à face, comme en réalité.
const ROTATION_H = { soleil: 609.1, mercure: 1407.6, venus: -5832.5, terre: 23.934, mars: 24.623, jupiter: 9.925, saturne: 10.656, uranus: 17.24, neptune: 16.11, pluton: 153.29 };
// Lunes dont la rotation n'est pas synchrone, mesurée par les courbes de lumière (h).
// Hyperion tourne de façon chaotique (≈ 13 jours en moyenne).
const ROTATION_LUNES_H = {
  l607: 312, l609: 9.274, l802: 11.594, l506: 7.782, l507: 12.03, l509: 13.16, l511: 10.4, l512: 8.3, l510: 12.78,
  l717: 6.9, l716: 2.66, l619: 11.92, l620: 18.8, l626: 13.32, l629: 10.19, l624: 21.97, l622: 13.03, l621: 10.69,
};
// Rotation d'un astre : { heures (signe = sens), synchrone (même face vers sa planète), estimee }.
function rotationDe(a) {
  if (a._rotation) return a._rotation;
  let r;
  if (ROTATION_H[a.id]) r = { heures: ROTATION_H[a.id], synchrone: false };
  else if (ROTATION_LUNES_H[a.id]) r = { heures: ROTATION_LUNES_H[a.id], synchrone: false };
  else if (a.rotationH) r = { heures: a.rotationH, synchrone: false };
  else if (a.parent && a.categorie !== 'luneIrreguliere') {
    // Lune régulière ou majeure : rotation synchrone, un tour par orbite (le sens suit celui de l'orbite).
    r = { heures: (a.orbite.retro ? -1 : 1) * (360 / a.orbite.n) * 24, synchrone: true };
  } else r = { heures: 12, synchrone: false, estimee: true };   // petite lune lointaine sans mesure
  a._rotation = r;
  return r;
}

// Vitesses caractéristiques à une altitude donnée (m) : orbitale et de libération, en m/s.
function vitesseOrbitale(astre, alt) { return Math.sqrt((astre.gm * 1e9) / (astre.rayonKm * 1000 + alt)); }
function vitesseLiberation(astre, alt) { return Math.SQRT2 * vitesseOrbitale(astre, alt); }

// Altitude d'orbite basse (m) : au-dessus de l'atmosphère et du relief.
function altitudeOrbite(astre) {
  if (astre.type === 'gazeuse') return 0;
  let alt = astre.depart.alt;
  if (astre.atm) alt = Math.max(alt, astre.atm.H * 1000 * Math.log(Math.max(1, astre.atm.p0 / 1e-6)));
  return Math.round(alt);
}
