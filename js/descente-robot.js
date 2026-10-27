'use strict';
// Largage d'un robot depuis l'orbite : petite animation avant l'exploration.
// Avec une atmosphère, un parachute freine la descente ; sans air (la Lune…), ce sont des rétrofusées.
// Les ballons gonflés autour du module encaissent le choc : rebonds, puis dégonflage, et le robot sort.
// Même commande du temps que les autres écrans : + / − au clavier, ou les boutons à l'écran.

class DescenteRobot {
  constructor(vol) {
    this.vol = vol;
    this.a = vol.astre;
    this.xModule = vol.x;                         // le module se pose là (sa base pour transmettre)
    this.parachute = !!(this.a.atm && this.a.atm.p0 > 0.005);
    this.c = conditions(this.a, vol.sol(this.xModule));
    this.vitesse = 1;
    this.fini = false;
    this.tAnim = 0;
    // [nom, durée à ×1 (s)]
    this.phases = [['descente', 4.5], ['rebonds', 3.4], ['degonflage', 1.8], ['sortie', 1.6]];
    this.i = 0; this.tp = 0;
  }
  get phase() { return this.phases[this.i][0]; }

  step(dt) {
    if (this.fini || !(dt > 0)) return;
    this.tAnim += dt;
    this.tp += dt * this.vitesse;
    while (this.tp >= this.phases[this.i][1]) {
      this.tp -= this.phases[this.i][1];
      if (this.i + 1 >= this.phases.length) { this.tp = this.phases[this.i][1]; this.fini = true; return; }
      this.i++;
    }
  }
  passer() { this.fini = true; }

  changerVitesse(sens) {
    const paliers = [0.25, 0.5, 1, 2, 4, 8];
    const i = paliers.indexOf(this.vitesse);
    this.vitesse = paliers[Math.max(0, Math.min(paliers.length - 1, i + sens))];
  }
  touche(e) {
    if (['NumpadAdd', 'Equal', 'BracketRight'].includes(e.code) || e.key === '+') this.changerVitesse(1);
    else if (['NumpadSubtract', 'Minus', 'Digit6'].includes(e.code) || e.key === '-') this.changerVitesse(-1);
  }
  clic(x, y) {
    for (const b of this.boutons || []) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { this.changerVitesse(b.sens); return true; }
    return false;
  }

  dessiner(ctx, W, H) {
    const vol = this.vol, a = this.a, echelle = 26;
    const f = Math.min(1, this.tp / this.phases[this.i][1]), lisse = f * f * (3 - 2 * f);
    const ROULE = 10;                               // m parcourus en rebondissant
    let h = 0, xb = this.xModule, gonfle = 1, sortie = 0;
    if (this.phase === 'descente') { h = 45 * (1 - lisse); xb = this.xModule - ROULE; }
    if (this.phase === 'rebonds') {
      h = 7 * Math.abs(Math.sin(Math.PI * 3 * f)) * Math.pow(1 - f, 1.4);
      xb = this.xModule - ROULE * (1 - f);
    }
    if (this.phase === 'degonflage') gonfle = 1 - 0.85 * lisse;
    if (this.phase === 'sortie') { gonfle = 0.15; sortie = lisse; }
    const sol = vol.sol(xb), yObj = sol + h;
    const camY = H * 0.55, yCam = Math.max(yObj, sol) + 3;
    const versEcran = (x, y) => [W / 2 + (x - xb) * echelle, camY + (yCam - y) * echelle];

    dessinerFond(ctx, a, this.c, W, H, false, tempsCiel(vol), vol);
    dessinerTerrain(ctx, { x: xb, y: yCam, sol: (x) => vol.sol(x), astre: a, autopilote: false }, W, H, echelle, camY);
    const [sx, sy] = versEcran(xb, yObj);
    const R = 1.5 * echelle;                         // rayon de la grappe de ballons (m → px)

    // Parachute (air) ou rétrofusées (sans air) pendant la descente.
    if (this.phase === 'descente') {
      if (this.parachute) {
        const Rp = 4 * echelle, yc = sy - R * 2 - 7 * echelle;
        ctx.strokeStyle = 'rgba(240,240,240,0.7)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - Rp * 0.9, yc); ctx.lineTo(sx, sy - R * 2); ctx.lineTo(sx + Rp * 0.9, yc); ctx.stroke();
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = i % 2 ? '#ffffff' : '#f4511e';
          ctx.beginPath(); ctx.moveTo(sx, yc); ctx.arc(sx, yc, Rp, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6); ctx.closePath(); ctx.fill();
        }
      } else if (f > 0.35) {
        // Rétrofusées : montées au-dessus du module, elles soufflent vers le sol (en biais, pour éviter les
        // ballons) et freinent la chute, juste avant le contact.
        const flamme = (0.6 + 0.4 * Math.random()) * echelle * 2.2;
        const yTuyere = sy - R * 2;
        ctx.fillStyle = '#90a4ae';
        ctx.fillRect(sx - R * 0.9, yTuyere - 4, R * 1.8, 5);                     // support des rétrofusées
        for (const sens of [-1, 1]) {
          const x0 = sx + sens * R * 0.85;
          const xF = x0 + sens * 0.55 * flamme, yF = yTuyere + 0.83 * flamme;   // vers le bas, et vers l'extérieur
          const g = ctx.createLinearGradient(x0, yTuyere, xF, yF);
          g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(1, 'rgba(255,120,40,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.moveTo(x0 - 4, yTuyere); ctx.lineTo(xF, yF); ctx.lineTo(x0 + 4, yTuyere); ctx.fill();
        }
      }
    }

    // Module du robot (visible une fois les ballons dégonflés), puis le robot qui en sort.
    if (gonfle < 0.6) dessinerModuleRobot(ctx, sx, sy, echelle, false);
    // Grappe de ballons : six sphères blanches autour du module, qui se dégonflent.
    if (gonfle > 0.16) {
      const r = R * 0.55 * gonfle;
      ctx.fillStyle = `rgba(245,245,240,${0.55 + 0.4 * gonfle})`;
      ctx.strokeStyle = 'rgba(160,160,150,0.8)'; ctx.lineWidth = 1;
      const rot = this.phase === 'rebonds' ? f * 4 : 0;
      for (let k = 0; k < 6; k++) {
        const ang = rot + (k * Math.PI) / 3;
        const cx = sx + Math.cos(ang) * R * 0.5 * gonfle, cy = sy - R * gonfle + Math.sin(ang) * R * 0.5 * gonfle;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      }
    } else {
      // Ballons à plat, comme des draps froissés.
      ctx.fillStyle = 'rgba(230,230,220,0.85)';
      ctx.beginPath(); ctx.ellipse(sx, sy - 3, R * 0.9, 5, 0, Math.PI, 0); ctx.fill();
    }
    if (sortie > 0) {
      const [rx, ry] = versEcran(this.xModule + 2 * sortie, vol.sol(this.xModule + 2 * sortie));
      dessinerRobot(ctx, rx, ry, echelle, { dir: 1, pas: sortie * 3 }, false, 0);
      // Avec de l'air, le drone arrimé sort lui aussi, de l'autre côté du module.
      if (vol.droneEmbarque) {
        const xd = this.xModule - 2.2 * sortie;
        const [dx, dy] = versEcran(xd, vol.sol(xd));
        dessinerDrone(ctx, { angle: 0, throttle: 0, t: 0 }, dx, dy, (echelle * HAUTEUR_MODULE) / 3);
      }
    }
    // Poussière au contact
    if (this.phase === 'rebonds' && h < 0.4) {
      ctx.fillStyle = 'rgba(200,180,160,0.35)';
      ctx.beginPath(); ctx.ellipse(sx, sy, R * 1.3, 6, 0, Math.PI, 0); ctx.fill();
    }

    // Panneau
    const textes = {
      descente: this.parachute ? `Le module du robot descend sous parachute vers ${le(a)}.` : `Pas d’air ${sur(a)} : les rétrofusées freinent la descente.`,
      rebonds: 'Contact ! Les ballons encaissent le choc : rebonds.',
      degonflage: 'Arrêt : les ballons se dégonflent.',
      sortie: vol.droneEmbarque ? 'Le module s’ouvre : le robot et son drone sortent. Le robot reviendra ici transmettre ses analyses.' : 'Le module s’ouvre : le robot sort. Il reviendra ici transmettre ses analyses.',
    };
    const lignes = [['Largage du robot', '#ffffff', true], [textes[this.phase], '#ffffff', true],
      [`Vitesse ×${fmtNombre(this.vitesse, 2)} · + / − : vitesse`, '#8fa3b8']];
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const x0 = 14, y0 = 14, w = Math.min(460, W - 28);
    let yy = y0 + 8;
    ctx.fillStyle = 'rgba(8,14,28,0.72)';
    ctx.beginPath(); ctx.roundRect(x0, y0, w, 74, 8); ctx.fill();
    for (const [t, c, gras] of lignes) { ctx.font = `${gras ? '600 ' : ''}13px system-ui, sans-serif`; ctx.fillStyle = c; ctx.fillText(t, x0 + 10, yy); yy += 20; }
    const bw = 40, yb = y0 + 82;
    this.boutons = [{ x: x0, y: yb, w: bw, h: bw, sens: -1, t: '−' }, { x: x0 + bw + 8, y: yb, w: bw, h: bw, sens: 1, t: '+' }];
    for (const b of this.boutons) {
      ctx.fillStyle = 'rgba(8,14,28,0.72)'; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '600 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.t, b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    ctx.restore();
    if (!this.fini) texteSurFond(ctx, 'Entrée, Espace ou toucher l’écran : passer', W / 2, H - 16, { police: '12px system-ui, sans-serif', couleur: '#8fa3b8' });
  }
}
