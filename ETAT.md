# État du projet

Dernière mise à jour : 1er novembre 2026

## En une phrase

Jeu web de simulation spatiale (vol, atterrissage, exploration, campagne dans le Système solaire et au-delà), jouable en ligne, en bêta test : la carte 5 est terminée (points 1 à 22), les bugs connus de la bêta sont corrigés, et tout est fusionné dans `main`.

## Fait

Le socle :
- Vol en 2D avec physique réelle (gravité, atmosphère, traînée, échauffement, rayonnement), atterrissage, plongée dans les géantes, décollage avec étages et coiffe.
- Système solaire complet (données NASA/JPL : lunes, astéroïdes), mécanique orbitale (Kepler, Lambert, sphères d'influence), orbiteur, sondes, stations, bases, ravitos, atelier.
- Exploration en vue de côté : spationaute, astromobile, robot, drone ; échantillons, drapeaux, easter eggs et traces des vraies missions.
- Campagne : équipe, missions de fond, registre des équipages, journal, progression, retour sur Terre en capsule, départ vers d'autres étoiles.
- Promenade : la Terre et 52 objets du ciel lointain. Entraînement sur Terre (astromobile, robot, drone, escalade).
- Commandes tactiles (téléphone, tablette).

Octobre 2026 :
- Jour et nuit au sol ; choix du lieu d'atterrissage (`sites.js`) ; anciennes missions à leur vraie longitude ; Mercure de nuit, base au fond du cratère Prokofiev.
- Astromobile (accélérateur, frein, bridage), base animée, R&D (`ameliorations.js`), escalade, sortie à deux (`duo.js`).

Carte 5 (novembre 2026), points 1 à 22 :
- 1. Retour sur Terre : les nuages défilent dans le bon sens, face au bouclier.
- 2. La coque suit la température du jour ou de la nuit (plus de rougeoiement la nuit sur Mercure).
- 3. Échap pendant la remontée vers l'orbite : confirmation avant de condamner l'équipage.
- 4. Chutes : blessure bénigne dès 7 m/s d'impact, grave dès 11 m/s (donc selon la gravité).
- 5. Soins : blessure bénigne soignée à bord en quelques jours, capacités réduites ; blessure grave : rapatriement en capsule (mode dégradé) ou retour de tous.
- 6. Combinaison éraflée, fissurée, déchirée : l'oxygène fuit d'autant ; ruban adhésif (2 rouleaux par personne, seul ou à deux).
- 7. Astromobile contre une paroi : dégâts visibles, vitesse réduite ou hors d'usage, passagers blessés, réparation à bord.
- 8. Saut en astromobile : batterie, combinaison du conducteur et du passager abîmées séparément, au hasard.
- 9. Escalade animée, grappin, cordée (Sam suit, encordé ; la corde retient les glissades).
- 10. Courte-échelle (3,5 m au plus) et main tendue, allongé au bord (2,8 m au plus), animées.
- 11. À quatre pattes au-delà de 25° de pente.
- 12. Choisir qui descend : 2 places (3 avec le module d'habitation), quelqu'un reste en orbite, blessé grave exclu.
- 13. Module de secours : choisir qui monte, embarquement de chacun à son tour.
- 14. Personnage coincé : départs séparés (module de secours, module posé), atterrisseur conservé.
- 15. Le compagnon signale une découverte (« Viens voir ça ! », repère) ; elle ne compte que pour le spationaute incarné.
- 16. Déchets (`dechets.js`) : soute de l'orbiteur, vidange à l'amarrage, station limitée.
- 17. Extensions de station et de base envoyées d'une station à l'autre ; une extension de base sans base attend au stock.
- 18. Capsules de retour selon l'équipage (`retour.js`) : 3 places (Soyouz), 4 (Orion), 7 (Crew Dragon) ; au-delà, plusieurs capsules, équipage réparti, repêchées une à une.
- 19. Visuels des niveaux de R&D sur les véhicules (`visuels.js`) : astromobile, robot, drone, module ; planche « Évolution des véhicules » dans l'Aide (onglet Au sol).
- 20. Formes réalistes des petits astres (`formes.js`) : 26 silhouettes connues (Phobos et Stickney, Hypérion en éponge, Atlas et Pan en soucoupe, Protée à facettes…), forme générique sous 150 km de rayon.
- 21. Campagne, atterrissage progressif (`sites.js`, `premiereDescente`) : première descente sur la zone de la sonde ou à l'équateur ; ensuite les anciennes missions et « Ailleurs », en suggestions.
- 22. Easter eggs Total Recall (agence de souvenirs, sur Mars en plus des autres) et Starship Troopers (insectes géants sur TRAPPIST-1 c), avec leurs références dans la Progression.

Hors carte :
- Vivres et eau potable comme sur l'ISS (`vivres.js`) : consommation, plein, cargos, alertes, rationnement puis morts ; eau des bases à glace ; serre de bord (R&D) ; écosystème fermé (R&D) exigé pour quitter le Système solaire.
- Bugs de la bêta corrigés : aide clavier de l'exploration sur plusieurs lignes si l'écran est étroit ; température des astres sans air qui suit la hauteur du Soleil (`chaleurLocale`, dans `vol.js`), combinaison à 130 °C ; accord « 1 sonde » (`nombre()` dans `francais.js`) ; paroi qui barre le retour annoncée sur toute sa hauteur, distance au pied.
- Textes des écrans en justifié, avec césure (`css/style.css`) ; les blocs centrés le restent.

## En cours

- Rien.

## À faire, dans l'ordre

1. Jouer une vraie campagne avec tous ces ajouts : beaucoup n'ont été testés que par appels directs (vivres, déchets, extensions, secours, capsules multiples, atterrissage progressif, easter eggs de la carte 5).
2. Vérifier les blocs centrés (chiffres de l'accueil, cartes de l'équipage) avec le texte justifié : ils n'ont pas été vus à l'écran.
3. Mode à deux : l'aide clavier découpée n'a pas été vue avec « Tab G C K O ».

## Bugs connus de la bêta

- Aucun pour l'instant.

## Décisions prises

- Pas de framework ni de build : le jeu doit s'ouvrir avec un simple `index.html`.
- Valeurs physiques réelles, arrondies ; les exagérations sont signalées (Soleil agrandi ×3 dans le ciel).
- Le sol est un anneau à une dimension de périmètre 2πR : la longitude donne la position, la latitude ne sert qu'aux textes.
- La visite rapide sait tout d'avance (pas besoin de sonde) ; la campagne, non.
- Une seule base, une seule station et une seule sonde par astre ; une extension n'est pas une base.
- Les améliorations de R&D valent pour toute l'expédition, et la suivent vers une autre étoile.
- Sortie à deux : automatique quand un second membre descend (en visite rapide : Sam) ; les messages prennent le vrai nom du compagnon.
- Easter eggs : découverts seulement par le spationaute incarné, de près (le compagnon peut les signaler) ; les traces réelles, par tous. Mars peut en avoir plusieurs (Total Recall en plus des autres).
- Blessures : le « mode dégradé » est celui qui existe après une mort (équipage traumatisé, manœuvres risquées).
- Cordée : encordé au grappin, une glissade ne fait pas tomber (on pend, puis on se rattrape).
- Descente : quelqu'un reste toujours en orbite ; 2 places, 3 avec le module d'habitation.
- Module d'urgence = module de secours (appel U) ; le module posé sur place est l'autre.
- Vivres et eau : pénurie = rationnement puis morts ; production hors Terre limitée (eau des glaces, petite serre) ; 100 % d'autonomie seulement avec l'écosystème fermé, exigé pour quitter le Système solaire.
- Température au sol sans air : sin(élévation du Soleil)^¼ entre la nuit et le maximum de midi ; la Lune monte à 120 °C seulement à midi, la combinaison tient 130 °C. Sur Mercure, on peut sortir quand le Soleil est à moins de 3° environ (voulu).
- Espaces insécables : jamais dans le code, les commandes, les noms de fichiers ; gardées dans les textes affichés (`outils/typo.py`).

## Pièges

- Les chaînes du jeu contiennent des espaces insécables : une ancre d'`Edit` qui en contient échoue, et la lecture ne les montre pas. Passer par un script Python avec une recherche tolérante (chaque espace accepte aussi U+00A0 et U+202F) ou repérer la ligne par son début.
- Commandes PowerShell vers WSL : les guillemets et `$` imbriqués font planter zsh ou PowerShell. Écrire le script dans un fichier, puis `wsl -d ubuntu -- bash fichier.sh` (ou `python3 fichier.py`).
- Le navigateur garde l'ancien JS en cache : toujours monter `?v=` avant de recharger.
- Volet du navigateur caché : `requestAnimationFrame` tourne au ralenti, le jeu semble figé. Faire avancer la simulation à la main (`x.step(1/30, commandes)`).
- Tester sans abîmer la sauvegarde d'Edouard : remplacer `window.sauver` par une fonction vide pendant le test, restaurer ce qu'on touche (`etat.decouvertes`…), puis recharger la page.
- Un saut de temps (traversée vers une autre étoile, retour d'absence) fait tout consommer d'un coup : remettre à jour les horodatages (`tVivres`, `tDechets`) quand le temps saute sans que l'équipage vive.
- Un texte dans une chaîne simple `'…'` n'interpole pas `${…}` : utiliser un gabarit `` `…` ``.
- `outils/typo.py` traite tous les fichiers, quels que soient les arguments : relire le diff avant de commiter.
- Créer la branche (`git switch -c …`) avant de commiter, et vérifier avec `git branch --show-current` : un commit est déjà parti sur la branche du point précédent.
- Ne pas forcer `x.duo = true` en test : sans second personnage, `dessinerDuo` plante à chaque image.
- `ECRAN_TACTILE` est calculé au chargement, et une largeur sous 768 px dans le navigateur intégré émule un téléphone. Pour voir un écran étroit au clavier : charger à 768 px ou plus, puis rétrécir sans recharger.
- Tester l'amarrage sans campagne : `Orbiteur.amarrer.call(faux, true)`, avec un objet `faux` qui fournit `v`, `stationIci()`, `etatStation()` et `log()`.

## Carte des fichiers importants

Cœur :
- `index.html` : écrans et ordre de chargement des scripts.
- `js/main.js` : boucle de jeu, touches, lancement des vols, descente (lieu, équipage), robot, drone, base, fin de vol, secours, sauvegarde.
- `js/vol.js` : simulation et dessin d'un vol (poussée, atmosphère, température de coque, atterrissage, ciel, terrain, base animée, tableau de bord), jour local et chaleur du Soleil au sol.
- `js/physique.js` : conditions selon l'altitude, sol en anneau (`distSol`, `ecartSol`).
- `js/astres.js`, `js/catalogue.js`, `js/donnees-jpl.js` : les astres.
- `js/systemes.js`, `js/etoiles-proches.js` : systèmes stellaires.
- `js/equipements.js` : pièces du hangar.
- `js/francais.js` : articles et élisions devant les noms, `nombre()` pour accorder une quantité.

Campagne :
- `js/orbiteur.js` : écran de l'orbiteur (pilotage, sondes, stations, amarrage et plein, atelier, R&D, ravitos, vidange, deuil, rappel).
- `js/orbites.js`, `js/navigation.js` : mécanique orbitale et manœuvres.
- `js/campagne.js` : règles (atterrisseur, stocks et cargos, bases, ressources, recettes, extensions).
- `js/ameliorations.js` : R&D (améliorations, niveaux, coûts, prérequis, serre, écosystème fermé).
- `js/vivres.js` : vivres et eau potable (consommation, production, pénurie).
- `js/dechets.js` : déchets de l'équipage, vidange.
- `js/sites.js` : lieux d'atterrissage (première descente, suggestions), positions réelles des anciennes missions, cratère polaire de Mercure.
- `js/equipe.js` : équipe, missions de fond, blessures et soins, choix de qui descend, réparation de l'astromobile.
- `js/equipage.js` : profils et dessin des spationautes (poses : escalade, quatre pattes, courte-échelle, allongé).
- `js/registre.js`, `js/vaisseau.js` : registre des équipages, nom du vaisseau.
- `js/tableau.js`, `js/journal.js`, `js/progression.js` : tableau de bord d'un astre, journal, progression (références des easter eggs).
- `js/amarrage.js`, `js/retour.js`, `js/kourou.js` : scènes animées (`retour.js` : capsules selon l'équipage, repêchage).
- `js/depart.js`, `js/interstellaire.js` : départ vers une autre étoile (liste de contrôle).
- `js/rayonnement.js` : doses de rayonnement réelles.

Au sol :
- `js/exploration.js` : sortie à pied, astromobile, robot ; chutes et blessures, combinaison, escalade et grappin, quatre pattes, jour et nuit, retour (`cheminVers`), appel d'urgence et départs séparés.
- `js/duo.js` : sortie à deux (suivre, cordée, courte-échelle, main tendue, oxygène partagé).
- `js/decouvertes.js` : easter eggs et leurs dessins, traces réelles, signalements du compagnon.
- `js/descente-robot.js`, `js/drone.js` : largage du robot, drone.
- `js/visuels.js` : visuels des niveaux de R&D sur les véhicules, planche d'évolution.
- `js/essai.js` : entraînement sur Terre.

Écrans et interface :
- `js/ecrans.js` : hangar, carte, résultat, sauvegarde.
- `js/infos.js`, `js/aide.js` : fiches, encyclopédie, onglet Aide.
- `js/observation.js`, `js/observatoires.js` : ciel lointain, observatoires.
- `js/globes.js` : apparence des astres ; `js/formes.js` : silhouettes des astres non sphériques.
- `js/repliques.js` : répliques de science-fiction.
- `js/tactile.js` : boutons tactiles.
- `css/style.css` : mise en forme.
- `outils/typo.py` : typographie française des textes affichés.
