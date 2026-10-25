'use strict';
// Retour sur Terre en capsule, animé avec des durées réalistes (temps accéléré, facteur affiché) :
// rentrée atmosphérique (bouclier, plasma, coupure radio), parachute de stabilisation vers 7 km,
// parachutes principaux vers 3 km, amerrissage (≈ 8 m/s), puis récupération :
// avec équipage, un hélicoptère arrive du bord de l'écran et hélitreuille le ou la spationaute ;
// capsule vide, un navire arrive et la hisse à bord avec sa grue.
// La rentrée est calculée : traînée (coefficient balistique de la capsule), portance (finesse 0,3) et gravité.

const CAPSULE_RETOUR = { beta: 400, finesse: 0.2, betaPilote: 60, betaPrincipal: 4 };   // kg/m²

class RetourTerre {
  constructor(options = {}) {
    this.equipage = options.equipage !== false;
    this.echantillons = options.echantillons || 0;
    this.nom = options.nom || 'l’équipage';
    this.terre = ASTRES_PAR_ID.terre;
    // Interface d'entrée : 120 km, 7,8 km/s, pente de −2°.
    const v0 = 7800, gam = (-2 * Math.PI) / 180;
    this.h = 120000; this.vx = v0 * Math.cos(gam); this.vy = v0 * Math.sin(gam);
    this.t = 0;                   // temps simulé (s)
    this.tAnim = 0;
    this.beta = CAPSULE_RETOUR.beta;
    this.gMax = 0;
    this.phase = 'rentree';
    this.tPhase = 0;              // temps réel passé dans la phase de récupération
    this.fini = false;
    this.etoiles = Array.from({ length: 120 }, (_, i) => [hash(i * 5.3), hash(i * 2.9), 0.3 + 0.7 * hash(i * 1.7)]);
    this.nuages = Array.from({ length: 14 }, (_, i) => ({ x: hash(i * 3.3), alt: 1200 + 2500 * hash(i * 9.1), l: 0.08 + 0.12 * hash(i * 4.4) }));
    // Durée à l'écran (s réelles) de chaque étape de la récupération, et durée simulée correspondante.
    this.recup = this.equipage
      ? [['flotte', 3, 300], ['helico', 5, 25 * 60], ['treuil', 3, 4 * 60], ['montee', 3.5, 4 * 60], ['depart', 3, 5 * 60]]
      : [['flotte', 3.5, 300], ['bateau', 6, 2 * 3600], ['grue', 4, 20 * 60], ['hisse', 3, 10 * 60], ['fin', 2, 0]];
  }

  // Facteur de temps de la descente : la rentrée en ≈ 10 s, les parachutes en ≈ 8 s.
  facteur() {
    if (this.phase === 'rentree') return 70;
    if (this.phase === 'pilote') return 20;
    if (this.phase === 'principal') return 55;
    const e = this.recup.find((r) => r[0] === this.phase);
    return e && e[1] ? Math.max(1, e[2] / e[1]) : 1;
  }

  passer() {
    if (this.phase === 'rentree' || this.phase === 'pilote' || this.phase === 'principal') {
      // On saute directement à la récupération.
      // Temps restant estimé : ≈ 13 min de rentrée depuis 120 km, puis 7 km de parachutes (≈ 7 min).
      this.t += this.h > 7000 ? ((this.h - 7000) / 113000) * 13 * 60 + 7 * 60 : this.h / 15;
      this.h = 0; this.vx = 0; this.vy = 0;
      this.entrerRecuperation();
      return;
    }
    this.fini = true;
  }

  entrerRecuperation() {
    this.phase = this.recup[0][0];
    this.iRecup = 0;
    this.tPhase = 0;
  }

  step(dt) {
    if (this.fini || !(dt > 0)) return;
    this.tAnim += dt;             // temps réel, pour les animations (rotors, houle, balise)
    if (this.iRecup !== undefined) {
      // Récupération : une étape après l'autre.
      const [, duree, sim] = this.recup[this.iRecup];
      this.tPhase += dt;
      this.t += (dt * sim) / Math.max(0.01, duree);
      if (this.tPhase >= duree) {
        // Dernière étape terminée : on reste sur sa dernière image.
        if (this.iRecup + 1 >= this.recup.length) { this.tPhase = duree; this.fini = true; return; }
        this.iRecup++;
        this.tPhase = 0;
        this.phase = this.recup[this.iRecup][0];
      }
      return;
    }
    // Descente : intégration de la trajectoire.
    const total = dt * this.facteur();
    const n = Math.ceil(total / 0.05);
    for (let i = 0; i < n && this.h > 0; i++) this.integrer(total / n);
    if (this.h <= 0) { this.h = 0; this.entrerRecuperation(); }
  }

  integrer(dt) {
    const T = this.terre, R = T.rayonKm * 1000;
    const c = conditions(T, this.h);
    const v = Math.hypot(this.vx, this.vy);
    // Ouverture des parachutes (gonflage progressif sur quelques secondes).
    if (this.phase === 'rentree' && this.h < 7300 && v < 250) { this.phase = 'pilote'; this.tOuverture = this.t; }
    if (this.phase === 'pilote' && this.h < 3000) { this.phase = 'principal'; this.tOuverture = this.t; }
    let betaCible = CAPSULE_RETOUR.beta;
    if (this.phase === 'pilote') betaCible = CAPSULE_RETOUR.betaPilote;
    if (this.phase === 'principal') betaCible = CAPSULE_RETOUR.betaPrincipal;
    this.beta += (betaCible - this.beta) * Math.min(1, dt / 4);
    const aDrag = (0.5 * c.rho * v * v) / this.beta;
    const ux = this.vx / (v || 1), uy = this.vy / (v || 1);
    // Portance (seulement pendant la rentrée), perpendiculaire à la vitesse, vers le haut.
    const aLift = this.phase === 'rentree' ? aDrag * CAPSULE_RETOUR.finesse : 0;
    const lx = -uy, ly = ux;
    const sens = ly >= 0 ? 1 : -1;
    const ax = -aDrag * ux + sens * aLift * lx;
    const ay = -aDrag * uy + sens * aLift * ly - c.g + (this.vx * this.vx) / (R + this.h);
    this.vx += ax * dt; this.vy += ay * dt;
    if (this.phase !== 'rentree') this.vx *= Math.exp(-dt / 20);       // sous parachute, on finit par descendre presque à la verticale
    this.h += this.vy * dt;
    this.t += dt;
    this.decel = Math.hypot(aDrag, aLift) / G0;
    this.gMax = Math.max(this.gMax, this.decel);
    this.v = Math.hypot(this.vx, this.vy);
  }

  // ---------- Dessin ----------
  dessiner(ctx, W, H) {
    const recup = this.iRecup !== undefined;
    if (recup) this.dessinerRecuperation(ctx, W, H);
    else this.dessinerDescente(ctx, W, H);
    this.dessinerPanneau(ctx, W, H);
    if (!this.fini) texteSurFond(ctx, 'Entrée, Espace ou toucher l’écran : passer', W / 2, H - 16, { police: '12px system-ui, sans-serif', couleur: '#8fa3b8' });
  }

  couleurCiel(h) {
    // Noir de l'espace, puis bleu de plus en plus clair en descendant.
    const k = Math.min(1, Math.max(0, 1 - h / 80000));
    const r = Math.round(4 + 80 * k * k), g = Math.round(8 + 150 * k * k), b = Math.round(20 + 215 * k);
    return `rgb(${r},${g},${b})`;
  }

  dessinerDescente(ctx, W, H) {
    const h = this.h, cx = W / 2, cy = H * 0.42;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.couleurCiel(h + 30000)); g.addColorStop(1, this.couleurCiel(h));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Étoiles tant que le ciel est sombre.
    const vis = Math.max(0, Math.min(1, (h - 30000) / 40000));
    if (vis > 0) for (const [x, y, b] of this.etoiles) { ctx.fillStyle = `rgba(255,255,255,${b * vis})`; ctx.fillRect(x * W, y * H * 0.6, 1.3, 1.3); }
    // L'océan et la courbure de la Terre : la mer reste en bas tant qu'on est haut, puis monte vers la capsule.
    const echelle = (H * 0.38) / Math.max(h, 1500);                 // px/m
    const yMer = cy + h * echelle;
    const Rpx = this.terre.rayonKm * 1000 * echelle;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, yMer + Rpx, Rpx, 0, 2 * Math.PI);
    const gm = ctx.createLinearGradient(0, yMer, 0, H);
    gm.addColorStop(0, h > 20000 ? '#3d78c4' : '#2a6cb8'); gm.addColorStop(1, '#0d3466');
    ctx.fillStyle = gm; ctx.fill();
    // Halo d'atmosphère au-dessus de l'horizon (vu d'en haut).
    if (h > 15000) { ctx.strokeStyle = 'rgba(140,200,255,0.35)'; ctx.lineWidth = 6; ctx.stroke(); }
    ctx.restore();
    // Nuages : couche entre 1 et 4 km, qui remonte quand on la traverse.
    for (const n of this.nuages) {
      const y = cy + (h - n.alt) * echelle;
      if (y < -30 || y > H + 30) continue;
      const x = ((n.x + this.t * 0.0004) % 1) * W * 1.3 - W * 0.15;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      // Épaisseur réelle (≈ 600 m) à l'échelle : de fines bandes vues de haut, de gros nuages en dessous.
      const ry = Math.max(1.5, Math.min(n.l * W * 0.18, 600 * echelle));
      ctx.beginPath(); ctx.ellipse(x, y, n.l * W, ry, 0, 0, 2 * Math.PI); ctx.fill();
    }
    // Capsule (taille fixe à l'écran), inclinée selon sa trajectoire pendant la rentrée.
    const taille = Math.min(46, H * 0.07);
    ctx.save();
    ctx.translate(cx, cy);
    const pente = Math.atan2(-this.vy, this.vx);                       // angle sous l'horizontale
    // Pendant la rentrée, le bouclier thermique fait face à la vitesse.
    if (this.phase === 'rentree') ctx.rotate(pente - Math.PI / 2);
    // Plasma : lueur autour du bouclier quand l'air freine fort.
    const chauffe = this.phase === 'rentree' ? Math.min(1, ((this.v || 0) / 7800) ** 3 * Math.min(1, (this.decel || 0) / 1.5)) : 0;
    if (chauffe > 0.03) {
      const gp = ctx.createRadialGradient(0, 0, taille * 0.2, 0, 0, taille * 2.2);
      gp.addColorStop(0, `rgba(255,220,150,${0.9 * chauffe})`); gp.addColorStop(0.5, `rgba(255,120,40,${0.5 * chauffe})`); gp.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = gp; ctx.beginPath(); ctx.arc(0, taille * 0.2, taille * 2.2, 0, 2 * Math.PI); ctx.fill();
      // Traînée lumineuse derrière la capsule.
      const gt = ctx.createLinearGradient(0, 0, 0, -taille * 6);
      gt.addColorStop(0, `rgba(255,170,60,${0.7 * chauffe})`); gt.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = gt; ctx.beginPath(); ctx.moveTo(-taille * 0.5, 0); ctx.lineTo(0, -taille * 6); ctx.lineTo(taille * 0.5, 0); ctx.fill();
    }
    if (this.phase === 'pilote' || this.phase === 'principal') this.dessinerParachutes(ctx, taille);
    dessinerCapsule(ctx, taille * 0.5, taille, taille * 1.1);
    ctx.restore();
  }

  dessinerParachutes(ctx, taille) {
    const ouverture = Math.min(1, (this.t - (this.tOuverture || this.t)) / 4);
    const yAttache = -taille * 0.5;
    if (this.phase === 'pilote') {
      const R = taille * (0.4 + 0.3 * ouverture), yc = yAttache - taille * 2.4;
      ctx.strokeStyle = 'rgba(240,240,240,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-R, yc); ctx.lineTo(0, yAttache); ctx.lineTo(R, yc); ctx.stroke();
      ctx.fillStyle = '#ff7043';
      ctx.beginPath(); ctx.ellipse(0, yc, R, R * 0.55, 0, Math.PI, 2 * Math.PI); ctx.fill();
      return;
    }
    // Trois parachutes principaux, rayés orange et blanc.
    const R = taille * (0.7 + 0.9 * ouverture);
    for (const dx of [-1.15, 0, 1.15]) {
      const xc = dx * R * 1.05, yc = yAttache - taille * 3.4 - (dx === 0 ? taille * 0.3 : 0);
      ctx.strokeStyle = 'rgba(240,240,240,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xc - R * 0.9, yc); ctx.lineTo(0, yAttache); ctx.lineTo(xc + R * 0.9, yc); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#f4511e';
        ctx.beginPath(); ctx.moveTo(xc, yc); ctx.arc(xc, yc, R, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6); ctx.closePath(); ctx.fill();
      }
    }
  }

  // ---------- Récupération ----------
  dessinerRecuperation(ctx, W, H) {
    const yMer = H * 0.62, cx = W * 0.5;
    const temps = this.t;
    const g = ctx.createLinearGradient(0, 0, 0, yMer);
    g.addColorStop(0, '#5aa2e8'); g.addColorStop(1, '#bfe0f7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, yMer);
    for (const n of this.nuages.slice(0, 6)) {
      const x = ((n.x + temps * 0.00002) % 1) * W * 1.2 - W * 0.1;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.ellipse(x, yMer * (0.15 + 0.4 * hash(n.alt)), n.l * W, n.l * W * 0.2, 0, 0, 2 * Math.PI); ctx.fill();
    }
    const gm = ctx.createLinearGradient(0, yMer, 0, H);
    gm.addColorStop(0, '#2a6cb8'); gm.addColorStop(1, '#0b2c57');
    ctx.fillStyle = gm; ctx.fillRect(0, yMer, W, H - yMer);
    const k = Math.min(1.4, Math.max(0.7, W / 900));                  // taille des objets
    const houle = (x) => yMer + Math.sin(x * 0.02 + this.tAnim * 1.6) * 3 * k;
    // Avancement de l'étape en cours (0 → 1).
    const e = this.recup[this.iRecup], f = Math.min(1, this.tPhase / e[1]);
    const lisse = f * f * (3 - 2 * f);

    // Capsule qui flotte (ballons de redressement gonflés), sauf une fois hissée sur le navire.
    let xCap = cx, yCap = houle(cx) + 6 * k, capsuleSurPont = false;
    const taille = 40 * k;

    if (!this.equipage) {
      // Navire : il arrive du bord gauche, s'arrête à côté de la capsule, puis la grue la hisse.
      // Arrêt calculé pour que le bout de la flèche (abaissée) soit juste au-dessus de la capsule.
      const BAS = 0.15, RANGE = 1.25;
      const xArret = cx - (80 + 150 * Math.cos(BAS)) * k;
      let xB = xArret;
      if (this.phase === 'flotte') xB = -400 * k;
      else if (this.phase === 'bateau') xB = -400 * k + (xArret + 400 * k) * lisse;
      let angleGrue = RANGE, crochetY = 0, suit = false;
      if (this.phase === 'grue') { angleGrue = RANGE - (RANGE - BAS) * lisse; crochetY = lisse; }
      if (this.phase === 'hisse') { angleGrue = BAS + (RANGE - BAS) * lisse; crochetY = 1 - lisse; suit = true; }
      const pos = this.dessinerNavire(ctx, xB, houle(xB), k, angleGrue, crochetY, yCap);
      if (suit) { xCap = pos.xCrochet; yCap = pos.yCrochet + taille; }   // la capsule pend au crochet
      if (this.phase === 'fin') { xCap = pos.xCrochet; yCap = houle(xB) - 18 * k; capsuleSurPont = true; }
      if (this.phase === 'flotte' || this.phase === 'bateau') {
        texteSurFond(ctx, 'Capsule vide', cx, H * 0.2, { police: `600 ${Math.round(22 * k)}px system-ui, sans-serif`, couleur: '#ffd666' });
      }
    }
    // Capsule
    ctx.save();
    ctx.translate(xCap, yCap);
    if (!capsuleSurPont && this.iRecup !== undefined && !(this.phase === 'hisse' || this.phase === 'fin')) {
      ctx.rotate(Math.sin(this.tAnim * 1.3) * 0.06);
      // Ballons de redressement
      ctx.fillStyle = '#fafafa';
      for (const dx of [-0.22, 0, 0.22]) { ctx.beginPath(); ctx.arc(dx * taille, -taille * 0.95, taille * 0.13, 0, 2 * Math.PI); ctx.fill(); }
    }
    dessinerCapsule(ctx, 0, taille, taille * 1.1);
    // Balise lumineuse
    if (Math.floor(this.tAnim * 2) % 2 === 0) { ctx.fillStyle = '#ff5252'; ctx.beginPath(); ctx.arc(0, -taille * 1.05, 2.5 * k, 0, 2 * Math.PI); ctx.fill(); }
    ctx.restore();
    // Écume autour de la capsule qui flotte
    if (!(this.phase === 'hisse' || this.phase === 'fin')) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(xCap, houle(xCap) + 4 * k, taille * 0.75, 4 * k, 0, 0, 2 * Math.PI); ctx.stroke();
    }

    if (this.equipage) {
      // Hélicoptère : il arrive par la droite, se place au-dessus, descend le treuil, remonte l'équipage, repart.
      const yStat = yMer - 210 * k, xStat = cx + 20 * k;
      let xH = W + 200 * k, yH = yStat - 60 * k, cable = 0, personne = null;
      if (this.phase === 'helico') { xH = W + 200 * k + (xStat - W - 200 * k) * lisse; yH = yStat - 60 * k * (1 - lisse); }
      if (this.phase === 'treuil') { xH = xStat; yH = yStat; cable = lisse; personne = 0; }
      if (this.phase === 'montee') { xH = xStat; yH = yStat; cable = 1 - lisse; personne = lisse; }
      if (this.phase === 'depart') { xH = xStat - (xStat + 300 * k) * lisse; yH = yStat - 80 * k * lisse; }
      if (this.phase !== 'flotte') this.dessinerHelico(ctx, xH, yH, k, cable, yCap - taille * 1.1, personne);
      // Vent du rotor sur la mer
      if (this.phase === 'treuil' || this.phase === 'montee') {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) { const r = ((this.tAnim * 60 + i * 30) % 120) * k; ctx.beginPath(); ctx.ellipse(xH, yMer + 2, r, r * 0.12, 0, 0, 2 * Math.PI); ctx.stroke(); }
      }
    }
    // Vagues
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.2;
    for (let y = yMer + 14; y < H; y += 22) {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 12) { const yy = y + Math.sin(x * 0.03 + y + this.tAnim * 1.2) * 2; if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
      ctx.stroke();
    }
  }


  dessinerHelico(ctx, x, y, k, cable, yCapsule, personne) {
    ctx.save();
    ctx.translate(x, y);
    const s = k;
    // Câble du treuil et personne hélitreuillée
    if (cable > 0 || personne !== null) {
      const yBas = (yCapsule - y) * (personne !== null && personne > 0 ? 1 - personne : cable);
      ctx.strokeStyle = '#263238'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6 * s, 14 * s); ctx.lineTo(-6 * s, Math.max(14 * s, yBas)); ctx.stroke();
      if (personne !== null && personne > 0) this.dessinerPersonne(ctx, -6 * s, Math.max(14 * s, yBas) + 22 * s, s);
      else if (personne === 0 && cable > 0.95) this.dessinerPersonne(ctx, -6 * s, yBas + 22 * s, s);
    }
    // Fuselage
    ctx.fillStyle = '#e65100';
    ctx.beginPath(); ctx.ellipse(0, 0, 38 * s, 16 * s, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.fillRect(20 * s, -6 * s, 62 * s, 7 * s);                     // poutre de queue
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-10 * s, -2 * s, 40 * s, 3 * s);
    ctx.fillStyle = '#90caf9';
    ctx.beginPath(); ctx.ellipse(-24 * s, -3 * s, 12 * s, 9 * s, 0, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();   // verrière
    // Dérive et rotor de queue
    ctx.fillStyle = '#e65100'; ctx.beginPath(); ctx.moveTo(78 * s, -6 * s); ctx.lineTo(86 * s, -22 * s); ctx.lineTo(90 * s, -22 * s); ctx.lineTo(84 * s, 1 * s); ctx.fill();
    const rq = Math.abs(Math.sin(this.tAnim * 40)) * 10 * s;
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(88 * s, -14 * s - rq); ctx.lineTo(88 * s, -14 * s + rq); ctx.stroke();
    // Patins
    ctx.strokeStyle = '#37474f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-28 * s, 22 * s); ctx.lineTo(22 * s, 22 * s); ctx.moveTo(-14 * s, 14 * s); ctx.lineTo(-16 * s, 22 * s); ctx.moveTo(10 * s, 14 * s); ctx.lineTo(12 * s, 22 * s); ctx.stroke();
    // Mât et rotor principal (pales qui tournent : on en voit la largeur varier)
    ctx.fillStyle = '#37474f'; ctx.fillRect(-3 * s, -22 * s, 6 * s, 8 * s);
    const rp = (0.35 + 0.65 * Math.abs(Math.cos(this.tAnim * 30))) * 70 * s;
    ctx.strokeStyle = 'rgba(38,50,56,0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-rp, -23 * s); ctx.lineTo(rp, -23 * s); ctx.stroke();
    ctx.fillStyle = 'rgba(38,50,56,0.12)'; ctx.beginPath(); ctx.ellipse(0, -23 * s, 70 * s, 4 * s, 0, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
  }

  // Spationaute en combinaison claire, harnais au bout du câble.
  dessinerPersonne(ctx, x, y, s) {
    ctx.fillStyle = '#eceff1';
    ctx.beginPath(); ctx.arc(x, y - 18 * s, 4.5 * s, 0, 2 * Math.PI); ctx.fill();           // tête (casque)
    ctx.fillRect(x - 4 * s, y - 14 * s, 8 * s, 12 * s);                                       // corps
    ctx.fillStyle = '#1565c0'; ctx.fillRect(x - 4 * s, y - 10 * s, 8 * s, 2 * s);            // bande ESA
    ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 2.5 * s;
    ctx.beginPath(); ctx.moveTo(x - 2 * s, y - 2 * s); ctx.lineTo(x - 3 * s, y + 7 * s); ctx.moveTo(x + 2 * s, y - 2 * s); ctx.lineTo(x + 3 * s, y + 7 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 12 * s); ctx.lineTo(x, y - 24 * s); ctx.lineTo(x + 4 * s, y - 12 * s); ctx.stroke();   // bras tenant le câble
  }

  // Navire de récupération avec grue. Renvoie la position du crochet.
  dessinerNavire(ctx, x, yMer, k, angleGrue, descente, yCapsule) {
    const s = k;
    ctx.save();
    // Coque
    ctx.fillStyle = '#37474f';
    ctx.beginPath(); ctx.moveTo(x - 150 * s, yMer - 18 * s); ctx.lineTo(x + 140 * s, yMer - 18 * s); ctx.lineTo(x + 120 * s, yMer + 12 * s); ctx.lineTo(x - 140 * s, yMer + 12 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c62828'; ctx.fillRect(x - 142 * s, yMer + 4 * s, 258 * s, 6 * s);         // ligne de flottaison
    // Superstructure
    ctx.fillStyle = '#eceff1'; ctx.fillRect(x - 120 * s, yMer - 52 * s, 60 * s, 34 * s);
    ctx.fillStyle = '#90caf9'; for (let i = 0; i < 4; i++) ctx.fillRect(x - 114 * s + i * 14 * s, yMer - 46 * s, 9 * s, 7 * s);
    ctx.fillStyle = '#b0bec5'; ctx.fillRect(x - 98 * s, yMer - 70 * s, 6 * s, 18 * s);
    // Grue : mât à l'avant, flèche qui pivote vers la capsule.
    const xm = x + 80 * s, ym = yMer - 18 * s;
    ctx.fillStyle = '#fbc02d'; ctx.fillRect(xm - 5 * s, ym - 60 * s, 10 * s, 60 * s);
    const L = 150 * s;
    const ang = -angleGrue;                                           // 0 : flèche horizontale vers la droite
    const xb = xm + Math.cos(ang) * L, yb = ym - 60 * s + Math.sin(ang) * L;
    ctx.strokeStyle = '#fbc02d'; ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.moveTo(xm, ym - 60 * s); ctx.lineTo(xb, yb); ctx.stroke();
    // Câble et crochet : de la flèche jusqu'à la capsule (descente 1) ou relevé (0).
    const yHaut = yb + 10 * s, yBas = yCapsule - 44 * s;
    const yC = yHaut + (Math.max(yHaut, yBas) - yHaut) * descente;
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xb, yb); ctx.lineTo(xb, yC); ctx.stroke();
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(xb, yC + 4 * s, 4 * s, 0, Math.PI); ctx.stroke();
    ctx.restore();
    return { xCrochet: xb, yCrochet: yC + 8 * s };
  }

  // ---------- Panneau d'informations ----------
  dessinerPanneau(ctx, W, H) {
    const lignes = [];
    const recup = this.iRecup !== undefined;
    lignes.push(['Retour sur Terre', '#ffffff', true]);
    if (!recup) {
      lignes.push([`Altitude ${fmtAlt(this.h)} · vitesse ${fmtV(this.v || 7800)} · ${fmt(this.decel || 0, 1)} g (max ${fmt(this.gMax, 1)} g)`, '#cfd8e3']);
      let etape;
      if (this.phase === 'rentree') {
        const plasma = this.h < 85000 && this.h > 40000 && (this.v || 0) > 3500;
        etape = this.h > 90000 ? 'Interface d’entrée à 120 km : la capsule présente son bouclier thermique.'
          : plasma ? 'Rentrée atmosphérique : le bouclier chauffe, le plasma coupe la radio.'
            : 'Rentrée atmosphérique : l’air freine la capsule.';
      } else if (this.phase === 'pilote') etape = 'Parachute de stabilisation ouvert vers 7 km.';
      else etape = 'Parachutes principaux ouverts à 3 km : descente à environ 8 m/s vers l’océan.';
      lignes.push([etape, '#ffffff', true]);
    } else {
      const textes = {
        flotte: this.equipage ? 'Amerrissage ! Ballons de redressement gonflés, balise allumée.' : 'Amerrissage. Capsule vide : personne à hélitreuiller.',
        helico: 'L’hélicoptère de récupération arrive.',
        treuil: 'Stationnaire au-dessus de la capsule : le treuil descend.',
        montee: `Hélitreuillage : ${this.nom} remonte à bord.`,
        depart: `${this.nom} est à bord. Direction la base${this.echantillons ? ' ; un navire récupérera la capsule et ses échantillons' : ''}.`,
        bateau: 'Le navire de récupération arrive.',
        grue: 'La grue se place au-dessus de la capsule.',
        hisse: 'La capsule est hissée à bord.',
        fin: `Capsule à bord${this.echantillons ? `, avec ${this.echantillons} échantillon${this.echantillons > 1 ? 's' : ''}` : ''}.`,
      };
      lignes.push([textes[this.phase] || '', '#ffffff', true]);
    }
    lignes.push([`T+ ${fmtDuree(this.t)} · temps accéléré ×${fmt(this.facteur())}`, '#8fa3b8']);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const compact = W < 700, x0 = 14, w = compact ? W - 28 : Math.min(460, W * 0.42), taille = compact ? 12 : 13, y = 14;
    const ecrire = (dessiner) => {
      let yy = y + 8;
      for (const [texte, couleur, gras] of lignes) {
        ctx.font = `${gras ? '600 ' : ''}${taille}px system-ui, sans-serif`;
        ctx.fillStyle = couleur;
        yy = ecrireLignes(ctx, texte, x0 + 10, yy, w - 20, taille + 7, dessiner);
      }
      return yy;
    };
    const hauteur = ecrire(false) - y + 6;
    ctx.fillStyle = 'rgba(8,14,28,0.72)';
    ctx.beginPath(); ctx.roundRect(x0, y, w, hauteur, 8); ctx.fill();
    ecrire(true);
    ctx.restore();
  }
}
