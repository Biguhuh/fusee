'use strict';
// Exploration de la surface en vue de côté, par un spationaute ou un robot.
// La gravité locale change tout : sauts immenses sur les petites lunes, démarche lourde sur Terre.

const EXPLORATEURS = {
  spationaute: {
    nom: 'Spationaute', hauteur: 1.8, autonomie: 900, ressource: 'Oxygène',
    pressionMax: 1.2, tempMax: 120, tempMin: -270, protection: 3, capacite: 6, penteMax: 35,
  },
  robot: {
    nom: 'Robot', hauteur: 1.3, autonomie: 1800, ressource: 'Batterie',
    pressionMax: 100, tempMax: 480, tempMin: -273, protection: 60, capacite: Infinity, penteMax: 25,
  },
};

// Ce qu'on peut trouver, selon l'astre.
const SITES_PAR_ASTRE = {
  terre: [['Roche granitique', 'Roche continentale riche en quartz.'], ['Plante', 'De la vie ! Photosynthèse à base de chlorophylle.'], ['Fossile', 'Coquillage pétrifié vieux de 200 millions d’années.'], ['Minéral', 'Cristal de feldspath.']],
  lune: [['Régolithe', 'Poussière fine produite par 4 milliards d’années d’impacts.'], ['Basalte des mers', 'Lave refroidie il y a 3,5 milliards d’années.'], ['Anorthosite', 'Roche claire des hauts plateaux, la croûte primitive.'], ['Billes de verre', 'Gouttelettes de verre volcanique orangé.']],
  mars: [['Poussière rouge', 'Oxydes de fer : la rouille qui colore Mars.'], ['Ancien lit de rivière', 'Galets arrondis : de l’eau a coulé ici.'], ['Basalte', 'Roche volcanique sombre.'], ['Glace enfouie', 'Glace d’eau sous quelques centimètres de sol.']],
  venus: [['Basalte', 'Lave figée, surface de moins de 500 millions d’années.'], ['Coulée de lave', 'Plaine volcanique.'], ['Croûte de soufre', 'Dépôts de composés soufrés.']],
  mercure: [['Régolithe', 'Sol sombre riche en graphite.'], ['Cratère', 'Impact ancien.'], ['Glace polaire', 'Glace d’eau cachée à l’ombre des cratères polaires.']],
  io: [['Soufre', 'Soufre jaune déposé par les volcans.'], ['Coulée de lave', 'Lave de silicates très chaude.'], ['Évent volcanique', 'Panache de dioxyde de soufre.']],
  europe: [['Glace salée', 'Glace teintée de sels venus de l’océan profond.'], ['Fissure de la banquise', 'Rift où la glace s’ouvre et se referme.'], ['Sels marins', 'Chlorure de sodium : l’océan remonte ici.']],
  titan: [['Sable organique', 'Grains d’hydrocarbures façonnés en dunes.'], ['Lac de méthane', 'Méthane et éthane liquides à −179 °C.'], ['Galet de glace', 'Glace d’eau dure comme la roche, arrondie par des rivières de méthane.']],
  triton: [['Glace d’azote', 'Glace rose-blanche d’azote gelé.'], ['Geyser d’azote', 'Panache sombre qui monte à 8 km.']],
  pluton: [['Glace d’azote', 'Plaine glacée qui se renouvelle par convection.'], ['Glace d’eau', 'Montagnes de glace d’eau dure comme du granite.'], ['Tholins', 'Molécules organiques rougeâtres.']],
  l602: [['Neige des geysers', 'Grains de glace retombés des panaches.'], ['Rayure de tigre', 'Fissure chaude d’où jaillissent les geysers.']],
};
const SITES_GLACE = [['Glace d’eau', 'Glace vieille de plusieurs milliards d’années.'], ['Givre', 'Fine couche de givre.'], ['Cratère', 'Impact dans la glace.'], ['Roche', 'Inclusions rocheuses.']];
const SITES_ROCHE = [['Roche', 'Roche primitive.'], ['Régolithe', 'Poussière d’impacts.'], ['Météorite', 'Fragment métallique tombé du ciel.'], ['Cratère', 'Impact récent.']];
const SITES_ASTEROIDE = [['Roche carbonée', 'Matière primitive du système solaire.'], ['Métal', 'Fer et nickel.'], ['Régolithe', 'Poussière très fine.']];

class Exploration {
  constructor(vol, type, science) {
    this.vol = vol;
    this.astre = vol.astre;
    this.type = type;
    this.def = EXPLORATEURS[type];
    this.science = science;         // { [astreId]: { sites: {k: true}, echantillons } }
    this.xFusee = vol.x;
    const x = vol.x + 4;
    this.p = { x, y: vol.sol(x), vx: 0, vy: 0, auSol: true, dir: 1, pas: 0 };
    this.reserve = this.def.autonomie;
    this.integrite = 100;
    this.dose = 0;
    this.sac = [];
    this.analyse = null;
    this.fin = null;
    this.message = '';
    this.tMessage = 0;
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
    if (this.cable) this.dire(`Gravité minuscule (libération à ${fmtV(this.vLib)}) : le spationaute reste attaché par un câble.`);
    this.sites = this.genererSites();
  }

  genererSites() {
    const a = this.astre;
    let liste = SITES_PAR_ASTRE[a.id];
    if (!liste) liste = a.asteroide ? SITES_ASTEROIDE : a.tempSurface < -120 ? SITES_GLACE : SITES_ROCHE;
    const sites = [];
    for (let k = -40; k <= 40; k++) {
      if (k === 0 || hash2(k, 50) < 0.45) continue;
      const x = this.xFusee + k * 45 + (hash2(k, 51) - 0.5) * 30;
      const [nom, texte] = liste[Math.floor(hash2(k, 52) * liste.length)];
      sites.push({ k, x, nom, texte });
    }
    return sites;
  }

  dejaFait(site) { const s = this.science[this.astre.id]; return !!(s && s.sites && s.sites[site.k]); }
  marquer(site) {
    const s = (this.science[this.astre.id] = this.science[this.astre.id] || { sites: {}, echantillons: 0, analyses: 0 });
    s.sites[site.k] = true;
  }
  dire(m) { this.message = m; this.tMessage = 6; }
  sol(x) { return this.vol.sol(x); }

  step(dt, cmd) {
    if (this.fin) return;
    const p = this.p, g = this.c.g;
    this.c = conditions(this.astre, p.y);
    this.vol.t += dt;
    if (this.tMessage > 0) this.tMessage -= dt;

    // Analyse en cours (robot)
    if (this.analyse) {
      this.analyse.t += dt;
      if (this.analyse.t >= 5) {
        const s = this.analyse.site;
        this.marquer(s);
        this.science[this.astre.id].analyses++;
        this.dire(`Analyse terminée : ${s.nom}. ${s.texte}`);
        this.analyse = null;
      }
    }

    // Déplacements
    const veut = (cmd.droite ? 1 : 0) - (cmd.gauche ? 1 : 0);
    if (veut) p.dir = veut;
    if (p.auSol) {
      const cible = veut * this.vMax;
      const dv = cible - p.vx;
      p.vx += Math.sign(dv) * Math.min(Math.abs(dv), this.acc * dt);
      // Pente trop raide pour le robot
      const pente = Math.atan2(this.sol(p.x + 0.5 * Math.sign(p.vx || 1)) - this.sol(p.x), 0.5) * Math.sign(p.vx || 1);
      if (pente * 180 / Math.PI > this.def.penteMax && Math.abs(p.vx) > 0) {
        p.vx = 0;
        if (this.type === 'robot') this.dire('Pente trop raide pour les roues du robot.');
      }
      const nx = p.x + p.vx * dt;
      const ny = this.sol(nx);
      // Si le sol descend plus vite que la gravité ne nous y ramène, on décolle (bosses, falaises).
      if (p.y - ny > Math.max(0.05, 0.5 * g * dt * dt * 4) && p.vx !== 0) {
        p.auSol = false; p.vy = 0; p.x = nx;
      } else { p.x = nx; p.y = ny; }
      p.pas += Math.abs(p.vx) * dt;
      if (cmd.saut && this.saut > 0) {
        p.vy = this.saut; p.auSol = false;
        this.poussiere(6);
      }
      if (this.type === 'spationaute' && Math.abs(p.vx) > 0.05 && Math.floor(p.pas / 0.7) !== Math.floor((p.pas - Math.abs(p.vx) * dt) / 0.7)) {
        this.traces.push({ x: p.x, d: p.dir });
        if (this.traces.length > 300) this.traces.shift();
      }
      if (this.type === 'robot' && Math.abs(p.vx) > 0.05 && Math.random() < 0.3) this.traces.push({ x: p.x, d: 0 });
    } else {
      p.vy -= g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // Câble de sécurité : on ne s'éloigne pas à plus de 30 m de la fusée.
      if (this.cable) {
        const d = Math.hypot(p.x - this.xFusee, p.y - this.sol(this.xFusee));
        if (d > 30) { p.vx *= -0.3; p.vy = Math.min(p.vy, 0) - 0.05; }
      } else if (Math.hypot(p.vx, p.vy) > this.vLib && p.y - this.sol(p.x) > 20) {
        this.terminer('perdu', `${this.def.nom} a dépassé la vitesse de libération (${fmtV(this.vLib)}) et s’est perdu dans l’espace.`);
        return;
      }
      if (p.y <= this.sol(p.x)) {
        p.y = this.sol(p.x);
        if (p.vy < -3 * Math.sqrt(g * 2) - 2) {
          this.integrite -= Math.min(60, (-p.vy - 2) * 8);
          this.dire('Réception brutale !');
        }
        p.vy = 0; p.auSol = true;
        this.poussiere(8);
      }
    }

    // Réserve d'oxygène ou de batterie
    const effort = Math.abs(p.vx) > 0.05 ? 1 : 0.3;
    this.reserve -= dt * (this.type === 'robot' ? effort : 1);
    if (this.reserve <= 0) {
      return this.terminer('perdu', this.type === 'robot' ? 'Batterie vide : le robot s’est arrêté pour toujours.' : 'Plus d’oxygène : le spationaute n’a pas pu rentrer à temps.');
    }

    // Dangers (dégradation progressive, comme la coque de la fusée)
    const tp = tauxDegats(this.c.p / this.def.pressionMax - 1);
    const tc = tauxDegats((this.c.t + KELVIN) / (this.def.tempMax + KELVIN) - 1);
    this.taux = tp + tc;
    this.integrite -= (tp + tc) * dt;
    if (this.c.rad > this.def.protection) this.dose += (this.c.rad / this.def.protection - 1) * 5 * dt;
    if (this.integrite <= 0) return this.terminer('perdu', tp >= tc ? `La pression (${fmtP(this.c.p)}) a écrasé ${this.type === 'robot' ? 'le robot' : 'la combinaison'}.` : `La chaleur (${fmt(this.c.t)} °C) a eu raison ${this.type === 'robot' ? 'du robot' : 'de la combinaison'}.`);
    if (this.dose >= 100) return this.terminer('perdu', `Le rayonnement a ${this.type === 'robot' ? 'grillé l’électronique du robot' : 'été mortel pour le spationaute'}.`);
  }

  siteProche() {
    let best = null, d0 = 2.5;
    for (const s of this.sites) {
      const d = Math.abs(s.x - this.p.x);
      if (d < d0) { d0 = d; best = s; }
    }
    return best;
  }
  presDeLaFusee() { return Math.abs(this.p.x - this.xFusee) < 4 && this.p.auSol; }

  // Touche E : ramasser, analyser, ou rentrer.
  agir() {
    if (this.fin) return;
    if (this.presDeLaFusee()) {
      const n = this.sac.length;
      if (n) {
        const s = (this.science[this.astre.id] = this.science[this.astre.id] || { sites: {}, echantillons: 0, analyses: 0 });
        s.echantillons += n;
      }
      return this.terminer('retour', n ? `${n} échantillon${n > 1 ? 's' : ''} rapporté${n > 1 ? 's' : ''} à bord.` : 'De retour à bord.');
    }
    const site = this.siteProche();
    if (!site) return this.dire('Rien d’intéressant ici. Suivez les repères ◆.');
    if (this.dejaFait(site) || this.sac.some((x) => x.k === site.k)) return this.dire(`${site.nom} : déjà étudié.`);
    if (this.type === 'robot') {
      if (!this.analyse) { this.analyse = { site, t: 0 }; this.dire(`Analyse de « ${site.nom} »…`); }
      return;
    }
    if (this.sac.length >= this.def.capacite) return this.dire('Sac plein : rapportez les échantillons à la fusée.');
    this.sac.push(site);
    this.marquer(site);
    this.dire(`Échantillon ramassé : ${site.nom}. ${site.texte}`);
  }

  terminer(issue, texte) { this.fin = { issue, texte }; }

  poussiere(n) {
    for (let i = 0; i < n; i++) this.fx.push({ x: this.p.x, y: this.p.y, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.2, vie: 0, max: 0.6 + Math.random() });
  }

  // ---------- Rendu ----------
  dessiner(ctx, W, H, dt) {
    const a = this.astre, p = this.p;
    const echelle = this.type === 'robot' ? 26 : 30; // px par mètre
    const yCam = p.y + 2.5;
    const camY = H * 0.55;
    const versEcran = (x, y) => [W / 2 + (x - p.x) * echelle, camY + (yCam - y) * echelle];
    dessinerFond(ctx, a, this.c, W, H, false);

    // Terrain (réutilise le rendu de l'atterrissage)
    dessinerTerrain(ctx, { x: p.x, y: yCam, sol: (x) => this.sol(x), astre: a, autopilote: false }, W, H, echelle, camY);

    // Traces de pas ou de roues
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (const tr of this.traces) {
      const [sx, sy] = versEcran(tr.x, this.sol(tr.x));
      if (sx < -10 || sx > W + 10) continue;
      ctx.fillRect(sx - 3, sy - 1, 6, 2);
    }

    // Sites d'intérêt
    for (const s of this.sites) {
      const [sx, sy] = versEcran(s.x, this.sol(s.x));
      if (sx < -40 || sx > W + 40) continue;
      const fait = this.dejaFait(s);
      ctx.fillStyle = fait ? 'rgba(180,180,180,0.6)' : '#ffd54f';
      ctx.beginPath(); ctx.moveTo(sx, sy - 34); ctx.lineTo(sx + 6, sy - 26); ctx.lineTo(sx, sy - 18); ctx.lineTo(sx - 6, sy - 26); ctx.fill();
      ctx.fillStyle = fait ? 'rgba(200,200,200,0.7)' : '#fff';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(s.nom + (fait ? ' ✓' : ''), sx, sy - 40);
      ctx.textAlign = 'left';
      // Petit caillou au sol
      ctx.fillStyle = fait ? '#777' : '#bcaaa4';
      ctx.beginPath(); ctx.ellipse(sx, sy - 3, 7, 4, 0, Math.PI, 0); ctx.fill();
    }

    // Fusée posée, à l'échelle
    const [fx, fy] = versEcran(this.xFusee, this.sol(this.xFusee));
    dessinerFusee(ctx, { f: this.vol.f, angle: this.vol.angle, throttle: 0, temp: this.vol.temp, integrite: this.vol.integrite, degats: this.vol.degats, taux: { pression: 0, chaleur: 0 }, enDegats: () => false }, fx, fy, FUSEE_BASE.hauteur * echelle);

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
    if (this.type === 'spationaute') dessinerSpationaute(ctx, sx, sy, echelle, p);
    else dessinerRobot(ctx, sx, sy, echelle, p, this.analyse);

    this.dessinerHud(ctx, W, H);
  }

  dessinerHud(ctx, W, H) {
    const d = this.def, a = this.astre, c = this.c;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, 290, 250);
    let y = 28;
    const ligne = (k, v, coul = '#fff') => {
      ctx.font = '12px system-ui'; ctx.fillStyle = '#b0bec5'; ctx.fillText(k, 16, y);
      ctx.font = 'bold 13px ui-monospace, Consolas, monospace'; ctx.fillStyle = coul; ctx.fillText(v, 140, y);
      y += 18;
    };
    ctx.font = 'bold 15px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(`${d.nom} sur ${a.nom}`, 16, y); y += 24;
    const fr = this.reserve / d.autonomie;
    ligne(d.ressource, fmtDuree(this.reserve), fr < 0.2 ? '#ef5350' : '#66bb6a');
    ligne(this.type === 'robot' ? 'État du robot' : 'Combinaison', fmt(this.integrite) + ' %', this.integrite > 60 ? '#66bb6a' : this.integrite > 30 ? '#ffca28' : '#ef5350');
    ligne('Pression', fmtP(c.p) + ' / ' + fmt(d.pressionMax, 1), couleurRisque(c.p / d.pressionMax));
    ligne('Température', fmt(c.t) + ' / ' + fmt(d.tempMax) + ' °C', couleurRisque((c.t + KELVIN) / (d.tempMax + KELVIN)));
    ligne('Rayonnement', fmt(c.rad, 1) + ' / ' + fmt(d.protection), couleurRisque(c.rad / d.protection));
    ligne('Dose reçue', fmt(this.dose) + ' %', couleurRisque(this.dose / 100));
    ligne('Gravité', fmtG(c.g));
    ligne('Libération', fmtV(this.vLib));
    const sc = this.science[a.id] || { echantillons: 0, analyses: 0, sites: {} };
    ligne(this.type === 'robot' ? 'Analyses' : 'Sac', this.type === 'robot' ? String(sc.analyses) : `${this.sac.length} / ${d.capacite}`);
    ligne('Sites étudiés ici', String(Object.keys(sc.sites || {}).length));
    ligne('Distance fusée', fmt(Math.abs(this.p.x - this.xFusee)) + ' m');

    // Site le plus proche non étudié
    const libres = this.sites.filter((s) => !this.dejaFait(s));
    if (libres.length) {
      const s = libres.reduce((m, x) => (Math.abs(x.x - this.p.x) < Math.abs(m.x - this.p.x) ? x : m));
      const dx = s.x - this.p.x;
      ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#ffd54f'; ctx.textAlign = 'center';
      ctx.fillText(`${dx < 0 ? '◀' : '▶'} ${s.nom} à ${fmt(Math.abs(dx))} m`, W / 2, 30);
      ctx.textAlign = 'left';
    }
    if (this.analyse) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 100, 44, 200, 14);
      ctx.fillStyle = '#4fc3f7'; ctx.fillRect(W / 2 - 100, 44, 200 * (this.analyse.t / 5), 14);
    }
    if (this.tMessage > 0) {
      ctx.font = '15px system-ui'; ctx.textAlign = 'center';
      const tw = ctx.measureText(this.message).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - tw / 2 - 10, H - 70, tw + 20, 26);
      ctx.fillStyle = '#fff'; ctx.fillText(this.message, W / 2, H - 52);
      ctx.textAlign = 'left';
    }
    if (this.taux > 0) {
      ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = Math.sin(performance.now() / 150) > 0 ? '#ff1744' : '#fff';
      ctx.fillText(this.type === 'robot' ? 'LIMITES DU ROBOT DÉPASSÉES' : 'COMBINAISON EN DANGER', W / 2, 80);
      ctx.textAlign = 'left';
    }
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'center';
    ctx.fillText(`←→ / Q D : ${this.type === 'robot' ? 'rouler' : 'marcher'}${this.saut ? ' · ↑ / Z / Espace : sauter' : ''} · E : ${this.type === 'robot' ? 'analyser' : 'ramasser'} (ou rentrer près de la fusée) · Échap : rappeler`, W / 2, H - 14);
    ctx.textAlign = 'left';
  }
}

function dessinerSpationaute(ctx, x, y, s, p) {
  const h = 1.8 * s;
  const phase = Math.sin(p.pas * 4.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.dir, 1);
  // Jambes
  ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = h * 0.11; ctx.lineCap = 'round';
  const jambe = (sgn) => { ctx.beginPath(); ctx.moveTo(0, -h * 0.45); ctx.lineTo(sgn * phase * h * 0.12, -h * 0.22); ctx.lineTo(sgn * phase * h * 0.16, -h * 0.02); ctx.stroke(); };
  jambe(1); jambe(-1);
  // Sac à dos
  ctx.fillStyle = '#b0bec5'; ctx.fillRect(-h * 0.2, -h * 0.82, h * 0.12, h * 0.34);
  // Corps
  ctx.fillStyle = '#f5f5f5'; ctx.fillRect(-h * 0.11, -h * 0.82, h * 0.22, h * 0.4);
  ctx.fillStyle = '#ef6c00'; ctx.fillRect(-h * 0.11, -h * 0.66, h * 0.22, h * 0.03);
  // Bras
  ctx.strokeStyle = '#eeeeee'; ctx.lineWidth = h * 0.08;
  ctx.beginPath(); ctx.moveTo(0, -h * 0.76); ctx.lineTo(-phase * h * 0.1 + h * 0.05, -h * 0.55); ctx.lineTo(h * 0.08, -h * 0.45); ctx.stroke();
  // Casque et visière dorée
  ctx.fillStyle = '#fafafa'; ctx.beginPath(); ctx.arc(0, -h * 0.92, h * 0.12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.ellipse(h * 0.05, -h * 0.92, h * 0.07, h * 0.08, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(h * 0.07, -h * 0.95, h * 0.02, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function dessinerRobot(ctx, x, y, s, p, analyse) {
  const L = 1.6 * s, h = 1.3 * s;
  ctx.save();
  ctx.translate(x, y);
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
