'use strict';
// ---------- Visuels des niveaux d'évolution des véhicules (R&D) ----------
// Chaque amélioration ajoute un élément visible, qui grandit avec le niveau (1 à 3) ; les éléments se combinent.
// Ces fonctions dessinent par-dessus le véhicule, dans son repère (déjà placé, tourné et retourné selon sa direction).
// niv : { cle: niveau } ; un niveau absent ou nul ne dessine rien.

function rivets(ctx, x0, y0, w, h, r, n) {
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < n; i++) {
    const x = x0 + (w * (i + 0.5)) / n;
    ctx.beginPath(); ctx.arc(x, y0 + r * 1.6, r, 0, Math.PI * 2); ctx.arc(x, y0 + h - r * 1.6, r, 0, Math.PI * 2); ctx.fill();
  }
}

// Astromobile (repère de dessinerRover : roues à ±1,1 s, châssis de −0,95 s à −0,7 s, caisse à l'arrière).
function decorerRover(ctx, s, niv) {
  if (!niv) return;
  const nM = niv.moteurRover || 0, nB = niv.batterieRover || 0, nC = niv.caisseRover || 0;
  // Moteur : moyeux-moteurs orange (1), pneus crantés (2), suspensions renforcées (3).
  for (const wx of [-1.1, 1.1]) {
    if (nM >= 1) { ctx.fillStyle = '#ff8f00'; ctx.beginPath(); ctx.arc(wx * s, -0.4 * s, 0.17 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(wx * s, -0.4 * s, 0.07 * s, 0, Math.PI * 2); ctx.fill(); }
    if (nM >= 2) {
      ctx.strokeStyle = '#1c262b'; ctx.lineWidth = Math.max(1.5, 0.08 * s);
      ctx.beginPath(); ctx.arc(wx * s, -0.4 * s, 0.42 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#1c262b';
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ctx.fillRect(wx * s + Math.cos(a) * 0.44 * s - 0.03 * s, -0.4 * s + Math.sin(a) * 0.44 * s - 0.03 * s, 0.06 * s, 0.06 * s); }
    }
    if (nM >= 3) {
      ctx.strokeStyle = '#ffca28'; ctx.lineWidth = Math.max(1.2, 0.04 * s);
      ctx.beginPath(); ctx.moveTo(wx * s - 0.1 * s, -0.72 * s);
      for (let k = 1; k <= 5; k++) ctx.lineTo(wx * s + (k % 2 ? 0.08 : -0.08) * s, -0.72 * s + (k * 0.32 * s) / 5);
      ctx.stroke();
    }
  }
  // Batteries : un module par niveau, sur le châssis, avec son voyant.
  for (let k = 0; k < nB; k++) {
    const x = -0.15 * s + k * 0.32 * s;
    ctx.fillStyle = '#455a64'; ctx.fillRect(x, -1.18 * s, 0.28 * s, 0.23 * s);
    ctx.fillStyle = '#26a69a'; ctx.fillRect(x + 0.04 * s, -1.13 * s, 0.2 * s, 0.04 * s);
    ctx.fillStyle = '#76ff03'; ctx.beginPath(); ctx.arc(x + 0.22 * s, -1.03 * s, 0.03 * s, 0, Math.PI * 2); ctx.fill();
  }
  // Caisse à échantillons : plus grande à chaque niveau, sanglée.
  if (nC) {
    const w = 0.6 * s * (1 + 0.3 * nC), hc = 0.3 * s * (1 + 0.25 * nC), x = -1.4 * s - (w - 0.6 * s) * 0.5, y = -0.95 * s - hc;
    ctx.fillStyle = '#795548'; ctx.fillRect(x, y, w, hc);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(x, y, w, 0.06 * s);
    ctx.fillStyle = '#ffb300';
    for (let k = 1; k <= nC; k++) ctx.fillRect(x + (w * k) / (nC + 1) - 0.02 * s, y, 0.04 * s, hc);
  }
}

// Robot (repère de dessinerRobot : L = 1,6 s, châssis de −0,5 L à 0,5 L, de −0,5 s à −0,22 s ; mât à 0,3 L).
function decorerRobot(ctx, s, niv) {
  if (!niv) return;
  const L = 1.6 * s, nD = niv.robotDurci || 0, nB = niv.batterieRobot || 0;
  // Robot durci : plaques de blindage rivetées (1), carénage des roues (2), feuille d'or isolante (3, comme les sondes de Vénus).
  if (nD >= 1) { ctx.fillStyle = '#607d8b'; ctx.fillRect(-0.5 * L, -0.5 * s, L, 0.28 * s); rivets(ctx, -0.5 * L, -0.5 * s, L, 0.28 * s, 0.025 * s, 6); }
  if (nD >= 2) { ctx.fillStyle = '#546e7a'; ctx.fillRect(-0.55 * L, -0.26 * s, 1.1 * L, 0.1 * s); }
  if (nD >= 3) { ctx.fillStyle = '#d4a017'; ctx.fillRect(-0.5 * L, -0.4 * s, L, 0.08 * s); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-0.5 * L + (L * k) / 6, -0.4 * s); ctx.lineTo(-0.5 * L + (L * k) / 6, -0.32 * s); ctx.stroke(); } }
  // Batterie : panneaux solaires déployés derrière le mât (1 et 2), générateur à radio-isotope à ailettes (3).
  for (let k = 0; k < Math.min(2, nB); k++) {
    const x = -0.45 * L + k * 0.36 * s;
    ctx.fillStyle = '#2f6fd6'; ctx.fillRect(x, -0.75 * s, 0.34 * s, 0.18 * s);
    ctx.strokeStyle = '#9ec3ff'; ctx.lineWidth = 1; ctx.strokeRect(x, -0.75 * s, 0.34 * s, 0.18 * s);
    ctx.strokeStyle = '#b0bec5'; ctx.beginPath(); ctx.moveTo(x + 0.17 * s, -0.57 * s); ctx.lineTo(x + 0.17 * s, -0.5 * s); ctx.stroke();
  }
  if (nB >= 3) {
    const x = -0.62 * L;
    ctx.fillStyle = '#78909c'; ctx.fillRect(x - 0.06 * s, -0.62 * s, 0.12 * s, 0.3 * s);
    ctx.fillStyle = '#546e7a'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 0.14 * s, -0.6 * s + k * 0.07 * s, 0.28 * s, 0.025 * s);
    ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(x, -0.66 * s, 0.035 * s, 0, Math.PI * 2); ctx.fill();
  }
}

// Drone (repère de dessinerDrone : corps de −0,3 s à 0,3 s, de −0,55 s à −0,29 s).
function decorerDrone(ctx, s, niv) {
  const n = (niv && niv.batterieDrone) || 0;
  if (!n) return;
  // Batterie : un bloc sous le corps, plus long à chaque niveau, avec ses voyants.
  const w = 0.3 * s + n * 0.1 * s;
  ctx.fillStyle = '#455a64'; ctx.fillRect(-w / 2, -0.29 * s, w, 0.09 * s);
  ctx.fillStyle = '#76ff03';
  for (let k = 0; k < n; k++) ctx.fillRect(-w / 2 + 0.05 * s + k * 0.1 * s, -0.26 * s, 0.06 * s, 0.03 * s);
}

// Module de descente (repère de dessinerModule : h = hauteur ; étage de −0,5 h à −0,2 h, cabine au-dessus).
function decorerModule(ctx, h, niv) {
  if (!niv) return;
  const nT = niv.coqueThermique || 0, nB = niv.blindageBord || 0, wd = h * 0.74, wc = h * 0.52;
  // Bouclier thermique renforcé : plus épais à chaque niveau, en tuiles ; carbone noir au niveau 3.
  if (nT) {
    const ep = h * (0.03 + 0.02 * nT), y = -h * 0.2 - ep;
    ctx.fillStyle = nT >= 3 ? '#212121' : '#5d4037'; ctx.fillRect(-wd / 2 - h * 0.01 * nT, y, wd + h * 0.02 * nT, ep);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(-wd / 2 + (wd * k) / 8, y); ctx.lineTo(-wd / 2 + (wd * k) / 8, y + ep); ctx.stroke(); }
  }
  // Blindage anti-rayonnement : plaques sur la cabine (une rangée par niveau) ; trèfle de radioprotection au niveau 3.
  for (let k = 0; k < nB; k++) {
    const y = -h * 0.56 - k * h * 0.09;
    ctx.fillStyle = '#78909c'; ctx.fillRect(-wc * 0.42, y, wc * 0.84, h * 0.06);
    rivets(ctx, -wc * 0.42, y, wc * 0.84, h * 0.06, h * 0.006, 5);
  }
  if (nB >= 3) {
    const x = wc * 0.12, y = -h * 0.8, r = h * 0.045;
    ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r * 0.85, a - 0.5, a + 0.5); ctx.fill(); }
    ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(x, y, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(x, y, r * 0.14, 0, Math.PI * 2); ctx.fill();
  }
}

// Niveaux d'évolution de l'expédition en cours (tous à 0 hors campagne).
function nivVehicules() {
  const n = {};
  for (const k of Object.keys(AMELIORATIONS)) n[k] = niveauAmelio(k);
  return n;
}

// Planche « Évolution des véhicules » (onglet Aide) : une amélioration par ligne, niveaux 0 à 3 en colonnes.
const LIGNES_PLANCHE = [
  ['Astromobile', 'batteries', 'rover', 'batterieRover'],
  ['Astromobile', 'caisse à échantillons', 'rover', 'caisseRover'],
  ['Astromobile', 'moteur', 'rover', 'moteurRover'],
  ['Robot', 'robot durci', 'robot', 'robotDurci'],
  ['Robot', 'batterie', 'robot', 'batterieRobot'],
  ['Drone', 'batterie', 'drone', 'batterieDrone'],
  ['Module', 'bouclier thermique', 'module', 'coqueThermique'],
  ['Module', 'blindage anti-rayonnement', 'module', 'blindageBord'],
  ['Orbiteur', 'réservoirs agrandis', 'orbiteur', 'reservoirs'],
  ['Orbiteur', 'soutes agrandies', 'orbiteur', 'soutes'],
  ['Orbiteur', 'module d’habitation', 'orbiteur', 'habitat'],
  ['Orbiteur', 'serre de bord', 'orbiteur', 'serre'],
  ['Orbiteur', 'recyclage de l’eau et de l’air', 'orbiteur', 'recyclage'],
];
function dessinerPlancheEvolution(c) {
  const CW = 230, CH = 170, X0 = 230, Y0 = 50, W = X0 + 4 * CW, H = Y0 + LIGNES_PLANCHE.length * CH;
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff'; ctx.font = '600 20px system-ui, sans-serif';
  for (let n = 0; n <= 3; n++) ctx.fillText(n ? `Niveau ${n}` : 'Sans R&D', X0 + n * CW + 65, 25);
  const conc = concevoirAtterrisseur(ASTRES_PAR_ID.lune), fMod = conc.ok ? conc.fusee : assemblerFusee(equipementParDefaut());
  LIGNES_PLANCHE.forEach(([engin, quoi, type, cle], li) => {
    const y0 = Y0 + li * CH;
    ctx.fillStyle = li % 2 ? '#111a29' : '#0f1724'; ctx.fillRect(0, y0, W, CH);
    ctx.font = '600 16px system-ui, sans-serif'; ctx.fillStyle = '#eceff1'; ctx.fillText(engin, 14, y0 + CH / 2 - 11);
    ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#90a4ae'; ctx.fillText(quoi, 14, y0 + CH / 2 + 11);
    for (let n = 0; n <= 3; n++) {
      const niv = { [cle]: n }, cx = X0 + n * CW + CW / 2, sol = y0 + CH - 28;
      if (type !== 'orbiteur') { ctx.fillStyle = '#5d5d5d'; ctx.fillRect(X0 + n * CW + 10, sol, CW - 20, 4); }   // l'orbiteur ne se pose pas
      ctx.save();
      if (type === 'rover') dessinerRover(ctx, cx, sol, 42, { dir: 1, pas: 0 }, false, 0, 0, niv);
      if (type === 'robot') dessinerRobot(ctx, cx, sol, 80, { dir: 1, pas: 0 }, false, 0, niv);
      if (type === 'drone') dessinerDrone(ctx, { angle: 0, throttle: 0, t: 0 }, cx, sol, 160, niv);
      if (type === 'orbiteur') dessinerOrbiteurDetail(ctx, cx, sol - CH * 0.4, 150, { niv: niv, c: { carburant: 1, sondes: 0, kits: 0, atterrisseurs: 0, propulseurs: 0 } });
      if (type === 'module') dessinerModule(ctx, { f: fMod, angle: 0, throttle: 0, temp: 20, integrite: 100, pose: true, t: 0, degats: { pression: 0, chaleur: 0, impact: 0 }, taux: { pression: 0, chaleur: 0 }, enDegats: () => false, niv }, cx, sol, 130);
      ctx.restore();
    }
  });
}
