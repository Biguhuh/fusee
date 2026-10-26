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

// Rayons cosmiques et vent de l'étoile sur un sol sans air ni champ magnétique (Sv/jour) : ≈ celui de la Lune.
// flux : lumière de l'étoile hôte reçue (1 = la Terre) ; la part stellaire lui est proportionnelle.
function doseCosmique(flux) { return 0.0011 + 0.0003 * flux; }
// Flux reçu par un astre (via sa distance à l'étoile, en UA).
function fluxAstre(a) { return a.flux !== undefined ? a.flux : fluxStellaire(a.distanceUA || 1); }

// Ceintures de Jupiter : dose selon la distance à la planète (rayons joviens), entre les lunes connues.
const CEINTURES_JUPITER = [[5.9, 36], [9.4, 5.4], [15, 0.5], [26.3, 0.0001]];
function demiGrandAxeKm(a) {
  if (!a.orbite || !a.orbite.n || !a.parent) return null;
  const n = (a.orbite.n * Math.PI) / 180 / 86400;               // rad/s
  return Math.cbrt(ASTRES_PAR_ID[a.parent].gm / (n * n));
}

// Dose mortelle pour l'équipage (Sv, reçue en quelques jours).
const DOSE_MORTELLE = 4;

// Géantes : dose au-dessus des nuages (estimations ; Jupiter : ceintures internes, comme pour la sonde Juno).
const DOSES_GEANTES = { jupiter: 10, saturne: 0.01, uranus: 0.002, neptune: 0.002 };

// Dose dans l'espace autour de l'astre, sans atmosphère au-dessus (Sv/jour) : { sv, note }.
// L'étoile dépend de la distance (flux reçu) ; les autres valeurs sont gardées en cache.
function doseEspace(a, flux) {
  if (a.type === 'etoile') return { sv: doseCosmique(flux || 1), note: 'vent solaire, en 1/d²' };
  if (a._doseEspace) return a._doseEspace;
  let r;
  const ref = DOSES_REFERENCE[a.id];
  if (ref && !a.atm) r = { sv: ref[0], note: ref[2] };
  else if (DOSES_GEANTES[a.id] !== undefined) r = { sv: DOSES_GEANTES[a.id] + doseCosmique(fluxAstre(a)), note: a.id === 'jupiter' ? 'ceintures de radiation de Jupiter' : 'rayons cosmiques et ceintures' };
  else r = doseEspaceEstimee(a);
  a._doseEspace = r;
  return r;
}

// Masse d'air au-dessus d'une altitude (kg/m²) : c'est elle qui arrête les particules.
function colonneAir(a, alt, c) {
  if (!a.atm) return 0;
  c = c || conditions(a, alt);
  return (c.p * 1e5) / Math.max(0.01, c.g);
}

// Dose à une altitude (m), sans protection (Sv/jour). c : conditions déjà calculées (facultatif).
// L'air atténue la dose de l'espace ; pour la Terre et Mars, on retombe sur la dose mesurée au sol.
function doseLocale(a, alt, c) {
  const esp = doseEspace(a, c ? c.flux : undefined).sv;
  if (!a.atm) return esp;
  const col = colonneAir(a, alt, c);
  const ref = DOSES_REFERENCE[a.id];
  if (ref) {
    // Dose mesurée au sol : on passe de la dose de l'espace à celle du sol selon la part d'air au-dessus.
    const k = Math.min(1, col / colonneAir(a, 0));
    return esp * Math.pow(ref[0] / esp, k);
  }
  return Math.max(0.000005, esp * Math.exp(-col / 300));
}

// Dose en surface : { svJour, source: 'mesure' | 'reference' | 'estimation', note }.
function doseSurface(a) {
  const ref = DOSES_REFERENCE[a.id];
  if (ref) return { svJour: ref[0], source: ref[1], note: ref[2] };
  const e = doseEspace(a);
  const sv = doseLocale(a, 0);
  return { svJour: sv, source: 'estimation', note: e.note + (a.atm && sv < e.sv * 0.5 ? ', très atténués par l’atmosphère' : '') };
}

function doseEspaceEstimee(a) {
  let d = doseCosmique(fluxAstre(a)), note = 'rayons cosmiques et vent solaire';
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
  return { sv: d, note };
}

// Durée (s) avant que l'équipage reçoive une dose mortelle, à ce débit (Sv/jour), à partir d'une dose déjà reçue.
function tempsAvantDoseMortelle(svJour, dejaRecu = 0) {
  return svJour > 0 ? Math.max(0, ((DOSE_MORTELLE - dejaRecu) / svJour) * 86400) : Infinity;
}
function fmtDureeLongue(s) { return s > 3650 * 86400 ? 'plus de 10 ans' : fmtDuree(s); }

// Affichage d'une dose par jour, en Sv, mSv ou µSv.
function fmtDose(sv) {
  if (sv >= 1) return `${fmt(sv, sv < 10 ? 1 : 0)} Sv/jour`;
  if (sv >= 0.001) return `${fmt(sv * 1000, sv < 0.01 ? 2 : 1)} mSv/jour`;
  return `${fmt(sv * 1e6, 1)} µSv/jour`;
}

// Dose cumulée (Sv), en Sv, mSv ou µSv.
function fmtDoseTotale(sv) {
  if (sv >= 0.1) return `${fmt(sv, 2)} Sv`;
  if (sv >= 0.0001) return `${fmt(sv * 1000, 1)} mSv`;
  return `${fmt(sv * 1e6, 1)} µSv`;
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
