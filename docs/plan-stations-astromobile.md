# Plan : stations construites module par module, astromobile, suite des sorties

Décisions d'Edouard (10 novembre 2026). Ce document sert de feuille de route pour les prochaines sessions.

## Ce qui se fait en vrai

### Les stations

Aucune grande station n'a été déployée d'un seul coup, sauf Skylab (1973), lancée entière par une Saturn V.

- **ISS** : construite en 13 ans (1998 à 2011), en une quarantaine de vols d'assemblage et plus de 160 sorties.
  1. Zarya, le premier module, est lancé seul en novembre 1998 (fusée Proton).
  2. Le nœud Unity arrive deux semaines plus tard (navette Endeavour, STS-88).
  3. Il faut trois sorties pour brancher les deux modules ensemble : câbles d'énergie, de données, poignées.
  4. Viennent ensuite le module de vie Zvezda (2000), le laboratoire Destiny et le bras Canadarm2 (2001), le sas Quest (2001), les poutres et les grands panneaux (2000 à 2009).
- **Tiangong** (Chine) : le noyau Tianhe est lancé en avril 2021, puis l'équipage le rejoint. Les deux laboratoires suivent en 2022 (Wentian, Mengtian). Chacun s'amarre automatiquement, puis un bras robotique le déplace à sa place définitive.
- **Mir** (1986 à 1996) : un noyau, puis cinq modules amarrés un par un.
- **Gateway** (en projet, autour de la Lune) : les premiers éléments partent ensemble, puis les modules arrivent au fil des missions Artemis.

### L'astromobile

- **Apollo 15, 16, 17** (1971-1972) : le rover lunaire (210 kg, deux places) voyage plié contre le module lunaire. Les astronautes tirent sur des sangles, et il se déplie et se pose en une vingtaine de minutes.
  - Au départ, il reste sur la Lune : l'étage de descente sert de rampe de lancement.
  - Règle de prudence : ne jamais aller plus loin que ce qu'on pourrait faire à pied au retour.
- **Artemis** : le futur véhicule lunaire, plus gros, doit arriver par un atterrisseur cargo, avant l'équipage, et attendre sur place entre deux missions.
- **Les robots** (Lunokhod, Curiosity, Perseverance) arrivent complets, posés par leur atterrisseur. Personne n'a jamais assemblé de véhicule sur place.

## Décisions

### Astromobile

1. **Repliée sur le module**, si toutes ses améliorations (batteries, caisse à échantillons, moteur) sont au niveau 0 ou 1. Elle se déplie à l'arrivée, avec une animation d'environ 20 minutes de jeu.
2. **Apportée par un cargo** dès qu'une amélioration passe au niveau 2 : elle est trop lourde pour voyager pliée.
   - Le cargo part de la station de l'astre, avant la descente, et se pose près du lieu choisi.
   - Il prend des ergols au stock de la station, et coûte.
   - Sans station sur l'astre : pas d'astromobile de niveau 2 et plus. On peut descendre sans astromobile, ou avec la version repliée.
3. **Au choix de la descente** : avec ou sans astromobile. Si elle vient par cargo, le cargo part d'abord.
4. **Au décollage, l'astromobile reste sur place.** On note où.
5. **Réemploi** : si l'on revient se poser à moins de 2 km, on la retrouve, avec sa batterie et son usure.
6. **En visite rapide ou en promenade**, on prend le niveau maximal atteint dans la campagne, sans cargo à gérer.
7. **Visuels** :
   - en scaphandre lourd, le personnage assis dans l'astromobile doit porter le scaphandre lourd, et non la combinaison blanche ;
   - la nuit, la lampe du casque doit s'allumer aussi dans l'astromobile, avec la combinaison blanche.

### Stations

1. **Dans le Système solaire, plus de déploiement instantané depuis l'orbiteur.** Une station naît d'un noyau lancé exprès, puis grandit module par module.
2. **La première station, en orbite terrestre** : son noyau est lancé par Hercule, comme Zarya ou Tianhe. L'équipage le rejoint ensuite.
3. **Autour d'un autre astre** (Lune, Mars, lunes de Jupiter…) : le noyau part de la Terre par un cargo lourd. Il fait le vrai trajet, fenêtre de tir comprise, et se met en orbite seul.
4. **Les kits de station existants**, à bord de l'orbiteur ou en stock, deviennent des noyaux.
   - Ceux en stock d'une station partent par cargo vers l'astre choisi.
   - Ceux à bord de l'orbiteur sont déposés au stock de la station au prochain amarrage.
5. **Chaque niveau correspond à un vrai module** (voir le tableau). Il arrive par un cargo depuis la Terre, ou bien l'atelier d'une station le fabrique avec des matériaux, puis l'envoie.
6. **Assemblage** : le module s'amarre automatiquement. Il reste ensuite inerte tant qu'une **sortie d'assemblage**, à deux, ne l'a pas branché. Faute de sortie, un robot (le bras de la station) le branche, deux fois plus lentement.
7. **Rythme réaliste** : un lancement, le trajet réel, l'amarrage, puis la sortie. Des semaines à des mois par niveau, des années pour une grande station.
8. **Hors du Système solaire, rien ne change** : le vaisseau emporte noyau et modules et les déploie, faute de Terre pour les lancer. L'atelier fabrique ensuite les modules suivants avec les matériaux locaux.

### Les modules, niveau par niveau

| Niveau | Module | Comme | Ce qu'il apporte |
|---|---|---|---|
| 1 | Noyau : module de vie, propulsion, panneaux, amarrage, petit sas | Zarya et Zvezda (ISS), Tianhe (Tiangong) | Amarrage, stock, sorties |
| 2 | Nœud et module logistique | Unity, Harmony, Leonardo | Stockage doublé |
| 3 | Laboratoire-atelier et bras robotique | Destiny, Canadarm2, Dextre | Chantiers 1,5 fois plus rapides, robot pour les raccordements |
| 4 | Habitat (anneau ou module gonflable) | BEAM, Wentian | Habitat pour 8 personnes |
| 5 | Grande poutre et chantier interstellaire | Poutres S0 à S6 de l'ISS | Chantier du vaisseau de départ |

## Scénarios

### Scénario 1 : la première station (orbite terrestre)

1. Au centre de commande, onglet Lancements : « 🚀 Lancer le noyau de la station » (Hercule, environ 2 Md€ et la valeur du module).
2. Scène de lancement comme aujourd'hui. Le noyau se met en orbite à 400 km et déploie ses panneaux : la station existe, au niveau 1, vide.
3. Le premier ravitaillement courant part. L'équipage peut la rejoindre (Aube, ou orbiteur).
4. Message au journal : « Comme Zarya en 1998 : le premier élément d'une station qui grandira module par module ».

### Scénario 2 : agrandir une station (niveau 2 et plus)

1. Onglet Stations : « Lancer le module suivant (nœud et module logistique) ». Il part de la Terre, ou bien l'atelier le fabrique s'il a les matériaux, puis l'envoie.
2. Le cargo suit sa vraie trajectoire, puis s'amarre automatiquement : « Leonardo amarré : à raccorder ».
3. Le module apparaît dans la liste des sorties : « Assemblage du module logistique ». Tâches inspirées de STS-88 et des sorties d'assemblage de l'ISS :
   - retirer les protections de lancement, à deux ;
   - brancher les câbles d'énergie et de données, avec les outils ;
   - raccorder le refroidissement (ammoniac), à deux ;
   - poser les mains courantes et ouvrir les écoutilles.
4. Une fois la sortie réussie, la station passe au niveau suivant.
5. Sans sortie : « Confier au robot » (bras de la station, dès le niveau 3, ou un robot en stock), deux fois plus lent. Sans robot ni équipage, le module reste à raccorder.
6. Si le rayonnement est trop fort (Jupiter), seul le robot peut le faire, comme pour les pannes.

### Scénario 3 : une station autour de Mars

1. Onglet Lancements : « Envoyer un noyau de station vers Mars ». On attend la fenêtre de tir (tous les 26 mois), puis le transfert dure 7 à 9 mois.
2. Le cargo s'insère en orbite de Mars : la station existe, au niveau 1, inhabitée.
3. L'orbiteur vient s'y amarrer. On peut alors lancer les modules suivants depuis la Terre, ou les fabriquer sur place une fois qu'une base fournit des matériaux.

### Scénario 4 : une station dans un autre système stellaire

Comme aujourd'hui : le vaisseau de départ emporte le noyau et le déploie à l'arrivée. L'atelier fabrique ensuite les modules suivants avec les matériaux locaux. Les sorties d'assemblage restent possibles, sans être obligatoires.

### Scénario 5 : descendre avec une astromobile de niveau 2

1. On choisit le lieu de descente et on coche « avec astromobile ».
2. Elle est de niveau 2 et la station tourne au-dessus : un atterrisseur cargo part de la station quelques heures avant, avec des ergols du stock, et se pose près du lieu.
3. Une fois posé, l'astromobile attend à côté du module, prête.
4. Au décollage, elle reste là. Si l'on revient à moins de 2 km, on la retrouve.

## Liste de tout ce qu'il reste à faire

Dans l'ordre proposé :

1. **Astromobile, visuels** : scaphandre lourd porté dans l'astromobile, lampe du casque la nuit avec la combinaison blanche.
2. **Astromobile laissée sur place** au décollage, et retrouvée à moins de 2 km.
3. **Astromobile pliée ou apportée par cargo**, selon la R&D ; choix « avec ou sans » à la descente ; niveau maximal de la campagne en visite rapide.
4. **Stations par modules** : noyau lancé par Hercule pour la Terre, ou par cargo lourd ailleurs ; un module par niveau ; amarrage automatique ; sortie d'assemblage, ou robot deux fois plus lent ; kits existants changés en noyaux ; rien ne change hors du Système solaire ; coûts et durées réalistes.
5. **Sorties depuis une station, étape 3, les imprévus** :
   - de l'eau dans le casque : sortie à interrompre (Luca Parmitano, 2013) ;
   - une combinaison trop gonflée qui ne passe plus le sas : il faut baisser sa pression (Alexeï Leonov, 1965) ;
   - un débris en approche : la station manœuvre, on s'abrite.
