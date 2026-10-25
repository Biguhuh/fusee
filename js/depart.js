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

const Depart = {
  contexte: null,      // { terminer(info) } fourni par main.js

  ouvrir(v) {
    const m = $('modale');
    const vOrb = vitesseSortieOrbiteur(v);
    const profils = [
      { id: 'voyager', nom: 'Assistances gravitationnelles, comme Voyager 1', vitesse: VITESSE_VOYAGER,
        detail: 'survol de Jupiter puis de Saturne pour prendre de la vitesse' },
      { id: 'orbiteur', nom: 'Poussée de l’orbiteur seule, avec tous ses ergols', vitesse: vOrb,
        detail: vOrb > 0 ? `${fmt(deltaVOrbiteur(v.carburant) / 1000, 1)} km/s de Δv brûlés d’ici, en profitant de la vitesse acquise` : 'pas assez de Δv pour sortir du système d’ici' },
    ];
    const meilleur = vOrb > VITESSE_VOYAGER ? 'orbiteur' : 'voyager';
    m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🌌 Quitter le ${SYSTEME.nom}</h2>
      <p>Partir vers une autre étoile. Les distances se comptent en années-lumière : un départ réaliste prend des dizaines de milliers d’années, et c’est la fin du jeu.</p></div><button class="fermer">✕</button></header>
      <div class="sections">
        <section><h3>Destination</h3>${ETOILES_PROCHES.map((e, i) => `<label class="choix-ravito"><input type="radio" name="dep-etoile" value="${e.id}" ${i === 0 ? 'checked' : ''}>
          <b>${e.nom}</b> — ${fmt(e.distanceAL, 2)} années-lumière<br><span class="doux">${e.type} · ${e.planetes}</span></label>`).join('')}</section>
        <section><h3>Type de départ</h3>
          <label class="choix-ravito"><input type="radio" name="dep-type" value="realiste" checked> <b>Réaliste</b> — la technologie d’aujourd’hui et celle de l’orbiteur. Fin du jeu.</label>
          <label class="choix-ravito"><input type="radio" name="dep-type" value="scifi" disabled> <b>Science-fiction</b> — fusion, voile laser… <span class="doux">(prochaine étape)</span></label>
          <h3>Propulsion</h3>${profils.map((p) => `<label class="choix-ravito"><input type="radio" name="dep-profil" value="${p.id}" ${p.id === meilleur ? 'checked' : ''} ${p.vitesse > 0 ? '' : 'disabled'}>
            <b>${p.nom}</b>${p.vitesse > 0 ? ` — ${fmt(p.vitesse, 1)} km/s` : ''}<br><span class="doux">${p.detail}</span></label>`).join('')}
        </section>
      </div>
      <div id="dep-resume" class="encart"></div>
      <div class="actions"><button id="dep-annuler">Annuler</button><button id="dep-partir" class="principal">🌌 Partir (fin du jeu)</button></div></div>`;
    m.classList.remove('cache');
    const lire = () => {
      const etoile = ETOILES_PROCHES.find((e) => e.id === m.querySelector('input[name=dep-etoile]:checked').value);
      const profil = profils.find((p) => p.id === m.querySelector('input[name=dep-profil]:checked').value);
      return { etoile, profil, est: estimationVoyage(etoile, profil.vitesse, v.t) };
    };
    const maj = () => {
      const { etoile, profil, est } = lire();
      $('dep-resume').innerHTML = `<p>Vers <b>${etoile.nom}</b> à ${fmt(profil.vitesse, 1)} km/s (${fmt((profil.vitesse / 299792.458) * 100, 4)} % de la vitesse de la lumière) :
        <b>${fmtDureeAnnees(est.ans)}</b> de voyage.</p>
        <p>Arrivée estimée : vers <b>${fmtAnnee(est.arriveeJeu)}</b> en temps de jeu (départ en ${anneeDuJeu(v.t)}), et vers <b>${fmtAnnee(est.arriveeVraie)}</b> dans la vraie vie si le temps s’écoulait normalement à partir d’aujourd’hui.</p>
        <p class="doux">Au temps accéléré maximal du jeu (×100 millions), il faudrait encore ${fmtDuree(est.auTempsMax)} de jeu pour arriver.</p>`;
    };
    m.querySelectorAll('input').forEach((i) => { i.onchange = maj; });
    maj();
    const fermer = () => Infos.fermer();
    m.querySelector('.fermer').onclick = fermer;
    $('dep-annuler').onclick = fermer;
    $('dep-partir').onclick = () => {
      const { etoile, profil, est } = lire();
      if (!confirm(`Partir pour ${etoile.nom} ? Le voyage dure ${fmtDureeAnnees(est.ans)} : c’est la fin de la partie.`)) return;
      fermer();
      this.contexte.terminer({
        etoile: etoile.id, nomEtoile: etoile.nom, distanceAL: etoile.distanceAL, profil: profil.id, nomProfil: profil.nom,
        vitesse: profil.vitesse, tDepart: v.t, anneeDepart: anneeDuJeu(v.t), ans: est.ans,
        arriveeJeu: est.arriveeJeu, arriveeVraie: est.arriveeVraie, dateVraieDepart: new Date().toISOString(),
      });
    };
  },
};
