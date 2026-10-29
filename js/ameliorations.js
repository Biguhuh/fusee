'use strict';
// ---------- Recherche et développement ----------
// Au fil du voyage, l'atelier d'une station met au point des améliorations (trois niveaux chacune), avec des matériaux
// et du temps. Une fois au point, elles s'appliquent à toute l'expédition : vaisseau, astromobile, robot, drone.

const AMELIORATIONS = {
  coqueThermique: { groupe: '🚀 Vaisseau', nom: 'Bouclier thermique renforcé', effet: (n) => `atterrisseurs : +${25 * n} % de température supportée` },
  blindageBord: { groupe: '🚀 Vaisseau', nom: 'Blindage anti-rayonnement', effet: (n) => `rayonnement à bord des atterrisseurs divisé par ${1 + n}` },
  habitat: { groupe: '🚀 Vaisseau', nom: 'Module d’habitation', effet: (n) => `+${2 * n} places pour l’équipe` },
  reservoirs: { groupe: '🚀 Vaisseau', nom: 'Réservoirs agrandis', effet: (n) => `+${25 * n} % de carburant et d’ergols (autonomie)` },
  soutes: { groupe: '🚀 Vaisseau', nom: 'Soutes agrandies', effet: (n) => `+${2 * n} sondes, +${n} robot, drone, atterrisseur et kit de station` },
  batterieRover: { groupe: '🚙 Astromobile', nom: 'Batteries de l’astromobile', effet: (n) => `+${50 * n} % d’autonomie` },
  caisseRover: { groupe: '🚙 Astromobile', nom: 'Caisse à échantillons', effet: (n) => `+${10 * n} échantillons` },
  moteurRover: { groupe: '🚙 Astromobile', nom: 'Moteur de l’astromobile', effet: (n) => `+${25 * n} % d’accélération et de vitesse débridée` },
  robotDurci: { groupe: '🤖 Robot', nom: 'Robot durci', effet: (n) => `+${100 * n} °C supportés, pression ×${2 ** n}` },
  batterieRobot: { groupe: '🤖 Robot', nom: 'Batterie du robot', effet: (n) => `+${50 * n} % d’autonomie` },
  batterieDrone: { groupe: '🚁 Drone', nom: 'Batterie du drone', effet: (n) => `+${50 * n} % de temps de vol` },
};
const NIVEAU_MAX_AMELIO = 3;
const COUT_AMELIO = [null, { materiaux: 6000, jours: 5 }, { materiaux: 12000, jours: 10 }, { materiaux: 20000, jours: 20 }];

// Niveau atteint (0 : rien). v : la campagne ; par défaut celle en cours (0 en visite rapide).
function niveauAmelio(cle, v) {
  if (v === undefined) v = typeof etat !== 'undefined' && etat.enVoyage ? etat.voyage : null;
  return (v && v.ameliorations && v.ameliorations[cle]) || 0;
}

// Capacités de l'orbiteur, avec les réservoirs et les soutes agrandis.
function capOrbiteur(v, cle) {
  const base = ORBITEUR[cle];
  if (cle === 'carburantMax' || cle === 'ergolsAtt') return base * (1 + 0.25 * niveauAmelio('reservoirs', v));
  const n = niveauAmelio('soutes', v);
  return base + (cle === 'sondes' ? 2 * n : n);
}

// Atterrisseur de la campagne : bouclier thermique et blindage.
function ameliorerAtterrisseur(vol) {
  const nT = niveauAmelio('coqueThermique'), nB = niveauAmelio('blindageBord');
  if (!nT && !nB) return;
  vol.f = { ...vol.f, tempMax: vol.f.tempMax * (1 + 0.25 * nT), protection: (vol.f.protection || 1) * (1 + nB) };
}

function nomChantier(cle) {
  if (cle.startsWith('rd:')) { const [, k, n] = cle.split(':'); return `R&D : ${AMELIORATIONS[k].nom}, niveau ${n}`; }
  return RECETTES[cle].nom;
}

// Chantier de R&D en cours, dans n'importe quelle station.
function rdEnCours(v, cle) {
  for (const st of v.stations || []) for (const c of st.chantiers || []) if (c.cle.startsWith('rd:' + cle + ':')) return { st, c };
  return null;
}

// Panneau de la station : ce qu'on peut mettre au point.
function htmlRD(v, st) {
  const k = st.stock;
  let d = '<p class="doux"><b>🔬 Recherche et développement</b> : mises au point pour toute l’expédition (une à la fois par amélioration).</p>';
  let groupe = '';
  for (const [cle, a] of Object.entries(AMELIORATIONS)) {
    if (a.groupe !== groupe) { d += `${groupe ? '</div>' : ''}<p class="doux" style="margin-bottom:2px">${a.groupe}</p><div class="orientations">`; groupe = a.groupe; }
    const n = niveauAmelio(cle, v), enCours = rdEnCours(v, cle);
    if (n >= NIVEAU_MAX_AMELIO) { d += `<button disabled title="${a.effet(n)}">✓ ${a.nom} (niveau max)</button>`; continue; }
    if (enCours) { d += `<button disabled title="${a.effet(n + 1)}">⏳ ${a.nom} ${n + 1} · ${fmtDuree(enCours.c.fin - v.t)}</button>`; continue; }
    const c = COUT_AMELIO[n + 1];
    const titre = `Niveau ${n + 1} : ${a.effet(n + 1)}${n ? ` (actuel : ${a.effet(n)})` : ''}`;
    d += `<button data-rd="${cle}" title="${titre}" ${k.materiaux < c.materiaux ? 'disabled' : ''}>${a.nom} ${n + 1} · ${fmtStock('materiaux', c.materiaux)} · ${fmtDuree(c.jours * JOUR / niveauStation(st).vitesse)}<br><small class="doux">${a.effet(n + 1)}</small></button>`;
  }
  d += '</div>';
  const acquis = Object.entries(AMELIORATIONS).filter(([cle]) => niveauAmelio(cle, v)).map(([cle, a]) => `${a.nom} ${niveauAmelio(cle, v)} (${a.effet(niveauAmelio(cle, v))})`);
  if (acquis.length) d += `<p class="doux">Déjà au point : ${acquis.join(' · ')}.</p>`;
  return d;
}
