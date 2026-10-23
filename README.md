# Fusée — Système solaire

Jeu web en HTML, JavaScript et canvas 2D, sans framework.
**Pour jouer : ouvrir `index.html` dans un navigateur.**

## Deux façons de jouer
- **Mission directe** (hangar → carte) : on choisit un astre, la fusée arrive au-dessus, on se pose (ou on plonge), puis on repart en orbite.
- **Voyage** (hangar → « Nouveau voyage ») : on pilote un orbiteur dans tout le système solaire, sur des trajectoires réalistes (Lambert, sphères d'influence), on descend avec l'atterrisseur, on explore, on envoie des sondes et on construit des stations.

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
| + / − | accélérer / ralentir le temps (×1 sous 1,5 km et dès que la coque s'abîme) |
| P | pause · Entrée : terminer (mission directe) · Échap : abandonner |

- Le tableau de bord affiche la **vitesse orbitale** et la **vitesse de libération** locales.
- Repartir = atteindre l'orbite basse (altitude au-dessus de l'atmosphère et vitesse orbitale à l'horizontale) ou dépasser la vitesse de libération : l'orbiteur vous récupère. La physique tient compte de l'effet centrifuge : à la vitesse orbitale, on ne retombe plus.
- Coque : dégâts progressifs au-delà des limites de pression et de chaleur ; atterrissage dur = dégâts, très dur = crash.
- Relief : collines, cratères, rochers ; la pente du sol compte à l'atterrissage.

## Exploration (vue de côté)
- **Spationaute** : marche et saute selon la gravité locale (sauts de plusieurs mètres sur la Lune). Oxygène limité, combinaison limitée à 1,2 bar et 120 °C. Ramasse des échantillons (E) et les rapporte à la fusée. Sur les très petites lunes, il reste attaché par un câble : un saut le ferait partir dans l'espace.
- **Robot** : roule (pentes de 25° max), résiste à 100 bar et 480 °C, analyse les sites sur place (E, 5 s).
- Chaque astre a ses sites : lacs de méthane sur Titan, soufre sur Io, glace salée sur Europe, lits de rivière sur Mars…

## Orbiteur
- Carte vue de dessus : molette = zoom, glisser = déplacer, clic = fiche, double-clic = centrer, F = revenir à l'orbiteur.
- Temps : de ×1 à ×100 millions (1 s = 3 ans). Date affichée, durées en années, mois, jours, heures, minutes, secondes.
- **Trois modes de pilotage** (barre du haut) :
  - *Pilotage libre* : orientation (prograde, rétrograde, radiale, vers la cible…) et manette des gaz, avec trajectoire prévue.
  - *Assistant* : calcule la prochaine manœuvre (fenêtre de tir, Δv, durée), on avance le temps et on l'exécute.
  - *Planificateur* : on choisit la cible, il fait tout le voyage jusqu'à l'orbite basse.
- Propulsion de l'orbiteur : Isp 3 000 s, 60 t de carburant (≈ 40 km/s de Δv), optimiste mais nécessaire pour aller partout.
- **Sondes** (6 à bord) : partent seules vers leur cible, sur leurs propres trajectoires.
- **Stations** (2 kits) : à construire en orbite ; s'y amarrer refait les pleins, recharge sondes et atterrisseurs, permet de changer l'équipement. La station terrestre recharge aussi les kits.

## Informations
Survoler un astre (carte de l'orbiteur, ou ciel pendant l'atterrissage) affiche son nom. Un clic ouvre sa **fiche complète** et met le jeu en pause ; un bouton relance le mouvement pour lire pendant le trajet. « 📖 Tous les astres » (ou I) ouvre l'encyclopédie, avec recherche.

## Fichiers
- `js/astres.js` : 19 astres détaillés (atmosphères, couleurs, relief)
- `js/donnees-jpl.js` : données JPL générées · `js/catalogue.js` : catalogue complet, orbites, masses
- `js/physique.js` : conditions locales et relief · `js/orbites.js` : mécanique orbitale (Kepler, Lambert, sphères d'influence)
- `js/vol.js` : atterrisseur · `js/exploration.js` : spationaute et robot
- `js/navigation.js` : planification des manœuvres · `js/orbiteur.js` : écran de l'orbiteur
- `js/infos.js` : infobulles, fiches, encyclopédie · `js/ecrans.js`, `js/main.js` : écrans et boucle de jeu

## Simplifications
Orbites en 2D (inclinaisons ignorées), manœuvres de l'assistant instantanées, rendez-vous avec les stations automatique, positions des petites lunes approximatives. Sphère d'influence minimale de 3 rayons pour les très petites lunes (celle de Phobos est en réalité plus petite que Phobos).
