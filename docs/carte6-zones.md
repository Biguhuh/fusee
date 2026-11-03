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

Limites : au fond de Shackleton, la température est celle de la nuit lunaire du jeu (−170 °C) ; en réalité, ≈ −230 °C. La mer de la Tranquillité n'a pas de profil (elle est plate) : le site d'Apollo 11 y est déjà proposé. Les sites Apollo voisins ne sont pas touchés par les profils.

## Zones proposées (étape 4, à valider et vérifier une par une)

| Astre | Zone | Ce qu'on y verrait | À vérifier avant d'écrire |
|---|---|---|---|
| Mercure | Bassin Caloris | grand bassin d'impact | ≈ 1 550 km de diamètre : coupe resserrée |
| Vénus | Maxwell Montes | le plus haut massif | ≈ 11 km au-dessus du niveau moyen |
| Io | Loki Patera | lac de lave | ≈ 200 km de diamètre |
| Europe | Terrains chaotiques | blocs de glace basculés | relief de quelques centaines de mètres |
| Ganymède | Galileo Regio | grande région sombre ancienne | relief faible : surtout la couleur |
| Callisto | Bassin Valhalla | anneaux concentriques | ≈ 3 800 km avec les anneaux |
| Titan | Kraken Mare, Ligeia Mare, site de Huygens | mers de méthane | lien avec le point 5 (lac à la rive) |
| Encelade | Fractures du pôle sud | rayures de tigre et panaches | ≈ 130 km de long, ≈ 500 m de profondeur |
| Mimas | Cratère Herschel | énorme cratère pour un si petit astre | ≈ 130 km de diamètre, murs ≈ 5 km, pic central ≈ 6 km |
| Miranda | Verona Rupes | une des plus hautes falaises connues | ≈ 20 km de haut (estimations de 5 à 20 km) |
| Triton | Geysers, terrain en peau de melon | panaches, relief alvéolé | panaches ≈ 8 km |
| Pluton | Plaine Spoutnik | plaine de glace d'azote, cellules | ≈ 1 000 km de large, ≈ 3 km sous les terrains voisins |
| Cérès | Cratère Occator | taches brillantes (sels) | ≈ 92 km de diamètre, ≈ 4 km de profondeur |
| Vesta | Bassin Rheasilvia | énorme bassin avec pic central | ≈ 500 km de diamètre, pic ≈ 20 km |
| Phobos | Cratère Stickney | déjà dans la silhouette de Phobos (carte 5, point 20) | ≈ 9 km de diamètre |
