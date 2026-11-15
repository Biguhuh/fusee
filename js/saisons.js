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
  // Triton : orbite rétrograde et inclinée, son pôle tourne autour de celui de Neptune ; vu du Soleil, l'axe
  // penche jusqu'à ≈ 50° (Soleil au-dessus de 45° S quand Voyager 2 est passé, en 1989). Approximation.
  triton: [50, 45],
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
    if (a.id === 'titan' || a.id === 'triton' || a.id === 'pluton' || a.id === 'io') this.annoncerLointain();   // pluie, geysers, brume
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
    if (this.astre.id === 'pluton') return this.dessinerGivrePluton(ctx, versEcran, s, W);
    if (this.astre.id === 'triton') return this.dessinerTraineesTriton(ctx, versEcran, s, W);
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
    if (this.astre.id === 'titan') return this.dessinerPluieTitan(ctx, W, H);
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

// ---------- Titan, Triton, Pluton ----------
// Titan : pluies de méthane, par averses. Orages aux basses latitudes autour des équinoxes (vus par Cassini en
// 2010), pluies sur les lacs du pôle en été. Gouttes d'≈ 1 cm, qui tombent à ≈ 1,6 m/s, comme des flocons.
// Triton : geysers d'azote de 8 km sous le Soleil d'été (Voyager 2, 1989), panaches couchés par le vent.
// Pluton : son atmosphère d'azote vient de la glace qui se sublime ; loin du Soleil, elle se raréfie et regèle.
// Retard de quelques décennies (la glace garde la chaleur) : elle tenait encore en 2015 (New Horizons).
const JOUR_TITAN = 15.945 * JOUR;
function pluieTitan(t, latDeg) {
  const ls = lsDe(ASTRES_PAR_ID.titan, t), al = Math.abs(latDeg);
  const equinoxe = Math.max(0, Math.cos(2 * ls * DEG)) * (al < 40 ? 1 : 0);
  const ete = Math.max(0, Math.sin(ls * DEG) * Math.sign(latDeg || 1)) * (al > 50 ? 1 : 0);
  const f = Math.max(equinoxe, ete), episode = Math.floor(t / (JOUR_TITAN / 4));   // averses de quelques jours terrestres
  return { f, pluie: hash2(episode, 101) < 0.12 * f, saison: equinoxe >= ete ? 'equinoxe' : 'ete' };
}
function geysersTriton(t, latDeg) {
  const d = declinaisonSoleil(ASTRES_PAR_ID.triton, t) / DEG;
  return { actifs: Math.abs(latDeg - d) < 35, d };
}
function atmospherePluton(t) {
  const r = (pos) => V.norm(pos) / UA_KM;
  const rRetard = r(etatAbsolu('pluton', t - 25 * 365.25 * JOUR).r), rNow = r(etatAbsolu('pluton', t).r);
  return { f: Math.max(0.01, Math.min(1, (44 - rRetard) / 8)), r: rNow };
}

Object.assign(Exploration.prototype, {
  annoncerLointain() {
    const a = this.astre, t = tempsCiel(this.vol), lat = latitudeLieu(a, this.vol);
    if (a.id === 'titan') {
      const p = pluieTitan(t, lat);
      this.pluie = p.pluie;
      if (p.pluie) this.dire('🌧 Averse de méthane : de grosses gouttes d’un centimètre tombent lentement, à 1,6 m/s, comme des flocons. Le sol sombre est mouillé.');
      else if (p.f > 0.5) this.dire(p.saison === 'equinoxe' ? '⛅ Saison des orages, autour de l’équinoxe : il pleut parfois du méthane ici, par averses.' : '⛅ Été polaire : les nuages de méthane arrosent les lacs du pôle, de temps en temps.');
    }
    if (a.id === 'triton') {
      const g = geysersTriton(t, lat);
      this.geysers = g.actifs;
      this.dire(g.actifs ? '⛲ Sous le Soleil d’été, des geysers d’azote montent à 8 km au loin, puis le vent couche leurs panaches sombres sur plus de 100 km. Leurs retombées tracent au sol des traînées sombres.'
        : `⛲ Les geysers d’azote sont actifs là où le Soleil est le plus haut (vers ${fmt(Math.abs(g.d))}° ${g.d < 0 ? 'S' : 'N'}), trop loin d’ici pour les voir.`);
    }
    if (a.id === 'io') this.dire('🌋 Au-dessus de l’horizon, des panaches volcaniques en ombrelle montent à des centaines de km. Sans air pour les freiner, les grains retombent en paraboles et blanchissent le sol de givre de soufre.');
    if (a.id === 'pluton') {
      const p = atmospherePluton(t);
      this.brume = p.f;
      this.dire(p.f > 0.5 ? `🌫 Pluton est à ${fmt(p.r, 1)} UA du Soleil : son atmosphère d’azote (≈ 10 µbar) tient encore, avec ses fines couches de brume bleue au-dessus de l’horizon. Loin du Soleil, elle se raréfiera et regèlera au sol.`
        : p.f > 0.1 ? `🌫 Pluton est à ${fmt(p.r, 1)} UA du Soleil : son atmosphère se raréfie, l’azote regèle peu à peu. La brume bleue s’efface.`
          : `❄ Pluton est à ${fmt(p.r, 1)} UA du Soleil : son atmosphère a regelé. Le sol est couvert de givre d’azote frais.`);
    }
  },

  // Plan lointain (derrière le terrain) : geysers de Triton, brume de Pluton.
  dessinerSaisonLoin(ctx, W, yH) {
    const tt = performance.now() / 1000;
    if (this.astre.id === 'triton' && this.geysers) {
      // Geysers lointains : à des dizaines de km, leur pied est sous l'horizon (Triton est petite : l'horizon
      // est à 2 ou 3 km). On voit la colonne de poussière monter, puis le panache couché par le vent, très long.
      const tour = W * 2.6;
      for (let i = 0; i < 4; i++) {
        const xc = ((((i * 0.27 + 0.08) * tour - this.p.x * 0.4) % tour) + tour) % tour - W * 0.8;
        if (xc < -W * 1.2 || xc > W + 40) continue;
        const h = 105 + 55 * hash2(i, 111), pied = yH + 30 + 40 * hash2(i, 112);   // pied caché derrière le terrain
        const force = 0.65 + 0.35 * Math.sin(tt * 0.15 + i * 2.1), haut = yH - h, L = h * (5 + 3 * hash2(i, 113));
        dessinerGeyserTriton(ctx, xc, pied, haut, L, force, tt + i * 7.3);
      }
    }
    if (this.astre.id === 'io') {
      // Panaches d'Io au loin : ombrelles (Prométhée ≈ 100 km de haut, Pelé ≈ 350 km, plus rare), pied sous l'horizon.
      const tour = W * 2.4;
      [[0.15, 95, 1.2], [0.55, 220, 1.6], [0.85, 120, 1.3]].forEach(([pos, h, l], i) => {
        const xc = ((((pos * tour) - this.p.x * 0.3) % tour) + tour) % tour - W * 0.6;
        if (xc > -h * 2 && xc < W + h * 2) dessinerOmbrelleIo(ctx, xc, yH + 25, h, h * l, tt + i * 5.1);
      });
    }
    if (this.astre.id === 'pluton' && (this.brume || 0) > 0.1) {
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = `rgba(110,160,230,${0.13 * this.brume * (1 - k / 7)})`;
        ctx.fillRect(0, yH - 40 - k * 26, W, 9);
      }
    }
  },

  // Titan : averse de méthane, grosses gouttes lentes.
  dessinerPluieTitan(ctx, W, H) {
    if (!this.pluie) return;
    ctx.fillStyle = 'rgba(70,50,20,0.18)'; ctx.fillRect(0, 0, W, H);
    const t = performance.now() / 1000;
    ctx.strokeStyle = 'rgba(235,205,150,0.6)'; ctx.lineWidth = 2;
    for (let i = 0; i < 140; i++) {
      const x = ((i * 83.7 - this.p.x * 30) % W + W) % W, y = ((i * 57.1 + t * 48) % H + H) % H;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 7); ctx.stroke();
    }
  },

  // Pluton : givre d'azote frais quand l'atmosphère a regelé.
  dessinerGivrePluton(ctx, versEcran, s, W) {
    const g = 1 - (this.brume === undefined ? 1 : this.brume);
    if (g < 0.4) return;
    const x0 = this.p.x - W / 2 / s;
    for (let sx = 0; sx < W; sx += 3) {
      const x = x0 + sx / s, [, sy] = versEcran(x, this.sol(x));
      ctx.fillStyle = `rgba(250,250,255,${0.6 * g})`; ctx.fillRect(sx, sy - 1.5, 3, 3 + 3 * hash2(Math.floor(x * 2), 73));
    }
  },

  // Triton : traînées sombres des retombées, en éventail dans le sens du vent (vers la droite), sur la glace rose.
  dessinerTraineesTriton(ctx, versEcran, s, W) {
    if (!this.geysers) return;
    const x0 = this.p.x - W / 2 / s - 60, x1 = this.p.x + W / 2 / s + 10, pas = 70;
    for (let k = Math.floor(x0 / pas); k * pas < x1; k++) {
      if (hash2(k, 121) > 0.45) continue;
      const xa = k * pas + hash2(k, 122) * 30, long = 18 + 40 * hash2(k, 123), fonce = 0.22 + 0.2 * hash2(k, 124);
      for (let u = 0; u < 1; u += 0.04) {
        const x = xa + u * long, [sx, sy] = versEcran(x, this.sol(x));
        if (sx < -10 || sx > W + 10) continue;
        const e = 1.5 + 5 * u * (1 - u * 0.6);   // l'éventail s'élargit puis s'efface
        ctx.fillStyle = `rgba(70,52,50,${fonce * (1 - u * 0.85)})`;
        ctx.fillRect(sx, sy - 1, u * long * s * 0.04 + 3, e);
      }
    }
  },
});

// Un geyser de Triton, vu de loin : colonne de grains sombres qui monte en ondulant, coude doux vers 8 km, puis
// panache couché par le vent, très long, qui s'élargit et s'efface. Le Soleil éclaire le bord supérieur.
// xc, pied : base (cachée sous l'horizon) ; haut : altitude du coude (écran) ; L : longueur du panache (px).
function dessinerGeyserTriton(ctx, xc, pied, haut, L, force, t) {
  const sombre = (a) => `rgba(128,114,110,${a})`, clair = (a) => `rgba(228,214,208,${a})`;
  const H = pied - haut;
  // Nuage à bords doux (dégradé radial, aplati) : pas de contour net.
  const nuage = (x, y, rx, ry, coul, a) => {
    if (a < 0.005) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, coul(a)); g.addColorStop(0.55, coul(a * 0.5)); g.addColorStop(1, coul(0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  };
  // Colonne : fine (≈ 1 km), elle s'élargit à peine en montant ; grains qui montent en ondulant.
  for (let i = 0; i < 12; i++) { const u = i / 11; nuage(xc + Math.sin(u * 5 + t * 0.4) * 1.5, pied - u * H, 3 + 3 * u, 9, sombre, 0.18 * force); }
  for (let j = 0; j < 60; j++) {
    const u = (t * 0.06 + j / 60 + hash2(j, 131) * 0.02) % 1, y = pied - u * H;
    const x = xc + Math.sin(u * 7 + t * 0.8 + j) * (1 + 3 * u) + (hash2(j, 132) - 0.5) * (2 + 5 * u);
    ctx.fillStyle = sombre(0.5 * force * (0.5 + 0.5 * u)); ctx.fillRect(x, y, 1.5, 1.5);
  }
  // Coude arrondi, puis panache couché qui s'élargit vite, s'effiloche et pâlit sur toute sa longueur.
  for (let k = 0; k < 40; k++) {
    const sv = k / 39, debut = Math.min(1, sv / 0.1);
    const x = xc + 18 * Math.sin(debut * Math.PI / 2) + sv * L;
    const y = haut - 14 * Math.sin(debut * Math.PI / 2) + sv * sv * 22 + Math.sin(sv * 8 + t * 0.25) * 3;
    const r = 5 + 34 * sv, a = 0.32 * force * Math.pow(1 - sv, 1.3);
    nuage(x, y, r * 1.6, r * 0.6, sombre, a);
    nuage(x - r * 0.2, y - r * 0.3, r * 1.2, r * 0.25, clair, a * 0.5);   // bord supérieur, éclairé par le Soleil
  }
  // Grains qui dérivent dans le panache
  for (let j = 0; j < 50; j++) {
    const sv = (t * 0.02 + j / 50) % 1, x = xc + 18 + sv * L, y = haut - 12 + sv * sv * 22 + (hash2(j, 133) - 0.5) * (6 + 34 * sv);
    ctx.fillStyle = sombre(0.45 * force * (1 - sv)); ctx.fillRect(x, y, 2, 1.5);
  }
}

// Geyser de Triton vu de près : évent sombre, retombées en éventail dans le sens du vent, et jet de grains fins,
// éclairés par le Soleil, qui monte presque droit et sort de l'écran (il monte à 8 km).
// sol(dx) : point du sol à dx mètres de l'évent ; e : pixels par mètre.
function dessinerJetTriton(ctx, sx, sy, e, t, sol, fait) {
  const k = fait ? 0.6 : 1;
  for (let i = 0; i < 24; i++) {   // retombées : éventail sombre vers la droite
    const u = i / 23, [x, y] = sol(1 + u * 40);
    ctx.fillStyle = `rgba(70,52,50,${0.35 * (1 - u * 0.8)})`;
    ctx.beginPath(); ctx.ellipse(x, y, (1 + 1.5 * u) * e, Math.max(1.5, (0.15 + 0.5 * u) * e * 0.3), 0, Math.PI, 0); ctx.fill();
  }
  ctx.fillStyle = '#2e2724'; ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(3, 0.7 * e), Math.max(2, 0.25 * e), 0, Math.PI, 0); ctx.fill();   // évent
  const haut = sy + 40;   // jusqu'en haut de l'écran et au-delà
  // Voile du jet : étroit à l'évent, il s'évase en montant, et pâlit.
  for (let i = 0; i < 16; i++) {
    const u = i / 15, y = sy - u * sy, w = (0.4 + 1.6 * u) * e;
    const g = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
    g.addColorStop(0, 'rgba(150,135,130,0)'); g.addColorStop(0.5, `rgba(150,135,130,${0.16 * k * (1 - 0.5 * u)})`); g.addColorStop(1, 'rgba(150,135,130,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - w, y - sy / 15, 2 * w, sy / 15 + 1);
  }
  for (let j = 0; j < 140; j++) {
    const u = (t * 0.22 + j / 140 + hash2(j, 141) * 0.03) % 1, y = sy - u * haut * 1.2;
    const x = sx + (hash2(j, 142) - 0.5) * (0.3 + 2.4 * u) * e + Math.sin(u * 9 + t + j) * 0.15 * e * u;
    ctx.fillStyle = j % 3 ? `rgba(165,150,145,${0.7 * k * (1 - u * 0.6)})` : `rgba(235,222,215,${0.6 * k * (1 - u * 0.6)})`;
    ctx.fillRect(x, y, 2, 2);
  }
}

// Panache d'Io vu de loin : sans air, les grains suivent des paraboles. Ceux lancés presque droit montent le plus
// haut et retombent près de l'axe ; les plus inclinés vont loin : une ombrelle au bord plus dense, bleutée
// (fines particules éclairées par le Soleil, photos de Galileo). xc, pied : évent ; h : hauteur ; R : rayon.
function dessinerOmbrelleIo(ctx, xc, pied, h, R, t) {
  const g = ctx.createRadialGradient(xc, pied - h * 0.55, 0, xc, pied - h * 0.55, R);
  g.addColorStop(0, 'rgba(170,190,235,0.10)'); g.addColorStop(0.7, 'rgba(170,190,235,0.06)'); g.addColorStop(1, 'rgba(170,190,235,0)');
  ctx.fillStyle = g; ctx.save(); ctx.translate(0, pied - h * 0.55); ctx.scale(1, (h * 0.75) / R); ctx.beginPath(); ctx.arc(xc, 0, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  for (let j = 0; j < 260; j++) {
    const c = (hash2(j, 151) * 2 - 1), q = Math.abs(c);   // c : inclinaison relative (−1 à 1)
    const portee = R * c, haut = h * (1 - 0.35 * q * q);   // plus incliné : plus loin, un peu moins haut
    const u = (t * 0.05 + hash2(j, 152)) % 1;               // avancement sur la trajectoire
    const x = xc + portee * u, y = pied - 4 * haut * u * (1 - u);
    const a = 0.55 * (0.4 + 0.6 * q) * (u > 0.85 ? (1 - u) / 0.15 : 1);   // plus dense au bord, s'efface au sol
    ctx.fillStyle = `rgba(190,205,240,${a})`; ctx.fillRect(x, y, 1.6, 1.6);
  }
}

// Volcan d'Io vu de près : anneau de retombées (givre blanc de dioxyde de soufre, soufre rouge), lave qui rougeoie
// à l'évent (bien visible la nuit), éclats incandescents en paraboles basses, et le pied du panache, un jet
// bleuté qui sort de l'écran (il monte à des centaines de km).
function dessinerFontaineIo(ctx, sx, sy, e, t, sol, fait) {
  const k = fait ? 0.6 : 1, nuit = typeof LUMIERE_SOL === 'number' ? 1 - LUMIERE_SOL : 0;
  for (let i = -30; i <= 30; i++) {   // retombées : blanc près de l'évent, puis un anneau rouge plus loin
    if (Math.abs(i) < 2) continue;
    const d = Math.abs(i), [x, y] = sol(i * 1.4);
    ctx.fillStyle = d < 14 ? `rgba(245,245,235,${0.5 * (1 - d / 16)})` : `rgba(190,60,30,${0.45 * Math.max(0, 1 - Math.abs(d - 22) / 9)})`;
    ctx.fillRect(x - 0.7 * e, y - 1, 1.4 * e, 2 + 2 * hash2(i, 161));
  }
  // Évent et lave
  const lueur = 0.6 + 0.4 * Math.sin(t * 3) * Math.sin(t * 1.7);
  const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, (2 + 3 * nuit) * e);
  gl.addColorStop(0, `rgba(255,170,60,${(0.55 + 0.35 * nuit) * lueur})`); gl.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, (2 + 3 * nuit) * e, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.ellipse(sx, sy, Math.max(3, 0.9 * e), Math.max(2, 0.3 * e), 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = `rgba(255,120,30,${0.8 * lueur})`; ctx.fillRect(sx - 0.5 * e, sy - 2, e, 2);
  // Pied du panache : jet bleuté qui sort de l'écran
  for (let i = 0; i < 16; i++) {
    const u = i / 15, y = sy - u * sy, w = (0.5 + 2.5 * u) * e;
    const g = ctx.createLinearGradient(sx - w, 0, sx + w, 0);
    g.addColorStop(0, 'rgba(170,190,235,0)'); g.addColorStop(0.5, `rgba(170,190,235,${0.18 * k})`); g.addColorStop(1, 'rgba(170,190,235,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - w, y - sy / 15, 2 * w, sy / 15 + 1);
  }
  for (let j = 0; j < 120; j++) {
    const u = (t * 0.35 + j / 120 + hash2(j, 162) * 0.03) % 1, y = sy - u * sy * 1.1;
    const x = sx + (hash2(j, 163) - 0.5) * (0.4 + 3 * u) * e;
    ctx.fillStyle = `rgba(200,215,245,${0.65 * k * (1 - 0.5 * u)})`; ctx.fillRect(x, y, 2, 2);
  }
  // Éclats de lave incandescents : paraboles basses (sans air, rien ne les freine)
  for (let j = 0; j < 26; j++) {
    const c = hash2(j, 164) * 2 - 1, H = (4 + 10 * hash2(j, 165)) * e, P = c * 9 * e;
    const u = (t * 0.4 + hash2(j, 166)) % 1, x = sx + P * u, y = sy - 4 * H * u * (1 - u);
    ctx.fillStyle = `rgba(255,${130 + 80 * (1 - u)},40,${0.9 * (1 - u * 0.5)})`; ctx.fillRect(x, y, 2.5, 2.5);
  }
}
