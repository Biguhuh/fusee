'use strict';
// Vraies missions, observées à leur vraie date. Une campagne qui commence dans le passé (date-depart.js) voit
// l'histoire se dérouler : une trace réelle n'apparaît au sol qu'après son atterrissage, et chaque événement
// arrive au journal quand la date du jeu le dépasse. L'ISS et la voiture rouge n'existent qu'après leur lancement.

// Dates d'atterrissage (ou d'impact) des traces réelles (decouvertes.js, TRACES_REELLES).
const DATES_TRACES = {
  luna9: '1966-02-03', apollo11: '1969-07-20', apollo12: '1969-11-19', lunokhod1: '1970-11-17', apollo14: '1971-02-05',
  apollo15: '1971-07-30', apollo16: '1972-04-21', apollo17: '1972-12-11', lunokhod2: '1973-01-15', change3: '2013-12-14',
  change4: '2019-01-03', change5: '2020-12-01', chandrayaan3: '2023-08-23', slim: '2024-01-19', change6: '2024-06-01',
  mars3: '1971-12-02', viking1: '1976-07-20', viking2: '1976-09-03', pathfinder: '1997-07-04', spirit: '2004-01-04',
  opportunity: '2004-01-25', curiosity: '2012-08-06', perseverance: '2021-02-18', zhurong: '2021-05-14',
  messenger: '2015-04-30', venera13: '1982-03-01', huygens: '2005-01-14',
};
// Grands jalons, sans trace au sol.
const JALONS_SPATIAUX = [
  ['1957-10-04', '📡 Spoutnik 1, premier satellite artificiel, tourne autour de la Terre : bip… bip… bip…'],
  ['1961-04-12', '🧑‍🚀 Youri Gagarine fait le tour de la Terre en 108 minutes : premier humain dans l’espace.'],
  ['1963-06-16', '🧑‍🚀 Valentina Terechkova, première femme dans l’espace.'],
  ['1965-03-18', '🧑‍🚀 Alexeï Leonov sort de son vaisseau : première sortie dans l’espace.'],
  ['1968-12-24', '🌍 Apollo 8 fait le tour de la Lune ; l’équipage photographie le lever de Terre.'],
  ['1977-09-05', '🛰 Lancement de Voyager 1 (Voyager 2 est parti deux semaines plus tôt) : en route vers les planètes géantes.'],
  ['1981-04-12', '🚀 Premier vol de la navette spatiale Columbia.'],
  ['1986-02-20', '🛰 Lancement du premier module de la station Mir.'],
  ['1990-04-24', '🔭 Lancement du télescope spatial Hubble.'],
  ['1998-11-20', '🛰 Lancement de Zarya, premier module de la Station spatiale internationale.'],
  ['2000-11-02', '🛰 Premier équipage à bord de la Station spatiale internationale : depuis, elle n’est jamais restée vide.'],
  ['2012-08-25', '🌌 Voyager 1 quitte l’héliosphère : premier objet humain dans l’espace interstellaire.'],
  ['2015-07-14', '🪐 New Horizons survole Pluton.'],
  ['2018-02-06', '🚗 Une voiture rouge, avec un mannequin en combinaison au volant, est envoyée autour du Soleil.'],
  ['2021-12-25', '🔭 Lancement du télescope spatial James Webb.'],
];
const DATE_ISS = '1998-11-20', DATE_ROADSTER = '2018-02-06';

function dateDuJeuCampagne() { return typeof etat !== 'undefined' && etat.voyage && !etat.voyage.fin ? etat.voyage.t : dateDuJour(); }
function avantLe(dateISO, t = dateDuJeuCampagne()) { return t < tDeDateISO(dateISO); }
function issExiste(t) { return !avantLe(DATE_ISS, t); }

// Traces au sol : seulement celles déjà posées à la date du jeu.
const _tracesSurVraies = tracesSur;
tracesSur = function (astreId) {
  const l = _tracesSurVraies(astreId), t = dateDuJeuCampagne();
  return l.filter((tr) => !avantLe(DATES_TRACES[tr.id] || `${tr.annee}-01-01`, t));
};

// Événements de la campagne : ceux qui tombent après son début, une fois chacun.
function evenementsReels() {
  const l = JALONS_SPATIAUX.map(([d, texte]) => ({ id: 'j' + d, d, texte }));
  for (const [astre, traces] of Object.entries(TRACES_REELLES)) {
    for (const tr of traces) {
      const d = DATES_TRACES[tr.id] || `${tr.annee}-01-01`;
      const a = ASTRES_PAR_ID[astre];
      l.push({ id: tr.id, d, texte: `🛬 Vraie mission : ${tr.nom.replace(/^Site (de |d’)/, '')} ${a ? sur(a) : ''} : ${tr.materiel}.` });
    }
  }
  return l.sort((a, b) => (a.d < b.d ? -1 : 1));
}
function verifierVraiesMissions(v, log) {
  if (!v || v.systeme !== 'solaire') return;
  if (ASTRES_PAR_ID.roadster && avantLe(DATE_ROADSTER, v.t)) ASTRES_PAR_ID.roadster.cachee = true;
  const debut = (v.journal[0] && v.journal[0].t) || v.t;
  v.missionsVues = v.missionsVues || {};
  if (v.tMissions && v.t - v.tMissions < 3600) return;
  v.tMissions = v.t;
  for (const e of evenementsReels()) {
    if (v.missionsVues[e.id]) continue;
    const te = tDeDateISO(e.d);
    if (te > v.t) break;
    v.missionsVues[e.id] = true;
    if (te <= debut) continue;   // déjà de l'histoire quand la campagne a commencé
    if (e.d === DATE_ROADSTER && ASTRES_PAR_ID.roadster) ASTRES_PAR_ID.roadster.cachee = false;
    log(`${e.texte} (${fmtDate(te, false)})`);
  }
}
