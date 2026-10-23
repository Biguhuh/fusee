'use strict';
// Simulation et affichage d'un vol.
// Repère : x horizontal (m), y = altitude (m). angle = 0 quand la fusée pointe vers le haut.

const VITESSE_ROTATION = 1.6;  // rad/s
const INCLINAISON_MAX = 15;    // degrés, au contact du sol
const POUSSEE_DOUCE = 0.3;     // fraction de poussée avec ↓ / S

class Vol {
  constructor(astre, fusee) {
    this.astre = astre;
    this.f = fusee;
    this.x = 0;
    this.y = astre.depart.alt;
    this.vx = 0;
    this.vy = -astre.depart.vitesse;
    this.angle = 0;
    this.carburant = fusee.carburant;
    this.temp = 20;
    this.dose = 0;
    this.pose = false;
    this.throttle = 0;
    this.t = 0;
    this.fin = null;          // résultat quand le vol est terminé
    this.phase = { solide: 'descente', gazeuse: 'plongee', etoile: 'approche' }[astre.type];
    this.stats = { vMax: 0, pMax: 0, tMax: 20, altMin: this.y };
    this.carburantVideAlt = null;
    this.c = conditions(astre, this.y);
  }

  masse() { return this.f.masseSeche + this.carburant; }

  // Rapport poussée / poids local, à pleine poussée.
  twr() { return this.f.poussee / (this.masse() * this.c.g); }

  step(dt, cmd) {
    if (this.fin) return;
    const a = this.astre, f = this.f;
    this.t += dt;

    if (cmd.gauche) this.angle -= VITESSE_ROTATION * dt;
    if (cmd.droite) this.angle += VITESSE_ROTATION * dt;
    if (this.angle > Math.PI) this.angle -= 2 * Math.PI;
    if (this.angle < -Math.PI) this.angle += 2 * Math.PI;

    let th = cmd.haut ? 1 : cmd.bas ? POUSSEE_DOUCE : 0;
    if (this.carburant <= 0) th = 0;
    this.throttle = th;
    const F = f.poussee * th;
    if (F > 0) {
      this.carburant = Math.max(0, this.carburant - F / (f.isp * G0) * dt);
      if (this.carburant === 0 && this.carburantVideAlt === null) this.carburantVideAlt = this.y;
    }

    const m = this.masse();
    const c = conditions(a, this.y);
    this.c = c;
    const ax = F * Math.sin(this.angle) / m;
    const ay = F * Math.cos(this.angle) / m - c.g;

    if (this.pose) {
      if (ay <= 0) {
        this.vx = 0; this.vy = 0;
        this.dangers(c, 0, dt);
        if (!this.fin && this.carburant <= 0) this.terminer('bloque');
        return;
      }
      this.pose = false;
      this.phase = 'remontee';
    }

    this.vx += ax * dt;
    this.vy += ay * dt;
    // Traînée, appliquée de façon semi-implicite (stable même dans un air très dense).
    let v = Math.hypot(this.vx, this.vy);
    if (c.rho > 0 && v > 0) {
      const k = 0.5 * c.rho * FUSEE_BASE.cx * FUSEE_BASE.surface * v / m * dt;
      this.vx /= 1 + k;
      this.vy /= 1 + k;
      v = Math.hypot(this.vx, this.vy);
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.stats.vMax = Math.max(this.stats.vMax, v);
    this.stats.altMin = Math.min(this.stats.altMin, this.y);

    this.dangers(c, v, dt);
    if (this.fin) return;

    if (a.type === 'solide' && this.y <= 0) this.contact();
    if (this.fin) return;
    this.objectifs();
  }

  dangers(c, v, dt) {
    const f = this.f;
    // Échauffement aérodynamique (≈ v²/2cp), efficace seulement dans un air assez dense.
    const aero = (v * v) / 2010 * (c.rho / (c.rho + 0.05));
    const tau = this.astre.type === 'etoile' ? 15 : 40 / (1 + Math.sqrt(c.rho));
    this.temp += (c.t + aero - this.temp) * Math.min(1, dt / tau);
    this.stats.pMax = Math.max(this.stats.pMax, c.p);
    this.stats.tMax = Math.max(this.stats.tMax, this.temp);

    if (c.p > f.pressionMax) return this.terminer('pressurisee');
    if (this.temp > f.tempMax) return this.terminer('brulee');
    if (c.rad > f.protection) {
      this.dose += (c.rad / f.protection - 1) * 5 * dt;
      if (this.dose >= 100) return this.terminer('irradiee');
    }
  }

  contact() {
    const a = this.astre;
    const vv = -this.vy, vh = Math.abs(this.vx);
    const inc = Math.abs(this.angle) * 180 / Math.PI;
    this.y = 0;
    this.impact = { vv, vh, inc };
    if (vv > a.vMax || vh > a.vMax || inc > INCLINAISON_MAX) {
      this.terminer(this.carburant <= 0 ? 'carburant' : 'ecrasee');
      return;
    }
    this.pose = true;
    this.vx = 0; this.vy = 0;
    this.angle = 0;
    this.phase = 'au sol';
    this.dejaPose = true;
  }

  objectifs() {
    const a = this.astre;
    if (a.type === 'gazeuse' && this.phase === 'plongee' && this.c.p >= a.cible) this.phase = 'remontee';
    if (this.phase === 'remontee' && this.y >= a.depart.alt) {
      this.terminer(a.type === 'gazeuse' ? 'plongee' : 'retour');
      return;
    }
    if (this.phase !== 'remontee' && this.y > a.depart.alt * 1.3 + 1000) this.terminer('abandon');
  }

  // Le joueur termine la mission une fois posé (Entrée) ou l'abandonne (Échap).
  finirAuSol() { if (this.pose && !this.fin) this.terminer('pose'); }
  abandonner() { if (!this.fin) this.terminer(this.pose ? 'pose' : 'abandon'); }

  terminer(cause) {
    const detruite = ['ecrasee', 'brulee', 'pressurisee', 'carburant', 'irradiee'].includes(cause);
    this.fin = {
      cause, detruite,
      astre: this.astre,
      temps: this.t,
      carburantRestant: this.carburant,
      impact: this.impact || null,
      conditions: this.c,
      temp: this.temp,
      dose: this.dose,
      fusee: this.f,
      carburantVideAlt: this.carburantVideAlt,
      stats: { ...this.stats },
    };
    if (detruite) this.explosion = creerExplosion();
  }

  objectifTexte() {
    const a = this.astre;
    switch (this.phase) {
      case 'descente': return `Posez-vous en douceur : moins de ${a.vMax} m/s, fusée droite`;
      case 'au sol': return `Posé ! Entrée pour terminer, ou redécollez jusqu'à ${fmtAlt(a.depart.alt)}`;
      case 'remontee': return a.type === 'gazeuse'
        ? `${a.cible} bar atteints ! Remontez jusqu'à ${fmtAlt(a.depart.alt)}`
        : `Remontez en orbite : ${fmtAlt(a.depart.alt)}`;
      case 'plongee': return `Pas de sol : plongez jusqu'à ${a.cible} bar, puis remontez`;
      case 'approche': return 'Approchez le Soleil… si vous pouvez';
    }
    return '';
  }
}

function creerExplosion() {
  const parts = [];
  for (let i = 0; i < 90; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 220;
    parts.push({ x: 0, y: 0, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vie: 0.6 + Math.random() * 1.2 });
  }
  return { parts, t: 0 };
}

// ---------- Formatage ----------
function fmt(n, dec = 0) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtAlt(m) {
  const s = m < 0 ? '−' : '';
  m = Math.abs(m);
  if (m >= 1e6) return s + fmt(m / 1000) + ' km';
  if (m >= 10000) return s + fmt(m / 1000, 1) + ' km';
  return s + fmt(m) + ' m';
}
function fmtP(p) {
  if (p === 0) return '0 bar';
  if (p < 0.001) return p.toExponential(1).replace('.', ',') + ' bar';
  if (p < 1) return fmt(p, 3) + ' bar';
  if (p < 100) return fmt(p, 1) + ' bar';
  return fmt(p) + ' bar';
}
function fmtV(v) { return Math.abs(v) >= 10000 ? fmt(v / 1000, 1) + ' km/s' : fmt(v, 1) + ' m/s'; }

// ---------- Rendu ----------
const ETOILES = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3 }));
const POUSSIERES = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random() }));

function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

function melanger(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

function dessinerVol(ctx, vol, W, H, dtReel, warp) {
  const a = vol.astre, c = vol.c;
  const gaz = a.type === 'gazeuse';

  // Échelle : le sol (ou le niveau 1 bar) reste visible en bas quand on s'approche.
  let echelle, fuseeY, solY;
  if (gaz) {
    echelle = 0.6;
    fuseeY = H * 0.42;
    solY = fuseeY + vol.y * echelle;
  } else {
    echelle = Math.min(3, (0.45 * H) / Math.max(vol.y, 1));
    solY = H * 0.8;
    fuseeY = solY - vol.y * echelle;
  }

  // Ciel : noir dans le vide, couleur de l'atmosphère quand l'air s'épaissit.
  let tCiel = 0;
  if (a.atm && a.type !== 'etoile') tCiel = Math.min(1, Math.sqrt(c.p / 0.3));
  let ciel = melanger('#02030a', a.couleurs.ciel, tCiel);
  if (gaz && vol.y < 0) {
    const prof = Math.min(1, Math.log(c.p) / Math.log(200));
    ciel = melanger(a.couleurs.ciel, '#1a0800', prof);
  }
  if (a.type === 'etoile') {
    const lum = Math.min(1, Math.max(0, (c.t - 300) / 4000));
    ciel = melanger('#02030a', '#ff8a00', lum * 0.8);
  }
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, W, H);

  // Étoiles, de moins en moins visibles quand le ciel s'éclaire.
  const visEt = 1 - Math.min(1, tCiel * 1.4);
  if (visEt > 0.02) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * visEt})`;
    for (const e of ETOILES) ctx.fillRect(e.x * W, e.y * H, e.r, e.r);
  }

  // Planète mère dans le ciel (pour les lunes) et Soleil.
  if (a.parent && ASTRES_PAR_ID[a.parent]) {
    const pm = ASTRES_PAR_ID[a.parent];
    ctx.globalAlpha = 0.9 * Math.max(0.25, visEt);
    ctx.fillStyle = pm.couleurs.disque;
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.18, Math.min(W, H) * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (a.type !== 'etoile') {
    const rs = Math.max(2, 14 / Math.sqrt(a.distanceUA));
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath(); ctx.arc(W * 0.15, H * 0.12, rs, 0, Math.PI * 2); ctx.fill();
  }

  // Poussières / nuages qui défilent pour sentir la vitesse.
  if (c.rho > 1e-4 || gaz || a.type === 'etoile') {
    const ep = Math.max(0.15, Math.min(3, echelle));
    const dx = vol.vx * ep * dtReel * warp, dy = -vol.vy * ep * dtReel * warp;
    const lx = Math.max(-80, Math.min(80, vol.vx * ep * 0.05)), ly = Math.max(-80, Math.min(80, -vol.vy * ep * 0.05));
    ctx.strokeStyle = gaz || a.type === 'etoile' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const p of POUSSIERES) {
      p.x = (((p.x - dx / W) % 1) + 1) % 1;
      p.y = (((p.y + dy / H) % 1) + 1) % 1;
      const px = p.x * W, py = p.y * H;
      ctx.moveTo(px, py); ctx.lineTo(px - lx, py - ly);
    }
    ctx.stroke();
  }

  // Sol des astres solides, ou niveau 1 bar des géantes.
  if (!gaz && solY < H + 10) {
    if (a.type === 'etoile') {
      const g = ctx.createLinearGradient(0, solY, 0, H);
      g.addColorStop(0, '#fff3c0'); g.addColorStop(1, '#ff9800');
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = a.couleurs.sol;
    }
    ctx.fillRect(0, solY, W, H - solY);
    if (a.type === 'solide' && echelle > 0.03) {
      // Rochers décoratifs, fixés au terrain.
      const pas = 30;
      const x0 = vol.x - W / 2 / echelle, x1 = vol.x + W / 2 / echelle;
      const n = (x1 - x0) / pas;
      if (n < 400) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let k = Math.floor(x0 / pas); k <= Math.ceil(x1 / pas); k++) {
          const h = hash(k);
          if (h < 0.55) continue;
          const sx = W / 2 + (k * pas - vol.x) * echelle;
          const r = (1 + hash(k + 7) * 3) * echelle;
          ctx.beginPath(); ctx.ellipse(sx, solY + 1, r * 1.6, r * 0.6, 0, Math.PI, 0); ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, solY, W, 2);
    }
  }
  if (gaz && solY > -50 && solY < H + 50) {
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(0, solY); ctx.lineTo(W, solY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('niveau 1 bar', 12, solY - 6);
  }

  // Fusée ou explosion.
  const hPx = Math.max(FUSEE_BASE.hauteur * echelle, 38);
  if (vol.explosion) {
    dessinerExplosion(ctx, vol.explosion, W / 2, fuseeY - hPx * 0.4, dtReel);
  } else {
    dessinerFusee(ctx, vol, W / 2, fuseeY, hPx);
  }

  dessinerHUD(ctx, vol, W, H, warp);
}

function dessinerFusee(ctx, vol, x, y, h) {
  const ch = vol.f.choix;
  const w = h * 0.26;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vol.angle);

  // Flamme
  if (vol.throttle > 0) {
    const L = h * (0.35 + 0.5 * vol.throttle) * (0.85 + Math.random() * 0.3);
    const gr = ctx.createLinearGradient(0, 0, 0, L);
    gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.4, '#ffab40'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(-w * 0.35, 0); ctx.lineTo(0, L); ctx.lineTo(w * 0.35, 0); ctx.fill();
  }

  // Panneaux anti-vent solaire
  if (ch.panneau !== 'aucun') {
    const taille = { leger: 0.5, moyen: 0.75, lourd: 1, helio: 1.3 }[ch.panneau] || 0.5;
    ctx.fillStyle = '#2f6fd6';
    ctx.strokeStyle = '#9ec3ff';
    ctx.lineWidth = 1;
    const pw = w * taille, ph = h * 0.22;
    ctx.fillRect(-w / 2 - pw, -h * 0.62, pw, ph); ctx.strokeRect(-w / 2 - pw, -h * 0.62, pw, ph);
    ctx.fillRect(w / 2, -h * 0.62, pw, ph); ctx.strokeRect(w / 2, -h * 0.62, pw, ph);
  }

  // Ailerons
  ctx.fillStyle = '#c62828';
  ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.28); ctx.lineTo(-w * 0.95, 0); ctx.lineTo(-w / 2, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w / 2, -h * 0.28); ctx.lineTo(w * 0.95, 0); ctx.lineTo(w / 2, 0); ctx.fill();

  // Tuyère (plus large pour les gros moteurs)
  const tuy = { libellule: 0.45, faucon: 0.6, titan: 0.8, heracles: 1 }[ch.moteur] || 0.6;
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.moveTo(-w * 0.25, -h * 0.05); ctx.lineTo(-w * 0.5 * tuy, 0); ctx.lineTo(w * 0.5 * tuy, 0); ctx.lineTo(w * 0.25, -h * 0.05); ctx.fill();

  // Corps
  ctx.fillStyle = '#eceff1';
  ctx.fillRect(-w / 2, -h * 0.8, w, h * 0.75);
  if (ch.coque !== 'aucun') {
    const ep = { leger: 1, renforce: 2, lourd: 3, abyssal: 4 }[ch.coque] || 1;
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = ep;
    ctx.strokeRect(-w / 2, -h * 0.8, w, h * 0.75);
    ctx.beginPath();
    for (let i = 1; i <= ep; i++) { const yy = -h * 0.8 + (h * 0.75 * i) / (ep + 1); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); }
    ctx.stroke();
  }
  // Hublot
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath(); ctx.arc(0, -h * 0.6, w * 0.22, 0, Math.PI * 2); ctx.fill();

  // Coiffe (couleur du bouclier thermique)
  const coul = { aucun: '#c62828', ceramique: '#e0e0e0', ablatif: '#6d4c41', carbone: '#212121', tungstene: '#90a4ae' }[ch.bouclier] || '#c62828';
  ctx.fillStyle = coul;
  ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.8); ctx.quadraticCurveTo(0, -h * 1.1, w / 2, -h * 0.8); ctx.fill();
  if (ch.bouclier !== 'aucun') { ctx.fillRect(-w / 2, -h * 0.07, w, h * 0.03); }

  // Rougeoiement quand la coque chauffe
  const chauffe = Math.max(0, Math.min(1, (vol.temp - 100) / Math.max(200, vol.f.tempMax - 100)));
  if (chauffe > 0.05) {
    ctx.fillStyle = `rgba(255,${Math.round(120 - 80 * chauffe)},0,${0.55 * chauffe})`;
    ctx.fillRect(-w / 2, -h * 0.8, w, h * 0.75);
  }
  ctx.restore();
}

function dessinerExplosion(ctx, ex, x, y, dt) {
  ex.t += dt;
  for (const p of ex.parts) {
    if (ex.t > p.vie) continue;
    const k = ex.t / p.vie;
    ctx.fillStyle = `rgba(255,${Math.round(200 - 150 * k)},0,${1 - k})`;
    ctx.beginPath(); ctx.arc(x + p.vx * ex.t, y + p.vy * ex.t, 5 * (1 - k) + 1, 0, Math.PI * 2); ctx.fill();
  }
}

function jauge(ctx, x, y, w, frac, couleur) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 5);
}

function couleurRisque(frac) { return frac < 0.6 ? '#66bb6a' : frac < 0.9 ? '#ffca28' : '#ef5350'; }

function dessinerHUD(ctx, vol, W, H, warp) {
  const a = vol.astre, c = vol.c, f = vol.f;
  const x = 14, larg = 250;
  let y = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(8, 8, larg + 12, 330);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(a.nom, x, y + 12);
  y += 24;

  const ligne = (label, valeur, couleur = '#fff') => {
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#b0bec5';
    ctx.fillText(label, x, y + 10);
    ctx.font = 'bold 13px ui-monospace, Consolas, monospace';
    ctx.fillStyle = couleur;
    ctx.fillText(valeur, x + 105, y + 10);
    y += 18;
  };

  ligne('Altitude', fmtAlt(vol.y) + (a.type === 'gazeuse' ? ' (1 bar)' : ''));
  const vv = -vol.vy;
  let coulV = '#fff';
  if (a.type === 'solide' && vol.y < 2000) coulV = vv > a.vMax ? '#ef5350' : '#66bb6a';
  ligne('Vitesse vert.', (vv >= 0 ? '↓ ' : '↑ ') + fmtV(Math.abs(vv)), coulV);
  ligne('Vitesse horiz.', fmtV(Math.abs(vol.vx)), a.type === 'solide' && Math.abs(vol.vx) > a.vMax && vol.y < 2000 ? '#ef5350' : '#fff');

  const fc = vol.carburant / f.carburant;
  ligne('Carburant', fmt(vol.carburant) + ' kg', fc < 0.15 ? '#ef5350' : '#fff');
  jauge(ctx, x, y - 4, larg, fc, fc < 0.15 ? '#ef5350' : '#42a5f5'); y += 6;

  const fp = c.p / f.pressionMax;
  ligne('Pression', fmtP(c.p) + ' / ' + fmt(f.pressionMax), couleurRisque(fp));
  jauge(ctx, x, y - 4, larg, fp, couleurRisque(fp)); y += 6;

  const ft = (vol.temp + KELVIN) / (f.tempMax + KELVIN);
  ligne('Temp. coque', fmt(vol.temp) + ' / ' + fmt(f.tempMax) + ' °C', couleurRisque(ft));
  jauge(ctx, x, y - 4, larg, ft, couleurRisque(ft)); y += 6;
  ligne('Temp. extérieure', fmt(c.t) + ' °C');

  ligne('Gravité locale', fmt(c.g, 2) + ' m/s² (' + fmt(c.g / G0, 2) + ' g)');
  const twr = vol.twr();
  ligne('Poussée/poids', fmt(twr, 2), twr < 1 ? '#ef5350' : '#66bb6a');

  const fr = c.rad / f.protection;
  ligne('Rayonnement', fmt(c.rad, c.rad < 10 ? 1 : 0) + ' / ' + fmt(f.protection, 1), couleurRisque(fr));
  ligne('Dose reçue', fmt(vol.dose) + ' %', couleurRisque(vol.dose / 100));

  // Objectif
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const txt = vol.objectifTexte();
  const tw = ctx.measureText(txt).width;
  ctx.fillRect(W / 2 - tw / 2 - 12, 10, tw + 24, 30);
  ctx.fillStyle = '#fff';
  ctx.fillText(txt, W / 2, 31);

  // Aide commandes et accélération du temps
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('↑/Z pousser · ↓/S poussée douce · ←→/Q D orienter · +/− temps · P pause · Échap quitter', W / 2, H - 14);
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = warp > 1 ? '#ffca28' : 'rgba(255,255,255,0.6)';
  ctx.fillText('Temps ×' + warp, W - 14, 28);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('T+ ' + fmt(vol.t) + ' s', W - 14, 46);
  ctx.textAlign = 'left';
}
