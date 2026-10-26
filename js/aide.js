'use strict';
// Onglet « Aide » de la page d'accueil : le jeu, les premiers pas, les engins et installations, les commandes.
// Texte court, une idée par phrase. Tout vient des règles du jeu (voir campagne.js, orbiteur.js, equipe.js…).
// Les fiches suivent toutes le même plan : à quoi ça sert, comment l'obtenir, ce que ça fait, évolutions.

// Nom du pilotage qui fait tout le voyage (voir le point 7 de la carte 4 : un seul nom partout).
const NOM_PILOTE_VOYAGE = 'pilote auto';

function ficheAide(titre, f) {
  const lignes = [['À quoi ça sert', f.role], ['Comment l’obtenir', f.obtenir], ['Ce que ça fait', f.fait], ['Évolutions', f.evolue]].filter(([, t]) => t);
  return `<article class="fiche-aide"><h4>${titre}</h4><dl>${lignes.map(([k, t]) => `<dt>${k}</dt><dd>${t}</dd>`).join('')}</dl></article>`;
}
const listeAide = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const tableAide = (lignes) => `<table>${lignes.map(([k, t]) => `<tr><td>${k}</td><td>${t}</td></tr>`).join('')}</table>`;

const ONGLETS_AIDE = [
  { id: 'jeu', titre: '🚀 Le jeu', html: () => `
    <p>Un jeu d’exploration spatiale avec la vraie gravité, les vraies atmosphères et les vraies orbites des astres.</p>
    <h3>Le but</h3>
    ${listeAide([
      'Explorer le Système solaire : se poser sur ses planètes, ses lunes et ses astéroïdes.',
      'Rapporter des échantillons sur Terre.',
      'S’installer : des stations en orbite, des bases au sol.',
      'Partir enfin vers une autre étoile, pour de vrai ou en science-fiction.',
    ])}
    <h3>Trois façons de jouer</h3>
    ${listeAide([
      '<b>Exploration du Système solaire</b> : la campagne. Tout part de la Terre, et tout se garde d’une séance à l’autre.',
      '<b>Visite rapide</b> : on choisit un astre, la fusée arrive au-dessus, on se pose. Rien d’autre à gérer.',
      '<b>Se promener</b> : une balade sur Terre, ou l’observation de loin des merveilles du ciel.',
    ])}
    <h3>La sauvegarde</h3>
    <p>La partie s’enregistre seule dans ce navigateur, toutes les 5 secondes. Pour la garder ailleurs, téléchargez la sauvegarde depuis l’accueil, puis rechargez-la sur un autre appareil.</p>
    <h3>Sur téléphone</h3>
    <p>Le jeu est jouable sur téléphone, avec des boutons tactiles. La maniabilité reste moyenne : l’écran est petit pour tout ce qu’il y a à voir.</p>
    <p>Le paysage est conseillé pour le vol et l’exploration au sol : on voit plus loin devant soi. Les fenêtres de gestion (ravitaillement, logistique, aide) se lisent mieux en portrait. Le jeu suit le téléphone dans les deux sens.</p>` },

  { id: 'debut', titre: '👣 Premiers pas', html: () => `
    <p>La campagne, en huit étapes.</p>
    <ol>
      <li>Sur l’accueil, « Commencer », puis lancez la méga-fusée Hercule depuis Kourou.</li>
      <li>En orbite terrestre, construisez la station spatiale (bouton 🏗).</li>
      <li>Choisissez une cible : cliquez sur un astre, puis « Choisir comme cible ». La Lune est un bon début.</li>
      <li>Allez-y, avec l’assistant ou le ${NOM_PILOTE_VOYAGE}.</li>
      <li>Arrivé en orbite, descendez avec l’atterrisseur.</li>
      <li>Posé, sortez le spationaute (E) ou le robot (R).</li>
      <li>Ramassez des échantillons (E près d’un repère ◆), puis rentrez au module.</li>
      <li>Remontez en orbite, revenez vers la Terre et rentrez en capsule (🏠). Ou renvoyez seulement les échantillons dans une capsule sans équipage (📦), et l’expédition continue.</li>
    </ol>
    <p>Ensuite : des stations autour d’autres astres, des bases au sol, des robots, des sondes, une équipe plus grande… et un jour, une autre étoile.</p>` },

  { id: 'fusees', titre: '🛫 Fusées', html: () =>
    ficheAide('Lanceur Hercule', {
      role: 'Mettre une expédition en orbite basse autour de la Terre (400 km).',
      obtenir: 'Disponible dès le début, au centre de lancement de Kourou.',
      fait: 'Deux étages. Il emporte 110 t : l’orbiteur, l’atterrisseur, des kits et des ergols. Le 1er étage se largue en route.',
    }) +
    ficheAide('Lanceur Séléné', {
      role: 'Envoyer une expédition directement vers la Lune.',
      obtenir: 'Disponible dès le début, au centre de lancement.',
      fait: 'Trois étages, du gabarit de Saturn V. Le 3e étage atteint l’orbite, puis rallume pour partir vers la Lune (environ 5 jours de trajet).',
    }) +
    ficheAide('Atterrisseur', {
      role: 'Descendre de l’orbite jusqu’au sol, puis remonter.',
      obtenir: 'L’orbiteur en emporte deux. Une station en fabrique d’autres à son atelier.',
      fait: 'Il est conçu automatiquement pour chaque astre, par des vols d’essai : moteur, réservoir, coque, bouclier et panneau adaptés. Il consomme les ergols de l’orbiteur.',
      evolue: 'Si aucun atterrisseur ne peut repartir d’un astre, le jeu le dit : on y largue alors un robot.',
    }) +
    ficheAide('Lanceur de retour et ballon (Vénus)', {
      role: 'Quitter le sol de Vénus, d’où aucun moteur ne peut décoller.',
      obtenir: 'Construit à l’atelier d’une station en orbite de Vénus, puis envoyé au sol sous parachute.',
      fait: 'Un ballon emporte un petit lanceur à deux étages jusqu’aux nuages (54 km), où il s’allume vers l’orbite. Le module blindé reste au sol.',
    }) +
    ficheAide('Fusée de la visite rapide', {
      role: 'Se poser sur n’importe quel astre, sans campagne.',
      obtenir: 'Au hangar, depuis l’accueil (« Personnaliser la fusée »).',
      fait: 'On choisit le moteur, le réservoir, les renforts de coque, le bouclier thermique et le panneau anti-rayonnement. Chaque pièce ajoute du poids. Le jeu peut aussi l’équiper tout seul.',
    }) },

  { id: 'espace', titre: '🛰 Dans l’espace', html: () =>
    ficheAide('Orbiteur', {
      role: 'Le vaisseau de l’expédition : il voyage d’astre en astre et emporte tout le reste.',
      obtenir: 'Mis en orbite par la méga-fusée. Une nouvelle expédition en lance un nouveau.',
      fait: `60 t de carburant, propulsion nucléaire-électrique. Il emporte 6 sondes, 2 kits de station, 1 kit de base, 2 robots et 2 atterrisseurs. Trois pilotages : <b>libre</b> (vous poussez vous-même), <b>assistant</b> (il calcule la prochaine manœuvre, vous l’exécutez), <b>${NOM_PILOTE_VOYAGE}</b> (il fait tout le voyage).`,
      evolue: 'Le plein se fait en s’amarrant à une station, ou gratuitement en orbite de la Terre.',
    }) +
    ficheAide('Sondes', {
      role: 'Repérer un astre avant d’y aller.',
      obtenir: 'L’orbiteur en emporte six ; les stations en reçoivent et en fabriquent.',
      fait: 'En orbite de sa cible, la sonde cartographie l’astre, repère une zone plate pour une base et ce qu’on peut y extraire. Une sonde par astre.',
      evolue: 'La grappe : plusieurs sondes partent ensemble vers les lunes d’une planète, une par cible. Une grappe à voile laser explore aussi les autres étoiles avant un départ.',
    }) +
    `<h3>Le temps</h3>
    ${listeAide([
      'Avec + et −, le temps va de ×1 à ×100 millions à l’orbiteur.',
      'Il ralentit tout seul pendant une poussée et avant une manœuvre.',
      '« ⏱ Temps réel » : le temps de la mission suit l’horloge, même navigateur fermé. Le jeu donne l’heure réelle des manœuvres, avec un rappel à mettre dans son agenda.',
    ])}` },

  { id: 'installations', titre: '🏗 Installations', html: () =>
    ficheAide('Stations', {
      role: 'Une base arrière en orbite : stock, atelier, plein de l’orbiteur.',
      obtenir: 'Un kit de station, et l’orbiteur en orbite fermée autour de l’astre (bouton 🏗). Une station par astre.',
      fait: 'On s’y amarre pour faire le plein et reprendre du matériel. Un cargo automatique la ravitaille régulièrement depuis la Terre. Son atelier fabrique sondes, robots, atterrisseurs, kits et extensions avec des matériaux.',
      evolue: 'Cinq niveaux, chacun avec une extension de station : 2, stockage doublé ; 3, chantiers plus rapides et ravitaillement doublé ; 4, habitat pour l’équipe et stockage triplé ; 5, chantier du vaisseau interstellaire.',
    }) +
    ficheAide('Bases', {
      role: 'S’installer au sol et produire sur place.',
      obtenir: 'Un kit de base, une station en orbite de l’astre et un terrain plat. Posé, touche B, ou « Déployer la base depuis l’orbite » une fois la zone repérée par une sonde. Une base par astre.',
      fait: 'Elle exploite la ressource locale (glace, méthane, CO₂…) pour produire des ergols, et refait le plein de l’atterrisseur.',
      evolue: 'Cinq niveaux, chacun avec une extension de base descendue depuis la station. À partir du niveau 2, une mine produit aussi des matériaux.',
    }) +
    ficheAide('Cargos et ravitaillement', {
      role: 'Envoyer du matériel d’une station à une autre, ou depuis la Terre.',
      obtenir: 'Bouton « 📦 Envoyer un ravito », dès qu’une station existe.',
      fait: 'Vous dites de quoi vous avez besoin et où. Le jeu propose la source qui arrivera le plus vite. Le cargo part sur sa vraie trajectoire.',
      evolue: 'Contenus : kit d’expédition, ergols, matériaux, extension de base, extension de station. Depuis la Terre, le stock est illimité.',
    }) +
    `<h3>Où miner quoi ?</h3><p>Le bouton « ⛏ Où miner quoi ? » classe les astres selon la ressource cherchée, les plus riches et les plus proches d’abord. « 📊 Logistique » résume les stations, les bases et ce qu’il reste à faire.</p>` },

  { id: 'sol', titre: '⛰ Au sol', html: () =>
    ficheAide('Spationaute', {
      role: 'Explorer à pied et ramasser des échantillons.',
      obtenir: 'Posé sur un astre solide, touche E.',
      fait: '4 heures d’oxygène, un sac de 6 échantillons. Les sauts dépendent de la gravité. Sur les tout petits astres, un câble le retient près du module.',
    }) +
    ficheAide('Équipe', {
      role: 'Explorer plusieurs astres en même temps.',
      obtenir: 'Quatre personnes au départ de l’expédition, vous compris.',
      fait: 'Les coéquipiers partent en mission de 1, 3 ou 7 jours avec un atterrisseur. Ils rapportent des échantillons, mais encaissent la dose de rayonnement du lieu.',
      evolue: 'Avec une station de niveau 4 (habitat), l’équipe passe à 8.',
    }) +
    ficheAide('Astromobile', {
      role: 'Aller plus loin et plus vite.',
      obtenir: 'Garée à côté du module, pour le spationaute. Touche V pour monter ou descendre.',
      fait: 'Elle roule jusqu’à environ 3,6 m/s sur la Lune et emporte 20 échantillons.',
    }) +
    ficheAide('Robots', {
      role: 'Explorer là où un équipage ne peut pas aller, ou pas revenir.',
      obtenir: 'L’orbiteur en emporte deux ; l’atelier en fabrique.',
      fait: 'Posé, touche R : le robot analyse les sites et transmet ses données au module. Larguer un robot depuis l’orbite est un aller simple. Il résiste à la pression et à la chaleur bien mieux qu’un humain.',
      evolue: 'Le robot de prélèvement descend seul, ramasse des échantillons pendant des jours, puis lance son conteneur en orbite. Son blindage décide combien de temps il tient au rayonnement.',
    }) +
    `<h3>Le drapeau</h3><p>Touche F : le drapeau des Nations unies et le fanion de l’AS Nancy Lorraine. Un drapeau tous les 20 m au plus.</p>
    <h3>Les dangers</h3>
    ${listeAide([
      'La pression et la chaleur abîment la coque ou la combinaison, petit à petit.',
      'Le rayonnement s’accumule : au-delà de 4 Sv, c’est mortel.',
      'L’oxygène ne dure que 4 heures : rentrez à temps.',
      'Un saut trop fort sur un petit astre dépasse la vitesse de libération.',
    ])}` },

  { id: 'commandes', titre: '🎮 Commandes', html: () => `
    <h3>Atterrissage et décollage</h3>
    ${tableAide([
      ['↑ / Z, ↓ / S', 'Manette des gaz (elle reste où on la laisse)'],
      ['X / Espace', 'Couper / plein gaz'],
      ['← → / Q D', 'Orienter la fusée'],
      ['L', 'Pilote automatique : se pose sur une zone plate et y reste'],
      ['T', 'Décoller (pilote automatique jusqu’à l’orbite)'],
      ['E / R / B', 'Une fois posé : spationaute / robot / construire une base'],
      ['+ / −', 'Accélérer / ralentir le temps (limité juste avant le contact)'],
      ['P / Échap', 'Pause / abandonner'],
    ])}
    <p class="doux">Pour se poser : rester sous la vitesse maximale de l’astre, fusée droite, sol pas trop pentu. Pour repartir : atteindre l’altitude d’orbite et la vitesse orbitale à l’horizontale (jauges en haut de l’écran).</p>
    <h3>Exploration au sol</h3>
    ${tableAide([
      ['← → / Q D', 'Marcher, rouler'],
      ['↑ / Z / Espace', 'Sauter (selon la gravité locale)'],
      ['E', 'Ramasser, analyser, cueillir… ou rentrer près du module'],
      ['V', 'Monter dans l’astromobile / en descendre'],
      ['F', 'Planter le drapeau'],
      ['+ / −', 'Temps ×1 à ×50'],
      ['Échap', 'Rentrer au module (ou rappeler le robot)'],
    ])}
    <h3>Orbiteur</h3>
    ${tableAide([
      ['Molette, glisser', 'Zoomer, déplacer la carte'],
      ['Clic / double-clic', 'Fiche d’un astre / centrer dessus'],
      ['F', 'Revenir à l’orbiteur'],
      ['+ / −', 'Temps de ×1 à ×100 millions'],
      ['I', 'Tous les astres'],
    ])}
    <h3>Au toucher</h3>
    ${listeAide([
      'En vol : ⟲ ⟳ pour pivoter, ▲ ▼ pour les gaz, 0 et Max pour couper ou mettre plein gaz, 🤖 Auto pour le pilote automatique.',
      'Au sol : ◀ ▶ pour marcher, ⤒ pour sauter, 🤲 Ramasser, 🚙 Astromobile, 🚩 pour le drapeau.',
      'Partout : ⏪ ⏩ pour le temps, ⏸ pour la pause, ✕ ou ↩ pour sortir.',
      'À l’orbiteur : un doigt pour déplacer, deux doigts pour zoomer, toucher un astre pour sa fiche.',
      'En pilote automatique, les commandes manuelles se cachent : touchez l’écran pour les revoir.',
    ])}` },
];

function ouvrirAide(ongletId) {
  const m = $('modale');
  const actif = ongletId || ONGLETS_AIDE[0].id;
  // Grand écran : onglets. Téléphone : sections dépliables (la première ouverte).
  m.innerHTML = `<div class="fenetre large aide-fenetre"><header class="entete"><div><h2>❓ Aide</h2></div><button class="fermer">✕</button></header>
    <nav class="onglets-aide" role="tablist">${ONGLETS_AIDE.map((o) => `<button role="tab" data-onglet="${o.id}" aria-selected="${o.id === actif}">${o.titre}</button>`).join('')}</nav>
    ${ONGLETS_AIDE.map((o) => `<details class="panneau-aide" data-panneau="${o.id}" ${o.id === actif ? 'open' : ''}><summary>${o.titre}</summary><div class="corps-aide">${o.html()}</div></details>`).join('')}
  </div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => m.classList.add('cache');
  const choisir = (id) => {
    m.querySelectorAll('[data-onglet]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.onglet === id)));
    m.querySelectorAll('[data-panneau]').forEach((d) => { d.open = d.dataset.panneau === id; d.classList.toggle('actif', d.dataset.panneau === id); });
  };
  m.querySelectorAll('[data-onglet]').forEach((b) => { b.onclick = () => choisir(b.dataset.onglet); });
  choisir(actif);
}
