# Carte 6 : travail de la nuit du 4 au 5 novembre 2026

Ce fichier garde les décisions d'Edouard (prises avant la nuit), les propositions et le compte rendu de chaque point.
Les branches s'enchaînent : `carte6-point2` part de `carte6-point8`, `carte6-point3` de `carte6-point2`, etc. Rien n'est fusionné dans `main`.

## Décisions d'Edouard (4 novembre au soir)

- Mode nuit : enchaîner les points 2, 3, 4, 5, 6, 7 sans attendre de validation ; une branche par point, chaque point testé ; résumé complet le matin.
- Point 8 : validé. Échantillons à bord récupérés quand tout l'équipage meurt (comme aujourd'hui).
- Point 2 : tout faire.
  - Alerte avant le départ : autonomie en jours comparée à la durée du voyage, avertissement et confirmation.
  - Relais en route : s'arrêter à une station sur le trajet pour se ravitailler ; ravito envoyé vers l'orbiteur.
  - Recyclage en R&D : boucle d'eau et d'air presque fermée, qui baisse la consommation.
  - Torpeur (science-fiction) : débloquée par la R&D d'une station, comme l'écosystème fermé, marquée « science-fiction ».
- Point 3 : quand tout l'équipage est mort, bandeau « Équipage perdu, vaisseau piloté depuis le sol », et le joueur choisit : rentrer (comme aujourd'hui) ou continuer en sonde (robots seulement). Délai radio réel, désactivable par un réglage.
- Point 4 : réglage manuel « Calcul simplifié des objets en transit », plus un passage automatique au-delà d'un seuil réglable. Mesurer d'abord.
- Point 5 : je classe en sites et échantillons et je choisis les aspects ; liste écrite ici, puis appliquée. Edouard corrige ensuite.
- Point 6 : profils de relief simplifiés à la main, à partir des dimensions publiées et vérifiées ; Mars d'abord.
- Point 7 : une fenêtre d'envoi pour les recrues et pour déplacer les spationautes en service ; trajet automatique en arrière-plan d'abord.
- Si la nuit ne suffit pas : l'ordre de la carte, et s'arrêter proprement.

## Compte rendu

### Point 2 : vivres pour les longs voyages (branche `carte6-point2`)

Diagnostic de la partie observée :
- Consommation du jeu, réaliste et conservée : 1,8 kg de vivres et 0,5 kg d'eau par personne et par jour (eau recyclée à 98 %, comme sur l'ISS). La carte cite 2,4 kg de nourriture emballée : nos 1,8 kg sont la valeur ISS, emballages compris.
- Emport de l'orbiteur : 2,5 t de vivres et 0,8 t d'eau. À 5 personnes : ≈ 280 jours de vivres. Un voyage Terre–Saturne dure ≈ 5 à 6 ans dans le jeu.
- Cause des morts : emport bien trop faible pour ce voyage, et aucun avertissement avant le départ (la première alerte arrivait à 30 jours de la fin).

Ce qui a changé :
- Au choix d'une cible, le jeu calcule la durée du voyage (même calcul que la trajectoire affichée) et la compare à l'autonomie en route. Si elle ne suffit pas, une fenêtre « ⚠ Pas assez de vivres pour ce voyage » donne la durée, l'autonomie et la date de la pénurie, avec les solutions, les escales possibles, « Renoncer à cette cible » et « Partir quand même ».
- Panneau de l'orbiteur, avant le départ : « Voyage ≈ … · autonomie en route : … » (en rouge si elle ne suffit pas).
- Escale : les stations sur le trajet (entre ici et la cible, autour du Soleil), avec leur stock de vivres et d'eau. Le bouton fixe la cible sur l'escale et garde la destination finale ; une fois sur place, « ▶ Reprendre le voyage vers … » (les vivres sont revérifiés). Le ravito vers l'escale existe déjà (cargo « Vivres et eau »).
- Nouvelles R&D (groupe 🌱 Vivres) : « Recyclage de l'eau et de l'air » (3 niveaux, −25 % d'eau à apporter par niveau) ; « Torpeur (science-fiction) » (après recyclage 2, 80 t et 90 jours) : pendant les trajets entre les planètes, consommation divisée par 4.
- Aide, fiche Orbiteur : autonomie, alerte, escale et R&D.

Testé (campagne neuve en mémoire, 4 personnes) : Saturne → fenêtre (5 ans 3 mois de voyage, 347 jours de vivres, faim vers octobre 2027) ; escales Mars et Jupiter proposées ; escale à Jupiter → cible Jupiter, finale Saturne, panneau « Escale, puis Saturne » ; avec la torpeur, recyclage 2 et soutes 3 : 2 431 jours d'autonomie, plus de fenêtre ; Lune : pas de fenêtre. Panneau de R&D vérifié.

Limites (point 2) : le calcul de la durée prend ≈ 1 s au choix de la cible. La consommation est comptée « en route » pour tout le voyage (approximation). Pas de ravitaillement en plein vol : il faudrait un rendez-vous entre un cargo et l'orbiteur en transfert, trop lourd pour cette nuit.

### Point 3 : équipage mort, contrôle au sol (branche `carte6-point3`)

Avant : quand tout l'équipage mourait, une fenêtre annonçait que le contrôle au sol ramenait l'orbiteur vers la Terre, sans autre choix.

Ce qui a changé :
- La fenêtre « 🕯 Plus personne à bord » propose deux choix : « 🛰 Ramener l'orbiteur » (comme avant) ou « 📡 Continuer en sonde ».
- En sonde : bandeau « 📡 Équipage perdu, vaisseau piloté depuis le sol · délai radio … » dans le panneau de droite, avec la commande en route ; bouton « Ramener l'orbiteur vers la Terre » à tout moment.
- Choisir une cible envoie une commande depuis la Terre : elle arrive à bord après le délai radio réel (distance / vitesse de la lumière : ≈ 1 h 10 vers Saturne), puis le pilote auto exécute le voyage.
- Seul le pilote auto : le pilotage libre et l'assistant sont refusés, avec un message. Pas de descente (point 1), pas de construction de station ; les robots et les sondes restent possibles.
- Nouveau bouton « ⚙ » dans la barre de l'orbiteur : réglages de la campagne. Premier réglage : « Délai radio réel » (coché par défaut) ; décoché, les commandes arrivent tout de suite.
- Un nouvel équipage à bord (recrue) met fin au pilotage depuis le sol.
- Carburant insuffisant : le plan du pilote auto le dit déjà (« aucune trajectoire possible »).

Testé (orbiteur placé autour de Saturne, équipage mort) : fenêtre et ses deux choix ; « Continuer en sonde » ; commande vers Titan, délai 1 h 11, appliquée après 6 000 s de jeu, pilote auto en marche ; clic sur « Pilotage libre » refusé ; réglage décoché : commande immédiate ; construction de station refusée.

Limites (point 3) : le démarrage et l'arrêt du pilote auto ne passent pas par le délai radio, seulement le choix de la cible. Pas de « corrections automatiques » à part : le pilote auto fait déjà toutes les manœuvres du voyage.

### Point 4 : calcul simplifié des objets en transit (branche `carte6-point4`)

Mesure d'abord (14 sondes en route, campagne neuve) : chaque mise à jour des objets en transit coûtait ≈ 2 ms par pas d'une heure et ≈ 28 ms par pas d'un jour (forte accélération du temps), soit plus que le budget d'une image (16 ms). En régime établi, ≈ 4 ms par pas d'un jour. C'est bien là que le processeur part quand beaucoup d'objets voyagent.

Ce qui a changé :
- Réglage « ⚙ » de l'orbiteur, « Calcul simplifié des objets en transit » : « Automatique, au-delà de N objets en transit » (par défaut, N = 10), « Toujours », ou « Jamais (calcul complet) ».
- Simplifié : la trajectoire d'une sonde ou d'un ravito est calculée une fois (la même que celle affichée au lancement, donc sans calcul en plus), puis suivie par interpolation ; à l'arrivée, l'objet prend l'état final calculé (même orbite). Les véhicules pilotés (l'orbiteur) ne sont pas concernés.
- Un objet passé en simplifié le reste jusqu'à son arrivée ; quand le mode s'active en plein vol, une seule trajectoire est précalculée par image (pas d'à-coup général).
- La vue « trajectoire » d'un objet simplifié montre sa trajectoire précalculée.

Testé : 14 sondes, 0,02 ms par pas d'un jour au lieu de 3,9 ms (≈ 200 fois moins) ; seuil automatique (10 : actif, 20 : inactif) ; cargo vers une station de Mars : arrivée précalculée identique à la date prévue affichée, livraison faite ; sonde vers Jupiter : en orbite, repérage fait.

Limites : comparé au calcul complet, l'arrivée peut différer de quelques heures à un jour sur un voyage de plusieurs années (Mars : 23 h sur 2 ans ; Vénus : 5 h). L'écart vient du calcul de trajectoire existant, qui avance par pas d'au moins un jour près de l'arrivée ; c'est déjà lui qui donne les dates prévues affichées. Le passage en simplifié en plein vol coûte jusqu'à ≈ 1 s pour un objet lointain (une fois par objet).

### Point 5 : aspect des trouvailles (branche `carte6-point5`)

Avant : toutes les trouvailles (42 types) étaient dessinées pareil, un losange jaune et un caillou de 7 × 4 pixels, quelle que soit l'échelle.

Liste complète, catégorie, aspect, taille et référence réelle : [carte6-echantillons.md](carte6-echantillons.md). À relire et corriger.

Ce qui a changé :
- Nouveau fichier `js/trouvailles.js` : table des aspects et dessin, à la taille réelle en mètres (à l'échelle du personnage).
- Sites (grande échelle) : lac (40 m, on prélève sur la rive, le repère est au bord), cratère avec rempart (16 m), coulée de lave (20 m, rougeoyante sur Io), panache (Io, Triton), fissure (Europe ; rayure de tigre fumante sur Encelade), ancien lit de rivière tapissé de galets (Mars).
- Échantillons (10 à 50 cm) : roches (mouchetée, sombre, claire, noire), galet, tas de poussière ou de sable, cristaux, plante, fossile, blocs de glace, croûtes (soufre, tholins, givre), tranchée de Phoenix (glace au fond), fragments métalliques.
- Une trouvaille déjà prélevée reste dessinée, plus pâle ; le repère et le nom restent au-dessus.

Testé : planche de toutes les formes (29 échantillons, 9 sites) ; Titan, de nuit : le lac se voit, repère sur la rive (« Lac de méthane à 1 m »). Aucune erreur.

Limites : les panaches sont à l'échelle du terrain (30 m), pas à leur vraie hauteur (8 km sur Triton, des centaines de km sur Io). Le terrain lui-même n'est pas creusé (cratère, lac) : ce sont des dessins par-dessus le sol ; le point 6 (relief) pourra aller plus loin.

### Point 6 : zones réelles, Mars d'abord (branche `carte6-point6`)

Méthode, zones faites et zones proposées : [carte6-zones.md](carte6-zones.md).

Ce qui a changé :
- Nouveau fichier `js/zones.js` : relief simplifié de lieux réels, à l'échelle réelle, ajouté au relief ordinaire à leur vraie longitude (le même relief pour la descente, l'exploration et la sonde).
- Mars : Valles Marineris, Olympus Mons, Hellas Planitia, cratère Gale et mont Sharp, cratère Jezero.
- « Où se poser ? » : section « 🏔 Zones remarquables » (après une première descente, comme les anciennes missions), avec position et description ; on se pose au bon endroit (au pied de la paroi, de l'escarpement, près de Curiosity ou de Perseverance).
- Exploration : un plan lointain montre le relief des 200 km alentour (paroi du canyon, escarpement d'Olympus Mons), derrière le terrain proche ; il apparaît partout où le relief lointain est marqué.

Testé : altitudes (plateau 0, fond de Valles −7,1 km, haut de la falaise d'Olympus 6,2 km, sommet 21,8 km, caldeira 19,0 km, fond d'Hellas −7,3 km, mont Sharp +0,9 km, Jezero −0,5 km comme Perseverance) ; pression au fond de Valles 7,8 mbar ; fenêtre « Où se poser ? » (5 zones) ; exploration au pied de Valles et d'Olympus : plan lointain visible. Le sol coûte ≈ 1,6 µs par point.

Limites : coupes simplifiées et posées est-ouest (un canyon qui court d'est en ouest est traversé « en coupe »). Hellas est resserrée pour ne pas recouvrir Jezero. Pas encore de zones sur les autres astres (liste proposée, à valider). La couleur du ciel selon l'atmosphère existait déjà.

### Point 7 : recrues et spationautes transportés (branche `carte6-point7`)

Avant : « Accueillir une recrue » (station avec habitat) faisait apparaître la recrue instantanément dans l'orbiteur.

Ce qui a changé (étape 1 : trajet automatique en arrière-plan) :
- Nouveau fichier `js/transferts.js`. Fenêtre « 🧑‍🚀 Envoyer des spationautes » (bouton dans les actions de l'orbiteur, et « Envoyer des spationautes ici » sur une station avec habitat) :
  - qui : un nombre de nouvelles recrues depuis la Terre, et/ou des spationautes en service (à bord, à une station, à une base ; pas votre spationaute, qui reste aux commandes) ;
  - vers où : l'orbiteur (s'il est en orbite de la Terre ou d'un astre qui a une station), une station avec habitat (8 places), une base (2 places par niveau, via la station de son astre et sa navette) ; places libres affichées ;
  - comment : vaisseau de transfert de 4 places (plusieurs si besoin), sur la même trajectoire que les cargos ; gratuit depuis la Terre, 20 t d'ergols par vaisseau depuis une station ; durée prévue affichée.
- Le voyage se fait en arrière-plan ; message au départ et à l'arrivée. Arrivés à l'orbiteur : à bord. Si l'orbiteur est parti entre-temps : ils l'attendent à la station et montent à bord à son retour.
- Liste de l'équipe : « en route vers… », « à la station… », « à la base… ».
- L'apparition instantanée est supprimée.

Testé (campagne neuve) : 3 recrues vers l'orbiteur en orbite terrestre (rendez-vous en 1 jour, puis à bord, « équipe 7/8 ») ; 2 recrues vers une station martienne de niveau 4 (≈ 10 mois, arrivées à la station) ; 1 recrue vers une base martienne (arrivée à la station, puis navette d'un jour vers la base).

Limites et étapes suivantes : pas encore de mode « piloter le trajet » (seulement l'automatique) ; pas de fenêtre de tir à choisir (le départ suit le calcul des cargos, qui attend la fenêtre) ; le jour de navette au départ d'une base n'est compté que dans la date affichée ; les spationautes d'une station ou d'une base ne mangent pas les vivres de l'orbiteur (pas encore de consommation sur place) ; si tout l'équipage de l'orbiteur meurt alors que d'autres vivent à une station, l'orbiteur n'est pas encore déclaré « sans équipage ».
