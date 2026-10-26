'use strict';
// Systèmes stellaires. Le jeu se déroule dans un système à la fois : SYSTEME.
// Tout ce qui dépendait du Soleil ou de la Terre « en dur » passe par ici :
// l'étoile racine (et sa luminosité), la planète d'origine de la campagne, les planètes,
// la carte de la visite rapide. Le Système solaire est le premier système ; un autre système
// se décrira avec les mêmes champs, et ses astres porteront son identifiant (astre.systeme).

const SYSTEMES = {
  solaire: {
    id: 'solaire',
    nom: 'Système solaire',
    tout: 'Tout le Système solaire',          // bouton « centrer » de l'orbiteur
    etoile: 'soleil',                          // astre racine (le seul sans orbite)
    luminosite: 1,                             // en luminosités solaires
    distanceA: 'au Soleil',                    // « Distance au Soleil »
    origine: 'terre',                          // planète de départ et de retour de la campagne
    nomOrigine: 'la Terre',
    origineSans: 'Terre',                      // « Rentrer sur Terre »
    positionAL: [0, 0, 0],                     // position dans la Galaxie (années-lumière)
    vueUA: 70,                                 // taille de la vue « tout le système » (UA)
    planetes: ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'],
    // Astres « principaux » comptés dans la progression de l'accueil.
    objectifs: ['mercure', 'venus', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune', 'pluton', 'lune', 'io', 'europe', 'ganymede', 'callisto', 'titan', 'rhea', 'titania', 'oberon', 'triton', 'a1'],
    principaux: ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune', 'pluton'],
    // Carte de la visite rapide : chaque planète et ses lunes détaillées.
    carte: [
      ['soleil', []],
      ['mercure', []],
      ['venus', []],
      ['terre', ['lune']],
      ['mars', []],
      ['jupiter', ['io', 'europe', 'ganymede', 'callisto']],
      ['saturne', ['titan', 'rhea']],
      ['uranus', ['titania', 'oberon']],
      ['neptune', ['triton']],
      ['pluton', ['l901']],
      ['a1', ['a4', 'a2', 'a10']],   // ceinture d'astéroïdes : Cérès, Vesta, Pallas, Hygie
    ],
  },
};

let SYSTEME = SYSTEMES.solaire;
let ASTRES_SOLAIRE = null;    // le Système solaire, mis de côté pendant qu'on joue dans un autre système

// Change de système courant : les listes d'astres (ASTRES, ASTRES_PAR_ID, ENFANTS) prennent celles du système.
// Les autres systèmes sont décrits dans etoiles-proches.js (champ « astres »).
function choisirSysteme(id) {
  const cible = SYSTEMES[id] || SYSTEMES.solaire;
  if (cible === SYSTEME) return SYSTEME;
  if (!ASTRES_SOLAIRE) ASTRES_SOLAIRE = { liste: ASTRES.slice(), enfants: { ...ENFANTS } };
  const liste = cible.id === 'solaire' ? ASTRES_SOLAIRE.liste : cible.astres;
  ASTRES.length = 0;
  ASTRES.push(...liste);
  for (const k of Object.keys(ASTRES_PAR_ID)) delete ASTRES_PAR_ID[k];
  for (const a of liste) ASTRES_PAR_ID[a.id] = a;
  for (const k of Object.keys(ENFANTS)) delete ENFANTS[k];
  if (cible.id === 'solaire') Object.assign(ENFANTS, ASTRES_SOLAIRE.enfants);
  else for (const a of liste) if (a.orbite) (ENFANTS[a.orbite.centre] = ENFANTS[a.orbite.centre] || []).push(a);
  SYSTEME = cible;
  // Positions gardées en cache : elles appartenaient à l'autre système.
  if (typeof cacheEtats !== 'undefined') { cacheEtats.clear(); cacheT = NaN; }
  return SYSTEME;
}
// Le système d'une campagne, avec sa planète de base (point d'ancrage) quand on s'est installé ailleurs.
function choisirSystemeCampagne(v) {
  choisirSysteme(v && v.systeme ? v.systeme : 'solaire');
  if (v && v.planeteBase && SYSTEME.id !== 'solaire') {
    SYSTEME.base = v.planeteBase;
  }
  return SYSTEME;
}
function ressourcesIllimitees() { return SYSTEME.illimite !== false; }

function etoileRacine() { return ASTRES_PAR_ID[SYSTEME.etoile]; }
function planeteOrigine() { return ASTRES_PAR_ID[SYSTEME.origine]; }
// Astre de repli quand il n'y a pas de planète d'origine (autre système) : la planète de base, sinon l'étoile.
function astreAncrage() { return SYSTEME.origine || SYSTEME.base || SYSTEME.etoile; }
function estOrigine(id) { return id === SYSTEME.origine; }
function estEtoileRacine(id) { return id === SYSTEME.etoile; }

// Flux de l'étoile hôte à dUA unités astronomiques, relatif à celui que reçoit la Terre (1).
function fluxStellaire(dUA) { return SYSTEME.luminosite / (dUA * dUA); }
