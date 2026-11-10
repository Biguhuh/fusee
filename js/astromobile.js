'use strict';
// ---------- Astromobile : repliée contre le module, ou apportée par un cargo ----------
// Comme Apollo 15 à 17 : tant que ses améliorations sont au niveau 0 ou 1, elle voyage repliée contre le module
// et se déplie sur place (≈ 20 min : on tire sur les sangles). Plus lourde (niveau 2 et plus), elle arrive par
// un atterrisseur cargo parti de la station de l'astre, avant l'équipage, comme le prévoit Artemis.

const CLES_ROVER = ['batterieRover', 'caisseRover', 'moteurRover'];
const DUREE_DEPLIAGE_ROVER = 20 * 60;   // s, pour une personne (à deux, deux fois plus vite)
const MASSE_CARGO_ROVER = 3000;         // kg posés : atterrisseur cargo et astromobile, hors ergols
const VE_CARGO_ROVER = 3400;            // vitesse d'éjection des gaz (m/s), méthane et oxygène
const ECART_CARGO_ROVER = 150;          // m : le cargo se pose à côté du lieu choisi

// Niveau d'une amélioration de l'astromobile. Hors campagne (visite rapide), celui atteint dans la campagne.
// Repliée, elle n'emporte que les améliorations de niveau 1 (version légère).
function nivAstromobile(cle, mode) {
  const n = niveauAmelio(cle, (typeof etat !== 'undefined' && etat.voyage) || null);
  return mode === 'replie' ? Math.min(1, n) : n;
}
function niveauAstromobile() { return Math.max(...CLES_ROVER.map((k) => nivAstromobile(k))); }
function nivVisuelAstromobile(mode) {
  const n = nivVehicules();
  for (const k of CLES_ROVER) n[k] = nivAstromobile(k, mode);
  return n;
}
// Une astromobile n'a de sens que sur un sol où elle roule (pas sur un astre minuscule où l'on reste au câble).
function astromobilePossible(a) { return a.type !== 'gazeuse' && a.type !== 'etoile' && !AEROSTAT[a.id] && vitesseLiberation(a, 0) >= 4.4; }
// Ergols du cargo : descendre de l'orbite basse (≈ 1,1 fois la vitesse orbitale), équation de Tsiolkovski.
function ergolsCargoRover(a) {
  const dv = 1.1 * vitesseOrbitale(a, 0);
  return Math.round((MASSE_CARGO_ROVER * (Math.exp(dv / VE_CARGO_ROVER) - 1)) / 100) * 100;
}
// Astromobile laissée lors d'une mission précédente, la plus proche du point x (à moins de 2 km), ou null.
function astromobileProche(v, a, x) {
  if (!v || x === undefined || x === null) return null;
  let best = null;
  for (const m of v.astromobiles || []) {
    if (m.astre !== a.id) continue;
    const d = distSol(a, m.x, x);
    if (d <= DISTANCE_REEMPLOI_ROVER && (!best || d < best.d)) best = { m, d };
  }
  return best;
}
function fmtDistanceSol(d) { return d < 1000 ? `${fmt(d)} m` : `${fmt(d / 1000, 1)} km`; }

// Avant la descente : avec ou sans astromobile, et comment elle vient. suite(mode) : 'cargo', 'replie' ou 'sans'.
function ouvrirChoixAstromobile(v, a, site, suite) {
  const n = niveauAstromobile();
  const st = stationSur(v, a.id);
  const ergols = ergolsCargoRover(a), prix = TARIFS.materiel.cargoRover.prix;
  const cargoOk = n >= 2 && st && ((st.stock || {}).ergols || 0) >= ergols;
  const proche = site ? astromobileProche(v, a, site.x) : null;
  const choix = [];
  if (n >= 2) {
    const pourquoi = !st ? `il faut une station ${enOrbite(a)} pour l’envoyer` : !cargoOk ? `${le(st)} n’a que ${fmtStock('ergols', (st.stock || {}).ergols || 0)} d’ergols, il en faut ${fmtStock('ergols', ergols)}` : '';
    choix.push({ id: 'cargo', ok: !!cargoOk, titre: `🚀 Apportée par un cargo (niveau ${n})`,
      texte: cargoOk ? `Un atterrisseur cargo part ${de(st)} avant vous et se pose à côté du lieu choisi : ${fmtStock('ergols', ergols)} d’ergols pris au stock, ${fmtEuros(prix)}.` : `Impossible : ${pourquoi}.` });
  }
  choix.push({ id: 'replie', ok: true, titre: n >= 2 ? '📦 Repliée contre le module (version légère, niveau 1)' : `📦 Repliée contre le module${n ? ' (niveau 1)' : ''}`,
    texte: `Elle se déplie sur place en ≈ 20 min : restez à côté d’elle (à deux, deux fois plus vite).${n >= 2 ? ' Trop lourde au niveau 2 : seules les améliorations de niveau 1 voyagent repliées.' : ''}` });
  choix.push({ id: 'sans', ok: true, titre: '🚶 Sans astromobile',
    texte: proche ? `Celle laissée lors d’une mission précédente attend à ${fmtDistanceSol(proche.d)} du lieu choisi (batterie ${fmtDuree(proche.m.batterie)}) : on la retrouvera.` : 'On explore à pied.' });
  const defaut = proche ? 'sans' : cargoOk ? 'cargo' : 'replie';
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🚙 Astromobile ${sur(a)}</h2>
    <p>Comme pour Apollo, elle reste sur place au départ : si l’on revient se poser à moins de 2 km, on la retrouve.</p></div><button class="fermer">✕</button></header>
    <section>${choix.map((c) => `<label class="choix-ravito"><input type="radio" name="rover-desc" value="${c.id}" ${c.id === defaut ? 'checked' : ''} ${c.ok ? '' : 'disabled'}>
      <b>${c.titre}</b><br><span class="doux">${c.texte}</span></label>`).join('')}</section>
    <div class="actions"><button id="rover-ok" class="principal">⬇ Descendre</button></div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  $('rover-ok').onclick = () => {
    const c = m.querySelector('input[name=rover-desc]:checked');
    Infos.fermer();
    suite(c ? c.value : defaut);
  };
}

// Le cargo part de la station : ergols du stock, coût, et le point où il se posera.
function envoyerCargoRover(v, a, site) {
  const st = stationSur(v, a.id), e = ergolsCargoRover(a), prix = TARIFS.materiel.cargoRover.prix;
  if (!st) return null;
  st.stock.ergols = Math.max(0, (st.stock.ergols || 0) - e);
  depenser(v, 'materiel', `Atterrisseur cargo : astromobile ${sur(a)}`, prix);
  Orbiteur.log(`🚀 ${Le(st)} envoie l’astromobile ${sur(a)} par un atterrisseur cargo (${fmtStock('ergols', e)} d’ergols du stock, ${fmtEuros(prix)}). Il se pose à côté du lieu choisi, avant vous.`);
  return { x: site ? site.x + ECART_CARGO_ROVER : null };
}

Object.assign(Exploration.prototype, {
  // Dépliage : il avance quand quelqu'un se tient à côté d'elle, à pied (à deux, deux fois plus vite).
  deplierRover(dt) {
    const r = this.rover, p = this.p, pres = (x) => distSol(this.astre, x, r.x) < 4;
    let n = !this.enRover && p.auSol && pres(p.x) ? 1 : 0;
    const d = this.duo;
    if (d && !d.enRover && !d.dansModule && !d.dansSecours && pres(d.p.x)) n++;
    if (!n) return;
    const avant = r.deplie;
    r.deplie = Math.min(1, r.deplie + (n * dt) / DUREE_DEPLIAGE_ROVER);
    if (avant === 0) this.dire(`📦 Dépliage de l’astromobile : on tire sur les sangles, les roues et le châssis se déploient${n > 1 ? ' (à deux)' : ''}.`);
    if (r.deplie >= 1) this.dire('🚙 Astromobile dépliée : roues, sièges et antenne en place. Montez dedans (V).');
  },
});

// Astromobile repliée (k : 0 repliée, 1 dépliée) : les deux moitiés du châssis relevées contre le module,
// roues rabattues, qui s'abaissent à mesure qu'on la déplie.
function dessinerRoverReplie(ctx, x, y, s, k, dir = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir || 1, 1);
  const a = (1 - k) * 1.35, piv = -0.55 * s;
  for (const sg of [-1, 1]) {
    ctx.save();
    ctx.translate(0, piv);
    ctx.rotate(-sg * a);
    ctx.fillStyle = '#cfd8dc'; ctx.fillRect(sg > 0 ? 0 : -1.5 * s, -0.12 * s, 1.5 * s, 0.25 * s);
    ctx.fillStyle = '#ffb300'; ctx.fillRect(sg > 0 ? 0.9 * s : -1.5 * s, -0.12 * s, 0.6 * s, 0.1 * s);
    ctx.fillStyle = '#37474f'; ctx.beginPath(); ctx.arc(sg * 1.1 * s, 0.15 * s, 0.4 * s * (0.55 + 0.45 * k), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Sangles tendues tant qu'elle n'est pas dépliée
  if (k < 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-0.3 * s, piv); ctx.lineTo(-0.9 * s, 0); ctx.moveTo(0.3 * s, piv); ctx.lineTo(0.9 * s, 0); ctx.stroke();
  }
  ctx.restore();
}

// Atterrisseur cargo posé (pont sur quatre pieds, réservoirs, isolant doré, rampe de descente de l'astromobile).
function dessinerCargoRover(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#b0bec5'; ctx.lineWidth = Math.max(1.5, 0.12 * s);
  ctx.beginPath();
  ctx.moveTo(-2.4 * s, 0); ctx.lineTo(-1.5 * s, -1.7 * s);
  ctx.moveTo(2.4 * s, 0); ctx.lineTo(1.5 * s, -1.7 * s);
  ctx.moveTo(-1.2 * s, 0); ctx.lineTo(-0.9 * s, -1.7 * s);
  ctx.moveTo(1.2 * s, 0); ctx.lineTo(0.9 * s, -1.7 * s);
  ctx.stroke();
  ctx.fillStyle = '#eceff1';
  for (const tx of [-0.9, 0.9]) { ctx.beginPath(); ctx.arc(tx * s, -3.1 * s, 0.65 * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#cfd8dc'; ctx.fillRect(-1.9 * s, -2.5 * s, 3.8 * s, 0.85 * s);
  ctx.fillStyle = '#ffb300'; ctx.fillRect(-1.9 * s, -1.75 * s, 3.8 * s, 0.12 * s);
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = Math.max(1, 0.08 * s);
  ctx.beginPath(); ctx.moveTo(1.9 * s, -1.7 * s); ctx.lineTo(3.6 * s, 0); ctx.stroke();   // rampe
  ctx.restore();
}
