'use strict';
// ---------- Zones réelles à explorer (carte 6, point 6) ----------
// Relief simplifié de lieux réels, d'après leurs dimensions publiées. Le sol du jeu est une ligne (la longitude) :
// chaque profil est une coupe à travers la structure, posée dans le sens est-ouest à sa vraie longitude, et
// ajoutée au relief ordinaire. Profil : [distance au centre (km), altitude (km)], raccordé en douceur.
// Liste des zones et sources : docs/carte6-zones.md.
const ZONES_REELLES = {
  // Lune (dimensions : USGS / IAU, Wikipédia, LRO). ombre : fond dans la nuit permanente (comme le cratère polaire de Mercure).
  lune: [
    { id: 'tycho', nom: 'Cratère Tycho', lat: -43.31, lon: -11.36, poser: -15,
      profil: [[-60, 0], [-48, 0.3], [-42.5, 1], [-36, -2.5], [-30, -3.7], [-10, -3.7], [-4, -2], [0, -1.4], [4, -2], [10, -3.7], [30, -3.7], [36, -2.5], [42.5, 1], [48, 0.3], [60, 0]],
      detail: 'Cratère jeune (≈ 110 millions d’années), 85 km de diamètre, 4,7 km de profondeur ; un pic central d’≈ 2 km. Ses rayons clairs se voient de la Terre à l’œil nu. On se pose au fond, près du pic.' },
    { id: 'copernic', nom: 'Cratère Copernic', lat: 9.62, lon: -20.08, poser: -10,
      profil: [[-65, 0], [-52, 0.3], [-46.5, 0.9], [-40, -1.8], [-33, -2.9], [-12, -2.9], [-5, -2.1], [-2, -1.7], [0, -2.4], [2, -1.7], [5, -2.1], [12, -2.9], [33, -2.9], [40, -1.8], [46.5, 0.9], [52, 0.3], [65, 0]],
      detail: '93 km de diamètre, 3,8 km de profondeur, des parois en terrasses et des pics centraux d’≈ 1 km. On se pose au fond, près des pics.' },
    { id: 'shackleton', nom: 'Cratère Shackleton (pôle Sud)', lat: -89.67, lon: 129.78, poser: 0, ombre: true,
      profil: [[-16, 0], [-12, 0.2], [-10.5, 0.5], [-6, -2.4], [-3.3, -3.7], [3.3, -3.7], [6, -2.4], [10.5, 0.5], [12, 0.2], [16, 0]],
      detail: '21 km de diamètre, 4,2 km de profondeur, presque au pôle Sud. Le Soleil n’éclaire jamais le fond : nuit permanente, un des endroits les plus froids du Système solaire, où la glace d’eau peut se garder. On se pose au fond.' },
  ],
  mars: [
    { id: 'valles', nom: 'Valles Marineris', lat: -13.8, lon: -59.2, poser: -83.5,
      profil: [[-115, 0], [-100, -0.3], [-85, -6.5], [-60, -7], [-20, -6.2], [0, -5.5], [20, -6.5], [70, -7], [85, -6.6], [100, -0.3], [115, 0]],
      detail: 'Le plus grand canyon du Système solaire : plus de 4 000 km de long, jusqu’à 200 km de large et 7 km de profondeur. On se pose au fond, à 1,5 km du pied de la paroi.' },
    { id: 'olympus', nom: 'Olympus Mons', lat: 18.65, lon: -133.8, poser: -303,
      profil: [[-320, 0], [-300, 0.2], [-292, 6.2], [-200, 12], [-100, 18], [-42, 21.9], [-35, 19.5], [-25, 18.9], [25, 18.9], [35, 19.5], [42, 21.9], [100, 18], [200, 12], [292, 6.2], [300, 0.2], [320, 0]],
      detail: 'Le plus haut volcan du Système solaire : ≈ 22 km au-dessus de la plaine, 600 km de diamètre, bordé de falaises de 6 km. On se pose dans la plaine, au pied de l’escarpement.' },
    { id: 'hellas', nom: 'Hellas Planitia', lat: -42.4, lon: 70.5, poser: 0,
      // Coupe resserrée (±350 km au lieu de ±1 150) : le sol du jeu n'a pas de latitude, et le vrai bassin
      // recouvrirait Jezero, 7° plus à l'est (mais 60° plus au nord).
      profil: [[-350, 0], [-320, 1.5], [-280, -1], [-200, -5.5], [-100, -7], [0, -7.2], [100, -7], [200, -5.5], [280, -1], [320, 1.5], [350, 0]],
      detail: 'Un bassin d’impact de 2 300 km de diamètre et 7 km de profondeur : le point le plus bas de Mars, où l’air est le plus épais. On se pose au fond.' },
    { id: 'gale', nom: 'Cratère Gale et mont Sharp', lat: -5.4, lon: 137.8, poser: -26,
      profil: [[-90, 0], [-77, 0.6], [-70, -3], [-60, -4.5], [-25, -4.5], [-12, -2], [0, 1], [12, -2], [25, -4.5], [60, -4.5], [70, -3], [77, 0.6], [90, 0]],
      detail: 'Cratère de 154 km de diamètre ; en son centre, le mont Sharp (Aeolis Mons) s’élève à ≈ 5,5 km au-dessus du fond. C’est là que roule Curiosity, au pied du mont.' },
    { id: 'jezero', nom: 'Cratère Jezero', lat: 18.4, lon: 77.58, poser: -7,
      profil: [[-30, 0], [-23, 0.4], [-19, -0.5], [-12, -0.45], [-9, -0.38], [-7.5, -0.5], [19, -0.5], [23, 0.4], [30, 0]],
      detail: 'Cratère de 45 km de diamètre qui fut un lac, avec le delta d’une ancienne rivière à l’ouest. C’est là que Perseverance cherche des traces de vie passée.' },
  ],
};

function zonesSur(astreId) { return ZONES_REELLES[astreId] || []; }
function xZone(a, z) { return xLongitude(a, z.lon); }

// Altitude (m) ajoutée par un profil, à dx mètres du centre (raccord en cosinus entre deux points).
function hauteurProfil(profil, dxM) {
  const d = dxM / 1000;
  if (d <= profil[0][0] || d >= profil[profil.length - 1][0]) return 0;
  for (let i = 0; i < profil.length - 1; i++) {
    const [x1, h1] = profil[i], [x2, h2] = profil[i + 1];
    if (d <= x2) { const u = (d - x1) / (x2 - x1), s = (1 - Math.cos(Math.PI * u)) / 2; return (h1 + (h2 - h1) * s) * 1000; }
  }
  return 0;
}

// Relief ordinaire + zones réelles de l'astre (appelé par creerTerrain).
function terrainZones(astre, terrain) {
  const zs = zonesSur(astre.id);
  if (!zs.length) return terrain;
  const centres = zs.map((z) => ({ z, x: xZone(astre, z), demi: Math.max(...z.profil.map((p) => Math.abs(p[0]))) * 1000 }));
  return function hauteur(x) {
    let h = terrain(x);
    for (const c of centres) {
      const dx = ecartSol(astre, x, c.x);
      if (Math.abs(dx) < c.demi) h += hauteurProfil(c.z.profil, dx);
    }
    return h;
  };
}

// La zone réelle autour d'un point du sol (pour le panneau de l'exploration), ou null.
function zoneIci(a, x) {
  for (const z of zonesSur(a.id)) {
    const demi = Math.max(...z.profil.map((p) => Math.abs(p[0]))) * 1000;
    if (Math.abs(ecartSol(a, x, xZone(a, z))) < demi) return z;
  }
  return null;
}

// Plan lointain de l'exploration : le relief des kilomètres alentour, comprimé, dessiné derrière le terrain proche.
// Il défile très lentement : c'est lui qui montre la paroi d'un canyon ou le flanc d'un volcan au loin.
function dessinerPanorama(ctx, a, xIci, sol, W, horizonY, lumiere) {
  const mParPx = 250, pxParM = 0.035;   // ≈ 200 km sur la largeur de l'écran ; 7 km de relief ≈ 245 px
  const h0 = sol(xIci), pts = [];
  for (let sx = -4; sx <= W + 4; sx += 4) pts.push([sx, horizonY - (sol(xIci + (sx - W / 2) * mParPx) - h0) * pxParM]);
  const haut = Math.min(...pts.map((p) => p[1]));
  if (horizonY - haut < 6) return;   // relief lointain négligeable : rien à montrer
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = assombrir(a.couleurs.sol, 0.6 * lumiere);
  ctx.beginPath(); ctx.moveTo(pts[0][0], horizonY + 400);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(W + 4, horizonY + 400); ctx.closePath(); ctx.fill();
  // Ligne de crête, éclairée : elle détache le relief lointain du ciel.
  ctx.globalAlpha = 0.7; ctx.strokeStyle = assombrir(a.couleurs.sol, 1.1 * lumiere); ctx.lineWidth = 1.5;
  ctx.beginPath(); pts.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
  ctx.restore();
}
