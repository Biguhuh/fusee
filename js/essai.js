'use strict';
// Centre d'essai, sur Terre : on apprend à conduire l'astromobile, à piloter le robot et le drone, sans risque.
// Rien n'est pris à la campagne ; l'oxygène ne baisse pas. Chaque exercice est une liste d'objectifs, cochés
// l'un après l'autre. Les exercices réussis sont gardés (etat.essais).

const PLOT_ESSAI = 120;          // m : le plot orange de l'exercice d'astromobile
const DISTANCE_DRONE = 200;      // m : la distance à parcourir en drone

// Objectifs : [texte, test(engin, essai)]. Un objectif n'est testé qu'une fois les précédents réussis.
const ESSAIS = {
  astromobile: {
    titre: '🚙 Astromobile', resume: 'Monter à bord, rouler jusqu’au plot, revenir, descendre, sauter, ramasser un échantillon.',
    objectifs: [
      ['Monter dans l’astromobile : approchez-vous d’elle (à gauche du module) et appuyez sur V', (x) => x.enRover],
      [`Rouler jusqu’au plot orange, à ${PLOT_ESSAI} m (→)`, (x, e) => x.enRover && distSol(x.astre, x.p.x, e.plot) < 5],
      ['Revenir au module en astromobile (←)', (x) => x.enRover && distSol(x.astre, x.p.x, x.xFusee) < 12],
      ['Descendre de l’astromobile (V)', (x) => !x.enRover],
      ['Sauter (↑, Z ou Espace)', (x, e) => x.dernierSaut !== e.refSaut && x.dernierSaut > 0],
      ['Ramasser un échantillon : approchez-vous d’un caillou jaune et appuyez sur E', (x) => x.sac.length + x.sacRover.length > 0],
    ],
    fin: 'Exercice réussi ! Échap pour revenir au centre d’essai (ou continuez à rouler).',
  },
  robot: {
    titre: '🤖 Robot', resume: 'Rouler jusqu’à un site, l’analyser, revenir transmettre les données, rappeler le robot.',
    objectifs: [
      ['Rouler jusqu’au caillou jaune le plus proche (→ ou ←)', (x) => x.sites.some((s) => distSol(x.astre, s.x, x.p.x) < 3)],
      ['L’analyser : appuyez sur E (l’analyse dure 5 secondes)', (x) => x.donneesEnAttente > 0],
      ['Revenir au module et transmettre les données (E près du module)', (x, e) => ((x.science.terre || {}).analyses || 0) > e.refAnalyses],
    ],
    fin: 'Exercice réussi ! Échap pour rappeler le robot et revenir au centre d’essai.',
  },
  drone: {
    titre: '🚁 Drone', resume: 'Décoller, voler 200 m sans monter trop haut, se poser en douceur.',
    objectifs: [
      ['Décoller : mettez les gaz (↑ ou Z) jusqu’à 20 m d’altitude', (v) => v.altSol() > 20],
      [`Voler ${DISTANCE_DRONE} m vers la droite (inclinez avec →), en restant sous 60 m`, (v, e) => v.x - e.x0 > DISTANCE_DRONE],
      ['Se poser en douceur (réduisez les gaz, vitesse de contact sous 2 m/s)', (v) => v.pose && !v.fin],
    ],
    fin: 'Exercice réussi ! Échap pour revenir au centre d’essai.',
  },
};

// ---------- Fenêtre du centre d'essai ----------
function ouvrirCentreEssai(message) {
  const m = $('modale'), faits = etat.essais || {};
  const carte = ([cle, e]) => `<article class="carte-essai ${faits[cle] ? 'fait' : ''}">
      <h3>${e.titre}${faits[cle] ? ' <span class="doux">✅ réussi</span>' : ''}</h3>
      <p class="doux">${e.resume}</p>
      <ol>${e.objectifs.map(([t]) => `<li>${t}</li>`).join('')}</ol>
      <button data-essai="${cle}" class="${faits[cle] ? '' : 'principal'}">${faits[cle] ? '↺ Refaire' : '▶ Commencer'}</button></article>`;
  m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>🎓 Centre d’essai</h2>
    <p>Sur Terre, sans risque : apprenez à conduire l’astromobile, à piloter le robot et le drone avant de partir. L’oxygène ne baisse pas, rien n’est pris à la campagne.</p>
    ${message ? `<p class="encart">${message}</p>` : ''}</div><button class="fermer">✕</button></header>
    <div class="cartes-essai">${Object.entries(ESSAIS).map(carte).join('')}</div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  m.querySelectorAll('[data-essai]').forEach((b) => { b.onclick = () => { Infos.fermer(); lancerEssai(b.dataset.essai); }; });
}

function lancerEssai(cle) {
  const terre = ASTRES_PAR_ID.terre;
  etat.destination = 'terre';
  etat.enVoyage = false;
  etat.warp = 1;
  etat.pause = false;
  const essai = { cle, etape: 0, fait: false };
  if (cle === 'drone') {
    const v = new Vol(terre, fuseeDrone(terre), { depuisSol: true });
    v.droneSeul = true; v.equipier = null; v.essai = essai;
    essai.x0 = v.x;
    v.messageExplo = { texte: '🎓 Centre d’essai : le drone. Suivez les objectifs en haut de l’écran.', vie: 6 };
    etat.vol = v; etat.explo = null;
    touches.clear(); redim(); montrer('vol');
    return;
  }
  etat.vol = new Vol(terre, megaFusee(), { depuisSol: true });
  etat.vol.essai = essai;
  const x = new Exploration(etat.vol, cle === 'robot' ? 'robot' : 'spationaute', etat.science, { essai: true });
  x.essai = essai;
  essai.plot = x.xFusee + PLOT_ESSAI;
  essai.refSaut = x.dernierSaut;
  essai.refAnalyses = ((x.science.terre || {}).analyses) || 0;
  x.message = ''; x.fileMessages = [];
  x.dire(`🎓 Centre d’essai : ${ESSAIS[cle].titre}. Suivez les objectifs en haut de l’écran.`);
  etat.explo = x;
  touches.clear(); redim(); montrer('explo');
}

// Appelé à chaque image : coche l'objectif en cours s'il est atteint.
function majEssai(engin) {
  const e = engin.essai, def = ESSAIS[e.cle];
  if (!e || e.fait) return;
  const [texte, test] = def.objectifs[e.etape];
  if (!test(engin, e)) return;
  e.etape++;
  if (e.cle === 'astromobile' && e.etape === 4) e.refSaut = engin.dernierSaut;   // le saut compte à partir d'ici
  const dire = (t) => (engin.dire ? engin.dire(t) : (engin.messageExplo = { texte: t, vie: 6 }));
  if (e.etape >= def.objectifs.length) {
    e.fait = true;
    etat.essais = { ...(etat.essais || {}), [e.cle]: true };
    sauver(etat);
    dire(`✅ ${def.fin}`);
  } else dire(`✅ ${texte.split(' :')[0].split(' (')[0]}. Suivant : ${def.objectifs[e.etape][0]}`);
}

// Fin de l'exercice (Échap, crash, rappel) : retour à l'accueil, fenêtre du centre d'essai.
function finEssai(e, texte) {
  const def = ESSAIS[e.cle];
  etat.explo = null; etat.vol = null;
  allerAccueil();
  ouvrirCentreEssai(e.fait ? `✅ ${def.titre} : exercice réussi.` : `${def.titre} : exercice interrompu${texte ? ` (${texte})` : ''}. Vous pouvez le reprendre.`);
}

// Panneau des objectifs, en haut au centre.
function dessinerPanneauEssai(ctx, W, H, e) {
  const def = ESSAIS[e.cle];
  // À droite, sous les boutons du temps, pour ne pas cacher le tableau de bord (à gauche).
  const w = Math.max(240, Math.min(520, W - 270)), x0 = W - w - 14, y0 = 56, lh = 18;
  ctx.save();
  ctx.fillStyle = 'rgba(7,10,20,0.82)';
  ctx.fillRect(x0, y0, w, 26 + def.objectifs.length * lh);
  ctx.font = '600 13px system-ui, sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = '#ffcc80';
  ctx.fillText(`🎓 Centre d’essai · ${def.titre}${e.fait ? ' · ✅ réussi' : ''}`, x0 + 10, y0 + 6);
  ctx.font = '12px system-ui, sans-serif';
  def.objectifs.forEach(([t], i) => {
    ctx.fillStyle = i < e.etape ? '#81c784' : i === e.etape ? '#ffffff' : '#78909c';
    let ligne = `${i < e.etape ? '✅' : i === e.etape ? '▶' : '·'} ${t}`;
    while (ctx.measureText(ligne).width > w - 20 && ligne.length > 10) ligne = ligne.slice(0, -2);
    ctx.fillText(ligne, x0 + 10, y0 + 24 + i * lh);
  });
  ctx.restore();
}

// Le plot orange de l'exercice d'astromobile.
function dessinerPlotEssai(ctx, versEcran, x, echelle) {
  const e = x.essai;
  if (!e || e.cle !== 'astromobile') return;
  const [px, py] = versEcran(e.plot, x.sol(e.plot));
  ctx.fillStyle = '#ff6d00';
  ctx.beginPath(); ctx.moveTo(px - 0.35 * echelle, py); ctx.lineTo(px, py - 1 * echelle); ctx.lineTo(px + 0.35 * echelle, py); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(px - 0.18 * echelle, py - 0.55 * echelle, 0.36 * echelle, 0.12 * echelle);
  texteSurFond(ctx, `Plot · ${PLOT_ESSAI} m`, px, py - 1.4 * echelle, { police: '12px system-ui, sans-serif', couleur: '#ffcc80' });
}
