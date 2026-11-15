'use strict';
// ---------- They Live, dans la promenade sur Terre ----------
// 200 m après le Bar de l'Espace, une petite rue de Los Angeles : immeubles bas, palmiers, trois panneaux
// publicitaires. Sur un banc, des lunettes de soleil oubliées (E pour les prendre, L pour les mettre ou les
// retirer). Avec elles, tout passe en noir et blanc et les panneaux disent ce qu'ils pensent vraiment.

const EGG_THEYLIVE = { id: 'terre-lunettes', astre: 'terre',
  texte: 'Sur un banc de Los Angeles, des lunettes de soleil oubliées. Avec elles, la rue passe en noir et blanc, et les panneaux publicitaires disent enfin ce qu’ils pensent : OBEY, CONSOMMEZ, DORMEZ.' };
// Positions depuis le module (m) : début et fin de la rue, banc, panneaux, palmiers, immeubles [x, largeur, hauteur, couleur].
const RUE_LA = {
  debut: 255, fin: 400, banc: 285,
  panneaux: [
    { x: 310, pub: ['MARS EN 3 JOURS', 'Agence Orbite · départs chaque semaine'], fond: '#1565c0', vrai: 'OBEY' },
    { x: 340, pub: ['COLA COSMIQUE', 'Le goût des étoiles'], fond: '#c62828', vrai: 'CONSOMMEZ' },
    { x: 370, pub: ['SOLDES', 'Achetez tout, tout de suite'], fond: '#f9a825', vrai: 'DORMEZ' },
  ],
  palmiers: [270, 298, 326, 356, 388],
  immeubles: [[262, 16, 9, '#e8cfa6'], [280, 12, 14, '#d7a98c'], [294, 18, 7, '#f1e3c8'], [314, 14, 18, '#c9b7a2'],
    [330, 20, 10, '#e9c2a6'], [352, 13, 13, '#d9cbb5'], [367, 17, 8, '#efd9b4'], [386, 15, 15, '#cfae8e']],
  vu: 20,   // on remarque les lunettes à 20 m
};

(function () {
  const P = Exploration.prototype, genererTerre = P.genererTerre, agirTerre = P.agirTerre;
  // Pas de fleurs ni d'arbres dans la rue.
  P.genererTerre = function () {
    const xd = this.xFusee + RUE_LA.debut - 5, xf = this.xFusee + RUE_LA.fin + 5;
    return genererTerre.call(this).filter((s) => s.x < xd || s.x > xf);
  };
  // E près du banc : on prend les lunettes. Avec les lunettes, dans la rue, E les met ou les retire (écran tactile).
  P.agirTerre = function () {
    const dx = this.p.x - this.xFusee;
    if (!this.lunettes && Math.abs(dx - RUE_LA.banc) < 2.5) {
      this.lunettes = { portees: false };
      return this.dire(`🕶 Des lunettes de soleil, un peu rayées, oubliées sur le banc. ${ECRAN_TACTILE ? '🕶 pour' : 'L pour'} les mettre.`);
    }
    if (this.lunettes && dx > RUE_LA.debut && dx < RUE_LA.fin) return this.basculerLunettes();
    return agirTerre.call(this);
  };
})();

Object.assign(Exploration.prototype, {
  basculerLunettes() {
    if (!this.terre || !this.lunettes) return;
    const l = this.lunettes;
    l.portees = !l.portees;
    if (!l.portees) return this.dire('🕶 Vous retirez les lunettes : les couleurs reviennent, les publicités aussi.');
    const dx = this.p.x - this.xFusee;
    const devant = RUE_LA.panneaux.some((pn) => Math.abs(dx - pn.x) < 18);
    if (devant && !eggTrouve(EGG_THEYLIVE.id)) return decouvrir(EGG_THEYLIVE, this);
    this.dire(devant ? '🕶 OBEY. CONSOMMEZ. DORMEZ.' : '🕶 Tout passe en noir et blanc. Drôles de lunettes.');
  },

  // Rue : derrière le personnage. Appelé pendant le dessin de la promenade.
  dessinerRueLA(ctx, versEcran, s, W) {
    if (!this.terre) return;
    const x0 = this.xFusee, vrai = this.lunettes && this.lunettes.portees;
    const [a] = versEcran(x0 + RUE_LA.debut - 20, 0), [b] = versEcran(x0 + RUE_LA.fin + 20, 0);
    if (b < -50 || a > W + 50) return;
    const ecran = (dx) => versEcran(x0 + dx, this.sol(x0 + dx));
    // Trottoir
    const [t0, ty0] = ecran(RUE_LA.debut - 5), [t1] = ecran(RUE_LA.fin + 5);
    ctx.fillStyle = '#b0aca4'; ctx.fillRect(t0, ty0 - 0.12 * s, t1 - t0, 0.25 * s);
    for (const [ix, w, h, c] of RUE_LA.immeubles) {
      const [sx, sy] = ecran(ix);
      dessinerImmeubleLA(ctx, sx, sy, s, w, h, c);
    }
    for (const px of RUE_LA.palmiers) { const [sx, sy] = ecran(px); dessinerPalmier(ctx, sx, sy, s, px); }
    for (const pn of RUE_LA.panneaux) { const [sx, sy] = ecran(pn.x); dessinerPanneauPub(ctx, sx, sy, s, pn, vrai); }
    const [bx, by] = ecran(RUE_LA.banc);
    dessinerBanc(ctx, bx, by, s, !this.lunettes);
    // On remarque les lunettes en passant, une fois.
    if (!this.lunettes && !this.lunettesVues && Math.abs(this.p.x - x0 - RUE_LA.banc) < RUE_LA.vu) {
      this.lunettesVues = true;
      this.dire('🕶 Sur un banc, quelqu’un a oublié une paire de lunettes de soleil.');
    }
  },

  // Lunettes portées : toute la scène en noir et blanc, un peu plus contrastée (avant l'affichage du HUD).
  dessinerLunettes(ctx, W, H) {
    if (!this.terre || !this.lunettes || !this.lunettes.portees) return;
    ctx.save();
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'hsl(0,0%,50%)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(150,150,150,0.35)'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },
});

// Immeuble bas de Los Angeles : crépi clair, toit plat, fenêtres, auvent.
function dessinerImmeubleLA(ctx, x, y, s, w, h, c) {
  ctx.fillStyle = c; ctx.fillRect(x - w / 2 * s, y - h * s, w * s, h * s);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x - w / 2 * s, y - h * s, w * s, 0.4 * s);   // corniche
  ctx.fillStyle = '#4e6a7a';
  for (let fy = 2.2; fy < h - 1; fy += 3) for (let fx = -w / 2 + 1.5; fx < w / 2 - 1.5; fx += 3) ctx.fillRect(x + fx * s, y - (fy + 1.4) * s, 1.4 * s, 1.4 * s);
  ctx.fillStyle = '#2e7d32'; ctx.fillRect(x - 2 * s, y - 2.6 * s, 4 * s, 0.4 * s);   // auvent
  ctx.fillStyle = '#5d4037'; ctx.fillRect(x - 0.6 * s, y - 2.2 * s, 1.2 * s, 2.2 * s);   // porte
}
// Palmier de boulevard : tronc fin et très haut, couronne de palmes.
function dessinerPalmier(ctx, x, y, s, graine) {
  const h = 7.5 + (graine % 3), pench = ((graine % 3) - 1) * 0.6;
  ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 0.35 * s; ctx.beginPath(); ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + pench * s, y - h * 0.6 * s, x + pench * 1.5 * s, y - h * s); ctx.stroke();
  const cx = x + pench * 1.5 * s, cy = y - h * s;
  ctx.strokeStyle = '#33691e'; ctx.lineWidth = 0.22 * s;
  for (let i = 0; i < 7; i++) {
    const ang = Math.PI * (0.1 + i * 0.13), dx = Math.cos(ang) * 2.6 * s, dy = -Math.sin(ang) * 1.2 * s;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + dx * 0.6, cy + dy - 0.6 * s, cx + dx, cy + dy + 1.2 * s); ctx.stroke();
  }
}
// Panneau publicitaire sur deux poteaux. Sans les lunettes : la publicité ; avec : le vrai message.
function dessinerPanneauPub(ctx, x, y, s, pn, vrai) {
  const w = 8, h = 3.5, haut = 4.5;
  ctx.fillStyle = '#546e7a'; ctx.fillRect(x - 2.6 * s, y - haut * s, 0.25 * s, haut * s); ctx.fillRect(x + 2.4 * s, y - haut * s, 0.25 * s, haut * s);
  const gx = x - w / 2 * s, gy = y - (haut + h) * s;
  ctx.fillStyle = '#263238'; ctx.fillRect(gx - 0.15 * s, gy - 0.15 * s, (w + 0.3) * s, (h + 0.3) * s);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (vrai) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(gx, gy, w * s, h * s);
    ctx.fillStyle = '#000000'; ctx.font = `900 ${(pn.vrai.length > 5 ? 0.95 : 1.6) * s}px Impact, 'Arial Black', system-ui`;
    ctx.fillText(pn.vrai, x, gy + h / 2 * s);
  } else {
    ctx.fillStyle = pn.fond; ctx.fillRect(gx, gy, w * s, h * s);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(gx + w * 0.82 * s, gy + h * 0.5 * s, 1.1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${0.85 * s}px system-ui`; ctx.fillText(pn.pub[0], x, gy + h * 0.38 * s);
    ctx.font = `${0.42 * s}px system-ui`; ctx.fillText(pn.pub[1], x, gy + h * 0.72 * s);
  }
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
}
// Banc de rue, avec les lunettes posées dessus tant qu'on ne les a pas prises.
function dessinerBanc(ctx, x, y, s, avecLunettes) {
  ctx.fillStyle = '#37474f'; ctx.fillRect(x - 0.9 * s, y - 0.45 * s, 0.12 * s, 0.45 * s); ctx.fillRect(x + 0.8 * s, y - 0.45 * s, 0.12 * s, 0.45 * s);
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - 1 * s, y - 0.5 * s, 2 * s, 0.12 * s); ctx.fillRect(x - 1 * s, y - 1 * s, 2 * s, 0.1 * s); ctx.fillRect(x - 1 * s, y - 0.8 * s, 2 * s, 0.1 * s);
  if (!avecLunettes) return;
  ctx.fillStyle = '#111'; ctx.fillRect(x - 0.05 * s, y - 0.62 * s, 0.2 * s, 0.11 * s); ctx.fillRect(x + 0.2 * s, y - 0.62 * s, 0.2 * s, 0.11 * s);
  ctx.fillRect(x + 0.14 * s, y - 0.6 * s, 0.07 * s, 0.03 * s);
}
