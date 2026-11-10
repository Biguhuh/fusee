'use strict';
// ---------- Centre de commande ----------
// Ce que décide la Terre, séparé de ce que fait le vaisseau (écran de l'orbiteur) : vue d'ensemble, ravitos,
// stations et bases (atelier), R&D, équipage, lancements, ressources, finances, journal, et l'au-delà.
// Chaque information n'apparaît qu'à un endroit. Les formulaires (ravito, envoi de spationautes, départ)
// s'ouvrent par-dessus, dans la fenêtre habituelle.

const Commande = {
  onglet: 'ensemble',
  retour: 'orbiteur',      // 'orbiteur' ou 'accueil'
  marquerLues: null,       // journal : marque les entrées comme lues en quittant l'onglet
  ONGLETS: [
    { id: 'ensemble', titre: '🗺 Vue d’ensemble' },
    { id: 'ravitos', titre: '📦 Ravitos' },
    { id: 'stations', titre: '🛰 Stations et bases' },
    { id: 'rd', titre: '🔬 R&D' },
    { id: 'equipage', titre: '🧑‍🚀 Équipage' },
    { id: 'lancements', titre: '🚀 Lancements' },
    { id: 'ressources', titre: '⛏ Ressources' },
    { id: 'finances', titre: '💶 Finances' },
    { id: 'bilan', titre: '⚖️ Bilan' },
    { id: 'journal', titre: '📜 Journal' },
    { id: 'audela', titre: '🌌 Au-delà' },
  ],

  ouvrir(onglet, retour) {
    const v = etat.voyage;
    if (!v) return;
    if (Orbiteur.v !== v) Orbiteur.charger(v);   // les actions (cargos, transferts) passent par l'orbiteur
    if (onglet) this.onglet = onglet;
    if (retour) this.retour = retour;
    $('commande-retour').textContent = this.retour === 'orbiteur' && v.orb ? '← Orbiteur' : '← Accueil';
    $('commande-retour').onclick = () => this.quitter();
    montrer('commande');
    this.afficher();
  },
  quitter() {
    this.finOnglet();
    sauver(etat);
    if (!(this.retour === 'orbiteur' && etat.voyage && etat.voyage.orb)) return allerAccueil();
    // Panneau de l'orbiteur déjà construit : on y revient tel quel ; sinon, ouverture complète.
    if ($('nav-date')) { montrer('nav'); Orbiteur.majHud(true); } else allerNavigation();
  },
  finOnglet() { if (this.marquerLues) { this.marquerLues(); this.marquerLues = null; } },
  log(t) { Orbiteur.log(t); },

  afficher() {
    const v = etat.voyage, c = $('commande-contenu');
    this.finOnglet();
    majFinances(v);
    $('commande-intro').textContent = `${fmtDate(v.t)} · ${v.stations.length} station${v.stations.length > 1 ? 's' : ''}, ${v.bases.length} base${v.bases.length > 1 ? 's' : ''}${v.orb ? ` · vaisseau ${nomVaisseau(v)} ${enOrbite(ASTRES_PAR_ID[v.orb.centre])}` : ' · pas d’expédition en cours'}.`;
    $('commande-onglets').innerHTML = this.ONGLETS.map((o) => `<button role="tab" data-cmd="${o.id}" aria-selected="${o.id === this.onglet}">${o.titre}</button>`).join('');
    $('commande-onglets').querySelectorAll('[data-cmd]').forEach((b) => { b.onclick = () => { this.onglet = b.dataset.cmd; this.afficher(); }; });
    const f = this['onglet_' + this.onglet] || this.onglet_ensemble;
    f.call(this, v, c);
  },

  onglet_ensemble(v, c) {
    c.innerHTML = `<canvas id="cmd-flotte" style="width:100%;height:auto;border-radius:8px"></canvas>${htmlVueEnsemble(v)}`;
    dessinerFlotte($('cmd-flotte'), v);   // l'orbiteur et les stations, tels qu'ils sont (vaisseaux.js)
    c.querySelectorAll('.lien-astre').forEach((b) => { b.onclick = () => Infos.ouvrirFiche(b.dataset.id); });
    c.querySelectorAll('[data-rav]').forEach((b) => { b.onclick = () => Orbiteur.ouvrirRavito(b.dataset.rav, () => this.afficher()); });
  },

  onglet_ravitos(v, c) {
    const cargos = v.cargos || [];
    const ligne = (cg) => {
      const ta = Orbiteur.arriveePrevue(cg);
      return `<li><b>${cg.nom}</b> — ${decrireContenu(cg.contenu)} · depuis ${cg.origine ? le(cg.origine) : '?'} · ${ta ? (ta > v.t ? `arrive dans ${fmtDuree(ta - v.t)}` : 'arrive bientôt') : 'arrivée inconnue'}</li>`;
    };
    c.innerHTML = `<p>Un cargo part de la Terre (lancement payé) ou d’une station (avec ce qu’elle a en stock), sur sa propre trajectoire. Dans le Système solaire, chaque station reçoit aussi un ravitaillement courant automatique, selon ses besoins.</p>
      ${v.stations.length ? `<div class="actions" style="justify-content:flex-start"><button id="cmd-ravito" class="principal">📦 Préparer un ravito</button>${v.stations.map((s) => `<button data-rav="${s.id}">→ ${s.nom}</button>`).join('')}</div>` : `<p class="encart">Aucune station : ${stationsParModules() ? 'lancez d’abord un noyau (onglet Lancements)' : 'construisez-en une avec l’orbiteur (un kit de station)'} pour pouvoir la ravitailler.</p>`}
      <h3>En route</h3>${cargos.length ? `<ul class="sondes">${cargos.map(ligne).join('')}</ul>` : '<p class="doux">Aucun cargo en route.</p>'}
      ${htmlRavitoCourant(v)}`;
    c.querySelectorAll('[data-auto]').forEach((x) => { x.onchange = () => { const s = v.stations.find((y) => y.id === x.dataset.auto); if (s) s.ravitoAuto = x.checked; sauver(etat); this.afficher(); }; });
    const b = $('cmd-ravito');
    if (b) b.onclick = () => Orbiteur.ouvrirRavito(null, () => this.afficher());
    c.querySelectorAll('[data-rav]').forEach((x) => { x.onclick = () => Orbiteur.ouvrirRavito(x.dataset.rav, () => this.afficher()); });
  },

  onglet_stations(v, c) {
    const station = (st) => {
      const k = st.stock, a = ASTRES_PAR_ID[st.centre];
      const recettes = Object.entries(RECETTES).filter(([cle]) => recetteVisible(cle, st)).map(([cle, r]) =>
        `<button data-fab="${st.id}|${cle}" ${(k.materiaux || 0) < r.materiaux || (r.ergols && (k.ergols || 0) < r.ergols) ? 'disabled' : ''}>${r.nom} · ${fmtStock('materiaux', r.materiaux)}${r.ergols ? ` + ${fmtStock('ergols', r.ergols)} d’ergols` : ''}${r.duree ? ` · ${fmtDuree(r.duree)}` : ''}</button>`).join('');
      const chantiers = (st.chantiers || []).map((ch) => `<li>🔧 ${nomChantier(ch.cle)}, prêt le ${fmtDate(ch.fin)} (dans ${fmtDuree(ch.fin - v.t)})</li>`).join('');
      return `<article class="encart"><h3>🛰 ${st.nom} <span class="doux">— ${enOrbite(a)}, niveau ${st.niveau || 1}${st.agrandissement ? ` (agrandissement : prêt le ${fmtDate(st.agrandissement.fin, false)})` : ''}</span></h3>
        <p class="doux">${niveauStation(st).apport}.</p>
        ${st.module ? `<p class="encart">🔌 ${nomModule(st.module.niveau)} amarré, à raccorder (niveau ${st.module.niveau}) : sortie d’assemblage à deux, orbiteur amarré à la station (bouton « Sortie »)${(v.robots || 0) + (st.stock.robots || 0) > 0 || brasStation(st) ? `, ou <button data-robot-module="${st.id}">🤖 Confier ${brasStation(st) ? 'au bras de la station' : 'au robot'}</button> (deux fois plus lent)` : ', ou un robot (aucun à bord ni à la station)'}.</p>` : ''}
        ${pannesDe(st).length ? `<p class="encart">🔧 En panne : ${texteePannes(st)}. Atelier ${fmt(100 * (1 - facteurPannes(st)))} % plus lent. À réparer en sortie extravéhiculaire (orbiteur amarré à la station).</p>` : ''}
        <dl>${Object.keys(NOMS_STOCK).filter((cle) => (k[cle] || 0) > 0).map((cle) => `<dt>${NOMS_STOCK[cle]}</dt><dd>${fmtStock(cle, k[cle])} <span class="doux">/ ${fmtStock(cle, capaciteStation(st, cle))}</span></dd>`).join('') || '<dt>Stock</dt><dd>vide</dd>'}
          <dt>Déchets</dt><dd>${fmtKg(st.dechets || 0)} <span class="doux">/ ${fmtKg(capaciteDechetsStation(st))}</span></dd></dl>
        ${ressourcesIllimitees() && st.prochainCargo ? `<p class="doux">Ravitaillement courant de la Terre dans ${fmtDuree(st.prochainCargo - v.t)}.</p>` : ''}
        <p><b>🔧 Atelier</b> <span class="doux">: fabriquer avec les matériaux et les ergols du stock</span></p><div class="orientations">${recettes}</div>
        ${chantiers ? `<ul class="sondes">${chantiers}</ul>` : ''}</article>`;
    };
    const base = (b, i) => {
      const a = ASTRES_PAR_ID[b.astre], [res, p] = ressourceLocale(a), n = b.niveau || 1, mat = productionMateriaux(a, n);
      const stB = v.stations.find((s) => s.centre === b.astre);
      let ext = '';
      if (b.descente) ext = `<br><span class="doux">⬇ ${moduleExtension(a).nom} en descente : posé dans ${fmtDuree(b.descente.fin - v.t)} (niveau ${n + 1}).</span>`;
      else if (n < 5 && stB && stB.stock.extensions > 0) ext = `<br><button data-extension="${i}">⬇ Envoyer l’extension à la base (niveau ${n + 1})</button>`;
      else if (n < 5) { const mq = manquePourNiveau(v, b); ext = `<br><span class="doux">Niveau ${n + 1} : ${mq.texte}</span>`; }
      return `<li><b>${nomBase(a)}</b>, niveau ${n} — ${p ? `${res} : ${fmt((p * n) / 1000, 1)} t/jour` : 'pas de ressource locale'}${mat ? `, matériaux ${fmt(mat / 1000, 1)} t/jour` : ''} ; ${fmt((b.stock || 0) / 1000, 1)} t au sol${ext}</li>`;
    };
    c.innerHTML = `<p>Chaque station a un stock et un atelier ; les bases produisent sur place. On les pilote d’ici ; l’orbiteur, lui, s’y amarre pour faire le plein.</p>
      ${v.stations.length ? v.stations.map(station).join('') : '<p class="doux">Aucune station.</p>'}
      <h3>🏠 Bases</h3>${v.bases.length ? `<ul class="sondes">${v.bases.map(base).join('')}</ul>` : '<p class="doux">Aucune base.</p>'}`;
    c.querySelectorAll('[data-fab]').forEach((b) => { b.onclick = () => { const [id, cle] = b.dataset.fab.split('|'); Orbiteur.fabriquer(id, cle); this.afficher(); }; });
    c.querySelectorAll('[data-extension]').forEach((b) => { b.onclick = () => { Orbiteur.envoyerExtension(Number(b.dataset.extension)); this.afficher(); }; });
    c.querySelectorAll('[data-robot-module]').forEach((b) => { b.onclick = () => { const st = v.stations.find((x) => x.id === b.dataset.robotModule); if (st) reparerParRobot(v, st, 'raccordement'); this.afficher(); }; });
  },

  onglet_rd(v, c) {
    c.innerHTML = htmlRDTerre(v);
    c.querySelectorAll('[data-rd-terre]').forEach((b) => { b.onclick = () => { rechercherTerre(v, b.dataset.rdTerre, (t) => this.log(t)); sauver(etat); this.afficher(); }; });
  },

  onglet_equipage(v, c) {
    c.innerHTML = `${v.equipe ? htmlEquipe(v, 'centre') : '<p class="doux">Pas d’équipe pour l’instant : elle se compose avant le premier lancement.</p>'}
      <div class="actions" style="justify-content:flex-start">${v.equipe ? '<button id="cmd-envoi" class="principal">🧑‍🚀 Envoyer des spationautes (recrues, transferts)</button>' : ''}<button id="cmd-registre">👥 Registre des équipages</button></div>`;
    const b = $('cmd-envoi');
    if (b) b.onclick = () => ouvrirEnvoiEquipage(v, (t) => this.log(t), () => this.afficher());
    $('cmd-registre').onclick = () => ouvrirRegistre();
  },

  onglet_lancements(v, c) {
    const sansExpedition = !v.fin && !v.orb && (!v.systeme || v.systeme === 'solaire');
    const lanceurs = Object.entries(LANCEURS).map(([k, l]) => `<li><b>${l.nom}</b> → ${l.destination} · ${fmtEuros(TARIFS.lanceurs[k].prix)} le lancement, hors chargement et assurance</li>`).join('');
    c.innerHTML = `<p>Tout part de la Terre. Le pas de tir lance une nouvelle expédition : l’orbiteur, son atterrisseur et l’équipage.</p>
      <ul class="sondes">${lanceurs}</ul>
      ${sansExpedition ? '<div class="actions" style="justify-content:flex-start"><button id="cmd-pas-de-tir" class="principal">👥 Composer l’équipage, puis le pas de tir</button></div>'
        : `<p class="encart">${v.orb ? `Une expédition est en cours (vaisseau ${nomVaisseau(v)}). Le pas de tir s’ouvrira après son retour sur Terre. D’ici là, les recrues partent avec « Envoyer des spationautes » (onglet Équipage).` : 'Pas de pas de tir ici : il n’existe que sur Terre.'}</p>`}`;
    if (stationsParModules() && !v.fin) {
      const liste = astresPourNoyau(v), enRoute = (v.cargos || []).filter((x) => x.noyau);
      c.insertAdjacentHTML('beforeend', `<h3>🛰 Noyaux de station</h3>
        <p>Une station naît d’un noyau lancé exprès (comme Zarya pour l’ISS ou Tianhe pour Tiangong), puis grandit d’un module par niveau. Autour de la Terre, Hercule le met en orbite ; ailleurs, il fait le vrai trajet.</p>
        <div class="actions" style="justify-content:flex-start"><select id="cmd-noyau-astre">${liste.map((a) => `<option value="${a.id}">${majuscule(le(a))}</option>`).join('')}</select>
        <button id="cmd-noyau" class="principal" ${liste.length ? '' : 'disabled'}>🚀 Lancer un noyau de station</button></div>
        ${enRoute.length ? `<ul class="sondes">${enRoute.map((x) => `<li>${x.nom} : ${x.tArrivee ? `en orbite dans ${fmtDuree(Math.max(0, x.tArrivee - v.t))}` : 'en route'}</li>`).join('')}</ul>` : ''}`);
      const bn = $('cmd-noyau');
      if (bn) bn.onclick = () => ouvrirLancementNoyau(v, $('cmd-noyau-astre').value, () => this.afficher());
    }
    const b = $('cmd-pas-de-tir');
    if (b) b.onclick = () => composerApresAccueil();
  },

  onglet_ressources(v, c) { ouvrirRessources(v, this.familleRessource || 'eau', false, c); },
  onglet_finances(v, c) { Finances.ouvrir(v, c); },
  onglet_bilan(v, c) { c.innerHTML = htmlBilan(v); },

  onglet_journal(v, c) {
    c.innerHTML = `${htmlTrouvailles()}${htmlJournal(v)}`;
    brancherTrouvailles(c);
    this.marquerLues = brancherJournal(c, v);
  },

  onglet_audela(v, c) {
    const grappes = (v.sondesInterstellaires || []).map((s) => {
      const d = DONNEES_ETOILES[s.systeme], recu = v.systemesSondes && v.systemesSondes[s.systeme];
      return `<li>🛰 Grappe vers ${le(d)}${s.tech ? ` (${PROPULSIONS_SONDES[s.tech].nom.toLowerCase()})` : ''} — ${recu ? '✅ données reçues' : `arrivée vers ${fmtAnnee(anneeDuJeu(s.arrivee))}, données vers ${fmtAnnee(anneeDuJeu(s.reception))}`}</li>`;
    }).join('');
    c.innerHTML = `<h3>Sondes vers d’autres étoiles</h3>${grappes ? `<ul class="sondes">${grappes}</ul>` : '<p class="doux">Aucune grappe envoyée.</p>'}
      <div class="actions" style="justify-content:flex-start"><button id="cmd-grappes" class="principal">🛰 Envoyer des grappes de sondes</button></div>
      ${SYSTEME.retour !== false ? `<h3>Avant de quitter le ${SYSTEME.nom}</h3>${htmlListeDepart(v)}
      <div class="actions" style="justify-content:flex-start"><button id="cmd-depart" class="principal">🌌 Quitter le ${SYSTEME.nom}</button></div>` : ''}`;
    const b = $('cmd-depart');
    if (b) b.onclick = () => Depart.ouvrir(v);
    $('cmd-grappes').onclick = () => ouvrirGrappes(v, { apres: () => this.afficher() });
  },
};
