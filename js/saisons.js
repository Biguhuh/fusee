'use strict';
// ---------- Saisons ----------
// Chaque astre a l'axe incliné sur son orbite (obliquité). Selon la date, le Soleil passe au-dessus d'un hémisphère
// ou de l'autre : sa déclinaison δ vaut asin(sin ε · sin Ls), Ls étant la longitude du Soleil comptée depuis
// l'équinoxe de printemps boréal. Vu d'un lieu de latitude φ, sa hauteur suit
// sin h = sin φ sin δ + cos φ cos δ cos H (H : angle horaire). D'où des hivers au Soleil bas, des étés aux longs jours,
// la nuit polaire et le Soleil de minuit. À l'équateur et à l'équinoxe, on retrouve h = 90° − |H|.

// [obliquité (°), longitude héliocentrique de l'astre à son équinoxe de printemps boréal (°)]. Pôle nord au sens de
// l'UAI. Les lunes régulières tournent dans le plan de l'équateur de leur planète : elles en prennent les saisons.
// Mercure, Vénus, Jupiter : axe presque droit, presque pas de saisons (leur longitude d'équinoxe compte peu).
const AXES_ASTRES = {
  mercure: [0.03, 0], venus: [2.64, 0], terre: [23.44, 180], lune: [1.54, 0], mars: [25.19, 85.06],
  jupiter: [3.13, 318], saturne: [26.73, 173.4], uranus: [97.77, 346], neptune: [28.32, 45], pluton: [119.6, 220],
};
const NOMS_SAISONS = ['le printemps', 'l’été', 'l’automne', 'l’hiver'];

// Axe d'un astre : { eps (°), l0 (°), corps : l'astre qui tourne autour de l'étoile, porteur : celui qui donne l'axe }.
function axeDe(a) {
  let p = a;
  while (!AXES_ASTRES[p.id] && p.parent && ASTRES_PAR_ID[p.parent] && ASTRES_PAR_ID[p.parent].type !== 'etoile') p = ASTRES_PAR_ID[p.parent];
  let corps = p;
  while (corps.parent && ASTRES_PAR_ID[corps.parent] && ASTRES_PAR_ID[corps.parent].type !== 'etoile') corps = ASTRES_PAR_ID[corps.parent];
  const d = AXES_ASTRES[p.id] || [p.obliquite || 0, p.equinoxe || 0];
  return { eps: d[0], l0: d[1], corps: corps.id, porteur: p };
}
// Longitude du Soleil Ls (°, 0 : printemps boréal, 90 : été boréal, 180 : automne, 270 : hiver).
function lsDe(a, t) {
  const ax = axeDe(a), r = etatAbsolu(ax.corps, t).r;
  return ((((Math.atan2(r[1], r[0]) / DEG) - ax.l0) % 360) + 360) % 360;
}
// Déclinaison du Soleil (radians) : la latitude au-dessus de laquelle il passe à midi.
function declinaisonSoleil(a, t) { return Math.asin(Math.sin(axeDe(a).eps * DEG) * Math.sin(lsDe(a, t) * DEG)); }

// Lieu connu le plus proche (zone remarquable ou ancienne mission, à moins de 100 km) : { id, lat, d }, ou null.
function lieuConnu(a, x) {
  let best = null;
  const essai = (id, lat, xl) => { const d = distSol(a, x, xl); if (d < 100000 && (!best || d < best.d)) best = { id, lat, d }; };
  for (const z of zonesSur(a.id)) essai(z.id, z.lat, xZone(a, z) + (z.poser || 0) * 1000);
  for (const tr of tracesSur(a.id)) if (POSITIONS_TRACES[tr.id]) essai(tr.id, POSITIONS_TRACES[tr.id][0], xTrace(a, tr) + DISTANCE_TRACE);
  return best;
}
// Latitude du lieu de la mission (°) : celle du lieu connu le plus proche, sinon l'équateur. Gardée en cache.
function latitudeLieu(a, porteur) {
  if (!porteur || !a || a.type !== 'solide') return 0;
  const x = porteur.x || 0, c = porteur.latLieu;
  if (c && c.astre === a.id && Math.abs(x - c.x) < 5000) return c.lat;
  let lat = 0;
  if (porteur.site && porteur.site.lat !== undefined) lat = porteur.site.lat;
  else if (porteur.site && porteur.site.ombre && a.id === 'mercure') lat = CRATERE_MERCURE.lat;
  else { const l = lieuConnu(a, x); if (l) lat = l.lat; }
  porteur.latLieu = { astre: a.id, x, lat };
  return lat;
}

// Le Soleil vu du lieu : angle horaire H (rad, < 0 le matin), hauteur e (rad) au-dessus de l'horizon.
function soleilLocal(a, t, porteur) {
  const phi = zenithCiel(a, t, porteur), pos = etatAbsolu(a.id, t).r;
  const H = angleDansPi(phi - Math.atan2(-pos[1], -pos[0]));
  const lat = latitudeLieu(a, porteur) * DEG, d = declinaisonSoleil(a, t);
  const s = Math.sin(lat) * Math.sin(d) + Math.cos(lat) * Math.cos(d) * Math.cos(H);
  return { H, e: Math.asin(Math.max(-1, Math.min(1, s))), lat, d };
}

// Saison du lieu : « l'été austral »… (null si l'axe est trop droit pour qu'il y en ait).
function saisonDuLieu(a, t, latDeg) {
  const eps = axeDe(a).eps;
  if (Math.min(eps, 180 - eps) < 10) return null;   // Pluton, Uranus : axe « à l'envers », saisons quand même
  const k = Math.floor(lsDe(a, t) / 90) % 4;
  return latDeg < 0 ? `${NOMS_SAISONS[(k + 2) % 4]} austral` : `${NOMS_SAISONS[k]} boréal`;
}
// Hauteur du Soleil à midi et à minuit (°), au lieu et à la date.
function hauteursSoleil(latRad, d) {
  return { midi: 90 - Math.abs(latRad - d) / DEG, minuit: Math.abs(latRad + d) / DEG - 90 };
}

// Ligne de la fiche d'un astre : inclinaison de l'axe et saison en cours (hémisphère nord).
function ligneSaisons(a) {
  if (a.type === 'etoile') return null;
  const ax = axeDe(a);
  if (!AXES_ASTRES[ax.porteur.id] && !ax.porteur.obliquite) return null;
  const t = typeof etat !== 'undefined' && etat.enVoyage && etat.voyage ? etat.voyage.t : DATE_DEBUT;
  const comme = ax.porteur !== a ? ` (comme ${le(ax.porteur)}, dans le plan de son équateur)` : '';
  const s = saisonDuLieu(a, t, 1);
  return ['Inclinaison de l’axe', `${fmt(ax.eps, 1)}°${comme}${s ? ` ; en ce moment, ${s} (Ls ${fmt(lsDe(a, t))}°)` : ' : presque pas de saisons'}`];
}

// Début de sortie : la saison et la hauteur du Soleil, une fois.
Object.assign(Exploration.prototype, {
  annoncerSaison() {
    if (this.saisonDite) return;
    this.saisonDite = true;
    if (this.terre) return this.annoncerTerre();   // promenade : fleurs et fruits du mois
    const a = this.astre, t = tempsCiel(this.vol);
    if (a.id === 'mars') this.annoncerMars(t);   // givre, tempête de poussière (robot compris : ses panneaux)
    if (this.type !== 'spationaute' || a.type !== 'solide' || dansLOmbre(this.vol)) return;
    const latDeg = latitudeLieu(a, this.vol), h = hauteursSoleil(latDeg * DEG, declinaisonSoleil(a, t));
    const s = saisonDuLieu(a, t, latDeg);
    if (!s && Math.abs(latDeg) < 45) return;   // ni saisons ni haute latitude : rien à dire
    const soleil = h.midi < 0 ? 'nuit polaire : en ce moment, le Soleil ne se lève pas ici'
      : h.minuit > 0 ? `Soleil de minuit : il ne se couche pas, et monte à ${fmt(h.midi)}° à midi`
        : `à midi, le Soleil monte à ${fmt(h.midi)}° au-dessus de l’horizon${h.midi < 25 ? ', très bas' : ''}`;
    // Mars : les tourbillons annoncent déjà la saison.
    const debut = s && a.id !== 'mars' ? `${majuscule(sur(a))}, c’est ${s}` : `Ici (${fmt(Math.abs(latDeg))}° ${latDeg >= 0 ? 'N' : 'S'})`;
    this.dire(`☀ ${debut} : ${soleil}.`);
  },
});

// ---------- Mars : givre et tempêtes de poussière ----------
// Givre : l'hiver, aux latitudes moyennes et hautes (Viking 2 l'a photographié à 48° N). La nuit et le matin, il
// disparaît quand le Soleil chauffe ; au-delà de 60°, la glace de CO2 tient toute la journée.
// Tempêtes : la saison des poussières va de Ls 180 à 330 (Mars au plus près du Soleil, été austral). Tempêtes
// régionales de quelques semaines ; certaines années, une tempête planétaire (1977, 2001, 2007, 2018).
// Opacité τ : 0,5 par ciel clair, 2 dans une tempête régionale, 5 et plus dans une tempête planétaire.
if (ASTRES_PAR_ID.mars) ASTRES_PAR_ID.mars.cielPoussiere = true;   // ciel de poussière (vol.js, dessinerFond)
const MARS_ANNEES_GLOBALES = [12, 25, 28, 34];   // années martiennes des tempêtes planétaires observées
const SOL_MARS = 88775;   // s
function anneeMartienne(t) { return 1 + Math.floor((t / JOUR + 16336.5) / 686.973); }   // an 1 : 11 avril 1955
function bosse(ls, debut, pic, fin) { return ls <= debut || ls >= fin ? 0 : ls < pic ? (ls - debut) / (pic - debut) : (fin - ls) / (fin - pic); }
function poussiereMars(t) {
  const ls = lsDe(ASTRES_PAR_ID.mars, t), an = anneeMartienne(t), saison = bosse(ls, 150, 250, 340);
  const globale = MARS_ANNEES_GLOBALES.includes(an) || (an > 38 && hash2(an, 81) < 0.3);
  if (globale && ls > 190 && ls < 300) {
    const tau = 0.9 + 5 * Math.min(1, (ls - 190) / 12) * Math.min(1, (300 - ls) / 50);
    if (tau > 2) return { tau, type: 'globale', ls };
  }
  const episode = Math.floor(t / SOL_MARS / 15);   // épisodes d'une quinzaine de sols
  if (saison > 0 && hash2(episode, 82) < 0.5 * saison) return { tau: 1.5 + hash2(episode, 83), type: 'regionale', ls };
  return { tau: 0.5 + 0.4 * saison, type: null, ls };
}
// Part du Soleil qui atteint encore les panneaux (1 par ciel clair).
function rendementSolaireMars(tau) { return Math.max(0.01, Math.min(1, Math.exp(-(tau - 0.5) * 0.45))); }
function givreMars(t, latDeg) {
  const ls = lsDe(ASTRES_PAR_ID.mars, t), hiver = Math.max(0, Math.cos((ls - (latDeg >= 0 ? 270 : 90)) * DEG));
  return Math.min(1, Math.max(0, (Math.abs(latDeg) - 35) / 25)) * hiver;
}

Object.assign(Exploration.prototype, {
  // Conditions de Mars au lieu et à l'instant : { givre (0-1), poussiere }.
  meteoMars() {
    if (this.astre.id !== 'mars' || this.terre) return null;
    const t = tempsCiel(this.vol);
    if (this.meteo && Math.abs(this.meteo.t - t) < 600) return this.meteo;
    const lat = latitudeLieu(this.astre, this.vol);
    return (this.meteo = { t, lat, givre: givreMars(t, lat), poussiere: poussiereMars(t) });
  },
  rendementSolaire() { const m = this.meteoMars(); return m ? rendementSolaireMars(m.poussiere.tau) : 1; },

  annoncerMars() {
    const m = this.meteoMars(); if (!m) return;
    const p = m.poussiere, r = rendementSolaireMars(p.tau);
    if (p.type) this.dire(p.type === 'globale'
      ? `🌫 Tempête de poussière planétaire, comme en 2018 : le ciel est opaque (τ ≈ ${fmt(p.tau, 1)}), le Soleil n’est plus qu’une lueur. Panneaux solaires : ${fmt(r * 100)} % de leur puissance. Le vent, dans un air 60 fois moins dense que sur Terre, pousse à peine.`
      : `🌫 Tempête de poussière régionale : ciel brun, horizon voilé (τ ≈ ${fmt(p.tau, 1)}). Panneaux solaires : ${fmt(r * 100)} % de leur puissance.`);
    if (m.givre > 0.15 && this.type === 'spationaute') this.dire(Math.abs(m.lat) >= 60
      ? '❄ Hiver polaire : une couche de glace carbonique (CO₂ gelé) couvre le sol, toute la journée.'
      : '❄ C’est l’hiver ici : du givre couvre le sol la nuit et le matin. Il disparaît quand le Soleil chauffe.');
  },

  // Givre : des plaques blanches à la surface (juste après le terrain, sous les personnages).
  dessinerSaisonSol(ctx, versEcran, s, W) {
    if (this.terre) return this.dessinerSolTerre(ctx, versEcran, s, W);
    const m = this.meteoMars(); if (!m || m.givre <= 0.05) return;
    const chaleur = chaleurLocale(this.astre, tempsCiel(this.vol), this.vol);
    // Le givre tient une bonne partie de la matinée (Soleil bas, l'hiver), puis se sublime.
    const g = Math.min(1, m.givre * 1.4 * (Math.abs(m.lat) >= 60 ? 1 : Math.max(0, 1 - chaleur * chaleur * 1.2)));
    if (g <= 0.03) return;
    const x0 = this.p.x - W / 2 / s;
    for (let sx = 0; sx < W; sx += 3) {
      const x = x0 + sx / s, n = hash2(Math.floor(x * 1.5), 71);
      const [, sy] = versEcran(x, this.sol(x));
      ctx.fillStyle = `rgba(236,241,248,${0.3 * g})`; ctx.fillRect(sx, sy - 1, 3, 3);   // pellicule continue
      if (n > g * 1.6) continue;
      ctx.fillStyle = `rgba(244,247,252,${0.5 + 0.45 * g})`;   // plaques plus épaisses
      ctx.fillRect(sx, sy - 1.5, 3, 3 + 6 * n);
    }
  },

  // Tempête : voile de poussière et grains poussés par le vent (avant l'affichage du HUD).
  dessinerSaisonAir(ctx, W, H) {
    const m = this.meteoMars(); if (!m) return;
    const a = Math.min(0.78, Math.max(0, (m.poussiere.tau - 0.8) / 6));
    if (a <= 0.01) return;
    ctx.fillStyle = `rgba(150,96,58,${a})`; ctx.fillRect(0, 0, W, H);
    const t = performance.now() / 1000, n = Math.round(60 + 120 * a);
    ctx.fillStyle = `rgba(205,150,100,${0.25 + 0.4 * a})`;
    for (let i = 0; i < n; i++) {
      const prof = (i % 3) + 1;
      const x = ((((i * 97.3 - t * 90 / prof - this.p.x * 30 / prof) % (W + 20)) + W + 20) % (W + 20)) - 10;
      const y = (((i * 41.7 + Math.sin(t * 0.8 + i) * 15) % H) + H) % H;
      ctx.fillRect(x, y, 4 / prof, 1.5 / prof);
    }
  },
});

// ---------- La Terre : la promenade selon la saison ----------
// Sous nos latitudes (46° N) : fleurs du mois, arbres en fleurs au printemps, fruits à leur saison, feuilles
// rousses à l'automne, branches nues l'hiver (l'oranger garde ses feuilles et donne ses fruits l'hiver).
const LAT_PROMENADE = 46;
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// Mois de floraison (1 à 12) et couleur.
const FLEURS_SAISON = {
  'Perce-neige': [[1, 3], '#f5f5f5'], 'Hellébore': [[12, 3], '#f3d6e0'], 'Crocus': [[2, 4], '#8e6bd1'], 'Jonquille': [[3, 4], '#ffd600'],
  'Marguerite': [[4, 9], '#ffffff'], 'Coquelicot': [[5, 7], '#e53935'], 'Bleuet': [[5, 8], '#1e88e5'], 'Rose': [[5, 10], '#ec407a'],
  'Lavande': [[6, 8], '#9575cd'], 'Tournesol': [[7, 9], '#fdd835'], 'Chrysanthème': [[9, 11], '#f9a825'], 'Bruyère': [[8, 11], '#c2185b'],
};
const FLEURS_FEMININES = ['Marguerite', 'Rose', 'Lavande', 'Jonquille', 'Bruyère'];
const FRUITS_MASCULINS = ['abricot'];
// Arbres : [floraison], [récolte], couleur des fleurs. L'oranger : toujours vert, fleurs au printemps, oranges l'hiver.
const ARBRES_SAISON = {
  Cerisier: [[3, 4], [6, 7], '#f8bbd0'], Abricotier: [[3, 3], [6, 8], '#fce4ec'], Prunier: [[3, 4], [7, 9], '#ffffff'],
  Pommier: [[4, 5], [8, 10], '#fde3ea'], Oranger: [[4, 5], [12, 3], '#ffffff'],
};
const dansMois = (m, [a, b]) => (a <= b ? m >= a && m <= b : m >= a || m <= b);
function moisPromenade() {
  const t = typeof etat !== 'undefined' && etat.voyage ? etat.voyage.t : DATE_DEBUT;
  return new Date(Date.UTC(2000, 0, 1, 12) + t * 1000).getUTCMonth() + 1;
}
// Aspect d'un arbre ce mois-ci : 'fleurs', 'fruits', 'vert', 'roux' ou 'nu'.
function aspectArbre(nom, m) {
  const d = ARBRES_SAISON[nom]; if (!d) return 'vert';
  if (dansMois(m, d[1])) return 'fruits';
  if (dansMois(m, d[0])) return 'fleurs';
  if (nom === 'Oranger') return 'vert';
  return m >= 10 && m <= 11 ? 'roux' : m === 12 || m <= 2 ? 'nu' : 'vert';
}

(function () {
  const P = Exploration.prototype, genererTerre = P.genererTerre, agirTerre = P.agirTerre;
  P.genererTerre = function () {
    const m = moisPromenade(), l = genererTerre.call(this);
    this.vol.latLieu = { astre: 'terre', x: this.vol.x || 0, lat: LAT_PROMENADE };   // le Soleil de nos latitudes
    this.vol.dateCiel = typeof etat !== 'undefined' && etat.voyage ? etat.voyage.t : DATE_DEBUT;   // … à la date de la campagne
    const fleurs = Object.keys(FLEURS_SAISON).filter((n) => dansMois(m, FLEURS_SAISON[n][0]));
    const hiver = m === 12 || m <= 2;
    return l.filter((s, i) => {
      if (s.type === 'fleur') {
        if (hiver && hash2(i, 91) < 0.6) return false;   // l'hiver, peu de fleurs
        if (!dansMois(m, (FLEURS_SAISON[s.nom] || [[1, 12]])[0])) s.nom = fleurs[Math.floor(hash2(i, 92) * fleurs.length)];
      }
      if (s.type === 'arbre') { s.aspect = aspectArbre(s.nom, m); if (s.aspect !== 'fruits') s.reste = 0; }
      return true;
    });
  };
  // Un arbre hors saison : on dit quand revenir.
  P.agirTerre = function () {
    const p = this.p, arbre = this.sites.find((s) => s.type === 'arbre' && distSol(this.astre, s.x, p.x) < 2.5);
    const fleur = this.sites.some((s) => s.type === 'fleur' && !s.cueillie && distSol(this.astre, s.x, p.x) < distSol(this.astre, arbre ? arbre.x : 1e9, p.x));
    if (arbre && arbre.aspect && arbre.aspect !== 'fruits' && !fleur) {
      const r = ARBRES_SAISON[arbre.nom][1];
      const quoi = { fleurs: 'en fleurs', vert: 'en feuilles', roux: 'aux feuilles rousses', nu: 'aux branches nues' }[arbre.aspect];
      return this.dire(`${arbre.nom} ${quoi} : pas de fruits en ${MOIS[moisPromenade() - 1]}. Récolte : de ${MOIS[r[0] - 1]} à ${MOIS[r[1] - 1]}.`);
    }
    return agirTerre.call(this);
  };
})();

Object.assign(Exploration.prototype, {
  // Prairie selon la saison : jaunie à la fin de l'été (manque d'eau), givrée l'hiver (le matin surtout).
  dessinerSolTerre(ctx, versEcran, s, W) {
    const m = moisPromenade();
    const sec = { 7: 0.15, 8: 0.42, 9: 0.28 }[m] || 0;
    const hiver = m === 12 || m <= 2 ? 1 : m === 11 || m === 3 ? 0.4 : 0;
    if (!sec && !hiver) return;
    const x0 = this.p.x - W / 2 / s, pts = [];
    for (let sx = -6; sx <= W + 6; sx += 6) pts.push([sx, versEcran(x0 + sx / s, this.sol(x0 + sx / s))[1]]);
    const voile = (coul) => {
      ctx.fillStyle = coul; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts) ctx.lineTo(x, y);
      ctx.lineTo(W + 6, 5000); ctx.lineTo(-6, 5000); ctx.closePath(); ctx.fill();
    };
    if (sec) voile(`rgba(196,168,72,${sec})`);   // herbe sèche, paille
    if (!hiver) return;
    // Givre : plus épais au petit matin, il fond quand le Soleil monte (un peu reste à l'ombre, même à midi).
    const chaleur = chaleurLocale(this.astre, tempsCiel(this.vol), this.vol);
    const g = hiver * Math.max(0.5, 1 - chaleur * chaleur);
    voile(`rgba(222,232,238,${0.5 * g})`);
    for (let sx = 0; sx < W; sx += 3) {
      const x = x0 + sx / s, n = hash2(Math.floor(x * 2), 72);
      const [, sy] = versEcran(x, this.sol(x));
      ctx.fillStyle = `rgba(240,245,250,${0.35 * g})`; ctx.fillRect(sx, sy - 1, 3, 3);
      if (n < g * 1.2) { ctx.fillStyle = `rgba(246,249,252,${0.5 + 0.4 * g})`; ctx.fillRect(sx, sy - 1.5, 3, 2 + 4 * n); }
    }
  },

  annoncerTerre() {
    const m = moisPromenade(), mur = this.sites.filter((s) => s.type === 'arbre' && s.aspect === 'fruits').map((s) => s.fruit + 's');
    const fl = this.sites.filter((s) => s.type === 'fleur').map((s) => s.nom.toLowerCase());
    const uniq = (x) => [...new Set(x)];
    const fr = uniq(mur), f = uniq(fl).slice(0, 4);
    this.dire(`🗓 Promenade en ${MOIS[m - 1]} : ${f.length ? `${f.join(', ')} en fleurs` : 'presque pas de fleurs'} ; ${fr.length ? `${fr.length > 1 ? `${fr.slice(0, -1).join(', ')} et ${fr[fr.length - 1]}` : fr[0]} à cueillir` : 'pas de fruits mûrs en cette saison'}.`);
  },
});

// Arbre fruitier selon la saison : fleurs, feuilles, fruits mûrs, feuilles rousses, ou branches nues.
dessinerArbre = function (ctx, x, y, s, a) {
  const asp = a.aspect || 'fruits';
  ctx.fillStyle = '#6d4c41'; ctx.fillRect(x - 0.25 * s, y - 3 * s, 0.5 * s, 3 * s);
  if (asp === 'nu') {
    ctx.strokeStyle = '#6d4c41'; ctx.lineWidth = 0.14 * s;
    for (const [dx, dy] of [[-1.6, -5], [-0.4, -6], [0.9, -5.6], [1.8, -4.4], [-2, -3.8]]) { ctx.beginPath(); ctx.moveTo(x, y - 3 * s); ctx.lineTo(x + dx * s, y + dy * s); ctx.stroke(); }
  } else {
    ctx.fillStyle = asp === 'roux' ? '#d9822b' : asp === 'fleurs' && a.nom !== 'Oranger' ? '#a5c98a' : '#388e3c';
    for (const [dx, dy, r] of [[0, -4, 2], [-1.3, -3.3, 1.4], [1.3, -3.4, 1.4]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
  }
  const pos = [[-1, -4.5], [0.8, -3.6], [-0.2, -2.9], [1.5, -4.4], [-1.6, -3.3], [0.3, -5.3], [-0.6, -3.8], [1.1, -4.9]];
  if (asp === 'fleurs') {
    ctx.fillStyle = ARBRES_SAISON[a.nom] ? ARBRES_SAISON[a.nom][2] : '#fff';
    for (const [dx, dy] of pos) for (const k of [0, 1]) { ctx.beginPath(); ctx.arc(x + (dx + k * 0.35) * s, y + (dy - k * 0.25) * s, 0.2 * s, 0, Math.PI * 2); ctx.fill(); }
  } else if (asp === 'fruits' && a.reste > 0) {
    ctx.fillStyle = { pomme: '#e53935', cerise: '#b71c1c', orange: '#fb8c00', prune: '#6a1b9a', abricot: '#ffa726' }[a.fruit] || '#e53935';
    for (let i = 0; i < a.reste + 2 && i < 5; i++) { ctx.beginPath(); ctx.arc(x + pos[i][0] * s, y + pos[i][1] * s, 0.22 * s, 0, Math.PI * 2); ctx.fill(); }
  }
  texteSurFond(ctx, a.nom, x, y - 6.4 * s, { police: '12px system-ui' });
};
// Fleurs de toutes les saisons (couleur de FLEURS_SAISON).
dessinerFleur = function (ctx, x, y, s, f) {
  const coul = (FLEURS_SAISON[f.nom] || [0, '#fff'])[1];
  const h = (f.nom === 'Tournesol' ? 1.4 : f.nom === 'Bruyère' || f.nom === 'Crocus' || f.nom === 'Perce-neige' ? 0.3 : 0.5) * s;
  ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
  ctx.fillStyle = coul;
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 0.12 * s, y - h + Math.sin(a) * 0.12 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = f.nom === 'Tournesol' ? '#5d4037' : '#ffd54f';
  ctx.beginPath(); ctx.arc(x, y - h, 0.07 * s, 0, Math.PI * 2); ctx.fill();
};
