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

  // Une campagne : ce qui dure (stations, bases, sondes, journal, échantillons rapportés).
  // L'orbiteur (orb) n'existe que pendant une expédition, lancée depuis la Terre par la méga-fusée.
  nouveauVoyage() {
    return {
      t: DATE_DEBUT,
      orb: null,
      carburant: 0, ergolsAtt: 0, sondes: 0, kits: 0, kitsBase: 0, robots: 0, atterrisseurs: 0,
      sondesEnVol: [], stations: [], bases: [],
      journal: [{ t: DATE_DEBUT, texte: 'Début de la campagne. Première étape : lancer la méga-fusée et construire la station spatiale.' }],
      mode: 'assistant', cible: null, manette: 0, orientation: 'prograde', warp: 1,
      visites: {}, echantillonsABord: {}, echantillonsRapportes: {}, provisions: { fleurs: 0, fruits: 0 }, bieres: 0,
      expeditions: 0,
    };
  },

  // La méga-fusée a mis l'expédition en orbite basse terrestre : orbiteur + atterrisseur + chargement.
  demarrerExpedition() {
    const v = this.v;
    const terre = ASTRES_PAR_ID.terre;
    const r0 = terre.rayonKm + 400;
    v.orb = { centre: 'terre', r: [r0, 0], v: [0, Math.sqrt(terre.gm / r0)], transfert: null };
    const station = v.stations.find((s) => s.centre === 'terre');
    if (station) { const e = this.etatStation(station); v.orb.r = e.r; v.orb.v = e.v; }
    Object.assign(v, {
      carburant: ORBITEUR.carburantMax, ergolsAtt: ORBITEUR.ergolsAtt, sondes: ORBITEUR.sondes,
      kits: ORBITEUR.kits + (station ? 0 : 1), kitsBase: ORBITEUR.kitsBase, robots: ORBITEUR.robots,
      atterrisseurs: ORBITEUR.atterrisseurs, echantillonsABord: {}, cible: null, manette: 0,
    });
    v.expeditions++;
    this.etape = null; this.auto = false; this.avance = false;
    this.log(`Expédition n° ${v.expeditions} en orbite terrestre : orbiteur, atterrisseur et chargement prêts.` +
      (station ? ` Amarrée à ${station.nom}.` : ' Construisez d’abord la station spatiale.'));
  },

  // Lanceur Séléné : son 3e étage rallume pour envoyer l'expédition vers la Lune.
  // On attend la fenêtre (au plus une orbite), puis l'étage fournit la poussée : l'orbiteur garde son carburant.
  injectionTranslunaire(dvDispo) {
    const v = this.v;
    v.cible = 'lune';
    v.mode = 'planificateur';
    const e = prochaineEtape(v.orb, v.t, 'lune');
    if (e.type !== 'transfert') return { ok: false, texte: 'Pas de fenêtre vers la Lune trouvée.' };
    if (e.tExec > v.t) { avancerVaisseau(v.orb, v.t, e.tExec - v.t); v.t = e.tExec; }
    const dv = e.dv(v.orb, v.t);
    const besoin = V.norm(dv) * 1000;
    if (besoin > dvDispo) {
      this.log(`Le 3e étage n’a plus assez d’ergols pour l’injection translunaire (${fmtV(dvDispo)} sur ${fmtV(besoin)}). L’expédition reste en orbite terrestre.`);
      return { ok: false, texte: `Injection translunaire impossible : il manquait ${fmtV(besoin - dvDispo)}. L’expédition reste en orbite terrestre.` };
    }
    appliquerImpulsion(v.orb, dv);
    this.etape = null;
    this.auto = true;
    this.log(`Injection translunaire par le 3e étage : ${fmtV(besoin)}. Arrivée à la Lune dans environ ${fmtDuree(v.orb.transfert.tArrivee - v.t)}.`);
    return { ok: true, texte: `Le 3e étage a rallumé pour l’injection translunaire (${fmtV(besoin)}) : l’expédition est en route vers la Lune, arrivée dans environ ${fmtDuree(v.orb.transfert.tArrivee - v.t)}. Le planificateur s’occupera de la mise en orbite lunaire ; réglez l’écoulement du temps à votre guise.` };
  },

  // Fin d'expédition : la capsule rentre sur Terre avec l'équipage et les échantillons.
  rentrerSurTerre() {
    const v = this.v;
    let n = 0;
    for (const id in v.echantillonsABord) {
      v.echantillonsRapportes[id] = (v.echantillonsRapportes[id] || 0) + v.echantillonsABord[id];
      n += v.echantillonsABord[id];
    }
    const liste = Object.entries(v.echantillonsABord).map(([id, k]) => `${k} de ${ASTRES_PAR_ID[id].nom}`).join(', ');
    this.log(`Retour sur Terre de l’expédition n° ${v.expeditions}${n ? ` avec ${n} échantillon${n > 1 ? 's' : ''} (${liste})` : ''}.`);
    v.orb = null;
    v.echantillonsABord = {};
    v.cible = null;
    return { n, liste };
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

  // Le joueur choisit toujours l'écoulement du temps (×1 par défaut).
  // Seule exception : le bouton « avance rapide jusqu'à l'étape », qu'il déclenche lui-même.
  warpEffectif() {
    if (this.avance) {
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
    if (v.mode !== 'libre' && v.cible && this.etape && this.etape.dv && !this.etape.attenteEvenement && this.etape.tExec > v.t) {
      if (v.t + dt >= this.etape.tExec) {
        dt = this.etape.tExec - v.t;
        // Assistant : on s'arrête à ×1 pour laisser le joueur exécuter la manœuvre.
        if (!this.auto) { v.warp = 1; this.avance = false; this.log('Manœuvre prête : « ' + this.etape.texte + ' ».'); }
      }
    }

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
    this.mettreAJourLogistique();
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
    this.log(`L’orbiteur s’est écrasé sur ${nom} !`);
    this.log(`L’expédition est perdue. Il faudra lancer une nouvelle méga-fusée depuis la Terre.`);
    this.v.orb = null;
    this.v.echantillonsABord = {};
    this.etape = null;
    if (this.contexte) this.contexte.finExpedition(`L’orbiteur s’est écrasé sur ${nom}. L’expédition est perdue.`);
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
    if (v.kits <= 0) return this.log('Plus de kit de station à bord (la station terrestre en reçoit de la Terre).');
    if (!this.orbiteFermee()) return this.log('Il faut être en orbite fermée pour construire une station.');
    v.kits--;
    const n = v.stations.filter((s) => s.centre === c.id).length;
    const terrestre = c.id === 'terre' && !v.stations.some((s) => s.terrestre);
    const st = {
      id: 's' + Date.now(), nom: terrestre ? 'Station spatiale terrestre' : `Station ${c.nom}${n ? ' ' + (n + 1) : ''}`,
      centre: c.id, r: v.orb.r.slice(), v: v.orb.v.slice(), t0: v.t, terrestre,
      stock: { carburant: 0, ergols: 0, sondes: 0, kits: 0, kitsBase: 0, robots: 0, atterrisseurs: 0 },
      prochainCargo: v.t + intervalleCargo(c.id),
    };
    v.stations.push(st);
    this.log(`${st.nom} construite en orbite de ${c.nom}. Premier ravitaillement depuis la Terre dans ${fmtDuree(st.prochainCargo - v.t)}.`);
  },

  // Cargos venus de la Terre et production des bases au sol.
  mettreAJourLogistique() {
    const v = this.v;
    for (const s of v.stations) {
      if (!s.stock) s.stock = { carburant: 0, ergols: 0, sondes: 0, kits: 0, kitsBase: 0, robots: 0, atterrisseurs: 0 };
      if (!s.prochainCargo) s.prochainCargo = v.t + intervalleCargo(s.centre);
      let n = 0;
      while (v.t >= s.prochainCargo && n++ < 50) {
        livrerCargo(s);
        s.prochainCargo += intervalleCargo(s.centre);
        if (n === 1) this.log(`Cargo venu de la Terre arrivé à ${s.nom}.`);
      }
    }
    for (const b of v.bases) {
      const dt = v.t - (b.tMaj || v.t);
      b.tMaj = v.t;
      if (dt <= 0) continue;
      const prod = productionBase(ASTRES_PAR_ID[b.astre]) * (dt / JOUR);
      const st = v.stations.find((s) => s.centre === b.astre);
      // La base garde d'abord 20 t pour les atterrisseurs ; sa navette monte le surplus à la station.
      b.stock = (b.stock || 0) + prod;
      const surplus = b.stock - 20000;
      if (st && surplus > 0) {
        const monte = Math.min(CAPACITES_STATION.ergols - st.stock.ergols, surplus);
        st.stock.ergols += monte;
        b.stock -= monte;
      }
      b.produitTotal = (b.produitTotal || 0) + prod;
    }
  },

  amarrer() {
    const v = this.v, s = this.stationIci();
    if (!s) return;
    const e = this.etatStation(s);
    v.orb.r = e.r; v.orb.v = e.v; v.orb.transfert = null;
    // On prend ce que la station a en stock, dans la limite de ce que l'orbiteur peut emporter.
    const pris = [];
    const prendre = (cle, max, nom, unite = '') => {
      const q = Math.max(0, Math.min(s.stock[cle], max - v[cle]));
      if (q > 0) { s.stock[cle] -= q; v[cle] += q; pris.push(`${unite === 'kg' ? fmt(q / 1000, 1) + ' t' : fmt(q)} ${nom}`); }
    };
    prendre('carburant', ORBITEUR.carburantMax, 'de carburant', 'kg');
    prendre('ergols', ORBITEUR.ergolsAtt, 'd’ergols pour l’atterrisseur', 'kg');
    prendre('sondes', ORBITEUR.sondes, 'sondes');
    prendre('kits', ORBITEUR.kits + 1, 'kits de station');
    prendre('kitsBase', 2, 'kits de base');
    prendre('robots', ORBITEUR.robots, 'robots');
    prendre('atterrisseurs', ORBITEUR.atterrisseurs, 'atterrisseurs');
    // Les échantillons peuvent attendre à la station ; ils repartent vers la Terre avec le cargo.
    this.etape = null;
    this.log(`Amarré à ${s.nom}${pris.length ? ' : ' + pris.join(', ') : ' : stock vide, attendez le prochain cargo'}.`);
  },

  // Peut-on descendre avec l'atterrisseur ?
  peutDescendre() {
    const c = ASTRES_PAR_ID[this.v.orb.centre];
    return c.type !== 'etoile' && c.id !== 'terre' && this.orbiteFermee() && this.v.atterrisseurs > 0;
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

    this.dessinerMiniCarte(ctx, W, H);

    // Échelle
    const kmPour100 = 100 / s;
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '11px system-ui';
    ctx.fillRect(W - 140, H - 30, 100, 2);
    ctx.fillText(kmPour100 > UA_KM / 10 ? fmt(kmPour100 / UA_KM, 2) + ' UA' : fmt(kmPour100) + ' km', W - 140, H - 36);

    // Messages, en bas au centre
    let y = H - 40;
    ctx.textAlign = 'center';
    ctx.font = '13px system-ui';
    for (let i = this.messages.length - 1; i >= 0 && y > H / 2; i--) {
      const m = this.messages[i];
      m.vie -= 1 / 60;
      if (m.vie <= 0) continue;
      const tw = ctx.measureText(m.texte).width;
      ctx.fillStyle = `rgba(0,0,0,${0.55 * Math.min(1, m.vie)})`;
      ctx.fillRect(W / 2 - tw / 2 - 8, y - 15, tw + 16, 20);
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, m.vie)})`;
      ctx.fillText(m.texte, W / 2, y);
      y -= 22;
    }
    ctx.textAlign = 'left';
    this.messages = this.messages.filter((m) => m.vie > 0);
  },

  // Mini-carte : vue plus large, centrée sur l'astre principal autour duquel tourne ce qu'on regarde.
  dessinerMiniCarte(ctx, W, H) {
    const v = this.v, t = v.t;
    const vu = this.cam.focus === 'orbiteur' ? v.orb.centre : this.cam.focus;
    const a = ASTRES_PAR_ID[vu];
    this.mini = null;
    if (!a || !a.orbite) return;
    const principal = a.orbite.centre;
    const etendue = a.orbite.a * (1 + a.orbite.e) * 1.35;
    const L = Math.min(200, Math.max(120, H * 0.3)), x0 = 8, y0 = H - L - 52;
    const cx = x0 + L / 2, cy = y0 + L / 2 + 8;
    const k = (L / 2 - 14) / etendue;
    this.mini = { x0, y0, L, principal };
    ctx.fillStyle = 'rgba(8,12,24,0.88)';
    ctx.fillRect(x0, y0, L, L + 16);
    ctx.strokeStyle = 'rgba(140,160,200,0.5)';
    ctx.strokeRect(x0, y0, L, L + 16);
    ctx.fillStyle = '#cfd8dc';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`Vue d’ensemble : ${ASTRES_PAR_ID[principal].nom}`, x0 + 8, y0 + 14);
    ctx.save();
    ctx.beginPath(); ctx.rect(x0, y0 + 18, L, L - 2); ctx.clip();
    const pp = etatAbsolu(principal, t).r;
    const versMini = (p) => [cx + (p[0] - pp[0]) * k, cy - (p[1] - pp[1]) * k];
    // Orbites des enfants visibles à cette échelle
    for (const c of ENFANTS[principal] || []) {
      if (!(c.grosse || c.id === vu || c.id === v.cible)) continue;
      const r = c.orbite.a * k;
      if (r < 2 || r > L) continue;
      ctx.strokeStyle = c.id === vu ? 'rgba(255,202,40,0.7)' : 'rgba(140,160,200,0.3)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
      const p = versMini(etatAbsolu(c.id, t).r);
      ctx.fillStyle = c.couleurs.disque;
      ctx.beginPath(); ctx.arc(p[0], p[1], c.id === vu ? 3.5 : 2, 0, 2 * Math.PI); ctx.fill();
      if (c.id === vu || (c.grosse && r > 25 && !c.parent) || c.id === v.cible) { ctx.fillStyle = '#cfd8dc'; ctx.fillText(c.nom, p[0] + 5, p[1] - 3); }
    }
    // Astre principal
    const pa = ASTRES_PAR_ID[principal];
    ctx.fillStyle = pa.couleurs.disque;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(3, Math.min(10, pa.rayonKm * k)), 0, 2 * Math.PI); ctx.fill();
    // Orbiteur et cible
    const po = versMini(this.absolu(v.orb));
    ctx.fillStyle = '#ff7043';
    ctx.fillRect(po[0] - 2.5, po[1] - 2.5, 5, 5);
    // Cadre de la vue principale
    const s = this.cam.echelle;
    const focus = this.cam.focus === 'orbiteur' ? this.absolu(v.orb) : etatAbsolu(this.cam.focus, t).r;
    const c0 = versMini(V.add(focus, this.cam.decal));
    const lw = (W / s) * k, lh = (H / s) * k;
    if (lw > 3) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.strokeRect(c0[0] - lw / 2, c0[1] - lh / 2, lw, lh); }
    ctx.restore();
    ctx.fillStyle = 'rgba(207,216,220,0.7)';
    ctx.fillText('clic : centrer ici', x0 + 8, y0 + L + 11);
  },

  clicMiniCarte(x, y) {
    const m = this.mini;
    if (!m || x < m.x0 || x > m.x0 + m.L || y < m.y0 || y > m.y0 + m.L + 16) return false;
    this.centrerSur(m.principal);
    return true;
  },

  astreSous(x, y) {
    if (this.mini && x > this.mini.x0 && y > this.mini.y0 && x < this.mini.x0 + this.mini.L && y < this.mini.y0 + this.mini.L + 16) return null;
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
        <span class="groupe">🎯 Centrer : <button id="nav-c-orb">Orbiteur</button><button id="nav-c-astre"></button><button id="nav-c-cible" class="cache"></button></span>
        <label class="groupe"><input type="checkbox" id="nav-masque"> Grosses lunes seulement</label>
        <button id="nav-encyclo">📖 Astres</button>
        <button id="nav-pause">⏸</button>
        <button id="nav-hangar">← Accueil</button>
      </div>
      <div class="panneau gauche" id="nav-etat"></div>
      <div class="panneau droite" id="nav-actions"></div>
      <div class="aide-nav">Molette : zoom · glisser : déplacer · clic : fiche d’un astre · double-clic : centrer · F : revenir à l’orbiteur · +/− : temps${''}</div>`;
    $('nav-moins').onclick = () => this.changerWarp(-1);
    $('nav-plus').onclick = () => this.changerWarp(1);
    h.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { this.v.mode = b.dataset.mode; this.auto = false; this.avance = false; this.v.manette = 0; this.majHud(true); }; });
    $('nav-masque').onchange = () => this.contexte.basculerMasque();
    $('nav-c-orb').onclick = () => this.centrerSur('orbiteur');
    $('nav-c-astre').onclick = () => this.centrerSur(this.v.orb.centre);
    $('nav-c-cible').onclick = () => { if (this.v.cible) this.centrerSur(this.v.cible); };
    $('nav-encyclo').onclick = () => Infos.ouvrirEncyclopedie();
    $('nav-pause').onclick = () => this.contexte.basculerPause();
    $('nav-hangar').onclick = () => this.contexte.hangar();
    this.majHud(true);
  },

  changerWarp(sens) {
    this.avance = false;   // le joueur reprend la main sur le temps
    const i = PALIERS_NAV.indexOf(this.v.warp);
    this.v.warp = PALIERS_NAV[Math.max(0, Math.min(PALIERS_NAV.length - 1, (i < 0 ? 0 : i) + sens))];
    this.majHud(true);
  },

  // Conception de l'atterrisseur : calculée hors de l'affichage (vols d'essai), puis gardée en mémoire.
  conceptionPour(a) {
    if (cacheConception[a.id]) return cacheConception[a.id];
    if (!this.conceptionEnCours) {
      this.conceptionEnCours = true;
      setTimeout(() => { concevoirAtterrisseur(a); this.conceptionEnCours = false; this.majHud(true); }, 30);
    }
    return null;
  },

  // Ce qu'il faut faire ensuite, pour guider le joueur.
  objectif() {
    const v = this.v;
    if (!v.stations.some((s) => s.terrestre) && v.orb.centre === 'terre') return 'Construisez la station spatiale en orbite terrestre (bouton 🏗).';
    if (!Object.keys(v.visites).some((id) => v.visites[id].pose)) return 'Choisissez une cible (la Lune ?), allez-y, posez-vous et rapportez des échantillons.';
    if (Object.keys(v.echantillonsABord).length) return 'Échantillons à bord : rentrez sur Terre pour les rapporter (cible Terre, puis 🏠).';
    if (v.stations.length < 2) return 'Construisez une station autour d’un autre astre : elle sera ravitaillée depuis la Terre.';
    if (!v.bases.length) return 'Posez-vous sous une de vos stations et construisez une base (touche B une fois posé).';
    return '';
  },

  majHud(force) {
    if (!this.v || !this.v.orb) return;
    const now = performance.now();
    if (!force && now - this.derniereMaj < 150) return;
    this.derniereMaj = now;
    const v = this.v, o = v.orb, c = ASTRES_PAR_ID[o.centre];
    const el = elements(o.r, o.v, c.gm);
    const w = this.warpAffiche || v.warp;
    $('nav-date').textContent = fmtDate(v.t);
    const hb = document.querySelector('#hud-nav .barre-haut').offsetHeight + 16;
    for (const id of ['nav-etat', 'nav-actions']) { $(id).style.top = hb + 'px'; $(id).style.maxHeight = `calc(100vh - ${hb + 40}px)`; }
    // Le panneau de gauche laisse la place à la mini-carte en bas.
    $('nav-etat').style.maxHeight = `calc(100vh - ${hb + Math.min(200, Math.max(120, innerHeight * 0.3)) + 70}px)`;
    $('nav-warp').textContent = `×${fmtNombre(w, 0)} (1 s = ${fmtDuree(w)})`;
    $('nav-masque').checked = this.contexte.masque();
    $('nav-c-astre').textContent = c.nom;
    $('nav-c-cible').classList.toggle('cache', !v.cible || v.cible === o.centre);
    if (v.cible) $('nav-c-cible').textContent = ASTRES_PAR_ID[v.cible].nom;
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
      ['Carburant', `${fmt(v.carburant / 1000, 1)} t (Δv ${fmtV(dvRestant)})`],
      ['Ergols atterrisseur', `${fmt(v.ergolsAtt / 1000, 1)} t`],
      ['Atterrisseurs / robots', `${v.atterrisseurs} / ${v.robots}`],
      ['Sondes', `${v.sondes}`],
      ['Kits station / base', `${v.kits} / ${v.kitsBase}`],
    ];
    const ech = Object.entries(v.echantillonsABord);
    if (ech.length) lignes.push(['Échantillons à bord', ech.map(([id, n]) => `${n} ${ASTRES_PAR_ID[id].nom}`).join(', ')]);
    if (v.provisions.fleurs + v.provisions.fruits) lignes.push(['Douceurs de la Terre', `${v.provisions.fleurs} 🌸 ${v.provisions.fruits} 🍎`]);
    let html = '<h3>Orbiteur</h3><dl>' + lignes.map(([k, x]) => `<dt>${k}</dt><dd>${x}</dd>`).join('') + '</dl>';
    if (v.mode === 'libre') {
      html += `<h3>Pilotage libre</h3>
        <div class="orientations">${Object.entries(ORIENTATIONS).map(([k, t], i) => `<button data-ori="${k}" class="${v.orientation === k ? 'choisi' : ''}">${i + 1}. ${t}</button>`).join('')}</div>
        <div class="manette"><span>Gaz ${fmt(v.manette * 100)} %</span><div class="barre-gaz"><div style="width:${v.manette * 100}%"></div></div></div>
        <p class="doux">Z/S ou ↑↓ : gaz · X : couper · 1-6 : orientation. Temps limité à ×1 000 pendant la poussée.</p>`;
    }
    $('nav-etat').innerHTML = html;
    $('nav-etat').querySelectorAll('[data-ori]').forEach((b) => { b.onclick = () => { v.orientation = b.dataset.ori; this.majHud(true); }; });

    // Panneau de droite : objectif, cible, plan, actions
    let d = '';
    const objectif = this.objectif();
    if (objectif) d += `<div class="objectif">🎯 ${objectif}</div>`;
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
    const fermee = this.orbiteFermee();
    if (c.id === 'terre' && fermee) d += `<button id="nav-rentrer" class="principal">🏠 Rentrer sur Terre (capsule)</button>`;
    if (this.peutDescendre()) {
      // L'atterrisseur est conçu pour l'astre : on ne descend que si l'on peut repartir.
      const conc = this.conceptionPour(c);
      if (!conc) d += `<p class="doux">⏳ Conception de l’atterrisseur pour ${c.nom} (vols d’essai)…</p>`;
      else if (conc.ok) {
        const manque = v.ergolsAtt < conc.fusee.carburant;
        d += `<button id="nav-descendre" ${manque ? 'disabled' : ''}>⬇ Descendre sur ${c.nom}</button>`;
        d += `<p class="doux">Atterrisseur conçu pour ${c.nom} : ${descriptionConception(conc)}. Ergols : ${fmt(conc.fusee.carburant / 1000, 1)} t${manque ? ' — <b style="color:var(--alerte)">réserve insuffisante, ravitaillez à une station</b>' : ''}.</p>`;
      } else d += `<p class="doux">⚠ ${conc.raison}</p>`;
      if (c.type === 'solide' && v.robots > 0) d += `<button id="nav-robot">🤖 Larguer un robot (aller simple)</button>`;
    }
    const st = this.stationIci();
    if (st) {
      d += `<button id="nav-amarrer">⚓ S’amarrer à ${st.nom}</button>`;
      const k = st.stock;
      d += `<p class="doux">Stock de ${st.nom} : ${fmt(k.carburant / 1000)} t carburant, ${fmt(k.ergols / 1000)} t ergols, ${k.sondes} sondes, ${k.atterrisseurs} atterrisseurs, ${k.robots} robots, ${k.kitsBase} kits de base${st.terrestre ? `, ${k.kits} kits de station` : ''}. Prochain cargo de la Terre dans ${fmtDuree(st.prochainCargo - v.t)}.</p>`;
    }
    if (v.kits > 0 && fermee && c.type !== 'etoile') d += `<button id="nav-station" ${!st && c.id === 'terre' ? 'class="principal"' : ''}>🏗 Construire une station ici</button>`;
    if (v.cible && v.sondes > 0) d += `<button id="nav-sonde">🛰 Sonde vers ${ASTRES_PAR_ID[v.cible].nom}</button>`;
    d += `<button id="nav-journal">📜 Journal</button></div>`;
    const bases = v.bases.filter((b) => ancetres(b.astre).includes(c.id) || b.astre === c.id);
    if (bases.length) d += '<h3>Bases</h3><ul class="sondes">' + bases.map((b) => { const a = ASTRES_PAR_ID[b.astre]; const [res, p] = ressourceLocale(a); return `<li>Base ${a.nom} — ${p ? `${res}, ${fmt(p / 1000, 1)} t/jour, ${fmt((b.stock || 0) / 1000, 1)} t en réserve` : 'pas de ressource locale'}</li>`; }).join('') + '</ul>';
    const sondes = v.sondesEnVol;
    if (sondes.length) d += '<h3>Sondes</h3><ul class="sondes">' + sondes.map((s) => `<li>${s.nom} — ${s.etat === 'vol' ? 'en route' : 'en orbite'}</li>`).join('') + '</ul>';
    $('nav-actions').innerHTML = d;
    const bind = (id, f) => { const b = $(id); if (b) b.onclick = f; };
    bind('nav-avancer', () => { this.avance = !this.avance; this.majHud(true); });
    bind('nav-executer', () => { this.executerEtape(); this.majHud(true); });
    bind('nav-auto', () => { this.auto = !this.auto; this.majHud(true); });
    bind('nav-descendre', () => this.contexte.descendre(o.centre));
    bind('nav-robot', () => this.contexte.larguerRobot(o.centre));
    bind('nav-rentrer', () => this.contexte.rentrer());
    bind('nav-amarrer', () => { this.amarrer(); this.majHud(true); });
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
