'use strict';
// ---------- Sorties extravéhiculaires depuis une station ----------
// Comme sur l'ISS : on sort à deux par le sas, on avance d'une main courante à l'autre, toujours attaché par une
// longe (25 m, comme la longe de sécurité de l'ISS) qu'on raccroche plus loin. Lâcher prise fait dériver ; le SAFER
// (petit sac à réaction de secours, ≈ 3 m/s en tout) permet de revenir. Depuis n'importe quelle station : l'astre
// défile dessous à la vitesse orbitale, l'étoile se lève et se couche selon la vraie orbite (ombre de l'astre), et
// le rayonnement est celui de l'endroit (faible en orbite terrestre basse, mortel dans les ceintures de Jupiter).
// Étape 1 : déplacements, longe, dérive, jour et nuit, rayonnement, oxygène, à deux. Les tâches viendront ensuite.

const EVA = {
  autonomie: 8 * 3600,     // s d'oxygène (combinaison EMU de l'ISS : ≈ 8 h 30)
  longe: 25,               // m
  vitesse: 0.4,            // m/s, d'une main courante à l'autre
  safer: 3,                // m/s de Δv en tout
  accSafer: 0.3,           // m/s²
  poussee: 0.4,            // m/s quand on se lâche
  prepa: 100 * 60,         // préparation dans le sas (respirer de l'oxygène pur, protocole ISLE ≈ 100 min)
  echelle: 18,             // px par mètre
};

// Dose en sortie, autour de l'astre (Sv/jour) : orbite terrestre basse protégée par le champ magnétique ; ailleurs,
// celle de l'espace autour de l'astre (ceintures de Jupiter comprises).
function doseSortieOrbite(a) {
  if (a.id === 'terre') return 0.001;   // ISS : ≈ 0,5 mSv/jour à bord, un peu plus en sortie
  return doseEspace(a).sv;
}

// Station de profil, en mètres (x vers la droite = sens de la marche sur l'orbite, y vers le haut = loin de l'astre).
function geometrieStation(st) {
  const n = st.niveau || 1, L = 30 + 18 * n, dessous = n >= 3;
  const boites = [
    { x0: -L / 2, x1: L / 2, y0: -1.2, y1: 1.2, type: 'poutre' },
    { x0: -12, x1: 12, y0: 1.2, y1: 5.4, type: 'module' },
    { x0: -16, x1: -12, y0: 1.2, y1: 5.0, type: 'sas' },
  ];
  if (dessous) boites.push({ x0: -8, x1: 8, y0: -5.4, y1: -1.2, type: 'module' });
  if (n >= 4) boites.push({ x0: 12, x1: 18, y0: 1.2, y1: 4.6, type: 'module' });
  // Contour parcouru dans le sens des aiguilles d'une montre, depuis l'écoutille du sas.
  const c = [[-16, 3.1], [-16, 5.0], [-12, 5.0], [-12, 5.4], [12, 5.4]];
  if (n >= 4) c.push([12, 4.6], [18, 4.6], [18, 1.2]); else c.push([12, 1.2]);
  c.push([L / 2, 1.2], [L / 2, -1.2]);
  if (dessous) c.push([8, -1.2], [8, -5.4], [-8, -5.4], [-8, -1.2]);
  c.push([-L / 2, -1.2], [-L / 2, 1.2], [-16, 1.2], [-16, 3.1]);
  const long = [0];
  for (let i = 1; i < c.length; i++) long.push(long[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const panneaux = [L / 2 - 4, -(L / 2 - 4), ...(n >= 2 ? [L / 2 - 13, -(L / 2 - 13)] : []), ...(n >= 4 ? [L / 2 - 22, -(L / 2 - 22)] : [])];
  return { n, L, boites, contour: c, long, perimetre: long[long.length - 1], panneaux, hPanneau: 10 + 2.5 * n };
}
// Point du contour à l'abscisse s : position et normale extérieure.
function pointContour(g, s) {
  const P = g.perimetre;
  s = ((s % P) + P) % P;
  let i = 1;
  while (i < g.long.length - 1 && g.long[i] < s) i++;
  const [x0, y0] = g.contour[i - 1], [x1, y1] = g.contour[i];
  const l = g.long[i] - g.long[i - 1] || 1, u = (s - g.long[i - 1]) / l;
  const dx = (x1 - x0) / l, dy = (y1 - y0) / l;
  return { x: x0 + (x1 - x0) * u, y: y0 + (y1 - y0) * u, nx: -dy, ny: dx };
}
function ecartContour(g, a, b) { const P = g.perimetre, d = (((b - a) % P) + P) % P; return d > P / 2 ? d - P : d; }
// Point du contour le plus proche de (x, y).
function plusProcheContour(g, x, y) {
  let best = { s: 0, d: Infinity };
  for (let s = 0; s < g.perimetre; s += 0.25) { const p = pointContour(g, s), d = Math.hypot(p.x - x, p.y - y); if (d < best.d) best = { s, d }; }
  return best;
}

class SortieStation {
  constructor(v, st, membres, mission = null) {
    this.v = v; this.st = st; this.a = ASTRES_PAR_ID[st.centre];
    this.g = geometrieStation(st);
    this.fini = false; this.warp = 1; this.messages = []; this.duree = 0; this.zoom = 1;
    this.dose = doseSortieOrbite(this.a);
    this.corps = membres.map((m, i) => ({
      m, eq: equipierDeMembre(m), s: i ? -3 : 0.5, ancre: i ? -3 : 0.5, libre: null, reserve: EVA.autonomie,
      physio: physioNeuve(), doseSv: 0, safer: EVA.safer, alerteDose: 0, mort: false, pas: 0, raccroche: 0, suit: true,
    }));
    this.actif = 0;
    this.etoiles = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.3 }));
    this.reliefs = Array.from({ length: 26 }, () => ({ a: Math.random() * Math.PI * 2, l: 0.02 + Math.random() * 0.06, k: Math.random() }));
    this.dire(`🧑‍🚀 Sortie ${de(this.st)} : ${this.corps.map((c) => c.eq.nom).join(' et ')}, ${this.dose > 0.05 ? '⚠ rayonnement intense ici' : 'longes accrochées'}. ← → : avancer le long des mains courantes · L : raccrocher la longe · Espace : se lâcher · E : se rattraper · J + flèches : SAFER · Tab : changer · Échap : rentrer au sas.`);
    if (this.dose > 0.05) this.dire(`⚠ Rayonnement : ${fmtDose(this.dose)} en combinaison. Dose mortelle (${DOSE_MORTELLE} Sv) en ${fmtDuree(tempsAvantDoseMortelle(this.dose))}. Faites vite.`);
    this.initMission(mission);   // tâches de réparation (eva-missions.js)
  }
  get c() { return this.corps[this.actif]; }
  autre() { return this.corps[1 - this.actif]; }
  dire(t) {
    if (/^(⚠|💀|😵|🆘|🕯)/u.test(t)) this.warp = 1;   // alerte grave : temps réel
    this.messages = this.messages.filter((m) => m.texte !== t).concat({ texte: t, fin: performance.now() + (this.warp >= 10 ? 12000 : 8000) }).slice(-3);
  }
  passer() { /* un clic ne termine pas la sortie (Échap : rentrer au sas) */ }

  // ---------- Orbite : jour, nuit, défilement ----------
  orbite(t) {
    const e = Orbiteur.etatStation(this.st), dt = t - this.v.t;
    const p = dt ? propager(e.r, e.v, dt, this.a.gm) : e;
    const rh = V.unit(p.r), vh = V.unit(p.v), S = V.unit(V.mul(etatAbsolu(this.a.id, t).r, -1));
    const R = this.a.rayonKm, r = V.norm(p.r), dip = Math.acos(Math.min(1, R / r));
    const hs = V.dot(S, rh) + Math.sin(dip);   // > 0 : l'étoile est au-dessus du bord de l'astre
    const bande = this.a.atm ? 0.03 : 0.004;
    const lum = Math.max(0, Math.min(1, (hs + bande) / (2 * bande)));
    return { phi: Math.atan2(V.dot(S, rh), V.dot(S, vh)), dip, lum, hs, sousSol: V.dot(S, rh), omega: V.norm(p.v) / r, alt: r - R };
  }
  // Prochain lever ou coucher (s), en suivant l'orbite.
  prochainChangement() {
    if (this.cacheChangement && Math.abs(this.v.t - this.cacheChangement.t) < 20) return this.cacheChangement.d;
    const jour = this.orbite(this.v.t).hs > 0, T = (2 * Math.PI) / this.orbite(this.v.t).omega;
    let d = null;
    for (let k = 1; k <= 240; k++) { const dt = (T * k) / 240; if ((this.orbite(this.v.t + dt).hs > 0) !== jour) { d = dt; break; } }
    this.cacheChangement = { t: this.v.t, d, jour, T };
    return d;
  }

  // ---------- Commandes ----------
  touche(code) {
    if (this.fondu) return;
    const c = this.c;
    if (this.toucheMission(code)) return;   // R : travailler ; E : rattraper le sac à outils
    if (code === 'Escape') return this.rentrer();
    if (code === 'Tab') { this.actif = 1 - this.actif; return this.dire(`🔁 Vous pilotez ${this.c.eq.nom}.`); }
    if (code === 'KeyG') { const o = this.autre(); o.suit = !o.suit; return this.dire(o.suit ? `👣 ${o.eq.nom} vous suit.` : `✋ ${o.eq.nom} attend ici.`); }
    if (code === 'KeyL') return this.raccrocher(c);
    if (code === 'KeyU') { if (c.ancre === null) return this.dire('Longe déjà décrochée.'); c.ancre = null; return this.dire(`⚠ ${c.eq.nom} a décroché sa longe : plus rien ne le retient. L pour la raccrocher.`); }
    if (code === 'Space') return this.lacher(c);
    if (code === 'KeyE') return this.rattraper(c);
    if (code === 'KeyZ') { this.zoom = this.zoom === 1 ? 0.35 : 1; return; }
    const pal = [1, 2, 5, 10, 50], i = pal.indexOf(this.warp);
    if (['Equal', 'NumpadAdd'].includes(code)) this.warp = pal[Math.min(pal.length - 1, i + 1)];
    if (['Minus', 'NumpadSubtract'].includes(code)) this.warp = pal[Math.max(0, i - 1)];
  }
  raccrocher(c) {
    if (c.libre) return this.dire('Rattrapez d’abord une main courante (E).');
    if (c.raccroche > 0) return;
    c.raccroche = 3;   // second mousqueton accroché ici, puis on décroche le premier
    this.dire(`🔗 ${c.eq.nom} raccroche sa longe ici.`);
  }
  lacher(c) {
    if (c.libre) return this.dire('Vous flottez déjà : E pour vous rattraper, J + flèches pour le SAFER.');
    const p = pointContour(this.g, c.s);
    c.libre = { x: p.x + p.nx * 0.9, y: p.y + p.ny * 0.9, vx: p.nx * EVA.poussee, vy: p.ny * EVA.poussee, rot: 0 };
    this.dire(c.ancre === null ? `⚠ ${c.eq.nom} se lâche sans longe ! Le SAFER (J + flèches) est la seule façon de revenir.` : `${c.eq.nom} se lâche : la longe le retiendra à ${EVA.longe} m. E pour se rattraper.`);
  }
  rattraper(c) {
    if (!c.libre) return;
    const pp = plusProcheContour(this.g, c.libre.x, c.libre.y);
    if (pp.d > 1.6) return this.dire(`Trop loin d’une main courante (${fmt(pp.d, 1)} m).`);
    c.s = pp.s; c.libre = null;
    this.dire(`🤚 ${c.eq.nom} se rattrape à une main courante.`);
  }
  rentrer() {
    const loin = this.corps.filter((c) => !c.mort && (c.libre || Math.abs(ecartContour(this.g, c.s, 0.5)) > 5));
    const contamines = this.corps.filter((c) => !c.mort && typeof c.ammoniac === 'number');
    if (contamines.length) return this.dire(`❄ Pas encore : ${contamines.map((c) => `${c.eq.nom} (encore ${fmtDuree(30 * 60 - c.ammoniac)} au soleil)`).join(', ')}. L’ammoniac doit s’évaporer avant d’entrer dans le sas.`);
    if (loin.length) return this.dire(`Retournez au sas d’abord : ${loin.map((c) => c.eq.nom).join(' et ')} ${loin.length > 1 ? 'en sont' : 'en est'} loin. (← → le long des mains courantes ; l’écoutille est à gauche du gros module.)`);
    this.terminer();
  }

  // ---------- Simulation ----------
  step(dtReel) {
    if (this.fini) return;
    if (this.fondu) return;
    const total = Math.min(dtReel, 0.1) * this.warp, n = Math.max(1, Math.ceil(total / 0.05));
    for (let i = 0; i < n && !this.fondu; i++) this.pas(total / n);
  }
  pas(dt) {
    this.v.t += dt; this.duree += dt;
    const cmd = commandes(), jet = touches.has('KeyJ');
    for (const [i, c] of this.corps.entries()) {
      if (c.mort) continue;
      const actif = i === this.actif, inconscient = !c.physio.conscient;
      let veut = 0;
      if (actif && !inconscient) veut = (cmd.droite ? 1 : 0) - (cmd.gauche ? 1 : 0);
      else if (!actif && c.suit && !inconscient && !c.libre) {
        // Derrière, dans son sens de marche ; à côté de la tâche s'il faut être deux.
        const meneur = this.c, tc = this.tacheCourante && this.tacheCourante();
        const aDeux = tc && tc.deux && Math.abs(ecartContour(this.g, meneur.s, tc.s)) < 3;
        const cible = meneur.libre ? null : aDeux ? tc.s - 1.5 * (meneur.sens || 1) : meneur.s - 3 * (meneur.sens || 1);
        if (cible !== null) { const e = ecartContour(this.g, c.s, cible); if (Math.abs(e) > 1) veut = Math.sign(e); }
        // L'autre raccroche sa longe tout seul quand elle se tend.
        if (c.ancre !== null && Math.abs(ecartContour(this.g, c.ancre, c.s)) > EVA.longe - 3 && c.raccroche <= 0) c.raccroche = 3;
      }
      if (c.raccroche > 0) { c.raccroche -= dt; veut = 0; if (c.raccroche <= 0) { c.ancre = c.s; if (actif) this.dire(`🔗 Longe raccrochée.`); } }
      // Le long des mains courantes, sans dépasser la longe.
      if (!c.libre && veut) {
        const ds = veut * EVA.vitesse * dt, ns = c.s + ds;
        if (c.ancre !== null && Math.abs(ecartContour(this.g, c.ancre, ns)) > EVA.longe) {
          if (actif && !this.alerteLonge) { this.alerteLonge = true; this.dire('🔗 Longe tendue (25 m) : L pour la raccrocher ici, puis continuez.'); }
        } else { c.s = ns; c.pas += Math.abs(ds); c.sens = veut; this.alerteLonge = false; }
      }
      // En dérive : SAFER, longe qui retient.
      if (c.libre) {
        const L = c.libre;
        if (actif && jet && c.safer > 0) {
          const ax = ((cmd.droite ? 1 : 0) - (cmd.gauche ? 1 : 0)) * EVA.accSafer, ay = ((cmd.saut ? 1 : 0) - (cmd.frein ? 1 : 0)) * EVA.accSafer;
          const dv = Math.hypot(ax, ay) * dt;
          if (dv > 0) { L.vx += ax * dt; L.vy += ay * dt; c.safer = Math.max(0, c.safer - dv); this.jetSafer = { ax, ay, t: 0.1 }; }
        }
        L.x += L.vx * dt; L.y += L.vy * dt; L.rot += 0.2 * dt;
        if (c.ancre !== null) {
          const a = pointContour(this.g, c.ancre), dx = L.x - a.x, dy = L.y - a.y, d = Math.hypot(dx, dy);
          if (d > EVA.longe) {   // la longe se tend : elle ramène doucement
            const ux = dx / d, uy = dy / d, vr = L.vx * ux + L.vy * uy;
            if (vr > 0) { L.vx -= 1.5 * vr * ux; L.vy -= 1.5 * vr * uy; }
            L.x = a.x + ux * EVA.longe; L.y = a.y + uy * EVA.longe;
          }
        }
        // On se rattrape tout seul si l'on frôle une main courante en allant doucement.
        const pp = plusProcheContour(this.g, L.x, L.y);
        if (pp.d < 0.6 && Math.hypot(L.vx, L.vy) < 0.25) { c.s = pp.s; c.libre = null; if (actif) this.dire(`🤚 ${c.eq.nom} se rattrape à une main courante.`); }
        // Perdu : loin, sans longe, sans SAFER, en s'éloignant.
        if (c.ancre === null && Math.hypot(L.x, L.y) > 120 && c.safer <= 0.01 && L.x * L.vx + L.y * L.vy > 0) return this.mourir(c, 'dérive dans l’espace, sans longe ni SAFER');
      }
      // Oxygène, cœur, rayonnement.
      const effort = c.libre ? 0.2 : veut ? 0.6 : 0.25;
      c.reserve = Math.max(0, c.reserve - dt * (1 + 0.3 * effort));
      const avant = c.physio.conscient;
      majPhysio(c.physio, dt, { o2: c.reserve > 0, decomp: false, effort });
      if (avant && !c.physio.conscient) this.dire(`😵 ${majuscule(c.eq.nom)} a perdu connaissance (sang à ${fmt(c.physio.spo2)} %).`);
      if (c.physio.mort) return this.mourir(c, 'plus d’oxygène');
      if (c.reserve < 30 * 60 && !c.alerteO2) { c.alerteO2 = true; this.dire(`⚠ ${majuscule(c.eq.nom)} : moins de 30 min d’oxygène. Rentrez au sas.`); }
      c.doseSv += (this.dose * dt) / 86400;
      const pc = (100 * c.doseSv) / DOSE_MORTELLE;
      for (const seuil of [25, 50, 80]) if (pc >= seuil && c.alerteDose < seuil) { c.alerteDose = seuil; this.dire(`⚠ ${majuscule(c.eq.nom)} : ${fmt(pc)} % de la dose mortelle (${fmtDoseTotale(c.doseSv)}). ${seuil >= 50 ? 'Rentrez immédiatement !' : 'Ne traînez pas.'}`); }
      if (pc >= 100) return this.mourir(c, 'dose mortelle de rayonnement');
    }
    // La personne pilotée perd connaissance : on prend la main sur l'autre.
    const o = this.autre();
    if (!this.c.physio.conscient && o && !o.mort && o.physio.conscient) { this.actif = 1 - this.actif; this.dire(`🆘 Vous pilotez ${this.c.eq.nom} : ramenez ${o.eq.nom} au sas, vite.`); }
    // Lever et coucher de l'étoile.
    const jour = this.orbite(this.v.t).hs > 0;
    if (this.jour !== undefined && jour !== this.jour) this.dire(jour ? `🌅 Lever ${de(etoileRacine())} : la lumière revient d’un coup, et la chaleur avec.` : `🌇 Coucher ${de(etoileRacine())} : nuit noire, lampes des casques allumées. Prochain lever dans ≈ ${fmtDuree(this.prochainChangement() || 0)}.`);
    this.jour = jour;
    this.majMission(dt);
  }
  mourir(c, cause) {
    if (this.fondu) return;
    c.mort = true; this.warp = 1;
    const pres = this.corps.some((x) => x !== c && !x.mort);
    this.fondu = { debut: performance.now(), duree: 3000, texte: `🕯 ${majuscule(c.eq.nom)} est mort${c.eq.acc} : ${cause}.`, apres: () => {
      noterPerte(this.v, c.eq.nom, this.a.id, cause, `en sortie autour ${de(this.st)}`);
      if (c.m.principal) this.v.equipagePerdu = true; else c.m.etat = 'perdu';
      verifierEquipageEntierPerdu(this.v);
      this.terminer(pres ? `${this.corps.filter((x) => !x.mort).map((x) => majuscule(x.eq.nom)).join(' et ')} est rentré${this.corps.find((x) => !x.mort).eq.acc} au sas.` : '');
    } };
  }
  terminer(fin = '') {
    if (this.fini) return;
    this.fini = true;
    const v = this.v, vivants = this.corps.filter((c) => !c.mort);
    for (const c of this.corps) if (c.doseSv) regDose(c.m, c.doseSv);
    for (const c of vivants) regDureeSortie(c.m, this.duree, this.a.id);
    const m = this.mission;
    if (m) fin = `${m.finie ? `✅ ${m.p.nom} : réparé.` : `${m.p.icone} ${m.p.nom} : pas fini (${m.i}/${m.taches.length} tâches), à reprendre.`}${this.sac && this.sac.perdu ? ' Un sac à outils perdu.' : ''} ${fin}`.trim();
    Orbiteur.log(`🧑‍🚀 Sortie ${de(this.st)} : ${fmtDuree(this.duree)} dehors${vivants.length ? `, ${vivants.map((c) => c.eq.nom).join(' et ')}` : ''}. Dose : ${this.corps.map((c) => `${c.eq.nom} ${fmtDoseTotale(c.doseSv)}`).join(', ')}.${fin ? ' ' + fin : ''}`);
  }

  // ---------- Rendu ----------
  dessiner(ctx, W, H) {
    const o = this.orbite(this.v.t), k = EVA.echelle * this.zoom * Math.min(1.4, Math.max(0.7, W / 1100));
    const lum = o.lum, nuit = 1 - lum;
    // Ciel
    ctx.fillStyle = '#000005'; ctx.fillRect(0, 0, W, H);
    for (const e of this.etoiles) { ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.6 * nuit})`; ctx.fillRect(e.x * W, e.y * H * 0.7, e.r, e.r); }
    // L'astre en dessous : son bord est à « dip » sous l'horizontale, vu de la station.
    const D = H * 2.4, cyA = H * 0.45 + D, R = D * Math.cos(o.dip);
    const sx = Math.cos(o.phi), sy = -Math.sin(o.phi), dist = Math.min(W, H) * 0.42;
    // L'étoile (derrière l'astre quand elle est couchée)
    if (o.hs > -0.05) {
      const ex = W / 2 + sx * dist, ey = H * 0.45 + sy * dist;
      const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 90);
      g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.12, 'rgba(255,245,200,0.9)'); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 90, 0, Math.PI * 2); ctx.fill();
    }
    // Disque de l'astre, éclairé selon que le sol sous la station est de jour ou de nuit.
    const coul = this.a.couleurs || { disque: '#888888', ciel: '#000000' };
    const eclaire = Math.max(0.08, Math.min(1, 0.5 + 1.6 * o.sousSol));
    const gA = ctx.createLinearGradient(W / 2 - sx * R * 0.3, 0, W / 2 + sx * R * 0.3, 0);
    gA.addColorStop(0, assombrir(coul.disque, eclaire * 0.6)); gA.addColorStop(1, assombrir(coul.disque, eclaire));
    ctx.fillStyle = gA; ctx.beginPath(); ctx.arc(W / 2, cyA, R, 0, Math.PI * 2); ctx.fill();
    // Ce qui défile dessous (nuages, cratères), à la vitesse orbitale ; lumières des villes la nuit sur Terre.
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cyA, R, 0, Math.PI * 2); ctx.clip();
    const tour = this.v.t * o.omega;
    for (const f of this.reliefs) {
      const ang = -Math.PI / 2 + ((((f.a - tour) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 0.18;
      const fx = W / 2 + Math.cos(ang) * R * 0.995, fy = cyA + Math.sin(ang) * R * 0.995;
      if (fy > H + 50) continue;
      const larg = f.l * R * 0.35, prof = Math.max(2, (fy - (cyA - R)) * 0.25 + 3);
      if (this.a.id === 'terre' && eclaire < 0.3) { ctx.fillStyle = `rgba(255,210,120,${0.5 * f.k})`; ctx.fillRect(fx, fy + prof * 0.5, 2, 2); }
      else { ctx.fillStyle = this.a.atm ? `rgba(255,255,255,${0.35 * eclaire})` : `rgba(0,0,0,${0.18 * eclaire})`; ctx.beginPath(); ctx.ellipse(fx, fy + prof, larg, prof * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    // Fine couche d'atmosphère au bord ; rouge orangé au lever et au coucher.
    if (this.a.atm) {
      const rouge = Math.max(0, 1 - Math.abs(o.hs) / 0.08);
      ctx.strokeStyle = rouge > 0.05 ? `rgba(255,${Math.round(140 + 60 * (1 - rouge))},60,${0.5 + 0.4 * rouge})` : `rgba(120,180,255,${0.25 + 0.45 * eclaire})`;
      ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W / 2, cyA, R + 3, Math.PI, Math.PI * 2); ctx.stroke();
    }
    // Station et spationautes (caméra sur celui qu'on pilote)
    const c = this.c, pc = c.libre || pointContour(this.g, c.s);
    const cx = W / 2 - pc.x * k, cy = H * 0.45 + pc.y * k;
    const E = (x, y) => [cx + x * k, cy - y * k];
    this.dessinerStation(ctx, E, k, lum);
    this.dessinerMission(ctx, E, k);
    for (const [i, q] of this.corps.entries()) if (!q.mort) this.dessinerCorps(ctx, E, k, q, i === this.actif, lum);
    // Nuit : un voile sombre (les lampes des casques restent)
    if (nuit > 0) {
      ctx.fillStyle = `rgba(0,0,8,${0.55 * nuit})`; ctx.fillRect(0, 0, W, H * 0.9);
      for (const q of this.corps) {
        if (q.mort) continue;
        const p = q.libre || pointContour(this.g, q.s), [qx, qy] = E(p.x + (q.libre ? 0 : p.nx * 1.5), p.y + (q.libre ? 0 : p.ny * 1.5));
        const g = ctx.createRadialGradient(qx, qy, 0, qx, qy, 6 * k);
        g.addColorStop(0, `rgba(255,250,220,${0.35 * nuit})`); g.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(qx, qy, 6 * k, 0, Math.PI * 2); ctx.fill();
      }
    }
    this.dessinerDanger(ctx, W, H);
    this.dessinerHud(ctx, W, H, o);
    if (this.fondu) {
      const u = Math.min(1, (performance.now() - this.fondu.debut) / this.fondu.duree);
      ctx.fillStyle = `rgba(0,0,0,${0.92 * u})`; ctx.fillRect(0, 0, W, H);
      if (u > 0.35) texteSurFond(ctx, this.fondu.texte, W / 2, H / 2, { police: '600 18px system-ui, sans-serif', couleur: '#eceff1' });
      if (u >= 1 && !this.fondu.fait) { this.fondu.fait = true; this.fondu.apres(); }
    }
  }
  dessinerStation(ctx, E, k, lum) {
    const g = this.g, l = 0.35 + 0.65 * lum;
    const col = (hex) => assombrir(hex, l);
    // Panneaux solaires (de profil : grandes ailes dorées au-dessus et au-dessous de la poutre)
    for (const px of g.panneaux) {
      for (const sg of [1, -1]) {
        const [x0, y0] = E(px - 1.2, sg > 0 ? g.hPanneau + 1.2 : -1.2), [x1, y1] = E(px + 1.2, sg > 0 ? 1.2 : -g.hPanneau - 1.2);
        ctx.fillStyle = col('#c9a227'); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.fillStyle = col('#1e3a8a'); ctx.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4);
      }
    }
    for (const b of g.boites) {
      const [x0, y0] = E(b.x0, b.y1), [x1, y1] = E(b.x1, b.y0);
      if (b.type === 'poutre') {
        ctx.fillStyle = col('#9e9e9e'); ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        ctx.strokeStyle = col('#616161'); ctx.lineWidth = Math.max(1, k * 0.08);
        for (let x = b.x0; x < b.x1; x += 2.4) { const [a, bb] = E(x, b.y1), [c2, d] = E(x + 2.4, b.y0); ctx.beginPath(); ctx.moveTo(a, bb); ctx.lineTo(c2, d); ctx.moveTo(a, d); ctx.lineTo(c2, bb); ctx.stroke(); }
      } else {
        const gr = ctx.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0, col('#ffffff')); gr.addColorStop(0.6, col('#e0e0e0')); gr.addColorStop(1, col('#9e9e9e'));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, Math.min(8, k * 0.6)); ctx.fill();
        ctx.strokeStyle = col('#bdbdbd'); ctx.lineWidth = 1;
        for (let x = b.x0 + 1.5; x < b.x1; x += 1.5) { const [a, bb] = E(x, b.y1), [, d] = E(x, b.y0); ctx.beginPath(); ctx.moveTo(a, bb); ctx.lineTo(a, d); ctx.stroke(); }
        if (b.type === 'sas') {   // écoutille, sur la face gauche
          const [hx, hy] = E(-16, 3.1);
          ctx.fillStyle = col('#455a64'); ctx.beginPath(); ctx.ellipse(hx + 2, hy, k * 0.25, k * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          texteSurFond(ctx, 'Sas', hx + 2 * k, hy - 2.6 * k, { police: '11px system-ui', couleur: '#ffd54f' });
        }
      }
    }
    // Mains courantes : traits jaunes le long du contour
    ctx.strokeStyle = `rgba(255,213,79,${0.5 + 0.4 * l})`; ctx.lineWidth = Math.max(1.5, k * 0.08); ctx.setLineDash([k * 0.6, k * 0.4]);
    ctx.beginPath();
    g.contour.forEach(([x, y], i) => { const p = pointContour(g, g.long[i]); const [a, b] = E(x + p.nx * 0.25, y + p.ny * 0.25); if (i) ctx.lineTo(a, b); else ctx.moveTo(a, b); });
    ctx.stroke(); ctx.setLineDash([]);
  }
  dessinerCorps(ctx, E, k, q, actif, lum) {
    const g = this.g;
    // Longe : de son point d'accroche au spationaute, un peu détendue.
    if (q.ancre !== null) {
      const a = pointContour(g, q.ancre), p = q.libre || pointContour(g, q.s);
      const [ax, ay] = E(a.x, a.y), [bx, by] = E(p.x + (q.libre ? 0 : p.nx * 0.9), p.y + (q.libre ? 0 : p.ny * 0.9));
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + bx) / 2 + 8, (ay + by) / 2 + 10, bx, by); ctx.stroke();
      ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    if (q.libre) { const [x, y] = E(q.libre.x, q.libre.y); ctx.translate(x, y + 0.9 * k); ctx.rotate(q.libre.rot); }
    else { const p = pointContour(g, q.s), [x, y] = E(p.x, p.y); ctx.translate(x, y); ctx.rotate(Math.atan2(p.nx, p.ny)); }
    dessinerSpationaute(ctx, 0, 0, k, { dir: 1, pas: q.pas * 2, auSol: !q.libre, phares: lum < 0.5 }, false, q.eq.profil);
    // SAFER en action
    if (actif && q.libre && this.jetSafer && this.jetSafer.t > 0) { this.jetSafer.t -= 0.016; ctx.fillStyle = 'rgba(200,230,255,0.8)'; ctx.beginPath(); ctx.arc(-this.jetSafer.ax * k * 2, 1.2 * k + this.jetSafer.ay * k * 2, k * 0.3, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    const p = q.libre || pointContour(g, q.s), [lx, ly] = E(p.x + (q.libre ? 0 : p.nx * 2.3), p.y + (q.libre ? 2.2 : p.ny * 2.3));
    texteSurFond(ctx, q.eq.nom, lx, ly, { police: '11px system-ui', couleur: actif ? '#ffffff' : '#b3e5fc' });
  }
  dessinerDanger(ctx, W, H) {
    const pire = this.corps.filter((q) => !q.mort && (q.physio.spo2 < SPO2_ALERTE || (100 * q.doseSv) / DOSE_MORTELLE > 80)).sort((a, b) => a.physio.spo2 - b.physio.spo2)[0];
    if (!pire) return;
    const k = 0.1 + 0.08 * Math.pow(Math.max(0, Math.sin((performance.now() / 1000) * (Math.max(30, pire.physio.fc) / 60) * Math.PI * 2)), 4);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, `rgba(220,40,40,${k * 0.6})`); g.addColorStop(1, `rgba(220,40,40,${k * 3})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  dessinerHud(ctx, W, H, o) {
    const lignes = [];
    const ch = this.prochainChangement(), etoile = etoileRacine();
    lignes.push(['Orbite', `${fmtAlt(o.alt * 1000)} · tour en ${fmtDuree(this.cacheChangement ? this.cacheChangement.T : 0)}`, '#fff']);
    lignes.push([o.hs > 0 ? '☀ Jour' : '🌑 Nuit', ch ? `${o.hs > 0 ? 'coucher' : 'lever'} ${de(etoile)} dans ${fmtDuree(ch)}` : (o.hs > 0 ? 'toujours au soleil' : 'toujours à l’ombre'), o.hs > 0 ? '#ffd54f' : '#90a4ae']);
    lignes.push(['Rayonnement', fmtDose(this.dose), couleurRisque(this.dose / 0.5)]);
    lignes.push(['Dehors depuis', fmtDuree(this.duree), '#fff']);
    lignes.push(...this.lignesMission());
    if (this.sac && !this.sac.attache) lignes.push(['🎒 Sac', this.sac.perdu ? 'perdu' : 'il s’éloigne !', '#ef5350']);
    for (const [i, q] of this.corps.entries()) {
      if (q.mort) continue;
      const pc = (100 * q.doseSv) / DOSE_MORTELLE;
      lignes.push([`${i === this.actif ? '▶ ' : ''}${q.eq.nom}`, `O₂ ${fmtDuree(q.reserve)} · ❤ ${fmt(q.physio.fc)} · SpO₂ ${fmt(q.physio.spo2)} %${q.physio.conscient ? '' : ' · inconscient'}`, couleurSpo2(q.physio.spo2)]);
      lignes.push(['', `dose ${fmtDoseTotale(q.doseSv)} (${fmt(pc, pc < 10 ? 1 : 0)} %) · longe ${q.ancre === null ? 'DÉCROCHÉE' : q.raccroche > 0 ? 'on raccroche…' : `${fmt(Math.abs(ecartContour(this.g, q.ancre, q.s)))} / ${EVA.longe} m`}${q.libre ? ` · SAFER ${fmt(q.safer, 1)} m/s` : ''}`, q.ancre === null ? '#ef5350' : couleurRisque(pc / 100)]);
    }
    const larg = Math.min(430, W - 20), h = 30 + lignes.length * 17;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(10, 10, larg, h);
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(`🧑‍🚀 Sortie extravéhiculaire · ${this.st.nom}`, 18, 28);
    let y = 46;
    for (const [kk, val, coul] of lignes) {
      ctx.font = '11px system-ui'; ctx.fillStyle = '#b0bec5'; ctx.fillText(kk, 18, y);
      ctx.font = 'bold 12px ui-monospace, Consolas, monospace'; ctx.fillStyle = coul; ctx.fillText(val, 120, y);
      y += 17;
    }
    texteSurFond(ctx, `Temps ×${this.warp} (+/−)`, W - 14, 28, { police: 'bold 13px system-ui', couleur: this.warp > 1 ? '#ffca28' : '#fff', align: 'right' });
    const t = performance.now();
    this.messages = this.messages.filter((m) => m.fin > t);
    afficherMessages(ctx, this.messages.map((m) => m.texte), W, H - 60);
    texteSurFond(ctx, '← → : mains courantes · R : travailler · L : raccrocher la longe · Espace : se lâcher · E : se rattraper · J + flèches : SAFER · Tab : changer · G : suis-moi · Z : zoom · Échap : rentrer au sas', W / 2, H - 12, { police: '11px system-ui' });
  }
}

// Personnes qui peuvent sortir : à bord de l'orbiteur amarré ou vivant à la station, sans blessure grave.
function candidatsSortie(v, st) {
  return (v.equipe || []).filter((m) => (lieuMembre(m) === 'orbiteur' || lieuMembre(m) === 'st:' + st.id) && !(m.principal && v.equipagePerdu) && !(m.blessure && m.blessure.gravite === 'grave'));
}
// Lancement (choix de la mission) : lancerSortieStation, dans eva-missions.js.
