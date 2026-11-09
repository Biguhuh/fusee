'use strict';
// ---------- Silhouettes des objets artificiels ----------
// Chaque télescope ou sonde a sa vraie forme, simplifiée : tube et panneaux de Hubble, miroir doré de James Webb…
// Dessin sur une boîte d'environ 40 unités de large, centrée sur (x, y) ; L : largeur à l'écran, en pixels.

const COUL_OBJ = { argent: '#cfd8dc', ombre: '#90a4ae', fonce: '#455a64', or: '#ffca28', orFonce: '#c79100', blanc: '#eceff1', noir: '#1b1b1b', panneau: '#1a237e', grille: '#5c6bc0' };

// Panneau solaire : cellules bleu nuit et leur grille.
function panneauSolaire(ctx, x, y, w, h, n = 4) {
  ctx.fillStyle = COUL_OBJ.panneau; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = COUL_OBJ.grille; ctx.lineWidth = 0.4;
  const long = w > h;
  for (let i = 1; i < n; i++) {
    ctx.beginPath();
    if (long) { ctx.moveTo(x + (i * w) / n, y); ctx.lineTo(x + (i * w) / n, y + h); } else { ctx.moveTo(x, y + (i * h) / n); ctx.lineTo(x + w, y + (i * h) / n); }
    ctx.stroke();
  }
  ctx.strokeRect(x, y, w, h);
}
// Cylindre vu de côté, de x0 à x1, rayon r, avec un dégradé pour le volume.
function cylindreObjet(ctx, x0, x1, y, r, c1 = COUL_OBJ.blanc, c2 = COUL_OBJ.ombre) {
  const g = ctx.createLinearGradient(0, y - r, 0, y + r);
  g.addColorStop(0, c2); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x0, y - r, x1 - x0, 2 * r);
}
// Cylindre debout, de y0 à y1.
function cylindreDebout(ctx, x, y0, y1, r, c1 = COUL_OBJ.blanc, c2 = COUL_OBJ.ombre) {
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, c2); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(x - r, y0, 2 * r, y1 - y0);
}
function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function trait(ctx, x0, y0, x1, y1, c = COUL_OBJ.ombre, l = 0.8) { ctx.strokeStyle = c; ctx.lineWidth = l; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
function hexagone(ctx, x, y, r, c) {
  ctx.fillStyle = c; ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i + Math.PI / 6; ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  ctx.closePath(); ctx.fill();
}

const SILHOUETTES = {
  // Tube argenté, deux ailes de panneaux, porte d'ouverture levée à l'avant.
  hubble(ctx) {
    panneauSolaire(ctx, -4.5, -20, 4, 14, 6); panneauSolaire(ctx, -4.5, 6, 4, 14, 6);
    trait(ctx, -2.5, -6, -2.5, 6, COUL_OBJ.fonce, 1);
    cylindreObjet(ctx, -15, -5, 0, 6);                     // compartiment des instruments, plus large
    cylindreObjet(ctx, -5, 13, 0, 5);
    for (const x of [-11, -8, 2, 7]) trait(ctx, x, -5, x, 5, COUL_OBJ.ombre, 0.5);
    rect(ctx, 12.5, -4.5, 1, 9, COUL_OBJ.noir);              // ouverture
    ctx.fillStyle = COUL_OBJ.argent; ctx.beginPath(); ctx.moveTo(13, -5); ctx.lineTo(18, -12); ctx.lineTo(19, -11); ctx.lineTo(14, -4.5); ctx.fill();   // porte
  },
  // Très long tube, panneaux à l'arrière.
  chandra(ctx) {
    panneauSolaire(ctx, -16, -17, 5, 12, 4); panneauSolaire(ctx, -16, 5, 5, 12, 4);
    cylindreObjet(ctx, -19, 17, 0, 3.6, '#fff3c4', COUL_OBJ.orFonce);
    rect(ctx, -19, -4.5, 6, 9, COUL_OBJ.argent);
    rect(ctx, 16.5, -3.2, 1, 6.4, COUL_OBJ.noir);
  },
  // Trois tubes côte à côte, module de service et panneaux.
  xmm(ctx) {
    panneauSolaire(ctx, -19, -19, 4, 11, 4); panneauSolaire(ctx, -19, 8, 4, 11, 4);
    for (const y of [-5, 0, 5]) cylindreObjet(ctx, -13, 16, y, 2.3);
    rect(ctx, -16, -8, 4, 16, COUL_OBJ.orFonce);
    for (const y of [-5, 0, 5]) rect(ctx, 15.5, y - 1.8, 1, 3.6, COUL_OBJ.noir);
  },
  // Petit boîtier doré, quatre caméras levées, deux panneaux.
  tess(ctx) {
    panneauSolaire(ctx, -20, -2, 14, 4, 5); panneauSolaire(ctx, 6, -2, 14, 4, 5);
    rect(ctx, -6, -4, 12, 9, COUL_OBJ.or);
    for (const x of [-4.4, -1.5, 1.5, 4.4]) { cylindreDebout(ctx, x, -12, -4, 1.3, COUL_OBJ.argent, COUL_OBJ.fonce); rect(ctx, x - 1.3, -12.5, 2.6, 1, COUL_OBJ.noir); }
  },
  // Miroir doré de 18 hexagones, sur le pare-soleil en losange.
  jwst(ctx) {
    ctx.fillStyle = '#b39ddb'; ctx.beginPath(); ctx.moveTo(-20, 9); ctx.lineTo(0, 15); ctx.lineTo(20, 9); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ede7f6'; ctx.lineWidth = 0.5;
    for (const k of [0.7, 0.4]) { ctx.beginPath(); ctx.moveTo(-20 * k, 9); ctx.lineTo(0, 9 + 6 * k); ctx.lineTo(20 * k, 9); ctx.lineTo(0, 9 - 5 * k); ctx.closePath(); ctx.stroke(); }   // couches du pare-soleil
    const r = 2.3, dx = r * Math.sqrt(3), cy = -5;
    const cases = [];
    for (let q = -2; q <= 2; q++) for (let s = -2; s <= 2; s++) { const t = -q - s; if (Math.max(Math.abs(q), Math.abs(s), Math.abs(t)) <= 2 && !(q === 0 && s === 0)) cases.push([dx * (q + s / 2), cy + 1.5 * r * s]); }
    for (const [x, y] of cases) hexagone(ctx, x, y, r * 0.95, (x + y) % 3 > 0 ? COUL_OBJ.or : '#ffd54f');
    for (const a of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) trait(ctx, 0, cy, 8.5 * Math.cos(a), cy + 8.5 * Math.sin(a), COUL_OBJ.fonce, 0.6);
    ctx.fillStyle = COUL_OBJ.fonce; ctx.beginPath(); ctx.arc(0, cy, 1.2, 0, 2 * Math.PI); ctx.fill();
  },
  // Tube blanc derrière un pare-soleil plat couvert de cellules.
  euclid(ctx) {
    cylindreObjet(ctx, -8, 12, -1, 6);
    rect(ctx, 11.5, -6, 1, 10, COUL_OBJ.noir);
    rect(ctx, -10, 6, 16, 6, COUL_OBJ.orFonce);              // module de service
    panneauSolaire(ctx, -12, -14, 3, 28, 6);                 // pare-soleil
  },
  // Boîtier, deux grands panneaux, petite antenne.
  soho(ctx) {
    panneauSolaire(ctx, -22, -3, 15, 6, 5); panneauSolaire(ctx, 7, -3, 15, 6, 5);
    rect(ctx, -7, -7, 14, 14, COUL_OBJ.or); rect(ctx, -7, -7, 14, 5, COUL_OBJ.argent);
    trait(ctx, 3, 7, 6, 11, COUL_OBJ.fonce); ctx.fillStyle = COUL_OBJ.blanc; ctx.beginPath(); ctx.ellipse(6.5, 11.5, 2.5, 1, 0.5, 0, 2 * Math.PI); ctx.fill();
  },
  // Grand pare-soleil en disque (presque de profil), la tente des instruments au-dessus.
  gaia(ctx) {
    ctx.fillStyle = COUL_OBJ.argent; ctx.beginPath(); ctx.ellipse(0, 7, 20, 4.5, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = COUL_OBJ.panneau; ctx.beginPath(); ctx.ellipse(0, 6, 20, 4, 0, Math.PI, 2 * Math.PI); ctx.fill();
    cylindreDebout(ctx, 0, -9, 5, 6.5, '#fff3c4', COUL_OBJ.orFonce);
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.ellipse(0, -9, 6.5, 1.8, 0, 0, 2 * Math.PI); ctx.fill();
  },
  // Tube debout, panneau courbe sur le côté, plateforme dorée en bas.
  spitzer(ctx) {
    cylindreDebout(ctx, -2, -15, 9, 5.5);
    rect(ctx, -7.5, -15.5, 11, 1.2, COUL_OBJ.noir);
    ctx.fillStyle = COUL_OBJ.panneau; ctx.beginPath(); ctx.moveTo(5, -14); ctx.quadraticCurveTo(10, -2, 5, 10); ctx.lineTo(8, 10); ctx.quadraticCurveTo(13, -2, 8, -14); ctx.closePath(); ctx.fill();
    rect(ctx, -9, 9, 14, 5, COUL_OBJ.or);
  },
  // Tube à pare-soleil coupé en biais, panneau sur le côté.
  kepler(ctx) {
    cylindreDebout(ctx, -2, -10, 10, 6, COUL_OBJ.argent, COUL_OBJ.fonce);
    ctx.fillStyle = COUL_OBJ.ombre; ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(4, -17); ctx.lineTo(4, -10); ctx.closePath(); ctx.fill();
    panneauSolaire(ctx, 5, -9, 4, 22, 5);
    rect(ctx, -9, 10, 14, 4, COUL_OBJ.or);
  },
  // Bouclier thermique blanc face au Soleil, la sonde à l'abri derrière, petites ailes de panneaux.
  parker(ctx) {
    trait(ctx, 8, 0, 22, 0, COUL_OBJ.ombre, 0.6);              // mât du magnétomètre
    panneauSolaire(ctx, 6, -9, 3, 5, 2); panneauSolaire(ctx, 6, 4, 3, 5, 2);
    rect(ctx, -2, -4, 12, 8, COUL_OBJ.or);
    trait(ctx, -6, -6, -2, -3, COUL_OBJ.fonce); trait(ctx, -6, 6, -2, 3, COUL_OBJ.fonce);
    ctx.fillStyle = COUL_OBJ.blanc; ctx.beginPath(); ctx.ellipse(-8, 0, 2.5, 11, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = COUL_OBJ.ombre; ctx.lineWidth = 0.5; ctx.stroke();
  },
  // Grande antenne parabolique, boîtier doré, deux ailes de panneaux.
  mro(ctx) {
    panneauSolaire(ctx, 6, -9, 15, 5, 5); panneauSolaire(ctx, 6, 4, 15, 5, 5);
    trait(ctx, 2, -5, 8, -7); trait(ctx, 2, 5, 8, 7);
    rect(ctx, -5, -5, 10, 10, COUL_OBJ.or);
    ctx.fillStyle = COUL_OBJ.blanc; ctx.beginPath(); ctx.ellipse(-12, 0, 3, 12, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = COUL_OBJ.argent; ctx.beginPath(); ctx.ellipse(-11.3, 0, 2, 10.5, 0, 0, 2 * Math.PI); ctx.fill();
    trait(ctx, -9, 0, -5, 0, COUL_OBJ.fonce);
  },
  // Objet sans dessin à lui : boîtier et deux panneaux.
  generique(ctx) {
    panneauSolaire(ctx, -18, -3, 12, 6, 4); panneauSolaire(ctx, 6, -3, 12, 6, 4);
    rect(ctx, -6, -6, 12, 12, COUL_OBJ.or);
  },
};

function dessinerObjetArtificiel(ctx, a, x, y, L, opts = {}) {
  const k = L / 40, f = SILHOUETTES[a.id] || SILHOUETTES.generique;
  ctx.save(); ctx.translate(x, y);
  ctx.rotate(opts.angle !== undefined ? opts.angle : 0);
  ctx.scale(k, k);
  f(ctx);
  ctx.restore();
}
