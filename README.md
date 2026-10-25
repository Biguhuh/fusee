# La fusée de l'espace
*(manh, qu'elle est exploratoire !)*

Jeu web en HTML, JavaScript et canvas 2D, sans framework.
**Jouer en ligne : https://biguhuh.github.io/fusee/** — ou ouvrir `index.html` dans un navigateur.

## Sur téléphone et tablette
Le jeu détecte l'écran tactile :
- **Atterrissage** : ⟲ ⟳ pour pivoter, ▲ ▼ pour les gaz (maintenus), 0 / Max, puis Auto, Décoller, Sortir, Robot, Base, ⏪ ⏩ (temps), ⏸, ✕.
- **Au sol** : ◀ ▶ (maintenus), ⤒ sauter, Ramasser / Analyser / Cueillir, Rover, ⏪ ⏩, Rentrer.
- **Orbiteur** : un doigt pour déplacer la carte, deux doigts pour zoomer, toucher un astre pour sa fiche ; boutons « 📊 État » et « 🎛 Actions » pour ouvrir les panneaux.
- Sur petit écran, le tableau de bord est réduit à l'essentiel (les limites n'apparaissent que si elles approchent) ; un appui dessus affiche tout le détail.
- Portrait et paysage.

## Votre spationaute
Au premier lancement, on crée son ou sa spationaute (modifiable depuis l'accueil) :
- **prénom** (facultatif), utilisé dans les messages ;
- **genre** : femme, homme, non-binaire ou « je préfère ne pas le dire ». Il sert seulement aux accords (attachée, attaché, attaché·e) ; l'apparence se choisit à part ;
- **carnation** (8 teintes), **coiffure** (courte, longue, bouclée/afro, tresses, rasée, foulard) et couleur des cheveux ;
- **handicap des membres supérieurs** et **des membres inférieurs** : aucun, 1 membre ou les 2. Pour chacun, on choisit l'aide : **exosquelette** motorisé (attelles et moteurs aux articulations) ou **membre bionique** (bras à pince, jambe à lame de carbone). On marche, saute et explore comme tout l'équipage.

Tenue : combinaison de vol bleue de l'ESA sur Terre, scaphandre blanc aux couleurs de l'ESA sur les astres (visage visible derrière la visière).

## Façons de jouer
- **Se promener** (accueil) :
  - la Terre (fleurs, fruits, Bar de l'Espace) ;
  - 52 objets du ciel lointain, hors Système solaire, qu'on observe de loin sans atterrir. Chacun a son nom, sa distance réelle, un rendu dessiné et animé (zoom à la molette, avec + / − ou avec les boutons) et une courte explication. Les tailles ne sont pas à l'échelle.

  Les objets, par famille :
  - **Étoiles de tous types et de tous âges** : naines rouge, jaunes (jeune, adulte, jumelle du Soleil) et orange, bleues massives, géante, supergéante et hypergéante rouges, variable lumineuse bleue, Wolf-Rayet, céphéide, proto-étoile, naines brunes.
  - **Étoiles mortes et compactes** : naine blanche, étoile à neutrons, pulsar, pulsar milliseconde, magnétar.
  - **Étoiles doubles et multiples** : transfert de masse, binaire à éclipses (avec sa courbe de lumière), double large, nova récurrente, triple, sextuple, double pulsar, fusion de trous noirs avec ses ondes gravitationnelles.
  - **Trous noirs et objets extrêmes** : Cygnus X-1, trou noir dormant avec lentille gravitationnelle, Sagittarius A*, M87*, quasar.
  - **Explosions et restes** : supernova, nébuleuse du Crabe, Cassiopée A, kilonova, sursaut gamma.
  - **Nébuleuses** : planétaires, Orion, Piliers de la Création, Carène.
  - **Amas et galaxies** : Pléiades, Oméga du Centaure, Voie lactée vue de loin, Grand Nuage de Magellan, Andromède, Antennes.
  - **Exoplanètes** : 51 Pegasi b, HD 189733 b, TRAPPIST-1.
- **Mission directe** (hangar → carte) : on choisit un astre, la fusée arrive au-dessus, on se pose (ou on plonge), puis on repart en orbite. Le bouton « ⚙ Équiper pour se poser et repartir » choisit les pièces qui le permettent.
- **Campagne** (hangar → « Commencer la campagne ») : tout part de la Terre.
  1. **Centre de lancement** : tout part de la Terre, avec la fusée qui correspond à la destination.
     - **Hercule** (2 étages, 2 950 t, 110 t en orbite basse) → la station spatiale.
     - **Séléné** (3 étages, du gabarit de Saturn V) → la Lune : après la mise en orbite, le 3e étage rallume pour l'injection translunaire (≈ 3,1 km/s), puis le planificateur fait la mise en orbite lunaire.
     - La fusée est dessinée étage par étage : à chaque séparation l'étage du bas tombe (on voit alors les tuyères de l'étage suivant), puis les deux demi-coiffes s'écartent et découvrent l'orbiteur et son atterrisseur doré. Elle ressemble de plus en plus à ce qui arrive en orbite.
     - Lancement en bonne et due forme : tour de lancement, T pour lancer le compte à rebours, allumage à T−3 (les pinces retiennent la fusée), décollage, Max Q, séparations d'étages, largage de la coiffe, mise en orbite. La chronologie s'affiche pendant le vol et dans le résultat.
     - Départ de **Kourou** (Centre spatial guyanais), plein est : la vraie géographie défile sous la trace (orbite inclinée de 5,2°) avec ses reliefs et son nom vu d'altitude. On quitte la forêt guyanaise, la côte est à 16 km, puis vient l'océan Atlantique ; la côte africaine (Cameroun) est à 6 950 km, au-delà de l'horizon au moment de la mise en orbite (vers 1 800 à 2 200 km du pas de tir). Le reste du tour est aussi décrit : Afrique centrale et Mont Kenya, océan Indien, Indonésie, Nouvelle-Guinée, Pacifique, Andes et Mont Roraima.
  2. **Station spatiale terrestre** : la première chose à construire (🏗). Elle reçoit un cargo de la Terre tous les 30 jours.
  3. **Expédition** : l'orbiteur emporte son atterrisseur. On part vers un astre (pilotage libre, assistant ou planificateur), on se pose, on explore, on remonte.
     - **Vue orbite pour l'amarrage** : une fois l'altitude et la vitesse orbitale atteintes (depuis n'importe quel astre, et aussi au lancement depuis la Terre), on passe en vue orbite, l'astre vu de son pôle Nord tournant à sa vraie période. Le rendez-vous est calculé pour de vrai : périodes orbitales d'après la masse de l'astre et les altitudes, attente de la fenêtre (angle d'avance de la cible), transfert de Hohmann avec ses deux poussées, approche finale, amarrage à l'orbiteur (ou à la station spatiale). Le temps est accéléré, avec son facteur affiché ; Entrée, Espace ou un toucher passent la séquence.
  4. **Retour** : cible Terre, puis « 🏠 Rentrer sur Terre » : la capsule rapporte les échantillons. Une nouvelle méga-fusée relance l'expédition suivante (elle s'amarre à la station terrestre).
     - **Animation du retour**, avec une trajectoire calculée (traînée, portance, gravité) :
       - rentrée depuis 120 km à 7,8 km/s : bouclier face à la vitesse, plasma et coupure radio, environ 3 g ;
       - parachute de stabilisation vers 7 km, trois parachutes principaux à 3 km ;
       - amerrissage à environ 8 m/s, environ 18 min après l'entrée.
     - **Avec équipage**, un hélicoptère arrive par le bord de l'écran, se met en stationnaire et hélitreuille le ou la spationaute.
     - **Si l'équipage a été perdu** (sortie mortelle, atterrisseur détruit) : message « Capsule vide », pas d'hélicoptère ; un navire arrive et hisse la capsule à bord avec sa grue.
     - Le temps accéléré est affiché ; Entrée, Espace ou un toucher passent la séquence.
  - **Reprendre d'où l'on veut** : le bouton « Reprendre » propose plusieurs points de départ :
    - là où l'on était ;
    - en orbite à l'une de ses stations ;
    - au sol près de l'une de ses bases (l'atterrisseur y est garé, l'orbiteur attend en orbite pour le rendez-vous) ;
    - ou depuis la Terre (centre de lancement).

    Sans expédition en cours, une nouvelle expédition prend le départ au point choisi.
  - **Tableau de bord de l'astre** : pendant la campagne, la fiche d'un astre commence par deux sections.
    - **« Sur place »** : exploration, échantillons rapportés, drapeaux, zone de base repérée, ressource locale, chaque base avec son niveau, ses productions d'ergols et de matériaux, son stock, et ce qui manque pour le niveau suivant.
    - **« En orbite »** : l'orbiteur s'il est là, chaque station avec son stock et ses capacités, ses chantiers, son atelier, les sondes et les ravitos attendus.

    Depuis l'orbiteur, on agit directement depuis la fiche : envoyer l'extension à la base, fabriquer à l'atelier, envoyer un ravito vers la station.
  - **Logistique** (bouton « 📊 » de l'orbiteur) : le récapitulatif de l'exploration.
    - Production totale des bases (ergols et matériaux par jour).
    - Chaque astre visité ou équipé : posé, échantillons, bases et productions, stations et stocks, chantiers.
    - « À faire pour progresser » : ce qui manque à chaque base pour le niveau suivant, et les stations à court d'ergols ou de matériaux, avec un bouton « 📦 Ravito » vers la bonne station.
    - Ravitos et sondes en route.

    Un clic sur un astre ouvre son tableau de bord.
  - **Niveaux des stations** (1 à 5). Une extension de station (atelier : 30 t de matériaux, ou ravito « Extension de station ») s'assemble en orbite en 10 jours, depuis le tableau de bord de l'astre.
    - Niveau 2 : stockage doublé.
    - Niveau 3 : chantiers 1,5 fois plus rapides, ravitaillement courant doublé.
    - Niveau 4 : habitat pour l'équipe de spationautes, stockage triplé.
    - Niveau 5 : chantier interstellaire, qui assemble le vaisseau de départ vers une autre étoile ; chantiers 2 fois plus rapides.
  - **Équipe de spationautes** : 4 par expédition (vous et 3 coéquipiers), jusqu'à 8 avec une station de niveau 4 (bouton « Accueillir une recrue »).
    - Le ou la spationaute du joueur reste simulé en détail. Les coéquipiers partent en mission « de fond » depuis l'orbiteur (bouton « 🧑‍🚀 Mission »), ce qui ne coûte rien au navigateur.
    - Une mission dure 1, 3 ou 7 jours. Un atterrisseur et ses ergols restent occupés ; le coéquipier prélève un échantillon toutes les 6 h (8 au plus) et encaisse la dose du lieu.
    - L'atterrisseur remonte seul à la fin. Au-delà de 4 Sv cumulés, le coéquipier ne revient pas.
    - On ne rentre sur Terre qu'une fois les missions finies ; la capsule ramène les survivants.
  - **Robot de prélèvement automatique** (bouton « 🤖 » de l'orbiteur, en orbite d'un astre solide).
    - Le robot descend seul, avec le blindage choisi, pour 3, 7 ou 30 jours.
    - Il prélève un échantillon toutes les 12 h (12 au plus), puis lance son conteneur en orbite. L'orbiteur le récupère quand il repasse en orbite de l'astre.
    - S'il est grillé par le rayonnement avant la fin (un robot standard sur Io : environ 33 h), ses échantillons sont perdus.
  - **Ressources et échantillons** : chaque fiche d'astre solide dit ce qu'on y trouve :
    - la ressource locale et sa production par une base, la mine à partir du niveau 2 ;
    - les types d'échantillons possibles ;
    - la science déjà faite et le record de saut.
  - **Records de saut** : la hauteur de chaque saut du spationaute est mesurée (du point d'appel au sommet) et s'affiche pendant le saut. Le record de chaque astre est gardé, avec un message quand on le bat (environ 1,5 m sur la Lune, 0,25 m sur Terre).
  - **Une seule station, une seule base et une seule sonde par astre.** Les boutons sont grisés avec la raison (« Station déjà installée sur cet astre », « Sonde déjà envoyée », « Base ✓ »). Les anciennes parties qui avaient des doublons sont fusionnées au chargement : on garde le plus haut niveau, les stocks s'additionnent, les ravitos sont redirigés, les sondes en trop reviennent à bord. Le journal le signale.
  - **Grappe de sondes** (fiche d'un astre qui a des lunes) : plusieurs sondes partent ensemble de l'orbiteur puis se séparent, une par cible (l'astre et ses lunes, les plus grosses d'abord ; celles déjà sondées sont décochées). Chacune repère sa cible en arrivant.
  5. **Quitter le Système solaire** (bouton « 🌌 » de l'orbiteur) : on choisit une étoile proche réelle (Proxima Centauri, Alpha Centauri, Barnard, Lalande 21185, Epsilon Eridani, Tau Ceti, TRAPPIST-1).
     - **Départ réaliste**, avec deux propulsions :
       - assistances gravitationnelles comme Voyager 1, 17 km/s ;
       - poussée de l'orbiteur seule : tous ses ergols brûlés d'où il est, en profitant de la vitesse acquise (environ 65 km/s depuis l'orbite terrestre).
     - Le jeu donne la durée du voyage (environ 20 000 ans pour Proxima avec l'orbiteur), la date d'arrivée en temps de jeu et dans la vraie vie, et le temps qu'il faudrait au temps accéléré maximal. C'est la fin de la partie : un bilan s'affiche et la campagne ne se reprend plus.
     - Le départ « science-fiction » (propulsions avancées) viendra ensuite.
     - **Liste avant de partir**, dans la fenêtre de départ et dans « Logistique ». Elle compte ce qui est à la plus grande station et à bord de l'orbiteur, et dit ce qui manque :
       - une station de niveau 5 ;
       - 3 kits de base, 2 kits de station, 4 atterrisseurs, 2 lanceurs de retour, 6 robots, 6 sondes ;
       - 200 t d'ergols, 300 t de matériaux ;
       - une équipe de 4 ;
       - une grappe de sondes vers le système visé.

       Elle est obligatoire pour s'installer dans un autre système (départ science-fiction) ; un départ réaliste part avec ce qu'il a.
  5. **Stations** autour des autres astres : un petit ravitaillement courant arrive régulièrement de la Terre. S'y amarrer prend ce qu'elles ont en stock.
  6. **Repérage par sonde** : une sonde en orbite d'un astre repère une zone pour une base (pente douce, à moins de quelques km du point de descente) et les ressources réelles sur place (glace d'eau, méthane, CO₂…). La descente vise ensuite cette zone (fanion vert).
  7. **Bases au sol** (touche B une fois posé près de la zone repérée, avec une station en orbite) : la construction terrasse le sol à plat. Sans repérage, le jeu refuse : « relief trop accidenté — envoyez une sonde ». La base produit des ergols à partir de la ressource locale, en garde 20 t pour les atterrisseurs et monte le surplus à la station.
  8. **Ravitos** (📦 dans l'orbiteur) : on choisit le départ (la Terre, ou une station qui fournit le contenu de son stock), la destination et le contenu :
     - *Kit d'expédition* : de quoi repartir plus loin (carburant, ergols, atterrisseurs, sondes, kits, robots) ;
     - *Extension de base* : livrée à la station en orbite, elle descend ensuite à la surface (bouton « ⬇ Envoyer l’extension à la base » dans la liste des bases) dans un module adapté à l’astre (rétrofusées sans air, bouclier et parachute avec atmosphère, ballon-module sur Vénus). Le module se pose, se déploie et ne repart pas : la base gagne un niveau (1 à 5) ; dès le niveau 2, une mine produit des matériaux ;
     - *Ergols*, *Matériaux*.
     Le cargo vole sur sa propre trajectoire réaliste (visible sur la carte) et livre au stock de la station.
  9. **Atelier** des stations : fabrique sondes, robots, atterrisseurs, kits de base, kits de station et extensions avec les matériaux. On avance ainsi d'orbite en orbite, avec des bases locales et des ravitos venus de la Terre ou d'autres bases, jusqu'au fond du système solaire.
- **Promenade sur Terre** (hangar) : cueillir fleurs et fruits pour la prochaine expédition, boire une bière au Bar de l'Espace.

## Apparence des astres
- Chaque astre a sa carte peinte (`js/globes.js`) : continents de la Terre (contours grossiers, déserts, forêts, glaces, nuages), mers de la Lune, Syrtis Major et calottes de Mars, bandes et Grande Tache rouge de Jupiter, hexagone et anneaux de Saturne, Grande Tache sombre de Neptune, volcans d'Io, fractures d'Europe, cœur de Pluton, Japet à deux tons…
- Sur la carte de l'orbiteur, on voit le système solaire d'au-dessus : les astres sont vus **du pôle Nord**, éclairés par le Soleil, et tournent sur eux-mêmes. Les lunes synchrones montrent toujours la même face à leur planète.
- **Ciel réaliste** (atterrissage, exploration), le même calcul pour tous les astres : positions réelles du Soleil, de la planète mère, des lunes sœurs, des lunes de l'astre et des planètes à l'instant simulé ; tailles apparentes réelles ; phases ; lever et coucher selon la rotation de l'astre ; jour, crépuscule et nuit (sol assombri, étoiles visibles) ; éclipse quand la planète passe devant le Soleil. Sur une lune, on se pose sur la face tournée vers sa planète. Exemples : depuis Europe, Jupiter reste fixe et passe par ses phases en 3,55 jours ; depuis Mars, Phobos se lève à l'ouest. Jeu en 2D : l'inclinaison des axes n'est pas modélisée.
- **Rotondité** : en prenant de l'altitude, le sol se courbe (projection exacte sur la sphère, horizon), avec un halo d'atmosphère au bord.

## Vénus : remontée en ballon
Repartir du sol de Vénus demanderait ≈ 12,6 km/s : aucun atterrisseur n'en est capable. Comme dans les études de la NASA, le module blindé se pose ; pour repartir, un **ballon** emporte le petit lanceur **Aphrodite** (2 étages, ≈ 9 km/s) jusqu'à 54 km (0,7 bar, ≈ 30 °C), où il s'allume vers l'orbite. Le module reste au sol.
- Le lanceur de retour se construit à l'**atelier d'une station en orbite de Vénus** (20 t de matériaux, 37 t d'ergols, 20 jours de chantier).
- Une fois posé, **T** le demande à la station : il descend dans une capsule sous parachute (≈ 17 min) et se pose à 30 m du module ; **T** gonfle alors le ballon.
- Sans lanceur prêt en orbite, le jeu prévient avant la descente (aller simple tant qu'il n'est pas construit). En visite rapide, une station de soutien est supposée en orbite.

## Missions en temps réel
Bouton « ⏱ Temps réel » sur l'orbiteur :
- le temps de la mission suit l'horloge, avec un facteur choisi (vrai temps, ×60, ×600, ×3 600, ×86 400), **même navigateur fermé** : à la réouverture, la simulation rattrape l'instant présent et résume ce qui s'est passé pendant l'absence ;
- si une manœuvre n'est pas faite à temps : **« la fusée attend »** (le temps s'arrête à la manœuvre) ou **« manœuvre ratée »** (la mission continue, le jeu recalcule la prochaine occasion et en donne la date) ;
- chaque manœuvre ou événement à venir a son **heure réelle**, avec **📅 Ajouter à l'agenda** (fichier .ics pour Android, iPhone, Outlook, rappel 5 min avant), un lien **Google Agenda** et une phrase à copier ;
- un site sans serveur ne peut pas envoyer de notification : le rappel passe par l'agenda. La partie est dans ce navigateur (export / import pour la déplacer).

## Sauvegarde
- Enregistrée dans le navigateur (localStorage, pas de cookie), toutes les 5 secondes.
- Accueil : « ⬇ Télécharger la sauvegarde » (fichier .json) et « ⬆ Charger une sauvegarde ». Le fichier chargé est vérifié et nettoyé (jamais exécuté, taille limitée, textes sans balises) ; l'ancienne partie est gardée de côté.
- Si une erreur survient, le jeu se met en pause et l'affiche, au lieu de se figer.

## Atterrisseur adapté : pour se poser, il faut pouvoir repartir
L'atterrisseur de l'expédition est conçu pour chaque astre : le jeu essaie les combinaisons de pièces, de la plus légère à la plus lourde, en **simulant** la descente et la remontée en orbite, et garde la première qui réussit. Là où aucune ne peut repartir (Vénus : 12,6 km/s nécessaires), on ne peut pas se poser avec équipage : on largue un **robot en aller simple**. Sur Terre, on ne se pose pas avec l'atterrisseur : on rentre en capsule.

## Les astres : 478, données NASA/JPL
Soleil, 8 planètes, Pluton, Cérès et 7 gros astéroïdes, et **les 460 lunes connues**.
- Orbites et masses : éléments J2000 (planètes), tables JPL (lunes), API SBDB (astéroïdes).
- 46 lunes ont un rayon mesuré par JPL ; les rayons d'environ 120 autres viennent de mesures publiées ; pour les plus petites (désignations « S/2004 S 54 »…), le rayon est **estimé** (indiqué dans leur fiche).
- Bouton « Grosses lunes seulement » : ne garde que les lunes de plus de 100 km de diamètre.
- `outils/` contient les scripts qui régénèrent `js/donnees-jpl.js` depuis les pages JPL.

## Atterrisseur
| Touche | Action |
|---|---|
| ↑ / Z, ↓ / S | manette des gaz (+/−5 % par appui, en continu si maintenu) ; elle reste où on la laisse |
| X / Espace | couper / plein gaz |
| ← → / Q D | orienter |
| L | pilote automatique : se pose sur une zone plate, puis **reste posé** |
| T | décoller (pilote automatique jusqu'à l'orbite) |
| E / R | une fois posé : sortir le spationaute / le robot |
| B | une fois posé (campagne) : construire une base |
| + / − | accélérer / ralentir le temps (×1 sous 1,5 km et dès que la coque s'abîme) |
| P | pause · Entrée : terminer (mission directe) · Échap : abandonner |

- Le tableau de bord affiche la **vitesse orbitale** et la **vitesse de libération** locales.
- Repartir = atteindre l'orbite basse (altitude au-dessus de l'atmosphère et vitesse orbitale à l'horizontale) ou dépasser la vitesse de libération : l'orbiteur vous récupère. La physique tient compte de l'effet centrifuge : à la vitesse orbitale, on ne retombe plus.
- Coque : dégâts progressifs au-delà des limites de pression et de chaleur ; atterrissage dur = dégâts, très dur = crash.
- Relief : collines, cratères, rochers ; la pente du sol compte à l'atterrissage.

## Exploration (vue de côté)
- Temps : ×1 par défaut, jusqu'à ×50 avec + / −.
- L'atterrisseur est un **module** léger (étage de descente sur 4 pieds, cabine de remontée), pas une fusée.
- **Robot largué** depuis l'orbite : il descend avec un petit **module robot** (panneaux solaires, antenne). Ses analyses restent dans sa mémoire jusqu'à son retour au module, qui recharge sa batterie et envoie les données à l'orbiteur.
- Les montées raides ralentissent ; les descentes ne freinent jamais. Rover et robot restent parallèles à la pente.
- **Géantes gazeuses** : pas de module à pieds, mais une **sonde atmosphérique** fuselée (ailerons en flèche, trois tuyères). Elle fait des prélèvements automatiques à chaque palier de pression (0,3 · 0,5 · 0,75 · 1 · 1,25 · 1,5 · 2 bar…), avec la composition des couches : glace d'ammoniac, hydrosulfure d'ammonium, eau, méthane… Les prélèvements comptent comme des échantillons.
- **Drapeau** (F, ou 🚩 sur téléphone) : le ou la spationaute plante le drapeau des Nations unies, avec le fanion de l'AS Nancy Lorraine dessous. Tenu déplié par une tringle là où il n'y a pas d'air (comme Apollo sur la Lune), il flotte au vent ailleurs. Les drapeaux sont sauvegardés et restent visibles aux visites suivantes et pendant l'atterrissage.
- **Spationaute** : marche et saute selon la gravité locale (sauts de plusieurs mètres sur la Lune). 4 h d'oxygène, combinaison limitée à 1,2 bar et 120 °C. Ramasse 6 échantillons (E) et les rapporte à la fusée. Sur les très petites lunes, il reste attaché par un câble : un saut le ferait partir dans l'espace.
- **Rover** (touche V près de lui) : jusqu'à 3,6 m/s sur la Lune (comme celui d'Apollo), 20 échantillons dans sa caisse.
- **Robot** : roule, résiste à 100 bar et 480 °C, 8 h de batterie, analyse les sites sur place (E, 5 s).
- **Rayonnement de l'équipage** : la dose est calculée à chaque altitude, en Sv/jour. C'est la dose de l'espace autour de l'astre, atténuée par l'air au-dessus : sur Terre, 6,6 µSv au sol, environ 320 µSv à 11 km et 1,4 mSv en orbite ; au-dessus des nuages de Jupiter, environ 10 Sv dans les ceintures.
  - Le panneau anti-vent solaire divise la dose à bord : léger ÷ 5, moyen ÷ 20, lourd ÷ 100, héliosphérique ÷ 1 000.
  - L'équipage cumule sa dose dans la fusée et pendant les sorties, où la combinaison n'arrête presque rien ; la dose mortelle est de 4 Sv. Exemples : 2 h 40 dehors sur Io, 18 h sur Europe.
  - Le hangar dit combien de temps l'équipage peut rester à bord et dehors. Le concepteur d'atterrisseur choisit le panneau qui lui laisse au moins 10 jours sur place : lourd pour Io, moyen pour Europe.
- **Rayonnement et blindage des robots** : chaque astre a sa dose en surface, en Sv/jour. Les valeurs mesurées ou de référence (Terre 6,6 µSv, Lune 1,37 mSv, Mars 0,67 mSv, Io 36 Sv, Europe 5,4 Sv, Ganymède 0,08 Sv, Callisto 0,1 mSv) sont indiquées comme telles ; les autres sont estimées (rayons cosmiques, ceintures de Jupiter et de Saturne, atténuation par l'atmosphère) et la fiche le dit. Avant de larguer un robot, on voit la dose du lieu et on choisit son blindage :
  - **standard** : 50 Gy supportés, sans masse en plus ;
  - **durci** : composants durcis et boîtier en aluminium, 1 000 Gy, dose divisée par 3, +25 kg ;
  - **voûte en titane**, comme Juno : dose divisée par 33, +150 kg.

  La masse du blindage coûte du Δv au module de descente, compensé par des ergols pris sur la réserve de l'atterrisseur. Pendant l'exploration, l'électronique encaisse la dose : son état et le temps qu'il lui reste s'affichent, et elle grille à 100 % (un robot standard tient environ 33 h sur Io).
- Les pentes raides ralentissent ; seules les falaises (> 40° en rover) arrêtent.
- Les échantillons rangés dans l'atterrisseur remontent à l'orbiteur et comptent quand ils arrivent sur Terre.
- Chaque astre a ses sites : lacs de méthane sur Titan, soufre sur Io, glace salée sur Europe, lits de rivière sur Mars…

## Orbiteur
- Carte vue de dessus : molette = zoom, glisser = déplacer, clic = fiche, double-clic = centrer, F = revenir à l'orbiteur.
- Temps : ×1 par défaut, réglable par le joueur jusqu'à ×100 millions (1 s = 3 ans). L'assistant et le planificateur ne changent jamais le temps d'eux-mêmes ; ils s'arrêtent juste pile au moment d'une manœuvre. Date affichée, durées en années, mois, jours, heures, minutes, secondes.
- « 🎯 Centrer » : sur l'orbiteur, l'astre autour duquel on tourne, ou la cible, avec un zoom adapté. Une **mini-carte** (en bas à gauche) montre la vue d'ensemble autour de l'astre principal : en regardant la Lune, on voit la Terre et l'orbite lunaire. Un clic dessus y centre la vue.
- **Trois modes de pilotage** (barre du haut) :
  - *Pilotage libre* : orientation (prograde, rétrograde, radiale, vers la cible…) et manette des gaz, avec trajectoire prévue.
  - *Assistant* : calcule la prochaine manœuvre (fenêtre de tir, Δv, durée), on avance le temps et on l'exécute.
  - *Planificateur* : on choisit la cible, il fait tout le voyage jusqu'à l'orbite basse.
- Propulsion de l'orbiteur : Isp 3 000 s, 60 t de carburant (≈ 40 km/s de Δv), optimiste mais nécessaire pour aller partout.
- **Sondes** (6 à bord) : partent seules vers leur cible, sur leurs propres trajectoires.
- Chargement d'une expédition : 60 t de carburant, 60 t d'ergols pour l'atterrisseur, 2 atterrisseurs, 2 robots, 6 sondes, 2 kits de station (3 si la station terrestre n'existe pas encore), 1 kit de base.

## Informations
Survoler un astre (carte de l'orbiteur, ou ciel pendant l'atterrissage) affiche son nom. Un clic ouvre sa **fiche complète** et met le jeu en pause ; un bouton relance le mouvement pour lire pendant le trajet. « 📖 Tous les astres » (ou I) ouvre l'encyclopédie, avec recherche.

## Fichiers
- `js/astres.js` : 19 astres détaillés (atmosphères, couleurs, relief)
- `js/donnees-jpl.js` : données JPL générées · `js/catalogue.js` : catalogue complet, orbites, masses
- `js/physique.js` : conditions locales et relief · `js/orbites.js` : mécanique orbitale (Kepler, Lambert, sphères d'influence)
- `js/systemes.js` : systèmes stellaires. Le jeu tourne dans un système à la fois (`SYSTEME`) : étoile racine et sa luminosité, planète d'origine de la campagne, planètes, carte. La lumière, la température et le rayonnement passent par le flux de l'étoile hôte (`fluxStellaire`), et le départ, les ravitos et le retour passent par la planète d'origine. Le Système solaire est le premier système ; un autre se décrira avec les mêmes champs.
- `js/vol.js` : atterrisseur et lanceurs · `js/kourou.js` : géographie sous la trace au départ de Kourou · `js/amarrage.js` : vue orbite du rendez-vous · `js/retour.js` : retour sur Terre en capsule · `js/depart.js` : départ vers une autre étoile · `js/rayonnement.js` : doses en surface et blindages · `js/exploration.js` : spationaute et robot · `js/equipage.js` : profil et dessin du ou de la spationaute
- `js/navigation.js` : planification des manœuvres · `js/orbiteur.js` : écran de l'orbiteur
- `js/globes.js` : cartes et globes des astres
- `js/infos.js` : infobulles, fiches, encyclopédie · `js/ecrans.js`, `js/main.js` : écrans et boucle de jeu

## Simplifications
Orbites en 2D (inclinaisons ignorées), manœuvres de l'assistant instantanées, rendez-vous avec les stations automatique, positions des petites lunes approximatives. Sphère d'influence minimale de 3 rayons pour les très petites lunes (celle de Phobos est en réalité plus petite que Phobos).
