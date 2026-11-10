# État du projet

Dernière mise à jour : 10 novembre 2026 (nuit, après la reprise à 1 h 40)

## En une phrase

Jeu web de simulation spatiale (vol, atterrissage, exploration, campagne dans le Système solaire et au-delà), jouable en ligne, en bêta test : `main` est publié en version 354 (sorties tenues par les mains, tour de Kourou) ; les cinq points du plan `docs/plan-stations-astromobile.md` (astromobile, stations module par module, imprévus des sorties) sont codés et testés par appels directs, sur des branches locales enchaînées, pas encore poussées.

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
- 11. Montée raide au-delà de 35° (debout en descente) ; depuis le 6 novembre, marche penchée en avant au lieu de quatre pattes.
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

Retours de jeu (1er novembre 2026, après la carte 5) :
- Panneau de l'exploration à la taille de son contenu (colonne des valeurs après la plus longue étiquette).
- Entraînement à l'astromobile : deux objectifs de plus, débrider (B) et dépasser 5 m/s, puis rebrider et ralentir.
- Astromobile à batterie vide : l'accélérateur ne répond plus (roue libre), même débridée.
- Corde du grappin rangée d'elle-même dès que la cordée est en haut (`cordeInutile`).
- Sortie à deux : le compagnon ne saute pas d'une falaise pour suivre, il attend au bord (Tab pour le piloter).
- Descente en rappel : ↓ au bord d'une falaise (plus de 45°), le grappin est planté au bord ; le compagnon descend ensuite ; corde récupérée quand tous sont en bas ; bouton ⤓ sur téléphone.
- Astromobile qui capote : tonneaux avec l'élan conservé (70 % de la vitesse après le choc), freinés par le frottement (0,6 × g), puis retour sur les roues.

Carte 7 (3 et 4 novembre 2026), corde, grappin et mise en orbite, fusionnée dans `main` (version 275) :
- 1. Le lancer du grappin va à son terme même si l'on relâche ↑ ; grappin rangé si l'on s'éloigne du pied de la paroi (« Lancer abandonné » ou « Corde récupérée »).
- 2. Cordée : la corde ne va qu'à qui est sur la paroi (`surParoi` : raide des deux côtés des pieds) ; lien entre les deux seulement si les deux y sont ; grappin rangé quand plus personne n'y est. Lâcher ↑ en pleine paroi : on reste accroché. Le compagnon vient au pied de la paroi et monte derrière vous. Une glissade encordée ne fait plus tomber (un seul tirage au sort).
- 3. Tab pendant l'escalade ou le rappel : l'état suit chaque personnage ; celui qu'on quitte termine seul sa montée (même en mode « attend ») ou son rappel, puis attend. Grappin gardé au pied seulement tant que personne n'est monté (`gp.servi`).
- Rappel : le compagnon va jusqu'au bord pour descendre à son tour (bug d'avant la carte, sur paroi presque verticale) ; « bloqué au pied » seulement si l'on est plus haut que lui.
- 4. Mise en orbite : titre « Orbite visée », jauges « valeur, minimum » ; le minimum de vitesse suit l'altitude actuelle, comme le test de réussite. Tolérance 90 % / 97 % gardée et expliquée dans l'Aide (vitesse en repère fixe : à 97 %, l'orbite repasserait ≈ 600 km sous la surface).

Carte 6 (4 et 5 novembre 2026), fusionnée dans `main` (version 302). Compte rendu détaillé de la nuit : `docs/carte6-nuit.md`.
- 1. Descente avec personne à bord : texte propre (tous morts, ou toute l'équipe en mission) au lieu de « une seule personne » ; bouton « Descendre » grisé ; le robot reste possible.
- 8. Écran de fin : lieu du décès (`lieuAbord` : « en route vers Saturne », « en orbite de Titan », « sur » seulement au sol), aussi dans le registre ; morts regroupés par cause et par lieu, « mort » accordé (`groupesPertes`, `accorderCause`) ; titre « Fin de mission : équipage perdu » ; statistiques en tableau avec quatre compteurs nommés (bilan de l'expédition `v.bilan`, remis à zéro à chaque départ : échantillons rapportés, analyses effectuées, analyses transmises ; plus le total depuis le début). Une expédition commencée avant affiche « — ».
- 2. Vivres pour les longs voyages : alerte au choix d'une cible (durée du voyage comparée à l'autonomie en route, date de la pénurie, confirmation) ; escale à une station sur le trajet, puis « Reprendre le voyage » ; R&D « Recyclage de l'eau et de l'air » et « Torpeur (science-fiction) » (consommation divisée par 4 en route).
- 3. Équipage mort : choix entre ramener l'orbiteur et « continuer en sonde », piloté depuis le sol (seul le pilote auto ; commandes avec le délai radio réel). Bouton « ⚙ » de l'orbiteur : réglages de la campagne (délai radio, calcul simplifié).
- 4. Calcul simplifié des objets en transit (sondes, ravitos) : trajectoire calculée une fois puis suivie ; réglage automatique au-delà de 10 objets, toujours ou jamais ; ≈ 200 fois moins de calcul.
- 5. Aspect des trouvailles (`trouvailles.js`) : sites à grande échelle (lac sur la rive, cratère, coulée, panache, fissure, lit de rivière) et échantillons à petite échelle, à leur taille réelle. Liste : `docs/carte6-echantillons.md`.
- 6. Zones réelles (`zones.js`) : Mars, la Lune et 11 autres astres à l'échelle réelle, plus 4 zones schématiques, dans « Où se poser ? » ; plan lointain dans l'exploration. Méthode et liste : `docs/carte6-zones.md`.
- 7. Recrues transportées (`transferts.js`), étape 1 : fenêtre « Envoyer des spationautes » (recrues ou spationautes en service, vers l'orbiteur, une station ou une base), vaisseau de transfert de 4 places sur une vraie trajectoire, en arrière-plan.
- Scaphandre lourd pour Titan (R&D en campagne, fourni en visite rapide), phares du casque la nuit, entraînement au Centre des astronautes européens de Cologne.

Session du 6 au 10 novembre 2026, fusionnée dans `main` (version 351) :
- Montée raide : marche penchée en avant, mains au sol par moments ; le compagnon n'est plus dans deux états à la fois.
- Easter eggs répartis sur les lieux de descente (`sites.js`, `ancresEggs`) ; feuille « Personne ici » sur Pluton.
- Finances (`finances.js`) : chaque dépense chiffrée en euros, coûts courants, vue par mois ou par an, tarifs et sources dans l'Aide ; ravitaillement courant facturé.
- Centre de commande (`commande.js`), onglets : vue d'ensemble (avec le portrait de la flotte), ravitos, stations et bases, R&D, équipage, lancements, ressources, finances, bilan, journal, au-delà. R&D menée sur Terre (euros et temps).
- Grappes de sondes vers d'autres étoiles : fenêtre après le premier décollage, systèmes à cocher, voile laser ou fusion, lancées depuis la Terre (`interstellaire.js`).
- Bilan (`bilan.js`) : ce que la Terre a fourni, ce qu'on a tiré de chaque astre (provenance suivie dans les stocks), allègement en masse et en part de la masse ; bilan carbone avec facteurs et sources.
- Ravitaillement courant selon les besoins (`ravitaillement.js`) : seulement ce qui manque ; navette vers les bases ; occupants des stations et des bases qui consomment, pénuries (rationnement puis morts) et alerte à temps selon le trajet réel d'un ravito de secours.
- Objets artificiels : silhouettes réelles (`objets.js`) ; orbite modifiable par le jet des moteurs ou une poussée volontaire, garde-fous en option, chute et départ possibles (`orbites-objets.js`).
- Silhouettes de l'orbiteur (selon la R&D et ce qu'il emporte) et des stations (selon leur niveau) (`vaisseaux.js`).
- Durées de R&D comme de vrais programmes (mois, années, décennies), référence réelle affichée.
- Dates « 1ᵉʳ mai » ; premier départ : passage obligatoire par l'entraînement (une fois, à refaire après une remise à zéro).
- Exploration : relief lointain opaque, qui descend derrière le terrain proche quand on monte ; distance des astres du ciel au survol ; avertissement du froid sur Triton.
- Sorties au sol (`physiologie.js`) : cœur et oxygène du sang, mort non instantanée, perte de connaissance, secours, séquelles, fondu au noir, temps ×1 aux alertes, voile rouge, ruban et oxygène dans l'astromobile à l'arrêt, fenêtre de secours.
- Lanceur détruit (`explosion.js`) : effondrement puis grosse explosion.
- Sorties depuis une station (`eva.js`, `eva-missions.js`), étapes 1 et 2 : à deux par le sas, mains courantes, longe, dérive et SAFER, jour et nuit réels, rayonnement du lieu ; pannes des stations et missions de réparation (batteries, panneau, ammoniac, détecteur), sac à outils, robot si le rayonnement est trop fort.
- Sorties depuis une station plus réalistes (publié, v354) : tenu par les mains, jambes dans le vide ; longe souple accrochée à la taille ; T pour se hisser le long de la longe ; plus de blocage à ×50 ; − reconnu sur AZERTY. Tour de Kourou posée sur la Terre arrondie.
- Astromobile (branches locales) : même tenue qu'à pied (scaphandre lourd, lampes la nuit), équipier assis à l'arrière ; laissée sur place et retrouvée à moins de 2 km (batterie, dégâts) ; choix à la descente : repliée (niveau ≤ 1, se déplie en 20 min à côté d'elle), par cargo depuis la station (niveau 2, ergols du stock, 400 M€), ou sans (`astromobile.js`).
- Stations module par module (branche locale, Système solaire) : noyau lancé par Hercule ou par cargo (vrai trajet), ou depuis le kit d'une station ; chaque module s'amarre puis attend une sortie d'assemblage à deux, ou le robot (bras dès le niveau 3), deux fois plus lent ; kits de l'orbiteur déposés à l'amarrage (`modules-station.js`).
- Sorties depuis une station, étape 3 (branche locale) : eau dans le casque, combinaison trop gonflée au sas (P), débris en approche avec manœuvre et éclats (`eva-imprevus.js`).

## En cours

- Branches locales enchaînées, non poussées : `astromobile-visuels` → `astromobile-sur-place` → `astromobile-cargo` → `stations-modules` → `eva-imprevus` (la dernière contient tout, version 361). À pousser et fusionner quand Edouard le dit.

## À faire, dans l'ordre

1. Jouer en vrai les nouveautés de la nuit : choix de l'astromobile à la descente, dépliage, cargo, réemploi à 2 km ; noyau de station et sortie d'assemblage ; imprévus des sorties (tout n'a été testé que par appels directs).
2. Dessiner le module amarré, pas encore raccordé, sur la silhouette de la station (`vaisseaux.js`, `eva.js`).
3. Jouer une vraie campagne : presque tout le travail de novembre n'a été testé que par appels directs, sur des copies de la sauvegarde.
4. Rappel et tonneaux, escalade et cordée : vérifier en jouant sur d'autres astres (testés sur des terrains d'essai).
5. Carte 6, point 8 : la date « 4 mars 2265 » de la capture d'Edouard n'est pas expliquée ; demander sa sauvegarde.

## Bugs connus de la bêta

- Boutons de l'accueil sans réponse juste après une publication : non reproduit : déploiement de GitHub Pages : probablement un cache mélangé (attendre ≈ 10 min, puis Ctrl+F5).
- Ravitaillement courant de la station terrestre : jusqu'à 150 t par passage au niveau 5, soit des milliards d'euros par mois : `ravitaillement.js` : un plein d'orbiteur gardé en réserve à chaque station, peut-être trop.

## Décisions prises

- Pas de framework ni de build : le jeu doit s'ouvrir avec un simple `index.html`.
- Valeurs physiques réelles, arrondies ; les exagérations sont signalées (Soleil agrandi ×3 dans le ciel, feuille A4 agrandie sur Pluton).
- Le sol est un anneau à une dimension de périmètre 2πR : la longitude donne la position, la latitude ne sert qu'aux textes.
- La visite rapide sait tout d'avance (pas besoin de sonde) ; la campagne, non.
- Une seule base, une seule station et une seule sonde par astre ; une extension n'est pas une base.
- Les améliorations de R&D valent pour toute l'expédition ; elles se mettent au point sur Terre, en euros et en temps réaliste.
- Sortie à deux : automatique quand un second membre descend (en visite rapide : Sam) ; les messages prennent le vrai nom du compagnon.
- Easter eggs : découverts seulement par le spationaute incarné ; un seul près de la zone de la sonde, plusieurs répartis sur les lieux de descente.
- Blessures : le « mode dégradé » est celui qui existe après une mort (équipage traumatisé, manœuvres risquées).
- Cordée : elle n'existe que si les deux sont sur la paroi ; plus personne sur la paroi = grappin rangé.
- Mise en orbite : tolérance de jeu gardée (90 % de l'altitude visée, 97 % de la vitesse circulaire), signalée dans l'Aide.
- Personne à bord : pas de descente humaine ; le robot peut descendre.
- Vivres : règles réalistes dans le Système solaire ; torpeur et écosystème fermé sont de la science-fiction signalée.
- Équipage mort : au choix, ramener l'orbiteur ou continuer en sonde ; délai radio réel, désactivable (⚙).
- Montée raide : marche penchée, pas de quatre pattes (personne ne rampe en scaphandre).
- Finances pour le plaisir : on ne manque jamais d'argent ; montants tirés de vrais programmes, sources affichées.
- La Terre décide (centre de commande) ; l'orbiteur garde un raccourci.
- Grappes de sondes : lancées depuis la Terre (pas le stock de l'orbiteur), propulsion au choix.
- Carbone : ergols des lanceurs calculés, le reste par ratios monétaires (ordre de grandeur, signalé).
- Ravitaillement courant : seulement ce qui manque ; facturé ; les occupants des stations et des bases mangent, avec les mêmes règles qu'à bord.
- Objets artificiels : leur orbite peut changer ; garde-fous en option (on peut tout faire, même les perdre).
- Mort en sortie : jamais instantanée sauf écrasement, brûlure ou rayonnement ; fondu au noir, retour au module, sans détails.
- Sorties depuis une station : n'importe quelle station ; ciel et rayonnement réels ; robot si le rayonnement est trop fort.
- Astromobile et stations : décisions du 10 novembre dans `docs/plan-stations-astromobile.md`.
- Astromobile repliée : elle se déplie seulement si quelqu'un se tient à côté (on tire sur les sangles, comme sur Apollo) ; à deux, deux fois plus vite.
- Cargo de l'astromobile : il se pose à 150 m du lieu choisi, pas du lieu réel d'atterrissage ; se poser loin, c'est marcher.
- Stations : hors du Système solaire (sans Terre pour lancer), on garde le déploiement depuis l'orbiteur et l'assemblage automatique en 10 jours.
- Imprévus des sorties : au plus un de chaque par sortie (eau 12 %, combinaison gonflée 12 %, débris 10 %) ; abri contre les débris : à moins de 6 m de l'écoutille.
- Espaces insécables : jamais dans le code, les commandes, les noms de fichiers ; gardées dans les textes affichés (`outils/typo.py`).

## Pièges

- Les chaînes du jeu contiennent des espaces insécables : une ancre d'`Edit` qui en contient échoue, et la lecture ne les montre pas. Passer par un script Python avec une recherche tolérante (chaque espace accepte aussi U+00A0 et U+202F) ou repérer la ligne par son début.
- Commandes PowerShell vers WSL : les guillemets et `$` imbriqués font planter zsh ou PowerShell. Écrire le script dans un fichier, puis `wsl -d ubuntu -- bash fichier.sh` (ou `python3 fichier.py`).
- Le navigateur garde l'ancien JS en cache : toujours monter `?v=` à un numéro jamais utilisé avant de recharger, et vérifier la version chargée (`document.scripts`).
- Volet du navigateur caché : `requestAnimationFrame` ne tourne pas. Faire avancer la simulation à la main (`x.step(…)`, ou `boucle(t)` avec `t` croissant pour les scènes).
- Images de contrôle avec le volet caché : dessiner sur un canvas, l'envoyer en `text/plain` à `~/code/Biguhuh/recevoir.py` (port 8766, un seul envoi par lancement), puis lire le PNG.
- Tester sans abîmer la sauvegarde d'Edouard : `window.sauver = () => {}`, travailler sur `etat.voyage = structuredClone(etat.voyage)`, puis recharger la page.
- Un saut de temps fait tout consommer d'un coup : remettre à jour les horodatages (`tVivres`, `tDechets`, `tResidents`) quand le temps saute sans que l'équipage vive.
- Un texte dans une chaîne simple `'…'` n'interpole pas `${…}` : utiliser un gabarit `` `…` ``.
- `outils/typo.py` traite tous les fichiers, quels que soient les arguments : relire le diff avant de commiter.
- Créer la branche avant de commiter, et vérifier avec `git branch --show-current`.
- Après `navigate`, attendre le chargement (une seconde) avant d'appeler les fonctions du jeu.
- `read_console_messages` garde les erreurs des chargements précédents : ouvrir un onglet neuf pour savoir si une erreur est actuelle.
- Commentaire en fin de ligne : ne jamais le glisser au milieu d'une ligne de code ; le mettre sur sa propre ligne.
- Identifiants d'astres : vérifier qu'ils existent (Encelade est `l602`, Charon `l901`, Cérès `a1`).
- Expressions régulières : « décompression » contient « pression » : tester le plus long d'abord.
- Remplacement JS `'$11ᵉʳ'` lu comme le groupe 11 : passer par une fonction `(m, a, b) => …`.
- Push : sans « pousse » ou « publie » d'Edouard, le contrôle automatique des permissions le refuse ; commiter en local et demander.
- Publication : GitHub Pages met quelques minutes ; pendant ce temps, le navigateur peut mélanger anciens et nouveaux fichiers.
- Tester l'orbiteur : `Orbiteur.charger(v)` avant tout, puis `allerNavigation()` pour que le panneau existe (`majHud` sinon plante).
- L'outil `Write` refuse d'écraser un fichier pas encore lu : si la commande qui suit lance ce fichier, c'est l'ancienne version qui tourne (arrivé avec `publier.sh`). Lire le fichier avant de le réécrire.
- `recevoir.py` attend le chemin de sortie en argument ; l'envoi depuis la page a échoué cette nuit. Plus simple : poser un canvas en `position:fixed` dans la page et faire une capture du volet.
- `Orbiteur.log` plante si l'écran de l'orbiteur n'a pas été ouvert (journal absent) : en test, le remplacer par une fonction qui garde les messages.
- Comparer avec `main` sans changer de branche : `git worktree add /tmp/fusee-main main`, serveur sur le port 8766, puis `git worktree remove --force /tmp/fusee-main`.

## Carte des fichiers importants

Cœur :
- `index.html` : écrans et ordre de chargement des scripts.
- `js/main.js` : boucle de jeu, touches, lancement des vols, descente, robot, drone, base, fin de vol, secours, sauvegarde, nouvelle campagne (remises à zéro) ; écran de fin de mission.
- `js/vol.js` : simulation et dessin d'un vol, ciel (astres survolés, distance), terrain, base animée, tableau de bord.
- `js/explosion.js` : destruction d'un grand lanceur (effondrement, explosion).
- `js/physique.js` : conditions selon l'altitude, sol en anneau (`distSol`, `ecartSol`).
- `js/astres.js`, `js/catalogue.js`, `js/donnees-jpl.js` : les astres.
- `js/systemes.js`, `js/etoiles-proches.js` : systèmes stellaires.
- `js/equipements.js` : pièces du hangar.
- `js/francais.js` : articles et élisions devant les noms, `nombre()` pour accorder une quantité.

Campagne :
- `js/orbiteur.js` : écran de l'orbiteur (pilotage, sondes, stations, amarrage et plein, ravitos, vidange, deuil, rappel, carte, sortie depuis une station).
- `js/commande.js` : centre de commande et ses onglets.
- `js/finances.js` : tarifs, dépenses, coûts courants, fenêtre des finances.
- `js/bilan.js` : bilan matière par astre et bilan carbone.
- `js/ravitaillement.js` : ravitaillement courant selon les besoins, navette vers les bases, occupants et pénuries.
- `js/orbites.js`, `js/navigation.js` : mécanique orbitale et manœuvres.
- `js/campagne.js` : règles (atterrisseur, stocks et cargos, bases, ressources, recettes, extensions).
- `js/ameliorations.js` : R&D sur Terre (améliorations, niveaux, durées réelles, coûts, prérequis).
- `js/vivres.js`, `js/dechets.js` : vivres et eau de l'orbiteur, déchets.
- `js/sites.js` : lieux d'atterrissage, anciennes missions, ancres des easter eggs.
- `js/transferts.js` : transport des spationautes.
- `js/equipe.js` : équipe, missions de fond, blessures et soins, choix de qui descend ; pertes et bilan de l'expédition.
- `js/equipage.js` : profils et dessin des spationautes.
- `js/registre.js`, `js/vaisseau.js` : registre des équipages, nom du vaisseau, composition de l'équipage.
- `js/tableau.js`, `js/journal.js`, `js/progression.js` : tableau de bord d'un astre, journal, progression.
- `js/amarrage.js`, `js/retour.js`, `js/kourou.js` : scènes animées.
- `js/depart.js`, `js/interstellaire.js` : départ vers une autre étoile ; grappes de sondes.
- `js/rayonnement.js` : doses de rayonnement réelles.
- `js/vaisseaux.js` : silhouettes de l'orbiteur et des stations, portrait de la flotte.
- `js/eva.js` : sortie extravéhiculaire depuis une station (scène, longe, SAFER, jour et nuit, rayonnement).
- `js/eva-missions.js` : pannes des stations, missions de réparation, robot, choix de la sortie.
- `js/eva-imprevus.js` : imprévus des sorties (eau dans le casque, combinaison gonflée, débris).
- `js/modules-station.js` : noyau de station, modules par niveau, amarrage et raccordement (Système solaire).

Au sol :
- `js/trouvailles.js` : aspect des sites et des échantillons au sol.
- `js/zones.js` : zones réelles et plan lointain de l'exploration.
- `js/exploration.js` : sortie à pied, astromobile, robot ; chutes, combinaison, escalade, grappin et rappel, jour et nuit, retour, appel d'urgence.
- `js/duo.js` : sortie à deux (suivre, cordée, rappel, entraide, oxygène partagé).
- `js/astromobile.js` : astromobile repliée ou par cargo, choix à la descente, dépliage, dessin du cargo.
- `js/physiologie.js` : cœur et oxygène du sang, secours, mort en fondu, voile rouge.
- `js/decouvertes.js` : easter eggs et leurs dessins, traces réelles, signalements du compagnon.
- `js/descente-robot.js`, `js/drone.js` : largage du robot, drone.
- `js/visuels.js` : visuels des niveaux de R&D sur les véhicules, planche d'évolution.
- `js/essai.js` : entraînement sur Terre ; passage obligatoire au premier départ.

Écrans et interface :
- `js/ecrans.js` : hangar, carte, résultat, sauvegarde.
- `js/infos.js`, `js/aide.js` : fiches, infobulles, encyclopédie, onglet Aide.
- `js/observation.js`, `js/observatoires.js` : ciel lointain, observatoires.
- `js/objets.js`, `js/orbites-objets.js` : silhouettes et orbites modifiables des objets artificiels.
- `js/globes.js` : apparence des astres ; `js/formes.js` : silhouettes des astres non sphériques.
- `js/repliques.js` : répliques de science-fiction.
- `js/tactile.js` : boutons tactiles.
- `css/style.css` : mise en forme.
- `outils/typo.py` : typographie française des textes affichés.
- `docs/` : comptes rendus, plans (`plan-stations-astromobile.md`).
