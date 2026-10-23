'use strict';
// Boucle de jeu : hangar → carte → vol → résultat → hangar.

const etat = { ...charger(), destination: null, ecran: 'hangar', vol: null, pause: false, warp: 1, finDepuis: 0 };
const canvas = $('vol');
const ctx = canvas.getContext('2d');
const touches = new Set();
const touchesBreves = new Set(); // appuis relâchés avant la prochaine image : comptent quand même une fois

const PALIERS_TEMPS = [1, 2, 5, 10, 50, 100, 1000];
const PAS_PHYSIQUE = 0.02; // s

function montrer(ecran) {
  etat.ecran = ecran;
  $('ecran-hangar').classList.toggle('cache', ecran !== 'hangar');
  $('ecran-carte').classList.toggle('cache', ecran !== 'carte');
  $('ecran-resultat').classList.toggle('cache', ecran !== 'resultat');
  canvas.classList.toggle('cache', ecran !== 'vol');
  window.scrollTo(0, 0);
}

function allerHangar() { afficherHangar(etat); montrer('hangar'); }
function allerCarte() { afficherCarte(etat, choisirDestination); montrer('carte'); }
function choisirDestination(id) { etat.destination = id; afficherCarte(etat, choisirDestination); }

function lancer() {
  const astre = ASTRES_PAR_ID[etat.destination];
  if (!astre) return;
  etat.vol = new Vol(astre, assemblerFusee(etat.equipement));
  etat.warp = 1;
  etat.pause = false;
  etat.finDepuis = 0;
  touches.clear();
  redim();
  montrer('vol');
}

function finVol(r) {
  const rang = { pose: 1, retour: 2, plongee: 2 };
  if (rang[r.cause] && (rang[r.cause] > (rang[etat.records[r.astre.id]] || 0))) {
    etat.records[r.astre.id] = r.cause;
    sauver(etat);
  }
  afficherResultat(r);
  montrer('resultat');
}

$('vers-carte').onclick = allerCarte;
$('retour-hangar').onclick = allerHangar;
$('lancer').onclick = lancer;
$('vers-hangar').onclick = allerHangar;
$('rejouer').onclick = lancer;

// ---------- Clavier ----------
const CODES_JEU = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
addEventListener('keydown', (e) => {
  if (etat.ecran !== 'vol') return;
  if (CODES_JEU.includes(e.code)) e.preventDefault();
  touches.add(e.code);
  touchesBreves.add(e.code);
  const v = etat.vol;
  const max = v.astre.type === 'etoile' ? 1000 : 100;
  const i = PALIERS_TEMPS.indexOf(etat.warp);
  if (e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') etat.warp = Math.min(max, PALIERS_TEMPS[Math.min(PALIERS_TEMPS.length - 1, i + 1)]);
  if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Digit6' || e.code === 'Minus') etat.warp = PALIERS_TEMPS[Math.max(0, i - 1)];
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
    haut: t('ArrowUp') || t('KeyW') || t('Space'),
    bas: t('ArrowDown') || t('KeyS'),
    gauche: t('ArrowLeft') || t('KeyA'),
    droite: t('ArrowRight') || t('KeyD'),
  };
}

function redim() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener('resize', redim);

// Près du sol, le temps repasse en ×1 pour garder le contrôle.
function warpEffectif(v) {
  if (v.astre.type === 'solide' && v.y < 1500 && !v.pose) return 1;
  return etat.warp;
}

// ---------- Boucle ----------
let avant = performance.now();
function boucle(t) {
  const dt = Math.min(0.05, (t - avant) / 1000);
  avant = t;
  if (etat.ecran === 'vol' && etat.vol) {
    const v = etat.vol;
    const w = warpEffectif(v);
    if (!etat.pause && !v.fin) {
      const total = dt * w;
      const n = Math.min(20000, Math.max(1, Math.ceil(total / PAS_PHYSIQUE)));
      const cmd = commandes();
      for (let i = 0; i < n && !v.fin; i++) v.step(total / n, cmd);
    }
    touchesBreves.clear();
    dessinerVol(ctx, v, canvas.width, canvas.height, etat.pause ? 0 : dt, w);
    if (etat.pause) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Pause', canvas.width / 2, canvas.height / 2);
      ctx.textAlign = 'left';
    }
    if (v.fin) {
      etat.finDepuis += dt;
      if (etat.finDepuis > (v.fin.detruite ? 1.8 : 0.6)) finVol(v.fin);
    }
  }
  requestAnimationFrame(boucle);
}

allerHangar();
requestAnimationFrame(boucle);
