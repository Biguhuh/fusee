'use strict';
// Prototype : un vol sur la Lune avec l'équipement par défaut. R pour recommencer.

const canvas = document.getElementById('vol');
const ctx = canvas.getContext('2d');
const touches = new Set();
let vol = new Vol(ASTRES_PAR_ID.lune, assemblerFusee(equipementParDefaut()));

function redim() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', redim);
redim();

addEventListener('keydown', (e) => {
  touches.add(e.code);
  if (e.code === 'KeyR') vol = new Vol(ASTRES_PAR_ID.lune, assemblerFusee(equipementParDefaut()));
  if (e.code === 'Enter') vol.finirAuSol();
});
addEventListener('keyup', (e) => touches.delete(e.code));

function commandes() {
  return {
    haut: touches.has('ArrowUp') || touches.has('KeyW') || touches.has('Space'),
    bas: touches.has('ArrowDown') || touches.has('KeyS'),
    gauche: touches.has('ArrowLeft') || touches.has('KeyA'),
    droite: touches.has('ArrowRight') || touches.has('KeyD'),
  };
}

let avant = performance.now();
function boucle(t) {
  const dt = Math.min(0.05, (t - avant) / 1000);
  avant = t;
  const n = Math.ceil(dt / 0.02);
  for (let i = 0; i < n; i++) vol.step(dt / n, commandes());
  dessinerVol(ctx, vol, canvas.width, canvas.height, dt, 1);
  if (vol.fin) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(vol.fin.detruite ? 'Détruite : ' + vol.fin.cause : 'Réussite : ' + vol.fin.cause, canvas.width / 2, canvas.height / 2);
    ctx.font = '16px system-ui';
    ctx.fillText('R pour recommencer', canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
  }
  requestAnimationFrame(boucle);
}
requestAnimationFrame(boucle);
