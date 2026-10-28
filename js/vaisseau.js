'use strict';
// Nom du vaisseau de l'expédition (celui qui voyage et se met en orbite ; le module, lui, descend).
// Un nom tiré au hasard est proposé avant chaque nouvelle expédition, comme pour l'équipage, et reste modifiable.
//
// Règle : aucun nom de vaisseau réel (spatial, aérien ou maritime) perdu dans un accident mortel
// (Challenger, Columbia, Soyouz 1 et 11, Apollo 1, VSS Enterprise, Titanic, Pourquoi-Pas ?, etc.).
const NOMS_VAISSEAUX = [
  'Odyssée', 'Boréale', 'Australe', 'Aurore', 'Zéphyr', 'Alizé', 'Mistral', 'Sirocco', 'Libellule', 'Colibri',
  'Luciole', 'Comète', 'Étoile du Berger', 'Vagabonde', 'Sérénité', 'Audace', 'Espérance', 'Constance',
  'Grande Ourse', 'Petite Ourse', 'Cassiopée', 'Andromède', 'Céphée', 'Pégase', 'Licorne', 'Ulysse', 'Pénélope',
  'Iris', 'Nébuleuse', 'Périhélie', 'Zénith', 'Équinoxe', 'Solstice', 'Rose des vents', 'Belle Étoile',
  'Petit Prince', 'Grand Large', 'Voie lactée', 'Astre errant', 'Marée haute', 'Vent solaire', 'Lune rousse',
];
// Nettoie un nom tapé par le joueur (il s'affiche dans des pages HTML).
function nettoyerNomVaisseau(nom) { return String(nom || '').replace(/[<>&"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24); }

// Un nom au hasard, différent des vaisseaux déjà utilisés dans la campagne.
function nomVaisseauAleatoire(v, eviter = []) {
  const pris = new Set([...(v && v.nomsVaisseaux) || [], ...eviter]);
  const libres = NOMS_VAISSEAUX.filter((n) => !pris.has(n));
  const l = libres.length ? libres : NOMS_VAISSEAUX;
  return l[Math.floor(Math.random() * l.length)];
}
function nomVaisseau(v) { return (v && v.nomVaisseau) || 'Orbiteur'; }

// Baptême : le vaisseau de l'expédition prend son nom (gardé dans la liste de la campagne).
function baptiserVaisseau(v, nom) {
  v.nomVaisseau = nettoyerNomVaisseau(nom) || nomVaisseauAleatoire(v);
  v.nomsVaisseaux = v.nomsVaisseaux || [];
  if (!v.nomsVaisseaux.includes(v.nomVaisseau)) v.nomsVaisseaux.push(v.nomVaisseau);
}

// Renommer en cours de route (bouton ✏ du panneau).
function renommerVaisseau(v, apres) {
  const n = nettoyerNomVaisseau(prompt('Nom du vaisseau :', nomVaisseau(v)));
  if (!n || n === v.nomVaisseau) return;
  const avant = nomVaisseau(v);
  baptiserVaisseau(v, n);
  v.journal.push({ t: v.t, texte: `🚀 Le vaisseau ${avant} s’appelle désormais ${v.nomVaisseau}.` });
  if (apres) apres();
}
