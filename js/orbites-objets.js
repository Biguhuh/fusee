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
// Change la vitesse d'un objet de dv (km/s, repère de son centre). Renvoie { ok, avant, apres } ou { ok: false, texte }.
function modifierOrbiteObjet(v, a, dv) {
  const s = etatRelatif(a, v.t), c = ASTRES_PAR_ID[a.orbite.centre];
  const o = orbiteDepuisEtat(a.orbite.centre, s.r, V.add(s.v, dv), v.t);
  if (!o) return { ok: false, texte: `${le(a)} quitterait ${le(c)} pour de bon` };
  if (c.type !== 'etoile' && o.a * (1 - o.e) < c.rayonKm + (c.atm ? 150 : 10)) return { ok: false, texte: `${le(a)} retomberait ${c.atm ? 'dans l’atmosphère' : 'au sol'}` };
  const avant = a.orbite;
  v.orbitesObjets = v.orbitesObjets || {};
  v.orbitesObjets[a.id] = o;
  appliquerOrbitesObjets(v);
  return { ok: true, avant, apres: o };
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
  const choix = [1, 5, 20, 100];
  const carbu = (dvMs) => (ORBITEUR.masseSeche + v.carburant + masseObj) * (1 - Math.exp(-dvMs / (ORBITEUR.isp * G0)));
  const sens = (s) => V.mul(V.unit(etatRelatif(a, v.t).v), s);
  const apercu = (dvMs, s) => {
    const st = etatRelatif(a, v.t), o = orbiteDepuisEtat(a.orbite.centre, st.r, V.add(st.v, V.mul(sens(s), dvMs / 1000)), v.t);
    return o ? decrireOrbiteObjet(o) : 'orbite ouverte, il partirait';
  };
  const ligne = (s, nom) => `<tr><td>${nom}</td>${choix.map((x) => `<td><button data-pousse="${s}|${x}" ${carbu(x) > v.carburant ? 'disabled' : ''}>${x} m/s</button><br><span class="doux">${fmt(carbu(x))} kg</span></td>`).join('')}</tr>`;
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🔧 Pousser ${le(a)}</h2>
    <p>L’orbiteur s’amarre doucement ${au(a)} et pousse l’ensemble (${fmt((ORBITEUR.masseSeche + v.carburant + masseObj) / 1000)} t). Orbite actuelle : ${decrireOrbiteObjet(a.orbite)}.</p>
    <p class="doux">Vers l’avant de sa course, l’orbite monte du côté opposé ; vers l’arrière, elle descend. En 2022, SpaceX et la NASA ont étudié une remontée de Hubble par une capsule Dragon, pour lui donner des années de plus.</p></div><button class="fermer">✕</button></header>
    <table class="table-progression"><tr><th>Sens</th>${choix.map(() => '<th>Δv · carburant</th>').join('')}</tr>${ligne(1, '⬆ Vers l’avant')}${ligne(-1, '⬇ Vers l’arrière')}</table>
    <p id="pousse-apercu">Survolez un bouton pour voir la nouvelle orbite. Carburant de l’orbiteur : ${fmt(v.carburant)} kg.</p></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  m.querySelectorAll('[data-pousse]').forEach((b) => {
    const [s, x] = b.dataset.pousse.split('|').map(Number);
    b.onmouseenter = () => { $('pousse-apercu').textContent = `Après ${x} m/s ${s > 0 ? 'vers l’avant' : 'vers l’arrière'} : ${apercu(x, s)}.`; };
    b.onclick = () => {
      const kg = carbu(x);
      if (kg > v.carburant) return;
      const r = modifierOrbiteObjet(v, a, V.mul(sens(s), x / 1000));
      if (!r.ok) { $('pousse-apercu').textContent = `Poussée refusée : ${r.texte}.`; return; }
      v.carburant -= kg;   // l'orbiteur, amarré, suit l'objet : sa position relative ne change pas
      Infos.fermer();
      orb.log(`🔧 ${majuscule(le(a))} poussé${a.art === 'la' ? 'e' : ''} de ${x} m/s ${s > 0 ? 'vers l’avant' : 'vers l’arrière'} (${fmt(kg)} kg de carburant) : ${decrireOrbiteObjet(r.apres)}. ${reactionOrbite(v, a, r)}`);
      orb.majHud(true);
      if (typeof sauver === 'function') sauver(etat);
    };
  });
}
