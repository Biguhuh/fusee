'use strict';
// Rayonnement en surface, en vraies unités : dose reçue sans protection, en sieverts par jour.
// Valeurs mesurées ou publiées quand elles existent, estimations sinon (et la fiche le dit).
// Sert à équiper les robots : un blindage plus épais protège mieux, mais pèse (et coûte du Δv).

// Mesures et valeurs de référence (Sv/jour, surface, sans protection).
const DOSES_REFERENCE = {
  terre: [0.0000066, 'mesure', 'environ 2,4 mSv par an au sol'],
  lune: [0.00137, 'mesure', 'mesuré par Chang’e 4 (2019)'],
  mars: [0.00067, 'mesure', 'mesuré par Curiosity (RAD)'],
  io: [36, 'reference', 'en plein cœur des ceintures de Jupiter'],
  europe: [5.4, 'reference', 'ceintures de Jupiter'],
  ganymede: [0.08, 'reference', 'protégée par son propre champ magnétique'],
  callisto: [0.0001, 'reference', 'hors des ceintures de Jupiter'],
};

// Rayons cosmiques et vent solaire sur un sol sans air ni champ magnétique (Sv/jour) : ≈ celui de la Lune.
function doseCosmique(dUA) { return 0.0011 + 0.0003 / (dUA * dUA); }

// Ceintures de Jupiter : dose selon la distance à la planète (rayons joviens), entre les lunes connues.
const CEINTURES_JUPITER = [[5.9, 36], [9.4, 5.4], [15, 0.5], [26.3, 0.0001]];
function demiGrandAxeKm(a) {
  if (!a.orbite || !a.orbite.n || !a.parent) return null;
  const n = (a.orbite.n * Math.PI) / 180 / 86400;               // rad/s
  return Math.cbrt(ASTRES_PAR_ID[a.parent].gm / (n * n));
}

// Dose en surface : { svJour, source: 'mesure' | 'reference' | 'estimation', note }.
function doseSurface(a) {
  const ref = DOSES_REFERENCE[a.id];
  if (ref) return { svJour: ref[0], source: ref[1], note: ref[2] };
  let d = doseCosmique(a.distanceUA || 1), note = 'rayons cosmiques et vent solaire';
  // Ceintures de Jupiter (interpolation entre Io, Europe, Ganymède et Callisto, en échelle logarithmique).
  if (a.parent === 'jupiter') {
    const ak = demiGrandAxeKm(a);
    if (ak) {
      const r = ak / ASTRES_PAR_ID.jupiter.rayonKm, C = CEINTURES_JUPITER;
      let ceinture;
      if (r <= C[0][0]) ceinture = Math.min(300, C[0][1] * Math.pow(C[0][0] / r, 3));
      else if (r >= C[C.length - 1][0]) ceinture = 0;
      else {
        let i = 0; while (r > C[i + 1][0]) i++;
        const f = (r - C[i][0]) / (C[i + 1][0] - C[i][0]);
        ceinture = Math.exp(Math.log(C[i][1]) + f * (Math.log(C[i + 1][1]) - Math.log(C[i][1])));
      }
      if (ceinture > d) { d = ceinture; note = 'ceintures de radiation de Jupiter'; }
    }
  }
  // Ceintures de Saturne, bien plus faibles : quelques mSv par jour près des anneaux.
  if (a.parent === 'saturne') {
    const ak = demiGrandAxeKm(a);
    if (ak && ak / ASTRES_PAR_ID.saturne.rayonKm < 10) { d += 0.01; note = 'ceintures de Saturne'; }
  }
  // Une atmosphère arrête les particules : Mars garde la moitié de la dose lunaire, la Terre ou Titan presque rien.
  if (a.atm && a.type === 'solide') {
    const colonne = (a.atm.p0 * 1e5) / (a.g || 1);                // masse d'air au-dessus du sol (kg/m²)
    d = Math.max(0.000005, d * Math.exp(-colonne / 300));
    note += ', très atténués par l’atmosphère';
  }
  return { svJour: d, source: 'estimation', note };
}

// Affichage d'une dose par jour, en Sv, mSv ou µSv.
function fmtDose(sv) {
  if (sv >= 1) return `${fmt(sv, sv < 10 ? 1 : 0)} Sv/jour`;
  if (sv >= 0.001) return `${fmt(sv * 1000, sv < 0.01 ? 2 : 1)} mSv/jour`;
  return `${fmt(sv * 1e6, 1)} µSv/jour`;
}

// Blindages des robots. facteur : part de la dose qui atteint l'électronique ;
// tolerance : dose totale que l'électronique supporte avant de griller (Gy, ≈ Sv ici).
const BLINDAGES_ROBOT = {
  standard: { nom: 'Standard', detail: 'électronique courante, boîtier léger', masse: 0, facteur: 1, tolerance: 50 },
  durci: { nom: 'Durci', detail: 'composants durcis et boîtier en aluminium de 5 mm', masse: 25, facteur: 0.3, tolerance: 1000 },
  voute: { nom: 'Voûte en titane', detail: 'composants durcis dans une voûte de titane de 1 cm, comme la sonde Juno', masse: 150, facteur: 0.03, tolerance: 1000 },
};

// Durée de vie (s) de l'électronique d'un robot sur cet astre, avec ce blindage.
function dureeVieRobot(a, cle) {
  const b = BLINDAGES_ROBOT[cle], d = doseSurface(a).svJour * b.facteur;
  return d > 0 ? (b.tolerance / d) * 86400 : Infinity;
}

// Coût du blindage : ergols en plus pour descendre sa masse depuis l'orbite basse (kg) et Δv perdu (m/s).
// Descente ≈ vitesse orbitale au sol + 10 % de pertes ; module de descente standard de l'atterrisseur.
function coutBlindage(a, cle) {
  const f = assemblerFusee(equipementParDefaut());
  const masse = BLINDAGES_ROBOT[cle].masse;
  const dvDescente = 1.1 * vitesseOrbitale(a, 0);
  const ergols = masse * (Math.exp(dvDescente / (f.isp * G0)) - 1);
  const dvPerdu = deltaVRestant(f, f.carburant) - deltaVRestant({ ...f, masseSeche: f.masseSeche + masse }, f.carburant);
  return { masse, ergols, dvPerdu };
}

// Blindage conseillé : le plus léger qui tient au moins 30 jours.
function blindageConseille(a) {
  for (const cle of Object.keys(BLINDAGES_ROBOT)) if (dureeVieRobot(a, cle) >= 30 * 86400) return cle;
  return 'voute';
}
