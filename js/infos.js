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

  // Catégorie lisible, avec la planète pour les lunes : « Lune irrégulière de Jupiter ».
  typeAstre(a) {
    const c = CATEGORIES[a.categorie];
    return `${c.icone} ${c.nom}${a.parent ? ' de ' + ASTRES_PAR_ID[a.parent].nom : ''}`;
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
      ['Définition', CATEGORIES[a.categorie].def],
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
      (() => {
        const r = rotationDe(a);
        const duree = fmtDuree(Math.abs(r.heures) * 3600);
        if (r.synchrone) return ['Rotation', `synchrone : ${duree}, toujours la même face vers ${ASTRES_PAR_ID[a.parent].nom}`];
        return ['Rotation', `${duree}${r.heures < 0 ? ' (sens rétrograde)' : ''}${r.estimee ? ' (estimée)' : ''}`];
      })(),
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
        ['Demi-grand axe', fmt(o.a) + ' km' + (centre.type === 'etoile' ? ' (' + fmt(o.a / UA_KM, 3) + ' UA)' : '')],
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
    if (a.type === 'gazeuse') jeu.push(['Dose au-dessus des nuages', `${fmtDose(doseEspace(a).sv)} (estimée : ${doseEspace(a).note})`]);
    if (a.type === 'solide') {
      const d = doseSurface(a);
      jeu.push(['Dose en surface', `${fmtDose(d.svJour)} (${d.source === 'estimation' ? 'estimée' : d.source === 'mesure' ? 'mesurée' : 'valeur de référence'} : ${d.note})`]);
      jeu.push(['Robot conseillé', `blindage ${BLINDAGES_ROBOT[blindageConseille(a)].nom.toLowerCase()}`]);
    }
    jeu.push(['Début de descente', fmtAlt(a.depart.alt) + ', ' + fmtV(a.depart.vitesse) + ' ↓']);
    sections.push(['Données de jeu', lignes(jeu)]);

    // Ce qu'on trouve sur place : ressource exploitable par une base, et échantillons à ramasser ou à analyser.
    if (estOrigine(a.id)) {
      sections.push(['Ressources', lignes([['Sur place', `tout est disponible sur ${SYSTEME.origineSans} : pas de base ni d’extraction. En orbite, l’orbiteur fait le plein gratuitement, et les ravitos qui en partent sont illimités.`]])]);
    } else if (a.type === 'solide') {
      const [res, prod] = ressourceLocale(a);
      const sc = typeof etat !== 'undefined' && etat.science ? etat.science[a.id] : null;
      const rec = recordSaut(a.id);
      const l = [
        ['Ressource locale', prod ? `${res} → ${fmt(prod / 1000, 1)} t d’ergols par jour (base niveau 1)` : 'aucune ressource exploitable connue'],
        ['Mine (base niveau 2+)', productionMateriaux(a, 2) ? `matériaux : ${fmt(productionMateriaux(a, 2) / 1000, 1)} t par jour au niveau 2` : 'pas de mine'],
      ];
      if (sc && (sc.echantillons || sc.analyses)) l.push(['Science faite', `${sc.echantillons || 0} échantillons ramassés, ${sc.analyses || 0} analyses`]);
      if (rec) l.push(['Record de saut', `${rec.h < 10 ? fmt(rec.h, 2) + ' m' : fmtAlt(rec.h)} (${rec.par})`]);
      const types = typesEchantillons(a).map(([nom, texte]) => `<dt>${nom}</dt><dd>${texte}</dd>`).join('');
      sections.push(['Ressources et échantillons', lignes(l) + `<dt><b>Échantillons possibles</b></dt><dd></dd>${types}`]);
    }

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
    // Pendant la campagne : tableau de bord de l'astre (sur place, en orbite) en tête de la fiche.
    const tableau = this.contexte.tableau ? this.contexte.tableau(a) : null;
    const sections = [...(tableau ? tableau.sections : []), ...this.donnees(a)];
    const actions = this.contexte.actions(a);
    const pause = this.contexte.estEnPause();
    const m = $('modale');
    m.innerHTML = `
      <div class="fenetre">
        <header class="entete">
          <img class="globe-fiche" src="${imageAstre(a, 48)}" alt="">

          <div><h2>${a.nom}</h2><p><b class="categorie-fiche">${this.typeAstre(a)}</b> · ${CATEGORIES[a.categorie].def}</p>${a.note ? `<p>${a.note}</p>` : ''}</div>
          <button class="fermer" title="Fermer">✕</button>
        </header>
        <div class="barre">
          <button id="bouton-pause">${pause ? '▶ Reprendre le mouvement' : '⏸ Mettre en pause'}</button>
          <button id="bouton-encyclo">📖 Tous les astres</button>
          ${actions.map((x, i) => (x.desactive ? `<button disabled title="${x.desactive}">${x.texte}</button>` : `<button class="principal" data-action="${i}">${x.texte}</button>`)).join('')}
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
    if (tableau) tableau.brancher(m, () => this.ouvrirFiche(id));
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
          <span class="groupe-vue"><button data-mode-encyclo="systeme">Par système</button><button data-mode-encyclo="categorie">Par catégorie</button></span>
          <label><input type="checkbox" id="masque" ${this.contexte.masque() ? 'checked' : ''}> Seulement les lunes de plus de 100 km</label>
          <button id="bouton-pause">${pause ? '▶ Reprendre le mouvement' : '⏸ Mettre en pause'}</button>
        </div>
        <div class="filtres-cat" id="filtres-cat"></div>
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
    m.querySelectorAll('[data-mode-encyclo]').forEach((b) => {
      b.onclick = () => { this.modeEncyclo = b.dataset.modeEncyclo; this.remplirArbre(rech.value); };
    });
    this.remplirArbre(filtre);
    rech.focus();
  },

  modeEncyclo: 'systeme',
  catFiltre: new Set(),   // catégories cochées ; vide = toutes

  remplirArbre(filtre) {
    const f = filtre.trim().toLowerCase();
    const masque = this.contexte.masque();
    const cats = this.catFiltre;
    const correspond = (a) => (!masque || a.grosse) && (!f || a.nom.toLowerCase().includes(f) || (a.nomJpl || '').toLowerCase().includes(f));
    const visible = (a) => correspond(a) && (!cats.size || cats.has(a.categorie));
    const bouton = (a) => `<button class="lien-astre" data-id="${a.id}" title="${CATEGORIES[a.categorie].nom}"><span class="pastille" style="background:${a.couleurs.disque}"></span>${a.nom}<small>${fmt(a.rayonKm, a.rayonKm < 10 ? 1 : 0)} km</small></button>`;
    // Boutons de mode et filtres par catégorie (avec le nombre d'astres qui correspondent à la recherche).
    document.querySelectorAll('[data-mode-encyclo]').forEach((b) => b.classList.toggle('choisi', b.dataset.modeEncyclo === this.modeEncyclo));
    const zoneFiltres = $('filtres-cat');
    zoneFiltres.innerHTML = Object.entries(CATEGORIES).map(([k, c]) => {
      const n = ASTRES.filter((a) => a.categorie === k && correspond(a)).length;
      return `<button class="filtre-cat ${cats.has(k) ? 'choisi' : ''}" data-cat="${k}" ${n ? '' : 'disabled'}>${c.icone} ${c.nom} <small>${n}</small></button>`;
    }).join('') + (cats.size ? '<button class="filtre-cat" data-cat="">✕ Toutes</button>' : '');
    zoneFiltres.querySelectorAll('[data-cat]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.cat;
        if (!k) cats.clear(); else if (cats.has(k)) cats.delete(k); else cats.add(k);
        this.remplirArbre($('recherche').value);
      };
    });
    const groupes = [];
    if (this.modeEncyclo === 'categorie') {
      for (const [k, c] of Object.entries(CATEGORIES)) {
        const liste = ASTRES.filter((a) => a.categorie === k).sort((x, y) => y.rayonKm - x.rayonKm);
        groupes.push([`${c.icone} ${c.nom}`, liste, c.def]);
      }
    } else {
      groupes.push(['Étoile', [etoileRacine()]]);
      for (const pid of SYSTEME.principaux) {
        const p = ASTRES_PAR_ID[pid];
        const lunes = (ENFANTS[pid] || []).slice().sort((x, y) => y.rayonKm - x.rayonKm);
        groupes.push([p.nom + (lunes.length > 1 ? ` et ses ${lunes.length} lunes` : lunes.length ? ' et sa lune' : ''), [p, ...lunes]]);
      }
      groupes.push(['Ceinture d’astéroïdes', ASTRES.filter((a) => a.asteroide)]);
    }
    const html = groupes.map(([titre, liste, def]) => {
      const l = liste.filter(visible);
      if (!l.length) return '';
      return `<section><h3>${titre} <small class="doux">${l.length}</small></h3>${def ? `<p class="doux">${def}</p>` : ''}<div class="liste-lunes">${l.map(bouton).join('')}</div></section>`;
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
