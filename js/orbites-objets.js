'use strict';
// ---------- Orbites modifiées des objets artificiels ----------
// Un objet artificiel peut changer d'orbite : poussé par le jet des moteurs de l'orbiteur tout près, ou
// volontairement, une fois à côté (comme la remontée de Hubble étudiée par SpaceX et la NASA en 2022).
// La nouvelle orbite est gardée dans la campagne (v.orbitesObjets) et remise à chaque chargement.
// (Sa gravité, elle, ne le déplace presque pas : quelques centaines de tonnes à 1,5 km, ≈ 10⁻¹¹ m/s².)
const DIST_OBJET_PROCHE = 3;      // km : l'orbiteur est « à côté » (fin du rendez-vous)
const SOUFFLE_MOTEURS = 0.002;    // part du Δv de l'orbiteur transmise à un objet pris dans le jet, à bout portant

// Éléments d'orbite (format des astres) d'après une position et une vitesse relatives à un centre, à l'instant t.
// null si l'orbite n'est pas fermée.
function orbiteDepuisEtat(centreId, r, vv, t) {
  const mu = ASTRES_PAR_ID[centreId].gm, el = elements(r, vv, mu);
  if (!(el.e < 0.99) || !(el.a > 0)) return null;
  const rn = V.norm(r), v2 = V.dot(vv, vv), rv = V.dot(r, vv);
  const ev = V.mul(V.sub(V.mul(r, v2 - mu / rn), V.mul(vv, rv)), 1 / mu);   // vecteur excentricité
  const retro = el.h < 0, w = Math.atan2(ev[1], ev[0]);
  const rp = V.rot(r, -w), nu = Math.atan2(retro ? -rp[1] : rp[1], rp[0]);
  const E = Math.atan2(Math.sqrt(1 - el.e * el.e) * Math.sin(nu), el.e + Math.cos(nu));
  const M = E - el.e * Math.sin(E), nRad = Math.sqrt(mu / el.a ** 3);
  const M0 = ((((M - nRad * t) / DEG) % 360) + 360) % 360;
  return { centre: centreId, a: el.a, e: el.e, varpi: w / DEG, M0, n: (nRad / DEG) * JOUR, retro };
}
// Remet les orbites d'une campagne (chaque objet garde son orbite d'origine dans orbiteOrigine).
function appliquerOrbitesObjets(v) {
  for (const a of ASTRES) {
    if (!a.artificiel || !a.orbite) continue;
    if (!a.orbiteOrigine) a.orbiteOrigine = a.orbite;
    a.orbite = (v && v.orbitesObjets && v.orbitesObjets[a.id]) || a.orbiteOrigine;
  }
  cacheT = NaN;   // positions en cache à recalculer
}
// Texte court d'une orbite : périgée et apogée autour d'une planète, distance autour du Soleil.
function decrireOrbiteObjet(o) {
  const c = ASTRES_PAR_ID[o.centre];
  if (c.type === 'etoile') return `${fmt(o.a / UA_KM, 4)} UA du Soleil, excentricité ${fmt(o.e, 3)}`;
  return `${fmtAlt((o.a * (1 - o.e) - c.rayonKm) * 1000)} × ${fmtAlt((o.a * (1 + o.e) - c.rayonKm) * 1000)} d’altitude`;
}
// Ce que deviendrait l'objet après dv (km/s) : { o, parti } ou { o, chute: { dt, cause } } ou { o }.
function evaluerPoussee(v, a, dv) {
  const s = etatRelatif(a, v.t), c = ASTRES_PAR_ID[a.orbite.centre], nv = V.add(s.v, dv);
  const o = orbiteDepuisEtat(a.orbite.centre, s.r, nv, v.t);
  if (!o) return { parti: true, etat: { r: s.r, v: nv } };
  const rp = o.a * (1 - o.e), sol = c.type === 'etoile' ? c.rayonKm : c.rayonKm + (c.atm ? 150 : 10);
  if (rp >= sol) return { o };
  // Il descend jusqu'à son périgée : il touche l'atmosphère (ou le sol, ou le Soleil) avant.
  const nRad = (o.n * DEG) / JOUR, M = ((((o.M0 * DEG + nRad * v.t) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
  const dt = Math.max(60, (2 * Math.PI - M) / nRad);
  return { o, chute: { dt, cause: c.type === 'etoile' ? 'soleil' : c.atm ? 'atmosphere' : 'sol' } };
}
// futur : « retombera » plutôt que « retomberait ».
function texteChute(a, c, cause, futur = false) {
  const t = futur ? 'a' : 'ait';
  if (cause === 'soleil') return `${le(a)} plonger${t} dans le Soleil`;
  return cause === 'atmosphere' ? `${le(a)} retomber${t} dans l’atmosphère ${de(c)}` : `${le(a)} s’écraser${t} ${sur(c)}`;
}
// Change la vitesse d'un objet de dv (km/s, repère de son centre). libre : sans garde-fous (on peut le perdre).
// Renvoie { ok, avant, apres, chute, parti } ou { ok: false, texte }.
function modifierOrbiteObjet(v, a, dv, libre = false) {
  const c = ASTRES_PAR_ID[a.orbite.centre], ev = evaluerPoussee(v, a, dv), avant = a.orbite;
  if (ev.parti) {
    if (!libre) return { ok: false, texte: `${le(a)} quitterait ${le(c)} pour de bon` };
    perdreObjet(v, a, 'parti', ev.etat);
    return { ok: true, avant, parti: true };
  }
  if (ev.chute && !libre) return { ok: false, texte: texteChute(a, c, ev.chute.cause) };
  v.orbitesObjets = v.orbitesObjets || {};
  v.orbitesObjets[a.id] = ev.o;
  appliquerOrbitesObjets(v);
  if (ev.chute) (v.chutesObjets = v.chutesObjets || {})[a.id] = { t: v.t + ev.chute.dt, cause: ev.chute.cause };
  else if (v.chutesObjets) delete v.chutesObjets[a.id];
  return { ok: true, avant, apres: ev.o, chute: ev.chute || null };
}
// L'objet n'existe plus (retombé, écrasé, parti) : s'il était le centre de l'orbiteur, celui-ci passe au centre de l'objet.
function perdreObjet(v, a, cause, etatRel) {
  (v.objetsPerdus = v.objetsPerdus || {})[a.id] = { cause, t: v.t };
  if (v.chutesObjets) delete v.chutesObjets[a.id];
  if (v.orb && v.orb.centre === a.id) {
    const e = etatRel || etatRelatif(a, v.t);
    Object.assign(v.orb, { centre: a.orbite.centre, r: V.add(e.r, v.orb.r), v: V.add(e.v, v.orb.v), transfert: null });
  }
  if (v.cible === a.id) v.cible = null;
  if (a.observatoire) { v.deranges = v.deranges || {}; v.deranges[a.id] = v.deranges[a.id] || { t: v.t }; }
}
function objetPerdu(a) { const v = campagneEnCours(); return !!(v && v.objetsPerdus && v.objetsPerdus[a.id]); }
function texteObjetPerdu(a) {
  const p = campagneEnCours().objetsPerdus[a.id];
  return { atmosphere: '🔥 Retombé dans l’atmosphère', sol: '💥 Écrasé au sol', soleil: '☀️ Plongé dans le Soleil', parti: '🚀 Parti pour toujours' }[p.cause] || 'Perdu';
}
// Chutes prévues : l'objet arrive à son périgée, dans l'atmosphère ou au sol.
function verifierChutesObjets(v, log) {
  for (const [id, ch] of Object.entries(v.chutesObjets || {})) {
    if (v.t < ch.t) continue;
    const a = ASTRES_PAR_ID[id], c = ASTRES_PAR_ID[a.orbite.centre];
    const etat = etatRelatif(a, ch.t);
    const colle = !!(v.orb && v.orb.centre === id && V.norm(v.orb.r) < DIST_OBJET_PROCHE);   // l'orbiteur ne s'est pas écarté
    perdreObjet(v, a, ch.cause, etat);
    const quoi = ch.cause === 'soleil' ? `a plongé dans le Soleil et s’est vaporisé${a.art === 'la' ? 'e' : ''}`
      : ch.cause === 'atmosphere' ? `est rentré${a.art === 'la' ? 'e' : ''} dans l’atmosphère ${de(c)} et s’est désintégré${a.art === 'la' ? 'e' : ''} : quelques débris tombent${c.id === 'terre' ? ' dans l’océan' : ''}`
      : `s’est écrasé${a.art === 'la' ? 'e' : ''} ${sur(c)}`;
    log(`${ch.cause === 'soleil' ? '☀️' : ch.cause === 'atmosphere' ? '🔥' : '💥'} ${majuscule(le(a))} ${quoi}. ${a.colere || ''}`);
    if (colle && Orbiteur.v === v) return Orbiteur.crash(ch.cause === 'soleil');   // resté collé : l'orbiteur suit le même sort
  }
}
// L'orbiteur est à côté de l'objet (fin du rendez-vous), presque immobile par rapport à lui.
function aCoteObjet(v, a) {
  return !!(v.orb && v.orb.centre === a.id && V.norm(v.orb.r) < DIST_OBJET_PROCHE && V.norm(v.orb.v) < 0.001);
}
// Réaction des scientifiques : remonter Hubble lui donne des années ; le reste les met en colère.
function reactionOrbite(v, a, r) {
  const c = ASTRES_PAR_ID[r.apres.centre];
  if (a.id === 'hubble') {
    const hp = (o) => o.a * (1 - o.e) - c.rayonKm;
    if (hp(r.apres) > hp(r.avant) + 0.1) return '🎉 La NASA vous remercie : plus haut, Hubble freine moins dans les traces d’atmosphère et gagne des années avant de retomber.';
    if (hp(r.apres) < hp(r.avant) - 0.1) return `😡 Plus bas, Hubble retombera plus tôt. ${a.colere}`;
    return '';
  }
  if (!a.observatoire) return '';
  v.deranges = v.deranges || {};
  v.deranges[a.id] = v.deranges[a.id] || { t: v.t };
  return `😡 Ses équipes (${a.exploitant}) doivent tout recalculer. ${a.colere}`;
}

// Jet des moteurs : une poussée de l'orbiteur tout près d'un objet le pousse un peu (s'il est du côté du jet).
function souffleMoteurs(orb, dv) {
  const v = orb.v, a = v.orb && ASTRES_PAR_ID[v.orb.centre];
  if (!a || !a.artificiel || a.id === 'roadster' || !V.norm(dv)) return;
  const d = V.norm(v.orb.r), jet = V.mul(V.unit(dv), -1);   // le jet part à l'opposé de la poussée
  if (d > DIST_OBJET_PROCHE || V.dot(V.mul(v.orb.r, -1), jet) <= 0) return;   // l'objet n'est pas derrière
  const k = SOUFFLE_MOTEURS * (1 - d / DIST_OBJET_PROCHE) * V.norm(dv);
  if (k < 1e-9) return;
  const dvObj = V.mul(jet, k), r = modifierOrbiteObjet(v, a, dvObj);
  if (!r.ok) return;
  v.orb.v = V.sub(v.orb.v, dvObj);   // l'orbiteur garde sa vitesse : c'est l'objet qui s'écarte
  orb.log(`💨 Le jet des moteurs a poussé ${le(a)} de ${fmt(k * 1e6, k < 1e-5 ? 1 : 0)} mm/s : nouvelle orbite, ${decrireOrbiteObjet(r.apres)}. ${reactionOrbite(v, a, r)}`);
}

// Poussée volontaire : l'orbiteur, à côté, pousse l'objet vers l'avant ou l'arrière de sa course.
function ouvrirPousseeObjet(orb, a) {
  const v = orb.v, m = $('modale'), masseObj = a.masseKg || 1000;
  const choix = [1, 5, 20, 100, 500, 3000];
  const carbu = (dvMs) => (ORBITEUR.masseSeche + v.carburant + masseObj) * (1 - Math.exp(-dvMs / (ORBITEUR.isp * G0)));
  const sens = (s) => V.mul(V.unit(etatRelatif(a, v.t).v), s);
  const c = ASTRES_PAR_ID[a.orbite.centre];
  const apercu = (dvMs, s) => {
    const ev = evaluerPoussee(v, a, V.mul(sens(s), dvMs / 1000));
    if (ev.parti) return `${le(a)} quitterait ${le(c)} pour de bon${libre() ? '' : ' (garde-fous : refusé)'}`;
    if (ev.chute) return `${texteChute(a, c, ev.chute.cause)} dans ${fmtDuree(ev.chute.dt)}${libre() ? ', et l’orbiteur avec, s’il reste collé' : ' (garde-fous : refusé)'}`;
    return decrireOrbiteObjet(ev.o);
  };
  const libre = () => !!($('pousse-libre') && $('pousse-libre').checked);
  const ligne = (s, nom) => `<tr><td>${nom}</td>${choix.map((x) => `<td><button data-pousse="${s}|${x}" ${carbu(x) > v.carburant ? 'disabled' : ''}>${x} m/s</button><br><span class="doux">${fmt(carbu(x))} kg</span></td>`).join('')}</tr>`;
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🔧 Pousser ${le(a)}</h2>
    <p>L’orbiteur s’amarre doucement ${au(a)} et pousse l’ensemble (${fmt((ORBITEUR.masseSeche + v.carburant + masseObj) / 1000)} t). Orbite actuelle : ${decrireOrbiteObjet(a.orbite)}.</p>
    <p class="doux">Vers l’avant de sa course, l’orbite monte du côté opposé ; vers l’arrière, elle descend. En 2022, SpaceX et la NASA ont étudié une remontée de Hubble par une capsule Dragon, pour lui donner des années de plus.</p></div><button class="fermer">✕</button></header>
    <table class="table-progression"><tr><th>Sens</th>${choix.map(() => '<th>Δv · carburant</th>').join('')}</tr>${ligne(1, '⬆ Vers l’avant')}${ligne(-1, '⬇ Vers l’arrière')}</table>
    <label class="choix-ravito"><input type="checkbox" id="pousse-libre"> 🔓 Sans garde-fous : on peut le faire retomber, l’écraser ou le perdre pour toujours</label>
    <p id="pousse-apercu">Survolez un bouton pour voir la nouvelle orbite. Carburant de l’orbiteur : ${fmt(v.carburant)} kg.</p></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  m.querySelectorAll('[data-pousse]').forEach((b) => {
    const [s, x] = b.dataset.pousse.split('|').map(Number);
    b.onmouseenter = () => { $('pousse-apercu').textContent = `Après ${x} m/s ${s > 0 ? 'vers l’avant' : 'vers l’arrière'} : ${apercu(x, s)}.`; };
    b.onclick = () => {
      const kg = carbu(x);
      if (kg > v.carburant) return;
      const r = modifierOrbiteObjet(v, a, V.mul(sens(s), x / 1000), libre());
      if (!r.ok) { $('pousse-apercu').textContent = `Poussée refusée : ${r.texte}. Cochez « Sans garde-fous » pour le faire quand même.`; return; }
      v.carburant -= kg;   // l'orbiteur, amarré, suit l'objet : sa position relative ne change pas
      Infos.fermer();
      const fait = `🔧 ${majuscule(le(a))} poussé${a.art === 'la' ? 'e' : ''} de ${x} m/s ${s > 0 ? 'vers l’avant' : 'vers l’arrière'} (${fmt(kg)} kg de carburant)`;
      if (r.parti) orb.log(`${fait} : ${le(a)} quitte ${le(c)} pour toujours. L’orbiteur, lancé avec lui, file aussi : vérifiez votre trajectoire. ${a.colere || ''}`);
      else if (r.chute) orb.log(`${fait} : ⚠ ${texteChute(a, c, r.chute.cause, true)} dans ${fmtDuree(r.chute.dt)}. L’orbiteur, collé à lui, suit la même trajectoire : écartez-vous et remontez avant !`);
      else orb.log(`${fait} : ${decrireOrbiteObjet(r.apres)}. ${reactionOrbite(v, a, r)}`);
      orb.majHud(true);
      if (typeof sauver === 'function') sauver(etat);
    };
  });
}
