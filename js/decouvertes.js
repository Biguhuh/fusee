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
    texte: 'Un tripode géant, rouillé, affaissé sur ses trois longues jambes au milieu d’une herbe rouge. Ses pilotes ont été tués par les bactéries de la Terre : les plus petits de ses habitants ont gagné la guerre.' },
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
  // Men in Black : trois clins d'œil.
  { id: 'umbriel-flash', astre: 'l702', dx: 320, dessin: 'neuraliseur', flash: true,
    texte: 'Un petit appareil argenté, une lumière rouge au bout. Quelqu’un en costume noir vous a demandé de bien regarder par ici. Et puis… plus rien.' },
  { id: 'pallas-galaxie', astre: 'a2', dx: 300, dessin: 'billeGalaxie',
    texte: 'Au cou du chat, une petite bille brille. À l’intérieur tourne une galaxie entière. Le chat n’a pas l’air de s’en soucier.' },
  { id: 'junon-casier', astre: 'a3', dx: 260, dessin: 'casier',
    texte: 'Un casier de consigne, la porte entrouverte. À l’intérieur, une civilisation minuscule vénère celui qui détient la clé. Vous n’avez pas la clé.' },
  // Interstellar : trois clins d'œil (dont la vague, sur TRAPPIST-1 f, au-dessus de laquelle passe aussi le paquebot).
  { id: 'hyperion-bibli', astre: 'l607', dx: -280, dessin: 'bibliotheque',
    texte: 'Une étagère pleine de livres, plantée dans la poussière. Des livres tombent, un par un, toujours les mêmes. Quelqu’un, de l’autre côté, essaie de dire : reste.' },
  { id: 'trappist-vague', astre: 'trappist1_p5', dx: -600, dessin: 'vague',
    texte: 'À l’horizon, une vague haute comme une montagne avance sans bruit. Ici, une heure vaut sept ans ailleurs. Ne traînez pas.' },
  { id: 'mimas-robot', astre: 'l601', dx: 340, dessin: 'robotBlocs',
    texte: 'Un robot fait de quatre blocs gris articulés vous observe. Son réglage d’humour est à 75 %. Il trouve votre atterrissage perfectible.' },
  // Classiques de la science-fiction dans l'espace.
  { id: 'mars-patates', astre: 'mars', dx: 650, dessin: 'patates',
    texte: 'Sous une bâche, un carré de pommes de terre pousse dans le sol martien. À côté, une pile de disques disco. Quelqu’un a dû s’ennuyer ici, très longtemps.' },
  { id: 'barnard-ver', astre: 'barnard_p2', dx: 400, dessin: 'ondulation',
    texte: 'Le sable ondule, comme si quelque chose de gigantesque nageait dessous. Puis plus rien. Conseil : marchez sans rythme.' },
  { id: 'hygie-prince', astre: 'a10', dx: 220, dessin: 'asteroidePrince',
    texte: 'Trois volcans hauts comme un genou, dont un éteint. Une rose sous un globe de verre. Et des pousses de baobab, à arracher chaque matin.' },
  { id: 'ariel-solaris', astre: 'l701', dx: -320, dessin: 'silhouetteFamiliere', solaris: true,
    texte: 'Sur la glace, une silhouette familière vous attend, immobile : quelqu’un que vous avez perdu. Elle ne devrait pas être là. Elle sourit.' },
  { id: 'psyche-cabine', astre: 'a16', dx: 300, dessin: 'cabineBleue',
    texte: 'Une cabine de police bleue, plantée sur le métal. La porte est entrouverte : à l’intérieur, c’est beaucoup plus grand. Un bruit de moteur asthmatique, et elle n’est plus là.' },
  { id: 'oberon-kerbal', astre: 'oberon', dx: 260, dessin: 'petitVert',
    texte: 'Un petit bonhomme vert, casqué, grand sourire, assis à côté d’une fusée en pièces détachées. Il veut recommencer. Avec plus de propulseurs.' },
  { id: 'nereide-nono', astre: 'l802', dx: 200, dessin: 'robotRond',
    texte: 'Un petit robot rond aux grands yeux grignote un boulon. Il cherche un garçon et son père, perdus loin de la Terre, avec des dieux en colère à leurs trousses.' },
  { id: 'protee-feu', astre: 'l808', dx: -200, dessin: 'feuDeCamp',
    texte: 'Un feu de camp crépite, sans air (allez savoir comment). Une guimauve grille au bout d’un bâton. Dans 22 minutes, tout recommencera.' },
  { id: 'io-aliens', astre: 'io', dx: 520, dessin: 'aliensTroisYeux',
    texte: 'Trois petits extraterrestres verts à trois yeux regardent le ciel, tout près de la pizza. Ils attendent le grappin, ils l’ont élu.' },
  { id: 'callisto-plante', astre: 'callisto', dx: -360, dessin: 'planteBotte',
    texte: 'Dans une vieille botte, une petite pousse verte. Le robot qui empile les cubes la protège : c’est la seule chose vivante à des millions de kilomètres.' },
  { id: 'eunomie-kryptonite', astre: 'a15', dx: 280, dessin: 'caillouVert',
    texte: 'Un caillou vert qui luit doucement. Personne de l’équipage ne se sent mal en le ramassant. Un certain héros à cape, lui, l’éviterait.' },
  // Indiana Jones 4, Transformers, Thor.
  { id: 'tethys-frigo', astre: 'l603', dx: 240, dessin: 'frigo',
    texte: 'Un vieux réfrigérateur doublé de plomb, cabossé, porte grande ouverte. Quelqu’un a survécu à une explosion atomique là-dedans, paraît-il.' },
  { id: 'phoebe-crane', astre: 'l609', dx: -200, dessin: 'craneCristal',
    texte: 'Un crâne de cristal au front très allongé, posé sur la poussière noire. Il vous attire, et vous n’arrivez plus à détourner les yeux.' },
  { id: 'lune-arche', astre: 'lune', dx: 2000, dessin: 'arche',
    texte: 'Un immense vaisseau de métal, écrasé ici depuis des millénaires. Des traces de pas de 1969 en font le tour. Personne n’en a jamais parlé.' },
  { id: 'interamnia-cube', astre: 'a704', dx: 300, dessin: 'cube',
    texte: 'Un cube de métal gros comme une maison, couvert de symboles inconnus. Il bourdonne. Quand on s’en approche, les machines de l’équipage s’agitent toutes seules.' },
  { id: 'dione-marteau', astre: 'l604', dx: 260, dessin: 'marteau',
    texte: 'Un marteau à manche court, planté dans la glace. Toute l’équipe tire dessus : il ne bouge pas d’un millimètre. Personne ici n’en est digne, il faut croire.' },
  // One Piece et Battlestar Galactica.
  { id: 'tauceti-chapeau', astre: 'tauceti_p3', dx: 280, dessin: 'chapeauPaille',
    texte: 'Un chapeau de paille au ruban rouge, posé sur un rocher. Son propriétaire a juré de devenir le roi des pirates. Il reviendra le chercher.' },
  { id: 'barnard-cylon', astre: 'barnard_p3', dx: -300, dessin: 'cylon',
    texte: 'Un robot chromé dont l’œil rouge balaie l’horizon, de gauche à droite, sans fin. Ils sont nombreux. Ils ont un plan.' },
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
    texte: 'Derrière la Lune, le vaisseau-mère, grand comme un pays, attend le 4 juillet. Quelqu’un lui a déjà envoyé un virus.' },
  { id: 'saturne', astre: 'saturne', titre: 'Space Oddity',
    texte: 'Une capsule vide dérive. Personne n’a répondu depuis longtemps.' },
  { id: 'soleil-sunshine', astre: 'soleil',
    texte: 'Un vaisseau au grand bouclier doré, figé face au Soleil. Il devait le rallumer. Personne ne répond.' },
  { id: 'jupiter-albator', astre: 'jupiter',
    texte: 'Un vaisseau noir, frappé d’une tête de mort, croise en silence dans les tempêtes de Jupiter. Son capitaine balafré ne salue personne : il ne sert que la liberté.' },
  { id: 'neptune-eventhorizon', astre: 'neptune',
    texte: 'Un vaisseau abandonné dérive dans les nuages de Neptune, son grand anneau de propulsion encore tiède. À bord, un enregistrement en latin. Mieux vaut ne pas monter à bord.' },
  { id: 'uranus-goldorak', astre: 'uranus',
    texte: 'Un grand robot à cornes jaillit d’une soucoupe, fend les nuages, et disparaît. Quelqu’un a crié : « Fulguropoing ! »' },
  { id: 'pluton-unicron', astre: 'pluton',
    texte: 'Une planète de métal passe près de Pluton. Elle a des yeux, des cornes, et une bouche immense. Elle a l’air d’avoir faim.' },
  { id: 'aegir-navire', astre: 'epseri_p1',
    texte: 'Un trois-mâts à tête de lion vogue entre les nuages d’Ægir, le dieu de la mer. Sur la voile, une tête de mort coiffée d’un chapeau de paille. L’équipage chante.' },
  { id: 'mars-galactica', astre: 'mars',
    texte: 'Un vaisseau de guerre gris, long comme une ville, escorte une flotte de fortune. Ils cherchent une planète nommée Terre. Elle est juste à côté. Personne n’ose le leur dire.' },
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

// Rendez-vous avec Rama : un immense cylindre traverse le Système solaire. L'équipage le croise en route,
// en orbite autour du Soleil, au-delà de 3 UA.
const EGG_RAMA = { id: 'rama', astre: 'soleil', texte: 'Un cylindre immense, long de cinquante kilomètres, traverse le Système solaire sans un regard pour vous. Il vient de loin et repart vers plus loin.' };
function verifierRama(orb) {
  const v = orb.v;
  if (SYSTEME.id !== 'solaire' || eggTrouve(EGG_RAMA.id) || !v.orb || v.orb.centre !== 'soleil') return;
  if (typeof survivants === 'function' && v.equipe && !survivants(v).length) return;
  if (V.norm(orb.absolu(v.orb)) < 3 * UA_KM) return;
  etat.decouvertes = etat.decouvertes || {};
  etat.decouvertes[EGG_RAMA.id] = { astre: 'soleil', quand: v.t, par: 'l’équipage de l’orbiteur' };
  regArtefactBord(v, EGG_RAMA.id);
  orb.log(`✨ Croisé en route : ${EGG_RAMA.texte}`);
  sauver(etat);
}

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
  regArtefactBord(v, e.id);
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
// Vraie taille (4 m, 1,3 t) : on ne tourne pas autour, on la rejoint (rendez-vous) dans une zone de 5 000 km,
// puis on la capture et on l'équipe d'un propulseur solaire qui l'envoie dans le Soleil.
CATEGORIES.objet = { nom: 'Objet artificiel', icone: '🛰', def: 'Objet fabriqué sur Terre et envoyé dans l’espace : télescopes, sondes… et une voiture.' };
const G_KM = 6.674e-20;   // constante de la gravitation en km³/(kg·s²)
(function creerVoiture() {
  if (ASTRES_PAR_ID.roadster) return;
  const a = astreGenerique({
    id: 'roadster', nom: 'Voiture rouge', parent: null, rayonKm: 0.002, gm: 1300 * G_KM, distanceUA: 1.325, famille: 'ceinture',
    surface: 'carrosserie rouge',
    note: 'Une vraie voiture de sport, lancée le 6 février 2018 par le premier vol de la Falcon Heavy, un mannequin en combinaison au volant. Aucun instrument scientifique : une démonstration et une opération publicitaire. Elle tourne autour du Soleil entre 0,99 et 1,66 UA.',
  });
  Object.assign(a, {
    type: 'objet', artificiel: true, gm: 1300 * G_KM, systeme: 'solaire', grosse: true, categorie: 'objet',
    taille: '4 m de long (voiture de sport décapotable)', tailleCourte: '4 m', masseKg: 1300,
    exploitant: 'une entreprise privée (démonstration publicitaire)', lancement: '6 février 2018, premier vol de la Falcon Heavy',
    etatObjet: 'à la dérive, sans instrument ni moteur', ouOrbite: 'entre 0,99 et 1,66 UA du Soleil',
    couleurs: { sol: '#c62828', ciel: '#000000', disque: '#e53935' },
    orbite: { centre: 'soleil', a: 1.325 * UA_KM, e: 0.256, varpi: 134.5, M0: 228.5, n: 360 / 557, retro: false, periodeJours: 557 },
    soi: 5000, soiReelle: 5000,
  });
  ASTRES.push(a);
  ASTRES_PAR_ID[a.id] = a;
  (ENFANTS.soleil = ENFANTS.soleil || []).push(a);
})();

// Propulseur solaire (campagne.js) : proposé à l'atelier une fois la voiture découverte.
function astreMasque(a) { return !!(a.id === 'roadster' && voitureEtape(2)); }
// Rendez-vous fait : à quelques km de l'objet, vitesse relative presque nulle.
function aCoteDe(v, id) { return v.orb && v.orb.centre === id && V.norm(v.orb.r) < 20 && V.norm(v.orb.v) < 0.01; }
function recetteVisible(cle, st) {
  if (cle === 'lanceurRetour') return !!AEROSTAT[st.centre];
  // Le propulseur solaire est à préparer avant d'aller à la voiture : proposé tant qu'elle tourne encore.
  if (cle === 'propulseurs') return !voitureEtape(2) && SYSTEME.id === 'solaire';
  return true;
}

const TEXTE_ISS_WOLOWITZ = 'Dans un casier de l’ISS : une ceinture de cosmonaute bricolée, un jeu de rôle, et une lettre de sa mère. Un ingénieur de fiction a séjourné ici, et s’en plaint encore.';
const TEXTES_VOITURE = {
  1: 'Une voiture de sport en orbite autour du Soleil. Aucun instrument scientifique, beaucoup de publicité.',
  2: 'Amarrage à la voiture, propulseur solaire installé : le déchet vaniteux part vers son funeste rendez-vous avec le Soleil.',
  3: '2,21 gigowatts reçus. Le déchet vaniteux est bien cuit.',
};
// Où en est la voiture dans cette campagne (1 vue, 2 envoyée vers le Soleil, 3 incinérée). Les easter eggs,
// eux, restent trouvés d'une campagne à l'autre. Partie d'avant : on part des easter eggs déjà trouvés.
function voitureEtape(n) {
  const v = typeof etat !== 'undefined' && etat.voyage;
  if (!v) return eggTrouve('voiture-' + n);
  if (!v.voitureEtapes) v.voitureEtapes = { 1: eggTrouve('voiture-1'), 2: eggTrouve('voiture-2'), 3: eggTrouve('voiture-3') };
  return !!v.voitureEtapes[n];
}
function etapeVoiture(n, orb) {
  orb.v.voitureEtapes = orb.v.voitureEtapes || {};
  orb.v.voitureEtapes[n] = true;
  etat.decouvertes = etat.decouvertes || {};
  etat.decouvertes['voiture-' + n] = { astre: 'roadster', quand: orb.v.t, par: 'l’équipage de l’orbiteur' };
  regArtefactBord(orb.v, 'voiture-' + n);
  orb.log(`${n === 3 ? '☀️' : '🚗'} ${TEXTES_VOITURE[n]}`);
  sauver(etat);
}
// Appelé à chaque avancée du temps de l'orbiteur.
function verifierVoiture(orb) {
  const v = orb.v;
  if (v.orb && v.orb.centre === 'roadster' && !voitureEtape(1)) etapeVoiture(1, orb);
  if (v.voiture && v.voiture.etat === 'chute' && v.t >= v.voiture.fin) {
    v.voiture = { etat: 'incineree' };
    etapeVoiture(3, orb);
  }
}
// Boutons du panneau d'actions de l'orbiteur.
function actionsVoiture(orb) {
  const v = orb.v;
  if (SYSTEME.id !== 'solaire' || voitureEtape(3)) return '';
  if (v.voiture && v.voiture.etat === 'chute') return `<p class="doux">☀️ La voiture tombe vers le Soleil : arrivée dans ${fmtDuree(v.voiture.fin - v.t)}.</p>`;
  if (v.orb.centre === 'roadster' && !voitureEtape(2)) {
    if (!aCoteDe(v, 'roadster')) return '<p class="doux">🚗 La voiture est dans la zone de rendez-vous : approchez-vous à quelques km et annulez la vitesse relative (cible « Voiture rouge », assistant ou pilote auto) pour vous y amarrer.</p>';
    if (!v.propulseurs) return '<p class="doux">🚗 À côté de la voiture, mais pas de propulseur solaire à bord : impossible de l’envoyer dans le Soleil. Il se fabrique à l’atelier d’une station, et se charge en s’amarrant à la station.</p>';
    return '<button id="nav-voiture" class="principal">🔗 S’amarrer à la voiture et l’envoyer dans le Soleil (propulseur solaire)</button>';
  }
  // Ancienne partie : voiture capturée à bord, en attente de son propulseur.
  if (v.voiture && v.voiture.etat === 'a_bord') {
    if (!v.propulseurs) return '<p class="doux">🚗 La voiture est à bord. Il faut un propulseur solaire (atelier d’une station, puis amarrage) pour l’envoyer dans le Soleil.</p>';
    return '<button id="nav-voiture" class="principal">☀️ Lancer la voiture vers le Soleil (propulseur)</button>';
  }
  return '';
}
// Amarrage à la voiture : on y installe le propulseur solaire (ionique, environ 18 km/s), qui annule sa vitesse
// orbitale ; elle tombe presque en ligne droite vers le Soleil, en (π/2)·√(r³ / 2GM). La voiture n'existe plus
// sur la carte ; l'orbiteur, désamarré, reste là où elle était (autour du Soleil).
function actionVoiture(orb) {
  const v = orb.v;
  const lancer = (r) => {
    v.propulseurs -= 1;
    const duree = (Math.PI / 2) * Math.sqrt(Math.pow(r, 3) / (2 * GM_SOLEIL));
    v.voiture = { etat: 'chute', fin: v.t + duree };
    orb.log(`☀️ Propulseur solaire allumé : la voiture perd sa vitesse orbitale et tombe vers le Soleil. Arrivée dans ${fmtDuree(duree)}.`);
  };
  if (v.orb.centre === 'roadster' && !voitureEtape(2)) {
    if (!aCoteDe(v, 'roadster') || !(v.propulseurs > 0)) return;
    const car = ASTRES_PAR_ID.roadster, abs = etatAbsolu('roadster', v.t), soleil = etatAbsolu('soleil', v.t);
    v.orb = { centre: 'soleil', r: V.add(V.sub(abs.r, soleil.r), v.orb.r), v: V.add(V.sub(abs.v, soleil.v), v.orb.v), transfert: null };
    car.cachee = true;
    if (v.cible === 'roadster') v.cible = null;
    orb.etape = null;
    etapeVoiture(2, orb);
    lancer(V.norm(V.sub(abs.r, soleil.r)));
    return;
  }
  if (v.voiture && v.voiture.etat === 'a_bord' && v.propulseurs > 0) lancer(V.norm(etatAbsoluOrbiteur(orb)));
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
// Independence Day : le vaisseau-mère (550 km de large) attend derrière la Lune, à l'opposé de la Terre.
// On le voit sur la carte en orbite lunaire, puis partout une fois découvert.
function dessinerVaisseauMere(ctx, ecran, dansEcran, t, s, v) {
  if (SYSTEME.id !== 'solaire' || !ASTRES_PAR_ID.lune) return;
  const trouve = eggTrouve('lune-soucoupe');
  if (!trouve && !(v.orb && v.orb.centre === 'lune')) return;
  const lune = etatAbsolu('lune', t).r, terre = etatAbsolu('terre', t).r;
  const u = V.unit(V.sub(lune, terre));
  const e = ecran(V.add(lune, V.mul(u, 6000)));
  if (!dansEcran(e, 80)) return;
  // La carte est vue de dessus : la soucoupe est un disque, avec ses anneaux et ses feux qui tournent.
  const r = Math.max(5, 275 * s), rot = performance.now() / 20000;
  disque(ctx, e[0], e[1], r, '#263238');
  ctx.strokeStyle = '#455a64'; ctx.lineWidth = Math.max(1, r * 0.04);
  for (const k of [0.75, 0.5]) { ctx.beginPath(); ctx.arc(e[0], e[1], r * k, 0, Math.PI * 2); ctx.stroke(); }
  disque(ctx, e[0], e[1], r * 0.22, '#37474f');
  if (r > 10) for (let k = 0; k < 24; k++) { const a = rot + (k / 24) * Math.PI * 2; disque(ctx, e[0] + Math.cos(a) * r * 0.9, e[1] + Math.sin(a) * r * 0.9, Math.max(1, r * 0.025), k % 2 ? '#ff9800' : '#ffcc80'); }
  texteSurFond(ctx, trouve ? 'Vaisseau-mère · 550 km' : 'Objet inconnu', e[0], e[1] - r - 12, { police: '11px system-ui, sans-serif', couleur: trouve ? '#ffcc80' : '#cfd8dc' });
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

// ---------- Compteur et liste des trouvailles ----------
// Comptent : les easter eggs (au sol, en orbite, Bételgeuse) et les trois étapes de la voiture rouge.
// Le message d'un robot ne compte pas : l'objet est seulement « à explorer ».
function tousLesEggs() {
  return [
    ...EASTER_EGGS.map((e) => ({ id: e.id, astre: e.astre, texte: e.texte })),
    ...EGGS_ORBITE.map((e) => ({ id: e.id, astre: e.astre, texte: e.texte, orbite: true })),
    { id: EGG_BETELGEUSE.id, astre: 'betelgeuse', texte: EGG_BETELGEUSE.texte },
    { id: EGG_RAMA.id, astre: 'soleil', texte: EGG_RAMA.texte, orbite: true },
    { id: 'iss-wolowitz', astre: 'terre', texte: TEXTE_ISS_WOLOWITZ, orbite: true },
    ...[1, 2, 3].map((n) => ({ id: 'voiture-' + n, astre: 'roadster', texte: TEXTES_VOITURE[n], orbite: true })),
  ];
}
function nombreEggsTrouves() { return tousLesEggs().filter((e) => eggTrouve(e.id)).length; }
// Un astre de n'importe quel système (le Système solaire est mis de côté quand on joue ailleurs).
function astrePartout(id) {
  if (id === 'betelgeuse') return { nom: 'Bételgeuse' };
  if (ASTRES_PAR_ID[id]) return ASTRES_PAR_ID[id];
  const listes = [ASTRES_SOLAIRE ? ASTRES_SOLAIRE.liste : [], ...Object.values(SYSTEMES).map((s) => s.astres || [])];
  for (const l of listes) { const a = l.find((x) => x.id === id); if (a) return a; }
  return { nom: id };
}
// Bloc du journal : compteur, liste des trouvailles (repliée), objets à explorer. Vide tant qu'il n'y a rien.
function htmlTrouvailles() {
  const tous = tousLesEggs(), n = nombreEggsTrouves();
  const reperes = tous.filter((e) => etat.reperes && etat.reperes[e.id] && !eggTrouve(e.id));
  let h = '';
  if (n) {
    const trouves = tous.filter((e) => eggTrouve(e.id)).sort((a, b) => ((etat.decouvertes[a.id].quand || 0) - (etat.decouvertes[b.id].quand || 0)));
    h += `<p class="encart">✨ Easter eggs trouvés : <b>${n}</b> <button id="voir-trouvailles">Voir les trouvailles</button></p>
      <ul class="sondes cache" id="liste-trouvailles">${trouves.map((e) => `<li><b>${Le(astrePartout(e.astre))}</b> — ${e.texte}</li>`).join('')}</ul>`;
  }
  // Autres artefacts : objets des missions précédentes, objets artificiels croisés, vos propres traces.
  const autres = [];
  for (const [id, info] of Object.entries(etat.tracesVues || {})) {
    const t = Object.values(TRACES_REELLES).flat().find((x) => x.id === id);
    if (t) autres.push(`📍 <b>${t.nom}</b> (${t.annee}), ${sur(astrePartout(info.astre))} — ${t.materiel}`);
  }
  const v = etat.voyage;
  for (const id of Object.keys((v && v.deranges) || {})) { const a = astrePartout(id); autres.push(`🛰 <b>${a.nom}</b> — frôlé${a.art === 'la' ? 'e' : ''}, les scientifiques s’en souviennent`); }
  for (const id of Object.keys((v && v.voyagersVus) || {})) autres.push(`📡 <b>${id === 'voyager1' ? 'Voyager 1' : 'Voyager 2'}</b> — croisée en route`);
  for (const [astre, l] of Object.entries(etat.drapeaux || {})) if (l.length) autres.push(`🚩 ${l.length} drapeau${l.length > 1 ? 'x' : ''} planté${l.length > 1 ? 's' : ''} ${sur(astrePartout(astre))}`);
  for (const b of (v && v.bases) || []) autres.push(`🏠 ${majuscule(nomBase(astrePartout(b.astre)))}, niveau ${b.niveau || 1}`);
  if (autres.length) h += `<h3>Artefacts et traces</h3><ul class="sondes">${autres.map((x) => `<li>${x}</li>`).join('')}</ul>`;
  if (reperes.length) {
    h += `<h3>À explorer</h3><ul class="sondes">${reperes.map((e) => `<li>Objet inhabituel ${e.orbite ? enOrbite(astrePartout(e.astre)) : sur(astrePartout(e.astre))}</li>`).join('')}</ul>`;
  }
  return h;
}
function brancherTrouvailles(m) {
  const b = m.querySelector('#voir-trouvailles');
  if (b) b.onclick = () => { const l = m.querySelector('#liste-trouvailles'); l.classList.toggle('cache'); b.textContent = l.classList.contains('cache') ? 'Voir les trouvailles' : 'Masquer les trouvailles'; };
}

// Mimas : pas d'easter egg, seulement un fait réel dans sa fiche.
if (typeof ASTRES_PAR_ID !== 'undefined' && ASTRES_PAR_ID.l601 && !/Herschel/.test(ASTRES_PAR_ID.l601.note || '')) {
  ASTRES_PAR_ID.l601.note = `${ASTRES_PAR_ID.l601.note || ''} Son cratère Herschel, large de 139 km, lui donne une célèbre allure de station spatiale de science-fiction.`.trim();
}

// Découverte : bandeau doré bien visible (10 s), en plus du message habituel.
function afficherDecouverte(texte) {
  let el = document.getElementById('decouverte-jeu');
  if (!el) {
    el = document.createElement('div');
    el.id = 'decouverte-jeu';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = `<span>${texte}</span><button title="Fermer">✕</button>`;
  el.querySelector('button').onclick = () => el.classList.remove('visible');
  el.classList.add('visible');
  if (nombreEggsTrouves() >= 42) replique('reponse42');
  clearTimeout(afficherDecouverte.minuteur);
  afficherDecouverte.minuteur = setTimeout(() => el.classList.remove('visible'), 10000);
}
function eggsSur(astreId) { return EASTER_EGGS.filter((e) => e.astre === astreId); }
function tracesSur(astreId) { return TRACES_REELLES[astreId] || []; }
function eggTrouve(id) { return !!(typeof etat !== 'undefined' && etat.decouvertes && etat.decouvertes[id]); }

// Appelé à chaque pas de l'exploration.
function verifierDecouvertes(x) {
  const p = x.p, humain = x.type === 'spationaute';
  x.vusIci = x.vusIci || {};
  // Tour complet de l'astre (le sol boucle sur 2πR) : retour au point de départ.
  const P = perimetreSol(x.astre), tours = Math.abs(Math.trunc((p.x - x.xFusee) / P));
  if (tours > (x.toursFaits || 0)) {
    x.toursFaits = tours;
    x.dire(`🌍 Tour complet ${de(x.astre)} : ${fmt(P / 1000, P < 100000 ? 1 : 0)} km. Vous voilà revenu${acc()} au point de départ !`);
  }
  for (const e of eggsSur(x.astre.id)) {
    const ex = x.posLibre(x.xFusee + e.dx), d = distSol(x.astre, p.x, ex);
    if (humain && d < 60 && d >= (x.enRover ? 6 : 4) && !eggTrouve(e.id) && !x.vusIci['proche:' + e.id]) {
      x.vusIci['proche:' + e.id] = true;
      x.dire(`👀 Quelque chose d’inhabituel, ${ecartSol(x.astre, ex, p.x) < 0 ? 'à gauche ◀' : 'à droite ▶'}, à ${fmt(d)} m. Approchez-vous !`);
    }
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
    const tx = x.posLibre(x.xFusee + t.dx);
    if (distSol(x.astre, p.x, tx) < 12 && !x.vusIci['t:' + t.id]) {
      x.vusIci['t:' + t.id] = true;
      x.dire(`📍 ${t.nom} — ${t.annee} — ${t.materiel}.`);
      // Gardé pour le journal : objets des missions précédentes vus sur place.
      etat.tracesVues = etat.tracesVues || {};
      if (!etat.tracesVues[t.id]) {
        etat.tracesVues[t.id] = { astre: x.astre.id, quand: etat.enVoyage && etat.voyage ? etat.voyage.t : null, par: x.def.nom };
        if (etat.enVoyage && etat.voyage) regArtefact(piloteDuVol(etat.voyage), 'trace:' + t.id);
        sauver(etat);
      }
    }
  }
}

// Men in Black : un éclair blanc, et l'équipage ne se souvient plus de rien.
const TEXTE_FLASH = 'Flash ! Vous avez trouvé quelque chose ici. Vous ne savez plus quoi. (La liste des easter eggs, elle, s’en souvient.)';
function flashBlanc() {
  const d = document.createElement('div');
  d.className = 'flash-blanc';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1800);
}

function decouvrir(e, x) {
  etat.decouvertes = etat.decouvertes || {};
  etat.decouvertes[e.id] = { astre: e.astre, quand: etat.enVoyage && etat.voyage ? etat.voyage.t : null, par: nomSpatio() };
  if (etat.enVoyage && etat.voyage) regArtefact(piloteDuVol(etat.voyage), e.id);
  if (e.flash) flashBlanc();
  // Solaris : la silhouette prend les traits d'une personne morte du registre, s'il y en a une.
  let texte = e.flash ? TEXTE_FLASH : e.texte;
  if (e.solaris) {
    const morts = Object.values(registre()).filter((f) => f.statut === 'mort');
    const p = morts[Math.floor(Math.random() * morts.length)];
    if (p) texte = `Sur la glace, ${majuscule(p.nom)} vous attend, immobile, et vous sourit. Ce n’est pas possible.`;
  }
  x.dire('✨ ' + texte);
  if (e.elvis) x.vol.elvis = true;
  if (e.id === 'chat') replique('chat');
  if (etat.enVoyage && etat.voyage) etat.voyage.journal.push({ t: etat.voyage.t, texte: `✨ Découverte ${sur(x.astre)} : ${texte}` });
  sauver(etat);
}

// Dessin des découvertes autour de l'explorateur. Les easter eggs n'apparaissent qu'à un humain proche,
// ou une fois trouvés ; les traces réelles sont toujours là.
function dessinerDecouvertes(ctx, x, versEcran, s, W) {
  const p = x.p, humain = x.type === 'spationaute';
  for (const t of tracesSur(x.astre.id)) {
    const tx = x.posLibre(x.xFusee + t.dx);
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
    const ex = x.posLibre(x.xFusee + e.dx);
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
  chapeauPaille(ctx, x, y, s) {
    ctx.fillStyle = '#8d8d8d'; ctx.beginPath(); ctx.ellipse(x, y, 0.8 * s, 0.35 * s, 0, Math.PI, 0); ctx.fill();   // rocher
    ctx.fillStyle = '#f4d58d'; ctx.beginPath(); ctx.ellipse(x, y - 0.36 * s, 0.6 * s, 0.1 * s, 0, 0, Math.PI * 2); ctx.fill();   // bord
    ctx.beginPath(); ctx.ellipse(x, y - 0.46 * s, 0.3 * s, 0.2 * s, 0, Math.PI, 0); ctx.fill();   // calotte
    rect(ctx, x - 0.3 * s, y - 0.5 * s, 0.6 * s, 0.07 * s, '#d32f2f');   // ruban rouge
    ctx.strokeStyle = 'rgba(160,120,40,0.6)'; ctx.lineWidth = 0.015 * s;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 0.1 * s, y - 0.62 * s); ctx.lineTo(x + k * 0.22 * s, y - 0.38 * s); ctx.stroke(); }
  },
  cylon(ctx, x, y, s) {
    const c = '#b0bec5', f = '#78909c';
    trait(ctx, [[x - 0.18 * s, y], [x - 0.15 * s, y - 0.9 * s]], f, 0.14 * s);
    trait(ctx, [[x + 0.18 * s, y], [x + 0.15 * s, y - 0.9 * s]], f, 0.14 * s);
    rect(ctx, x - 0.35 * s, y - 1.7 * s, 0.7 * s, 0.8 * s, c);
    trait(ctx, [[x - 0.36 * s, y - 1.6 * s], [x - 0.48 * s, y - 1 * s]], f, 0.1 * s);
    trait(ctx, [[x + 0.36 * s, y - 1.6 * s], [x + 0.48 * s, y - 1 * s]], f, 0.1 * s);
    ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y - 1.95 * s, 0.22 * s, 0.27 * s, 0, 0, Math.PI * 2); ctx.fill();   // casque
    rect(ctx, x - 0.18 * s, y - 2.02 * s, 0.36 * s, 0.08 * s, '#263238');   // fente
    const u = Math.sin(performance.now() / 450);                                      // l'œil balaie de gauche à droite
    disque(ctx, x + u * 0.14 * s, y - 1.98 * s, 0.04 * s, '#ff1744');
    disque(ctx, x + u * 0.14 * s, y - 1.98 * s, 0.09 * s, 'rgba(255,23,68,0.35)');
  },
  frigo(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.12);
    rect(ctx, -0.4 * s, -1.7 * s, 0.8 * s, 1.7 * s, '#eceff1');
    rect(ctx, -0.4 * s, -1.15 * s, 0.8 * s, 0.04 * s, '#90a4ae');
    rect(ctx, 0.28 * s, -1.55 * s, 0.05 * s, 0.3 * s, '#78909c');
    disque(ctx, -0.1 * s, -0.6 * s, 0.12 * s, '#cfd8dc');   // bosse
    ctx.restore();
    ctx.fillStyle = '#b0bec5'; ctx.beginPath(); ctx.moveTo(x + 0.45 * s, y); ctx.lineTo(x + 1.1 * s, y - 0.2 * s); ctx.lineTo(x + 1.1 * s, y - 1.6 * s); ctx.lineTo(x + 0.6 * s, y - 1.7 * s); ctx.fill();   // porte ouverte
  },
  craneCristal(ctx, x, y, s) {
    const a = 0.55 + 0.3 * Math.sin(performance.now() / 600);
    disque(ctx, x, y - 0.3 * s, 0.6 * s, `rgba(129,212,250,${a * 0.25})`);
    ctx.fillStyle = `rgba(225,245,254,${0.6 + a * 0.3})`;
    ctx.beginPath(); ctx.ellipse(x - 0.05 * s, y - 0.32 * s, 0.22 * s, 0.32 * s, -0.5, 0, Math.PI * 2); ctx.fill();   // front allongé
    rect(ctx, x + 0.02 * s, y - 0.16 * s, 0.22 * s, 0.16 * s, `rgba(225,245,254,${0.6 + a * 0.3})`);
    disque(ctx, x + 0.08 * s, y - 0.28 * s, 0.05 * s, 'rgba(1,87,155,0.6)');
  },
  arche(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.08);
    ctx.fillStyle = '#546e7a'; ctx.beginPath(); ctx.moveTo(-14 * s, 0); ctx.lineTo(-11 * s, -6 * s); ctx.lineTo(8 * s, -7 * s); ctx.lineTo(14 * s, -3 * s); ctx.lineTo(12 * s, 0); ctx.fill();
    ctx.fillStyle = '#37474f'; for (let k = -9; k <= 9; k += 3) rect(ctx, k * s, -6 * s, 1.6 * s, 5.5 * s, '#455a64');
    rect(ctx, 5 * s, -9 * s, 1 * s, 3 * s, '#607d8b');
    ctx.restore();
    for (let k = 0; k < 10; k++) disque(ctx, x - 16 * s + k * 0.7 * s, y - 0.03 * s, 0.06 * s, '#757575');   // traces de pas
  },
  cube(ctx, x, y, s) {
    const a = 0.4 + 0.3 * Math.sin(performance.now() / 300);
    disque(ctx, x, y - 1.3 * s, 2 * s, `rgba(100,181,246,${a * 0.25})`);
    rect(ctx, x - 1.3 * s, y - 2.6 * s, 2.6 * s, 2.6 * s, '#616161');
    ctx.strokeStyle = `rgba(144,202,249,${0.5 + a})`; ctx.lineWidth = 0.05 * s;
    for (let k = 0; k < 7; k++) { ctx.beginPath(); ctx.moveTo(x - 1.1 * s, y - (0.3 + k * 0.33) * s); ctx.lineTo(x + (Math.sin(k * 3.1) * 0.9) * s, y - (0.3 + k * 0.33) * s); ctx.lineTo(x + (Math.sin(k * 3.1) * 0.9) * s, y - (0.45 + k * 0.33) * s); ctx.stroke(); }
  },
  marteau(ctx, x, y, s) {
    trait(ctx, [[x, y], [x, y - 0.55 * s]], '#6d4c41', 0.09 * s);
    rect(ctx, x - 0.32 * s, y - 0.85 * s, 0.64 * s, 0.32 * s, '#9e9e9e');
    rect(ctx, x - 0.32 * s, y - 0.85 * s, 0.64 * s, 0.06 * s, '#bdbdbd');
    if (Math.sin(performance.now() / 180) > 0.85) trait(ctx, [[x + 0.35 * s, y - 0.9 * s], [x + 0.5 * s, y - 1.1 * s], [x + 0.42 * s, y - 1.15 * s], [x + 0.6 * s, y - 1.35 * s]], '#b3e5fc', 0.03 * s);   // un petit éclair
  },
  patates(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(236,239,241,0.85)'; ctx.beginPath(); ctx.ellipse(x, y, 1.6 * s, 0.9 * s, 0, Math.PI, 0); ctx.fill();   // bâche
    for (let k = -3; k <= 3; k++) { trait(ctx, [[x + k * 0.4 * s, y], [x + k * 0.4 * s, y - 0.35 * s]], '#2e7d32', 0.06 * s); disque(ctx, x + k * 0.4 * s, y - 0.38 * s, 0.09 * s, '#43a047'); }
    for (let k = 0; k < 3; k++) { disque(ctx, x + 2 * s, y - (0.04 + k * 0.05) * s, 0.22 * s, '#111'); disque(ctx, x + 2 * s, y - (0.04 + k * 0.05) * s, 0.05 * s, ['#e91e63', '#ffeb3b', '#00bcd4'][k]); }
  },
  ondulation(ctx, x, y, s) {
    const t = performance.now() / 500;
    ctx.fillStyle = '#c8a165';
    for (let k = 0; k < 5; k++) { const xx = x + (k - 2) * 1.6 * s + Math.sin(t) * 0.3 * s; ctx.beginPath(); ctx.ellipse(xx, y, 0.9 * s, (0.25 + 0.12 * Math.sin(t + k)) * s, 0, Math.PI, 0); ctx.fill(); }
  },
  asteroidePrince(ctx, x, y, s) {
    for (const [dx, h, actif] of [[-0.9, 0.35, true], [-0.4, 0.3, true], [0.1, 0.25, false]]) {
      ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.moveTo(x + (dx - 0.22) * s, y); ctx.lineTo(x + dx * s, y - h * s); ctx.lineTo(x + (dx + 0.22) * s, y); ctx.fill();
      if (actif && Math.sin(performance.now() / 400 + dx * 5) > 0.3) disque(ctx, x + dx * s, y - (h + 0.08) * s, 0.05 * s, 'rgba(200,200,200,0.7)');
    }
    trait(ctx, [[x + 0.8 * s, y], [x + 0.8 * s, y - 0.35 * s]], '#2e7d32', 0.04 * s);
    disque(ctx, x + 0.8 * s, y - 0.4 * s, 0.07 * s, '#e53935');
    ctx.strokeStyle = 'rgba(200,230,255,0.7)'; ctx.lineWidth = 0.03 * s; ctx.beginPath(); ctx.arc(x + 0.8 * s, y - 0.25 * s, 0.28 * s, Math.PI, 0); ctx.lineTo(x + 1.08 * s, y); ctx.moveTo(x + 0.52 * s, y - 0.25 * s); ctx.lineTo(x + 0.52 * s, y); ctx.stroke();
    for (const dx of [1.4, 1.6]) trait(ctx, [[x + dx * s, y], [x + dx * s, y - 0.12 * s]], '#558b2f', 0.05 * s);   // pousses de baobab
  },
  silhouetteFamiliere(ctx, x, y, s) {
    const a = 0.55 + 0.25 * Math.sin(performance.now() / 900), c = `rgba(225,240,255,${a})`;
    trait(ctx, [[x - 0.12 * s, y], [x - 0.08 * s, y - 0.8 * s]], c, 0.12 * s);
    trait(ctx, [[x + 0.12 * s, y], [x + 0.08 * s, y - 0.8 * s]], c, 0.12 * s);
    rect(ctx, x - 0.22 * s, y - 1.45 * s, 0.44 * s, 0.7 * s, c);
    disque(ctx, x, y - 1.65 * s, 0.17 * s, c);
  },
  cabineBleue(ctx, x, y, s) {
    rect(ctx, x - 0.5 * s, y - 2.5 * s, 1 * s, 2.5 * s, '#0d47a1');
    rect(ctx, x - 0.55 * s, y - 2.65 * s, 1.1 * s, 0.2 * s, '#0a3880');
    rect(ctx, x - 0.4 * s, y - 2.4 * s, 0.8 * s, 0.13 * s, '#111');
    for (const dx of [-0.36, 0.06]) for (const dy of [2.15, 1.75]) rect(ctx, x + dx * s, y - dy * s, 0.3 * s, 0.32 * s, dy > 2 ? '#e3f2fd' : '#1565c0');
    disque(ctx, x, y - 2.75 * s, 0.07 * s, Math.sin(performance.now() / 300) > 0 ? '#fff59d' : '#90a4ae');
  },
  petitVert(ctx, x, y, s) {
    rect(ctx, x - 0.15 * s, y - 0.45 * s, 0.3 * s, 0.4 * s, '#eceff1');
    disque(ctx, x, y - 0.62 * s, 0.2 * s, 'rgba(200,230,255,0.6)');
    disque(ctx, x, y - 0.62 * s, 0.15 * s, '#7cb342');
    trait(ctx, [[x - 0.08 * s, y - 0.56 * s], [x, y - 0.52 * s], [x + 0.08 * s, y - 0.56 * s]], '#1b5e20', 0.02 * s);   // grand sourire
    rect(ctx, x + 0.5 * s, y - 0.5 * s, 0.25 * s, 0.5 * s, '#cfd8dc');
    ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(x + 0.95 * s, y - 0.05 * s); ctx.lineTo(x + 1.25 * s, y - 0.3 * s); ctx.lineTo(x + 1.35 * s, y - 0.05 * s); ctx.fill();   // un cône tombé
    rect(ctx, x + 1.5 * s, y - 0.15 * s, 0.4 * s, 0.15 * s, '#90a4ae');
  },
  robotRond(ctx, x, y, s) {
    disque(ctx, x, y - 0.35 * s, 0.3 * s, '#ef6c00');
    for (const dx of [-0.11, 0.11]) { disque(ctx, x + dx * s, y - 0.42 * s, 0.1 * s, '#fff'); disque(ctx, x + dx * s, y - 0.42 * s, 0.045 * s, '#111'); }
    trait(ctx, [[x, y - 0.65 * s], [x, y - 0.8 * s]], '#616161', 0.03 * s); disque(ctx, x, y - 0.82 * s, 0.04 * s, '#ffeb3b');
    trait(ctx, [[x - 0.12 * s, y - 0.08 * s], [x - 0.15 * s, y]], '#616161', 0.05 * s); trait(ctx, [[x + 0.12 * s, y - 0.08 * s], [x + 0.15 * s, y]], '#616161', 0.05 * s);
  },
  feuDeCamp(ctx, x, y, s) {
    trait(ctx, [[x - 0.3 * s, y], [x + 0.3 * s, y - 0.1 * s]], '#5d4037', 0.08 * s); trait(ctx, [[x + 0.3 * s, y], [x - 0.3 * s, y - 0.1 * s]], '#5d4037', 0.08 * s);
    const f = 1 + 0.15 * Math.sin(performance.now() / 90);
    ctx.fillStyle = '#ff9800'; ctx.beginPath(); ctx.moveTo(x - 0.2 * s, y - 0.08 * s); ctx.quadraticCurveTo(x, y - 0.7 * f * s, x + 0.2 * s, y - 0.08 * s); ctx.fill();
    ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.moveTo(x - 0.1 * s, y - 0.08 * s); ctx.quadraticCurveTo(x, y - 0.4 * f * s, x + 0.1 * s, y - 0.08 * s); ctx.fill();
    trait(ctx, [[x + 1.1 * s, y - 0.1 * s], [x + 0.25 * s, y - 0.55 * s]], '#8d6e63', 0.03 * s);
    rect(ctx, x + 0.18 * s, y - 0.62 * s, 0.12 * s, 0.1 * s, '#fff8e1');
  },
  aliensTroisYeux(ctx, x, y, s) {
    for (const dx of [-0.35, 0, 0.35]) {
      const c = '#76ff03';
      rect(ctx, x + (dx - 0.1) * s, y - 0.4 * s, 0.2 * s, 0.4 * s, '#4fc3f7');
      disque(ctx, x + dx * s, y - 0.55 * s, 0.14 * s, c);
      trait(ctx, [[x + dx * s, y - 0.68 * s], [x + dx * s, y - 0.85 * s]], c, 0.025 * s); disque(ctx, x + dx * s, y - 0.86 * s, 0.03 * s, c);
      for (const ox of [-0.06, 0, 0.06]) { disque(ctx, x + (dx + ox) * s, y - 0.57 * s, 0.03 * s, '#fff'); disque(ctx, x + (dx + ox) * s, y - 0.57 * s, 0.013 * s, '#111'); }
    }
  },
  planteBotte(ctx, x, y, s) {
    ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.moveTo(x - 0.12 * s, y - 0.4 * s); ctx.lineTo(x + 0.08 * s, y - 0.4 * s); ctx.lineTo(x + 0.08 * s, y - 0.1 * s); ctx.lineTo(x + 0.3 * s, y - 0.08 * s); ctx.lineTo(x + 0.3 * s, y); ctx.lineTo(x - 0.12 * s, y); ctx.fill();
    trait(ctx, [[x - 0.02 * s, y - 0.4 * s], [x - 0.02 * s, y - 0.6 * s]], '#43a047', 0.025 * s);
    disque(ctx, x - 0.07 * s, y - 0.6 * s, 0.05 * s, '#66bb6a'); disque(ctx, x + 0.03 * s, y - 0.64 * s, 0.05 * s, '#66bb6a');
  },
  caillouVert(ctx, x, y, s) {
    const a = 0.35 + 0.25 * Math.sin(performance.now() / 500);
    disque(ctx, x, y - 0.12 * s, 0.4 * s, `rgba(118,255,3,${a * 0.4})`);
    ctx.fillStyle = '#64dd17'; ctx.beginPath(); ctx.moveTo(x - 0.18 * s, y); ctx.lineTo(x - 0.1 * s, y - 0.25 * s); ctx.lineTo(x + 0.05 * s, y - 0.32 * s); ctx.lineTo(x + 0.18 * s, y - 0.12 * s); ctx.lineTo(x + 0.15 * s, y); ctx.fill();
  },
  neuraliseur(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y - 0.06 * s); ctx.rotate(-0.25);
    rect(ctx, -0.22 * s, -0.05 * s, 0.44 * s, 0.1 * s, '#cfd8dc');
    rect(ctx, -0.22 * s, -0.05 * s, 0.1 * s, 0.1 * s, '#90a4ae');
    disque(ctx, 0.24 * s, 0, 0.05 * s, Math.sin(performance.now() / 200) > 0 ? '#ff1744' : '#7f0000');
    ctx.restore();
  },
  // À dessiner au cou du chat (même endroit que lui) : une bille où tourne une galaxie.
  billeGalaxie(ctx, x, y, s) {
    const cx = x + 0.02 * s, cy = y - 0.76 * s, r = 0.045 * s, t = performance.now() / 600;
    disque(ctx, cx, cy, r, '#1a237e');
    ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = Math.max(0.6, 0.012 * s);
    for (const k of [0, Math.PI]) {
      ctx.beginPath();
      for (let u = 0; u <= 1; u += 0.1) { const a = t + k + u * 4, rr = u * r * 0.9; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6); }
      ctx.stroke();
    }
  },
  casier(ctx, x, y, s) {
    rect(ctx, x - 0.3 * s, y - 1.8 * s, 0.6 * s, 1.8 * s, '#78909c');
    rect(ctx, x - 0.26 * s, y - 1.74 * s, 0.52 * s, 1.68 * s, '#263238');
    for (let k = 0; k < 9; k++) disque(ctx, x + (Math.sin(k * 7.3) * 0.2) * s, y - (0.2 + k * 0.17) * s, 0.018 * s, ['#ffeb3b', '#80deea', '#ff8a65'][k % 3]);
    ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.moveTo(x + 0.3 * s, y - 1.8 * s); ctx.lineTo(x + 0.62 * s, y - 1.68 * s); ctx.lineTo(x + 0.62 * s, y - 0.08 * s); ctx.lineTo(x + 0.3 * s, y); ctx.fill();   // porte entrouverte
    disque(ctx, x + 0.56 * s, y - 0.95 * s, 0.03 * s, '#455a64');
  },
  bibliotheque(ctx, x, y, s) {
    const couleurs = ['#8d6e63', '#c62828', '#1565c0', '#2e7d32', '#f9a825', '#6a1b9a'];
    rect(ctx, x - 0.8 * s, y - 2 * s, 1.6 * s, 2 * s, '#4e342e');
    for (let et = 0; et < 4; et++) {
      const yy = y - (0.45 + et * 0.47) * s;
      rect(ctx, x - 0.75 * s, yy, 1.5 * s, 0.05 * s, '#3e2723');
      for (let k = 0; k < 9; k++) if ((k + et) % 5) rect(ctx, x - 0.72 * s + k * 0.16 * s, yy - 0.36 * s, 0.13 * s, 0.36 * s, couleurs[(k + et * 2) % couleurs.length]);
    }
    // Livres tombés par terre, et un livre qui tombe, encore et encore.
    for (let k = 0; k < 4; k++) rect(ctx, x + (1 + k * 0.28) * s, y - 0.06 * s, 0.24 * s, 0.06 * s, couleurs[k]);
    const u = (performance.now() / 2200) % 1;
    rect(ctx, x + 0.9 * s, y - (1.4 - 1.35 * u * u) * s, 0.13 * s, 0.32 * s, couleurs[(Math.floor(performance.now() / 2200)) % couleurs.length]);
  },
  vague(ctx, x, y, s) {
    const h = 14 * s, t = performance.now() / 900;
    ctx.fillStyle = 'rgba(30,90,140,0.85)';
    ctx.beginPath(); ctx.moveTo(x - 16 * s, y);
    for (let k = 0; k <= 32; k++) { const u = k / 32, xx = x - 16 * s + u * 32 * s; ctx.lineTo(xx, y - h * Math.exp(-((u - 0.5) ** 2) * 14) * (0.95 + 0.05 * Math.sin(t + u * 6))); }
    ctx.lineTo(x + 16 * s, y); ctx.fill();
    ctx.strokeStyle = 'rgba(225,245,254,0.8)'; ctx.lineWidth = 0.25 * s;
    ctx.beginPath(); ctx.arc(x + 1.2 * s, y - h * 0.92, 1.4 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  },
  robotBlocs(ctx, x, y, s) {
    const c = '#9e9e9e', b = Math.sin(performance.now() / 700) * 0.05;
    for (let k = 0; k < 4; k++) rect(ctx, x - 0.42 * s + k * 0.21 * s, y - (2.2 + (k % 2 ? b : -b)) * s, 0.19 * s, (2.2 + (k % 2 ? b : -b)) * s, k % 2 ? '#8a8a8a' : c);
    rect(ctx, x - 0.3 * s, y - 1.6 * s, 0.6 * s, 0.22 * s, '#212121');
    rect(ctx, x - 0.26 * s, y - 1.56 * s, 0.3 * s, 0.14 * s, '#76ff03');
  },
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
    for (let k = 0; k < 6; k++) disque(ctx, x + (1.2 + k * 0.35) * s, y - (k % 2 ? 0.03 : 0.07) * s, 0.05 * s, '#5d5d5d');   // pattes d'un petit chien
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
  // La Guerre des mondes : tripode mort, affaissé sur ses trois jambes, dans l'herbe rouge martienne.
  tripode(ctx, x, y, s) {
    const t = performance.now() / 1400;
    const jambe = (pts, ep, c) => {
      trait(ctx, pts, c, ep * s);
      for (const q of pts.slice(1, -1)) disque(ctx, q[0], q[1], ep * 0.9 * s, '#3b3f42');   // articulations
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(pts[pts.length - 1][0], pts[pts.length - 1][1], ep * 1.4 * s, ep * 0.5 * s, 0, Math.PI, 0); ctx.fill();   // pied
    };
    const herbe = (x0, n, h) => { for (let k = 0; k < n; k++) { const xx = x0 + (k - n / 2) * 0.35 * s, hh = (h * (0.5 + 0.5 * Math.abs(Math.sin(k * 2.3)))) * s; trait(ctx, [[xx, y], [xx + 0.12 * s, y - hh * 0.6], [xx + (Math.sin(t + k) * 0.1 + 0.05) * s, y - hh]], k % 2 ? '#b71c1c' : '#d32f2f', 0.07 * s); } };
    const hub = [x + 0.3 * s, y - 7.4 * s];
    // Jambe arrière (plus sombre), puis l'herbe du fond.
    jambe([hub, [x + 2.2 * s, y - 4.6 * s], [x + 1.2 * s, y]], 0.22, '#4e5357');
    herbe(x, 30, 1.1);
    // Herbe rouge qui grimpe le long des jambes.
    const lierre = (a, b) => { ctx.strokeStyle = '#c62828'; ctx.lineWidth = 0.08 * s; ctx.beginPath(); for (let u = 0; u <= 1; u += 0.05) { const px = a[0] + (b[0] - a[0]) * u + Math.sin(u * 18) * 0.18 * s, py = a[1] + (b[1] - a[1]) * u; if (u === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.stroke(); };
    // Jambes avant.
    const g = [hub, [x - 3.2 * s, y - 5.2 * s], [x - 4.8 * s, y]];
    const d = [hub, [x + 3.6 * s, y - 4.2 * s], [x + 4.6 * s, y]];
    jambe(g, 0.26, '#6b7175'); jambe(d, 0.26, '#6b7175');
    lierre([x - 4.8 * s, y], [x - 3.4 * s, y - 4.4 * s]); lierre([x + 4.6 * s, y], [x + 3.8 * s, y - 3 * s]);
    // Tentacules qui pendent sous le capot.
    ctx.strokeStyle = '#55595c'; ctx.lineWidth = 0.12 * s; ctx.lineCap = 'round';
    for (const [dx, long] of [[-1.1, 3.4], [-0.3, 4.4], [0.6, 3.8], [1.4, 2.9]]) {
      const x0 = hub[0] + dx * s, y0 = hub[1] + 0.6 * s, bal = Math.sin(t + dx * 2) * 0.35 * s;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.bezierCurveTo(x0 + bal, y0 + long * 0.4 * s, x0 - bal, y0 + long * 0.75 * s, x0 + bal * 0.6 + 0.3 * s, y0 + long * s); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    // Le capot : un dôme de métal, penché vers l'avant (le pilote est mort), avec ses plaques et sa rouille.
    ctx.save(); ctx.translate(hub[0], hub[1] - 0.6 * s); ctx.rotate(0.28);
    const grad = ctx.createLinearGradient(0, -2 * s, 0, 1 * s);
    grad.addColorStop(0, '#9aa1a6'); grad.addColorStop(1, '#4d5357');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(-2.6 * s, 0.4 * s); ctx.quadraticCurveTo(-2.5 * s, -2.2 * s, 0, -2.3 * s); ctx.quadraticCurveTo(2.5 * s, -2.2 * s, 2.6 * s, 0.4 * s); ctx.quadraticCurveTo(0, 1.2 * s, -2.6 * s, 0.4 * s); ctx.fill();
    rect(ctx, -2.7 * s, 0.25 * s, 5.4 * s, 0.32 * s, '#3b3f42');   // ceinture sous le capot
    ctx.strokeStyle = 'rgba(40,44,47,0.6)'; ctx.lineWidth = 0.05 * s;
    for (const k of [-1.3, 0, 1.3]) { ctx.beginPath(); ctx.moveTo(k * s, -2.2 * s); ctx.quadraticCurveTo(k * 1.25 * s, -1 * s, k * 1.5 * s, 0.3 * s); ctx.stroke(); }   // plaques rivetées
    for (const [rx, ry, rr] of [[-1.6, -0.6, 0.45], [1.1, -1.4, 0.35], [0.4, -0.2, 0.3]]) disque(ctx, rx * s, ry * s, rr * s, 'rgba(141,74,43,0.75)');   // rouille
    const lueur = 0.25 + 0.15 * Math.sin(t * 2);
    rect(ctx, 1.2 * s, -1 * s, 1.1 * s, 0.32 * s, '#1c1f21');
    rect(ctx, 1.3 * s, -0.94 * s, 0.9 * s, 0.2 * s, `rgba(255,82,82,${lueur})`);   // hublot, une dernière lueur
    // Le bras du rayon ardent, tombé.
    trait(ctx, [[2.3 * s, 0.1 * s], [3.3 * s, 1.4 * s], [3.1 * s, 2.6 * s]], '#55595c', 0.14 * s);
    rect(ctx, 2.75 * s, 2.5 * s, 0.75 * s, 0.45 * s, '#3b3f42');
    ctx.restore();
    // Herbe rouge drapée sur le capot, et au premier plan.
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = 0.09 * s;
    ctx.beginPath(); ctx.moveTo(hub[0] - 2 * s, hub[1] - 1.6 * s); ctx.quadraticCurveTo(hub[0] - 1.2 * s, hub[1] - 0.2 * s, hub[0] - 1.7 * s, hub[1] + 1.4 * s); ctx.stroke();
    herbe(x - 2 * s, 14, 0.8);
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
