'use strict';
// ---------- Le Cinquième Élément (Luc Besson, 1997) ----------
// 1. « Aziz, lumière ! » : la première fois que les lampes du casque s'allument (de nuit, ou dans l'ombre), une fois par sauvegarde.
// 2. L'épave du vaisseau des Mondoshawans, sur Io : dans le film, il est abattu par les Mangalores en passant près de Jupiter.
//    Les pierres n'étaient pas à bord, et le cinquième élément non plus.

const EGG_AZIZ = { id: 'aziz-lumiere', astre: 'casque',
  texte: '« Aziz, lumière ! » Les lampes du casque s’allument. Personne ne s’appelle Aziz dans l’équipage, mais ça marche quand même.' };
const EGG_MONDOSHAWAN = { id: 'io-mondoshawan', astre: 'io', dx: -800, dessin: 'epaveMondoshawan',
  texte: 'Les débris d’un immense vaisseau brun et rond, aux flancs nervurés comme une carapace, tordus dans le soufre d’Io. Abattu en passant près de Jupiter. On a fouillé l’épave : le cinquième élément n’est pas dans les débris.' };
EASTER_EGGS.push(EGG_MONDOSHAWAN);

// Les lampes s'allument (exploration.js, à chaque image de nuit) : la première fois, le clin d'œil.
function azizLumiere(x) {
  etat.decouvertes = etat.decouvertes || {};
  if (etat.decouvertes[EGG_AZIZ.id] || x.azizDit) return;
  x.azizDit = true;
  etat.decouvertes[EGG_AZIZ.id] = { astre: x.astre ? x.astre.id : null, quand: etat.enVoyage && etat.voyage ? etat.voyage.t : null, par: nomSpatio() };
  x.dire(EGG_AZIZ.texte);
  if (typeof afficherDecouverte === 'function') afficherDecouverte('✨ ' + EGG_AZIZ.texte);
  if (typeof sauver === 'function') sauver(etat);
}

// Liste des easter eggs (Découvertes, Progression) : « Aziz, lumière ! » n'a pas de lieu fixe.
const _tousLesEggsCinquieme = tousLesEggs;
tousLesEggs = function () { return [..._tousLesEggsCinquieme(), { id: EGG_AZIZ.id, astre: 'casque', texte: EGG_AZIZ.texte }]; };
const _lieuEggCinquieme = lieuEgg;
lieuEgg = function (e) { return e.id === EGG_AZIZ.id ? 'la première fois que les lampes du casque s’allument (la nuit, ou dans l’ombre d’un cratère)' : _lieuEggCinquieme(e); };
REFERENCES_EGGS[EGG_AZIZ.id] = 'Le Cinquième Élément (Luc Besson, 1997) : « Aziz, lumière ! », l’ordre lancé au début du film pour éclairer la chambre secrète du temple.';
REFERENCES_EGGS[EGG_MONDOSHAWAN.id] = 'Le Cinquième Élément (Luc Besson, 1997) : le vaisseau des Mondoshawans, abattu par les Mangalores en passant près de Jupiter. Les pierres n’étaient pas à bord.';

// Épave : des morceaux de coque bruns et ronds, nervurés, à moitié enfouis ; un grand anneau tordu ; un peu de fumée.
DESSINS_EGGS.epaveMondoshawan = function (ctx, x, y, s) {
  const coque = '#7b5a3c', clair = '#a07a52', nervure = '#4a3322';
  // Grand fragment de coque : une demi-coquille couchée.
  ctx.fillStyle = coque; ctx.beginPath(); ctx.ellipse(x - 2 * s, y, 7 * s, 3.4 * s, -0.12, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = nervure; ctx.lineWidth = Math.max(1, 0.12 * s);
  for (let k = 1; k < 7; k++) {
    const u = k / 7, a = Math.PI * (1 - u);
    ctx.beginPath(); ctx.moveTo(x - 2 * s + Math.cos(a) * 7 * s, y - Math.sin(a) * 3.4 * s); ctx.lineTo(x - 2 * s + Math.cos(a) * 7 * s * 0.55, y); ctx.stroke();
  }
  ctx.fillStyle = clair; ctx.beginPath(); ctx.ellipse(x - 3.5 * s, y - 2.2 * s, 1.6 * s, 0.5 * s, -0.2, 0, Math.PI * 2); ctx.fill();   // reflet
  // Déchirure : bord dentelé et noir.
  ctx.fillStyle = '#1e140d'; ctx.beginPath(); ctx.moveTo(x + 3 * s, y); ctx.lineTo(x + 3.6 * s, y - 1.4 * s); ctx.lineTo(x + 4.4 * s, y - 0.6 * s); ctx.lineTo(x + 4.9 * s, y - 1.9 * s); ctx.lineTo(x + 5.2 * s, y); ctx.fill();
  // Anneau tordu planté dans le sol.
  ctx.strokeStyle = coque; ctx.lineWidth = 0.45 * s; ctx.beginPath(); ctx.ellipse(x + 8 * s, y - 1.6 * s, 1.8 * s, 2.2 * s, 0.5, 0.4, Math.PI * 1.7); ctx.stroke();
  // Petits débris.
  for (const [dx, r] of [[-10, 0.6], [-8.5, 0.35], [11, 0.5], [12.5, 0.3], [6, 0.4]]) { ctx.fillStyle = coque; ctx.beginPath(); ctx.ellipse(x + dx * s, y, r * s * 1.6, r * s, 0, Math.PI, 0); ctx.fill(); }
  // Fumée qui s'élève encore (soufre chaud).
  const t = performance.now() / 1000;
  for (let k = 0; k < 4; k++) {
    const h = ((t * 0.4 + k * 0.25) % 1);
    ctx.fillStyle = `rgba(210,200,150,${0.25 * (1 - h)})`;
    ctx.beginPath(); ctx.arc(x + (4 + Math.sin(t + k) * 0.6) * s, y - (2 + h * 9) * s, (0.8 + h * 2) * s, 0, Math.PI * 2); ctx.fill();
  }
};
