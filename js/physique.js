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
