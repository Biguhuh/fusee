'use strict';
// ---------- Ravitaillement courant selon les besoins ----------
// À chaque passage, la Terre n'envoie à une station que ce qui lui manque pour tenir jusqu'au suivant, avec une
// marge : vivres et eau de ceux qui y vivent et dans les bases de son astre, de quoi refaire un plein de l'orbiteur
// et de l'atterrisseur, moins ce que les bases produisent sur place. Rien ne manque : pas de cargo, rien à payer.
// La navette de la station descend ensuite vivres et eau à ses bases ; ceux qui y vivent consomment.

const MARGE_RAVITO = 1.5;         // de quoi tenir 1,5 fois l'intervalle entre deux passages
const RESERVE_BASE_JOURS = 60;    // vivres et eau gardés à une base, pour ses occupants
const ENVOI_MINI = 100;           // kg : en dessous, on n'envoie pas

// Consommation d'une personne par jour, comme à bord (serre, recyclage, écosystème fermé).
function consoParPersonne(v) {
  if (niveauAmelio('ecosysteme', v) >= 1) return { vivres: 0, eau: 0 };
  const serre = niveauAmelio('serre', v), recyc = niveauAmelio('recyclage', v);
  return { vivres: VIVRES_PAR_JOUR * (1 - 0.1 * serre), eau: EAU_PAR_JOUR * (1 - 0.25 * recyc) + 0.1 * serre };
}
function residents(v, lieu) { return (v.equipe || []).filter((m) => lieuMembre(m) === lieu).length; }
function basesDeStation(v, st) { return (v.bases || []).filter((b) => b.astre === st.centre && !b.deploiement); }
function residentsAstre(v, st) { return residents(v, 'st:' + st.id) + basesDeStation(v, st).reduce((s, b) => s + residents(v, idBase(b)), 0); }
function eauGlaceParJour(b) { return /glace/.test(ressourceLocale(ASTRES_PAR_ID[b.astre])[0] || '') ? EAU_GLACE_PAR_JOUR * (b.niveau || 1) : 0; }
// Intervalle entre deux passages (plus fréquent pour une grande station).
function intervalleRavito(st) { return intervalleCargo(st.centre) / (niveauStation(st).ravito || 1); }

// Ce que la station devrait avoir après le passage du cargo (kg).
function cibleRavito(v, st) {
  const jours = (intervalleRavito(st) / JOUR) * MARGE_RAVITO, n = residentsAstre(v, st), c = consoParPersonne(v);
  const bases = basesDeStation(v, st);
  const eauLocale = bases.reduce((s, b) => s + eauGlaceParJour(b), 0);
  const ergolsLocaux = bases.reduce((s, b) => s + productionBase(ASTRES_PAR_ID[b.astre]) * (b.niveau || 1), 0);
  return {
    carburant: capOrbiteur(v, 'carburantMax'),                                                  // un plein de l'orbiteur
    ergols: Math.max(0, capOrbiteur(v, 'ergolsAtt') + ERGOLS_TRANSFERT - ergolsLocaux * jours),   // atterrisseur et un transfert
    vivres: vivresMax(v) + n * c.vivres * jours,
    eau: Math.max(0, eauMax(v) + (n * c.eau - eauLocale) * jours),
  };
}
// Ce qui manque à la station, en comptant les cargos déjà en route vers elle.
function besoinsStation(v, st) {
  const cible = cibleRavito(v, st), env = {};
  const enRoute = (k) => (v.cargos || []).filter((c) => c.dest === st.id).reduce((s, c) => s + ((c.contenu || {})[k] || 0), 0);
  for (const [k, q] of Object.entries(cible)) {
    const manque = Math.min(q, capaciteStation(st, k)) - (st.stock[k] || 0) - enRoute(k);
    if (manque >= ENVOI_MINI) env[k] = Math.ceil(manque / 100) * 100;
  }
  return env;
}
// Un passage du ravitaillement courant : renvoie ce qui est livré (null : rien ne manquait, ou coupé).
function ravitoSelonBesoins(s) {
  const v = campagneEnCours();
  if (!v || s.ravitoAuto === false) return null;
  const c = besoinsStation(v, s);
  if (!Object.keys(c).length) return null;
  ajouterAuStock(s, c);
  noterRavitoCourant(c);    // bilan matière et carbone
  payerRavitoCourant(v, c); // finances
  s.ravitos = s.ravitos || [];
  s.ravitos.push({ t: v.t, contenu: c });
  if (s.ravitos.length > 8) s.ravitos.splice(0, s.ravitos.length - 8);
  return c;
}

// ---------- Navette vers les bases, consommation des occupants ----------
// Appelé par mettreAJourLogistique, après les livraisons du ravitaillement courant.
function mettreAJourResidents(v, log) {
  const dtJ = Math.max(0, v.t - (v.tResidents ?? v.t)) / JOUR;
  v.tResidents = v.t;
  if (!dtJ || !v.equipe) return;
  const c = consoParPersonne(v);
  v.alertesResidents = v.alertesResidents || {};
  const manger = (lieu, k, nom) => {
    const n = residents(v, lieu);
    if (!n) return;
    for (const cle of ['vivres', 'eau']) {
      const avant = k[cle] || 0;
      k[cle] = Math.max(0, avant - n * c[cle] * dtJ);
      const a = lieu + ':' + cle;
      if (k[cle] <= 0 && c[cle] > 0 && !v.alertesResidents[a]) {
        v.alertesResidents[a] = true;
        log(`${cle === 'eau' ? '💧' : '🍞'} Plus ${cle === 'eau' ? 'd’eau potable' : 'de vivres'} ${nom} : ${n === 1 ? 'son occupant se rationne' : `ses ${n} occupants se rationnent`}. Envoyez un ravito « Vivres et eau », ou ramenez-les.`);
      }
      if (k[cle] > n * c[cle] * 10) v.alertesResidents[a] = false;
    }
  };
  for (const b of v.bases || []) {
    if (b.deploiement) continue;
    const st = stationSur(v, b.astre), lieu = idBase(b), n = residents(v, lieu);
    const k = b.reserve || (b.reserve = { vivres: 0, eau: 0 });
    if (!st) k.eau = (k.eau || 0) + eauGlaceParJour(b) * dtJ;   // sans station, la glace de la base sert à ses occupants
    // Navette : la station complète la réserve de la base.
    if (st && n) for (const cle of ['vivres', 'eau']) {
      const q = Math.min(st.stock[cle] || 0, Math.max(0, n * c[cle] * RESERVE_BASE_JOURS - (k[cle] || 0)));
      if (q > 0) { st.stock[cle] -= q; k[cle] = (k[cle] || 0) + q; }
    }
    manger(lieu, k, `à la base ${de(ASTRES_PAR_ID[b.astre])}`);
  }
  for (const st of v.stations) manger('st:' + st.id, st.stock, au(st));
}

// ---------- Onglet Ravitos : le ravitaillement courant de chaque station ----------
function htmlRavitoCourant(v) {
  if (!ressourcesIllimitees()) return '<p class="doux">Pas de ravitaillement courant ici : la Terre est trop loin. Tout passe par vos cargos et ce que produisent les bases.</p>';
  if (!v.stations.length) return '';
  const st = (s) => {
    const n = residentsAstre(v, s), b = besoinsStation(v, s), dernier = (s.ravitos || []).slice(-3).reverse();
    const bases = basesDeStation(v, s).filter((x) => residents(v, idBase(x)));
    return `<article class="encart"><h4>🛰 ${s.nom} <span class="doux">— tous les ${fmtDuree(intervalleRavito(s))}${n ? `, ${n} occupant${n > 1 ? 's' : ''} (station et bases)` : ''}</span></h4>
      <label class="choix-ravito"><input type="checkbox" data-auto="${s.id}" ${s.ravitoAuto === false ? '' : 'checked'}> Ravitaillement automatique</label>
      ${s.ravitoAuto === false ? '<p class="doux">Coupé : rien ne part de la Terre vers cette station.</p>' : `<p>Prochain passage ${s.prochainCargo ? `dans ${fmtDuree(Math.max(0, s.prochainCargo - v.t))}` : 'bientôt'} : ${Object.keys(b).length ? `${decrireContenu(b)} <span class="doux">(≈ ${fmtEuros(Object.entries(b).reduce((x, [k, q]) => x + q * masseUnite(k), 0) * prixRavitoParKg() + valeurContenu(b))} hors assurance)</span>` : 'rien ne manque, pas de cargo.'}</p>`}
      ${bases.map((x) => `<p class="doux">🏠 Base ${de(ASTRES_PAR_ID[x.astre])} : ${fmt((x.reserve || {}).vivres || 0)} kg de vivres, ${fmt((x.reserve || {}).eau || 0)} kg d’eau (navette depuis la station).</p>`).join('')}
      ${dernier.length ? `<p class="doux">Derniers passages : ${dernier.map((r) => `${fmtDate(r.t, false)}, ${decrireContenu(r.contenu)}`).join(' · ')}</p>` : ''}</article>`;
  };
  return `<h3>🔁 Ravitaillement courant</h3><p class="doux">À chaque passage, la Terre n’envoie que ce qui manque pour tenir jusqu’au suivant, avec une marge : vivres et eau des occupants de la station et de ses bases, de quoi refaire un plein de l’orbiteur et de l’atterrisseur, moins ce que produisent les bases. Sondes, kits et matériaux : par vos ravitos. La navette de la station descend vivres et eau aux bases habitées.</p>${v.stations.map(st).join('')}`;
}
