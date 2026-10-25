# Point 5 : visiter d'autres systèmes stellaires

Évaluation, sans implémentation. Faisable, à condition de traiter le voyage interstellaire comme une étape à part (pas comme un transfert d'orbite), et d'accepter des données d'exoplanètes en grande partie estimées.

## Ce que dit le code

| Question | Constat | Conséquence |
|---|---|---|
| Modèle de données lié au Système solaire ? | Oui. Une seule liste `ASTRES`, dont la racine est le Soleil (seul astre sans orbite). `'soleil'` apparaît 21 fois, `'terre'` 37 fois (départ, ravitos, retour) et `distanceUA` 29 fois : la lumière, la température et le rayonnement sont calculés d'après la distance au Soleil. | Il faut un champ « système » et une étoile racine par système, et remplacer la distance au Soleil par le flux de l'étoile hôte (luminosité / d²). |
| Δv et trajets à l'échelle interstellaire ? | Les trajets sont des coniques raccordées (sphères d'influence) et un solveur de Lambert, en 2D, en km. Valable dans un système, pas entre deux étoiles. La précision suffit : en double précision, à 4,2 années-lumière (4·10¹³ km), on garde environ 10 m, et environ 50 m à l'échelle de la Galaxie. | On garde le moteur actuel dans chaque système, avec des coordonnées locales. La traversée entre étoiles devient une étape de transit (comme les ravitos), avec départ, croisière et arrivée. |
| Temps et ressources du voyage ? | Le temps va jusqu'à ×100 millions (1 s = 3,2 ans) et la date du jeu tient sur des millénaires. Avec une vitesse chimique (Voyager, 17 km/s), Proxima est à 75 000 ans, soit 6 h 30 réelles au temps maximal : injouable. À 10 % de la vitesse de la lumière, il faut 42 ans, soit 13 s. | Il faut une propulsion interstellaire. Réaliste : fusion type Daedalus (≈ 12 % de c, environ 50 ans pour l'étoile de Barnard) ou voile laser type Starshot (sondes de quelques grammes à 20 % de c). Le coût vient de l'équation de la fusée : il faut ralentir à l'arrivée, ce qui met au carré le rapport de masse. Les ravitos depuis la Terre deviennent impossibles (des décennies, 4,2 ans de délai radio pour Proxima) : stations et bases locales deviennent indispensables, ce qui prolonge l'économie actuelle. |
| Données réelles ou procédurales ? | Le jeu embarque déjà des données JPL générées (`donnees-jpl.js`) et sait marquer « estimé » ce qui manque (petites lunes, doses). | On peut faire pareil depuis le NASA Exoplanet Archive (environ 6 000 planètes confirmées). Mais souvent seule la masse minimale ou le rayon est connu, l'atmosphère presque jamais, et aucune exolune n'est confirmée. Il faudra estimer rayon, masse, atmosphère et aspect selon le type de planète, et l'afficher comme tel. |

## Options

### A. Vitrine : Alpha Centauri (recommandée pour commencer)

- **Contenu :**
  - Proxima Centauri et Proxima b, données saisies à la main avec leurs incertitudes ;
  - Alpha Centauri A et B en étoiles du ciel, puis comme système double si on veut aller plus loin.
- **Travail :**
  1. Généraliser le modèle : système, étoile racine, flux de l'étoile au lieu de la distance au Soleil, coordonnées locales.
  2. Écran de transit : choix de la propulsion, durée, masse d'ergols, départ après libération du Soleil, croisière, freinage, arrivée en orbite de Proxima b.
  3. Rendu : ciel d'une naine rouge, globe estimé de Proxima b, atterrisseur conçu sur des valeurs estimées.
- **Effort :** environ 3 points de la taille du 12d ou du 13.

### B. Voisinage du Soleil

- **Contenu :** 10 à 30 systèmes réels avec planètes connues à moins de 15 à 40 années-lumière (Barnard, Tau Ceti, Epsilon Eridani, TRAPPIST-1…), générés depuis le NASA Exoplanet Archive comme `donnees-jpl.js`.
- **Travail :**
  - une carte du voisinage, positions réelles projetées ;
  - un chargement par système.
- **Effort :** A, plus environ 2 points.

### C. Toute la Voie lactée

- C'est le point 6 : catalogues massifs (Gaia), objets sans surface (trous noirs, pulsars), systèmes multiples, chargement à la demande.
- **Effort :** grand, à chiffrer au point 6. A et B en posent les fondations.

## Risques

- **Réalisme ou plaisir de jeu.** Avec une propulsion réaliste, le voyage prend des décennies en temps accéléré, et l'équipage vieillit ou doit hiberner. Une propulsion fictive (« saut ») serait plus simple mais casserait le parti pris du jeu.
- **Données lacunaires.** Beaucoup de valeurs seront estimées. Proxima b n'a qu'une masse minimale : ni rayon ni atmosphère mesurés.
- **Relativité.** Elle reste négligeable jusqu'à environ 20 % de c (facteur 1,02). Au-delà, il faudrait distinguer le temps à bord du temps sur Terre.
- **Hypothèses « Terre » et « Soleil » en dur.** Elles sont dispersées : départ, ravitos, retour, ciel, échelles de la carte, mini-carte. Le risque est surtout de casser le Système solaire en généralisant ; il faudra des essais de non-régression sur une campagne en cours.
- **Sauvegardes.** Il faut ajouter le système courant et migrer les anciennes parties, ce qu'on fait déjà (`migrerVoyage`).

## Recommandation

- **Commencer par A**, en concevant le modèle « système + étoile racine + flux » pour qu'il serve tel quel à B, puis au point 6.
- **Décision à prendre avant de coder :** propulsion réaliste (des décennies en temps accéléré) ou fictive.
