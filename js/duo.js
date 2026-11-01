'use strict';
// ---------- Sortie à deux spationautes ----------
// Quand un second membre d'équipage est à bord, il sort avec vous. Tab : prendre la main sur l'autre à tout moment ;
// celui qu'on ne pilote pas vous suit (ou attend, touche G). À deux, on rapporte deux fois plus d'échantillons, et on
// s'entraide : courte-échelle et main tendue au pied d'une paroi (C), ruban adhésif sur une combinaison abîmée (K),
// oxygène partagé (O). L'astromobile a deux places.

const DUO_PROCHE = 2.5;     // m : distance pour s'entraider
// Hauteurs de paroi accessibles. Courte-échelle : on monte sur les mains puis les épaules de l'autre, et l'on attrape
// le rebord bras tendus (≈ 1,5 m + 2,2 m, un peu moins pour se hisser). Main tendue : celui du haut, allongé au bord,
// tend le bras (≈ 0,7 m) vers les mains levées de celui du bas (≈ 2,2 m).
const HAUTEUR_COURTE_ECHELLE = 3.5, HAUTEUR_MAIN_TENDUE = 2.8;   // m

// Le second spationaute : un membre d'équipage à bord (campagne), ou un coéquipier en visite rapide.
function secondEquipier(vol) {
  const v = typeof etat !== 'undefined' && etat.enVoyage && etat.voyage;
  if (vol.robotSeul || vol.droneSeul) return null;
  if (v) {
    if (!v.equipe) return null;
    // Descente composée par le joueur : le premier passager encore en vie sort avec le pilote ; sinon personne.
    if (vol.passagers) {
      const m = vol.passagers.map((id) => v.equipe.find((x) => x.id === id)).find((x) => x && x.etat === 'bord' && !(x.principal && v.equipagePerdu));
      return m ? equipierDeMembre(m) : null;
    }
    const pil = vol.equipier || equipierDescente(v);
    const m = v.equipe.find((x) => x.etat === 'bord' && (pil.principal ? !x.principal : x.id !== pil.id) && !(x.principal && v.equipagePerdu));
    if (!m) return null;
    if (m.principal) return { nom: nomSpatio(), profil: SPATIO, acc: acc(), principal: true };
    const profil = m.profil || PROFIL_DEFAUT;
    return { nom: m.nom, profil, acc: (GENRES[profil.genre] || GENRES.aucun).accord, principal: false, id: m.id };
  }
  return { nom: 'Sam', profil: { ...PROFIL_DEFAUT, prenom: 'Sam', carnation: 5, coiffure: 'longue' }, acc: '', principal: false };
}

function creerDuo(x) {
  if (x.type !== 'spationaute' || x.terre || x.essai || x.cable) return null;
  const eq = secondEquipier(x.vol);
  if (!eq) return null;
  const px = x.p.x - 1.5;
  x.dire(`👥 Sortie à deux : ${eq.nom} vous accompagne. Tab : changer de spationaute · G : suis-moi / attends · C : courte-échelle · K : ruban adhésif · O : partager l’oxygène.`);
  return {
    eq, mode: 'suit', enRover: false, rubans: RUBANS_PAR_PERSONNE,
    blessure: (etat.enVoyage && etat.voyage && (membreDe(etat.voyage, eq) || {}).blessure) || null,
    p: { x: px, y: x.sol(px), vx: 0, vy: 0, auSol: true, dir: 1, pas: 0 },
    reserve: x.def.autonomie, integrite: 100, sac: [], doseSv: 0, dose: 0,   // dose reçue pendant cette sortie
  };
}

Object.assign(Exploration.prototype, {
  // Tab : on prend la main sur l'autre spationaute (il garde sa place, son oxygène, son sac).
  changerPersonnage() {
    const d = this.duo;
    if (!d) return this.dire('Personne d’autre dehors : vous êtes seul·e à sortir.');
    if (this.fin || this.enEmbarquement()) return;
    const moi = { p: this.p, reserve: this.reserve, integrite: this.integrite, sac: this.sac, doseSv: this.doseSv, dose: this.dose, enRover: this.enRover, blessure: this.blessure, eq: this.vol.equipier || equipierDescente(null) };
    this.p = d.p; this.reserve = d.reserve; this.integrite = d.integrite; this.sac = d.sac; this.doseSv = d.doseSv; this.dose = d.dose; this.enRover = d.enRover; this.blessure = d.blessure || null; this.appliquerBlessure();
    this.vol.equipier = d.eq; this.def.nom = d.eq.nom;
    Object.assign(d, { p: moi.p, reserve: moi.reserve, integrite: moi.integrite, sac: moi.sac, doseSv: moi.doseSv, dose: moi.dose, enRover: moi.enRover, blessure: moi.blessure, eq: moi.eq });
    this.permute = !this.permute;
    this.dire(`🔁 Vous pilotez ${this.def.nom}. ${d.eq.nom} ${d.mode === 'suit' ? 'vous suit' : 'attend'}.`);
  },
  basculerSuivi() {
    const d = this.duo;
    if (!d) return;
    d.mode = d.mode === 'suit' ? 'attend' : 'suit';
    this.dire(d.mode === 'suit' ? `👣 ${d.eq.nom} vous suit.` : `✋ ${d.eq.nom} attend ici.`);
  },
  procheDuo() { const d = this.duo; return d && Math.hypot(ecartSol(this.astre, d.p.x, this.p.x), d.p.y - this.p.y) < DUO_PROCHE + 1; },

  // C : courte-échelle (vous êtes au pied de la paroi, l'autre à côté : il vous hisse), ou main tendue (vous êtes
  // en haut, l'autre au pied : allongé au bord, vous le tirez jusqu'à vous). Au-delà de la hauteur accessible : grappin.
  courteEchelle() {
    const d = this.duo, p = this.p;
    if (!d || this.geste) return;
    if (this.enRover || d.enRover) return this.dire('Descendez de l’astromobile pour vous entraider.');
    const ecart = ecartSol(this.astre, p.x, d.p.x), dy = p.y - d.p.y;
    if (dy > 1 && Math.abs(ecart) < 6) {
      const sens = Math.sign(ecart) || 1;                  // de l'autre (en bas) vers vous (en haut)
      const pied = this.piedDevant(d.p.x, sens), r = this.rebordDevant(pied, sens), h = r.y - this.sol(pied);
      if (h > HAUTEUR_MAIN_TENDUE) return this.dire(`✋ Trop haut pour la main tendue : ${fmt(h, 1)} m de paroi, allongé${this.equipier().acc} au bord on n’atteint que ${fmt(HAUTEUR_MAIN_TENDUE, 1)} m. ${d.eq.nom} doit grimper au grappin (Tab pour ${d.eq.acc ? 'la' : 'le'} piloter, puis ↑ contre la paroi).`);
      return this.lancerGeste('main', 'autre', sens, pied, r, h);
    }
    if (Math.abs(ecart) > DUO_PROCHE + 1 || Math.abs(dy) > 1) return this.dire(`Courte-échelle : soyez au pied de la paroi, à côté de ${d.eq.nom}. Main tendue : soyez en haut, ${d.eq.nom} juste en dessous.`);
    const sens = p.dir || 1;
    const pied = this.piedDevant(p.x, sens);
    if (Math.abs(ecartSol(this.astre, pied, p.x)) > 2) return this.dire('Pas de paroi juste devant vous : la courte-échelle ne sert à rien ici.');
    const r = this.rebordDevant(pied, sens), h = r.y - this.sol(pied);
    if (h > HAUTEUR_COURTE_ECHELLE) return this.dire(`🧗 Trop haut pour la courte-échelle : ${fmt(h, 1)} m de paroi, on n’atteint que ${fmt(HAUTEUR_COURTE_ECHELLE, 1)} m. Lancez plutôt le grappin (↑ contre la paroi).`);
    return this.lancerGeste('courte', 'moi', sens, pied, r, h);
  },
  // Geste animé : qui monte (moi / autre), qui aide ; l'aide se met en place tout de suite.
  lancerGeste(type, monte, sens, pied, rebord, h) {
    const m = monte === 'moi' ? this.p : this.duo.p, a = monte === 'moi' ? this.duo.p : this.p;
    if (type === 'courte') { a.x = pied - sens * 0.15; a.y = this.sol(a.x); }          // l'aide au pied, dos à la paroi
    else { a.x = rebord.x + sens * 1.7; a.y = this.sol(a.x); }                       // l'aide allongé, la tête au bord
    a.dir = sens; m.dir = sens; a.vx = m.vx = 0; a.auSol = m.auSol = true;
    this.geste = { type, monte, sens, t: 0, duree: type === 'courte' ? 3 : 3.5, x0: m.x, y0: m.y, xPied: type === 'courte' ? a.x - sens * 0.3 : pied - sens * 0.2, xBord: rebord.x - sens * 0.15, yBord: rebord.y, h };
  },
  majGeste(dt) {
    const g = this.geste, d = this.duo;
    if (!d) { this.geste = null; return; }
    g.t += dt;
    const u = Math.min(1, g.t / g.duree), q = g.monte === 'moi' ? this.p : d.p;
    const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
    const yPied = this.sol(g.xPied), marche = g.type === 'courte' ? 0.9 : 0;   // courte-échelle : sur les mains jointes
    if (u < 0.25) { q.x = lerp(g.x0, g.xPied, u / 0.25); q.y = this.sol(q.x); }
    else if (u < 0.4) { q.x = g.xPied; q.y = yPied + marche * (u - 0.25) / 0.15; }
    else if (u < 0.85) { const k = (u - 0.4) / 0.45; q.x = lerp(g.xPied, g.xBord, k); q.y = lerp(yPied + marche, g.yBord, k); }
    else { q.x = lerp(g.xBord, g.xBord + g.sens * 0.8, (u - 0.85) / 0.15); q.y = this.sol(q.x); }
    q.pas = (q.pas || 0) + dt;
    if (u < 1) return;
    q.y = this.sol(q.x); q.auSol = true;
    this.geste = null;
    if (g.type === 'courte') this.dire(`🤝 ${d.eq.nom} vous fait la courte-échelle : vous voilà en haut (${fmt(g.h, 1)} m). Tendez-lui la main (C) depuis le bord.`);
    else {
      this.p.x = g.xBord + g.sens * 1.4; this.p.y = this.sol(this.p.x);         // celui du haut se relève
      this.dire(`🤝 Allongé${this.equipier().acc} au bord, vous tendez la main à ${d.eq.nom} et ${d.eq.acc ? 'la' : 'le'} hissez jusqu’à vous (${fmt(g.h, 1)} m).`);
    }
  },
  // Pose de chacun pendant un geste : 'courte' (l'aide au pied), 'allonge' (l'aide au bord), 'bras-hauts' (qui monte).
  poseGeste(qui) {
    const g = this.geste;
    if (!g) return undefined;
    const u = g.t / g.duree;
    if (g.monte === qui) return u > 0.2 && u < 0.88 ? 'bras-hauts' : undefined;
    if (g.type === 'courte') return u < 0.9 ? 'courte' : undefined;
    return u < 0.95 ? 'allonge' : undefined;
  },
  // O : on relie les deux combinaisons et on partage l'oxygène à parts égales.
  partagerOxygene() {
    const d = this.duo;
    if (!d) return;
    if (!this.procheDuo()) return this.dire(`Approchez-vous de ${d.eq.nom} pour relier vos combinaisons.`);
    const moyenne = (this.reserve + d.reserve) / 2;
    if (Math.abs(this.reserve - moyenne) < 60) return this.dire('Vos réserves d’oxygène sont déjà à égalité.');
    this.reserve = moyenne; d.reserve = moyenne;
    this.dire(`💨 Combinaisons reliées : chacun a maintenant ${fmtDuree(moyenne)} d’oxygène.`);
  },

  // À chaque pas : l'autre suit (ou attend), respire, encaisse la dose.
  majDuo(dt) {
    if (this.duo.dansModule) return;   // à l'abri dans le module posé : il attend le départ
    const d = this.duo, p = this.p, q = d.p, g = this.c.g;
    d.reserve -= dt * etatCombi(d.integrite).fuite;   // combinaison abîmée : elle fuit
    d.doseSv += (this.irradiation.svJour * (this.facteurDose || 1) * dt) / 86400;
    d.dose = (100 * d.doseSv) / DOSE_MORTELLE;
    if (this.essai && d.reserve <= 0) d.reserve = this.def.autonomie;
    if (d.reserve < 15 * 60 && !d.alerteO2) { d.alerteO2 = true; this.dire(`⚠ ${d.eq.nom} : moins de 15 min d’oxygène. Partagez le vôtre (O, à côté), ou rentrez.`); }
    if (d.reserve <= 0 || d.dose >= 100) return this.perdreDuo(d.reserve <= 0 ? 'plus d’oxygène' : 'dose mortelle de rayonnement');
    // Deux places dans l'astromobile : il roule avec vous.
    if (d.enRover) { q.x = p.x; q.y = p.y; q.vx = p.vx; q.auSol = true; return; }
    if (!q.auSol) {
      q.vy -= g * dt; q.y += q.vy * dt; q.x += q.vx * dt;
      if (q.y <= this.sol(q.x)) { q.y = this.sol(q.x); q.vy = 0; q.vx = 0; q.auSol = true; }
      return;
    }
    // Rappel : vous êtes en bas, la corde est plantée au bord ; l'autre descend à son tour, le long de la paroi.
    if (d.enRappel) {
      const gr = this.grappin, sens = gr ? -gr.sens : (q.dir || 1);
      const kG = Math.max(0.5, Math.min(2.5, Math.sqrt(9.81 / Math.max(0.05, g))));
      const ds = 0.8 * kG * dt;
      this.glisserLeLong(q, sens, ds);
      q.grimpe = (q.grimpe || 0) + ds; q.dir = -sens; q.vx = 0;
      d.enEscalade = true;
      if (!this.bordFalaise(q.x, sens)) { this.poserAuPied(q, sens); d.enRappel = false; d.enEscalade = false; q.dir = sens; this.dire(`🧗 ${d.eq.nom} vous a rejoint en bas.`); }
      return;
    }
    // Cordée : le grappin est accroché à cette paroi ; l'autre grimpe derrière vous, le long de la corde.
    const gp = this.grappin;
    if (gp && gp.t >= DUREE_GRAPPIN && d.mode === 'suit' && Math.abs(ecartSol(this.astre, gp.x, q.x)) < 30) {
      const sens = gp.sens;
      const devant = Math.atan2(this.sol(q.x + 0.5 * sens) - this.sol(q.x), 0.5) * 180 / Math.PI;
      const surParoi = devant > this.def.penteMax + 10 || (d.enEscalade && devant > this.def.penteMax);
      const enAvance = p.y - q.y > 1.2 || ecartSol(this.astre, p.x, q.x) * sens > 2;   // le premier est plus haut, ou déjà passé
      if (surParoi && enAvance) {
        const kG = Math.max(0.5, Math.min(2.5, Math.sqrt(9.81 / Math.max(0.05, g))));
        const ds = 0.4 * kG * dt;
        this.glisserLeLong(q, sens, ds);
        q.grimpe = (q.grimpe || 0) + ds; q.dir = sens; q.vx = 0;
        d.enEscalade = true; d.bloque = false;
        d.reserve -= dt;                                   // l'effort
        return;
      }
    }
    d.enEscalade = false;
    let veut = 0;
    if (d.mode === 'suit') {
      const cible = p.x - (p.dir || 1) * 1.8, e = ecartSol(this.astre, cible, q.x);
      if (Math.abs(e) > 0.6) veut = Math.sign(e);
    }
    d.quatrePattes = this.monteeDevant(q.x, veut) > PENTE_QUATRE_PATTES;   // montée très raide : à quatre pattes
    const vise = veut * this.vMax * (d.quatrePattes ? VITESSE_QUATRE_PATTES : 1);
    q.vx += Math.sign(vise - q.vx) * Math.min(Math.abs(vise - q.vx), this.acc * dt);
    if (veut) q.dir = veut;
    const pente = Math.atan2(this.sol(q.x + 0.5 * (veut || 1)) - this.sol(q.x), 0.5) * 180 / Math.PI;
    if (pente > this.def.penteMax + 10 && veut > 0 === q.vx > 0 && q.vx) {
      q.vx = 0;
      if (!d.bloque && d.mode === 'suit') { d.bloque = true; this.dire(`🧗 ${d.eq.nom} est bloqué${d.eq.acc} au pied de la paroi : tendez-lui la main d’en haut (C), ou faites-lui la courte-échelle.`); }
    } else if (pente < -(this.def.penteMax + 10) && veut && veut > 0 === q.vx > 0) {
      // Bord d'une falaise (on vient d'y tomber, par exemple) : l'autre ne saute pas derrière, il attend en haut.
      // Si votre corde de rappel est plantée là et que vous êtes en bas, il descend à son tour.
      q.vx = 0;
      const gr = this.grappin;
      if (gr && gr.rappel && d.mode === 'suit' && Math.abs(ecartSol(this.astre, gr.x, q.x)) < 4) {
        if (!this.rappel) { d.enRappel = true; d.auBord = false; q.grimpe = q.grimpe || 0; }   // sinon, il attend son tour
      } else if (!d.auBord && d.mode === 'suit') { d.auBord = true; this.dire(`🧗 ${d.eq.nom} s’arrête au bord : trop raide pour descendre. ${d.eq.acc ? 'Elle' : 'Il'} vous attend en haut (Tab pour ${d.eq.acc ? 'la' : 'le'} piloter).`); }
    } else if (Math.abs(q.vx) > 0.05) { d.bloque = false; d.auBord = false; }
    q.x += q.vx * dt; q.y = this.sol(q.x); q.pas += Math.abs(q.vx) * dt;
  },
  perdreDuo(cause) {
    const d = this.duo;
    this.duo = null;
    const v = etat.enVoyage && etat.voyage;
    if (v) {
      noterPerte(v, d.eq.nom, this.astre.id, cause);
      const m = (v.equipe || []).find((x) => (d.eq.id ? x.id === d.eq.id : x.principal));
      if (m) m.etat = 'perdu';
    }
    this.dire(`💀 ${d.eq.nom} : ${cause}. ${d.sac.length ? `Son sac (${d.sac.length} échantillon${d.sac.length > 1 ? 's' : ''}) reste au sol.` : ''}`);
  },
  // Fin de sortie : celui qu'on pilotait au départ reprend sa place de pilote ; dose du second au registre.
  finDuo(issue) {
    const d = this.duo;
    if (!d) return;
    if (this.permute && issue !== 'perdu') this.changerPersonnage();
    const v = etat.enVoyage && etat.voyage;
    if (v && d.blessure) noterBlessure(v, d.eq, d.blessure);
    if (v && d.doseSv) regDose(d.eq.id ? (v.equipe || []).find((m) => m.id === d.eq.id) : principal(v), d.doseSv);
  },

  dessinerDuo(ctx, versEcran, echelle) {
    const d = this.duo;
    if (!d || d.enRover || d.dansSecours || d.dansModule) return;   // à bord de l'astromobile ou du module de secours
    const [sx, sy] = versEcran(d.p.x, d.p.y);
    if (this.poseGeste('autre') === 'allonge') dessinerAllonge(ctx, sx, sy, echelle, this.geste.sens, d.eq.profil);
    else dessinerSpationaute(ctx, sx, sy, echelle, { ...d.p, grimpe: d.enEscalade ? d.p.grimpe : undefined, pose: this.poseGeste('autre') || (d.quatrePattes && !d.enEscalade ? 'quatre-pattes' : undefined), inclinaison: this.penteSous(d.p.x) }, false, d.eq.profil);
    texteSurFond(ctx, d.eq.nom, sx, sy - 2.3 * echelle, { police: '11px system-ui, sans-serif', couleur: '#b3e5fc' });
  },
});
