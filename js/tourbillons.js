'use strict';
// ---------- Tourbillons de poussière sur Mars, et une colonie minière (Ghosts of Mars) ----------
// En vrai : très fréquents l'après-midi, quand le sol chauffé fait monter l'air. Spirit et Opportunity en ont filmé
// des dizaines (en 2005, l'un d'eux a même nettoyé les panneaux solaires de Spirit). Larges de 10 à 100 m, hauts
// de quelques centaines de mètres à plus de 8 km, ils avancent avec le vent (1 à 7 m/s) et durent quelques minutes.
// L'air de Mars est cent fois moins dense que sur Terre : un tourbillon ne renverse personne.
// Le clin d'œil : près d'une colonie minière abandonnée, un tourbillon géant ne se dissipe jamais. Lui, il emporte.

const TOURBILLONS = {
  max: 6,                       // en même temps, dans les environs, au plus chaud de l'après-midi
  zone: 3000,                   // m autour du spationaute
  vieMin: 3 * 60, vieMax: 15 * 60,
  surLeChemin: 0.15,            // part de ceux qui passent sur le chemin (les autres sont au loin)
};
const EGG_COLONIE = { id: 'mars-colonie', astre: 'mars', dx: 2000, dessin: 'colonieMiniere',
  texte: 'Une colonie minière, silencieuse. Les engins sont à l’arrêt, les portes ouvertes, pas une lumière. Les mineurs ne répondent plus, et le vent ne tombe jamais tout à fait.' };
EASTER_EGGS.push(EGG_COLONIE);
const GEANT = { ecart: 260, rayon: 45, hauteur: 7000, alerte: 180, radio: 400, montee: 4 };
const CAUSE_GEANT = 'dans le tourbillon qui ne retombe jamais, très haut au-dessus du sol';

Object.assign(Exploration.prototype, {
  xGeant() { return this.posLibre(xEgg(this.astre, EGG_COLONIE)) + GEANT.ecart; },

  // Appelé à chaque pas. Renvoie true si l'on est emporté (plus de commandes).
  majTourbillons(dt) {
    if (this.astre.id !== 'mars' || this.terre) return false;
    if (this.emporte) return this.majEmporte(dt);
    const a = this.astre, p = this.p;
    this.msgTourb = this.msgTourb || {};
    // Naissance et vie : surtout l'après-midi, quand le sol est chaud ; aucun la nuit.
    const chaleur = chaleurLocale(a, tempsCiel(this.vol), this.vol);
    const cible = Math.round(TOURBILLONS.max * Math.max(0, (chaleur - 0.5) / 0.5));
    let l = this.tourbillons;
    if (!l) { l = []; for (let i = 0; i < cible; i++) l.push(this.nouveauTourbillon(true)); }
    for (const t of l) { t.age += dt; t.x += t.vx * dt; }
    l = l.filter((t) => t.age < t.vie && distSol(a, t.x, p.x) < TOURBILLONS.zone * 1.3);
    if (l.length < cible && Math.random() < dt / 45) l.push(this.nouveauTourbillon(false));
    this.tourbillons = l;
    // Un tourbillon passe sur le chemin : beaucoup de poussière, rien de plus.
    this.dansPoussiere = 0;
    for (const t of l) {
      if (t.prof !== 0) continue;
      const d = distSol(a, t.x, p.x);
      if (d < t.r) {
        this.dansPoussiere = Math.max(this.dansPoussiere, 1 - d / t.r);
        if (!t.vu) { t.vu = true; this.dire('🌪 Un tourbillon de poussière vous traverse : tout devient brun, la poussière crépite sur la visière, puis il s’éloigne. L’air de Mars est cent fois moins dense que sur Terre : il ne peut pas vous renverser.'); }
      }
    }
    // La colonie et son tourbillon géant.
    const xc = this.posLibre(xEgg(a, EGG_COLONIE)), xg = this.xGeant();
    if (distSol(a, p.x, xc) < GEANT.radio && !this.msgTourb.radio) {
      this.msgTourb.radio = true;
      this.dire('📻 Un signal faible, haché par le vent, sur la fréquence d’une colonie minière. Personne ne répond aux appels. Puis plus que du souffle.');
    }
    const dg = distSol(a, p.x, xg);
    if (dg < GEANT.alerte && !this.msgTourb.geant) {
      this.msgTourb.geant = true;
      this.dire('⚠ 🌪 Ce tourbillon-là est énorme. Il ne bouge pas avec le vent, et il ne se dissipe pas. N’approchez pas.');
    }
    this.dansPoussiere = Math.max(this.dansPoussiere, Math.max(0, 1 - (dg - GEANT.rayon) / 120) * 0.6);
    // Base sur Mars : une ligne au journal de bord, une seule fois.
    const v = etat.enVoyage && etat.voyage;
    if (v && eggTrouve(EGG_COLONIE.id) && !v.ligneColonie && (v.bases || []).some((b) => b.astre === 'mars')) {
      v.ligneColonie = true;
      v.journal.push({ t: v.t, texte: '📻 Les anciens occupants ne sont pas tous partis.' });
    }
    // Dans le tourbillon géant : on est emporté.
    const d = this.duo, dLibre = d && !d.enRover && !d.dansModule && !d.dansSecours;
    if (dg < GEANT.rayon) {
      this.emporte = { t: 0, vy: 0, avec: d && (d.enRover || (dLibre && distSol(a, d.p.x, xg) < GEANT.rayon)) };
      this.warp = 1;
      this.dire(this.type === 'robot' ? '⚠ 🌪 Le tourbillon soulève le robot !' : '⚠ 🌪 Le tourbillon vous soulève : impossible de vous accrocher à quoi que ce soit !');
      return true;
    }
    if (dLibre && distSol(a, d.p.x, xg) < GEANT.rayon && this.type === 'spationaute') this.mourirSortie(d, CAUSE_GEANT);
    return false;
  },

  nouveauTourbillon(auHasard) {
    const p = this.p, chemin = Math.random() < TOURBILLONS.surLeChemin;
    const r = 5 + Math.pow(Math.random(), 2) * 55;
    const vie = TOURBILLONS.vieMin + Math.random() * (TOURBILLONS.vieMax - TOURBILLONS.vieMin);
    // Au loin : dans le champ de vision (plus il est loin, plus le champ est large).
    const prof = chemin ? 0 : 200 + Math.random() * 4000;
    return {
      x: p.x + (Math.random() * 2 - 1) * (chemin ? 500 : prof * 0.8), prof,
      r, H: Math.min(8000, r * (15 + Math.random() * 45)), vx: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random() * 6),
      age: auHasard ? Math.random() * vie * 0.8 : 0, vie, phase: Math.random() * 10,
    };
  },

  // Emporté : on monte de plus en plus vite en tournoyant, puis le noir.
  majEmporte(dt) {
    const E = this.emporte, p = this.p;
    E.t += dt; this.warp = 1;
    E.vy = Math.min(60, E.vy + 18 * dt);
    p.y += E.vy * dt; p.vy = E.vy; p.vx = 0; p.auSol = false;
    p.x = this.xGeant() + Math.sin(E.t * 2.5) * GEANT.rayon * 0.3;
    if (E.avec && this.duo) { this.duo.p.x = p.x - 1.5; this.duo.p.y = p.y + 1; }
    this.dansPoussiere = 1;
    if (E.t >= GEANT.montee && !E.fini) {
      E.fini = true;
      if (this.type === 'robot') { this.terminer('perdu', 'Le robot a été emporté par un tourbillon géant, et n’est jamais retombé à portée de radio.'); return true; }
      if (E.avec && this.duo) this.perdreDuo(CAUSE_GEANT);
      this.mourirSortie(this, CAUSE_GEANT);
    }
    return true;
  },

  // Au loin, derrière le terrain : de fines colonnes de poussière qui glissent lentement (parallaxe).
  dessinerTourbillonsLoin(ctx, W, yH, echelle) {
    if (this.astre.id !== 'mars' || this.terre) return;
    const a = this.astre, p = this.p, lum = 0.35 + 0.65 * LUMIERE_SOL;
    for (const t of this.tourbillons || []) {
      if (t.prof === 0) continue;
      const f = 1 + t.prof / 25, sx = W / 2 + (ecartSol(a, t.x, p.x) * echelle) / f, w = (t.r * echelle) / f;
      if (sx + w * 3 < 0 || sx - w * 3 > W) continue;
      const fondu = Math.min(1, t.age / 40, (t.vie - t.age) / 60);
      colonnePoussiere(ctx, sx, yH, w, Math.min((t.H * echelle) / f, yH + 40), 0.55 * fondu * lum, t.phase, false);
    }
    // Le géant, vu de loin : une colonne sombre sur l'horizon.
    // De loin seulement : il s'efface quand on approche, la vue de près prend le relais.
    const dg = ecartSol(a, this.xGeant(), p.x), loin = Math.max(0, Math.min(1, (Math.abs(dg) - 60) / 200));
    if (loin > 0) {
      const f = 1 + 600 / 25, sx = W / 2 + (dg * echelle) / f, w = (GEANT.rayon * echelle) / f;
      if (sx + w * 3 > 0 && sx - w * 3 < W) colonnePoussiere(ctx, sx, yH, w, yH + 40, 0.75 * lum * loin, 3.3, true);
    }
  },

  // Sur le chemin, devant tout : les tourbillons qui passent, le géant de près, la poussière qui voile l'écran.
  dessinerTourbillonsPres(ctx, versEcran, echelle, W, H) {
    if (this.astre.id !== 'mars' || this.terre) return;
    const lum = 0.35 + 0.65 * LUMIERE_SOL;
    // Écran : centre du tourbillon, et base au plus bas du sol qu'il couvre (sur une pente, il touche le sol partout).
    const gy = (x, r) => {
      const [sx] = versEcran(x, this.sol(x));
      let y = -Infinity;
      for (let k = -4; k <= 4; k++) y = Math.max(y, versEcran(x + (k / 4) * r, this.sol(x + (k / 4) * r))[1]);
      return [sx, Math.min(y, H)];
    };
    for (const t of this.tourbillons || []) {
      if (t.prof !== 0) continue;
      const w = t.r * echelle, [sx, sy] = gy(t.x, t.r);
      if (sx + w * 2 < 0 || sx - w * 2 > W) continue;
      const fondu = Math.min(1, t.age / 40, (t.vie - t.age) / 60);
      colonnePoussiere(ctx, sx, sy, w, sy + 40, 0.28 * fondu * lum, t.phase, false);
    }
    const xg = this.xGeant(), [gx, gyy] = gy(xg, GEANT.rayon), wg = GEANT.rayon * echelle;
    if (gx + wg * 2 > 0 && gx - wg * 2 < W) colonnePoussiere(ctx, gx, gyy, wg, gyy + 40, 0.6 * lum, 3.3, true);
    if (this.dansPoussiere > 0) {
      ctx.fillStyle = `rgba(150,85,50,${0.55 * this.dansPoussiere * lum})`; ctx.fillRect(0, 0, W, H);
      const t = performance.now() / 1000;
      ctx.fillStyle = `rgba(210,150,110,${0.5 * this.dansPoussiere})`;
      for (let i = 0; i < 80; i++) {
        const u = (i * 0.618 + t * (0.6 + (i % 7) * 0.1)) % 1, v = ((i * 0.37) % 1);
        ctx.fillRect(u * W, (v * H + Math.sin(t * 3 + i) * 30) % H, 2, 2);
      }
    }
  },
});

// Colonne de poussière : étroite au sol, évasée en haut, qui s'efface en montant ; des anneaux montent en tournant.
function colonnePoussiere(ctx, x, ySol, w, h, alpha, phase, geant) {
  if (alpha <= 0.01) return;
  const coul = geant ? '110,55,35' : '176,108,70';
  const g = ctx.createLinearGradient(0, ySol, 0, ySol - h);
  g.addColorStop(0, `rgba(${coul},${alpha})`); g.addColorStop(0.6, `rgba(${coul},${alpha * 0.6})`); g.addColorStop(1, `rgba(${coul},0)`);
  ctx.fillStyle = g;
  const t = performance.now() / 1000, ondule = Math.sin(t * 0.7 + phase) * w * 0.25;
  ctx.beginPath();
  // w : rayon au sol (celui qui compte pour le géant) ; la colonne s'évase vers le haut.
  ctx.moveTo(x - w, ySol);
  ctx.quadraticCurveTo(x - w * 1.05 + ondule, ySol - h * 0.4, x - w * 1.8 + ondule * 2, ySol - h);
  ctx.lineTo(x + w * 1.8 + ondule * 2, ySol - h);
  ctx.quadraticCurveTo(x + w * 1.05 + ondule, ySol - h * 0.4, x + w, ySol);
  ctx.closePath(); ctx.fill();
  if (w < 150) {
    // De loin : des anneaux qui montent, le mouvement tournant.
    ctx.strokeStyle = `rgba(${geant ? '70,30,20' : '200,140,100'},${alpha * 0.8})`; ctx.lineWidth = Math.max(1, w * 0.06);
    for (let k = 0; k < 6; k++) {
      const u = (t * (geant ? 0.25 : 0.12) + k / 6 + phase) % 1, yy = ySol - u * h * 0.7, ww = w * (1 + 0.6 * u);
      ctx.beginPath(); ctx.ellipse(x + ondule * u * 2, yy, ww, Math.max(1, ww * 0.12), 0, 0, Math.PI * 2); ctx.stroke();
    }
  } else {
    // De près : des grains qui tournent autour de l'axe et montent ; ceux de devant plus clairs.
    for (let i = 0; i < 160; i++) {
      const u = (i / 160 + t * (geant ? 0.08 : 0.04)) % 1, ang = t * (geant ? 2.2 : 1.2) + i * 2.39;
      const ww = w * (1 + 0.8 * u), px = x + Math.cos(ang) * ww + ondule * u * 2, py = ySol - u * Math.min(h, 2000);
      ctx.fillStyle = `rgba(${Math.sin(ang) > 0 ? '225,170,130' : '110,60,35'},${Math.min(1, alpha * 1.3)})`;
      ctx.fillRect(px, py, 8, 3);
    }
  }
  // Base : la poussière soulevée au sol.
  ctx.fillStyle = `rgba(${coul},${alpha * 0.7})`;
  ctx.beginPath(); ctx.ellipse(x, ySol, w * 1.3, Math.max(2, Math.min(w * 0.15, 40)), 0, 0, Math.PI * 2); ctx.fill();
}

// Colonie minière abandonnée : deux hangars en demi-cylindre, un chevalement de mine, un tapis roulant à l'arrêt.
DESSINS_EGGS.colonieMiniere = function (ctx, x, y, s) {
  const ombre = '#5d4037', toit = '#8d6e63', fer = '#4e342e';
  for (const [dx, L, h] of [[-6, 5, 2.6], [-0.5, 4, 2.2]]) {   // hangars
    ctx.fillStyle = toit; ctx.beginPath(); ctx.ellipse(x + (dx + L / 2) * s, y, (L / 2) * s, h * s, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = ombre; ctx.lineWidth = Math.max(1, 0.06 * s);
    for (let k = 1; k < 5; k++) { const u = k / 5; ctx.beginPath(); ctx.moveTo(x + (dx + L * u) * s, y); ctx.lineTo(x + (dx + L * u) * s, y - h * s * Math.sin(Math.PI * u)); ctx.stroke(); }
  }
  rect(ctx, x - 4.2 * s, y - 1.6 * s, 1.1 * s, 1.6 * s, '#1b0f0b');   // porte ouverte, noire
  rect(ctx, x + 0.6 * s, y - 1.1 * s, 0.5 * s, 0.4 * s, '#2a1a14');   // fenêtre éteinte
  // Chevalement : deux montants en A et une roue en haut.
  trait(ctx, [[x + 4.5 * s, y], [x + 5.6 * s, y - 6 * s], [x + 6.7 * s, y]], fer, 0.18 * s);
  trait(ctx, [[x + 4.9 * s, y - 2 * s], [x + 6.3 * s, y - 2 * s]], fer, 0.12 * s);
  ctx.strokeStyle = fer; ctx.lineWidth = 0.12 * s; ctx.beginPath(); ctx.arc(x + 5.6 * s, y - 6 * s, 0.7 * s, 0, Math.PI * 2); ctx.stroke();
  // Tapis roulant incliné, à l'arrêt, avec un tas de minerai.
  trait(ctx, [[x + 3.3 * s, y - 0.3 * s], [x + 7.5 * s, y - 3.2 * s]], '#6d4c41', 0.22 * s);
  ctx.fillStyle = '#a1662f'; ctx.beginPath(); ctx.moveTo(x + 7 * s, y); ctx.quadraticCurveTo(x + 8.2 * s, y - 2.4 * s, x + 9.4 * s, y); ctx.fill();
  // Une antenne penchée.
  trait(ctx, [[x - 6.5 * s, y - 2 * s], [x - 7.2 * s, y - 4.8 * s]], fer, 0.08 * s);
};
