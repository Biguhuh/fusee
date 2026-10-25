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
    // En temps accéléré, les événements s'enchaînent : on les laisse plus longtemps à l'écran.
    this.messages.push({ texte, vie: (this.warpAffiche || this.v.warp) >= 10 ? 12 : 7 });
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
    this.prevision = null;   // la trajectoire vient de changer
    this.etape = null;
  },

  // ---------- Sondes ----------
  lancerSonde(cibleId) {
    const v = this.v;
    if (v.sondes <= 0) return this.log('Plus de sonde à bord.');
    const c = ASTRES_PAR_ID[cibleId];
    v.sondes--;
    const n = v.sondesEnVol.length + 1;
    const id = 'p' + Date.now();
    v.sondesEnVol.push({ id, nom: `Sonde ${n} → ${c.nom}`, cible: cibleId, centre: v.orb.centre, r: v.orb.r.slice(), v: v.orb.v.slice(), transfert: null, etat: 'vol', tLancement: v.t });
    this.log(`Sonde lancée vers ${c.nom}. Sa trajectoire prévue s’affiche (« ✕ Trajectoire » pour revenir).`);
    this.ouvrirTrajet(id);
  },

  // Ravito : un cargo part de la Terre (ou d'une station) vers une station, sur sa propre trajectoire.
  // contenu : { cle: quantité } ; origineId : 'terre' ou l'id d'une station (qui fournit le contenu).
  lancerCargo(origineId, destId, contenu, nom) {
    const v = this.v;
    const dest = v.stations.find((s) => s.id === destId);
    if (!dest) return this.log('Station de destination introuvable.');
    let depart;
    if (origineId === 'terre') {
      const st = v.stations.find((s) => s.terrestre);
      if (st) depart = this.etatStation(st);
      else { const r0 = ASTRES_PAR_ID.terre.rayonKm + 400; depart = { centre: 'terre', r: [0, -r0], v: [Math.sqrt(ASTRES_PAR_ID.terre.gm / r0), 0] }; }
    } else {
      const st = v.stations.find((s) => s.id === origineId);
      if (!st) return this.log('Station de départ introuvable.');
      for (const [cle, q] of Object.entries(contenu)) if ((st.stock[cle] || 0) < q) return this.log(`${st.nom} n’a pas assez de ${NOMS_STOCK[cle]} pour ce cargo.`);
      for (const [cle, q] of Object.entries(contenu)) st.stock[cle] -= q;
      depart = this.etatStation(st);
    }
    v.cargos = v.cargos || [];
    const origine = origineId === 'terre' ? 'la Terre' : v.stations.find((s) => s.id === origineId).nom;
    const id = 'c' + Date.now();
    v.cargos.push({
      id, nom: `${nom} → ${dest.nom}`, type: 'cargo', cible: dest.centre, dest: destId, contenu,
      centre: depart.centre, r: depart.r.slice(), v: depart.v.slice(), transfert: null, etat: 'vol', tLancement: v.t,
    });
    this.log(`Cargo « ${nom} » lancé depuis ${origine} vers ${dest.nom} : ${decrireContenu(contenu)}.`);
    this.ouvrirTrajet(id);
  },

  mettreAJourSondes(dt) {
    const v = this.v;
    v.cargos = v.cargos || [];
    for (const s of [...v.sondesEnVol, ...v.cargos]) {
      try { this.avancerSonde(s, dt); } catch (e) {
        // Un vaisseau dont le calcul échoue ne doit pas bloquer tout le jeu.
        console.error(s.nom, e);
        s.etat = 'perdue';
        this.log(`${s.nom} : erreur de navigation, contact perdu.`);
      }
    }
    v.sondesEnVol = v.sondesEnVol.filter((s) => s.etat !== 'perdue' || v.t - s.tLancement < 0);
    v.cargos = v.cargos.filter((s) => s.etat === 'vol');
  },

  avancerSonde(s, dt) {
    const v = this.v;
    {
      if (s.etat !== 'vol') {
        // Sonde arrivée : elle reste en orbite autour de sa cible (orbite fermée, propagation directe).
        if (s.tSonde === undefined) s.tSonde = v.t;
        const p = propager(s.r, s.v, v.t - s.tSonde, ASTRES_PAR_ID[s.centre].gm);
        s.r = p.r; s.v = p.v; s.tSonde = v.t;
        return;
      }
      // Une étape relue depuis la sauvegarde a perdu son calcul de poussée (fonction) : on la recalcule.
      if (s.etape && !s.etape.attenteEvenement && typeof s.etape.dv !== 'function' && !['fini', 'impossible'].includes(s.etape.type)) s.etape = null;
      // La sonde rattrape le temps commun, en s'arrêtant à chaque manœuvre et changement de sphère d'influence.
      if (s.tSonde === undefined) s.tSonde = v.t - dt;
      for (let boucle = 0; boucle < 20 && s.etat === 'vol'; boucle++) {
        if (!s.etape) s.etape = prochaineEtape(s, s.tSonde, s.cible);
        const e = s.etape;
        if (e.type === 'fini') {
          s.etat = 'arrivee';
          if (s.type === 'cargo') { this.livrerRavito(s); break; }
          v.visites[s.cible] = { ...(v.visites[s.cible] || {}), sonde: s.tSonde };
          this.reperer(s);
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
  },

  // Cargo arrivé : son contenu rejoint le stock de la station.
  livrerRavito(c) {
    const st = this.v.stations.find((s) => s.id === c.dest);
    if (!st) return this.log(`${c.nom} : station introuvable, cargo perdu.`);
    ajouterAuStock(st, c.contenu);
    this.log(`Cargo arrivé à ${st.nom} après ${fmtDuree(this.v.t - c.tLancement)} : ${decrireContenu(c.contenu)}.`);
  },

  // Sonde en orbite : elle cartographie l'astre, repère une zone plate pour une base et ce qu'on peut y extraire.
  reperer(s) {
    const v = this.v, a = ASTRES_PAR_ID[s.cible];
    v.sites = v.sites || {};
    let texte = `${s.nom} est en orbite : données de ${a.nom} reçues.`;
    if (a.type === 'solide' && a.id !== 'terre') {
      const x = chercherZonePlate(a);
      const [ressource, prod] = ressourceLocale(a);
      if (x !== null) {
        v.sites[a.id] = { x, ressource, prod, t: v.t };
        texte += ` Zone plate pour une base repérée à ${fmtAlt(Math.abs(x))} du point de descente habituel.` +
          (prod ? ` Ressource détectée : ${ressource}.` : ' Aucune ressource exploitable détectée : tout viendra de la Terre.');
      } else texte += ' Aucune zone assez plate pour une base.';
    }
    this.log(texte);
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
      stock: STOCK_VIDE(),
      prochainCargo: v.t + intervalleCargo(c.id),
    };
    v.stations.push(st);
    this.log(`${st.nom} construite en orbite de ${c.nom}. Premier ravitaillement depuis la Terre dans ${fmtDuree(st.prochainCargo - v.t)}.`);
  },

  // Cargos venus de la Terre et production des bases au sol.
  mettreAJourLogistique() {
    const v = this.v;
    for (const s of v.stations) {
      s.stock = { ...STOCK_VIDE(), ...(s.stock || {}) };
      if (!s.prochainCargo) s.prochainCargo = v.t + intervalleCargo(s.centre);
      let n = 0;
      while (v.t >= s.prochainCargo && n++ < 50) {
        livrerCargo(s);
        s.prochainCargo += intervalleCargo(s.centre);
        if (n === 1) this.log(`Ravitaillement courant arrivé à ${s.nom}.`);
      }
    }
    for (const b of v.bases) {
      const dt = v.t - (b.tMaj || v.t);
      b.tMaj = v.t;
      if (dt <= 0) continue;
      const a = ASTRES_PAR_ID[b.astre];
      b.niveau = b.niveau || 1;
      const st = v.stations.find((s) => s.centre === b.astre);
      // Les extensions livrées à la station descendent agrandir la base (niveau 5 au plus).
      if (st && st.stock.extensions > 0 && b.niveau < 5) {
        st.stock.extensions--;
        b.niveau++;
        this.log(`Base ${a.nom} agrandie : niveau ${b.niveau}${b.niveau === 2 ? ' — la mine de matériaux démarre' : ''}.`);
      }
      // Ergols (ressource locale) et matériaux (mine), proportionnels au niveau de la base.
      const prod = productionBase(a) * b.niveau * (dt / JOUR);
      const mat = productionMateriaux(a, b.niveau) * (dt / JOUR);
      if (st && mat > 0) st.stock.materiaux = Math.min(CAPACITES_STATION.materiaux, st.stock.materiaux + mat);
      b.materiauxTotal = (b.materiauxTotal || 0) + mat;
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

  // Fenêtre « Envoyer un ravito » : départ, destination, contenu.
  ouvrirRavito() {
    const v = this.v;
    const m = $('modale');
    const options = (liste) => liste.map(([val, txt]) => `<option value="${val}">${txt}</option>`).join('');
    const origines = [['terre', 'La Terre (lanceur cargo)'], ...v.stations.map((s) => [s.id, s.nom])];
    const dests = v.stations.map((s) => [s.id, `${s.nom} (${ASTRES_PAR_ID[s.centre].nom})`]);
    m.innerHTML = `
      <div class="fenetre">
        <header class="entete"><div><h2>📦 Envoyer un ravito</h2><p>Le cargo part sur sa propre trajectoire et livre son contenu au stock de la station de destination. Depuis une station, il emporte ce qu’elle a en stock.</p></div><button class="fermer">✕</button></header>
        <div class="sections">
          <section><h3>Départ</h3><select id="rav-origine">${options(origines)}</select>
            <h3 style="margin-top:12px">Destination</h3><select id="rav-dest">${options(dests)}</select></section>
          <section><h3>Contenu</h3>${Object.entries(CONTENUS_CARGO).map(([k, c], i) => `<label class="choix-ravito"><input type="radio" name="rav-contenu" value="${k}" ${i === 0 ? 'checked' : ''}> <b>${c.nom}</b><br><span class="doux">${c.description}<br>${decrireContenu(c.contenu)}</span></label>`).join('')}</section>
        </div>
        <p id="rav-info" class="doux"></p>
        <div class="actions"><span></span><button id="rav-lancer" class="principal">🚀 Lancer le cargo</button></div>
      </div>`;
    m.classList.remove('cache');
    m.querySelector('.fermer').onclick = () => Infos.fermer();
    const info = () => {
      const o = $('rav-origine').value, d = $('rav-dest').value;
      const c = CONTENUS_CARGO[m.querySelector('input[name=rav-contenu]:checked').value].contenu;
      let t = '';
      if (o === d) t = 'Choisissez une destination différente du départ.';
      else if (o !== 'terre') {
        const st = v.stations.find((s) => s.id === o);
        const manque = Object.entries(c).filter(([k, q]) => (st.stock[k] || 0) < q).map(([k]) => NOMS_STOCK[k]);
        if (manque.length) t = `${st.nom} n’a pas assez de : ${manque.join(', ')}.`;
      }
      $('rav-info').textContent = t;
      $('rav-lancer').disabled = !!t;
    };
    m.querySelectorAll('select, input').forEach((e) => { e.onchange = info; });
    info();
    $('rav-lancer').onclick = () => {
      const k = m.querySelector('input[name=rav-contenu]:checked').value;
      this.lancerCargo($('rav-origine').value, $('rav-dest').value, { ...CONTENUS_CARGO[k].contenu }, CONTENUS_CARGO[k].nom);
      Infos.fermer();
      this.majHud(true);
    };
  },

  // Atelier d'une station : fabrique un élément avec les matériaux du stock.
  fabriquer(stationId, cle) {
    const st = this.v.stations.find((s) => s.id === stationId);
    const r = RECETTES[cle];
    if (!st || !r) return;
    if (st.stock.materiaux < r.materiaux) return this.log(`${st.nom} : pas assez de matériaux pour un(e) ${r.nom.toLowerCase()} (${fmtStock('materiaux', r.materiaux)} nécessaires).`);
    if ((st.stock[cle] || 0) >= CAPACITES_STATION[cle]) return this.log(`${st.nom} : stock de ${NOMS_STOCK[cle]} plein.`);
    st.stock.materiaux -= r.materiaux;
    st.stock[cle] = (st.stock[cle] || 0) + 1;
    this.log(`Atelier de ${st.nom} : ${r.nom.toLowerCase()} fabriqué(e) avec ${fmtStock('materiaux', r.materiaux)} de matériaux.`);
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
    if (id === 'orbiteur' && !this.v.orb) id = 'terre';
    this.cam.focus = id;
    this.cam.decal = [0, 0];
    let taille;
    if (id === 'orbiteur' || id.startsWith('obj:')) {
      // Un vaisseau : on cadre son orbite autour de l'astre qu'il survole.
      const o = id === 'orbiteur' ? this.v.orb : this.objetSuivi(id.slice(4));
      if (!o) return this.centrerSur('orbiteur');
      const a = ASTRES_PAR_ID[o.centre];
      taille = Math.max(V.norm(o.r) * 3, a.rayonKm * 4);
      if (a.type === 'etoile') taille = Math.max(V.norm(o.r) * 0.25, 2e6);   // en croisière : la région autour
    } else {
      const a = ASTRES_PAR_ID[id];
      taille = ENFANTS[id] ? Math.max(...ENFANTS[id].filter((c) => c.grosse).map((c) => c.orbite.a), a.rayonKm * 10) * 2.4 : a.rayonKm * 30;
      if (id === 'soleil') taille = 70 * UA_KM;
    }
    this.cam.echelle = Math.min(innerWidth, innerHeight) / taille;
  },

  // Ce que la caméra peut suivre en plus des astres : sondes, ravitos, stations.
  // Renvoie { nom, centre, r, pos (position absolue), genre } ou null.
  objetSuivi(id) {
    const v = this.v;
    const vs = [...v.sondesEnVol, ...(v.cargos || [])].find((o) => o.id === id);
    if (vs) return { nom: vs.nom, centre: vs.centre, r: vs.r, pos: this.absolu(vs), genre: vs.type === 'cargo' ? 'cargo' : 'sonde', vaisseau: vs };
    const st = v.stations.find((s) => s.id === id);
    if (st) { const e = this.etatStation(st); return { nom: st.nom, centre: st.centre, r: e.r, pos: V.add(etatAbsolu(st.centre, v.t).r, e.r), genre: 'station' }; }
    return null;
  },

  // Position absolue du point de vue, et astre « principal » de la vue (pour la mini-carte).
  positionVue() {
    const f = this.cam.focus, v = this.v;
    if (f === 'orbiteur') return v.orb ? this.absolu(v.orb) : etatAbsolu('terre', v.t).r;
    if (f.startsWith('trajet:')) return this.trajet ? this.trajet.centre : [0, 0];
    if (f.startsWith('obj:')) {
      const o = this.objetSuivi(f.slice(4));
      if (o) return o.pos;
      // L'objet n'existe plus (ravito livré, sonde perdue) : retour à l'orbiteur.
      this.cam.focus = 'orbiteur';
      return this.positionVue();
    }
    return etatAbsolu(f, v.t).r;
  },
  astreDeLaVue() {
    const f = this.cam.focus;
    if (f === 'orbiteur') return this.v.orb ? this.v.orb.centre : 'terre';
    if (f.startsWith('trajet:')) return 'soleil';
    if (f.startsWith('obj:')) { const o = this.objetSuivi(f.slice(4)); return o ? o.centre : 'soleil'; }
    return f;
  },

  // ---------- Trajectoire prévue d'une sonde ou d'un ravito ----------
  // On rejoue le planificateur sur une copie du vaisseau jusqu'à l'arrivée, en notant les points
  // de la trajectoire (positions absolues) et chaque événement qui la modifie.
  planTrajet(vs) {
    const s = JSON.parse(JSON.stringify({ centre: vs.centre, r: vs.r, v: vs.v, transfert: vs.transfert || null }));
    const cible = vs.cible;
    let t = vs.tSonde !== undefined ? vs.tSonde : this.v.t;
    const t0 = t, tMax = t + 40 * 365.25 * JOUR;
    const pts = [], marques = [];
    const abs = () => V.add(etatAbsolu(s.centre, t).r, s.r);
    const marquer = (type, texte, extra = {}) => marques.push({ type, texte, t, p: abs(), ...extra });
    pts.push(abs());
    marquer('depart', `Départ de l’orbite de ${ASTRES_PAR_ID[s.centre].nom}`);
    let fin = null;
    // Même logique que le vol réel (avancerSonde) : une étape est gardée jusqu'à son exécution.
    // (On ne reprend pas l'étape du vrai vaisseau : sa poussée modifierait le vrai vaisseau, pas la copie.)
    let e = null;
    for (let boucle = 0; boucle < 80 && !fin; boucle++) {
      if (!e) e = prochaineEtape(s, t, cible);
      if (e.type === 'fini') { fin = 'arrivee'; marquer('arrivee', e.texte); break; }
      if (e.type === 'impossible') { fin = 'impossible'; marquer('impossible', e.texte); break; }
      if (!e.attenteEvenement && t >= e.tExec - 1e-3) {
        const dv = e.dv(s, t);
        appliquerImpulsion(s, dv);
        marquer('manoeuvre', e.texte.split(' : ')[0], { dv: V.norm(dv) * 1000 });
        e = null;
        continue;
      }
      // Événement attendu (sortie de sphère, arrivée) : on avance jusqu'à lui, ou d'au moins un jour s'il est en retard.
      const tFin = e.attenteEvenement ? Math.min(tMax, Math.max(e.tExec, t + JOUR) + Math.max(3600, 0.1 * (e.tExec - t))) : e.tExec;
      if (tFin <= t) { t += 60; continue; }
      // Découpage en petits pas pour dessiner une courbe lisse.
      // Le dernier pas tombe exactement sur tFin (sinon les arrondis empêchent d'atteindre la manœuvre).
      const n = 48, debut = t;
      for (let k = 0; k < n; k++) {
        const tn = k === n - 1 ? tFin : debut + ((tFin - debut) * (k + 1)) / n;
        const h = tn - t;
        const ev = [];
        const res = avancerVaisseau(s, t, h, ev, true);
        if (res === 'impact') { fin = 'impact'; t = tn; pts.push(abs()); marquer('impact', `Impact sur ${ASTRES_PAR_ID[s.centre].nom}`); break; }
        if (res === 'changement') {
          const x = ev[ev.length - 1];
          t = x.t;
          pts.push(abs());
          marquer('soi', x.type === 'entree' ? `Entrée dans la sphère d’influence de ${ASTRES_PAR_ID[x.vers].nom}` : `Sortie de la sphère d’influence de ${ASTRES_PAR_ID[x.de].nom}`);
          e = null;
          break;
        }
        t = tn;
        pts.push(abs());
      }
      if (e && e.attenteEvenement) e = null;   // événement en retard : on recalcule, comme le vol réel
      if (t >= tMax) { fin = 'trop-long'; break; }
    }
    return { pts, marques, t0, tFin: t, fin, cible, nom: vs.nom, id: vs.id };
  },

  // Ouvre la vue « trajectoire » : départ, arrivée et le trajet entre les deux, avec ses manœuvres.
  ouvrirTrajet(id) {
    const o = this.objetSuivi(id);
    if (!o || !o.vaisseau) return;
    const plan = this.planTrajet(o.vaisseau);
    // Cadre : tous les points du trajet, l'astre de départ maintenant et la cible à l'arrivée.
    const boite = [...plan.pts, etatAbsolu(o.vaisseau.centre, this.v.t).r, etatAbsolu(plan.cible, plan.tFin).r];
    const xs = boite.map((p) => p[0]), ys = boite.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    this.trajet = { ...plan, centre: [(x0 + x1) / 2, (y0 + y1) / 2] };
    this.cam.focus = 'trajet:' + id;
    this.cam.decal = [0, 0];
    const marge = 1.25;
    // Place utile : l'écran moins les panneaux latéraux et la légende (au moins 200 × 150 px).
    const Lw = Math.max(200, innerWidth - 560), Lh = Math.max(150, innerHeight - 260);
    this.cam.echelle = Math.min(Lw / ((x1 - x0) * marge || 1), Lh / ((y1 - y0) * marge || 1));
    this.cam.echelle = Math.max(1e-10, Math.min(5, this.cam.echelle));
    // La légende occupe le bas de l'écran : on remonte le cadre d'autant.
    const hLegende = 26 + plan.marques.length * 17 + 70;
    this.cam.decal = [0, -hLegende / 2 / this.cam.echelle];
    this.majHud(true);
  },
  fermerTrajet() { this.trajet = null; if (this.cam.focus.startsWith('trajet:')) this.centrerSur('orbiteur'); },

  dessinerTrajet(ctx, ecran, W, H) {
    const tr = this.trajet, t = this.v.t;
    if (!tr) return;
    // Courbe : en pointillés cyan, la partie déjà parcourue plus pâle.
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = 'rgba(77,208,225,0.9)';
    ctx.beginPath();
    tr.pts.forEach((p, i) => { const q = ecran(p); if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
    ctx.stroke();
    ctx.setLineDash([]);
    // Cible à l'arrivée
    const cible = ASTRES_PAR_ID[tr.cible];
    const pa = ecran(etatAbsolu(tr.cible, tr.tFin).r);
    ctx.strokeStyle = 'rgba(102,187,106,0.9)'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(pa[0], pa[1], 10, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(102,187,106,0.95)'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${cible.nom} à l’arrivée (${fmtDate(tr.tFin, false)})`, pa[0] + 13, pa[1] + 4);
    // Événements numérotés ; ceux déjà passés sont grisés. Les points trop proches à l'écran sont regroupés.
    const places = [];
    tr.marques.forEach((m, i) => {
      const q = ecran(m.p);
      const passe = m.t < t;
      const couleur = passe ? '#78909c' : { manoeuvre: '#ffca28', soi: '#4dd0e1', arrivee: '#66bb6a', depart: '#ff7043', impact: '#ff1744', impossible: '#ff1744' }[m.type] || '#fff';
      ctx.fillStyle = couleur;
      ctx.beginPath(); ctx.arc(q[0], q[1], m.type === 'manoeuvre' ? 6 : 4.5, 0, 2 * Math.PI); ctx.fill();
      let dy = 0;
      for (const p of places) if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 14) dy += 13;
      places.push(q);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(String(i + 1), q[0] + 8, q[1] - 6 + dy);
    });
    // Légende
    const lignes = tr.marques.map((m, i) => `${i + 1}. ${fmtDate(m.t, false)} · ${m.texte}${m.dv ? ` (${fmtV(m.dv)})` : ''}`);
    const titre = `Trajectoire de ${tr.nom} · durée ${fmtDuree(tr.tFin - tr.t0)}` + (tr.fin !== 'arrivee' ? ' · ⚠ n’arrive pas' : '');
    ctx.font = '12px system-ui, sans-serif';
    const L = Math.max(ctx.measureText(titre).width, ...lignes.map((l) => ctx.measureText(l).width)) + 24;
    // En bas au centre, au-dessus des messages et de l'aide.
    const hBoite = 26 + lignes.length * 17;
    const x0 = Math.max(8, W / 2 - L / 2), y0 = Math.max(110, H - 70 - hBoite);
    this.hautLegende = y0;
    ctx.fillStyle = 'rgba(8,12,24,0.85)'; ctx.fillRect(x0, y0, L, hBoite);
    ctx.strokeStyle = 'rgba(77,208,225,0.6)'; ctx.strokeRect(x0, y0, L, hBoite);
    ctx.fillStyle = '#4dd0e1'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillText(titre, x0 + 12, y0 + 17);
    ctx.font = '12px system-ui, sans-serif';
    lignes.forEach((l, i) => { ctx.fillStyle = tr.marques[i].t < t ? '#78909c' : '#dfe8ff'; ctx.fillText(l, x0 + 12, y0 + 36 + i * 17); });
  },

  // Fenêtre « Vues » : tout ce qu'on peut regarder.
  ouvrirVues() {
    const v = this.v, m = $('modale');
    const bouton = (vue, texte, principal) => `<button data-vue="${vue}" ${principal ? 'class="principal"' : ''}>${texte}</button>`;
    const ligne = (titre, boutons) => `<div class="ligne-vue"><span>${titre}</span><span>${boutons}</span></div>`;
    const enVol = [...v.sondesEnVol.filter((s) => s.etat !== 'perdue'), ...(v.cargos || [])];
    const section = (titre, contenu) => `<section><h3>${titre}</h3>${contenu || '<p class="doux">Aucun pour l’instant.</p>'}</section>`;
    m.innerHTML = `
      <div class="fenetre">
        <header class="entete"><div><h2>👁 Vues</h2><p>Choisissez ce que la carte suit. « Trajectoire » montre le trajet prévu d’un vaisseau, du départ à l’arrivée, avec ses manœuvres.</p></div><button class="fermer">✕</button></header>
        <div class="sections">
          ${section('Expédition', (v.orb ? ligne('🚀 Orbiteur', bouton('astre:orbiteur', 'Suivre', true)) + ligne(`🪐 ${ASTRES_PAR_ID[v.orb.centre].nom} (astre survolé)`, bouton('astre:' + v.orb.centre, 'Centrer')) : '') +
            (v.cible ? ligne(`🎯 ${ASTRES_PAR_ID[v.cible].nom} (cible)`, bouton('astre:' + v.cible, 'Centrer')) : '') +
            ligne('☀ Tout le système solaire', bouton('astre:soleil', 'Centrer')) + ligne('🌍 Terre', bouton('astre:terre', 'Centrer')))}
          ${section('Sondes et ravitos en route', enVol.map((o) => ligne(`${o.type === 'cargo' ? '📦' : '🛰'} ${o.nom}${o.etat === 'arrivee' ? ' (en orbite)' : ''}`,
            bouton('obj:' + o.id, 'Suivre') + (o.etat === 'vol' ? bouton('trajet:' + o.id, 'Trajectoire', true) : ''))).join(''))}
          ${section('Stations', v.stations.map((s) => ligne(`🛰 ${s.nom}`, bouton('obj:' + s.id, 'Suivre'))).join(''))}
          ${section('Bases', v.bases.map((b) => ligne(`🏠 Base sur ${ASTRES_PAR_ID[b.astre].nom} (niveau ${b.niveau || 1})`, bouton('astre:' + b.astre, 'Centrer'))).join(''))}
        </div>
      </div>`;
    m.classList.remove('cache');
    m.querySelector('.fermer').onclick = () => Infos.fermer();
    m.querySelectorAll('[data-vue]').forEach((b) => {
      b.onclick = () => {
        const [genre, id] = b.dataset.vue.split(':');
        Infos.fermer();
        if (genre === 'trajet') return this.ouvrirTrajet(id);
        this.trajet = null;
        this.centrerSur(genre === 'obj' ? 'obj:' + id : id);
      };
    });
  },

  // ---------- Rendu ----------
  dessiner(ctx, W, H) {
    const v = this.v, t = v.t, s = this.cam.echelle;
    const focus = this.positionVue();
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
      if (a.type === 'etoile' || rr < 3.5) {
        ctx.fillStyle = a.couleurs.disque;
        ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, 2 * Math.PI); ctx.fill();
        if (a.id === 'saturne') dessinerAnneaux(ctx, p[0], p[1], Math.max(rr, 2), 'pole');
      } else {
        // Vu du pôle Nord, éclairé par le Soleil ; une lune synchrone montre toujours la même face à sa planète.
        const pa = etatAbsolu(a.id, t).r;
        const versSoleil = V.unit(V.mul(pa, -1));
        let lon0;
        if (ROTATION_H[a.id] || !a.parent) lon0 = longitudeVue(a, t);
        else {
          const pp = etatAbsolu(a.parent, t).r;
          lon0 = (Math.atan2(pp[0] - pa[0], -(pp[1] - pa[1])) * 180) / Math.PI;
        }
        // Le Soleil un peu « au-dessus » (inclinaison de l'axe, comme en été boréal) : le pôle reste éclairé.
        dessinerGlobe(ctx, a, p[0], p[1], rr, { vue: 'pole', lon0, lumiere: [versSoleil[0], -versSoleil[1], 0.45] });
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
      // Taille : lisible de loin, plus détaillée quand on zoome sur son orbite.
      const taille = Math.max(9, Math.min(22, s * V.norm(e.r) * 0.08));
      // Poutre perpendiculaire au rayon, comme l'ISS qui garde ses panneaux face au Soleil.
      dessinerIconeStation(ctx, p[0], p[1], taille, -Math.atan2(e.r[1], e.r[0]), st.terrestre, t);
      ctx.fillStyle = 'rgba(255,220,150,0.9)';
      ctx.font = '11px system-ui, sans-serif';
      if (s * V.norm(e.r) > 30) ctx.fillText(st.nom, p[0] + taille + 4, p[1] + taille * 0.6 + 8);
    }

    // Sondes
    for (const sd of v.sondesEnVol) {
      const p = ecran(this.absolu(sd));
      if (!dansEcran(p)) continue;
      ctx.fillStyle = sd.etat === 'arrivee' ? '#80deea' : '#4dd0e1';
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - 5); ctx.lineTo(p[0] + 4, p[1] + 4); ctx.lineTo(p[0] - 4, p[1] + 4); ctx.fill();
      if (sd.etat === 'vol') { ctx.font = '10px system-ui, sans-serif'; ctx.fillText(sd.nom, p[0] + 6, p[1] + 3); }
    }

    // Ravitos en route
    for (const cg of v.cargos || []) {
      const p = ecran(this.absolu(cg));
      if (!dansEcran(p)) continue;
      ctx.fillStyle = '#ff9800';
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - 5); ctx.lineTo(p[0] + 5, p[1]); ctx.lineTo(p[0], p[1] + 5); ctx.lineTo(p[0] - 5, p[1]); ctx.fill();
      ctx.fillStyle = 'rgba(255,183,77,0.9)'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText('📦 ' + cg.nom, p[0] + 7, p[1] + 3);
    }

    // Trajectoire prévue de l'orbiteur
    // La prévision coûte quelques millisecondes : on la recalcule toutes les 150 ms (ou si l'on change de sphère d'influence).
    const maintenant = performance.now();
    if (!this.prevision || maintenant - this.prevision.quand > 150 || this.prevision.centre !== v.orb.centre || this.enPoussee()) {
      this.prevision = { quand: maintenant, centre: v.orb.centre, segs: predireTrajectoire(v.orb, t, 400 * 365.25 * JOUR, 260) };
    }
    const segs = this.prevision.segs;
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

    this.dessinerTrajet(ctx, ecran, W, H);
    // Vaisseau suivi (ou dont on regarde la trajectoire) : cercle qui pulse et nom.
    const suivi = this.cam.focus.startsWith('obj:') ? this.cam.focus.slice(4) : this.trajet ? this.trajet.id : null;
    const os = suivi && this.objetSuivi(suivi);
    if (os) {
      const q = ecran(os.pos), r = 11 + 3 * Math.sin(performance.now() / 200);
      ctx.strokeStyle = '#4dd0e1'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 2 * Math.PI); ctx.stroke();
      ctx.fillStyle = '#e0f7fa'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillText(os.nom, q[0] + r + 4, q[1] - r);
    }
    this.dessinerMiniCarte(ctx, W, H);

    // Échelle
    const kmPour100 = 100 / s;
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '11px system-ui';
    ctx.fillRect(W - 140, H - 30, 100, 2);
    ctx.fillText(kmPour100 > UA_KM / 10 ? fmt(kmPour100 / UA_KM, 2) + ' UA' : fmt(kmPour100) + ' km', W - 140, H - 36);

    // Messages, en bas au centre (au-dessus de la légende de trajectoire si elle est ouverte)
    let y = this.trajet && this.hautLegende ? this.hautLegende - 10 : H - 40;
    ctx.textAlign = 'center';
    ctx.font = '13px system-ui';
    const yMin = Math.min(H / 2, y - 140);
    for (let i = this.messages.length - 1; i >= 0 && y > yMin; i--) {
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
    const vu = this.astreDeLaVue();
    const a = ASTRES_PAR_ID[vu];
    this.mini = null;
    if (!a || !a.orbite) return;
    const principal = a.orbite.centre;
    const etendue = a.orbite.a * (1 + a.orbite.e) * 1.35;
    const L = Math.min(200, Math.max(110, H * 0.3), W * 0.36), x0 = 8, y0 = H - L - 52;
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
    const c0 = versMini(V.add(this.positionVue(), this.cam.decal));
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
        <span class="groupe">🎯 Centrer : <button id="nav-c-orb">Orbiteur</button><button id="nav-c-astre"></button><button id="nav-c-cible" class="cache"></button><button id="nav-vues">👁 Vues…</button><button id="nav-fermer-trajet" class="cache">✕ Trajectoire</button></span>
        <label class="groupe"><input type="checkbox" id="nav-masque"> Grosses lunes seulement</label>
        <span class="groupe petit-seul"><button id="nav-voir-etat">📊 État</button><button id="nav-voir-actions" class="principal">🎛 Actions</button></span>
        <button id="nav-encyclo">📖 Astres</button>
        <button id="nav-pause">⏸</button>
        <button id="nav-hangar">← Accueil</button>
      </div>
      <div class="panneau gauche" id="nav-etat"></div>
      <div class="panneau droite" id="nav-actions"></div>
      <div class="aide-nav">${ECRAN_TACTILE ? 'Un doigt : déplacer · deux doigts : zoomer · toucher un astre : sa fiche' : 'Molette : zoom · glisser : déplacer · clic : fiche d’un astre · double-clic : centrer · F : revenir à l’orbiteur · +/− : temps'}</div>`;
    $('nav-moins').onclick = () => this.changerWarp(-1);
    $('nav-plus').onclick = () => this.changerWarp(1);
    h.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { this.v.mode = b.dataset.mode; this.auto = false; this.avance = false; this.v.manette = 0; this.majHud(true); }; });
    $('nav-masque').onchange = () => this.contexte.basculerMasque();
    $('nav-c-orb').onclick = () => { this.trajet = null; this.centrerSur('orbiteur'); };
    $('nav-c-astre').onclick = () => { this.trajet = null; this.centrerSur(this.v.orb ? this.v.orb.centre : 'terre'); };
    $('nav-c-cible').onclick = () => { if (this.v.cible) { this.trajet = null; this.centrerSur(this.v.cible); } };
    $('nav-vues').onclick = () => this.ouvrirVues();
    // Petit écran : les panneaux sont repliés, ces boutons les ouvrent (un seul à la fois).
    const basculer = (id, autre) => { $(autre).classList.remove('ouvert'); $(id).classList.toggle('ouvert'); };
    $('nav-voir-etat').onclick = () => basculer('nav-etat', 'nav-actions');
    $('nav-voir-actions').onclick = () => basculer('nav-actions', 'nav-etat');
    $('nav-fermer-trajet').onclick = () => { this.fermerTrajet(); this.majHud(true); };
    $('nav-encyclo').onclick = () => Infos.ouvrirEncyclopedie();
    $('nav-pause').onclick = () => this.contexte.basculerPause();
    $('nav-hangar').onclick = () => this.contexte.hangar();
    // Panneaux tout neufs : on oublie leur ancien contenu.
    this.cachePanneaux = {};
    // Appui en cours sur l'interface : on ne la redessine pas sous le doigt (voir ecrirePanneau).
    // (écouteurs posés une seule fois : #hud-nav reste le même élément d'une expédition à l'autre)
    if (!this.ecoutesHud) {
      this.ecoutesHud = true;
      h.addEventListener('pointerdown', () => { this.pointeurBas = true; });
      addEventListener('pointerup', () => { this.pointeurBas = false; }, true);
      addEventListener('pointercancel', () => { this.pointeurBas = false; }, true);
      // Retour visuel immédiat sur chaque bouton, puis on lui retire le focus :
      // sinon Espace ou Entrée, utilisés par le jeu, « recliqueraient » ce bouton.
      h.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        b.classList.add('clique');
        setTimeout(() => b.classList.remove('clique'), 250);
        b.blur();
      });
    }
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

  // Réécrit un panneau seulement si son contenu a changé, et jamais pendant qu'on appuie dessus :
  // remplacer un bouton entre l'appui et le relâchement fait perdre le clic (bouton qui « ne répond pas »).
  ecrirePanneau(el, html) {
    this.cachePanneaux = this.cachePanneaux || {};
    if (this.cachePanneaux[el.id] === html) return false;
    if (this.pointeurBas) return false;
    el.innerHTML = html;
    this.cachePanneaux[el.id] = html;
    return true;
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
    $('nav-fermer-trajet').classList.toggle('cache', !this.trajet);
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
    this.ecrirePanneau($('nav-etat'), html);
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
    if (st) d += `<button id="nav-amarrer">⚓ S’amarrer à ${st.nom}</button>`;
    if (v.kits > 0 && fermee && c.type !== 'etoile') d += `<button id="nav-station" ${!st && c.id === 'terre' ? 'class="principal"' : ''}>🏗 Construire une station ici</button>`;
    if (v.cible && v.sondes > 0) d += `<button id="nav-sonde">🛰 Sonde vers ${ASTRES_PAR_ID[v.cible].nom} (repérage)</button>`;
    if (v.stations.length) d += `<button id="nav-ravito">📦 Envoyer un ravito</button>`;
    d += `<button id="nav-journal">📜 Journal</button></div>`;
    // Site repéré pour une base sur l'astre courant
    const site = (v.sites || {})[c.id];
    if (c.type === 'solide' && c.id !== 'terre') {
      d += site
        ? `<p class="doux">🟢 Zone de base repérée${site.prod ? ` — ${site.ressource}` : ' — pas de ressource locale'}. La descente la vise.</p>`
        : `<p class="doux">Aucune zone de base repérée sur ${c.nom} : envoyez une sonde.</p>`;
    }
    // Station de l'astre courant : stock, prochain ravitaillement courant, atelier
    if (st) {
      const k = st.stock;
      d += `<h3>${st.nom}</h3><dl>` + Object.keys(NOMS_STOCK).map((cle) => `<dt>${NOMS_STOCK[cle]}</dt><dd>${fmtStock(cle, k[cle] || 0)}</dd>`).join('') + '</dl>';
      d += `<p class="doux">Ravitaillement courant de la Terre dans ${fmtDuree(st.prochainCargo - v.t)}.</p>`;
      d += `<p class="doux"><b>Atelier</b> (avec les matériaux du stock) :</p><div class="orientations">` +
        Object.entries(RECETTES).map(([cle, r]) => `<button data-fab="${cle}" ${k.materiaux < r.materiaux ? 'disabled' : ''}>${r.nom} · ${fmtStock('materiaux', r.materiaux)}</button>`).join('') + '</div>';
    }
    const bases = v.bases.filter((b) => ancetres(b.astre).includes(c.id) || b.astre === c.id);
    if (bases.length) {
      d += '<h3>Bases</h3><ul class="sondes">' + bases.map((b) => {
        const a = ASTRES_PAR_ID[b.astre]; const [res, p] = ressourceLocale(a); const n = b.niveau || 1;
        const mat = productionMateriaux(a, n);
        return `<li>Base ${a.nom}, niveau ${n} — ${p ? `${res} : ${fmt((p * n) / 1000, 1)} t/jour` : 'pas de ressource locale'}${mat ? `, matériaux ${fmt(mat / 1000, 1)} t/jour` : ''} ; ${fmt((b.stock || 0) / 1000, 1)} t au sol</li>`;
      }).join('') + '</ul>';
    }
    const cargos = v.cargos || [];
    if (cargos.length) d += '<h3>Ravitos en route</h3><ul class="sondes">' + cargos.map((s) => `<li>${s.nom} (parti il y a ${fmtDuree(v.t - s.tLancement)})</li>`).join('') + '</ul>';
    const sondes = v.sondesEnVol;
    if (sondes.length) d += '<h3>Sondes</h3><ul class="sondes">' + sondes.map((s) => `<li>${s.nom} — ${s.etat === 'vol' ? 'en route' : 'en orbite'}</li>`).join('') + '</ul>';
    this.ecrirePanneau($('nav-actions'), d);
    $('nav-actions').querySelectorAll('[data-fab]').forEach((b) => { b.onclick = () => { this.fabriquer(st.id, b.dataset.fab); this.majHud(true); }; });
    const bRavito = $('nav-ravito');
    if (bRavito) bRavito.onclick = () => this.ouvrirRavito();
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
    if (e.code === 'KeyF') { this.trajet = null; this.centrerSur('orbiteur'); this.majHud(true); }
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

// Station spatiale vue de dessus : poutre centrale, quatre ailes de panneaux solaires,
// modules habitables au centre et radiateurs. taille : demi-envergure en pixels.
function dessinerIconeStation(ctx, x, y, taille, angle, terrestre, t) {
  const T = taille;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // Poutre
  ctx.fillStyle = '#9e9e9e';
  ctx.fillRect(-T, -T * 0.05, 2 * T, T * 0.1);
  // Panneaux solaires : deux paires à chaque bout, qui pivotent lentement pour suivre le Soleil.
  const pivot = 0.75 + 0.25 * Math.cos((t || 0) / 2800);
  for (const sx of [-0.82, -0.56, 0.56, 0.82]) {
    for (const sy of [-1, 1]) {
      const pw = T * 0.2, ph = T * 0.62 * pivot;
      const x0 = sx * T - pw / 2, y0 = sy > 0 ? T * 0.07 : -T * 0.07 - ph;
      ctx.fillStyle = '#1e4fa8';
      ctx.fillRect(x0, y0, pw, ph);
      ctx.strokeStyle = 'rgba(214,170,60,0.9)'; ctx.lineWidth = Math.max(0.5, T * 0.025);
      ctx.strokeRect(x0, y0, pw, ph);
      if (T > 12) {
        ctx.strokeStyle = 'rgba(140,180,255,0.6)'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let q = 1; q < 4; q++) { const yy = y0 + (ph * q) / 4; ctx.moveTo(x0, yy); ctx.lineTo(x0 + pw, yy); }
        ctx.stroke();
      }
    }
  }
  // Radiateurs (blancs, perpendiculaires)
  ctx.fillStyle = '#eceff1';
  for (const sx of [-0.3, 0.3]) ctx.fillRect(sx * T - T * 0.04, T * 0.06, T * 0.08, T * 0.32);
  // Modules pressurisés : un axe le long du rayon et un module en travers
  ctx.fillStyle = '#f5f5f5';
  ctx.strokeStyle = 'rgba(80,90,100,0.8)'; ctx.lineWidth = Math.max(0.5, T * 0.03);
  const mod = (cx, cy, w, h) => { ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, Math.min(w, h) * 0.45); ctx.fill(); ctx.stroke(); };
  mod(0, -T * 0.2, T * 0.16, T * 0.5);
  mod(0, T * 0.22, T * 0.16, T * 0.42);
  mod(-T * 0.16, -T * 0.1, T * 0.3, T * 0.13);
  // Nœud central et feu de position
  ctx.fillStyle = terrestre ? '#ffca28' : '#ffb74d';
  ctx.beginPath(); ctx.arc(0, 0, T * 0.1, 0, Math.PI * 2); ctx.fill();
  if (Math.sin(performance.now() / 400) > 0.6) {
    ctx.fillStyle = '#ff5252';
    ctx.beginPath(); ctx.arc(T, 0, Math.max(1, T * 0.05), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
