'use strict';
// Découvertes au sol : easter eggs (cachés, trouvés seulement à pied ou en astromobile par un équipage)
// et traces réelles de l'exploration (visibles de tous, robots compris).
// Positions : dx = distance au site de descente, en mètres (le module se pose à un endroit qui change
// à chaque visite, les découvertes se placent par rapport à lui).

const EASTER_EGGS = [
  { id: 'mercure', astre: 'mercure', dx: 400, dessin: 'silhouetteRobot',
    texte: 'Une silhouette métallique se dresse à la limite de l’ombre, dans la fournaise. Elle avait promis de revenir.' },
  { id: 'lune', astre: 'lune', dx: -600, dessin: 'fuseeDamier',
    texte: 'Une petite fusée à damier rouge et blanc, posée là depuis 1954. Personne ne sait qui l’a garée.' },
  { id: 'mars', astre: 'mars', dx: 500, dessin: 'martien',
    texte: 'Au loin, un petit Martien tout vert agite la main. Il a l’air d’avoir passé une drôle de journée.' },
  { id: 'mars-tripode', astre: 'mars', dx: -1030, dessin: 'tripode',
    texte: 'Un tripode géant, rouillé, couché dans une herbe rouge. Ses pilotes ont été tués par les bactéries de la Terre : les plus petits de ses habitants ont gagné la guerre.' },
  { id: 'ceres', astre: 'a1', dx: 300, dessin: 'cinqLumieres',
    texte: 'Au pied d’une montagne solitaire au sommet plat, cinq lumières clignotent. Elles jouent toujours les mêmes cinq notes.' },
  { id: 'phobos', astre: 'l401', dx: 150, dessin: 'disqueOr', elvis: true,
    texte: 'Un disque d’or brille dans la poussière grise. Quelqu’un l’a laissé tomber en partant.' },
  { id: 'deimos', astre: 'l402', dx: 200, dessin: 'jouetAstronaute',
    texte: 'Un astronaute en plastique pointe le ciel du doigt. Il est persuadé de savoir voler.' },
  { id: 'vesta', astre: 'a4', dx: -350, dessin: 'distorsion',
    texte: 'L’air tremble près des rochers, comme une vague de chaleur. La silhouette disparaît dès qu’on la regarde.' },
  { id: 'chat', astre: 'a2', dx: 300, dessin: 'chat',
    texte: 'Un chat. Assis sur un caillou. Il vous regarde.' },
  { id: 'io', astre: 'io', dx: 450, dessin: 'pizza',
    texte: 'Une part de pizza, encore tiède. Vu d’en haut, Io lui ressemble beaucoup.' },
  { id: 'europe', astre: 'europe', dx: -500, dessin: 'monolithe',
    texte: 'Un grand bloc noir, parfaitement lisse. Il bourdonne doucement quand on s’approche.' },
  { id: 'ganymede', astre: 'ganymede', dx: 700, dessin: 'soucoupeVinyle',
    texte: 'Une petite soucoupe bariolée, qui fait un boucan d’enfer. À côté, un vinyle abandonné : « Monster Men ».' },
  { id: 'callisto', astre: 'callisto', dx: -400, dessin: 'compacteur',
    texte: 'Un petit robot couvert de poussière empile des cubes de régolithe. Il a l’air seul.' },
  { id: 'encelade', astre: 'l602', dx: 350, dessin: 'licorne',
    texte: 'Une licorne prise dans la glace, figée en plein galop. À ses pieds, un petit origami de papier plié.' },
  { id: 'pluton', astre: 'pluton', dx: -450, dessin: 'coeur',
    texte: 'Une immense plaine claire en forme de cœur : Tombaugh Regio, du nom de l’astronome qui a découvert Pluton en 1930.' },
  { id: 'triton', astre: 'triton', dx: 400, dessin: 'robotCri',
    texte: 'Il crie depuis longtemps. Il n’y a pas d’air pour porter sa voix.' },
  { id: 'charon', astre: 'l901', dx: -300, dessin: 'serviette',
    texte: 'Une serviette de bain flotte au-dessus du sol. Quelqu’un savait où était la sienne.' },
  { id: 'japet', astre: 'l608', dx: 380, dessin: 'anneauGardien',
    texte: 'Un grand anneau de pierre, à moitié enterré sous la crête. Un guerrier impassible monte la garde. Il lève un sourcil.' },
  { id: 'rhea', astre: 'rhea', dx: 250, dessin: 'soucoupeNounours',
    texte: 'Une soucoupe minuscule, pas plus grande qu’un ballon, et une petite peluche d’ours qui attend son héros.' },
  { id: 'titania', astre: 'titania', dx: -450, dessin: 'palaisGlace',
    texte: 'Un palais de cristaux de glace, au milieu de nulle part. Une cape rouge sèche sur une stalagmite.' },
  { id: 'titan', astre: 'titan', dx: 320, dessin: 'capsuleRouge',
    texte: 'Une petite capsule de secours rouge, cabossée. On dit que son pilote ressemblait à un chien bleu, aussi farceur qu’en quête d’une famille.' },
  { id: 'miranda', astre: 'l705', dx: -350, dessin: 'semelle',
    texte: 'Miranda porte une marque de semelle en pleine figure. Un ranger du Texas est passé par là, et personne ne pose de questions.' },
  { id: 'prospero', astre: 'l718', dx: 220, dessin: 'infini',
    texte: 'Prospero a défié un ranger du Texas de compter jusqu’à l’infini. Le ranger a fini. Deux fois.' },
  { id: 'tauceti-oeuf', astre: 'tauceti_ast1', dx: -300, dessin: 'oeuf',
    texte: 'Un œuf au cuir épais, entrouvert. Vide. Mieux vaut ne pas chercher ce qui en est sorti.' },
  { id: 'epseri-main', astre: 'epseri_ast2', dx: 300, dessin: 'mainLevee',
    texte: 'Une main levée, doigts écartés en deux paires. Longue vie et prospérité.' },
  // ExRépublique (Alpha Centauri) : exception voulue, sept clins d'œil sur un même astre.
  { id: 'exrep-marais', astre: 'alphacen_p2', dx: 300, dessin: 'cabane',
    texte: 'Au fond du marais, une cabane minuscule. Son occupant parle à l’envers et donne de drôles de conseils.' },
  { id: 'exrep-desert', astre: 'alphacen_p2', dx: -400, dessin: 'fermier',
    texte: 'Les deux soleils se couchent sur le sable. Un jeune fermier rêve de partir, comme son père avant lui.' },
  { id: 'exrep-cites', astre: 'alphacen_p2', dx: 700, dessin: 'citesNuages',
    texte: 'Des cités flottent au-dessus des nuages. Le commerce y prospère, la confiance un peu moins.' },
  { id: 'exrep-cantine', astre: 'alphacen_p2', dx: -750, dessin: 'cantine',
    texte: 'Un chasseur de primes boit en silence. À côté, un grand compagnon poilu grogne pour deux.' },
  { id: 'exrep-foret', astre: 'alphacen_p2', dx: 1050, dessin: 'villagesArbres',
    texte: 'Des villages perchés dans les arbres. De petits habitants poilus y accueillent les visiteurs au rythme des tambours.' },
  { id: 'exrep-polaire', astre: 'alphacen_p2', dx: -1100, dessin: 'plaineGelee',
    texte: 'Une plaine gelée balayée par le blizzard. Des tranchées abandonnées, et les empreintes de machines géantes à quatre pattes.' },
  { id: 'trappist-e', astre: 'trappist1_p4', dx: 350, dessin: 'longCou',
    texte: 'Un petit être scrute le ciel. Il voudrait téléphoner à la maison.' },
  { id: 'proxima-b', astre: 'proxima_p2', dx: -400, dessin: 'villePluie',
    texte: 'Une pluie noire tombe sur la ville. Des silhouettes répondent à des questions étranges.' },
];

// Traces réelles : visibles de tous, nommées « Site de … », avec l'année et le matériel laissé sur place.
const TRACES_REELLES = {
  lune: [
    { id: 'luna9', dx: 350, nom: 'Site de Luna 9', annee: 1966, materiel: 'sonde soviétique, premier atterrissage en douceur sur la Lune', objets: [['luna9', 0]] },
    { id: 'slim', dx: 180, nom: 'Site de SLIM', annee: 2024, materiel: 'atterrisseur japonais, posé sur le nez', objets: [['slim', 0]] },
    { id: 'chandrayaan3', dx: 600, nom: 'Site de Chandrayaan-3', annee: 2023, materiel: 'atterrisseur indien Vikram et rover Pragyan, premier atterrissage près du pôle Sud', objets: [['atterrisseurDore', 0], ['petitRover', 5]] },
    { id: 'apollo11', dx: 900, nom: 'Site d’Apollo 11', annee: 1969, materiel: 'étage de descente du module lunaire Eagle, drapeau, empreintes, plaque commémorative : les premiers pas humains sur la Lune', objets: [['lm', 0], ['drapeauUSA', 7], ['empreintes', 3]] },
    { id: 'change5', dx: 1080, nom: 'Site de Chang’e 5', annee: 2020, materiel: 'atterrisseur chinois et son drapeau, après un retour d’échantillons', objets: [['atterrisseurChinois', 0]] },
    { id: 'apollo16', dx: 1250, nom: 'Site d’Apollo 16', annee: 1972, materiel: 'module lunaire Orion, rover lunaire, drapeau, photo de famille laissée sur le sol', objets: [['lm', 0], ['drapeauUSA', 6], ['lrv', 13], ['photo', -5]] },
    { id: 'apollo14', dx: 1500, nom: 'Site d’Apollo 14', annee: 1971, materiel: 'module lunaire Antares, drapeau, chariot à échantillons', objets: [['lm', 0], ['drapeauUSA', 6], ['chariot', 10]] },
    { id: 'lunokhod2', dx: 1700, nom: 'Lunokhod 2', annee: 1973, materiel: 'rover soviétique de la mission Luna 21', objets: [['lunokhod', 0]] },
    { id: 'lunokhod1', dx: -350, nom: 'Lunokhod 1', annee: 1970, materiel: 'rover soviétique de la mission Luna 17, le premier robot à roues sur un autre astre', objets: [['lunokhod', 0]] },
    { id: 'apollo17', dx: -800, nom: 'Site d’Apollo 17', annee: 1972, materiel: 'module lunaire Challenger, rover lunaire, drapeau, plaque : la dernière mission humaine sur la Lune à ce jour', objets: [['lm', 0], ['drapeauUSA', 6], ['lrv', -12]] },
    { id: 'change6', dx: -960, nom: 'Site de Chang’e 6', annee: 2024, materiel: 'atterrisseur chinois, premiers échantillons de la face cachée', objets: [['atterrisseurChinois', 0]] },
    { id: 'apollo12', dx: -1100, nom: 'Site d’Apollo 12', annee: 1969, materiel: 'module lunaire Intrepid, drapeau, et la sonde Surveyor 3 (1967) à qui l’équipage a pris des pièces', objets: [['lm', 0], ['drapeauUSA', 6], ['surveyor', 22]] },
    { id: 'change3', dx: -1300, nom: 'Site de Chang’e 3', annee: 2013, materiel: 'atterrisseur chinois et rover Yutu', objets: [['atterrisseurChinois', 0], ['petitRover', 7]] },
    { id: 'apollo15', dx: -1500, nom: 'Site d’Apollo 15', annee: 1971, materiel: 'module lunaire Falcon, premier rover lunaire, drapeau, statuette et plaque en mémoire des astronautes et cosmonautes morts', objets: [['lm', 0], ['drapeauUSA', 6], ['lrv', 14], ['statuette', -6]] },
    { id: 'change4', dx: -1700, nom: 'Site de Chang’e 4', annee: 2019, materiel: 'atterrisseur chinois et rover Yutu-2, premier atterrissage sur la face cachée', objets: [['atterrisseurChinois', 0], ['petitRover', 8]] },
  ],
  mars: [
    { id: 'viking1', dx: 250, nom: 'Site de Viking 1', annee: 1976, materiel: 'atterrisseur américain, qui a cherché la vie dans le sol martien', objets: [['viking', 0]] },
    { id: 'pathfinder', dx: 800, nom: 'Site de Mars Pathfinder', annee: 1997, materiel: 'station sur ses pétales d’airbags, et Sojourner, le premier rover martien', objets: [['pathfinder', 0], ['petitRover', 4]] },
    { id: 'opportunity', dx: 1100, nom: 'Opportunity', annee: 2004, materiel: 'rover américain, prévu pour 90 jours, actif près de quinze ans, jusqu’à la tempête de poussière de 2018', objets: [['roverMER', 0]] },
    { id: 'perseverance', dx: 1400, nom: 'Perseverance et Ingenuity', annee: 2021, materiel: 'rover américain toujours en activité ; l’hélicoptère Ingenuity a fait 72 vols jusqu’en janvier 2024', objets: [['roverMSL', 0], ['ingenuity', 18]] },
    { id: 'mars3', dx: -300, nom: 'Site de Mars 3', annee: 1971, materiel: 'sonde soviétique, premier atterrissage en douceur sur Mars, muette après une vingtaine de secondes', objets: [['luna9', 0]] },
    { id: 'viking2', dx: -650, nom: 'Site de Viking 2', annee: 1976, materiel: 'atterrisseur américain, à Utopia Planitia', objets: [['viking', 0]] },
    { id: 'spirit', dx: -850, nom: 'Spirit', annee: 2004, materiel: 'rover américain, prévu pour 90 jours, actif six ans', objets: [['roverMER', 0]] },
    { id: 'curiosity', dx: -1200, nom: 'Curiosity', annee: 2012, materiel: 'rover américain toujours en activité', objets: [['roverMSL', 0]] },
    { id: 'zhurong', dx: -1500, nom: 'Zhurong', annee: 2021, materiel: 'premier rover chinois sur Mars, endormi depuis l’hiver martien de 2022', objets: [['zhurong', 0]] },
  ],
  venus: [
    { id: 'venera13', dx: 300, nom: 'Site de Venera 13', annee: 1982, materiel: 'sonde soviétique, 127 minutes de survie à 457 °C et 89 bar, premières photos en couleur du sol de Vénus', objets: [['venera', 0]] },
  ],
  titan: [
    { id: 'huygens', dx: 250, nom: 'Site de Huygens', annee: 2005, materiel: 'sonde européenne, l’atterrissage le plus lointain jamais réalisé', objets: [['huygens', 0]] },
  ],
};

// Easter eggs en orbite : l'équipage de l'orbiteur les aperçoit après avoir tourné un moment autour de l'astre
// (une révolution, 30 jours au plus). Une sonde arrivée là signale seulement « Objet inhabituel ».
const EGGS_ORBITE = [
  { id: 'lune-soucoupe', astre: 'lune',
    texte: 'Derrière la Lune, une soucoupe grande comme un pays attend le 4 juillet. Quelqu’un lui a déjà envoyé un virus.' },
  { id: 'saturne', astre: 'saturne', titre: 'Space Oddity',
    texte: 'Une capsule vide dérive. Personne n’a répondu depuis longtemps.' },
  { id: 'tauceti-balise', astre: 'tauceti_p4',
    texte: 'Une vieille balise rouillée, frappée du sigle d’une grande compagnie interstellaire : Weyland. Elle répète le nom d’une survivante, Ripley, et parle d’un chat.' },
  { id: 'trappist-f', astre: 'trappist1_p5',
    texte: 'Un paquebot de luxe flotte au-dessus des vagues. Les vacances sont réussies.' },
  { id: 'exrep-sphere', astre: 'alphacen_p2',
    texte: 'Une immense sphère en chantier. Le permis de construire est contesté.' },
  { id: 'alphacen', astre: 'alphacen_etoile',
    texte: 'Une plaque au nom d’un pilote qui aurait inventé le vol plus rapide que la lumière. Il aurait pris sa retraite ici.' },
];
const DUREE_MAX_OBSERVATION = 30 * 86400;

// Appelé par l'orbiteur à chaque avancée du temps.
function verifierEggsOrbite(orb, dt) {
  const v = orb.v;
  const e = EGGS_ORBITE.find((x) => x.astre === v.orb.centre);
  if (!e || eggTrouve(e.id) || !orb.orbiteFermee()) { v.observation = null; return; }
  const a = ASTRES_PAR_ID[e.astre];
  if (!v.observation || v.observation.astre !== e.astre) v.observation = { astre: e.astre, duree: 0 };
  v.observation.duree += dt;
  const periode = elements(v.orb.r, v.orb.v, a.gm).periode;
  if (v.observation.duree < Math.min(periode, DUREE_MAX_OBSERVATION)) return;
  etat.decouvertes = etat.decouvertes || {};
  etat.decouvertes[e.id] = { astre: e.astre, quand: v.t, par: 'l’équipage de l’orbiteur' };
  v.observation = null;
  orb.log(`✨ Découverte ${enOrbite(a)} : ${e.texte}${e.titre ? ` — « ${e.titre} »` : ''}`);
  sauver(etat);
}

// Sonde arrivée en orbite : un mot sur l'objet inhabituel, sans rien révéler.
function signalSonde(astreId) {
  const e = EGGS_ORBITE.find((x) => x.astre === astreId);
  if (!e || eggTrouve(e.id)) return '';
  etat.reperes = etat.reperes || {};
  etat.reperes[e.id] = true;
  return ' Objet inhabituel en orbite. Une exploration humaine permettrait de l’examiner.';
}

// Plongée dans Saturne : la fin de Cassini.
function verifierCassini(vol) {
  if (vol.astre.id !== 'saturne' || vol.cassiniVu || vol.pose || etat.vol !== vol) return;
  if (vol.y > vol.astre.depart.alt * 0.8) return;
  vol.cassiniVu = true;
  const texte = '15 septembre 2017 : c’est ici que Cassini a plongé, après treize ans autour de Saturne, pour ne pas risquer de contaminer Encelade ou Titan.';
  vol.messageExplo = { texte: '📍 ' + texte, vie: 12 };
  if (etat.enVoyage && etat.voyage) etat.voyage.journal.push({ t: etat.voyage.t, texte: '📍 ' + texte });
}

// Bételgeuse, dans « Se promener » : découverte en zoomant au plus près.
const EGG_BETELGEUSE = { id: 'betelgeuse', texte: 'Près de l’épaule d’Orion, quelqu’un prétend avoir vu des choses incroyables. Personne ne l’a cru.' };
function verifierBetelgeuse(obs) {
  if (obs.o.id !== 'betelgeuse' || obs.zoom < 4) return null;
  if (!eggTrouve(EGG_BETELGEUSE.id)) {
    etat.decouvertes = etat.decouvertes || {};
    etat.decouvertes[EGG_BETELGEUSE.id] = { astre: 'betelgeuse', quand: null, par: nomSpatio() };
    sauver(etat);
  }
  return '✨ ' + EGG_BETELGEUSE.texte;
}

// ---------- La voiture rouge ----------
// Lancée le 6 février 2018 par le premier vol de la Falcon Heavy, un mannequin en combinaison au volant.
// Orbite réelle (JPL) : a = 1,325 UA, e = 0,256 (0,99 à 1,66 UA), périhélie le 10 novembre 2018.
// Rayon de 1 km et sphère d'influence de 5 000 km : une « bulle de rendez-vous » pour que l'orbiteur puisse la rejoindre.
CATEGORIES.objet = { nom: 'Objet artificiel', icone: '🚗', def: 'Objet fabriqué sur Terre et laissé dans l’espace.' };
(function creerVoiture() {
  if (ASTRES_PAR_ID.roadster) return;
  const a = astreGenerique({
    id: 'roadster', nom: 'Voiture rouge', parent: null, rayonKm: 1, gm: 3e-7, distanceUA: 1.325, famille: 'ceinture',
    surface: 'carrosserie rouge',
    note: 'Une vraie voiture de sport, lancée le 6 février 2018 par le premier vol de la Falcon Heavy, un mannequin en combinaison au volant. Aucun instrument scientifique : une démonstration et une opération publicitaire. Elle tourne autour du Soleil entre 0,99 et 1,66 UA.',
  });
  Object.assign(a, {
    type: 'objet', artificiel: true, gm: 3e-7, systeme: 'solaire', grosse: true, categorie: 'objet',
    couleurs: { sol: '#c62828', ciel: '#000000', disque: '#e53935' },
    orbite: { centre: 'soleil', a: 1.325 * UA_KM, e: 0.256, varpi: 134.5, M0: 228.5, n: 360 / 557, retro: false, periodeJours: 557 },
    soi: 5000, soiReelle: 5000,
  });
  ASTRES.push(a);
  ASTRES_PAR_ID[a.id] = a;
  (ENFANTS.soleil = ENFANTS.soleil || []).push(a);
})();

// Propulseur solaire (campagne.js) : proposé à l'atelier une fois la voiture découverte.
function astreMasque(a) { return !!(a.artificiel && eggTrouve('voiture-2')); }
function recetteVisible(cle, st) {
  if (cle === 'lanceurRetour') return !!AEROSTAT[st.centre];
  if (cle === 'propulseurs') return eggTrouve('voiture-1') && !eggTrouve('voiture-3') && SYSTEME.id === 'solaire';
  return true;
}

const TEXTES_VOITURE = {
  1: 'Une voiture de sport en orbite autour du Soleil. Aucun instrument scientifique, beaucoup de publicité.',
  2: 'Vous avez ramassé un déchet vaniteux. L’espace s’en porte mieux.',
  3: '2,21 gigowatts reçus. Le déchet vaniteux est bien cuit.',
};
function etapeVoiture(n, orb) {
  etat.decouvertes = etat.decouvertes || {};
  etat.decouvertes['voiture-' + n] = { astre: 'roadster', quand: orb.v.t, par: 'l’équipage de l’orbiteur' };
  orb.log(`${n === 3 ? '☀️' : '🚗'} ${TEXTES_VOITURE[n]}`);
  sauver(etat);
}
// Appelé à chaque avancée du temps de l'orbiteur.
function verifierVoiture(orb) {
  const v = orb.v;
  if (v.orb && v.orb.centre === 'roadster' && !eggTrouve('voiture-1')) etapeVoiture(1, orb);
  if (v.voiture && v.voiture.etat === 'chute' && v.t >= v.voiture.fin) {
    v.voiture = { etat: 'incineree' };
    etapeVoiture(3, orb);
  }
}
// Boutons du panneau d'actions de l'orbiteur.
function actionsVoiture(orb) {
  const v = orb.v;
  if (SYSTEME.id !== 'solaire' || eggTrouve('voiture-3')) return '';
  if (v.orb.centre === 'roadster' && !eggTrouve('voiture-2')) return '<button id="nav-voiture" class="principal">🧲 Capturer la voiture (équipage)</button>';
  if (v.voiture && v.voiture.etat === 'a_bord') {
    if (!v.propulseurs) return '<p class="doux">🚗 La voiture est à bord. Il faut un propulseur solaire (atelier d’une station, puis amarrage) pour l’envoyer dans le Soleil.</p>';
    if (v.orb.centre !== 'soleil' && v.orb.centre !== 'roadster') return '<p class="doux">🚗 La voiture est à bord : sortez des sphères d’influence des planètes pour la lancer vers le Soleil.</p>';
    return '<button id="nav-voiture" class="principal">☀️ Lancer la voiture vers le Soleil (propulseur)</button>';
  }
  if (v.voiture && v.voiture.etat === 'chute') return `<p class="doux">☀️ La voiture tombe vers le Soleil : arrivée dans ${fmtDuree(v.voiture.fin - v.t)}.</p>`;
  return '';
}
function actionVoiture(orb) {
  const v = orb.v;
  if (v.orb.centre === 'roadster' && !eggTrouve('voiture-2')) {
    v.voiture = { etat: 'a_bord' };
    // La voiture quitte son orbite : on retire l'astre de la carte et la navigation reprend autour du Soleil.
    const car = ASTRES_PAR_ID.roadster, abs = etatAbsolu('roadster', v.t), soleil = etatAbsolu('soleil', v.t);
    v.orb = { centre: 'soleil', r: V.add(V.sub(abs.r, soleil.r), v.orb.r), v: V.add(V.sub(abs.v, soleil.v), v.orb.v), transfert: null };
    car.cachee = true;
    if (v.cible === 'roadster') v.cible = null;
    orb.etape = null;
    etapeVoiture(2, orb);
    return;
  }
  if (v.voiture && v.voiture.etat === 'a_bord' && v.propulseurs > 0) {
    // Le propulseur (ionique, environ 18 km/s) annule la vitesse orbitale de la voiture : chute presque radiale.
    // Durée de chute depuis la distance r : (π/2)·√(r³ / 2GM).
    v.propulseurs -= 1;
    const r = V.norm(etatAbsoluOrbiteur(orb));
    const duree = (Math.PI / 2) * Math.sqrt(Math.pow(r, 3) / (2 * GM_SOLEIL));
    v.voiture = { etat: 'chute', fin: v.t + duree };
    orb.log(`☀️ Propulseur solaire allumé : la voiture perd sa vitesse orbitale et tombe vers le Soleil. Arrivée dans ${fmtDuree(duree)}.`);
  }
}
function etatAbsoluOrbiteur(orb) { return orb.absolu(orb.v.orb); }

// ---------- Voyager 1 et 2 ----------
// Lancées en 1977, sorties de l'héliosphère en 2012 et 2018. Elles filent en ligne presque droite à vitesse
// quasi constante : position = position de référence + vitesse × temps écoulé.
// Référence NASA : Voyager 1 à un jour-lumière de la Terre (173,3 UA) le 18 novembre 2026.
// Voyager 2 : environ 145 UA à la même date (estimation d'après sa vitesse depuis l'héliopause, 119 UA en 2018).
// Directions (équatoriales, vers où elles vont) : Voyager 1 vers Ophiuchus, Voyager 2 vers le Paon.
const T_REF_VOYAGER = (Date.UTC(2026, 10, 18, 10, 16) - Date.UTC(2000, 0, 1, 12)) / 1000;
const VOYAGERS = [
  { id: 'voyager1', nom: 'Voyager 1', ad: 258.3, dec: 12.0, rRef: 173.3, uaParAn: 3.57, heliopause: 2012 },
  { id: 'voyager2', nom: 'Voyager 2', ad: 301.5, dec: -58.6, rRef: 145, uaParAn: 3.21, heliopause: 2018 },
];
const ANNEE_JULIENNE = 365.25 * 86400;
function directionEquatoriale(ad, dec) {
  const a = ad * DEG, d = dec * DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}
// Distance au Soleil (UA) et position sur la carte (plan de l'écliptique, km) à l'instant t du jeu.
function positionVoyager(vg, t) {
  const r = vg.rRef + vg.uaParAn * (t - T_REF_VOYAGER) / ANNEE_JULIENNE;
  const [x, y, z] = directionEquatoriale(vg.ad, vg.dec);
  const eps = 23.439 * DEG;
  const ye = y * Math.cos(eps) + z * Math.sin(eps);
  return { r, carte: [x * r * UA_KM, ye * r * UA_KM] };
}
function dessinerVoyagers(ctx, ecran, dansEcran, t) {
  if (SYSTEME.id !== 'solaire') return;
  for (const vg of VOYAGERS) {
    const p = positionVoyager(vg, t), e = ecran(p.carte);
    if (!dansEcran(e, 0)) continue;
    disque(ctx, e[0], e[1], 2.5, '#eceff1');
    texteSurFond(ctx, `${vg.nom} · ${fmt(p.r)} UA`, e[0], e[1] - 10, { police: '11px system-ui, sans-serif', couleur: '#cfd8dc' });
  }
}
function texteVoyager(vg, t) {
  return `${vg.nom}, lancée en 1977, sortie de l’héliosphère en ${vg.heliopause}, à ${fmt(positionVoyager(vg, t).r)} UA du Soleil. Elle emporte un disque d’or avec des sons et des images de la Terre.`;
}
// L'orbiteur passe à moins d'une UA de l'une d'elles.
function verifierVoyagers(orb) {
  const v = orb.v;
  if (SYSTEME.id !== 'solaire' || v.orb.centre !== 'soleil') return;
  const pos = orb.absolu(v.orb);
  for (const vg of VOYAGERS) {
    v.voyagersVus = v.voyagersVus || {};
    if (v.voyagersVus[vg.id]) continue;
    if (V.norm(V.sub(pos, positionVoyager(vg, v.t).carte)) < UA_KM) {
      v.voyagersVus[vg.id] = true;
      orb.log(`📍 Croisement de ${texteVoyager(vg, v.t)}`);
    }
  }
}
// Départ vers une autre étoile : la Voyager la plus proche de la route, à la date du départ.
function texteCroisementVoyager(positionAL, t) {
  const n = Math.hypot(...positionAL), u = positionAL.map((c) => c / n);
  let meilleur = null;
  for (const vg of VOYAGERS) {
    const d = directionEquatoriale(vg.ad, vg.dec);
    const cos = d[0] * u[0] + d[1] * u[1] + d[2] * u[2];
    const r = positionVoyager(vg, t).r;
    const ecart = cos > 0 ? r * Math.sqrt(1 - cos * cos) : r;
    if (!meilleur || ecart < meilleur.ecart) meilleur = { vg, ecart, devant: cos > 0 };
  }
  return `Croisement : ${texteVoyager(meilleur.vg, t)} ${meilleur.devant ? `Elle passe à ${fmt(meilleur.ecart)} UA de votre route.` : 'Elle file à l’opposé de votre route.'}`;
}

// Mimas : pas d'easter egg, seulement un fait réel dans sa fiche.
if (typeof ASTRES_PAR_ID !== 'undefined' && ASTRES_PAR_ID.l601 && !/Herschel/.test(ASTRES_PAR_ID.l601.note || '')) {
  ASTRES_PAR_ID.l601.note = `${ASTRES_PAR_ID.l601.note || ''} Son cratère Herschel, large de 139 km, lui donne une célèbre allure de station spatiale de science-fiction.`.trim();
}

function eggsSur(astreId) { return EASTER_EGGS.filter((e) => e.astre === astreId); }
function tracesSur(astreId) { return TRACES_REELLES[astreId] || []; }
function eggTrouve(id) { return !!(typeof etat !== 'undefined' && etat.decouvertes && etat.decouvertes[id]); }

// Appelé à chaque pas de l'exploration.
function verifierDecouvertes(x) {
  const p = x.p, humain = x.type === 'spationaute';
  x.vusIci = x.vusIci || {};
  for (const e of eggsSur(x.astre.id)) {
    const ex = x.xFusee + e.dx, d = Math.abs(p.x - ex);
    if (humain && d < (x.enRover ? 6 : 4) && !eggTrouve(e.id)) {
      decouvrir(e, x);
    } else if (!humain && d < 20 && !eggTrouve(e.id) && !x.vusIci[e.id]) {
      x.vusIci[e.id] = true;
      etat.reperes = etat.reperes || {};
      etat.reperes[e.id] = true;
      x.dire('Objet inhabituel repéré. Une exploration humaine permettrait de l’examiner.');
    }
  }
  for (const t of tracesSur(x.astre.id)) {
    const tx = x.xFusee + t.dx;
    if (Math.abs(p.x - tx) < 12 && !x.vusIci['t:' + t.id]) {
      x.vusIci['t:' + t.id] = true;
      x.dire(`📍 ${t.nom} — ${t.annee} — ${t.materiel}.`);
    }
  }
}

function decouvrir(e, x) {
  etat.decouvertes = etat.decouvertes || {};
  etat.decouvertes[e.id] = { astre: e.astre, quand: etat.enVoyage && etat.voyage ? etat.voyage.t : null, par: nomSpatio() };
  x.dire('✨ ' + e.texte);
  if (e.elvis) x.vol.elvis = true;
  if (e.id === 'chat') replique('chat');
  if (etat.enVoyage && etat.voyage) etat.voyage.journal.push({ t: etat.voyage.t, texte: `✨ Découverte ${sur(x.astre)} : ${e.texte}` });
  sauver(etat);
}

// Dessin des découvertes autour de l'explorateur. Les easter eggs n'apparaissent qu'à un humain proche,
// ou une fois trouvés ; les traces réelles sont toujours là.
function dessinerDecouvertes(ctx, x, versEcran, s, W) {
  const p = x.p, humain = x.type === 'spationaute';
  for (const t of tracesSur(x.astre.id)) {
    const tx = x.xFusee + t.dx;
    const [sx, sy] = versEcran(tx, x.sol(tx));
    if (sx < -60 * s || sx > W + 60 * s) continue;
    let hMax = 0;
    for (const [type, ox] of t.objets) {
      const ax = tx + ox;
      const [ox2, oy2] = versEcran(ax, x.sol(ax));
      const h = (DESSINS_TRACES[type] || DESSINS_TRACES.petitRover)(ctx, ox2, oy2, s, x.astre);
      if (ox === 0) hMax = h || 3;
    }
    texteSurFond(ctx, `${t.nom} — ${t.annee}`, sx, sy - hMax * s - 14, { police: '12px system-ui, sans-serif', couleur: '#ffe0a3' });
  }
  for (const e of eggsSur(x.astre.id)) {
    const ex = x.xFusee + e.dx;
    const visible = eggTrouve(e.id) || (humain && Math.abs(p.x - ex) < 25);
    if (!visible) continue;
    const [sx, sy] = versEcran(ex, x.sol(ex));
    if (sx < -40 * s || sx > W + 40 * s) continue;
    (DESSINS_EGGS[e.dessin] || (() => {}))(ctx, sx, sy, s);
  }
}

// ---------- Petits outils de dessin ----------
function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function disque(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function trait(ctx, pts, c, lw) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.stroke(); }
function roue(ctx, x, y, r) { disque(ctx, x, y, r, '#37474f'); disque(ctx, x, y, r * 0.45, '#90a4ae'); }

// Chaque fonction dessine au pied (x, y), à s pixels par mètre, et renvoie sa hauteur en mètres.
const DESSINS_TRACES = {
  lm(ctx, x, y, s) {
    // Étage de descente du module lunaire : caisson doré, quatre pieds, échelle.
    trait(ctx, [[x - 4.6 * s, y], [x - 2 * s, y - 1.9 * s]], '#b0a080', 0.12 * s);
    trait(ctx, [[x + 4.6 * s, y], [x + 2 * s, y - 1.9 * s]], '#b0a080', 0.12 * s);
    disque(ctx, x - 4.6 * s, y - 0.1 * s, 0.45 * s, '#cfc39a');
    disque(ctx, x + 4.6 * s, y - 0.1 * s, 0.45 * s, '#cfc39a');
    ctx.fillStyle = '#c99a2e';
    ctx.beginPath(); ctx.moveTo(x - 2.1 * s, y - 1.4 * s); ctx.lineTo(x + 2.1 * s, y - 1.4 * s); ctx.lineTo(x + 2.1 * s, y - 3.1 * s); ctx.lineTo(x - 2.1 * s, y - 3.1 * s); ctx.fill();
    rect(ctx, x - 2.1 * s, y - 2.3 * s, 4.2 * s, 0.12 * s, '#e8c35a');
    rect(ctx, x - 0.4 * s, y - 3.1 * s, 0.8 * s, 0.25 * s, '#5d5d5d');           // tuyère
    for (let k = 0; k < 6; k++) rect(ctx, x + 1.3 * s, y - (0.4 + k * 0.3) * s, 0.5 * s, 0.05 * s, '#9e9e9e');   // échelle
    return 3.2;
  },
  drapeauUSA(ctx, x, y, s) {
    trait(ctx, [[x, y], [x, y - 2.4 * s]], '#cfd8dc', 0.06 * s);
    trait(ctx, [[x, y - 2.35 * s], [x + 1.5 * s, y - 2.35 * s]], '#cfd8dc', 0.04 * s);
    for (let k = 0; k < 7; k++) rect(ctx, x, y - (2.35 - k * 0.13) * s, 1.5 * s, 0.065 * s, k % 2 ? '#f5f5f5' : '#c62828');
    rect(ctx, x, y - 2.35 * s, 0.6 * s, 0.46 * s, '#1a3a8f');
    // Couleurs passées par plus de cinquante ans de soleil sans filtre : on les ternit.
    rect(ctx, x, y - 2.35 * s, 1.5 * s, 0.92 * s, 'rgba(255,255,255,0.35)');
    return 2.4;
  },
  empreintes(ctx, x, y, s) {
    for (let k = -6; k <= 6; k++) rect(ctx, x + k * 0.7 * s, y - 0.04 * s, 0.25 * s, 0.06 * s, 'rgba(0,0,0,0.35)');
    return 0.1;
  },
  lrv(ctx, x, y, s) {
    roue(ctx, x - 1.1 * s, y - 0.4 * s, 0.4 * s); roue(ctx, x + 1.1 * s, y - 0.4 * s, 0.4 * s);
    rect(ctx, x - 1.55 * s, y - 0.95 * s, 3.1 * s, 0.25 * s, '#9e9e9e');
    rect(ctx, x - 0.6 * s, y - 1.35 * s, 0.35 * s, 0.4 * s, '#78909c');
    rect(ctx, x + 0.1 * s, y - 1.35 * s, 0.35 * s, 0.4 * s, '#78909c');
    trait(ctx, [[x - 1.3 * s, y - 0.95 * s], [x - 1.3 * s, y - 2 * s]], '#bdbdbd', 0.05 * s);
    ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.arc(x - 1.3 * s, y - 2 * s, 0.45 * s, Math.PI, 0); ctx.fill();   // parabole
    return 2;
  },
  chariot(ctx, x, y, s) {
    roue(ctx, x - 0.4 * s, y - 0.2 * s, 0.2 * s); roue(ctx, x + 0.4 * s, y - 0.2 * s, 0.2 * s);
    rect(ctx, x - 0.5 * s, y - 0.7 * s, 1 * s, 0.4 * s, '#b0bec5');
    trait(ctx, [[x + 0.5 * s, y - 0.6 * s], [x + 1.2 * s, y - 1.2 * s]], '#cfd8dc', 0.05 * s);
    return 1.2;
  },
  statuette(ctx, x, y, s) {
    rect(ctx, x - 0.15 * s, y - 0.04 * s, 0.4 * s, 0.04 * s, '#cfd8dc');                 // plaque
    trait(ctx, [[x, y - 0.04 * s], [x, y - 0.12 * s]], '#eceff1', 0.03 * s);           // petite figurine
    disque(ctx, x, y - 0.14 * s, 0.02 * s, '#eceff1');
    return 0.2;
  },
  photo(ctx, x, y, s) { rect(ctx, x - 0.07 * s, y - 0.02 * s, 0.14 * s, 0.02 * s, '#efe6d0'); return 0.05; },
  surveyor(ctx, x, y, s) {
    trait(ctx, [[x - 1.5 * s, y], [x, y - 1.2 * s], [x + 1.5 * s, y]], '#b0bec5', 0.08 * s);
    rect(ctx, x - 0.35 * s, y - 1.5 * s, 0.7 * s, 0.5 * s, '#d7ccc8');
    trait(ctx, [[x, y - 1.5 * s], [x, y - 3 * s]], '#cfd8dc', 0.06 * s);
    rect(ctx, x - 0.5 * s, y - 3.1 * s, 1 * s, 0.6 * s, '#5c6bc0');                    // panneau solaire
    return 3.1;
  },
  luna9(ctx, x, y, s) {
    for (const a of [-1.1, -0.4, 0.4, 1.1]) trait(ctx, [[x, y - 0.3 * s], [x + Math.sin(a) * 0.8 * s, y - 0.05 * s]], '#9e9e9e', 0.12 * s);
    disque(ctx, x, y - 0.35 * s, 0.3 * s, '#bdbdbd');
    trait(ctx, [[x, y - 0.6 * s], [x + 0.2 * s, y - 1 * s]], '#e0e0e0', 0.03 * s);
    return 1;
  },
  lunokhod(ctx, x, y, s) {
    for (let k = -3; k <= 3; k += 2) roue(ctx, x + k * 0.5 * s, y - 0.25 * s, 0.25 * s);
    ctx.fillStyle = '#9ea7ad'; ctx.beginPath(); ctx.ellipse(x, y - 0.75 * s, 1.1 * s, 0.4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f51b5'; ctx.beginPath(); ctx.ellipse(x - 0.3 * s, y - 1.25 * s, 1.1 * s, 0.12 * s, -0.4, 0, Math.PI * 2); ctx.fill();   // couvercle solaire ouvert
    return 1.5;
  },
  atterrisseurChinois(ctx, x, y, s) {
    trait(ctx, [[x - 2 * s, y], [x - 1.1 * s, y - 1 * s]], '#bdbdbd', 0.1 * s);
    trait(ctx, [[x + 2 * s, y], [x + 1.1 * s, y - 1 * s]], '#bdbdbd', 0.1 * s);
    rect(ctx, x - 1.2 * s, y - 2.2 * s, 2.4 * s, 1.3 * s, '#d4a017');
    rect(ctx, x - 2.6 * s, y - 2.5 * s, 1.3 * s, 0.6 * s, '#283593');
    rect(ctx, x + 1.3 * s, y - 2.5 * s, 1.3 * s, 0.6 * s, '#283593');
    trait(ctx, [[x + 0.8 * s, y - 2.2 * s], [x + 0.8 * s, y - 3.2 * s]], '#cfd8dc', 0.05 * s);
    rect(ctx, x + 0.8 * s, y - 3.2 * s, 0.45 * s, 0.3 * s, '#de2910');                 // drapeau
    return 3.2;
  },
  atterrisseurDore(ctx, x, y, s) {
    trait(ctx, [[x - 1.6 * s, y], [x - 0.9 * s, y - 0.8 * s]], '#bdbdbd', 0.1 * s);
    trait(ctx, [[x + 1.6 * s, y], [x + 0.9 * s, y - 0.8 * s]], '#bdbdbd', 0.1 * s);
    rect(ctx, x - 1 * s, y - 2 * s, 2 * s, 1.2 * s, '#e0b030');
    rect(ctx, x - 1 * s, y - 2.15 * s, 2 * s, 0.15 * s, '#37474f');
    return 2.2;
  },
  slim(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y - 0.8 * s); ctx.rotate(Math.PI * 0.55);
    rect(ctx, -1.2 * s, -0.8 * s, 2.4 * s, 1.6 * s, '#cfa83a');
    rect(ctx, -1.2 * s, -0.95 * s, 2.4 * s, 0.15 * s, '#1a237e');
    ctx.restore();
    return 2.2;
  },
  petitRover(ctx, x, y, s) {
    for (const k of [-0.4, 0, 0.4]) roue(ctx, x + k * s, y - 0.12 * s, 0.12 * s);
    rect(ctx, x - 0.5 * s, y - 0.45 * s, 1 * s, 0.25 * s, '#cfd8dc');
    rect(ctx, x - 0.75 * s, y - 0.55 * s, 1.5 * s, 0.08 * s, '#3949ab');
    return 0.6;
  },
  viking(ctx, x, y, s) {
    trait(ctx, [[x - 1.5 * s, y], [x - 0.8 * s, y - 0.8 * s]], '#bdbdbd', 0.1 * s);
    trait(ctx, [[x + 1.5 * s, y], [x + 0.8 * s, y - 0.8 * s]], '#bdbdbd', 0.1 * s);
    rect(ctx, x - 1 * s, y - 1.4 * s, 2 * s, 0.6 * s, '#cfd8dc');
    trait(ctx, [[x - 0.4 * s, y - 1.4 * s], [x - 0.4 * s, y - 2.3 * s]], '#9e9e9e', 0.06 * s);
    ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(x - 0.4 * s, y - 2.3 * s, 0.5 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
    trait(ctx, [[x + 0.6 * s, y - 1.4 * s], [x + 1.6 * s, y - 1.2 * s]], '#757575', 0.05 * s);   // bras de prélèvement
    return 2.5;
  },
  pathfinder(ctx, x, y, s) {
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath(); ctx.moveTo(x - 1.5 * s, y); ctx.lineTo(x + 1.5 * s, y); ctx.lineTo(x, y - 0.6 * s); ctx.fill();
    rect(ctx, x - 1.5 * s, y - 0.12 * s, 3 * s, 0.1 * s, '#3949ab');
    trait(ctx, [[x, y - 0.6 * s], [x, y - 1.3 * s]], '#cfd8dc', 0.05 * s);
    disque(ctx, x, y - 1.35 * s, 0.12 * s, '#eceff1');
    return 1.4;
  },
  roverMER(ctx, x, y, s) {
    for (const k of [-0.6, 0, 0.6]) roue(ctx, x + k * s, y - 0.13 * s, 0.13 * s);
    rect(ctx, x - 0.7 * s, y - 0.65 * s, 1.4 * s, 0.35 * s, '#cfd8dc');
    rect(ctx, x - 1.1 * s, y - 0.75 * s, 2.2 * s, 0.08 * s, '#283593');
    trait(ctx, [[x + 0.4 * s, y - 0.75 * s], [x + 0.4 * s, y - 1.5 * s]], '#bdbdbd', 0.05 * s);
    rect(ctx, x + 0.25 * s, y - 1.6 * s, 0.35 * s, 0.12 * s, '#78909c');
    // Couvert de poussière rouge.
    rect(ctx, x - 1.1 * s, y - 0.8 * s, 2.2 * s, 0.1 * s, 'rgba(193,105,60,0.55)');
    return 1.6;
  },
  roverMSL(ctx, x, y, s) {
    for (const k of [-1, 0, 1]) roue(ctx, x + k * s, y - 0.25 * s, 0.25 * s);
    rect(ctx, x - 1.3 * s, y - 1 * s, 2.6 * s, 0.5 * s, '#eceff1');
    rect(ctx, x - 1.6 * s, y - 1.15 * s, 0.35 * s, 0.55 * s, '#455a64');           // générateur au plutonium
    trait(ctx, [[x + 0.9 * s, y - 1 * s], [x + 0.9 * s, y - 2.1 * s]], '#cfd8dc', 0.08 * s);
    rect(ctx, x + 0.7 * s, y - 2.3 * s, 0.5 * s, 0.25 * s, '#90a4ae');
    trait(ctx, [[x + 1.3 * s, y - 0.8 * s], [x + 1.9 * s, y - 0.6 * s]], '#9e9e9e', 0.06 * s);   // bras
    return 2.3;
  },
  ingenuity(ctx, x, y, s) {
    trait(ctx, [[x - 0.25 * s, y], [x, y - 0.25 * s], [x + 0.25 * s, y]], '#bdbdbd', 0.03 * s);
    rect(ctx, x - 0.1 * s, y - 0.35 * s, 0.2 * s, 0.14 * s, '#b0bec5');
    trait(ctx, [[x, y - 0.35 * s], [x, y - 0.5 * s]], '#9e9e9e', 0.03 * s);
    trait(ctx, [[x - 0.6 * s, y - 0.48 * s], [x + 0.6 * s, y - 0.48 * s]], '#616161', 0.03 * s);
    trait(ctx, [[x - 0.55 * s, y - 0.53 * s], [x + 0.45 * s, y - 0.53 * s]], '#616161', 0.03 * s);   // pale abîmée
    return 0.55;
  },
  zhurong(ctx, x, y, s) {
    for (const k of [-0.6, 0, 0.6]) roue(ctx, x + k * s, y - 0.15 * s, 0.15 * s);
    rect(ctx, x - 0.8 * s, y - 0.75 * s, 1.6 * s, 0.4 * s, '#eceff1');
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath(); ctx.moveTo(x - 0.4 * s, y - 0.8 * s); ctx.lineTo(x - 1.4 * s, y - 1.4 * s); ctx.lineTo(x - 1.2 * s, y - 0.8 * s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 0.4 * s, y - 0.8 * s); ctx.lineTo(x + 1.4 * s, y - 1.4 * s); ctx.lineTo(x + 1.2 * s, y - 0.8 * s); ctx.fill();
    trait(ctx, [[x + 0.5 * s, y - 0.8 * s], [x + 0.5 * s, y - 1.6 * s]], '#bdbdbd', 0.05 * s);
    return 1.6;
  },
  venera(ctx, x, y, s) {
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 0.15 * s;
    ctx.beginPath(); ctx.ellipse(x, y - 0.25 * s, 1.1 * s, 0.25 * s, 0, 0, Math.PI * 2); ctx.stroke();   // anneau d'atterrissage
    disque(ctx, x, y - 1.1 * s, 0.6 * s, '#a1887f');
    rect(ctx, x - 0.2 * s, y - 2.1 * s, 0.4 * s, 0.4 * s, '#8d6e63');
    ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.ellipse(x, y - 2.15 * s, 0.9 * s, 0.12 * s, 0, 0, Math.PI * 2); ctx.fill();   // disque de freinage
    return 2.3;
  },
  huygens(ctx, x, y, s) {
    ctx.fillStyle = '#c8b273'; ctx.beginPath(); ctx.ellipse(x, y - 0.35 * s, 0.65 * s, 0.32 * s, 0, 0, Math.PI * 2); ctx.fill();
    rect(ctx, x - 0.65 * s, y - 0.4 * s, 1.3 * s, 0.08 * s, '#8d7b4a');
    return 0.7;
  },
};

const DESSINS_EGGS = {
  silhouetteRobot(ctx, x, y, s) {
    const c = '#263238';
    trait(ctx, [[x - 0.2 * s, y], [x - 0.15 * s, y - 0.9 * s]], c, 0.14 * s);
    trait(ctx, [[x + 0.2 * s, y], [x + 0.15 * s, y - 0.9 * s]], c, 0.14 * s);
    rect(ctx, x - 0.3 * s, y - 1.6 * s, 0.6 * s, 0.75 * s, c);
    trait(ctx, [[x - 0.32 * s, y - 1.5 * s], [x - 0.45 * s, y - 0.95 * s]], c, 0.1 * s);
    trait(ctx, [[x + 0.32 * s, y - 1.5 * s], [x + 0.45 * s, y - 0.95 * s]], c, 0.1 * s);
    disque(ctx, x, y - 1.8 * s, 0.17 * s, c);
    disque(ctx, x + 0.06 * s, y - 1.82 * s, 0.035 * s, '#ff1744');
  },
  fuseeDamier(ctx, x, y, s) {
    const h = 2.4 * s, w = 0.5 * s;
    for (let k = 0; k < 8; k++) for (let j = 0; j < 2; j++) rect(ctx, x - w + j * w, y - h + k * (h / 10) + h * 0.15, w, h / 10, (k + j) % 2 ? '#f5f5f5' : '#d32f2f');
    ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.moveTo(x - w, y - h * 0.85); ctx.lineTo(x, y - h * 1.05); ctx.lineTo(x + w, y - h * 0.85); ctx.fill();
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sg * w, y - h * 0.35); ctx.lineTo(x + sg * w * 1.9, y); ctx.lineTo(x + sg * w, y - h * 0.05); ctx.fill(); }
  },
  martien(ctx, x, y, s) {
    const v = '#43a047', b = Math.sin(performance.now() / 300) * 0.25;
    trait(ctx, [[x - 0.1 * s, y], [x - 0.1 * s, y - 0.4 * s]], v, 0.08 * s);
    trait(ctx, [[x + 0.1 * s, y], [x + 0.1 * s, y - 0.4 * s]], v, 0.08 * s);
    rect(ctx, x - 0.18 * s, y - 0.85 * s, 0.36 * s, 0.45 * s, v);
    trait(ctx, [[x + 0.18 * s, y - 0.8 * s], [x + 0.5 * s, y - (1.05 + b) * s]], v, 0.07 * s);   // main qui salue
    disque(ctx, x, y - 1.05 * s, 0.2 * s, v);
    trait(ctx, [[x - 0.08 * s, y - 1.2 * s], [x - 0.15 * s, y - 1.45 * s]], v, 0.03 * s);
    trait(ctx, [[x + 0.08 * s, y - 1.2 * s], [x + 0.15 * s, y - 1.45 * s]], v, 0.03 * s);
    disque(ctx, x + 0.07 * s, y - 1.08 * s, 0.04 * s, '#111');
  },
  disqueOr(ctx, x, y, s) {
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.ellipse(x, y - 0.03 * s, 0.32 * s, 0.07 * s, 0, 0, Math.PI * 2); ctx.fill();
    disque(ctx, x, y - 0.03 * s, 0.04 * s, '#6d4c41');
    if (Math.sin(performance.now() / 250) > 0.6) disque(ctx, x - 0.15 * s, y - 0.08 * s, 0.05 * s, '#fff8e1');
  },
  jouetAstronaute(ctx, x, y, s) {
    trait(ctx, [[x - 0.05 * s, y], [x - 0.05 * s, y - 0.12 * s]], '#eceff1', 0.06 * s);
    trait(ctx, [[x + 0.05 * s, y], [x + 0.05 * s, y - 0.12 * s]], '#eceff1', 0.06 * s);
    rect(ctx, x - 0.09 * s, y - 0.26 * s, 0.18 * s, 0.14 * s, '#eceff1');
    trait(ctx, [[x + 0.09 * s, y - 0.24 * s], [x + 0.16 * s, y - 0.4 * s]], '#eceff1', 0.04 * s);   // bras pointé vers le ciel
    disque(ctx, x, y - 0.32 * s, 0.07 * s, '#eceff1');
    disque(ctx, x + 0.02 * s, y - 0.32 * s, 0.045 * s, 'rgba(120,180,255,0.8)');
  },
  distorsion(ctx, x, y, s) {
    const t = performance.now() / 400;
    ctx.strokeStyle = 'rgba(220,235,255,0.35)'; ctx.lineWidth = 0.05 * s;
    ctx.beginPath();
    for (let k = 0; k <= 30; k++) {
      const u = k / 30, yy = y - u * 2.1 * s, l = (u < 0.75 ? 0.25 : 0.15) * s * (1 + 0.15 * Math.sin(t + u * 9));
      if (k === 0) ctx.moveTo(x - l, yy); else ctx.lineTo(x - l, yy);
    }
    for (let k = 30; k >= 0; k--) {
      const u = k / 30, yy = y - u * 2.1 * s, l = (u < 0.75 ? 0.25 : 0.15) * s * (1 + 0.15 * Math.sin(t + u * 9 + 1));
      ctx.lineTo(x + l, yy);
    }
    ctx.stroke();
  },
  chat(ctx, x, y, s) {
    ctx.fillStyle = '#8d8d8d'; ctx.beginPath(); ctx.ellipse(x, y - 0.25 * s, 0.6 * s, 0.25 * s, 0, Math.PI, 0); ctx.fill();   // caillou
    const c = '#e08a3c';
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y - 0.62 * s, 0.14 * s, 0.17 * s, 0, 0, Math.PI * 2); ctx.fill();
    disque(ctx, x + 0.03 * s, y - 0.86 * s, 0.1 * s, c);
    ctx.beginPath(); ctx.moveTo(x - 0.05 * s, y - 0.93 * s); ctx.lineTo(x - 0.02 * s, y - 1.02 * s); ctx.lineTo(x + 0.02 * s, y - 0.94 * s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 0.05 * s, y - 0.94 * s); ctx.lineTo(x + 0.1 * s, y - 1.02 * s); ctx.lineTo(x + 0.12 * s, y - 0.92 * s); ctx.fill();
    trait(ctx, [[x - 0.12 * s, y - 0.5 * s], [x - 0.3 * s, y - 0.48 * s], [x - 0.32 * s, y - 0.62 * s]], c, 0.04 * s);
    disque(ctx, x + 0.07 * s, y - 0.87 * s, 0.015 * s, '#1b5e20');
  },
  pizza(ctx, x, y, s) {
    ctx.fillStyle = '#d9a441'; ctx.beginPath(); ctx.moveTo(x - 0.25 * s, y - 0.02 * s); ctx.lineTo(x + 0.25 * s, y - 0.02 * s); ctx.lineTo(x + 0.05 * s, y - 0.06 * s); ctx.fill();
    ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.moveTo(x - 0.22 * s, y - 0.05 * s); ctx.lineTo(x + 0.22 * s, y - 0.05 * s); ctx.lineTo(x + 0.05 * s, y - 0.09 * s); ctx.fill();
    for (const k of [-0.1, 0.05, 0.14]) disque(ctx, x + k * s, y - 0.07 * s, 0.025 * s, '#c62828');
  },
  monolithe(ctx, x, y, s) {
    rect(ctx, x - 0.55 * s, y - 2.6 * s, 1.1 * s, 2.6 * s, '#050505');
    rect(ctx, x - 0.45 * s, y - 2.5 * s, 0.08 * s, 2.3 * s, 'rgba(255,255,255,0.08)');
  },
  soucoupeVinyle(ctx, x, y, s) {
    const t = performance.now() / 120;
    ctx.fillStyle = '#ab47bc'; ctx.beginPath(); ctx.ellipse(x, y - 0.6 * s - Math.sin(t) * 0.04 * s, 1.1 * s, 0.25 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4dd0e1'; ctx.beginPath(); ctx.arc(x, y - 0.75 * s, 0.45 * s, Math.PI, 0); ctx.fill();
    for (let k = -2; k <= 2; k++) disque(ctx, x + k * 0.38 * s, y - 0.6 * s, 0.06 * s, ['#ffeb3b', '#ff7043', '#66bb6a'][(k + 2 + Math.floor(t)) % 3]);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(x + 1.6 * s, y - 0.02 * s, 0.15 * s, 0.03 * s, 0, 0, Math.PI * 2); ctx.fill();
    disque(ctx, x + 1.6 * s, y - 0.02 * s, 0.02 * s, '#e53935');
  },
  compacteur(ctx, x, y, s) {
    for (let k = 0; k < 4; k++) rect(ctx, x + 0.5 * s, y - (k + 1) * 0.3 * s, 0.3 * s, 0.28 * s, '#8d8d8d');
    rect(ctx, x - 0.3 * s, y - 0.18 * s, 0.6 * s, 0.18 * s, '#5d4037');
    rect(ctx, x - 0.25 * s, y - 0.6 * s, 0.5 * s, 0.42 * s, '#c9a227');
    trait(ctx, [[x, y - 0.6 * s], [x, y - 0.75 * s]], '#616161', 0.05 * s);
    disque(ctx, x - 0.07 * s, y - 0.8 * s, 0.07 * s, '#9e9e9e'); disque(ctx, x + 0.07 * s, y - 0.8 * s, 0.07 * s, '#9e9e9e');
  },
  licorne(ctx, x, y, s) {
    rect(ctx, x - 1.2 * s, y - 1.8 * s, 2.4 * s, 1.8 * s, 'rgba(180,225,255,0.45)');
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.03 * s; ctx.strokeRect(x - 1.2 * s, y - 1.8 * s, 2.4 * s, 1.8 * s);
    const b = '#fafafa';
    ctx.fillStyle = b; ctx.beginPath(); ctx.ellipse(x, y - 0.95 * s, 0.55 * s, 0.25 * s, 0, 0, Math.PI * 2); ctx.fill();
    trait(ctx, [[x - 0.35 * s, y - 0.8 * s], [x - 0.55 * s, y - 0.25 * s]], b, 0.1 * s);
    trait(ctx, [[x + 0.35 * s, y - 0.8 * s], [x + 0.65 * s, y - 0.4 * s]], b, 0.1 * s);   // en plein galop
    trait(ctx, [[x + 0.45 * s, y - 1.05 * s], [x + 0.7 * s, y - 1.45 * s]], b, 0.14 * s);
    disque(ctx, x + 0.78 * s, y - 1.45 * s, 0.13 * s, b);
    trait(ctx, [[x + 0.82 * s, y - 1.55 * s], [x + 0.95 * s, y - 1.75 * s]], '#ffd54f', 0.04 * s);   // corne
    // Origami : petite licorne de papier plié.
    ctx.fillStyle = '#eeeeee';
    ctx.beginPath(); ctx.moveTo(x + 1.5 * s, y); ctx.lineTo(x + 1.62 * s, y - 0.12 * s); ctx.lineTo(x + 1.75 * s, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 1.62 * s, y - 0.12 * s); ctx.lineTo(x + 1.7 * s, y - 0.22 * s); ctx.lineTo(x + 1.68 * s, y - 0.1 * s); ctx.fill();
  },
  coeur(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(250,240,225,0.75)';
    ctx.beginPath(); ctx.ellipse(x - 6 * s, y - 0.05 * s, 9 * s, 0.25 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 6 * s, y - 0.05 * s, 9 * s, 0.25 * s, 0, 0, Math.PI * 2); ctx.fill();
  },
  robotCri(ctx, x, y, s) {
    const c = '#b0bec5';
    trait(ctx, [[x - 0.1 * s, y], [x - 0.1 * s, y - 0.3 * s]], c, 0.08 * s);
    trait(ctx, [[x + 0.1 * s, y], [x + 0.1 * s, y - 0.3 * s]], c, 0.08 * s);
    rect(ctx, x - 0.2 * s, y - 0.7 * s, 0.4 * s, 0.4 * s, c);
    trait(ctx, [[x - 0.2 * s, y - 0.65 * s], [x - 0.42 * s, y - 1.05 * s]], c, 0.06 * s);   // bras levés
    trait(ctx, [[x + 0.2 * s, y - 0.65 * s], [x + 0.42 * s, y - 1.05 * s]], c, 0.06 * s);
    rect(ctx, x - 0.18 * s, y - 1.05 * s, 0.36 * s, 0.32 * s, c);
    disque(ctx, x - 0.07 * s, y - 0.96 * s, 0.03 * s, '#263238'); disque(ctx, x + 0.07 * s, y - 0.96 * s, 0.03 * s, '#263238');
    ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.ellipse(x, y - 0.82 * s, 0.06 * s, 0.07 * s, 0, 0, Math.PI * 2); ctx.fill();   // bouche ouverte
  },
  serviette(ctx, x, y, s) {
    const h = y - (0.5 + Math.sin(performance.now() / 700) * 0.08) * s;
    for (let k = 0; k < 5; k++) rect(ctx, x - 0.4 * s, h - 0.6 * s + k * 0.12 * s, 0.8 * s, 0.12 * s, k % 2 ? '#fff59d' : '#4fc3f7');
  },
  anneauGardien(ctx, x, y, s) {
    ctx.strokeStyle = '#8d8478'; ctx.lineWidth = 0.45 * s;
    ctx.beginPath(); ctx.arc(x, y + 0.8 * s, 2.6 * s, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.strokeStyle = '#6d655b'; ctx.lineWidth = 0.08 * s;
    for (let k = 0; k < 7; k++) { const a = Math.PI * (1.12 + k * 0.12); ctx.beginPath(); ctx.arc(x, y + 0.8 * s, 2.6 * s, a, a + 0.02); ctx.stroke(); }
    // Le gardien : chauve, peau brune, emblème doré sur le front, un bâton.
    const gx = x + 3.3 * s, peau = '#6d4c3d', tenue = '#3e3e3e';
    trait(ctx, [[gx - 0.1 * s, y], [gx - 0.1 * s, y - 0.9 * s]], tenue, 0.16 * s);
    trait(ctx, [[gx + 0.1 * s, y], [gx + 0.1 * s, y - 0.9 * s]], tenue, 0.16 * s);
    rect(ctx, gx - 0.25 * s, y - 1.6 * s, 0.5 * s, 0.75 * s, tenue);
    trait(ctx, [[gx + 0.35 * s, y], [gx + 0.35 * s, y - 2.1 * s]], '#5d4037', 0.06 * s);
    trait(ctx, [[gx + 0.25 * s, y - 1.45 * s], [gx + 0.35 * s, y - 1.2 * s]], peau, 0.09 * s);
    disque(ctx, gx, y - 1.8 * s, 0.18 * s, peau);
    disque(ctx, gx + 0.08 * s, y - 1.88 * s, 0.045 * s, '#ffc400');               // emblème doré
    trait(ctx, [[gx + 0.08 * s, y - 1.8 * s], [gx + 0.15 * s, y - 1.83 * s]], '#2b1d16', 0.02 * s);   // sourcil levé
  },
  soucoupeNounours(ctx, x, y, s) {
    ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.ellipse(x, y - 0.15 * s, 0.32 * s, 0.08 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#42a5f5'; ctx.beginPath(); ctx.arc(x, y - 0.2 * s, 0.13 * s, Math.PI, 0); ctx.fill();
    const o = '#a1887f', ox = x + 0.6 * s;
    disque(ctx, ox, y - 0.1 * s, 0.1 * s, o);
    disque(ctx, ox, y - 0.26 * s, 0.08 * s, o);
    disque(ctx, ox - 0.06 * s, y - 0.33 * s, 0.03 * s, o); disque(ctx, ox + 0.06 * s, y - 0.33 * s, 0.03 * s, o);
  },
  palaisGlace(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(200,235,255,0.6)';
    for (const [dx, h, w] of [[-1.6, 2.4, 0.5], [-0.8, 3.6, 0.6], [0, 4.6, 0.7], [0.8, 3.4, 0.6], [1.6, 2.2, 0.5]]) {
      ctx.beginPath(); ctx.moveTo(x + (dx - w) * s, y); ctx.lineTo(x + dx * s, y - h * s); ctx.lineTo(x + (dx + w) * s, y); ctx.fill();
    }
    ctx.fillStyle = 'rgba(220,240,255,0.9)';
    ctx.beginPath(); ctx.moveTo(x + 2.4 * s, y); ctx.lineTo(x + 2.55 * s, y - 1.1 * s); ctx.lineTo(x + 2.7 * s, y); ctx.fill();
    ctx.fillStyle = '#c62828';
    ctx.beginPath(); ctx.moveTo(x + 2.48 * s, y - 0.9 * s); ctx.lineTo(x + 2.62 * s, y - 0.9 * s); ctx.lineTo(x + 2.75 * s, y - 0.25 * s); ctx.lineTo(x + 2.35 * s, y - 0.25 * s); ctx.fill();
  },
  capsuleRouge(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y - 0.6 * s); ctx.rotate(0.25);
    ctx.fillStyle = '#c62828'; ctx.beginPath(); ctx.ellipse(0, 0, 1.1 * s, 0.55 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,210,255,0.7)'; ctx.beginPath(); ctx.ellipse(0.25 * s, -0.25 * s, 0.45 * s, 0.25 * s, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 0.04 * s;
    ctx.beginPath(); ctx.moveTo(-0.6 * s, 0.1 * s); ctx.lineTo(-0.3 * s, 0.25 * s); ctx.lineTo(-0.5 * s, 0.35 * s); ctx.stroke();   // cabossée
    ctx.restore();
  },
  semelle(ctx, x, y, s) {
    // Une falaise, et dessus l'empreinte géante d'une botte de cow-boy.
    ctx.fillStyle = '#6f6a63'; ctx.beginPath(); ctx.moveTo(x - 3 * s, y); ctx.lineTo(x - 2.6 * s, y - 6 * s); ctx.lineTo(x + 2.8 * s, y - 6.4 * s); ctx.lineTo(x + 3 * s, y); ctx.fill();
    ctx.fillStyle = '#3e3a35';
    ctx.beginPath(); ctx.ellipse(x, y - 4 * s, 0.9 * s, 1.6 * s, 0.15, 0, Math.PI * 2); ctx.fill();       // semelle
    ctx.beginPath(); ctx.ellipse(x + 0.25 * s, y - 1.8 * s, 0.6 * s, 0.55 * s, 0.15, 0, Math.PI * 2); ctx.fill();   // talon
  },
  infini(ctx, x, y, s) {
    rect(ctx, x - 0.8 * s, y - 1.2 * s, 1.6 * s, 1.2 * s, '#77706a');
    ctx.strokeStyle = '#e8e2d8'; ctx.lineWidth = 0.06 * s;
    for (const dy of [-0.85, -0.45]) {
      ctx.beginPath(); ctx.ellipse(x - 0.2 * s, y + dy * s, 0.2 * s, 0.12 * s, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + 0.2 * s, y + dy * s, 0.2 * s, 0.12 * s, 0, 0, Math.PI * 2); ctx.stroke();
    }
  },
  oeuf(ctx, x, y, s) {
    ctx.fillStyle = '#6d5c4a'; ctx.beginPath(); ctx.ellipse(x, y - 0.45 * s, 0.32 * s, 0.45 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2018';
    ctx.beginPath(); ctx.moveTo(x - 0.25 * s, y - 0.75 * s); ctx.lineTo(x, y - 0.6 * s); ctx.lineTo(x + 0.25 * s, y - 0.75 * s); ctx.lineTo(x, y - 0.9 * s); ctx.fill();   // ouvert en quatre
    ctx.strokeStyle = '#4e4134'; ctx.lineWidth = 0.02 * s;
    for (const k of [-0.15, 0, 0.15]) { ctx.beginPath(); ctx.moveTo(x + k * s, y - 0.05 * s); ctx.lineTo(x + k * 0.6 * s, y - 0.55 * s); ctx.stroke(); }
  },
  mainLevee(ctx, x, y, s) {
    rect(ctx, x - 0.12 * s, y - 0.9 * s, 0.24 * s, 0.9 * s, '#8d8478');                 // socle
    const c = '#d7ccc8', b = y - 0.9 * s;
    rect(ctx, x - 0.18 * s, b - 0.3 * s, 0.36 * s, 0.3 * s, c);                            // paume
    // Doigts en deux paires, écartés au milieu.
    for (const [dx, h] of [[-0.17, 0.32], [-0.08, 0.36], [0.08, 0.36], [0.17, 0.32]]) rect(ctx, x + dx * s - 0.035 * s + (dx < 0 ? -0.03 : 0.03) * s, b - 0.3 * s - h * s, 0.07 * s, h * s, c);
    rect(ctx, x + 0.18 * s, b - 0.22 * s, 0.14 * s, 0.07 * s, c);                          // pouce
  },
  cinqLumieres(ctx, x, y, s) {
    // Ahuna Mons : une montagne solitaire au sommet plat, et cinq lumières qui s'allument à tour de rôle.
    ctx.fillStyle = '#6e6862';
    ctx.beginPath(); ctx.moveTo(x - 9 * s, y); ctx.lineTo(x - 4 * s, y - 9 * s); ctx.lineTo(x + 4 * s, y - 9.3 * s); ctx.lineTo(x + 9 * s, y); ctx.fill();
    const couleurs = ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'];
    const k = Math.floor(performance.now() / 450) % 6;
    couleurs.forEach((c, i) => disque(ctx, x + (i - 2) * 1.4 * s, y - 0.6 * s, 0.35 * s, i === k ? c : 'rgba(255,255,255,0.15)'));
  },
  tripode(ctx, x, y, s) {
    for (let k = -8; k <= 8; k++) trait(ctx, [[x + k * 0.6 * s, y], [x + (k * 0.6 + 0.15) * s, y - (0.4 + (k % 3) * 0.15) * s]], '#b71c1c', 0.06 * s);   // herbe rouge
    const r = '#7b4a2e';
    trait(ctx, [[x - 4 * s, y], [x - 1 * s, y - 1.6 * s]], r, 0.25 * s);
    trait(ctx, [[x + 1.5 * s, y], [x - 0.6 * s, y - 1.4 * s]], r, 0.25 * s);
    trait(ctx, [[x + 4.5 * s, y - 0.1 * s], [x + 0.5 * s, y - 1.5 * s]], r, 0.25 * s);
    ctx.fillStyle = '#8d5a3a'; ctx.beginPath(); ctx.ellipse(x - 0.3 * s, y - 1.7 * s, 2 * s, 0.9 * s, -0.25, 0, Math.PI * 2); ctx.fill();   // coque couchée
    disque(ctx, x + 1.2 * s, y - 2 * s, 0.25 * s, '#3e2a1e');
  },
  cabane(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(160,190,170,0.35)'; ctx.beginPath(); ctx.ellipse(x, y - 1 * s, 4 * s, 1.2 * s, 0, 0, Math.PI * 2); ctx.fill();   // brume
    ctx.fillStyle = '#5d6b4e'; ctx.beginPath(); ctx.ellipse(x, y - 0.7 * s, 1.1 * s, 0.8 * s, 0, Math.PI, 0); ctx.fill();
    disque(ctx, x + 0.2 * s, y - 0.35 * s, 0.25 * s, '#2b2b1e');
    disque(ctx, x - 0.45 * s, y - 0.75 * s, 0.1 * s, '#ffcc66');                         // fenêtre éclairée
  },
  fermier(ctx, x, y, s) {
    disque(ctx, x - 2.5 * s, y - 3.2 * s, 0.35 * s, '#ffcf6a'); disque(ctx, x - 1.6 * s, y - 2.9 * s, 0.25 * s, '#ffb36a');   // deux soleils bas
    const c = '#d9c9a8';
    trait(ctx, [[x - 0.08 * s, y], [x - 0.08 * s, y - 0.8 * s]], c, 0.12 * s);
    trait(ctx, [[x + 0.08 * s, y], [x + 0.08 * s, y - 0.8 * s]], c, 0.12 * s);
    rect(ctx, x - 0.2 * s, y - 1.45 * s, 0.4 * s, 0.65 * s, '#ece3d0');
    disque(ctx, x, y - 1.65 * s, 0.15 * s, '#c8a27a');
  },
  citesNuages(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const [dx, dy] of [[-3, 9], [0, 11], [3.5, 8.5]]) { ctx.beginPath(); ctx.ellipse(x + dx * s, y - dy * s, 2.2 * s, 0.5 * s, 0, 0, Math.PI * 2); ctx.fill(); }
    for (const [dx, dy, h] of [[-3, 9, 2], [0, 11, 3], [3.5, 8.5, 1.6]]) {
      rect(ctx, x + (dx - 0.5) * s, y - (dy + h) * s, 1 * s, h * s, '#d7dbe0');
      ctx.fillStyle = '#b0b6bd'; ctx.beginPath(); ctx.ellipse(x + dx * s, y - dy * s, 1.3 * s, 0.25 * s, 0, 0, Math.PI); ctx.fill();
    }
  },
  cantine(ctx, x, y, s) {
    ctx.fillStyle = '#b89a72'; ctx.beginPath(); ctx.ellipse(x, y, 3 * s, 2.2 * s, 0, Math.PI, 0); ctx.fill();
    rect(ctx, x - 0.5 * s, y - 1.3 * s, 1 * s, 1.3 * s, '#3b2f22');
    const p = '#3e3a36', g = '#8a5a35';
    trait(ctx, [[x + 3.6 * s, y], [x + 3.6 * s, y - 0.9 * s]], p, 0.14 * s);
    rect(ctx, x + 3.4 * s, y - 1.6 * s, 0.4 * s, 0.7 * s, p); disque(ctx, x + 3.6 * s, y - 1.8 * s, 0.16 * s, p);   // chasseur de primes
    rect(ctx, x + 4.3 * s, y - 2.3 * s, 0.7 * s, 2.3 * s, g); disque(ctx, x + 4.65 * s, y - 2.5 * s, 0.3 * s, g);   // grand compagnon poilu
  },
  villagesArbres(ctx, x, y, s) {
    for (const dx of [-3, 0, 3.2]) {
      rect(ctx, x + (dx - 0.4) * s, y - 9 * s, 0.8 * s, 9 * s, '#5d4030');
      disque(ctx, x + dx * s, y - 9.5 * s, 2.2 * s, '#2e5a2e');
      rect(ctx, x + (dx - 1.2) * s, y - 5 * s, 2.4 * s, 0.25 * s, '#7a5a3a');
      ctx.fillStyle = '#6b4b2b'; ctx.beginPath(); ctx.moveTo(x + (dx - 0.8) * s, y - 5 * s); ctx.lineTo(x + dx * s, y - 6 * s); ctx.lineTo(x + (dx + 0.8) * s, y - 5 * s); ctx.fill();
    }
  },
  plaineGelee(ctx, x, y, s) {
    rect(ctx, x - 6 * s, y - 0.25 * s, 12 * s, 0.25 * s, '#eef4f8');
    rect(ctx, x - 4 * s, y - 0.5 * s, 2.5 * s, 0.3 * s, '#9aa7b0');                     // tranchée
    for (const k of [0, 1, 2]) rect(ctx, x + (1 + k * 1.8) * s, y - 0.12 * s, 0.9 * s, 0.1 * s, 'rgba(60,70,80,0.6)');   // empreintes géantes
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.03 * s;
    const t = (performance.now() / 15) % (3 * s);
    for (let k = -12; k <= 12; k++) { ctx.beginPath(); ctx.moveTo(x + k * 0.5 * s - t, y - 3 * s + k * 0.1 * s); ctx.lineTo(x + k * 0.5 * s - t - 0.6 * s, y - 2.9 * s + k * 0.1 * s); ctx.stroke(); }
  },
  longCou(ctx, x, y, s) {
    const c = '#8d6e63';
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y - 0.25 * s, 0.25 * s, 0.25 * s, 0, 0, Math.PI * 2); ctx.fill();
    trait(ctx, [[x + 0.05 * s, y - 0.45 * s], [x + 0.1 * s, y - 0.9 * s]], c, 0.07 * s);
    ctx.beginPath(); ctx.ellipse(x + 0.16 * s, y - 0.98 * s, 0.14 * s, 0.1 * s, 0, 0, Math.PI * 2); ctx.fill();
    const lueur = 0.5 + 0.5 * Math.sin(performance.now() / 500);
    disque(ctx, x + 0.12 * s, y - 0.7 * s, 0.05 * s, `rgba(255,120,80,${0.4 + 0.5 * lueur})`);
  },
  villePluie(ctx, x, y, s) {
    for (const [dx, h, w] of [[-4, 7, 2], [-1.5, 10, 2.2], [1.2, 6, 1.8], [3.6, 8.5, 2]]) {
      rect(ctx, x + dx * s, y - h * s, w * s, h * s, '#121417');
      rect(ctx, x + (dx + 0.3) * s, y - (h - 1) * s, (w - 0.6) * s, 0.12 * s, '#ff1744');
    }
    ctx.strokeStyle = 'rgba(20,20,25,0.7)'; ctx.lineWidth = 0.02 * s;
    const t = (performance.now() / 20) % (2 * s);
    for (let k = -30; k <= 30; k++) { const px = x + k * 0.3 * s; ctx.beginPath(); ctx.moveTo(px, y - 11 * s + t); ctx.lineTo(px - 0.1 * s, y - 10.5 * s + t); ctx.stroke(); }
  },
};
