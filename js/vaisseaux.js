'use strict';
// ---------- Silhouettes de l'orbiteur et des stations ----------
// L'orbiteur change avec la R&D (réservoirs, soutes, habitat, serre, recyclage, écosystème, torpeur) et avec ce qu'il
// emporte (carburant, sondes, kits, atterrisseurs amarrés, propulseurs solaires). Propulsion nucléaire-électrique :
// réacteur à l'arrière derrière son bouclier, grands radiateurs, moteurs ioniques.
// Une station grandit avec son niveau : panneaux, modules, habitat en anneau (4), chantier interstellaire (5).

const COUL_V = { coque: '#eceff1', ombre: '#90a4ae', fonce: '#455a64', ergol: '#ff9800', vide: '#37474f', serre: '#76ff03', habitat: '#ffe0b2', radiateur: '#cfd8dc', panneau: '#1e4fa8', or: '#ffca28', bleu: '#4fc3f7' };

// Niveaux et chargement de l'orbiteur d'une campagne (tout à 0 et vide hors campagne).
function etatOrbiteurVisuel(v) {
  const niv = {};
  for (const k of Object.keys(AMELIORATIONS)) niv[k] = niveauAmelio(k, v || null);
  const c = v ? {
    carburant: Math.min(1, (v.carburant || 0) / capOrbiteur(v, 'carburantMax')),
    sondes: v.sondes || 0, kits: v.kits || 0, atterrisseurs: v.atterrisseurs || 0, robots: v.robots || 0, drones: v.drones || 0, propulseurs: v.propulseurs || 0,
  } : { carburant: 1, sondes: ORBITEUR.sondes, kits: ORBITEUR.kits, atterrisseurs: 1, robots: 0, drones: 0, propulseurs: 0 };
  return { niv, c };
}

// Orbiteur vu de côté, nez vers la droite. L : longueur de l'orbiteur de base à l'écran (pixels) ; il s'allonge avec la R&D.
function dessinerOrbiteurDetail(ctx, x, y, L, vis, opts = {}) {
  const { niv, c } = vis, k = L / 60;
  // Sections le long de la poutre, de l'arrière vers l'avant : [nom, longueur].
  const sections = [['reacteur', 7], ['radiateurs', 10], ['reservoirs', 9 + 3 * (niv.reservoirs || 0)]];
  for (let i = 0; i < (niv.soutes || 0); i++) sections.push(['soute', 5]);
  if (niv.recyclage) sections.push(['recyclage', 4 + niv.recyclage]);
  if (niv.serre) sections.push(['serre', 4 + 2 * niv.serre]);
  if (niv.ecosysteme) sections.push(['ecosysteme', 9]);
  if (niv.torpeur) sections.push(['torpeur', 7]);
  for (let i = 0; i < (niv.habitat || 0); i++) sections.push(['habitat', 6]);
  sections.push(['capsule', 8]);
  const total = sections.reduce((s, x) => s + x[1], 0);
  ctx.save(); ctx.translate(x, y); ctx.rotate(opts.angle || 0); ctx.scale(k, k);
  let x0 = -total / 2;
  // Poutre
  ctx.fillStyle = COUL_V.ombre; ctx.fillRect(x0, -0.6, total, 1.2);
  const pos = {};
  for (const [nom, l] of sections) {
    const xa = x0, xb = x0 + l, xm = (xa + xb) / 2;
    (pos[nom] = pos[nom] || []).push([xa, xb]);
    if (nom === 'reacteur') {
      // Tuyères ioniques (lueur bleue en poussée), réacteur, bouclier
      if (opts.poussee) { ctx.fillStyle = 'rgba(79,195,247,0.8)'; ctx.beginPath(); ctx.moveTo(xa, -1.8); ctx.lineTo(xa - 10 - 4 * Math.random(), 0); ctx.lineTo(xa, 1.8); ctx.fill(); }
      ctx.fillStyle = COUL_V.fonce; ctx.fillRect(xa, -2.2, 2, 4.4);
      ctx.fillStyle = '#b0bec5'; ctx.beginPath(); ctx.moveTo(xa + 2, -2.5); ctx.lineTo(xb - 1, -3.5); ctx.lineTo(xb - 1, 3.5); ctx.lineTo(xa + 2, 2.5); ctx.fill();
      ctx.fillStyle = COUL_V.fonce; ctx.fillRect(xb - 1, -4.2, 1, 8.4);   // bouclier
    } else if (nom === 'radiateurs') {
      // Grands radiateurs du réacteur, en éventail au-dessus et en dessous
      ctx.fillStyle = COUL_V.radiateur;
      ctx.beginPath(); ctx.moveTo(xa, -1); ctx.lineTo(xa + 2, -13); ctx.lineTo(xb - 2, -13); ctx.lineTo(xb, -1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(xa, 1); ctx.lineTo(xa + 2, 13); ctx.lineTo(xb - 2, 13); ctx.lineTo(xb, 1); ctx.fill();
      ctx.strokeStyle = COUL_V.ombre; ctx.lineWidth = 0.3;
      for (let i = 1; i < 5; i++) { const xx = xa + (l * i) / 5; ctx.beginPath(); ctx.moveTo(xx, -12.5); ctx.lineTo(xx, -1.5); ctx.moveTo(xx, 1.5); ctx.lineTo(xx, 12.5); ctx.stroke(); }
    } else if (nom === 'reservoirs') {
      // Deux réservoirs, remplis selon le carburant à bord
      const r = 3 + 0.5 * (niv.reservoirs || 0);
      for (const sy of [-1, 1]) {
        const yc = sy * (r + 0.6);
        ctx.fillStyle = COUL_V.vide; ctx.beginPath(); ctx.roundRect(xa + 0.5, yc - r, l - 1, 2 * r, r); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.roundRect(xa + 0.5, yc - r, l - 1, 2 * r, r); ctx.clip();
        ctx.fillStyle = COUL_V.ergol; ctx.fillRect(xa + 0.5, yc - r, (l - 1) * c.carburant, 2 * r);
        ctx.restore();
        ctx.strokeStyle = COUL_V.coque; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.roundRect(xa + 0.5, yc - r, l - 1, 2 * r, r); ctx.stroke();
      }
    } else if (nom === 'soute') {
      ctx.fillStyle = '#b0bec5'; ctx.fillRect(xa + 0.4, -3, l - 0.8, 6);
      ctx.strokeStyle = COUL_V.fonce; ctx.lineWidth = 0.3; ctx.strokeRect(xa + 0.4, -3, l - 0.8, 6);
    } else if (nom === 'recyclage') {
      ctx.fillStyle = '#80cbc4'; ctx.beginPath(); ctx.roundRect(xa + 0.4, -2.8, l - 0.8, 5.6, 1); ctx.fill();
      ctx.strokeStyle = '#26a69a'; ctx.lineWidth = 0.4; for (let i = 0; i < niv.recyclage; i++) { ctx.beginPath(); ctx.arc(xm, 0, 1 + i * 0.7, 0, Math.PI * 2); ctx.stroke(); }
    } else if (nom === 'serre') {
      // Serre de bord : module vitré, lumière verte
      ctx.fillStyle = COUL_V.coque; ctx.beginPath(); ctx.roundRect(xa + 0.4, -3.5, l - 0.8, 7, 2); ctx.fill();
      ctx.fillStyle = COUL_V.serre; ctx.fillRect(xa + 1.2, -1.2, l - 2.4, 2.4);
    } else if (nom === 'ecosysteme') {
      // Écosystème fermé : grand anneau vert qui tourne
      ctx.strokeStyle = '#43a047'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(xm, 0, 2.5, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = COUL_V.serre; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(xm, 0, 2.5, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COUL_V.coque; ctx.fillRect(xa + 2, -2, l - 4, 4);
    } else if (nom === 'torpeur') {
      // Module de torpeur : capsules de sommeil, hublots bleus
      ctx.fillStyle = '#e3f2fd'; ctx.beginPath(); ctx.roundRect(xa + 0.4, -3.2, l - 0.8, 6.4, 2.5); ctx.fill();
      ctx.fillStyle = COUL_V.bleu; for (const xx of [xa + 2, xm, xb - 2]) { ctx.beginPath(); ctx.arc(xx, 0, 0.9, 0, Math.PI * 2); ctx.fill(); }
    } else if (nom === 'habitat') {
      // Module d'habitation gonflable
      ctx.fillStyle = COUL_V.habitat; ctx.beginPath(); ctx.ellipse(xm, 0, l / 2 - 0.2, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#bcaaa4'; ctx.lineWidth = 0.3; for (const dy of [-2.5, 0, 2.5]) { ctx.beginPath(); ctx.moveTo(xa + 0.8, dy); ctx.lineTo(xb - 0.8, dy); ctx.stroke(); }
    } else if (nom === 'capsule') {
      // Module de commande, nez à droite, hublots
      ctx.fillStyle = COUL_V.coque; ctx.beginPath(); ctx.moveTo(xa, -4); ctx.lineTo(xb - 3, -3); ctx.quadraticCurveTo(xb + 1, 0, xb - 3, 3); ctx.lineTo(xa, 4); ctx.fill();
      ctx.fillStyle = '#263238'; for (const xx of [xa + 2.5, xa + 4.5]) ctx.fillRect(xx, -1.6, 1.1, 1.2);
    }
    x0 = xb;
  }
  // Chargement : sondes sur leur râtelier (au-dessus des réservoirs), kits et atterrisseurs amarrés en dessous.
  const [ra, rb] = pos.reservoirs[0], ap = (pos.capsule || [[0, 0]])[0][0];
  const nS = Math.min(c.sondes, 10);
  for (let i = 0; i < nS; i++) { const xx = ra + 1 + i * ((rb - ra - 2) / Math.max(1, nS - 1 || 1)); ctx.fillStyle = COUL_V.or; ctx.beginPath(); ctx.moveTo(xx, -8.6); ctx.lineTo(xx + 0.8, -7.2); ctx.lineTo(xx - 0.8, -7.2); ctx.fill(); }
  const nK = Math.min(c.kits, 4);
  for (let i = 0; i < nK; i++) { ctx.fillStyle = '#9e9e9e'; ctx.fillRect(ap - 4.5 - i * 4, 4.6, 3.6, 2.6); ctx.strokeStyle = COUL_V.fonce; ctx.lineWidth = 0.25; ctx.strokeRect(ap - 4.5 - i * 4, 4.6, 3.6, 2.6); }
  const nA = Math.min(c.atterrisseurs, 4), bouclier = niv.coqueThermique >= 3 ? '#212121' : niv.coqueThermique ? '#5d4037' : '#8d6e63';
  // Atterrisseurs amarrés devant le nez, l'un derrière l'autre (comme le module lunaire d'Apollo), bouclier en avant.
  const nez = pos.capsule[0][1] + 1;
  for (let i = 0; i < nA; i++) {
    const xs = nez + i * 6.4;
    ctx.fillStyle = COUL_V.ombre; ctx.fillRect(xs, -0.8, 0.9, 1.6);   // collier d'amarrage
    ctx.fillStyle = niv.blindageBord ? '#78909c' : COUL_V.coque;
    ctx.beginPath(); ctx.moveTo(xs + 0.9, -2); ctx.lineTo(xs + 4.6, -2.8); ctx.lineTo(xs + 4.6, 2.8); ctx.lineTo(xs + 0.9, 2); ctx.fill();
    ctx.fillStyle = bouclier; ctx.fillRect(xs + 4.6, -3.1, 0.9, 6.2);
    ctx.strokeStyle = COUL_V.ombre; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(xs + 3.5, -2.6); ctx.lineTo(xs + 5.5, -4); ctx.moveTo(xs + 3.5, 2.6); ctx.lineTo(xs + 5.5, 4); ctx.stroke();   // pieds repliés
  }
  // Propulseurs solaires amarrés à l'arrière (ceux qui envoient la voiture rouge dans le Soleil)
  const [pa] = pos.reacteur[0];
  for (let i = 0; i < Math.min(c.propulseurs, 2); i++) {
    const yy = i ? 6 : -6;
    ctx.fillStyle = '#90a4ae'; ctx.fillRect(pa + 1, yy - 1, 4, 2);
    ctx.fillStyle = COUL_V.panneau; ctx.fillRect(pa + 1.5, yy + (i ? 1 : -4), 3, 3);
  }
  ctx.restore();
}

// Station vue de dessus (même allure que l'ancienne icône), qui grandit avec son niveau.
// T : demi-envergure en pixels ; angle : poutre perpendiculaire au rayon ; t : pour le pivot des panneaux.
function dessinerStationNiveau(ctx, x, y, T, angle, st, t) {
  const n = (st && st.niveau) || 1, terrestre = st && st.terrestre;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  // Chantier interstellaire (niveau 5) : grand cadre de construction, avec le vaisseau en cours s'il y en a un.
  if (n >= 5) {
    ctx.strokeStyle = 'rgba(255,202,40,0.8)'; ctx.lineWidth = Math.max(0.6, T * 0.03);
    ctx.fillStyle = '#9e9e9e'; ctx.fillRect(-T * 0.03, T * 0.05, T * 0.06, T * 0.75);   // mât vers le chantier
    ctx.strokeRect(-T * 0.6, T * 0.8, T * 1.2, T * 0.45);
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-T * 0.6 + (T * 1.2 * i) / 6, T * 0.8); ctx.lineTo(-T * 0.6 + (T * 1.2 * i) / 6, T * 1.25); ctx.stroke(); }
    ctx.fillStyle = 'rgba(236,239,241,0.75)'; ctx.beginPath(); ctx.ellipse(0, T * 1.02, T * 0.48, T * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Poutre : plus longue avec le niveau
  const P = T * (0.7 + 0.075 * n);
  ctx.fillStyle = '#9e9e9e'; ctx.fillRect(-P, -T * 0.05, 2 * P, T * 0.1);
  // Panneaux solaires : 1, 2 puis 3 paires de chaque côté
  const pivot = 0.75 + 0.25 * Math.cos((t || 0) / 2800);
  const paires = n >= 4 ? [0.42, 0.62, 0.82] : n >= 2 ? [0.56, 0.82] : [0.7];
  for (const p of paires) for (const sx of [-p, p]) for (const sy of [-1, 1]) {
    const pw = T * 0.18, ph = T * 0.6 * pivot, x0 = sx * P - pw / 2, y0 = sy > 0 ? T * 0.07 : -T * 0.07 - ph;
    ctx.fillStyle = COUL_V.panneau; ctx.fillRect(x0, y0, pw, ph);
    ctx.strokeStyle = 'rgba(214,170,60,0.9)'; ctx.lineWidth = Math.max(0.5, T * 0.025); ctx.strokeRect(x0, y0, pw, ph);
  }
  // Radiateurs
  ctx.fillStyle = '#eceff1';
  for (const sx of [-0.3, 0.3]) ctx.fillRect(sx * T - T * 0.04, T * 0.06, T * 0.08, T * 0.32);
  // Habitat (niveau 4 et plus) : anneau tournant autour du cœur
  if (n >= 4) { ctx.strokeStyle = COUL_V.habitat; ctx.lineWidth = Math.max(1, T * 0.07); ctx.beginPath(); ctx.arc(0, 0, T * 0.33, 0, Math.PI * 2); ctx.stroke(); }
  // Modules pressurisés : un de plus par niveau
  ctx.fillStyle = '#f5f5f5'; ctx.strokeStyle = 'rgba(80,90,100,0.8)'; ctx.lineWidth = Math.max(0.5, T * 0.03);
  const mod = (cx, cy, w, h) => { ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(w, h) * 0.45); ctx.fill(); ctx.stroke(); };
  mod(0, -T * 0.2, T * 0.16, T * 0.5);
  if (n >= 2) mod(0, T * 0.22, T * 0.16, T * 0.42);
  mod(-T * 0.16, -T * 0.1, T * 0.3, T * 0.13);
  if (n >= 3) { mod(T * 0.16, -T * 0.1, T * 0.3, T * 0.13); ctx.fillStyle = '#ffb74d'; ctx.fillRect(T * 0.05, T * 0.05, T * 0.2, T * 0.06); ctx.fillStyle = '#f5f5f5'; }   // atelier et son bras
  if (n >= 4) mod(0, -T * 0.5, T * 0.13, T * 0.2);
  // Agrandissement en cours : échafaudage clignotant
  if (st && st.agrandissement && Math.sin(performance.now() / 300) > 0) { ctx.strokeStyle = '#ffca28'; ctx.setLineDash([T * 0.05, T * 0.05]); ctx.strokeRect(-P * 0.5, -T * 0.6, P, T * 0.3); ctx.setLineDash([]); }
  // Nœud central et feu de position
  ctx.fillStyle = terrestre ? '#ffca28' : '#ffb74d';
  ctx.beginPath(); ctx.arc(0, 0, T * 0.1, 0, Math.PI * 2); ctx.fill();
  if (Math.sin(performance.now() / 400) > 0.6) { ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(P, 0, Math.max(1, T * 0.05), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// Portrait de la flotte (centre de commande) : l'orbiteur, puis chaque station avec son niveau.
function dessinerFlotte(cv, v) {
  const sts = v.stations || [], W = 900, H = 260 + (sts.length ? 190 * Math.ceil(sts.length / 3) : 0);
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0d1420'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#eceff1'; ctx.font = '600 18px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText(`🚀 ${nomVaisseau(v)}`, 16, 24);
  ctx.font = '14px system-ui, sans-serif'; ctx.fillStyle = '#90a4ae';
  ctx.fillText(v.orb ? `${fmt(v.carburant / 1000, 1)} t de carburant · ${v.sondes} sonde${v.sondes > 1 ? 's' : ''} · ${v.atterrisseurs} atterrisseur${v.atterrisseurs > 1 ? 's' : ''} · ${v.kits} kit${v.kits > 1 ? 's' : ''} de station` : 'pas d’expédition en cours', 16, 46);
  if (v.orb) dessinerOrbiteurDetail(ctx, W / 2, 150, 420, etatOrbiteurVisuel(v));
  sts.forEach((st, i) => {
    const cx = 150 + (i % 3) * 300, cy = 260 + Math.floor(i / 3) * 190 + 80;
    dessinerStationNiveau(ctx, cx, cy, 70, 0, st, 0);
    ctx.fillStyle = '#eceff1'; ctx.font = '600 14px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${st.nom} (niveau ${st.niveau || 1})`, cx, cy + 95);
    ctx.textAlign = 'start';
  });
}
