'use strict';
// ---------- Bilan de l'expédition : matière et carbone ----------
// Matière : ce qu'on a tiré de chaque astre, transformé, envoyé ailleurs, et de combien on l'a allégé.
// La provenance suit le stock de chaque station en mélange proportionnel : un cargo qui part d'un stock
// à 70 % martien emporte 70 % de matière martienne. Ce qui entre sans origine connue vient de la Terre.
// Carbone : ergols des lanceurs (combustion et production), plus des ratios monétaires sur les dépenses.

const MASSE_ECHANTILLON = 1;   // kg par échantillon (estimé)
const CLES_VRAC = ['carburant', 'ergols', 'materiaux', 'vivres', 'eau'];
function masseUnite(k) {
  if (CLES_VRAC.includes(k)) return 1;
  const r = RECETTES[k];
  return r ? r.materiaux + (r.ergols || 0) : 0;
}
// Ce dont on suit la provenance : le vrac qu'on extrait et ce que fabrique l'atelier.
function clesSuivies() { return ['carburant', 'ergols', 'materiaux', ...Object.keys(RECETTES)]; }

function bilanDe(v) {
  if (!v.bilan) v.bilan = { debut: v.t, astres: {}, terre: { lancements: {}, masseLanceurs: 0, chargeUtile: 0, contenu: {}, ergols: {}, co2Ergols: 0, ravito: 0, co2Ravito: 0 } };
  return v.bilan;
}
function bilanAstre(v, id) {
  const b = bilanDe(v);
  return b.astres[id] || (b.astres[id] = { envoye: {}, transforme: 0 });
}

// ---------- Provenance dans les stocks des stations ----------
function sommeO(o) { let s = 0; for (const x in o) s += o[x]; return s; }
function originesDe(st) {
  if (!st.origine) {
    // Stock d'avant le suivi : origine inconnue.
    st.origine = {};
    for (const k of clesSuivies()) if ((st.stock || {})[k] > 0) st.origine[k] = { avant: st.stock[k] };
  }
  return st.origine;
}
// Remet les origines au niveau du stock : un ajout sans origine connue vient de la Terre ; un retrait
// non suivi (consommé sur place, navette, stock plein) enlève à chaque origine sa part.
function reconcilier(st) {
  const O = originesDe(st);
  for (const k of clesSuivies()) {
    const q = Math.max(0, (st.stock || {})[k] || 0), o = O[k] || (O[k] = {}), tot = sommeO(o);
    if (q > tot + 1e-6) o.terre = (o.terre || 0) + q - tot;
    else if (q < tot - 1e-6) { const f = tot > 0 ? q / tot : 0; for (const x in o) o[x] *= f; }
  }
  return O;
}
// Part de chaque origine dans ce qu'on va retirer du stock (à appeler juste avant de le retirer).
function retirerOrigines(st, contenu) {
  const O = reconcilier(st), parts = {};
  for (const [k, q] of Object.entries(contenu)) {
    if (!q || !O[k]) continue;
    const o = O[k], tot = sommeO(o), f = tot > 0 ? Math.min(1, q / tot) : 0;
    parts[k] = {};
    for (const x in o) { const p = o[x] * f; if (p > 0) { parts[k][x] = p; o[x] -= p; } }
  }
  return parts;
}
// Entrée au stock (appelé par ajouterAuStock) : ajoute = ce qui est vraiment entré (le stock peut être plein).
function ajouterOrigines(st, k, ajoute, origines) {
  if (ajoute <= 0 || !clesSuivies().includes(k)) return;
  const O = originesDe(st), o = O[k] || (O[k] = {});
  const src = origines && origines[k], tot = src ? sommeO(src) : 0;
  if (!tot) { o.terre = (o.terre || 0) + ajoute; return; }
  for (const x in src) o[x] = (o[x] || 0) + (src[x] * ajoute) / tot;
}
// Production d'une base qui monte à la station de son astre.
function ajouterLocal(st, k, q) {
  const avant = st.stock[k] || 0;
  ajouterAuStock(st, { [k]: q }, { [k]: { [st.centre]: q } });
  return st.stock[k] - avant;
}
// Atelier : prend matériaux et ergols au stock ; la part locale est « transformée ».
// Renvoie la part de chaque origine dans l'objet fabriqué.
function suivreFabrication(v, st, r) {
  const parts = retirerOrigines(st, { materiaux: r.materiaux, ergols: r.ergols || 0 });
  const kg = {};
  let tot = 0;
  for (const k in parts) for (const x in parts[k]) { kg[x] = (kg[x] || 0) + parts[k][x]; tot += parts[k][x]; }
  if (kg[st.centre] && !estOrigine(st.centre)) bilanAstre(v, st.centre).transforme += kg[st.centre];
  const f = {};
  for (const x in kg) f[x] = tot ? kg[x] / tot : 0;
  return f;
}
// Objet terminé à l'atelier : il entre au stock avec la provenance de ses matériaux.
function ajouterObjet(st, cle, fractions) {
  reconcilier(st);
  st.stock[cle] = (st.stock[cle] || 0) + 1;
  const o = st.origine[cle] || (st.origine[cle] = {});
  const f = fractions && Object.keys(fractions).length ? fractions : { terre: 1 };
  for (const x in f) o[x] = (o[x] || 0) + f[x];
}
// Ce qui quitte une station : la part tirée de son astre est « envoyée ailleurs ».
function noterEnvoi(v, st, parts, dest) {
  if (estOrigine(st.centre) || dest === st.centre) return;
  let kg = 0;
  for (const k in parts) kg += (parts[k][st.centre] || 0) * masseUnite(k);
  if (kg > 0) { const A = bilanAstre(v, st.centre); A.envoye[dest] = (A.envoye[dest] || 0) + kg; }
}

// ---------- Terre : lanceurs et ergols ----------
// Ergols de chaque étage, et CO₂ équivalent par kg d'ergols (comburant compris) : combustion + production.
const ERGOLS_LANCEURS = { equipage: ['kerosene', 'kerosene'], station: ['methane', 'hydrogene'], lune: ['kerosene', 'hydrogene', 'hydrogene'] };
const FACTEURS_ERGOLS = {
  kerosene: { nom: 'Kérosène et oxygène', co2: 1.0, ref: 'combustion ≈ 0,88 kg (3,15 kg de CO₂ par kg de kérosène, 28 % du mélange), raffinage et oxygène ≈ 0,1 kg', src: 'esa' },
  methane: { nom: 'Méthane et oxygène', co2: 0.8, ref: 'combustion ≈ 0,6 kg (2,74 kg de CO₂ par kg de méthane, 22 % du mélange), production et fuites ≈ 0,2 kg', src: 'esa' },
  hydrogene: { nom: 'Hydrogène et oxygène', co2: 1.5, ref: 'combustion : de l’eau, pas de CO₂ ; production de l’hydrogène à partir de gaz (≈ 10 kg de CO₂ par kg, 14 % du mélange)', src: 'esa' },
};
function lanceurDuTarif(cle) { return cle === 'cargo' ? 'station' : cle; }
function co2Lanceur(type) {
  const l = LANCEURS[type];
  return l.etages.reduce((s, e, i) => s + e.carburant * FACTEURS_ERGOLS[ERGOLS_LANCEURS[type][i]].co2, 0);
}
function noterLancementTerre(v, cleTarif, contenu) {
  const type = lanceurDuTarif(cleTarif), l = LANCEURS[type];
  if (!l) return;
  const T = bilanDe(v).terre;
  T.lancements[cleTarif] = (T.lancements[cleTarif] || 0) + 1;
  T.masseLanceurs += l.etages.reduce((s, e) => s + e.masseSeche, 0);
  T.chargeUtile += l.chargeUtile;
  l.etages.forEach((e, i) => { const k = ERGOLS_LANCEURS[type][i]; T.ergols[k] = (T.ergols[k] || 0) + e.carburant; });
  T.co2Ergols += co2Lanceur(type);
  for (const [k, q] of Object.entries(contenu || {})) if (q > 0) T.contenu[k] = (T.contenu[k] || 0) + q * masseUnite(k);
}
// Ravitaillement courant (petits cargos automatiques) : sa masse, et les ergols au prorata d'un Hercule.
function noterRavitoCourant(contenu) {
  const v = campagneEnCours();
  if (!v) return;
  const T = bilanDe(v).terre;
  let kg = 0;
  for (const [k, q] of Object.entries(contenu)) kg += q * masseUnite(k);
  T.ravito += kg;
  T.co2Ravito += (kg * co2Lanceur('station')) / LANCEURS.station.chargeUtile;
}

// ---------- Carbone des dépenses (ratios monétaires) ----------
// kg CO₂e par euro dépensé : ordre de grandeur des facteurs « supply chain » de l'EPA (≈ 0,25 kg/$ pour
// l'industrie spatiale, 0,2 à 0,4 kg/$ pour la recherche), bien plus bas pour les salaires et l'assurance.
const RATIOS_CARBONE = {
  lancements: 0.25, materiel: 0.25, interstellaire: 0.25,
  rd: 0.2, formation: 0.2, retours: 0.2, sol: 0.2, infra: 0.2, stations: 0.2, bases: 0.2,
  salaires: 0.05, assurances: 0.05, assuranceVie: 0.05, indemnites: 0.05,
};
const LIBELLES_CARBONE = { lancements: '🚀 Fabrication des lanceurs, pas de tir' };
const EMPREINTE_FRANCAIS = 8.2;   // t CO₂e par an et par personne (SDES, 2024)
const SOURCES_BILAN = {
  esa: { nom: 'ESA (CSID, 2023) : CO₂ par kg d’ergols brûlés selon le type de moteur', url: 'https://indico.esa.int/event/450/contributions/8861/attachments/5686/9442/2023_10_17_Presentation_CSID_Lifecyast_v1_1.pdf' },
  faa: { nom: 'Falcon 9 : ≈ 400 à 500 t de CO₂ par lancement (FAA, repris par Jalopnik)', url: 'https://jalopnik.com/spacex-flights-in-2024-will-emit-more-co2-in-the-u-s-t-1851651952' },
  dallas: { nom: 'Dallas et al. (2020), impact environnemental des lancements (Journal of Cleaner Production)', url: 'https://ui.adsabs.harvard.edu/abs/2020JCPro.25520209D' },
  epaSpatial: { nom: 'EPA, facteurs « supply chain » : véhicules spatiaux, ≈ 0,25 kg CO₂e/$ (Climatiq)', url: 'https://www.climatiq.io/data/emission-factor/1bec811f-cba1-4843-94f9-4c276c0da729' },
  epaRD: { nom: 'CEDA : recherche et développement, 0,2 à 0,4 kg CO₂e/$ (Climatiq)', url: 'https://www.climatiq.io/data/emission-factor/f891dfdf-c21e-8916-a64e-a71f2fc5d46a' },
  sdes: { nom: 'SDES : empreinte carbone de la France en 2024, 8,2 t par personne', url: 'https://www.statistiques.developpement-durable.gouv.fr/emissions-de-gaz-effet-de-serre-et-empreinte-carbone-de-la-france-en-2024-une-baisse-plus-faible' },
};

// Lignes du bilan carbone (tonnes) : [{ nom, t, detail }].
function lignesCarbone(v) {
  const T = bilanDe(v).terre, f = v.finances ? (majFinances(v), v.finances) : { cumul: {} };
  const l = [{ nom: '⛽ Ergols des lanceurs (combustion et production)', t: T.co2Ergols / 1000, detail: `${Object.values(T.lancements).reduce((s, n) => s + n, 0)} lancements` }];
  if (T.co2Ravito) l.push({ nom: '📦 Ravitaillement courant (ergols, au prorata)', t: T.co2Ravito / 1000, detail: `${fmtMasse(T.ravito)} livrées` });
  for (const [cat, r] of Object.entries(RATIOS_CARBONE)) {
    const e = f.cumul[cat] || 0;
    if (e > 0 && isFinite(e)) l.push({ nom: LIBELLES_CARBONE[cat] || CATEGORIES_FINANCES[cat], t: (e * r) / 1000, detail: `${fmtEuros(e)} × ${fmt(r, 2)} kg/€` });
  }
  return l;
}

// ---------- Mise en forme ----------
function fmtMasse(kg) {
  if (kg < 1000) return `${fmt(kg)} kg`;
  if (kg < 1e9) return `${fmt(kg / 1000, kg < 1e4 ? 1 : 0)} t`;
  return `${fmt(kg / 1e9, kg < 1e10 ? 1 : 0)} Mt`;
}
function fmtCO2(t) {
  if (t < 1000) return `${fmt(t, t < 10 ? 1 : 0)} t`;
  if (t < 1e6) return `${fmt(t / 1000, t < 1e4 ? 1 : 0)} kt`;
  return `${fmt(t / 1e6, t < 1e7 ? 1 : 0)} Mt`;
}
// Très petite proportion, en écriture scientifique : « 3,2 × 10⁻¹⁷ % ».
function fmtPart(x) {
  const p = x * 100;
  if (!(p > 0)) return '0 %';
  if (p >= 0.01) return `${fmt(p, 2)} %`;
  const e = Math.floor(Math.log10(p)), m = p / 10 ** e;
  const exp = String(e).replace('-', '⁻').replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  return `${fmt(m, 1)} × 10${exp} %`;
}
function masseAstreKg(a) { return (a.gm * 1e9) / 6.674e-11; }
function nomDest(id) { return id === 'orbiteur' ? 'l’orbiteur' : ASTRES_PAR_ID[id] ? ASTRES_PAR_ID[id].nom : id; }

// Masses par astre : extrait (bases), transformé, envoyé ailleurs, échantillons, allègement.
function lignesAstres(v) {
  const B = bilanDe(v), ids = new Set();
  for (const b of v.bases || []) ids.add(b.astre);
  for (const id in B.astres) ids.add(id);
  for (const id in v.echantillonsABord || {}) ids.add(id);
  for (const id in v.echantillonsRapportes || {}) ids.add(id);
  const l = [];
  for (const id of ids) {
    const a = ASTRES_PAR_ID[id];
    if (!a || estOrigine(id)) continue;
    const bases = (v.bases || []).filter((b) => b.astre === id);
    const ergols = bases.reduce((s, b) => s + (b.produitTotal || 0), 0), mat = bases.reduce((s, b) => s + (b.materiauxTotal || 0), 0);
    const A = B.astres[id] || { envoye: {}, transforme: 0 };
    const envoye = Object.values(A.envoye).reduce((s, x) => s + x, 0);
    const ech = (((v.echantillonsABord || {})[id] || 0) + ((v.echantillonsRapportes || {})[id] || 0)) * MASSE_ECHANTILLON;
    const parti = envoye + ech;
    l.push({ a, ergols, mat, transforme: ergols + A.transforme, envoye, dest: A.envoye, ech, parti, part: parti / masseAstreKg(a) });
  }
  return l.sort((x, y) => y.ergols + y.mat + y.parti - (x.ergols + x.mat + x.parti));
}

function htmlBilan(v) {
  const B = bilanDe(v), T = B.terre;
  const src = (k) => (k ? ` <a href="${SOURCES_BILAN[k].url}" target="_blank" rel="noopener" title="${SOURCES_BILAN[k].nom}">[source]</a>` : '');
  const debutCampagne = (v.journal[0] || {}).t;
  const tardif = B.debut > debutCampagne + 86400;

  // Terre
  const nbL = Object.entries(T.lancements).map(([k, n]) => `${n} × ${TARIFS.lanceurs[k] ? TARIFS.lanceurs[k].nom.replace(/ \(.*\)$/, '') : k}`).join(', ') || 'aucun';
  const ergolsT = Object.values(T.ergols).reduce((s, x) => s + x, 0);
  const envoiTerre = Object.entries(T.contenu).filter(([, kg]) => kg > 0).map(([k, kg]) => `${NOMS_STOCK[k] || k} ${fmtMasse(kg)}`).join(', ');
  const terre = `<section><h3>🌍 Ce que la Terre a fourni</h3><table class="table-progression">
      <tr><td>Lancements</td><td><b>${nbL}</b></td></tr>
      <tr><td>Lanceurs construits (étages, à vide)</td><td><b>${fmtMasse(T.masseLanceurs)}</b></td></tr>
      <tr><td>Ergols brûlés au décollage</td><td><b>${fmtMasse(ergolsT)}</b>${ergolsT ? `<br><span class="doux">${Object.entries(T.ergols).map(([k, kg]) => `${FACTEURS_ERGOLS[k].nom.toLowerCase()} : ${fmtMasse(kg)}`).join(' · ')}</span>` : ''}</td></tr>
      <tr><td>Capacité mise en orbite</td><td><b>${fmtMasse(T.chargeUtile)}</b>${envoiTerre ? `<br><span class="doux">dont chargements : ${envoiTerre}</span>` : ''}</td></tr>
      <tr><td>Ravitaillement courant des stations</td><td><b>${fmtMasse(T.ravito)}</b> <span class="doux">(vivres, eau, carburant, ergols)</span></td></tr>
      <tr><td>Part de la masse de la Terre partie dans l’espace</td><td><b>${fmtPart((T.chargeUtile + T.ravito) / masseAstreKg(ASTRES_PAR_ID[planeteOrigine().id]))}</b></td></tr></table></section>`;

  // Astres
  const la = lignesAstres(v);
  const ligne = (r) => `<tr><td>${r.a.nom}</td>
      <td>${r.ergols || r.mat ? `${r.ergols ? `ergols ${fmtMasse(r.ergols)}` : ''}${r.ergols && r.mat ? '<br>' : ''}${r.mat ? `matériaux ${fmtMasse(r.mat)}` : ''}` : '—'}</td>
      <td>${r.transforme ? fmtMasse(r.transforme) : '—'}</td>
      <td>${r.envoye ? `<b>${fmtMasse(r.envoye)}</b><br><span class="doux">${Object.entries(r.dest).map(([d, kg]) => `${nomDest(d)} ${fmtMasse(kg)}`).join(' · ')}</span>` : '—'}</td>
      <td>${r.ech ? fmtMasse(r.ech) : '—'}</td>
      <td><b>${fmtMasse(r.parti)}</b><br><span class="doux">${fmtPart(r.part)}</span></td></tr>`;
  const astres = `<section><h3>🪐 Ce qu’on a tiré de chaque astre</h3>${la.length ? `<table class="table-progression">
      <tr><th>Astre</th><th>Extrait du sol</th><th>Transformé</th><th>Envoyé ailleurs</th><th>Échantillons</th><th>Allègement</th></tr>${la.map(ligne).join('')}</table>
      <p class="doux">Extrait : ce que les bases ont tiré du sol (ergols et matériaux). Transformé : glace ou gaz changés en ergols, et matériaux locaux passés à l’atelier d’une station. Envoyé ailleurs : la part locale de ce qui a quitté la station de l’astre (cargos, plein de l’orbiteur), objets fabriqués compris. Allègement : ce qui a quitté l’astre pour de bon (envois et échantillons), en masse et en part de la masse de l’astre. Le reste est resté sur place ou y a été consommé.</p>`
    : '<p class="doux">Aucune base ni échantillon pour l’instant : rien n’a encore été tiré d’un autre astre.</p>'}
    ${tardif ? `<p class="doux">Le suivi des envois a commencé le ${fmtDate(B.debut, false)} : ce qui était déjà en stock avant n’a pas d’origine connue et n’est pas compté dans les envois. L’extraction, elle, est comptée depuis le début.</p>` : ''}</section>`;

  // Carbone
  const lc = lignesCarbone(v), total = lc.reduce((s, r) => s + r.t, 0);
  const fDebut = v.finances ? v.finances.debut : B.debut;
  const carbone = `<section><h3>🏭 Bilan carbone (sur Terre)</h3>
    <p class="encart">Émis depuis le début : <b>${fmtCO2(total)} de CO₂ équivalent</b>, soit l’empreinte carbone de ${fmt(total / EMPREINTE_FRANCAIS)} personne${total / EMPREINTE_FRANCAIS >= 2 ? 's' : ''} en France pendant un an (${fmt(EMPREINTE_FRANCAIS, 1)} t par an)${src('sdes')}.</p>
    <table class="table-progression"><tr><th>Poste</th><th>CO₂e</th><th>Calcul</th></tr>
      ${lc.map((r) => `<tr><td>${r.nom}</td><td><b>${fmtCO2(r.t)}</b></td><td class="doux">${r.detail}</td></tr>`).join('')}</table>
    ${fDebut > debutCampagne + 86400 ? `<p class="doux">Cette campagne a commencé avant ces comptes : les dépenses et les lancements d’avant le ${fmtDate(fDebut, false)} ne sont pas comptés.</p>` : ''}
    <details class="encart"><summary><b>📋 Facteurs et sources</b></summary>
      <h4>Ergols (par kg brûlé, oxygène compris)</h4><table class="table-progression"><tr><th>Ergols</th><th>CO₂e</th><th>Détail</th></tr>
        ${Object.values(FACTEURS_ERGOLS).map((x) => `<tr><td>${x.nom}</td><td><b>${fmt(x.co2, 1)} kg</b></td><td class="doux">${x.ref}${src(x.src)}</td></tr>`).join('')}</table>
      <p class="doux">Par lancement : Aube ${fmtCO2(co2Lanceur('equipage') / 1000)} (une Falcon 9 : 400 à 500 t${src('faa')}), Hercule ${fmtCO2(co2Lanceur('station') / 1000)}, Séléné ${fmtCO2(co2Lanceur('lune') / 1000)}.</p>
      <h4>Dépenses (ratios monétaires)</h4><table class="table-progression"><tr><th>Poste</th><th>kg CO₂e par €</th></tr>
        ${Object.entries(RATIOS_CARBONE).map(([c, r]) => `<tr><td>${LIBELLES_CARBONE[c] || CATEGORIES_FINANCES[c]}</td><td>${fmt(r, 2)}</td></tr>`).join('')}</table>
      <p class="doux">Fabrication et matériel : ≈ 0,25 kg CO₂e par dollar pour l’industrie spatiale${src('epaSpatial')}. Recherche, formation, exploitation au sol et des stations : 0,2 à 0,4 kg par dollar pour la recherche${src('epaRD')}, arrondi à 0,2 kg par euro. Salaires, assurances, indemnités : 0,05 kg par euro (estimé). Un ratio monétaire ne donne qu’un ordre de grandeur.</p>
      <p class="doux">Pas compté : les suies, l’alumine, les oxydes d’azote et la vapeur d’eau rejetés en haute atmosphère, dont l’effet sur le climat et la couche d’ozone est encore mal mesuré${src('dallas')}.</p>
      <h4>Sources</h4><ul>${Object.values(SOURCES_BILAN).map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.nom}</a></li>`).join('')}</ul>
    </details></section>`;

  return `<p>Ce que l’expédition a pris à la Terre et aux autres astres, et ce qu’elle a émis sur Terre.</p>${terre}${astres}${carbone}`;
}
