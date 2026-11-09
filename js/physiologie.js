'use strict';
// ---------- Physiologie des spationautes en sortie ----------
// Rythme cardiaque et oxygène du sang (SpO₂), pour chacun. La mort n'est plus instantanée (ordres de grandeur réels) :
// - plus d'oxygène, combinaison intacte : l'oxygène du sang baisse en quelques minutes ; le cœur s'emballe, la vue se
//   trouble vers 85 %, perte de connaissance vers 60 % (≈ 2 min 30), puis le cœur ralentit et s'arrête (≈ 8 min) ;
// - combinaison qui lâche (décompression) : perte de connaissance en ≈ 15 s, mort vers 1 min 30.
// Tant que le cœur bat, de l'oxygène (partage, module) ou du ruban sur la combinaison sauvent la personne ; descendue
// sous 60 %, elle garde des séquelles (blessure bénigne).

const SPO2_NORMALE = 98;
const SPO2_INCONSCIENCE = 60, SPO2_REVEIL = 70, SPO2_ALERTE = 90;
const LIMITE_HYPOXIE = 330, LIMITE_DECOMPRESSION = 75;   // s passées sous 60 % avant l'arrêt du cœur

function physioNeuve() { return { spo2: SPO2_NORMALE, fc: 72, conscient: true, tCritique: 0, sequelle: false, alerte: false }; }

// Une étape : o2 (il reste de l'oxygène), decomp (combinaison percée), effort (0 à 1). Renvoie la physio.
function majPhysio(ph, dt, o) {
  if (o.decomp) ph.spo2 -= dt * 2.6;                                   // ≈ 15 s jusqu'à 60 %
  else if (!o.o2) ph.spo2 -= dt * (ph.spo2 > SPO2_INCONSCIENCE ? 0.25 : 0.12);   // ≈ 2 min 30 jusqu'à 60 %
  else ph.spo2 += dt * 0.8;                                            // de l'oxygène : ça remonte en une minute
  ph.spo2 = Math.max(0, Math.min(SPO2_NORMALE, ph.spo2));
  if (ph.spo2 < SPO2_INCONSCIENCE) ph.sequelle = true;
  ph.tCritique = ph.spo2 < SPO2_INCONSCIENCE ? ph.tCritique + dt : Math.max(0, ph.tCritique - 2 * dt);
  const limite = o.decomp ? LIMITE_DECOMPRESSION : LIMITE_HYPOXIE;
  // Cœur : l'effort l'accélère, le manque d'oxygène aussi (tachycardie), puis il ralentit avant de s'arrêter.
  let cible = 68 + 75 * o.effort;
  if (ph.spo2 < 92) cible += Math.min(70, (92 - ph.spo2) * 3);
  if (ph.tCritique > 0) cible = Math.max(15, cible * (1 - ph.tCritique / limite));
  ph.fc += (cible - ph.fc) * Math.min(1, dt / 4);
  if (ph.conscient && ph.spo2 < SPO2_INCONSCIENCE) ph.conscient = false;
  else if (!ph.conscient && ph.spo2 > SPO2_REVEIL) ph.conscient = true;
  if (ph.tCritique >= limite) { ph.fc = 0; ph.mort = true; }
  return ph;
}
function couleurSpo2(s) { return s >= 94 ? '#66bb6a' : s >= SPO2_ALERTE ? '#ffca28' : '#ef5350'; }
function textePhysio(ph) { return `❤ ${fmt(ph.fc)} · SpO₂ ${fmt(ph.spo2)} %${ph.conscient ? '' : ' · inconscient'}`; }

Object.assign(Exploration.prototype, {
  // Effort (0 à 1) de celui qu'on pilote ou de l'autre.
  effortDe(q, enRover, escalade) {
    if (escalade) return 1;
    if (enRover) return 0.15;
    return Math.min(1, Math.abs(q.vx || 0) / Math.max(0.5, this.vMax || 1)) * 0.7 + (q.auSol === false ? 0.2 : 0);
  },

  // À chaque pas (spationaute, hors entraînement) : les deux corps. Renvoie true si une mort lance le fondu.
  majPhysiologie(dt) {
    this.physio = this.physio || physioNeuve();
    const d = this.duo;
    const suivre = (ph, nom, acc, o) => {
      const avant = { conscient: ph.conscient, spo2: ph.spo2 };
      majPhysio(ph, dt, o);
      if (avant.spo2 >= SPO2_ALERTE && ph.spo2 < SPO2_ALERTE && !ph.alerte) { ph.alerte = true; this.dire(`⚠ ${majuscule(nom)} manque d’oxygène : sang à ${fmt(ph.spo2)} %, cœur à ${fmt(ph.fc)}. ${o.decomp ? 'Combinaison percée : ruban adhésif (K), vite !' : 'Partagez l’oxygène (O) ou rentrez au module.'}`); }
      if (ph.spo2 > 94) ph.alerte = false;
      if (avant.conscient && !ph.conscient) this.dire(`😵 ${majuscule(nom)} a perdu connaissance (sang à ${fmt(ph.spo2)} %). Le cœur bat encore : il reste quelques minutes pour ${o.decomp ? 'colmater la combinaison' : 'lui donner de l’oxygène'}.`);
      if (!avant.conscient && ph.conscient) this.dire(`😮‍💨 ${majuscule(nom)} reprend connaissance.`);
      return ph.mort;
    };
    const moiMort = suivre(this.physio, this.def.nom, this.equipier().acc, { o2: this.reserve > 0, decomp: this.integrite <= 0, effort: this.effortDe(this.p, this.enRover, this.enEscalade) });
    if (moiMort) return this.mourirSortie(this, this.integrite <= 0 ? 'combinaison percée, décompression' : 'plus d’oxygène');
    if (d && !d.dansModule) {
      d.physio = d.physio || physioNeuve();
      if (suivre(d.physio, d.eq.nom, d.eq.acc, { o2: d.reserve > 0, decomp: d.integrite <= 0, effort: this.effortDe(d.p, d.enRover, d.enEscalade) })) return this.mourirSortie(d, d.integrite <= 0 ? 'combinaison percée, décompression' : 'plus d’oxygène');
    }
    this.sequelles();
    // Celui qu'on pilote a perdu connaissance : on prend la main sur l'autre, pour lui porter secours.
    if (!this.physio.conscient && d && !d.dansModule && d.physio && d.physio.conscient && !this.fin) {
      this.changerPersonnage();
      this.dire(`🆘 Vous pilotez ${this.def.nom} : portez secours à ${d.eq.nom} (O : oxygène, K : ruban adhésif).`);
    }
    this.verifierSecours();
    return false;
  },
  // Revenu à soi après être descendu sous 60 % : séquelles d'hypoxie (blessure bénigne).
  sequelles() {
    for (const [ph, qui] of [[this.physio, this], [this.duo && this.duo.physio, this.duo]]) {
      if (!ph || !ph.sequelle || !ph.conscient || ph.spo2 < 92) continue;
      ph.sequelle = false;
      if (!qui.blessure) {
        qui.blessure = { gravite: 'benigne', partie: 'séquelles d’hypoxie (maux de tête, fatigue)', t: this.vol.t };
        if (qui === this) this.appliquerBlessure();
        this.dire(`🩹 ${majuscule(qui === this ? this.def.nom : qui.eq.nom)} s’en sort, avec des séquelles d’hypoxie (maux de tête, fatigue) : à soigner à bord.`);
      }
    }
  },

  // Une mort : l'écran s'assombrit, puis on retrouve le module. Pas de détails, pas de corps à l'écran.
  mourirSortie(qui, cause) {
    if (this.fondu || this.fin) return true;
    const d = this.duo, estMoi = qui === this;
    const nom = estMoi ? this.def.nom : d.eq.nom, acc = estMoi ? this.equipier().acc : d.eq.acc;
    const autreVivant = estMoi ? !!(d && !d.dansModule && !(d.physio && d.physio.mort)) : true;
    const pres = d && Math.hypot(ecartSol(this.astre, this.p.x, d.p.x), this.p.y - d.p.y) < 6;
    this.warp = 1;
    this.fondu = {
      debut: performance.now(), duree: 3000, texte: `🕯 ${majuscule(nom)} est mort${acc} : ${cause}.`,
      apres: () => {
        if (estMoi && !autreVivant) return this.terminer('perdu', `${majuscule(cause)} : ${nom} n’a pas survécu.`);
        if (estMoi) this.changerPersonnage();            // on reprend la main sur celui qui reste
        const survivant = this.def.nom, accS = this.equipier().acc;
        this.perdreDuo(cause);
        this.terminer('retour', `🕯 ${majuscule(nom)} est mort${acc} (${cause}). ${majuscule(survivant)} ${pres ? `est resté${accS} à ses côtés jusqu’au bout, puis ` : ''}est rentré${accS} au module.`);
      },
    };
    return true;
  },
  // Appelé par le rendu : fondu au noir, puis la suite.
  dessinerFondu(ctx, W, H) {
    const f = this.fondu;
    if (!f) return;
    const u = Math.min(1, (performance.now() - f.debut) / f.duree);
    ctx.fillStyle = `rgba(0,0,0,${0.92 * u})`; ctx.fillRect(0, 0, W, H);
    if (u > 0.35) texteSurFond(ctx, f.texte, W / 2, H / 2, { police: '600 18px system-ui, sans-serif', couleur: `rgba(236,239,241,${Math.min(1, (u - 0.35) / 0.3)})`, align: 'center' });
    if (u >= 1 && !f.fait) { f.fait = true; f.apres(); }
  },
  // Grave danger : léger voile rouge qui bat au rythme du cœur le plus en peine.
  dessinerDanger(ctx, W, H) {
    if (this.fondu || this.type !== 'spationaute' || this.terre || this.essai) return;
    const gens = [[this.physio, this.integrite, this.dose], ...(this.duo && !this.duo.dansModule ? [[this.duo.physio, this.duo.integrite, this.duo.dose]] : [])];
    let pire = null;
    for (const [ph, integ, dose] of gens) {
      const grave = (ph && ph.spo2 < SPO2_ALERTE) || integ < 20 || dose > 80;
      if (grave && (!pire || (ph && ph.spo2 < pire.spo2))) pire = ph || { fc: 90, spo2: 100 };
    }
    if (!pire) return;
    const bat = Math.max(30, pire.fc || 30) / 60, phase = (performance.now() / 1000) * bat;
    const k = 0.1 + 0.08 * Math.pow(Math.max(0, Math.sin(phase * Math.PI * 2)), 4);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, `rgba(220,40,40,${k * 0.6})`); g.addColorStop(1, `rgba(220,40,40,${k * 3})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },

  // ---------- Fenêtre de secours ----------
  // Proposée (jeu en pause) quand c'est utile : oxygène bas et l'autre en a plus, combinaison abîmée et du ruban,
  // quelqu'un d'inconscient. Une fois par situation ; elle revient si la situation empire.
  verifierSecours() {
    const d = this.duo;
    if (!d || d.dansModule || this.fin || this.fondu || this.essai || Infos.estOuverte()) return;
    const ph1 = this.physio || physioNeuve(), ph2 = d.physio || physioNeuve();
    const gens = [{ nom: this.def.nom, r: this.reserve, i: this.integrite, ph: ph1, moi: true }, { nom: d.eq.nom, r: d.reserve, i: d.integrite, ph: ph2, moi: false }];
    const rubans = this.rubans + d.rubans;
    let besoin = null;
    for (const [a, b] of [[gens[0], gens[1]], [gens[1], gens[0]]]) {
      if (!a.ph.conscient) { besoin = { cle: 'inconscient:' + a.nom, qui: a, niveau: 3 }; break; }
      if (a.i < 50 && rubans > 0) besoin = besoin || { cle: 'ruban:' + a.nom + ':' + (a.i < 20 ? 2 : 1), qui: a, niveau: a.i < 20 ? 2 : 1 };
      if (a.r < 15 * 60 && b.r > a.r + 10 * 60) besoin = besoin || { cle: 'o2:' + a.nom + ':' + (a.r < 5 * 60 ? 2 : 1), qui: a, niveau: a.r < 5 * 60 ? 2 : 1 };
    }
    this.secoursVus = this.secoursVus || {};
    if (!besoin || this.secoursVus[besoin.cle]) return;
    this.secoursVus[besoin.cle] = true;
    setTimeout(() => this.ouvrirSecours(besoin), 50);
  },
  ouvrirSecours(besoin) {
    if (this.fin || this.fondu || !this.duo) return;
    const d = this.duo, m = $('modale'), avant = etat.pause;
    etat.pause = true; this.warp = 1;
    const dist = Math.hypot(ecartSol(this.astre, this.p.x, d.p.x), this.p.y - d.p.y);
    const proche = this.procheDuo(), roule = (this.enRover || d.enRover) && Math.abs(this.p.vx) > 0.1;
    const q = besoin.qui, ph = q.ph;
    const situation = !ph.conscient ? `${majuscule(q.nom)} a perdu connaissance (sang à ${fmt(ph.spo2)} %, cœur à ${fmt(ph.fc)}).`
      : besoin.cle.startsWith('ruban') ? `La combinaison de ${q.nom} est abîmée (${fmt(q.i)} %) : elle fuit.`
        : `${majuscule(q.nom)} n’a plus que ${fmtDuree(q.r)} d’oxygène.`;
    const faisable = proche && !roule;
    m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🆘 Secours</h2><p>${situation}</p>
      <p class="doux">${majuscule(this.def.nom)} : ${fmtDuree(this.reserve)} d’oxygène, combinaison ${fmt(this.integrite)} %, ${textePhysio(this.physio || physioNeuve())}<br>${majuscule(d.eq.nom)} : ${fmtDuree(d.reserve)} d’oxygène, combinaison ${fmt(d.integrite)} %, ${textePhysio(d.physio || physioNeuve())}<br>Ruban adhésif : ${this.rubans + d.rubans} rouleau${this.rubans + d.rubans > 1 ? 'x' : ''}.</p>
      ${!proche ? `<p class="encart">Vous êtes à ${fmt(dist)} m l’un de l’autre : rapprochez-vous (moins de ${fmt(DUO_PROCHE + 1)} m).</p>` : roule ? '<p class="encart">Arrêtez l’astromobile : on ne relie pas les combinaisons en roulant.</p>' : ''}</div></header>
      <div class="actions">${faisable ? '<button id="sec-o2" class="principal">💨 Partager l’oxygène</button><button id="sec-ruban">🩹 Ruban adhésif</button>' : ''}<button id="sec-plus-tard">${faisable ? 'Plus tard' : 'Compris'}</button></div></div>`;
    m.classList.remove('cache');
    const fermer = () => { Infos.fermer(); etat.pause = avant; };
    $('sec-plus-tard').onclick = fermer;
    if ($('sec-o2')) $('sec-o2').onclick = () => { fermer(); this.partagerOxygene(); };
    if ($('sec-ruban')) $('sec-ruban').onclick = () => { fermer(); this.ruban(); };
  },
});
