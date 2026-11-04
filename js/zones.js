'use strict';
// ---------- Zones réelles à explorer (carte 6, point 6) ----------
// Relief simplifié de lieux réels, d'après leurs dimensions publiées. Le sol du jeu est une ligne (la longitude) :
// chaque profil est une coupe à travers la structure, posée dans le sens est-ouest à sa vraie longitude, et
// ajoutée au relief ordinaire. Profil : [distance au centre (km), altitude (km)], raccordé en douceur.
// Liste des zones et sources : docs/carte6-zones.md.
// Rayures de tigre d'Encelade : quatre fractures espacées d'≈ 35 km, chacune une vallée en V (200 à 250 m)
// entre deux crêtes de 80 à 100 m, ≈ 2 km de large (Cassini).
function profilRayuresTigre() {
  const p = [[-60, 0]];
  for (const c of [-52.5, -17.5, 17.5, 52.5]) p.push([c - 1.5, 0], [c - 1, 0.09], [c - 0.3, -0.05], [c, -0.22], [c + 0.3, -0.05], [c + 1, 0.09], [c + 1.5, 0]);
  p.push([60, 0]);
  return p;
}
// Plaine Spoutnik (Pluton) : ≈ 3 km sous les terrains voisins, pavée de cellules de convection d'≈ 33 km,
// plus hautes de ≈ 100 m en leur centre (New Horizons).
function profilSpoutnik() {
  const p = [[-620, 0], [-560, -3]];
  for (let d = -545, i = 0; d <= 545; d += 16.5, i++) p.push([d, i % 2 ? -2.9 : -3]);
  p.push([560, -3], [620, 0]);
  return p;
}

// ---------- Profils schématiques (relief choisi, non vérifié : signalé dans le jeu) ----------
// Creux répétés : centres de d0 à d1 tous les pas km, largeur l km, profondeur h km (sillons, anneaux, alvéoles).
function creuxRepetes(d0, d1, pas, l, h, bord = 0.04) {
  const p = [];
  for (let c = d0; c <= d1 + 1e-6; c += pas) p.push([c - l / 2, 0], [c - l / 4, bord], [c, -h], [c + l / 4, bord], [c + l / 2, 0]);
  return p;
}
// Valhalla : zone centrale lisse, puis des anneaux de fossés (graben) et de crêtes vers l'extérieur.
function profilValhalla() {
  const p = [[-620, 0]];
  for (let c = -580; c <= -220; c += 60) p.push([c - 8, 0], [c - 3, 0.15], [c, -0.35], [c + 3, 0.15], [c + 8, 0]);
  p.push([-180, 0], [180, 0]);
  for (let c = 220; c <= 580; c += 60) p.push([c - 8, 0], [c - 3, 0.15], [c, -0.35], [c + 3, 0.15], [c + 8, 0]);
  p.push([620, 0]);
  return p;
}

const ZONES_REELLES = {
  // Titan : Ligeia Mare (Cassini) : ≈ 500 km de long, ≈ 50 m de profondeur moyenne, ≈ 160 m au centre. Une mer
  // liquide (liquide : la surface, entre deux bornes en km ; le profil donne le fond). Rive schématique.
  titan: [
    { id: 'ligeia', nom: 'Rive de Ligeia Mare', lat: 79, lon: 112, poser: -258, schematique: true, lisse: 0.1,
      // Rive : la terre reste au-dessus du niveau jusqu'au bord (±251 km), puis la plage plonge en 1 km.
      liquide: { de: -251, a: 251, niveau: 0 },
      profil: [[-290, 0], [-270, 0.08], [-252, 0.03], [-251, 0.03], [-250, -0.03], [-240, -0.05], [-150, -0.11], [0, -0.16], [150, -0.11], [240, -0.05], [250, -0.03], [251, 0.03], [252, 0.03], [270, 0.08], [290, 0]],
      detail: 'La deuxième mer de Titan : ≈ 500 km de méthane et d’éthane liquides à −180 °C, ≈ 50 m de profondeur en moyenne et ≈ 160 m au centre. Sur la rive (relief schématique).' },
  ],
  // Ganymède : Galileo Regio, grande région sombre et ancienne, rayée de sillons (Lakhmu Fossae). Sillons schématiques.
  ganymede: [
    { id: 'galileo', nom: 'Galileo Regio', lat: 47, lon: -129.6, poser: -5, schematique: true,
      profil: [[-110, 0], ...creuxRepetes(-90, 90, 20, 8, 0.3), [110, 0]],
      detail: 'Une région sombre de plus de 3 000 km, parmi les plus vieux terrains de Ganymède, rayée de longs sillons concentriques. Relief des sillons schématique (≈ 300 m).' },
  ],
  // Callisto : Valhalla, le plus grand bassin à anneaux du Système solaire (Voyager, Galileo). Anneaux schématiques.
  callisto: [
    { id: 'valhalla', nom: 'Bassin Valhalla', lat: 14.7, lon: -56, poser: 0, schematique: true,
      profil: profilValhalla(),
      detail: 'Une zone centrale claire et lisse de 360 à 600 km, entourée d’anneaux de fossés et de crêtes jusqu’à 3 000 à 4 000 km de diamètre. Relief des anneaux schématique.' },
  ],
  // Triton : terrain « en peau de melon » (Voyager 2, 1989). Position et profondeur des alvéoles schématiques.
  triton: [
    { id: 'melon', nom: 'Terrain en peau de melon', lat: 20, lon: 30, poser: -15, schematique: true,
      profil: [[-140, 0], ...creuxRepetes(-120, 120, 30, 26, 0.2, 0.06), [140, 0]],
      detail: 'Un terrain unique, couvert d’alvéoles de quelques dizaines de km, comme la peau d’un melon. Au sud, des geysers d’azote montent à 8 km. Position et relief schématiques.' },
  ],
  // Mercure : bassin Caloris (MESSENGER). Profondeur du fond non vérifiée : le fond est laissé au niveau moyen.
  mercure: [
    { id: 'caloris', nom: 'Bassin Caloris', lat: 30.5, lon: 170.2, poser: -700,
      profil: [[-800, 0], [-775, 2], [-740, 0.3], [-650, 0], [650, 0], [740, 0.3], [775, 2], [800, 0]],
      detail: 'Le plus grand bassin d’impact de Mercure : ≈ 1 550 km de diamètre, cerné par les monts Caloris, ≈ 2 km de haut. On se pose dans la plaine, au pied des monts.' },
  ],
  // Vénus : Maxwell Montes et le cratère Cléopâtre (Magellan). Coupe resserrée (±300 km au lieu de ±400) : le
  // sol du jeu n'a pas de latitude, et le vrai massif (65° N) recouvrirait l'équateur à la longitude 0°.
  venus: [
    { id: 'maxwell', nom: 'Maxwell Montes et cratère Cléopâtre', lat: 65.2, lon: 3.3, poser: -20,
      profil: [[-300, 0], [-240, 2.5], [-150, 7], [-60, 10.5], [0, 11], [60, 10.5], [140, 8], [150, 8.3], [165, 6], [190, 5.8], [210, 5.8], [235, 6], [250, 6.3], [265, 4], [300, 0]],
      detail: 'Le plus haut massif de Vénus : ≈ 11 km au-dessus du niveau moyen ; l’air y est deux fois moins dense qu’en plaine. Sur son flanc est, le cratère Cléopâtre (≈ 100 km, 2,5 km de profondeur). On se pose près du sommet.' },
  ],
  // Io : Loki Patera, la plus grande dépression volcanique d'Io (Voyager, Galileo). Profondeur non vérifiée (schématique).
  io: [
    { id: 'loki', nom: 'Loki Patera', lat: 13, lon: 51.2, poser: -90,
      profil: [[-115, 0], [-101, 0.1], [-95, -0.2], [95, -0.2], [101, 0.1], [115, 0]],
      detail: '≈ 200 km de diamètre : un immense lac de lave, dont la croûte se renouvelle tous les 400 à 600 jours. On se pose sur le bord.' },
  ],
  // Europe : Conamara Chaos, blocs de banquise basculés (Galileo). Largeur de la coupe schématique (50 km).
  europe: [
    { id: 'conamara', nom: 'Conamara Chaos', lat: 9.7, lon: 87.3, poser: -16,
      profil: [[-25, 0], [-20, 0.15], [-18, 0], [-14, 0.25], [-12, 0.05], [-9, 0.12], [-7, 0], [-3, 0.2], [-1, 0.02], [2, 0.1], [4, 0], [8, 0.25], [10, 0.03], [13, 0.15], [16, 0], [20, 0.2], [22, 0], [25, 0]],
      detail: 'Terrain chaotique : des blocs de banquise brisés, basculés puis regelés, avec des falaises de glace de 100 à 250 m. Sous la glace, l’océan d’Europe. On se pose entre les blocs.' },
  ],
  // Encelade : rayures de tigre du pôle Sud (Cassini).
  l602: [
    { id: 'tigre', nom: 'Rayures de tigre (pôle Sud)', lat: -86.9, lon: 129.5, poser: -20,
      profil: profilRayuresTigre(),
      detail: 'Quatre fractures de ≈ 130 à 175 km de long, d’où jaillissent les geysers d’Encelade : une vallée de 200 à 250 m entre deux crêtes de 80 à 100 m. On se pose près de l’une d’elles.' },
  ],
  // Mimas : cratère Herschel (Cassini).
  l601: [
    { id: 'herschel', nom: 'Cratère Herschel', lat: -1.38, lon: -111.77, poser: -15,
      profil: [[-85, 0], [-70, 1], [-60, -2], [-55, -4.5], [-20, -4.5], [-8, -2], [0, 1.5], [8, -2], [20, -4.5], [55, -4.5], [60, -2], [70, 1], [85, 0]],
      detail: '≈ 139 km de diamètre, un tiers de Mimas ; des parois d’≈ 5 km et un pic central de ≈ 6 km au-dessus du fond. On se pose au fond, près du pic.' },
  ],
  // Miranda : Verona Rupes (Voyager 2). Hauteur incertaine (5 à 20 km selon les études) : 10 km retenus.
  l705: [
    { id: 'verona', nom: 'Verona Rupes', lat: -18.3, lon: -12.2, poser: 14,
      profil: [[-40, 0], [-8, 0.2], [-3, -4], [0, -7], [4, -9.5], [10, -10], [22, -9.5], [36, -5], [45, 0]],
      detail: 'Une des plus hautes falaises connues : 5 à 20 km selon les études (10 km ici). Dans une gravité si faible, une chute du haut durerait plusieurs minutes. On se pose au pied.' },
  ],
  // Pluton : plaine Spoutnik (New Horizons).
  pluton: [
    { id: 'spoutnik', nom: 'Plaine Spoutnik', lat: 20, lon: 180, poser: 0,
      profil: profilSpoutnik(),
      detail: 'Le « cœur » de Pluton : une plaine de glace d’azote d’≈ 1 200 km, ≈ 3 km plus bas que les terrains voisins, pavée de cellules de convection d’≈ 33 km qui se renouvellent en moins d’un million d’années.' },
  ],
  // Cérès : cratère Occator et Cerealia Facula (Dawn).
  a1: [
    { id: 'occator', nom: 'Cratère Occator', lat: 19.86, lon: -121.15, poser: -6,
      profil: [[-60, 0], [-46, 0.5], [-40, -2], [-30, -3], [-8, -3], [-5, -3.5], [-1.5, -3.5], [0, -3.1], [1.5, -3.5], [5, -3.5], [8, -3], [30, -3], [40, -2], [46, 0.5], [60, 0]],
      detail: '92 km de diamètre, 3 à 4 km de profondeur. En son centre, Cerealia Facula : un dôme de sels brillants, ≈ 3 km de large et ≈ 400 m de haut, venu d’une saumure profonde. On se pose près du dôme.' },
  ],
  // Vesta : bassin Rheasilvia (Dawn).
  a4: [
    { id: 'rheasilvia', nom: 'Bassin Rheasilvia', lat: -75, lon: -59, poser: -120,
      profil: [[-262, 0], [-252, 2], [-200, -10], [-140, -17], [-100, -17], [-50, -5], [0, 3], [50, -5], [100, -17], [140, -17], [200, -10], [252, 2], [262, 0]],
      detail: '≈ 505 km de diamètre, presque la taille de Vesta : ≈ 19 km de profondeur, et un pic central de ≈ 20 km, une des plus hautes montagnes du Système solaire. On se pose au fond.' },
  ],
  // Phobos : cratère Stickney (USGS). Profondeur non vérifiée : ≈ 1/5 du diamètre, valeur typique d'un cratère.
  l401: [
    { id: 'stickney', nom: 'Cratère Stickney', lat: 1, lon: -49, poser: -1,
      profil: [[-6, 0], [-4.5, 0.2], [-3, -1], [-1, -1.6], [1, -1.6], [3, -1], [4.5, 0.2], [6, 0]],
      detail: '≈ 9 km de diamètre, sur une lune de 22 km : le choc a failli briser Phobos. On se pose au fond.' },
  ],
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
    const base = terrain(x);
    let h = base;
    for (const c of centres) {
      const dx = ecartSol(astre, x, c.x);
      if (Math.abs(dx) >= c.demi) continue;
      // lisse : relief ordinaire atténué dans la zone (une mer a besoin d'une rive nette), raccordé vers les bords.
      if (c.z.lisse !== undefined) {
        const u = Math.max(0, Math.min(1, (Math.abs(dx) - 0.85 * c.demi) / (0.15 * c.demi))), s = u * u * (3 - 2 * u);
        h -= base * (1 - (c.z.lisse + (1 - c.z.lisse) * s));
      }
      h += hauteurProfil(c.z.profil, dx);
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

// ---------- Mers (liquide) ----------
// Surface d'une mer au-dessus de x (m), ou null hors de toute mer.
function niveauLiquide(a, x) {
  for (const z of zonesSur(a.id)) {
    if (!z.liquide) continue;
    const d = ecartSol(a, x, xZone(a, z)) / 1000;
    if (d >= z.liquide.de && d <= z.liquide.a) return z.liquide.niveau * 1000;
  }
  return null;
}
// Sous la surface d'une mer : le sol (le fond) est plus bas que le niveau du liquide.
function sousLiquide(a, x, sol) { const n = niveauLiquide(a, x); return n !== null && sol(x) < n; }
// Dessin du liquide entre le fond et la surface, de xMin à xMax (m), avec un reflet sur la surface.
function dessinerLiquides(ctx, a, versEcran, sol, xMin, xMax) {
  if (!zonesSur(a.id).some((z) => z.liquide)) return;
  const pas = Math.max(0.25, (xMax - xMin) / 300);
  let bande = null;
  const fermer = () => {
    if (!bande || bande.length < 2) { bande = null; return; }
    ctx.save();
    ctx.fillStyle = 'rgba(52,58,72,0.92)';
    ctx.beginPath();
    bande.forEach(([x, n], i) => { const [sx, sy] = versEcran(x, n); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); });
    for (let i = bande.length - 1; i >= 0; i--) { const [sx, sy] = versEcran(bande[i][0], sol(bande[i][0])); ctx.lineTo(sx, sy); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(225,195,135,0.7)'; ctx.lineWidth = 1.5;   // la surface, où le ciel orangé se reflète
    ctx.beginPath(); bande.forEach(([x, n], i) => { const [sx, sy] = versEcran(x, n); if (i) ctx.lineTo(sx, sy); else ctx.moveTo(sx, sy); }); ctx.stroke();
    ctx.restore();
    bande = null;
  };
  for (let x = xMin; x <= xMax; x += pas) {
    const n = niveauLiquide(a, x);
    if (n !== null && sol(x) < n) (bande = bande || []).push([x, n]); else fermer();
  }
  fermer();
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
