'use strict';
// ---------- Sortie à deux spationautes ----------
// Quand un second membre d'équipage est à bord, il sort avec vous. Tab : prendre la main sur l'autre à tout moment ;
// celui qu'on ne pilote pas vous suit (ou attend, touche G). À deux, on rapporte deux fois plus d'échantillons, et on
// s'entraide : courte-échelle et main tendue au pied d'une paroi (C), ruban adhésif sur une combinaison abîmée (K),
// oxygène partagé (O). L'astromobile a deux places.

const DUO_PROCHE = 2.5;     // m : distance pour s'entraider
const RUBANS = 3;           // rouleaux de ruban adhésif

// Le second spationaute : un membre d'équipage à bord (campagne), ou un coéquipier en visite rapide.
function secondEquipier(vol) {
  const v = typeof etat !== 'undefined' && etat.enVoyage && etat.voyage;
  if (vol.robotSeul || vol.droneSeul) return null;
  if (v) {
    if (!v.equipe) return null;
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
    eq, mode: 'suit', enRover: false, rubans: RUBANS,
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
    const moi = { p: this.p, reserve: this.reserve, integrite: this.integrite, sac: this.sac, doseSv: this.doseSv, dose: this.dose, enRover: this.enRover, eq: this.vol.equipier || equipierDescente(null) };
    this.p = d.p; this.reserve = d.reserve; this.integrite = d.integrite; this.sac = d.sac; this.doseSv = d.doseSv; this.dose = d.dose; this.enRover = d.enRover;
    this.vol.equipier = d.eq; this.def.nom = d.eq.nom;
    Object.assign(d, { p: moi.p, reserve: moi.reserve, integrite: moi.integrite, sac: moi.sac, doseSv: moi.doseSv, dose: moi.dose, enRover: moi.enRover, eq: moi.eq });
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

  // C : courte-échelle (l'autre est au pied de la paroi avec vous, il vous hisse de 2 m),
  // ou main tendue (vous êtes en haut, l'autre en bas : vous le tirez jusqu'à vous).
  courteEchelle() {
    const d = this.duo, p = this.p;
    if (!d) return;
    const dx = Math.abs(ecartSol(this.astre, d.p.x, p.x)), dy = p.y - d.p.y;
    if (this.enRover || d.enRover) return this.dire('Descendez de l’astromobile pour vous entraider.');
    if (dy > 1 && dy < 12 && dx < 4) {   // avec la corde de sécurité
      d.p.x = p.x - (p.dir || 1) * 0.6; d.p.y = this.sol(d.p.x); d.p.vx = 0; d.p.vy = 0; d.p.auSol = true;
      return this.dire(`🤝 Vous lancez la corde à ${d.eq.nom} et l’aidez à monter jusqu’à vous.`);
    }
    if (dx > DUO_PROCHE || Math.abs(dy) > 1) return this.dire(`Courte-échelle : il faut être au pied de la paroi, à côté de ${d.eq.nom}. Main tendue : être en haut, ${d.eq.nom} juste en dessous.`);
    const dir = p.dir || 1;
    const pente = Math.atan2(this.sol(p.x + 0.6 * dir) - this.sol(p.x), 0.6) * 180 / Math.PI;
    if (pente < 30) return this.dire('Pas de paroi devant vous : la courte-échelle ne sert à rien ici.');
    // On monte de 2 m le long de la paroi (avec une petite marge vers le haut).
    const y0 = p.y;
    let x = p.x;
    for (let i = 0; i < 400 && this.sol(x) - y0 < 2; i++) x += dir * 0.01;
    p.x = x; p.y = this.sol(x); p.vx = 0; p.vy = 0;
    this.dire(`🤝 Courte-échelle : ${d.eq.nom} vous hisse de ${fmt(p.y - y0, 1)} m. Tendez-lui la main (C) une fois en haut.`);
  },
  // K : ruban adhésif sur la combinaison abîmée (la sienne, ou celle de l'autre s'il est à côté).
  ruban() {
    const d = this.duo;
    if (!d) return this.dire('Le ruban adhésif se pose à deux : personne pour vous aider.');
    if (!this.procheDuo()) return this.dire(`Approchez-vous de ${d.eq.nom} pour réparer une combinaison.`);
    if (d.rubans <= 0) return this.dire('Plus de ruban adhésif.');
    const qui = this.integrite <= d.integrite ? 'moi' : 'autre';
    const avant = qui === 'moi' ? this.integrite : d.integrite;
    if (avant > 90) return this.dire('Les deux combinaisons sont en bon état.');
    const apres = Math.min(100, avant + 25);
    if (qui === 'moi') this.integrite = apres; else d.integrite = apres;
    d.rubans--;
    this.dire(`🩹 Ruban adhésif sur la combinaison ${qui === 'moi' ? 'que vous portez' : `de ${d.eq.nom}`} : ${fmt(avant)} % → ${fmt(apres)} %. Encore ${d.rubans} rouleau${d.rubans > 1 ? 'x' : ''}.`);
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
    const d = this.duo, p = this.p, q = d.p, g = this.c.g;
    d.reserve -= dt;
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
    let veut = 0;
    if (d.mode === 'suit') {
      const cible = p.x - (p.dir || 1) * 1.8, e = ecartSol(this.astre, cible, q.x);
      if (Math.abs(e) > 0.6) veut = Math.sign(e);
    }
    const vise = veut * this.vMax;
    q.vx += Math.sign(vise - q.vx) * Math.min(Math.abs(vise - q.vx), this.acc * dt);
    if (veut) q.dir = veut;
    const pente = Math.atan2(this.sol(q.x + 0.5 * (veut || 1)) - this.sol(q.x), 0.5) * 180 / Math.PI;
    if (pente > this.def.penteMax + 10 && veut > 0 === q.vx > 0 && q.vx) {
      q.vx = 0;
      if (!d.bloque && d.mode === 'suit') { d.bloque = true; this.dire(`🧗 ${d.eq.nom} est bloqué${d.eq.acc} au pied de la paroi : tendez-lui la main d’en haut (C), ou faites-lui la courte-échelle.`); }
    } else if (Math.abs(q.vx) > 0.05) d.bloque = false;
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
    if (v && d.doseSv) regDose(d.eq.id ? (v.equipe || []).find((m) => m.id === d.eq.id) : principal(v), d.doseSv);
  },

  dessinerDuo(ctx, versEcran, echelle) {
    const d = this.duo;
    if (!d || d.enRover) return;
    const [sx, sy] = versEcran(d.p.x, d.p.y);
    dessinerSpationaute(ctx, sx, sy, echelle, d.p, false, d.eq.profil);
    texteSurFond(ctx, d.eq.nom, sx, sy - 2.3 * echelle, { police: '11px system-ui, sans-serif', couleur: '#b3e5fc' });
  },
});
