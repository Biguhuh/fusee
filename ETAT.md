# État du projet

Dernière mise à jour : 5 novembre 2026 (nuit de travail sur la carte 6)

## En une phrase

Jeu web de simulation spatiale (vol, atterrissage, exploration, campagne dans le Système solaire et au-delà), jouable en ligne, en bêta test : les cartes 5 et 7 sont terminées et fusionnées dans `main` ; la carte 6 est faite (points 1 à 8, le point 7 en première étape), sur des branches pas encore fusionnées, à relire par Edouard.

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
- 11. À quatre pattes en montée au-delà de 35° (debout en descente).
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
- Quatre pattes seulement en montée, au-delà de 35° (`monteeDevant`) ; debout en descente.
- Sortie à deux : le compagnon ne saute pas d'une falaise pour suivre, il attend au bord (Tab pour le piloter).
- Descente en rappel : ↓ au bord d'une falaise (plus de 45°), le grappin est planté au bord ; le compagnon descend ensuite ; corde récupérée quand tous sont en bas ; bouton ⤓ sur téléphone.
- Astromobile qui capote : tonneaux avec l'élan conservé (70 % de la vitesse après le choc), freinés par le frottement (0,6 × g), puis retour sur les roues.

Carte 7 (3 et 4 novembre 2026), corde, grappin et mise en orbite, fusionnée dans `main` (version 275) :
- 1. Le lancer du grappin va à son terme même si l'on relâche ↑ ; grappin rangé si l'on s'éloigne du pied de la paroi (« Lancer abandonné » ou « Corde récupérée »).
- 2. Cordée : la corde ne va qu'à qui est sur la paroi (`surParoi` : raide des deux côtés des pieds) ; lien entre les deux seulement si les deux y sont ; grappin rangé quand plus personne n'y est. Lâcher ↑ en pleine paroi : on reste accroché. Le compagnon vient au pied de la paroi et monte derrière vous. Une glissade encordée ne fait plus tomber (un seul tirage au sort).
- 3. Tab pendant l'escalade ou le rappel : l'état suit chaque personnage ; celui qu'on quitte termine seul sa montée (même en mode « attend ») ou son rappel, puis attend. Grappin gardé au pied seulement tant que personne n'est monté (`gp.servi`).
- Rappel : le compagnon va jusqu'au bord pour descendre à son tour (bug d'avant la carte, sur paroi presque verticale) ; « bloqué au pied » seulement si l'on est plus haut que lui.
- 4. Mise en orbite : titre « Orbite visée », jauges « valeur, minimum » ; le minimum de vitesse suit l'altitude actuelle, comme le test de réussite. Tolérance 90 % / 97 % gardée et expliquée dans l'Aide (vitesse en repère fixe : à 97 %, l'orbite repasserait ≈ 600 km sous la surface).

Carte 6 (4 et 5 novembre 2026), branches poussées mais pas fusionnées, chacune partant de la précédente : `carte6-point1`, `carte6-point8`, `carte6-point2` … `carte6-point7` (la dernière contient tout). Compte rendu détaillé de la nuit : `docs/carte6-nuit.md`.
- 1. Descente avec personne à bord : texte propre (tous morts, ou toute l'équipe en mission) au lieu de « une seule personne » ; bouton « Descendre » grisé ; le robot reste possible.
- 8. Écran de fin : lieu du décès (`lieuAbord` : « en route vers Saturne », « en orbite de Titan », « sur » seulement au sol), aussi dans le registre ; morts regroupés par cause et par lieu, « mort » accordé (`groupesPertes`, `accorderCause`) ; titre « Fin de mission : équipage perdu » ; statistiques en tableau avec quatre compteurs nommés (bilan de l'expédition `v.bilan`, remis à zéro à chaque départ : échantillons rapportés, analyses effectuées, analyses transmises ; plus le total depuis le début). Une expédition commencée avant affiche « — ».
- 2. Vivres pour les longs voyages : alerte au choix d'une cible (durée du voyage comparée à l'autonomie en route, date de la pénurie, confirmation) ; escale à une station sur le trajet, puis « Reprendre le voyage » ; R&D « Recyclage de l'eau et de l'air » et « Torpeur (science-fiction) » (consommation divisée par 4 en route).
- 3. Équipage mort : choix entre ramener l'orbiteur et « continuer en sonde », piloté depuis le sol (seul le pilote auto ; commandes avec le délai radio réel). Bouton « ⚙ » de l'orbiteur : réglages de la campagne (délai radio, calcul simplifié).
- 4. Calcul simplifié des objets en transit (sondes, ravitos) : trajectoire calculée une fois puis suivie ; réglage automatique au-delà de 10 objets, toujours ou jamais ; ≈ 200 fois moins de calcul.
- 5. Aspect des trouvailles (`trouvailles.js`) : sites à grande échelle (lac sur la rive, cratère, coulée, panache, fissure, lit de rivière) et échantillons à petite échelle, à leur taille réelle. Liste : `docs/carte6-echantillons.md`.
- 6. Zones réelles (`zones.js`) : Valles Marineris, Olympus Mons, Hellas, Gale, Jezero, à l'échelle réelle, dans « Où se poser ? » ; plan lointain dans l'exploration. Méthode et liste des autres zones : `docs/carte6-zones.md`.
- 7. Recrues transportées (`transferts.js`), étape 1 : fenêtre « Envoyer des spationautes » (recrues ou spationautes en service, vers l'orbiteur, une station ou une base), vaisseau de transfert de 4 places sur une vraie trajectoire, en arrière-plan. Plus d'apparition instantanée.

## En cours

- Carte 6 (fichier de l'auteur : `C:\Users\DELL\Downloads\carte-jeu-fusee-6.md`) : tous les points faits pendant la nuit du 4 au 5 novembre, selon les décisions prises par Edouard avant la nuit (notées en tête de `docs/carte6-nuit.md`).
  - À faire au réveil d'Edouard : relire `docs/carte6-nuit.md` (résumé en tête), `docs/carte6-echantillons.md` et `docs/carte6-zones.md`, tester, corriger ce qui ne va pas, puis « fusionne » (fusionner `carte6-point7`, qui contient tout).
  - Point 7 : étape 1 seulement (trajet automatique). Étapes suivantes possibles : piloter le trajet, consommation des vivres à une station ou à une base.
  - Point 6 : zones réelles sur Mars, la Lune (`carte6-zones-lune`) et 11 autres astres (`carte6-zones-tous`, qui contient tout) ; plus 4 zones schématiques (rive de Ligeia Mare sur Titan, avec une mer où l'on s'arrête sur la rive ; Galileo Regio ; Valhalla ; Triton). Détail dans `docs/carte6-zones.md`.
- Scaphandre lourd pour Titan (branche `scaphandre-titan`, qui part de `carte6-zones-tous` et contient donc toute la carte 6) : chauffé, à pression ambiante, recycleur d'oxygène, jusqu'à 5 bar ; 20 % plus lent, 25 % d'autonomie en moins ; R&D en campagne, fourni en visite rapide ; enfilé automatiquement quand l'air dépasse 1,2 bar. Aucun autre astre du jeu n'est entre 1,2 et 5 bar (Terre 1, Titan 1,5, Vénus 92 ; exoplanètes sans atmosphère connue).
- Même branche : visuel du scaphandre lourd (orange, recycleur, phares) ; phares du casque allumés la nuit partout (`LUMIERE_SOL` < 0,5), pour vous et le compagnon ; l'entraînement se passe au Centre des astronautes européens de l'ESA, à Cologne.
- Rien n'est fusionné de la carte 6 : attendre « fusionne ».

## À faire, dans l'ordre

1. Jouer une vraie campagne avec tous ces ajouts : beaucoup n'ont été testés que par appels directs (vivres, déchets, extensions, secours, capsules multiples, atterrissage progressif, easter eggs de la carte 5).
2. Rappel et tonneaux : testés sur des terrains de test seulement. Vérifier en jouant que ↓ au bord se déclenche facilement (il faut appuyer dans les 60 derniers centimètres, sinon on tombe).
3. Vérifier les blocs centrés (chiffres de l'accueil, cartes de l'équipage) avec le texte justifié : ils n'ont pas été vus à l'écran.
4. Carte 6, point 8 : la date « 4 mars 2265 » de la capture d'Edouard (≈ 240 ans de jeu) n'est pas expliquée ; le calcul de la date semble juste. Demander sa sauvegarde pour comprendre (accélération du temps ?).
5. Carte 6, point 1 : le bouton « Descendre » grisé n'a pas été vu en vraie campagne (testé par appels directs).
6. Carte 7 : escalade, cordée, Tab et rappel testés sur la paroi d'entraînement seulement (8 m, presque verticale) ; à essayer sur d'autres astres.
7. Carte 6 : tout a été testé par appels directs dans des campagnes neuves en mémoire ; rien n'a été joué dans une vraie partie (alerte vivres et escale, contrôle au sol, calcul simplifié, trouvailles, zones de Mars, transferts d'équipage).

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
- Cordée (carte 7) : elle n'existe que si les deux sont sur la paroi ; seul celui qui est sur la paroi est attaché au grappin ; plus personne sur la paroi = grappin rangé (sauf au pied, corde en main, tant que personne n'est monté). Le grimpeur qu'on quitte (Tab) termine seul sa montée, puis attend.
- Mise en orbite : tolérance de jeu gardée (90 % de l'altitude visée, 97 % de la vitesse circulaire), signalée dans l'Aide.
- Personne à bord : pas de descente humaine ; le robot peut descendre. Tout l'équipage mort : les échantillons à bord sont récupérés (la capsule vide les rapporte).
- Vivres (carte 6) : règles réalistes dans le Système solaire (alerte, escale, ravito, recyclage) ; torpeur et écosystème fermé sont de la science-fiction, signalée comme telle, débloquée par la R&D d'une station.
- Équipage mort : au choix, ramener l'orbiteur ou continuer en sonde ; délai radio réel, désactivable (⚙).
- Calcul simplifié des objets en transit : automatique au-delà de 10 objets (réglable), manuel possible.
- Trouvailles : sites à grande échelle (on prélève au bord), échantillons à petite échelle, à taille réelle.
- Zones réelles : profils simplifiés à la main, à l'échelle réelle, posés est-ouest à leur vraie longitude ; Mars d'abord.
- Recrues : un vrai transport (vaisseau de transfert de 4 places, trajectoire des cargos) ; la fenêtre sert aussi à déplacer les spationautes en service.
- Descente : quelqu'un reste toujours en orbite ; 2 places, 3 avec le module d'habitation.
- Module d'urgence = module de secours (appel U) ; le module posé sur place est l'autre.
- Vivres et eau : pénurie = rationnement puis morts ; production hors Terre limitée (eau des glaces, petite serre) ; 100 % d'autonomie seulement avec l'écosystème fermé, exigé pour quitter le Système solaire.
- Quatre pattes : en montée seulement, entre 35° (pente de marche) et 45° (paroi, on escalade).
- Falaise en descente : on peut y tomber ; le compagnon, lui, attend au bord. Pour descendre proprement : le rappel (↓).
- Capotage : physique de l'élan (quantité de mouvement conservée, énergie dissipée par le choc puis le frottement), pas d'arrêt net.
- Température au sol sans air : sin(élévation du Soleil)^¼ entre la nuit et le maximum de midi ; la Lune monte à 120 °C seulement à midi, la combinaison tient 130 °C. Sur Mercure, on peut sortir quand le Soleil est à moins de 3° environ (voulu).
- Espaces insécables : jamais dans le code, les commandes, les noms de fichiers ; gardées dans les textes affichés (`outils/typo.py`).

## Pièges

- Les chaînes du jeu contiennent des espaces insécables : une ancre d'`Edit` qui en contient échoue, et la lecture ne les montre pas. Passer par un script Python avec une recherche tolérante (chaque espace accepte aussi U+00A0 et U+202F) ou repérer la ligne par son début.
- Commandes PowerShell vers WSL : les guillemets et `$` imbriqués font planter zsh ou PowerShell. Écrire le script dans un fichier, puis `wsl -d ubuntu -- bash fichier.sh` (ou `python3 fichier.py`).
- Le navigateur garde l'ancien JS en cache : toujours monter `?v=` avant de recharger. Il peut aussi garder `index.html` lui-même (donc les anciens `?v=`) : recharger avec `http://localhost:8765/?r=N`, et vérifier la version chargée (`document.scripts`).
- Volet du navigateur caché : `requestAnimationFrame` tourne au ralenti, le jeu semble figé. Faire avancer la simulation à la main (`x.step(1/30, commandes)`).
- Tester sans abîmer la sauvegarde d'Edouard : remplacer `window.sauver` par une fonction vide pendant le test, restaurer ce qu'on touche (`etat.decouvertes`…), puis recharger la page.
- Un saut de temps (traversée vers une autre étoile, retour d'absence) fait tout consommer d'un coup : remettre à jour les horodatages (`tVivres`, `tDechets`) quand le temps saute sans que l'équipage vive.
- Un texte dans une chaîne simple `'…'` n'interpole pas `${…}` : utiliser un gabarit `` `…` ``.
- `outils/typo.py` traite tous les fichiers, quels que soient les arguments : relire le diff avant de commiter.
- Créer la branche (`git switch -c …`) avant de commiter, et vérifier avec `git branch --show-current` : un commit est déjà parti sur la branche du point précédent.
- Ne pas forcer `x.duo = true` en test : sans second personnage, `dessinerDuo` plante à chaque image.
- `ECRAN_TACTILE` est calculé au chargement, et une largeur sous 768 px dans le navigateur intégré émule un téléphone. Pour voir un écran étroit au clavier : charger à 768 px ou plus, puis rétrécir sans recharger.
- Après `navigate`, attendre le chargement (`await new Promise(r => setTimeout(r, 1000))`) avant d'appeler les fonctions du jeu : sinon « lancerEssai is not defined ».
- Scripts Python d'édition : les lancer depuis la racine du dépôt (`cd ~/code/Biguhuh/fusee && python3 …`), sinon « No such file ».
- Émojis récents (🪢, 🪨, 🛞…) : carré vide sur beaucoup d'écrans. Préférer les anciens (🧗, 🚙…).
- Tester un terrain précis : remplacer `x.sol` par une fonction (plateau, falaise…) et faire avancer `x.step(1/30, { droite, frein… })` avec `etat.pause = true`.
- Commentaire en fin de ligne : ne jamais le glisser au milieu d'une ligne de code (`{ … ; // commentaire` met en commentaire la suite, le fichier ne se charge plus : « creerDuo is not defined »). Le mettre sur sa propre ligne.
- `read_console_messages` garde les erreurs des chargements précédents : pour savoir si une erreur est actuelle, ouvrir un onglet neuf (`preview_start` avec l'URL) et relire sa console.
- Tester l'escalade : `lancerEssai('escalade')` (avec Sam), marcher 15 s vers la droite pour atteindre le pied (paroi de 8 m à x = 32), puis `{ droite: true, saut: true }` pour grimper. Pour vérifier le dessin, appeler `x.dessiner(ctx, W, H, dt)` à chaque pas, ou `x.dessinerCorde` avec un faux contexte qui note les traits.
- Comparer avec `main` sans changer de branche : `git worktree add /tmp/fusee-main main`, serveur sur le port 8766, puis `git worktree remove --force /tmp/fusee-main`.
- Tester l'orbiteur sans abîmer la sauvegarde : `window.sauver = () => {}; noterPointReprise = () => {};` (le point de reprise écrit directement dans le stockage), `const v = Orbiteur.nouveauVoyage(); etat.voyage = v; etat.enVoyage = true; Orbiteur.v = v; Orbiteur.demarrerExpedition(); allerNavigation();` (le panneau doit exister : `choisirCible` appelle `majHud`). Avancer : `v.t += pas; Orbiteur.mettreAJourSondes(pas); Orbiteur.mettreAJourLogistique();`.
- Identifiants d'astres : vérifier qu'ils existent avant de s'en servir (`ceres`, `encelade` n'existent pas sous ces noms ; Encelade est `l602`).
- Tester un écran de fin : remplacer `etat.voyage` par un faux voyage en mémoire (pertes, `bilan`, `echantillonsRapportes`…), appeler `afficherRetourTerre(res, equipage)`, puis recharger la page.
- Tester l'amarrage sans campagne : `Orbiteur.amarrer.call(faux, true)`, avec un objet `faux` qui fournit `v`, `stationIci()`, `etatStation()` et `log()`.

## Carte des fichiers importants

Cœur :
- `index.html` : écrans et ordre de chargement des scripts.
- `js/main.js` : boucle de jeu, touches, lancement des vols, descente (lieu, équipage), robot, drone, base, fin de vol, secours, sauvegarde ; écran de fin de mission (`afficherRetourTerre`, `statsFinMission`).
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
- `js/transferts.js` : transport des spationautes (recrues, déplacements entre orbiteur, stations et bases).
- `js/equipe.js` : équipe, missions de fond, blessures et soins, choix de qui descend, réparation de l'astromobile ; pertes de l'expédition (lieu, regroupement par cause) et bilan de l'expédition (`compterExpedition`).
- `js/equipage.js` : profils et dessin des spationautes (poses : escalade, quatre pattes, courte-échelle, allongé).
- `js/registre.js`, `js/vaisseau.js` : registre des équipages, nom du vaisseau.
- `js/tableau.js`, `js/journal.js`, `js/progression.js` : tableau de bord d'un astre, journal, progression (références des easter eggs).
- `js/amarrage.js`, `js/retour.js`, `js/kourou.js` : scènes animées (`retour.js` : capsules selon l'équipage, repêchage).
- `js/depart.js`, `js/interstellaire.js` : départ vers une autre étoile (liste de contrôle).
- `js/rayonnement.js` : doses de rayonnement réelles.

Au sol :
- `js/trouvailles.js` : aspect des sites et des échantillons au sol (carte 6, point 5).
- `js/zones.js` : zones réelles (relief simplifié, appelé par `creerTerrain`) et plan lointain de l'exploration.
- `js/exploration.js` : sortie à pied, astromobile (bridage, tonneaux), robot ; chutes et blessures, combinaison, escalade, grappin et rappel, quatre pattes, jour et nuit, retour (`cheminVers`), appel d'urgence et départs séparés.
- `js/duo.js` : sortie à deux (suivre, cordée, rappel, arrêt au bord d'une falaise, courte-échelle, main tendue, oxygène partagé).
- `js/decouvertes.js` : easter eggs et leurs dessins, traces réelles, signalements du compagnon.
- `js/descente-robot.js`, `js/drone.js` : largage du robot, drone.
- `js/visuels.js` : visuels des niveaux de R&D sur les véhicules, planche d'évolution.
- `js/essai.js` : entraînement sur Terre (objectifs de chaque exercice dans `ESSAIS`).

Écrans et interface :
- `js/ecrans.js` : hangar, carte, résultat, sauvegarde.
- `js/infos.js`, `js/aide.js` : fiches, encyclopédie, onglet Aide.
- `js/observation.js`, `js/observatoires.js` : ciel lointain, observatoires.
- `js/globes.js` : apparence des astres ; `js/formes.js` : silhouettes des astres non sphériques.
- `js/repliques.js` : répliques de science-fiction.
- `js/tactile.js` : boutons tactiles.
- `css/style.css` : mise en forme.
- `outils/typo.py` : typographie française des textes affichés.
