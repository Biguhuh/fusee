'use strict';
// Articles, élisions et adjectifs devant les noms d'astres, de stations et de bases.
// « posé sur la Lune », « en orbite d’Europe », « au Soleil », « station martienne ».
// Chaque fonction accepte un astre, l'identifiant d'un astre, une station (ou tout objet avec un nom)
// ou un simple nom.

// Astres qui prennent un article ; les autres n'en prennent pas (Mars, Europe, Titan, Proxima b…).
const ARTICLES_ASTRES = { lune: 'la', terre: 'la', soleil: 'le' };
// Adjectifs au féminin (station, base, orbite), quand l'usage en connaît un.
const ADJECTIFS_ASTRES = {
  lune: 'lunaire', terre: 'terrestre', mercure: 'mercurienne', venus: 'vénusienne', mars: 'martienne',
  jupiter: 'jovienne', saturne: 'saturnienne', uranus: 'uranienne', neptune: 'neptunienne', pluton: 'plutonienne',
};

function astreDe(x) {
  if (typeof x === 'string') return ASTRES_PAR_ID[x] || null;
  return x && x.id && ASTRES_PAR_ID[x.id] === x ? x : null;
}
// { art, nom } : « la » + « Lune », « l’ » + « étoile de Barnard », « la » + « station lunaire », « » + « Mars ».
function decomposerNom(x) {
  const a = astreDe(x);
  if (a) {
    if (ARTICLES_ASTRES[a.id]) return { art: ARTICLES_ASTRES[a.id], nom: a.nom };
    if (/^Étoile /.test(a.nom)) return { art: 'l’', nom: 'é' + a.nom.slice(1) };
    return { art: '', nom: a.nom };
  }
  const nom = typeof x === 'string' ? x : (x && x.nom) || '';
  if (/^(Station|Base) /.test(nom)) return { art: 'la', nom: nom[0].toLowerCase() + nom.slice(1) };
  if (/^Étoile /.test(nom)) return { art: 'l’', nom: 'é' + nom.slice(1) };
  return { art: '', nom };
}
const commenceParVoyelle = (s) => /^[aeiouyàâäéèêëîïôöùûüœæh]/i.test(s);
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// « la Lune », « Mars », « la station lunaire »
function le(x) {
  const { art, nom } = decomposerNom(x);
  if (!art) return nom;
  return art === 'l’' ? 'l’' + nom : `${art} ${nom}`;
}
// « de la Lune », « du Soleil », « d’Europe », « de Mars »
function de(x) {
  const { art, nom } = decomposerNom(x);
  if (art === 'le') return 'du ' + nom;
  if (art === 'la') return 'de la ' + nom;
  if (art === 'l’') return 'de l’' + nom;
  return (commenceParVoyelle(nom) ? 'd’' : 'de ') + nom;
}
// « à la Lune », « au Soleil », « à Mars »
function au(x) {
  const { art, nom } = decomposerNom(x);
  if (art === 'le') return 'au ' + nom;
  if (art === 'la') return 'à la ' + nom;
  if (art === 'l’') return 'à l’' + nom;
  return 'à ' + nom;
}
// « sur la Lune », « sur Mars » ; « sur Terre », sans article, comme le veut l'usage.
function sur(x) {
  const a = astreDe(x);
  if (a && a.id === 'terre') return 'sur Terre';
  return 'sur ' + le(x);
}
// « en orbite lunaire », « en orbite martienne », « en orbite autour d’Europe »
function enOrbite(x) {
  const a = astreDe(x);
  if (a && ADJECTIFS_ASTRES[a.id]) return 'en orbite ' + ADJECTIFS_ASTRES[a.id];
  return 'en orbite autour ' + de(x);
}
// Noms propres des stations et des bases : « Station lunaire », « Station d’Europe », « Base martienne ».
function nomStation(x) {
  const a = astreDe(x);
  if (a && a.id === 'terre') return 'Station spatiale terrestre';
  return a && ADJECTIFS_ASTRES[a.id] ? 'Station ' + ADJECTIFS_ASTRES[a.id] : 'Station ' + de(x);
}
function nomBase(x) {
  const a = astreDe(x);
  return a && ADJECTIFS_ASTRES[a.id] ? 'Base ' + ADJECTIFS_ASTRES[a.id] : 'Base ' + de(x);
}
// Versions en début de phrase : « La station lunaire… », « Sur la Lune… »
const Le = (x) => majuscule(le(x));
const De = (x) => majuscule(de(x));
const Sur = (x) => majuscule(sur(x));
