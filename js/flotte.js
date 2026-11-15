'use strict';
// Missions en parallèle : plusieurs systèmes stellaires et plusieurs expéditions dans une même campagne.
// etat.voyage (v) reste ce qu'on voit à l'écran : un système et, au plus, une expédition en cours.
// Les autres sont rangés à part : v.mondes[idSysteme] (stations, bases, cargos…) et v.flotte (expéditions).
// Le temps est commun (temps terrestre de référence, v.t) : rien ne vieillit à part.

// Ce qui appartient à un système stellaire (reste sur place quand on le quitte).
const CHAMPS_SYSTEME = ['planeteBase', 'stations', 'bases', 'sondesEnVol', 'cargos', 'robotsAuto', 'conteneurs', 'sites', 'visites',
  'echantillonsRapportes', 'orbiteurGare', 'deranges', 'chutesObjets', 'orbitesObjets', 'objetsPerdus', 'alertesResidents', 'penuries',
  'tResidents', 'dernierRavito'];
// Ce qui appartient à une expédition (le vaisseau, son équipe et son chargement).
const CHAMPS_EXPEDITION = ['orb', 'equipe', 'nomVaisseau', 'carburant', 'ergolsAtt', 'sondes', 'kits', 'kitsBase', 'robots', 'drones',
  'atterrisseurs', 'echantillonsABord', 'cible', 'manette', 'mode', 'orientation', 'vivres', 'eau', 'tVivres', 'dechets', 'tDechets',
  'amarre', 'aIss', 'rdvStation', 'equipagePerdu', 'traumatise', 'proposerRappel', 'retourAuto', 'sansEquipage', 'commandeSol',
  'pertesEquipage', 'propulseurs', 'prevision', 'voyageFinal', 'propulsionSolaire', 'vidange', 'observation', 'usureBatterieRover',
  'degatsRover', 'alertesVivres', 'orbiteurVersSoleil', 'autopilote', 'idExpedition', 'numero'];

// Valeurs d'un système vide, et d'un écran sans expédition.
function systemeVide() {
  return { stations: [], bases: [], sondesEnVol: [], cargos: [], robotsAuto: [], conteneurs: [], sites: {}, visites: {}, echantillonsRapportes: {} };
}
function sansExpedition() {
  return { orb: null, equipe: null, carburant: 0, ergolsAtt: 0, sondes: 0, kits: 0, kitsBase: 0, robots: 0, drones: 0, atterrisseurs: 0,
    echantillonsABord: {}, cible: null, manette: 0, mode: 'assistant', orientation: 'prograde' };
}

// Copie profonde (les sauvegardes sont du JSON : pas de fonctions à garder).
function copieJSON(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

// Une expédition a-t-elle lieu à l'écran ?
function expeditionActive(v) { return !!(v.orb || (v.equipe && v.equipe.some((m) => m.etat !== 'perdu' && m.etat !== 'rapatrie'))); }

// Range l'expédition affichée dans la flotte ; l'écran reste sans expédition. Renvoie l'expédition rangée (ou null).
function rangerExpedition(v) {
  if (!expeditionActive(v)) return null;
  if (!v.idExpedition) v.idExpedition = 'x' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
  if (!v.numero) v.numero = v.expeditions || 1;
  const x = { systeme: v.systeme, tRange: v.t };
  for (const c of CHAMPS_EXPEDITION) if (v[c] !== undefined) x[c] = copieJSON(v[c]);
  if (x.orb) delete x.orb.etape;
  v.flotte = (v.flotte || []).filter((e) => e.idExpedition !== x.idExpedition);
  v.flotte.push(x);
  for (const c of CHAMPS_EXPEDITION) delete v[c];
  Object.assign(v, sansExpedition());
  oublierEtapeOrbiteur();
  return x;
}

// Reprend une expédition rangée (dans le système affiché : sinon, on y passe d'abord).
function reprendreExpedition(v, id) {
  const x = (v.flotte || []).find((e) => e.idExpedition === id);
  if (!x) return false;
  if (x.systeme !== v.systeme) changerSysteme(v, x.systeme);
  rangerExpedition(v);
  v.flotte = v.flotte.filter((e) => e !== x);
  for (const c of CHAMPS_EXPEDITION) delete v[c];
  for (const c of CHAMPS_EXPEDITION) if (x[c] !== undefined) v[c] = x[c];
  rattraperOrbiteur(v, x.tRange);
  oublierEtapeOrbiteur();
  return true;
}

// Range le système affiché dans v.mondes et affiche un autre système (vide s'il n'a jamais été visité).
// L'expédition affichée est rangée avec : elle reste dans son système.
function changerSysteme(v, id) {
  if (id === v.systeme) return;
  rangerExpedition(v);
  const m = {};
  for (const c of CHAMPS_SYSTEME) if (v[c] !== undefined) m[c] = copieJSON(v[c]);
  for (const s of [...(m.sondesEnVol || []), ...(m.cargos || [])]) delete s.etape;
  v.mondes = v.mondes || {};
  v.mondes[v.systeme] = m;
  for (const c of CHAMPS_SYSTEME) delete v[c];
  Object.assign(v, systemeVide(), v.mondes[id] || {});
  delete v.mondes[id];
  v.systeme = id;
  choisirSystemeCampagne(v);
}

// Toutes les expéditions de la campagne, affichée comprise : { id, systeme, nom, numero, active }.
function listeExpeditions(v) {
  const l = (v.flotte || []).map((x) => ({ id: x.idExpedition, systeme: x.systeme, nom: x.nomVaisseau, numero: x.numero, active: false }));
  if (expeditionActive(v)) l.unshift({ id: v.idExpedition || null, systeme: v.systeme, nom: v.nomVaisseau, numero: v.numero || v.expeditions, active: true });
  return l;
}
// Les systèmes où la campagne a quelque chose (affiché compris).
function listeSystemes(v) { return [...new Set([v.systeme, ...Object.keys(v.mondes || {}), ...(v.flotte || []).map((x) => x.systeme)])]; }

// L'orbiteur rangé n'a pas bougé : on le replace là où il est à la date du jour.
function rattraperOrbiteur(v, t0) {
  const o = v.orb, dt = v.t - t0;
  if (!o || !(dt > 0)) return;
  const st = v.amarre && (v.stations || []).find((s) => s.id === v.amarre);
  if (st) { const e = propager(st.r, st.v, v.t - st.t0, ASTRES_PAR_ID[st.centre].gm); o.centre = st.centre; o.r = e.r; o.v = e.v; return; }
  const a = ASTRES_PAR_ID[o.centre];
  if (!a) return;
  const el = elements(o.r, o.v, a.gm);
  if (!o.transfert && el.e < 1 && el.ra < (a.soi || Infinity)) { const p = propager(o.r, o.v, dt, a.gm); o.r = p.r; o.v = p.v; return; }
  // En route : on avance par morceaux (au plus quelques centaines).
  let t = t0;
  for (let k = 0; k < 300 && t < v.t; k++) {
    const ev = [];
    avancerVaisseau(o, t, v.t - t, ev);
    t = ev.tFin || v.t;
  }
}

// L'orbiteur (écran de navigation) garde une étape calculée pour l'expédition affichée : on l'oublie.
function oublierEtapeOrbiteur() {
  if (typeof Orbiteur === 'undefined') return;
  Orbiteur.etape = null; Orbiteur.auto = false; Orbiteur.avance = false;
}

// Sauvegardes d'avant les missions en parallèle : rien de rangé.
function migrerFlotte(m) {
  m.mondes = m.mondes || {};
  m.flotte = m.flotte || [];
  for (const x of m.flotte) if (x.orb) delete x.orb.etape;
  for (const w of Object.values(m.mondes)) for (const s of [...(w.sondesEnVol || []), ...(w.cargos || [])]) delete s.etape;
  if (expeditionActive(m) && !m.numero) m.numero = m.expeditions || 1;
  return m;
}
