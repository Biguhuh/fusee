'use strict';
// ---------- Formes des astres non sphériques ----------
// Sous ~200 km de rayon, la gravité ne suffit plus à arrondir un astre. Pour ceux qu'une sonde a photographiés,
// une silhouette inspirée de la vraie : demi-axes a ≥ b ≥ c (km, valeurs NASA/JPL arrondies), vus de profil (a × c),
// et un style de relief. Les autres petits astres (jamais vus de près) reçoivent une forme irrégulière générique.
// styles : 'patate' (bosselé), 'lisse', 'eponge' (Hypérion), 'arete' (crête équatoriale : Atlas, Pan, Daphnis),
//          'facettes' (Protée), 'deuxLobes'.
const FORMES_ASTRES = {
  l401: { nom: 'Phobos', axes: [13.0, 11.4, 9.1], style: 'patate', crateres: [[0.62, -0.05, 0.36]], source: 'Mars Express, MRO' },
  l402: { nom: 'Déimos', axes: [7.8, 6.0, 5.1], style: 'lisse', source: 'Viking, MRO' },
  l505: { nom: 'Amalthée', axes: [125, 73, 64], style: 'patate', source: 'Galileo' },
  l514: { nom: 'Thébé', axes: [58, 49, 42], style: 'patate', crateres: [[0.3, 0.1, 0.45]], source: 'Galileo' },
  l516: { nom: 'Métis', axes: [30, 20, 17], style: 'patate', source: 'Galileo' },
  l515: { nom: 'Adrastée', axes: [10, 8, 7], style: 'patate', source: 'Galileo' },
  l506: { nom: 'Himalia', axes: [75, 70, 60], style: 'patate', source: 'Cassini, New Horizons' },
  l607: { nom: 'Hypérion', axes: [180, 133, 103], style: 'eponge', source: 'Cassini' },
  l609: { nom: 'Phœbé', axes: [109, 109, 102], style: 'patate', crateres: [[-0.25, -0.2, 0.4]], source: 'Cassini' },
  l610: { nom: 'Janus', axes: [101, 93, 76], style: 'patate', source: 'Cassini' },
  l611: { nom: 'Épiméthée', axes: [65, 57, 53], style: 'facettes', source: 'Cassini' },
  l616: { nom: 'Prométhée', axes: [68, 41, 28], style: 'patate', source: 'Cassini' },
  l617: { nom: 'Pandore', axes: [52, 41, 32], style: 'patate', source: 'Cassini' },
  l615: { nom: 'Atlas', axes: [20.5, 17.8, 9.4], style: 'arete', source: 'Cassini' },
  l618: { nom: 'Pan', axes: [17.2, 15.7, 10.4], style: 'arete', source: 'Cassini' },
  l635: { nom: 'Daphnis', axes: [4.6, 4.5, 2.8], style: 'arete', source: 'Cassini' },
  l612: { nom: 'Hélène', axes: [22.5, 19.6, 13.3], style: 'patate', source: 'Cassini' },
  l613: { nom: 'Télesto', axes: [16.6, 11.7, 9.6], style: 'lisse', source: 'Cassini' },
  l614: { nom: 'Calypso', axes: [15.3, 9.3, 6.3], style: 'lisse', source: 'Cassini' },
  l808: { nom: 'Protée', axes: [218, 208, 201], style: 'facettes', crateres: [[0.2, 0.15, 0.5]], source: 'Voyager 2' },
  l807: { nom: 'Larissa', axes: [108, 102, 84], style: 'patate', source: 'Voyager 2' },
  l902: { nom: 'Nix', axes: [25, 17.5, 16.5], style: 'patate', source: 'New Horizons' },
  l903: { nom: 'Hydre', axes: [25.5, 18, 15.5], style: 'deuxLobes', source: 'New Horizons' },
  a16: { nom: 'Psyché', axes: [139, 119, 85.5], style: 'patate', source: 'télescopes (la sonde Psyché arrive en 2029)' },
  a15: { nom: 'Eunomie', axes: [178, 128, 106], style: 'patate', source: 'télescopes' },
  a3: { nom: 'Junon', axes: [160, 133, 100], style: 'patate', source: 'télescopes' },
};
const RAYON_MAX_IRREGULIER = 150;   // km : au-dessous, un astre sans forme connue reçoit une forme générique

// Forme d'un astre (null : rond). La forme générique dépend de l'identifiant : toujours la même pour un astre.
function formeAstre(a) {
  if (!a || a.type !== 'solide') return null;
  if (FORMES_ASTRES[a.id]) return FORMES_ASTRES[a.id];
  if (a.rayonKm >= RAYON_MAX_IRREGULIER) return null;
  let h = 0;
  for (const ch of a.id) h = (h * 31 + ch.charCodeAt(0)) % 100000;
  const c = 0.55 + 0.35 * alea01(h);   // aplatissement c/a
  return { nom: a.nom, axes: [1, (1 + c) / 2, c], style: 'patate', generique: true, graine: h };
}

// Profil de la silhouette : rayon relatif selon l'angle (1 au bout du grand axe).
function profilForme(f) {
  const [A, , C] = f.axes, b = C / A;
  const g = f.graine ?? Object.keys(FORMES_ASTRES).indexOf(f.nom) * 17 + 3;
  const ph = (k) => alea01(g * 7 + k) * Math.PI * 2;
  return (t) => {
    const e = 1 / Math.sqrt((Math.cos(t) ** 2) + (Math.sin(t) / b) ** 2) ;   // ellipse a × c (rayon, a = 1)
    let k = 1;
    switch (f.style) {
      case 'lisse': k += 0.03 * Math.sin(3 * t + ph(1)); break;
      case 'eponge': k += 0.07 * Math.sin(3 * t + ph(1)) + 0.05 * Math.sin(7 * t + ph(2)) + 0.03 * Math.sin(13 * t + ph(3)); break;
      case 'arete': {   // « soucoupe » : crête équatoriale fine et pointue, dôme au centre (Atlas, Pan, Daphnis)
        const n = 1.25, crete = Math.pow(Math.pow(Math.abs(Math.cos(t)), n) + Math.pow(Math.abs(Math.sin(t)) / 0.3, n), -1 / n);   // bourrelet aplati, bouts arrondis
        const dome = 0.95 * b;                                                        // le dôme central, rond (hauteur c)
        return Math.max(crete, dome * (1 + 0.03 * Math.sin(3 * t + ph(1))));
      }
      case 'facettes': {   // petites faces planes : polygone à 9 côtés, arrondi
        const n = 9, s = (2 * Math.PI) / n, u = ((t + ph(1)) % s + s) % s - s / 2;
        k *= Math.cos(s / 2) / Math.cos(u) * 0.97 + 0.03 * Math.sin(2 * t + ph(2));
        break;
      }
      case 'deuxLobes': k += 0.1 * Math.cos(2 * t) - 0.12 * Math.pow(Math.abs(Math.sin(t)), 6) + 0.04 * Math.sin(5 * t + ph(1)); break;
      default: k += 0.06 * Math.sin(2 * t + ph(1)) + 0.05 * Math.sin(3 * t + ph(2)) + 0.03 * Math.sin(5 * t + ph(3));   // patate
    }
    return e * k;
  };
}

// Dessine un astre irrégulier : l'image du globe (texture et éclairage), découpée à la silhouette, et ses cratères.
// r : rayon moyen à l'écran (celui du globe rond) ; la silhouette garde le même volume apparent.
function dessinerForme(ctx, cvGlobe, f, x, y, r, angle = 0) {
  const [A, B, C] = f.axes, m = Math.cbrt(A * B * C), ra = (r * A) / m, rc = (r * C) / m;
  const prof = profilForme(f);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const chemin = new Path2D();
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2, q = ra * prof(t);
    if (i) chemin.lineTo(Math.cos(t) * q, Math.sin(t) * q); else chemin.moveTo(Math.cos(t) * q, Math.sin(t) * q);
  }
  ctx.save();
  ctx.clip(chemin);
  ctx.drawImage(cvGlobe, -ra * 1.3, -rc * 1.3, ra * 2.6, rc * 2.6);
  // Cratères (Stickney sur Phobos…) : creux sombre, bord éclairé.
  for (const [cx, cy, cr] of f.crateres || []) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(cx * ra, cy * rc, cr * rc, cr * rc * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = Math.max(1, rc * 0.04);
    ctx.beginPath(); ctx.ellipse(cx * ra, cy * rc, cr * rc, cr * rc * 0.8, 0, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
  }
  // Hypérion : alvéoles profondes.
  if (f.style === 'eponge') {
    for (let i = 0; i < 14; i++) {
      const u = alea01(i * 3.1), w = alea01(i * 7.7), cr = rc * (0.08 + 0.1 * alea01(i * 1.3));
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc((u * 2 - 1) * ra * 0.75, (w * 2 - 1) * rc * 0.7, cr, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
  ctx.restore();
}
