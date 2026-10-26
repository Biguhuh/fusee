# Relecture des textes du jeu (carte 4, point 2)

Environ 2 600 textes relus : page d'accueil, fenêtres et messages du code.

## Décisions prises, et appliquées

- Vouvoiement partout, comme c'était déjà le cas.
- Espaces selon la règle de l'Imprimerie nationale.
- Adjectif quand il existe :
  - « Station lunaire », « Base martienne » ;
  - « en orbite jovienne » ;
  - sinon « Station d’Europe » et « en orbite autour de Titan ».
  - Adjectifs retenus : lunaire, terrestre, mercurienne, vénusienne, martienne, jovienne, saturnienne, uranienne, neptunienne et plutonienne.
- « Ravito » est gardé.
- « Rover » devient « astromobile » partout.
- Noms des lunes : forme de Wikipédia en français (octobre 2026), sinon le nom de l'UAI.
  - Exemples : Hégémone, Coré, Hippocampe, Déimos, Eunomie.
  - Pour suivre Wikipédia, Cupidon, Marguerite, Prospéro et Stéphano redeviennent Cupid, Margaret, Prospero et Stephano.
- Ajouts trouvés en testant :
  - la définition « planète tellurique » dit désormais « proche de son étoile » au lieu de « proche du Soleil », qui était faux dans les autres systèmes ;
  - « notre spationaute sur la Lune » prend une majuscule en tête du panneau.

La liste ci-dessous est celle qui t'a été soumise avant application.

## A. Règles appliquées partout

Ces règles touchent des centaines de textes. Je les applique par un script qui ne modifie que le texte des chaînes, jamais le code autour.

1. **Espaces insécables** :
   - espace insécable normale avant « : » et entre un nombre et son unité (« 110 km », « 92 bar », « 15 °C », « 30 % ») ;
   - espace fine insécable avant « ; », « ! » et « ? » ;
   - espace insécable à l'intérieur des guillemets « ».

   Effet : on n'aura plus de deux-points ou d'unité rejetés seuls en début de ligne.

2. **Apostrophes** : le jeu mélange l'apostrophe droite (') et la courbe (’), parfois dans une même phrase. Toutes deviennent courbes (’).
   - Exemple : « décoller vers l'orbiteur » devient « décoller vers l’orbiteur ».

3. **« Système solaire »** prend une majuscule quand il désigne le nôtre, comme le font déjà certains textes.
   - « Exploration du système solaire » devient « Exploration du Système solaire ».
   - « Tout le système solaire » devient « Tout le Système solaire ».
   - « Matière primitive du système solaire » devient « Matière primitive du Système solaire ».
   - Le sens générique garde sa minuscule (« comme un système solaire en train de se ranger »).
   - Les autres systèmes s'écrivent en minuscule au milieu d'une phrase : « Arrivée dans le système de Proxima Centauri ».

4. **Articles et élisions devant les noms d'astres** : c'est le point de ta carte (« conçu pour Lune »).
   - Environ 260 phrases sont construites avec un nom d'astre ou de station, par exemple « sur », « de », « à », « vers », « pour », « en orbite de ».
   - Une petite fonction donnera l'article et l'élision justes pour chaque astre.

   | Aujourd'hui | Après |
   |---|---|
   | Atterrisseur conçu pour Lune | Atterrisseur conçu pour la Lune |
   | Réussite : posé sur Lune | Réussite : posé sur la Lune |
   | ⬇ Descendre sur Lune | ⬇ Descendre sur la Lune |
   | 🛰 Sonde vers Lune (repérage) | 🛰 Sonde vers la Lune (repérage) |
   | 🚀 Aller à Lune / Aller à Soleil | 🚀 Aller sur la Lune / Aller au Soleil |
   | en orbite de Europe | en orbite d’Europe |
   | le robot de Io | le robot d’Io |
   | la sonde a sombré vers le centre de Uranus | … vers le centre d’Uranus |
   | toujours la même face vers Terre | toujours la même face vers la Terre |
   | Système de Epsilon Eridani | système d’Epsilon Eridani |

   - Prennent un article : la Lune, la Terre, le Soleil, et l’étoile de Barnard.
   - Les autres astres n'en prennent pas (Mars, Europe, Titan, Proxima b…), mais ont l'élision devant une voyelle ou un h (d’Europe, d’Io, d’Hypérion).
   - « Sur Terre » reste sans article, comme c'est l'usage et comme le jeu l'écrit déjà.

5. **Noms des stations et des bases**
   - Les stations deviennent « Station de la Lune », « Station de Mars », « Station d’Europe » au lieu de « Station Lune ».
   - Les bases deviennent « Base de la Lune » au lieu de « Base Lune ».
   - Les sauvegardes existantes sont renommées au chargement.
   - Dans les phrases, la station prend son article :
     - « Amarré à Station Lune » devient « Amarré à la station de la Lune » ;
     - « Atelier de Station Mars » devient « Atelier de la station de Mars ».
   - La station de la Terre garde son nom : « Station spatiale terrestre ».

## B. Corrections au cas par cas, par écran

### Accueil et aide (index.html)
- **Aide, atterrissage :**
  - avant : « Pour se poser : moins que la vitesse maximale de l’astre, … »
  - après : « Pour se poser : rester sous la vitesse maximale de l’astre, … »
- Le mot « planificateur » (aide de l'orbiteur) est laissé pour le point 7.

### Fiche d'un astre et équipement de la fusée (visite rapide)
- **« Poussée/poids Lune », « Poussée/poids Terre », « Poussée/poids Jupiter »** deviennent « Poussée/poids sur la Lune », « … sur Terre » et « … sur Jupiter ».
- **Δv :**
  - avant : « (≈ … m/s pour se poser sans air pour freiner) »
  - après : « (≈ … m/s pour se poser sans l’aide de l’air) »
- **Panneau de résultat :**
  - avant : « Température coque max »
  - après : « Température max de la coque »
- **Équipement, renforts de coque :**
  - avant : « … la coque se déforme puis cède (vite après +10 %). »
  - après : « … la coque se déforme puis cède (très vite au-delà de +10 %). »

### Vol (atterrissage, décollage, plongée)
- **Objectif au Soleil :**
  - avant : « Approchez le Soleil… si vous pouvez »
  - après : « Approchez-vous du Soleil… si vous le pouvez »
- **Tableau de bord** : « % du mortel » devient « % de la dose mortelle ».
  - Sur téléphone, la ligne courte garde « % du seuil mortel ».

### Orbiteur
- **Lanceur de retour en construction :**
  - avant : « Remontez le temps à l’orbiteur ou patientez. »
  - après : « Accélérez le temps à l’orbiteur ou patientez. »
  - « Remontez le temps » veut dire revenir en arrière, ce qui est le contraire du sens voulu.
- **Panneau « Pas de cible » :**
  - avant : « Cliquez un astre puis… »
  - après : « Cliquez sur un astre puis… »
- **Pilotage libre :**
  - avant : « 1-6 : orientation »
  - après : « 1 à 6 : orientation »
- **Atelier**, accord selon l'objet fabriqué :
  - « sonde terminé » devient « sonde terminée » ;
  - « un(e) extension de base » devient « une extension de base » ;
  - « robot fabriqué(e) » devient « robot fabriqué ».

### Encyclopédie des astres
- **« Philophrosyn »** devient « Philophrosyne » : le nom est coupé dans les données de la NASA.

## C. Questions avant d'appliquer

1. **« Ravito »** est utilisé dans les boutons et les messages, par exemple « 📦 Envoyer un ravito » et « Sondes et ravitos en route ». Deux options :
   - garder « ravito », familier mais clair, c'est le mot du jeu ;
   - écrire partout « ravitaillement ».
2. **« Rover »** est un anglicisme, mais c'est le mot courant en français (le mot officiel est « astromobile »). Je propose de le garder.
3. **Abréviations des tableaux** :
   - Dans la fenêtre Logistique, je propose d'écrire en entier « niveau » et « t de matériaux/jour » au lieu de « niv. » et « mat./j ».
   - L'en-tête « Échant. » reste abrégé, pour que le tableau tienne sur téléphone.
   - Sur le tableau de bord du vol (« V vert. », « Temp. coque »), je garde les abréviations : la place manque sur téléphone.
4. **Noms français des petites lunes** : une trentaine de lunes ont leur nom anglais tiré des données de la NASA, par exemple Hippocamp (Hippocampe), Kore (Coré), Hegemone (Hégémone), Erinome (Érinomé). Deux options :
   - les franciser ;
   - les laisser tels quels.
