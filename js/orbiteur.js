'use strict';
// Écran de l'orbiteur : carte du système solaire vue de dessus, pilotage, sondes, stations.

const PALIERS_NAV = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8];
const DATE_DEBUT = (2461336.5 - J2000_JD) * JOUR; // 23 octobre 2026

const ORIENTATIONS = {
  prograde: 'Prograde', retrograde: 'Rétrograde', radialExt: 'Radial +', radialInt: 'Radial −',
  versCible: 'Vers la cible', freinCible: 'Freiner / cible',
};

// Ceinture d'astéroïdes : décor (les gros astéroïdes sont de vrais astres jouables).
const CEINTURE = Array.from({ length: 1400 }, (_, i) => {
  const a = (2.1 + 1.2 * Math.pow(hash2(i, 1), 0.8)) * UA_KM;
  return { a, e: 0.25 * hash2(i, 2), w: 2 * Math.PI * hash2(i, 3), M0: 2 * Math.PI * hash2(i, 4), n: Math.sqrt(GM_SOLEIL / (a * a * a)) };
});

const Orbiteur = {
  v: null,            // état du voyage (sauvegardé)
  etape: null,        // prochaine étape calculée (non sauvegardée)
  auto: false,        // planificateur en marche
  avance: false,      // assistant : avancer jusqu'à l'étape
  cam: { focus: 'orbiteur', echelle: 0.02, decal: [0, 0] },
  zones: [],
  survole: null,
  derniereMaj: 0,
  messages: [],
  contexte: null,     // fonctions fournies par main.js

  nouveauVoyage() {
    const terre = ASTRES_PAR_ID.terre;
    const r0 = terre.rayonKm + 400;
    const v0 = Math.sqrt(terre.gm / r0);
    const v = {
      t: DATE_DEBUT,
      orb: { centre: 'terre', r: [r0, 0], v: [0, v0], transfert: null },
      carburant: ORBITEUR.carburantMax,
      carburantAtt: null,
      sondes: ORBITEUR.sondes, kits: ORBITEUR.kits, atterrisseurs: ORBITEUR.atterrisseurs,
      sondesEnVol: [],
      stations: [{ id: 's0', nom: 'Station terrestre', centre: 'terre', r: [r0, 0], v: [0, v0], t0: DATE_DEBUT, base: true }],
      journal: [{ t: DATE_DEBUT, texte: 'Départ de la station terrestre, en orbite à 400 km.' }],
      mode: 'assistant', cible: null, manette: 0, orientation: 'prograde', warp: 1,
      visites: {},
    };
    return v;
  },

  charger(v) { this.v = v; this.etape = null; this.auto = false; this.avance = false; this.messages = []; },

  // ---------- Outils ----------
  absolu(vs) { const c = etatAbsolu(vs.centre, this.v.t); return V.add(c.r, vs.r); },
  etatStation(s) {
    const p = propager(s.r, s.v, this.v.t - s.t0, ASTRES_PAR_ID[s.centre].gm);
    return { centre: s.centre, r: p.r, v: p.v };
  },
  log(texte) {
    this.v.journal.push({ t: this.v.t, texte });
    if (this.v.journal.length > 200) this.v.journal.shift();
    this.messages.push({ texte, vie: 6 });
    if (this.messages.length > 6) this.messages.shift();
  },
  masse() { return ORBITEUR.masseSeche + this.v.carburant; },
  enPoussee() { return this.v.mode === 'libre' && this.v.manette > 0 && this.v.carburant > 0; },

  warpEffectif() {
    if (this.auto || this.avance) {
      if (!this.etape) return 1;
      const reste = this.etape.tExec - this.v.t;
      if (reste <= 0) return 1;
      let w = 1;
      for (const p of PALIERS_NAV) if (p * (1 / 60) <= reste / 2) w = p;
      return w;
    }
    if (this.enPoussee()) return Math.min(this.v.warp, 1000);
    return this.v.warp;
  },

  // ---------- Simulation ----------
  mettreAJour(dtReel, enPause) {
    if (!this.v || enPause) return;
    const v = this.v;
    const warp = this.warpEffectif();
    this.warpAffiche = warp;
    let dt = dtReel * warp;

    // Assistant / planificateur : on ne dépasse pas l'instant de la prochaine manœuvre.
    if ((this.auto || this.avance) && this.etape && !this.etape.attenteEvenement) dt = Math.min(dt, Math.max(0, this.etape.tExec - v.t));

    const centreAvant = v.orb.centre;
    if (this.enPoussee()) {
      let reste = dt;
      while (reste > 0) {
        const h = Math.min(1, reste);
        const dir = this.directionPoussee();
        const F = ORBITEUR.poussee * v.manette;
        const acc = V.mul(dir, F / this.masse() / 1000);
        if (avancerAvecPoussee(v.orb, v.t, h, () => acc) === 'impact') { v.t += h; return this.crash(); }
        v.carburant = Math.max(0, v.carburant - (F / (ORBITEUR.isp * G0)) * h);
        v.t += h; reste -= h;
        if (v.carburant <= 0) { v.manette = 0; this.log('Réservoir de l’orbiteur vide.'); break; }
      }
      v.orb.transfert = null;
    } else if (dt > 0) {
      const ev = [];
      const res = avancerVaisseau(v.orb, v.t, dt, ev, true);
      // Au changement de sphère d'influence, on s'arrête là pour cette image (le reste du temps est perdu).
      v.t = res === 'changement' ? ev[ev.length - 1].t : v.t + dt;
      for (const e of ev) {
        if (e.type === 'entree') this.log(`Entrée dans la sphère d’influence de ${ASTRES_PAR_ID[e.vers].nom}.`);
        if (e.type === 'sortie') this.log(`Sortie de la sphère d’influence de ${ASTRES_PAR_ID[e.de].nom}.`);
      }
      if (res === 'impact') return this.crash();
    }
    if (v.orb.centre !== centreAvant) this.etape = null;

    this.mettreAJourSondes(dt);
    this.piloteAuto();
  },

  directionPoussee() {
    const o = this.v.orb;
    switch (this.v.orientation) {
      case 'retrograde': return V.mul(V.unit(o.v), -1);
      case 'radialExt': return V.unit(o.r);
      case 'radialInt': return V.mul(V.unit(o.r), -1);
      case 'versCible':
      case 'freinCible': {
        if (!this.v.cible) return V.unit(o.v);
        const c = etatAbsolu(this.v.cible, this.v.t), m = etatAbsolu(o.centre, this.v.t);
        if (this.v.orientation === 'versCible') return V.unit(V.sub(c.r, V.add(m.r, o.r)));
        return V.mul(V.unit(V.sub(V.add(m.v, o.v), c.v)), -1);
      }
      default: return V.unit(o.v);
    }
  },

  crash() {
    const nom = ASTRES_PAR_ID[this.v.orb.centre].nom;
    this.auto = false; this.avance = false;
    this.log(`L’orbiteur s’est écrasé sur ${nom} ! Un nouvel orbiteur repart de la station terrestre.`);
    const neuf = this.nouveauVoyage();
    Object.assign(this.v, { orb: neuf.orb, carburant: neuf.carburant, sondes: neuf.sondes, atterrisseurs: neuf.atterrisseurs, manette: 0 });
    this.v.orb.r = this.etatStation(this.v.stations[0]).r;
    this.v.orb.v = this.etatStation(this.v.stations[0]).v;
    this.etape = null;
    if (this.contexte) this.contexte.alerte(`L’orbiteur s’est écrasé sur ${nom}.`);
  },

  // Exécution automatique des étapes (planificateur, ou assistant « avancer »).
  piloteAuto() {
    const v = this.v;
    if (!v.cible || v.mode === 'libre') { this.etape = null; return; }
    if (!this.etape) this.etape = prochaineEtape(v.orb, v.t, v.cible);
    const e = this.etape;
    if (e.type === 'fini') {
      if (this.auto) this.log(`Arrivée en orbite basse de ${ASTRES_PAR_ID[v.cible].nom}.`);
      this.auto = false; this.avance = false;
      return;
    }
    if (e.type === 'impossible') { this.auto = false; this.avance = false; return; }
    if (e.attenteEvenement) {
      // Croisière : si l'événement attendu tarde trop, on recalcule.
      if (v.t > e.tExec + 1) this.etape = null;
      return;
    }
    if (!(this.auto || this.avance)) return;
    if (v.t >= e.tExec - 1e-6) {
      if (this.avance && !this.auto) { this.avance = false; return; } // assistant : on s'arrête juste avant
      this.executerEtape();
    }
  },

  executerEtape() {
    const v = this.v, e = this.etape;
    if (!e || !e.dv) return;
    const dv = e.dv(v.orb, v.t);
    const reservoir = { kg: v.carburant };
    if (!appliquerImpulsion(v.orb, dv, reservoir)) {
      this.log(`Carburant insuffisant pour « ${e.texte} » (${fmtV(V.norm(dv) * 1000)} nécessaires).`);
      this.auto = false; this.avance = false;
      return;
    }
    v.carburant = reservoir.kg;
    this.log(`${e.texte} — poussée de ${fmtV(V.norm(dv) * 1000)}.`);
    this.flash = 1;
    this.etape = null;
  },

  // ---------- Sondes ----------
  lancerSonde(cibleId) {
    const v = this.v;
    if (v.sondes <= 0) return this.log('Plus de sonde à bord.');
    const c = ASTRES_PAR_ID[cibleId];
    v.sondes--;
    const n = v.sondesEnVol.length + 1;
    v.sondesEnVol.push({ id: 'p' + Date.now(), nom: `Sonde ${n} → ${c.nom}`, cible: cibleId, centre: v.orb.centre, r: v.orb.r.slice(), v: v.orb.v.slice(), transfert: null, etat: 'vol', tLancement: v.t });
    this.log(`Sonde lancée vers ${c.nom}.`);
  },

  mettreAJourSondes(dt) {
    const v = this.v;
    for (const s of v.sondesEnVol) {
      if (s.etat !== 'vol') {
        // Sonde arrivée : elle reste en orbite autour de sa cible (orbite fermée, propagation directe).
        if (s.tSonde === undefined) s.tSonde = v.t;
        const p = propager(s.r, s.v, v.t - s.tSonde, ASTRES_PAR_ID[s.centre].gm);
        s.r = p.r; s.v = p.v; s.tSonde = v.t;
        continue;
      }
      // La sonde rattrape le temps commun, en s'arrêtant à chaque manœuvre et changement de sphère d'influence.
      if (s.tSonde === undefined) s.tSonde = v.t - dt;
      for (let boucle = 0; boucle < 20 && s.etat === 'vol'; boucle++) {
        if (!s.etape) s.etape = prochaineEtape(s, s.tSonde, s.cible);
        const e = s.etape;
        if (e.type === 'fini') {
          s.etat = 'arrivee';
          v.visites[s.cible] = { ...(v.visites[s.cible] || {}), sonde: s.tSonde };
          this.log(`${s.nom} est en orbite : données de ${ASTRES_PAR_ID[s.cible].nom} reçues.`);
          break;
        }
        if (e.type === 'impossible') { s.etat = 'perdue'; this.log(`${s.nom} : aucune trajectoire possible.`); break; }
        if (!e.attenteEvenement && s.tSonde >= e.tExec - 1e-6) {
          appliquerImpulsion(s, e.dv(s, s.tSonde));
          s.etape = null;
          continue;
        }
        if (s.tSonde >= v.t - 1e-6) break;
        const fin = e.attenteEvenement ? v.t : Math.min(v.t, e.tExec);
        const ev = [];
        const res = avancerVaisseau(s, s.tSonde, fin - s.tSonde, ev, true);
        if (res === 'impact') {
          s.etat = 'perdue';
          this.log(`${s.nom} s’est écrasée sur ${ASTRES_PAR_ID[s.centre].nom}.`);
          break;
        }
        if (res === 'changement') { s.tSonde = ev[ev.length - 1].t; s.etape = null; continue; }
        s.tSonde = fin;
        if (e.attenteEvenement && s.tSonde > e.tExec + 1) s.etape = null;
      }
    }
    v.sondesEnVol = v.sondesEnVol.filter((s) => s.etat !== 'perdue' || v.t - s.tLancement < 0);
  },

  // ---------- Stations ----------
  stationIci() { return this.v.stations.find((s) => s.centre === this.v.orb.centre); },
  orbiteFermee() {
    const o = this.v.orb, c = ASTRES_PAR_ID[o.centre];
    const el = elements(o.r, o.v, c.gm);
    return el.e < 1 && el.ra < c.soi * 0.9;
  },
  construireStation() {
    const v = this.v, c = ASTRES_PAR_ID[v.orb.centre];
    if (v.kits <= 0) return this.log('Plus de kit de station à bord (on en recharge à la station terrestre).');
    if (!this.orbiteFermee()) return this.log('Il faut être en orbite fermée pour construire une station.');
    v.kits--;
    const n = v.stations.filter((s) => s.centre === c.id).length;
    v.stations.push({ id: 's' + Date.now(), nom: `Station ${c.nom}${n ? ' ' + (n + 1) : ''}`, centre: c.id, r: v.orb.r.slice(), v: v.orb.v.slice(), t0: v.t });
    this.log(`Station construite en orbite de ${c.nom}.`);
  },
  amarrer() {
    const v = this.v, s = this.stationIci();
    if (!s) return;
    const e = this.etatStation(s);
    v.orb.r = e.r; v.orb.v = e.v; v.orb.transfert = null;
    v.carburant = ORBITEUR.carburantMax;
    v.sondes = Math.max(v.sondes, ORBITEUR.sondes);
    v.atterrisseurs = Math.max(v.atterrisseurs, ORBITEUR.atterrisseurs);
    v.carburantAtt = null;
    if (s.base) v.kits = Math.max(v.kits, ORBITEUR.kits);
    this.etape = null;
    this.log(`Amarré à ${s.nom} : pleins faits, sondes et atterrisseurs rechargés${s.base ? ', kits de station rechargés' : ''}.`);
  },

  // Peut-on descendre avec l'atterrisseur ?
  peutDescendre() {
    const c = ASTRES_PAR_ID[this.v.orb.centre];
    return c.type !== 'etoile' && this.orbiteFermee() && this.v.atterrisseurs > 0;
  },

  // Actions proposées dans la fiche d'un astre.
  actionsPour(a) {
    const l = [];
    if (a.id !== 'soleil') l.push({ texte: '🎯 Choisir comme cible', action: () => { this.v.cible = a.id; this.etape = null; this.auto = false; this.majHud(true); } });
    l.push({ texte: '🔭 Centrer la vue', action: () => this.centrerSur(a.id) });
    if (a.id !== 'soleil' && this.v.sondes > 0) l.push({ texte: '🛰 Lancer une sonde', action: () => this.lancerSonde(a.id) });
    return l;
  },

  centrerSur(id) {
    this.cam.focus = id;
    this.cam.decal = [0, 0];
    const a = id === 'orbiteur' ? ASTRES_PAR_ID[this.v.orb.centre] : ASTRES_PAR_ID[id];
    const taille = id === 'orbiteur' ? Math.max(V.norm(this.v.orb.r) * 3, a.rayonKm * 4) : (ENFANTS[id] ? Math.max(...ENFANTS[id].filter((c) => c.grosse).map((c) => c.orbite.a), a.rayonKm * 10) * 2.4 : a.rayonKm * 30);
    this.cam.echelle = Math.min(innerWidth, innerHeight) / taille;
  },

  // ---------- Rendu ----------
  dessiner(ctx, W, H) {
    const v = this.v, t = v.t, s = this.cam.echelle;
    const focus = this.cam.focus === 'orbiteur' ? this.absolu(v.orb) : etatAbsolu(this.cam.focus, t).r;
    const cam = V.add(focus, this.cam.decal);
    const ecran = (p) => [W / 2 + (p[0] - cam[0]) * s, H / 2 - (p[1] - cam[1]) * s];
    const dansEcran = (p, m = 50) => p[0] > -m && p[0] < W + m && p[1] > -m && p[1] < H + m;
    const masque = this.contexte.masque();
    this.zones = [];

    ctx.fillStyle = '#03050b';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const e of ETOILES) ctx.fillRect(e.x * W, e.y * H, e.r * 0.8, e.r * 0.8);

    // Ceinture d'astéroïdes
    if (2.1 * UA_KM * s > 40) {
      ctx.fillStyle = 'rgba(200,180,150,0.7)';
      for (const b of CEINTURE) {
        const M = b.M0 + b.n * t;
        const r = b.a * (1 - b.e * Math.cos(M));
        const p = ecran([r * Math.cos(M + b.w), r * Math.sin(M + b.w)]);
        if (dansEcran(p, 0)) ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2);
      }
    }

    // Orbites et astres
    const diag = Math.hypot(W, H);
    for (const a of ASTRES) {
      if (a.orbite && (!masque || a.grosse || a.id === v.cible || a.id === v.orb.centre)) {
        const o = a.orbite;
        const rp = o.a * s;
        if (rp < 3) continue;
        const pc = ecran(etatAbsolu(o.centre, t).r);
        if (Math.hypot(pc[0] - W / 2, pc[1] - H / 2) - rp * (1 + o.e) > diag) continue;
        if (rp < 20000) {
          ctx.strokeStyle = a.id === v.cible ? 'rgba(102,187,106,0.8)' : a.parent ? 'rgba(140,160,200,0.18)' : 'rgba(140,160,200,0.35)';
          ctx.lineWidth = a.id === v.cible ? 1.5 : 1;
          ctx.beginPath();
          const b = Math.sqrt(1 - o.e * o.e), w = o.varpi * DEG;
          for (let k = 0; k <= 96; k++) {
            const E = (k / 96) * 2 * Math.PI;
            let x = o.a * (Math.cos(E) - o.e), y = o.a * b * Math.sin(E);
            if (o.retro) y = -y;
            const p = [pc[0] + (x * Math.cos(w) - y * Math.sin(w)) * s, pc[1] - (x * Math.sin(w) + y * Math.cos(w)) * s];
            if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
          }
          ctx.stroke();
        }
      }
    }
    for (const a of ASTRES) {
      if (a.orbite) {
        if (masque && !a.grosse && a.id !== v.cible && a.id !== v.orb.centre) continue;
        if (a.orbite.a * s < 3 && a.id !== this.cam.focus) continue;
      }
      const p = ecran(etatAbsolu(a.id, t).r);
      if (!dansEcran(p)) continue;
      const rr = Math.max(a.rayonKm * s, a.type === 'etoile' ? 7 : a.parent ? 2 : 3.5);
      if (a.type === 'etoile') {
        const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr * 3);
        g.addColorStop(0, 'rgba(255,230,150,0.9)'); g.addColorStop(1, 'rgba(255,160,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], rr * 3, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.fillStyle = a.couleurs.disque;
      ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 2 * Math.PI); ctx.fill();
      if (a.id === 'saturne' && rr > 3) {
        ctx.strokeStyle = 'rgba(230,210,160,0.6)'; ctx.lineWidth = Math.max(1, rr * 0.25);
        ctx.beginPath(); ctx.ellipse(p[0], p[1], rr * 2.2, rr * 0.7, -0.4, 0, 2 * Math.PI); ctx.stroke();
      }
      // Sphère d'influence de la cible et du centre courant
      if ((a.id === v.cible || a.id === v.orb.centre) && a.soi < Infinity && a.soi * s > rr + 6) {
        ctx.strokeStyle = a.id === v.cible ? 'rgba(102,187,106,0.35)' : 'rgba(255,255,255,0.15)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.arc(p[0], p[1], a.soi * s, 0, 2 * Math.PI); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (a.id === v.cible) {
        ctx.strokeStyle = '#66bb6a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p[0], p[1], rr + 5, 0, 2 * Math.PI); ctx.stroke();
      }
      const seuil = a.grosse ? 45 : 400;   // les petites lunes ne sont nommées que de près
      const etiquette = !a.orbite || a.orbite.a * s > seuil || a.id === v.cible || a.id === this.survole || a.id === this.cam.focus;
      if (etiquette) {
        ctx.fillStyle = a.id === this.survole ? '#fff' : 'rgba(220,230,255,0.8)';
        ctx.font = (a.parent ? '11px' : '12px') + ' system-ui, sans-serif';
        ctx.fillText(a.nom, p[0] + rr + 4, p[1] - rr - 2);
      }
      this.zones.push({ x: p[0], y: p[1], r: Math.max(rr, 7), id: a.id, prio: a.parent ? 1 : 2 });
    }

    // Stations
    for (const st of v.stations) {
      const e = this.etatStation(st);
      const p = ecran(V.add(etatAbsolu(st.centre, t).r, e.r));
      if (!dansEcran(p)) continue;
      ctx.fillStyle = st.base ? '#ffca28' : '#ffb74d';
      ctx.fillRect(p[0] - 4, p[1] - 4, 8, 8);
      ctx.fillStyle = 'rgba(255,220,150,0.9)';
      ctx.font = '11px system-ui, sans-serif';
      if (s * V.norm(e.r) > 30) ctx.fillText(st.nom, p[0] + 7, p[1] + 12);
    }

    // Sondes
    for (const sd of v.sondesEnVol) {
      const p = ecran(this.absolu(sd));
      if (!dansEcran(p)) continue;
      ctx.fillStyle = sd.etat === 'arrivee' ? '#80deea' : '#4dd0e1';
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - 5); ctx.lineTo(p[0] + 4, p[1] + 4); ctx.lineTo(p[0] - 4, p[1] + 4); ctx.fill();
      if (sd.etat === 'vol') { ctx.font = '10px system-ui, sans-serif'; ctx.fillText(sd.nom, p[0] + 6, p[1] + 3); }
    }

    // Trajectoire prévue de l'orbiteur
    const segs = predireTrajectoire(v.orb, t, 400 * 365.25 * JOUR, 260);
    const couleurs = ['#ff7043', '#ffca28', '#66bb6a'];
    segs.forEach((sg, i) => {
      const pc = etatAbsolu(sg.centre, t).r;
      ctx.strokeStyle = couleurs[i % 3];
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      sg.points.forEach((q, k) => {
        const p = ecran(V.add(pc, q));
        if (k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      });
      ctx.stroke();
      if (sg.fin && sg.fin.type === 'impact') {
        const q = ecran(V.add(pc, sg.points[sg.points.length - 1]));
        ctx.fillStyle = '#ef5350'; ctx.font = 'bold 12px system-ui'; ctx.fillText('✖ impact', q[0] + 6, q[1]);
      }
    });

    // Prochaine manœuvre
    if (this.etape && this.etape.dv && this.etape.tExec > t + 1) {
      const e = etatVaisseauA(v.orb, this.etape.tExec - t);
      const p = ecran(V.add(etatAbsolu(v.orb.centre, t).r, e.r));
      ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p[0], p[1], 7, 0, 2 * Math.PI); ctx.stroke();
      ctx.fillStyle = '#4fc3f7'; ctx.font = '11px system-ui'; ctx.fillText('manœuvre', p[0] + 9, p[1] - 6);
    }
    // Position de la cible à l'arrivée
    if (v.orb.transfert && v.orb.centre !== v.orb.transfert.cible) {
      const f = ASTRES_PAR_ID[v.orb.transfert.cible];
      const arr = etatRelatif(f, v.orb.transfert.tArrivee);
      const p = ecran(V.add(etatAbsolu(v.orb.centre, t).r, arr.r));
      ctx.strokeStyle = 'rgba(102,187,106,0.8)'; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 8, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(102,187,106,0.9)'; ctx.font = '11px system-ui'; ctx.fillText(`${f.nom} à l’arrivée`, p[0] + 10, p[1] + 4);
    }

    // Orbiteur
    const po = ecran(this.absolu(v.orb));
    const dir = this.v.mode === 'libre' ? this.directionPoussee() : V.unit(v.orb.v);
    ctx.save();
    ctx.translate(po[0], po[1]);
    ctx.rotate(-Math.atan2(dir[1], dir[0]));
    if (this.enPoussee() || this.flash > 0) {
      ctx.fillStyle = '#ffab40';
      ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(-16 - 6 * Math.random(), 0); ctx.lineTo(-6, 3); ctx.fill();
    }
    ctx.fillStyle = '#eceff1';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.fill();
    ctx.fillStyle = '#2f6fd6'; ctx.fillRect(-4, -11, 4, 6); ctx.fillRect(-4, 5, 4, 6);
    ctx.restore();
    if (this.flash > 0) this.flash -= 1 / 30;

    // Échelle
    const kmPour100 = 100 / s;
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '11px system-ui';
    ctx.fillRect(W - 140, H - 30, 100, 2);
    ctx.fillText(kmPour100 > UA_KM / 10 ? fmt(kmPour100 / UA_KM, 2) + ' UA' : fmt(kmPour100) + ' km', W - 140, H - 36);

    // Messages
    let y = H - 70;
    for (let i = this.messages.length - 1; i >= 0 && y > H / 2; i--) {
      const m = this.messages[i];
      m.vie -= 1 / 60;
      if (m.vie <= 0) continue;
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, m.vie)})`;
      ctx.font = '13px system-ui';
      ctx.fillText(m.texte, 20, y);
      y -= 20;
    }
    this.messages = this.messages.filter((m) => m.vie > 0);
  },

  astreSous(x, y) {
    let best = null, d0 = Infinity;
    for (const z of this.zones) {
      const d = Math.hypot(z.x - x, z.y - y) - z.prio;
      if (d < z.r + 4 && d < d0) { d0 = d; best = z.id; }
    }
    return best;
  },

  // ---------- Interface (DOM) ----------
  construireHud() {
    const h = $('hud-nav');
    h.innerHTML = `
      <div class="barre-haut">
        <span id="nav-date" class="date"></span>
        <span class="groupe"><button id="nav-moins">−</button><span id="nav-warp"></span><button id="nav-plus">+</button></span>
        <span class="groupe modes">
          ${['libre', 'assistant', 'planificateur'].map((m) => `<button data-mode="${m}">${{ libre: 'Pilotage libre', assistant: 'Assistant', planificateur: 'Planificateur' }[m]}</button>`).join('')}
        </span>
        <label class="groupe"><input type="checkbox" id="nav-masque"> Grosses lunes seulement</label>
        <button id="nav-encyclo">📖 Astres</button>
        <button id="nav-pause">⏸</button>
        <button id="nav-hangar">Hangar</button>
      </div>
      <div class="panneau gauche" id="nav-etat"></div>
      <div class="panneau droite" id="nav-actions"></div>
      <div class="aide-nav">Molette : zoom · glisser : déplacer · clic : fiche d’un astre · double-clic : centrer · F : revenir à l’orbiteur · +/− : temps${''}</div>`;
    $('nav-moins').onclick = () => this.changerWarp(-1);
    $('nav-plus').onclick = () => this.changerWarp(1);
    h.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { this.v.mode = b.dataset.mode; this.auto = false; this.avance = false; this.v.manette = 0; this.majHud(true); }; });
    $('nav-masque').onchange = () => this.contexte.basculerMasque();
    $('nav-encyclo').onclick = () => Infos.ouvrirEncyclopedie();
    $('nav-pause').onclick = () => this.contexte.basculerPause();
    $('nav-hangar').onclick = () => this.contexte.hangar();
    this.majHud(true);
  },

  changerWarp(sens) {
    const i = PALIERS_NAV.indexOf(this.v.warp);
    this.v.warp = PALIERS_NAV[Math.max(0, Math.min(PALIERS_NAV.length - 1, (i < 0 ? 0 : i) + sens))];
    this.majHud(true);
  },

  majHud(force) {
    const now = performance.now();
    if (!force && now - this.derniereMaj < 150) return;
    this.derniereMaj = now;
    const v = this.v, o = v.orb, c = ASTRES_PAR_ID[o.centre];
    const el = elements(o.r, o.v, c.gm);
    const w = this.warpAffiche || v.warp;
    $('nav-date').textContent = fmtDate(v.t);
    const hb = document.querySelector('#hud-nav .barre-haut').offsetHeight + 16;
    for (const id of ['nav-etat', 'nav-actions']) { $(id).style.top = hb + 'px'; $(id).style.maxHeight = `calc(100vh - ${hb + 40}px)`; }
    $('nav-warp').textContent = `×${fmtNombre(w, 0)} (1 s = ${fmtDuree(w)})`;
    $('nav-masque').checked = this.contexte.masque();
    $('nav-pause').textContent = this.contexte.estEnPause() ? '▶' : '⏸';
    document.querySelectorAll('#hud-nav [data-mode]').forEach((b) => b.classList.toggle('choisi', b.dataset.mode === v.mode));

    const alt = V.norm(o.r) - c.rayonKm;
    const dvRestant = deltaVOrbiteur(v.carburant);
    const lignes = [
      ['Autour de', c.nom],
      ['Altitude', fmtAlt(alt * 1000)],
      ['Vitesse', fmtV(V.norm(o.v) * 1000)],
      ['Plus près / plus loin', el.e < 1 ? `${fmtAlt((el.rp - c.rayonKm) * 1000)} / ${fmtAlt((el.ra - c.rayonKm) * 1000)}` : `${fmtAlt((el.rp - c.rayonKm) * 1000)} / s’échappe`],
      ['Période', isFinite(el.periode) ? fmtDuree(el.periode) : '—'],
      ['Carburant', `${fmt(v.carburant)} kg (Δv ${fmtV(dvRestant)})`],
      ['Sondes / kits station', `${v.sondes} / ${v.kits}`],
      ['Atterrisseurs', `${v.atterrisseurs}`],
    ];
    let html = '<h3>Orbiteur</h3><dl>' + lignes.map(([k, x]) => `<dt>${k}</dt><dd>${x}</dd>`).join('') + '</dl>';
    if (v.mode === 'libre') {
      html += `<h3>Pilotage libre</h3>
        <div class="orientations">${Object.entries(ORIENTATIONS).map(([k, t], i) => `<button data-ori="${k}" class="${v.orientation === k ? 'choisi' : ''}">${i + 1}. ${t}</button>`).join('')}</div>
        <div class="manette"><span>Gaz ${fmt(v.manette * 100)} %</span><div class="barre-gaz"><div style="width:${v.manette * 100}%"></div></div></div>
        <p class="doux">Z/S ou ↑↓ : gaz · X : couper · 1-6 : orientation. Temps limité à ×1 000 pendant la poussée.</p>`;
    }
    $('nav-etat').innerHTML = html;
    $('nav-etat').querySelectorAll('[data-ori]').forEach((b) => { b.onclick = () => { v.orientation = b.dataset.ori; this.majHud(true); }; });

    // Panneau de droite : cible, plan, actions
    let d = '';
    if (v.cible) {
      const cb = ASTRES_PAR_ID[v.cible];
      d += `<h3>Cible : ${cb.nom}</h3>`;
      if (v.mode !== 'libre') {
        const e = this.etape || (this.etape = prochaineEtape(o, v.t, v.cible));
        d += `<ol class="plan"><li class="actuelle">${e.texte}${e.tExec > v.t + 1 ? ` <span class="doux">(dans ${fmtDuree(e.tExec - v.t)})</span>` : ''}</li>${(e.reste || []).map((x) => `<li>${x}</li>`).join('')}</ol>`;
        if (v.mode === 'assistant' && e.type !== 'fini' && e.type !== 'impossible') {
          if (e.tExec > v.t + 1 || e.attenteEvenement) d += `<button id="nav-avancer" class="principal">${this.avance ? '⏸ Arrêter' : '⏩ Avancer jusqu’à l’étape'}</button>`;
          if (e.dv && e.tExec <= v.t + 1) d += `<button id="nav-executer" class="principal">🔥 Exécuter la manœuvre</button>`;
        }
        if (v.mode === 'planificateur' && e.type !== 'fini') d += `<button id="nav-auto" class="principal">${this.auto ? '⏸ Arrêter le voyage' : `🚀 Aller à ${cb.nom}`}</button>`;
      } else {
        const cp = etatAbsolu(v.cible, v.t);
        const dist = V.norm(V.sub(cp.r, this.absolu(o)));
        d += `<dl><dt>Distance</dt><dd>${fmt(dist)} km</dd></dl>`;
      }
    } else d += '<h3>Pas de cible</h3><p class="doux">Cliquez un astre puis « Choisir comme cible ».</p>';
    d += '<h3>Actions</h3><div class="actions-nav">';
    if (this.peutDescendre()) {
      const f = assemblerFusee(this.contexte.equipement());
      const carb = v.carburantAtt === null ? f.carburant : Math.min(v.carburantAtt, f.carburant);
      const dvAtt = f.isp * G0 * Math.log((f.masseSeche + carb) / f.masseSeche);
      const besoin = c.type === 'solide' ? c.depart.vitesse + Math.sqrt(2 * c.g * c.depart.alt) + besoinRetourOrbite(c) : 0;
      d += `<button id="nav-descendre">⬇ Descendre sur ${c.nom}</button>`;
      if (c.type === 'solide') d += `<p class="doux">Atterrisseur : Δv ${fmtV(dvAtt)} ; aller-retour ≈ ${fmtV(besoin)}${dvAtt < besoin ? ' — <b style="color:var(--alerte)">pas assez pour remonter !</b>' : ''}</p>`;
    }
    const st = this.stationIci();
    if (st) d += `<button id="nav-amarrer">⚓ S’amarrer à ${st.nom}</button><button id="nav-equiper">🔧 Équiper l’atterrisseur</button>`;
    if (v.kits > 0 && this.orbiteFermee() && c.type !== 'etoile') d += `<button id="nav-station">🏗 Construire une station ici</button>`;
    if (v.cible && v.sondes > 0) d += `<button id="nav-sonde">🛰 Sonde vers ${ASTRES_PAR_ID[v.cible].nom}</button>`;
    d += `<button id="nav-journal">📜 Journal</button></div>`;
    const sondes = v.sondesEnVol;
    if (sondes.length) d += '<h3>Sondes</h3><ul class="sondes">' + sondes.map((s) => `<li>${s.nom} — ${s.etat === 'vol' ? 'en route' : 'en orbite'}</li>`).join('') + '</ul>';
    $('nav-actions').innerHTML = d;
    const bind = (id, f) => { const b = $(id); if (b) b.onclick = f; };
    bind('nav-avancer', () => { this.avance = !this.avance; this.majHud(true); });
    bind('nav-executer', () => { this.executerEtape(); this.majHud(true); });
    bind('nav-auto', () => { this.auto = !this.auto; this.majHud(true); });
    bind('nav-descendre', () => this.contexte.descendre(o.centre));
    bind('nav-amarrer', () => { this.amarrer(); this.majHud(true); });
    bind('nav-equiper', () => this.contexte.hangar());
    bind('nav-station', () => { this.construireStation(); this.majHud(true); });
    bind('nav-sonde', () => { this.lancerSonde(v.cible); this.majHud(true); });
    bind('nav-journal', () => this.contexte.journal());
  },

  touche(e) {
    const v = this.v;
    if (e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') this.changerWarp(1);
    if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus' || e.code === 'Digit6' && e.key === '-') this.changerWarp(-1);
    if (e.code === 'KeyF') this.centrerSur('orbiteur');
    if (v.mode === 'libre') {
      if (['ArrowUp', 'KeyW'].includes(e.code)) v.manette = Math.min(1, v.manette + 0.05);
      if (['ArrowDown', 'KeyS'].includes(e.code)) v.manette = Math.max(0, v.manette - 0.05);
      if (e.code === 'KeyX') v.manette = 0;
      if (e.code === 'Space') v.manette = 1;
      const k = Object.keys(ORIENTATIONS);
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 6) v.orientation = k[n - 1];
      this.majHud(true);
    }
  },

  molette(e) {
    const f = e.deltaY > 0 ? 1 / 1.25 : 1.25;
    this.cam.echelle = Math.max(1e-10, Math.min(5, this.cam.echelle * f));
  },
};
