'use strict';
// Infobulle au survol, fiche complète d'un astre, encyclopédie de tous les astres.

const Infos = {
  // Branché par main.js : état du jeu, pause, actions possibles.
  contexte: {
    estEnPause: () => false,
    basculerPause: () => {},
    actions: () => [],          // (astre) → [{ texte, action }]
    masque: () => false,        // true : seulement les grosses lunes
    basculerMasque: () => {},
  },

  typeAstre(a) {
    if (a.type === 'etoile') return 'Étoile';
    if (a.naine) return 'Planète naine';
    if (a.asteroide) return 'Astéroïde';
    if (!a.parent) return a.type === 'gazeuse' ? 'Planète géante' : 'Planète';
    return 'Lune de ' + ASTRES_PAR_ID[a.parent].nom;
  },

  // ---------- Infobulle ----------
  infobulle(x, y, id) {
    const el = $('infobulle');
    if (!id) { el.classList.add('cache'); return; }
    const a = ASTRES_PAR_ID[id];
    el.innerHTML = `<b>${a.nom}</b><span>${this.typeAstre(a)}</span><span>Rayon ${fmt(a.rayonKm, a.rayonKm < 10 ? 1 : 0)} km · g ${fmtG(a.g)}</span><span class="doux">Clic : toutes les données</span>`;
    el.classList.remove('cache');
    const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = Math.min(innerWidth - w - 8, x + 16) + 'px';
    el.style.top = Math.min(innerHeight - h - 8, y + 16) + 'px';
  },

  // ---------- Fiche complète ----------
  donnees(a) {
    const sections = [];
    const R = a.rayonKm;
    const masse = (a.gm * 1e9) / 6.674e-11;
    const lignes = (l) => l.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    const orbiteurAlt = altitudeOrbite(a);

    sections.push(['Identité', lignes([
      ['Nom', a.nom],
      ['Catégorie', this.typeAstre(a)],
      a.nomJpl && a.nomJpl !== a.nom ? ['Nom international', a.nomJpl.replace(/_/g, ' ')] : null,
      a.codeJpl ? ['Code NASA/JPL', a.codeJpl] : null,
      a.numero ? ['Numéro d’astéroïde', a.numero] : null,
      ['Surface', a.surface || '—'],
    ])]);

    sections.push(['Caractéristiques physiques', lignes([
      ['Rayon moyen', fmt(R, R < 10 ? 2 : R < 100 ? 1 : 0) + ' km' + (a.rayonEstime ? ' (estimé)' : '')],
      ['Diamètre', fmt(2 * R, R < 10 ? 1 : 0) + ' km'],
      ['Masse', masse.toExponential(3).replace('.', ',') + ' kg'],
      ['GM', fmtNombre(a.gm, a.gm < 1 ? 6 : 2) + ' km³/s²'],
      a.densite ? ['Densité moyenne', fmt(a.densite, 2) + ' g/cm³'] : null,
      ['Gravité de surface', fmtG(a.g)],
      a.type !== 'etoile' ? ['Vitesse de libération (surface)', fmtV(vitesseLiberation(a, 0))] : null,
      a.type !== 'etoile' ? ['Vitesse orbitale (orbite basse)', fmtV(vitesseOrbitale(a, orbiteurAlt))] : null,
      ['Température', fmt(a.tempSurface) + ' °C' + (a.type === 'gazeuse' ? ' (niveau 1 bar)' : '')],
      a.albedo ? ['Albédo', fmt(a.albedo, 3)] : null,
      a.rotationH ? ['Rotation', fmtDuree(a.rotationH * 3600)] : null,
    ])]);

    if (a.atm) {
      sections.push(['Atmosphère', lignes([
        ['Pression ' + (a.type === 'solide' ? 'au sol' : 'de référence'), fmtP(a.atm.p0)],
        ['Densité', (a.atm.rho0 < 0.01 ? a.atm.rho0.toExponential(1).replace('.', ',') : fmt(a.atm.rho0, 3)) + ' kg/m³'],
        ['Hauteur d’échelle', fmt(a.atm.H, 1) + ' km'],
        ['Température en altitude', fmt(a.atm.tHaut) + ' °C'],
        a.type === 'gazeuse' ? ['Pression visée en plongée', fmt(a.cible, 1) + ' bar'] : null,
      ])]);
    } else if (a.type !== 'etoile') {
      sections.push(['Atmosphère', '<dt>Atmosphère</dt><dd>aucune</dd>']);
    }

    if (a.orbite) {
      const o = a.orbite;
      const centre = ASTRES_PAR_ID[o.centre];
      const periode = (360 / o.n) * JOUR;
      sections.push(['Orbite', lignes([
        ['Tourne autour de', centre.nom],
        ['Demi-grand axe', fmt(o.a) + ' km' + (o.centre === 'soleil' ? ' (' + fmt(o.a / UA_KM, 3) + ' UA)' : '')],
        ['Excentricité', fmt(o.e, 4)],
        a.inclinaison !== undefined ? ['Inclinaison', fmt(a.inclinaison, 1) + '°'] : null,
        ['Sens', o.retro ? 'rétrograde' : 'direct'],
        ['Période', fmtDuree(periode)],
        ['Distance mini / maxi', fmt(o.a * (1 - o.e)) + ' / ' + fmt(o.a * (1 + o.e)) + ' km'],
        ['Sphère d’influence', fmt(a.soiReelle || a.soi) + ' km'],
      ])]);
    }

    const jeu = [];
    if (a.type === 'solide') {
      jeu.push(['Vitesse d’atterrissage max', a.vMax + ' m/s']);
      jeu.push(['Altitude d’orbite basse', fmtAlt(orbiteurAlt)]);
      if (a.relief) jeu.push(['Relief', `collines de ${fmt(a.relief.amplitude)} m, ${a.relief.crateres > 0.5 ? 'nombreux cratères' : a.relief.crateres > 0 ? 'quelques cratères' : 'sans cratères'}`]);
    }
    if (a.type !== 'etoile') jeu.push(['Rayonnement (1 = Terre)', fmt(conditions(a, 0).rad, 1)]);
    jeu.push(['Début de descente', fmtAlt(a.depart.alt) + ', ' + fmtV(a.depart.vitesse) + ' ↓']);
    sections.push(['Données de jeu', lignes(jeu)]);

    const enfants = (ENFANTS[a.id] || []).filter((c) => !this.contexte.masque() || c.grosse);
    if (enfants.length) {
      sections.push([`Satellites (${(ENFANTS[a.id] || []).length})`,
        '<div class="liste-lunes">' + enfants.sort((x, y) => y.rayonKm - x.rayonKm)
          .map((c) => `<button class="lien-astre" data-id="${c.id}">${c.nom}</button>`).join('') + '</div>']);
    }
    return sections;
  },

  ouvrirFiche(id) {
    const a = ASTRES_PAR_ID[id];
    const sections = this.donnees(a);
    const actions = this.contexte.actions(a);
    const pause = this.contexte.estEnPause();
    const m = $('modale');
    m.innerHTML = `
      <div class="fenetre">
        <header class="entete">
          <span class="disque-fiche" style="background:${a.couleurs.disque}"></span>
          <div><h2>${a.nom}</h2><p>${this.typeAstre(a)}${a.note ? ' — ' + a.note : ''}</p></div>
          <button class="fermer" title="Fermer">✕</button>
        </header>
        <div class="barre">
          <button id="bouton-pause">${pause ? '▶ Reprendre le mouvement' : '⏸ Mettre en pause'}</button>
          <button id="bouton-encyclo">📖 Tous les astres</button>
          ${actions.map((x, i) => `<button class="principal" data-action="${i}">${x.texte}</button>`).join('')}
        </div>
        <div class="sections">${sections.map(([t, c]) => `<section><h3>${t}</h3><dl>${c}</dl></section>`).join('')}</div>
      </div>`;
    m.classList.remove('cache');
    m.querySelector('.fermer').onclick = () => this.fermer();
    m.querySelector('#bouton-pause').onclick = (e) => {
      this.contexte.basculerPause();
      e.target.textContent = this.contexte.estEnPause() ? '▶ Reprendre le mouvement' : '⏸ Mettre en pause';
    };
    m.querySelector('#bouton-encyclo').onclick = () => this.ouvrirEncyclopedie();
    m.querySelectorAll('[data-action]').forEach((b) => { b.onclick = () => { this.fermer(); actions[+b.dataset.action].action(); }; });
    m.querySelectorAll('.lien-astre').forEach((b) => { b.onclick = () => this.ouvrirFiche(b.dataset.id); });
  },

  // ---------- Encyclopédie ----------
  ouvrirEncyclopedie(filtre = '') {
    const m = $('modale');
    const pause = this.contexte.estEnPause();
    m.innerHTML = `
      <div class="fenetre">
        <header class="entete">
          <div><h2>Tous les astres du jeu</h2><p>${ASTRES.length} astres : le Soleil, 8 planètes, ${ASTRES.filter((a) => a.naine).length} planètes naines, ${ASTRES.filter((a) => a.asteroide).length} astéroïdes, ${ASTRES.filter((a) => a.parent).length} lunes (données NASA/JPL).</p></div>
          <button class="fermer" title="Fermer">✕</button>
        </header>
        <div class="barre">
          <input id="recherche" type="search" placeholder="Rechercher un astre…" value="${filtre}">
          <label><input type="checkbox" id="masque" ${this.contexte.masque() ? 'checked' : ''}> Seulement les lunes de plus de 100 km</label>
          <button id="bouton-pause">${pause ? '▶ Reprendre le mouvement' : '⏸ Mettre en pause'}</button>
        </div>
        <div id="arbre" class="arbre"></div>
      </div>`;
    m.classList.remove('cache');
    m.querySelector('.fermer').onclick = () => this.fermer();
    m.querySelector('#bouton-pause').onclick = (e) => {
      this.contexte.basculerPause();
      e.target.textContent = this.contexte.estEnPause() ? '▶ Reprendre le mouvement' : '⏸ Mettre en pause';
    };
    const rech = m.querySelector('#recherche');
    m.querySelector('#masque').onchange = () => { this.contexte.basculerMasque(); this.remplirArbre(rech.value); };
    rech.oninput = () => this.remplirArbre(rech.value);
    this.remplirArbre(filtre);
    rech.focus();
  },

  remplirArbre(filtre) {
    const f = filtre.trim().toLowerCase();
    const masque = this.contexte.masque();
    const visible = (a) => (!masque || a.grosse) && (!f || a.nom.toLowerCase().includes(f) || (a.nomJpl || '').toLowerCase().includes(f));
    const bouton = (a) => `<button class="lien-astre" data-id="${a.id}"><span class="pastille" style="background:${a.couleurs.disque}"></span>${a.nom}<small>${fmt(a.rayonKm, a.rayonKm < 10 ? 1 : 0)} km</small></button>`;
    const groupes = [];
    groupes.push(['Étoile', [ASTRES_PAR_ID.soleil]]);
    for (const pid of ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune', 'pluton']) {
      const p = ASTRES_PAR_ID[pid];
      const lunes = (ENFANTS[pid] || []).slice().sort((x, y) => y.rayonKm - x.rayonKm);
      groupes.push([p.nom + (lunes.length > 1 ? ` et ses ${lunes.length} lunes` : lunes.length ? ' et sa lune' : ''), [p, ...lunes]]);
    }
    groupes.push(['Ceinture d’astéroïdes', ASTRES.filter((a) => a.asteroide)]);
    const html = groupes.map(([titre, liste]) => {
      const l = liste.filter(visible);
      if (!l.length) return '';
      return `<section><h3>${titre}</h3><div class="liste-lunes">${l.map(bouton).join('')}</div></section>`;
    }).join('');
    const arbre = $('arbre');
    arbre.innerHTML = html || '<p class="doux">Aucun astre ne correspond.</p>';
    arbre.querySelectorAll('.lien-astre').forEach((b) => { b.onclick = () => this.ouvrirFiche(b.dataset.id); });
  },

  fermer() {
    $('modale').classList.add('cache');
    if (this.contexte.surFermeture) this.contexte.surFermeture();
  },

  estOuverte() { return !$('modale').classList.contains('cache'); },
};
