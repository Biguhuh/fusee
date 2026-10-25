'use strict';
// Mécanique orbitale en 2D (unités : km, s, km/s).
// - positions des astres à une date (orbites képlériennes)
// - propagation d'un vaisseau (variables universelles), changements de sphère d'influence
// - solveur de Lambert (trajectoire entre deux points en un temps donné)

const DEG = Math.PI / 180;

// ---------- Vecteurs 2D ----------
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, k) => [a[0] * k, a[1] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  cross: (a, b) => a[0] * b[1] - a[1] * b[0],
  norm: (a) => Math.hypot(a[0], a[1]),
  unit: (a) => { const n = Math.hypot(a[0], a[1]) || 1; return [a[0] / n, a[1] / n]; },
  rot: (a, ang) => [a[0] * Math.cos(ang) - a[1] * Math.sin(ang), a[0] * Math.sin(ang) + a[1] * Math.cos(ang)],
};

// ---------- Orbites des astres ----------
function resoudreKepler(M, e) {
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

// Position et vitesse d'un astre par rapport à son centre, à l'instant t (s depuis J2000).
function etatRelatif(astre, t) {
  const o = astre.orbite;
  if (!o) return { r: [0, 0], v: [0, 0] };
  const nRad = (o.n * DEG) / JOUR;          // rad/s
  const M = o.M0 * DEG + nRad * t;
  const E = resoudreKepler(M, o.e);
  const cosE = Math.cos(E), sinE = Math.sin(E);
  const b = Math.sqrt(1 - o.e * o.e);
  let x = o.a * (cosE - o.e), y = o.a * b * sinE;
  const k = (o.a * nRad) / (1 - o.e * cosE);
  let vx = -k * sinE, vy = k * b * cosE;
  if (o.retro) { y = -y; vy = -vy; }
  const w = o.varpi * DEG;
  return { r: V.rot([x, y], w), v: V.rot([vx, vy], w) };
}

// Position et vitesse héliocentriques (somme sur la chaîne des centres).
const cacheEtats = new Map();
let cacheT = NaN;
function etatAbsolu(id, t) {
  if (t !== cacheT) { cacheEtats.clear(); cacheT = t; }
  const c = cacheEtats.get(id);
  if (c) return c;
  const astre = ASTRES_PAR_ID[id];
  let res;
  if (!astre.orbite) res = { r: [0, 0], v: [0, 0] };
  else {
    const rel = etatRelatif(astre, t);
    const p = etatAbsolu(astre.orbite.centre, t);
    res = { r: V.add(p.r, rel.r), v: V.add(p.v, rel.v) };
  }
  cacheEtats.set(id, res);
  return res;
}

function ancetres(id) {
  const l = [];
  for (let a = ASTRES_PAR_ID[id]; a; a = a.orbite ? ASTRES_PAR_ID[a.orbite.centre] : null) l.push(a.id);
  return l; // [id, parent, ..., 'soleil']
}

// ---------- Propagation képlérienne (variables universelles) ----------
function stumpffC(z) {
  if (z > 1e-8) return (1 - Math.cos(Math.sqrt(z))) / z;
  if (z < -1e-8) return (Math.cosh(Math.sqrt(-z)) - 1) / -z;
  return 0.5 - z / 24;
}
function stumpffS(z) {
  if (z > 1e-8) { const s = Math.sqrt(z); return (s - Math.sin(s)) / (s * s * s); }
  if (z < -1e-8) { const s = Math.sqrt(-z); return (Math.sinh(s) - s) / (s * s * s); }
  return 1 / 6 - z / 120;
}

function propager(r0v, v0v, dt, mu) {
  const r0 = V.norm(r0v), v0 = V.norm(v0v);
  const vr0 = V.dot(r0v, v0v) / r0;
  const alpha = 2 / r0 - (v0 * v0) / mu;      // 1/a
  // Orbite fermée : on enlève les tours complets.
  if (alpha > 1e-12) {
    const P = 2 * Math.PI * Math.sqrt(1 / (alpha * alpha * alpha * mu));
    dt = dt % P;
  }
  const sm = Math.sqrt(mu);
  if (dt === 0) return { r: r0v.slice(), v: v0v.slice() };
  // F(x) est strictement croissante (dF/dx = r > 0) : on encadre la racine puis Newton protégé.
  const F = (x) => {
    const z = alpha * x * x;
    const f = (r0 * vr0 / sm) * x * x * stumpffC(z) + (1 - alpha * r0) * x * x * x * stumpffS(z) + r0 * x - sm * dt;
    return isFinite(f) ? f : (x > 0 ? Infinity : -Infinity);
  };
  const dF = (x) => {
    const z = alpha * x * x;
    return (r0 * vr0 / sm) * x * (1 - alpha * x * x * stumpffS(z)) + (1 - alpha * r0) * x * x * stumpffC(z) + r0;
  };
  let lo, hi;
  const pas0 = Math.max(1e-6, Math.abs((sm * dt) / r0));
  if (dt > 0) { lo = 0; hi = pas0; while (F(hi) < 0) { lo = hi; hi *= 2; } }
  else { hi = 0; lo = -pas0; while (F(lo) > 0) { hi = lo; lo *= 2; } }
  let x = (lo + hi) / 2;
  for (let i = 0; i < 200; i++) {
    const f = F(x);
    if (f > 0) hi = x; else lo = x;
    let xn = x - f / dF(x);
    if (!(xn > lo && xn < hi)) xn = (lo + hi) / 2;
    if (Math.abs(xn - x) < 1e-10 * Math.max(1, Math.abs(xn))) { x = xn; break; }
    x = xn;
  }
  const z = alpha * x * x;
  const C = stumpffC(z), S = stumpffS(z);
  const f = 1 - (x * x / r0) * C;
  const g = dt - (x * x * x / sm) * S;
  const rv = V.add(V.mul(r0v, f), V.mul(v0v, g));
  const r = V.norm(rv);
  const fd = (sm / (r * r0)) * (alpha * x * x * x * S - x);
  const gd = 1 - (x * x / r) * C;
  const vv = V.add(V.mul(r0v, fd), V.mul(v0v, gd));
  return { r: rv, v: vv };
}

// Éléments utiles d'une orbite relative.
function elements(rv, vv, mu) {
  const r = V.norm(rv), v = V.norm(vv);
  const energie = (v * v) / 2 - mu / r;
  const h = V.cross(rv, vv);
  const a = -mu / (2 * energie);
  const e = Math.sqrt(Math.max(0, 1 + (2 * energie * h * h) / (mu * mu)));
  const rp = (h * h) / mu / (1 + e);
  const ra = e < 1 ? a * (1 + e) : Infinity;
  const periode = e < 1 ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : Infinity;
  return { a, e, rp, ra, h, energie, periode };
}

// ---------- Lambert (algorithme de Curtis, 1 révolution max) ----------
function lambert(r1v, r2v, tof, mu, prograde = true) {
  const r1 = V.norm(r1v), r2 = V.norm(r2v);
  const cz = V.cross(r1v, r2v);
  let dth = Math.acos(Math.max(-1, Math.min(1, V.dot(r1v, r2v) / (r1 * r2))));
  if (prograde ? cz < 0 : cz >= 0) dth = 2 * Math.PI - dth;
  const A = Math.sin(dth) * Math.sqrt((r1 * r2) / (1 - Math.cos(dth)));
  if (!isFinite(A) || Math.abs(A) < 1e-9) return null;
  const y = (z) => r1 + r2 + (A * (z * stumpffS(z) - 1)) / Math.sqrt(stumpffC(z));
  const temps = (z) => {
    const yz = y(z);
    if (yz < 0) return NaN;
    return (Math.pow(yz / stumpffC(z), 1.5) * stumpffS(z) + A * Math.sqrt(yz)) / Math.sqrt(mu);
  };
  let bas = -4 * Math.PI * Math.PI * 4;
  while (!(y(bas) > 0) && bas < 4 * Math.PI * Math.PI) bas += 0.1;
  let haut = 4 * Math.PI * Math.PI - 1e-6;
  const tb = temps(bas), th = temps(haut);
  if (!(tb < tof) || !(th > tof)) {
    // Hors de portée en une demi-révolution simple : on élargit vers les hyperboles.
    if (tb > tof) {
      let k = 0;
      while (temps(bas) > tof && k++ < 200) { bas -= 10; if (!(y(bas) > 0)) return null; }
      if (k >= 200) return null;
    } else return null;
  }
  let z = 0;
  for (let i = 0; i < 200; i++) {
    z = (bas + haut) / 2;
    const t = temps(z);
    if (!isFinite(t)) { bas = z; continue; }
    if (t < tof) bas = z; else haut = z;
    if (Math.abs(t - tof) < 1e-6 * tof) break;
  }
  const yz = y(z);
  const f = 1 - yz / r1;
  const g = A * Math.sqrt(yz / mu);
  const gd = 1 - yz / r2;
  return { v1: V.mul(V.sub(r2v, V.mul(r1v, f)), 1 / g), v2: V.mul(V.sub(V.mul(r2v, gd), r1v), 1 / g) };
}

// ---------- Vaisseaux (orbiteur, sondes, stations) ----------
// Un vaisseau : { centre: id, r: [km], v: [km/s] } relatif à son centre.

function changerCentre(vs, nouveau, t) {
  const a = etatAbsolu(vs.centre, t), b = etatAbsolu(nouveau, t);
  vs.r = V.sub(V.add(vs.r, a.r), b.r);
  vs.v = V.sub(V.add(vs.v, a.v), b.v);
  vs.centre = nouveau;
}

// Enfant du centre dont on est dans la sphère d'influence (ou null).
function enfantProche(vs, t) {
  const enfants = ENFANTS[vs.centre];
  if (!enfants) return null;
  const r = V.norm(vs.r);
  for (const c of enfants) {
    const o = c.orbite;
    const q = o.a * (1 - o.e), Q = o.a * (1 + o.e);
    if (r < q - c.soi || r > Q + c.soi) continue;
    const p = etatRelatif(c, t);
    if (V.norm(V.sub(vs.r, p.r)) < c.soi) return c.id;
  }
  return null;
}

// Pas de temps sûr : on ne doit pas sauter par-dessus une sphère d'influence.
function pasSur(vs, t) {
  const r = V.norm(vs.r), v = V.norm(vs.v) || 1e-6;
  let pas = Infinity;
  const centre = ASTRES_PAR_ID[vs.centre];
  if (centre.soi < Infinity) pas = Math.min(pas, Math.max(1, (centre.soi - r) / v * 0.5 + 1));
  const enfants = ENFANTS[vs.centre];
  if (enfants) {
    for (const c of enfants) {
      const o = c.orbite;
      const q = o.a * (1 - o.e), Q = o.a * (1 + o.e);
      const marge = Math.max(0, q - r, r - Q) - c.soi;
      if (marge > 0) { pas = Math.min(pas, marge / (v + 1e-9) * 0.5 + 1); continue; }
      const p = etatRelatif(c, t);
      const d = V.norm(V.sub(vs.r, p.r)) - c.soi;
      const vrel = v + V.norm(p.v);
      pas = Math.min(pas, Math.max(1, d / vrel * 0.5));
    }
  }
  // Près de l'astre central, on reste précis.
  pas = Math.min(pas, Math.max(5, (2 * Math.PI * Math.sqrt((r * r * r) / centre.gm)) / 60));
  return pas;
}

// Avance un vaisseau de dt sans poussée. Renvoie les événements (changement de centre, impact).
// arret = true : on s'arrête au premier changement de sphère d'influence (renvoie 'changement',
// l'instant exact est dans le dernier événement).
function avancerVaisseau(vs, t, dt, evenements, arret = false) {
  let restant = dt, tc = t, n = 0;
  while (restant > 1e-6 && n++ < 4000) {
    const h = Math.min(restant, pasSur(vs, tc));
    const centre = ASTRES_PAR_ID[vs.centre];
    const p = propager(vs.r, vs.v, h, centre.gm);
    // Impact avec la surface ?
    const el = elements(vs.r, vs.v, centre.gm);
    if (el.rp < centre.rayonKm && V.norm(p.r) < centre.rayonKm * 1.0 + 1) {
      vs.r = p.r; vs.v = p.v;
      if (evenements) evenements.push({ type: 'impact', centre: vs.centre, t: tc + h });
      return 'impact';
    }
    vs.r = p.r; vs.v = p.v;
    tc += h; restant -= h;
    // Sortie de la sphère d'influence
    if (centre.soi < Infinity && V.norm(vs.r) > centre.soi) {
      const ancien = vs.centre;
      changerCentre(vs, centre.orbite.centre, tc);
      if (evenements) evenements.push({ type: 'sortie', de: ancien, vers: vs.centre, t: tc });
      if (arret) return 'changement';
      continue;
    }
    const enfant = enfantProche(vs, tc);
    if (enfant) {
      changerCentre(vs, enfant, tc);
      if (evenements) evenements.push({ type: 'entree', vers: enfant, t: tc });
      if (arret) return 'changement';
    }
  }
  if (evenements) evenements.tFin = tc;   // instant réellement atteint (utile si le calcul est interrompu)
  return n >= 4000 ? 'incomplet' : null;
}

// Avance avec poussée (intégration numérique, RK4). accel : fonction(vs) → [km/s²].
function avancerAvecPoussee(vs, t, dt, accel) {
  const centre = ASTRES_PAR_ID[vs.centre];
  const mu = centre.gm;
  const f = (r, v) => {
    const d = V.norm(r);
    const g = V.mul(r, -mu / (d * d * d));
    return [v, V.add(g, accel({ centre: vs.centre, r, v }))];
  };
  const [k1r, k1v] = f(vs.r, vs.v);
  const [k2r, k2v] = f(V.add(vs.r, V.mul(k1r, dt / 2)), V.add(vs.v, V.mul(k1v, dt / 2)));
  const [k3r, k3v] = f(V.add(vs.r, V.mul(k2r, dt / 2)), V.add(vs.v, V.mul(k2v, dt / 2)));
  const [k4r, k4v] = f(V.add(vs.r, V.mul(k3r, dt)), V.add(vs.v, V.mul(k3v, dt)));
  vs.r = V.add(vs.r, V.mul(V.add(V.add(k1r, V.mul(k2r, 2)), V.add(V.mul(k3r, 2), k4r)), dt / 6));
  vs.v = V.add(vs.v, V.mul(V.add(V.add(k1v, V.mul(k2v, 2)), V.add(V.mul(k3v, 2), k4v)), dt / 6));
  // Changements de sphère d'influence après la poussée.
  if (centre.soi < Infinity && V.norm(vs.r) > centre.soi) changerCentre(vs, centre.orbite.centre, t + dt);
  else { const e = enfantProche(vs, t + dt); if (e) changerCentre(vs, e, t + dt); }
  if (V.norm(vs.r) < ASTRES_PAR_ID[vs.centre].rayonKm) return 'impact';
  return null;
}

// Temps pour sortir de la sphère d'influence du centre (trajectoire sans poussée), ou Infinity.
function tempsSortieSoi(vs) {
  const c = ASTRES_PAR_ID[vs.centre];
  if (!isFinite(c.soi)) return Infinity;
  const loin = (dt) => V.norm(propager(vs.r, vs.v, dt, c.gm).r) >= c.soi;
  if (V.norm(vs.r) >= c.soi) return 0;
  let haut = 60, n = 0;
  while (!loin(haut) && n++ < 60) haut *= 2;
  if (n >= 60) return Infinity;
  let bas = haut / 2;
  for (let i = 0; i < 40; i++) { const m = (bas + haut) / 2; if (loin(m)) haut = m; else bas = m; }
  return haut;
}

// Durée à prévoir dans la sphère d'influence courante : une période pour une orbite fermée,
// le temps de sortie pour une trajectoire ouverte.
function horizonTroncon(vs, dureeMax) {
  const c = ASTRES_PAR_ID[vs.centre];
  const el = elements(vs.r, vs.v, c.gm);
  if (el.e < 1 && el.ra < c.soi) return Math.min(dureeMax, el.periode * 1.02);
  const sortie = tempsSortieSoi(vs);
  if (isFinite(sortie)) return Math.min(dureeMax, sortie * 1.02 + 1);
  return Math.min(dureeMax, isFinite(el.periode) ? el.periode : 5 * 365.25 * JOUR);
}

// Trajectoire prévue : liste de tronçons { centre, points:[[x,y] relatifs], fin }.
// Chaque tronçon (une sphère d'influence) a son propre horizon et ses propres points : pas de grands traits
// droits quand on passe d'une petite sphère (la Lune) à une grande (la Terre, le Soleil).
function predireTrajectoire(vs, t, duree, nPoints = 240) {
  const copie = { centre: vs.centre, r: vs.r.slice(), v: vs.v.slice() };
  const segments = [];
  let tc = t, reste = duree;
  const parTroncon = Math.max(60, Math.round(nPoints / 2));
  for (let k = 0; k < 3 && reste > 0; k++) {
    const seg = { centre: copie.centre, points: [copie.r.slice()] };
    segments.push(seg);
    const horizon = horizonTroncon(copie, reste);
    const dt = horizon / parTroncon;
    let change = false;
    for (let i = 0; i < parTroncon; i++) {
      const ev = [];
      const res = avancerVaisseau(copie, tc, dt, ev, true);
      if (res === 'changement') {
        const te = ev[ev.length - 1].t;
        // Dernier point du tronçon : le point exact de passage, exprimé dans l'ancien repère.
        const ancien = etatAbsolu(seg.centre, te), nouveau = etatAbsolu(copie.centre, te);
        seg.points.push(V.sub(V.add(copie.r, nouveau.r), ancien.r));
        reste -= te - tc; tc = te;
        seg.fin = { type: ev[ev.length - 1].type, t: tc };
        change = true;
        break;
      }
      tc += dt; reste -= dt;
      seg.points.push(copie.r.slice());
      if (res === 'impact') { seg.fin = { type: 'impact', t: tc }; return segments; }
    }
    if (!change) break;
  }
  return segments;
}
