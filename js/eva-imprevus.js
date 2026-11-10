'use strict';
// ---------- Sorties depuis une station, étape 3 : les imprévus ----------
// Trois incidents vrais, au plus un de chaque par sortie, au hasard :
//   - de l'eau dans le casque (Luca Parmitano, ISS, juillet 2013) : elle monte, la sortie est à interrompre ;
//   - une combinaison trop gonflée qui ne passe plus l'écoutille (Alexeï Leonov, Voskhod 2, mars 1965) :
//     il faut baisser sa pression (P) ;
//   - un débris en approche (l'ISS manœuvre plusieurs fois par an) : la station allume ses moteurs, on s'abrite
//     près du sas ; ceux qui restent loin risquent un éclat dans la combinaison.

const IMPREVUS_EVA = {
  eau: 0.12, gonfle: 0.12, debris: 0.1,   // probabilités par sortie
  monteeEau: 25 * 60,       // s pour que l'eau couvre le nez et la bouche
  baissePression: 2 * 60,   // s pour dégonfler la combinaison
  alerteDebris: 10 * 60,    // s entre l'alerte et le passage des débris
  abri: 6,                  // m du sas : à l'abri derrière le gros module
  fuite: 4,                 // combinaison percée : oxygène consommé 4 fois plus vite
};

Object.assign(SortieStation.prototype, {
  // force : { eau, gonfle, debris } pour imposer (ou interdire) un imprévu.
  initImprevus(force = {}) {
    const tirer = (k) => (force[k] !== undefined ? force[k] : Math.random() < IMPREVUS_EVA[k]);
    this.imprevus = {
      eau: tirer('eau') ? { t: (20 + Math.random() * 70) * 60, qui: Math.floor(Math.random() * this.corps.length) } : null,
      gonfle: tirer('gonfle'),
      debris: tirer('debris') ? { t: (15 + Math.random() * 100) * 60 } : null,
    };
  },

  // P : baisser la pression d'une combinaison trop gonflée.
  toucheImprevus(code) {
    if (code !== 'KeyP') return false;
    const c = this.c.gonflee ? this.c : this.corps.find((x) => x.gonflee && !x.mort);
    if (!c) { this.dire('P : rien à dégonfler, les combinaisons sont à leur pression normale.'); return true; }
    if (c.gonflee.baisse !== null) return true;
    c.gonflee.baisse = IMPREVUS_EVA.baissePression;
    this.dire(`🎈 ${majuscule(c.eq.nom)} ouvre la valve : de 0,4 à 0,27 bar, comme Leonov. La combinaison s’assouplit (≈ ${fmtDuree(IMPREVUS_EVA.baissePression)}). Grâce aux heures d’oxygène pur dans le sas, pas de bulles d’azote dans le sang.`);
    return true;
  },

  // Échap au sas : une combinaison trop gonflée ne passe pas l'écoutille.
  bloqueSas() {
    const I = this.imprevus;
    if (!I) return false;
    if (I.gonfle === true) {
      I.gonfle = 'fait';
      const vivants = this.corps.filter((x) => !x.mort), c = vivants[Math.floor(Math.random() * vivants.length)];
      if (c) {
        c.gonflee = { baisse: null };
        this.dire(`⚠ 🎈 La combinaison de ${c.eq.nom} a gonflé dans le vide : raide comme un ballon, elle ne passe plus l’écoutille (Alexeï Leonov, 1965). P : baisser sa pression.`);
        return true;
      }
    }
    const g = this.corps.find((x) => x.gonflee && !x.mort);
    if (g) { this.dire(g.gonflee.baisse === null ? `🎈 ${majuscule(g.eq.nom)} ne passe pas l’écoutille : P pour baisser la pression de sa combinaison.` : `🎈 Encore ${fmtDuree(g.gonflee.baisse)} : la combinaison de ${g.eq.nom} se dégonfle.`); return true; }
    return false;
  },

  majImprevus(dt) {
    const I = this.imprevus;
    if (!I) return;
    // Eau dans le casque : elle monte peu à peu.
    if (I.eau && !I.eau.debut && this.duree >= I.eau.t) {
      const c = this.corps[I.eau.qui];
      I.eau.debut = true;
      if (c && !c.mort) { c.eau = 0; this.dire(`⚠ 💧 ${majuscule(c.eq.nom)} sent de l’eau froide derrière la tête : elle monte dans le casque (comme Luca Parmitano en 2013). Sortie à interrompre : rentrez au sas (Échap).`); }
    }
    for (const c of this.corps) {
      if (c.mort) continue;
      if (c.eau !== undefined && c.eau < 1) {
        const avant = c.eau;
        c.eau = Math.min(1, c.eau + dt / IMPREVUS_EVA.monteeEau);
        if (avant < 0.5 && c.eau >= 0.5) this.dire(`⚠ 💧 ${majuscule(c.eq.nom)} : l’eau couvre ses oreilles, la radio ne passe plus. Il faut rentrer, vite.`);
        if (avant < 0.85 && c.eau >= 0.85) this.dire(`⚠ 💧 ${majuscule(c.eq.nom)} : l’eau arrive au nez et aux yeux. Plus que quelques minutes !`);
        if (c.eau >= 1) this.dire(`⚠ 💧 ${majuscule(c.eq.nom)} : l’eau couvre la bouche et le nez, impossible de respirer.`);
      }
      // Combinaison qu'on dégonfle.
      if (c.gonflee && c.gonflee.baisse !== null) {
        c.gonflee.baisse -= dt;
        if (c.gonflee.baisse <= 0) { c.gonflee = null; this.dire(`🎈 La combinaison de ${c.eq.nom} s’est assouplie : elle passe l’écoutille. Échap pour rentrer.`); }
      }
    }
    // Débris en approche.
    const D = I.debris;
    if (!D) return;
    if (!D.alerte && this.duree >= D.t) {
      D.alerte = true; D.impact = this.duree + IMPREVUS_EVA.alerteDebris;
      this.dire(`⚠ ☄ Le contrôle signale un débris en approche : passage dans ${fmtDuree(IMPREVUS_EVA.alerteDebris)}. La station va manœuvrer. Rentrez au sas, ou restez à moins de ${IMPREVUS_EVA.abri} m de l’écoutille, à l’abri du gros module.`);
    }
    if (D.alerte && !D.manoeuvre && this.duree >= D.impact - 120) {
      D.manoeuvre = true; D.finPoussee = this.duree + 60;
      this.dire('⚠ 🚀 La station allume ses moteurs (manœuvre d’évitement) : tenez bien la main courante.');
      for (const c of this.corps) if (c.libre) c.libre.vx -= 0.25;   // ceux qui flottent : la station s'éloigne d'eux
    }
    if (D.alerte && !D.passe && this.duree >= D.impact) {
      D.passe = true; D.fin = this.duree + 25;
      const touches = [];
      for (const c of this.corps) {
        if (c.mort) continue;
        const abri = !c.libre && Math.abs(ecartContour(this.g, c.s, 0.5)) <= IMPREVUS_EVA.abri;
        if (!abri && Math.random() < 0.35) { c.fuite = IMPREVUS_EVA.fuite; touches.push(c); }
      }
      this.dire(`☄ La station a esquivé le gros débris ; une pluie d’éclats passe.${touches.length ? '' : ' Personne n’est touché.'}`);
      for (const c of touches) this.dire(`⚠ 💥 Un éclat a percé la combinaison de ${c.eq.nom} : petite fuite, l’oxygène part ${IMPREVUS_EVA.fuite} fois plus vite. Rentrez au sas !`);
    }
  },

  dessinerImprevus(ctx, E, k, W, H) {
    for (const c of this.corps) {
      if (c.mort) continue;
      const cp = this.corpsPose(c);
      if (c.eau !== undefined && c.eau > 0) {   // eau dans le casque
        const [x, y] = E(cp.hx, cp.hy);
        ctx.fillStyle = `rgba(80,170,255,${0.25 + 0.45 * c.eau})`; ctx.beginPath(); ctx.arc(x, y, 0.35 * k * (0.5 + c.eau), 0, Math.PI * 2); ctx.fill();
      }
      if (c.gonflee) {   // combinaison gonflée : un contour bombé
        const [x, y] = E((cp.tx + cp.hx) / 2, (cp.ty + cp.hy) / 2), u = c.gonflee.baisse === null ? 1 : Math.max(0, c.gonflee.baisse / IMPREVUS_EVA.baissePression);
        ctx.strokeStyle = `rgba(255,202,40,${0.4 + 0.5 * u})`; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.ellipse(x, y, (0.9 + 0.5 * u) * k, (1.4 + 0.6 * u) * k, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    const D = this.imprevus && this.imprevus.debris;
    if (!D) return;
    // Panache des moteurs pendant la manœuvre.
    if (D.manoeuvre && this.duree < D.finPoussee) {
      const [x, y] = E(-this.g.L / 2, 0);
      ctx.fillStyle = `rgba(255,200,120,${0.4 + 0.3 * Math.random()})`; ctx.beginPath(); ctx.moveTo(x, y - 0.6 * k); ctx.lineTo(x - 4 * k, y); ctx.lineTo(x, y + 0.6 * k); ctx.fill();
    }
    // Pluie d'éclats : des traits rapides qui traversent l'écran.
    if (D.passe && this.duree < D.fin) {
      const t = performance.now() / 1000;
      ctx.strokeStyle = 'rgba(255,240,200,0.85)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 26; i++) {
        const ph = (t * (0.8 + (i % 5) * 0.15) + i * 0.137) % 1, y = ((i * 97) % 100) / 100 * H * 0.85;
        const x = W * (1.1 - 1.3 * ph);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y - 6); ctx.stroke();
      }
    }
  },

  lignesImprevus() {
    const l = [], D = this.imprevus && this.imprevus.debris;
    if (D && D.alerte && !D.passe) l.push(['☄ Débris', `passage dans ${fmtDuree(Math.max(0, D.impact - this.duree))} · abri : < ${IMPREVUS_EVA.abri} m du sas`, '#ef5350']);
    for (const c of this.corps) {
      if (c.mort) continue;
      if (c.eau !== undefined) l.push(['💧 Casque', `${c.eq.nom} : eau à ${fmt(100 * c.eau)} %`, c.eau >= 0.85 ? '#ef5350' : '#4fc3f7']);
      if (c.gonflee) l.push(['🎈 Combinaison', `${c.eq.nom} : ${c.gonflee.baisse === null ? 'trop gonflée, P pour la dégonfler' : `se dégonfle… ${fmtDuree(c.gonflee.baisse)}`}`, '#ffca28']);
      if (c.fuite) l.push(['💥 Fuite', `${c.eq.nom} : oxygène ×${c.fuite}`, '#ef5350']);
    }
    return l;
  },
});
