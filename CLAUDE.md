# La fusée de l'espace

Jeu web de simulation spatiale : fusées, atterrissages, exploration à pied, robots, drones, campagne dans le Système solaire puis vers d'autres étoiles. Valeurs physiques réelles, arrondies. En bêta test.

En ligne : https://biguhuh.github.io/fusee/ (GitHub Pages, branche `main`). Dépôt : `Biguhuh/fusee`.

## Avant de commencer

- Lis `ETAT.md` en entier avant toute chose.
- Ne relis pas tout le code pour te repérer, la carte est dans `ETAT.md`.
- Ouvre seulement les fichiers dont tu as besoin. Les gros fichiers (`vol.js`, `orbiteur.js`, `decouvertes.js`, `main.js`, `exploration.js`) se lisent par morceaux, après un Grep.

## Stack

- Langage : JavaScript sans framework ni build, canvas 2D, HTML et CSS. Pas de npm, pas de modules : tous les fichiers de `js/` sont des scripts classiques chargés dans l'ordre par `index.html`, et partagent la portée globale.
- Lancer le jeu : `python3 -m http.server 8765` à la racine (dans WSL, en arrière-plan), puis http://localhost:8765/. Ouvrir `index.html` directement marche aussi.
- Lancer les tests : il n'y a pas de tests automatiques. On teste dans le navigateur intégré, en appelant les fonctions du jeu depuis la console (voir « Pièges » dans `ETAT.md`).
- Typographie française : `python3 -I outils/typo.py .` (ajoute `--sec` pour voir sans écrire). À lancer avant chaque commit qui touche du texte.
- Pas de `node` dans WSL : une erreur de syntaxe se voit au chargement de la page (console du navigateur).

## Structure

- `index.html` : la page, les écrans, et l'ordre de chargement des scripts (avec `?v=N` contre le cache).
- `js/` : tout le jeu (carte détaillée dans `ETAT.md`).
- `css/style.css` : la mise en forme.
- `outils/` : scripts Python (données NASA/JPL, typographie).
- `docs/` : notes de relecture et d'évaluation.
- `README.md` : présentation du jeu pour les joueurs. `PLAN.md` : plan d'origine (historique).

## Conventions

- Réponds en français, tutoie Edouard.
- Messages courts, une étape à la fois.
- Petites modifications ciblées, pas de refonte sans demande.
- Avant de modifier un gros fichier, dis ce que tu comptes changer.
- Une branche par demande. Commit puis push de la branche ; test dans le navigateur intégré.
- On ne fusionne dans `main` (et donc on ne publie) que quand Edouard dit « fusionne » (ou « fusionne et push »).
- Avant chaque test dans le navigateur, monte la version : `sed -i 's/?v=N/?v=N+1/g' index.html`.
- Textes du jeu : français soigné, accords (genre du ou de la spationaute via `acc()`), articles devant les astres via `francais.js` (`le()`, `sur()`, `de()`…).
- Commentaires de code en français, courts.
- Dans le code, les commandes et les noms de fichiers, jamais d’espace insécable, uniquement des espaces normales.
  - Exception : les textes affichés dans le jeu (contenu des chaînes) gardent leurs insécables, posées exprès par `outils/typo.py` pour la typographie française. Ne pas les remplacer.
  - Pour les repérer : `grep -nP '\x{00A0}|\x{202F}' fichier`
  - Pour les remplacer : `sed -i 's/\xC2\xA0/ /g' fichier` (et `sed -i 's/\xE2\x80\xAF/ /g' fichier` pour l’espace fine insécable, que le `grep` repère aussi)
- Fin des messages de commit : `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Fin de session

- Quand Edouard dit « on s'arrête » (ou tape `/etat`), mets à jour `ETAT.md`.
- Note ce qui est fait, ce qui reste, les pièges rencontrés.
