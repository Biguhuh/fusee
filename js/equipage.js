'use strict';
// Le ou la spationaute : profil choisi avant de partir, accords dans les messages, dessin.
// Le genre ne sert qu'aux accords ; l'apparence (coiffure, carnation) se choisit à part.

const CLE_SPATIO = 'fusee-spationaute-v1';

const GENRES = {
  femme: { libelle: 'Femme', accord: 'e', emoji: '👩‍🚀', titre: 'la spationaute' },
  homme: { libelle: 'Homme', accord: '', emoji: '👨‍🚀', titre: 'le spationaute' },
  nb: { libelle: 'Non-binaire', accord: '·e', emoji: '🧑‍🚀', titre: 'notre spationaute' },
  aucun: { libelle: 'Je préfère ne pas le dire', accord: '·e', emoji: '🧑‍🚀', titre: 'notre spationaute' },
};

// Du plus clair au plus foncé.
const CARNATIONS = ['#f8e1cf', '#efc8a8', '#e0aa82', '#c98b5e', '#a86a42', '#8a5233', '#673a22', '#47271a'];
const COULEURS_CHEVEUX = ['#1b1b1b', '#4e342e', '#8d5b3a', '#b5562b', '#e0c070', '#bdbdbd', '#7e57c2'];

const COIFFURES = {
  courte: 'Courte',
  longue: 'Longue, attachée',
  bouclee: 'Bouclée / afro',
  tresses: 'Tresses',
  rasee: 'Rasée',
  foulard: 'Foulard',
};

// Handicap des membres supérieurs (bras) et inférieurs (jambes) : aucun, un ou les deux membres.
// Pour chaque groupe, on choisit l'aide : un exosquelette (structure motorisée qui soutient le membre)
// ou un membre bionique (prothèse robotisée qui le remplace).
const NB_MEMBRES = { 0: 'Aucun', 1: '1 membre', 2: 'Les 2' };
const AIDES = { exo: 'Exosquelette', bionique: 'Membre bionique' };
function texteMobilite(p) {
  const t = [];
  const bras = p.membresSup === 2 ? 'les deux bras' : 'un bras', jambes = p.membresInf === 2 ? 'les deux jambes' : 'une jambe';
  if (p.membresInf) {
    t.push(p.aideInf === 'exo'
      ? `Un exosquelette motorisé soutient ${jambes} depuis les hanches${p.membresInf === 2 ? ' (au quotidien, en fauteuil roulant si besoin)' : ''}`
      : `${p.membresInf === 2 ? 'Deux jambes bioniques remplacent' : 'Une jambe bionique remplace'} ${p.membresInf === 2 ? 'les jambes' : 'la jambe'}`);
  }
  if (p.membresSup) {
    t.push(p.aideSup === 'exo'
      ? `un exosquelette des épaules soutient ${bras}`
      : `${p.membresSup === 2 ? 'deux bras bioniques à pince remplacent les bras' : 'un bras bionique à pince remplace le bras'}`);
  }
  if (!t.length) return 'Tout l’équipage porte la même combinaison de l’ESA.';
  const phrase = t.join(' ; ');
  return phrase.charAt(0).toUpperCase() + phrase.slice(1) + ' : marcher, sauter, conduire le rover et ramasser des échantillons, comme tout l’équipage.';
}

const PROFIL_DEFAUT = { prenom: '', genre: 'aucun', carnation: 3, cheveux: 1, coiffure: 'courte', membresSup: 0, membresInf: 0, aideSup: 'bionique', aideInf: 'exo' };

let SPATIO = chargerSpatio();

function chargerSpatio() {
  try {
    const s = JSON.parse(localStorage.getItem(CLE_SPATIO));
    if (s) {
      // Profil de l'ancienne version (champ « corps ») : on le traduit.
      const anc = { fauteuil: { membresInf: 2, aideInf: 'exo' }, jambe: { membresInf: 1, aideInf: 'bionique' }, bras: { membresSup: 1, aideSup: 'bionique' } }[s.corps] || {};
      const p = { ...PROFIL_DEFAUT, ...s, ...anc, choisi: true };
      delete p.corps;
      return p;
    }
  } catch (e) { /* ignoré */ }
  return { ...PROFIL_DEFAUT, choisi: false };
}
function sauverSpatio() {
  try { localStorage.setItem(CLE_SPATIO, JSON.stringify(SPATIO)); } catch (e) { /* ignoré */ }
}

// Pour les messages : le prénom, sinon une formule adaptée au genre.
function nomSpatio() {
  if (SPATIO.prenom) return SPATIO.prenom;
  return (GENRES[SPATIO.genre] || GENRES.aucun).titre;
}
// Accord : « attaché » + acc() → attachée, attaché, attaché·e.
function acc() { return (GENRES[SPATIO.genre] || GENRES.aucun).accord; }
function emojiSpatio() { return (GENRES[SPATIO.genre] || GENRES.aucun).emoji; }
function resumeSpatio() {
  const p = SPATIO, d = [];
  if (p.membresSup) d.push(`${p.membresSup === 2 ? '2 bras' : '1 bras'} : ${AIDES[p.aideSup].toLowerCase()}`);
  if (p.membresInf) d.push(`${p.membresInf === 2 ? '2 jambes' : '1 jambe'} : ${AIDES[p.aideInf].toLowerCase()}`);
  return `${emojiSpatio()} ${p.prenom || 'Spationaute sans prénom'}` + (d.length ? ` · ${d.join(', ')}` : '');
}

// ---------- Page de création ----------
function afficherCreationSpatio(suite) {
  const el = $('ecran-spatio');
  const brouillon = { ...SPATIO };
  const pastilles = (nom, options, courant) => Object.entries(options).map(([k, l]) =>
    `<button type="button" class="choix-spatio ${k === courant ? 'choisie' : ''}" data-champ="${nom}" data-val="${k}">${typeof l === 'string' ? l : l.libelle}</button>`).join('');
  const nuancier = (nom, couleurs, courant) => couleurs.map((c, i) =>
    `<button type="button" class="nuance ${i === courant ? 'choisie' : ''}" data-champ="${nom}" data-val="${i}" style="background:${c}" aria-label="Teinte ${i + 1}"></button>`).join('');
  const rendu = () => {
    el.querySelector('.formulaire').innerHTML = `
      <label class="champ"><span>Prénom</span>
        <input id="spatio-prenom" maxlength="20" placeholder="Prénom (facultatif)" value="${brouillon.prenom.replace(/"/g, '&quot;')}"></label>
      <div class="champ"><span>Genre</span><div class="pastilles">${pastilles('genre', GENRES, brouillon.genre)}</div>
        <p class="doux">Il sert seulement aux accords dans les messages (attachée, attaché, attaché·e). L’apparence se choisit à part.</p></div>
      <div class="champ"><span>Carnation</span><div class="pastilles">${nuancier('carnation', CARNATIONS, brouillon.carnation)}</div></div>
      <div class="champ"><span>Coiffure</span><div class="pastilles">${pastilles('coiffure', COIFFURES, brouillon.coiffure)}</div></div>
      <div class="champ"><span>Couleur des cheveux</span><div class="pastilles">${nuancier('cheveux', COULEURS_CHEVEUX, brouillon.cheveux)}</div></div>
      <div class="champ"><span>Handicap des membres supérieurs</span><div class="pastilles">${pastilles('membresSup', NB_MEMBRES, String(brouillon.membresSup))}</div>
        ${brouillon.membresSup ? `<div class="pastilles aide">${pastilles('aideSup', AIDES, brouillon.aideSup)}</div>` : ''}</div>
      <div class="champ"><span>Handicap des membres inférieurs</span><div class="pastilles">${pastilles('membresInf', NB_MEMBRES, String(brouillon.membresInf))}</div>
        ${brouillon.membresInf ? `<div class="pastilles aide">${pastilles('aideInf', AIDES, brouillon.aideInf)}</div>` : ''}
        <p class="doux">${texteMobilite(brouillon)}</p></div>`;
    el.querySelectorAll('[data-champ]').forEach((b) => {
      b.onclick = () => {
        const v = b.dataset.val;
        brouillon[b.dataset.champ] = /^\d+$/.test(v) ? Number(v) : v;
        rendu();
      };
    });
    $('spatio-prenom').oninput = (e) => { brouillon.prenom = e.target.value.trim(); dessinerApercu(); };
    dessinerApercu();
  };
  const dessinerApercu = () => {
    const cv = $('apercu-spatio');
    const c = cv.getContext('2d');
    const W = (cv.width = cv.clientWidth || 420), H = (cv.height = cv.clientHeight || 300);
    const ancien = SPATIO;
    SPATIO = brouillon;   // le dessin lit le profil courant
    // Deux scènes : sur Terre (combinaison de vol ESA) et sur un astre (scaphandre).
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#7ec8f0'); g.addColorStop(1, '#d6efff');
    c.fillStyle = g; c.fillRect(0, 0, W / 2, H);
    c.fillStyle = '#05070f'; c.fillRect(W / 2, 0, W / 2, H);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (const e of ETOILES.slice(0, 60)) c.fillRect(W / 2 + e.x * W / 2, e.y * H * 0.7, e.r, e.r);
    c.fillStyle = '#5a9a3a'; c.fillRect(0, H - 40, W / 2, 40);
    c.fillStyle = '#9e9e9e'; c.fillRect(W / 2, H - 40, W / 2, 40);
    const s = (H - 80) / 2.1;
    dessinerSpationaute(c, W * 0.25, H - 40, s, { dir: 1, pas: 0.12 }, true);
    dessinerSpationaute(c, W * 0.75, H - 40, s, { dir: -1, pas: 0.12 }, false);
    c.fillStyle = '#10223a'; c.font = '13px system-ui, sans-serif'; c.textAlign = 'center';
    c.fillText('Sur Terre : combinaison ESA', W * 0.25, 20);
    c.fillStyle = '#dfe8ff'; c.fillText('Sur les astres : scaphandre', W * 0.75, 20);
    c.textAlign = 'left';
    SPATIO = ancien;
  };
  el.querySelector('.valider').onclick = () => {
    SPATIO = { ...brouillon, choisi: true };
    sauverSpatio();
    suite();
  };
  montrer('spatio');   // d'abord visible : le canevas prend sa vraie taille
  rendu();
  redessinerApercu = dessinerApercu;
}
let redessinerApercu = null;
window.addEventListener('resize', () => { if (redessinerApercu && !$('ecran-spatio').classList.contains('cache')) redessinerApercu(); });

// ---------- Dessin ----------
// (x, y) : pieds au sol ; s : pixels par mètre ; p : { dir, pas } ; surTerre : combinaison de vol, tête nue.
function dessinerSpationaute(ctx, x, y, s, p, surTerre) {
  const h = 1.8 * s;
  const prof = SPATIO;
  const peau = CARNATIONS[prof.carnation] || CARNATIONS[3];
  const phase = Math.sin((p.pas || 0) * 4.5);
  const tissu = surTerre ? '#1d4f91' : '#f2f2f2';         // bleu des combinaisons de vol ESA / blanc du scaphandre
  const tissuOmbre = surTerre ? '#163d72' : '#d5d8db';
  // Membres concernés : avec 1, c'est celui de devant ; avec 2, les deux.
  const nInf = prof.membresInf || 0, nSup = prof.membresSup || 0;
  const jambeTouchee = (devant) => nInf === 2 || (nInf === 1 && devant);
  const brasTouche = (devant) => nSup === 2 || (nSup === 1 && devant);
  const exoJambes = nInf > 0 && prof.aideInf === 'exo', exoBras = nSup > 0 && prof.aideSup === 'exo';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.dir || 1, 1);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const hanche = [0, -h * 0.45];
  const jambe = (sgn) => {
    const genou = [sgn * phase * h * 0.12, -h * 0.23], pied = [sgn * phase * h * 0.16, -h * 0.03];
    return { genou, pied };
  };
  const trait = (pts, coul, lw) => {
    ctx.strokeStyle = coul; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };
  const articulation = (q, r) => { ctx.fillStyle = '#ff8f00'; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(q[0], q[1], r * 0.45, 0, Math.PI * 2); ctx.fill(); };
  const led = (q, r) => { ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, Math.PI * 2); ctx.fill(); };
  // Jambe : humaine, bionique (prothèse robotisée), ou humaine soutenue par une attelle d'exosquelette.
  const dessinerJambe = (sgn, devant) => {
    const { genou, pied } = jambe(sgn);
    const touchee = jambeTouchee(devant);
    if (touchee && prof.aideInf === 'bionique') {
      trait([hanche, genou, pied], devant ? '#78909c' : '#5f7480', h * 0.06);
      trait([hanche, genou, pied], devant ? '#b0bec5' : '#8fa1ab', h * 0.025);
      articulation(genou, h * 0.026);
      led([genou[0] + h * 0.012, genou[1] - h * 0.04], h * 0.008);
      // Pied en lame de carbone
      ctx.fillStyle = '#263238';
      ctx.beginPath(); ctx.moveTo(pied[0] - h * 0.02, pied[1] - h * 0.02); ctx.quadraticCurveTo(pied[0] + h * 0.09, pied[1] - h * 0.01, pied[0] + h * 0.08, pied[1] + h * 0.025);
      ctx.lineTo(pied[0] - h * 0.03, pied[1] + h * 0.025); ctx.closePath(); ctx.fill();
      return;
    }
    trait([hanche, genou, pied], devant ? tissu : tissuOmbre, h * 0.11);
    // Chaussure / botte
    ctx.fillStyle = surTerre ? '#212121' : '#9e9e9e';
    ctx.beginPath(); ctx.ellipse(pied[0] + h * 0.03, pied[1] + h * 0.01, h * 0.065, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    if (touchee) {
      // Attelle : une barre graphite le long de la jambe, moteurs orange aux articulations.
      const dec = h * 0.035;
      trait([[hanche[0] + dec, hanche[1]], [genou[0] + dec, genou[1]], [pied[0] + dec, pied[1] - h * 0.02]], '#37474f', h * 0.025);
      articulation([genou[0] + dec, genou[1]], h * 0.028);
      articulation([pied[0] + dec, pied[1] - h * 0.03], h * 0.018);
    }
  };
  dessinerJambe(-1, false);

  // Bras : humain, bionique (à pince), ou humain soutenu par une attelle d'exosquelette.
  const epaule = [0, -h * 0.76];
  const brasPts = (sgn) => [epaule, [sgn * -phase * h * 0.1 + h * 0.05, -h * 0.57], [h * 0.09 + sgn * -phase * h * 0.04, -h * 0.46]];
  const dessinerBras = (sgn, devant) => {
    const pts = brasPts(sgn);
    const touche = brasTouche(devant);
    if (touche && prof.aideSup === 'bionique') {
      trait(pts, devant ? '#78909c' : '#5f7480', h * 0.05);
      trait(pts, devant ? '#b0bec5' : '#8fa1ab', h * 0.02);
      articulation(pts[0], h * 0.03);
      articulation(pts[1], h * 0.024);
      ctx.strokeStyle = '#546e7a'; ctx.lineWidth = h * 0.015;   // pince à deux doigts
      ctx.beginPath(); ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[2][0] + h * 0.03, pts[2][1] - h * 0.015);
      ctx.moveTo(pts[2][0], pts[2][1]); ctx.lineTo(pts[2][0] + h * 0.03, pts[2][1] + h * 0.015); ctx.stroke();
      led(pts[1], h * 0.008);
      return;
    }
    trait(pts, devant ? tissu : tissuOmbre, h * 0.075);
    ctx.fillStyle = surTerre ? peau : devant ? '#eceff1' : '#cfd3d6';     // main, ou gant
    ctx.beginPath(); ctx.arc(pts[2][0] + h * 0.01, pts[2][1], h * 0.03, 0, Math.PI * 2); ctx.fill();
    if (touche) {
      const dec = -h * 0.03;
      trait(pts.map(([px, py]) => [px, py + dec]), '#37474f', h * 0.02);
      articulation([pts[1][0], pts[1][1] + dec], h * 0.022);
    }
    if (devant && surTerre) { ctx.fillStyle = '#ffd600'; ctx.fillRect(-h * 0.02, -h * 0.79, h * 0.04, h * 0.012); }  // liseré d'épaule
  };
  dessinerBras(-1, false);

  // Sac de survie (scaphandre)
  if (!surTerre) {
    ctx.fillStyle = '#cfd8dc'; ctx.fillRect(-h * 0.21, -h * 0.84, h * 0.12, h * 0.36);
    ctx.fillStyle = '#90a4ae'; ctx.fillRect(-h * 0.21, -h * 0.84, h * 0.12, h * 0.04);
  }
  // Corps
  ctx.fillStyle = tissu;
  ctx.beginPath(); ctx.roundRect(-h * 0.11, -h * 0.83, h * 0.22, h * 0.42, h * 0.04); ctx.fill();
  if (surTerre) {
    // Combinaison de vol : fermeture, écusson ESA, drapeau européen à l'épaule.
    ctx.strokeStyle = '#0f2d55'; ctx.lineWidth = Math.max(0.5, h * 0.008);
    ctx.beginPath(); ctx.moveTo(h * 0.06, -h * 0.82); ctx.lineTo(h * 0.06, -h * 0.45); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(h * 0.02, -h * 0.7, h * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d4f91'; ctx.font = `bold ${Math.max(4, h * 0.03)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (h > 60) ctx.fillText('esa', h * 0.02, -h * 0.698);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#212121'; ctx.fillRect(-h * 0.11, -h * 0.47, h * 0.22, h * 0.03);   // ceinture
  } else {
    // Scaphandre : bandes bleues ESA, écusson, panneau de commande sur la poitrine.
    ctx.fillStyle = '#1d4f91'; ctx.fillRect(-h * 0.11, -h * 0.62, h * 0.22, h * 0.025);
    ctx.beginPath(); ctx.arc(-h * 0.03, -h * 0.74, h * 0.028, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-h * 0.03, -h * 0.74, h * 0.012, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b0bec5'; ctx.fillRect(h * 0.05, -h * 0.72, h * 0.07, h * 0.08);
    ctx.fillStyle = '#ef5350'; ctx.fillRect(h * 0.065, -h * 0.7, h * 0.015, h * 0.015);
    ctx.fillStyle = '#66bb6a'; ctx.fillRect(h * 0.09, -h * 0.7, h * 0.015, h * 0.015);
  }
  // Exosquelette : colonne et ceinture de hanches (jambes), harnais d'épaules (bras).
  ctx.fillStyle = '#37474f';
  if (exoJambes) {
    ctx.fillRect(-h * 0.13, -h * 0.84, h * 0.03, h * 0.42);
    ctx.fillRect(-h * 0.12, -h * 0.49, h * 0.24, h * 0.035);
    articulation([h * 0.035, -h * 0.47], h * 0.03);
  }
  if (exoBras) {
    ctx.fillRect(-h * 0.13, -h * 0.84, h * 0.03, h * 0.3);
    ctx.fillRect(-h * 0.12, -h * 0.81, h * 0.2, h * 0.025);
    articulation([h * 0.0, -h * 0.79], h * 0.026);
  }
  // Membre bionique de jambe : emboîture à la hanche.
  if (nInf > 0 && prof.aideInf === 'bionique') { ctx.fillStyle = '#546e7a'; ctx.beginPath(); ctx.arc(hanche[0], hanche[1], h * 0.04, 0, Math.PI * 2); ctx.fill(); }
  dessinerJambe(1, true);

  // Tête
  const tete = [h * 0.01, -h * 0.92];
  if (surTerre) {
    ctx.fillStyle = peau; ctx.fillRect(-h * 0.025, -h * 0.86, h * 0.05, h * 0.05);   // cou
    dessinerTete(ctx, tete[0], tete[1], h * 0.085, prof, peau);
  } else {
    // Casque : bulle, visage visible derrière la visière, pare-soleil doré relevé.
    ctx.fillStyle = '#fafafa'; ctx.beginPath(); ctx.arc(tete[0], tete[1], h * 0.125, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(tete[0] + h * 0.045, tete[1] + h * 0.005, h * 0.085, h * 0.095, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#263238'; ctx.fillRect(tete[0] - h * 0.1, tete[1] - h * 0.12, h * 0.25, h * 0.25);
    dessinerTete(ctx, tete[0] + h * 0.015, tete[1] + h * 0.01, h * 0.075, prof, peau);
    ctx.fillStyle = 'rgba(150,200,255,0.22)'; ctx.fillRect(tete[0] - h * 0.1, tete[1] - h * 0.12, h * 0.25, h * 0.25);
    ctx.fillStyle = 'rgba(255,190,40,0.85)'; ctx.fillRect(tete[0] - h * 0.1, tete[1] - h * 0.12, h * 0.25, h * 0.055);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(tete[0] + h * 0.08, tete[1] - h * 0.03, h * 0.015, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d4f91'; ctx.fillRect(tete[0] - h * 0.13, tete[1] - h * 0.02, h * 0.04, h * 0.05);   // lampes / caméra
  }

  // Bras avant
  dessinerBras(1, true);
  ctx.restore();
}

// Tête de profil (regard vers la droite) : visage, coiffure, œil, bouche.
function dessinerTete(ctx, cx, cy, r, prof, peau) {
  const ch = COULEURS_CHEVEUX[prof.cheveux] || COULEURS_CHEVEUX[1];
  const coif = prof.coiffure;
  // Derrière la tête
  ctx.fillStyle = ch;
  if (coif === 'longue') {
    ctx.beginPath(); ctx.ellipse(cx - r * 1.05, cy + r * 0.2, r * 0.3, r * 0.7, 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (coif === 'bouclee') {
    for (const [dx, dy, rr] of [[-0.35, -0.35, 0.8], [-0.7, 0.1, 0.6], [0.1, -0.6, 0.6], [-0.5, 0.5, 0.45]]) {
      ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (coif === 'tresses') {
    ctx.strokeStyle = ch; ctx.lineWidth = r * 0.28;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.8, cy); ctx.lineTo(cx - r * 0.95, cy + r * 1.6); ctx.stroke();
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(cx - r * 0.95, cy + r * 1.6, r * 0.14, 0, Math.PI * 2); ctx.fill();
  } else if (coif === 'foulard') {
    ctx.fillStyle = '#00897b';
    ctx.beginPath(); ctx.arc(cx - r * 0.1, cy - r * 0.05, r * 1.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - r * 1.1, cy + r * 0.3); ctx.lineTo(cx + r * 0.4, cy + r * 1.2); ctx.lineTo(cx - r * 0.8, cy + r * 1.4); ctx.fill();
  }
  // Visage
  ctx.fillStyle = peau;
  if (coif === 'foulard') { ctx.beginPath(); ctx.ellipse(cx + r * 0.25, cy + r * 0.08, r * 0.7, r * 0.82, 0, 0, Math.PI * 2); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
  // Nez
  ctx.beginPath(); ctx.moveTo(cx + r * 0.9, cy - r * 0.15); ctx.lineTo(cx + r * 1.12, cy + r * 0.15); ctx.lineTo(cx + r * 0.9, cy + r * 0.2); ctx.fill();
  // Cheveux sur le dessus
  ctx.fillStyle = ch;
  if (coif === 'rasee') {
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.02, Math.PI * 0.95, Math.PI * 1.9); ctx.fill();
    ctx.globalAlpha = 1;
  } else if (coif !== 'foulard') {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.08, Math.PI * 0.8, Math.PI * 1.92);
    ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.55, cx - r * 0.35, cy - r * 0.35);
    ctx.quadraticCurveTo(cx - r * 0.6, cy, cx - r * 0.75, cy + r * 0.5);
    ctx.closePath(); ctx.fill();
  }
  // Œil, sourcil, sourire
  ctx.fillStyle = '#1b1b1b';
  ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.12, Math.max(0.6, r * 0.11), 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,0.75)'; ctx.lineWidth = Math.max(0.5, r * 0.08);
  ctx.beginPath(); ctx.arc(cx + r * 0.6, cy + r * 0.35, r * 0.22, 0.2, Math.PI * 0.75); ctx.stroke();
}
