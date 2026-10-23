'use strict';
// Pièces du hangar. Masses en kg.
// La fusée nue (cabine + structure) pèse FUSEE_BASE.masse.

const FUSEE_BASE = {
  masse: 2000,      // kg
  cx: 0.5,          // coefficient de traînée
  surface: 5,       // m², section frontale (≈ 2,5 m de diamètre)
  hauteur: 14,      // m
  pressionMax: 3,   // bar, sans renfort
  tempMax: 150,     // °C, sans bouclier
  protection: 1.5,  // rayonnement supporté sans panneau (1 = Terre)
};

const EQUIPEMENTS = {
  moteur: {
    titre: 'Moteur',
    aide: 'Poussée en kilonewtons. Il faut plus de poussée que de poids pour monter ou freiner.',
    options: [
      { id: 'libellule', nom: 'Libellule', poussee: 15000, isp: 300, masse: 100 },
      { id: 'faucon', nom: 'Faucon', poussee: 60000, isp: 310, masse: 300 },
      { id: 'titan', nom: 'Titan', poussee: 200000, isp: 320, masse: 800 },
      { id: 'heracles', nom: 'Héraclès', poussee: 600000, isp: 330, masse: 2000 },
      { id: 'promethee', nom: 'Prométhée', poussee: 1500000, isp: 340, masse: 4500 },
      { id: 'raptor', nom: 'Raptor (méthane)', poussee: 2000000, isp: 380, masse: 1600 },
    ],
    defaut: 'faucon',
  },
  reservoir: {
    titre: 'Réservoir',
    aide: 'Le carburant se consomme à chaque poussée et pèse lourd.',
    options: [
      { id: 'petit', nom: 'Petit', carburant: 500, masse: 50 },
      { id: 'moyen', nom: 'Moyen', carburant: 2000, masse: 200 },
      { id: 'grand', nom: 'Grand', carburant: 6000, masse: 500 },
      { id: 'geant', nom: 'Géant', carburant: 15000, masse: 1200 },
      { id: 'titanesque', nom: 'Titanesque', carburant: 40000, masse: 2500 },
    ],
    defaut: 'moyen',
  },
  coque: {
    titre: 'Renforts de coque',
    aide: 'Pression supportée sans dégâts. Au-delà, la coque se déforme puis cède (vite après +10 %).',
    options: [
      { id: 'aucun', nom: 'Aucun', pressionMax: FUSEE_BASE.pressionMax, masse: 0 },
      { id: 'leger', nom: 'Léger', pressionMax: 15, masse: 300 },
      { id: 'renforce', nom: 'Renforcé', pressionMax: 60, masse: 900 },
      { id: 'lourd', nom: 'Lourd', pressionMax: 150, masse: 2000 },
      { id: 'abyssal', nom: 'Abyssal', pressionMax: 500, masse: 4500 },
    ],
    defaut: 'aucun',
  },
  bouclier: {
    titre: 'Bouclier thermique',
    aide: 'Température de coque supportée sans dégâts. Au-delà, elle brûle petit à petit.',
    options: [
      { id: 'aucun', nom: 'Aucun', tempMax: FUSEE_BASE.tempMax, masse: 0 },
      { id: 'ceramique', nom: 'Céramique', tempMax: 600, masse: 300 },
      { id: 'ablatif', nom: 'Ablatif', tempMax: 1200, masse: 800 },
      { id: 'carbone', nom: 'Carbone-carbone', tempMax: 2500, masse: 1600 },
      { id: 'tungstene', nom: 'Tungstène', tempMax: 3000, masse: 3500 },
    ],
    defaut: 'aucun',
  },
  panneau: {
    titre: 'Panneau anti-vent solaire',
    aide: 'Protection contre le rayonnement (1 = niveau de la Terre).',
    options: [
      { id: 'aucun', nom: 'Aucun', protection: FUSEE_BASE.protection, masse: 0 },
      { id: 'leger', nom: 'Léger', protection: 8, masse: 100 },
      { id: 'moyen', nom: 'Moyen', protection: 30, masse: 300 },
      { id: 'lourd', nom: 'Lourd', protection: 150, masse: 800 },
      { id: 'helio', nom: 'Héliosphérique', protection: 50000, masse: 2000 },
    ],
    defaut: 'aucun',
  },
};

function equipementParDefaut() {
  const e = {};
  for (const k in EQUIPEMENTS) e[k] = EQUIPEMENTS[k].defaut;
  return e;
}

function piece(categorie, id) {
  const cat = EQUIPEMENTS[categorie];
  return cat.options.find((o) => o.id === id) || cat.options.find((o) => o.id === cat.defaut);
}

// Caractéristiques de la fusée assemblée.
function assemblerFusee(choix) {
  const m = piece('moteur', choix.moteur);
  const r = piece('reservoir', choix.reservoir);
  const c = piece('coque', choix.coque);
  const b = piece('bouclier', choix.bouclier);
  const p = piece('panneau', choix.panneau);
  const masseSeche = FUSEE_BASE.masse + m.masse + r.masse + c.masse + b.masse + p.masse;
  return {
    choix: { ...choix },
    masseSeche,
    carburant: r.carburant,
    masseTotale: masseSeche + r.carburant,
    poussee: m.poussee,
    isp: m.isp,
    pressionMax: c.pressionMax,
    tempMax: b.tempMax,
    protection: p.protection,
  };
}
