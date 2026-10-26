'use strict';
// Départ vers une autre étoile.
// Départ réaliste : avec la technologie du jeu (l'orbiteur et ses ergols) ou avec des assistances
// gravitationnelles comme Voyager 1. La traversée dure des dizaines de milliers d'années : c'est la fin
// du jeu, qui donne la date d'arrivée estimée, en temps de jeu et dans la vraie vie.
// Départ science-fiction (propulsions avancées) : prochaine étape.

const ANNEE_LUMIERE_KM = 9.4607e12;
const ANNEE_S = 365.25 * 86400;

// Étoiles proches avec des planètes connues (ou très étudiées). Distances en années-lumière.
const ETOILES_PROCHES = [
  { id: 'proxima', nom: 'Proxima Centauri', distanceAL: 4.25, type: 'naine rouge (M5,5)', planetes: 'Proxima b, dans la zone habitable, et Proxima d' },
  { id: 'alphacen', nom: 'Alpha Centauri A et B', distanceAL: 4.37, type: 'deux étoiles proches du Soleil (G2 et K1)', planetes: 'aucune planète confirmée' },
  { id: 'barnard', nom: 'Étoile de Barnard', distanceAL: 5.96, type: 'naine rouge (M4)', planetes: '4 petites planètes rocheuses' },
  { id: 'lalande', nom: 'Lalande 21185', distanceAL: 8.31, type: 'naine rouge (M2)', planetes: '2 planètes' },
  { id: 'epseri', nom: 'Epsilon Eridani', distanceAL: 10.47, type: 'étoile orange jeune (K2)', planetes: 'une géante gazeuse, Epsilon Eridani b' },
  { id: 'tauceti', nom: 'Tau Ceti', distanceAL: 11.9, type: 'étoile jaune (G8)', planetes: '4 planètes candidates' },
  { id: 'trappist1', nom: 'TRAPPIST-1', distanceAL: 40.7, type: 'naine rouge ultra-froide (M8)', planetes: '7 planètes de la taille de la Terre' },
];

// Vitesse de croisière des assistances gravitationnelles (Jupiter puis Saturne), comme Voyager 1.
const VITESSE_VOYAGER = 17;   // km/s

// Vitesse (km/s) avec laquelle l'orbiteur quitte le système en brûlant tous ses ergols là où il est.
// On remonte la chaîne des astres : à chaque niveau, poussée (effet Oberth) ou vitesse acquise,
// moins la vitesse de libération ; ce qui reste s'ajoute à la vitesse orbitale de l'astre autour du suivant.
function vitesseSortieOrbiteur(v) {
  if (!v.orb) return 0;
  const dv = deltaVOrbiteur(v.carburant) / 1000;          // km/s
  let centre = ASTRES_PAR_ID[v.orb.centre];
  let s = V.norm(v.orb.v) + dv, r = V.norm(v.orb.r);
  for (;;) {
    const lib = Math.sqrt((2 * centre.gm) / r);
    if (s <= lib) return 0;                               // pas assez pour s'échapper de cet astre
    const vInf = Math.sqrt(s * s - lib * lib);
    if (!centre.orbite) return vInf;                      // échappé à l'étoile : vitesse de croisière
    const e = etatRelatif(centre, v.t);
    s = V.norm(e.v) + vInf;                               // départ dans le sens du mouvement de l'astre
    r = V.norm(e.r);
    centre = ASTRES_PAR_ID[centre.orbite.centre];
  }
}

// Année (calendrier) d'une date du jeu (s depuis J2000).
function anneeDuJeu(t) { return new Date(Date.UTC(2000, 0, 1, 12) + t * 1000).getUTCFullYear(); }
function fmtAnnee(a) { return `l’an ${Math.round(a).toLocaleString('fr-FR')}`; }
function fmtDureeAnnees(ans) {
  if (ans >= 100) return `${Math.round(ans).toLocaleString('fr-FR')} ans`;
  return fmtDuree(ans * ANNEE_S);
}

// Durée du voyage et dates d'arrivée. vitesse en km/s.
function estimationVoyage(etoile, vitesse, tJeu) {
  const duree = (etoile.distanceAL * ANNEE_LUMIERE_KM) / vitesse;           // s
  const ans = duree / ANNEE_S;
  const arriveeJeu = anneeDuJeu(tJeu) + ans;
  const maintenant = new Date();
  const arriveeVraie = maintenant.getFullYear() + (maintenant - new Date(maintenant.getFullYear(), 0, 1)) / (ANNEE_S * 1000) + ans;
  return { duree, ans, arriveeJeu, arriveeVraie, auTempsMax: duree / 1e8 };
}

// ---------- Liste avant de quitter le système ----------
// De quoi s'installer dans un autre système : on arrive par l'extérieur, sans ravitaillement possible.
// Le chargement se compte à la plus grande station (celle qui assemble le vaisseau) et à bord de l'orbiteur.
const CHARGEMENT_DEPART = [
  ['kitsBase', 3, 'kits de base'], ['kits', 2, 'kits de station'], ['atterrisseurs', 4, 'atterrisseurs'],
  ['lanceurRetour', 2, 'lanceurs de retour'], ['robots', 6, 'robots'], ['sondes', 6, 'sondes (une grappe)'],
  ['ergols', 200000, 'ergols'], ['materiaux', 300000, 'matériaux'],
];
function stationDeDepart(v) {
  return v.stations.slice().sort((a, b) => (b.niveau || 1) - (a.niveau || 1))[0] || null;
}
// sf : { sys, base } pour le départ science-fiction (sondes arrivées et planète de base choisie).
function verifierDepart(v, sf) {
  const st = stationDeDepart(v), k = st ? st.stock : {};
  const aBord = { kitsBase: v.kitsBase, kits: v.kits, atterrisseurs: v.atterrisseurs, robots: v.robots, sondes: v.sondes, ergols: v.ergolsAtt, lanceurRetour: 0, materiaux: 0 };
  const items = [];
  items.push({ nom: 'Station de niveau 5 (chantier interstellaire)', ok: !!st && (st.niveau || 1) >= 5, detail: st ? `${st.nom} : niveau ${st.niveau || 1}` : 'aucune station' });
  for (const [cle, besoin, nom] of CHARGEMENT_DEPART) {
    const a = (k[cle] || 0) + (aBord[cle] || 0);
    items.push({ nom: `${fmtStock(cle, besoin)} ${nom}`, ok: a >= besoin, detail: `${fmtStock(cle, a)}${st ? ` (à ${st.nom} et à bord)` : ' à bord'}` });
  }
  const vivants = v.equipe ? survivants(v).length : (v.equipagePerdu ? 0 : 1);
  items.push({ nom: `Équipe de ${TAILLE_EQUIPE} spationautes`, ok: vivants >= TAILLE_EQUIPE, detail: `${vivants} en vie` });
  const es = sf && sf.sys ? etatSondesSysteme(v, sf.sys) : null;
  items.push({ nom: 'Grappe de sondes arrivée dans le système visé, planète de base choisie', ok: !!(es && es.recu && sf.base),
    detail: !sf || !sf.sys ? 'choisissez un système' : !es ? 'aucune sonde envoyée' : es.enRoute ? `données attendues vers ${fmtAnnee(anneeDuJeu(es.reception))}` : sf.base ? 'données reçues, planète choisie' : 'données reçues : choisissez la planète de base' });
  return items;
}
function htmlListeDepart(v, sf) {
  const items = verifierDepart(v, sf);
  const n = items.filter((i) => i.ok).length;
  return `<p class="doux">${n} sur ${items.length} prêts. Obligatoire pour s’installer dans un autre système (départ science-fiction) ; un départ réaliste part avec ce qu’il a.</p><ul class="liste-depart">${
    items.map((i) => `<li class="${i.ok ? 'ok' : 'manque'}">${i.ok ? '✅' : '⬜'} <b>${i.nom}</b> <span class="doux">— ${i.detail}</span></li>`).join('')}</ul>`;
}

const Depart = {
  contexte: null,      // { terminer(info), partirSF(info), log(texte) } fourni par main.js
  choix: { etoile: 'proxima', type: 'realiste', tech: 'fusion', base: null },

  ouvrir(v) {
    const m = $('modale'), ch = this.choix;
    const vOrb = vitesseSortieOrbiteur(v);
    const profils = [
      { id: 'voyager', nom: 'Assistances gravitationnelles, comme Voyager 1', vitesse: VITESSE_VOYAGER,
        detail: 'survol de Jupiter puis de Saturne pour prendre de la vitesse' },
      { id: 'orbiteur', nom: 'Poussée de l’orbiteur seule, avec tous ses ergols', vitesse: vOrb,
        detail: vOrb > 0 ? `${fmt(deltaVOrbiteur(v.carburant) / 1000, 1)} km/s de Δv brûlés d’ici, en profitant de la vitesse acquise` : 'pas assez de Δv pour sortir du système d’ici' },
    ];
    const meilleur = vOrb > VITESSE_VOYAGER ? 'orbiteur' : 'voyager';
    m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>🌌 Quitter le ${SYSTEME.nom}</h2>
      <p>Partir vers une autre étoile. Départ réaliste : des dizaines de milliers d’années, c’est la fin du jeu. Départ science-fiction : une technologie avancée, une installation sur une planète de l’autre système, et la partie continue là-bas.</p></div><button class="fermer">✕</button></header>
      <div class="sections">
        <section><h3>Destination</h3>${ETOILES_PROCHES.map((e) => `<label class="choix-ravito"><input type="radio" name="dep-etoile" value="${e.id}" ${e.id === ch.etoile ? 'checked' : ''}>
          <b>${e.nom}</b> — ${fmt(e.distanceAL, 2)} années-lumière<br><span class="doux">${e.type} · ${e.planetes}</span></label>`).join('')}</section>
        <section><h3>Type de départ</h3>
          <label class="choix-ravito"><input type="radio" name="dep-type" value="realiste" ${ch.type === 'realiste' ? 'checked' : ''}> <b>Réaliste</b> — la technologie d’aujourd’hui et celle de l’orbiteur. Fin du jeu.</label>
          <label class="choix-ravito"><input type="radio" name="dep-type" value="scifi" ${ch.type === 'scifi' ? 'checked' : ''}> <b>Science-fiction</b> — fusion, voile laser, antimatière ou saut. On s’installe là-bas.</label>
          <div id="dep-real"><h3>Propulsion</h3>${profils.map((p) => `<label class="choix-ravito"><input type="radio" name="dep-profil" value="${p.id}" ${p.id === meilleur ? 'checked' : ''} ${p.vitesse > 0 ? '' : 'disabled'}>
            <b>${p.nom}</b>${p.vitesse > 0 ? ` — ${fmt(p.vitesse, 1)} km/s` : ''}<br><span class="doux">${p.detail}</span></label>`).join('')}</div>
        </section>
      </div>
      <div id="dep-resume" class="encart"></div>
      <div id="dep-sf"></div>
      <details class="encart" id="dep-liste-real"><summary><b>Avant de partir : liste de chargement</b></summary>${htmlListeDepart(v)}</details>
      <div class="actions"><button id="dep-annuler">Annuler</button><button id="dep-partir" class="principal">🌌 Partir</button></div></div>`;
    m.classList.remove('cache');
    const etoile = () => ETOILES_PROCHES.find((e) => e.id === ch.etoile);
    const majReel = () => {
      const p = profils.find((x) => x.id === m.querySelector('input[name=dep-profil]:checked').value);
      const est = estimationVoyage(etoile(), p.vitesse, v.t);
      $('dep-resume').innerHTML = `<p>Vers <b>${etoile().nom}</b> à ${fmt(p.vitesse, 1)} km/s (${fmt((p.vitesse / 299792.458) * 100, 4)} % de la vitesse de la lumière) :
        <b>${fmtDureeAnnees(est.ans)}</b> de voyage.</p>
        <p>Arrivée estimée : vers <b>${fmtAnnee(est.arriveeJeu)}</b> en temps de jeu (départ en ${anneeDuJeu(v.t)}), et vers <b>${fmtAnnee(est.arriveeVraie)}</b> dans la vraie vie si le temps s’écoulait normalement à partir d’aujourd’hui.</p>
        <p class="doux">Au temps accéléré maximal du jeu (×100 millions), il faudrait encore ${fmtDuree(est.auTempsMax)} de jeu pour arriver.</p>`;
      $('dep-partir').textContent = '🌌 Partir (fin du jeu)';
      $('dep-partir').disabled = false;
      return { p, est };
    };
    // Science-fiction : sondes vers le système, technologie (avec son vaisseau), planète de base, liste stricte.
    const majSF = () => {
      const sys = ch.etoile, es = etatSondesSysteme(v, sys), d = DONNEES_ETOILES[sys];
      const bases = planetesDeBase(v, sys);
      if (ch.base && !bases.some((b) => b.a.id === ch.base && b.site)) ch.base = null;
      const sondes = !es
        ? `<p>Aucune sonde n’a encore exploré ce système. Une grappe de ${SONDES_GRAPPE_INTERSTELLAIRE} sondes à voile laser (20 % de la vitesse de la lumière) arriverait vers ${fmtAnnee(anneeDuJeu(v.t) + d.distanceAL / VITESSE_SONDES_INTERSTELLAIRES)}, et ses données reviendraient à la vitesse de la lumière vers ${fmtAnnee(anneeDuJeu(v.t) + d.distanceAL / VITESSE_SONDES_INTERSTELLAIRES + d.distanceAL)}.</p>
           <button id="dep-sondes" ${sondesDisponibles(v) < SONDES_GRAPPE_INTERSTELLAIRE ? 'disabled' : ''}>🛰 Envoyer la grappe (${sondesDisponibles(v)} sondes disponibles)</button>`
        : es.enRoute ? `<p>🛰 Grappe en route : arrivée vers ${fmtAnnee(anneeDuJeu(es.arrivee))}, données reçues vers ${fmtAnnee(anneeDuJeu(es.reception))}. Accélérez le temps à l’orbiteur.</p>`
          : `<p>✅ Données reçues : les planètes sont cartographiées.</p>`;
      const techs = Object.entries(TECHNOLOGIES).map(([cle, T]) => {
        const du = dureeTechnologie(cle, d.distanceAL);
        return `<label class="choix-tech"><input type="radio" name="dep-tech" value="${cle}" ${cle === ch.tech ? 'checked' : ''}>
          <canvas class="img-tech" data-tech="${cle}" width="220" height="90"></canvas>
          <b>${T.nom}</b><span class="doux">${T.jours ? 'quelques semaines' : `${fmt(T.vitesse * 100)} % de c`} · ${fmtDureeAnnees(du.ans)} de voyage${du.gamma && du.gamma > 1.01 ? `, ${fmtDureeAnnees(du.ansBord)} à bord` : ''}</span>
          <span class="doux">${T.detail} <i>(${T.plausible})</i></span></label>`;
      }).join('');
      const listeBases = bases.length
        ? bases.map((b) => `<label class="choix-ravito"><input type="radio" name="dep-base" value="${b.a.id}" ${b.a.id === ch.base ? 'checked' : ''} ${b.site ? '' : 'disabled'}>
            <b>${b.a.nom}</b> <span class="doux">— ${b.a.tempSurface} °C, ${fmtG(b.a.g)}, ${fmtDose(doseSurface(b.a).svJour)}${b.connu ? (b.site ? ` · zone de base repérée${b.site.prod ? ` · ${b.site.ressource}` : ' · pas de ressource'}` : ' · aucune zone plate') : ' · inconnue (envoyez des sondes)'}</span></label>`).join('')
        : '<p>Aucune planète solide connue dans ce système : impossible de s’y installer pour l’instant.</p>';
      const T = TECHNOLOGIES[ch.tech], du = dureeTechnologie(ch.tech, d.distanceAL);
      const items = verifierDepart(v, { sys, base: ch.base });
      const pret = items.every((i) => i.ok);
      $('dep-sf').innerHTML = `<div class="sections"><section><h3>1. Sondes vers ${d.nom}</h3>${sondes}</section>
        <section><h3>2. Planète où s’installer</h3>${listeBases}</section></div>
        <section><h3>3. Propulsion</h3><div class="cartes-tech">${techs}</div></section>
        <section><h3>4. Liste avant de partir</h3>${htmlListeDepart(v, { sys, base: ch.base })}</section>`;
      $('dep-resume').innerHTML = `<p>Vers <b>${d.nom}</b> (${fmt(d.distanceAL, 2)} années-lumière) en <b>${T.nom.toLowerCase()}</b> : <b>${fmtDureeAnnees(du.ans)}</b> de voyage${du.ansBord < du.ans * 0.98 ? `, ${fmtDureeAnnees(du.ansBord)} vécus à bord` : ''}. Arrivée vers <b>${fmtAnnee(anneeDuJeu(v.t) + du.ans)}</b> en temps de jeu.</p>`;
      m.querySelectorAll('canvas.img-tech').forEach((cv) => { const c = cv.getContext('2d'); c.fillStyle = '#02030a'; c.fillRect(0, 0, cv.width, cv.height); dessinerVaisseauInterstellaire(c, cv.dataset.tech, 110, 45, 120, 1, 1); });
      m.querySelectorAll('input[name=dep-tech]').forEach((i) => { i.onchange = () => { ch.tech = i.value; majSF(); }; });
      m.querySelectorAll('input[name=dep-base]').forEach((i) => { i.onchange = () => { ch.base = i.value; majSF(); }; });
      const bs = $('dep-sondes');
      if (bs) bs.onclick = () => { envoyerSondesInterstellaires(v, sys, (t) => this.contexte.log(t)); majSF(); };
      $('dep-partir').textContent = pret ? `🚀 Partir vers ${d.nom}` : '🚀 Partir (liste incomplète)';
      $('dep-partir').disabled = !pret;
    };
    const maj = () => {
      ch.etoile = m.querySelector('input[name=dep-etoile]:checked').value;
      ch.type = m.querySelector('input[name=dep-type]:checked').value;
      const sf = ch.type === 'scifi';
      $('dep-real').style.display = sf ? 'none' : '';
      $('dep-liste-real').style.display = sf ? 'none' : '';
      $('dep-sf').style.display = sf ? '' : 'none';
      if (sf) majSF(); else majReel();
    };
    m.querySelectorAll('input[name=dep-etoile], input[name=dep-type], input[name=dep-profil]').forEach((i) => { i.onchange = maj; });
    maj();
    const fermer = () => Infos.fermer();
    m.querySelector('.fermer').onclick = fermer;
    $('dep-annuler').onclick = fermer;
    $('dep-partir').onclick = () => {
      const e = etoile();
      if (ch.type === 'scifi') {
        const d = DONNEES_ETOILES[ch.etoile], du = dureeTechnologie(ch.tech, d.distanceAL), base = SYSTEMES[ch.etoile].astres.find((a) => a.id === ch.base);
        if (!base || !confirm(`Partir pour ${d.nom} et s’installer sur ${base.nom} ? Le voyage dure ${fmtDureeAnnees(du.ans)}. Le ${SYSTEME.nom} reste derrière vous (aller simple).`)) return;
        fermer();
        this.contexte.partirSF({
          systeme: ch.etoile, nomSysteme: d.nom, distanceAL: d.distanceAL, tech: ch.tech, base: base.id, nomBase: base.nom,
          tDepart: v.t, anneeDepart: anneeDuJeu(v.t), ans: du.ans, ansBord: du.ansBord, tArrivee: v.t + du.ans * ANNEE_S,
        });
        return;
      }
      const { p, est } = majReel();
      if (!confirm(`Partir pour ${e.nom} ? Le voyage dure ${fmtDureeAnnees(est.ans)} : c’est la fin de la partie.`)) return;
      fermer();
      this.contexte.terminer({
        etoile: e.id, nomEtoile: e.nom, distanceAL: e.distanceAL, profil: p.id, nomProfil: p.nom,
        vitesse: p.vitesse, tDepart: v.t, anneeDepart: anneeDuJeu(v.t), ans: est.ans,
        arriveeJeu: est.arriveeJeu, arriveeVraie: est.arriveeVraie, dateVraieDepart: new Date().toISOString(),
      });
    };
  },
};
