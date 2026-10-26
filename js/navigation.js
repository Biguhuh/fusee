'use strict';
// Navigation dans le système solaire : planification des manœuvres (commune à l'orbiteur et aux sondes).
//
// Le plan est recalculé à chaque étape (boucle fermée) :
//   1. on sort des sphères d'influence jusqu'à l'astre qui contient la cible,
//   2. transfert de Lambert vers la cible (meilleure fenêtre de tir), correction à mi-parcours,
//   3. à l'entrée dans la sphère d'influence : réglage du point le plus proche, puis capture en orbite basse.

const ORBITEUR = {
  masseSeche: 20000,      // kg
  carburantMax: 60000,    // kg
  isp: 3000,              // s : propulsion nucléaire-électrique avancée (optimiste)
  poussee: 400000,        // N
  sondes: 6,
  kits: 2,                // kits de station orbitale
  kitsBase: 1,            // kits de base au sol
  robots: 2,              // robots largables (aller simple)
  atterrisseurs: 2,
  ergolsAtt: 60000,       // kg d'ergols réservés à l'atterrisseur
};

// Rayon d'orbite basse autour d'un astre (km depuis le centre).
function rayonOrbiteBasse(a) {
  if (a.type === 'etoile') return a.rayonKm * 5;
  if (a.type === 'gazeuse') return a.rayonKm * 1.15;
  return a.rayonKm + Math.max(altitudeOrbite(a) / 1000, 0.2);
}

function etatVaisseauA(vs, dt) {
  if (dt === 0) return { r: vs.r.slice(), v: vs.v.slice() };
  return propager(vs.r, vs.v, dt, ASTRES_PAR_ID[vs.centre].gm);
}

// Temps jusqu'au prochain passage au plus près du centre (périapse).
// Trajectoire ouverte qui s'éloigne déjà : 0.
function tempsJusquPeriapse(vs) {
  const mu = ASTRES_PAR_ID[vs.centre].gm;
  const el = elements(vs.r, vs.v, mu);
  if (el.e < 1 && el.e > 1e-6) {
    // Orbite fermée : par l'anomalie moyenne.
    const r = V.norm(vs.r);
    let E = Math.acos(Math.max(-1, Math.min(1, (1 - r / el.a) / el.e)));
    if (V.dot(vs.r, vs.v) < 0) E = 2 * Math.PI - E;
    const M = E - el.e * Math.sin(E);
    const n = Math.sqrt(mu / (el.a * el.a * el.a));
    return (2 * Math.PI - M) / n;
  }
  if (V.dot(vs.r, vs.v) >= 0) return 0;
  const signe = (dt) => V.dot(...Object.values(propager(vs.r, vs.v, dt, mu)));
  let haut = 60;
  for (let i = 0; i < 60 && signe(haut) < 0; i++) haut *= 2;
  let bas = 0;
  for (let i = 0; i < 60; i++) {
    const m = (bas + haut) / 2;
    if (signe(m) < 0) bas = m; else haut = m;
  }
  return haut;
}

// Le fils de « centre » sur le chemin vers « cible » (ou null si la cible n'est pas en dessous).
function filsVers(centre, cible) {
  const ch = ancetres(cible);
  const i = ch.indexOf(centre);
  if (i <= 0) return null;
  return ch[i - 1];
}

// Meilleure fenêtre de tir pour un transfert de Lambert vers « cible » (fils du centre courant).
function chercherFenetre(vs, t, cibleId) {
  const centre = ASTRES_PAR_ID[vs.centre], mu = centre.gm;
  const cible = ASTRES_PAR_ID[cibleId];
  const elV = elements(vs.r, vs.v, mu);
  const Pc = (360 / cible.orbite.n) * JOUR;
  let span;
  if (isFinite(elV.periode)) {
    const syn = 1 / Math.abs(1 / elV.periode - 1 / Pc);
    span = Math.min(Math.max(syn, elV.periode) * 1.1, 40 * 365.25 * JOUR);
  } else span = Math.min(Pc, 40 * 365.25 * JOUR);
  const rBas = rayonOrbiteBasse(cible);
  let best = null;
  const N = 80;
  for (let k = 0; k <= N; k++) {
    const d = (span * k) / N;
    const dep = etatVaisseauA(vs, d);
    const r1 = V.norm(dep.r);
    const aT = (r1 + cible.orbite.a) / 2;
    const tofH = Math.PI * Math.sqrt((aT * aT * aT) / mu);
    for (const f of [0.3, 0.45, 0.6, 0.75, 0.9, 1, 1.15, 1.35]) {
      const tof = tofH * f;
      const arr = etatRelatif(cible, t + d + tof);
      const sol = lambert(dep.r, arr.r, tof, mu, !cible.orbite.retro);
      if (!sol) continue;
      const dv1 = V.norm(V.sub(sol.v1, dep.v));
      const vinf = V.norm(V.sub(sol.v2, arr.v));
      const capture = Math.sqrt(vinf * vinf + (2 * cible.gm) / rBas) - Math.sqrt(cible.gm / rBas);
      // Le temps compte aussi : 0,25 km/s par année d'attente et de voyage.
      const cout = dv1 + capture + (0.25 * (d + tof)) / (365.25 * JOUR);
      if (!best || cout < best.cout) best = { d, tof, dv: V.sub(sol.v1, dep.v), dv1, capture, cout, tArrivee: t + d + tof };
    }
  }
  return best;
}

// Prochaine étape pour amener « vs » en orbite basse de « cibleId ».
// Renvoie { type, texte, tExec, dv?(fonction), resteTexte[] }.
function prochaineEtape(vs, t, cibleId) {
  const centre = ASTRES_PAR_ID[vs.centre], mu = centre.gm;
  const cible = ASTRES_PAR_ID[cibleId];
  const el = elements(vs.r, vs.v, mu);
  const r = V.norm(vs.r);

  // 1. Déjà dans la sphère d'influence de la cible.
  if (vs.centre === cibleId) {
    vs.transfert = null;
    const rBas = rayonOrbiteBasse(cible);
    const sens = Math.sign(el.h) || 1;
    if (el.e >= 1 || el.ra > centre.soi * 0.9) {
      if (V.dot(vs.r, vs.v) < 0 && Math.abs(el.rp - rBas) > 0.1 * rBas) {
        // Régler le point le plus proche sur l'orbite basse.
        return {
          type: 'approche', texte: `Approche : viser ${fmtAlt((rBas - cible.rayonKm) * 1000)} d’altitude au plus près`, tExec: t,
          dv: (s) => {
            const rr = V.norm(s.r), vv = V.norm(s.v);
            const h = rBas * Math.sqrt(Math.max(0, vv * vv - (2 * mu) / rr + (2 * mu) / rBas));
            const vt = Math.min(vv, h / rr), vr = -Math.sqrt(Math.max(0, vv * vv - vt * vt));
            const ru = V.unit(s.r), tu = [-ru[1], ru[0]];
            return V.sub(V.add(V.mul(ru, vr), V.mul(tu, sens * vt)), s.v);
          },
          reste: ['Capture en orbite basse'],
        };
      }
      const dtP = tempsJusquPeriapse(vs);
      return {
        type: 'capture', texte: `Capture : freiner au plus près ${de(cible)}`, tExec: t + dtP,
        dv: (s) => {
          const rr = V.norm(s.r), tu = [-s.r[1] / rr, s.r[0] / rr];
          return V.sub(V.mul(tu, sens * Math.sqrt(mu / rr)), s.v);
        },
        reste: [],
      };
    }
    // Orbite fermée : ajuster vers l'orbite basse circulaire.
    if (Math.abs(el.rp - rBas) > 0.15 * rBas) {
      const ru = V.unit(vs.r);
      const cible2 = V.mul(ru, -rBas);
      const aT = (r + rBas) / 2;
      const tof = Math.PI * Math.sqrt((aT * aT * aT) / mu);
      const sol = lambert(vs.r, V.rot(cible2, sens * 0.01), tof, mu, sens > 0);
      if (sol) {
        return {
          type: 'abaisser', texte: `Rejoindre l’orbite basse (${fmtAlt((rBas - cible.rayonKm) * 1000)})`, tExec: t,
          dv: () => V.sub(sol.v1, vs.v), reste: ['Circulariser'],
        };
      }
    }
    if (el.e > 0.05) {
      const dtP = tempsJusquPeriapse(vs);
      return {
        type: 'circulariser', texte: 'Circulariser l’orbite au plus près', tExec: t + dtP,
        dv: (s) => {
          const rr = V.norm(s.r), tu = [-s.r[1] / rr, s.r[0] / rr];
          return V.sub(V.mul(tu, sens * Math.sqrt(mu / rr)), s.v);
        },
        reste: [],
      };
    }
    return { type: 'fini', texte: `En orbite basse ${de(cible)}`, tExec: t, reste: [] };
  }

  // 2. La cible est sous le centre courant : transfert.
  const fils = filsVers(vs.centre, cibleId);
  if (fils) {
    const f = ASTRES_PAR_ID[fils];
    const reste = [`Entrée dans la sphère d’influence ${de(f)}`, 'Capture en orbite basse'];
    if (fils !== cibleId) reste.push(`Transfert vers ${le(cible)}`);
    if (vs.transfert && vs.transfert.cible === fils && t < vs.transfert.tArrivee + 0.25 * (vs.transfert.tArrivee - vs.transfert.tDepart)) {
      const tr = vs.transfert;
      const tMilieu = (tr.tDepart + tr.tArrivee) / 2;
      if (!tr.corrige) {
        return {
          type: 'correction', texte: 'Correction de trajectoire à mi-parcours', tExec: Math.max(t, tMilieu),
          dv: (s, tc) => {
            const tof = Math.max(60, tr.tArrivee - tc);
            const arr = etatRelatif(f, tc + tof);
            const sol = lambert(s.r, arr.r, tof, mu, !f.orbite.retro);
            tr.corrige = true;
            return sol ? V.sub(sol.v1, s.v) : [0, 0];
          },
          reste,
        };
      }
      return { type: 'croisiere', texte: `Croisière vers ${le(f)}`, tExec: tr.tArrivee, attenteEvenement: true, reste: reste.slice(1) };
    }
    const fen = chercherFenetre(vs, t, fils);
    if (!fen) return { type: 'impossible', texte: `Pas de trajectoire trouvée vers ${le(f)}`, tExec: t, reste: [] };
    return {
      type: 'transfert', texte: `Transfert vers ${le(f)} : ${fmtV(fen.dv1 * 1000)}, arrivée dans ${fmtDuree(fen.tArrivee - t)}`,
      tExec: t + fen.d, fenetre: fen,
      dv: (s, tc) => {
        // On recalcule au moment du départ pour être précis.
        const tof = fen.tArrivee - tc;
        const arr = etatRelatif(f, fen.tArrivee);
        const sol = lambert(s.r, arr.r, tof, mu, !f.orbite.retro);
        vs.transfert = { cible: fils, tDepart: tc, tArrivee: fen.tArrivee, corrige: false };
        return sol ? V.sub(sol.v1, s.v) : fen.dv;
      },
      reste: ['Correction à mi-parcours', ...reste],
      coutTotal: fen.cout,
    };
  }

  // 3. Il faut d'abord quitter la sphère d'influence du centre courant.
  const vesc = Math.sqrt((2 * mu) / r);
  if (el.energie < 0) {
    const vinf = Math.min(0.5, 0.1 * vesc);
    return {
      type: 'sortie', texte: `Quitter l’attraction ${de(centre)}`, tExec: t,
      dv: (s) => V.sub(V.mul(V.unit(s.v), Math.sqrt((2 * mu) / V.norm(s.r) + vinf * vinf)), s.v),
      reste: [`Sortie de la sphère d’influence ${de(centre)}`, `Transfert vers ${le(cible)}`],
    };
  }
  return { type: 'attente-sortie', texte: `Sortie de la sphère d’influence ${de(centre)}`, tExec: t + estimerSortie(vs), attenteEvenement: true, reste: [`Transfert vers ${le(cible)}`] };
}

function estimerSortie(vs) {
  const centre = ASTRES_PAR_ID[vs.centre];
  const v = V.norm(vs.v) || 1;
  return Math.max(60, (centre.soi - V.norm(vs.r)) / v);
}

// Applique une poussée instantanée : renvoie false si le carburant manque (orbiteur).
function appliquerImpulsion(vs, dv, carburant) {
  const dvn = V.norm(dv) * 1000; // m/s
  if (carburant) {
    const m0 = ORBITEUR.masseSeche + carburant.kg;
    const m1 = m0 * Math.exp(-dvn / (ORBITEUR.isp * G0));
    if (m0 - m1 > carburant.kg + 1e-6) return false;
    carburant.kg -= m0 - m1;
  }
  vs.v = V.add(vs.v, dv);
  return true;
}

function deltaVOrbiteur(kg) { return ORBITEUR.isp * G0 * Math.log((ORBITEUR.masseSeche + kg) / ORBITEUR.masseSeche); }
