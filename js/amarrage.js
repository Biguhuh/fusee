// Vue orbite après une remontée réussie : rendez-vous et amarrage, vus du pôle Nord de l'astre.
// Tout est calculé pour de vrai : périodes orbitales (μ de l'astre et altitudes), rotation de l'astre
// (sa vraie période), attente de la fenêtre, transfert de Hohmann, approche finale. Seul le temps est
// accéléré (le facteur est affiché) ; on peut passer avec Entrée, Espace ou un toucher.
// Le même mécanisme sert pour tous les astres.

class Amarrage {
  // astre ; altDepart (m) : orbite atteinte par la remontée ; cible : { nom, alt (m), vaisseau (bool) } ou null.
  constructor(astre, altDepart, cible, t0, nomEngin = 'Atterrisseur') {
    this.a = astre;
    this.nomEngin = nomEngin;
    this.mu = astre.gm * 1e9;                         // m³/s²
    this.R = astre.rayonKm * 1000;
    this.t0 = t0 || 0;                                // date du jeu au début (pour la rotation et l'éclairage)
    this.r1 = this.R + Math.max(1000, altDepart);
    this.cible = cible;
    this.r2 = cible ? this.R + cible.alt : this.r1;
    // Orbites presque confondues : la remontée s'insère un peu plus bas, comme en vrai, pour rattraper la cible.
    if (cible && Math.abs(this.r2 - this.r1) < 2000) this.r1 = Math.max(this.R + 1000, this.r2 - 5000);
    this.n1 = Math.sqrt(this.mu / this.r1 ** 3);
    this.n2 = Math.sqrt(this.mu / this.r2 ** 3);
    this.T1 = (2 * Math.PI) / this.n1;
    this.T2 = (2 * Math.PI) / this.n2;
    this.t = 0;                                       // temps simulé depuis la mise en orbite (s)
    this.tReel = 0;
    this.phase = 'attente';
    this.fini = false;
    // Départ côté jour.
    const versSoleil = this.versSoleil(this.t0);
    this.th0 = Math.atan2(versSoleil[1], versSoleil[0]) - 0.4;
    if (cible) {
      const aT = (this.r1 + this.r2) / 2;
      this.tTransfert = Math.PI * Math.sqrt(aT ** 3 / this.mu);
      this.eT = Math.abs(this.r2 - this.r1) / (this.r1 + this.r2);
      this.aT = aT;
      // Avance que doit avoir la cible au moment de la poussée pour être au rendez-vous un demi-tour plus loin.
      this.avance = Math.PI - this.n2 * this.tTransfert;
      // La cible est un peu au-delà de cette avance : on attend que l'écart se referme.
      const sens = Math.sign(this.n1 - this.n2) || 1;
      this.ecart0 = this.avance + sens * (15 * Math.PI / 180);
      this.tAttente = (this.ecart0 - this.avance) / (this.n1 - this.n2);
      // Pas de vaisseau à rejoindre (simple orbite de travail) : pas de fenêtre à attendre.
      if (!cible.vaisseau) { this.ecart0 = this.avance; this.tAttente = 0; this.phase = 'transfert'; }
      const v1 = Math.sqrt(this.mu / this.r1), v2 = Math.sqrt(this.mu / this.r2);
      this.dv1 = Math.abs(v1 * (Math.sqrt((2 * this.r2) / (this.r1 + this.r2)) - 1));
      this.dv2 = Math.abs(v2 * (1 - Math.sqrt((2 * this.r1) / (this.r1 + this.r2))));
      this.tApproche = cible.vaisseau ? 20 * 60 : 1;  // approche finale et amarrage : 20 min
    } else {
      this.tAttente = this.T1;                        // pas de cible : un tour d'orbite
      this.ecart0 = 0;
    }
    // Durée à l'écran de chaque phase (s réelles) : le facteur de temps s'en déduit.
    this.duree = { attente: 5, transfert: 5, approche: 3, amarre: 2.5 };
    this.etoiles = Array.from({ length: 160 }, (_, i) => [hash(i * 3.1), hash(i * 7.7), 0.3 + 0.7 * hash(i * 1.3)]);
  }

  versSoleil(t) {
    const pa = etatAbsolu(this.a.id, t).r;
    return V.unit(V.mul(pa, -1));
  }
  facteur() {
    const d = { attente: this.tAttente, transfert: this.tTransfert, approche: this.tApproche, amarre: 60 }[this.phase] || 1;
    return Math.max(1, d / this.duree[this.phase]);
  }
  passer() {
    if (this.phase === 'amarre' || !this.cible) { this.fini = true; return; }
    this.t = this.tAttente + this.tTransfert + this.tApproche;
    this.phase = 'amarre';
    this.tPhase = 0;
  }

  step(dt) {
    if (this.fini || !(dt > 0)) return;
    this.tReel += dt;
    if (this.phase === 'amarre') {
      this.tPhase = (this.tPhase || 0) + dt;
      if (this.tPhase > this.duree.amarre) this.fini = true;
      return;
    }
    this.t += dt * this.facteur();
    if (!this.cible) { if (this.t >= this.tAttente) { this.t = this.tAttente; this.fini = true; } return; }
    const t1 = this.tAttente, t2 = t1 + this.tTransfert, t3 = t2 + this.tApproche;
    if (this.t >= t3) { this.t = t3; this.phase = 'amarre'; this.tPhase = 0; }
    else if (this.t >= t2) this.phase = 'approche';
    else if (this.t >= t1) this.phase = 'transfert';
  }

  // Positions (angle, rayon en m) de l'engin qui remonte et de la cible au temps simulé t.
  positions(t) {
    const cib = this.cible ? { th: this.th0 + this.ecart0 + this.n2 * t, r: this.r2 } : null;
    if (!this.cible || t <= this.tAttente) return { eng: { th: this.th0 + this.n1 * t, r: this.r1 }, cib };
    const thB = this.th0 + this.n1 * this.tAttente;   // angle de la poussée
    const tt = t - this.tAttente;
    if (tt < this.tTransfert) {
      // Demi-ellipse de Hohmann : équation de Kepler résolue par Newton.
      const nT = Math.PI / this.tTransfert, e = this.eT;
      const monte = this.r2 > this.r1;
      const M = nT * tt + (monte ? 0 : Math.PI);
      let E = M;
      for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
      const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
      return { eng: { th: thB + nu - (monte ? 0 : Math.PI), r: this.aT * (1 - e * Math.cos(E)) }, cib };
    }
    // Approche finale : on se range juste derrière la cible et l'écart se referme.
    const reste = Math.max(0, 1 - (tt - this.tTransfert) / this.tApproche);
    return { eng: { th: cib.th - (reste * 3000) / this.r2, r: this.r2 }, cib, distance: reste * 3000 };
  }

  dessiner(ctx, W, H) {
    ctx.fillStyle = '#03050c';
    ctx.fillRect(0, 0, W, H);
    for (const [x, y, b] of this.etoiles) { ctx.fillStyle = `rgba(255,255,255,${b * 0.8})`; ctx.fillRect(x * W, y * H, 1.3, 1.3); }
    const compact = W < 700;
    const cx = compact ? W / 2 : W * 0.6, cy = compact ? H * 0.58 : H / 2;
    const Rpx = Math.min(W * (compact ? 0.32 : 0.26), H * 0.3);
    const tAbs = this.t0 + this.t;
    // Rayon à l'écran : vrai rapport pour l'astre, écart minimal pour distinguer les orbites basses.
    const rMax = Math.max(this.r1, this.r2);
    const rMin = Math.min(this.r1, this.r2);
    const pxMin = Rpx + Math.max(10, ((rMin - this.R) / this.R) * Rpx);
    const pxMax = Math.max(Rpx + Math.max(10, ((rMax - this.R) / this.R) * Rpx), pxMin + (this.cible && rMax > rMin ? 12 : 0));
    const px = (r) => (rMax === rMin ? pxMin : pxMin + ((r - rMin) / (rMax - rMin)) * (pxMax - pxMin));
    const ecran = (th, r) => [cx + px(r) * Math.cos(th), cy - px(r) * Math.sin(th)];

    // L'astre, vu du pôle Nord, qui tourne à sa vraie vitesse.
    const a = this.a, rot = rotationDe(a);
    let lon0;
    if (!rot.synchrone) lon0 = longitudeVue(a, tAbs);
    else if (a.parent) {
      const pa = etatAbsolu(a.id, tAbs).r, pp = etatAbsolu(a.parent, tAbs).r;
      lon0 = (Math.atan2(pp[0] - pa[0], -(pp[1] - pa[1])) * 180) / Math.PI;
    } else lon0 = 0;
    const s = this.versSoleil(tAbs);
    dessinerGlobe(ctx, a, cx, cy, Rpx, { vue: 'pole', lon0, lumiere: [s[0], -s[1], 0.45] });
    if (a.atm && a.atm.p0 > 0.001) {
      ctx.strokeStyle = a.couleurs.ciel; ctx.globalAlpha = 0.35; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, Rpx + 2, 0, 2 * Math.PI); ctx.stroke(); ctx.globalAlpha = 1;
    }

    // Orbites.
    ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255,214,102,0.55)';
    ctx.beginPath(); ctx.arc(cx, cy, px(this.r1), 0, 2 * Math.PI); ctx.stroke();
    if (this.cible) {
      ctx.strokeStyle = 'rgba(120,200,255,0.55)';
      ctx.beginPath(); ctx.arc(cx, cy, px(this.r2), 0, 2 * Math.PI); ctx.stroke();
    }
    ctx.setLineDash([]);
    const p = this.positions(this.t);
    // Trajet de transfert déjà parcouru.
    if (this.cible && this.t > this.tAttente) {
      ctx.strokeStyle = 'rgba(255,214,102,0.9)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      const fin = Math.min(this.t, this.tAttente + this.tTransfert);
      for (let k = 0; k <= 60; k++) {
        const q = this.positions(this.tAttente + ((fin - this.tAttente) * k) / 60).eng;
        const [x, y] = ecran(q.th, q.r);
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    // Cible et engin.
    const amarre = this.phase === 'amarre';
    if (p.cib && this.cible.vaisseau) {
      const [x, y] = ecran(p.cib.th, p.cib.r);
      ctx.fillStyle = '#7cc8ff';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fill();
      ctx.fillRect(x - 11, y - 1.5, 22, 3);       // panneaux solaires
      texteSurFond(ctx, this.cible.nom, x, y - 12, { police: '12px system-ui, sans-serif', couleur: '#bfe0ff' });
    }
    if (!amarre) {
      const [x, y] = ecran(p.eng.th, p.eng.r);
      ctx.fillStyle = '#ffd666';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 2 * Math.PI); ctx.fill();
      if (!p.cib || !this.cible.vaisseau || Math.hypot(...[x, y].map((v, i) => v - ecran(p.cib.th, p.cib.r)[i])) > 40) {
        texteSurFond(ctx, this.nomEngin, x, y + 22, { police: '12px system-ui, sans-serif', couleur: '#ffe7a3' });
      }
    }

    // Panneau d'informations.
    const lignes = [];
    const fmtA = (r) => fmtAlt(r - this.R);
    lignes.push([`Orbite de ${a.nom}`, '#ffffff', true]);
    lignes.push([`Votre orbite : ${fmtA(this.r1)}, un tour en ${fmtDuree(this.T1)}`, '#ffe7a3']);
    if (this.cible) lignes.push([`${this.cible.nom} : ${fmtA(this.r2)}, un tour en ${fmtDuree(this.T2)}`, '#bfe0ff']);
    const hRot = Math.abs(rot.heures);
    lignes.push([`Rotation de ${a.nom} : un tour en ${fmtDuree(hRot * 3600)}${rot.synchrone ? ' (synchrone)' : ''}${rot.estimee ? ' (estimé)' : ''}`, '#cfd8e3']);
    const tours = this.t / this.T1;
    const deg = ((this.t / 3600 / hRot) * 360);
    lignes.push([`T+ ${fmtDuree(this.t)} — ${fmt(tours, 1)} tour(s) d’orbite ; ${a.nom} a tourné de ${fmt(deg, deg < 10 ? 1 : 0)}°`, '#cfd8e3']);
    if (!amarre) lignes.push([`Temps accéléré ×${fmt(this.facteur())}`, '#8fa3b8']);
    let etape;
    if (!this.cible) etape = this.fini ? 'Orbite atteinte.' : 'En orbite : un tour avant de continuer.';
    else if (this.phase === 'attente') {
      const ecart = ((p.cib.th - p.eng.th) * 180) / Math.PI;
      etape = `Attente de la fenêtre : la cible est ${fmt(ecart, 1)}° devant, il faut ${fmt((this.avance * 180) / Math.PI, 1)}° (dans ${fmtDuree(this.tAttente - this.t)}).`;
    } else if (this.phase === 'transfert') etape = `Transfert de Hohmann : poussée de ${fmt(this.dv1, 1)} m/s, puis ${fmt(this.dv2, 1)} m/s à l’arrivée (demi-orbite en ${fmtDuree(this.tTransfert)}).`;
    else if (this.phase === 'approche') etape = `Approche finale : ${fmt(p.distance, 0)} m de ${this.cible.nom}.`;
    else etape = this.cible.vaisseau ? `Amarré à ${this.cible.nom} !` : `En place sur ${this.cible.nom}.`;
    lignes.push([etape, amarre ? '#8be28b' : '#ffffff', true]);
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const x0 = 14, w = compact ? W - 28 : Math.min(430, W * 0.38);
    let y = 14;
    const taille = compact ? 12 : 13;
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
    ctx.fillStyle = 'rgba(8,14,28,0.78)';
    ctx.beginPath(); ctx.roundRect(x0, y, w, hauteur, 8); ctx.fill();
    ecrire(true);
    ctx.restore();
    if (!amarre && !this.fini) texteSurFond(ctx, 'Entrée, Espace ou toucher l’écran : passer', W / 2, H - 16, { police: '12px system-ui, sans-serif', couleur: '#8fa3b8' });
  }
}

// Écrit un texte sur plusieurs lignes si besoin ; renvoie la position de la ligne suivante.
function ecrireLignes(ctx, texte, x, y, largeur, interligne, dessiner = true) {
  const mots = texte.split(' ');
  let ligne = '';
  for (const m of mots) {
    const essai = ligne ? ligne + ' ' + m : m;
    if (ctx.measureText(essai).width > largeur && ligne) { if (dessiner) ctx.fillText(ligne, x, y); y += interligne; ligne = m; } else ligne = essai;
  }
  if (ligne) { if (dessiner) ctx.fillText(ligne, x, y); y += interligne; }
  return y;
}
