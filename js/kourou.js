// Décollage de la Terre depuis Kourou (Centre spatial guyanais, 5,24° N, 52,77° O), plein est.
// Sous la fusée défile la trace au sol d'une orbite inclinée de 5,2° : Guyane, océan Atlantique,
// golfe de Guinée, Afrique centrale (Mont Kenya), océan Indien, Indonésie, Nouvelle-Guinée, Pacifique,
// Andes, Roraima, et retour en Guyane. L'abscisse x du vol est la distance au sol depuis le pas de tir (m).

const KOUROU = { lat: 5.24, lon: -52.77, inclinaison: 5.2 };

// Repères le long de la trace, d'ouest en est : [longitude du début, milieu, nom, altitude au début (m)].
// L'altitude varie en ligne droite jusqu'au repère suivant (0 sur les côtes).
const TRACE_KOUROU = [
  [-52.62, 'ocean', 'océan Atlantique', 0],
  [9.85, 'foret', 'Cameroun', 0], [13.5, 'foret', 'Cameroun', 700],
  [16.2, 'foret', 'Congo', 400], [18.6, 'foret', 'RD Congo', 350],
  [29.0, 'montagne', 'RD Congo', 1000], [29.9, 'montagne', 'Rwenzori', 2500],
  [30.6, 'savane', 'Ouganda', 1200],
  [34.0, 'savane', 'Kenya', 1200], [35.5, 'montagne', 'Kenya', 2500], [36.3, 'montagne', 'Rift', 1900],
  [37.0, 'montagne', 'Mont Kenya', 3000], [37.3, 'montagne', 'Mont Kenya', 5199], [37.6, 'montagne', 'Kenya', 2000],
  [38.3, 'sec', 'Kenya', 600], [41.0, 'sec', 'Somalie', 200],
  [42.5, 'ocean', 'océan Indien', 0],
  [103.2, 'foret', 'Sumatra', 0], [103.7, 'montagne', 'Sumatra', 1800], [104.3, 'foret', 'Sumatra', 100],
  [105.9, 'ocean', 'mer de Java', 0],
  [119.45, 'foret', 'Célèbes', 0], [119.9, 'montagne', 'Célèbes', 1500],
  [120.35, 'ocean', 'golfe de Bone', 0],
  [121.3, 'foret', 'Célèbes', 0], [122.0, 'foret', 'Célèbes', 600],
  [122.8, 'ocean', 'mer de Banda', 0],
  [137.5, 'foret', 'Nouvelle-Guinée', 0], [139.0, 'foret', 'Nouvelle-Guinée', 200], [140.5, 'montagne', 'Nouvelle-Guinée', 1500],
  [141.5, 'montagne', 'Nouvelle-Guinée', 3000], [144.0, 'montagne', 'Nouvelle-Guinée', 2500], [145.2, 'foret', 'Nouvelle-Guinée', 300],
  [145.7, 'ocean', 'mer de Bismarck', 0],
  [150.5, 'foret', 'Nouvelle-Bretagne', 0], [151.3, 'montagne', 'Nouvelle-Bretagne', 1500],
  [152.2, 'ocean', 'océan Pacifique', 0],
  [-77.4, 'foret', 'Colombie', 0], [-76.6, 'montagne', 'Andes', 2500], [-75.6, 'montagne', 'Andes', 1000],
  [-75.3, 'montagne', 'Nevado del Ruiz', 4500], [-74.8, 'savane', 'Colombie', 400], [-74.4, 'montagne', 'Andes', 600],
  [-74.0, 'montagne', 'Andes (Bogotá)', 2600], [-73.0, 'montagne', 'Andes', 3000],
  [-72.4, 'savane', 'Llanos', 300], [-67.8, 'savane', 'Venezuela', 100], [-64.5, 'montagne', 'Venezuela', 1200],
  [-61.2, 'foret', 'Venezuela', 1200], [-60.76, 'montagne', 'Mont Roraima', 2810], [-60.3, 'foret', 'Guyana', 300],
  [-58.0, 'foret', 'Guyana', 100], [-57.0, 'foret', 'Suriname', 50], [-54.0, 'foret', 'Guyane', 50],
].map(([lon, type, nom, alt]) => ({ lon, type, nom, alt, d: (((lon - -52.62) % 360) + 360) % 360 }));

const COULEURS_GEO = { ocean: '#1d5ea8', foret: '#2f6b2e', savane: '#8c9a4c', sec: '#b39b66', montagne: '#6f6a4e' };

// Pour chaque terre, distance (degrés de trace) aux côtes qui l'encadrent : le relief s'adoucit vers la mer.
(function () {
  const n = TRACE_KOUROU.length;
  for (let i = 0; i < n; i++) {
    const p = TRACE_KOUROU[i];
    if (p.type === 'ocean') continue;
    let j = i; while (TRACE_KOUROU[j].type !== 'ocean') j = (j - 1 + n) % n;
    let k = i; while (TRACE_KOUROU[k].type !== 'ocean') k = (k + 1) % n;
    p.coteAvant = TRACE_KOUROU[(j + 1) % n].d;     // début de cette terre
    p.coteApres = TRACE_KOUROU[k].d || 360;         // retour à la mer
  }
})();

// Longitude (degrés) sous la fusée après x mètres vers l'est. Kourou est au plus haut de la trace
// (latitude = inclinaison), la trace redescend ensuite vers l'équateur.
function lonKourou(x) {
  const D = x / (ASTRES_PAR_ID.terre.rayonKm * 1000);
  const i = (KOUROU.inclinaison * Math.PI) / 180;
  const dl = Math.atan2(Math.cos(i) * Math.cos(D), -Math.sin(D)) * 180 / Math.PI - 90;
  return ((KOUROU.lon + dl + 540) % 360) - 180;
}

// Ce qu'il y a sous la trace : type de sol, nom, altitude et distance aux côtes (m).
function geoKourou(x) {
  const d = (((lonKourou(x) - -52.62) % 360) + 360) % 360;
  const T = TRACE_KOUROU;
  let i = T.length - 1;
  for (let k = 0; k < T.length; k++) { if (T[k].d > d) { i = k - 1; break; } }
  const p = T[i], q = T[(i + 1) % T.length];
  const fin = q.d || 360;
  const frac = (d - p.d) / Math.max(1e-9, fin - p.d);
  const alt = p.type === 'ocean' ? 0 : p.alt + (q.alt - p.alt) * frac;
  const mParDegre = (Math.PI / 180) * ASTRES_PAR_ID.terre.rayonKm * 1000;
  const cote = p.type === 'ocean' ? 0 : Math.min(d - p.coteAvant, p.coteApres - d) * mParDegre;
  return { type: p.type, nom: p.nom, alt, cote, index: i, d };
}

// Prochaine étendue de l'autre sorte (terre après la mer, ou mer après la terre) : nom et distance (m).
function prochainChangementKourou(x) {
  const g = geoKourou(x), T = TRACE_KOUROU, n = T.length;
  const mer = g.type === 'ocean';
  for (let s = 1; s < n; s++) {
    const p = T[(g.index + s) % n];
    if ((p.type === 'ocean') !== mer) {
      const dd = (((p.d - g.d) % 360) + 360) % 360;
      return { nom: p.nom, distance: (dd * Math.PI / 180) * ASTRES_PAR_ID.terre.rayonKm * 1000 };
    }
  }
  return null;
}

// Relief de la Terre au départ de Kourou : collines habituelles sur les terres (adoucies sur 3 km
// près des côtes), plus les grands reliefs (Andes, Mont Kenya…) ; la mer est plate, au niveau 0.
function terrainKourou(collines) {
  return function hauteur(x) {
    const g = geoKourou(x);
    if (g.type === 'ocean') return 0;
    const k = Math.min(1, g.cote / 3000);
    const amp = ASTRES_PAR_ID.terre.relief.amplitude;
    // Collines remontées au-dessus du niveau de la mer (elles vont d'environ −1,8 à +1,8 fois l'amplitude).
    return Math.max(0.5, g.alt + ((collines ? collines(x) : 0) + 1.8 * amp) * 0.5 * k);
  };
}
