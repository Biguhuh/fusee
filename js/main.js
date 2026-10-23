'use strict';
// Boucle de jeu.
//  - Mission directe : hangar → carte → vol → résultat → hangar.
//  - Voyage : hangar → orbiteur (navigation) → descente → vol / exploration → retour à l'orbiteur.

const etat = { ...charger(), destination: null, ecran: 'hangar', vol: null, explo: null, pause: false, warp: 1, finDepuis: 0, enVoyage: false };
const canvas = $('vol');
const ctx = canvas.getContext('2d');
const toile = $('nav');
const ctxNav = toile.getContext('2d');
const touches = new Set();
const touchesBreves = new Set(); // appuis relâchés avant la prochaine image : comptent quand même une fois

const PALIERS_TEMPS = [1, 2, 5, 10, 50, 100, 1000];
const PAS_PHYSIQUE = 0.02; // s

function montrer(ecran) {
  etat.ecran = ecran;
  $('ecran-hangar').classList.toggle('cache', ecran !== 'hangar');
  $('ecran-carte').classList.toggle('cache', ecran !== 'carte');
  $('ecran-resultat').classList.toggle('cache', ecran !== 'resultat');
  canvas.classList.toggle('cache', ecran !== 'vol' && ecran !== 'explo');
  $('ecran-nav').classList.toggle('cache', ecran !== 'nav');
  Infos.infobulle(0, 0, null);
  window.scrollTo(0, 0);
}

function allerHangar() {
  afficherHangar(etat);
  $('voyage-reprendre').classList.toggle('cache', !etat.voyage);
  $('vers-carte').textContent = 'Mission directe : choisir la destination →';
  montrer('hangar');
}
function allerCarte() { afficherCarte(etat, choisirDestination); montrer('carte'); }
function choisirDestination(id) { etat.destination = id; afficherCarte(etat, choisirDestination); }

function lancer(options = {}) {
  const astre = ASTRES_PAR_ID[etat.destination];
  if (!astre) return;
  etat.vol = new Vol(astre, assemblerFusee(etat.equipement), options);
  etat.enVoyage = !!options.voyage;
  etat.warp = 1;
  etat.pause = false;
  etat.finDepuis = 0;
  touches.clear();
  redim();
  montrer('vol');
}

function finVol(r) {
  const rang = { pose: 1, orbite: 2, liberation: 2, plongee: 2 };
  if (rang[r.cause] && (rang[r.cause] > (rang[etat.records[r.astre.id]] || 0))) etat.records[r.astre.id] = r.cause;
  if (etat.enVoyage) {
    const v = etat.voyage;
    const reussi = ['orbite', 'liberation', 'plongee'].includes(r.cause);
    if (reussi) {
      // L'atterrisseur rejoint l'orbiteur : on refait son plein sur le réservoir de l'orbiteur.
      const besoin = r.fusee.carburant - r.carburantRestant;
      const pris = Math.min(besoin, Math.max(0, v.carburant - 1000));
      v.carburant -= pris;
      v.carburantAtt = r.carburantRestant + pris;
      Orbiteur.log(`Atterrisseur récupéré en orbite de ${r.astre.nom}${pris ? ` (plein : ${fmt(pris)} kg pris à l’orbiteur)` : ''}.`);
    } else {
      v.atterrisseurs = Math.max(0, v.atterrisseurs - 1);
      v.carburantAtt = null;
      Orbiteur.log(`Atterrisseur perdu sur ${r.astre.nom}. Il en reste ${v.atterrisseurs}.`);
    }
    v.visites[r.astre.id] = { ...(v.visites[r.astre.id] || {}), pose: r.dejaPose || r.cause === 'pose' };
  }
  sauver(etat);
  afficherResultat(r);
  $('vers-hangar').textContent = etat.enVoyage ? 'Retour à l’orbiteur' : 'Retour au hangar';
  $('rejouer').classList.toggle('cache', etat.enVoyage);
  montrer('resultat');
}

// ---------- Voyage (orbiteur) ----------
function allerNavigation() {
  if (!etat.voyage) etat.voyage = Orbiteur.nouveauVoyage();
  Orbiteur.charger(etat.voyage);
  Orbiteur.construireHud();
  if (!Orbiteur.camPlacee) { Orbiteur.centrerSur('orbiteur'); Orbiteur.camPlacee = true; }
  etat.pause = false;
  redim();
  montrer('nav');
}

Orbiteur.contexte = {
  equipement: () => etat.equipement,
  masque: () => etat.masque,
  basculerMasque: () => { etat.masque = !etat.masque; sauver(etat); },
  estEnPause: () => etat.pause,
  basculerPause: () => { etat.pause = !etat.pause; },
  hangar: () => { sauver(etat); allerHangar(); },
  descendre: (id) => {
    etat.destination = id;
    lancer({ voyage: true, carburant: etat.voyage.carburantAtt === null ? undefined : etat.voyage.carburantAtt });
  },
  journal: () => {
    const m = $('modale');
    m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>Journal de bord</h2></div><button class="fermer">✕</button></header>
      <ol class="journal">${etat.voyage.journal.slice().reverse().map((j) => `<li><span class="doux">${fmtDate(j.t)}</span> ${j.texte}</li>`).join('')}</ol></div>`;
    m.classList.remove('cache');
    m.querySelector('.fermer').onclick = () => Infos.fermer();
  },
  alerte: (texte) => { Orbiteur.messages.push({ texte, vie: 8 }); },
};

$('voyage-nouveau').onclick = () => {
  if (etat.voyage && !confirm('Recommencer un nouveau voyage ? Les stations et sondes actuelles seront perdues.')) return;
  etat.voyage = Orbiteur.nouveauVoyage();
  Orbiteur.camPlacee = false;
  sauver(etat);
  allerNavigation();
};
$('voyage-reprendre').onclick = allerNavigation;

// ---------- Informations ----------
Infos.contexte = {
  estEnPause: () => etat.pause,
  basculerPause: () => { etat.pause = !etat.pause; },
  masque: () => etat.masque,
  basculerMasque: () => { etat.masque = !etat.masque; sauver(etat); },
  actions: (a) => {
    const l = [];
    if (etat.ecran === 'nav') l.push(...Orbiteur.actionsPour(a));
    if (etat.ecran !== 'nav' && etat.ecran !== 'vol' && etat.ecran !== 'explo') {
      l.push({ texte: '🚀 Mission directe ici', action: () => { etat.destination = a.id; lancer(); } });
    }
    return l;
  },
  surFermeture: () => {},
};

function ouvrirFiche(id) {
  // La lecture met en pause ; un bouton de la fiche permet de relancer le mouvement.
  if (['vol', 'explo', 'nav'].includes(etat.ecran)) etat.pause = true;
  Infos.ouvrirFiche(id);
}

$('vers-carte').onclick = allerCarte;
$('retour-hangar').onclick = allerHangar;
$('lancer').onclick = () => lancer();
$('vers-hangar').onclick = () => (etat.enVoyage ? allerNavigation() : allerHangar());
$('rejouer').onclick = () => lancer();
document.querySelectorAll('.ouvrir-encyclo').forEach((b) => { b.onclick = () => Infos.ouvrirEncyclopedie(); });

// Souris : infobulle au survol des astres, fiche au clic.
function astreSousSouris(e) {
  if (etat.ecran === 'nav') return Orbiteur.astreSous(e.clientX, e.clientY);
  if (etat.ecran === 'vol' || etat.ecran === 'explo') return astreDuCielSous(e.clientX, e.clientY);
  return null;
}
let glisser = null;
for (const el of [canvas, toile]) {
  el.addEventListener('mousemove', (e) => {
    if (glisser && etat.ecran === 'nav') {
      const s = Orbiteur.cam.echelle;
      Orbiteur.cam.decal = [glisser.decal[0] - (e.clientX - glisser.x) / s, glisser.decal[1] + (e.clientY - glisser.y) / s];
      glisser.bouge = glisser.bouge || Math.hypot(e.clientX - glisser.x, e.clientY - glisser.y) > 4;
      return;
    }
    const id = astreSousSouris(e);
    if (etat.ecran === 'nav') Orbiteur.survole = id;
    el.style.cursor = id ? 'pointer' : etat.ecran === 'nav' ? 'grab' : 'default';
    Infos.infobulle(e.clientX, e.clientY, id);
  });
  el.addEventListener('mouseleave', () => { Infos.infobulle(0, 0, null); glisser = null; });
  el.addEventListener('mousedown', (e) => { if (etat.ecran === 'nav') glisser = { x: e.clientX, y: e.clientY, decal: Orbiteur.cam.decal.slice() }; });
  el.addEventListener('mouseup', (e) => {
    const bouge = glisser && glisser.bouge;
    glisser = null;
    if (bouge) return;
    const id = astreSousSouris(e);
    if (id) ouvrirFiche(id);
  });
  el.addEventListener('dblclick', (e) => { const id = astreSousSouris(e); if (id && etat.ecran === 'nav') Orbiteur.centrerSur(id); });
}
toile.addEventListener('wheel', (e) => { e.preventDefault(); Orbiteur.molette(e); }, { passive: false });

// ---------- Clavier ----------
const CODES_JEU = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];
const PLUS_GAZ = ['ArrowUp', 'KeyW'], MOINS_GAZ = ['ArrowDown', 'KeyS'];
const PAS_MANETTE = 0.05;      // un appui = 5 %
const VITESSE_MANETTE = 0.6;   // touche maintenue : 60 % par seconde

addEventListener('keydown', (e) => {
  if (Infos.estOuverte()) {
    if (e.code === 'Escape') Infos.fermer();
    return;
  }
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyI') { Infos.ouvrirEncyclopedie(); return; }
  if (etat.ecran === 'nav') {
    if (CODES_JEU.includes(e.code)) e.preventDefault();
    if (e.code === 'KeyP') etat.pause = !etat.pause;
    Orbiteur.touche(e);
    return;
  }
  if (etat.ecran === 'explo') {
    if (CODES_JEU.includes(e.code)) e.preventDefault();
    touches.add(e.code); touchesBreves.add(e.code);
    if (e.code === 'KeyE') etat.explo.agir();
    if (e.code === 'Escape') etat.explo.terminer('retour', 'Rappelé à bord.');
    if (e.code === 'KeyP') etat.pause = !etat.pause;
    return;
  }
  if (etat.ecran !== 'vol') return;
  if (CODES_JEU.includes(e.code)) e.preventDefault();
  touches.add(e.code);
  touchesBreves.add(e.code);
  const v = etat.vol;
  if (v.fin) return;
  // Toute commande manuelle reprend la main sur le pilote automatique.
  const manuel = [...PLUS_GAZ, ...MOINS_GAZ, 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyX', 'Space'].includes(e.code);
  if (manuel) v.autopilote = false;
  if (!e.repeat) {
    if (PLUS_GAZ.includes(e.code)) v.manette = Math.min(1, v.manette + PAS_MANETTE);
    if (MOINS_GAZ.includes(e.code)) v.manette = Math.max(0, v.manette - PAS_MANETTE);
  }
  if (e.code === 'KeyX') v.manette = 0;
  if (e.code === 'Space') v.manette = 1;
  if (e.code === 'KeyL') { v.autopilote = !v.autopilote; v.cibleX = null; v.tCible = -1; }
  if (e.code === 'KeyT') v.demanderDecollage();
  if ((e.code === 'KeyE' || e.code === 'KeyR') && v.pose && v.astre.type === 'solide') {
    etat.explo = new Exploration(v, e.code === 'KeyE' ? 'spationaute' : 'robot', etat.science);
    touches.clear();
    montrer('explo');
    return;
  }
  const max = v.astre.type === 'etoile' ? 1000 : 100;
  const i = PALIERS_TEMPS.indexOf(etat.warp);
  if (e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') etat.warp = Math.min(max, PALIERS_TEMPS[Math.min(PALIERS_TEMPS.length - 1, i + 1)]);
  if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus') etat.warp = PALIERS_TEMPS[Math.max(0, i - 1)];
  if (e.code === 'KeyP') etat.pause = !etat.pause;
  if (e.code === 'Enter') v.finirAuSol();
  if (e.code === 'Escape') v.abandonner();
});
addEventListener('keyup', (e) => touches.delete(e.code));
addEventListener('blur', () => touches.clear());

// ZQSD (AZERTY) et WASD (QWERTY) tombent sur les mêmes touches physiques.
function commandes() {
  const t = (code) => touches.has(code) || touchesBreves.has(code);
  return {
    gauche: t('ArrowLeft') || t('KeyA'),
    droite: t('ArrowRight') || t('KeyD'),
    saut: t('ArrowUp') || t('KeyW') || t('Space'),
  };
}

// Touche de gaz maintenue : la manette monte ou descend en continu (en temps réel).
function reglerManette(v, dt) {
  if (v.autopilote) return;
  const enfoncee = (codes) => codes.some((c) => touches.has(c));
  if (enfoncee(PLUS_GAZ)) v.manette = Math.min(1, v.manette + VITESSE_MANETTE * dt);
  if (enfoncee(MOINS_GAZ)) v.manette = Math.max(0, v.manette - VITESSE_MANETTE * dt);
}

function redim() {
  canvas.width = innerWidth; canvas.height = innerHeight;
  toile.width = innerWidth; toile.height = innerHeight;
}
addEventListener('resize', redim);

// Près du sol, le temps repasse en ×1 pour garder le contrôle.
function warpEffectif(v) {
  if (v.astre.type === 'solide' && v.altSol() < 1500 && !v.pose) return 1;
  return etat.warp;
}

function dessinerPause(c, W, H) {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#fff';
  c.font = 'bold 30px system-ui, sans-serif';
  c.textAlign = 'center';
  c.fillText('Pause', W / 2, H / 2);
  c.font = '14px system-ui, sans-serif';
  c.fillText('P pour reprendre', W / 2, H / 2 + 26);
  c.textAlign = 'left';
}

// ---------- Boucle ----------
let avant = performance.now();
let tSauvegarde = 0;
function boucle(t) {
  const dt = Math.min(0.05, (t - avant) / 1000);
  avant = t;
  if (etat.ecran === 'vol' && etat.vol) {
    const v = etat.vol;
    // Dès que la coque s'abîme, le temps repasse à ×1 pour laisser réagir.
    if (v.enDegats()) etat.warp = 1;
    const w = warpEffectif(v);
    if (!etat.pause && !v.fin) {
      reglerManette(v, dt);
      const total = dt * w;
      const n = Math.min(20000, Math.max(1, Math.ceil(total / PAS_PHYSIQUE)));
      const cmd = commandes();
      for (let i = 0; i < n && !v.fin; i++) v.step(total / n, cmd);
    }
    touchesBreves.clear();
    dessinerVol(ctx, v, canvas.width, canvas.height, etat.pause ? 0 : dt, w);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctx, canvas.width, canvas.height);
    if (v.fin) {
      etat.finDepuis += dt;
      if (etat.finDepuis > (v.fin.detruite ? 1.8 : 0.6)) finVol(v.fin);
    }
  } else if (etat.ecran === 'explo' && etat.explo) {
    const x = etat.explo;
    if (!etat.pause && !x.fin) {
      const cmd = commandes();
      const n = Math.max(1, Math.ceil(dt / PAS_PHYSIQUE));
      for (let i = 0; i < n && !x.fin; i++) x.step(dt / n, cmd);
    }
    touchesBreves.clear();
    x.dessiner(ctx, canvas.width, canvas.height, etat.pause ? 0 : dt);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctx, canvas.width, canvas.height);
    if (x.fin) {
      // Retour à la fusée posée.
      etat.vol.messageExplo = { texte: x.fin.texte, vie: 8 };
      if (etat.voyage && etat.enVoyage) etat.voyage.journal.push({ t: etat.voyage.t, texte: `${etat.vol.astre.nom} : ${x.fin.texte}` });
      sauver(etat);
      etat.explo = null;
      touches.clear();
      montrer('vol');
    }
  } else if (etat.ecran === 'nav' && etat.voyage) {
    Orbiteur.mettreAJour(dt, etat.pause);
    Orbiteur.dessiner(ctxNav, toile.width, toile.height);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctxNav, toile.width, toile.height);
    Orbiteur.majHud(false);
    if (t - tSauvegarde > 5000) { sauver(etat); tSauvegarde = t; }
  }
  requestAnimationFrame(boucle);
}

allerHangar();
requestAnimationFrame(boucle);
