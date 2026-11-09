'use strict';
// ---------- Recherche et développement ----------
// Au fil du voyage, l'atelier d'une station met au point des améliorations (trois niveaux chacune), avec des matériaux
// et du temps. Une fois au point, elles s'appliquent à toute l'expédition : vaisseau, astromobile, robot, drone.

const AMELIORATIONS = {
  coqueThermique: { groupe: '🚀 Vaisseau', nom: 'Bouclier thermique renforcé', effet: (n) => `atterrisseurs : +${25 * n} % de température supportée` },
  blindageBord: { groupe: '🚀 Vaisseau', nom: 'Blindage anti-rayonnement', effet: (n) => `rayonnement à bord des atterrisseurs divisé par ${1 + n}` },
  habitat: { groupe: '🚀 Vaisseau', nom: 'Module d’habitation', effet: (n) => `+${2 * n} places pour l’équipe, et une 3ᵉ place dans le module de descente` },
  reservoirs: { groupe: '🚀 Vaisseau', nom: 'Réservoirs agrandis', effet: (n) => `+${25 * n} % de carburant, d’ergols et d’eau (autonomie)` },
  soutes: { groupe: '🚀 Vaisseau', nom: 'Soutes agrandies', effet: (n) => `+${2 * n} sondes, +${n} robot, drone, atterrisseur et kit de station, +${25 * n} % de vivres` },
  // Serre de bord, comme Veggie sur l'ISS : une part des vivres (laitue, tomates, piments), un peu plus d'eau consommée.
  serre: { groupe: '🌱 Vivres', nom: 'Serre de bord', effet: (n) => `${10 * n} % des vivres produits à bord, +${fmt(0.1 * n, 1)} kg d’eau par personne et par jour` },
  // Écosystème fermé (comme MELiSSA, ou Lunar Palace 1) : plantes, algues et bactéries recyclent tout. Indispensable
  // pour quitter le Système solaire : plus aucun ravitaillement possible.
  ecosysteme: { groupe: '🌱 Vivres', nom: 'Écosystème fermé', max: 1, requis: { serre: 3 }, couts: [null, { materiaux: 60000, jours: 60 }],
    effet: () => '100 % des vivres et de l’eau produits et recyclés à bord : l’équipage est autonome, condition pour quitter le Système solaire' },
  // Recyclage de l'eau et de l'air : l'ISS récupère déjà 98 % de l'eau ; le réacteur de Sabatier refait de l'eau avec le
  // CO₂ expiré, et l'électrolyse en tire l'oxygène. Moins d'eau à apporter (les vivres, eux, viennent toujours d'ailleurs).
  recyclage: { groupe: '🌱 Vivres', nom: 'Recyclage de l’eau et de l’air', effet: (n) => `${25 * n} % d’eau en moins à apporter (eau et oxygène recyclés à bord)` },
  // Torpeur : un état proche de l'hibernation, étudié chez l'animal ; aucun humain ne l'a encore vécu. Science-fiction.
  torpeur: { groupe: '🌱 Vivres', nom: 'Torpeur (science-fiction)', max: 1, requis: { recyclage: 2 }, couts: [null, { materiaux: 80000, jours: 90 }],
    effet: () => `science-fiction : pendant les trajets entre les planètes, l’équipage dort et consomme ${FACTEUR_TORPEUR_TEXTE} moins de vivres et d’eau` },
  // Scaphandre lourd (Titan) : voir SCAPHANDRE_LOURD dans exploration.js.
  scaphandre: { groupe: '🧑‍🚀 Spationaute', nom: 'Scaphandre lourd (Titan)', max: 1, couts: [null, { materiaux: 15000, jours: 20 }],
    effet: () => 'scaphandre chauffé, à la pression ambiante, avec recycleur d’oxygène : sortir jusqu’à 5 bar (Titan), mais 20 % plus lent et 25 % d’autonomie en moins' },
  batterieRover: { groupe: '🚙 Astromobile', nom: 'Batteries de l’astromobile', effet: (n) => `+${50 * n} % d’autonomie` },
  caisseRover: { groupe: '🚙 Astromobile', nom: 'Caisse à échantillons', effet: (n) => `+${10 * n} échantillons` },
  moteurRover: { groupe: '🚙 Astromobile', nom: 'Moteur de l’astromobile', effet: (n) => `+${25 * n} % d’accélération et de vitesse débridée` },
  robotDurci: { groupe: '🤖 Robot', nom: 'Robot durci', effet: (n) => `+${100 * n} °C supportés, pression ×${2 ** n}` },
  batterieRobot: { groupe: '🤖 Robot', nom: 'Batterie du robot', effet: (n) => `+${50 * n} % d’autonomie` },
  batterieDrone: { groupe: '🚁 Drone', nom: 'Batterie du drone', effet: (n) => `+${50 * n} % de temps de vol` },
};
const NIVEAU_MAX_AMELIO = 3;
const COUT_AMELIO = [null, { materiaux: 6000, jours: 5 }, { materiaux: 12000, jours: 10 }, { materiaux: 20000, jours: 20 }];
function maxAmelio(cle) { return AMELIORATIONS[cle].max || NIVEAU_MAX_AMELIO; }
function coutAmelio(cle, n) { return (AMELIORATIONS[cle].couts || COUT_AMELIO)[n]; }
// Ce qu'il faut avoir mis au point avant ('' si rien ne manque).
function prerequisManquant(cle, v) {
  const r = AMELIORATIONS[cle].requis || {};
  const manque = Object.entries(r).filter(([k, n]) => niveauAmelio(k, v) < n).map(([k, n]) => `${AMELIORATIONS[k].nom} ${n}`);
  return manque.length ? `il faut d’abord : ${manque.join(', ')}` : '';
}

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

// Mise au point en cours : dans les laboratoires sur Terre, ou (anciennes parties) dans l'atelier d'une station.
function rdEnCours(v, cle) {
  for (const c of v.rdTerre || []) if (c.cle === cle) return { c };
  for (const st of v.stations || []) for (const c of st.chantiers || []) if (c.cle.startsWith('rd:' + cle + ':')) return { st, c };
  return null;
}

// ---------- R&D sur Terre ----------
// Décidée au centre de commande, menée dans les laboratoires sur Terre : elle coûte des euros et du temps, pas de
// matériaux. Une fois au point, l'amélioration vaut pour toute l'expédition (comme avant).
function rechercherTerre(v, cle, log) {
  const a = AMELIORATIONS[cle];
  if (!a) return;
  const n = niveauAmelio(cle, v), pre = prerequisManquant(cle, v);
  if (pre) return log(`${a.nom} : ${pre}.`);
  if (n >= maxAmelio(cle)) return log(`${a.nom} : déjà au niveau maximal.`);
  if (rdEnCours(v, cle)) return log(`${a.nom} : déjà en cours de mise au point.`);
  const jours = coutAmelio(cle, n + 1).jours;
  (v.rdTerre = v.rdTerre || []).push({ cle, niveau: n + 1, fin: v.t + jours * JOUR });
  depenser(v, 'rd', `R&D : ${a.nom}, niveau ${n + 1}`, coutRD(cle, n + 1));
  log(`🔬 Laboratoires sur Terre : mise au point « ${a.nom} », niveau ${n + 1} (${a.effet(n + 1)}). Prête le ${fmtDate(v.t + jours * JOUR)}.`);
}
// Mises au point terminées (appelé quand le temps avance).
function terminerRDTerre(v, log) {
  for (const c of (v.rdTerre || []).filter((x) => v.t >= x.fin)) {
    v.ameliorations = v.ameliorations || {};
    v.ameliorations[c.cle] = Math.max(v.ameliorations[c.cle] || 0, c.niveau);
    log(`🔬 Laboratoires sur Terre : ${AMELIORATIONS[c.cle].nom.toLowerCase()} au point (niveau ${c.niveau}) : ${AMELIORATIONS[c.cle].effet(c.niveau)}.`);
  }
  if (v.rdTerre) v.rdTerre = v.rdTerre.filter((x) => v.t < x.fin);
}
// Onglet R&D du centre de commande.
function htmlRDTerre(v) {
  let d = '<p>Les laboratoires sur Terre mettent au point les améliorations ; elles valent ensuite pour toute l’expédition (vaisseau, atterrisseurs, astromobile, robot, drone). Une seule à la fois par amélioration ; plusieurs améliorations peuvent avancer ensemble. Le temps avance avec celui de l’orbiteur.</p>';
  const enCours = Object.keys(AMELIORATIONS).map((cle) => [cle, rdEnCours(v, cle)]).filter(([, e]) => e);
  if (enCours.length) d += `<p class="encart">⏳ En cours : ${enCours.map(([cle, e]) => `${AMELIORATIONS[cle].nom}${e.c.niveau ? ` ${e.c.niveau}` : ''}, prête le ${fmtDate(e.c.fin, false)}`).join(' · ')}</p>`;
  let groupe = '';
  for (const [cle, a] of Object.entries(AMELIORATIONS)) {
    if (a.groupe !== groupe) { d += `${groupe ? '</div>' : ''}<h3>${a.groupe}</h3><div class="orientations">`; groupe = a.groupe; }
    const n = niveauAmelio(cle, v), e = rdEnCours(v, cle);
    if (n >= maxAmelio(cle)) { d += `<button disabled title="${a.effet(n)}">✓ ${a.nom}${maxAmelio(cle) > 1 ? ' (niveau max)' : ''}<br><small class="doux">${a.effet(n)}</small></button>`; continue; }
    const pre = prerequisManquant(cle, v);
    if (pre) { d += `<button disabled title="${a.effet(n + 1)}">🔒 ${a.nom}<br><small class="doux">${pre}</small></button>`; continue; }
    if (e) { d += `<button disabled title="${a.effet(n + 1)}">⏳ ${a.nom} ${n + 1} · encore ${fmtDuree(e.c.fin - v.t)}</button>`; continue; }
    const jours = coutAmelio(cle, n + 1).jours;
    d += `<button data-rd-terre="${cle}" title="Niveau ${n + 1} : ${a.effet(n + 1)}${n ? ` (actuel : ${a.effet(n)})` : ''}">${a.nom}${maxAmelio(cle) > 1 ? ` ${n + 1}` : ''} · ${fmtEuros(coutRD(cle, n + 1))} · ${fmtDuree(jours * JOUR)}<br><small class="doux">${a.effet(n + 1)}</small></button>`;
  }
  return d + '</div>';
}

