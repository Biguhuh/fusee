# La fusée de l'espace — plan

Jeu web sans framework (HTML + JS + canvas 2D). On ouvre `index.html`, c'est tout.

## Étapes
1. **Données** : `js/astres.js` (19 astres, valeurs réelles arrondies) et `js/equipements.js` (pièces du hangar).
2. **Physique** : `js/physique.js` — conditions locales (gravité, pression, densité, température, rayonnement) selon l'altitude.
3. **Prototype Lune** : `js/vol.js` — vol en 2D, poussée, rotation, carburant, atterrissage ou crash.
4. **Tous les astres** : atmosphères, géantes gazeuses sans sol (plongée), Soleil (impossible à atteindre).
5. **Boucle complète** : hangar → carte → vol → résultat → hangar (`js/main.js`).

## Modèle physique (simplifié mais proportionné)
- Gravité : `g(alt) = g0 · (R / (R + alt))²`.
- Atmosphère au-dessus du niveau de référence : `P = P0 · e^(-alt/H)`, densité idem, température qui baisse avec un gradient.
- Sous le niveau 1 bar (géantes, Soleil) : modèle adiabatique, `T` monte avec la profondeur, `P ∝ T^3,5`, `ρ ∝ T^2,5`.
- Traînée : `½ ρ v² Cx S`. Échauffement aérodynamique `≈ v²/2cp`, pondéré par la densité.
- Température de coque : tend vers la température extérieure + échauffement.
- Rayonnement solaire : `1/d²` (d en UA), plus les ceintures de Jupiter pour ses lunes.
- Moteur : débit `= poussée / (Isp · g0)`.

## Étape 6 : le système solaire complet
- Données JPL : 460 lunes, astéroïdes, Pluton (`js/donnees-jpl.js`, `js/catalogue.js`).
- Orbiteur et mécanique orbitale 2D : Kepler (variables universelles), Lambert, sphères d'influence (`js/orbites.js`, `js/navigation.js`, `js/orbiteur.js`).
- Vitesses orbitale et de libération, mise en orbite au retour (`js/vol.js`).
- Exploration en vue de côté : spationaute et robot (`js/exploration.js`).
- Fiches, encyclopédie, infobulles (`js/infos.js`).

## Causes de fin
Écrasée, brûlée, pressurisée, à court de carburant, irradiée, ou réussite
(posé, aller-retour, plongée réussie).
