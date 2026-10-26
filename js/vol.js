'use strict';
// Simulation et affichage d'un vol.
// Repère : x horizontal (m), y = altitude (m) par rapport au niveau moyen du sol
// (ou au niveau 1 bar des géantes). angle = 0 quand la fusée pointe vers le haut.

// Grands lanceurs : bascule initiale du virage gravitationnel (rad). 17° : montée assez plate pour
// économiser le carburant (Hercule arrive en orbite avec ≈ 37 t de réserve), échauffement modéré.
let BASCULE_LANCEUR = 0.3;
// Rapproche une valeur d'une cible, d'au plus « pas » (pour lisser vitesses et rotations).
function approcher(x, cible, pas) { return x < cible ? Math.min(cible, x + pas) : Math.max(cible, x - pas); }
const INCLINAISON_MAX = 15;    // degrés : inclinaison de la fusée et pente du sol supportées à l'atterrissage
const MARGE_RUPTURE = 0.5;     // au-delà de +50 % des limites d'atterrissage, c'est le crash direct

// Dégâts par seconde quand on dépasse une limite (pression ou chaleur) d'un ratio r :
// 5 %/s à +10 %, 1,25 %/s à +5 %, 20 %/s à +20 %.
function tauxDegats(r) { return r > 0 ? Math.min(200, 5 * Math.pow(r / 0.1, 2)) : 0; }

class Vol {
  // options.voyage : vol lancé depuis l'orbiteur (on doit y revenir, pas de fin « au sol »).
  // options.carburant : carburant disponible si différent du plein.
  constructor(astre, fusee, options = {}) {
    this.astre = astre;
    this.f = fusee;
    this.voyage = !!options.voyage;
    this.altOrbite = altitudeOrbite(astre);
    this.decollageDemande = false;
    this.terrain = creerTerrain(astre);
    // Lancement depuis la Terre : départ de Kourou, la vraie géographie défile sous la fusée.
    this.geo = !!options.lancement && astre.id === 'terre';
    if (this.geo) this.terrain = terrainKourou(this.terrain);
    this.bases = options.bases || [];
    // Vénus : qui fournit le lanceur de retour (station en orbite) ; absent pendant les vols d'essai.
    this.fournisseurLanceur = options.fournisseurLanceur || null;
    this.lanceurRetour = null;
    // Zone repérée par une sonde : on descend juste au-dessus.
    this.site = options.site || null;
    this.x = this.site ? (this.site.xDescente !== undefined ? this.site.xDescente : this.site.x) : 0;
    this.y = astre.depart.alt + (this.terrain ? this.sol(this.x) : 0);
    this.vx = 0;
    this.vy = -astre.depart.vitesse;
    this.angle = 0;
    this.carburant = options.carburant !== undefined ? Math.min(options.carburant, fusee.carburant) : fusee.carburant;
    this.lancement = !!options.lancement;
    this.echantillons = 0;
    this.depuisSol = !!options.depuisSol;
    this.temp = 20;
    this.dose = 0;
    this.pose = false;
    this.manette = 0;          // réglage de la manette des gaz (0 à 1), reste fixe
    this.throttle = 0;         // poussée effective (0 si réservoir vide)
    this.autopilote = false;
    this.messageAuto = '';
    this.integrite = 100;      // % de coque restante
    this.degats = { pression: 0, chaleur: 0, impact: 0 };
    this.taux = { pression: 0, chaleur: 0 };
    this.t = 0;
    this.fin = null;
    this.phase = { solide: 'descente', gazeuse: 'plongee', etoile: 'approche' }[astre.type];
    this.stats = { vMax: 0, pMax: 0, tMax: 20, altMin: this.y };
    this.carburantVideAlt = null;
    this.cibleX = null;
    this.tCible = -1;
    this.fx = [];              // particules (fumée, étincelles), en coordonnées écran
    // Départ du sol (méga-fusée sur son pas de tir, ou robot largué).
    if (this.depuisSol) {
      this.y = this.sol(this.x) + 0.01;
      this.vy = 0;
      this.pose = true;
      this.phase = 'au sol';
      this.dejaPose = true;
    }
    this.c = conditions(astre, this.y);
  }

  masse() { return this.f.masseSeche + this.carburant; }
  // Rotation : vitesse et accélération angulaires maximales selon l'engin.
  // Un grand lanceur pivote lentement (≈ 3,4°/s au plus, ≈ 1°/s en vrai pendant le virage),
  // un module d'atterrissage léger beaucoup plus vite (≈ 40°/s).
  rotationMax() {
    return this.f.mega ? { w: 0.06, acc: 0.03 } : { w: 0.7, acc: 1.4 };
  }
  // Pilote automatique : tourne vers un angle en accélérant puis en freinant à temps
  // (profil « accélérer, freiner »), sans à-coup ni dépassement.
  orienterVers(angleCible, dt) {
    const { w, acc } = this.rotationMax();
    let dA = angleCible - this.angle;
    if (dA > Math.PI) dA -= 2 * Math.PI;
    if (dA < -Math.PI) dA += 2 * Math.PI;
    // Vitesse à laquelle on peut encore s'arrêter pile sur la cible.
    const wVoulu = Math.sign(dA) * Math.min(w, Math.sqrt(2 * acc * Math.abs(dA)));
    this.omega = approcher(this.omega || 0, wVoulu, acc * dt);
    // Pas de dépassement à cause du pas de temps.
    const pas = this.omega * dt;
    this.angle += Math.abs(pas) > Math.abs(dA) ? dA : pas;
    if (Math.abs(pas) > Math.abs(dA)) this.omega = 0;
    return dA;
  }
  twr() { return this.f.poussee / (this.masse() * this.c.g); }
  // Sol, terrassé à plat sous les bases (raccord en douceur entre 110 et 140 m du centre).
  sol(x) {
    if (!this.terrain) return 0;
    let h = this.terrain(x);
    for (const b of this.bases) {
      const d = Math.abs(x - b.x);
      if (d < 140) {
        const w = d < 110 ? 1 : 1 - (d - 110) / 30;
        h += (this.terrain(b.x) - h) * w;
      }
    }
    return h;
  }
  altSol() { return this.terrain ? this.y - this.sol(this.x) : this.y; }
  pente(x) { return Math.atan2(this.sol(x + 3) - this.sol(x - 3), 6); }
  enDegats() { return this.taux.pression + this.taux.chaleur > 0; }
  vOrbitale() { return vitesseOrbitale(this.astre, Math.max(0, this.y)); }
  vLiberation() { return vitesseLiberation(this.astre, Math.max(0, this.y)); }
  // Gravité ressentie : la vitesse horizontale « courbe » la trajectoire autour de l'astre.
  gEffective() { return this.c.g - (this.vx * this.vx) / (this.astre.rayonKm * 1000 + this.y); }

  step(dt, cmd) {
    if (this.fin) return;
    const a = this.astre, f = this.f;
    this.t += dt;
    if (this.lanceurRetour && this.lanceurRetour.etat === 'descente') this.descenteLanceur(dt);

    // Compte à rebours sur le pas de tir : les pinces retiennent la fusée pendant l'allumage.
    if (this.compteARebours > 0) {
      const avant = this.compteARebours;
      this.compteARebours = Math.max(0, this.compteARebours - dt);
      if (avant > 3 && this.compteARebours <= 3) this.noter('T−3 s : allumage des moteurs');
      this.throttle = this.compteARebours <= 3 ? Math.min(1, (3 - this.compteARebours) / 2) : 0;
      this.manette = this.throttle;
      if (this.compteARebours === 0) {
        this.tDecollage = this.t;
        this.noter('T−0 : décollage !');
        this.decollageDemande = true;
        this.autopilote = true;
      } else return;
    }
    if (this.lancement && this.tDecollage && !this.pose) this.suivreLancement();
    if (this.phase === 'ballon') {
      this.stepBallon(dt);
      if (!this.fin) this.objectifs();
      return;
    }

    if (this.autopilote) this.pilotage(dt);
    else if (this.pose) this.omega = 0;
    else {
      // Commande manuelle : la rotation prend de la vitesse progressivement, et s'arrête de même
      // quand on lâche (les petits moteurs de contrôle d'attitude freinent la rotation).
      const { w, acc } = this.rotationMax();
      const cible = cmd.gauche ? -w : cmd.droite ? w : 0;
      this.omega = approcher(this.omega || 0, cible, acc * dt);
      this.angle += this.omega * dt;
    }
    if (this.angle > Math.PI) this.angle -= 2 * Math.PI;
    if (this.angle < -Math.PI) this.angle += 2 * Math.PI;

    const th = this.carburant > 0 ? this.manette : 0;
    this.throttle = th;
    const F = f.poussee * th;
    if (F > 0) {
      this.carburant = Math.max(0, this.carburant - F / (f.isp * G0) * dt);
      // Méga-fusée : étage vide → séparation, l'étage suivant s'allume.
      if (this.carburant === 0 && f.etages && f.etage < f.etages.length - 1) {
        configurerEtage(f, f.etage + 1);
        this.carburant = f.carburant;
        this.noter(`Séparation : ${f.etages[f.etage - 1].nom} largué à ${fmtAlt(this.y)}, ${f.etages[f.etage].nom} allumé`);
        // L'étage vide retombe : on le voit s'éloigner. Le bas de la fusée est maintenant le haut de l'étage largué.
        const lenLargue = f.etages[f.etage - 1].hauteur - f.hauteur;
        this.y += lenLargue * Math.cos(this.angle); this.x += lenLargue * Math.sin(this.angle);
        this.etageLargue = { x: this.x, y: this.y, vx: this.vx, vy: this.vy - 3, angle: this.angle, h: lenLargue, etage: f.etage - 1, t: 0 };
      }
      if (this.carburant === 0 && this.carburantVideAlt === null) this.carburantVideAlt = this.altSol();
    }

    const m = this.masse();
    const c = conditions(a, this.y);
    this.c = c;
    const ax = F * Math.sin(this.angle) / m;
    // Gravité moins l'effet centrifuge : à la vitesse orbitale, on tombe autour de l'astre sans s'en rapprocher.
    const ay = F * Math.cos(this.angle) / m - c.g + (this.vx * this.vx) / (a.rayonKm * 1000 + this.y);

    if (this.pose) {
      // Posé : le module bascule doucement jusqu'à reposer sur la pente.
      if (this.angleRepos !== undefined && !this.decollageDemande) this.angle = approcher(this.angle, this.angleRepos, 1.2 * dt);
      if (ay <= 0) {
        this.vx = 0; this.vy = 0;
        this.dangers(c, 0, dt);
        if (!this.fin && this.carburant <= 0) this.terminer('bloque');
        return;
      }
      this.pose = false;
      this.phase = 'remontee';
      this.y += 0.05;
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
    this.prelever();

    if (this.terrain && this.y <= this.sol(this.x)) this.contact();
    if (this.fin) return;
    this.objectifs();
  }

  // Géantes gazeuses : la sonde prélève le gaz automatiquement à chaque palier de pression.
  prelever() {
    const a = this.astre;
    if (a.type !== 'gazeuse' || this.fin) return;
    this.prelevements = this.prelevements || [];
    const niveaux = [0.3, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
    const fait = this.prelevements.map((x) => x.niveau);
    for (const n of niveaux) {
      if (this.c.p >= n && !fait.includes(n)) {
        const texte = compositionGaz(a, this.c.p);
        this.prelevements.push({ niveau: n, p: this.c.p, t: this.c.t, alt: this.y, texte });
        this.echantillons++;
        this.tPrelevement = this.t;
        this.messageExplo = { texte: `Prélèvement n° ${this.prelevements.length} à ${fmtP(this.c.p)}, ${fmt(this.c.t)} °C : ${texte}`, vie: 6 };
      }
    }
  }

  dangers(c, v, dt) {
    const f = this.f;
    // Échauffement aérodynamique (≈ v²/2cp), efficace seulement dans un air assez dense.
    const aero = (v * v) / 2010 * (c.rho / (c.rho + 0.05));
    const tau = this.astre.type === 'etoile' ? 15 : 40 / (1 + Math.sqrt(c.rho));
    this.temp += (c.t + aero - this.temp) * Math.min(1, dt / tau);
    this.stats.pMax = Math.max(this.stats.pMax, c.p);
    this.stats.tMax = Math.max(this.stats.tMax, this.temp);

    // Au-delà des limites, la coque s'abîme petit à petit.
    const tp = tauxDegats(c.p / f.pressionMax - 1);
    const tc = tauxDegats((this.temp + KELVIN) / (f.tempMax + KELVIN) - 1);
    this.taux = { pression: tp, chaleur: tc };
    if (tp + tc > 0) {
      this.degats.pression += tp * dt;
      this.degats.chaleur += tc * dt;
      this.integrite -= (tp + tc) * dt;
      if (this.integrite <= 0) {
        this.integrite = 0;
        return this.terminer(tp >= tc ? 'pressurisee' : 'brulee');
      }
    }
    // Rayonnement : vraie dose (Sv/jour) à cette altitude, divisée par la protection de la fusée.
    // L'équipage cumule sa dose (aussi pendant les sorties) ; au-delà de 4 Sv, elle est mortelle.
    this.svBord = doseLocale(this.astre, this.y, c) / f.protection;
    this.doseSv = (this.doseSv || 0) + (this.svBord * dt) / 86400;
    this.dose = (100 * this.doseSv) / DOSE_MORTELLE;
    if (this.dose >= 100) return this.terminer('irradiee');
  }

  contact() {
    const a = this.astre;
    const penteRad = this.pente(this.x);
    const vv = Math.max(0, -this.vy), vh = Math.abs(this.vx);
    const inc = Math.abs(this.angle) * 180 / Math.PI;
    const pente = Math.abs(penteRad) * 180 / Math.PI;
    this.y = this.sol(this.x);
    // Dépassement de la pire des limites (0 = pile à la limite).
    const exces = Math.max(vv / a.vMax, vh / a.vMax, inc / INCLINAISON_MAX, pente / INCLINAISON_MAX) - 1;
    this.impact = { vv, vh, inc, pente, exces, degats: 0, integriteAvant: this.integrite };
    if (exces >= MARGE_RUPTURE) {
      this.terminer(this.carburant <= 0 ? 'carburant' : 'ecrasee');
      return;
    }
    if (exces > 0) {
      // Atterrissage dur : la coque encaisse.
      const d = 160 * exces;
      this.impact.degats = d;
      this.degats.impact += d;
      this.integrite -= d;
      this.secousse = 0.5;
      if (this.integrite <= 0) {
        this.integrite = 0;
        this.terminer(this.carburant <= 0 ? 'carburant' : 'ecrasee');
        return;
      }
    }
    this.pose = true;
    this.vx = 0; this.vy = 0;
    this.angleRepos = penteRad; // la fusée va se poser sur la pente (en douceur, voir step)
    this.omega = 0;
    this.phase = 'au sol';
    this.manette = 0;
    this.dejaPose = true;
  }

  objectifs() {
    const a = this.astre;
    if (a.type === 'gazeuse' && this.phase === 'plongee' && this.c.p >= a.cible) this.phase = 'remontee';
    if (a.type === 'gazeuse') {
      if (this.phase === 'remontee' && this.y >= 0) this.terminer('plongee');
    } else if (a.type === 'solide') {
      const v = Math.hypot(this.vx, this.vy);
      // Libération : plus rien ne nous ramène vers l'astre.
      if (v >= this.vLiberation() && this.y > this.sol(this.x) + 50) { this.terminer(this.dejaPose ? 'liberation' : 'abandon'); return; }
      // Orbite : assez haut, assez vite à l'horizontale.
      if (this.y >= this.altOrbite * 0.9 && Math.abs(this.vx) >= this.vOrbitale() * 0.97 && Math.abs(this.vy) < 0.25 * this.vOrbitale() + 10) {
        this.terminer(this.dejaPose ? 'orbite' : 'abandon');
        return;
      }
    }
    if (this.phase === 'descente' && this.y > a.depart.alt * 1.3 + 1000) this.terminer('abandon');
  }

  // ---------- Pilote automatique ----------
  // Calcule une vitesse visée, en déduit la poussée et l'orientation nécessaires.
  pilotage(dt) {
    const a = this.astre, g = this.c.g, m = this.masse();
    const alt = this.altSol();
    const twr = this.twr();
    let vxCible = 0, vyCible = 0, inclinaisonMax = 0.35;
    let aFrein = 0;   // décélération nécessaire pour arriver doucement au sol

    switch (this.phase) {
      case 'descente': {
        // Cherche un endroit plat à proximité.
        // On garde la même cible tant qu'elle reste valable, pour ne pas hésiter entre deux zones.
        if (alt < 1500 && this.t - this.tCible > 1) {
          if (this.cibleX === null || !this.estPlat(this.cibleX)) this.cibleX = this.chercherPlat();
          this.tCible = this.t;
        }
        const ecart = this.cibleX === null ? 0 : this.cibleX - this.x;
        vxCible = Math.max(-25, Math.min(25, ecart * 0.08));
        // L'air freine aussi : on en tient compte pour ne pas gaspiller le carburant.
        const trainee = 0.5 * this.c.rho * FUSEE_BASE.cx * FUSEE_BASE.surface * this.vy * this.vy / m;
        const freinage = Math.max(0.3, (twr * 0.85 - 1) * g + 0.7 * trainee);
        const vFinale = 0.4 * a.vMax;
        vyCible = -(vFinale + 0.8 * Math.sqrt(2 * freinage * Math.max(0, alt - 3)));
        if (this.vy < -vFinale) aFrein = (this.vy * this.vy - vFinale * vFinale) / (2 * Math.max(0.5, alt - 2)) - trainee;
        if (Math.abs(ecart) > 6 && alt < 80) { vyCible = Math.max(vyCible, alt < 30 ? 0.5 : -2); aFrein = 0; } // attendre d'être au-dessus du plat
        if (alt < 15) inclinaisonMax = 0.05;
        this.messageAuto = twr < 1 ? 'poussée insuffisante pour freiner !' : this.cibleX === null && alt < 1500 ? 'aucun terrain plat en vue' : 'descente vers une zone plate';
        break;
      }
      case 'au sol':
        // Posé : le pilote automatique ne redécolle que sur demande (touche T).
        if (!this.decollageDemande) {
          this.manette = 0;
          this.messageAuto = 'posé — T pour décoller';
          return;
        }
        // fallthrough
      case 'remontee': {
        if (a.type === 'gazeuse') {
          // Dans les géantes, monter vite limite les pertes dues à la gravité.
          vyCible = 550;
          this.messageAuto = twr < 1 ? 'poussée insuffisante pour monter !' : 'remontée vers le niveau 1 bar';
          break;
        }
        // Les grands lanceurs pivotent lentement : il leur faut un guidage qui n'exige jamais de virage brusque.
        if (this.f.mega) return this.pilotageLanceur(dt, alt, twr);
        return this.pilotageMiseEnOrbite(dt, alt, twr);
      }
      case 'plongee': {
        const zone = 1 + (a.cible - 1) * 0.3;
        vyCible = this.c.p < zone ? -1e9 : -200;
        this.messageAuto = 'plongée vers ' + fmt(a.cible, 1) + ' bar';
        break;
      }
      case 'approche':
        vyCible = -1e9;
        this.messageAuto = 'aucune trajectoire sûre près du Soleil';
        break;
    }

    // Accélération voulue → vecteur poussée.
    const axMax = Math.max(g, Math.min(2, 0.3 * twr * g));
    const axV = Math.max(-axMax, Math.min(axMax, (vxCible - this.vx) * 0.4));
    const suivi = (vyCible - this.vy) * 2;
    const ayV = g + (aFrein > 0 ? Math.max(aFrein * 1.25, suivi) : suivi);
    const Fx = m * axV, Fy = Math.max(0, m * ayV);
    let angleCible = Fy > 0 || Fx !== 0 ? Math.atan2(Fx, Math.max(Fy, 1e-6)) : 0;
    angleCible = Math.max(-inclinaisonMax, Math.min(inclinaisonMax, angleCible));
    if (this.pose) angleCible = 0;
    const dA = this.orienterVers(angleCible, dt);
    let th = Math.hypot(Fx, Fy) / this.f.poussee;
    if (Fy <= 0) th = 0;
    if (Math.abs(dA) > 0.4) th *= 0.3;   // pas de pleine poussée tant qu'on est mal orienté
    this.manette = Math.max(0, Math.min(1, th));
  }

  // Guidage des grands lanceurs, comme les vraies fusées :
  // 1. montée verticale jusqu'à 1 km ;
  // 2. virage gravitationnel : petite bascule, puis la fusée suit sa propre vitesse (peu de frottement, pas d'à-coup) ;
  // 3. hors de l'atmosphère : pleine poussée, la part verticale est calculée pour arriver à l'altitude d'orbite
  //    au moment où la vitesse horizontale est atteinte. L'angle visé évolue lentement, sans aller-retour.
  pilotageLanceur(dt, alt, twr) {
    const a = this.astre, m = this.masse(), F = this.f.poussee;
    const aT = F / m;                                   // accélération à pleine poussée
    const vO = vitesseOrbitale(a, this.altOrbite);
    const sens = this.vx < -1 ? -1 : 1;
    const gEff = this.gEffective();
    const trajectoire = Math.atan2(Math.abs(this.vx), Math.max(1, this.vy));   // inclinaison de la vitesse (0 = vers le haut)
    let angleCible, th = 1;
    const dense = this.c.rho > 0.003;
    if (alt < 1000 && this.vy < 150) {
      angleCible = 0;
      this.messageAuto = 'montée verticale';
    } else if (dense && trajectoire < 1.25) {
      // Bascule progressive entre 1 et 4 km, puis on suit la vitesse (virage gravitationnel).
      const bascule = Math.min(BASCULE_LANCEUR, Math.max(0, (alt - 1000) / 3000) * BASCULE_LANCEUR);
      angleCible = sens * Math.max(trajectoire, bascule);
      this.messageAuto = 'virage gravitationnel';
    } else {
      const resteH = Math.max(0, vO * 1.005 - Math.abs(this.vx));
      const tgo = Math.max(8, resteH / Math.max(0.3, aT));
      const dz = this.altOrbite * 1.02 - this.y;
      const vyVoulu = Math.max(-150, Math.min(600, (1.6 * dz) / tgo));
      let ay = (vyVoulu - this.vy) / 25 + gEff;
      ay = Math.max(-0.3 * aT, Math.min(0.97 * aT, ay));
      const ax = Math.sqrt(Math.max(0, aT * aT - ay * ay));
      angleCible = Math.atan2(sens * ax, ay);
      // On réduit la poussée en approchant de la vitesse orbitale, pour ne pas la dépasser.
      th = Math.min(1, resteH / (aT * 3) + 0.08);
      this.messageAuto = `mise en orbite : encore ${fmt(resteH)} m/s`;
    }
    this.orienterVers(angleCible, dt);
    this.manette = Math.max(0, Math.min(1, th));
    if (twr < 1) this.messageAuto = 'poussée insuffisante pour décoller !';
  }

  // Montée vers l'orbite : on grimpe d'abord, puis on bascule vers l'horizontale
  // pour atteindre la vitesse orbitale à l'altitude d'orbite.
  pilotageMiseEnOrbite(dt, alt, twr) {
    const a = this.astre, m = this.masse(), Fmax = this.f.poussee;
    const vO = vitesseOrbitale(a, this.altOrbite);
    const sens = this.vx < -1 ? -1 : 1;
    const gEff0 = Math.max(0.05 * this.c.g, this.gEffective());
    // Vitesse de montée qui permet d'arriver à l'altitude d'orbite avec une vitesse verticale presque nulle.
    const ecartAlt = this.altOrbite * 1.02 - this.y;
    let vyCible = Math.sign(ecartAlt) * Math.min(500, 0.9 * Math.sqrt(2 * gEff0 * Math.abs(ecartAlt))) + 1;
    let vxCible = sens * vO * 1.01;
    // Air dense : on monte lentement (sinon le frottement mange le carburant) et on reste vertical.
    if (this.c.rho > 1e-4) {
      // Vitesse limite de chute : là où le frottement égale le poids, compromis optimal gravité / frottement.
      const vMaxAir = Math.sqrt((2 * this.c.g * m) / (this.c.rho * FUSEE_BASE.cx * FUSEE_BASE.surface));
      vyCible = Math.min(vyCible, Math.max(20, vMaxAir));
      if (this.c.rho > 0.02) vxCible = sens * Math.min(Math.abs(vxCible), 0.5 * vMaxAir);
    }
    if (alt < 60) { vxCible = 0; vyCible = Math.max(vyCible, 15); }
    const gEff = this.gEffective();
    let Fy = m * ((vyCible - this.vy) * 0.5 + gEff);
    let Fx = m * (vxCible - this.vx) * 0.5;
    // On peut pousser un peu vers le bas pour ne pas dépasser l'altitude d'orbite.
    Fy = Math.max(-0.5 * Fmax, Fy);
    if (Math.hypot(Fx, Fy) > Fmax) {
      // Priorité à la verticale pour ne pas retomber.
      Fy = Math.sign(Fy) * Math.min(Math.abs(Fy), Fmax);
      Fx = Math.sign(Fx) * Math.sqrt(Math.max(0, Fmax * Fmax - Fy * Fy));
    }
    let angleCible = Math.atan2(Fx, Fy);
    if (alt < 30) angleCible = Math.max(-0.1, Math.min(0.1, angleCible));
    const dA = this.orienterVers(angleCible, dt);
    let th = Math.hypot(Fx, Fy) / Fmax;
    if (Math.abs(dA) > 0.4) th *= 0.3;
    this.manette = Math.max(0, Math.min(1, th));
    const reste = vO - Math.abs(this.vx);
    this.messageAuto = twr < 1 ? 'poussée insuffisante pour décoller !' : `mise en orbite : encore ${fmt(Math.max(0, reste))} m/s`;
  }

  // Endroit le plus proche où le sol est presque plat sur une vingtaine de mètres.
  estPlat(x) {
    for (let d = -10; d <= 10; d += 5) if (Math.abs(this.pente(x + d)) > 6 * Math.PI / 180) return false;
    return true;
  }

  chercherPlat() {
    const plat = (x) => this.estPlat(x);
    for (let r = 0; r <= 800; r += 15) {
      if (plat(this.x + r)) return this.x + r;
      if (r && plat(this.x - r)) return this.x - r;
    }
    return null;
  }

  // Le joueur termine la mission une fois posé (Entrée) ou l'abandonne (Échap).
  finirAuSol() { if (this.pose && !this.fin && !this.voyage) this.terminer('pose'); }
  // Décollage volontaire, confié au pilote automatique.
  // Sur le pas de tir : compte à rebours de 10 s, allumage à T−3, décollage à T−0.
  demanderDecollage() {
    if (!this.pose || this.fin) return;
    if (this.lancement && this.compteARebours === undefined) {
      this.compteARebours = 10;
      this.noter(this.geo ? 'Centre spatial guyanais, Kourou — compte à rebours : T−10 s' : 'Compte à rebours : T−10 s');
      return;
    }
    if (this.compteARebours > 0) return;
    // Vénus : on ne décolle pas du sol. Il faut d'abord que la station en orbite envoie le lanceur de retour.
    if (this.f.aerostat && !this.ascension) {
      const lr = this.lanceurRetour;
      if (!lr) {
        if (!this.fournisseurLanceur) {
          this.lanceurRetour = { etat: 'pret', x: this.x };   // vols d'essai de la conception : lanceur supposé déjà là
        } else {
          const rep = this.fournisseurLanceur();
          this.messageExplo = { texte: rep.texte, vie: 10 };
          if (!rep.ok) return;
          // Capsule sous parachute, depuis 15 km au-dessus du site, posée à 30 m du module.
          const x = this.x + 30;
          this.lanceurRetour = { etat: 'descente', x, y: this.sol(x) + 15000, vy: -150 };
          return;
        }
      } else if (lr.etat !== 'pret') {
        this.messageExplo = { texte: `Le lanceur de retour descend encore sous son parachute (${fmtAlt(Math.max(0, lr.y - this.sol(lr.x)))}).`, vie: 4 };
        return;
      }
    }
    this.decollageDemande = true;
    this.autopilote = true;
    // Vénus : le ballon se gonfle sur le lanceur, posé à côté du module.
    if (this.f.aerostat && !this.ascension) {
      this.xModule = this.x;   // le module blindé reste au sol
      this.x = this.lanceurRetour.x;
      this.y = this.sol(this.x) + 0.01;
      this.lanceurRetour.etat = 'parti';
      this.pose = false;
      this.phase = 'ballon';
      this.manette = 0;
      this.tDecollage = this.t; // la chronologie de la remontée part du gonflage du ballon
      this.noter('Gonflage du ballon : le lanceur Aphrodite quitte le sol');
      this.messageExplo = { texte: `Gonflage du ballon : montée lente vers ${fmtAlt(this.f.aerostat.alt)}, au-dessus de la fournaise. Accélérez le temps (+).`, vie: 9 };
    }
  }

  // Capsule du lanceur de retour : entrée freinée par son bouclier, puis parachute (≈ 8 m/s dans l'air épais de Vénus).
  descenteLanceur(dt) {
    const lr = this.lanceurRetour;
    const sol = this.sol(lr.x);
    const vLimite = lr.y - sol > 8000 ? -60 : -8;      // parachute principal sous 8 km
    lr.vy += (vLimite - lr.vy) * Math.min(1, dt / 15);
    lr.y += lr.vy * dt;
    if (!lr.parachute && lr.y - sol < 8000) { lr.parachute = true; this.messageExplo = { texte: 'Parachute ouvert : le lanceur de retour descend vers le site.', vie: 5 }; }
    if (lr.y <= sol) {
      lr.y = sol;
      lr.etat = 'pret';
      this.messageExplo = { texte: 'Lanceur de retour posé à 30 m du module. T : gonfler le ballon et repartir.', vie: 10 };
    }
  }

  // Montée en ballon (Vénus) : pas de moteur, la poussée d'Archimède fait monter à vitesse constante.
  // Arrivé dans les nuages, le lanceur d'ascension se détache du module et s'allume.
  stepBallon(dt) {
    const c = conditions(this.astre, this.y);
    this.c = c;
    const cible = this.f.aerostat.vitesse;
    this.vy += (cible - this.vy) * Math.min(1, dt / 20);
    this.vx *= Math.max(0, 1 - dt / 30);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.angle *= Math.max(0, 1 - dt / 5);
    this.throttle = 0;
    this.messageAuto = `ballon : ${fmtAlt(this.y - this.sol(this.x))} sur ${fmtAlt(this.f.aerostat.alt)}`;
    this.dangers(c, Math.hypot(this.vx, this.vy), dt);
    if (this.fin) return;
    if (this.y - this.sol(this.x) >= this.f.aerostat.alt) {
      const alt = this.y;
      this.fModule = this.f;
      this.f = fuseeAscension();
      this.carburant = this.f.carburant;
      this.ascension = true;
      this.coiffeLarguee = true;
      this.phase = 'remontee';
      this.angle = 0;
      this.vy = 0;
      this.noter(`Ballon à ${fmtAlt(alt)} (${fmtP(c.p)}, ${fmt(c.t)} °C) : largage, allumage du lanceur ${this.f.nomLanceur}`);
    }
  }

  // Chronologie du lancement (affichée à l'écran et dans le résultat).
  noter(texte) {
    this.chrono = this.chrono || [];
    this.chrono.push({ t: this.t - (this.tDecollage || this.t), texte, avant: !this.tDecollage });
    this.messageExplo = { texte, vie: 5 };
  }

  // Événements de la montée : Max Q, coiffe.
  suivreLancement() {
    const v = Math.hypot(this.vx, this.vy);
    const q = 0.5 * this.c.rho * v * v;
    this.qMax = Math.max(this.qMax || 0, q);
    // Survol : on annonce chaque région traversée, et la prochaine côte au-dessus de la mer.
    if (this.geo) {
      const g = geoKourou(this.x);
      if (g.nom !== this.geoNom) {
        if (this.geoNom) {
          const p = prochainChangementKourou(this.x);
          this.noter(g.type === 'ocean' && p ? `Survol : ${g.nom} — prochaine côte : ${p.nom}, à ${fmt(p.distance / 1000)} km` : `Survol : ${g.nom}`);
        }
        this.geoNom = g.nom;
      }
    }
    if (!this.maxQAnnonce && this.qMax > 5000 && q < 0.9 * this.qMax) {
      this.maxQAnnonce = true;
      this.noter(`Max Q : pression aérodynamique maximale (${fmt(this.qMax / 1000)} kPa) à ${fmtAlt(this.y)}`);
    }
    if (!this.coiffeLarguee && coiffeALarguer(this.astre, this.y, this.y - this.sol(this.x))) {
      this.coiffeLarguee = true;
      // Les deux demi-coiffes s'écartent : on découvre l'orbiteur et son atterrisseur.
      if (this.f.charge) this.coiffeDebris = { x: this.x, y: this.y, vx: this.vx, vy: this.vy, angle: this.angle, t: 0 };
      this.noter(TEXTES_COIFFE[typeAtmosphere(this.astre)]);
    }
  }
  abandonner() { if (!this.fin) this.terminer(this.pose ? 'pose' : 'abandon'); }

  terminer(cause) {
    const detruite = ['ecrasee', 'brulee', 'pressurisee', 'carburant', 'irradiee'].includes(cause);
    if ((this.lancement || this.ascension) && cause === 'orbite') this.noter(`Mise en orbite à ${fmtAlt(this.y)}, ${fmtV(Math.abs(this.vx))}`);
    if (this.lancement && detruite) this.noter('Perte du lanceur');
    this.fin = {
      cause, detruite,
      astre: this.astre,
      temps: this.t,
      carburantRestant: this.carburant,
      impact: this.impact || null,
      conditions: this.c,
      temp: this.temp,
      dose: this.dose,
      doseSv: this.doseSv || 0,
      svBord: this.svBord || 0,
      integrite: this.integrite,
      altitude: this.y,
      vitesse: Math.hypot(this.vx, this.vy),
      vOrbitale: this.vOrbitale(),            // vitesse circulaire à l'altitude atteinte (pour comparer)
      lancementTerre: !!this.lancement,       // méga-fusée partie de la Terre (pas la remontée d'un atterrisseur)
      pertes: this.pertes || [],              // spationaute ou robot perdus pendant une sortie
      dejaPose: !!this.dejaPose,
      chrono: this.chrono || [],
      degats: { ...this.degats },
      fusee: this.f,
      carburantVideAlt: this.carburantVideAlt,
      stats: { ...this.stats },
    };
    if (detruite) this.explosion = creerExplosion();
    this.manette = 0;
    this.throttle = 0;
  }

  objectifTexte() {
    const a = this.astre;
    switch (this.phase) {
      case 'descente': return `Posez-vous en douceur : moins de ${a.vMax} m/s, module droit, sol pas trop pentu`;
      case 'au sol':
        if (this.lancement) {
          if (this.compteARebours > 0) return `${this.f.nomLanceur} : compte à rebours en cours…`;
          return `${this.f.nomLanceur} sur le pas de tir : T pour lancer le compte à rebours`;
        }
        // Vénus : le retour passe par le lanceur que la station envoie au sol.
        if (this.f.aerostat && !this.ascension) {
          const lr = this.lanceurRetour;
          if (!lr) return 'Posé sur Vénus ! T : demander le lanceur de retour à la station en orbite · E : spationaute · R : robot';
          if (lr.etat === 'descente') return 'Le lanceur de retour descend sous son parachute… (accélérez le temps avec +)';
          return 'Lanceur de retour posé à côté du module : T pour gonfler le ballon et repartir';
        }
        return this.voyage
          ? 'Posé ! E : spationaute · R : robot · B : construire une base · T : décoller vers l’orbiteur'
          : 'Posé ! Entrée : terminer · E : spationaute · R : robot · T : décoller vers l’orbite';
      case 'remontee': return a.type === 'gazeuse'
        ? `${fmt(a.cible, 1)} bar atteints ! Remontez jusqu’au niveau 1 bar`
        : `Mise en orbite : ${fmtAlt(this.altOrbite)} d’altitude et ${fmtV(vitesseOrbitale(a, this.altOrbite))} à l’horizontale`;
      case 'plongee': return `Pas de sol : plongez jusqu’à ${fmt(a.cible, 1)} bar (prélèvements automatiques), puis remontez`;
      case 'approche': return 'Approchez-vous du Soleil… si vous le pouvez';
      case 'ballon': return `Montée en ballon vers ${fmtAlt(this.f.aerostat ? this.f.aerostat.alt : 54000)} : le lanceur s’allumera dans les nuages (accélérez avec +)`;
    }
    return '';
  }
}

// Ce que contient le gaz prélevé, selon la géante et la profondeur (pression en bar).
function compositionGaz(a, p) {
  if (a.id === 'jupiter' || a.id === 'saturne') {
    const base = 'hydrogène ~' + (a.id === 'jupiter' ? '90' : '96') + ' %, hélium, traces de méthane';
    if (p < 0.7) return `${base} ; cristaux de glace d’ammoniac (les nuages blancs)`;
    if (p < 2.5) return `${base} ; nuages d’hydrosulfure d’ammonium (les bandes brun-orangé)`;
    return `${base} ; gouttelettes d’eau, nuages d’orage profonds`;
  }
  // Uranus et Neptune : le méthane absorbe le rouge, d'où leur couleur bleue.
  if (p < 1.5) return 'hydrogène, hélium, ~2 % de méthane (il donne la couleur bleue) ; cristaux de méthane';
  return 'hydrogène, hélium, méthane ; nuages de sulfure d’hydrogène (odeur d’œuf pourri !)';
}

// Altitude à atteindre pour réussir la remontée.
// Astres solides : l'orbite basse. Géantes : le niveau 1 bar (sommet des nuages).
function altitudeRetour(a) { return a.type === 'gazeuse' ? 0 : altitudeOrbite(a); }

function creerExplosion() {
  const parts = [];
  for (let i = 0; i < 90; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 220;
    parts.push({ vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, vie: 0.6 + Math.random() * 1.2 });
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
  if (m >= 1e6) return s + fmt(m / 1000) + ' km';
  if (m >= 10000) return s + fmt(m / 1000, 1) + ' km';
  return s + fmt(m) + ' m';
}
function fmtP(p) {
  if (p === 0) return '0 bar';
  if (p < 0.001) return p.toExponential(1).replace('.', ',') + ' bar';
  if (p < 1) return fmt(p, 3) + ' bar';
  if (p < 100) return fmt(p, 1) + ' bar';
  return fmt(p) + ' bar';
}
function fmtV(v) {
  const a = Math.abs(v);
  if (a >= 10000) return fmt(v / 1000, 1) + ' km/s';
  if (a < 1 && a > 0) return fmt(v * 100, 1) + ' cm/s';
  return fmt(v, 1) + ' m/s';
}
function fmtG(g) { return g < 0.01 ? fmt(g * 1000, 2) + ' mm/s² (' + (g / G0).toExponential(1).replace('.', ',') + ' g)' : fmt(g, 2) + ' m/s² (' + fmt(g / G0, 2) + ' g)'; }

// Durée lisible : secondes, minutes, heures, jours, mois, années.
function fmtDuree(s) {
  const signe = s < 0 ? '−' : '';
  s = Math.abs(s);
  const MIN = 60, H = 3600, J = 86400, MOIS = 30.436875 * J, AN = 365.25 * J;
  const deux = (n) => String(Math.floor(n)).padStart(2, '0');
  if (s < MIN) return signe + fmt(s, s < 10 ? 1 : 0) + ' s';
  if (s < H) return signe + Math.floor(s / MIN) + ' min ' + deux(s % MIN) + ' s';
  if (s < J) return signe + Math.floor(s / H) + ' h ' + deux((s % H) / MIN) + ' min';
  if (s < MOIS) return signe + Math.floor(s / J) + ' j ' + deux((s % J) / H) + ' h';
  if (s < AN) return signe + Math.floor(s / MOIS) + ' mois ' + Math.floor((s % MOIS) / J) + ' j';
  const ans = Math.floor(s / AN);
  return signe + ans + (ans > 1 ? ' ans ' : ' an ') + Math.floor((s % AN) / MOIS) + ' mois';
}

// Date du calendrier à partir du temps de simulation (s depuis J2000).
function fmtDate(t, avecHeure = true) {
  const ms = (t / 86400 + 2451545.0 - 2440587.5) * 86400000;
  const d = new Date(ms);
  const date = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return avecHeure ? date + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : date;
}

// ---------- Rendu ----------
const ETOILES = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.3 }));
const POUSSIERES = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random() }));

function hash(n) { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }

// Fissures de la coque, en coordonnées relatives (largeur, hauteur de la fusée).
const FISSURES = Array.from({ length: 16 }, (_, i) => {
  let x = (hash(i * 3.1) - 0.5) * 0.9, y = -0.12 - hash(i * 5.7) * 0.62;
  const pts = [[x, y]];
  for (let s = 0; s < 4; s++) {
    x = Math.max(-0.5, Math.min(0.5, x + (hash(i * 7 + s) - 0.5) * 0.4));
    y += (hash(i * 11 + s) - 0.5) * 0.1;
    pts.push([x, y]);
  }
  return pts;
});

function melanger(c1, c2, t) {
  const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

function assombrir(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * k);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// Échelle de la caméra (pixels par mètre) pendant un vol au-dessus d'un sol.
// Près du sol : le sol reste dans le bas de l'écran. En prenant de l'altitude (de 0,2 % à 2 % du rayon
// de l'astre), la caméra recule progressivement jusqu'à cadrer le sol jusqu'à l'horizon réel :
// la courbure apparaît alors comme en vrai (horizon abaissé de acos(R / (R + h))), pour tout astre.
function echelleCamera(a, alt, W, H) {
  const h = Math.max(alt, 1);
  const proche = Math.min(3, (0.45 * H) / h);
  const R = a.rayonKm * 1000;
  const horizon = R * Math.acos(R / (R + h));            // distance au sol jusqu'à l'horizon
  const large = Math.min(proche, W / (1.7 * horizon));   // on voit le sol presque jusqu'à l'horizon
  const x = (Math.log10(h / R) - Math.log10(0.002)) / (Math.log10(0.02) - Math.log10(0.002));
  const f = Math.max(0, Math.min(1, x));
  const lisse = f * f * (3 - 2 * f);                     // transition douce
  return Math.exp((1 - lisse) * Math.log(proche) + lisse * Math.log(large));
}

function dessinerVol(ctx, vol, W, H, dtReel, warp) {
  if (!(W > 0 && H > 0)) return;   // fenêtre réduite à rien (onglet caché) : rien à dessiner
  const a = vol.astre, c = vol.c;
  const gaz = a.type === 'gazeuse';
  const solide = a.type === 'solide';

  // Échelle : le sol (ou le niveau 1 bar) reste visible en bas quand on s'approche.
  let echelle, fuseeY, solY;
  if (gaz) {
    echelle = 0.6;
    fuseeY = H * 0.42;
    solY = fuseeY + vol.y * echelle;
  } else {
    const alt = vol.altSol();
    // Vénus : pendant que le lanceur de retour descend, la caméra recule pour le montrer avec le module (jusqu'à 4 km).
    const lr = vol.lanceurRetour;
    const altCadre = lr && lr.etat === 'descente' ? Math.max(alt, Math.min(4000, (lr.y - vol.sol(lr.x)) * 1.2)) : alt;
    echelle = echelleCamera(a, altCadre, W, H);
    fuseeY = H * 0.8 - alt * echelle;
    solY = fuseeY + vol.y * echelle;
  }

  // Secousse de l'écran pendant les dégâts.
  ctx.save();
  if (vol.secousse > 0) vol.secousse = Math.max(0, vol.secousse - dtReel);
  const tremble = (vol.enDegats() && !vol.fin ? 2 + Math.min(6, (vol.taux.pression + vol.taux.chaleur) / 5) : 0) + (vol.secousse > 0 ? 8 * vol.secousse : 0);
  if (tremble > 0) ctx.translate((Math.random() - 0.5) * tremble, (Math.random() - 0.5) * tremble);

  dessinerFond(ctx, a, c, W, H, gaz && vol.y < 0, tempsCiel(vol), vol);

  // Déplacement apparent du décor pendant cette image (pour la poussière et la fumée).
  const ep = Math.max(0.15, Math.min(3, echelle));
  const depX = -vol.vx * ep * dtReel * warp, depY = vol.vy * ep * dtReel * warp;

  // Poussières / nuages qui défilent pour sentir la vitesse.
  if (c.rho > 1e-4 || gaz || a.type === 'etoile') {
    const lx = Math.max(-80, Math.min(80, vol.vx * ep * 0.05)), ly = Math.max(-80, Math.min(80, -vol.vy * ep * 0.05));
    ctx.strokeStyle = gaz || a.type === 'etoile' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const p of POUSSIERES) {
      p.x = (((p.x + depX / W) % 1) + 1) % 1;
      p.y = (((p.y + depY / H) % 1) + 1) % 1;
      const px = p.x * W, py = p.y * H;
      ctx.moveTo(px, py); ctx.lineTo(px - lx, py - ly);
    }
    ctx.stroke();
  }

  // Couches de nuages des géantes, fixées en altitude : elles défilent pendant la plongée.
  if (gaz) {
    const pas = 400;
    const k0 = Math.floor((vol.y - (H - fuseeY) / echelle) / pas), k1 = Math.ceil((vol.y + fuseeY / echelle) / pas);
    for (let k = k0; k <= k1; k++) {
      const h = hash(k + 3.7);
      if (h < 0.35) continue;
      const sy = fuseeY + (vol.y - k * pas) * echelle;
      const epais = 8 + h * 40;
      ctx.fillStyle = k * pas < 0 ? `rgba(60,25,10,${0.15 + 0.2 * h})` : `rgba(255,255,255,${0.08 + 0.15 * h})`;
      const dec = ((-vol.x * echelle * 0.5 + hash(k) * W) % W + W) % W;
      ctx.fillRect(dec - W, sy - epais / 2, W * 0.7, epais);
      ctx.fillRect(dec + W * 0.1, sy - epais / 2, W * 0.6, epais);
    }
  }

  if (solide) dessinerTerrain(ctx, vol, W, H, echelle, fuseeY);

  // Soleil : disque vu de loin, surface au plus près.
  if (a.type === 'etoile') {
    const rayonPx = a.rayonKm * 1000 * echelle;
    if (rayonPx < 1e5) {
      const g = ctx.createRadialGradient(W / 2, solY + rayonPx, rayonPx * 0.7, W / 2, solY + rayonPx, rayonPx * 1.08);
      g.addColorStop(0, '#fff3c0'); g.addColorStop(0.92, '#ff9800'); g.addColorStop(1, 'rgba(255,152,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(W / 2, solY + rayonPx, rayonPx * 1.08, 0, Math.PI * 2); ctx.fill();
    } else if (solY < H + 10) {
      const g = ctx.createLinearGradient(0, solY, 0, H);
      g.addColorStop(0, '#fff3c0'); g.addColorStop(1, '#ff9800');
      ctx.fillStyle = g;
      ctx.fillRect(0, solY, W, H - solY);
    }
  }
  if (gaz && solY > -50 && solY < H + 50) {
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(0, solY); ctx.lineTo(W, solY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('niveau 1 bar', 12, solY - 6);
  }

  // Fumée et étincelles, puis fusée ou explosion.
  const hPx = vol.f.mega ? Math.max(vol.f.hauteur * echelle, 90) : Math.max(HAUTEUR_MODULE * echelle, gaz ? 60 : 44);
  if (solide) dessinerBases(ctx, vol, W, echelle, fuseeY);
  // Vénus : lanceur de retour envoyé par la station (capsule sous parachute, puis posé à côté du module).
  if (solide && vol.lanceurRetour && vol.lanceurRetour.etat !== 'parti') {
    const lr = vol.lanceurRetour;
    const sx = W / 2 + (lr.x - vol.x) * echelle, sy = fuseeY + (vol.y - lr.y) * echelle;
    if (sx > -200 && sx < W + 200 && sy > -400 && sy < H + 200) dessinerLanceurRetour(ctx, lr, sx, sy, Math.max(echelle, 0.6));
    // Encore trop haut pour être cadré : une flèche en haut de l'écran indique où il arrive.
    if (lr.etat === 'descente' && sy < 40) {
      const x = Math.max(30, Math.min(W - 30, sx));
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath(); ctx.moveTo(x - 9, 52); ctx.lineTo(x + 9, 52); ctx.lineTo(x, 66); ctx.fill();
      texteSurFond(ctx, `Lanceur de retour : ${fmtAlt(Math.max(0, lr.y - vol.sol(lr.x)))}`, x, 46, { police: 'bold 12px system-ui, sans-serif', couleur: '#ffd54f' });
    }
  }
  // Vénus : le module blindé reste au sol après le départ du ballon.
  if (solide && vol.xModule !== undefined) {
    const sx = W / 2 + (vol.xModule - vol.x) * echelle, sy = fuseeY + (vol.y - vol.sol(vol.xModule)) * echelle;
    if (sx > -100 && sx < W + 100 && sy > -100 && sy < H + 100) {
      dessinerModule(ctx, { f: vol.fModule || vol.f, astre: vol.astre, angle: vol.pente(vol.xModule), throttle: 0, temp: vol.temp, integrite: 100, pose: true, t: vol.t,
        degats: { pression: 0, chaleur: 0, impact: 0 }, taux: { pression: 0, chaleur: 0 }, enDegats: () => false }, sx, sy, Math.max(4, HAUTEUR_MODULE * echelle));
    }
  }
  // Pas de tir : la tour de lancement, à côté de la fusée.
  if (vol.lancement && solide) {
    const xt = 9;
    const sx = W / 2 + (xt - vol.x) * echelle, sy = fuseeY + (vol.y - vol.sol(xt)) * echelle;
    if (sx > -200 && sx < W + 200 && sy > -50) dessinerTour(ctx, sx, sy, echelle, vol.f.etages[0].hauteur);
  }
  // Étage largué qui retombe
  // Échelle d'affichage de la fusée (agrandie quand la caméra est très reculée, pour qu'on la voie) :
  // les débris sont placés par rapport à elle à cette même échelle, sinon ils semblent collés à la fusée.
  const kVisu = hPx / vol.f.hauteur;
  if (vol.etageLargue && dtReel > 0) {
    const e = vol.etageLargue;
    // L'étage vide n'a plus de poussée : gravité (à son altitude) et frottement de l'air seulement.
    avancerDebris(vol, e, dtReel * warp, vol.f.etages[e.etage]);
    e.angle += 0.05 * dtReel * warp;
    const sx = W / 2 + (e.x - vol.x) * kVisu, sy = fuseeY + (vol.y - e.y) * kVisu;
    if (e.t < 120 && sx > -300 && sx < W + 300 && sy > -300 && sy < H + 300) {
      const kk = kVisu, hh = e.h * kk;
      const et = vol.f.etages[e.etage];
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(e.angle);
      // L'étage vide est juste sous la fusée : on le dessine vers le bas depuis son sommet.
      if (et) dessinerEtage(ctx, et, e.etage, hh, hh, kk, null, 0, vol.f.nomLanceur, false);
      ctx.restore();
    }
  }
  // Demi-coiffes qui s'écartent et retombent
  if (vol.coiffeDebris && dtReel > 0) {
    const e = vol.coiffeDebris, ch = vol.f.charge;
    avancerDebris(vol, e, dtReel * warp, null);
    const kk = kVisu;
    const sx = W / 2 + (e.x - vol.x) * kk, sy = fuseeY + (vol.y - e.y) * kk;
    if (e.t < 60) {
      const hc = ch.hauteur * kk, wc = ch.largeur * kk, ecart = Math.min(e.t, 20) * 1.5 * kk;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(e.angle); ctx.translate(0, -(vol.f.hauteur - ch.hauteur) * kk);
      for (const sg of [-1, 1]) {
        ctx.save(); ctx.translate(sg * ecart, 0); ctx.rotate(sg * Math.min(1.2, e.t * 0.25));
        ctx.fillStyle = '#f5f5f5';
        ctx.beginPath(); ctx.moveTo(0, -hc * 0.12); ctx.lineTo(sg * wc / 2, -hc * 0.12); ctx.lineTo(sg * wc / 2, -hc * 0.55);
        ctx.bezierCurveTo(sg * wc / 2, -hc * 0.8, sg * wc * 0.12, -hc, 0, -hc); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(60,60,60,0.5)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
  if (!vol.fin && dtReel > 0) emettreParticules(vol, W / 2, fuseeY, hPx, dtReel);
  dessinerParticules(ctx, vol, depX, depY, dtReel);
  if (vol.explosion) {
    dessinerExplosion(ctx, vol.explosion, W / 2, fuseeY - hPx * 0.4, dtReel);
  } else {
    dessinerFusee(ctx, vol, W / 2, fuseeY, hPx);
  }
  ctx.restore();

  // Bords rouges qui pulsent quand la coque s'abîme.
  if (vol.enDegats() && !vol.fin) {
    const puls = 0.25 + 0.2 * Math.sin(performance.now() / 120);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,0,0,0)');
    g.addColorStop(1, `rgba(255,${vol.taux.chaleur > vol.taux.pression ? 90 : 0},0,${puls})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  dessinerHUD(ctx, vol, W, H, warp);
}

// ---------- Coiffe ----------
// La coiffe protège la charge utile de l'air. On la largue quand l'air est devenu assez rare :
// la densité qu'a l'atmosphère terrestre vers 110 km (≈ 3 × 10⁻⁶ kg/m³ dans notre modèle).
// Sans atmosphère, elle ne sert à rien : on la largue dès que la fusée a quitté le pas de tir.
const RHO_COIFFE = 1.225 * Math.exp(-110 / 8.5);
const TEXTES_COIFFE = {
  dense: 'Éjection de la coiffe, les couches denses sont derrière nous.',
  tenue: 'Atmosphère ténue, éjection de la coiffe.',
  vide: 'Dans le vide, éjection de la coiffe.',
};
// Dense à partir de 0,1 bar au sol (Terre, Vénus, Titan) ; ténue en dessous (Mars, Pluton, Triton).
function typeAtmosphere(a) {
  if (!a.atm || !a.atm.p0) return 'vide';
  return a.atm.p0 >= 0.1 ? 'dense' : 'tenue';
}
function coiffeALarguer(a, alt, hauteurSol) {
  if (hauteurSol < 1000) return false;
  return typeAtmosphere(a) === 'vide' || conditions(a, alt).rho < RHO_COIFFE;
}

// Débris (étage vide, demi-coiffes) : mouvement balistique, comme la fusée mais sans poussée.
// Gravité à leur altitude (moins l'effet centrifuge), frottement de l'air selon leur masse et leur section.
function avancerDebris(vol, e, duree, etage) {
  const a = vol.astre, R = a.rayonKm * 1000;
  const masse = etage ? etage.masseSeche : 1500;
  const section = etage ? Math.PI * Math.pow((etage.largeur || 4) / 2, 2) : 20;
  let reste = duree;
  while (reste > 0) {
    const h = Math.min(0.5, reste);
    const c = conditions(a, Math.max(0, e.y));
    e.vy += (-c.g + (e.vx * e.vx) / (R + e.y)) * h;
    const v = Math.hypot(e.vx, e.vy);
    if (c.rho > 0 && v > 0) {
      const k = (0.5 * c.rho * 0.9 * section * v / masse) * h;   // semi-implicite, stable
      e.vx /= 1 + k; e.vy /= 1 + k;
    }
    e.x += e.vx * h; e.y += e.vy * h;
    e.t += h; reste -= h;
  }
}

// Astres visibles dans le ciel, pour l'infobulle au survol : [{ x, y, r, id }].
let ZONES_CIEL = [];

// Ciel, étoiles, planète mère et Soleil (vues d'atterrissage et d'exploration).
// Temps du jeu (s) pour le ciel : date de la campagne (ou date de départ en visite rapide) + durée du vol.
// vol.t avance déjà du temps simulé (facteur de temps compris) : on ne le multiplie jamais une seconde fois.
function tempsCiel(vol) {
  const base = typeof etat !== 'undefined' && etat.enVoyage && etat.voyage ? etat.voyage.t : DATE_DEBUT;
  return base + (vol.t || 0);
}

// ---------- Ciel vu de la surface ----------
// Le jeu est en 2D : le ciel est la demi-voûte du plan des orbites, au-dessus de l'horizon.
// α = angle depuis le zénith (négatif à gauche = est, où les astres se lèvent ; positif à droite = ouest).
// Le zénith tourne avec l'astre (rotationDe) : un astre vu sous la direction ψ est à α = φ − ψ.
let LUMIERE_SOL = 1;   // éclairage du sol par le Soleil (1 : plein jour, 0 : nuit), utilisé par dessinerTerrain

function zenithCiel(a, t, porteur) {
  const rot = rotationDe(a);
  const pos = etatAbsolu(a.id, t).r;
  if (!porteur.ciel) {
    // Lieu de la mission : sur une lune, la face tournée vers sa planète (α = +35°, visible toute la visite) ;
    // ailleurs, on arrive le matin (Soleil à α = −30°).
    let psi, alpha;
    if (a.parent) { const pp = etatAbsolu(a.parent, t).r; psi = Math.atan2(pp[1] - pos[1], pp[0] - pos[0]); alpha = 35 * DEG; }
    else { psi = Math.atan2(-pos[1], -pos[0]); alpha = -30 * DEG; }
    porteur.ciel = { t0: t, phi0: psi + alpha };
  }
  return porteur.ciel.phi0 + (2 * Math.PI * (t - porteur.ciel.t0)) / (rot.heures * 3600);
}
const angleDansPi = (x) => { x %= 2 * Math.PI; if (x > Math.PI) x -= 2 * Math.PI; if (x < -Math.PI) x += 2 * Math.PI; return x; };

// t : temps du jeu (s) ; porteur : objet qui garde le lieu de la mission (le vol). Renvoie l'éclairage (0 à 1).
// Positions réelles des astres à cet instant, tailles apparentes réelles, phases, jour et nuit, éclipses.
function dessinerFond(ctx, a, c, W, H, sousLesNuages, t = DATE_DEBUT, porteur = {}) {
  ZONES_CIEL = [];
  const vide = a.type === 'etoile';
  // Où est le Soleil ? Élévation au-dessus de l'horizon → jour, crépuscule ou nuit.
  let phi = 0, pos = [0, 0], alphaSoleil = 0, jour = 1, kAng = W / (140 * DEG);
  const posCiel = (al) => ({ x: W / 2 + Math.sin(al) * W * 0.55, y: H * 0.62 - Math.cos(al) * H * 0.55, visible: Math.cos(al) > -0.08 });
  if (!vide) {
    phi = zenithCiel(a, t, porteur);
    pos = etatAbsolu(a.id, t).r;
    alphaSoleil = angleDansPi(phi - Math.atan2(-pos[1], -pos[0]));
    const elev = Math.PI / 2 - Math.abs(alphaSoleil);
    const u = Math.max(0, Math.min(1, (elev + 6 * DEG) / (12 * DEG)));   // crépuscule de −6° à +6°
    jour = u * u * (3 - 2 * u);
    // Éclipse : la planète d'une lune passe devant le Soleil.
    if (a.parent) {
      const pp = etatAbsolu(a.parent, t).r, dp = V.sub(pp, pos), distP = V.norm(dp);
      const rP = Math.asin(Math.min(1, ASTRES_PAR_ID[a.parent].rayonKm / distP));
      const rS = Math.asin(Math.min(1, etoileRacine().rayonKm / V.norm(pos)));
      const ecart = Math.abs(angleDansPi(Math.atan2(dp[1], dp[0]) - Math.atan2(-pos[1], -pos[0])));
      const couvert = Math.max(0, Math.min(1, (rP + rS - ecart) / (2 * rS)));
      if (couvert > 0 && distP < V.norm(pos)) { jour *= 1 - 0.9 * couvert; porteur.eclipse = couvert; } else porteur.eclipse = 0;
    }
  }
  LUMIERE_SOL = vide ? 1 : 0.3 + 0.7 * jour;
  // Ciel : noir dans le vide ou la nuit, couleur de l'atmosphère quand l'air s'épaissit et qu'il fait jour.
  let tCiel = 0;
  if (a.atm && !vide) tCiel = Math.min(1, Math.sqrt(c.p / 0.3)) * jour;
  let ciel = melanger('#02030a', a.couleurs.ciel, tCiel);
  if (sousLesNuages) {
    const prof = Math.min(1, Math.log(c.p) / Math.log(200));
    ciel = melanger(a.couleurs.ciel, '#1a0800', prof);
  }
  if (a.type === 'etoile') {
    const lum = Math.min(1, Math.max(0, (c.t - 300) / 4000));
    ciel = melanger('#02030a', '#ff8a00', lum * 0.8);
  }
  ctx.fillStyle = ciel;
  ctx.fillRect(-10, -10, W + 20, H + 20);

  // Étoiles : visibles dans le vide et la nuit, effacées par un ciel de jour. Elles défilent avec la rotation
  // de l'astre (une rotation complète fait défiler 4 largeurs d'écran).
  const visEt = 1 - Math.min(1, tCiel * 1.4);
  if (visEt > 0.02 && !vide) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * visEt})`;
    const decal = ((phi / (2 * Math.PI)) * 4) % 1;
    for (const e of ETOILES) ctx.fillRect((((e.x - decal) % 1) + 1) % 1 * W, e.y * H, e.r, e.r);
  }
  if (vide) return 1;

  // Soleil, à sa vraie place et à sa taille apparente (au moins 5 px, avec un halo).
  const pS = posCiel(alphaSoleil);
  if (pS.visible && !(porteur.eclipse > 0.98)) {
    const rS = Math.max(5, Math.asin(etoileRacine().rayonKm / V.norm(pos)) * kAng);
    const g = ctx.createRadialGradient(pS.x, pS.y, 0, pS.x, pS.y, rS * 4);
    g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(0.25, 'rgba(255,240,200,0.9)'); g.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(pS.x, pS.y, rS * 4, 0, Math.PI * 2); ctx.fill();
    ZONES_CIEL.push({ x: pS.x, y: pS.y, r: Math.max(rS, 10), id: SYSTEME.etoile });
  }

  // Autres astres : planète mère, lunes sœurs, ses propres lunes, et les planètes (points lumineux).
  const ids = new Set(SYSTEME.planetes);
  if (a.parent) { ids.add(a.parent); for (const s of ENFANTS[a.parent] || []) if (s.rayonKm >= 100) ids.add(s.id); }
  for (const s of ENFANTS[a.id] || []) if (s.rayonKm >= 5) ids.add(s.id);
  ids.delete(a.id);
  const liste = [];
  for (const id of ids) {
    const X = ASTRES_PAR_ID[id];
    const pX = etatAbsolu(id, t).r, d = V.sub(pX, pos), dist = V.norm(d);
    const psi = Math.atan2(d[1], d[0]);
    const al = angleDansPi(phi - psi);
    const p = posCiel(al);
    if (!p.visible) continue;
    liste.push({ X, d, dist, psi, al, p, rAng: Math.asin(Math.min(1, X.rayonKm / dist)) });
  }
  liste.sort((u, w) => w.dist - u.dist);   // les plus lointains d'abord
  for (const o of liste) {
    const { X, d, dist, psi, al, p } = o;
    let r = o.rAng * kAng;
    // Phase : direction du Soleil vue depuis l'astre, dans le plan du ciel (latéral) et vers nous (profondeur).
    const s = V.unit(V.mul(etatAbsolu(X.id, t).r, -1)), dh = V.mul(d, 1 / dist);
    const lateral = s[0] * -dh[1] + s[1] * dh[0];
    const versNous = -(s[0] * dh[0] + s[1] * dh[1]);
    const lumiere = [lateral * -Math.cos(al), lateral * -Math.sin(al), versNous];
    const eclaire = (1 + versNous) / 2;                        // fraction éclairée vue d'ici
    ctx.globalAlpha = Math.max(0.3, visEt);
    if (r >= 2.5) {
      // Face visible : la planète d'une lune synchrone tourne à la période synodique ; sinon sa propre rotation.
      let lon0 = longitudeVue(X, t);
      if (X.id === a.parent && rotationDe(a).synchrone) {
        const periodeOrbiteH = (a.orbite.retro ? -1 : 1) * (360 / a.orbite.n) * 24;
        lon0 = (((360 * t) / 3600) * (1 / rotationDe(X).heures - 1 / periodeOrbiteH)) % 360;
      }
      dessinerGlobe(ctx, X, p.x, p.y, X.id === 'saturne' ? r * 0.55 : r, { vue: 'equateur', lon0, lumiere, inclinaisonAnneaux: 0.28 });
    } else {
      // Point lumineux : plus brillant quand il est plein (phase) et quand il est gros.
      ctx.globalAlpha = Math.max(0.25, visEt) * (0.35 + 0.65 * eclaire);
      ctx.fillStyle = melanger(X.couleurs.disque.length === 7 ? X.couleurs.disque : '#cccccc', '#ffffff', 0.5);
      ctx.beginPath(); ctx.arc(p.x, p.y, X.parent ? 1.4 : 1.8, 0, Math.PI * 2); ctx.fill();
      r = 1.8;
    }
    ctx.globalAlpha = 1;
    ZONES_CIEL.push({ x: p.x, y: p.y, r: Math.max(r, 8), id: X.id });
  }
  return jour;
}

function astreDuCielSous(x, y) {
  for (const z of ZONES_CIEL) if (Math.hypot(z.x - x, z.y - y) < z.r) return z.id;
  return null;
}

function dessinerTerrain(ctx, vol, W, H, echelle, fuseeY) {
  const a = vol.astre;
  const ecranY = (wx) => fuseeY + (vol.y - vol.sol(wx)) * echelle;
  const pas = 3;
  const pts = [];
  // Rotondité : chaque point du sol est placé sur la sphère (rayon R + relief), vu depuis la fusée.
  // Près du sol, c'est le dessin plat habituel ; en altitude, l'horizon se courbe et s'éloigne.
  const R = a.rayonKm * 1000;
  // (calcul direct : l'écran d'exploration passe un objet simplifié, sans altSol)
  const alt = Math.max(0, vol.y - vol.sol(vol.x));
  const courbe = (W / 2 / echelle) * (W / 2 / echelle) / (2 * R) * echelle > 0.5;   // flèche visible (> 0,5 px) ?
  if (!courbe) {
    for (let sx = -pas; sx <= W + pas; sx += pas) { const wx = vol.x + (sx - W / 2) / echelle; pts.push([sx, ecranY(wx), wx]); }
  } else {
    // Au-delà de l'horizon (angle acos(R / (R + h))), le sol est caché par la courbure.
    // L'horizon se calcule depuis la caméra, pas depuis l'engin : quand la caméra recule (lanceur de retour
    // de Vénus qui descend), l'engin posé ne verrait que 3 km, et les bords de l'écran restaient sans sol.
    const altVue = Math.max(alt, H / echelle);
    const thetaH = Math.acos(Math.min(1, R / (R + altVue + 1)));
    const thetaEcran = Math.asin(Math.min(1, (W / 2 + 40) / echelle / R));
    const th = Math.min(thetaH, thetaEcran);
    const n = Math.ceil(W / pas);
    for (let i = 0; i <= n; i++) {
      const theta = -th + (2 * th * i) / n;
      const wx = vol.x + theta * R;
      const r = R + vol.sol(wx);
      const sx = W / 2 + r * Math.sin(theta) * echelle;
      const sy = fuseeY + (vol.y - (r * Math.cos(theta) - R)) * echelle;
      pts.push([sx, sy, wx]);
    }
    // Bords : on ferme vers le bas de l'écran le long du limbe.
    pts.unshift([pts[0][0], H + 10, pts[0][2]]);
    pts.push([pts[pts.length - 1][0], H + 10, pts[pts.length - 1][2]]);
  }

  // Sol, plus sombre en profondeur.
  const haut = Math.min(...pts.map((p) => p[1]));
  if (haut > H + 10) return;
  // Halo d'atmosphère au-dessus du limbe, quand on est assez haut pour voir la courbure.
  if (courbe && a.atm && a.atm.p0 > 0.001) {
    const ep = Math.max(3, Math.min(60, a.atm.H * 1000 * echelle * 1.5));
    ctx.save();
    ctx.lineJoin = 'round';
    for (const [k, al] of [[1, 0.18], [0.55, 0.28], [0.25, 0.4]]) {
      ctx.strokeStyle = a.couleurs.ciel; ctx.globalAlpha = al; ctx.lineWidth = ep * k;
      ctx.beginPath(); pts.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    }
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, haut, 0, H);
  // La nuit (ou pendant une éclipse), le sol est moins éclairé : LUMIERE_SOL vient du calcul du ciel.
  g.addColorStop(0, assombrir(a.couleurs.sol, LUMIERE_SOL));
  g.addColorStop(1, assombrir(a.couleurs.sol, 0.45 * LUMIERE_SOL));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], H + 10);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(W + pas, H + 10);
  ctx.closePath();
  ctx.fill();
  if (vol.geo) dessinerGeoKourou(ctx, vol, pts, haut, W, H, alt);

  // Pentes éclairées d'un côté, ombrées de l'autre.
  ctx.lineWidth = 2;
  for (let i = 1; i < pts.length; i++) {
    const dy = pts[i][1] - pts[i - 1][1];
    ctx.strokeStyle = dy < 0 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
  }

  // Rochers, plantés dans le relief. Sans atmosphère (ni vent ni eau), ils gardent des arêtes vives ;
  // sous une atmosphère épaisse, l'érosion les arrondit.
  if (echelle > 0.15) {
    const pasR = 8;
    const erosion = a.atm ? Math.min(1, Math.sqrt(a.atm.p0) * 0.8) : 0;   // 0 : anguleux, 1 : bien arrondi
    const x0 = vol.x - W / 2 / echelle, x1 = vol.x + W / 2 / echelle;
    for (let k = Math.floor(x0 / pasR); k <= Math.ceil(x1 / pasR); k++) {
      const h = hash(k);
      if (h < 0.55) continue;
      const wx = k * pasR + hash(k + 3) * pasR;
      if (vol.geo && geoKourou(wx).type === 'ocean') continue;            // pas de rochers en mer
      const tailleM = 0.5 + Math.pow(hash(k + 7), 2) * 3;                 // m
      const demi = tailleM * 1.3;                                         // demi-largeur (m)
      const sx = W / 2 + (wx - vol.x) * echelle;
      if (sx < -100 || sx > W + 100) continue;
      // La base suit le sol à gauche, au milieu et à droite, un peu enfoncée : pas de vide sous la roche.
      const enfonce = Math.max(1.5, tailleM * 0.25 * echelle);
      const yg = ecranY(wx - demi) + enfonce, ym = ecranY(wx) + enfonce, yd = ecranY(wx + demi) + enfonce;
      const haut = Math.max(2, tailleM * echelle * (0.9 + 0.5 * hash(k + 13)));
      // Silhouette : quelques sommets irréguliers entre les deux pieds.
      const n = 5 + Math.floor(hash(k + 17) * 3);
      const pts = [[sx - demi * echelle, yg]];
      for (let i = 1; i < n; i++) {
        const f = i / n;
        const bosse = Math.sin(f * Math.PI);                              // plus haut au milieu
        const alea = 0.55 + 0.6 * hash(k * 7 + i);
        const base = yg + (yd - yg) * f;
        pts.push([sx + (f * 2 - 1) * demi * echelle + (hash(k * 3 + i) - 0.5) * demi * echelle * 0.3, base - haut * bosse * alea]);
      }
      pts.push([sx + demi * echelle, yd]);
      const couleur = assombrir(a.couleurs.sol, (0.5 + 0.25 * hash(k + 11)) * LUMIERE_SOL);
      ctx.fillStyle = couleur;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      if (erosion < 0.2) {
        for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);           // arêtes vives
      } else {
        for (let i = 1; i < pts.length; i++) {                          // contours adoucis par l'érosion
          const p0 = pts[i - 1], p1 = pts[i];
          ctx.quadraticCurveTo(p0[0], p0[1], (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
        }
        ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      }
      ctx.lineTo(sx, ym + enfonce);
      ctx.closePath();
      ctx.fill();
      // Faces éclairées (lumière venant de la gauche) et faces dans l'ombre.
      const sommet = pts.reduce((m, p) => (p[1] < m[1] ? p : m), pts[0]);
      ctx.fillStyle = `rgba(255,255,255,${erosion < 0.2 ? 0.22 : 0.12})`;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(sommet[0], sommet[1]); ctx.lineTo(sommet[0] - (sommet[0] - pts[0][0]) * 0.3, ym); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.moveTo(sommet[0], sommet[1]); ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); ctx.lineTo(sx + (pts[pts.length - 1][0] - sx) * 0.2, ym); ctx.closePath(); ctx.fill();
    }
  }

  // Zone visée par le pilote automatique.
  if (vol.autopilote && vol.cibleX !== null && vol.phase === 'descente') {
    const sx = W / 2 + (vol.cibleX - vol.x) * echelle;
    const sy = ecranY(vol.cibleX);
    ctx.strokeStyle = '#66bb6a';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(sx - 14, sy - 3); ctx.lineTo(sx + 14, sy - 3); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx, sy - 22); ctx.stroke();
  }
}

// Départ de Kourou : forêt, savane, montagnes et mers sous la trace, avec leur nom vu d'altitude.
function dessinerGeoKourou(ctx, vol, pts, haut, W, H, alt) {
  const geo = pts.map((p) => geoKourou(p[2]));
  const remplir = (debut, fin, couleur) => {
    const g = ctx.createLinearGradient(0, haut, 0, H);
    g.addColorStop(0, assombrir(couleur, LUMIERE_SOL));
    g.addColorStop(1, assombrir(couleur, 0.45 * LUMIERE_SOL));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(pts[debut][0], H + 10);
    for (let k = debut; k <= fin; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.lineTo(pts[fin][0], H + 10);
    ctx.closePath();
    ctx.fill();
  };
  // Étendues de même nature d'un seul tenant.
  for (let debut = 0, i = 1; i <= pts.length; i++) {
    if (i < pts.length && geo[i].type === geo[debut].type) continue;
    remplir(debut, Math.min(i, pts.length - 1), COULEURS_GEO[geo[debut].type]);
    // Reflet du ciel à la surface de la mer.
    if (geo[debut].type === 'ocean') {
      ctx.save();
      ctx.strokeStyle = `rgba(190,225,255,${0.35 * LUMIERE_SOL})`; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = debut; k <= Math.min(i, pts.length - 1); k++) { if (k === debut) ctx.moveTo(pts[k][0], pts[k][1]); else ctx.lineTo(pts[k][0], pts[k][1]); }
      ctx.stroke();
      ctx.restore();
    }
    debut = i;
  }
  // Noms des régions, une fois assez haut pour embrasser le paysage.
  if (alt < 8000) return;
  ctx.save();
  for (let debut = 0, i = 1; i <= pts.length; i++) {
    if (i < pts.length && geo[i].nom === geo[debut].nom) continue;
    const fin = Math.min(i, pts.length - 1);
    // Partie visible de l'étendue : le nom reste à l'écran.
    const xa = Math.max(pts[debut][0], 0), xb = Math.min(pts[fin][0], W);
    if (xb - xa > 110) {
      let m = debut;
      while (m < fin && pts[m][0] < (xa + xb) / 2) m++;
      const nom = geo[debut].nom;
      texteSurFond(ctx, nom.charAt(0).toUpperCase() + nom.slice(1), pts[m][0], Math.min(H - 12, pts[m][1] + 22),
        { police: '12px system-ui, sans-serif', couleur: geo[debut].type === 'ocean' ? '#bfe0ff' : '#e8f0d0' });
    }
    debut = i;
  }
  ctx.restore();
}

// Fumée quand la coque est abîmée, étincelles quand elle encaisse des dégâts.
function emettreParticules(vol, x, y, h, dt) {
  const usure = 1 - vol.integrite / 100;
  const cy = y - h * 0.45;
  // Grands nuages de fumée au décollage (eau du déluge vaporisée et gaz des moteurs).
  if (vol.f.mega && vol.throttle > 0 && vol.altSol() < 300) {
    for (let i = 0; i < 4; i++) {
      const cote = Math.random() < 0.5 ? -1 : 1;
      vol.fx.push({ type: 'vapeur', x: x + cote * Math.random() * h * 0.1, y, vx: cote * (40 + Math.random() * 120), vy: -5 - Math.random() * 25,
        vie: 0, max: 2.5 + Math.random() * 2.5, r: 8 + Math.random() * 14 });
    }
  }
  if (usure > 0.25 && Math.random() < usure * 1.2) {
    vol.fx.push({ type: 'fumee', x: x + (Math.random() - 0.5) * h * 0.2, y: cy + (Math.random() - 0.5) * h * 0.4,
      vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 20, vie: 0, max: 1.5 + Math.random() * 1.5, r: 4 + Math.random() * 6 });
  }
  if (vol.enDegats()) {
    const n = Math.min(6, 1 + Math.floor((vol.taux.pression + vol.taux.chaleur) / 4));
    const chaud = vol.taux.chaleur > vol.taux.pression;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      vol.fx.push({ type: chaud ? 'braise' : 'etincelle', x: x + (Math.random() - 0.5) * h * 0.26, y: cy + (Math.random() - 0.5) * h * 0.7,
        vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80, vie: 0, max: 0.3 + Math.random() * 0.4, r: 1.5 });
    }
  }
  if (vol.fx.length > 400) vol.fx.splice(0, vol.fx.length - 400);
}

function dessinerParticules(ctx, vol, depX, depY, dt) {
  const vivantes = [];
  for (const p of vol.fx) {
    p.vie += dt;
    if (p.vie > p.max) continue;
    p.x += p.vx * dt + depX;
    p.y += p.vy * dt + depY;
    const k = p.vie / p.max;
    if (p.type === 'fumee' || p.type === 'vapeur') {
      ctx.fillStyle = p.type === 'vapeur' ? `rgba(235,235,235,${0.7 * (1 - k)})` : `rgba(70,70,70,${0.45 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + 2 * k), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = p.type === 'braise' ? `rgba(255,${Math.round(160 - 100 * k)},0,${1 - k})` : `rgba(255,255,${Math.round(200 - 150 * k)},${1 - k})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    vivantes.push(p);
  }
  vol.fx = vivantes;
}

const HAUTEUR_MODULE = 7; // m : l'atterrisseur est un module trapu, pas une fusée

// Atterrisseur : module léger à 4 pieds (étage de descente doré + cabine de remontée), façon Apollo.
function dessinerModule(ctx, vol, x, y, h) {
  const ch = vol.f.choix;
  const degats = vol.degats || { pression: 0, chaleur: 0, impact: 0 };
  const integrite = vol.integrite === undefined ? 100 : vol.integrite;
  const pince = 1 - 0.15 * Math.min(1, degats.pression / 100);
  const brule = Math.min(1, degats.chaleur / 100);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vol.angle);
  // Flamme sous la tuyère
  if (vol.throttle > 0) {
    const L = h * (0.25 + 0.55 * vol.throttle) * (0.85 + Math.random() * 0.3);
    const gr = ctx.createLinearGradient(0, -h * 0.12, 0, L);
    gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.4, '#ffab40'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(-h * 0.07, -h * 0.1); ctx.lineTo(0, L); ctx.lineTo(h * 0.07, -h * 0.1); ctx.fill();
  }
  // Pieds et patins
  ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = Math.max(1.5, h * 0.025);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * h * 0.32, -h * 0.42); ctx.lineTo(s * h * 0.62, -h * 0.03);
    ctx.moveTo(s * h * 0.34, -h * 0.22); ctx.lineTo(s * h * 0.6, -h * 0.05);
  }
  ctx.stroke();
  ctx.fillStyle = '#90a4ae';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * h * 0.62, -h * 0.02, h * 0.07, h * 0.025, 0, 0, Math.PI * 2); ctx.fill(); }
  // Tuyère de descente
  ctx.fillStyle = '#546e7a';
  ctx.beginPath(); ctx.moveTo(-h * 0.06, -h * 0.2); ctx.lineTo(-h * 0.1, -h * 0.1); ctx.lineTo(h * 0.1, -h * 0.1); ctx.lineTo(h * 0.06, -h * 0.2); ctx.fill();
  // Forme du module (pour les fissures et le rougeoiement)
  const wd = h * 0.74, wc = h * 0.52 * pince;
  const forme = new Path2D();
  forme.rect(-wd / 2, -h * 0.5, wd, h * 0.3);                // étage de descente
  forme.moveTo(-wc / 2, -h * 0.5);                             // cabine à facettes
  forme.lineTo(-wc / 2 - h * 0.04, -h * 0.72);
  forme.lineTo(-wc * 0.3, -h * 0.9);
  forme.lineTo(wc * 0.3, -h * 0.9);
  forme.lineTo(wc / 2 + h * 0.04, -h * 0.72);
  forme.lineTo(wc / 2, -h * 0.5);
  forme.closePath();
  // Étage de descente : feuille d'or isolante (assombrie par la chaleur), bouclier dessous
  ctx.fillStyle = melanger('#d4a017', '#3e2723', brule * 0.7);
  ctx.fillRect(-wd / 2, -h * 0.5, wd, h * 0.3);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-wd / 2 + (wd * i) / 4, -h * 0.5); ctx.lineTo(-wd / 2 + (wd * i) / 4, -h * 0.2); ctx.stroke(); }
  const coulBouclier = { ceramique: '#e0e0e0', ablatif: '#6d4c41', carbone: '#212121', tungstene: '#90a4ae' }[ch.bouclier];
  if (coulBouclier) { ctx.fillStyle = coulBouclier; ctx.fillRect(-wd / 2, -h * 0.23, wd, h * 0.04); }
  // Cabine de remontée
  const cabine = new Path2D();
  cabine.moveTo(-wc / 2, -h * 0.5); cabine.lineTo(-wc / 2 - h * 0.04, -h * 0.72); cabine.lineTo(-wc * 0.3, -h * 0.9);
  cabine.lineTo(wc * 0.3, -h * 0.9); cabine.lineTo(wc / 2 + h * 0.04, -h * 0.72); cabine.lineTo(wc / 2, -h * 0.5); cabine.closePath();
  ctx.fillStyle = melanger('#cfd8dc', '#3e2723', brule * 0.6);
  ctx.fill(cabine);
  if (ch.coque !== 'aucun') {
    const ep = { leger: 1, renforce: 2, lourd: 3, abyssal: 4 }[ch.coque] || 1;
    ctx.strokeStyle = '#607d8b'; ctx.lineWidth = ep; ctx.stroke(cabine);
  }
  // Hublot triangulaire, tunnel d'amarrage, antenne
  ctx.fillStyle = integrite < 30 ? '#455a64' : '#263238';
  ctx.beginPath(); ctx.moveTo(-wc * 0.28, -h * 0.66); ctx.lineTo(-wc * 0.05, -h * 0.66); ctx.lineTo(-wc * 0.2, -h * 0.78); ctx.fill();
  ctx.fillStyle = '#b0bec5'; ctx.fillRect(-h * 0.06, -h * 0.97, h * 0.12, h * 0.07);
  ctx.strokeStyle = '#eceff1'; ctx.lineWidth = Math.max(1, h * 0.012);
  ctx.beginPath(); ctx.moveTo(wc * 0.25, -h * 0.9); ctx.lineTo(wc * 0.35, -h * 1.02); ctx.stroke();
  ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(wc * 0.36, -h * 1.04, h * 0.035, 0, Math.PI * 2); ctx.fill();
  // Petits propulseurs d'attitude
  ctx.fillStyle = '#78909c';
  for (const s of [-1, 1]) ctx.fillRect(s * (wc / 2 + h * 0.02) - h * 0.02, -h * 0.66, h * 0.04, h * 0.05);
  // Panneaux solaires / anti-vent solaire
  if (ch.panneau !== 'aucun') {
    const t = { leger: 0.18, moyen: 0.26, lourd: 0.34, helio: 0.44 }[ch.panneau] || 0.2;
    ctx.fillStyle = '#2f6fd6'; ctx.strokeStyle = '#9ec3ff'; ctx.lineWidth = 1;
    ctx.fillRect(-wd / 2 - h * t, -h * 0.48, h * t, h * 0.12); ctx.strokeRect(-wd / 2 - h * t, -h * 0.48, h * t, h * 0.12);
    ctx.fillRect(wd / 2, -h * 0.48, h * t, h * 0.12); ctx.strokeRect(wd / 2, -h * 0.48, h * t, h * 0.12);
  }
  // Fissures
  const nFiss = Math.round((1 - integrite / 100) * FISSURES.length);
  if (nFiss > 0) {
    ctx.save(); ctx.clip(forme);
    ctx.lineWidth = Math.max(1, h / 60);
    for (let i = 0; i < nFiss; i++) {
      const pts = FISSURES[i];
      ctx.strokeStyle = vol.taux && vol.taux.chaleur > 0 ? 'rgba(255,120,0,0.9)' : 'rgba(30,30,30,0.85)';
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * wd, pts[0][1] * h * 1.1);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] * wd, pts[k][1] * h * 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // Rougeoiement
  const chauffe = Math.max(0, Math.min(1, (vol.temp - 100) / Math.max(200, vol.f.tempMax - 100)));
  if (chauffe > 0.05) {
    ctx.save(); ctx.clip(forme);
    ctx.fillStyle = `rgba(255,${Math.round(120 - 80 * chauffe)},0,${0.55 * chauffe})`;
    ctx.fillRect(-wd, -h, wd * 2, h);
    ctx.restore();
  }
  if (vol.enDegats && vol.enDegats() && Math.sin(performance.now() / 70) > 0) {
    ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 2; ctx.stroke(forme);
  }
  ctx.restore();
}

// Sonde atmosphérique des géantes : pas de pieds, corps fuselé, ailerons en flèche, bras de prélèvement.
function dessinerSondeAtmo(ctx, vol, x, y, h) {
  const degats = vol.degats || { pression: 0, chaleur: 0, impact: 0 };
  const integrite = vol.integrite === undefined ? 100 : vol.integrite;
  const pince = 1 - 0.15 * Math.min(1, degats.pression / 100);
  const brule = Math.min(1, degats.chaleur / 100);
  const w = h * 0.3 * pince;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vol.angle);
  // Trois tuyères et leur flamme
  if (vol.throttle > 0) {
    const L = h * (0.2 + 0.5 * vol.throttle) * (0.85 + Math.random() * 0.3);
    for (const dx of [-0.08, 0, 0.08]) {
      const gr = ctx.createLinearGradient(0, 0, 0, L);
      gr.addColorStop(0, '#e1f5fe'); gr.addColorStop(0.35, '#4fc3f7'); gr.addColorStop(1, 'rgba(0,120,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(dx * h - h * 0.03, 0); ctx.lineTo(dx * h, L * (dx ? 0.8 : 1)); ctx.lineTo(dx * h + h * 0.03, 0); ctx.fill();
    }
  }
  // Ailerons en flèche
  ctx.fillStyle = melanger('#455a64', '#3e2723', brule * 0.6);
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * w * 0.35, -h * 0.42); ctx.lineTo(s * h * 0.36, -h * 0.02); ctx.lineTo(s * h * 0.3, 0); ctx.lineTo(s * w * 0.4, -h * 0.08); ctx.fill();
  }
  // Fuselage en ogive
  const forme = new Path2D();
  forme.moveTo(0, -h);
  forme.bezierCurveTo(w * 0.7, -h * 0.85, w * 0.55, -h * 0.35, w * 0.4, -h * 0.05);
  forme.lineTo(-w * 0.4, -h * 0.05);
  forme.bezierCurveTo(-w * 0.55, -h * 0.35, -w * 0.7, -h * 0.85, 0, -h);
  forme.closePath();
  const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, melanger('#263238', '#3e2723', brule * 0.5)); gr.addColorStop(0.5, melanger('#607d8b', '#4e342e', brule * 0.5)); gr.addColorStop(1, '#263238');
  ctx.fillStyle = gr;
  ctx.fill(forme);
  // Nez en céramique et liserés lumineux
  ctx.save(); ctx.clip(forme);
  ctx.fillStyle = '#eceff1'; ctx.fillRect(-w, -h, w * 2, h * 0.12);
  ctx.strokeStyle = 'rgba(0,229,255,0.85)'; ctx.lineWidth = Math.max(1, h * 0.012);
  ctx.beginPath(); ctx.moveTo(-w * 0.3, -h * 0.75); ctx.lineTo(-w * 0.18, -h * 0.15); ctx.moveTo(w * 0.3, -h * 0.75); ctx.lineTo(w * 0.18, -h * 0.15); ctx.stroke();
  ctx.fillStyle = '#ff7043'; ctx.fillRect(-w, -h * 0.55, w * 2, h * 0.015);
  ctx.restore();
  // Hublots du compartiment d'analyse
  ctx.fillStyle = '#80deea';
  for (const yy of [-0.68, -0.6]) { ctx.beginPath(); ctx.arc(0, yy * h, h * 0.018, 0, Math.PI * 2); ctx.fill(); }
  // Bras de prélèvement, sorti pendant 2 s après chaque prise
  if (vol.tPrelevement !== undefined && vol.t - vol.tPrelevement < 2) {
    ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = Math.max(1.5, h * 0.015);
    ctx.beginPath(); ctx.moveTo(w * 0.4, -h * 0.45); ctx.lineTo(w * 0.4 + h * 0.18, -h * 0.5); ctx.stroke();
    ctx.fillStyle = `rgba(0,229,255,${0.5 + 0.5 * Math.sin(performance.now() / 60)})`;
    ctx.beginPath(); ctx.arc(w * 0.4 + h * 0.2, -h * 0.5, h * 0.03, 0, Math.PI * 2); ctx.fill();
  }
  // Fissures, chaleur, alerte (comme les autres engins)
  const nFiss = Math.round((1 - integrite / 100) * FISSURES.length);
  if (nFiss > 0) {
    ctx.save(); ctx.clip(forme);
    ctx.lineWidth = Math.max(1, h / 60); ctx.strokeStyle = 'rgba(20,20,20,0.85)';
    for (let i = 0; i < nFiss; i++) {
      const pts = FISSURES[i];
      ctx.beginPath(); ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] * w, pts[k][1] * h);
      ctx.stroke();
    }
    ctx.restore();
  }
  const chauffe = Math.max(0, Math.min(1, (vol.temp - 100) / Math.max(200, vol.f.tempMax - 100)));
  if (chauffe > 0.05) { ctx.save(); ctx.clip(forme); ctx.fillStyle = `rgba(255,${Math.round(120 - 80 * chauffe)},0,${0.55 * chauffe})`; ctx.fillRect(-w, -h, w * 2, h); ctx.restore(); }
  if (vol.enDegats && vol.enDegats() && Math.sin(performance.now() / 70) > 0) { ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 2; ctx.stroke(forme); }
  ctx.restore();
}

function dessinerFusee(ctx, vol, x, y, h) {
  // Grands lanceurs : fusées. Géantes gazeuses : sonde atmosphérique. Ailleurs : module d'atterrissage.
  if (vol.astre && vol.astre.type === 'gazeuse' && !(vol.f && vol.f.mega)) return dessinerSondeAtmo(ctx, vol, x, y, h * 1.3);
  if (vol.phase === 'ballon') return dessinerBallon(ctx, vol, x, y, h / HAUTEUR_MODULE);
  if (!(vol.f && vol.f.mega)) return dessinerModule(ctx, vol, x, y, h);
  return dessinerLanceur(ctx, vol, x, y, h);
}

// ---------- Grands lanceurs ----------
// La fusée est dessinée étage par étage, de bas en haut, avec la charge utile au sommet.
// À chaque séparation l'étage du bas disparaît ; après le largage de la coiffe on voit
// l'orbiteur et son atterrisseur : la fusée ressemble de plus en plus à ce qui part en orbite.
function dessinerLanceur(ctx, vol, x, y, h) {
  const f = vol.f;
  const k = h / f.hauteur;                       // pixels par mètre
  const degats = vol.degats || { pression: 0, chaleur: 0, impact: 0 };
  const brule = Math.min(1, degats.chaleur / 100);
  const bas = f.etages[f.etage];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vol.angle || 0);

  // Flamme : aussi large que les moteurs allumés.
  if (vol.throttle > 0) {
    const lg = bas.largeur * k * (bas.moteurs > 1 ? 0.42 : 0.2) * (0.8 + 0.3 * vol.throttle);
    const L = Math.max(lg * 3, bas.largeur * k * (2.5 + 4 * vol.throttle)) * (0.85 + Math.random() * 0.3);
    const gr = ctx.createLinearGradient(0, 0, 0, L);
    gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.35, '#ffab40'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(-lg, 0); ctx.quadraticCurveTo(-lg * 1.3, L * 0.4, 0, L); ctx.quadraticCurveTo(lg * 1.3, L * 0.4, lg, 0); ctx.fill();
  }

  let yb = 0;
  for (let i = f.etage; i < f.etages.length; i++) {
    const e = f.etages[i];
    const dessus = i + 1 < f.etages.length ? f.etages[i + 1].hauteur : f.charge.hauteur;
    const len = (e.hauteur - dessus) * k;
    const dessous = i > f.etage ? f.etages[i - 1].largeur * k : null;
    dessinerEtage(ctx, e, i, yb, len, k, dessous, brule, f.nomLanceur, vol.throttle > 0 && i === f.etage);
    yb -= len;
  }
  const wHaut = f.etages[f.etages.length - 1].largeur * k;
  if (!vol.coiffeLarguee) dessinerCoiffe(ctx, yb, f.charge.hauteur * k, f.charge.largeur * k, wHaut, f.charge.tour);
  else if (f.charge.capsule) dessinerCapsule(ctx, yb, f.charge.hauteur * k, f.charge.largeur * k);
  else dessinerChargeUtile(ctx, yb, f.charge.hauteur * k, f.charge.largeur * k, wHaut);

  // Rougeoiement quand la coque chauffe, contour rouge pendant les dégâts.
  const wMax = f.etages[f.etage].largeur * k;
  const chauffe = Math.max(0, Math.min(1, ((vol.temp || 20) - 100) / Math.max(200, f.tempMax - 100)));
  if (chauffe > 0.05) {
    ctx.fillStyle = `rgba(255,${Math.round(120 - 80 * chauffe)},0,${0.45 * chauffe})`;
    ctx.fillRect(-wMax / 2, -h, wMax, h);
  }
  if (vol.enDegats && vol.enDegats() && Math.sin(performance.now() / 70) > 0) {
    ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 2;
    ctx.strokeRect(-wMax / 2, -h, wMax, h);
  }
  ctx.restore();
}

// Un étage, de yb (bas) à yb - len (haut). enBas : c'est l'étage qui pousse, ses tuyères sont visibles.
// largeurDessous : largeur de l'étage inférieur (inter-étage conique s'il est plus large).
function dessinerEtage(ctx, e, i, yb, len, k, largeurDessous, brule, nomLanceur, allume) {
  const w = e.largeur * k;
  const enBas = largeurDessous === null;
  const blanc = melanger('#eceff1', '#3e2723', brule * 0.8);
  let y0 = yb;   // bas du cylindre
  if (enBas) {
    // Tuyères : on en voit au plus trois de profil.
    const nz = Math.min(len * 0.18, w * 0.45);
    const vis = Math.min(3, e.moteurs);
    const pas = w / vis;
    for (let j = 0; j < vis; j++) {
      const cx = -w / 2 + pas * (j + 0.5);
      const bh = pas * 0.28, bb = pas * 0.42;
      ctx.fillStyle = '#37474f';
      ctx.beginPath(); ctx.moveTo(cx - bh, yb - nz); ctx.lineTo(cx - bb, yb); ctx.lineTo(cx + bb, yb); ctx.lineTo(cx + bh, yb - nz); ctx.fill();
      if (allume) { ctx.fillStyle = 'rgba(255,171,64,0.8)'; ctx.fillRect(cx - bb * 0.8, yb - nz * 0.15, bb * 1.6, nz * 0.15); }
    }
    // Jupe de poussée
    ctx.fillStyle = '#263238';
    ctx.fillRect(-w / 2, yb - nz - Math.max(1, len * 0.03), w, Math.max(1, len * 0.03));
    y0 = yb - nz - Math.max(1, len * 0.03);
  } else {
    // Inter-étage : cache les tuyères tant que l'étage du dessous est là.
    const hi = Math.min(len * 0.22, w * 0.5);
    ctx.fillStyle = melanger('#cfd8dc', '#3e2723', brule * 0.8);
    ctx.beginPath(); ctx.moveTo(-largeurDessous / 2, yb); ctx.lineTo(-w / 2, yb - hi); ctx.lineTo(w / 2, yb - hi); ctx.lineTo(largeurDessous / 2, yb); ctx.fill();
    ctx.fillStyle = '#263238'; ctx.fillRect(-largeurDessous / 2, yb - Math.max(1, hi * 0.12), largeurDessous, Math.max(1, hi * 0.12));
    y0 = yb - hi;
  }
  const yh = yb - len;
  ctx.fillStyle = blanc;
  ctx.fillRect(-w / 2, yh, w, y0 - yh);
  ctx.strokeStyle = 'rgba(70,90,100,0.6)'; ctx.lineWidth = 1;
  ctx.strokeRect(-w / 2, yh, w, y0 - yh);
  // Ombre de volume
  const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.18)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = gr; ctx.fillRect(-w / 2, yh, w, y0 - yh);
  ctx.fillStyle = '#212121';
  const hl = y0 - yh;
  if (i === 0) {
    // Damier noir et blanc (aide à suivre le roulis), comme sur Saturn V.
    for (let q = 0; q < 4; q++) ctx.fillRect(q % 2 ? 0 : -w / 2, y0 - hl * (0.1 + 0.07 * Math.floor(q / 2)), w / 2, hl * 0.07);
    ctx.fillRect(-w / 2, yh, w, Math.max(1, hl * 0.05));
    // Nom du lanceur à la verticale
    if (w > 14) {
      ctx.save(); ctx.translate(0, yh + hl * 0.55); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#c62828'; ctx.font = `bold ${Math.round(w * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(nomLanceur.toUpperCase(), 0, 0);
      ctx.restore();
    }
    if (e.ailerons) {
      ctx.fillStyle = melanger('#b0bec5', '#3e2723', brule * 0.8);
      for (const sg of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sg * w / 2, y0 - hl * 0.16); ctx.lineTo(sg * w * 0.85, yb - hl * 0.01);
        ctx.lineTo(sg * w * 0.85, yb + hl * 0.02); ctx.lineTo(sg * w / 2, yb); ctx.fill();
      }
    }
  } else {
    // Étages supérieurs : bande noire et rectangles de repérage
    ctx.fillRect(-w / 2, yh + hl * 0.08, w, Math.max(1, hl * 0.06));
    ctx.fillRect(-w / 2, y0 - hl * 0.2, w * 0.25, hl * 0.12);
    ctx.fillRect(w * 0.25, y0 - hl * 0.2, w * 0.25, hl * 0.12);
  }
}

// Coiffe en ogive au-dessus de la charge utile (avec tour de sauvetage pour Séléné).
function dessinerCoiffe(ctx, yb, hc, wc, wHaut, tour) {
  const ya = yb - hc * 0.12, yc = yb - hc * 0.55, yt = yb - hc;
  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath(); ctx.moveTo(-wHaut / 2, yb); ctx.lineTo(-wc / 2, ya); ctx.lineTo(wc / 2, ya); ctx.lineTo(wHaut / 2, yb); ctx.fill();
  const forme = new Path2D();
  forme.moveTo(-wc / 2, ya); forme.lineTo(-wc / 2, yc);
  forme.bezierCurveTo(-wc / 2, yc - (yc - yt) * 0.6, -wc * 0.12, yt, 0, yt);
  forme.bezierCurveTo(wc * 0.12, yt, wc / 2, yc - (yc - yt) * 0.6, wc / 2, yc);
  forme.lineTo(wc / 2, ya); forme.closePath();
  ctx.fillStyle = '#f5f5f5'; ctx.fill(forme);
  const gr = ctx.createLinearGradient(-wc / 2, 0, wc / 2, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.15)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = gr; ctx.fill(forme);
  // Joint des deux demi-coiffes
  ctx.strokeStyle = 'rgba(60,60,60,0.6)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, ya); ctx.lineTo(0, yt); ctx.stroke();
  if (tour) {
    ctx.strokeStyle = '#c62828'; ctx.lineWidth = Math.max(1, wc * 0.05);
    ctx.beginPath(); ctx.moveTo(-wc * 0.12, yt + hc * 0.02); ctx.lineTo(0, yt - hc * 0.35); ctx.lineTo(wc * 0.12, yt + hc * 0.02); ctx.stroke();
    ctx.fillStyle = '#c62828'; ctx.fillRect(-wc * 0.06, yt - hc * 0.5, wc * 0.12, hc * 0.16);
  }
}

// Lanceur de retour de Vénus. En descente : capsule à bouclier thermique sous un parachute rayé.
// Posé : le lanceur Aphrodite debout, le ballon replié au sommet. (sx, sy) : point bas ; k : pixels par mètre.
function dessinerLanceurRetour(ctx, lr, sx, sy, k) {
  const fa = dessinerBallon.lanceur || (dessinerBallon.lanceur = fuseeAscension());
  if (lr.etat === 'descente') {
    const hC = Math.max(14, 5 * k), wC = hC * 1.1;
    // Capsule : cône, bouclier thermique en bas
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath(); ctx.moveTo(sx - wC / 2, sy); ctx.lineTo(sx - wC * 0.18, sy - hC); ctx.lineTo(sx + wC * 0.18, sy - hC); ctx.lineTo(sx + wC / 2, sy); ctx.fill();
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(sx - wC / 2, sy - hC * 0.12, wC, hC * 0.12);
    if (lr.parachute) {
      // Suspentes et voilure
      const R = hC * 1.6, yc = sy - hC - hC * 2.2;
      ctx.strokeStyle = 'rgba(230,230,230,0.8)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const dx of [-0.9, -0.3, 0.3, 0.9]) { ctx.moveTo(sx + dx * R, yc); ctx.lineTo(sx, sy - hC); }
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#e64a19';
        ctx.beginPath(); ctx.moveTo(sx, yc); ctx.arc(sx, yc, R, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6); ctx.closePath(); ctx.fill();
      }
    } else {
      // Entrée atmosphérique : traînée lumineuse au-dessus de la capsule
      const g = ctx.createLinearGradient(sx, sy - hC, sx, sy - hC * 5);
      g.addColorStop(0, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - wC * 0.3, sy - hC); ctx.lineTo(sx, sy - hC * 5); ctx.lineTo(sx + wC * 0.3, sy - hC); ctx.fill();
    }
    return;
  }
  // Posé : Aphrodite debout, ballon replié (ballot gris) au sommet.
  const hL = fa.hauteur * k;
  dessinerLanceur(ctx, { f: fa, angle: 0, throttle: 0, temp: 20, coiffeLarguee: true }, sx, sy, hL);
  ctx.fillStyle = '#cfc8b6';
  ctx.beginPath(); ctx.ellipse(sx, sy - hL - hL * 0.06, hL * 0.09, hL * 0.06, 0, 0, Math.PI * 2); ctx.fill();
}

// Capsule conique d'équipage (lanceur d'ascension de Vénus).
function dessinerCapsule(ctx, yb, hc, wc) {
  ctx.fillStyle = '#cfd8dc';
  ctx.beginPath(); ctx.moveTo(-wc / 2, yb); ctx.lineTo(-wc * 0.18, yb - hc * 0.85); ctx.lineTo(wc * 0.18, yb - hc * 0.85); ctx.lineTo(wc / 2, yb); ctx.fill();
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(-wc / 2, yb - hc * 0.08, wc, hc * 0.08);   // bouclier thermique
  ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(wc * 0.12, yb - hc * 0.45, Math.max(1, wc * 0.08), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#90a4ae'; ctx.fillRect(-wc * 0.1, yb - hc, wc * 0.2, hc * 0.15);
}

// Ballon de remontée (Vénus) : enveloppe blanche, suspentes, et le lanceur d'ascension accroché dessous.
function dessinerBallon(ctx, vol, x, y, k) {
  const fa = dessinerBallon.lanceur || (dessinerBallon.lanceur = fuseeAscension());
  const hL = fa.hauteur * k;
  const R = 9 * k, yc = y - hL - 6 * k - R;
  ctx.save();
  ctx.translate(x, 0);
  ctx.strokeStyle = 'rgba(220,220,220,0.8)'; ctx.lineWidth = Math.max(1, k * 0.15);
  ctx.beginPath();
  for (const dx of [-0.8, 0, 0.8]) { ctx.moveTo(dx * R * 0.8, yc + R * 0.6); ctx.lineTo(0, y - hL); }
  ctx.stroke();
  const g = ctx.createRadialGradient(-R * 0.3, yc - R * 0.3, R * 0.1, 0, yc, R);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9c2b0');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(0, yc, R, R * 1.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  dessinerLanceur(ctx, { f: fa, angle: vol.angle, throttle: 0, temp: vol.temp, coiffeLarguee: true }, x, y, hL);
}

// Charge utile à nu : l'atterrisseur (en bas, feuilles dorées, pieds repliés) et l'orbiteur au-dessus.
function dessinerChargeUtile(ctx, yb, hc, wc, wHaut) {
  // Adaptateur
  ctx.fillStyle = '#455a64';
  ctx.beginPath(); ctx.moveTo(-wHaut / 2, yb); ctx.lineTo(-wc * 0.42, yb - hc * 0.06); ctx.lineTo(wc * 0.42, yb - hc * 0.06); ctx.lineTo(wHaut / 2, yb); ctx.fill();
  // Atterrisseur : étage de descente doré
  const wl = wc * 0.8, y1 = yb - hc * 0.06, y2 = yb - hc * 0.3;
  ctx.fillStyle = '#d4a017';
  ctx.beginPath();
  ctx.moveTo(-wl * 0.5, y1); ctx.lineTo(-wl * 0.5, y2 + (y1 - y2) * 0.25); ctx.lineTo(-wl * 0.35, y2);
  ctx.lineTo(wl * 0.35, y2); ctx.lineTo(wl * 0.5, y2 + (y1 - y2) * 0.25); ctx.lineTo(wl * 0.5, y1); ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,0,0.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-wl * 0.15, y1); ctx.lineTo(-wl * 0.15, y2); ctx.moveTo(wl * 0.15, y1); ctx.lineTo(wl * 0.15, y2); ctx.stroke();
  // Pieds repliés le long du flanc
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = Math.max(1, wc * 0.04);
  ctx.beginPath(); ctx.moveTo(-wl * 0.52, y2 + (y1 - y2) * 0.2); ctx.lineTo(-wl * 0.56, y1 + hc * 0.01); ctx.moveTo(wl * 0.52, y2 + (y1 - y2) * 0.2); ctx.lineTo(wl * 0.56, y1 + hc * 0.01); ctx.stroke();
  // Cabine de remontée
  const y3 = yb - hc * 0.46;
  ctx.fillStyle = '#b0bec5';
  ctx.beginPath(); ctx.moveTo(-wl * 0.38, y2); ctx.lineTo(-wl * 0.3, y3); ctx.lineTo(wl * 0.25, y3); ctx.lineTo(wl * 0.38, y2 - (y2 - y3) * 0.3); ctx.lineTo(wl * 0.38, y2); ctx.fill();
  ctx.fillStyle = '#263238';
  ctx.beginPath(); ctx.moveTo(wl * 0.1, y3 + (y2 - y3) * 0.2); ctx.lineTo(wl * 0.24, y3 + (y2 - y3) * 0.2); ctx.lineTo(wl * 0.3, y3 + (y2 - y3) * 0.5); ctx.lineTo(wl * 0.1, y3 + (y2 - y3) * 0.5); ctx.fill();
  // Orbiteur : tuyère, module de service, panneaux solaires repliés, nez d'amarrage
  const wo = wc * 0.62, y4 = yb - hc * 0.54, y5 = yb - hc * 0.86, yt = yb - hc;
  ctx.fillStyle = '#546e7a';
  ctx.beginPath(); ctx.moveTo(-wo * 0.32, y3); ctx.lineTo(-wo * 0.14, y4); ctx.lineTo(wo * 0.14, y4); ctx.lineTo(wo * 0.32, y3); ctx.fill();
  ctx.fillStyle = '#eceff1'; ctx.fillRect(-wo / 2, y5, wo, y4 - y5);
  const gr = ctx.createLinearGradient(-wo / 2, 0, wo / 2, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.15)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = gr; ctx.fillRect(-wo / 2, y5, wo, y4 - y5);
  ctx.fillStyle = '#2f6fd6';
  ctx.fillRect(-wo / 2 - wc * 0.1, y5 + (y4 - y5) * 0.1, wc * 0.1, (y4 - y5) * 0.8);
  ctx.fillRect(wo / 2, y5 + (y4 - y5) * 0.1, wc * 0.1, (y4 - y5) * 0.8);
  ctx.strokeStyle = 'rgba(160,200,255,0.8)'; ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let q = 1; q < 5; q++) { const yy = y5 + (y4 - y5) * (0.1 + 0.16 * q); ctx.moveTo(-wo / 2 - wc * 0.1, yy); ctx.lineTo(-wo / 2, yy); ctx.moveTo(wo / 2, yy); ctx.lineTo(wo / 2 + wc * 0.1, yy); }
  ctx.stroke();
  ctx.fillStyle = '#212121'; ctx.fillRect(-wo / 2, y5 + (y4 - y5) * 0.45, wo, Math.max(1, (y4 - y5) * 0.06));
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath(); ctx.moveTo(-wo / 2, y5); ctx.lineTo(-wo * 0.18, yt + hc * 0.02); ctx.lineTo(wo * 0.18, yt + hc * 0.02); ctx.lineTo(wo / 2, y5); ctx.fill();
  ctx.fillStyle = '#607d8b'; ctx.fillRect(-wo * 0.14, yt, wo * 0.28, hc * 0.025);
}

// Tour de lancement en treillis, avec ses bras d'accès.
function dessinerTour(ctx, x, yBase, s, hauteurFusee) {
  const H = hauteurFusee * 1.08 * s, L = Math.max(6, 9 * s);
  ctx.save();
  ctx.strokeStyle = '#c62828';
  ctx.lineWidth = Math.max(1, 0.5 * s);
  ctx.strokeRect(x, yBase - H, L, H);
  ctx.beginPath();
  const pas = Math.max(6, 6 * s);
  for (let y = 0; y < H; y += pas) {
    ctx.moveTo(x, yBase - y); ctx.lineTo(x + L, yBase - y - pas);
    ctx.moveTo(x + L, yBase - y); ctx.lineTo(x, yBase - y - pas);
  }
  ctx.stroke();
  // Bras d'accès vers la fusée
  ctx.fillStyle = '#8d6e63';
  for (const f of [0.35, 0.6, 0.85]) ctx.fillRect(x - 5 * s, yBase - H * f, 5 * s, Math.max(1.5, 0.8 * s));
  // Table de lancement
  ctx.fillStyle = '#546e7a';
  ctx.fillRect(x - 24 * s, yBase - 3 * s, 36 * s, 3 * s);
  ctx.restore();
}

// Bases au sol : dômes habitables, panneaux solaires et usine à ergols.
function dessinerBases(ctx, vol, W, echelle, fuseeY) {
  const ecranY = (wx) => fuseeY + (vol.y - vol.sol(wx)) * echelle;
  for (const b of vol.bases) {
    const sx = W / 2 + (b.x - vol.x) * echelle;
    if (sx < -2000 || sx > W + 2000) continue;
    dessinerBase(ctx, sx, (dx) => ecranY(b.x + dx), Math.max(echelle, 0.4), b.niveau || 1, productionBase(vol.astre) > 0);
  }
  // Zone repérée par une sonde, pas encore construite : un fanion vert.
  if (vol.site && !vol.bases.some((b) => Math.abs(b.x - vol.site.x) < 500)) dessinerFanion(ctx, W / 2 + (vol.site.x - vol.x) * echelle, ecranY(vol.site.x), Math.max(echelle, 0.4), vol);
  // Drapeaux plantés lors des visites précédentes
  for (const d of drapeauxSur(vol.astre.id)) {
    const sx = W / 2 + (d.x - vol.x) * echelle;
    if (sx > -60 && sx < W + 60) dessinerDrapeauPlante(ctx, sx, ecranY(d.x), Math.max(echelle, 0.4), ventPourDrapeau(vol.astre));
  }
}

// Drapeaux plantés sur un astre (sauvegardés avec la partie).
function drapeauxSur(astreId) { return (typeof etat !== 'undefined' && etat.drapeaux && etat.drapeaux[astreId]) || []; }
// Assez d'air pour que le drapeau flotte au vent ?
function ventPourDrapeau(a) { return !!(a.atm && a.atm.p0 > 0.003); }

// Drapeau planté par le ou la spationaute : drapeau des Nations unies en haut du mât,
// fanion de l'AS Nancy Lorraine dessous (rouge bordé de blanc, « ASNL » en blanc).
// Sans air, une tringle horizontale le tient déplié (comme sur la Lune avec Apollo) ; avec du vent, il ondule.
// (x, y) : pied du mât au sol ; s : pixels par mètre ; air : il y a une atmosphère.
function dessinerDrapeauPlante(ctx, x, y, s, air) {
  const mat = 3 * s, L = 1.5 * s, Hd = 0.95 * s;
  const t = performance.now() / 1000;
  ctx.save();
  ctx.translate(x, y);
  // Mât
  ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = Math.max(1, 0.05 * s);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -mat); ctx.stroke();
  ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(0, -mat, Math.max(1.2, 0.05 * s), 0, Math.PI * 2); ctx.fill();
  // Forme du tissu : ondulation (air) ou léger froissé (vide), recalculée pour chaque point.
  const onde = (u) => air ? Math.sin(u * 5 - t * 4) * 0.07 * s * u : Math.sin(u * 9) * 0.015 * s;
  const tissu = (y0, h, largeur, pointe) => {
    const p = new Path2D();
    const n = 14;
    p.moveTo(0, y0);
    for (let i = 1; i <= n; i++) { const u = i / n; p.lineTo(u * largeur, y0 + onde(u) + (pointe ? u * h / 2 : 0)); }
    if (pointe) { p.lineTo(largeur, y0 + h / 2 + onde(1)); }
    for (let i = n; i >= 0; i--) { const u = i / n; p.lineTo(u * largeur, y0 + h + onde(u) - (pointe ? u * h / 2 : 0)); }
    p.closePath();
    return p;
  };
  // --- Drapeau des Nations unies : bleu clair, emblème blanc (globe vu du pôle et rameaux d'olivier)
  const yU = -mat + 0.04 * s;
  const fu = tissu(yU, Hd, L, false);
  ctx.fillStyle = '#4b92db'; ctx.fill(fu);
  if (!air) { ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = Math.max(1, 0.03 * s); ctx.beginPath(); ctx.moveTo(0, yU); ctx.lineTo(L, yU + onde(1)); ctx.stroke(); }
  if (s > 6) {
    const cx = L * 0.5, cy = yU + Hd * 0.5 + onde(0.5), R = Hd * 0.28;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.6, s * 0.018);
    ctx.beginPath();
    for (const k of [1, 0.66, 0.33]) { ctx.moveTo(cx + R * k, cy); ctx.arc(cx, cy, R * k, 0, Math.PI * 2); }
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); }
    ctx.stroke();
    // Rameaux d'olivier autour du globe
    ctx.fillStyle = '#ffffff';
    for (const sens of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + sens * (0.35 + i * 0.42);
        const px = cx + Math.cos(a) * R * 1.32, py = cy + Math.sin(a) * R * 1.32;
        ctx.beginPath(); ctx.ellipse(px, py, R * 0.16, R * 0.07, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // --- Fanion de l'AS Nancy Lorraine : triangle rouge bordé de blanc, « ASNL »
  const yF = yU + Hd + 0.12 * s, hF = 0.7 * s, lF = 1.1 * s;
  const ff = tissu(yF, hF, lF, true);
  ctx.fillStyle = '#d0021b'; ctx.fill(ff);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.6, s * 0.03); ctx.stroke(ff);
  if (s > 6) {
    // « ASNL » en blanc, dans la partie large du triangle.
    ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.max(5, Math.round(hF * 0.3))}px system-ui, sans-serif`; ctx.textBaseline = 'middle';
    ctx.fillText('ASNL', lF * 0.07, yF + hF / 2 + onde(0.3));
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

// Fanion de la zone repérée par la sonde. Son texte s'efface seul au bout de 8 s, ou avec sa petite croix.
// porteur : l'objet qui garde l'état d'affichage (le vol), partagé avec l'exploration.
let ZONE_FANION = null;
const DUREE_TEXTE_FANION = 8000;   // ms
function dessinerFanion(ctx, x, y, s, porteur) {
  ctx.strokeStyle = '#eceff1'; ctx.lineWidth = Math.max(1.5, 0.2 * s);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 6 * s); ctx.stroke();
  ctx.fillStyle = '#66bb6a';
  ctx.beginPath(); ctx.moveTo(x, y - 6 * s); ctx.lineTo(x + 3.5 * s, y - 5 * s); ctx.lineTo(x, y - 4 * s); ctx.fill();
  const p = porteur || {};
  if (p.fanionFerme) return;
  const maintenant = performance.now();
  if (!p.fanionDebut) p.fanionDebut = maintenant;
  if (maintenant - p.fanionDebut > DUREE_TEXTE_FANION) { p.fanionFerme = true; return; }
  const taille = Math.min(15, Math.max(11, 1.6 * s));
  const police = `${taille}px system-ui, sans-serif`, texte = 'Zone de base repérée par la sonde';
  texteSurFond(ctx, texte, x, y - 7 * s, { police, couleur: '#c8e6c9' });
  // Petite croix pour fermer à la main.
  ctx.save(); ctx.font = police;
  const w = ctx.measureText(texte).width;
  const cx = x + w / 2 + 16, cy = y - 7 * s - taille / 2 + 2, r = 9;
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#c8e6c9'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(cx - 3.5, cy - 3.5); ctx.lineTo(cx + 3.5, cy + 3.5); ctx.moveTo(cx + 3.5, cy - 3.5); ctx.lineTo(cx - 3.5, cy + 3.5); ctx.stroke();
  ctx.restore();
  ZONE_FANION = { x: cx - r - 4, y: cy - r - 4, w: 2 * r + 8, h: 2 * r + 8, porteur: p, t: maintenant };
}
// Clic ou toucher sur la croix du fanion : renvoie true s'il l'a fermé.
function clicFanion(x, y) {
  const z = ZONE_FANION;
  if (!z || performance.now() - z.t > 500) return false;
  if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) { z.porteur.fanionFerme = true; ZONE_FANION = null; return true; }
  return false;
}

// Base au sol : chaque élément est posé sur le terrain à son propre endroit, sur une dalle.
// sol(dx) donne l'ordonnée écran du sol à dx mètres du centre de la base. Elle grandit avec son niveau.
function dessinerBase(ctx, x, sol, s, niveau = 1, usine = true) {
  const element = (dx, largeur, dessin) => {
    // L'élément repose sur le point le plus haut du sol sous lui ; une dalle descend jusqu'au sol partout ailleurs.
    const yg = sol(dx - largeur / 2), yd = sol(dx + largeur / 2), ym = sol(dx);
    const haut = Math.min(yg, yd, ym) - 0.3 * s;
    const xg = x + (dx - largeur / 2) * s, xd = x + (dx + largeur / 2) * s;
    ctx.fillStyle = '#78909c';
    ctx.beginPath(); ctx.moveTo(xg, haut); ctx.lineTo(xd, haut); ctx.lineTo(xd, yd + 0.5 * s); ctx.lineTo(x + dx * s, ym + 0.5 * s); ctx.lineTo(xg, yg + 0.5 * s); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(x + dx * s, haut); dessin(); ctx.restore();
  };
  // Aire d'atterrissage
  element(-58, 16, () => { ctx.fillStyle = '#90a4ae'; ctx.fillRect(-8 * s, -0.6 * s, 16 * s, 0.6 * s); ctx.strokeStyle = '#ffca28'; ctx.lineWidth = Math.max(1, 0.3 * s); ctx.strokeRect(-6 * s, -0.5 * s, 12 * s, 0.3 * s); });
  // Panneaux solaires : plus nombreux à chaque niveau
  const nPanneaux = 3 + 2 * (niveau - 1);
  for (let i = 0; i < nPanneaux; i++) {
    element(-44 + i * 7 - (niveau - 1) * 10, 5, () => {
      ctx.fillStyle = '#90a4ae'; ctx.fillRect(-0.3 * s, -3 * s, 0.6 * s, 3 * s);
      ctx.fillStyle = '#2f6fd6'; ctx.fillRect(-2.5 * s, -8 * s, 5 * s, 5 * s);
      ctx.strokeStyle = '#9ec3ff'; ctx.lineWidth = 1; ctx.strokeRect(-2.5 * s, -8 * s, 5 * s, 5 * s);
    });
  }
  // Dômes habitables, reliés par des couloirs
  const nDomes = 1 + niveau;
  for (let i = 0; i < nDomes; i++) {
    const r = i === 0 ? 8 : 6;
    element(-10 + i * 15, r * 2, () => {
      ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(0, 0, r * s, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#4fc3f7'; ctx.fillRect(-r * 0.3 * s, -r * 0.5 * s, r * 0.5 * s, r * 0.25 * s);
      if (i > 0) { ctx.fillStyle = '#cfd8dc'; ctx.fillRect(-(15 - r) * s, -2 * s, (15 - 2 * r + 2) * s, 2 * s); }
    });
  }
  const xu = -10 + nDomes * 15 + 4;
  // Usine à ergols et son réservoir sphérique (s'il y a une ressource à exploiter)
  if (usine) {
    element(xu, 8, () => { ctx.fillStyle = '#b0bec5'; ctx.fillRect(-4 * s, -10 * s, 8 * s, 10 * s); ctx.fillStyle = '#607d8b'; ctx.fillRect(-1 * s, -13 * s, 2 * s, 3 * s); });
    element(xu + 10, 8, () => { ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.arc(0, -4.5 * s, 4 * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#78909c'; ctx.fillRect(-3 * s, -0.8 * s, 6 * s, 0.8 * s); });
  }
  // Mine de matériaux (niveau 2 et plus) : chevalement et tas de minerai
  if (niveau >= 2) {
    element(xu + 22, 10, () => {
      ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = Math.max(1.5, 0.4 * s);
      ctx.beginPath(); ctx.moveTo(-4 * s, 0); ctx.lineTo(0, -12 * s); ctx.lineTo(4 * s, 0); ctx.moveTo(-2 * s, -6 * s); ctx.lineTo(2 * s, -6 * s); ctx.stroke();
      ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(0, -12 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6d4c41'; ctx.beginPath(); ctx.moveTo(4 * s, 0); ctx.lineTo(7 * s, -3 * s); ctx.lineTo(10 * s, 0); ctx.fill();
    });
  }
  ctx.fillStyle = '#cfd8dc'; ctx.font = `${Math.min(16, Math.max(11, 2.5 * s))}px system-ui, sans-serif`;
  ctx.fillText(`Base — niveau ${niveau}`, x - 14 * s, sol(-10) - 18 * s);
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

// Messages empilés en bas de l'écran (le plus récent en bas). Un message trop long passe sur deux lignes.
// Texte posé sur un bandeau sombre : lisible sur n'importe quel fond (ciel clair, herbe, sol gris…).
// Texte clair sur fond noir à 62 % : contraste supérieur à 4,5 pour 1 même sur un fond très clair.
function texteSurFond(ctx, texte, x, y, options = {}) {
  ctx.save();
  if (options.police) ctx.font = options.police;
  const align = options.align || 'center';
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(texte).width;
  const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
  const taille = m ? parseFloat(m[1]) : 12;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.beginPath(); ctx.roundRect(x0 - 6, y - taille - 1, w + 12, taille + 8, 6); ctx.fill();
  ctx.fillStyle = options.couleur || '#ffffff';
  ctx.fillText(texte, x, y);
  ctx.restore();
}

// Haut des boutons tactiles situés dans la moitié basse de l'écran (le bandeau a pu être déplacé ou passer sur deux lignes).
function H_ECRAN() { return innerHeight; }
function bordHautBoutons(W, H) {
  const el = document.getElementById('tactile');
  if (!el || el.classList.contains('cache')) return H;
  let haut = H;
  for (const z of el.querySelectorAll('.zone-tactile')) {
    if (!z.children.length) continue;
    const r = z.getBoundingClientRect();
    if (r.height && r.top > H * 0.45 && r.top < haut) haut = r.top;
  }
  return haut;
}

function afficherMessages(ctx, textes, W, yBas) {
  ctx.save();
  const petit = W < 720;
  const taille = petit ? 13 : 15, interligne = taille + 5;
  ctx.font = `bold ${taille}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  // Retour à la ligne mot à mot pour tenir dans la largeur de l'écran.
  const largeurMax = Math.min(W - 40, 900);
  const couper = (t) => {
    const lignes = [];
    let l = '';
    for (const mot of t.split(' ')) {
      const essai = l ? l + ' ' + mot : mot;
      if (ctx.measureText(essai).width > largeurMax && l) { lignes.push(l); l = mot; } else l = essai;
    }
    if (l) lignes.push(l);
    return lignes;
  };
  // 3 lignes au plus par message : au-delà, on coupe avec « … » pour ne pas envahir l'écran.
  const blocs = textes.map(couper).map((l) => (l.length > 3 ? [l[0], l[1], l[2].replace(/\s*\S*$/, '') + ' …'] : l));
  // Sur écran tactile, les messages se rangent juste au-dessus des boutons, là où ils sont vraiment.
  let y = Math.min(yBas, bordHautBoutons(W, H_ECRAN()) - 10);
  for (let b = blocs.length - 1; b >= 0; b--) {
    const lignes = blocs[b];
    const tw = Math.min(W - 20, Math.max(...lignes.map((l) => ctx.measureText(l).width)));
    const hb = lignes.length * interligne + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(W / 2 - tw / 2 - 12, y - hb + 6, tw + 24, hb);
    ctx.fillStyle = b === blocs.length - 1 ? '#ffd54f' : 'rgba(255,213,79,0.75)';
    lignes.forEach((l, k) => ctx.fillText(l, W / 2, y - (lignes.length - 1 - k) * interligne));
    y -= hb + 4;
  }
  ctx.restore();
}

function jauge(ctx, x, y, w, frac, couleur) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 5);
  ctx.fillStyle = couleur;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 5);
}

function couleurRisque(frac) { return frac < 0.6 ? '#66bb6a' : frac < 0.9 ? '#ffca28' : frac <= 1 ? '#ff7043' : '#ef5350'; }

// Écran tactile (téléphone, tablette) : boutons à l'écran à la place du clavier.
const ECRAN_TACTILE = typeof matchMedia === 'function' && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);

// Petit écran (téléphone) : tableau de bord réduit à l'essentiel ; un appui dessus affiche le détail.
function ecranCompact(W, H) { return W < 720 || H < 520; }
let ZONE_HUD = null;   // rectangle du tableau de bord quand il est compact (pour l'appui)

// Géantes gazeuses (pas de sol) : position par rapport au niveau 1 bar, et objectif de la plongée.
function infoPlongee(vol, court) {
  const a = vol.astre, alt = vol.y;
  const position = court
    ? `${alt < 0 ? '−' : '+'}${fmtAlt(Math.abs(alt))} / 1 bar`
    : `${fmtAlt(Math.abs(alt))} ${alt < 0 ? 'sous le' : 'au-dessus du'} niveau 1 bar`;
  const atteint = vol.phase === 'remontee' || (vol.prelevements || []).some((p) => p.niveau >= a.cible);
  const objectif = atteint
    ? (court ? `1 bar (${fmt(a.cible, 1)} ✓)` : `remonter au niveau 1 bar (${fmt(a.cible, 1)} bar atteints ✓)`)
    : (court ? `${fmt(a.cible, 1)} bar, puis 1 bar` : `descendre à ${fmt(a.cible, 1)} bar, puis remonter à 1 bar`);
  return { position, objectif, atteint };
}

function dessinerHudCompact(ctx, vol, W, H) {
  const a = vol.astre, c = vol.c, f = vol.f;
  const larg = a.type === 'gazeuse' ? Math.min(218, W * 0.6) : Math.min(176, W * 0.48);
  const lignes = [];
  const alt = vol.altSol();
  const proche = a.type === 'solide' && alt < 2000;
  const vv = -vol.vy;
  const gaz = a.type === 'gazeuse';
  if (gaz) {
    // Plongée : pression et objectif toujours affichés, position par rapport au niveau 1 bar.
    const ip = infoPlongee(vol, true);
    lignes.push(['Pression', fmtP(c.p), couleurRisque(c.p / f.pressionMax)]);
    lignes.push(['Position', ip.position, '#fff']);
    lignes.push(['Objectif', ip.objectif, ip.atteint ? '#66bb6a' : '#ffd54f']);
  } else lignes.push(['Alt.', fmtAlt(alt), '#fff']);
  lignes.push(['V vert.', (vv >= 0 ? '↓ ' : '↑ ') + fmtV(Math.abs(vv)), proche ? (vv > a.vMax ? '#ef5350' : '#66bb6a') : '#fff']);
  lignes.push(['V horiz.', fmtV(Math.abs(vol.vx)), proche && Math.abs(vol.vx) > a.vMax ? '#ef5350' : '#fff']);
  const fc = vol.carburant / f.carburant;
  lignes.push(['Carbur.', fmt(fc * 100) + ' %', fc < 0.15 ? '#ef5350' : '#42a5f5']);
  const fi = vol.integrite / 100;
  lignes.push(['Coque', fmt(vol.integrite) + ' %', fi > 0.6 ? '#66bb6a' : fi > 0.3 ? '#ffca28' : '#ef5350']);
  // Les limites n'apparaissent que si elles approchent.
  // Risque de rayonnement : part de la dose mortelle reçue en un jour à ce débit (1 = mortel en un jour).
  const fp = c.p / f.pressionMax, ft = (vol.temp + KELVIN) / (f.tempMax + KELVIN), fr = Math.max((vol.svBord || 0) / DOSE_MORTELLE, vol.dose / 100);
  if (fp > 0.6 && !gaz) lignes.push(['Pression', fmtP(c.p), couleurRisque(fp)]);
  if (ft > 0.7) lignes.push(['Temp.', fmt(vol.temp) + ' °C', couleurRisque(ft)]);
  if (fr > 0.25) lignes.push(['Rayonn.', `${fmtDose(vol.svBord || 0)} · ${fmtDoseTotale(vol.doseSv || 0)}`, couleurRisque(fr)]);
  if (a.type === 'gazeuse') lignes.push(['Prélèv.', String((vol.prelevements || []).length), '#4dd0e1']);
  const h = 26 + lignes.length * 16 + 14;
  const y0 = 44;   // sous la ligne de l'objectif
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(6, y0, larg, h);
  ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#fff';
  ctx.fillText(a.nom, 12, y0 + 16);
  let y = y0 + 34;
  for (const [k, v, coul] of lignes) {
    ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = '#b0bec5'; ctx.fillText(k, 12, y);
    ctx.font = 'bold 12px ui-monospace, Consolas, monospace'; ctx.fillStyle = coul; ctx.fillText(v, 70, y);
    y += 16;
  }
  ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('toucher : détails', 12, y + 2);
  ZONE_HUD = { x: 6, y: y0, w: larg, h };
}

function dessinerHUD(ctx, vol, W, H, warp) {
  const a = vol.astre, c = vol.c, f = vol.f;
  const compact = ecranCompact(W, H);
  const twr = vol.twr();
  if (compact && !vol.hudComplet) dessinerHudCompact(ctx, vol, W, H);
  else dessinerHudDetail(ctx, vol, W, H, compact);
  dessinerHudSuite(ctx, vol, W, H, warp, compact, twr);
}

function dessinerHudDetail(ctx, vol, W, H, compact) {
  const a = vol.astre, c = vol.c, f = vol.f;
  const x = 14, larg = compact ? Math.min(250, W - 40) : 250;
  let y = 14;
  ctx.fillStyle = compact ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.55)';
  const hPanneau = a.type === 'solide' ? 434 : a.type === 'etoile' ? 380 : 470;
  ctx.fillRect(8, 8, larg + 12, hPanneau);
  ZONE_HUD = compact ? { x: 8, y: 8, w: larg + 12, h: hPanneau } : null;
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

  const alt = vol.altSol();
  if (a.type === 'gazeuse') {
    // Plongée : position par rapport au niveau 1 bar (en dessous, l'altitude est négative), et objectif.
    const ip = infoPlongee(vol, false);
    ligne('Pression', fmtP(c.p), '#4dd0e1');
    ligne('Position', ip.position);
    ligne('Objectif', ip.objectif, ip.atteint ? '#66bb6a' : '#ffd54f');
  } else ligne(a.type === 'solide' ? 'Altitude (sol)' : 'Altitude', fmtAlt(alt));
  const vv = -vol.vy;
  const proche = a.type === 'solide' && alt < 2000;
  ligne('Vitesse vert.', (vv >= 0 ? '↓ ' : '↑ ') + fmtV(Math.abs(vv)), proche ? (vv > a.vMax ? '#ef5350' : '#66bb6a') : '#fff');
  ligne('Vitesse horiz.', fmtV(Math.abs(vol.vx)), proche && Math.abs(vol.vx) > a.vMax ? '#ef5350' : '#fff');
  if (a.type === 'solide') {
    const p = Math.abs(vol.pente(vol.x)) * 180 / Math.PI;
    ligne('Pente du sol', fmt(p) + '°', p > INCLINAISON_MAX ? '#ef5350' : p > INCLINAISON_MAX * 0.6 ? '#ffca28' : '#66bb6a');
  }

  const fc = vol.carburant / f.carburant;
  ligne('Carburant', fmt(vol.carburant) + ' kg', fc < 0.15 ? '#ef5350' : '#fff');
  jauge(ctx, x, y - 4, larg, fc, fc < 0.15 ? '#ef5350' : '#42a5f5'); y += 6;

  const fi = vol.integrite / 100;
  ligne('Intégrité coque', fmt(vol.integrite) + ' %', fi > 0.6 ? '#66bb6a' : fi > 0.3 ? '#ffca28' : '#ef5350');
  jauge(ctx, x, y - 4, larg, fi, fi > 0.6 ? '#66bb6a' : fi > 0.3 ? '#ffca28' : '#ef5350'); y += 6;

  const fp = c.p / f.pressionMax;
  ligne('Pression', fmtP(c.p) + ' / ' + fmt(f.pressionMax), couleurRisque(fp));
  jauge(ctx, x, y - 4, larg, fp, couleurRisque(fp)); y += 6;

  const ft = (vol.temp + KELVIN) / (f.tempMax + KELVIN);
  ligne('Temp. coque', fmt(vol.temp) + ' / ' + fmt(f.tempMax) + ' °C', couleurRisque(ft));
  jauge(ctx, x, y - 4, larg, ft, couleurRisque(ft)); y += 6;
  ligne('Temp. extérieure', fmt(c.t) + ' °C');

  ligne('Gravité locale', fmtG(c.g));
  if (a.type !== 'etoile') {
    const vO = vol.vOrbitale(), vL = vol.vLiberation();
    const vh = Math.abs(vol.vx);
    ligne('Vit. orbitale', fmtV(vO) + (vol.phase === 'remontee' && a.type === 'solide' ? ' (' + fmt(Math.min(100, (vh / vO) * 100)) + ' %)' : ''), vh >= vO * 0.98 ? '#66bb6a' : '#fff');
    ligne('Vit. libération', fmtV(vL), Math.hypot(vol.vx, vol.vy) >= vL ? '#66bb6a' : '#fff');
  }
  const twr = vol.twr();
  ligne('Poussée/poids', fmt(twr * vol.throttle, 2) + ' (max ' + fmt(twr, 2) + ')', twr < 1 ? '#ef5350' : '#fff');

  ligne('Rayonn. à bord', fmtDose(vol.svBord || 0), couleurRisque((vol.svBord || 0) / DOSE_MORTELLE));
  ligne('Dose équipage', `${fmtDoseTotale(vol.doseSv || 0)} (${fmt(vol.dose)} % de la dose mortelle)`, couleurRisque(vol.dose / 100));
  if (a.type === 'gazeuse') ligne('Prélèvements', String((vol.prelevements || []).length), '#4dd0e1');
  if (compact) { ctx.font = '11px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText('toucher : réduire', x, y + 12); }
}

// Le reste du tableau de bord : alertes, compte à rebours, jauges, manette, objectif, temps.
function dessinerHudSuite(ctx, vol, W, H, warp, compact, twr) {
  const a = vol.astre;

  // Alertes de dégâts
  if (vol.enDegats() && !vol.fin) {
    const msgs = [];
    if (vol.taux.pression > 0) msgs.push('SURPRESSION : la coque se déforme');
    if (vol.taux.chaleur > 0) msgs.push('SURCHAUFFE : la coque brûle');
    ctx.font = compact ? 'bold 14px system-ui, sans-serif' : 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = Math.sin(performance.now() / 150) > 0 ? '#ff1744' : '#ffffff';
    msgs.forEach((m, i) => ctx.fillText(m, W / 2, (compact ? H * 0.32 : 70) + i * 24));
    ctx.textAlign = 'left';
  }

  // Compte à rebours, en grand
  if (vol.compteARebours > 0) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.fillStyle = vol.compteARebours <= 3 ? '#ffca28' : '#ffffff';
    ctx.fillText('T−' + Math.ceil(vol.compteARebours), W / 2, H * 0.4);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(vol.compteARebours <= 3 ? 'Allumage — les pinces retiennent la fusée' : 'Compte à rebours', W / 2, H * 0.4 + 30);
    ctx.textAlign = 'left';
  }
  // Disposition : sur petit écran, tout se range autour des boutons tactiles (en bas en portrait, sur les côtés en paysage).
  const portrait = H > W;
  const yMessages = ECRAN_TACTILE ? H - (portrait ? 210 : 70) : H - 56;
  const hautDroite = compact ? 52 : 0;   // en compact, l'objectif occupe la première ligne

  // Chronologie du lancement
  if (vol.lancement && vol.chrono && vol.tDecollage) {
    const evs = vol.chrono.filter((e) => !e.avant).slice(compact ? -2 : -5);
    ctx.font = compact ? '11px system-ui, sans-serif' : '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    evs.forEach((e, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      const yy = compact ? yMessages - 70 - (evs.length - 1 - i) * 15 : H - 120 - (evs.length - 1 - i) * 17;
      ctx.fillText(`T+${fmtDuree(e.t)}  ${e.texte}`, compact ? W - 12 : W - 70, yy);
    });
    ctx.textAlign = 'left';
  }

  // Remontée vers l'orbite : deux jauges pour savoir où l'on en est.
  if (vol.phase === 'remontee' && a.type === 'solide' && !vol.fin) {
    const vO = vitesseOrbitale(a, vol.altOrbite);
    const fa = Math.max(0, vol.y) / (vol.altOrbite * 0.9), fv = Math.abs(vol.vx) / (vO * 0.97);
    const lj = compact ? Math.min(320, W - 90) : 320;
    const x0 = compact ? 14 : W / 2 - 160, y0 = compact ? (ZONE_HUD ? ZONE_HUD.y + ZONE_HUD.h + 18 : 190) : 48;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x0 - 8, y0 - 6, lj + 16, 52);
    ctx.font = compact ? '11px system-ui, sans-serif' : '12px system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`${compact ? 'Alt. d’orbite' : 'Altitude d’orbite'} : ${fmtAlt(Math.max(0, vol.y))} / ${fmtAlt(vol.altOrbite * 0.9)}`, x0, y0 + 8);
    jauge(ctx, x0, y0 + 12, lj, fa, fa >= 1 ? '#66bb6a' : '#42a5f5');
    ctx.fillStyle = '#fff';
    ctx.fillText(`${compact ? 'V horiz.' : 'Vitesse horizontale'} : ${fmtV(Math.abs(vol.vx))} / ${fmtV(vO * 0.97)}`, x0, y0 + 32);
    jauge(ctx, x0, y0 + 36, lj, fv, fv >= 1 ? '#66bb6a' : '#ffca28');
  }
  if (vol.f.mega && !vol.fin) {
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#ffca28'; ctx.textAlign = 'right';
    ctx.fillText(`${vol.f.etages[vol.f.etage].nom} (${vol.f.etage + 1}/${vol.f.etages.length})`, W - 14, compact ? hautDroite + 70 : 110);
    ctx.textAlign = 'left';
  }

  // Message de retour d'exploration
  // Messages : chaque nouveau message rejoint une file (3 au plus) et reste affiché en temps réel,
  // plus longtemps quand le temps est accéléré (×10 et plus), pour avoir le temps de lire.
  const maintenant = performance.now();
  if (vol.messageExplo && vol.messageExplo !== vol.dernierMessage) {
    vol.dernierMessage = vol.messageExplo;
    vol.fileMessages = (vol.fileMessages || []).concat({ texte: vol.messageExplo.texte, fin: maintenant + (warp >= 10 ? 12000 : 7000) }).slice(-3);
  }
  vol.fileMessages = (vol.fileMessages || []).filter((m) => m.fin > maintenant);
  afficherMessages(ctx, vol.fileMessages.map((m) => m.texte), W, yMessages);

  // Manette des gaz : barre verticale à droite.
  const bx = W - 46;
  const bh = compact ? Math.max(60, Math.min(150, (portrait ? H * 0.2 : H * 0.2))) : Math.min(240, H * 0.4);
  const by = compact ? hautDroite + (portrait ? 110 : 66) : H / 2 - bh / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx - 12, by - 30, 50, bh + 58);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(bx, by, 26, bh);
  ctx.fillStyle = vol.autopilote ? '#66bb6a' : '#ff7043';
  ctx.fillRect(bx, by + bh * (1 - vol.manette), 26, bh * vol.manette);
  if (twr > 1) {
    // Repère de vol stationnaire : poussée = poids.
    const ys = by + bh * (1 - 1 / twr);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx - 6, ys); ctx.lineTo(bx + 32, ys); ctx.stroke();
  }
  ctx.font = 'bold 13px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(fmt(vol.manette * 100) + ' %', bx + 13, by + bh + 18);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#b0bec5';
  ctx.fillText('Gaz', bx + 13, by - 12);

  // Objectif (en compact : sur toute la largeur en haut, police réduite, deux lignes au plus)
  ctx.textAlign = 'center';
  const txt = vol.objectifTexte();
  // Pas d'objectif : pas de bandeau (un texte vide laissait un petit carré sombre en haut au centre).
  if (!txt) { /* rien */ } else if (!compact) {
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const tw = ctx.measureText(txt).width;
    ctx.fillRect(W / 2 - tw / 2 - 12, 10, tw + 24, 30);
    ctx.fillStyle = '#fff';
    ctx.fillText(txt, W / 2, 31);
  } else {
    ctx.font = 'bold 12px system-ui, sans-serif';
    const mots = txt.split(' '), lignes = [''];
    for (const m of mots) {
      const essai = lignes[lignes.length - 1] ? lignes[lignes.length - 1] + ' ' + m : m;
      if (ctx.measureText(essai).width > W - 24 && lignes[lignes.length - 1]) lignes.push(m); else lignes[lignes.length - 1] = essai;
    }
    const l2 = lignes.slice(0, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(4, 4, W - 8, 8 + l2.length * 15);
    ctx.fillStyle = '#fff';
    l2.forEach((l, i) => ctx.fillText(l, W / 2, 17 + i * 15));
  }

  // Aide commandes (clavier seulement : sur écran tactile, ce sont les boutons)
  if (!ECRAN_TACTILE) {
    texteSurFond(ctx, '↑↓ / Z S : gaz · X couper · Espace plein gaz · ←→ / Q D : orienter · L pilote auto · +/− temps · P pause · Échap quitter', W / 2, H - 12, { police: '12px system-ui, sans-serif' });
    ctx.textAlign = 'center';
  }

  // Temps et pilote automatique
  ctx.textAlign = 'right';
  const y0 = hautDroite;
  ctx.font = compact ? 'bold 12px system-ui, sans-serif' : 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = warp > 1 ? '#ffca28' : 'rgba(255,255,255,0.6)';
  const limite = vol.warpChoisi > warp ? (compact ? ` (×${vol.warpChoisi} limité)` : ` (×${vol.warpChoisi} demandé, limité près du sol)`) : '';
  ctx.fillText('Temps ×' + warp + limite + (ECRAN_TACTILE ? '' : '  +/−'), W - 14, y0 + 28);
  ctx.font = compact ? '11px system-ui, sans-serif' : '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('T+ ' + fmtDuree(vol.t), W - 14, y0 + (compact ? 43 : 46));
  if (vol.autopilote) {
    ctx.font = compact ? 'bold 12px system-ui, sans-serif' : 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#66bb6a';
    ctx.fillText('PILOTE AUTO', W - 14, y0 + (compact ? 60 : 70));
    ctx.font = compact ? '11px system-ui, sans-serif' : '12px system-ui, sans-serif';
    // En compact, le message du pilote passe sur deux lignes si besoin.
    const msg = vol.messageAuto || '';
    const largeurDispo = compact ? W - (ZONE_HUD ? ZONE_HUD.x + ZONE_HUD.w + 10 : 190) - 14 : 1e9;
    if (ctx.measureText(msg).width <= largeurDispo) ctx.fillText(msg, W - 14, y0 + (compact ? 75 : 88));
    else {
      const i = msg.lastIndexOf(' ', Math.floor(msg.length / 2) + 4);
      ctx.fillText(msg.slice(0, i), W - 14, y0 + 75);
      ctx.fillText(msg.slice(i + 1), W - 14, y0 + 89);
    }
  }
  ctx.textAlign = 'left';
}
