'use strict';
// ---------- The Thing, sur TRAPPIST-1 g ----------
// Une planète glacée au bord extérieur de la zone habitable de TRAPPIST-1 (≈ −95 °C). Son atmosphère n'est pas
// mesurée : on lui en suppose une, d'azote, comme beaucoup de modèles. Décor de banquise polaire, blizzard.
// Le clin d'œil : une base de recherche abandonnée, à moitié prise dans la glace ; un message radio en boucle ;
// un chien de traîneau qui regarde la fusée de loin ; et, si l'on a une base ici, une question qui met mal à l'aise.

const ID_TRAPPIST_G = 'trappist1_p6';
(function () {
  const sys = typeof SYSTEMES !== 'undefined' && SYSTEMES.trappist1;
  const a = sys && sys.astres.find((x) => x.id === ID_TRAPPIST_G);
  if (!a) return;
  // Azote, ≈ 0,6 bar, à −95 °C : densité ≈ 1,1 kg/m³, hauteur d'échelle ≈ 5 km (g ≈ 10 m/s²).
  a.atm = { p0: 0.6, rho0: 1.13, H: 5.2, t0: a.tempSurface, gradient: 4, tHaut: a.tempSurface - 45 };
  a.couleurs = { sol: '#e6eef5', ciel: '#6e5566', disque: '#dfe7ee' };
  a.surface = 'glace et neige (supposées)';
  a.relief = { amplitude: 25, longueur: 600, crateres: 0 };
  a.blizzard = true;
  a.note = `${a.note.replace(' Atmosphère inconnue, supposée absente.', '')} Atmosphère supposée pour le jeu : azote, ≈ 0,6 bar ; aucune n’a encore été mesurée. Banquise et blizzard, comme aux pôles de la Terre.`;
})();

const EGG_THING = { id: 'trappist-g-base', astre: ID_TRAPPIST_G, dx: 700, dessin: 'baseGelee',
  texte: 'Une base de recherche à moitié prise dans la glace. Un baraquement a brûlé, l’autre est vide, la porte arrachée. Sur une table, une rangée de tests sanguins inachevés. Plus personne ne répond depuis longtemps.' };
EASTER_EGGS.push(EGG_THING);
const THING = { radio: 300, vuChien: 45, fuiteChien: 22, vitesseChien: 3.5 };

Object.assign(Exploration.prototype, {
  majThing(dt) {
    if (this.astre.id !== ID_TRAPPIST_G || this.terre) return;
    const a = this.astre, p = this.p, xb = this.posLibre(xEgg(a, EGG_THING));
    this.msgThing = this.msgThing || {};
    // Le message radio, en boucle.
    if (distSol(a, p.x, xb) < THING.radio && !this.msgThing.radio) {
      this.msgThing.radio = true;
      this.dire('📻 Sur une fréquence de détresse, un message enregistré tourne en boucle : « … plus personne ne répond… on ne se fait plus confiance… ne venez pas. »');
    }
    // Le chien : il regarde la fusée de loin, puis s'éloigne vers la base quand on approche.
    if (!this.chien && this.type === 'spationaute') {
      const sens = Math.sign(ecartSol(a, xb, this.xFusee)) || 1;
      this.chien = { x: this.xFusee + sens * 60, dir: -sens, etat: 'regarde', vers: sens, x0: this.xFusee + sens * 60, pas: 0 };
    }
    const c = this.chien;
    if (c && c.etat !== 'parti') {
      const d = distSol(a, p.x, c.x);
      if (c.etat === 'regarde' && d < THING.vuChien && !this.msgThing.chien) { this.msgThing.chien = true; this.dire('🐕 Un chien de traîneau, assis dans la neige, regarde la fusée. Un chien. Ici.'); }
      if (c.etat === 'regarde' && d < THING.fuiteChien) { c.etat = 'trotte'; c.dir = c.vers; this.dire('🐕 Le chien se lève sans un bruit et s’éloigne en trottinant, sans se retourner.'); }
      if (c.etat === 'trotte') { c.x += c.dir * THING.vitesseChien * dt; c.pas += dt; if (Math.abs(c.x - c.x0) > 150) c.etat = 'parti'; }
    }
    // Une base à soi sur cet astre : la question, une seule fois.
    const v = etat.enVoyage && etat.voyage;
    if (v && eggTrouve(EGG_THING.id) && !v.questionThing && (v.bases || []).some((b) => b.astre === ID_TRAPPIST_G)) {
      v.questionThing = true;
      v.journal.push({ t: v.t, texte: '🧪 Tout le monde est bien humain à bord ?' });
      this.dire('🧪 Message de la base : « Tout le monde est bien humain à bord ? »');
    }
  },

  dessinerThing(ctx, versEcran, echelle, W, H) {
    if (!this.astre.blizzard || this.terre) return;
    const c = this.chien;
    if (c && c.etat !== 'parti' && this.astre.id === ID_TRAPPIST_G) {
      const [sx, sy] = versEcran(c.x, this.sol(c.x));
      if (sx > -60 && sx < W + 60) dessinerHusky(ctx, sx, sy, echelle, c.dir, c.etat === 'trotte' ? c.pas : 0);
    }
    dessinerBlizzard(ctx, W, H, this.p.x * echelle);
  },
});

// Blizzard : de la neige poussée par le vent, en trois profondeurs (les plus proches, plus grosses et plus rapides).
function dessinerBlizzard(ctx, W, H, decalage) {
  const t = performance.now() / 1000;
  for (let i = 0; i < 220; i++) {
    const prof = (i % 3) + 1, vit = 260 / prof, taille = 3.2 / prof;
    const x = ((((i * 137.7 - t * vit - decalage / prof) % (W + 40)) + W + 40) % (W + 40)) - 20;
    const y = (((i * 59.3 + t * (25 / prof) + Math.sin(t * 1.3 + i) * 12) % H) + H) % H;
    ctx.fillStyle = `rgba(240,246,255,${0.75 / prof})`;
    ctx.fillRect(x, y, taille * 3, taille);
  }
  // Voile blanc léger : la visibilité baisse.
  ctx.fillStyle = 'rgba(225,232,240,0.12)'; ctx.fillRect(0, 0, W, H);
}

// Chien de traîneau de profil (formes simples) : dos gris, ventre blanc, oreilles pointues, queue en boucle.
function dessinerHusky(ctx, x, y, s, dir, pas) {
  ctx.save(); ctx.translate(x, y); ctx.scale(dir || 1, 1);
  const k = s * 0.9, ph = Math.sin(pas * 9);
  const patte = (px, decal) => { ctx.fillStyle = '#eceff1'; ctx.fillRect(px * k + decal * k, -0.32 * k, 0.07 * k, 0.32 * k); };
  patte(-0.28, ph * 0.04); patte(-0.18, -ph * 0.04); patte(0.2, -ph * 0.04); patte(0.3, ph * 0.04);
  ctx.fillStyle = '#78909c'; ctx.beginPath(); ctx.ellipse(0, -0.42 * k, 0.4 * k, 0.15 * k, 0, 0, Math.PI * 2); ctx.fill();   // dos
  ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.ellipse(0.02 * k, -0.35 * k, 0.32 * k, 0.07 * k, 0, 0, Math.PI * 2); ctx.fill();   // ventre
  ctx.strokeStyle = '#78909c'; ctx.lineWidth = 0.07 * k; ctx.beginPath(); ctx.arc(-0.45 * k, -0.6 * k, 0.12 * k, Math.PI * 0.4, Math.PI * 1.9); ctx.stroke();   // queue
  ctx.fillStyle = '#78909c'; ctx.beginPath(); ctx.ellipse(0.42 * k, -0.6 * k, 0.13 * k, 0.11 * k, 0, 0, Math.PI * 2); ctx.fill();   // tête
  ctx.beginPath(); ctx.moveTo(0.36 * k, -0.68 * k); ctx.lineTo(0.38 * k, -0.82 * k); ctx.lineTo(0.44 * k, -0.7 * k); ctx.fill();   // oreilles
  ctx.beginPath(); ctx.moveTo(0.45 * k, -0.68 * k); ctx.lineTo(0.49 * k, -0.81 * k); ctx.lineTo(0.53 * k, -0.67 * k); ctx.fill();
  ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.ellipse(0.55 * k, -0.57 * k, 0.08 * k, 0.05 * k, 0, 0, Math.PI * 2); ctx.fill();   // museau
  disque(ctx, 0.62 * k, -0.58 * k, 0.025 * k, '#263238');
  disque(ctx, 0.46 * k, -0.63 * k, 0.02 * k, '#4fc3f7');   // œil bleu
  ctx.restore();
}

// Base de recherche abandonnée : un baraquement rouge à moitié enseveli, un autre brûlé, une antenne givrée.
DESSINS_EGGS.baseGelee = function (ctx, x, y, s) {
  // Antenne parabolique penchée, givrée
  trait(ctx, [[x - 7.5 * s, y], [x - 7.2 * s, y - 5 * s]], '#90a4ae', 0.12 * s);
  ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 0.14 * s; ctx.beginPath(); ctx.arc(x - 6.6 * s, y - 5.2 * s, 0.8 * s, Math.PI * 0.7, Math.PI * 1.6); ctx.stroke();
  // Baraquement rouge, à moitié pris dans la glace
  rect(ctx, x - 6 * s, y - 2.8 * s, 5 * s, 2.8 * s, '#b23a2e');
  rect(ctx, x - 6.2 * s, y - 3.1 * s, 5.4 * s, 0.35 * s, '#7f2a22');   // toit
  rect(ctx, x - 4.9 * s, y - 2.2 * s, 0.7 * s, 0.6 * s, '#1c2a33');   // fenêtres sombres
  rect(ctx, x - 3.2 * s, y - 2.2 * s, 0.7 * s, 0.6 * s, '#1c2a33');
  rect(ctx, x - 2.1 * s, y - 2.3 * s, 0.9 * s, 2.3 * s, '#0d1418');   // porte arrachée : un trou noir
  rect(ctx, x - 1.1 * s, y - 1 * s, 0.25 * s, 1.2 * s, '#b23a2e');   // la porte, tombée de travers
  // Baraquement brûlé : poutres noires, toit effondré
  ctx.fillStyle = '#263238';
  ctx.beginPath(); ctx.moveTo(x + 1 * s, y); ctx.lineTo(x + 1 * s, y - 2.2 * s); ctx.lineTo(x + 3 * s, y - 1.3 * s); ctx.lineTo(x + 5 * s, y - 2.5 * s); ctx.lineTo(x + 5 * s, y); ctx.fill();
  for (const bx of [1.6, 2.6, 3.6, 4.4]) trait(ctx, [[x + bx * s, y], [x + (bx + 0.2) * s, y - (1.6 + (bx % 1)) * s]], '#11171a', 0.12 * s);
  // Congères : la neige a envahi le pied des bâtiments
  ctx.fillStyle = '#f3f7fb';
  ctx.beginPath(); ctx.moveTo(x - 8 * s, y + 0.2 * s); ctx.quadraticCurveTo(x - 5 * s, y - 1.6 * s, x - 1.5 * s, y - 0.6 * s); ctx.quadraticCurveTo(x + 2 * s, y - 1.2 * s, x + 6 * s, y + 0.2 * s); ctx.fill();
};
