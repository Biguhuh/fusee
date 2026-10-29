'use strict';
// Tableau de bord d'un astre pendant la campagne, dans sa fiche : ce qui est sur place (drapeaux,
// bases et leurs productions, zone repérée, échantillons) et en orbite (stations, stocks, chantiers,
// sondes, ravitos attendus), avec les actions pour gérer l'astre depuis cette fenêtre.

// Ce qui manque à une base pour passer au niveau suivant.
function manquePourNiveau(v, b) {
  const n = b.niveau || 1, a = ASTRES_PAR_ID[b.astre];
  if (n >= 5) return { texte: 'niveau maximal atteint', pret: false };
  if (b.descente) return { texte: `extension en descente, posée dans ${fmtDuree(b.descente.fin - v.t)}`, pret: false };
  const st = v.stations.find((s) => s.centre === b.astre);
  if (!st) return { texte: `il faut une station ${enOrbite(a)} pour recevoir l’extension`, pret: false };
  if ((st.stock.extensions || 0) > 0) return { texte: `extension prête ${au(st)}`, pret: true, station: st };
  const r = RECETTES.extensions;
  const enChantier = (st.chantiers || []).some((c) => c.cle === 'extensions');
  return {
    texte: enChantier ? `extension en fabrication ${au(st)}`
      : `1 extension de base ${au(st)} : ravito « Extension de base », ou atelier (${fmtStock('materiaux', r.materiaux)} de matériaux, ${fmtStock('materiaux', st.stock.materiaux || 0)} en stock)`,
    pret: false, station: st,
  };
}

// ---------- Logistique : récapitulatif de toute l'exploration ----------
// Astres visités ou équipés, bases et productions, stations et stocks, chantiers, ravitos et sondes en route,
// et ce qui manque pour faire progresser chaque base. Un clic sur un astre ouvre son tableau de bord.
function ouvrirLogistique(v, actif) {
  const m = $('modale');
  const ids = new Set([...Object.keys(v.visites).filter((id) => astreVisite(v, id)), ...v.bases.map((b) => b.astre), ...v.stations.map((s) => s.centre),
    ...Object.keys(v.echantillonsRapportes || {})]);
  const astres = [...ids].map((id) => ASTRES_PAR_ID[id]).filter(Boolean).sort((x, y) => (x.distanceUA || 0) - (y.distanceUA || 0));
  let ergolsJour = 0, matJour = 0;
  for (const b of v.bases) {
    const a = ASTRES_PAR_ID[b.astre], n = b.niveau || 1;
    ergolsJour += ressourceLocale(a)[1] * n;
    matJour += productionMateriaux(a, n);
  }
  const besoins = [];
  for (const b of v.bases) {
    const mq = manquePourNiveau(v, b);
    if ((b.niveau || 1) < 5 && !mq.pret && !b.descente) besoins.push({ astre: b.astre, texte: `${nomBase(ASTRES_PAR_ID[b.astre])} → niveau ${(b.niveau || 1) + 1} : ${mq.texte}`, station: mq.station });
    if (mq.pret) besoins.push({ astre: b.astre, texte: `${nomBase(ASTRES_PAR_ID[b.astre])} : ${mq.texte}, à envoyer (tableau de bord de l’astre)` });
  }
  for (const st of v.stations) {
    if (estOrigine(st.centre)) continue;     // autour de la planète d'origine, rien ne manque jamais
    if ((st.stock.ergols || 0) < 20000) besoins.push({ astre: st.centre, texte: `${st.nom} : peu d’ergols (${fmtStock('ergols', st.stock.ergols || 0)})`, station: st });
    if ((st.stock.materiaux || 0) < 10000) besoins.push({ astre: st.centre, texte: `${st.nom} : peu de matériaux (${fmtStock('materiaux', st.stock.materiaux || 0)})`, station: st });
  }
  const lignes = astres.map((a) => {
    const bases = v.bases.filter((b) => b.astre === a.id);
    const sts = v.stations.filter((s) => s.centre === a.id);
    const ech = (v.echantillonsRapportes || {})[a.id] || 0;
    const prod = bases.map((b) => { const n = b.niveau || 1; const e = ressourceLocale(a)[1] * n, mt = productionMateriaux(a, n); return `niveau ${n}${e ? ` · ${fmt(e / 1000, 1)} t d’ergols/jour` : ''}${mt ? ` · ${fmt(mt / 1000, 1)} t de matériaux/jour` : ''}`; }).join('<br>') || '—';
    const stock = sts.map((s) => `${s.nom} (niveau ${s.niveau || 1}${s.agrandissement ? ' ⬆' : ''}) : ${fmtStock('ergols', s.stock.ergols || 0)} d’ergols, ${fmtStock('materiaux', s.stock.materiaux || 0)} de matériaux${(s.chantiers || []).length ? ` · 🔧 ${s.chantiers.length}` : ''}`).join('<br>') || '—';
    return `<tr><td><button class="lien-astre" data-id="${a.id}">${a.nom}</button></td><td>${astreVisite(v, a.id) ? (a.type === 'gazeuse' ? '✓ plongée' : '✓') : ''}</td><td>${ech || ''}</td><td>${prod}</td><td>${stock}</td></tr>`;
  }).join('');
  const enRoute = [...(v.cargos || []).map((c) => `📦 ${c.nom}`), ...v.sondesEnVol.map((s) => `🛰 ${s.nom} (${s.etat === 'vol' ? 'en route' : 'en orbite'})`)];
  m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>📊 Logistique de l’exploration</h2>
    <p>Production totale des bases : <b>${fmt(ergolsJour / 1000, 1)} t d’ergols</b> et <b>${fmt(matJour / 1000, 1)} t de matériaux</b> par jour. ${v.stations.length} station${v.stations.length > 1 ? 's' : ''}, ${v.bases.length} base${v.bases.length > 1 ? 's' : ''}.</p></div><button class="fermer">✕</button></header>
    <section><h3>Astres</h3>${astres.length ? `<div class="defile"><table class="logistique"><thead><tr><th>Astre</th><th>Posé</th><th>Échant.</th><th>Bases</th><th>Stations</th></tr></thead><tbody>${lignes}</tbody></table></div>` : '<p class="doux">Aucun astre exploré ni équipé pour l’instant.</p>'}</section>
    <section><h3>À faire pour progresser</h3>${besoins.length ? `<ul class="sondes">${besoins.map((b, i) => `<li>${b.texte} ${actif && b.station ? `<button data-rav="${b.station.id}">📦 Ravito</button>` : ''}</li>`).join('')}</ul>` : '<p class="doux">Rien d’urgent.</p>'}</section>
    ${SYSTEME.retour !== false ? `<section><h3>Avant de quitter le ${SYSTEME.nom}</h3>${htmlListeDepart(v)}</section>` : ''}
    <section><h3>En route</h3>${enRoute.length ? `<ul class="sondes">${enRoute.map((t) => `<li>${t}</li>`).join('')}</ul>` : '<p class="doux">Rien en route.</p>'}</section></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  m.querySelectorAll('.lien-astre').forEach((b) => { b.onclick = () => Infos.ouvrirFiche(b.dataset.id); });
  m.querySelectorAll('[data-rav]').forEach((b) => { b.onclick = () => Orbiteur.ouvrirRavito(b.dataset.rav); });
}

// ---------- Ressources : où miner quoi ----------
// Familles de ressources, reconnues dans la ressource locale de chaque astre. « Matériaux » : la mine
// d'une base agrandie (niveau 2 et plus), possible sur tout astre solide.
const FAMILLES_RESSOURCES = [
  { id: 'eau', nom: '💧 Glace d’eau', def: 'hydrogène et oxygène pour les ergols', test: (txt) => /eau|cratères|argiles|glace$/.test(txt) },
  { id: 'methane', nom: '🔥 Méthane', def: 'carburant tout prêt', test: (txt) => /méthane liquide|de méthane/.test(txt) },
  { id: 'co2', nom: '🌫 CO₂', def: 'transformé en méthane et oxygène avec l’eau du sol', test: (txt) => /CO₂/.test(txt) },
  { id: 'azote', nom: '❄ Glace d’azote', def: 'gaz de pressurisation et propulseurs froids', test: (txt) => /azote/.test(txt) },
  { id: 'materiaux', nom: '⛏ Matériaux', def: 'métaux et silicates, par la mine d’une base de niveau 2 et plus', test: null },
];

// Astres où l'on peut miner une famille de ressources : [{ a, richesse (kg/jour, base niveau 1 ou 2), texte }].
function astresPourRessource(famille) {
  const f = FAMILLES_RESSOURCES.find((x) => x.id === famille);
  const l = [];
  for (const a of ASTRES) {
    if (a.type !== 'solide' || estOrigine(a.id)) continue;
    if (famille === 'materiaux') { l.push({ a, richesse: productionMateriaux(a, 2), texte: 'mine au niveau 2' }); continue; }
    const [txt, prod] = ressourceLocale(a);
    if (txt && prod > 0 && f.test(txt)) l.push({ a, richesse: prod, texte: txt });
  }
  return l;
}

function ouvrirRessources(v, famille = 'eau', tout = false) {
  const m = $('modale');
  const ici = v.orb ? V.add(etatAbsolu(v.orb.centre, v.t).r, v.orb.r) : etatAbsolu(astreAncrage(), v.t).r;
  const liste = astresPourRessource(famille).map((x) => ({ ...x, d: V.norm(V.sub(etatAbsolu(x.a.id, v.t).r, ici)) }))
    .sort((p, q) => q.richesse - p.richesse || p.d - q.d);
  const montrees = tout ? liste : liste.slice(0, 40);
  const fmtD = (km) => (km > 0.05 * UA_KM ? `${fmt(km / UA_KM, 2)} UA` : `${fmt(km)} km`);
  const f = FAMILLES_RESSOURCES.find((x) => x.id === famille);
  m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>⛏ Où miner quoi ?</h2>
    <p>Choisissez une ressource : les astres où une base peut l’exploiter, les plus riches d’abord, puis les plus proches ${v.orb ? 'de l’orbiteur' : `de ${SYSTEME.nomOrigine}`}.</p></div><button class="fermer">✕</button></header>
    <div class="orientations">${FAMILLES_RESSOURCES.map((x) => `<button data-famille="${x.id}" class="${x.id === famille ? 'principal' : ''}">${x.nom}</button>`).join('')}</div>
    <p class="doux">${f.nom} : ${f.def}. ${liste.length} astre${liste.length > 1 ? 's' : ''}.</p>
    <div class="defile"><table class="logistique"><thead><tr><th>Astre</th><th>Ressource</th><th>Richesse</th><th>Distance</th><th></th></tr></thead><tbody>${montrees.map((x) => {
      const b = baseSur(v, x.a.id);
      return `<tr><td><button class="lien-astre" data-id="${x.a.id}">${x.a.nom}</button>${b ? ` <span class="doux">🏠 niveau ${b.niveau || 1}</span>` : ''}</td><td>${x.texte}</td><td>${fmt(x.richesse / 1000, 1)} t/jour</td><td>${fmtD(x.d)}</td><td>${v.orb ? `<button data-cible="${x.a.id}" ${v.cible === x.a.id ? 'disabled' : ''}>🎯 Cible</button>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>
    ${!tout && liste.length > montrees.length ? `<p><button id="res-tout">Voir les ${liste.length} astres</button></p>` : ''}</div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  m.querySelectorAll('[data-famille]').forEach((b) => { b.onclick = () => ouvrirRessources(v, b.dataset.famille); });
  const bt = $('res-tout'); if (bt) bt.onclick = () => ouvrirRessources(v, famille, true);
  m.querySelectorAll('.lien-astre').forEach((b) => { b.onclick = () => Infos.ouvrirFiche(b.dataset.id); });
  m.querySelectorAll('[data-cible]').forEach((b) => {
    b.onclick = () => {
      Infos.fermer();
      Orbiteur.choisirCible(b.dataset.cible, f.nom.replace(/^\S+\s/, ''));
    };
  });
}

// Sections du tableau de bord (HTML) et branchement des boutons. actif : l'orbiteur est ouvert (actions permises).
function tableauAstre(v, a, actif) {
  if (!v || a.type === 'etoile' || a.artificiel) return null;
  const sections = [];
  const bouton = (action, texte, desactive) => (actif ? `<button data-tb="${action}" ${desactive ? 'disabled' : ''}>${texte}</button>` : '');
  const ligne = (k, val) => `<dt>${k}</dt><dd>${val}</dd>`;

  // ---------- Sur place ----------
  let surPlaceTxt = '', orbConteneurs = '';
  const visite = v.visites[a.id];
  surPlaceTxt += ligne('Exploration', visite && visite.pose ? 'posé ici' : 'jamais posé');
  const ech = (v.echantillonsRapportes || {})[a.id] || 0, aBord = (v.echantillonsABord || {})[a.id] || 0;
  if (ech || aBord) surPlaceTxt += ligne('Échantillons', `${ech} rapporté${ech > 1 ? 's' : ''} sur Terre${aBord ? `, ${aBord} à bord de l’orbiteur` : ''}`);
  const drapeaux = drapeauxSur(a.id);
  if (drapeaux.length) surPlaceTxt += ligne('Drapeaux', drapeaux.map((d) => d.par || 'drapeau').join(', '));
  const site = (v.sites || {})[a.id];
  if (a.type === 'solide' && !estOrigine(a.id)) surPlaceTxt += ligne('Zone de base', site ? `repérée${site.prod ? ` — ${site.ressource}` : ' — pas de ressource locale'}` : 'non repérée : envoyez une sonde');
  const [res, prod] = ressourceLocale(a);
  if (estOrigine(a.id)) surPlaceTxt += ligne('Ressources', `tout est disponible sur ${SYSTEME.origineSans}, sans base ni extraction : plein gratuit en orbite, ravitos illimités`);
  else if (a.type === 'solide') surPlaceTxt += ligne('Ressource locale', prod ? `${res} (${fmt(prod / 1000, 1)} t d’ergols par jour et par niveau de base)` : 'aucune connue');
  const bases = v.bases.filter((b) => b.astre === a.id);
  for (const b of bases) {
    const n = b.niveau || 1, mat = productionMateriaux(a, n), manque = manquePourNiveau(v, b);
    const idx = v.bases.indexOf(b);
    surPlaceTxt += `<dt>🏠 Base, niveau ${n}</dt><dd>${prod ? `${fmt((prod * n) / 1000, 1)} t d’ergols/jour` : 'pas d’ergols'}${mat ? `, ${fmt(mat / 1000, 1)} t de matériaux/jour` : ''} ; ${fmt((b.stock || 0) / 1000, 1)} t en stock au sol</dd>`;
    surPlaceTxt += `<dt>Niveau ${Math.min(5, n + 1)}</dt><dd>${manque.texte} ${manque.pret ? bouton(`extension:${idx}`, '⬇ Envoyer l’extension') : ''}</dd>`;
  }
  if (!bases.length && a.type === 'solide' && !estOrigine(a.id)) {
    const pb = actif ? Orbiteur.peutDeployerBase(a) : 'orbiteur fermé';
    surPlaceTxt += ligne('Base', pb ? `aucune (kit de base + station en orbite + zone repérée) — ${pb}` : `aucune ${bouton(`deployer:${a.id}`, '🏠 Déployer depuis l’orbite')}`);
  }
  for (const b of bases.filter((x) => x.deploiement)) surPlaceTxt += ligne('🏠 Base en cours', `module de descente posé dans ${fmtDuree(b.deploiement.fin - v.t)}`);
  const surPlace = (v.equipe || []).filter((m) => m.etat === 'mission' && m.mission.astre === a.id);
  if (surPlace.length) surPlaceTxt += ligne('🧑‍🚀 Équipe', surPlace.map((m) => `${m.nom} (retour dans ${fmtDuree(m.mission.fin - v.t)})`).join(', '));
  const robotsIci = (v.robotsAuto || []).filter((r) => r.astre === a.id);
  if (robotsIci.length) surPlaceTxt += ligne('🤖 Robots de prélèvement', robotsIci.map((r) => `conteneur lancé dans ${fmtDuree(r.fin - v.t)}`).join(', '));
  const conteneurs = (v.conteneurs || []).filter((c) => c.astre === a.id);
  if (conteneurs.length) orbConteneurs = conteneurs.map((c) => `${c.n} échantillons`).join(', ');
  sections.push(['📍 Sur place', surPlaceTxt]);

  // ---------- En orbite ----------
  let orb = '';
  if (orbConteneurs) orb += ligne('📦 Conteneurs d’échantillons', `${orbConteneurs} — l’orbiteur les récupère en passant en orbite`);
  if (v.orb && v.orb.centre === a.id) orb += ligne('🚀 Orbiteur', `ici — ${fmt(v.carburant / 1000, 1)} t de carburant, ${fmt(v.ergolsAtt / 1000, 1)} t d’ergols atterrisseur`);
  const stations = v.stations.filter((s) => s.centre === a.id);
  for (const st of stations) {
    const k = st.stock;
    const stock = Object.keys(NOMS_STOCK).filter((c) => k[c]).map((c) => `${NOMS_STOCK[c]} ${fmtStock(c, k[c])} / ${fmtStock(c, capaciteStation(st, c))}`).join(' · ') || 'stock vide';
    const n = st.niveau || 1;
    orb += `<dt>🛰 ${st.nom}, niveau ${n}</dt><dd>${niveauStation(st).apport}<br>${stock}</dd>`;
    // Niveau suivant de la station : extension de station en stock, puis assemblage en orbite.
    let suivant;
    if (n >= 5) suivant = 'niveau maximal atteint';
    else if (st.agrandissement) suivant = `assemblage en cours, terminé dans ${fmtDuree(st.agrandissement.fin - v.t)}`;
    else if ((k.extensionsStation || 0) > 0) suivant = `${NIVEAUX_STATION[n + 1].apport} ${bouton(`agrandir:${st.id}`, `⬆ Agrandir (niveau ${n + 1})`)}`;
    else suivant = `${NIVEAUX_STATION[n + 1].apport} — il faut 1 extension de station (atelier : ${fmtStock('materiaux', RECETTES.extensionsStation.materiaux)} de matériaux, ou ravito « Extension de station »)`;
    if (n < 5 || st.agrandissement) orb += `<dt>Niveau ${Math.min(5, n + 1)}</dt><dd>${suivant}</dd>`;
    if (niveauStation(st).habitat && v.equipe) orb += `<dt>Habitat</dt><dd>équipe ${survivants(v).length}/${capaciteEquipe(v)} ${v.equipe.length < capaciteEquipe(v) ? bouton('recruter', '🧑‍🚀 Accueillir une recrue') : ''}</dd>`;
    for (const ch of st.chantiers || []) orb += ligne('🔧 Chantier', `${nomChantier(ch.cle)}, prêt dans ${fmtDuree(ch.fin - v.t)}`);
    if (actif) {
      const fab = Object.entries(RECETTES).filter(([cle]) => recetteVisible(cle, st))
        .map(([cle, r]) => bouton(`fab:${st.id}:${cle}`, `🔧 ${r.nom}`, k.materiaux < r.materiaux || (r.ergols && k.ergols < r.ergols))).join(' ');
      orb += `<dt>🔧 Atelier : construire</dt><dd class="actions-tb">${fab}</dd>`;
      orb += `<dt></dt><dd>${bouton(`ravito:${st.id}`, '📦 Envoyer un ravito ici')}</dd>`;
    }
  }
  if (!stations.length) orb += ligne('Station', 'aucune (kit de station à bord de l’orbiteur, en orbite fermée)');
  const sondes = v.sondesEnVol.filter((s) => s.cible === a.id);
  if (sondes.length) orb += ligne('Sondes', sondes.map((s) => `${s.nom} (${s.etat === 'vol' ? 'en route' : 'en orbite'})`).join(', '));
  const cargos = (v.cargos || []).filter((c) => c.cible === a.id);
  if (cargos.length) orb += ligne('Ravitos attendus', cargos.map((c) => c.nom).join(', '));
  sections.push(['🛰 En orbite', orb]);

  // Branchement des boutons ; rafraichir : rouvre la fiche après une action.
  const brancher = (m, rafraichir) => {
    m.querySelectorAll('[data-tb]').forEach((el) => {
      el.onclick = () => {
        const [type, p1, p2] = el.dataset.tb.split(':');
        if (type === 'extension') Orbiteur.envoyerExtension(Number(p1));
        if (type === 'fab') Orbiteur.fabriquer(p1, p2);
        if (type === 'agrandir') Orbiteur.agrandirStation(p1);
        if (type === 'deployer') Orbiteur.deployerBase(p1);
        if (type === 'recruter') recruter(v, (t) => Orbiteur.log(t));
        if (type === 'ravito') return Orbiteur.ouvrirRavito(p1);
        Orbiteur.majHud(true);
        rafraichir();
      };
    });
  };
  return { sections, brancher };
}
