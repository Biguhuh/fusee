'use strict';
// Drone : petit hélicoptère à quatre rotors, sans équipage, pour les astres qui ont une atmosphère
// (Mars, Titan, Vénus…). Comme Ingenuity sur Mars. Il se pilote comme un module d'atterrissage
// (gaz, inclinaison, pilote auto), mais ses rotors ont besoin d'air : plus l'air est rare, moins ils portent.
// Il vole sur batterie (pas d'ergols), et repère du ciel les objets remarquables quand il vole bas.
// Vu de côté, on ne voit que deux de ses quatre rotors.

const DRONE = { masse: 20, batterie: 240, twrSol: 2.5, hauteur: 1.2 };   // kg ; s de vol à pleine puissance ; poussée/poids au sol

// Astre où un drone peut voler : un sol, et assez d'air pour porter des rotors (Mars : 6 mbar, la limite).
function droneVolePossible(a) { return !!(a && a.type === 'solide' && a.atm && a.atm.p0 >= 0.004); }

// « Fusée » du drone, réglée pour l'astre : la poussée au sol vaut 2,5 fois son poids.
function fuseeDrone(a) {
  const c0 = conditions(a, 0);
  return {
    drone: true, nom: 'Drone', choix: {},
    masseSeche: DRONE.masse, carburant: DRONE.batterie, masseTotale: DRONE.masse,
    poussee: DRONE.twrSol * DRONE.masse * c0.g, rhoRef: Math.max(1e-6, c0.rho), isp: 1,
    pressionMax: 5, tempMax: 150, protection: 20, hauteur: DRONE.hauteur,
  };
}
// Portance des rotors selon l'air : proportionnelle à la densité (3 fois au plus celle du sol).
function facteurAirDrone(vol) { return Math.min(3, (vol.c ? vol.c.rho : 0) / vol.f.rhoRef); }

// Repérages du drone : en vol bas (moins de 60 m), il photographie les objets remarquables et les traces
// des missions passées. Comme le robot, il signale l'objet ; une exploration humaine permettra de l'examiner.
function reperagesDrone(vol) {
  if (vol.fin || vol.altSol() > 60) return;
  const a = vol.astre, x0 = vol.xDepart;
  vol.vusDrone = vol.vusDrone || {};
  for (const e of eggsSur(a.id)) {
    const ex = x0 + e.dx;
    if (distSol(a, vol.x, ex) < 25 && !eggTrouve(e.id) && !vol.vusDrone[e.id]) {
      vol.vusDrone[e.id] = true;
      etat.reperes = etat.reperes || {};
      etat.reperes[e.id] = true;
      vol.messageExplo = { texte: '📷 Objet inhabituel photographié par le drone. Une exploration humaine permettrait de l’examiner.', vie: 7 };
    }
  }
  for (const t of tracesSur(a.id)) {
    const tx = x0 + t.dx;
    if (distSol(a, vol.x, tx) < 40 && !vol.vusDrone['t:' + t.id]) {
      vol.vusDrone['t:' + t.id] = true;
      vol.messageExplo = { texte: `📷 ${t.nom} — ${t.annee} — ${t.materiel}.`, vie: 8 };
      etat.tracesVues = etat.tracesVues || {};
      if (!etat.tracesVues[t.id]) etat.tracesVues[t.id] = { astre: a.id, quand: etat.enVoyage && etat.voyage ? etat.voyage.t : null, par: 'un drone' };
    }
  }
}

// Dessin : corps, deux bras, deux rotors visibles (les deux autres sont derrière), patins.
// (x, y) : point de contact au sol ; h : hauteur du module d'atterrissage à cette échelle (7 m).
function dessinerDrone(ctx, vol, x, y, h) {
  const s = Math.max(32, (h / HAUTEUR_MODULE) * 3);      // px par mètre (agrandi pour rester bien visible)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vol.angle || 0);
  // Patins
  ctx.strokeStyle = '#78909c'; ctx.lineWidth = Math.max(1.5, 0.06 * s);
  ctx.beginPath();
  ctx.moveTo(-0.45 * s, 0); ctx.lineTo(0.45 * s, 0);
  ctx.moveTo(-0.3 * s, 0); ctx.lineTo(-0.2 * s, -0.3 * s);
  ctx.moveTo(0.3 * s, 0); ctx.lineTo(0.2 * s, -0.3 * s);
  ctx.stroke();
  // Corps (boîtier isolé, panneau solaire sur le dessus)
  ctx.fillStyle = '#eceff1'; ctx.fillRect(-0.3 * s, -0.55 * s, 0.6 * s, 0.26 * s);
  ctx.fillStyle = '#d4a017'; ctx.fillRect(-0.3 * s, -0.36 * s, 0.6 * s, 0.07 * s);
  ctx.fillStyle = '#1a237e'; ctx.fillRect(-0.22 * s, -0.62 * s, 0.44 * s, 0.07 * s);
  // Caméra
  ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(0.2 * s, -0.27 * s, 0.05 * s, 0, 2 * Math.PI); ctx.fill();
  // Bras et rotors (deux visibles de côté)
  const tours = (vol.t || 0) * (vol.throttle > 0 ? 40 : 0);
  for (const sg of [-1, 1]) {
    const xr = sg * 0.75 * s, yr = -0.72 * s;
    ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = Math.max(2, 0.07 * s);
    ctx.beginPath(); ctx.moveTo(sg * 0.25 * s, -0.5 * s); ctx.lineTo(xr, yr + 0.06 * s); ctx.stroke();
    ctx.fillStyle = '#546e7a'; ctx.fillRect(xr - 0.04 * s, yr - 0.05 * s, 0.08 * s, 0.12 * s);   // moteur
    // Pales : vues de côté, leur largeur apparente varie en tournant ; floues quand elles tournent vite.
    const l = 0.45 * s * (vol.throttle > 0 ? 1 : 0.35 + 0.65 * Math.abs(Math.cos(sg)));
    if (vol.throttle > 0) {
      ctx.fillStyle = 'rgba(55,71,79,0.25)';
      ctx.beginPath(); ctx.ellipse(xr, yr - 0.07 * s, 0.45 * s, 0.035 * s, 0, 0, 2 * Math.PI); ctx.fill();
    }
    const lb = vol.throttle > 0 ? 0.45 * s * Math.abs(Math.cos(tours + sg)) : l;
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = Math.max(1.5, 0.04 * s);
    ctx.beginPath(); ctx.moveTo(xr - lb, yr - 0.07 * s); ctx.lineTo(xr + lb, yr - 0.07 * s); ctx.stroke();
  }
  ctx.restore();
}
