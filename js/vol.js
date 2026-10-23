'use strict';
// Simulation et affichage d'un vol.
// Repère : x horizontal (m), y = altitude (m) par rapport au niveau moyen du sol
// (ou au niveau 1 bar des géantes). angle = 0 quand la fusée pointe vers le haut.

const VITESSE_ROTATION = 1.6;  // rad/s
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
    this.x = 0;
    this.y = astre.depart.alt;
    this.vx = 0;
    this.vy = -astre.depart.vitesse;
    this.angle = 0;
    this.carburant = options.carburant !== undefined ? Math.min(options.carburant, fusee.carburant) : fusee.carburant;
    this.lancement = !!options.lancement;
    this.bases = options.bases || [];
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
      this.y = this.sol(0) + 0.01;
      this.vy = 0;
      this.pose = true;
      this.phase = 'au sol';
      this.dejaPose = true;
    }
    this.c = conditions(astre, this.y);
  }

  masse() { return this.f.masseSeche + this.carburant; }
  twr() { return this.f.poussee / (this.masse() * this.c.g); }
  sol(x) { return this.terrain ? this.terrain(x) : 0; }
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

    // Compte à rebours sur le pas de tir : les pinces retiennent la fusée pendant l'allumage.
    if (this.compteARebours > 0) {
      const avant = this.compteARebours;
      this.compteARebours = Math.max(0, this.compteARebours - dt);
      if (avant > 3 && this.compteARebours <= 3) this.noter('T−3 s : allumage des moteurs');
      this.throttle = this.compteARebours <= 3 ? Math.min(1, (3 - this.compteARebours) / 2) : 0;
      this.manette = this.throttle;
      if (this.compteARebours === 0) {
        this.tDecollage = this.t;
        this.noter('T−0 : décollage !');
        this.decollageDemande = true;
        this.autopilote = true;
      } else return;
    }
    if (this.lancement && this.tDecollage && !this.pose) this.suivreLancement();

    if (this.autopilote) this.pilotage(dt);
    else {
      if (cmd.gauche) this.angle -= VITESSE_ROTATION * dt;
      if (cmd.droite) this.angle += VITESSE_ROTATION * dt;
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
        this.noter(`Séparation : ${f.etages[f.etage - 1].nom} largué à ${fmtAlt(this.y)}, ${f.etages[f.etage].nom} allumé`);
        // L'étage vide retombe : on le voit s'éloigner.
        this.etageLargue = { x: this.x, y: this.y, vx: this.vx, vy: this.vy, angle: this.angle, h: f.etages[f.etage - 1].hauteur - f.hauteur, t: 0 };
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
        this.messageExplo = { texte: `Prélèvement n° ${this.prelevements.length} à ${fmtP(this.c.p)}, ${fmt(this.c.t)} °C : ${texte}`, vie: 6 };
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
    if (c.rad > f.protection) {
      this.dose += (c.rad / f.protection - 1) * 5 * dt;
      if (this.dose >= 100) return this.terminer('irradiee');
    }
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
    this.angle = penteRad;     // la fusée repose sur la pente
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
        this.messageAuto = twr < 1 ? 'poussée insuffisante pour freiner !' : this.cibleX === null && alt < 1500 ? 'aucun terrain plat en vue' : 'descente vers une zone plate';
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
          this.messageAuto = twr < 1 ? 'poussée insuffisante pour monter !' : 'remontée vers le niveau 1 bar';
          break;
        }
        return this.pilotageMiseEnOrbite(dt, alt, twr);
      }
      case 'plongee': {
        const zone = 1 + (a.cible - 1) * 0.3;
        vyCible = this.c.p < zone ? -1e9 : -200;
        this.messageAuto = 'plongée vers ' + fmt(a.cible, 1) + ' bar';
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
    const dA = angleCible - this.angle;
    this.angle += Math.max(-VITESSE_ROTATION * dt, Math.min(VITESSE_ROTATION * dt, dA));
    let th = Math.hypot(Fx, Fy) / this.f.poussee;
    if (Fy <= 0) th = 0;
    if (Math.abs(dA) > 0.4) th *= 0.3;   // pas de pleine poussée tant qu'on est mal orienté
    this.manette = Math.max(0, Math.min(1, th));
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
    const dA = angleCible - this.angle;
    this.angle += Math.max(-VITESSE_ROTATION * dt, Math.min(VITESSE_ROTATION * dt, dA));
    let th = Math.hypot(Fx, Fy) / Fmax;
    if (Math.abs(dA) > 0.4) th *= 0.3;
    this.manette = Math.max(0, Math.min(1, th));
    const reste = vO - Math.abs(this.vx);
    this.messageAuto = twr < 1 ? 'poussée insuffisante pour décoller !' : `mise en orbite : encore ${fmt(Math.max(0, reste))} m/s`;
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
      this.noter('Compte à rebours : T−10 s');
      return;
    }
    if (this.compteARebours > 0) return;
    this.decollageDemande = true;
    this.autopilote = true;
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
    if (!this.maxQAnnonce && this.qMax > 5000 && q < 0.9 * this.qMax) {
      this.maxQAnnonce = true;
      this.noter(`Max Q : pression aérodynamique maximale (${fmt(this.qMax / 1000)} kPa) à ${fmtAlt(this.y)}`);
    }
    if (!this.coiffeLarguee && this.y > 110000) {
      this.coiffeLarguee = true;
      this.noter('Largage de la coiffe : l’atmosphère est trop ténue pour la charge utile');
    }
  }
  abandonner() { if (!this.fin) this.terminer(this.pose ? 'pose' : 'abandon'); }

  terminer(cause) {
    const detruite = ['ecrasee', 'brulee', 'pressurisee', 'carburant', 'irradiee'].includes(cause);
    if (this.lancement && cause === 'orbite') this.noter(`Mise en orbite à ${fmtAlt(this.y)}, ${fmtV(Math.abs(this.vx))}`);
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
      integrite: this.integrite,
      altitude: this.y,
      vitesse: Math.hypot(this.vx, this.vy),
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
      case 'descente': return `Posez-vous en douceur : moins de ${a.vMax} m/s, module droit, sol pas trop pentu`;
      case 'au sol':
        if (this.lancement) {
          if (this.compteARebours > 0) return `${this.f.nomLanceur} : compte à rebours en cours…`;
          return `${this.f.nomLanceur} sur le pas de tir : T pour lancer le compte à rebours`;
        }
        return this.voyage
          ? 'Posé ! E : spationaute · R : robot · B : construire une base · T : décoller vers l\'orbiteur'
          : 'Posé ! Entrée : terminer · E : spationaute · R : robot · T : décoller vers l\'orbite';
      case 'remontee': return a.type === 'gazeuse'
        ? `${fmt(a.cible, 1)} bar atteints ! Remontez jusqu'au niveau 1 bar`
        : `Mise en orbite : ${fmtAlt(this.altOrbite)} d'altitude et ${fmtV(vitesseOrbitale(a, this.altOrbite))} à l'horizontale`;
      case 'plongee': return `Pas de sol : plongez jusqu'à ${fmt(a.cible, 1)} bar (prélèvements automatiques), puis remontez`;
      case 'approche': return 'Approchez le Soleil… si vous pouvez';
    }
    return '';
  }
}

// Ce que contient le gaz prélevé, selon la géante et la profondeur (pression en bar).
function compositionGaz(a, p) {
  if (a.id === 'jupiter' || a.id === 'saturne') {
    const base = 'hydrogène ~' + (a.id === 'jupiter' ? '90' : '96') + ' %, hélium, traces de méthane';
    if (p < 0.7) return `${base} ; cristaux de glace d’ammoniac (les nuages blancs)`;
    if (p < 2.5) return `${base} ; nuages d’hydrosulfure d’ammonium (les bandes brun-orangé)`;
    return `${base} ; gouttelettes d’eau, nuages d’orage profonds`;
  }
  // Uranus et Neptune : le méthane absorbe le rouge, d'où leur couleur bleue.
  if (p < 1.5) return 'hydrogène, hélium, ~2 % de méthane (il donne la couleur bleue) ; cristaux de méthane';
  return 'hydrogène, hélium, méthane ; nuages de sulfure d’hydrogène (odeur d’œuf pourri !)';
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
function fmtV(v) {
  const a = Math.abs(v);
  if (a >= 10000) return fmt(v / 1000, 1) + ' km/s';
  if (a < 1 && a > 0) return fmt(v * 100, 1) + ' cm/s';
  return fmt(v, 1) + ' m/s';
}
function fmtG(g) { return g < 0.01 ? fmt(g * 1000, 2) + ' mm/s² (' + (g / G0).toExponential(1).replace('.', ',') + ' g)' : fmt(g, 2) + ' m/s² (' + fmt(g / G0, 2) + ' g)'; }

// Durée lisible : secondes, minutes, heures, jours, mois, années.
function fmtDuree(s) {
  const signe = s < 0 ? '−' : '';
  s = Math.abs(s);
  const MIN = 60, H = 3600, J = 86400, MOIS = 30.436875 * J, AN = 365.25 * J;
  const deux = (n) => String(Math.floor(n)).padStart(2, '0');
  if (s < MIN) return signe + fmt(s, s < 10 ? 1 : 0) + ' s';
  if (s < H) return signe + Math.floor(s / MIN) + ' min ' + deux(s % MIN) + ' s';
  if (s < J) return signe + Math.floor(s / H) + ' h ' + deux((s % H) / MIN) + ' min';
  if (s < MOIS) return signe + Math.floor(s / J) + ' j ' + deux((s % J) / H) + ' h';
  if (s < AN) return signe + Math.floor(s / MOIS) + ' mois ' + Math.floor((s % MOIS) / J) + ' j';
  const ans = Math.floor(s / AN);
  return signe + ans + (ans > 1 ? ' ans ' : ' an ') + Math.floor((s % AN) / MOIS) + ' mois';
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

function dessinerVol(ctx, vol, W, H, dtReel, warp) {
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
    echelle = Math.min(3, (0.45 * H) / Math.max(alt, 1));
    fuseeY = H * 0.8 - alt * echelle;
    solY = fuseeY + vol.y * echelle;
  }

  // Secousse de l'écran pendant les dégâts.
  ctx.save();
  if (vol.secousse > 0) vol.secousse = Math.max(0, vol.secousse - dtReel);
  const tremble = (vol.enDegats() && !vol.fin ? 2 + Math.min(6, (vol.taux.pression + vol.taux.chaleur) / 5) : 0) + (vol.secousse > 0 ? 8 * vol.secousse : 0);
  if (tremble > 0) ctx.translate((Math.random() - 0.5) * tremble, (Math.random() - 0.5) * tremble);

  dessinerFond(ctx, a, c, W, H, gaz && vol.y < 0);

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
    ctx.fillText('niveau 1 bar', 12, solY - 6);
  }

  // Fumée et étincelles, puis fusée ou explosion.
  const hPx = vol.f.mega ? Math.max(vol.f.hauteur * echelle, 90) : Math.max(HAUTEUR_MODULE * echelle, gaz ? 60 : 44);
  if (solide) dessinerBases(ctx, vol, W, echelle, fuseeY);
  // Pas de tir : la tour de lancement, à côté de la fusée.
  if (vol.lancement && solide) {
    const xt = 9;
    const sx = W / 2 + (xt - vol.x) * echelle, sy = fuseeY + (vol.y - vol.sol(xt)) * echelle;
    if (sx > -200 && sx < W + 200 && sy > -50) dessinerTour(ctx, sx, sy, echelle, vol.f.etages[0].hauteur);
  }
  // Étage largué qui retombe
  if (vol.etageLargue && dtReel > 0) {
    const e = vol.etageLargue;
    const h = dtReel * warp;
    e.t += h; e.vy -= c.g * h; e.x += e.vx * h; e.y += e.vy * h; e.angle += 0.05 * h;
    const sx = W / 2 + (e.x - vol.x) * echelle, sy = fuseeY + (vol.y - e.y) * echelle;
    if (e.t < 120 && sx > -100 && sx < W + 100 && sy > -100 && sy < H + 100) {
      const hh = Math.max(14, e.h * echelle), ww = Math.max(4, hh * 0.22);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(e.angle);
      ctx.fillStyle = '#eceff1'; ctx.fillRect(-ww / 2, 0, ww, hh);
      ctx.fillStyle = '#212121'; ctx.fillRect(-ww / 2, hh * 0.8, ww / 2, hh * 0.1);
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

// Astres visibles dans le ciel, pour l'infobulle au survol : [{ x, y, r, id }].
let ZONES_CIEL = [];

// Ciel, étoiles, planète mère et Soleil (vues d'atterrissage et d'exploration).
function dessinerFond(ctx, a, c, W, H, sousLesNuages) {
  ZONES_CIEL = [];
  // Ciel : noir dans le vide, couleur de l'atmosphère quand l'air s'épaissit.
  let tCiel = 0;
  if (a.atm && a.type !== 'etoile') tCiel = Math.min(1, Math.sqrt(c.p / 0.3));
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

  // Étoiles, de moins en moins visibles quand le ciel s'éclaire.
  const visEt = 1 - Math.min(1, tCiel * 1.4);
  if (visEt > 0.02) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * visEt})`;
    for (const e of ETOILES) ctx.fillRect(e.x * W, e.y * H, e.r, e.r);
  }

  // Planète mère dans le ciel (pour les lunes) : taille apparente réelle, au moins 6 px.
  if (a.parent && ASTRES_PAR_ID[a.parent] && a.orbite) {
    const pm = ASTRES_PAR_ID[a.parent];
    const angle = 2 * Math.atan(pm.rayonKm / a.orbite.a);           // diamètre apparent (rad)
    const r = Math.max(6, Math.min(Math.min(W, H) * 0.35, (angle / 1.2) * W / 2));
    ctx.globalAlpha = 0.9 * Math.max(0.25, visEt);
    ctx.fillStyle = pm.couleurs.disque;
    ctx.beginPath(); ctx.arc(W * 0.78, H * 0.2, r, 0, Math.PI * 2); ctx.fill();
    if (pm.id === 'saturne') {
      ctx.strokeStyle = 'rgba(230,210,160,0.7)'; ctx.lineWidth = Math.max(1, r * 0.15);
      ctx.beginPath(); ctx.ellipse(W * 0.78, H * 0.2, r * 2.2, r * 0.5, -0.3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ZONES_CIEL.push({ x: W * 0.78, y: H * 0.2, r: Math.max(r, 10), id: pm.id });
  }
  if (a.type !== 'etoile') {
    const rs = Math.max(2, 14 / Math.sqrt(a.distanceUA));
    ctx.fillStyle = 'rgba(255,240,200,0.9)';
    ctx.beginPath(); ctx.arc(W * 0.42, H * 0.13, rs, 0, Math.PI * 2); ctx.fill();
    ZONES_CIEL.push({ x: W * 0.42, y: H * 0.13, r: Math.max(rs, 10), id: 'soleil' });
  }
  // Lunes sœurs visibles (les plus grosses), petits points.
  if (a.parent) {
    const soeurs = (ENFANTS[a.parent] || []).filter((s) => s.id !== a.id && s.rayonKm > 200).slice(0, 4);
    soeurs.forEach((s, i) => {
      const x = W * (0.45 + 0.1 * i), y = H * (0.08 + 0.05 * (i % 2));
      ctx.fillStyle = s.couleurs.disque;
      ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      ZONES_CIEL.push({ x, y, r: 9, id: s.id });
    });
  }
  // Planète d'origine vue depuis une planète : la Terre depuis Mars ou Vénus, etc. (petit point bleu).
  if (!a.parent && a.id !== 'terre' && a.type !== 'etoile') {
    ctx.fillStyle = '#4f8fe0';
    ctx.beginPath(); ctx.arc(W * 0.3, H * 0.07, 2, 0, Math.PI * 2); ctx.fill();
    ZONES_CIEL.push({ x: W * 0.3, y: H * 0.07, r: 9, id: 'terre' });
  }
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
  for (let sx = -pas; sx <= W + pas; sx += pas) pts.push([sx, ecranY(vol.x + (sx - W / 2) / echelle)]);

  // Sol, plus sombre en profondeur.
  const haut = Math.min(...pts.map((p) => p[1]));
  if (haut > H + 10) return;
  const g = ctx.createLinearGradient(0, haut, 0, H);
  g.addColorStop(0, a.couleurs.sol);
  g.addColorStop(1, assombrir(a.couleurs.sol, 0.45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], H + 10);
  for (const [x, y] of pts) ctx.lineTo(x, y);
  ctx.lineTo(W + pas, H + 10);
  ctx.closePath();
  ctx.fill();

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
      const couleur = assombrir(a.couleurs.sol, 0.5 + 0.25 * hash(k + 11));
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
  if (!(vol.f && vol.f.mega)) return dessinerModule(ctx, vol, x, y, h);
  const ch = vol.f.choix;
  const degats = vol.degats || { pression: 0, chaleur: 0, impact: 0 };
  const integrite = vol.integrite === undefined ? 100 : vol.integrite;
  // La pression écrase la coque : le corps se pince.
  const pince = 1 - 0.18 * Math.min(1, degats.pression / 100);
  const w = h * (vol.f.largeurRel || 0.26);
  const wc = w * pince;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(vol.angle);

  // Flamme
  if (vol.throttle > 0) {
    const L = h * (0.25 + 0.6 * vol.throttle) * (0.85 + Math.random() * 0.3);
    const lg = w * (0.2 + 0.18 * vol.throttle);
    const gr = ctx.createLinearGradient(0, 0, 0, L);
    gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.4, '#ffab40'); gr.addColorStop(1, 'rgba(255,60,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.moveTo(-lg, 0); ctx.lineTo(0, L); ctx.lineTo(lg, 0); ctx.fill();
  }

  // Panneaux anti-vent solaire
  if (ch.panneau !== 'aucun') {
    const taille = { leger: 0.5, moyen: 0.75, lourd: 1, helio: 1.3 }[ch.panneau] || 0.5;
    ctx.fillStyle = '#2f6fd6';
    ctx.strokeStyle = '#9ec3ff';
    ctx.lineWidth = 1;
    const pw = w * taille, ph = h * 0.22;
    ctx.fillRect(-wc / 2 - pw, -h * 0.62, pw, ph); ctx.strokeRect(-wc / 2 - pw, -h * 0.62, pw, ph);
    ctx.fillRect(wc / 2, -h * 0.62, pw, ph); ctx.strokeRect(wc / 2, -h * 0.62, pw, ph);
  }

  // Ailerons et pieds
  ctx.fillStyle = '#c62828';
  ctx.beginPath(); ctx.moveTo(-wc / 2, -h * 0.28); ctx.lineTo(-w * 0.95, 0); ctx.lineTo(-wc / 2, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(wc / 2, -h * 0.28); ctx.lineTo(w * 0.95, 0); ctx.lineTo(wc / 2, 0); ctx.fill();

  // Tuyère (plus large pour les gros moteurs)
  const tuy = { libellule: 0.45, faucon: 0.6, titan: 0.8, heracles: 1, promethee: 1.2, raptor: 1.1 }[ch.moteur] || 0.6;
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.moveTo(-w * 0.25, -h * 0.05); ctx.lineTo(-w * 0.5 * tuy, 0); ctx.lineTo(w * 0.5 * tuy, 0); ctx.lineTo(w * 0.25, -h * 0.05); ctx.fill();

  // Corps (pincé au milieu sous la pression)
  const yh = -h * 0.8, yb = -h * 0.05;
  const forme = new Path2D();
  forme.moveTo(-w / 2, yb);
  forme.quadraticCurveTo(-w / 2 + (w - wc) * 1.5, (yh + yb) / 2, -w / 2, yh);
  forme.lineTo(w / 2, yh);
  forme.quadraticCurveTo(w / 2 - (w - wc) * 1.5, (yh + yb) / 2, w / 2, yb);
  forme.closePath();
  const lanceur = vol.f && vol.f.mega && vol.f.etages;
  // La chaleur noircit la peinture.
  const brule = Math.min(1, degats.chaleur / 100);
  ctx.fillStyle = melanger('#eceff1', '#3e2723', brule * 0.8);
  ctx.fill(forme);
  if (ch.coque !== 'aucun') {
    const epc = { leger: 1, renforce: 2, lourd: 3, abyssal: 4 }[ch.coque] || 1;
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = epc;
    ctx.stroke(forme);
    ctx.save(); ctx.clip(forme);
    ctx.beginPath();
    for (let i = 1; i <= epc; i++) { const yy = yh + (h * 0.75 * i) / (epc + 1); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); }
    ctx.stroke();
    ctx.restore();
  }
  if (lanceur) {
    ctx.save(); ctx.clip(forme);
    dessinerBandesLanceur(ctx, vol.f, w, h);
    ctx.restore();
  }
  // Hublot
  ctx.fillStyle = integrite < 30 ? '#90a4ae' : '#4fc3f7';
  if (!lanceur) { ctx.beginPath(); ctx.arc(0, -h * 0.6, wc * 0.22, 0, Math.PI * 2); ctx.fill(); }

  // Coiffe (couleur du bouclier thermique)
  const coul = { aucun: '#c62828', ceramique: '#e0e0e0', ablatif: '#6d4c41', carbone: '#212121', tungstene: '#90a4ae' }[ch.bouclier] || '#c62828';
  ctx.fillStyle = melanger(coul.length === 7 ? coul : '#c62828', '#1b0f0a', brule * 0.6);
  ctx.beginPath(); ctx.moveTo(-w / 2, yh); ctx.quadraticCurveTo(0, -h * 1.1, w / 2, yh); ctx.fill();
  if (ch.bouclier !== 'aucun') { ctx.fillRect(-w / 2, -h * 0.07, w, h * 0.03); }

  // Fissures : de plus en plus nombreuses quand l'intégrité baisse.
  const nFiss = Math.round((1 - integrite / 100) * FISSURES.length);
  if (nFiss > 0) {
    ctx.save(); ctx.clip(forme);
    ctx.lineWidth = Math.max(1, h / 60);
    for (let i = 0; i < nFiss; i++) {
      const pts = FISSURES[i];
      ctx.strokeStyle = vol.taux && vol.taux.chaleur > 0 ? 'rgba(255,120,0,0.9)' : 'rgba(30,30,30,0.85)';
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0] * w, pts[k][1] * h);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Rougeoiement quand la coque chauffe
  const chauffe = Math.max(0, Math.min(1, (vol.temp - 100) / Math.max(200, vol.f.tempMax - 100)));
  if (chauffe > 0.05) {
    ctx.save(); ctx.clip(forme);
    ctx.fillStyle = `rgba(255,${Math.round(120 - 80 * chauffe)},0,${0.55 * chauffe})`;
    ctx.fillRect(-w / 2, yh, w, h * 0.75);
    ctx.restore();
  }

  // Contour qui clignote en rouge pendant les dégâts.
  if (vol.enDegats && vol.enDegats() && Math.sin(performance.now() / 70) > 0) {
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2;
    ctx.stroke(forme);
  }
  ctx.restore();
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

// Bandes noires et séparations d'étages des grands lanceurs.
function dessinerBandesLanceur(ctx, f, w, h) {
  const reste = f.etages.slice(f.etage);
  ctx.fillStyle = '#212121';
  // Motif noir et blanc en bas du premier étage restant (aide à suivre le roulis)
  for (let i = 0; i < 4; i++) ctx.fillRect(i % 2 ? 0 : -w / 2, -h * (0.08 + 0.05 * Math.floor(i / 2)), w / 2, h * 0.05);
  // Séparations entre étages
  for (let k = 1; k < reste.length; k++) {
    const y = -h * (reste[k].hauteur / reste[0].hauteur) * 0.75 - h * 0.05;
    ctx.fillRect(-w / 2, y, w, Math.max(1.5, h * 0.012));
    ctx.fillRect(-w / 2, y + h * 0.02, w * 0.25, h * 0.04);
  }
}

// Bases au sol : dômes habitables, panneaux solaires et usine à ergols.
function dessinerBases(ctx, vol, W, echelle, fuseeY) {
  for (const b of vol.bases) {
    const sx = W / 2 + (b.x - vol.x) * echelle;
    if (sx < -400 || sx > W + 400) continue;
    const sy = fuseeY + (vol.y - vol.sol(b.x)) * echelle;
    dessinerBase(ctx, sx, sy, Math.max(echelle, 0.4));
  }
}
function dessinerBase(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  // Panneaux solaires
  ctx.fillStyle = '#2f6fd6';
  for (let i = 0; i < 3; i++) { ctx.fillRect((-38 + i * 7) * s, -9 * s, 5 * s, 6 * s); ctx.fillRect((-38 + i * 7) * s, -3 * s, 0.6 * s, 3 * s); }
  // Dômes
  ctx.fillStyle = '#eceff1';
  ctx.beginPath(); ctx.arc(-10 * s, 0, 8 * s, Math.PI, 0); ctx.fill();
  ctx.beginPath(); ctx.arc(6 * s, 0, 6 * s, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(-12 * s, -4 * s, 4 * s, 2 * s);
  // Usine à ergols et réservoir
  ctx.fillStyle = '#b0bec5'; ctx.fillRect(15 * s, -10 * s, 8 * s, 10 * s);
  ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.arc(28 * s, -4 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cfd8dc'; ctx.font = `${Math.max(10, 3 * s)}px system-ui, sans-serif`;
  ctx.fillText('Base', -14 * s, -12 * s);
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

// Messages empilés en bas de l'écran (le plus récent en bas). Un message trop long passe sur deux lignes.
function afficherMessages(ctx, textes, W, yBas) {
  ctx.save();
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const blocs = textes.map((t) => {
    if (ctx.measureText(t).width <= W - 60) return [t];
    let i = t.indexOf(' : ');
    if (i > 0) return [t.slice(0, i + 2), t.slice(i + 3)];
    i = t.lastIndexOf(' ', t.length / 2);
    return i > 0 ? [t.slice(0, i), t.slice(i + 1)] : [t];
  });
  let y = yBas;
  for (let b = blocs.length - 1; b >= 0; b--) {
    const lignes = blocs[b];
    const tw = Math.min(W - 20, Math.max(...lignes.map((l) => ctx.measureText(l).width)));
    const hb = lignes.length * 20 + 8;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(W / 2 - tw / 2 - 12, y - hb + 6, tw + 24, hb);
    ctx.fillStyle = b === blocs.length - 1 ? '#ffd54f' : 'rgba(255,213,79,0.75)';
    lignes.forEach((l, k) => ctx.fillText(l, W / 2, y - (lignes.length - 1 - k) * 20));
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

function dessinerHUD(ctx, vol, W, H, warp) {
  const a = vol.astre, c = vol.c, f = vol.f;
  const x = 14, larg = 250;
  let y = 14;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(8, 8, larg + 12, a.type === 'solide' ? 434 : a.type === 'etoile' ? 380 : 416);
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
  ligne(a.type === 'solide' ? 'Altitude (sol)' : 'Altitude', fmtAlt(alt) + (a.type === 'gazeuse' ? ' (1 bar)' : ''));
  const vv = -vol.vy;
  const proche = a.type === 'solide' && alt < 2000;
  ligne('Vitesse vert.', (vv >= 0 ? '↓ ' : '↑ ') + fmtV(Math.abs(vv)), proche ? (vv > a.vMax ? '#ef5350' : '#66bb6a') : '#fff');
  ligne('Vitesse horiz.', fmtV(Math.abs(vol.vx)), proche && Math.abs(vol.vx) > a.vMax ? '#ef5350' : '#fff');
  if (a.type === 'solide') {
    const p = Math.abs(vol.pente(vol.x)) * 180 / Math.PI;
    ligne('Pente du sol', fmt(p) + '°', p > INCLINAISON_MAX ? '#ef5350' : p > INCLINAISON_MAX * 0.6 ? '#ffca28' : '#66bb6a');
  }

  const fc = vol.carburant / f.carburant;
  ligne('Carburant', fmt(vol.carburant) + ' kg', fc < 0.15 ? '#ef5350' : '#fff');
  jauge(ctx, x, y - 4, larg, fc, fc < 0.15 ? '#ef5350' : '#42a5f5'); y += 6;

  const fi = vol.integrite / 100;
  ligne('Intégrité coque', fmt(vol.integrite) + ' %', fi > 0.6 ? '#66bb6a' : fi > 0.3 ? '#ffca28' : '#ef5350');
  jauge(ctx, x, y - 4, larg, fi, fi > 0.6 ? '#66bb6a' : fi > 0.3 ? '#ffca28' : '#ef5350'); y += 6;

  const fp = c.p / f.pressionMax;
  ligne('Pression', fmtP(c.p) + ' / ' + fmt(f.pressionMax), couleurRisque(fp));
  jauge(ctx, x, y - 4, larg, fp, couleurRisque(fp)); y += 6;

  const ft = (vol.temp + KELVIN) / (f.tempMax + KELVIN);
  ligne('Temp. coque', fmt(vol.temp) + ' / ' + fmt(f.tempMax) + ' °C', couleurRisque(ft));
  jauge(ctx, x, y - 4, larg, ft, couleurRisque(ft)); y += 6;
  ligne('Temp. extérieure', fmt(c.t) + ' °C');

  ligne('Gravité locale', fmtG(c.g));
  if (a.type !== 'etoile') {
    const vO = vol.vOrbitale(), vL = vol.vLiberation();
    const vh = Math.abs(vol.vx);
    ligne('Vit. orbitale', fmtV(vO) + (vol.phase === 'remontee' && a.type === 'solide' ? ' (' + fmt(Math.min(100, (vh / vO) * 100)) + ' %)' : ''), vh >= vO * 0.98 ? '#66bb6a' : '#fff');
    ligne('Vit. libération', fmtV(vL), Math.hypot(vol.vx, vol.vy) >= vL ? '#66bb6a' : '#fff');
  }
  const twr = vol.twr();
  ligne('Poussée/poids', fmt(twr * vol.throttle, 2) + ' (max ' + fmt(twr, 2) + ')', twr < 1 ? '#ef5350' : '#fff');

  const fr = c.rad / f.protection;
  ligne('Rayonnement', fmt(c.rad, c.rad < 10 ? 1 : 0) + ' / ' + fmt(f.protection, 1), couleurRisque(fr));
  ligne('Dose reçue', fmt(vol.dose) + ' %', couleurRisque(vol.dose / 100));
  if (a.type === 'gazeuse') ligne('Prélèvements', String((vol.prelevements || []).length), '#4dd0e1');

  // Alertes de dégâts
  if (vol.enDegats() && !vol.fin) {
    const msgs = [];
    if (vol.taux.pression > 0) msgs.push('SURPRESSION : la coque se déforme');
    if (vol.taux.chaleur > 0) msgs.push('SURCHAUFFE : la coque brûle');
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = Math.sin(performance.now() / 150) > 0 ? '#ff1744' : '#ffffff';
    msgs.forEach((m, i) => ctx.fillText(m, W / 2, 70 + i * 24));
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
  // Chronologie du lancement
  if (vol.lancement && vol.chrono && vol.tDecollage) {
    const evs = vol.chrono.filter((e) => !e.avant).slice(-5);
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    evs.forEach((e, i) => {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`T+${fmtDuree(e.t)}  ${e.texte}`, W - 70, H - 120 - (evs.length - 1 - i) * 17);
    });
    ctx.textAlign = 'left';
  }

  // Remontée vers l'orbite : deux jauges pour savoir où l'on en est.
  if (vol.phase === 'remontee' && a.type === 'solide' && !vol.fin) {
    const vO = vitesseOrbitale(a, vol.altOrbite);
    const fa = Math.max(0, vol.y) / (vol.altOrbite * 0.9), fv = Math.abs(vol.vx) / (vO * 0.97);
    const x0 = W / 2 - 160, y0 = 48;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x0 - 8, y0 - 6, 336, 52);
    ctx.font = '12px system-ui, sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText(`Altitude d’orbite : ${fmtAlt(Math.max(0, vol.y))} / ${fmtAlt(vol.altOrbite * 0.9)}`, x0, y0 + 8);
    jauge(ctx, x0, y0 + 12, 320, fa, fa >= 1 ? '#66bb6a' : '#42a5f5');
    ctx.fillStyle = '#fff';
    ctx.fillText(`Vitesse horizontale : ${fmtV(Math.abs(vol.vx))} / ${fmtV(vO * 0.97)}`, x0, y0 + 32);
    jauge(ctx, x0, y0 + 36, 320, fv, fv >= 1 ? '#66bb6a' : '#ffca28');
  }
  if (vol.f.mega && !vol.fin) {
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#ffca28'; ctx.textAlign = 'right';
    ctx.fillText(`${vol.f.etages[vol.f.etage].nom} (${vol.f.etage + 1}/${vol.f.etages.length})`, W - 14, 110);
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
  afficherMessages(ctx, vol.fileMessages.map((m) => m.texte), W, H - 56);

  // Manette des gaz : barre verticale à droite.
  const bx = W - 46, bh = Math.min(240, H * 0.4), by = H / 2 - bh / 2;
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
  ctx.fillText(fmt(vol.manette * 100) + ' %', bx + 13, by + bh + 18);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#b0bec5';
  ctx.fillText('Gaz', bx + 13, by - 12);

  // Objectif
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const txt = vol.objectifTexte();
  const tw = ctx.measureText(txt).width;
  ctx.fillRect(W / 2 - tw / 2 - 12, 10, tw + 24, 30);
  ctx.fillStyle = '#fff';
  ctx.fillText(txt, W / 2, 31);

  // Aide commandes
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('↑↓ / Z S : gaz · X couper · Espace plein gaz · ←→ / Q D : orienter · L pilote auto · +/− temps · P pause · Échap quitter', W / 2, H - 14);

  // Temps et pilote automatique
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = warp > 1 ? '#ffca28' : 'rgba(255,255,255,0.6)';
  ctx.fillText('Temps ×' + warp + (vol.warpChoisi > warp ? ` (×${vol.warpChoisi} demandé, limité près du sol)` : '') + '  +/−', W - 14, 28);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('T+ ' + fmtDuree(vol.t), W - 14, 46);
  if (vol.autopilote) {
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = '#66bb6a';
    ctx.fillText('PILOTE AUTO', W - 14, 70);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(vol.messageAuto, W - 14, 88);
  }
  ctx.textAlign = 'left';
}
