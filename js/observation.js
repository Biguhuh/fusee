'use strict';
// « Se promener » : la Terre, et des objets du ciel lointain qu'on observe de loin (pas d'atterrissage).
// Chaque objet a un nom, une distance réelle, un rendu dessiné et animé, et une courte explication.
// Les tailles à l'écran ne sont pas à l'échelle : un pulsar de 20 km et une galaxie de 100 000 années-lumière
// ne tiendraient pas sur le même écran.

const CATEGORIES_CIEL = [
  ['etoiles', '⭐ Étoiles, de tous types et de tous âges'],
  ['compactes', '💫 Étoiles mortes et compactes'],
  ['multiples', '♊ Étoiles doubles et multiples'],
  ['extremes', '🕳 Trous noirs et objets extrêmes'],
  ['explosions', '💥 Explosions et restes d’étoiles'],
  ['nebuleuses', '🌫 Nébuleuses'],
  ['amas', '✨ Amas et galaxies'],
  ['planetes', '🪐 Exoplanètes'],
];

// rendu : nom de la fonction de dessin ; p : ses réglages.
const OBJETS_CIEL = [
  // ---------- Étoiles ----------
  { id: 'proxima', cat: 'etoiles', nom: 'Proxima Centauri', type: 'Naine rouge', distance: '4,25 années-lumière', rendu: 'etoile', p: { couleur: [255, 110, 60], taille: 0.35, taches: 5, eruption: true },
    texte: 'L’étoile la plus proche du Soleil. Une naine rouge, sept fois plus petite que lui et bien plus froide, mais capable de violentes éruptions. Ces étoiles brûlent si lentement qu’elles vivront des milliers de milliards d’années. Deux planètes connues, dont Proxima b dans la zone habitable.' },
  { id: 'kappaceti', cat: 'etoiles', nom: 'Kappa¹ Ceti', type: 'Naine jaune jeune (600 millions d’années)', distance: '30 années-lumière', rendu: 'etoile', p: { couleur: [255, 236, 170], taille: 0.5, taches: 14, eruption: true },
    texte: 'Un « Soleil jeune » : même type que le nôtre, mais âgé de seulement 600 millions d’années. Il tourne plus vite, est couvert de taches et lance un vent stellaire puissant. Le Soleil ressemblait à ça quand la vie apparaissait sur Terre.' },
  { id: 'alphacenA', cat: 'etoiles', nom: 'Alpha Centauri A', type: 'Naine jaune (environ 5 milliards d’années)', distance: '4,37 années-lumière', rendu: 'etoile', p: { couleur: [255, 240, 200], taille: 0.55, taches: 4 },
    texte: 'Presque une jumelle du Soleil, un peu plus grosse et un peu plus vieille. Elle forme un couple avec Alpha Centauri B, et Proxima tourne autour des deux, très loin.' },
  { id: '18sco', cat: 'etoiles', nom: '18 Scorpii', type: 'Naine jaune, « jumelle du Soleil »', distance: '46 années-lumière', rendu: 'etoile', p: { couleur: [255, 242, 205], taille: 0.5, taches: 6 },
    texte: 'L’étoile la plus semblable au Soleil connue : même masse, même température, même âge à peu près. Les astronomes l’étudient pour savoir si notre étoile est « normale ».' },
  { id: 'epseri', cat: 'etoiles', nom: 'Epsilon Eridani', type: 'Naine orange', distance: '10,5 années-lumière', rendu: 'etoile', p: { couleur: [255, 190, 110], taille: 0.42, taches: 8, disque: true },
    texte: 'Une étoile orange, un peu plus petite et plus froide que le Soleil, et jeune. Elle est entourée de ceintures de poussières, comme un système solaire en train de se ranger, avec au moins une planète géante.' },
  { id: 'rigel', cat: 'etoiles', nom: 'Rigel', type: 'Supergéante bleue', distance: '860 années-lumière', rendu: 'etoile', p: { couleur: [170, 200, 255], taille: 0.75, vent: true },
    texte: 'Le pied d’Orion. Une étoile bleue énorme, 120 000 fois plus lumineuse que le Soleil. Les étoiles massives brûlent tout en quelques millions d’années et finissent en supernova.' },
  { id: 'zetapup', cat: 'etoiles', nom: 'Zeta Puppis', type: 'Étoile bleue de type O', distance: '1 100 années-lumière', rendu: 'etoile', p: { couleur: [150, 180, 255], taille: 0.6, vent: true },
    texte: 'Une des étoiles les plus chaudes visibles à l’œil nu : 40 000 °C en surface. Elle souffle un vent si fort qu’elle perd l’équivalent de la Terre tous les quelques jours.' },
  { id: 'aldebaran', cat: 'etoiles', nom: 'Aldébaran', type: 'Géante rouge', distance: '65 années-lumière', rendu: 'etoile', p: { couleur: [255, 150, 80], taille: 0.85, granul: true },
    texte: 'L’œil du Taureau. Une étoile en fin de vie qui a gonflé jusqu’à 44 fois la taille du Soleil. Dans 5 milliards d’années, le Soleil deviendra une géante rouge comme elle.' },
  { id: 'betelgeuse', cat: 'etoiles', nom: 'Bételgeuse', type: 'Supergéante rouge', distance: '550 années-lumière', rendu: 'etoile', p: { couleur: [255, 110, 60], taille: 1, granul: true, pulse: [0.04, 6] },
    texte: 'L’épaule d’Orion. Placée à la place du Soleil, elle avalerait Mars et peut-être Jupiter. Sa surface bouillonne de cellules géantes. Elle explosera en supernova d’ici 100 000 ans, visible en plein jour.' },
  { id: 'vycma', cat: 'etoiles', nom: 'VY Canis Majoris', type: 'Hypergéante rouge', distance: '3 900 années-lumière', rendu: 'etoile', p: { couleur: [255, 90, 50], taille: 1.1, granul: true, nuage: true },
    texte: 'L’une des plus grandes étoiles connues : environ 1 400 fois le rayon du Soleil. Elle se défait lentement, entourée des nuages de gaz et de poussières qu’elle éjecte.' },
  { id: 'etacar', cat: 'etoiles', nom: 'Eta Carinae', type: 'Variable lumineuse bleue', distance: '7 500 années-lumière', rendu: 'etaCarinae', p: {},
    texte: 'Un monstre instable de plus de 100 masses solaires. En 1843, une éruption géante l’a rendue un temps la 2e étoile du ciel et a créé la nébuleuse en deux lobes qui l’entoure, l’« Homoncule ».' },
  { id: 'wr104', cat: 'etoiles', nom: 'WR 104', type: 'Étoile de Wolf-Rayet', distance: '8 000 années-lumière', rendu: 'wolfRayet', p: {},
    texte: 'Une étoile massive qui a perdu ses couches externes et souffle un vent violent. Avec sa compagne, elle dessine une spirale de poussière en tourniquet, qui fait un tour tous les 8 mois.' },
  { id: 'deltacep', cat: 'etoiles', nom: 'Delta Cephei', type: 'Céphéide', distance: '890 années-lumière', rendu: 'etoile', p: { couleur: [255, 225, 150], taille: 0.6, pulse: [0.18, 4], cepheide: true },
    texte: 'Une étoile qui gonfle et dégonfle tous les 5,4 jours. Plus une céphéide est lumineuse, plus elle pulse lentement : en mesurant sa période, on connaît sa vraie luminosité, donc sa distance. Elles ont servi à mesurer l’Univers.' },
  { id: 'hltau', cat: 'etoiles', nom: 'HL Tauri', type: 'Proto-étoile et son disque', distance: '450 années-lumière', rendu: 'protoEtoile', p: {},
    texte: 'Une étoile qui naît, âgée de moins d’un million d’années. Son disque de gaz et de poussière montre des anneaux sombres : des planètes s’y forment déjà. Des jets de matière jaillissent de ses pôles.' },
  { id: 'luhman16', cat: 'etoiles', nom: 'Luhman 16', type: 'Naines brunes', distance: '6,5 années-lumière', rendu: 'naineBrune', p: {},
    texte: 'Deux « étoiles ratées », trop légères pour allumer la fusion de l’hydrogène. Pas plus grosses que Jupiter, à peine lumineuses, avec des bandes de nuages et des orages de fer liquide.' },

  // ---------- Étoiles compactes ----------
  { id: 'siriusb', cat: 'compactes', nom: 'Sirius B', type: 'Naine blanche', distance: '8,6 années-lumière', rendu: 'naineBlanche', p: {},
    texte: 'Le cœur nu d’une étoile morte : la masse du Soleil tassée dans une boule grande comme la Terre. Une cuillère de sa matière pèse plusieurs tonnes. Elle tourne autour de Sirius A, l’étoile la plus brillante du ciel.' },
  { id: 'rxj1856', cat: 'compactes', nom: 'RX J1856.5−3754', type: 'Étoile à neutrons isolée', distance: '400 années-lumière', rendu: 'etoileNeutrons', p: {},
    texte: 'Plus d’une masse solaire dans une boule de 20 km : la matière y est aussi dense qu’un noyau d’atome. Une cuillère pèserait un milliard de tonnes. Celle-ci, l’une des plus proches, brille seulement par sa chaleur.' },
  { id: 'vela', cat: 'compactes', nom: 'Pulsar de Vela', type: 'Pulsar', distance: '1 000 années-lumière', rendu: 'pulsar', p: { periode: 0.089 },
    texte: 'Une étoile à neutrons qui tourne 11 fois par seconde en balayant l’espace de deux faisceaux, comme un phare. Chaque passage du faisceau sur la Terre fait un « bip » radio d’une régularité d’horloge atomique.' },
  { id: 'terzan5', cat: 'compactes', nom: 'PSR J1748−2446ad', type: 'Pulsar milliseconde', distance: '18 000 années-lumière', rendu: 'pulsar', p: { periode: 0.0014, rapide: true },
    texte: 'Le pulsar le plus rapide connu : 716 tours par seconde. Son équateur file à un quart de la vitesse de la lumière. Il a été « remonté » en avalant la matière d’une étoile compagne.' },
  { id: 'sgr1806', cat: 'compactes', nom: 'SGR 1806−20', type: 'Magnétar', distance: '42 000 années-lumière', rendu: 'magnetar', p: {},
    texte: 'Une étoile à neutrons au champ magnétique mille milliards de fois plus fort que celui de la Terre. En 2004, un tremblement de sa croûte a libéré en 0,2 s plus d’énergie que le Soleil en 100 000 ans.' },

  // ---------- Étoiles multiples ----------
  { id: 'betalyr', cat: 'multiples', nom: 'Bêta Lyrae', type: 'Binaire serrée avec transfert de masse', distance: '960 années-lumière', rendu: 'binaireTransfert', p: {},
    texte: 'Deux étoiles si proches qu’elles se touchent presque : l’une, déformée en goutte, se vide dans l’autre par un flot de gaz qui forme un disque. Elles font le tour l’une de l’autre en 13 jours.' },
  { id: 'algol', cat: 'multiples', nom: 'Algol', type: 'Binaire à éclipses', distance: '90 années-lumière', rendu: 'binaireEclipse', p: {},
    texte: 'L’« étoile du démon » : tous les 2,9 jours, sa lumière baisse pendant quelques heures. Ce sont deux étoiles qui passent l’une devant l’autre, vues par la tranche. La courbe de lumière en bas montre les éclipses.' },
  { id: 'albireo', cat: 'multiples', nom: 'Albireo', type: 'Étoile double large', distance: '430 années-lumière', rendu: 'binaireLarge', p: {},
    texte: 'Une des plus belles doubles du ciel dans un petit télescope : une étoile dorée et une étoile bleue. Le contraste des couleurs vient de leurs températures très différentes.' },
  { id: 'tcrb', cat: 'multiples', nom: 'T Coronae Borealis', type: 'Nova récurrente', distance: '3 000 années-lumière', rendu: 'binaireNova', p: {},
    texte: 'Une naine blanche aspire le gaz d’une géante rouge. Tous les 80 ans environ, l’hydrogène accumulé explose à sa surface : l’étoile devient d’un coup mille fois plus brillante. La prochaine explosion est attendue d’un jour à l’autre.' },
  { id: 'alphacen', cat: 'multiples', nom: 'Alpha Centauri', type: 'Système triple', distance: '4,37 années-lumière', rendu: 'triple', p: {},
    texte: 'Nos plus proches voisines : A et B tournent l’une autour de l’autre en 80 ans, et la petite Proxima tourne autour des deux en un demi-million d’années, à un cinquième d’année-lumière.' },
  { id: 'castor', cat: 'multiples', nom: 'Castor', type: 'Système sextuple', distance: '51 années-lumière', rendu: 'sextuple', p: {},
    texte: 'Ce qui ressemble à une étoile est en fait six étoiles : trois couples serrés, qui tournent les uns autour des autres. Le ciel est plein de familles d’étoiles.' },
  { id: 'doublepulsar', cat: 'multiples', nom: 'Double pulsar PSR J0737−3039', type: 'Deux étoiles à neutrons qui vont fusionner', distance: '2 400 années-lumière', rendu: 'fusion', p: { compact: 'neutrons' },
    texte: 'Deux pulsars qui tournent l’un autour de l’autre en 2 h 27. En émettant des ondes gravitationnelles, ils se rapprochent de 7 mm par jour : ils fusionneront dans 85 millions d’années. Un test parfait de la relativité d’Einstein.' },
  { id: 'gw150914', cat: 'multiples', nom: 'GW150914', type: 'Fusion de deux trous noirs', distance: '1,3 milliard d’années-lumière', rendu: 'fusion', p: { compact: 'trous' },
    texte: 'Le premier signal d’ondes gravitationnelles capté, en 2015 : deux trous noirs de 36 et 29 masses solaires ont fusionné, convertissant trois masses solaires en ondes qui ont déformé l’espace jusqu’à la Terre.' },

  // ---------- Trous noirs et extrêmes ----------
  { id: 'cygx1', cat: 'extremes', nom: 'Cygnus X-1', type: 'Trou noir stellaire avec compagne', distance: '7 200 années-lumière', rendu: 'trouNoir', p: { compagne: true },
    texte: 'Le premier trou noir identifié, en 1971 : 21 masses solaires. Il arrache le gaz d’une supergéante bleue ; ce gaz tourbillonne dans un disque et chauffe à des millions de degrés avant de tomber.' },
  { id: 'gaiabh1', cat: 'extremes', nom: 'Gaia BH1', type: 'Trou noir dormant', distance: '1 560 années-lumière', rendu: 'trouNoir', p: { dormant: true },
    texte: 'Le trou noir le plus proche connu. Il ne mange rien et n’émet rien : on l’a trouvé grâce au mouvement de l’étoile qui tourne autour, mesuré par le satellite Gaia. On voit ici la lumière des étoiles derrière, déformée par sa gravité.' },
  { id: 'sgra', cat: 'extremes', nom: 'Sagittarius A*', type: 'Trou noir supermassif', distance: '26 700 années-lumière', rendu: 'trouNoir', p: { supermassif: true, etoiles: true },
    texte: 'Le trou noir au centre de notre galaxie : 4 millions de masses solaires. Des étoiles tournent autour à des milliers de km/s ; leur suivi a valu un prix Nobel en 2020. Sa première image date de 2022.' },
  { id: 'm87', cat: 'extremes', nom: 'M87*', type: 'Trou noir supermassif', distance: '55 millions d’années-lumière', rendu: 'trouNoir', p: { supermassif: true, jets: true, image: true },
    texte: 'Le premier trou noir photographié, en 2019 : un anneau de lumière autour d’une ombre. 6,5 milliards de masses solaires, et un jet de matière qui file presque à la vitesse de la lumière sur 5 000 années-lumière.' },
  { id: '3c273', cat: 'extremes', nom: '3C 273', type: 'Quasar', distance: '2,4 milliards d’années-lumière', rendu: 'quasar', p: {},
    texte: 'Le premier quasar identifié : le cœur d’une galaxie où un trou noir géant dévore tant de matière qu’il brille comme 4 000 milliards de Soleils, plus que toute sa galaxie. On le voit d’ici avec un télescope d’amateur.' },

  // ---------- Explosions et restes ----------
  { id: 'sn1987a', cat: 'explosions', nom: 'SN 1987A', type: 'Supernova', distance: '168 000 années-lumière', rendu: 'supernova', p: { anneau: true },
    texte: 'L’explosion d’une étoile massive, vue en 1987 dans le Grand Nuage de Magellan. Son cœur s’est effondré en une fraction de seconde ; des neutrinos captés sur Terre l’ont annoncée avant la lumière. Le choc illumine aujourd’hui un anneau de gaz.' },
  { id: 'crabe', cat: 'explosions', nom: 'Nébuleuse du Crabe', type: 'Reste de supernova', distance: '6 500 années-lumière', rendu: 'crabe', p: {},
    texte: 'Les débris d’une étoile explosée en 1054, notée par des astronomes chinois : visible en plein jour pendant trois semaines. Au centre, le pulsar du Crabe tourne 30 fois par seconde et éclaire le nuage en bleu.' },
  { id: 'casA', cat: 'explosions', nom: 'Cassiopée A', type: 'Reste de supernova', distance: '11 000 années-lumière', rendu: 'coquille', p: {},
    texte: 'Une bulle de débris de 10 années-lumière qui s’étend à 5 000 km/s. On y voit le fer, le silicium et l’oxygène fabriqués par l’étoile avant de mourir : les éléments qui forment les planètes et les êtres vivants.' },
  { id: 'gw170817', cat: 'explosions', nom: 'GW170817', type: 'Kilonova', distance: '130 millions d’années-lumière', rendu: 'kilonova', p: {},
    texte: 'Deux étoiles à neutrons qui fusionnent, vues en 2017 à la fois en ondes gravitationnelles et en lumière. L’explosion a fabriqué plusieurs fois la masse de la Terre en or et en platine.' },
  { id: 'grb221009', cat: 'explosions', nom: 'GRB 221009A', type: 'Sursaut gamma', distance: '2,4 milliards d’années-lumière', rendu: 'sursaut', p: {},
    texte: 'Le « BOAT » (le plus brillant de tous les temps), en 2022 : l’effondrement d’une étoile géante en trou noir lance deux jets à 99,99 % de la vitesse de la lumière. Celui qui pointait vers nous a perturbé l’atmosphère de la Terre.' },

  // ---------- Nébuleuses ----------
  { id: 'm57', cat: 'nebuleuses', nom: 'Nébuleuse de l’Anneau (M57)', type: 'Nébuleuse planétaire', distance: '2 300 années-lumière', rendu: 'nebPlanetaire', p: {},
    texte: 'Une étoile comme le Soleil, en fin de vie, a soufflé ses couches externes en un anneau coloré. Au centre reste une naine blanche. C’est l’avenir du Soleil, dans 7 milliards d’années.' },
  { id: 'oeilchat', cat: 'nebuleuses', nom: 'Nébuleuse de l’Œil de Chat', type: 'Nébuleuse planétaire', distance: '3 300 années-lumière', rendu: 'nebPlanetaire', p: { coquilles: true },
    texte: 'Une des nébuleuses planétaires les plus complexes : des coquilles emboîtées et des jets, peut-être sculptés par une étoile compagne cachée au centre.' },
  { id: 'm42', cat: 'nebuleuses', nom: 'Nébuleuse d’Orion (M42)', type: 'Pépinière d’étoiles', distance: '1 344 années-lumière', rendu: 'nebuleuse', p: { palette: 'orion' },
    texte: 'La pépinière d’étoiles la plus proche, visible à l’œil nu sous l’épée d’Orion. Au centre, quatre jeunes étoiles brûlantes (le Trapèze) éclairent et sculptent le nuage où naissent des milliers d’autres.' },
  { id: 'piliers', cat: 'nebuleuses', nom: 'Piliers de la Création (M16)', type: 'Colonnes de gaz et de poussière', distance: '6 500 années-lumière', rendu: 'piliers', p: {},
    texte: 'Trois colonnes de gaz froid, hautes de plusieurs années-lumière, rongées par la lumière d’étoiles géantes voisines. À leurs sommets, des étoiles sont en train de naître.' },
  { id: 'carene', cat: 'nebuleuses', nom: 'Nébuleuse de la Carène', type: 'Grande région de formation d’étoiles', distance: '7 500 années-lumière', rendu: 'nebuleuse', p: { palette: 'carene' },
    texte: 'Une nébuleuse quatre fois plus grande qu’Orion, où vivent certaines des étoiles les plus massives de la galaxie, dont Eta Carinae. Ses « falaises cosmiques » ont été photographiées par le télescope James Webb.' },

  // ---------- Amas et galaxies ----------
  { id: 'pleiades', cat: 'amas', nom: 'Les Pléiades', type: 'Amas ouvert', distance: '444 années-lumière', rendu: 'amasOuvert', p: {},
    texte: 'Un groupe d’un millier d’étoiles jeunes (100 millions d’années), nées ensemble. Les plus brillantes, bleues, se voient à l’œil nu ; elles traversent un nuage de poussière qui les entoure d’un voile bleuté.' },
  { id: 'omegacen', cat: 'amas', nom: 'Oméga du Centaure', type: 'Amas globulaire', distance: '17 000 années-lumière', rendu: 'amasGlobulaire', p: {},
    texte: 'Dix millions d’étoiles serrées dans une boule, parmi les plus vieilles de la galaxie (12 milliards d’années). C’est peut-être le cœur d’une petite galaxie avalée par la nôtre.' },
  { id: 'voielactee', cat: 'amas', nom: 'La Voie lactée vue de loin', type: 'Notre galaxie', distance: '100 000 années-lumière de diamètre', rendu: 'galaxie', p: { faceOn: true, ici: true },
    texte: 'Notre galaxie : une spirale barrée de 200 à 400 milliards d’étoiles. Le Soleil est dans un bras secondaire, à 26 700 années-lumière du centre, et fait le tour de la galaxie en 230 millions d’années.' },
  { id: 'lmc', cat: 'amas', nom: 'Grand Nuage de Magellan', type: 'Galaxie naine', distance: '160 000 années-lumière', rendu: 'galaxieIrreguliere', p: {},
    texte: 'Une petite galaxie qui tourne autour de la nôtre, visible à l’œil nu depuis l’hémisphère Sud. Elle abrite la nébuleuse de la Tarentule et a accueilli la supernova SN 1987A.' },
  { id: 'andromede', cat: 'amas', nom: 'Galaxie d’Andromède (M31)', type: 'Galaxie spirale', distance: '2,5 millions d’années-lumière', rendu: 'galaxie', p: { incline: true },
    texte: 'La grande voisine, un peu plus grande que la Voie lactée : mille milliards d’étoiles. C’est l’objet le plus lointain visible à l’œil nu. Elle fonce vers nous : les deux galaxies fusionneront dans 4 à 5 milliards d’années.' },
  { id: 'antennes', cat: 'amas', nom: 'Galaxies des Antennes', type: 'Galaxies en collision', distance: '45 millions d’années-lumière', rendu: 'antennes', p: {},
    texte: 'Deux galaxies en pleine collision. Les étoiles ne se percutent presque jamais, mais les nuages de gaz se compriment et allument des milliers de nouvelles étoiles. Les marées gravitationnelles étirent deux longues « antennes ».' },

  // ---------- Exoplanètes ----------
  { id: '51peg', cat: 'planetes', nom: '51 Pegasi b', type: 'Jupiter chaud', distance: '50 années-lumière', rendu: 'exoplanete', p: { couleur: [210, 150, 100], periode: 4 },
    texte: 'La première planète découverte autour d’une étoile comme le Soleil, en 1995 (prix Nobel 2019). Une géante comme Jupiter, mais qui tourne si près de son étoile qu’elle en fait le tour en 4 jours, à plus de 1 000 °C.' },
  { id: 'hd189733b', cat: 'planetes', nom: 'HD 189733 b', type: 'Jupiter chaud bleu', distance: '64 années-lumière', rendu: 'exoplanete', p: { couleur: [70, 120, 230], periode: 2.2 },
    texte: 'Une géante d’un bleu profond, à cause de particules de verre dans son atmosphère. Il y pleut du verre à l’horizontale, poussé par des vents de 8 000 km/h.' },
  { id: 'trappist1', cat: 'planetes', nom: 'TRAPPIST-1', type: 'Sept planètes de la taille de la Terre', distance: '40 années-lumière', rendu: 'trappist', p: {},
    texte: 'Une petite naine rouge entourée de sept planètes rocheuses, toutes plus proches d’elle que Mercure du Soleil. Trois sont dans la zone où l’eau pourrait être liquide. Depuis l’une, les autres apparaîtraient plus grosses que la Lune.' },
];
const OBJET_CIEL_PAR_ID = Object.fromEntries(OBJETS_CIEL.map((o) => [o.id, o]));

// ---------- Outils de dessin ----------
const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
function halo(ctx, x, y, r, c, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgb(c, a)); g.addColorStop(0.35, rgb(c, a * 0.35)); g.addColorStop(1, rgb(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
}
function boule(ctx, x, y, r, c, clair = 1) {
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.05, x, y, r);
  g.addColorStop(0, rgb([Math.min(255, c[0] + 80 * clair), Math.min(255, c[1] + 80 * clair), Math.min(255, c[2] + 80 * clair)]));
  g.addColorStop(0.75, rgb(c)); g.addColorStop(1, rgb(c.map((v) => v * 0.55)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill();
}
const alea = (i, k = 0) => hash2(i * 1.37 + k * 17.11, k + 3);

const RENDUS_CIEL = {
  // Étoile : couleur, taille, taches, granulation, pulsation, vent, éruptions, disque de poussière, nuage.
  etoile(ctx, x, y, s, t, p) {
    let r = s * 0.55 * p.taille, lum = 1;
    if (p.pulse) { const k = Math.sin((2 * Math.PI * t) / p.pulse[1]); r *= 1 + p.pulse[0] * k; lum = 1 + p.pulse[0] * 1.5 * k; }
    if (p.nuage) for (let i = 0; i < 40; i++) {
      const a = alea(i) * 6.28, d = r * (1.4 + alea(i, 1) * 1.6);
      halo(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.4 + alea(i, 2) * 0.6), [150, 70, 50], 0.18);
    }
    if (p.disque) { ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.3); for (const k of [2.4, 3.2]) { ctx.strokeStyle = 'rgba(200,170,130,0.35)'; ctx.lineWidth = r * 0.25; ctx.beginPath(); ctx.arc(0, 0, r * k, 0, 2 * Math.PI); ctx.stroke(); } ctx.restore(); }
    if (p.vent) for (let i = 0; i < 3; i++) { const k = ((t * 0.25 + i / 3) % 1); ctx.strokeStyle = rgb(p.couleur, 0.25 * (1 - k)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * (1.2 + 2.5 * k), 0, 2 * Math.PI); ctx.stroke(); }
    halo(ctx, x, y, r * 2.6, p.couleur, 0.55 * lum);
    boule(ctx, x, y, r, p.couleur.map((v) => Math.min(255, v * lum)), 1);
    if (p.granul) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.clip();
      for (let i = 0; i < 26; i++) { const a = alea(i) * 6.28 + t * 0.03, d = r * Math.sqrt(alea(i, 1)); const c = 0.5 + 0.5 * Math.sin(t * 0.7 + i); halo(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.35, c > 0.5 ? [255, 220, 160] : [120, 30, 10], 0.25); }
      ctx.restore();
    }
    if (p.taches) {
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.clip();
      for (let i = 0; i < p.taches; i++) {
        const lon = (alea(i) * 6.28 + t * 0.15) % 6.28, lat = (alea(i, 1) - 0.5) * 1.2;
        if (Math.cos(lon) < 0) continue;
        const px = x + Math.sin(lon) * Math.cos(lat) * r, py = y + Math.sin(lat) * r;
        ctx.fillStyle = 'rgba(60,20,0,0.45)'; ctx.beginPath(); ctx.ellipse(px, py, r * 0.06 * Math.cos(lon) + 1, r * 0.06, 0, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.restore();
    }
    if (p.eruption && Math.sin(t * 0.9) > 0.92) halo(ctx, x + r * 0.7, y - r * 0.5, r * 0.9, [255, 255, 230], 0.7);
    if (p.cepheide) {
      // Courbe de lumière : on voit la pulsation régulière.
      ctx.strokeStyle = 'rgba(255,225,150,0.8)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const tt = t - (120 - i) * 0.05, v = Math.sin((2 * Math.PI * tt) / p.pulse[1]); const px = x - s + (i / 120) * 2 * s, py = y + s * 0.95 - v * s * 0.08; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
    }
  },
  naineBlanche(ctx, x, y, s, t) {
    // Sirius A brillante au loin, et la minuscule Sirius B.
    halo(ctx, x - s * 0.6, y - s * 0.2, s * 0.9, [200, 220, 255], 0.7); boule(ctx, x - s * 0.6, y - s * 0.2, s * 0.22, [215, 230, 255]);
    const a = t * 0.3, bx = x + Math.cos(a) * s * 0.6, by = y + Math.sin(a) * s * 0.25;
    halo(ctx, bx, by, s * 0.25, [230, 240, 255], 0.9); boule(ctx, bx, by, s * 0.035, [245, 248, 255]);
  },
  naineBrune(ctx, x, y, s, t) {
    for (const [dx, r, c] of [[-0.45, 0.28, [150, 60, 90]], [0.45, 0.26, [120, 55, 95]]]) {
      const px = x + dx * s * Math.cos(t * 0.2), py = y + dx * s * 0.2 * Math.sin(t * 0.2);
      halo(ctx, px, py, r * s * 1.6, [160, 60, 80], 0.25); boule(ctx, px, py, r * s, c, 0.4);
      ctx.save(); ctx.beginPath(); ctx.arc(px, py, r * s, 0, 2 * Math.PI); ctx.clip();
      for (let i = -3; i <= 3; i++) { ctx.fillStyle = i % 2 ? 'rgba(60,20,40,0.35)' : 'rgba(200,110,120,0.18)'; ctx.fillRect(px - r * s, py + i * r * s * 0.28 + Math.sin(t + i) * 2, 2 * r * s, r * s * 0.14); }
      ctx.restore();
    }
  },
  protoEtoile(ctx, x, y, s, t) {
    halo(ctx, x, y, s * 1.4, [200, 120, 60], 0.25);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4); ctx.scale(1, 0.38);
    for (let i = 12; i > 0; i--) { const k = i / 12; ctx.fillStyle = `rgba(${230 - 80 * k},${150 - 60 * k},${90 - 40 * k},${[4, 7, 10].includes(i) ? 0.05 : 0.22})`; ctx.beginPath(); ctx.arc(0, 0, s * 0.95 * k, 0, 2 * Math.PI); ctx.fill(); }
    ctx.restore();
    // Jets aux pôles
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4);
    for (const sg of [-1, 1]) for (let i = 0; i < 8; i++) { const k = ((t * 0.5 + i / 8) % 1); halo(ctx, Math.sin(t + i) * 3, sg * s * (0.1 + 1.1 * k), s * 0.07 * (1 - k * 0.5), [150, 190, 255], 0.5 * (1 - k)); }
    ctx.restore();
    halo(ctx, x, y, s * 0.18, [255, 220, 170], 1);
  },
  etaCarinae(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6);
    for (const sg of [-1, 1]) for (let i = 0; i < 30; i++) {
      const k = alea(i, sg + 5), a = (alea(i, 2) - 0.5) * 1.6;
      halo(ctx, Math.sin(a) * s * 0.45 * k, sg * s * (0.15 + 0.6 * k), s * 0.22, [210, 140, 110], 0.13);
    }
    ctx.restore();
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.6); ctx.scale(1, 0.25); halo(ctx, 0, 0, s * 0.7, [230, 190, 160], 0.3); ctx.restore();
    halo(ctx, x, y, s * 0.3 * (1 + 0.1 * Math.sin(t * 3)), [220, 230, 255], 1);
  },
  wolfRayet(ctx, x, y, s, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.15);
    for (let bras = 0; bras < 1; bras++) for (let i = 0; i < 260; i++) {
      const th = i * 0.06, r = s * 0.03 * th * 1.4;
      halo(ctx, Math.cos(th) * r, Math.sin(th) * r, s * 0.05 + th * 0.6, [255, 170, 90], 0.1 * Math.max(0, 1 - i / 260));
    }
    ctx.restore();
    halo(ctx, x, y, s * 0.12, [210, 230, 255], 1);
  },
  etoileNeutrons(ctx, x, y, s, t) {
    halo(ctx, x, y, s * 0.6, [140, 180, 255], 0.5);
    boule(ctx, x, y, s * 0.05, [210, 225, 255]);
    // Lumière déviée par la gravité : on voit même un peu l'arrière de l'étoile.
    ctx.strokeStyle = 'rgba(180,210,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, s * 0.075 + Math.sin(t * 2), 0, 2 * Math.PI); ctx.stroke();
  },
  pulsar(ctx, x, y, s, t, p) {
    // Le vrai rythme est trop rapide à l'œil : on le ralentit (×50 ou ×1000), l'effet de phare reste.
    const w = (2 * Math.PI) / (p.periode * (p.rapide ? 1000 : 50));
    const ang = t * w;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    for (const sg of [0, Math.PI]) {
      const g = ctx.createLinearGradient(0, 0, Math.cos(sg) * s * 1.3, Math.sin(sg) * s * 1.3);
      g.addColorStop(0, 'rgba(170,210,255,0.85)'); g.addColorStop(1, 'rgba(170,210,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, s * 1.3, sg - 0.12, sg + 0.12); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const flash = Math.max(0, Math.cos(ang)) ** 40;
    halo(ctx, x, y, s * (0.25 + 0.35 * flash), [190, 220, 255], 0.9);
    boule(ctx, x, y, s * 0.04, [230, 240, 255]);
  },
  magnetar(ctx, x, y, s, t) {
    ctx.strokeStyle = 'rgba(200,120,255,0.45)'; ctx.lineWidth = 1.5;
    for (let i = 1; i <= 7; i++) for (const sg of [-1, 1]) {
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) { const th = (k / 60) * Math.PI, r = s * 0.12 * i * Math.sin(th) ** 2; const px = x + sg * r * Math.sin(th), py = y - r * Math.cos(th); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
    }
    const sursaut = (t % 7) < 0.6 ? 1 - (t % 7) / 0.6 : 0;
    if (sursaut) halo(ctx, x, y, s * 1.6 * (1.2 - sursaut), [230, 200, 255], sursaut);
    halo(ctx, x, y, s * 0.3, [200, 160, 255], 0.8); boule(ctx, x, y, s * 0.04, [235, 220, 255]);
  },
  binaireTransfert(ctx, x, y, s, t) {
    const a = t * 0.35, d = s * 0.42;
    const ax = x + Math.cos(a) * d, ay = y + Math.sin(a) * d * 0.5, bx = x - Math.cos(a) * d, by = y - Math.sin(a) * d * 0.5;
    // Disque autour de l'accrétrice et flot de gaz depuis la donneuse en goutte.
    ctx.save(); ctx.translate(bx, by); ctx.scale(1, 0.4); halo(ctx, 0, 0, s * 0.35, [200, 200, 255], 0.6); ctx.restore();
    ctx.strokeStyle = 'rgba(255,220,180,0.6)'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + bx) / 2 + Math.sin(a) * s * 0.2, (ay + by) / 2 - Math.cos(a) * s * 0.1, bx, by); ctx.stroke();
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(Math.atan2(by - ay, bx - ax)); ctx.scale(1.35, 1); boule(ctx, 0, 0, s * 0.2, [180, 200, 255]); ctx.restore();
    halo(ctx, bx, by, s * 0.15, [220, 230, 255], 1);
  },
  binaireEclipse(ctx, x, y, s, t) {
    const P = 8, a = (2 * Math.PI * t) / P, d = s * 0.45;
    const A = { px: x + Math.cos(a) * d * 0.5, z: Math.sin(a), r: s * 0.22, c: [190, 210, 255] };
    const B = { px: x - Math.cos(a) * d, z: -Math.sin(a), r: s * 0.3, c: [255, 170, 90] };
    for (const o of [A, B].sort((m, n) => n.z - m.z)) { halo(ctx, o.px, y, o.r * 2, o.c, 0.4); boule(ctx, o.px, y, o.r, o.c); }
    // Courbe de lumière : creux quand une étoile passe devant l'autre.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const tt = t - (160 - i) * 0.06, aa = (2 * Math.PI * tt) / P;
      const sep = Math.abs(Math.cos(aa) * d * 1.5);
      const recouv = Math.max(0, 1 - sep / (s * 0.52));
      const lum = 1 - recouv * (Math.sin(aa) > 0 ? 0.6 : 0.2);
      const px = x - s + (i / 160) * 2 * s, py = y + s * 0.9 - lum * s * 0.25;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
  },
  binaireLarge(ctx, x, y, s, t) {
    const a = t * 0.03;
    halo(ctx, x - s * 0.5 + Math.cos(a) * 4, y, s * 0.6, [255, 200, 90], 0.6); boule(ctx, x - s * 0.5 + Math.cos(a) * 4, y, s * 0.13, [255, 205, 110]);
    halo(ctx, x + s * 0.55, y - s * 0.12, s * 0.45, [120, 160, 255], 0.6); boule(ctx, x + s * 0.55, y - s * 0.12, s * 0.09, [150, 185, 255]);
  },
  binaireNova(ctx, x, y, s, t) {
    const a = t * 0.4, gx = x - s * 0.35, gy = y, wx = x + Math.cos(a) * s * 0.5, wy = y + Math.sin(a) * s * 0.15;
    halo(ctx, gx, gy, s * 0.8, [255, 110, 60], 0.35); boule(ctx, gx, gy, s * 0.32, [230, 90, 50]);
    ctx.save(); ctx.translate(wx, wy); ctx.scale(1, 0.4); halo(ctx, 0, 0, s * 0.18, [255, 230, 200], 0.7); ctx.restore();
    ctx.strokeStyle = 'rgba(255,170,120,0.5)'; ctx.lineWidth = s * 0.02; ctx.beginPath(); ctx.moveTo(gx + s * 0.3, gy); ctx.lineTo(wx, wy); ctx.stroke();
    const c = t % 10;
    if (c < 3) { const k = c / 3; halo(ctx, wx, wy, s * (0.2 + 1.4 * k), [255, 250, 230], 1 - k); ctx.strokeStyle = `rgba(255,240,220,${0.6 * (1 - k)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(wx, wy, s * (0.1 + 1.2 * k), 0, 2 * Math.PI); ctx.stroke(); }
    boule(ctx, wx, wy, s * 0.04, [240, 245, 255]);
  },
  triple(ctx, x, y, s, t) {
    const a = t * 0.25;
    for (const [sg, r, c] of [[1, 0.17, [255, 240, 200]], [-1, 0.13, [255, 200, 130]]]) {
      const px = x - s * 0.2 + sg * Math.cos(a) * s * 0.25, py = y + sg * Math.sin(a) * s * 0.12;
      halo(ctx, px, py, s * r * 3, c, 0.5); boule(ctx, px, py, s * r, c);
    }
    const px = x + s * 0.8 + Math.cos(t * 0.02) * 3, py = y - s * 0.55;
    halo(ctx, px, py, s * 0.2, [255, 110, 60], 0.6); boule(ctx, px, py, s * 0.05, [255, 120, 70]);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '12px system-ui'; ctx.fillText('Proxima', px + 8, py - 8);
  },
  sextuple(ctx, x, y, s, t) {
    const couples = [[-0.5, -0.1, [235, 240, 255]], [0.35, 0.05, [230, 238, 255]], [0.1, 0.7, [255, 140, 90]]];
    couples.forEach(([cx, cy, c], i) => {
      const a = t * (0.6 + i * 0.2), X = x + cx * s, Y = y + cy * s;
      for (const sg of [1, -1]) { const px = X + sg * Math.cos(a) * s * 0.08, py = Y + sg * Math.sin(a) * s * 0.03; halo(ctx, px, py, s * 0.18, c, 0.5); boule(ctx, px, py, s * 0.04, c); }
    });
  },
  fusion(ctx, x, y, s, t, p) {
    const cycle = 14, c = t % cycle, k = Math.min(1, c / 11);
    const d = s * 0.6 * (1 - k ** 3) + s * 0.02, a = (c * 2) / Math.max(0.12, 1 - k) ** 1.2;
    const coul = p.compact === 'trous' ? [0, 0, 0] : [200, 220, 255];
    // Ondes gravitationnelles : anneaux qui partent du couple, de plus en plus serrés.
    for (let i = 0; i < 10; i++) { const r = ((c * (60 + 300 * k) + i * 40) % (s * 2.2)); ctx.strokeStyle = `rgba(150,180,255,${0.25 * (1 - r / (s * 2.2))})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke(); }
    if (c < 11) {
      for (const sg of [1, -1]) {
        const px = x + sg * Math.cos(a) * d, py = y + sg * Math.sin(a) * d * 0.6;
        if (p.compact === 'trous') { halo(ctx, px, py, s * 0.18, [255, 180, 100], 0.4); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(px, py, s * 0.07, 0, 2 * Math.PI); ctx.fill(); }
        else { halo(ctx, px, py, s * 0.15, coul, 0.8); boule(ctx, px, py, s * 0.03, coul); }
      }
    } else {
      const f = (c - 11) / 3;
      halo(ctx, x, y, s * (0.3 + 1.2 * f), p.compact === 'trous' ? [190, 210, 255] : [255, 220, 170], 1 - f);
      if (p.compact === 'trous') { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, s * 0.1, 0, 2 * Math.PI); ctx.fill(); }
    }
  },
  trouNoir(ctx, x, y, s, t, p) {
    const R = s * (p.supermassif ? 0.18 : 0.14);
    if (p.dormant) {
      // Lentille gravitationnelle : les étoiles derrière sont déviées en arcs autour de l'ombre.
      for (let i = 0; i < 70; i++) {
        const a = alea(i) * 6.28 + t * 0.02, d = R * (1.3 + alea(i, 1) * 5);
        const dev = R * R * 1.8 / d;
        const px = x + Math.cos(a) * (d + dev), py = y + Math.sin(a) * (d + dev);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(px, py, 1.6, 1.6);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, R * 1.5, 0, 2 * Math.PI); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, R, 0, 2 * Math.PI); ctx.fill();
      const ex = x + Math.cos(t * 0.3) * s * 0.9, ey = y + Math.sin(t * 0.3) * s * 0.3;
      halo(ctx, ex, ey, s * 0.2, [255, 240, 200], 0.7); boule(ctx, ex, ey, s * 0.05, [255, 240, 210]);
      return;
    }
    if (p.compagne) {
      const cx = x + s * 0.85, cy = y - s * 0.2;
      halo(ctx, cx, cy, s * 0.7, [140, 170, 255], 0.5); boule(ctx, cx, cy, s * 0.26, [160, 190, 255]);
      ctx.strokeStyle = 'rgba(200,210,255,0.45)'; ctx.lineWidth = s * 0.03; ctx.beginPath(); ctx.moveTo(cx - s * 0.25, cy); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.4, x + R * 2, y); ctx.stroke();
    }
    if (p.jets) for (const sg of [-1, 1]) {
      const g = ctx.createLinearGradient(x, y, x + sg * s * 1.5, y - sg * s * 1.5 * 0.4);
      g.addColorStop(0, 'rgba(160,200,255,0.8)'); g.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sg * s * 1.5, y - sg * s * 0.6); ctx.stroke();
    }
    if (p.etoiles) for (let i = 0; i < 5; i++) {
      const a = t * (0.5 + i * 0.15) + i, ex = x + Math.cos(a) * s * (0.6 + i * 0.12), ey = y + Math.sin(a) * s * (0.25 + i * 0.05);
      halo(ctx, ex, ey, s * 0.06, [220, 230, 255], 0.9);
    }
    // Disque d'accrétion : plus brillant du côté qui vient vers nous (effet Doppler), arrière du disque déformé au-dessus.
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * 2 * Math.PI + t * 0.8, rr = R * (1.6 + (i % 7) * 0.25);
      const dop = 0.45 + 0.55 * Math.max(0, Math.cos(a));
      halo(ctx, Math.cos(a) * rr * 1.9, Math.sin(a) * rr * 0.32, R * 0.55, [255, 170 + 60 * dop, 90 + 80 * dop], 0.22 * dop + 0.05);
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,200,130,0.5)'; ctx.lineWidth = R * 0.35; ctx.beginPath(); ctx.ellipse(x, y - R * 0.1, R * 1.55, R * 1.35, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,200,0.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * 1.12, 0, 2 * Math.PI); ctx.stroke();   // anneau de photons
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x, y, R, 0, 2 * Math.PI); ctx.fill();
  },
  quasar(ctx, x, y, s, t) {
    for (let i = 0; i < 200; i++) { const a = alea(i) * 6.28, d = s * 0.9 * Math.sqrt(alea(i, 1)); ctx.fillStyle = 'rgba(255,230,200,0.25)'; ctx.fillRect(x + Math.cos(a) * d * 1.4, y + Math.sin(a) * d * 0.7, 1.5, 1.5); }
    for (const sg of [-1, 1]) for (let i = 0; i < 12; i++) { const k = ((t * 0.6 + i / 12) % 1); halo(ctx, x + sg * s * 1.4 * k, y - sg * s * 0.5 * k, s * 0.09, [150, 200, 255], 0.6 * (1 - k)); }
    halo(ctx, x, y, s * 0.6 * (1 + 0.08 * Math.sin(t * 5)), [230, 240, 255], 1);
  },
  supernova(ctx, x, y, s, t, p) {
    const c = t % 16;
    if (p.anneau) { ctx.save(); ctx.translate(x, y); ctx.rotate(0.6); ctx.scale(1, 0.55); ctx.strokeStyle = `rgba(255,190,150,${c > 6 ? 0.8 : 0.25})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, s * 0.75, 0, 2 * Math.PI); ctx.stroke();
      if (c > 6) for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.28; halo(ctx, Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.75, s * 0.05, [255, 230, 200], 0.9); }
      ctx.restore(); }
    if (c < 2) { boule(ctx, x, y, s * 0.12, [170, 200, 255]); halo(ctx, x, y, s * 0.35, [170, 200, 255], 0.6); return; }
    const k = (c - 2) / 14;
    halo(ctx, x, y, s * (0.3 + 1.6 * Math.sqrt(k)), [255, 240, 210], Math.max(0, 1 - k * 1.3));
    for (let i = 0; i < 60; i++) { const a = alea(i) * 6.28, d = s * 0.6 * Math.sqrt(k) * (0.6 + alea(i, 1) * 0.5); halo(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, s * 0.06, [255, 150, 90], 0.4 * (1 - k)); }
  },
  crabe(ctx, x, y, s, t) {
    halo(ctx, x, y, s * 0.8, [110, 140, 255], 0.5);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 70; i++) {
      const a0 = alea(i) * 6.28, l = s * (0.4 + alea(i, 1) * 0.6);
      ctx.strokeStyle = `rgba(255,${110 + alea(i, 2) * 90},80,0.6)`; ctx.beginPath(); ctx.moveTo(x + Math.cos(a0) * s * 0.15, y + Math.sin(a0) * s * 0.12);
      for (let k = 1; k <= 6; k++) { const a = a0 + (alea(i, k + 3) - 0.5) * 0.4; ctx.lineTo(x + Math.cos(a) * l * (k / 6) * 1.25, y + Math.sin(a) * l * (k / 6) * 0.9); }
      ctx.stroke();
    }
    RENDUS_CIEL.pulsar(ctx, x, y, s * 0.4, t, { periode: 0.033 });
  },
  coquille(ctx, x, y, s, t) {
    for (let i = 0; i < 120; i++) {
      const a = alea(i) * 6.28, d = s * (0.62 + (alea(i, 1) - 0.5) * 0.18) * (1 + 0.02 * Math.sin(t * 0.3));
      const c = [[120, 200, 255], [255, 120, 90], [140, 255, 160], [255, 220, 120]][i % 4];
      halo(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, s * 0.09, c, 0.28);
    }
    halo(ctx, x, y, s * 0.4, [120, 160, 255], 0.2);
  },
  kilonova(ctx, x, y, s, t) {
    const c = t % 12;
    if (c < 6) { RENDUS_CIEL.fusion(ctx, x, y, s, c * (11 / 6), { compact: 'neutrons' }); return; }
    const k = (c - 6) / 6;
    halo(ctx, x, y, s * (0.3 + 1.1 * k), [120, 170, 255], 1 - k);
    halo(ctx, x, y, s * (0.2 + 0.8 * k), [255, 110, 70], (1 - k) * 0.9);
    for (const sg of [-1, 1]) { ctx.strokeStyle = `rgba(230,240,255,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sg * s * 0.2, y - sg * s * 1.3 * Math.min(1, k * 3)); ctx.stroke(); }
  },
  sursaut(ctx, x, y, s, t) {
    const c = t % 9, f = c < 1.2 ? 1 - c / 1.2 : 0;
    for (const sg of [-1, 1]) {
      const g = ctx.createLinearGradient(x, y, x + sg * s * 0.3, y - sg * s * 1.5);
      g.addColorStop(0, `rgba(240,245,255,${0.4 + 0.6 * f})`); g.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sg * s * 0.22 - s * 0.05, y - sg * s * 1.5); ctx.lineTo(x + sg * s * 0.22 + s * 0.05, y - sg * s * 1.5); ctx.closePath(); ctx.fill();
    }
    halo(ctx, x, y, s * (0.25 + 1.8 * f), [255, 250, 235], 0.6 + 0.4 * f);
    halo(ctx, x, y, s * 0.5, [255, 140, 80], 0.3);
  },
  nebPlanetaire(ctx, x, y, s, t, p) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.3);
    const couches = p.coquilles ? [[1, [255, 90, 90]], [0.8, [120, 255, 170]], [0.6, [255, 200, 120]], [0.45, [110, 170, 255]]] : [[1, [255, 100, 90]], [0.78, [255, 210, 120]], [0.55, [120, 230, 220]]];
    for (const [k, c] of couches) { ctx.save(); ctx.scale(1, p.coquilles ? 0.7 + 0.1 * Math.sin(t * 0.2 + k * 5) : 0.78); ctx.strokeStyle = rgb(c, 0.45); ctx.lineWidth = s * 0.14 * k; ctx.beginPath(); ctx.arc(0, 0, s * 0.62 * k, 0, 2 * Math.PI); ctx.stroke(); ctx.restore(); }
    halo(ctx, 0, 0, s * 0.35, [110, 160, 255], 0.35);
    ctx.restore();
    halo(ctx, x, y, s * 0.05, [240, 245, 255], 1);
  },
  nebuleuse(ctx, x, y, s, t, p) {
    const pal = p.palette === 'carene' ? [[255, 150, 90], [120, 170, 255], [200, 110, 80], [255, 210, 150]] : [[255, 120, 170], [255, 180, 120], [120, 160, 255], [200, 100, 140]];
    for (let i = 0; i < 70; i++) {
      const a = alea(i) * 6.28, d = s * Math.sqrt(alea(i, 1)) * 0.95;
      halo(ctx, x + Math.cos(a) * d * 1.3 + Math.sin(t * 0.1 + i) * 2, y + Math.sin(a) * d, s * (0.15 + alea(i, 2) * 0.3), pal[i % 4], 0.13);
    }
    for (let i = 0; i < 25; i++) { const a = alea(i, 9) * 6.28, d = s * alea(i, 8) * 0.9; ctx.fillStyle = 'rgba(30,10,20,0.35)'; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, s * 0.12, s * 0.04, a, 0, 2 * Math.PI); ctx.fill(); }
    for (let i = 0; i < 4; i++) halo(ctx, x + (i % 2 - 0.5) * s * 0.08, y + (Math.floor(i / 2) - 0.5) * s * 0.07, s * 0.07, [220, 235, 255], 1);   // Trapèze
  },
  piliers(ctx, x, y, s, t) {
    halo(ctx, x, y - s * 0.3, s * 1.6, [80, 170, 170], 0.35);
    halo(ctx, x + s * 0.6, y - s * 0.8, s * 1.1, [255, 190, 120], 0.25);
    const piliers = [[-0.55, 0.9, 0.17], [0.0, 1.35, 0.2], [0.5, 0.7, 0.14]];
    for (const [dx, h, w] of piliers) {
      const bx = x + dx * s, by = y + s * 0.9;
      ctx.fillStyle = 'rgba(60,40,30,0.92)';
      ctx.beginPath(); ctx.moveTo(bx - w * s, by);
      for (let k = 0; k <= 20; k++) { const f = k / 20; ctx.lineTo(bx - w * s * (1 - f * 0.55) + Math.sin(f * 9 + dx) * s * 0.02, by - h * s * f); }
      for (let k = 20; k >= 0; k--) { const f = k / 20; ctx.lineTo(bx + w * s * (1 - f * 0.5) + Math.sin(f * 7 + dx) * s * 0.02, by - h * s * f); }
      ctx.closePath(); ctx.fill();
      halo(ctx, bx, by - h * s, w * s * 1.3, [255, 220, 170], 0.45 + 0.1 * Math.sin(t + dx * 5));
    }
  },
  amasOuvert(ctx, x, y, s, t) {
    for (let i = 0; i < 6; i++) halo(ctx, x + (alea(i, 4) - 0.5) * s * 1.2, y + (alea(i, 5) - 0.5) * s * 0.8, s * 0.35, [120, 160, 255], 0.12);
    for (let i = 0; i < 9; i++) { const px = x + (alea(i) - 0.5) * s * 1.4, py = y + (alea(i, 1) - 0.5) * s; halo(ctx, px, py, s * 0.09 * (0.8 + 0.2 * Math.sin(t * 2 + i)), [200, 220, 255], 1); }
    for (let i = 0; i < 60; i++) { ctx.fillStyle = 'rgba(220,230,255,0.7)'; ctx.fillRect(x + (alea(i, 7) - 0.5) * s * 1.8, y + (alea(i, 8) - 0.5) * s * 1.2, 1.5, 1.5); }
  },
  amasGlobulaire(ctx, x, y, s) {
    halo(ctx, x, y, s * 0.7, [255, 230, 190], 0.5);
    for (let i = 0; i < 2500; i++) {
      const a = alea(i) * 6.28, d = s * 0.8 * Math.pow(alea(i, 1), 1.8);
      const c = alea(i, 2) > 0.85 ? '255,190,140' : '255,245,225';
      ctx.fillStyle = `rgba(${c},0.75)`; ctx.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.3, 1.3);
    }
  },
  galaxie(ctx, x, y, s, t, p) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.incline ? -0.6 : t * 0.01); if (p.incline) ctx.scale(1, 0.32);
    halo(ctx, 0, 0, s * 1.05, [180, 170, 220], 0.25);
    for (let bras = 0; bras < 2; bras++) for (let i = 0; i < 700; i++) {
      const k = i / 700, th = k * 4.4 + bras * Math.PI, r = s * (0.12 + 0.85 * k);
      const ex = (alea(i, bras) - 0.5) * s * 0.12;
      ctx.fillStyle = alea(i, bras + 5) > 0.8 ? 'rgba(255,150,190,0.55)' : 'rgba(190,210,255,0.5)';
      ctx.fillRect(Math.cos(th) * r + ex, Math.sin(th) * r + ex, 1.6, 1.6);
    }
    ctx.save(); ctx.scale(1, 0.45); halo(ctx, 0, 0, s * 0.3, [255, 230, 180], 0.9); ctx.restore();
    if (p.ici) { const th = 2.9, r = s * 0.55; ctx.fillStyle = '#ffd666'; ctx.beginPath(); ctx.arc(Math.cos(th) * r, Math.sin(th) * r, 4, 0, 2 * Math.PI); ctx.fill(); ctx.font = '13px system-ui'; ctx.fillText('Soleil (vous êtes ici)', Math.cos(th) * r + 8, Math.sin(th) * r - 6); }
    ctx.restore();
  },
  galaxieIrreguliere(ctx, x, y, s) {
    halo(ctx, x, y, s * 0.9, [190, 200, 255], 0.25);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.3); ctx.scale(1.6, 0.4); halo(ctx, 0, 0, s * 0.35, [255, 235, 200], 0.6); ctx.restore();
    for (let i = 0; i < 900; i++) { const a = alea(i) * 6.28, d = s * Math.sqrt(alea(i, 1)) * 0.8; ctx.fillStyle = 'rgba(210,220,255,0.5)'; ctx.fillRect(x + Math.cos(a) * d * 1.3, y + Math.sin(a) * d * 0.8, 1.4, 1.4); }
    halo(ctx, x - s * 0.35, y - s * 0.25, s * 0.18, [255, 120, 170], 0.7);   // Tarentule
  },
  antennes(ctx, x, y, s, t) {
    for (const [dx, dy, rot] of [[-0.25, -0.1, 0.5], [0.25, 0.12, -2.4]]) {
      ctx.save(); ctx.translate(x + dx * s, y + dy * s); ctx.rotate(rot);
      halo(ctx, 0, 0, s * 0.35, [255, 220, 180], 0.6);
      for (let i = 0; i < 400; i++) { const k = i / 400, r = s * (0.1 + 1.0 * k), th = k * 2.2; ctx.fillStyle = 'rgba(190,210,255,0.45)'; ctx.fillRect(Math.cos(th) * r + (alea(i) - 0.5) * s * 0.08, Math.sin(th) * r * 0.5, 1.5, 1.5); }
      ctx.restore();
    }
    for (let i = 0; i < 18; i++) halo(ctx, x + (alea(i, 3) - 0.5) * s * 0.5, y + (alea(i, 4) - 0.5) * s * 0.3, s * 0.05, [255, 120, 170], 0.7 + 0.2 * Math.sin(t + i));
  },
  exoplanete(ctx, x, y, s, t, p) {
    halo(ctx, x, y, s * 0.9, [255, 230, 180], 0.6); boule(ctx, x, y, s * 0.28, [255, 235, 190]);
    const a = (2 * Math.PI * t) / (p.periode * 3), px = x + Math.cos(a) * s * 0.75, py = y + Math.sin(a) * s * 0.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.75, s * 0.2, 0, 0, 2 * Math.PI); ctx.stroke();
    const devant = Math.sin(a) > 0;
    if (!devant) { boule(ctx, px, py, s * 0.1, p.couleur, 0.5); boule(ctx, x, y, s * 0.28, [255, 235, 190]); }
    else boule(ctx, px, py, s * 0.1, p.couleur, 0.5);
  },
  trappist(ctx, x, y, s, t) {
    halo(ctx, x, y, s * 0.5, [255, 100, 60], 0.6); boule(ctx, x, y, s * 0.12, [255, 110, 70]);
    const periodes = [1.5, 2.4, 4.0, 6.1, 9.2, 12.4, 18.8];
    periodes.forEach((P, i) => {
      const r = s * (0.22 + i * 0.11), a = (2 * Math.PI * t) / (P * 2) + i;
      ctx.strokeStyle = (i >= 3 && i <= 5) ? 'rgba(120,220,140,0.35)' : 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, 0, 0, 2 * Math.PI); ctx.stroke();
      boule(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, s * 0.03, [[200, 170, 150], [190, 150, 130], [170, 160, 150], [120, 160, 200], [130, 170, 200], [150, 170, 190], [170, 180, 200]][i], 0.4);
    });
  },
};

// ---------- Vue d'observation (scène plein écran) ----------
class Observation {
  constructor(objet) {
    this.o = objet;
    this.t = 0;
    this.zoom = 1;
    this.fini = false;
    this.etoiles = Array.from({ length: 220 }, (_, i) => [hash(i * 2.3), hash(i * 5.9), 0.2 + 0.8 * hash(i * 1.1)]);
  }
  step(dt) { if (dt > 0) this.t += dt; }
  passer() { this.fini = true; }
  zoomer(f) { this.zoom = Math.max(0.3, Math.min(6, this.zoom * f)); }
  molette(e) { this.zoomer(Math.exp(-e.deltaY * 0.0012)); }
  touche(e) {
    if (['Equal', 'NumpadAdd', 'BracketRight'].includes(e.code) || e.key === '+') this.zoomer(1.25);
    if (['Minus', 'NumpadSubtract', 'Digit6'].includes(e.code) || e.key === '-') this.zoomer(1 / 1.25);
  }
  // Boutons de zoom en bas à droite ; ailleurs, un clic ou un toucher ramène à la liste.
  clic(x, y) {
    for (const b of this.boutons || []) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this.zoomer(b.f); return true; }
    return false;
  }
  dessiner(ctx, W, H) {
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H);
    for (const [x, y, b] of this.etoiles) { ctx.fillStyle = `rgba(255,255,255,${b * 0.7})`; ctx.fillRect(x * W, y * H, 1.2, 1.2); }
    const compact = W < 700;
    const cx = compact ? W / 2 : W * 0.6, cy = compact ? H * 0.6 : H * 0.52;
    const s = Math.min(W, H) * 0.34 * this.zoom;
    ctx.save();
    try { (RENDUS_CIEL[this.o.rendu] || RENDUS_CIEL.etoile)(ctx, cx, cy, s, this.t, this.o.p || {}); } catch (e) { console.error(e); }
    ctx.restore();
    // Panneau : nom, type, distance, explication.
    const x0 = 14, w = compact ? W - 28 : Math.min(420, W * 0.36), taille = compact ? 12.5 : 13.5;
    const lignes = [[this.o.nom, '#ffffff', `600 ${taille + 5}px system-ui, sans-serif`], [this.o.type, '#ffd666', `600 ${taille}px system-ui, sans-serif`],
      [`Distance : ${this.o.distance}`, '#bfe0ff', `${taille}px system-ui, sans-serif`], [this.o.texte, '#e6edf6', `${taille}px system-ui, sans-serif`]];
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const ecrire = (dessiner) => { let yy = 22; for (const [t, c, f] of lignes) { ctx.font = f; ctx.fillStyle = c; yy = ecrireLignes(ctx, t, x0 + 12, yy, w - 24, taille + 8, dessiner) + 4; } return yy; };
    const h = ecrire(false) - 14 + 8;
    ctx.fillStyle = 'rgba(8,14,28,0.78)'; ctx.beginPath(); ctx.roundRect(x0, 14, w, h, 10); ctx.fill();
    ecrire(true);
    ctx.restore();
    // Boutons de zoom
    const bw = 42;
    this.boutons = [{ x: W - 14 - bw, y: H - 70 - bw, w: bw, h: bw, f: 1.3, t: '+' }, { x: W - 14 - bw, y: H - 60, w: bw, h: bw, f: 1 / 1.3, t: '−' }];
    for (const b of this.boutons) {
      ctx.fillStyle = 'rgba(20,30,50,0.85)'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '600 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    texteSurFond(ctx, 'Échap, Entrée ou toucher : revenir · molette, + / − : zoom · tailles non à l’échelle', W / 2, H - 14, { police: '12px system-ui, sans-serif', couleur: '#8fa3b8' });
  }
}

// ---------- Fenêtre « Se promener » ----------
function ouvrirPromenade(contexte) {
  const m = $('modale');
  m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>🔭 Se promener</h2>
    <p>Une balade sur Terre avant de partir, ou un regard sur les merveilles du ciel lointain, hors du Système solaire. Ceux-là, on les observe de loin : pas d’atterrissage.</p></div><button class="fermer">✕</button></header>
    <section><h3>🌍 Sur Terre</h3><div class="cartes-ciel"><button class="carte-ciel" data-terre="1"><b>🌳 La Terre</b><span>Fleurs, fruits et le Bar de l’Espace</span></button></div></section>
    ${CATEGORIES_CIEL.map(([cat, titre]) => `<section><h3>${titre}</h3><div class="cartes-ciel">${OBJETS_CIEL.filter((o) => o.cat === cat).map((o) =>
      `<button class="carte-ciel" data-objet="${o.id}"><b>${o.nom}</b><span>${o.type} · ${o.distance}</span></button>`).join('')}</div></section>`).join('')}
  </div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  m.querySelector('[data-terre]').onclick = () => { Infos.fermer(); contexte.terre(); };
  m.querySelectorAll('[data-objet]').forEach((b) => { b.onclick = () => { Infos.fermer(); contexte.observer(OBJET_CIEL_PAR_ID[b.dataset.objet]); }; });
}
