'use strict';
const ZONE_BASE = 150;   // m de part et d'autre d'une base : ni site d'échantillon, ni artefact dessus
// Exploration de la surface en vue de côté, par un spationaute ou un robot.
// La gravité locale change tout : sauts immenses sur les petites lunes, démarche lourde sur Terre.

const EXPLORATEURS = {
  spationaute: {
    nom: 'Spationaute', hauteur: 1.8, autonomie: 4 * 3600, ressource: 'Oxygène',
    pressionMax: 1.2, tempMax: 120, tempMin: -270, protection: 3, capacite: 6, penteMax: 35,
  },
  robot: {
    nom: 'Robot', hauteur: 1.3, autonomie: 8 * 3600, ressource: 'Batterie',
    pressionMax: 100, tempMax: 480, tempMin: -273, protection: 60, capacite: Infinity, penteMax: 30,
  },
};

// Ce qu'on peut trouver, selon l'astre.
const SITES_PAR_ASTRE = {
  terre: [['Roche granitique', 'Roche continentale riche en quartz.'], ['Plante', 'De la vie ! Photosynthèse à base de chlorophylle.'], ['Fossile', 'Coquillage pétrifié vieux de 200 millions d’années.'], ['Minéral', 'Cristal de feldspath.']],
  lune: [['Régolithe', 'Poussière fine produite par 4 milliards d’années d’impacts.'], ['Basalte des mers', 'Lave refroidie il y a 3,5 milliards d’années.'], ['Anorthosite', 'Roche claire des hauts plateaux, la croûte primitive.'], ['Billes de verre', 'Gouttelettes de verre volcanique orangé.']],
  mars: [['Poussière rouge', 'Oxydes de fer : la rouille qui colore Mars.'], ['Ancien lit de rivière', 'Galets arrondis : de l’eau a coulé ici.'], ['Basalte', 'Roche volcanique sombre.'], ['Glace enfouie', 'Glace d’eau sous quelques centimètres de sol.']],
  venus: [['Basalte', 'Lave figée, surface de moins de 500 millions d’années.'], ['Coulée de lave', 'Plaine volcanique.'], ['Croûte de soufre', 'Dépôts de composés soufrés.']],
  mercure: [['Régolithe', 'Sol sombre riche en graphite.'], ['Cratère', 'Impact ancien.'], ['Glace polaire', 'Glace d’eau cachée à l’ombre des cratères polaires.']],
  io: [['Soufre', 'Soufre jaune déposé par les volcans.'], ['Coulée de lave', 'Lave de silicates très chaude.'], ['Évent volcanique', 'Panache de dioxyde de soufre.']],
  europe: [['Glace salée', 'Glace teintée de sels venus de l’océan profond.'], ['Fissure de la banquise', 'Rift où la glace s’ouvre et se referme.'], ['Sels marins', 'Chlorure de sodium : l’océan remonte ici.']],
  titan: [['Sable organique', 'Grains d’hydrocarbures façonnés en dunes.'], ['Lac de méthane', 'Méthane et éthane liquides à −179 °C.'], ['Galet de glace', 'Glace d’eau dure comme la roche, arrondie par des rivières de méthane.']],
  triton: [['Glace d’azote', 'Glace rose-blanche d’azote gelé.'], ['Geyser d’azote', 'Panache sombre qui monte à 8 km.']],
  pluton: [['Glace d’azote', 'Plaine glacée qui se renouvelle par convection.'], ['Glace d’eau', 'Montagnes de glace d’eau dure comme du granite.'], ['Tholins', 'Molécules organiques rougeâtres.']],
  l602: [['Neige des geysers', 'Grains de glace retombés des panaches.'], ['Rayure de tigre', 'Fissure chaude d’où jaillissent les geysers.']],
};
const SITES_GLACE = [['Glace d’eau', 'Glace vieille de plusieurs milliards d’années.'], ['Givre', 'Fine couche de givre.'], ['Cratère', 'Impact dans la glace.'], ['Roche', 'Inclusions rocheuses.']];
const SITES_ROCHE = [['Roche', 'Roche primitive.'], ['Régolithe', 'Poussière d’impacts.'], ['Météorite', 'Fragment métallique tombé du ciel.'], ['Cratère', 'Impact récent.']];
const SITES_ASTEROIDE = [['Roche carbonée', 'Matière primitive du Système solaire.'], ['Métal', 'Fer et nickel.'], ['Régolithe', 'Poussière très fine.']];

// Échantillons qu'on peut trouver sur un astre : [nom, description].
function typesEchantillons(a) {
  return SITES_PAR_ASTRE[a.id] || (a.asteroide ? SITES_ASTEROIDE : a.tempSurface < -120 ? SITES_GLACE : SITES_ROCHE);
}

// Records de saut par astre (gardés avec la partie) : { astreId: { h (m), par, quand } }.
function recordSaut(astreId) { return (typeof etat !== 'undefined' && etat.sauts && etat.sauts[astreId]) || null; }
function enregistrerSaut(astreId, h, par) {
  if (typeof etat === 'undefined') return;
  etat.sauts = etat.sauts || {};
  etat.sauts[astreId] = { h, par, quand: new Date().toISOString() };
}

class Exploration {
  // options.terre : promenade sur Terre ; options.provisions : la campagne (fleurs, fruits, bières).
  constructor(vol, type, science, options = {}) {
    this.vol = vol;
    this.astre = vol.astre;
    this.type = type;
    this.def = { ...EXPLORATEURS[type] };
    if (type === 'spationaute') this.def.nom = this.equipier().nom;
    this.science = science;         // { [astreId]: { sites: {k: true}, echantillons } }
    this.xFusee = vol.x;
    const x = vol.x + 2;
    this.p = { x, y: vol.sol(x), vx: 0, vy: 0, auSol: true, dir: 1, pas: 0 };
    this.reserve = this.def.autonomie;
    this.integrite = 100;
    this.dose = 0;
    this.sac = [];
    this.analyse = null;
    this.fin = null;
    this.message = '';
    this.fileMessages = [];
    this.traces = [];
    this.fx = [];
    this.c = conditions(this.astre, this.p.y);
    const g = this.c.g;
    this.vLib = vitesseLiberation(this.astre, 0);
    // Marcher vite est impossible en faible gravité : on rebondit (vitesse ~ √(g·L)).
    this.vMax = type === 'robot' ? Math.min(1.5, 0.9 * Math.sqrt(g * 2)) : Math.max(0.05, Math.min(3, 0.75 * Math.sqrt(g * 1)));
    this.acc = Math.min(type === 'robot' ? 1 : 4, 0.6 * g + 0.001);
    this.saut = type === 'robot' ? 0 : Math.min(2.2, 0.5 * this.vLib);
    this.cable = type === 'spationaute' && this.vLib < 4.4;
    if (this.cable) this.dire(`Gravité minuscule (libération à ${fmtV(this.vLib)}) : ${this.def.nom} reste attaché${this.equipier().acc} par un câble.`);
    // Promenade sur Terre : fleurs, fruits et bar, pas de science.
    this.terre = !!options.terre;
    this.campagne = options.provisions || null;
    this.bieres = 0;
    this.sites = this.terre ? this.genererTerre() : this.genererSites();
    // Rover : garé à côté de la fusée, pour le spationaute (plus rapide, 20 échantillons).
    this.rover = type === 'spationaute' && !this.terre && !vol.robotSeul && !this.cable ? { x: this.xFusee - 5, dir: 1, pas: 0 } : null;
    this.enRover = false;
    this.sacRover = [];
    this.vMaxRover = Math.min(5, 2.8 * Math.sqrt(g));          // ≈ 3,6 m/s sur la Lune, comme le rover d'Apollo
    this.accRover = Math.min(1.5, 0.5 * g + 0.001);
    this.warp = 1;
    // Robot : ses analyses attendent dans sa mémoire jusqu'au retour à sa base (module robot ou fusée).
    this.moduleRobot = !!vol.robotSeul;
    this.donneesEnAttente = 0;
    // Robot : son électronique encaisse la vraie dose du lieu (Sv/jour), atténuée par son blindage.
    this.irradiation = doseSurface(this.astre);
    if (type === 'spationaute') {
      this.doseSv = vol.doseSv || 0;
      this.dose = (100 * this.doseSv) / DOSE_MORTELLE;
      const t = tempsAvantDoseMortelle(this.irradiation.svJour, this.doseSv);
      if (!this.terre && t < 30 * 86400) this.dire(`Rayonnement ici : ${fmtDose(this.irradiation.svJour)}. Dose mortelle atteinte dehors en ${fmtDureeLongue(t)}.${t < this.def.autonomie ? ` ⏱ Sortie de ${fmtDuree(t * 0.8)} au plus, retour compris.` : ''}`);
    }
    if (type === 'spationaute' && !this.terre) {
      if (this.astre.id === 'lune' && !(etat.repliques || {}).armstrong) replique('armstrong');
      else if (!this.astre.atm) replique('crier');
    }
    if (type === 'robot') {
      this.blindage = options.blindage || blindageConseille(this.astre);
      this.doseGy = 0;
      this.dire(`Rayonnement ici : ${fmtDose(this.irradiation.svJour)}. Blindage ${BLINDAGES_ROBOT[this.blindage].nom.toLowerCase()} : l’électronique tient ${this.vieRestante()}.`);
    }
  }

  // ---------- Promenade sur Terre ----------
  genererTerre() {
    const fleurs = ['Coquelicot', 'Marguerite', 'Tournesol', 'Lavande', 'Bleuet', 'Rose'];
    const arbres = [['Pommier', 'pomme'], ['Cerisier', 'cerise'], ['Oranger', 'orange'], ['Prunier', 'prune'], ['Abricotier', 'abricot']];
    const l = [{ k: 'bar', x: this.xFusee + 70, type: 'bar', nom: 'Bar de l’Espace' }];
    for (let k = -30; k <= 30; k++) {
      if (k === 0) continue;
      const x = this.xFusee + k * 13 + (hash2(k, 60) - 0.5) * 6;
      if (Math.abs(x - (this.xFusee + 70)) < 12) continue;
      if (hash2(k, 61) < 0.3) {
        const [nom, fruit] = arbres[Math.floor(hash2(k, 62) * arbres.length)];
        l.push({ k: 't' + k, x, type: 'arbre', nom, fruit, reste: 3 });
      } else if (hash2(k, 63) < 0.7) {
        l.push({ k: 'f' + k, x, type: 'fleur', nom: fleurs[Math.floor(hash2(k, 64) * fleurs.length)], cueillie: false });
      }
    }
    return l;
  }

  agirTerre() {
    const p = this.p;
    const proche = this.sites.filter((s) => distSol(this.astre, s.x, p.x) < (s.type === 'bar' ? 8 : 2.5))
      .sort((a, b) => distSol(this.astre, a.x, p.x) - distSol(this.astre, b.x, p.x))[0];
    if (distSol(this.astre, p.x, this.xFusee) < 4 && !proche) return this.terminer('retour', `Fin de la promenade : ${this.bouquet || 0} fleurs et ${this.panier || 0} fruits pour l’équipage${this.bieres ? `, et ${this.bieres} bière${this.bieres > 1 ? 's' : ''} au bar` : ''}.`);
    if (!proche) return this.dire('Approchez-vous d’une fleur, d’un arbre fruitier ou du bar.');
    const c = this.campagne;
    if (proche.type === 'bar') {
      // Le barman sert 3 bières au plus ; au-delà, il refuse et rien n'est compté.
      if (this.bieres >= BIERES_MAX) return this.dire(`🍺 Le barman refuse : ${this.bieres} bières, ça suffit, il y a un lancement demain !`);
      this.bieres++;
      if (c) c.bieres = (c.bieres || 0) + 1;
      return this.dire(this.bieres === 1 ? '🍺 Une bière bien fraîche au Bar de l’Espace. Introuvable là-haut !'
        : this.bieres < BIERES_MAX ? `🍺 ${this.bieres}e bière… la démarche devient incertaine.`
          : `🍺 ${this.bieres}e bière, la dernière : le barman ne vous en servira plus.`);
    }
    if (proche.type === 'arbre') {
      if (proche.reste <= 0) return this.dire(`${proche.nom} : plus de fruits à portée.`);
      proche.reste--;
      this.panier = (this.panier || 0) + 1;
      if (c) c.provisions.fruits++;
      return this.dire(`Une ${proche.fruit} cueillie. Des fruits frais : le luxe absolu dans l’espace.`);
    }
    if (proche.cueillie) return this.dire('Déjà cueillie.');
    proche.cueillie = true;
    this.bouquet = (this.bouquet || 0) + 1;
    if (c) c.provisions.fleurs++;
    this.dire(`${proche.nom} cueilli${proche.nom === 'Marguerite' || proche.nom === 'Rose' || proche.nom === 'Lavande' ? 'e' : ''} pour égayer la station.`);
  }

  // Monter dans le rover ou en descendre (touche V).
  basculerRover() {
    if (!this.rover || this.fin) return;
    const p = this.p;
    if (this.enRover) {
      this.enRover = false;
      this.rover.x = p.x;
      this.dire(`Vous descendez de l’astromobile. ${this.sacRover.length} échantillon${this.sacRover.length > 1 ? 's' : ''} dans sa caisse.`);
    } else if (distSol(this.astre, p.x, this.rover.x) < 4 && p.auSol) {
      this.enRover = true;
      p.x = this.rover.x;
      this.dire('À bord de l’astromobile : jusqu’à ' + fmtV(this.vMaxRover) + ' et 20 échantillons.');
    } else this.dire('Approchez-vous de l’astromobile (à côté du module) pour monter dedans.');
  }

  // La personne qui sort : celle qui pilotait la descente (votre spationaute, ou un membre d'équipage).
  equipier() { return this.vol.equipier || equipierDescente(null); }

  // Position d'un artefact ou d'une trace, poussée hors de l'emprise d'une base (pas de superposition).
  posLibre(x) {
    for (const b of this.vol.bases || []) {
      const d = ecartSol(this.astre, x, b.x);
      if (Math.abs(d) < ZONE_BASE) return b.x + Math.sign(d || 1) * (ZONE_BASE + Math.abs(d));
    }
    return x;
  }

  genererSites() {
    const a = this.astre;
    const liste = typesEchantillons(a);
    const sites = [];
    for (let k = -40; k <= 40; k++) {
      if (k === 0 || hash2(k, 50) < 0.45) continue;
      const x0 = this.xFusee + k * 45 + (hash2(k, 51) - 0.5) * 30;
      // Pas de site d'échantillon sous une base : on le saute.
      if ((this.vol.bases || []).some((b) => distSol(this.astre, x0, b.x) < ZONE_BASE)) continue;
      const x = x0;
      const [nom, texte] = liste[Math.floor(hash2(k, 52) * liste.length)];
      sites.push({ k, x, nom, texte });
    }
    return sites;
  }

  // Hauteur d'un saut (du point d'appel au sommet), et record de saut sur cet astre.
  finSaut(h) {
    if (h < 0.02) return;
    this.dernierSaut = h;
    const rec = recordSaut(this.astre.id);
    const txt = h < 10 ? `${fmt(h, 2)} m` : fmtAlt(h);
    if (!rec || h > rec.h) {
      enregistrerSaut(this.astre.id, h, this.def.nom);
      this.dire(`🏅 Saut de ${txt} : record ${sur(this.astre)}${rec ? ` (l’ancien : ${rec.h < 10 ? fmt(rec.h, 2) + ' m' : fmtAlt(rec.h)})` : ''} !`);
    } else this.dire(`Saut de ${txt} (record ${sur(this.astre)} : ${rec.h < 10 ? fmt(rec.h, 2) + ' m' : fmtAlt(rec.h)}).`);
  }

  dejaFait(site) { const s = this.science[this.astre.id]; return !!(s && s.sites && s.sites[site.k]); }
  marquer(site) {
    const s = (this.science[this.astre.id] = this.science[this.astre.id] || { sites: {}, echantillons: 0, analyses: 0 });
    s.sites[site.k] = true;
  }
  // Les messages restent affichés en temps réel (7 s, 12 s quand le temps est accéléré ×10 et plus), 3 au plus.
  dire(m) {
    this.message = m;
    const fin = performance.now() + ((this.warp || 1) >= 10 ? 12000 : 7000);
    this.fileMessages = (this.fileMessages || []).filter((x) => x.texte !== m).concat({ texte: m, fin }).slice(-3);
  }
  messagesVisibles() {
    const t = performance.now();
    this.fileMessages = (this.fileMessages || []).filter((x) => x.fin > t);
    return this.fileMessages.map((x) => x.texte);
  }
  // Pente moyenne sous un véhicule (empattement d'environ 2,4 m).
  penteSous(x) { return Math.atan2(this.sol(x + 1.2) - this.sol(x - 1.2), 2.4); }
  sol(x) { return this.vol.sol(x); }

  step(dt, cmd) {
    if (this.fin) return;
    this.dureeSortie = (this.dureeSortie || 0) + dt;   // pour le registre (plus longue sortie)
    const p = this.p, g = this.c.g;
    this.c = conditions(this.astre, p.y);
    this.vol.t += dt;
    // Le lanceur de retour demandé à la station continue de descendre pendant la sortie.
    if (this.vol.lanceurRetour && this.vol.lanceurRetour.etat === 'descente') this.vol.descenteLanceur(dt);

    // Analyse en cours (robot)
    if (this.analyse) {
      this.analyse.t += dt;
      if (this.analyse.t >= 5) {
        const s = this.analyse.site;
        this.marquer(s);
        this.donneesEnAttente++;
        this.dire(`Analyse terminée : ${s.nom}. ${s.texte} (données à transmettre depuis ${this.moduleRobot ? 'le module robot' : 'le module'})`);
        this.analyse = null;
      }
    }

    // Déplacements (à pied, en rover ou en robot)
    const veut = (cmd.droite ? 1 : 0) - (cmd.gauche ? 1 : 0);
    if (veut) p.dir = veut;
    // Les pentes raides ralentissent ; seules les vraies falaises arrêtent (on ne peut pas les contourner en vue de côté).
    const penteMax = this.enRover ? 40 : this.def.penteMax + 10;
    // Pente dans le sens de la marche : positive en montée, négative en descente (la descente ne freine pas).
    const sens = veut || p.dir || 1;
    const devant = Math.atan2(this.sol(p.x + 1.5 * sens) - this.sol(p.x), 1.5) * 180 / Math.PI;
    const freinPente = devant > 15 ? Math.max(0.3, 1 - (devant - 15) / (penteMax - 15)) : 1;
    const vMax = (this.enRover ? this.vMaxRover : this.vMax) * freinPente;
    const acc = this.enRover ? this.accRover : this.acc;
    if (p.auSol) {
      // Après quelques bières, la démarche devient… approximative.
      const titube = this.bieres >= 2 ? Math.sin(this.vol.t * 3) * 0.4 * Math.min(1, (this.bieres - 1) / 3) : 0;
      const cible = veut * vMax * (1 + titube);
      const dv = cible - p.vx;
      p.vx += Math.sign(dv) * Math.min(Math.abs(dv), acc * dt);
      // Pente trop raide pour des roues
      // Montée trop raide (falaise) : on s'arrête. Une descente raide ne bloque jamais.
      const pente = Math.atan2(this.sol(p.x + 0.5 * Math.sign(p.vx || 1)) - this.sol(p.x), 0.5);
      if (pente * 180 / Math.PI > penteMax && Math.abs(p.vx) > 0) {
        p.vx = 0;
        if (this.type === 'robot' || this.enRover) this.dire(`Pente trop raide pour les roues ${this.enRover ? 'de l’astromobile' : 'du robot'}.`);
      }
      const nx = p.x + p.vx * dt;
      const ny = this.sol(nx);
      // Si le sol descend plus vite que la gravité ne nous y ramène, on décolle (bosses, falaises).
      if (p.y - ny > Math.max(0.05, 0.5 * g * dt * dt * 4) && p.vx !== 0) {
        p.auSol = false; p.vy = 0; p.x = nx;
      } else { p.x = nx; p.y = ny; }
      p.pas += Math.abs(p.vx) * dt;
      if (cmd.saut && this.saut > 0 && !this.enRover) {
        p.vy = this.saut; p.auSol = false;
        this.sautEnCours = { y0: p.y, max: 0 };          // on mesure la hauteur du saut
        this.poussiere(6);
      }
      if (this.type === 'spationaute' && !this.enRover && Math.abs(p.vx) > 0.05 && Math.floor(p.pas / 0.7) !== Math.floor((p.pas - Math.abs(p.vx) * dt) / 0.7)) {
        this.traces.push({ x: p.x, d: p.dir });
        if (this.traces.length > 300) this.traces.shift();
      }
      if ((this.type === 'robot' || this.enRover) && Math.abs(p.vx) > 0.05 && Math.random() < 0.3) {
        this.traces.push({ x: p.x, d: 0 });
        if (this.traces.length > 600) this.traces.shift();
        if (this.enRover && Math.random() < 0.3) this.poussiere(1);
      }
      if (this.enRover) this.rover.x = p.x;
    } else {
      p.vy -= g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (this.sautEnCours) this.sautEnCours.max = Math.max(this.sautEnCours.max, p.y - this.sautEnCours.y0);
      // Câble de sécurité : on ne s'éloigne pas à plus de 30 m de la fusée.
      if (this.cable) {
        const d = Math.hypot(ecartSol(this.astre, p.x, this.xFusee), p.y - this.sol(this.xFusee));
        if (d > 30) { p.vx *= -0.3; p.vy = Math.min(p.vy, 0) - 0.05; }
      } else if (Math.hypot(p.vx, p.vy) > this.vLib && p.y - this.sol(p.x) > 20) {
        this.terminer('perdu', `${this.def.nom} a dépassé la vitesse de libération (${fmtV(this.vLib)}) et s’est perdu${this.type === 'robot' ? '' : this.equipier().acc} dans l’espace.`);
        return;
      }
      if (p.y <= this.sol(p.x)) {
        p.y = this.sol(p.x);
        if (p.vy < -3 * Math.sqrt(g * 2) - 2) {
          this.integrite -= Math.min(60, (-p.vy - 2) * 8);
          this.dire('Réception brutale !');
        }
        p.vy = 0; p.auSol = true;
        this.poussiere(8);
        if (this.sautEnCours) { this.finSaut(this.sautEnCours.max); this.sautEnCours = null; }
      }
    }

    // Sur Terre : on respire, rien ne menace.
    if (this.terre) { this.taux = 0; return; }
    // Easter eggs et traces réelles des environs.
    verifierDecouvertes(this);

    // Réserve d'oxygène ou de batterie (le module robot recharge la batterie au soleil quand le robot est à côté)
    const effort = Math.abs(p.vx) > 0.05 ? 1 : 0.3;
    this.reserve -= dt * (this.type === 'robot' ? effort : 1);
    if (this.moduleRobot && this.presDeLaFusee()) this.reserve = Math.min(this.def.autonomie, this.reserve + dt * 20);
    if (this.reserve <= 0) {
      return this.terminer('perdu', this.type === 'robot' ? 'Batterie vide : le robot s’est arrêté pour toujours.' : `Plus d’oxygène : ${this.def.nom} n’a pas pu rentrer à temps.`);
    }

    // Dangers (dégradation progressive, comme la coque de la fusée)
    const tp = tauxDegats(this.c.p / this.def.pressionMax - 1);
    const tc = tauxDegats((this.c.t + KELVIN) / (this.def.tempMax + KELVIN) - 1);
    this.taux = tp + tc;
    this.integrite -= (tp + tc) * dt;
    if (this.type === 'robot') {
      const b = BLINDAGES_ROBOT[this.blindage];
      this.doseGy += (this.irradiation.svJour * b.facteur * dt) / 86400;
      this.dose = (100 * this.doseGy) / b.tolerance;            // part de la tolérance de l'électronique déjà encaissée
    } else {
      // Spationaute : la combinaison n'arrête presque rien ; la dose s'ajoute à celle reçue dans la fusée.
      this.doseSv += (this.irradiation.svJour * dt) / 86400;
      this.dose = (100 * this.doseSv) / DOSE_MORTELLE;
    }
    if (this.integrite <= 0) return this.terminer('perdu', tp >= tc ? `La pression (${fmtP(this.c.p)}) a écrasé ${this.type === 'robot' ? 'le robot' : 'la combinaison'}.` : `La chaleur (${fmt(this.c.t)} °C) a eu raison ${this.type === 'robot' ? 'du robot' : 'de la combinaison'}.`);
    if (this.dose >= 100) return this.terminer('perdu', `Le rayonnement a ${this.type === 'robot' ? 'grillé l’électronique du robot' : `été mortel pour ${this.def.nom}`}.`);
  }

  // Temps qu'il reste au robot avant que le rayonnement grille son électronique.
  vieRestante() {
    const b = BLINDAGES_ROBOT[this.blindage];
    const parJour = this.irradiation.svJour * b.facteur;
    if (parJour <= 0) return 'illimitée';
    const s = ((b.tolerance - this.doseGy) / parJour) * 86400;
    return s > 3650 * 86400 ? 'plus de 10 ans' : fmtDuree(Math.max(0, s));
  }

  siteProche() {
    let best = null, d0 = this.enRover ? 4 : 2.5;
    for (const s of this.sites) {
      const d = distSol(this.astre, s.x, this.p.x);
      if (d < d0) { d0 = d; best = s; }
    }
    return best;
  }
  presDeLaFusee() { return distSol(this.astre, this.p.x, this.xFusee) < (this.enRover ? 12 : 4) && this.p.auSol; }

  // Touche E : ramasser, analyser, ou rentrer.
  agir() {
    if (this.fin) return;
    if (this.terre) return this.agirTerre();
    // Robot de retour au module : recharge et envoi des données à l'orbiteur, puis il repart.
    if (this.moduleRobot && this.presDeLaFusee()) {
      const n = this.transmettre();
      this.reserve = this.def.autonomie;
      return this.dire(`Batterie rechargée par les panneaux solaires.${n ? ` ${n} analyse${n > 1 ? 's' : ''} envoyée${n > 1 ? 's' : ''} à l’orbiteur.` : ''} Échap : laisser le robot ici et revenir à l’orbiteur.`);
    }
    if (this.type === 'robot' && this.presDeLaFusee()) {
      const n = this.transmettre();
      return this.terminer('retour', n ? `Robot rentré : ${n} analyse${n > 1 ? 's' : ''} transmise${n > 1 ? 's' : ''}.` : 'Robot rentré à bord.');
    }
    if (this.presDeLaFusee() && !this.vol.robotSeul) {
      // On rentre : les échantillons du sac et du rover montent à bord de l'atterrisseur.
      const tous = [...this.sac, ...(this.rover ? this.sacRover : [])];
      const n = tous.length;
      if (n) {
        const s = (this.science[this.astre.id] = this.science[this.astre.id] || { sites: {}, echantillons: 0, analyses: 0 });
        s.echantillons += n;
        this.vol.echantillons = (this.vol.echantillons || 0) + n;
        this.recoltes = (this.recoltes || 0) + n;   // pour le registre des équipages
      }
      return this.terminer('retour', n ? `${n} échantillon${n > 1 ? 's' : ''} rangé${n > 1 ? 's' : ''} à bord de l’atterrisseur.` : 'De retour à bord.');
    }
    const site = this.siteProche();
    if (!site) return this.dire(this.rover && !this.enRover ? 'Rien ici. Suivez les repères ◆, ou prenez l’astromobile (V).' : 'Rien d’intéressant ici. Suivez les repères ◆.');
    if (this.dejaFait(site) || this.sac.some((x) => x.k === site.k) || this.sacRover.some((x) => x.k === site.k)) return this.dire(`${site.nom} : déjà étudié.`);
    if (this.type === 'robot') {
      if (!this.analyse) { this.analyse = { site, t: 0 }; this.dire(`Analyse de « ${site.nom} »…`); }
      return;
    }
    if (this.enRover) {
      if (this.sacRover.length >= 20) return this.dire('Caisse de l’astromobile pleine (20) : rentrez au module.');
      this.sacRover.push(site);
    } else {
      if (this.sac.length >= this.def.capacite) return this.dire('Sac plein (6) : rapportez les échantillons, ou prenez l’astromobile (20).');
      this.sac.push(site);
    }
    this.marquer(site);
    this.dire(`Échantillon ramassé : ${site.nom}. ${site.texte}`);
  }

  // Touche F : planter le drapeau, par le ou la spationaute ou par le robot (avec ou sans équipage, la prise
  // de possession compte). Pas sur Terre, un drapeau tous les 20 m au plus.
  planterDrapeau() {
    if (this.fin) return;
    if (this.terre) return this.dire('Sur Terre, on garde le drapeau pour les astres.');
    if (this.enRover) return this.dire('Descendez de l’astromobile (V) pour planter le drapeau.');
    const robot = this.type === 'robot';
    if (!this.p.auSol) return this.dire(robot ? 'Le robot doit être au sol pour planter le drapeau.' : 'Il faut avoir les pieds au sol pour planter le drapeau.');
    const liste = (etat.drapeaux[this.astre.id] = etat.drapeaux[this.astre.id] || []);
    if (liste.some((d) => distSol(this.astre, d.x, this.p.x) < 20)) return this.dire('Un drapeau flotte déjà ici.');
    const x = this.p.x + (robot ? 1.6 : 1.2) * (this.p.dir || 1);
    const premier = liste.length === 0;
    liste.push({ x, par: robot ? 'robot' : this.def.nom, robot, quand: etat.voyage && etat.enVoyage ? etat.voyage.t : null });
    sauver(etat);
    this.poussiere(10);
    if (robot) this.brasDrapeau = 1.5;   // le bras du robot reste sorti un instant
    const qui = robot ? 'Le robot a planté' : '';
    this.dire(premier
      ? `🚩 ${robot ? qui + ' le drapeau des Nations unies et le fanion de l’AS Nancy Lorraine' : 'Drapeau des Nations unies et fanion de l’AS Nancy Lorraine plantés'} ${sur(this.astre)} : une première${robot ? ', sans équipage' : ''} !`
      : `🚩 ${robot ? qui + ' un drapeau de plus' : 'Un drapeau de plus'} ${sur(this.astre)} (${liste.length}).`);
  }

  terminer(issue, texte) { this.fin = { issue, texte }; }

  transmettre() {
    const n = this.donneesEnAttente;
    if (n) {
      const s = (this.science[this.astre.id] = this.science[this.astre.id] || { sites: {}, echantillons: 0, analyses: 0 });
      s.analyses += n;
      this.donneesEnAttente = 0;
    }
    return n;
  }

  // Échap : le spationaute (et le rover) rentrent à la fusée avec ce qu'ils portent ; le robot s'arrête.
  agirRappel() {
    if (this.type === 'robot') {
      // Loin de sa base : le robot y retourne d'abord (son module, ou la base la plus proche) et transmet.
      // Échap de nouveau pour revenir à l'orbiteur.
      const bases = [{ x: this.xFusee, nom: 'à son module' }, ...(this.vol.bases || []).map((b) => ({ x: b.x, nom: 'à la base' }))];
      const proche = bases.reduce((m, b) => (distSol(this.astre, b.x, this.p.x) < distSol(this.astre, m.x, this.p.x) ? b : m));
      if (distSol(this.astre, proche.x, this.p.x) > 4) {
        const x = this.p.x + ecartSol(this.astre, proche.x, this.p.x) + (proche.x === this.xFusee ? 2 : 0);
        Object.assign(this.p, { x, y: this.sol(x), vx: 0, vy: 0, auSol: true });
        const n = this.transmettre();
        return this.dire(`🤖 Le robot est revenu ${proche.nom} : ${n ? `${n} analyse${n > 1 ? 's' : ''} transmise${n > 1 ? 's' : ''}` : 'rien à transmettre'}. Échap de nouveau pour revenir à l’orbiteur.`);
      }
      const pres = this.presDeLaFusee() || distSol(this.astre, proche.x, this.p.x) <= 4;
      const n = pres ? this.transmettre() : 0;
      const perdues = this.donneesEnAttente;
      if (this.moduleRobot) {
        return this.terminer('retour', `Le robot reste sur place, près de son module.${n ? ` ${n} analyse(s) transmise(s).` : ''}${perdues ? ` ${perdues} analyse(s) non transmise(s) : il faudra le ramener au module.` : ''}`);
      }
      return this.terminer('retour', `Robot rappelé à bord.${n ? ` ${n} analyse(s) transmise(s).` : ''}`);
    }
    this.p.x = this.xFusee;
    this.p.y = this.sol(this.xFusee);
    this.p.auSol = true;
    this.enRover = false;
    this.agir();
  }

  poussiere(n) {
    for (let i = 0; i < n; i++) this.fx.push({ x: this.p.x, y: this.p.y, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.2, vie: 0, max: 0.6 + Math.random() });
  }

  // ---------- Rendu ----------
  dessiner(ctx, W, H, dt) {
    const a = this.astre, p = this.p;
    const echelle = this.type === 'robot' ? 26 : 30; // px par mètre
    const yCam = p.y + 2.5;
    // Téléphone en paysage : la scène remonte pour laisser la place aux boutons du bas.
    const camY = H * (ecranPaysageTactile(W, H) ? 0.4 : 0.55);
    // Écart « autour de l'astre » : drapeaux, bases et module réapparaissent après un tour complet.
    const versEcran = (x, y) => [W / 2 + ecartSol(a, x, p.x) * echelle, camY + (yCam - y) * echelle];
    dessinerFond(ctx, a, this.c, W, H, false, tempsCiel(this.vol), this.vol);
    if (this.terre) dessinerNuages(ctx, W, H, p.x * echelle);

    // Terrain (réutilise le rendu de l'atterrissage)
    dessinerTerrain(ctx, { x: p.x, y: yCam, sol: (x) => this.sol(x), astre: a, autopilote: false }, W, H, echelle, camY);

    // Traces de pas ou de roues
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (const tr of this.traces) {
      const [sx, sy] = versEcran(tr.x, this.sol(tr.x));
      if (sx < -10 || sx > W + 10) continue;
      ctx.fillRect(sx - 3, sy - 1, 6, 2);
    }

    // Bases au sol
    for (const b of this.vol.bases || []) {
      const [bx] = versEcran(b.x, this.sol(b.x));
      if (bx > -4000 && bx < W + 4000) dessinerBase(ctx, bx, (dx) => versEcran(b.x + dx, this.sol(b.x + dx))[1], echelle, b.niveau || 1, productionBase(this.astre) > 0);
    }
    // Zone de base repérée par une sonde
    if (this.vol.site && !(this.vol.bases || []).some((b) => distSol(this.astre, b.x, this.vol.site.x) < 500)) {
      const [fx2, fy2] = versEcran(this.vol.site.x, this.sol(this.vol.site.x));
      if (fx2 > -200 && fx2 < W + 200) dessinerFanion(ctx, fx2, fy2, echelle, this.vol);
    }

    // Vénus : lanceur de retour en descente ou posé près du module
    const lr = this.vol.lanceurRetour;
    if (lr && lr.etat !== 'parti') {
      const [lx, ly] = versEcran(lr.x, lr.etat === 'pret' ? this.sol(lr.x) : lr.y);
      if (lx > -200 && lx < W + 200) dessinerLanceurRetour(ctx, lr, lx, ly, echelle);
    }
    // Drapeaux plantés
    for (const d of drapeauxSur(a.id)) {
      const [dx, dy] = versEcran(d.x, this.sol(d.x));
      if (dx > -80 && dx < W + 80) dessinerDrapeauPlante(ctx, dx, dy, echelle, ventPourDrapeau(a));
    }

    // Easter eggs et traces réelles
    if (!this.terre) dessinerDecouvertes(ctx, this, versEcran, echelle, W);

    // Promenade sur Terre : fleurs, arbres fruitiers, bar
    if (this.terre) {
      for (const s of this.sites) {
        const [sx, sy] = versEcran(s.x, this.sol(s.x));
        if (sx < -300 || sx > W + 300) continue;
        if (s.type === 'bar') dessinerBar(ctx, sx, sy, echelle);
        else if (s.type === 'arbre') dessinerArbre(ctx, sx, sy, echelle, s);
        else if (!s.cueillie) dessinerFleur(ctx, sx, sy, echelle, s);
      }
    }

    // Sites d'intérêt
    for (const s of this.terre ? [] : this.sites) {
      const [sx, sy] = versEcran(s.x, this.sol(s.x));
      if (sx < -40 || sx > W + 40) continue;
      const fait = this.dejaFait(s);
      ctx.fillStyle = fait ? 'rgba(180,180,180,0.6)' : '#ffd54f';
      ctx.beginPath(); ctx.moveTo(sx, sy - 34); ctx.lineTo(sx + 6, sy - 26); ctx.lineTo(sx, sy - 18); ctx.lineTo(sx - 6, sy - 26); ctx.fill();
      texteSurFond(ctx, s.nom + (fait ? ' ✓' : ''), sx, sy - 40, { police: '12px system-ui, sans-serif', couleur: fait ? '#cfd8dc' : '#ffffff' });
      // Petit caillou au sol
      ctx.fillStyle = fait ? '#777' : '#bcaaa4';
      ctx.beginPath(); ctx.ellipse(sx, sy - 3, 7, 4, 0, Math.PI, 0); ctx.fill();
    }

    // Fusée posée, à l'échelle (sur Terre : la maison d'où part la promenade)
    const [fx, fy] = versEcran(this.xFusee, this.sol(this.xFusee));
    if (this.terre) dessinerMaison(ctx, fx, fy, echelle);
    else if (this.moduleRobot) {
      dessinerModuleRobot(ctx, fx, fy, echelle, this.presDeLaFusee());
      // Drone arrimé, posé à côté du module tant qu'il n'a pas décollé (H).
      if (this.vol.droneEmbarque && !this.droneParti) {
        const xd = this.xFusee - 2.2, [dx, dy] = versEcran(xd, this.sol(xd));
        dessinerDrone(ctx, { angle: 0, throttle: 0, t: 0 }, dx, dy, (echelle * HAUTEUR_MODULE) / 3);
      }
    }
    else dessinerFusee(ctx, { f: this.vol.f, angle: this.vol.angle, throttle: 0, temp: this.vol.temp, integrite: this.vol.integrite, degats: this.vol.degats, taux: { pression: 0, chaleur: 0 }, enDegats: () => false }, fx, fy, HAUTEUR_MODULE * echelle);

    // Rover garé
    if (this.rover && !this.enRover) {
      const [rx, ry] = versEcran(this.rover.x, this.sol(this.rover.x));
      dessinerRover(ctx, rx, ry, echelle, { dir: this.rover.dir, pas: this.rover.pas }, false, this.penteSous(this.rover.x));
    }

    // Câble de sécurité
    if (this.cable) {
      const [px, py] = versEcran(p.x, p.y + 1.1);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx, fy - 2 * echelle); ctx.quadraticCurveTo((fx + px) / 2, Math.max(fy, py) + 20, px, py); ctx.stroke();
    }

    // Poussière
    this.fx = this.fx.filter((q) => (q.vie += dt) < q.max);
    for (const q of this.fx) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy -= this.c.g * dt;
      const [sx, sy] = versEcran(q.x, q.y);
      ctx.fillStyle = `rgba(200,190,170,${0.6 * (1 - q.vie / q.max)})`;
      ctx.fillRect(sx, sy, 3, 3);
    }

    // Explorateur
    const [sx, sy] = versEcran(p.x, p.y);
    // Les véhicules suivent la pente (en l'air, ils gardent leur dernière inclinaison).
    if (p.auSol) this.inclinaison = this.penteSous(p.x);
    if (this.enRover) dessinerRover(ctx, sx, sy, echelle, p, true, this.inclinaison || 0);
    else if (this.type === 'spationaute') dessinerSpationaute(ctx, sx, sy, echelle, p, this.terre, this.equipier().profil);
    else {
      // Le bras sort pendant une analyse, ou un instant après avoir planté le drapeau.
      if (this.brasDrapeau > 0) this.brasDrapeau -= dt;
      dessinerRobot(ctx, sx, sy, echelle, p, this.analyse || this.brasDrapeau > 0, this.inclinaison || 0);
    }

    if (this.terre) this.dessinerHudTerre(ctx, W, H);
    else this.dessinerHud(ctx, W, H);
    const compact = ecranCompact(W, H);
    const texteTemps = `Temps ×${this.warp}${this.warp > 1 ? ` (1 s = ${this.warp} s)` : ''}${ECRAN_TACTILE ? '' : '  (+/−)'}`;
    const policeTemps = compact ? 'bold 12px system-ui' : 'bold 14px system-ui', yTemps = compact ? 58 : 28;
    texteSurFond(ctx, texteTemps, W - 14, yTemps, { police: policeTemps, couleur: this.warp > 1 ? '#ffca28' : '#ffffff', align: 'right' });
    ctx.font = policeTemps;
    dessinerBoutonsTemps(ctx, W - 14 - ctx.measureText(texteTemps).width - 14, yTemps);
  }

  dessinerHudTerre(ctx, W, H) {
    const compact = ecranCompact(W, H);
    const y0 = compact ? 44 : 8;
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(8, y0, compact ? 190 : 300, compact ? 80 : 104);
    ctx.font = compact ? 'bold 13px system-ui' : 'bold 15px system-ui'; ctx.fillStyle = '#fff';
    ctx.fillText('Promenade sur Terre', 16, y0 + (compact ? 18 : 22));
    ctx.font = compact ? '12px system-ui' : '13px system-ui';
    const pasL = compact ? 18 : 20, yl = y0 + (compact ? 38 : 46);
    ctx.fillText(`🌸 Fleurs : ${this.bouquet || 0}`, 16, yl);
    ctx.fillText(`🍎 Fruits : ${this.panier || 0}`, 16, yl + pasL);
    ctx.fillText(`🍺 Bières au bar : ${this.bieres}`, 16, yl + 2 * pasL);
    const proche = this.sites.filter((s) => s.type === 'bar' || (s.type === 'arbre' && s.reste > 0) || (s.type === 'fleur' && !s.cueillie))
      .reduce((m, x) => (!m || distSol(this.astre, x.x, this.p.x) < distSol(this.astre, m.x, this.p.x) ? x : m), null);
    if (proche) {
      const dx = ecartSol(this.astre, proche.x, this.p.x);
      texteSurFond(ctx, `${dx < 0 ? '◀' : '▶'} ${proche.nom} à ${fmt(Math.abs(dx))} m`, W / 2, 30, { police: 'bold 14px system-ui', couleur: '#ffd54f' });
    }
    afficherMessages(ctx, this.messagesVisibles(), W, yMessagesExplo(W, H));
    if (!ECRAN_TACTILE) {
      texteSurFond(ctx, '←→ / Q D : marcher · ↑ / Z / Espace : sauter · E : cueillir, boire une bière, ou rentrer à la maison · Échap : rentrer', W / 2, H - 12, { police: '12px system-ui' });
    }
    ctx.textAlign = 'left';
  }

  dessinerHud(ctx, W, H) {
    const d = this.def, a = this.astre, c = this.c;
    const compact = ecranCompact(W, H);
    const sc = this.science[a.id] || { echantillons: 0, analyses: 0, sites: {} };
    const fr = this.reserve / d.autonomie;
    if (compact) {
      // Petit écran : l'essentiel, et les limites seulement si elles approchent.
      const l = [];
      l.push([d.ressource, fmtDuree(this.reserve), fr < 0.2 ? '#ef5350' : '#66bb6a']);
      l.push([this.type === 'robot' ? 'Robot' : 'Combi.', fmt(this.integrite) + ' %', this.integrite > 60 ? '#66bb6a' : this.integrite > 30 ? '#ffca28' : '#ef5350']);
      l.push([this.type === 'robot' ? 'Analyses' : 'Sac', this.type === 'robot' ? `${sc.analyses} (+${this.donneesEnAttente})` : `${this.sac.length}/${d.capacite}` + (this.rover ? ` · astromobile ${this.sacRover.length}/20` : ''), this.donneesEnAttente ? '#ffca28' : '#fff']);
      l.push(['Module', fmt(distSol(this.astre, this.p.x, this.xFusee)) + ' m', '#fff']);
      const rp = c.p / d.pressionMax, rt = (c.t + KELVIN) / (d.tempMax + KELVIN), rr = this.type === 'robot' ? 0 : this.irradiation.svJour / DOSE_MORTELLE;
      if (rp > 0.6) l.push(['Pression', fmtP(c.p), couleurRisque(rp)]);
      if (rt > 0.7) l.push(['Temp.', fmt(c.t) + ' °C', couleurRisque(rt)]);
      if (this.type === 'robot') l.push(['Électron.', `${fmt(Math.max(0, 100 - this.dose))} % · ${this.vieRestante()}`, couleurRisque(this.dose / 100)]);
      else if (rr > 0.25 || this.dose > 20) l.push(['Dose', `${fmtDoseTotale(this.doseSv)} · ${fmt(this.dose)} %`, couleurRisque(Math.max(rr, this.dose / 100))]);
      const larg = Math.min(190, W * 0.52), y0 = 44;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(6, y0, larg, 26 + l.length * 16);
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(majuscule(`${d.nom} · ${a.nom}`), 12, y0 + 16);
      let yy = y0 + 34;
      for (const [k, v, coul] of l) {
        ctx.font = '11px system-ui'; ctx.fillStyle = '#b0bec5'; ctx.fillText(k, 12, yy);
        ctx.font = 'bold 12px ui-monospace, Consolas, monospace'; ctx.fillStyle = coul; ctx.fillText(v, 74, yy);
        yy += 16;
      }
    } else {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, 290, 272);
    let y = 28;
    const ligne = (k, v, coul = '#fff') => {
      ctx.font = '12px system-ui'; ctx.fillStyle = '#b0bec5'; ctx.fillText(k, 16, y);
      ctx.font = 'bold 13px ui-monospace, Consolas, monospace'; ctx.fillStyle = coul; ctx.fillText(v, 140, y);
      y += 18;
    };
    ctx.font = 'bold 15px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(majuscule(`${d.nom} ${sur(a)}`), 16, y); y += 24;
    ligne(d.ressource, fmtDuree(this.reserve), fr < 0.2 ? '#ef5350' : '#66bb6a');
    ligne(this.type === 'robot' ? 'État du robot' : 'Combinaison', fmt(this.integrite) + ' %', this.integrite > 60 ? '#66bb6a' : this.integrite > 30 ? '#ffca28' : '#ef5350');
    ligne('Pression', fmtP(c.p) + ' / ' + fmt(d.pressionMax, 1), couleurRisque(c.p / d.pressionMax));
    ligne('Température', fmt(c.t) + ' / ' + fmt(d.tempMax) + ' °C', couleurRisque((c.t + KELVIN) / (d.tempMax + KELVIN)));
    if (this.type === 'robot') {
      ligne('Rayonnement', fmtDose(this.irradiation.svJour), couleurRisque(this.dose / 100));
      ligne('Blindage', BLINDAGES_ROBOT[this.blindage].nom);
      ligne('Électronique', `${fmt(Math.max(0, 100 - this.dose))} % · ${this.vieRestante()}`, couleurRisque(this.dose / 100));
    } else {
      ligne('Rayonnement', fmtDose(this.irradiation.svJour), couleurRisque(this.irradiation.svJour / DOSE_MORTELLE));
      ligne('Dose reçue', `${fmtDoseTotale(this.doseSv || 0)} · ${fmt(this.dose)} %`, couleurRisque(this.dose / 100));
    }
    ligne('Gravité', fmtG(c.g));
    ligne('Libération', fmtV(this.vLib));
    if (this.type === 'spationaute') {
      const rec = recordSaut(a.id);
      const enl = this.sautEnCours ? this.sautEnCours.max : this.dernierSaut;
      if (enl || rec) ligne('Saut (record)', `${enl ? fmt(enl, 2) + ' m' : '—'} (${rec ? fmt(rec.h, 2) + ' m' : '—'})`, this.sautEnCours ? '#ffca28' : '#fff');
    }
    ligne(this.type === 'robot' ? 'Analyses' : 'Sac', this.type === 'robot' ? `${sc.analyses} envoyées, ${this.donneesEnAttente} en mémoire` : `${this.sac.length} / ${d.capacite}` + (this.rover ? `  astromobile ${this.sacRover.length} / 20` : ''), this.donneesEnAttente ? '#ffca28' : '#fff');
    ligne('Sites étudiés ici', String(Object.keys(sc.sites || {}).length));
    ligne('Distance module', fmt(distSol(this.astre, this.p.x, this.xFusee)) + ' m');
    }

    // Site le plus proche non étudié
    const libres = this.sites.filter((s) => !this.dejaFait(s));
    if (libres.length) {
      const s = libres.reduce((m, x) => (distSol(this.astre, x.x, this.p.x) < distSol(this.astre, m.x, this.p.x) ? x : m));
      const dx = ecartSol(this.astre, s.x, this.p.x);
      texteSurFond(ctx, `${dx < 0 ? '◀' : '▶'} ${s.nom} à ${fmt(Math.abs(dx))} m`, W / 2, 30, { police: 'bold 14px system-ui', couleur: '#ffd54f' });
    }
    if (this.analyse) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 100, 44, 200, 14);
      ctx.fillStyle = '#4fc3f7'; ctx.fillRect(W / 2 - 100, 44, 200 * (this.analyse.t / 5), 14);
    }
    afficherMessages(ctx, this.messagesVisibles(), W, yMessagesExplo(W, H));
    if (this.taux > 0) {
      ctx.font = compact ? 'bold 14px system-ui' : 'bold 18px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = Math.sin(performance.now() / 150) > 0 ? '#ff1744' : '#fff';
      ctx.fillText(this.type === 'robot' ? 'LIMITES DU ROBOT DÉPASSÉES' : 'COMBINAISON EN DANGER', W / 2, compact ? H * 0.32 : 80);
      ctx.textAlign = 'left';
    }
    if (!ECRAN_TACTILE) {
      texteSurFond(ctx, `←→ / Q D : ${this.type === 'robot' || this.enRover ? 'rouler' : 'marcher'}${this.saut && !this.enRover ? ' · ↑ / Z / Espace : sauter' : ''}${this.rover ? ` · V : ${this.enRover ? 'descendre de' : 'monter dans'} l’astromobile` : ''} · E : ${this.type === 'robot' ? 'analyser' : 'ramasser'} (ou rentrer près du module) · F : planter le drapeau · Échap : rappeler`, W / 2, H - 12, { police: '12px system-ui' });
    }
    ctx.textAlign = 'left';
  }
}

// Module robot : petite base posée avec le robot. Panneaux solaires pour recharger, antenne vers l'orbiteur.
function dessinerModuleRobot(ctx, x, y, s, actif) {
  ctx.save();
  ctx.translate(x, y);
  // Pieds
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = Math.max(1.5, 0.08 * s);
  ctx.beginPath(); ctx.moveTo(-0.9 * s, -0.7 * s); ctx.lineTo(-1.4 * s, 0); ctx.moveTo(0.9 * s, -0.7 * s); ctx.lineTo(1.4 * s, 0); ctx.stroke();
  ctx.fillStyle = '#78909c'; ctx.fillRect(-1.6 * s, -0.08 * s, 0.4 * s, 0.08 * s); ctx.fillRect(1.2 * s, -0.08 * s, 0.4 * s, 0.08 * s);
  // Corps (feuille dorée isolante)
  ctx.fillStyle = '#d4a017'; ctx.fillRect(-1 * s, -1.4 * s, 2 * s, 0.75 * s);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-1 * s + i * 0.5 * s, -1.4 * s); ctx.lineTo(-1 * s + i * 0.5 * s, -0.65 * s); ctx.stroke(); }
  // Panneaux solaires déployés
  ctx.fillStyle = '#1e4fa8'; ctx.strokeStyle = '#9ec3ff';
  ctx.fillRect(-3.2 * s, -1.35 * s, 2.1 * s, 0.5 * s); ctx.strokeRect(-3.2 * s, -1.35 * s, 2.1 * s, 0.5 * s);
  ctx.fillRect(1.1 * s, -1.35 * s, 2.1 * s, 0.5 * s); ctx.strokeRect(1.1 * s, -1.35 * s, 2.1 * s, 0.5 * s);
  // Antenne parabolique vers l'orbiteur
  ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = Math.max(1, 0.05 * s);
  ctx.beginPath(); ctx.moveTo(0.3 * s, -1.4 * s); ctx.lineTo(0.3 * s, -2.1 * s); ctx.stroke();
  ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.ellipse(0.45 * s, -2.25 * s, 0.45 * s, 0.2 * s, -0.6, 0, Math.PI * 2); ctx.fill();
  if (actif && Math.sin(performance.now() / 200) > 0) {
    ctx.strokeStyle = 'rgba(79,195,247,0.8)';
    for (let r = 1; r <= 3; r++) { ctx.beginPath(); ctx.arc(0.6 * s, -2.4 * s, r * 0.35 * s, -1.6, -0.4); ctx.stroke(); }
  }
  texteSurFond(ctx, actif ? 'Module robot — recharge et liaison' : 'Module robot (E à côté : recharger, envoyer les données)', 0, -2.9 * s, { police: '12px system-ui' });
  ctx.textAlign = 'left';
  ctx.restore();
}

// ---------- Décor de la promenade sur Terre ----------
function dessinerArbre(ctx, x, y, s, a) {
  const coul = { pomme: '#e53935', cerise: '#b71c1c', orange: '#fb8c00', prune: '#6a1b9a', abricot: '#ffa726' }[a.fruit] || '#e53935';
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - 0.25 * s, y - 3 * s, 0.5 * s, 3 * s);
  ctx.fillStyle = '#388e3c';
  ctx.beginPath(); ctx.arc(x, y - 4 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 1.3 * s, y - 3.3 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 1.3 * s, y - 3.4 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = coul;
  const pos = [[-1, -4.5], [0.8, -3.6], [-0.2, -2.9], [1.5, -4.4], [-1.6, -3.3]];
  for (let i = 0; i < a.reste + 2 && i < pos.length; i++) { ctx.beginPath(); ctx.arc(x + pos[i][0] * s, y + pos[i][1] * s, 0.22 * s, 0, Math.PI * 2); ctx.fill(); }
  texteSurFond(ctx, a.nom, x, y - 6.4 * s, { police: '12px system-ui' });
}
function dessinerFleur(ctx, x, y, s, f) {
  const coul = { Coquelicot: '#e53935', Marguerite: '#ffffff', Tournesol: '#fdd835', Lavande: '#9575cd', Bleuet: '#1e88e5', Rose: '#ec407a' }[f.nom] || '#fff';
  const h = (f.nom === 'Tournesol' ? 1.4 : 0.5) * s;
  ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
  ctx.fillStyle = coul;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 0.12 * s, y - h + Math.sin(a) * 0.12 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = f.nom === 'Tournesol' ? '#5d4037' : '#ffd54f';
  ctx.beginPath(); ctx.arc(x, y - h, 0.07 * s, 0, Math.PI * 2); ctx.fill();
}
function dessinerBar(ctx, x, y, s) {
  ctx.fillStyle = '#8d6e63'; ctx.fillRect(x - 5 * s, y - 4 * s, 10 * s, 4 * s);
  ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.moveTo(x - 5.6 * s, y - 4 * s); ctx.lineTo(x, y - 6 * s); ctx.lineTo(x + 5.6 * s, y - 4 * s); ctx.fill();
  ctx.fillStyle = '#ffe082'; ctx.fillRect(x - 3.8 * s, y - 3.2 * s, 2.2 * s, 1.5 * s); ctx.fillRect(x + 1.6 * s, y - 3.2 * s, 2.2 * s, 1.5 * s);
  ctx.fillStyle = '#4e342e'; ctx.fillRect(x - 0.7 * s, y - 2.4 * s, 1.4 * s, 2.4 * s);
  ctx.fillStyle = '#1b5e20'; ctx.fillRect(x - 3 * s, y - 5.2 * s, 6 * s, 0.9 * s);
  texteSurFond(ctx, '🍺 Bar de l’Espace', x, y - 4.55 * s, { police: `bold ${Math.max(11, 0.55 * s)}px system-ui` });
}
function dessinerMaison(ctx, x, y, s) {
  ctx.fillStyle = '#eceff1'; ctx.fillRect(x - 3 * s, y - 3 * s, 6 * s, 3 * s);
  ctx.fillStyle = '#c62828'; ctx.beginPath(); ctx.moveTo(x - 3.5 * s, y - 3 * s); ctx.lineTo(x, y - 5 * s); ctx.lineTo(x + 3.5 * s, y - 3 * s); ctx.fill();
  ctx.fillStyle = '#4fc3f7'; ctx.fillRect(x - 2.2 * s, y - 2.3 * s, 1.2 * s, 1 * s);
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(x + 0.8 * s, y - 2 * s, 1 * s, 2 * s);
  texteSurFond(ctx, 'Maison (E pour rentrer)', x, y - 5.4 * s, { police: '12px system-ui' });
}
function dessinerNuages(ctx, W, H, decalage) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 6; i++) {
    const x = ((i * 260 - decalage * 0.3) % (W + 300) + W + 300) % (W + 300) - 150;
    const y = 40 + (i % 3) * 45;
    for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 22], [52, 2, 20], [-24, 4, 18]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill(); }
  }
}

// Rover lunaire (inspiré du rover d'Apollo), avec le spationaute assis s'il est à bord.
// inclinaison : angle de la pente (rad, positif quand le sol monte vers la droite) ; le véhicule reste parallèle au sol.
function dessinerRover(ctx, x, y, s, p, aBord, inclinaison = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-inclinaison);
  if (aBord) dessinerSpationaute(ctx, -0.2 * s * (p.dir || 1), -0.8 * s, s * 0.8, { dir: p.dir, pas: 0 });
  ctx.scale(p.dir || 1, 1);
  const rot = (p.pas || 0) * 2.5;
  for (const wx of [-1.1, 1.1]) {
    ctx.fillStyle = '#37474f';
    ctx.beginPath(); ctx.arc(wx * s, -0.4 * s, 0.4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wx * s, -0.4 * s); ctx.lineTo(wx * s + Math.cos(rot) * 0.35 * s, -0.4 * s + Math.sin(rot) * 0.35 * s); ctx.stroke();
  }
  // Châssis, garde-boue, sièges, antenne parabolique
  ctx.fillStyle = '#cfd8dc'; ctx.fillRect(-1.5 * s, -0.95 * s, 3 * s, 0.25 * s);
  ctx.fillStyle = '#ffb300'; ctx.fillRect(-1.5 * s, -0.95 * s, 0.6 * s, 0.12 * s); ctx.fillRect(0.9 * s, -0.95 * s, 0.6 * s, 0.12 * s);
  ctx.fillStyle = '#90a4ae'; ctx.fillRect(-0.6 * s, -1.4 * s, 0.15 * s, 0.45 * s); ctx.fillRect(0.2 * s, -1.4 * s, 0.15 * s, 0.45 * s);
  ctx.fillStyle = '#795548'; ctx.fillRect(-1.4 * s, -1.25 * s, 0.6 * s, 0.3 * s); // caisse à échantillons
  ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(1.2 * s, -0.95 * s); ctx.lineTo(1.2 * s, -1.9 * s); ctx.stroke();
  ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(1.2 * s, -2 * s, 0.3 * s, Math.PI * 0.9, Math.PI * 2.1); ctx.fill();
  ctx.restore();
}

// dessinerSpationaute : voir equipage.js (tenue, carnation, exosquelette).

// Bar de l'Espace : nombre de bières que le barman accepte de servir.
const BIERES_MAX = 3;

// Hauteur des messages : au-dessus des boutons tactiles (en bas en portrait).
function yMessagesExplo(W, H) { return ECRAN_TACTILE ? H - (H > W ? 210 : 70) : H - 46; }

function dessinerRobot(ctx, x, y, s, p, analyse, inclinaison = 0) {
  const L = 1.6 * s, h = 1.3 * s;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-inclinaison);
  ctx.scale(p.dir, 1);
  // Roues
  ctx.fillStyle = '#37474f';
  const rot = p.pas * 3;
  for (const wx of [-0.4, 0, 0.4]) {
    ctx.beginPath(); ctx.arc(wx * L, -0.12 * s, 0.13 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(wx * L, -0.12 * s); ctx.lineTo(wx * L + Math.cos(rot) * 0.12 * s, -0.12 * s + Math.sin(rot) * 0.12 * s); ctx.stroke();
  }
  // Châssis
  ctx.fillStyle = '#eceff1'; ctx.fillRect(-0.5 * L, -0.5 * s, L, 0.28 * s);
  ctx.fillStyle = '#2f6fd6'; ctx.fillRect(-0.55 * L, -0.56 * s, 1.1 * L, 0.06 * s);
  // Mât et caméra
  ctx.fillStyle = '#b0bec5'; ctx.fillRect(0.3 * L, -h, 0.05 * s, h - 0.5 * s);
  ctx.fillStyle = '#455a64'; ctx.fillRect(0.25 * L, -h - 0.12 * s, 0.25 * s, 0.14 * s);
  ctx.fillStyle = analyse ? (Math.sin(performance.now() / 80) > 0 ? '#ff1744' : '#4fc3f7') : '#4fc3f7';
  ctx.beginPath(); ctx.arc(0.25 * L + 0.2 * s, -h - 0.05 * s, 0.03 * s, 0, Math.PI * 2); ctx.fill();
  // Bras d'analyse
  if (analyse) {
    ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0.5 * L, -0.4 * s); ctx.lineTo(0.75 * L, -0.15 * s); ctx.stroke();
    ctx.fillStyle = 'rgba(79,195,247,0.5)'; ctx.beginPath(); ctx.arc(0.78 * L, -0.08 * s, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
