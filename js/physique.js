'use strict';
// Conditions locales autour d'un astre, en fonction de l'altitude (m).
// Pour les géantes, l'altitude 0 est le niveau 1 bar ; en dessous elle est négative.

const G0 = 9.80665;      // m/s²
const KELVIN = 273.15;
const UA_M = 1.496e11;   // m

function conditions(astre, alt) {
  const R = astre.rayonKm * 1000;
  const g = astre.g * Math.pow(R / Math.max(R + alt, R * 0.05), 2);
  const a = astre.atm;
  let p = 0, rho = 0, t = astre.tempSurface;

  if (a) {
    if (alt >= 0) {
      const f = Math.exp(-alt / (a.H * 1000));
      p = a.p0 * f;
      rho = a.rho0 * f;
      t = Math.max(a.tHaut, a.t0 - a.gradient * alt / 1000);
    } else {
      // Sous le niveau de référence : gaz qui se comprime en s'échauffant (adiabatique).
      const T0 = a.t0 + KELVIN;
      const grad = Math.abs(a.gradient);
      const r = (T0 + grad * (-alt) / 1000) / T0;
      p = a.p0 * Math.pow(r, 3.5);
      rho = a.rho0 * Math.pow(r, 2.5);
      t = r * T0 - KELVIN;
    }
  }

  let dUA = astre.distanceUA;
  if (astre.type === 'etoile') {
    dUA = (R + alt) / UA_M;
    // Température d'équilibre d'un corps noir chauffé par le Soleil.
    if (alt >= 0) t = 278.6 / Math.sqrt(dUA) - KELVIN;
  }
  const rad = 1 / (dUA * dUA) + (astre.radiationLocale || 0);

  return { g, p, rho, t, rad, dUA };
}

// ---------- Relief ----------
function hash2(i, graine) { const s = Math.sin(i * 127.1 + graine * 311.7) * 43758.5453; return s - Math.floor(s); }

// Bruit lisse entre 0 et 1.
function bruit1D(x, graine) {
  const i = Math.floor(x), f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash2(i, graine), b = hash2(i + 1, graine);
  return a + (b - a) * u;
}

// Renvoie une fonction hauteur(x) en mètres (0 = niveau moyen), ou null si pas de sol.
function creerTerrain(astre) {
  const r = astre.relief;
  if (!r || astre.type !== 'solide') return null;
  const graine = (astre.rayonKm * 7.3) % 101;
  const tailleCase = r.longueur * 0.8;
  return function hauteur(x) {
    // Collines : plusieurs couches de bruit de plus en plus fines.
    let h = 0, amp = r.amplitude, L = r.longueur;
    for (let o = 0; o < 4; o++) {
      h += (bruit1D(x / L, graine + o) * 2 - 1) * amp;
      amp *= 0.45; L *= 0.42;
    }
    // Bosses et petites aspérités, proportionnelles au relief.
    const k = r.amplitude / 100;
    h += (bruit1D(x / 70, graine + 8) * 2 - 1) * 2.5 * k;
    h += (bruit1D(x / 18, graine + 9) * 2 - 1) * 0.7 * k;
    h += (bruit1D(x / 5, graine + 10) * 2 - 1) * 0.15 * k;
    // Cratères : cuvette et rebord.
    if (r.crateres > 0) {
      const k0 = Math.floor(x / tailleCase);
      for (let k = k0 - 1; k <= k0 + 1; k++) {
        if (hash2(k, graine + 20) > r.crateres) continue;
        const cx = (k + 0.2 + 0.6 * hash2(k, graine + 21)) * tailleCase;
        const rayon = tailleCase * (0.12 + 0.3 * hash2(k, graine + 22));
        const d = Math.abs(x - cx) / rayon;
        if (d < 1) h -= 0.2 * rayon * (1 - d * d);
        if (d < 1.6) h += 0.05 * rayon * Math.exp(-Math.pow((d - 1) / 0.15, 2));
      }
    }
    return h;
  };
}
