'use strict';
// ---------- Finances du programme spatial ----------
// Pour le plaisir : on ne manque jamais d'argent, rien n'est bloqué. Chaque lancement, cargo, mise au point,
// formation, décès… est chiffré, et les coûts courants (salaires, sol, stations, bases) courent avec le temps.
// Montants inspirés de vrais programmes (NASA, ISS, Artemis, Starshot), arrondis, en euros (1 $ ≈ 0,9 €).
// « estimé » : aucun chiffre public, ordre de grandeur plausible.

const M_EUR = 1e6, MD_EUR = 1e9, AN_S = 365.25 * 86400;

const SOURCES_FINANCES = {
  oigArtemis: { nom: 'NASA OIG : SLS et Orion, 4,1 Md$ par lancement (CNBC, 2022)', url: 'https://www.cnbc.com/2022/03/01/nasa-auditor-warns-congress-artemis-missions-sls-rocket-billions-over-budget.html' },
  cargoISS: { nom: 'Cargos de l’ISS : coût par mission et par kilo (Space.com, 2018)', url: 'https://www.space.com/40427-nasa-paying-more-for-commercial-cargo-missions.html' },
  oigISS: { nom: 'NASA OIG : coûts de l’ISS, 3 à 4 Md$ par an (IG-14-031)', url: 'https://oig.nasa.gov/docs/IG-14-031.pdf' },
  salaires: { nom: 'Salaires des astronautes de la NASA, grades GS-12 et GS-13 (Zero G Talent)', url: 'https://zerogtalent.com/blog/nasa-pay-scale-2026' },
  starshot: { nom: 'Breakthrough Starshot : réseau de lasers, ≈ 10 Md$ (Sky & Telescope)', url: 'https://skyandtelescope.org/astronomy-news/100-million-for-probes-to-alpha-centauri-yes-really/' },
  assurance: { nom: 'Assurance spatiale : 5 à 12 % de la valeur assurée (Commercial Risk)', url: 'https://www.commercialriskonline.com/satellite-insurance-sees-rates-soar-as-losses-grow/' },
};

// Tarifs. ref : ce sur quoi on s'appuie ; src : clé de SOURCES_FINANCES (absente : estimé).
const TARIFS = {
  lanceurs: {
    equipage: { nom: 'Aube (équipage, capsule)', prix: 250 * M_EUR, ref: 'Falcon 9 + Crew Dragon : ≈ 55 à 80 M$ la place, × 4', src: 'oigISS' },
    station: { nom: 'Hercule (110 t en orbite basse)', prix: 2 * MD_EUR, ref: 'Saturn V ≈ 1,5 Md$ d’aujourd’hui ; SLS 2 à 4 Md$', src: 'oigArtemis' },
    lune: { nom: 'Séléné (vers la Lune)', prix: 3.5 * MD_EUR, ref: 'SLS + Orion : 4,1 Md$ par lancement', src: 'oigArtemis' },
    cargo: { nom: 'Cargo lourd (ravito depuis la Terre), lancement', prix: 2 * MD_EUR, ref: 'lanceur lourd ; bien moins cher au kilo que les cargos de l’ISS (≈ 90 000 $/kg)', src: 'cargoISS' },
  },
  materiel: {
    atterrisseurs: { nom: 'Atterrisseur', prix: 1.5 * MD_EUR, ref: 'atterrisseur Starship de la NASA : 2,9 Md$ pour deux' },
    kits: { nom: 'Kit de station', prix: 1.5 * MD_EUR, ref: 'module Destiny de l’ISS ≈ 1,4 Md$' },
    extensionsStation: { nom: 'Extension de station', prix: 1 * MD_EUR, ref: 'estimé' },
    kitsBase: { nom: 'Kit de base', prix: 1 * MD_EUR, ref: 'estimé' },
    extensions: { nom: 'Extension de base', prix: 500 * M_EUR, ref: 'estimé' },
    robots: { nom: 'Robot', prix: 500 * M_EUR, ref: 'rover de Curiosity, hors lancement (estimé)' },
    sondes: { nom: 'Sonde', prix: 300 * M_EUR, ref: 'petite sonde interplanétaire (estimé)' },
    drones: { nom: 'Drone', prix: 80 * M_EUR, ref: 'Ingenuity ≈ 85 M$' },
  },
  parKg: {
    materiaux: { nom: 'Matériaux', prix: 1000, ref: 'alliages, composants (estimé)' },
    vivres: { nom: 'Vivres', prix: 1000, ref: 'repas spatiaux emballés (estimé)' },
    eau: { nom: 'Eau potable', prix: 10, ref: 'estimé' },
    carburant: { nom: 'Carburant de l’orbiteur', prix: 0.5, ref: 'méthane et oxygène : négligeable, c’est le lancement qui coûte' },
    ergols: { nom: 'Ergols', prix: 0.5, ref: 'idem' },
  },
  courants: {   // par an
    salaire: { nom: 'Salaire d’un spationaute (chargé)', prix: 180e3, ref: 'NASA : GS-12 à GS-13, ≈ 100 à 160 k$', src: 'salaires' },
    sol: { nom: 'Équipes au sol (2 000 personnes)', prix: 240 * M_EUR, ref: '120 k€ chargés par personne (estimé)' },
    infra: { nom: 'Infrastructures au sol (contrôle, antennes, pas de tir)', prix: 600 * M_EUR, ref: 'estimé' },
    station: { nom: 'Exploitation d’une station, par niveau', prix: 400 * M_EUR, ref: 'ISS : 3 à 4,1 Md$ par an, transport compris', src: 'oigISS' },
    base: { nom: 'Exploitation d’une base, par niveau', prix: 300 * M_EUR, ref: 'estimé' },
    assuranceVie: { nom: 'Assurance-vie, par spationaute', prix: 30e3, ref: 'estimé' },
  },
  rd: {
    niveaux: [null, 200 * M_EUR, 500 * M_EUR, 1 * MD_EUR],
    scaphandre: 300 * M_EUR, ecosysteme: 5 * MD_EUR, torpeur: 10 * MD_EUR,
  },
  divers: {
    formation: { nom: 'Formation d’un spationaute', prix: 5 * M_EUR, ref: '≈ 2 ans de formation (estimé)' },
    entrainement: { nom: 'Exercice d’entraînement (piscine, vols paraboliques)', prix: 50e3, ref: '20 à 100 k€ (estimé)' },
    tauxAssurance: { nom: 'Assurance d’un lancement', prix: 0.08, ref: 'le marché : 5 à 12 % de la valeur lancée', src: 'assurance' },
    deces: { nom: 'Indemnité de décès', prix: 3 * M_EUR, ref: 'capital et pension à la famille (estimé)' },
    recuperation: { nom: 'Récupération en mer d’une capsule', prix: 15 * M_EUR, ref: 'navire, hélicoptères, équipes (estimé)' },
  },
  capsules: { 3: 100 * M_EUR, 4: 300 * M_EUR, 7: 400 * M_EUR },
  interstellaire: {
    lasers: { nom: 'Réseau de lasers pour les sondes (une fois)', prix: 10 * MD_EUR, ref: 'Starshot : ≈ 10 Md$ selon le projet', src: 'starshot' },
    grappeVoile: { nom: 'Grappe de sondes à voile laser', prix: 1 * M_EUR, ref: 'puces de quelques grammes' },
    grappeFusion: { nom: 'Grappe de sondes à fusion', prix: 50 * MD_EUR, ref: 'estimé (science-fiction)' },
    vaisseaux: { fusion: 500 * MD_EUR, voile: 1000 * MD_EUR, antimatiere: 10000 * MD_EUR, saut: Infinity },
  },
};
const BUDGET_NASA = 22.5 * MD_EUR;   // ≈ 25 Md$ par an

// Postes du tableau des finances.
const CATEGORIES_FINANCES = {
  lancements: '🚀 Lancements', materiel: '📦 Matériel envoyé', assurances: '🛡 Assurances', rd: '🔬 R&D',
  formation: '🎓 Formation', retours: '🪂 Retours sur Terre', indemnites: '🕯 Indemnités de décès', interstellaire: '🌌 Interstellaire',
  salaires: '🧑‍🚀 Salaires des spationautes', sol: '👩‍💻 Équipes au sol', infra: '📡 Infrastructures au sol',
  stations: '🛰 Exploitation des stations', bases: '🏗 Exploitation des bases', assuranceVie: '🛡 Assurance-vie de l’équipage',
};

function fmtEuros(x) {
  if (!isFinite(x)) return 'inestimable';
  if (!x) return '0 €';
  const a = Math.abs(x), f = (y, d = 0) => fmt(y, d).replace(/,0$/, '');   // « 2 Md€ » plutôt que « 2,0 Md€ »
  if (a >= MD_EUR) return `${f(x / MD_EUR, a < 10 * MD_EUR ? 1 : 0)} Md€`;
  if (a >= M_EUR) return `${f(x / M_EUR, a < 10 * M_EUR ? 1 : 0)} M€`;
  if (a >= 1e3) return `${f(x / 1e3)} k€`;
  return `${f(x, a < 10 ? 1 : 0)} €`;
}

// ---------- Comptes de la campagne ----------
function financesDe(v) {
  if (!v.finances) v.finances = { debut: v.t, t: v.t, cumul: {}, journal: [] };
  return v.finances;
}
// Coûts courants à cet instant (par an) : [{ cat, parAn, detail }].
function tauxCourants(v) {
  const C = TARIFS.courants;
  const n = v.equipe ? survivants(v).length : (v.equipagePerdu ? 0 : 1);
  const niv = (l) => l.reduce((s, x) => s + (x.niveau || 1), 0);
  return [
    { cat: 'salaires', parAn: n * C.salaire.prix, detail: `${n} spationaute${n > 1 ? 's' : ''}` },
    { cat: 'sol', parAn: C.sol.prix, detail: '2 000 personnes' },
    { cat: 'infra', parAn: C.infra.prix, detail: 'contrôle, antennes, pas de tir' },
    { cat: 'stations', parAn: niv(v.stations || []) * C.station.prix, detail: `${(v.stations || []).length} station${(v.stations || []).length > 1 ? 's' : ''}` },
    { cat: 'bases', parAn: niv(v.bases || []) * C.base.prix, detail: `${(v.bases || []).length} base${(v.bases || []).length > 1 ? 's' : ''}` },
    { cat: 'assuranceVie', parAn: n * C.assuranceVie.prix, detail: `${n} contrat${n > 1 ? 's' : ''}` },
  ];
}
// Fait courir les coûts courants jusqu'à maintenant (au rythme de l'état actuel).
function majFinances(v) {
  if (!v) return;
  const f = financesDe(v), dt = v.t - f.t;
  if (dt > 0) for (const r of tauxCourants(v)) f.cumul[r.cat] = (f.cumul[r.cat] || 0) + (r.parAn * dt) / AN_S;
  f.t = Math.max(f.t, v.t);
}
function depenser(v, cat, libelle, montant) {
  if (!v || !montant) return;
  majFinances(v);
  const f = financesDe(v);
  f.cumul[cat] = (f.cumul[cat] || 0) + montant;
  f.journal.push({ t: v.t, cat, libelle, montant });
  if (f.journal.length > 300) f.journal.splice(0, f.journal.length - 300);
}
// Valeur au départ de la Terre d'un chargement { cle: quantité }.
function valeurContenu(contenu) {
  let s = 0;
  for (const [cle, q] of Object.entries(contenu || {})) {
    if (TARIFS.materiel[cle]) s += q * TARIFS.materiel[cle].prix;
    else if (TARIFS.parKg[cle]) s += q * TARIFS.parKg[cle].prix;
  }
  return s;
}
// Un lancement depuis la Terre : le lanceur, le chargement, l'assurance.
function payerLancement(v, nom, prix, contenu) {
  const val = valeurContenu(contenu);
  depenser(v, 'lancements', nom, prix);
  const cle = Object.keys(TARIFS.lanceurs).find((c) => TARIFS.lanceurs[c].prix === prix);
  if (cle) noterLancementTerre(v, cle, contenu);   // bilan.js
  if (val) depenser(v, 'materiel', `${nom} : ${decrireContenu(Object.fromEntries(Object.entries(contenu).filter(([, q]) => q > 0)))}`, val);
  depenser(v, 'assurances', `Assurance : ${nom}`, (prix + val) * TARIFS.divers.tauxAssurance.prix);
}
// Ravitaillement courant des stations : la part d'un cargo lourd au prorata de la masse, le contenu, l'assurance.
function prixRavitoParKg() { return TARIFS.lanceurs.cargo.prix / LANCEURS.station.chargeUtile; }
function payerRavitoCourant(v, contenu) {
  let kg = 0;
  for (const [k, q] of Object.entries(contenu)) kg += q * masseUnite(k);
  const lanceur = kg * prixRavitoParKg(), val = valeurContenu(contenu);
  depenser(v, 'lancements', 'Ravitaillement courant (part du lanceur)', lanceur);
  depenser(v, 'materiel', `Ravitaillement courant : ${decrireContenu(contenu)}`, val);
  depenser(v, 'assurances', 'Assurance : ravitaillement courant', (lanceur + val) * TARIFS.divers.tauxAssurance.prix);
}
// Chargement d'une nouvelle expédition (orbiteur et atterrisseur au plein).
function chargementExpedition() {
  const O = ORBITEUR;
  return { sondes: O.sondes, kits: O.kits, kitsBase: O.kitsBase, robots: O.robots, drones: O.drones, atterrisseurs: O.atterrisseurs, carburant: O.carburantMax, ergols: O.ergolsAtt };
}
function coutRD(cle, n) {
  const R = TARIFS.rd;
  if (cle === 'scaphandre' || cle === 'ecosysteme' || cle === 'torpeur') return R[cle];
  return R.niveaux[n] || 0;
}
function campagneEnCours() { return typeof etat !== 'undefined' && etat.voyage ? etat.voyage : null; }

// ---------- Tableau des tarifs (Aide, et fenêtre des finances) ----------
function htmlTarifs() {
  const T = TARIFS, src = (k) => (k ? ` <a href="${SOURCES_FINANCES[k].url}" target="_blank" rel="noopener" title="${SOURCES_FINANCES[k].nom}">[source]</a>` : '');
  const table = (titre, lignes) => `<h4>${titre}</h4><table class="table-progression"><tr><th>Poste</th><th>Coût</th><th>Référence</th></tr>${
    lignes.map(([n, c, r, s]) => `<tr><td>${n}</td><td><b>${c}</b></td><td class="doux">${r}${src(s)}</td></tr>`).join('')}</table>`;
  const L = (o, suffixe = '') => Object.values(o).map((x) => [x.nom, fmtEuros(x.prix) + suffixe, x.ref, x.src]);
  return `<p>Pour le plaisir : en campagne, chaque dépense du programme est chiffrée (fenêtre « 💶 Finances » de l’orbiteur). On ne manque jamais d’argent. Montants inspirés de vrais programmes, arrondis, en euros (1 $ ≈ 0,9 €) ; « estimé » : aucun chiffre public, un ordre de grandeur plausible.</p>
    ${table('🚀 Lancements depuis la Terre', L(T.lanceurs))}
    <p class="doux">Ravitaillement courant des stations (petits cargos automatiques) : la part d’un cargo lourd au prorata de la masse, soit ${fmtEuros(prixRavitoParKg() * 1000)} par tonne, plus la valeur du contenu et l’assurance.</p>
    ${table('📦 Matériel envoyé (valeur au départ de la Terre)', [...L(T.materiel), ...Object.values(T.parKg).map((x) => [x.nom, `${fmt(x.prix, x.prix < 1 ? 1 : 0)} €/kg`, x.ref])])}
    <p class="doux">Ce que fabrique l’atelier d’une station ne coûte rien de plus : les matériaux ont déjà été payés.</p>
    ${table('📅 Coûts courants (par an)', L(T.courants, ' / an'))}
    ${table('🔬 R&D, formation, assurances, accidents', [
      ['Mise au point d’une amélioration', `${fmtEuros(T.rd.niveaux[1])} · ${fmtEuros(T.rd.niveaux[2])} · ${fmtEuros(T.rd.niveaux[3])}`, 'niveaux 1, 2 et 3 (estimé)'],
      ['Scaphandre lourd · écosystème fermé · torpeur', `${fmtEuros(T.rd.scaphandre)} · ${fmtEuros(T.rd.ecosysteme)} · ${fmtEuros(T.rd.torpeur)}`, 'estimé'],
      ...L(T.divers).map((l) => (l[0].startsWith('Assurance d') ? [l[0], '8 % de la valeur lancée', l[2], l[3]] : l)),
      ['Capsule de retour (3 · 4 · 7 places)', `${fmtEuros(T.capsules[3])} · ${fmtEuros(T.capsules[4])} · ${fmtEuros(T.capsules[7])}`, 'type Soyouz, Orion, Crew Dragon (estimé)'],
    ])}
    ${table('🌌 Au-delà du Système solaire', [...L({ a: T.interstellaire.lasers, b: T.interstellaire.grappeVoile, c: T.interstellaire.grappeFusion }),
      ...Object.entries(T.interstellaire.vaisseaux).map(([k, p]) => [`Vaisseau habité : ${(TECHNOLOGIES[k] || { nom: k }).nom}`, fmtEuros(p), 'science-fiction (estimé)'])])}
    <h4>Sources</h4><ul>${Object.values(SOURCES_FINANCES).map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.nom}</a></li>`).join('')}</ul>`;
}

// ---------- Fenêtre des finances (campagne) ----------
const Finances = {
  periode: 'an',   // 'mois' ou 'an'
  ouvrir(v, cible = null) {
    majFinances(v);
    const f = financesDe(v), m = cible || $('modale'), k = this.periode === 'mois' ? 1 / 12 : 1, per = this.periode === 'mois' ? 'mois' : 'an';
    const taux = tauxCourants(v), totalTaux = taux.reduce((s, r) => s + r.parAn, 0);
    const total = Object.values(f.cumul).reduce((s, x) => s + x, 0);
    const ponctuels = Object.keys(CATEGORIES_FINANCES).filter((c) => !taux.some((r) => r.cat === c));
    const duree = Math.max(0, v.t - f.debut);
    const ligneJ = (j) => `<tr><td class="doux">${fmtDate(j.t, false)}</td><td>${CATEGORIES_FINANCES[j.cat] || j.cat}</td><td>${j.libelle}</td><td><b>${fmtEuros(j.montant)}</b></td></tr>`;
    const intro = `<p>Pour le plaisir : on ne manque jamais d’argent. Comptes tenus depuis le ${fmtDate(f.debut, false)}${f.debut > (v.journal[0] || {}).t + 86400 ? ' (cette campagne a commencé avant les finances : ce qui précède n’est pas compté)' : ''}.</p>`;
    const corps = `<p class="encart">Dépensé depuis le début : <b>${fmtEuros(total)}</b> en ${fmtDuree(duree)}, soit ${fmt(total / BUDGET_NASA, total < BUDGET_NASA ? 2 : 1)} année${total >= 2 * BUDGET_NASA ? 's' : ''} du budget de la NASA (≈ 25 Md$ par an). Coûts courants : <b>${fmtEuros(totalTaux * k)} par ${per}</b>.</p>
      <div class="actions" style="justify-content:flex-start"><button data-per="mois" ${per === 'mois' ? 'class="principal"' : ''}>Par mois</button><button data-per="an" ${per === 'an' ? 'class="principal"' : ''}>Par an</button></div>
      <div class="sections"><section><h3>📅 Coûts courants</h3><table class="table-progression"><tr><th>Poste</th><th>Par ${per}</th><th>Cumulé</th></tr>
        ${taux.map((r) => `<tr><td>${CATEGORIES_FINANCES[r.cat]} <span class="doux">(${r.detail})</span></td><td>${fmtEuros(r.parAn * k)}</td><td><b>${fmtEuros(f.cumul[r.cat] || 0)}</b></td></tr>`).join('')}</table></section>
      <section><h3>🧾 Dépenses ponctuelles (cumulé)</h3><table class="table-progression"><tr><th>Poste</th><th>Cumulé</th><th>Moyenne par ${per}</th></tr>
        ${ponctuels.map((c) => `<tr><td>${CATEGORIES_FINANCES[c]}</td><td><b>${fmtEuros(f.cumul[c] || 0)}</b></td><td class="doux">${duree > 86400 ? fmtEuros(((f.cumul[c] || 0) / duree) * AN_S * k) : '—'}</td></tr>`).join('')}</table></section></div>
      <section><h3>📜 Dernières dépenses</h3>${f.journal.length ? `<table class="table-progression"><tr><th>Date</th><th>Poste</th><th>Objet</th><th>Montant</th></tr>${f.journal.slice(-40).reverse().map(ligneJ).join('')}</table>` : '<p class="doux">Aucune dépense ponctuelle pour l’instant.</p>'}</section>
      <details class="encart"><summary><b>📋 Tarifs et sources</b></summary>${htmlTarifs()}</details>`;
    if (cible) m.innerHTML = intro + corps;
    else {
      m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>💶 Finances du programme</h2>${intro}</div><button class="fermer">✕</button></header>${corps}</div>`;
      m.classList.remove('cache');
      m.querySelector('.fermer').onclick = () => Infos.fermer();
    }
    m.querySelectorAll('[data-per]').forEach((b) => { b.onclick = () => { this.periode = b.dataset.per; this.ouvrir(v, cible); }; });
  },
};
