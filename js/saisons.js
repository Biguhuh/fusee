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
    if (this.saisonDite || this.terre || this.type !== 'spationaute') return;
    this.saisonDite = true;
    const a = this.astre, t = tempsCiel(this.vol);
    if (a.type !== 'solide' || dansLOmbre(this.vol)) return;
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
