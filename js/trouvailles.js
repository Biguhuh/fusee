'use strict';
// ---------- Aspect des trouvailles au sol (carte 6, point 5) ----------
// Deux catégories (liste complète : docs/carte6-echantillons.md) :
// - site : ce qu'on visite, à grande échelle (lac, cratère, coulée, panache, fissure, lit de rivière) ; on prélève au bord ;
// - échantillon : ce qu'on prélève, à petite échelle (roche, galet, tas de poussière, cristaux, bloc de glace…).
// Tailles en mètres, à l'échelle du personnage (1,8 m).

// [forme, couleur, taille (m)] ; clé « astre|nom » pour un aspect propre à un astre, sinon le nom seul.
const APPARENCES = {
  'Roche granitique': ['roche', '#c9b8a8', 0.3, true],
  'Plante': ['plante', '#43a047', 0.3],
  'Fossile': ['fossile', '#bfae94', 0.2],
  'Minéral': ['cristal', '#e0e0e0', 0.15],
  'Régolithe': ['tas', '#8d8d8d', 0.3],
  'mercure|Régolithe': ['tas', '#5d5a57', 0.3],
  'Basalte des mers': ['roche', '#4e4b48', 0.25],
  'Anorthosite': ['roche', '#e6e2dc', 0.25],
  'Billes de verre': ['tas', '#e08a3c', 0.3],
  'Poussière rouge': ['tas', '#b5552e', 0.3],
  'Ancien lit de rivière': ['lit', '#9c7b62', 12],
  'Basalte': ['roche', '#3f3a37', 0.3],
  'Glace enfouie': ['tranchee', '#eef6fb', 0.4],
  'Coulée de lave': ['coulee', '#2f2a28', 20],
  'io|Coulée de lave': ['coulee', '#3a1f14', 20, true],
  'Croûte de soufre': ['croute', '#d9c55a', 0.3],
  'Cratère': ['cratere', '#000000', 16],
  'Glace polaire': ['glace', '#dfeef7', 0.25],
  'Soufre': ['croute', '#f2d72a', 0.3],
  'Évent volcanique': ['panache', '#f6e7a6', 30],
  'Glace salée': ['glace', '#c9a98a', 0.25],
  'Fissure de la banquise': ['fissure', '#6d4c41', 14],
  'Sels marins': ['cristal', '#ffffff', 0.15],
  'Sable organique': ['tas', '#7a5a2e', 0.3],
  'Lac de méthane': ['lac', '#3b4150', 40],
  'Galet de glace': ['galet', '#d7d2c4', 0.15],
  'triton|Glace d’azote': ['glace', '#f3d9dc', 0.25],
  'Glace d’azote': ['glace', '#f4f1ea', 0.25],
  'Geyser d’azote': ['panache', '#4a4440', 30],
  'Glace d’eau': ['glace', '#e3eef5', 0.3],
  'Tholins': ['croute', '#8e4a32', 0.3],
  'Neige des geysers': ['tas', '#fbfdff', 0.3],
  'Rayure de tigre': ['fissure', '#5b6e7a', 14, true],
  'Givre': ['croute', '#f5fbff', 0.5],
  'Roche': ['roche', '#7b746e', 0.25],
  'Météorite': ['metal', '#6f6a66', 0.2],
  'Roche carbonée': ['roche', '#1f1d1c', 0.25],
  'Métal': ['metal', '#9aa1a8', 0.2],
};
// Formes « site » : à grande échelle, on prélève au bord.
const FORMES_SITE = ['lac', 'cratere', 'coulee', 'panache', 'fissure', 'lit'];
function apparenceTrouvaille(astreId, nom) {
  const a = APPARENCES[`${astreId}|${nom}`] || APPARENCES[nom] || ['roche', '#8a8079', 0.25];
  return { forme: a[0], couleur: a[1], taille: a[2], option: !!a[3], site: FORMES_SITE.includes(a[0]) };
}

// Bruit déterministe pour les formes (même aspect à chaque image).
function bruitTrouvaille(k, i) { const x = Math.sin(k * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x); }

// Dessin d'une trouvaille. sol(dx) : position à l'écran du sol, dx mètres après le repère ; e : pixels par mètre ;
// fait : déjà prélevée (plus pâle) ; t : temps (panaches qui bougent).
function dessinerTrouvaille(ctx, ap, k, sol, e, fait, t) {
  const [sx, sy] = sol(0), px = (m) => Math.max(2, m * e);
  ctx.save();
  if (fait) ctx.globalAlpha = 0.55;
  const c = ap.couleur;
  switch (ap.forme) {
    case 'roche': case 'metal': case 'fossile': {
      // Roche irrégulière, posée au sol.
      const w = px(ap.taille), h = w * 0.62;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(sx - w / 2, sy);
      for (let i = 0; i <= 6; i++) { const a = Math.PI * (1 - i / 6), r = 0.8 + 0.25 * bruitTrouvaille(k, i); ctx.lineTo(sx + Math.cos(a) * w / 2 * r, sy - Math.sin(a) * h * r); }
      ctx.closePath(); ctx.fill();
      if (ap.forme === 'metal') { ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(sx - w * 0.15, sy - h * 0.7, w * 0.3, Math.max(1, h * 0.12)); }
      if (ap.option) { ctx.fillStyle = 'rgba(40,30,30,0.6)'; for (let i = 0; i < 5; i++) ctx.fillRect(sx + (bruitTrouvaille(k, i + 9) - 0.5) * w * 0.6, sy - h * (0.2 + 0.5 * bruitTrouvaille(k, i + 3)), Math.max(1, w * 0.05), Math.max(1, w * 0.05)); }
      if (ap.forme === 'fossile') { ctx.strokeStyle = '#6d5d48'; ctx.lineWidth = Math.max(1, w * 0.04); ctx.beginPath(); for (let i = 0; i < 30; i++) { const a = i * 0.5, r = w * 0.012 * i; ctx.lineTo(sx + Math.cos(a) * r, sy - h * 0.45 + Math.sin(a) * r * 0.8); } ctx.stroke(); }
      break;
    }
    case 'galet': {
      const w = px(ap.taille);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy - w * 0.28, w / 2, w * 0.3, 0, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(sx - w * 0.12, sy - w * 0.4, w * 0.15, w * 0.07, 0, 0, 2 * Math.PI); ctx.fill();
      break;
    }
    case 'tas': {
      const w = px(ap.taille);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(sx, sy, w / 2, w * 0.28, 0, Math.PI, 0); ctx.fill();
      break;
    }
    case 'cristal': {
      const w = px(ap.taille);
      ctx.fillStyle = c; ctx.strokeStyle = 'rgba(120,140,160,0.8)'; ctx.lineWidth = 1;
      for (let i = -1; i <= 1; i++) { const hx = sx + i * w * 0.3, hh = w * (0.7 + 0.4 * bruitTrouvaille(k, i + 2)); ctx.beginPath(); ctx.moveTo(hx - w * 0.12, sy); ctx.lineTo(hx + i * w * 0.08, sy - hh); ctx.lineTo(hx + w * 0.12, sy); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      break;
    }
    case 'plante': {
      const h = px(ap.taille);
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, h * 0.06);
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + i * h * 0.1, sy - h * 0.6, sx + i * h * 0.25, sy - h * (0.7 + 0.3 * bruitTrouvaille(k, i + 3))); ctx.stroke(); }
      break;
    }
    case 'glace': {
      const w = px(ap.taille), h = w * 0.7;
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(sx - w / 2, sy); ctx.lineTo(sx - w * 0.38, sy - h); ctx.lineTo(sx + w * 0.3, sy - h * 0.92); ctx.lineTo(sx + w / 2, sy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(sx - w * 0.3, sy - h * 0.85, w * 0.35, Math.max(1, h * 0.1));
      break;
    }
    case 'croute': {
      // Fine couche au sol, qui épouse le terrain.
      const w = ap.taille;
      ctx.fillStyle = c; ctx.beginPath();
      const [ax, ay] = sol(-w / 2), [bx, by] = sol(w / 2);
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - Math.max(1.5, 0.04 * e)); ctx.lineTo(ax, ay - Math.max(1.5, 0.06 * e)); ctx.closePath(); ctx.fill();
      break;
    }
    case 'tranchee': {
      // Tranchée creusée : un creux sombre, la glace blanche au fond (Phoenix, 2008).
      const w = px(ap.taille);
      ctx.fillStyle = '#5a4a3f'; ctx.fillRect(sx - w / 2, sy - 1, w, Math.max(2, w * 0.25));
      ctx.fillStyle = c; ctx.fillRect(sx - w * 0.4, sy + Math.max(1, w * 0.12), w * 0.8, Math.max(1, w * 0.1));
      break;
    }
    case 'lac': {
      // Lac vu de côté, derrière le chemin : une grande surface plane, des reflets. Le repère est sur la rive.
      const L = ap.taille, n = 40, pts = [];
      for (let i = 0; i <= n; i++) pts.push(sol(1 + (L * i) / n));
      // La surface, vue en perspective, monte au-dessus du sol : vite près des rives, puis à plat.
      const prof = Math.max(4, 0.9 * e), haut = (i) => prof * Math.min(1, i / 3, (n - i) / 3);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(([x, y], i) => ctx.lineTo(x, y - haut(i)));
      for (let i = n; i >= 0; i--) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath(); ctx.fill();
      // Bord lointain du lac, plus clair (le ciel s'y reflète), et quelques reflets : visible même la nuit.
      ctx.strokeStyle = 'rgba(225,195,135,0.75)'; ctx.lineWidth = Math.max(1, 0.06 * e);
      ctx.beginPath();
      pts.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y - haut(i)); else ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.strokeStyle = 'rgba(225,195,135,0.45)'; ctx.lineWidth = Math.max(1, 0.04 * e);
      for (let i = 0; i < 7; i++) { const u = 0.12 + 0.11 * i, [x, y] = sol(1 + L * u), lg = L * (0.03 + 0.03 * bruitTrouvaille(k, i)) * e; ctx.beginPath(); ctx.moveTo(x - lg, y - prof * (0.25 + 0.3 * bruitTrouvaille(k, i + 4))); ctx.lineTo(x + lg, y - prof * (0.25 + 0.3 * bruitTrouvaille(k, i + 4))); ctx.stroke(); }
      break;
    }
    case 'cratere': {
      // Rempart de part et d'autre, cuvette plus sombre entre les deux.
      const R = ap.taille / 2, [ax, ay] = sol(-R), [bx, by] = sol(R);
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse((ax + bx) / 2, (ay + by) / 2, (bx - ax) / 2, Math.max(3, R * 0.25 * e), 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      for (const [x, y] of [[ax, ay], [bx, by]]) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(3, R * 0.3 * e), Math.max(2, R * 0.12 * e), 0, Math.PI, 0); ctx.fill(); }
      break;
    }
    case 'coulee': {
      // Plaques de lave figée ; sur Io, des fentes encore rougeoyantes.
      const L = ap.taille;
      for (let i = 0; i < 9; i++) {
        const u = -0.5 + i / 8, [x, y] = sol(L * u), w = L / 8 * e * (0.8 + 0.4 * bruitTrouvaille(k, i)), h = Math.max(2, 0.35 * e * (0.6 + bruitTrouvaille(k, i + 5)));
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, w / 2, h, 0, Math.PI, 0); ctx.fill();
        if (ap.option) { ctx.fillStyle = `rgba(255,${90 + 60 * bruitTrouvaille(k, i + 7)},30,${0.5 + 0.3 * Math.sin(t * 2 + i)})`; ctx.fillRect(x - w * 0.3, y - 1, w * 0.6, Math.max(1, h * 0.25)); }
      }
      break;
    }
    case 'panache': {
      // Panache qui monte de l'évent (à l'échelle du terrain : les vrais montent bien plus haut).
      const H = ap.taille;
      ctx.fillStyle = '#3b3530'; ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(3, 0.8 * e), Math.max(2, 0.3 * e), 0, Math.PI, 0); ctx.fill();
      for (let i = 0; i < 14; i++) {
        const u = ((i / 14 + t * 0.05) % 1), y = sy - u * H * e, r = Math.max(2, (0.5 + 4 * u) * e), dx = Math.sin(i * 1.7 + t) * r * 0.3;
        ctx.fillStyle = c; ctx.globalAlpha = (fait ? 0.55 : 1) * 0.35 * (1 - u);
        ctx.beginPath(); ctx.arc(sx + dx, y, r, 0, 2 * Math.PI); ctx.fill();
      }
      break;
    }
    case 'fissure': {
      // Fissure sombre bordée de deux crêtes ; la rayure de tigre fume un peu.
      const L = ap.taille, [ax, ay] = sol(-L / 2), [bx, by] = sol(L / 2);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (const [x, y] of [[ax, ay], [bx, by]]) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(3, L * 0.18 * e), Math.max(2, 0.6 * e), 0, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(sx - Math.max(3, 0.6 * e), sy); ctx.lineTo(sx, sy + Math.max(6, 2 * e)); ctx.lineTo(sx + Math.max(3, 0.6 * e), sy); ctx.closePath(); ctx.fill();
      if (ap.option) for (let i = 0; i < 6; i++) { const u = (i / 6 + t * 0.08) % 1; ctx.fillStyle = `rgba(240,248,255,${0.3 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(i + t) * 0.3 * e, sy - u * 6 * e, Math.max(2, (0.3 + u) * e), 0, 2 * Math.PI); ctx.fill(); }
      break;
    }
    case 'lit': {
      // Ancien lit de rivière : un chenal peu profond tapissé de galets arrondis.
      const L = ap.taille, [ax, ay] = sol(-L / 2), [bx, by] = sol(L / 2);
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse((ax + bx) / 2, (ay + by) / 2, (bx - ax) / 2, Math.max(2, 0.4 * e), 0, 0, Math.PI); ctx.fill();
      for (let i = 0; i < 18; i++) { const [x, y] = sol(L * (bruitTrouvaille(k, i) - 0.5)), r = Math.max(1.5, (0.05 + 0.08 * bruitTrouvaille(k, i + 20)) * e); ctx.fillStyle = i % 3 ? c : '#b89a80'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.5, r, r * 0.6, 0, 0, 2 * Math.PI); ctx.fill(); }
      break;
    }
  }
  ctx.restore();
}
