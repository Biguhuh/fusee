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
  if (!st) return { texte: `il faut une station en orbite de ${a.nom} pour recevoir l’extension`, pret: false };
  if ((st.stock.extensions || 0) > 0) return { texte: `extension prête à ${st.nom}`, pret: true, station: st };
  const r = RECETTES.extension;
  const enChantier = (st.chantiers || []).some((c) => c.cle === 'extension');
  return {
    texte: enChantier ? `extension en fabrication à ${st.nom}`
      : `1 extension de base à ${st.nom} : ravito « Extension de base », ou atelier (${fmtStock('materiaux', r.materiaux)} de matériaux, ${fmtStock('materiaux', st.stock.materiaux || 0)} en stock)`,
    pret: false, station: st,
  };
}

// Sections du tableau de bord (HTML) et branchement des boutons. actif : l'orbiteur est ouvert (actions permises).
function tableauAstre(v, a, actif) {
  if (!v || a.type === 'etoile') return null;
  const sections = [];
  const bouton = (action, texte, desactive) => (actif ? `<button data-tb="${action}" ${desactive ? 'disabled' : ''}>${texte}</button>` : '');
  const ligne = (k, val) => `<dt>${k}</dt><dd>${val}</dd>`;

  // ---------- Sur place ----------
  let sur = '';
  const visite = v.visites[a.id];
  sur += ligne('Exploration', visite && visite.pose ? 'posé ici' : 'jamais posé');
  const ech = (v.echantillonsRapportes || {})[a.id] || 0, aBord = (v.echantillonsABord || {})[a.id] || 0;
  if (ech || aBord) sur += ligne('Échantillons', `${ech} rapporté${ech > 1 ? 's' : ''} sur Terre${aBord ? `, ${aBord} à bord de l’orbiteur` : ''}`);
  const drapeaux = drapeauxSur(a.id);
  if (drapeaux.length) sur += ligne('Drapeaux', drapeaux.map((d) => d.par || 'drapeau').join(', '));
  const site = (v.sites || {})[a.id];
  if (a.type === 'solide' && !estOrigine(a.id)) sur += ligne('Zone de base', site ? `repérée${site.prod ? ` — ${site.ressource}` : ' — pas de ressource locale'}` : 'non repérée : envoyez une sonde');
  const [res, prod] = ressourceLocale(a);
  if (a.type === 'solide') sur += ligne('Ressource locale', prod ? `${res} (${fmt(prod / 1000, 1)} t d’ergols par jour et par niveau de base)` : 'aucune connue');
  const bases = v.bases.filter((b) => b.astre === a.id);
  for (const b of bases) {
    const n = b.niveau || 1, mat = productionMateriaux(a, n), manque = manquePourNiveau(v, b);
    const idx = v.bases.indexOf(b);
    sur += `<dt>🏠 Base, niveau ${n}</dt><dd>${prod ? `${fmt((prod * n) / 1000, 1)} t d’ergols/jour` : 'pas d’ergols'}${mat ? `, ${fmt(mat / 1000, 1)} t de matériaux/jour` : ''} ; ${fmt((b.stock || 0) / 1000, 1)} t en stock au sol</dd>`;
    sur += `<dt>Niveau ${Math.min(5, n + 1)}</dt><dd>${manque.texte} ${manque.pret ? bouton(`extension:${idx}`, '⬇ Envoyer l’extension') : ''}</dd>`;
  }
  if (!bases.length && a.type === 'solide' && !estOrigine(a.id)) sur += ligne('Base', 'aucune (kit de base + station en orbite + zone repérée)');
  sections.push(['📍 Sur place', sur]);

  // ---------- En orbite ----------
  let orb = '';
  if (v.orb && v.orb.centre === a.id) orb += ligne('🚀 Orbiteur', `ici — ${fmt(v.carburant / 1000, 1)} t de carburant, ${fmt(v.ergolsAtt / 1000, 1)} t d’ergols atterrisseur`);
  const stations = v.stations.filter((s) => s.centre === a.id);
  for (const st of stations) {
    const k = st.stock;
    const stock = Object.keys(NOMS_STOCK).filter((c) => k[c]).map((c) => `${NOMS_STOCK[c]} ${fmtStock(c, k[c])} / ${fmtStock(c, CAPACITES_STATION[c])}`).join(' · ') || 'stock vide';
    orb += `<dt>🛰 ${st.nom}</dt><dd>${stock}</dd>`;
    for (const ch of st.chantiers || []) orb += ligne('🔧 Chantier', `${RECETTES[ch.cle].nom}, prêt dans ${fmtDuree(ch.fin - v.t)}`);
    if (actif) {
      const fab = Object.entries(RECETTES).filter(([cle]) => cle !== 'lanceurRetour' || AEROSTAT[st.centre])
        .map(([cle, r]) => bouton(`fab:${st.id}:${cle}`, `🔧 ${r.nom}`, k.materiaux < r.materiaux || (r.ergols && k.ergols < r.ergols))).join(' ');
      orb += `<dt>Atelier</dt><dd class="actions-tb">${fab}</dd>`;
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
        if (type === 'ravito') return Orbiteur.ouvrirRavito(p1);
        Orbiteur.majHud(true);
        rafraichir();
      };
    });
  };
  return { sections, brancher };
}
