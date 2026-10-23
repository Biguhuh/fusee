'use strict';
// Apparence des astres.
// 1. Une carte de chaque astre (projection équirectangulaire : longitude → x, latitude → y), peinte une fois :
//    continents de la Terre, mers de la Lune, bandes et Grande Tache rouge de Jupiter, cœur de Pluton…
// 2. Un globe éclairé par le Soleil, calculé pixel par pixel à partir de cette carte, vu :
//    - du pôle Nord sur la carte de l'orbiteur (le système solaire est vu « d'au-dessus ») ;
//    - de l'équateur dans le ciel des lunes et pendant l'atterrissage.
// Les globes sont gardés en mémoire (rotation arrondie à quelques degrés) pour rester légers.

// ---------- Outils de peinture ----------
function alea01(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

function outilsCarte(g, W, H) {
  const P = (lon, lat) => [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  const T = {
    g, W, H, P,
    fond(c) { g.fillStyle = c; g.fillRect(0, 0, W, H); },
    poly(pts, c) {
      g.fillStyle = c; g.beginPath();
      pts.forEach(([lo, la], i) => { const [x, y] = P(lo, la); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.closePath(); g.fill();
    },
    // Tache elliptique (rayons en degrés), répétée de part et d'autre de la ligne de changement de date.
    tache(lon, lat, rLon, rLat, c, rot = 0) {
      g.fillStyle = c;
      for (const d of [-360, 0, 360]) {
        const [x, y] = P(lon + d, lat);
        g.beginPath(); g.ellipse(x, y, (rLon / 360) * W, (rLat / 180) * H, rot, 0, Math.PI * 2); g.fill();
      }
    },
    // Bande de latitude, bords ondulés.
    bande(lat1, lat2, c, onde = 0, freq = 6, phase = 0) {
      g.fillStyle = c; g.beginPath();
      const n = 90;
      for (let i = 0; i <= n; i++) { const lon = -180 + (360 * i) / n; const [x, y] = P(lon, lat1 + onde * Math.sin((lon * freq * Math.PI) / 180 + phase)); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      for (let i = n; i >= 0; i--) { const lon = -180 + (360 * i) / n; const [x, y] = P(lon, lat2 + onde * Math.sin((lon * freq * Math.PI) / 180 + phase + 1.3)); g.lineTo(x, y); }
      g.closePath(); g.fill();
    },
    // Cratères : fond sombre, rebord clair. Plus serrés vers les pôles en x (projection).
    crateres(n, graine, taille, clair = 'rgba(255,255,255,0.10)', sombre = 'rgba(0,0,0,0.16)') {
      for (let i = 0; i < n; i++) {
        const lon = -180 + 360 * alea01(graine + i * 3), lat = Math.asin(2 * alea01(graine + i * 3 + 1) - 1) * 180 / Math.PI;
        const r = taille * (0.25 + Math.pow(alea01(graine + i * 3 + 2), 3) * 1.6);
        const k = 1 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
        T.tache(lon, lat, r * k, r, sombre);
        T.tache(lon + r * k * 0.25, lat + r * 0.25, r * k * 0.7, r * 0.7, clair);
      }
    },
    // Taches irrégulières (régions plus claires ou plus sombres).
    marbrure(n, graine, taille, c) {
      for (let i = 0; i < n; i++) {
        const lon = -180 + 360 * alea01(graine + i * 5), lat = Math.asin(2 * alea01(graine + i * 5 + 1) - 1) * 180 / Math.PI;
        const k = 1 / Math.max(0.25, Math.cos((lat * Math.PI) / 180));
        T.tache(lon, lat, taille * k * (0.5 + alea01(graine + i * 5 + 2)), taille * (0.4 + alea01(graine + i * 5 + 3) * 0.8), c, alea01(i) * 3);
      }
    },
    // Rayures fines (lignes de fracture d'Europe, sillons de Ganymède).
    lignes(n, graine, c, largeur) {
      g.strokeStyle = c; g.lineWidth = largeur;
      for (let i = 0; i < n; i++) {
        const lon = -180 + 360 * alea01(graine + i * 7), lat = -60 + 120 * alea01(graine + i * 7 + 1);
        const L = 20 + 60 * alea01(graine + i * 7 + 2), a = alea01(graine + i * 7 + 3) * Math.PI;
        g.beginPath();
        for (let k = 0; k <= 12; k++) {
          const s = (k / 12 - 0.5) * L;
          const [x, y] = P(lon + s * Math.cos(a), lat + s * Math.sin(a) * 0.5 + 3 * Math.sin(k));
          if (k) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.stroke();
      }
    },
  };
  return T;
}

// ---------- La Terre : contours grossiers des continents (longitude, latitude) ----------
const TERRES = {
  amNord: [[-168, 66], [-162, 70], [-156, 71.3], [-140, 69.5], [-128, 70], [-115, 68.5], [-95, 72], [-85, 69.5], [-80, 73], [-68, 70], [-62, 66], [-64, 60], [-56, 52], [-60, 47], [-66, 45], [-70, 43], [-70, 41.5], [-74, 40.5], [-76, 38], [-76, 35], [-81, 31.5], [-80, 27], [-80.5, 25.2], [-82, 27], [-83, 29.5], [-86, 30.3], [-90, 29.5], [-94, 29.5], [-97, 27.5], [-97.5, 24], [-97, 21], [-95, 18.5], [-91, 18.8], [-90.5, 21], [-87, 21.5], [-88, 16], [-84, 15.8], [-83.5, 11], [-81, 8.5], [-79, 9.5], [-77.5, 8.5], [-79.5, 7.5], [-81, 7.3], [-83.5, 8.5], [-86, 11], [-88, 13.3], [-92, 14.5], [-95, 16], [-97.5, 16], [-101, 17.5], [-105.5, 20], [-105.5, 23], [-108, 25.5], [-112.5, 29], [-114.5, 31.5], [-113, 29], [-110, 23], [-112, 24.5], [-114, 28], [-115, 30], [-117, 32.5], [-119, 34], [-121, 35], [-123, 38], [-124, 41], [-124, 46], [-124.5, 48.5], [-128, 50.5], [-131, 54], [-134, 57.5], [-137, 58.5], [-140, 59.8], [-146, 60.8], [-150, 59.5], [-152, 58], [-154, 57], [-158, 56], [-162, 55], [-158, 57.5], [-157, 58.5], [-162, 58.7], [-162, 60], [-165, 62], [-164.5, 63.5], [-161, 64.5], [-166, 65.5]],
  baieHudson: [[-95, 58], [-92, 57], [-85, 55.5], [-80, 52], [-79, 55], [-77, 58], [-78, 62], [-85, 64], [-90, 63], [-94, 61]],
  arctiqueCanada: [[-125, 72], [-118, 76.5], [-100, 79], [-85, 82], [-62, 82.5], [-70, 79], [-80, 76], [-90, 74], [-80, 73], [-90, 69.5], [-100, 70], [-110, 72]],
  baffin: [[-80, 73.5], [-68, 70.5], [-62, 66.5], [-66, 62], [-73, 64], [-78, 64.5], [-73, 67], [-80, 70]],
  groenland: [[-73, 78], [-68, 80.5], [-60, 82], [-45, 82.7], [-30, 83.5], [-20, 82], [-12, 81.5], [-18, 77], [-20, 73], [-22, 70.5], [-26, 68.5], [-34, 66], [-40, 65], [-43, 60], [-48, 61], [-51, 64], [-53.5, 67], [-55, 70.5], [-57, 74], [-63, 76.5], [-70, 77]],
  islande: [[-22.5, 64], [-24, 65.5], [-21, 66.2], [-15, 66.5], [-13.5, 65], [-18, 63.4]],
  cuba: [[-85, 21.8], [-82, 23.1], [-77, 22.4], [-74.2, 20.2], [-77.5, 19.9], [-80, 21.7]],
  hispaniola: [[-74.5, 18.5], [-72, 19.9], [-68.4, 18.6], [-71, 17.9]],
  amSud: [[-77.5, 8.5], [-75.5, 10.5], [-72, 12], [-68, 10.5], [-62, 10.7], [-60, 8.5], [-57, 6], [-52, 5], [-50, 1.5], [-48, -1], [-44, -2.5], [-39, -3.5], [-35, -5.5], [-35, -9], [-37, -12.5], [-39, -15], [-39.5, -19], [-41, -22], [-44, -23], [-48, -26], [-48.5, -28.5], [-51, -31], [-53, -34], [-57, -35], [-57, -37], [-58.5, -38.5], [-62, -39], [-65, -41], [-64, -42.5], [-65.5, -45], [-67.5, -46.5], [-66, -48], [-68.5, -50], [-69, -52], [-68.5, -54.8], [-72, -54], [-74.5, -52], [-75, -48], [-74, -44], [-73.5, -40], [-73, -36], [-71.5, -32], [-71.5, -28], [-70.5, -24], [-70.2, -18.5], [-72, -17], [-75.5, -15], [-76.5, -13], [-78, -10], [-79.5, -7.5], [-81, -6], [-81, -4], [-80, -2.5], [-80.5, -1], [-80, 1], [-79, 1.5], [-78, 3], [-77.5, 5.5]],
  afrique: [[-17, 21], [-16.5, 24], [-14.5, 26.5], [-13, 28], [-10, 29.5], [-9.5, 32], [-6.8, 34], [-5.9, 35.8], [-2, 35.1], [1, 36.5], [5, 36.8], [10, 37.3], [11, 35], [10.5, 33.5], [15, 32.3], [19.5, 30.5], [20, 32], [23, 32.7], [25, 31.7], [29, 30.9], [32, 31.2], [34, 31.2], [34.5, 28], [33, 28.5], [35.8, 24], [37.5, 18], [39, 15.5], [41.5, 13.2], [43.3, 12], [44.5, 10.5], [51, 11.8], [51, 10.5], [49, 6], [46, 2], [42, -1], [40, -3], [39, -6], [39.5, -10], [40.5, -15], [37, -17.5], [35, -21], [35.5, -24], [32.6, -26], [32.5, -28.5], [30, -31.5], [27.5, -33.5], [25, -34], [22, -34.2], [20, -34.8], [18.5, -34], [18, -31.5], [16.5, -28.5], [15, -26], [14.5, -22.5], [13, -20], [11.8, -17], [12.5, -13], [13.5, -11], [12, -6], [12.2, -4.5], [9.5, -1.5], [9.5, 1], [9.8, 4], [8.5, 4.5], [6, 4.3], [3, 6.3], [1, 6], [-2, 4.8], [-4.5, 5.2], [-7.5, 4.4], [-9.5, 5.5], [-11.5, 6.9], [-13, 8.5], [-14.5, 10.5], [-16.7, 12.3], [-17.2, 14.7], [-16.5, 16.5], [-16.2, 19]],
  madagascar: [[44, -25], [47, -25], [50.5, -15.5], [49.5, -12], [48, -13.5], [44.3, -16.5], [43.5, -21.5]],
  eurasie: [[-9.5, 37], [-8.8, 42.5], [-9, 43.3], [-1.7, 43.4], [-1.2, 46], [-4.5, 47.8], [-1.5, 48.7], [1.5, 50.2], [4, 51.3], [5, 53.4], [8.5, 53.8], [8.2, 55.5], [10, 57.5], [10.5, 56], [12.5, 55.5], [10.5, 54.3], [14, 54], [19, 54.4], [21.5, 57], [24, 57.5], [23.5, 59.5], [29.5, 60], [22, 60.5], [21.3, 63], [25, 65], [22, 65.8], [17.5, 62.5], [17.5, 60.5], [19, 59.8], [16.5, 57], [14.3, 55.5], [12.8, 55.6], [11.7, 58], [10.5, 59], [8, 58], [5.5, 58.9], [5, 61.5], [7, 63], [10.5, 64.5], [14, 67.5], [18, 69.8], [23, 70.6], [28, 71], [31, 70], [35, 69.2], [40, 67.5], [41, 66.5], [34.5, 66], [37.5, 64.5], [44, 66], [44, 68.5], [54, 68.5], [59, 69], [66, 69.5], [69, 73], [73, 72.5], [74, 68.5], [78, 72.5], [83, 70], [87, 74], [100, 76.5], [105, 77.5], [113, 74], [120, 73], [129, 71], [140, 72.5], [150, 71], [160, 70], [170, 70], [180, 69], [180, 65], [178, 64.5], [175, 62], [170, 60], [164, 60], [162, 58], [163.5, 56], [162, 54.5], [160, 53], [156.5, 51], [156, 57], [160.5, 61.5], [155, 59.5], [148, 59.3], [142, 59], [136.5, 54.5], [140.5, 53], [141.5, 48.5], [138, 45], [135, 43.5], [132, 43], [129.5, 41], [129.5, 36], [127, 34.5], [126.5, 37.5], [124.5, 40], [121.5, 39], [122, 40.5], [118, 39], [119.5, 37], [122.5, 37], [120, 34.5], [121.8, 31], [122, 29], [119.5, 25.5], [116.5, 22.8], [113, 22], [110, 20.5], [108.5, 21.5], [106.5, 20], [105.7, 18.5], [108.8, 15.5], [109.2, 12], [107, 10.5], [105, 8.6], [104.5, 10.5], [103, 11], [101, 12.7], [100, 12], [99.2, 9.5], [100.3, 6.5], [103.3, 3.5], [103.5, 1.4], [101, 2.8], [98.5, 7.8], [98.3, 13], [97.5, 16.5], [94.5, 18], [94, 19.8], [92, 21.8], [90, 22], [87, 21.5], [86, 19.8], [84, 18], [80.3, 15.5], [80, 13], [79.8, 10.3], [77.5, 8], [76.5, 9], [74.7, 13], [73, 17], [72.7, 21], [70.5, 20.8], [69, 22.5], [66.6, 25.3], [61.5, 25.2], [57.5, 25.7], [56.3, 27.1], [54, 26.6], [51.5, 27.9], [50, 30], [48.5, 29.9], [48, 28.5], [50, 26.3], [51.3, 24.7], [54, 24.2], [56, 26], [56.4, 24.5], [58.8, 23.2], [59.8, 22.4], [57.5, 18.9], [55.5, 17.2], [52.2, 16], [48.6, 14], [45, 12.9], [43.3, 12.7], [42.7, 16], [41, 19.5], [39, 21.8], [37.5, 24.5], [35.2, 28], [34.6, 29.5], [35, 32.5], [35.9, 35], [36, 36.5], [33, 36.2], [30, 36.3], [27.5, 36.8], [26.3, 39.3], [28, 41], [26.5, 40.5], [23, 40.4], [24, 38], [22.5, 36.5], [21.5, 37.5], [20, 39.6], [19.3, 41.8], [16, 43.5], [13.7, 45.6], [12.4, 44.5], [13.6, 43.5], [15.7, 41.9], [18.5, 40.2], [16.5, 39], [15.7, 38], [15.6, 40], [12, 41.9], [10.2, 43.9], [8.7, 44.4], [7, 43.5], [4, 43.4], [3.2, 42], [0.8, 41], [0, 39], [-0.7, 37.6], [-2.2, 36.7], [-5.6, 36], [-6.5, 37], [-7.5, 37.2]],
  royaumeUni: [[-5.7, 50], [1.4, 51.3], [1.7, 52.7], [0, 53.5], [-1.5, 55], [-2, 57.6], [-3.3, 58.6], [-5, 58.6], [-6.2, 56.5], [-5, 55], [-3, 54.5], [-4.7, 52.8], [-3.3, 51.4]],
  irlande: [[-6, 52], [-6, 54], [-7.5, 55.3], [-10, 54.2], [-10, 51.6]],
  svalbard: [[11, 78.5], [16, 80], [27, 80.2], [22, 77.3], [16, 76.5]],
  novaiaZemlia: [[52, 71.5], [56, 75], [68, 76.8], [60, 74], [55, 70.6]],
  japon: [[130, 31], [132, 33.5], [135, 33.5], [137, 34.5], [140, 35], [141, 38], [142, 41], [140, 41.5], [139.5, 38.5], [137, 37], [136, 36], [133, 35.5], [131, 34.5]],
  hokkaido: [[140, 41.5], [143.5, 42], [145.5, 43.5], [142, 45.5], [141, 43]],
  taiwan: [[120.2, 22.5], [121.9, 25], [121, 25.2], [120.1, 23.5]],
  sriLanka: [[79.8, 6], [81.8, 7], [81, 9.8], [79.9, 9.5]],
  philippines: [[120, 18.5], [122.5, 18.4], [122, 14], [124, 13], [125.5, 9.5], [126.5, 7], [125.5, 6], [123, 7.5], [122, 10], [120.5, 14], [120, 16]],
  sumatra: [[95.3, 5.6], [98, 4], [100.5, 1], [104, -2], [106, -5.8], [104.5, -5.9], [101, -2.5], [98.5, 0.5], [95.5, 3.5]],
  java: [[105.2, -6.8], [110, -6.9], [114.5, -7.8], [114.5, -8.7], [110, -8.2], [106, -7.5]],
  borneo: [[109, 1.5], [110.5, -1], [111, -3], [114.5, -4], [116.5, -2.5], [117.5, 1], [119, 5], [117, 7], [116, 6.5], [113, 3], [111, 2]],
  sulawesi: [[119.5, -5.5], [120.5, -1.5], [121.5, 1], [124.5, 1.3], [122, 0], [123, -2], [121.5, -4.5], [120.5, -5.5]],
  papouasie: [[131, -1], [135, -3.2], [138, -1.5], [141, -2.6], [145, -4], [147.5, -6.5], [150, -10.5], [147, -10], [143, -9], [141, -9.2], [138, -8], [137.5, -5], [134, -4], [132, -2.8]],
  australie: [[113.5, -22], [114, -26], [115, -31], [115, -34], [118, -35], [123, -34], [126, -32.5], [131, -31.5], [134, -32.5], [136, -35], [138, -34], [140, -38], [144, -38.5], [146.5, -39], [150, -37.5], [151, -34], [153, -31], [153.5, -28], [153, -25], [150, -22], [148.5, -20], [146, -18.5], [145.5, -15], [143.5, -14], [142.5, -10.7], [141.5, -13], [141.5, -17], [140, -17.7], [137, -16], [136, -12], [132, -11.5], [130.5, -12.5], [129, -15], [126, -14], [123, -17], [121, -19.5], [117, -20.7]],
  tasmanie: [[145, -40.8], [148.3, -40.9], [148, -43.2], [146, -43.6]],
  nzNord: [[172.7, -34.4], [174.5, -36.5], [178.5, -37.7], [177, -39.5], [175, -41.5], [174.5, -39.5], [173.8, -39.2]],
  nzSud: [[172.7, -40.5], [174, -41.5], [172.7, -43.5], [171, -44.5], [169, -46.6], [166.5, -46], [168, -44], [170.5, -42.5]],
  antarctique: [[-180, -90], [180, -90], [180, -78], [160, -76], [165, -71], [140, -66.5], [110, -66], [90, -66.5], [70, -68], [50, -66], [30, -69.5], [10, -70], [-10, -71], [-30, -75], [-45, -78], [-60, -73], [-57, -63.5], [-63, -64.5], [-68, -71], [-75, -73.5], [-100, -73], [-120, -74], [-140, -76], [-160, -78], [-180, -78]],
};
const MERS_INTERIEURES = {
  caspienne: [[47, 45.5], [51, 47], [54, 46], [53, 42], [54, 38], [50, 37], [49, 39], [49.5, 41], [47, 43]],
  noire: [[28, 41.5], [28, 44], [30, 46], [33, 45.3], [37, 47], [39.5, 44], [41.5, 41.5], [36, 41.5], [31, 41]],
};
const DESERTS = [
  [[-15, 27], [-5, 32], [10, 32.5], [25, 30.5], [32, 28], [34, 20], [25, 16], [15, 15], [0, 16], [-15, 17]],      // Sahara
  [[38, 28], [48, 28], [55, 22], [52, 17], [44, 15], [40, 20]],                                                      // Arabie
  [[50, 34], [60, 36], [62, 30], [56, 27], [50, 30]],                                                               // Iran
  [[90, 45], [110, 45], [115, 42], [100, 38], [88, 40]],                                                            // Gobi
  [[77, 40], [88, 41], [89, 38], [78, 37]],                                                                         // Taklamakan
  [[118, -21], [130, -20], [140, -24], [137, -30], [125, -30], [117, -27]],                                         // Australie
  [[16, -20], [25, -20], [25, -28], [17, -28]],                                                                     // Kalahari
  [[-120, 40], [-108, 42], [-104, 33], [-112, 30], [-118, 34]],                                                     // Ouest américain
  [[-71, -18], [-68, -18], [-68, -27], [-71, -27]],                                                                 // Atacama
];
const FORETS = [
  [[-76, 2], [-50, 1], [-45, -8], [-60, -13], [-73, -10]],          // Amazonie
  [[9, 4], [29, 4], [29, -5], [12, -5]],                            // Congo
  [[30, 58], [140, 58], [140, 65], [30, 65]],                       // Taïga sibérienne
  [[-135, 52], [-60, 52], [-60, 58], [-135, 60]],                   // Forêt boréale canadienne
  [[95, 25], [120, 25], [118, 0], [98, 0]],                         // Asie du Sud-Est
];

// ---------- Peintres : une fonction par astre connu ----------
const PEINTRES = {
  terre(T) {
    const { g, W, H } = T;
    const oc = g.createLinearGradient(0, 0, 0, H);
    oc.addColorStop(0, '#1b3d6e'); oc.addColorStop(0.5, '#1f5a9a'); oc.addColorStop(1, '#1b3d6e');
    g.fillStyle = oc; g.fillRect(0, 0, W, H);
    for (const [k, pts] of Object.entries(TERRES)) {
      const blanc = k === 'groenland' || k === 'antarctique' || k === 'svalbard' || k === 'arctiqueCanada';
      if (k === 'baieHudson') continue;
      T.poly(pts, blanc ? '#eef3f6' : '#4b7d3a');
    }
    T.poly(TERRES.baieHudson, '#1d4f88');
    for (const pts of Object.values(MERS_INTERIEURES)) T.poly(pts, '#1d4f88');
    for (const pts of FORETS) T.poly(pts, 'rgba(30,80,30,0.65)');
    for (const pts of DESERTS) T.poly(pts, 'rgba(214,180,120,0.9)');
    T.tache(85, 31, 9, 3, 'rgba(240,240,245,0.85)');     // Himalaya enneigé
    T.bande(78, 90, 'rgba(235,242,248,0.92)', 2, 5);     // banquise arctique
    // Nuages : bandes de tempêtes aux latitudes moyennes, cumulus près de l'équateur.
    for (let i = 0; i < 140; i++) {
      const zone = alea01(i * 2.1);
      const lat = zone < 0.25 ? 40 + 25 * alea01(i * 3.3) : zone < 0.65 ? -(40 + 25 * alea01(i * 3.7)) : -10 + 20 * alea01(i * 4.1);
      const lon = -180 + 360 * alea01(i * 5.9);
      // Les taches sont plus étroites en longitude vers les pôles (la carte étire les hautes latitudes).
      const k = Math.max(0.35, Math.cos((lat * Math.PI) / 180));
      T.tache(lon, lat, (3 + 8 * alea01(i * 7.7)) / k, 0.8 + 2 * alea01(i * 1.3), `rgba(255,255,255,${0.12 + 0.22 * alea01(i * 9.1)})`, (alea01(i) - 0.5) * 0.4);
    }
  },
  lune(T) {
    T.fond('#aeaca7');
    T.marbrure(40, 5, 10, 'rgba(255,255,255,0.06)');
    T.crateres(260, 11, 1.3, 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0.07)');
    // Mers (face visible : longitudes −90 à 90), qui se touchent comme sur les photos.
    const mer = 'rgba(85,86,92,0.75)';
    T.tache(-16, 33, 16, 12, mer); T.tache(17, 28, 9, 8, mer); T.tache(31, 8, 12, 9, mer); T.tache(59, 17, 7, 6, mer);
    T.tache(51, -6, 8, 9, mer); T.tache(-17, -19, 11, 8, mer); T.tache(-52, 12, 16, 26, mer, 0.3); T.tache(-38, -24, 7, 6, mer);
    T.tache(5, 56, 40, 4.5, mer); T.tache(24, -14, 8, 6, mer); T.tache(5, 12, 9, 6, mer); T.tache(-30, 5, 12, 10, mer);
    // Tycho et ses rayons
    T.tache(-11, -43, 2.5, 2.5, 'rgba(240,240,235,0.9)');
    T.g.strokeStyle = 'rgba(235,235,230,0.25)'; T.g.lineWidth = 1;
    for (let i = 0; i < 10; i++) { const [x, y] = T.P(-11, -43); const a = i * 0.63; T.g.beginPath(); T.g.moveTo(x, y); T.g.lineTo(x + Math.cos(a) * T.W * 0.12, y + Math.sin(a) * T.H * 0.2); T.g.stroke(); }
  },
  mercure(T) { T.fond('#9b9690'); T.marbrure(40, 3, 12, 'rgba(70,65,60,0.25)'); T.crateres(320, 21, 2); T.tache(170, 30, 12, 10, 'rgba(200,190,170,0.35)'); },
  venus(T) {
    T.fond('#e6d39c');
    for (let i = 0; i < 10; i++) T.bande(-70 + i * 14, -62 + i * 14, i % 2 ? 'rgba(200,170,110,0.35)' : 'rgba(250,240,200,0.35)', 6, 2, i);
    // Le « Y » couché des nuages, vu aux UV
    T.bande(-8, 8, 'rgba(190,160,100,0.25)', 14, 1, 0);
  },
  mars(T) {
    T.fond('#c1572f');
    T.marbrure(30, 7, 12, 'rgba(220,130,80,0.35)');
    const sombre = 'rgba(80,45,30,0.7)';
    T.tache(70, 10, 12, 14, sombre, 0.4);   // Syrtis Major
    T.tache(-30, 45, 22, 10, sombre);       // Acidalia
    T.tache(-40, -25, 30, 8, sombre);       // Mare Erythraeum
    T.tache(0, -5, 18, 5, sombre);          // Sinus Meridiani
    T.tache(110, 45, 25, 9, 'rgba(90,55,35,0.5)');   // Utopia
    T.tache(-160, -15, 25, 7, 'rgba(90,55,35,0.5)'); // Sirenum
    T.tache(-112, 2, 8, 10, 'rgba(150,80,50,0.6)');  // Tharsis
    T.tache(-134, 18, 3, 3, 'rgba(230,170,120,0.8)'); // Olympus Mons
    T.tache(70, -42, 15, 9, 'rgba(230,180,140,0.5)'); // Hellas, clair
    T.g.strokeStyle = 'rgba(70,35,20,0.8)'; T.g.lineWidth = 2.5;       // Valles Marineris
    T.g.beginPath(); let p = T.P(-90, -6); T.g.moveTo(p[0], p[1]); p = T.P(-65, -10); T.g.lineTo(p[0], p[1]); p = T.P(-40, -12); T.g.lineTo(p[0], p[1]); T.g.stroke();
    T.bande(80, 90, '#f2f2f0', 2, 3); T.bande(-90, -83, '#f2f2f0', 1.5, 4);
    T.crateres(80, 31, 1.6, 'rgba(255,220,190,0.08)', 'rgba(60,30,20,0.12)');
  },
  jupiter(T) {
    T.fond('#d8c5a3');
    const bandes = [
      [-90, -60, '#a49f9a'], [-60, -45, '#c9b08a'], [-45, -37, '#b8936b'], [-37, -27, '#e3d4b8'], [-27, -19, '#efe3cc'],
      [-19, -7, '#a8724c'], [-7, 7, '#efe6d2'], [7, 18, '#9e6a46'], [18, 25, '#ece0c6'], [25, 32, '#b98d66'],
      [32, 40, '#e0cfb0'], [40, 50, '#b8987a'], [50, 60, '#cdb89a'], [60, 90, '#a8a49e'],
    ];
    bandes.forEach(([a, b, c], i) => T.bande(a, b, c, 1.2, 8 + i, i));
    T.lignes(70, 5, 'rgba(255,250,235,0.25)', 1);
    T.tache(-20, -22, 11, 5.5, '#c45a3a');          // Grande Tache rouge
    T.tache(-20, -22, 7, 3.5, '#d77a55');
    T.tache(40, -33, 3, 1.6, '#f5ecdc');            // ovale blanc
    T.tache(100, -33, 2.5, 1.4, '#f5ecdc');
  },
  saturne(T) {
    T.fond('#e2cf9e');
    const bandes = [[-90, -70, '#bfae8e'], [-70, -45, '#d8c391'], [-45, -25, '#e6d4a6'], [-25, -10, '#d2b67c'], [-10, 10, '#efe0b4'], [10, 25, '#d5b97f'], [25, 45, '#e4d3a5'], [45, 70, '#d2c08f'], [70, 90, '#9fa7a0']];
    bandes.forEach(([a, b, c], i) => T.bande(a, b, c, 0.8, 6 + i, i));
    // Hexagone du pôle Nord : bord à 78° qui ondule 6 fois.
    T.bande(76, 90, '#8f9a92', 2.2, 6, 0);
  },
  uranus(T) { T.fond('#a9dde3'); T.bande(-90, -55, 'rgba(255,255,255,0.18)', 0, 1); T.bande(-15, 15, 'rgba(120,190,200,0.15)', 1, 4); },
  neptune(T) {
    T.fond('#3c62d0');
    T.bande(-60, -45, 'rgba(40,70,170,0.6)', 1, 5); T.bande(-10, 10, 'rgba(80,120,230,0.4)', 1, 6); T.bande(30, 50, 'rgba(40,70,170,0.5)', 1, 4);
    T.tache(40, -20, 9, 5, '#22388f');                     // Grande Tache sombre
    T.tache(48, -27, 6, 1.2, 'rgba(255,255,255,0.8)');     // nuages blancs
    T.tache(-80, -40, 10, 1, 'rgba(255,255,255,0.6)'); T.tache(150, 25, 12, 1, 'rgba(255,255,255,0.5)');
  },
  io(T) {
    T.fond('#e0c95a');
    T.marbrure(40, 9, 10, 'rgba(240,235,200,0.5)'); T.marbrure(30, 19, 8, 'rgba(200,120,40,0.5)');
    for (let i = 0; i < 45; i++) T.tache(-180 + 360 * alea01(i * 1.7), -60 + 120 * alea01(i * 2.9), 1.5, 1.2, i % 4 ? '#3a2a1a' : '#c2401e');
    T.tache(-104, -18, 7, 6, 'rgba(200,70,30,0.45)'); // Pelé
    T.bande(70, 90, 'rgba(150,110,80,0.5)', 2, 3); T.bande(-90, -70, 'rgba(150,110,80,0.5)', 2, 3);
  },
  europe(T) { T.fond('#e7ddc8'); T.marbrure(25, 4, 14, 'rgba(180,140,100,0.3)'); T.lignes(90, 13, 'rgba(140,90,60,0.6)', 1.2); },
  ganymede(T) { T.fond('#9b8f7b'); T.marbrure(35, 17, 16, 'rgba(90,80,65,0.6)'); T.lignes(60, 23, 'rgba(210,200,185,0.35)', 1); T.crateres(120, 51, 1.5, 'rgba(255,255,255,0.25)'); T.bande(70, 90, 'rgba(230,230,230,0.4)', 2, 3); T.bande(-90, -70, 'rgba(230,230,230,0.4)', 2, 3); },
  callisto(T) { T.fond('#5d5246'); T.crateres(500, 61, 1.2, 'rgba(255,255,255,0.35)', 'rgba(0,0,0,0.1)'); T.tache(-56, 15, 10, 9, 'rgba(200,190,170,0.3)'); },
  titan(T) { T.fond('#d39a3e'); T.bande(-30, 30, 'rgba(180,120,40,0.35)', 2, 3); T.bande(60, 90, 'rgba(120,90,60,0.35)', 2, 2); },
  triton(T) { T.fond('#d6c0b2'); T.bande(-90, -15, 'rgba(240,225,215,0.7)', 5, 3); T.marbrure(40, 33, 5, 'rgba(150,120,110,0.35)'); T.lignes(30, 3, 'rgba(120,90,80,0.3)', 1); },
  pluton(T) {
    T.fond('#c8a985');
    T.marbrure(20, 41, 12, 'rgba(120,80,50,0.4)');
    T.tache(-180, 20, 22, 18, '#f0e6d8');                         // Tombaugh Regio (le « cœur »)
    T.tache(-162, 28, 14, 14, '#f0e6d8');
    T.tache(140, -5, 45, 10, '#4a3022');                          // Cthulhu, sombre
    T.bande(70, 90, 'rgba(200,170,140,0.6)', 2, 3);
  },
  l901(T) { T.fond('#a39d97'); T.crateres(90, 71, 1.6); T.bande(70, 90, 'rgba(120,60,40,0.7)', 3, 3); },        // Charon (Mordor Macula)
  l602(T) { T.fond('#f2f2f0'); T.crateres(90, 81, 1.4, 'rgba(255,255,255,0.15)', 'rgba(150,160,170,0.2)'); for (let i = 0; i < 4; i++) T.bande(-80 + i * 3.5, -79 + i * 3.5, 'rgba(110,160,190,0.7)', 1.5, 2, i); }, // Encelade
  l608(T) { T.fond('#e8e3d8'); T.g.fillStyle = '#3d2c22'; T.g.fillRect(T.W * 0.5, 0, T.W * 0.5, T.H); T.tache(90, 0, 60, 50, '#3d2c22'); T.crateres(80, 91, 2); },  // Japet
  l601(T) { T.fond('#c9c4bb'); T.crateres(200, 101, 1.6); T.tache(-112, 0, 18, 16, 'rgba(120,115,110,0.6)'); T.tache(-112, 0, 3, 3, 'rgba(200,195,190,0.8)'); }, // Mimas (Herschel)
  rhea(T) { T.fond('#cfcac2'); T.crateres(300, 111, 1.6); },
  l604(T) { T.fond('#bcb6ad'); T.crateres(220, 121, 1.5); T.lignes(20, 7, 'rgba(255,255,255,0.4)', 1); },
  l603(T) { T.fond('#d6d1c8'); T.crateres(220, 131, 1.5); T.tache(-130, 30, 18, 16, 'rgba(150,145,140,0.5)'); },
  a1(T) { T.fond('#7a7369'); T.crateres(200, 141, 1.8); T.tache(-120, 20, 1.5, 1.5, '#f5f5f0'); T.tache(-118, 19, 0.8, 0.8, '#ffffff'); }, // Cérès (Occator)
  titania(T) { T.fond('#a39b93'); T.crateres(200, 151, 1.5); T.lignes(15, 9, 'rgba(60,55,50,0.5)', 1.5); },
  oberon(T) { T.fond('#8f857b'); T.crateres(220, 161, 1.6, 'rgba(255,255,255,0.2)'); },
};

function peintreGenerique(T, a) {
  const c = a.couleurs.disque;
  T.fond(c);
  if (a.type === 'gazeuse') {
    for (let i = 0; i < 12; i++) T.bande(-90 + i * 15, -82 + i * 15, i % 2 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)', 1, 5, i);
  } else {
    T.marbrure(20, a.id.length * 13, 12, 'rgba(0,0,0,0.12)');
    T.crateres(Math.round(140 + 60 * alea01(a.id.length)), a.id.charCodeAt(1) || 7, 1.8);
  }
}

// ---------- Cartes en mémoire ----------
const CARTES = new Map();
function carteAstre(a) {
  let t = CARTES.get(a.id);
  if (t) return t;
  const W = a.id === 'terre' ? 1024 : 256, H = W / 2;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const T = outilsCarte(g, W, H);
  (PEINTRES[a.id] || peintreGenerique)(T, a);
  t = { W, H, data: g.getImageData(0, 0, W, H).data };
  CARTES.set(a.id, t);
  return t;
}

// Rotation propre (heures, négatif = rétrograde). Les lunes sans valeur tournent en synchronisme.
const ROTATION_H = { soleil: 609, mercure: 1407.6, venus: -5832.5, terre: 23.934, mars: 24.623, jupiter: 9.925, saturne: 10.656, uranus: -17.24, neptune: 16.11, pluton: -153.3 };

// Longitude du méridien tourné vers l'observateur (pôle) ou au centre du disque (équateur), en degrés.
function longitudeVue(a, t, versParent) {
  const P = ROTATION_H[a.id];
  if (P) return ((t / 3600 / P) * 360) % 360;
  // Rotation synchrone : la même face regarde la planète (longitude 0 vers elle).
  return versParent || 0;
}

// ---------- Globes ----------
// vue : 'pole' (vu du pôle Nord) ou 'equateur'. lumiere : [lx, ly, lz] vers le Soleil (repère écran, y vers le bas, z vers nous).
// lon0 : longitude au centre (équateur) ou au bas du disque (pôle), en degrés.
const GLOBES = new Map();
function rendreGlobe(a, R, vue, lon0, lumiere) {
  const carte = carteAstre(a);
  const D = 2 * R;
  const cv = document.createElement('canvas');
  cv.width = D; cv.height = D;
  const g = cv.getContext('2d');
  const img = g.createImageData(D, D);
  const px = img.data, src = carte.data, W = carte.W, H = carte.H;
  const [lx, ly, lz] = lumiere;
  const gazeuse = a.type === 'gazeuse' || a.atm && a.atm.p0 > 10;
  const l0 = (lon0 * Math.PI) / 180;
  for (let j = 0; j < D; j++) {
    const y = (j + 0.5 - R) / R;
    for (let i = 0; i < D; i++) {
      const x = (i + 0.5 - R) / R;
      const r2 = x * x + y * y;
      if (r2 > 1) continue;
      const z = Math.sqrt(1 - r2);
      let lat, lon;
      if (vue === 'pole') {
        // Pôle Nord face à nous ; la longitude tourne dans le sens direct.
        lat = Math.asin(z);
        lon = Math.atan2(x, y) - l0;
      } else {
        lat = Math.asin(-y);
        lon = Math.atan2(x, z) + l0;
      }
      let u = ((lon / (2 * Math.PI)) + 0.5) % 1; if (u < 0) u += 1;
      const v = 0.5 - lat / Math.PI;
      const si = (Math.min(H - 1, Math.floor(v * H)) * W + Math.min(W - 1, Math.floor(u * W))) * 4;
      // Éclairage : diffus, avec un peu de lumière ambiante ; assombrissement au bord du disque.
      let e = x * lx + y * ly + z * lz;
      e = e > 0 ? 0.1 + 0.95 * e : 0.1 * Math.max(0, 1 + e * 3);
      const bord = gazeuse ? 0.55 + 0.45 * z : 0.85 + 0.15 * z;
      const k = e * bord;
      const d = (j * D + i) * 4;
      px[d] = Math.min(255, src[si] * k);
      px[d + 1] = Math.min(255, src[si + 1] * k);
      px[d + 2] = Math.min(255, src[si + 2] * k);
      // Bord adouci
      px[d + 3] = r2 > (1 - 2 / R) ? 255 * Math.max(0, (1 - r2) * R / 2) : 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// Dessine un astre en globe (avec cache). r : rayon à l'écran ; options : { vue, lon0, lumiere: angle (rad, écran) ou vecteur }.
function dessinerGlobe(ctx, a, x, y, r, options = {}) {
  if (r < 3.5 || a.type === 'etoile') {
    ctx.fillStyle = a.couleurs.disque;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const vue = options.vue || 'pole';
  const Rr = Math.min(140, Math.max(4, Math.round(r)));        // résolution du calcul (agrandi ensuite si besoin)
  const pasLon = Rr > 60 ? 3 : 8;
  const lon0 = Math.round((options.lon0 || 0) / pasLon) * pasLon;
  let L = options.lumiere;
  if (typeof L === 'number') L = [Math.cos(L) * 0.97, Math.sin(L) * 0.97, 0.25];
  if (!L) L = [-0.6, -0.4, 0.7];
  const n = Math.hypot(L[0], L[1], L[2]) || 1;
  L = [L[0] / n, L[1] / n, L[2] / n];
  const q = (v) => Math.round(v * 16) / 16;
  const cle = `${a.id}|${vue}|${Rr}|${lon0}|${q(L[0])}|${q(L[1])}|${q(L[2])}`;
  let cv = GLOBES.get(cle);
  if (!cv) {
    cv = rendreGlobe(a, Rr, vue, lon0, [q(L[0]), q(L[1]), q(L[2])]);
    GLOBES.set(cle, cv);
    if (GLOBES.size > 80) GLOBES.delete(GLOBES.keys().next().value);   // on oublie les plus anciens
  }
  // Anneaux de Saturne : derrière puis devant le globe (vue équatoriale), ou couronne (vue polaire).
  const anneaux = a.id === 'saturne';
  if (anneaux && vue !== 'pole') dessinerAnneaux(ctx, x, y, r, 'arriere', options.inclinaisonAnneaux);
  if (anneaux && vue === 'pole') dessinerAnneaux(ctx, x, y, r, 'pole');
  ctx.drawImage(cv, x - r, y - r, 2 * r, 2 * r);
  if (anneaux && vue !== 'pole') dessinerAnneaux(ctx, x, y, r, 'avant', options.inclinaisonAnneaux);
  // Atmosphère : fin liseré coloré
  if (a.atm && a.atm.p0 > 0.003 && r > 8) {
    ctx.strokeStyle = a.id === 'terre' ? 'rgba(120,180,255,0.45)' : a.id === 'mars' ? 'rgba(255,170,120,0.25)' : 'rgba(255,230,180,0.3)';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.beginPath(); ctx.arc(x, y, r * 1.015, 0, Math.PI * 2); ctx.stroke();
  }
}

// Anneaux de Saturne (A, division de Cassini, B, C).
function dessinerAnneaux(ctx, x, y, r, partie, inclinaison = 0.32) {
  const zones = [[1.24, 1.53, 'rgba(150,135,110,0.35)'], [1.53, 1.95, 'rgba(225,205,165,0.85)'], [1.95, 2.03, 'rgba(0,0,0,0)'], [2.03, 2.27, 'rgba(205,188,150,0.75)']];
  ctx.save();
  if (partie === 'pole') {
    for (const [a, b, c] of zones) {
      ctx.strokeStyle = c; ctx.lineWidth = (b - a) * r;
      ctx.beginPath(); ctx.arc(x, y, ((a + b) / 2) * r, 0, Math.PI * 2); ctx.stroke();
    }
    // Ombre de la planète sur les anneaux (côté nuit) : simple bande sombre
    ctx.restore();
    return;
  }
  ctx.translate(x, y);
  ctx.scale(1, inclinaison);
  ctx.beginPath();
  if (partie === 'arriere') ctx.rect(-3 * r, -3 * r, 6 * r, 3 * r); else ctx.rect(-3 * r, 0, 6 * r, 3 * r);
  ctx.clip();
  for (const [a, b, c] of zones) {
    ctx.strokeStyle = c; ctx.lineWidth = (b - a) * r;
    ctx.beginPath(); ctx.arc(0, 0, ((a + b) / 2) * r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// Petite image d'un astre (fiches) : URL d'image.
function imageAstre(a, taille = 64) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = taille * 2;
  const g = cv.getContext('2d');
  if (a.type === 'etoile') {
    const gr = g.createRadialGradient(taille, taille, 0, taille, taille, taille);
    gr.addColorStop(0, '#fff8d0'); gr.addColorStop(0.7, '#ffc040'); gr.addColorStop(1, '#ff8000');
    g.fillStyle = gr; g.beginPath(); g.arc(taille, taille, taille * 0.9, 0, Math.PI * 2); g.fill();
  } else {
    dessinerGlobe(g, a, taille, taille, taille * (a.id === 'saturne' ? 0.42 : 0.9), { vue: 'equateur', lon0: 0, lumiere: [-0.5, -0.3, 0.8], inclinaisonAnneaux: 0.35 });
  }
  return cv.toDataURL();
}
