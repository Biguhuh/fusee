'use strict';
// Répliques de science-fiction (et deux phrases réelles), affichées une seule fois par partie, à un moment précis,
// dans une petite ligne discrète qui s'efface : elle ne masque pas les informations de vol.
// « originale » : formule de remplacement, utilisée quand utiliserOriginale est vrai.

const REPLIQUES = {
  infini: { texte: 'Vers l’infini et au-delà !', source: 'Toy Story (1995)', originale: 'L’infini commence juste après l’orbite.' },
  crier: { texte: 'Dans l’espace, personne ne vous entendra crier.', source: 'Alien (1979)', originale: 'Ici, le vide garde tout pour lui, même les cris.' },
  houston: { texte: 'Houston, nous avons eu un problème.', source: 'Apollo 13, 13 avril 1970' },
  armstrong: { texte: 'C’est un petit pas pour l’homme, un bond de géant pour l’humanité.', source: 'Neil Armstrong, Apollo 11, 21 juillet 1969' },
  force: { texte: 'Que la Force soit avec vous.', source: 'Star Wars (1977)', originale: 'Bon vent, et que l’énergie vous porte.' },
  panique: { texte: 'Pas de panique.', source: 'Le Guide du voyageur galactique' },
  reviendrai: { texte: 'Je reviendrai.', source: 'Terminator (1984)' },
  europe: { texte: 'Tous ces mondes sont à vous, sauf Europe.', source: '2010 (Arthur C. Clarke)', originale: 'Tous les mondes vous sont ouverts. Celui-ci, on vous le déconseille.' },
  route: { texte: 'La route ? Là où on va, on n’a pas besoin de route !', source: 'Retour vers le futur (1985)', originale: 'Une route ? À partir d’ici, il n’y en a plus.' },
  startrek: { texte: 'Là où personne n’est jamais allé.', source: 'Star Trek (1966)' },
  troisiemeType: { texte: 'Cinq notes, et tout le monde se comprend.', source: 'Rencontres du troisième type (1977)' },
  bienvenue: { texte: 'Bienvenue sur Terre !', source: 'Independence Day (1996)' },
  silence: { texte: 'Ici, le silence a une épaisseur.' },
  chat: { texte: 'Un caillou, un chat, aucune explication.' },
  pression: { texte: 'La pression monte, le moral aussi.' },
};
// Choix de l'auteur du jeu (carte 4) : clins d'œil purs, sans la source affichée.
const AFFICHER_SOURCE_REPLIQUE = false;

// Affiche la réplique si elle n'a pas encore été vue dans cette partie.
function replique(id) {
  const r = REPLIQUES[id];
  if (!r || typeof etat === 'undefined') return;
  etat.repliques = etat.repliques || {};
  if (etat.repliques[id]) return;
  etat.repliques[id] = true;
  try { sauver(etat); } catch (e) { /* ignoré */ }
  const texte = r.utiliserOriginale && r.originale ? r.originale : r.texte;
  const source = r.utiliserOriginale && r.originale ? '' : (AFFICHER_SOURCE_REPLIQUE ? r.source || '' : '');
  FILE_REPLIQUES.push({ texte, source });
  if (FILE_REPLIQUES.length === 1) montrerReplique();
}

// Depuis un vol : seulement le vol affiché (pas les vols d'essai de la conception des atterrisseurs).
function repliqueVol(vol, id) { if (typeof etat !== 'undefined' && etat.vol === vol) replique(id); }

const FILE_REPLIQUES = [];
const DUREE_REPLIQUE = 6500;   // ms
function montrerReplique() {
  const r = FILE_REPLIQUES[0];
  if (!r) return;
  let el = document.getElementById('replique');
  if (!el) {
    el = document.createElement('div');
    el.id = 'replique';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.innerHTML = '';
  const t = document.createElement('span');
  t.className = 'replique-texte';
  t.textContent = r.texte;
  el.appendChild(t);
  if (r.source) {
    const s = document.createElement('span');
    s.className = 'replique-source';
    s.textContent = '— ' + r.source;
    el.appendChild(s);
  }
  el.classList.add('visible');
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => { FILE_REPLIQUES.shift(); montrerReplique(); }, 900);
  }, DUREE_REPLIQUE);
}
