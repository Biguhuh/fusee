# Carte 6, point 6 : zones réelles à explorer

## Méthode de rendu (étape 1)

- Le sol du jeu est une ligne : la longitude. Chaque zone réelle est une **coupe simplifiée** de la structure, posée à sa vraie longitude, dans le sens est-ouest, et ajoutée au relief ordinaire (`js/zones.js`, appelé par `creerTerrain`). Le relief est le même partout : descente, exploration, recherche d'une zone de base par la sonde.
- Profil : quelques points [distance au centre en km, altitude en km], raccordés en douceur. Quelques lignes par zone : le site reste léger.
- Tout est à l'échelle réelle : la falaise d'Olympus Mons monte de 6 km, le fond de Valles Marineris est à −7 km, et la pression de l'air suit l'altitude (7,8 mbar au fond du canyon contre 6 mbar en moyenne).
- **Plan lointain** dans l'exploration : le relief des 200 km alentour, comprimé, dessiné derrière le terrain proche. Il défile très lentement et montre la paroi du canyon ou le flanc du volcan, invisibles à l'échelle du marcheur.
- Limite : sans latitude, deux structures à la même longitude se recouvrent. Hellas (42° S) recouvrait Jezero (18° N, 7° plus à l'est) : la coupe d'Hellas est resserrée (±350 km au lieu de ±1 150 km).

## Zones faites (Mars, étape 3)

On les choisit dans « Où se poser ? », section « 🏔 Zones remarquables » (après une première descente en campagne).

| Zone | Position | Profil retenu | On se pose | Dimensions de référence |
|---|---|---|---|---|
| Valles Marineris | 13,8° S, 59,2° O | plateau, paroi de 6,2 km sur 15 km, fond à −7 km, coupe de 230 km | au fond, à 1,5 km du pied de la paroi | > 4 000 km de long, jusqu'à 200 km de large et 7 km de profondeur |
| Olympus Mons | 18,65° N, 133,8° O | escarpement de 6 km, flancs doux jusqu'à 21,9 km, caldeira à 18,9 km | dans la plaine, à 3 km de l'escarpement | ≈ 22 km de haut, ≈ 600 km de diamètre, falaises de 6 à 8 km |
| Hellas Planitia | 42,4° S, 70,5° E | rempart, fond à −7,2 km (coupe resserrée) | au fond | 2 300 km de diamètre, ≈ 7 km de profondeur |
| Cratère Gale et mont Sharp | 5,4° S, 137,8° E | rempart, fond à −4,5 km, mont Sharp à +1 km (5,5 km au-dessus du fond) | près de Curiosity, au pied du mont | 154 km de diamètre ; mont Sharp ≈ 5,5 km au-dessus du fond |
| Cratère Jezero | 18,4° N, 77,6° E | rempart, fond à −0,5 km, front du delta à l'ouest | près de Perseverance | ≈ 45 km de diamètre, ancien lac et son delta |

## Zones faites (Lune, étape 4)

Dimensions vérifiées (USGS, Gazetteer of Planetary Nomenclature ; Wikipédia ; LRO), le 5 novembre 2026.

| Zone | Position | Profil retenu | On se pose | Dimensions de référence |
|---|---|---|---|---|
| Cratère Tycho | 43,31° S, 11,36° O | rempart +1 km, fond −3,7 km, parois de 25 à 30°, pic central à 2,3 km du fond | au fond, près du pic | ≈ 85 km de diamètre, 4,7 km de profondeur, pic de 2 à 2,4 km |
| Cratère Copernic | 9,62° N, 20,08° O | rempart +0,9 km, fond −2,9 km, pics à 1,2 km du fond | au fond, près des pics | 93 km de diamètre, 3,8 km de profondeur, pics ≈ 1 à 1,2 km |
| Cratère Shackleton | 89,67° S, 129,78° E | rempart +0,5 km, fond −3,7 km, parois ≈ 30° | au fond, dans la nuit permanente | 21 km de diamètre, 4,2 km de profondeur |

Limites : au fond de Shackleton, la température est celle de la nuit lunaire du jeu (−170 °C) ; en réalité, ≈ −230 °C. La mer de la Tranquillité n'a pas de profil (elle est plate) : le site d'Apollo 11 y est déjà proposé. Les sites Apollo voisins ne sont pas touchés par les profils. Chang'e 3 (44° N) tombe au fond de Copernic dans le jeu : même longitude, 34° plus au nord en vrai (le sol du jeu n'a pas de latitude).

## Zones faites (autres astres, étape 4)

Dimensions vérifiées le 5 novembre 2026 (USGS, Gazetteer of Planetary Nomenclature ; Wikipédia ; NASA et JPL). « Schématique » : valeur non vérifiée, choisie raisonnable et signalée dans le code.

| Astre | Zone | Position | Profil retenu | On se pose | Dimensions de référence |
|---|---|---|---|---|---|
| Mercure | Bassin Caloris | 30,5° N, 170,2° E | monts Caloris de 2 km ; fond au niveau moyen (profondeur schématique) | dans la plaine, au pied des monts | ≈ 1 550 km de diamètre ; monts ≈ 2 km |
| Vénus | Maxwell Montes et cratère Cléopâtre | 65,2° N, 3,3° E | sommet à 11 km ; Cléopâtre (100 km, 2,5 km de profondeur) sur le flanc est ; coupe resserrée à ±300 km | près du sommet (34,5 bar au lieu de 92) | ≈ 11 km, ≈ 800 km de large ; Cléopâtre ≈ 100 km, 2,5 km |
| Io | Loki Patera | 13° N, 51,2° E | dépression de 200 km (profondeur schématique : 200 m) | sur le bord | ≈ 200 km de diamètre, lac de lave |
| Europe | Conamara Chaos | 9,7° N, 87,3° E | blocs et falaises de 100 à 250 m (largeur de la coupe schématique : 50 km) | entre les blocs | falaises de 100 à 250 m |
| Encelade | Rayures de tigre | 86,9° S, 129,5° E (Baghdad Sulcus) | 4 fractures espacées de 35 km : vallée de 220 m entre deux crêtes de 90 m | près d'une fracture | 130 à 175 km de long ; vallée 200 à 250 m ; crêtes 80 à 100 m |
| Mimas | Cratère Herschel | 1,38° S, 111,77° O | parois de 5,5 km, pic central à 6 km du fond | au fond, près du pic | ≈ 139 km ; parois ≈ 5 km ; pic 6 à 8 km |
| Miranda | Verona Rupes | 18,3° S, 12,2° O | falaise de 10 km ; coupe resserrée pour épargner la longitude 0° | au pied | 5 à 20 km selon les études |
| Pluton | Plaine Spoutnik | 20° N, 180° E | 3 km sous les terrains voisins ; cellules de 33 km, 100 m plus hautes en leur centre | au centre | ≈ 1 200 à 1 400 km ; cellules 16 à 48 km, relief ≈ 100 m |
| Cérès | Cratère Occator | 19,86° N, 121,15° O | rempart +0,5 km, fond −3 km, fosse centrale et dôme de 400 m | près du dôme | 92 km ; 3 à 4 km de profondeur ; dôme ≈ 3 km de large, 340 à 400 m |
| Vesta | Bassin Rheasilvia | 75° S, 59° O | fond à −17 km (19 km sous le rempart), pic central à 20 km du fond | au fond | ≈ 505 km ; ≈ 19 km de profondeur ; pic 19 à 22 km |
| Phobos | Cratère Stickney | 1° N, 49° O | 9 km de large, fond à −1,6 km (profondeur schématique : ≈ 1/5 du diamètre) | au fond | ≈ 9 km de diamètre |

## Zones schématiques (relief choisi, non vérifié)

Faites à la demande d'Edouard. Elles portent la mention « (relief schématique) » dans « Où se poser ? ».

| Astre | Zone | Vérifié | Schématique |
|---|---|---|---|
| Titan | Rive de Ligeia Mare | position (79° N, 112° E) ; ≈ 500 km de long ; ≈ 50 m de profondeur moyenne, ≈ 160 m au centre | forme de la rive (plage de 1 km) ; relief ordinaire adouci à 10 % dans la zone |
| Ganymède | Galileo Regio | position (47° N, 129,6° O) ; région sombre de plus de 3 000 km, rayée de sillons | sillons tous les 20 km, 8 km de large, 300 m de profondeur |
| Callisto | Bassin Valhalla | position (14,7° N, 56° O) ; zone centrale de 360 à 600 km ; anneaux jusqu'à 3 000 à 4 000 km | zone centrale plate de 360 km ; fossés de 350 m entre deux crêtes de 150 m, tous les 60 km (coupe de ±620 km) |
| Triton | Terrain en peau de melon | aspect (alvéoles de quelques dizaines de km) ; geysers de 8 km au sud | position (20° N, 30° E) ; alvéoles de 26 km, 200 m de profondeur |

Nouveau : les **mers**. Une zone peut avoir un liquide (`liquide` dans `js/zones.js`) : le profil donne le fond, le liquide est dessiné jusqu'à sa surface, et l'on s'arrête sur la rive (« 🌊 Rive d'une mer de méthane et d'éthane liquides… ») au lieu de marcher au fond.

Remarque : sur Titan, la pression (1,5 bar) dépasse ce que tient la combinaison du jeu (1,2 bar) : le spationaute ne survit pas longtemps dehors. C'était déjà le cas avant ; le robot, lui, tient. Les essais de la rive ont été faits avec le robot.
