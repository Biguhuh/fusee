# État du projet

Dernière mise à jour : 1er novembre 2026

## En une phrase

Jeu web de simulation spatiale (vol, atterrissage, exploration, campagne dans le Système solaire et au-delà), complet et jouable en ligne, en bêta test : tout est fusionné dans `main`, rien n'est en cours.

## Fait

Le socle :
- Vol en 2D avec physique réelle (gravité, atmosphère, traînée, échauffement, rayonnement), atterrissage, plongée dans les géantes, décollage avec étages et coiffe.
- Système solaire complet (données NASA/JPL : lunes, astéroïdes), mécanique orbitale (Kepler, Lambert, sphères d'influence), orbiteur, sondes, stations, bases, ravitos, atelier.
- Exploration en vue de côté : spationaute, astromobile, robot, drone ; échantillons, drapeaux, easter eggs et traces des vraies missions.
- Campagne : équipe, missions de fond, registre des équipages, journal, progression, retour sur Terre en capsule, départ vers d'autres étoiles.
- Promenade : la Terre et 52 objets du ciel lointain. Entraînement sur Terre (astromobile, robot, drone, escalade).
- Commandes tactiles (téléphone, tablette).

Derniers ajouts (octobre 2026) :
- Jour et nuit au sol : température et rayonnement suivent le Soleil ; taille apparente réelle du Soleil.
- Choix du lieu d'atterrissage sur tous les astres (`sites.js`) : base, zone de la sonde, point habituel, longitude libre, ancienne mission.
- Anciennes missions à leur vraie longitude (x = R·λ), dont l'impact de MESSENGER sur Mercure.
- Mercure : sans sonde, arrivée en plein jour (430 °C), sortie à pied refusée ; avec sonde, arrivée à la tombée de la nuit, base seulement au fond du cratère Prokofiev (ombre éternelle, −180 °C).
- Astromobile : accélérateur, roue libre, frein (↓), bridage levable (B) avec risque de capotage.
- Base animée : chariot de minerai, navette de ravitaillement.
- R&D à l'atelier des stations (`ameliorations.js`) : 11 améliorations à 3 niveaux (vaisseau, astromobile, robot, drone).
- Escalade (↑ contre une paroi), exercice sur Terre ; on ne traverse plus une paroi en sautant.
- Sortie à deux spationautes (`duo.js`) : Tab pour changer, G suivre/attendre, C courte-échelle ou corde, K ruban adhésif, O oxygène partagé, astromobile à deux places.

## En cours

- Rien.

## À faire, dans l'ordre

1. Jouer une vraie campagne avec les ajouts d'octobre (R&D, sortie à deux, escalade, Mercure) : ils n'ont été testés que fonction par fonction.
2. Raccourcir la ligne d'aide en bas de l'écran d'exploration (`exploration.js`, cherche « Échap : rappeler ») : elle déborde avec la sortie à deux.
3. Le reste : selon les retours de la bêta.

## Bugs connus de la bêta

- Ligne d'aide de l'exploration trop longue sur écran étroit : `js/exploration.js` : la découper sur deux lignes ou la réduire selon le contexte.
- Sur la Lune en plein midi, la température (120 °C) touche juste la limite de la combinaison (120 °C) : `js/vol.js` (`TEMPERATURES_JOUR_NUIT`) et `js/exploration.js` (`EXPLORATEURS`) : décider si c'est voulu.

## Décisions prises

- Pas de framework ni de build : le jeu doit s'ouvrir avec un simple `index.html`.
- Valeurs physiques réelles, arrondies ; les exagérations sont signalées (Soleil agrandi ×3 dans le ciel pour qu'on le voie).
- Le sol est un anneau à une dimension de périmètre 2πR : la longitude donne la position, la latitude ne sert qu'aux textes.
- La visite rapide sait tout d'avance (pas besoin de sonde) ; la campagne, non.
- Une seule base, une seule station et une seule sonde par astre.
- Les améliorations de R&D valent pour toute l'expédition, et la suivent vers une autre étoile.
- La sortie à deux se déclenche toute seule quand un second membre d'équipage est à bord (en visite rapide : Sam).
- Easter eggs : découverts seulement par un équipage à pied ou en astromobile (sauf exceptions marquées `robot`) ; les traces réelles, par tous.

## Pièges

- Les chaînes du jeu contiennent des espaces insécables (avant « : », « ; », « ? », « ! », entre nombre et unité) : un `Edit` dont l'ancre contient ces caractères échoue. Passer par un script Python qui repère la ligne par son début (`startswith`) ou par une regex tolérante (`.` à la place de l'espace).
- Commandes PowerShell vers WSL : les guillemets et `$` imbriqués font planter zsh (« unmatched »). Écrire le script dans un fichier, puis `wsl -d ubuntu -- bash fichier.sh`.
- Le navigateur garde l'ancien JS en cache : toujours monter `?v=` avant de recharger, et vérifier avec `[...document.scripts].map(s => s.src)`.
- Quand le volet du navigateur est caché, `requestAnimationFrame` tourne au ralenti : le jeu semble figé. Pour tester, faire avancer la simulation à la main (`etat.explo.step(1/30, commandes)` en boucle).
- `outils/typo.py` traite tous les fichiers, quels que soient les arguments, et change des espaces en insécables : relire le diff avant de commiter.

## Carte des fichiers importants

Cœur :
- `index.html` : écrans et ordre de chargement des scripts.
- `js/main.js` : boucle de jeu, touches, lancement des vols, descente, largage de robot et de drone, base, sauvegarde.
- `js/vol.js` : simulation et dessin d'un vol (poussée, atmosphère, atterrissage, ciel, terrain, base, tableau de bord).
- `js/physique.js` : conditions selon l'altitude (gravité, pression, température), sol en anneau (`distSol`, `ecartSol`).
- `js/astres.js`, `js/catalogue.js`, `js/donnees-jpl.js` : les astres (19 détaillés, puis le catalogue JPL complet).
- `js/systemes.js`, `js/etoiles-proches.js` : systèmes stellaires (Soleil et étoiles proches).
- `js/equipements.js` : pièces du hangar.
- `js/francais.js` : articles et élisions devant les noms (« sur la Lune », « d'Europe »).

Campagne :
- `js/orbiteur.js` : écran de l'orbiteur (carte, pilotage, sondes, stations, atelier, ravitos, actions).
- `js/orbites.js`, `js/navigation.js` : mécanique orbitale et planification des manœuvres.
- `js/campagne.js` : règles (atterrisseur par astre, ravitaillement, bases, ressources, recettes de l'atelier).
- `js/ameliorations.js` : R&D (améliorations, coûts, effets).
- `js/sites.js` : lieux d'atterrissage, positions réelles des anciennes missions, cratère polaire de Mercure.
- `js/equipe.js`, `js/equipage.js`, `js/registre.js`, `js/vaisseau.js` : équipe, profils et dessin des spationautes, registre des équipages, nom du vaisseau.
- `js/tableau.js`, `js/journal.js`, `js/progression.js` : tableau de bord d'un astre, journal de bord, progression.
- `js/amarrage.js`, `js/retour.js`, `js/kourou.js` : scènes animées (amarrage, retour en capsule, décollage de Kourou).
- `js/depart.js`, `js/interstellaire.js` : départ vers une autre étoile.
- `js/rayonnement.js` : doses de rayonnement réelles.

Au sol :
- `js/exploration.js` : sortie à pied, astromobile, robot ; escalade, jour et nuit, retour, appel d'urgence.
- `js/duo.js` : sortie à deux spationautes.
- `js/decouvertes.js` : easter eggs et traces réelles (données et dessins).
- `js/descente-robot.js`, `js/drone.js` : largage du robot, drone.
- `js/essai.js` : entraînement sur Terre.

Écrans et interface :
- `js/ecrans.js` : hangar, carte, résultat, sauvegarde.
- `js/infos.js`, `js/aide.js` : fiches et encyclopédie, onglet Aide.
- `js/observation.js`, `js/observatoires.js` : promenade dans le ciel lointain, observatoires célèbres.
- `js/globes.js` : apparence des astres.
- `js/repliques.js` : répliques de science-fiction.
- `js/tactile.js` : boutons tactiles (chaque bouton envoie une touche du clavier).
- `css/style.css` : mise en forme.
- `outils/typo.py` : typographie française des textes.
