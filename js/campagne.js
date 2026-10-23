'use strict';
// Règles de la campagne : atterrisseur adapté à chaque astre, ravitaillement depuis la Terre,
// bases au sol et ressources locales.

// ---------- Atterrisseur adapté ----------
// Pour atterrir, il faut pouvoir repartir : on choisit les pièces les plus légères qui permettent
// de se poser puis de remonter en orbite (ou au niveau 1 bar pour les géantes), avec 20 % de marge.

function besoinDescente(a) {
  return a.depart.vitesse + Math.sqrt(2 * a.g * a.depart.alt) * (a.atm && a.atm.rho0 > 0.5 ? 0.3 : 1);
}

function besoinAtterrisseur(a) {
  if (a.type === 'solide') return besoinDescente(a) + besoinRetourOrbite(a);
  if (a.type === 'gazeuse') return 2.5 * Math.sqrt(2 * a.g * Math.abs(profondeurPour(a, a.cible)));
  return Infinity;
}

// Résultats gardés en mémoire, et d'une partie à l'autre (les vols d'essai prennent un peu de temps).
const VERSION_CONCEPTION = 'v1';
const cacheConception = {};
function concevoirAtterrisseur(a) {
  if (cacheConception[a.id]) return cacheConception[a.id];
  const cle = 'fusee-atterrisseur-' + VERSION_CONCEPTION + '-' + a.id;
  try {
    const s = JSON.parse(localStorage.getItem(cle));
    if (s) {
      const res = s.ok ? { ...s, fusee: assemblerFusee(s.choix) } : s;
      cacheConception[a.id] = res;
      return res;
    }
  } catch (e) { /* stockage indisponible */ }
  const res = calculerConception(a);
  cacheConception[a.id] = res;
  try { localStorage.setItem(cle, JSON.stringify({ ok: res.ok, raison: res.raison, besoin: res.besoin, choix: res.choix, dv: res.dv, twr: res.twr })); } catch (e) { /* ignoré */ }
  return res;
}

function calculerConception(a) {
  if (a.type === 'etoile') return { ok: false, raison: 'Personne ne se pose sur le Soleil : tout brûle bien avant.' };
  if (a.id === 'terre') return { ok: false, raison: 'Sur Terre, on rentre à la maison en capsule.' };
  const gaz = a.type === 'gazeuse';
  const pMax = gaz ? a.cible * 2.5 : (a.atm ? a.atm.p0 : 0);
  const tMax = gaz ? conditions(a, profondeurPour(a, a.cible)).t + 80 : a.tempSurface + (a.atm ? 60 : 20);
  const rad = Math.max(conditions(a, 0).rad, conditions(a, a.depart.alt).rad);
  const premier = (cat, ok) => EQUIPEMENTS[cat].options.find(ok);
  const coque = premier('coque', (o) => o.pressionMax >= pMax * 1.05);
  const bouclier = premier('bouclier', (o) => o.tempMax >= tMax);
  const panneau = premier('panneau', (o) => o.protection >= rad * 1.1);
  if (!coque) return { ok: false, raison: `Aucune coque ne résiste à ${fmtP(pMax)}.` };
  if (!bouclier) return { ok: false, raison: `Aucun bouclier ne résiste à ${fmt(tMax)} °C.` };
  if (!panneau) return { ok: false, raison: 'Aucun panneau ne protège d’un tel rayonnement.' };
  const besoin = besoinAtterrisseur(a) * 1.2;
  // Candidats plausibles, du plus léger au plus lourd ; on garde le premier qui réussit
  // vraiment l'aller-retour en simulation (pilote automatique).
  const candidats = [];
  for (const m of EQUIPEMENTS.moteur.options) {
    for (const r of EQUIPEMENTS.reservoir.options) {
      const choix = { moteur: m.id, reservoir: r.id, coque: coque.id, bouclier: bouclier.id, panneau: panneau.id };
      const f = assemblerFusee(choix);
      const dv = deltaV(f);
      const twr = f.poussee / (f.masseTotale * a.g);
      if (dv >= besoin * 0.8 && twr >= 1.5) candidats.push({ choix, fusee: f, dv, twr });
    }
  }
  candidats.sort((x, y) => x.fusee.masseTotale - y.fusee.masseTotale);
  let meilleur = null;
  for (const c of candidats.slice(0, 14)) {
    if (simulerAllerRetour(a, c.fusee)) { meilleur = c; break; }
  }
  if (!meilleur) {
    return { ok: false, besoin, raison: `Aucun atterrisseur ne pourrait repartir de ${a.nom} : il faudrait ≈ ${fmtV(besoin)} de Δv. Larguez plutôt un robot (aller simple).` };
  }
  return { ok: true, besoin, ...meilleur };
}

// ---------- Lanceurs (départ de la Terre) ----------
// Deux destinations, deux fusées.
const LANCEURS = {
  station: {
    nom: 'Hercule', destination: 'la station spatiale (orbite basse, 400 km)',
    description: 'Lanceur lourd à 2 étages. Met 110 t en orbite basse : orbiteur, atterrisseur, kits et ergols.',
    chargeUtile: 110000,
    etages: [
      { nom: '1er étage', masseSeche: 150000, carburant: 2200000, poussee: 40e6, isp: 320, hauteur: 120 },
      { nom: '2e étage', masseSeche: 40000, carburant: 450000, poussee: 5e6, isp: 440, hauteur: 55 },
    ],
  },
  lune: {
    nom: 'Séléné', destination: 'la Lune (injection translunaire)',
    description: 'Lanceur géant à 3 étages, du gabarit de Saturn V. Le 3e étage atteint l’orbite, puis rallume pour envoyer l’expédition vers la Lune.',
    chargeUtile: 45000,
    etages: [
      { nom: '1er étage', masseSeche: 135000, carburant: 2150000, poussee: 39e6, isp: 330, hauteur: 111 },
      { nom: '2e étage', masseSeche: 40000, carburant: 480000, poussee: 5.1e6, isp: 430, hauteur: 69 },
      { nom: '3e étage', masseSeche: 13000, carburant: 107000, poussee: 1e6, isp: 421, hauteur: 34 },
    ],
  },
};

function caracteristiquesLanceur(l) {
  const masse = l.chargeUtile + l.etages.reduce((s, e) => s + e.masseSeche + e.carburant, 0);
  const poussee = l.etages[0].poussee;
  return { masse, poussee, hauteur: l.etages[0].hauteur, twr: poussee / (masse * G0) };
}

// Fusée « mutable » : ses caractéristiques changent à chaque séparation d'étage.
function megaFusee(type = 'station') {
  const l = LANCEURS[type];
  const f = {
    mega: true, lanceur: type, nomLanceur: l.nom, etages: l.etages, chargeUtile: l.chargeUtile,
    choix: { moteur: 'raptor', reservoir: 'titanesque', coque: 'renforce', bouclier: 'ablatif', panneau: 'aucun' },
    pressionMax: 5, tempMax: 1200, protection: 5, largeurRel: type === 'lune' ? 0.09 : 0.11,
  };
  configurerEtage(f, 0);
  return f;
}

// Δv qu'il reste au dernier étage (pour l'injection translunaire).
function deltaVRestant(f, carburant) { return f.isp * G0 * Math.log((f.masseSeche + carburant) / f.masseSeche); }
function configurerEtage(f, i) {
  const e = f.etages[i];
  let reste = f.chargeUtile;
  for (let k = i; k < f.etages.length; k++) reste += f.etages[k].masseSeche + (k > i ? f.etages[k].carburant : 0);
  Object.assign(f, { etage: i, masseSeche: reste, carburant: e.carburant, poussee: e.poussee, isp: e.isp, hauteur: e.hauteur });
  f.masseTotale = f.masseSeche + f.carburant;
}

// ---------- Ravitaillement depuis la Terre ----------
const CAPACITES_STATION = { carburant: 120000, ergols: 120000, sondes: 6, kits: 3, kitsBase: 2, robots: 3, atterrisseurs: 3 };

// Un cargo part régulièrement de la Terre ; plus la station est loin, plus le trajet est long.
function intervalleCargo(centreId) {
  if (centreId === 'terre') return 30 * JOUR;
  const chaine = ancetres(centreId);
  const planete = ASTRES_PAR_ID[chaine[chaine.length - 2]];
  if (planete.id === 'terre') return 60 * JOUR;          // la Lune
  const a1 = UA_KM, a2 = planete.orbite.a;
  const tof = Math.PI * Math.sqrt(Math.pow((a1 + a2) / 2, 3) / GM_SOLEIL);
  return Math.max(120 * JOUR, tof);
}

function livrerCargo(s) {
  const k = s.stock;
  const ajout = (cle, q) => { k[cle] = Math.min(CAPACITES_STATION[cle], (k[cle] || 0) + q); };
  ajout('carburant', 40000);
  ajout('ergols', 40000);
  ajout('sondes', 2);
  ajout('kitsBase', 1);
  ajout('robots', 1);
  ajout('atterrisseurs', 1);
  if (s.terrestre) ajout('kits', 1);   // les kits de station ne partent que de la station terrestre
}

// ---------- Bases au sol et ressources locales ----------
// Production d'ergols (kg par jour) selon ce qu'on trouve sur place.
const RESSOURCES = {
  lune: ['glace des cratères polaires', 800],
  mars: ['CO₂ de l’air et glace du sol → méthane et oxygène', 3000],
  titan: ['méthane liquide des lacs', 5000],
  europe: ['glace d’eau → hydrogène et oxygène', 2500],
  ganymede: ['glace d’eau → hydrogène et oxygène', 2500],
  callisto: ['glace d’eau → hydrogène et oxygène', 2000],
  encelade: ['glace d’eau → hydrogène et oxygène', 2500],
  triton: ['glace d’azote et d’eau', 1500],
  pluton: ['glace d’eau et de méthane', 1500],
  mercure: ['glace des cratères polaires', 500],
  a1: ['argiles hydratées et glace', 1500],
};
function ressourceLocale(a) {
  if (RESSOURCES[a.id]) return RESSOURCES[a.id];
  if (a.nomJpl === 'Enceladus') return RESSOURCES.encelade;
  if (a.type === 'solide' && a.tempSurface < -120) return ['glace d’eau', 1000];
  return [null, 0];
}
function productionBase(a) { return ressourceLocale(a)[1]; }

// Vol d'essai complet au pilote automatique : descente, atterrissage, remontée.
function simulerAllerRetour(a, fusee) {
  const v = new Vol(a, fusee, { voyage: true });
  v.autopilote = true;
  for (let n = 0; n < 200000 && !v.fin; n++) {
    // Grands pas loin du sol, petits pas près du sol.
    v.step(v.altSol() > 800 ? 0.25 : 0.05, {});
    if (v.pose && !v.decollageDemande) v.demanderDecollage();
  }
  return !!v.fin && ['orbite', 'liberation', 'plongee'].includes(v.fin.cause) && v.integrite > 30;
}

function descriptionConception(c) {
  if (!c.ok) return c.raison;
  const p = (cat) => piece(cat, c.choix[cat]).nom;
  return `moteur ${p('moteur')}, réservoir ${p('reservoir')}, coque ${p('coque')}, bouclier ${p('bouclier')}, panneau ${p('panneau')} — Δv ${fmtV(c.dv)} pour ${fmtV(c.besoin / 1.2)} nécessaires`;
}
