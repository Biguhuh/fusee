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
    if (this.saisonDite || this.terre) return;
    this.saisonDite = true;
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
