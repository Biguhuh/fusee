'use strict';
// Systèmes stellaires proches, jouables après un départ « science-fiction ».
// Données publiées (masses minimales mesurées par vitesse radiale, rayons et périodes quand ils sont connus).
// Ce qui manque est estimé et marqué comme tel : rayon d'après la masse, température d'équilibre d'après
// la lumière reçue, atmosphère inconnue (supposée absente pour les planètes rocheuses), ressources supposées.

const MASSE_TERRE_GM = 398600.4418;      // km³/s²
const RAYON_SOLEIL_KM = 695700;
const RAYON_TERRE_KM = 6371;
const RAYON_JUPITER_KM = 69911;

// Étoiles : masse, rayon (Soleil = 1), luminosité (Soleil = 1), température (K).
// Planètes : demi-grand axe (UA), excentricité, période (jours), masse (Terre = 1, souvent minimale),
// rayon (Terre = 1) s'il est mesuré, statut (confirmée, candidate…).
const DONNEES_ETOILES = {
  proxima: {
    nom: 'Proxima Centauri', distanceAL: 4.25, positionAL: [-1.6, -1.2, -3.8],
    etoiles: [{ nom: 'Proxima Centauri', type: 'naine rouge M5,5', masse: 0.122, rayon: 0.154, lum: 0.0017, teff: 3042, couleur: '#ff7043' }],
    planetes: [
      { nom: 'Proxima d', a: 0.02885, e: 0.04, P: 5.12, m: 0.26, statut: 'confirmée (2025), masse minimale' },
      { nom: 'Proxima b', a: 0.04857, e: 0.02, P: 11.19, m: 1.07, statut: 'confirmée, masse minimale ; dans la zone habitable' },
    ],
  },
  alphacen: {
    nom: 'Alpha Centauri', distanceAL: 4.37, positionAL: [-1.6, -1.4, -3.8],
    etoiles: [
      { nom: 'Alpha Centauri A', type: 'naine jaune G2', masse: 1.08, rayon: 1.22, lum: 1.52, teff: 5790, couleur: '#fff1c4' },
      { nom: 'Alpha Centauri B', type: 'naine orange K1', masse: 0.91, rayon: 0.86, lum: 0.50, teff: 5260, couleur: '#ffcf8a', a: 23.4, e: 0.52, P: 79.9 * 365.25 },
    ],
    planetes: [
      { nom: 'Alpha Centauri A b', a: 2.0, e: 0.1, m: 100, statut: 'candidate (image du télescope James Webb, 2025), géante à confirmer' },
    ],
  },
  barnard: {
    nom: 'Étoile de Barnard', distanceAL: 5.96, positionAL: [-0.1, -5.9, 0.5],
    etoiles: [{ nom: 'Étoile de Barnard', type: 'naine rouge M4', masse: 0.162, rayon: 0.187, lum: 0.0035, teff: 3195, couleur: '#ff8a50' }],
    planetes: [
      { nom: 'Barnard d', a: 0.0188, e: 0, P: 2.34, m: 0.26, statut: 'confirmée (2025), masse minimale' },
      { nom: 'Barnard b', a: 0.0229, e: 0, P: 3.15, m: 0.30, statut: 'confirmée (2024), masse minimale' },
      { nom: 'Barnard c', a: 0.0274, e: 0, P: 4.12, m: 0.34, statut: 'confirmée (2025), masse minimale' },
      { nom: 'Barnard e', a: 0.0381, e: 0, P: 6.74, m: 0.19, statut: 'confirmée (2025), masse minimale' },
    ],
  },
  lalande: {
    nom: 'Lalande 21185', distanceAL: 8.31, positionAL: [-6.5, 1.6, 4.9],
    etoiles: [{ nom: 'Lalande 21185', type: 'naine rouge M2', masse: 0.39, rayon: 0.39, lum: 0.022, teff: 3550, couleur: '#ff9e60' }],
    planetes: [
      { nom: 'Lalande 21185 b', a: 0.079, e: 0.1, P: 12.95, m: 2.7, statut: 'confirmée, masse minimale' },
      { nom: 'Lalande 21185 c', a: 2.9, e: 0.1, P: 2900, m: 13.6, statut: 'confirmée, masse minimale (type Neptune)' },
    ],
  },
  epseri: {
    nom: 'Epsilon Eridani', distanceAL: 10.47, positionAL: [6.2, 8.3, -1.7],
    etoiles: [{ nom: 'Epsilon Eridani', type: 'naine orange K2, jeune', masse: 0.82, rayon: 0.735, lum: 0.32, teff: 5080, couleur: '#ffc27a' }],
    planetes: [
      { nom: 'Epsilon Eridani b (AEgir)', a: 3.5, e: 0.07, P: 2690, m: 210, statut: 'confirmée, géante d’environ 0,7 masse de Jupiter' },
    ],
    // Ceintures de poussières observées vers 3 et 20 UA : astéroïdes supposés (hypothétiques).
    asteroides: [{ nom: 'Astéroïde de la ceinture intérieure', a: 3.0, rayon: 250 }, { nom: 'Planétoïde de la ceinture extérieure', a: 20, rayon: 400 }],
  },
  tauceti: {
    nom: 'Tau Ceti', distanceAL: 11.9, positionAL: [10.3, 5.0, -3.3],
    etoiles: [{ nom: 'Tau Ceti', type: 'naine jaune G8, très vieille', masse: 0.78, rayon: 0.79, lum: 0.52, teff: 5340, couleur: '#ffe7a8' }],
    planetes: [
      { nom: 'Tau Ceti g', a: 0.133, e: 0.06, P: 20, m: 1.75, statut: 'candidate, masse minimale' },
      { nom: 'Tau Ceti h', a: 0.243, e: 0.23, P: 49.4, m: 1.83, statut: 'candidate, masse minimale' },
      { nom: 'Tau Ceti e', a: 0.538, e: 0.18, P: 163, m: 3.9, statut: 'candidate, masse minimale ; bord de la zone habitable' },
      { nom: 'Tau Ceti f', a: 1.334, e: 0.16, P: 636, m: 3.9, statut: 'candidate, masse minimale ; bord de la zone habitable' },
    ],
    asteroides: [{ nom: 'Astéroïde du disque de débris', a: 10, rayon: 300 }],
  },
  trappist1: {
    nom: 'TRAPPIST-1', distanceAL: 40.7, positionAL: [12.0, -38.6, -3.0],
    etoiles: [{ nom: 'TRAPPIST-1', type: 'naine rouge ultra-froide M8', masse: 0.0898, rayon: 0.1192, lum: 0.000553, teff: 2566, couleur: '#ff5e3a' }],
    planetes: [
      { nom: 'TRAPPIST-1 b', a: 0.01154, e: 0, P: 1.511, m: 1.374, r: 1.116, statut: 'confirmée, masse et rayon mesurés' },
      { nom: 'TRAPPIST-1 c', a: 0.01580, e: 0, P: 2.422, m: 1.308, r: 1.097, statut: 'confirmée, masse et rayon mesurés' },
      { nom: 'TRAPPIST-1 d', a: 0.02227, e: 0, P: 4.049, m: 0.388, r: 0.788, statut: 'confirmée ; bord intérieur de la zone habitable' },
      { nom: 'TRAPPIST-1 e', a: 0.02925, e: 0, P: 6.101, m: 0.692, r: 0.920, statut: 'confirmée ; dans la zone habitable' },
      { nom: 'TRAPPIST-1 f', a: 0.03849, e: 0, P: 9.208, m: 1.039, r: 1.045, statut: 'confirmée ; dans la zone habitable' },
      { nom: 'TRAPPIST-1 g', a: 0.04683, e: 0, P: 12.352, m: 1.321, r: 1.129, statut: 'confirmée ; bord extérieur de la zone habitable' },
      { nom: 'TRAPPIST-1 h', a: 0.06189, e: 0, P: 18.773, m: 0.326, r: 0.755, statut: 'confirmée, glacée' },
    ],
  },
};

// Couleur d'une planète selon sa nature et sa température (°C).
function couleursExo(type, t) {
  if (type === 'gazeuse') return t < -150 ? { sol: '#5b7fae', ciel: '#7fa3c9', disque: '#8fb0d6' } : { sol: '#b38a58', ciel: '#d4b27f', disque: '#d8b886' };
  if (t > 300) return { sol: '#6e3426', ciel: '#000000', disque: '#8d4a35' };
  if (t > 60) return { sol: '#7a5a46', ciel: '#000000', disque: '#94735c' };
  if (t > -110) return { sol: '#7d756a', ciel: '#000000', disque: '#9a9184' };
  return { sol: '#b9b6b0', ciel: '#000000', disque: '#d6d3cc' };
}

// Ressource supposée d'une planète rocheuse (aucune n'est mesurée) : [texte, kg d'ergols par jour].
function ressourceExo(t) {
  if (t < -120) return ['glace d’eau (supposée) → hydrogène et oxygène', 1500];
  if (t < 20) return ['glace d’eau des pôles et du sous-sol (supposée)', 1000];
  if (t < 120) return ['eau piégée dans les minéraux (supposée)', 400];
  return [null, 0];
}

// Construit les astres jouables d'un système : étoile(s), planètes, astéroïdes supposés.
function construireAstresSysteme(id) {
  const d = DONNEES_ETOILES[id], liste = [];
  const e0 = d.etoiles[0], idEtoile = id + '_etoile';
  const lum = d.etoiles.reduce((s, e) => s + (e.a ? 0 : e.lum), 0);
  const etoile = (e, k) => {
    const R = e.rayon * RAYON_SOLEIL_KM, gm = e.masse * GM_SOLEIL;
    return {
      id: k === 0 ? idEtoile : `${id}_etoile${k + 1}`, nom: e.nom, type: 'etoile', parent: null, systeme: id,
      distanceUA: 0, rayonKm: R, gm, g: (gm * 1e9) / (R * 1000) ** 2, tempSurface: Math.round(e.teff - KELVIN), vMax: 0,
      atm: { p0: 0.08, rho0: 2e-4, H: 150, t0: e.teff - KELVIN, gradient: -10, tHaut: e.teff - KELVIN },
      depart: { alt: R * 1000 * 6, vitesse: 150000 },
      couleurs: { sol: e.couleur, ciel: e.couleur, disque: e.couleur }, surface: 'plasma',
      note: `Étoile ${e.type} : ${fmt(e.masse, 2)} masse solaire, ${fmt(e.rayon, 2)} rayon solaire, ${fmt(e.lum, e.lum < 0.01 ? 4 : 2)} fois la lumière du Soleil.`,
      luminosite: e.lum,
      orbite: e.a ? { centre: idEtoile, a: e.a * UA_KM, e: e.e || 0, varpi: 0, M0: 0, n: 360 / e.P, retro: false } : null,
    };
  };
  d.etoiles.forEach((e, k) => liste.push(etoile(e, k)));
  const planete = (p, i, asteroide) => {
    const flux = lum / (p.a * p.a);
    const teq = 278.6 * Math.pow(flux, 0.25) * 0.915 - KELVIN;
    const m = asteroide ? null : p.m;
    const gazeuse = !asteroide && m > 10;
    let R;
    if (asteroide) R = p.rayon;
    else if (p.r) R = p.r * RAYON_TERRE_KM;
    else if (gazeuse) R = m > 50 ? RAYON_JUPITER_KM * 1.0 : RAYON_TERRE_KM * 3.9;
    else R = RAYON_TERRE_KM * Math.pow(m, 0.27);
    const gm = asteroide ? 6.674e-20 * (4 / 3) * Math.PI * R ** 3 * 2.0e12 : m * MASSE_TERRE_GM;
    const g = (gm * 1e9) / (R * 1000) ** 2;
    const P = p.P || 365.25 * Math.sqrt(p.a ** 3 / e0.masse);
    const pid = `${id}_${asteroide ? 'ast' : 'p'}${i + 1}`;
    const t = Math.round(teq);
    const alt = gazeuse ? 20000 : Math.min(3000, Math.max(300, R * 1000 * 0.3));
    const a = {
      id: pid, nom: p.nom, type: gazeuse ? 'gazeuse' : 'solide', parent: null, systeme: id, exo: true,
      distanceUA: p.a, flux, rayonKm: R, gm, g, tempSurface: t, vMax: 3,
      atm: gazeuse ? { p0: 1, rho0: 0.16, H: 27, t0: t, gradient: 2.0, tHaut: t - 40 } : null,
      cible: gazeuse ? 2 : undefined,
      depart: gazeuse ? { alt: 20000, vitesse: 150 } : { alt, vitesse: Math.max(0.3, Math.min(40, 0.5 * Math.sqrt(2 * g * alt))) },
      couleurs: couleursExo(gazeuse ? 'gazeuse' : 'solide', t),
      surface: gazeuse ? 'aucune (gaz)' : asteroide ? 'roche et glace (supposées)' : t > 300 ? 'roche brûlante (supposée)' : t < -110 ? 'glace (supposée)' : 'roche (supposée)',
      note: asteroide
        ? `Objet supposé dans la ceinture de poussières observée vers ${fmt(p.a)} UA. Hypothétique : taille et nature estimées.`
        : `${p.statut}. ${p.r ? '' : 'Rayon estimé d’après la masse. '}Température d’équilibre ${t} °C (estimée d’après la lumière reçue). ${gazeuse ? '' : 'Atmosphère inconnue, supposée absente.'}`,
      relief: gazeuse ? undefined : { amplitude: Math.max(15, Math.min(150, R * 0.02)), longueur: Math.max(200, Math.min(1800, R * 0.25)), crateres: t < -110 ? 0.5 : 0.3 },
      rayonEstime: !p.r,
      orbite: { centre: idEtoile, a: p.a * UA_KM, e: p.e || 0, varpi: hash2(i + 1, id.length) * 360, M0: hash2(i + 7, id.length) * 360, n: 360 / P, retro: false, periodeJours: P },
    };
    if (asteroide) a.asteroide = true;
    if (!gazeuse) { const r = ressourceExo(t); if (r[0]) a.ressource = r; }
    // Planètes très proches de leur étoile : rotation bloquée (une face toujours vers l'étoile).
    if (p.a < 0.1) a.rotationH = P * 24;
    return a;
  };
  d.planetes.forEach((p, i) => liste.push(planete(p, i, false)));
  (d.asteroides || []).forEach((p, i) => liste.push(planete(p, i, true)));
  // Grandeurs dérivées, comme pour le Système solaire.
  const parId = Object.fromEntries(liste.map((a) => [a.id, a]));
  for (const a of liste) {
    if (a.orbite) {
      const gmC = parId[a.orbite.centre].gm;
      a.soiReelle = a.orbite.a * Math.pow(a.gm / gmC, 0.4);
      a.soi = Math.max(a.soiReelle, a.rayonKm * 3);
    } else a.soi = Infinity;
    a.grosse = true;
  }
  for (const a of liste) a.categorie = categorieDe(a);
  return liste;
}

// Enregistre chaque système dans SYSTEMES (mêmes champs que le Système solaire).
for (const [id, d] of Object.entries(DONNEES_ETOILES)) {
  const liste = construireAstresSysteme(id);
  const planetes = liste.filter((a) => a.type !== 'etoile').map((a) => a.id);
  const lum = d.etoiles.reduce((s, e) => s + (e.a ? 0 : e.lum), 0);
  const aMax = Math.max(...liste.filter((a) => a.orbite).map((a) => a.orbite.a / UA_KM), 0.05);
  SYSTEMES[id] = {
    id, nom: `Système de ${d.nom}`, tout: `Tout le système de ${d.nom}`, etoile: id + '_etoile', luminosite: lum,
    distanceA: `à ${d.etoiles[0].nom}`, origine: null, nomOrigine: '', origineSans: '',
    positionAL: d.positionAL, distanceAL: d.distanceAL, vueUA: aMax * 2.5,
    planetes, principaux: planetes, objectifs: planetes,
    carte: [[id + '_etoile', []], ...planetes.map((p) => [p, []])],
    illimite: false,      // pas de Terre ici : ni ravitaillement courant, ni plein gratuit
    retour: false,        // aller simple
    astres: liste,
  };
}
