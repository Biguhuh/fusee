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
  ['1957-11-03', '🐕 Laïka, à bord de Spoutnik 2 : le premier être vivant en orbite. Elle n’en reviendra pas.'],
  ['1958-01-31', '🛰 Explorer 1, premier satellite américain, découvre les ceintures de rayonnement de Van Allen.'],
  ['1959-09-13', '🌑 Luna 2 s’écrase sur la Lune : premier objet humain à toucher un autre astre.'],
  ['1959-10-07', '🌑 Luna 3 photographie la face cachée de la Lune, que personne n’avait jamais vue.'],
  ['1960-08-20', '🐕 Belka et Strelka reviennent vivantes de leur journée en orbite.'],
  ['1961-05-05', '🧑‍🚀 Alan Shepard, premier Américain dans l’espace (vol de 15 minutes).'],
  ['1962-02-20', '🧑‍🚀 John Glenn, premier Américain en orbite : trois tours de la Terre.'],
  ['1962-12-14', '🪐 Mariner 2 survole Vénus : première sonde à réussir le survol d’une autre planète.'],
  ['1965-07-15', '🪐 Mariner 4 envoie les premières photos de Mars : des cratères, pas de canaux.'],
  ['1966-03-16', '🛰 Gemini 8 : Neil Armstrong et David Scott réussissent le premier amarrage de deux vaisseaux.'],
  ['1967-01-27', '🕯 Apollo 1 : un incendie dans la capsule, au sol, tue Gus Grissom, Ed White et Roger Chaffee.'],
  ['1967-04-24', '🕯 Soyouz 1 : le parachute ne s’ouvre pas, Vladimir Komarov meurt au retour.'],
  ['1969-07-21', '👣 Neil Armstrong pose le pied sur la Lune, suivi de Buzz Aldrin ; Michael Collins les attend en orbite.'],
  ['1970-04-13', '💥 Apollo 13 : un réservoir d’oxygène explose en route vers la Lune. Le module lunaire sert de canot de sauvetage ; l’équipage rentrera sain et sauf le 17 avril.'],
  ['1971-04-19', '🛰 Saliout 1, première station spatiale.'],
  ['1971-06-30', '🕯 Soyouz 11 : la capsule se dépressurise au retour ; Dobrovolski, Volkov et Patsaïev sont les seuls humains morts au-delà de l’atmosphère.'],
  ['1971-11-14', '🪐 Mariner 9, première sonde en orbite autour d’une autre planète : Mars, alors couverte d’une tempête de poussière.'],
  ['1973-05-14', '🛰 Lancement de Skylab, la station américaine.'],
  ['1973-12-03', '🪐 Pioneer 10, première sonde à survoler Jupiter.'],
  ['1975-07-17', '🤝 Apollo-Soyouz : poignée de main en orbite entre astronautes et cosmonautes.'],
  ['1975-10-22', '🪐 Venera 9 envoie les premières images du sol de Vénus.'],
  ['1979-03-05', '🪐 Voyager 1 survole Jupiter et découvre les volcans d’Io.'],
  ['1980-11-12', '🪐 Voyager 1 survole Saturne et Titan.'],
  ['1983-06-18', '🧑‍🚀 Sally Ride, première Américaine dans l’espace.'],
  ['1984-02-07', '🧑‍🚀 Bruce McCandless s’éloigne de la navette sans attache, avec son fauteuil à réaction.'],
  ['1986-01-24', '🪐 Voyager 2 survole Uranus.'],
  ['1986-01-28', '🕯 La navette Challenger explose 73 secondes après le décollage ; ses sept occupants meurent, dont l’institutrice Christa McAuliffe.'],
  ['1989-08-25', '🪐 Voyager 2 survole Neptune et Triton, dont les geysers.'],
  ['1990-02-14', '🌍 Voyager 1 se retourne et photographie la Terre depuis 6 milliards de km : un point bleu pâle.'],
  ['1993-12-13', '🔭 Hubble réparé en orbite : ses lunettes corrigent sa vue.'],
  ['1995-03-22', '🧑‍🚀 Valeri Poliakov rentre de Mir après 437 jours dans l’espace, le record.'],
  ['1995-12-07', '🪐 Galileo arrive en orbite autour de Jupiter ; sa sonde plonge dans l’atmosphère.'],
  ['2001-03-23', '🛰 Fin de Mir, désorbitée au-dessus du Pacifique après quinze ans de service.'],
  ['2003-02-01', '🕯 La navette Columbia se désintègre au retour, son aile percée au décollage ; ses sept occupants meurent.'],
  ['2003-10-15', '🧑‍🚀 Yang Liwei, premier Chinois dans l’espace.'],
  ['2004-07-01', '🪐 Cassini arrive en orbite autour de Saturne.'],
  ['2005-07-04', '☄ Deep Impact lance un projectile sur la comète Tempel 1 pour voir ce qu’elle a dans le ventre.'],
  ['2011-07-21', '🚀 Dernier atterrissage de la navette spatiale (Atlantis) : fin de trente ans de vols.'],
  ['2012-05-25', '🛰 Dragon, premier vaisseau privé amarré à la Station spatiale internationale.'],
  ['2014-11-12', '☄ Philae se pose (en rebondissant) sur la comète Tchourioumov-Guérassimenko.'],
  ['2015-12-21', '🚀 Un premier étage de fusée revient se poser debout après un lancement en orbite.'],
  ['2020-05-30', '🧑‍🚀 Premier vol habité d’un vaisseau privé (Crew Dragon) vers l’ISS.'],
  ['2022-09-26', '☄ DART percute l’astéroïde Dimorphos et dévie son orbite : premier essai de défense planétaire.'],
  ['2022-11-16', '🌑 Artemis I : la capsule Orion fait le tour de la Lune sans équipage.'],
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
