// ---------- Lieux d'atterrissage ----------
// Le sol du jeu est un anneau de périmètre 2πR : on y place une longitude λ à x = R·λ (λ en radians).
// La latitude n'a pas de place dans ce sol à une dimension : elle sert aux descriptions (et au cratère polaire de Mercure).

// Vraies positions des anciennes missions : [latitude °N, longitude °E].
const POSITIONS_TRACES = {
  // Lune
  luna9: [7.08, -64.37], slim: [-13.3, 25.25], chandrayaan3: [-69.37, 32.32], apollo11: [0.674, 23.473],
  change5: [43.06, -51.92], apollo16: [-8.97, 15.5], apollo14: [-3.645, -17.47], lunokhod2: [25.85, 30.45],
  lunokhod1: [38.24, -35.0], apollo17: [20.19, 30.77], change6: [-41.64, -153.99], apollo12: [-3.01, -23.42],
  change3: [44.12, -19.51], apollo15: [26.13, 3.63], change4: [-45.44, 177.6],
  // Mars
  viking1: [22.27, -47.95], pathfinder: [19.13, -33.22], opportunity: [-2.2, -5.5], perseverance: [18.44, 77.45],
  mars3: [-45, -158], viking2: [47.97, 134.26], spirit: [-14.57, 175.47], curiosity: [-4.59, 137.44], zhurong: [25.07, 109.93],
  // Vénus, Titan, Mercure
  venera13: [-7.5, -57], huygens: [-10.25, 167.67], messenger: [54.44, -149.88],
};

// Mercure : seul le fond des cratères polaires reste dans l'ombre pour toujours (l'axe de Mercure n'est presque
// pas incliné). Il y fait −180 °C, et la glace d'eau s'y garde depuis des milliards d'années.
const CRATERE_MERCURE = { nom: 'cratère Prokofiev', lat: 85.8, lon: -62.9 };
const DISTANCE_TRACE = 300;   // on se pose à 300 m d'une ancienne mission, pour ne pas l'abîmer

function xLongitude(a, lon) { return a.rayonKm * 1000 * lon * DEG; }
function xTrace(a, t) { const p = POSITIONS_TRACES[t.id]; return p ? xLongitude(a, p[1]) : t.dx; }
function fmtCoord(lat, lon) {
  return `${fmt(Math.abs(lat), 1)}° ${lat >= 0 ? 'N' : 'S'}, ${fmt(Math.abs(lon), 1)}° ${lon >= 0 ? 'E' : 'O'}`;
}

// L'ancienne mission la plus proche d'un point du sol : { trace, d, ecart } (ecart < 0 : à gauche).
function tracePlusProche(a, x) {
  let best = null;
  for (const t of tracesSur(a.id)) {
    const e = ecartSol(a, xTrace(a, t), x);
    if (!best || Math.abs(e) < best.d) best = { trace: t, d: Math.abs(e), ecart: e };
  }
  return best;
}

// Zone de base repérée par une sonde. Sur Mercure, elle est forcément au fond d'un cratère polaire.
function zoneDeBase(a) {
  if (a.id === 'mercure') {
    const x = chercherZonePlate(a, xLongitude(a, CRATERE_MERCURE.lon));
    return x === null ? null : { x, ombre: true, lieu: `${CRATERE_MERCURE.nom}, près du pôle Nord (${fmtCoord(CRATERE_MERCURE.lat, CRATERE_MERCURE.lon)})` };
  }
  const x = chercherZonePlate(a);
  return x === null ? null : { x };
}

// Zone de base repérée par la sonde (le fanion vert), quel que soit le lieu choisi pour se poser.
function zoneSondeDuVol(vol) {
  const v = typeof etat !== 'undefined' && etat.enVoyage && etat.voyage;
  if (v) return (v.sites || {})[vol.astre.id] || null;
  return vol.site && vol.site.cle === 'sonde' ? vol.site : null;
}

// Dans le cratère polaire de Mercure : le Soleil ne se lève jamais.
function dansLOmbre(porteur) {
  const s = porteur && porteur.site;
  return !!(s && s.ombre && porteur.astre && Math.abs(ecartSol(porteur.astre, porteur.x, s.x)) < 5000);
}

// Température au sol à cet instant, avec le jour et la nuit (null si l'astre n'a pas d'écart notable).
function temperatureLocale(vol) {
  const a = vol.astre, plage = plageTemperature(a);
  if (!plage || a.type !== 'solide') return null;
  const j = jourLocal(a, tempsCiel(vol), vol);
  return plage.nuit + (plage.jour - plage.nuit) * j;
}

// Les lieux où l'on peut se poser. v : la campagne (null en visite rapide, où l'on sait tout d'avance).
function lieuxDescente(a, v) {
  const l = [];
  const sonde = v ? (v.sites || {})[a.id] : (a.id === 'mercure' ? zoneDeBase(a) : null);
  const renseigne = !v || !!sonde;                 // une sonde a cartographié l'astre (ou visite rapide)
  const nuit = a.id === 'mercure' && renseigne;    // Mercure : la sonde sait où tombe la nuit
  const base = v && (v.bases || []).find((b) => b.astre === a.id);
  if (base) {
    const ombre = !!(sonde && sonde.ombre && Math.abs(ecartSol(a, base.x, sonde.x)) < 1000);
    l.push({ cle: 'base', nom: '🏠 La base', detail: `Se poser à côté de la base${ombre ? `, au fond du ${CRATERE_MERCURE.nom} (nuit permanente, −180 °C)` : ''}. On y fait le plein.`, x: base.x, xDescente: base.x - 90, ombre, nuit: nuit && !ombre, conseille: true });
  }
  if (sonde && (!base || Math.abs(ecartSol(a, base.x, sonde.x)) > 1000)) {
    l.push({ ...sonde, cle: 'sonde', nom: '🟢 Zone de base repérée par la sonde',
      detail: sonde.ombre ? `Au fond du ${sonde.lieu || CRATERE_MERCURE.nom} : nuit permanente, −180 °C, glace d’eau. Le seul endroit où l’on peut bâtir une base ${sur(a)}.`
        : `Terrain plat${sonde.prod ? `, ${sonde.ressource}` : ''}. C’est là qu’on peut construire la base.`,
      xDescente: sonde.x - 90, nuit: nuit && !sonde.ombre, conseille: !base });
  }
  l.push({ cle: 'defaut', nom: '⬇ Point de descente habituel', detail: 'Longitude 0°.', x: 0, xDescente: 0, nuit, conseille: !l.some((u) => u.conseille) });
  for (const t of tracesSur(a.id)) {
    const p = POSITIONS_TRACES[t.id], x = xTrace(a, t) + DISTANCE_TRACE;
    l.push({ cle: 'trace:' + t.id, trace: t.id, nom: `${t.nom} (${t.annee})`, detail: p ? fmtCoord(p[0], p[1]) : '', x, xDescente: x, nuit });
  }
  return l;
}

// Texte d'avertissement propre à l'astre (Mercure).
function noteLieux(a, v) {
  if (a.id !== 'mercure') return '';
  const sonde = v ? (v.sites || {})[a.id] : true;
  return sonde
    ? '☀️ Mercure : 430 °C en plein jour, −180 °C la nuit, et un jour dure 176 jours terrestres. Grâce à la sonde, l’atterrisseur arrive à la tombée de la nuit, quand on peut sortir. La base ne se bâtit qu’au fond du cratère polaire, dans l’ombre éternelle.'
    : '⚠ Mercure : aucune sonde n’a cartographié l’astre. L’atterrisseur arrivera en plein jour (430 °C) : impossible de sortir à pied, ni de bâtir une base. Le robot, lui, tient la chaleur. Envoyez d’abord une sonde : elle trouvera la nuit et le cratère polaire.';
}

// Fenêtre « Où se poser ? » : suite(site) est appelée avec le lieu choisi.
function ouvrirChoixLieu(a, v, suite, titre = 'Descendre') {
  if (a.type !== 'solide' || estOrigine(a.id)) return suite(null);
  const lieux = lieuxDescente(a, v), m = $('modale');
  const choisi = lieux.find((u) => u.conseille) || lieux[0];
  const note = noteLieux(a, v), traces = lieux.filter((u) => u.trace);
  const option = (u) => `<label class="choix-ravito"><input type="radio" name="lieu" value="${u.cle}" ${u === choisi ? 'checked' : ''}> <b>${u.nom}</b>${u.conseille ? ' <span class="doux">(conseillé)</span>' : ''}<br><span class="doux">${u.detail}</span></label>`;
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>📍 Où se poser ${sur(a)} ?</h2>
    <p>On pose la base là où l’on veut exploiter les ressources, mais on peut explorer ailleurs : les anciennes missions sont à leur vraie place.</p>${note ? `<p class="encart-refus">${note}</p>` : ''}</div><button class="fermer">✕</button></header>
    <section>${lieux.filter((u) => !u.trace).map(option).join('')}
    <label class="choix-ravito"><input type="radio" name="lieu" value="libre"> <b>🧭 Ailleurs</b>, longitude <input type="number" id="lieu-lon" min="-180" max="180" step="1" value="90" style="width:5em">° <span class="doux">(est positif)</span><br><span class="doux">Explorer un coin que personne n’a vu.</span></label></section>
    ${traces.length ? `<section><h3>📍 Anciennes missions, à leur vraie place</h3><p class="doux">On se pose à ${DISTANCE_TRACE} m, pour aller voir à pied, en astromobile ou avec le robot.</p><div class="grille-lieux">${traces.map((u) => `<label><input type="radio" name="lieu" value="${u.cle}"> <b>${u.nom}</b> <span class="doux">${u.detail}</span></label>`).join('')}</div></section>` : ''}
    <div class="actions"><span></span><button id="lieu-ok" class="principal">⬇ ${titre} ici</button></div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  $('lieu-lon').onfocus = () => { m.querySelector('input[name=lieu][value=libre]').checked = true; };
  $('lieu-ok').onclick = () => {
    const cle = (m.querySelector('input[name=lieu]:checked') || {}).value || 'defaut';
    let site = lieux.find((u) => u.cle === cle);
    if (cle === 'libre') {
      const lon = Math.max(-180, Math.min(180, Number($('lieu-lon').value) || 0));
      const x = xLongitude(a, lon);
      site = { cle, nom: `longitude ${fmt(lon)}°`, x, xDescente: x, nuit: lieux.find((u) => u.cle === 'defaut').nuit };
    }
    Infos.fermer();
    suite(site);
  };
}
