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
    tout: 'Tout le système solaire',          // bouton « centrer » de l'orbiteur
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

// Change de système courant (au chargement d'une partie).
function choisirSysteme(id) { SYSTEME = SYSTEMES[id] || SYSTEMES.solaire; return SYSTEME; }

function etoileRacine() { return ASTRES_PAR_ID[SYSTEME.etoile]; }
function planeteOrigine() { return ASTRES_PAR_ID[SYSTEME.origine]; }
function estOrigine(id) { return id === SYSTEME.origine; }
function estEtoileRacine(id) { return id === SYSTEME.etoile; }

// Flux de l'étoile hôte à dUA unités astronomiques, relatif à celui que reçoit la Terre (1).
function fluxStellaire(dUA) { return SYSTEME.luminosite / (dUA * dUA); }
