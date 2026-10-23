# Fusée — Système solaire

Jeu web en HTML, JavaScript et canvas 2D, sans framework.
**Pour jouer : ouvrir `index.html` dans un navigateur.**

## Principe
1. **Hangar** : choisir moteur, réservoir, renforts de coque, bouclier thermique, panneau anti-vent solaire. Chaque pièce a un poids.
2. **Carte** : choisir un des 19 astres (Soleil, 8 planètes, 10 plus grosses lunes). La fiche compare la fusée aux conditions sur place.
3. **Vol** :
   - astres solides : se poser (vitesse sous le maximum de l'astre, fusée droite à 15° près), puis Entrée pour terminer, ou redécoller jusqu'à l'altitude de départ pour un aller-retour ;
   - géantes gazeuses : pas de sol. Plonger jusqu'à la pression visée, puis remonter au niveau 1 bar ;
   - Soleil : impossible, la fusée brûle bien avant la surface.
4. **Résultat** : écrasée, brûlée, pressurisée, irradiée, à court de carburant, ou réussite.

## Commandes
| Touche | Action |
|---|---|
| ↑ / Z / Espace | pleine poussée |
| ↓ / S | poussée douce (30 %) |
| ← → / Q D | orienter |
| + / − | accélérer / ralentir le temps (repasse à ×1 sous 1,5 km) |
| P | pause |
| Entrée | terminer la mission une fois posé |
| Échap | abandonner |

## Fichiers
- `js/astres.js` : données des 19 astres (valeurs réelles arrondies)
- `js/equipements.js` : pièces du hangar
- `js/physique.js` : gravité, pression, densité, température, rayonnement selon l'altitude
- `js/vol.js` : simulation du vol et affichage
- `js/ecrans.js` : hangar, carte, résultat
- `js/main.js` : boucle de jeu
- `PLAN.md` : plan et modèle physique

## Repères de difficulté
- Lune, Rhéa, Titania, Obéron, Callisto, Ganymède, Triton : équipement de base.
- Mercure : bouclier céramique + panneau léger. Io : panneau moyen. Europe : panneau léger.
- Vénus : coque lourde, bouclier céramique, panneau léger, moteur Titan.
- Saturne, Uranus, Neptune : coque légère, moteur Titan, grand réservoir.
- Jupiter : Prométhée + réservoir géant, et un bon pilotage.
