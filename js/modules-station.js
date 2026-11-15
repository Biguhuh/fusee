'use strict';
// ---------- Stations construites module par module (Système solaire) ----------
// Comme l'ISS, Mir ou Tiangong : une station naît d'un noyau lancé exprès (Hercule pour l'orbite terrestre,
// un cargo lourd ailleurs, avec le vrai trajet), puis grandit d'un module par niveau. Chaque module arrive,
// s'amarre tout seul, et reste inerte tant qu'une sortie d'assemblage à deux (ou un robot, deux fois plus lent)
// ne l'a pas branché. Hors du Système solaire, faute de Terre pour lancer, rien ne change : le vaisseau déploie.

const MODULES_STATION = {
  1: { nom: 'Noyau', comme: 'Zarya et Zvezda (ISS), Tianhe (Tiangong)', quoi: 'module de vie, propulsion, panneaux, amarrage, petit sas' },
  2: { nom: 'Nœud et module logistique', comme: 'Unity, Harmony et Leonardo (ISS)', quoi: 'stockage doublé' },
  3: { nom: 'Laboratoire-atelier et bras robotique', comme: 'Destiny, Canadarm2 et Dextre (ISS)', quoi: 'chantiers plus rapides, bras robotique pour les raccordements' },
  4: { nom: 'Habitat', comme: 'BEAM (ISS), Wentian (Tiangong)', quoi: 'habitat pour l’équipe' },
  5: { nom: 'Grande poutre et chantier interstellaire', comme: 'les poutres S0 à S6 de l’ISS', quoi: 'chantier du vaisseau de départ' },
};
const DUREE_NOYAU_LOCAL = JOUR;   // Terre : lancement, mise en orbite, panneaux déployés

// Raccorder un module : une « mission » de sortie comme les pannes (eva-missions.js), inspirée de STS-88 et des
// sorties d'assemblage de l'ISS. Elle n'arrive jamais au hasard (assemblage : true).
PANNES_STATION.raccordement = {
  nom: 'Module à raccorder', icone: '🔌', assemblage: true, effet: 'module amarré, inerte tant qu’il n’est pas branché',
  ref: 'ISS, décembre 1998 (STS-88) : trois sorties pour brancher Unity à Zarya, câbles d’énergie et de données, poignées.',
  taches: [
    { nom: 'Retirer les protections de lancement (à deux)', lieu: ['nouveau', 0.5], duree: 20 * 60, deux: true },
    { nom: 'Brancher les câbles d’énergie et de données', lieu: ['nouveau', 0.5], duree: 40 * 60, outil: true },
    { nom: 'Raccorder le refroidissement, l’ammoniac (à deux)', lieu: ['poutre', 0.3, 1], duree: 30 * 60, outil: true, deux: true },
    { nom: 'Poser les mains courantes et ouvrir les écoutilles', lieu: ['nouveau', 0.5], duree: 20 * 60, outil: true },
  ],
};

function stationsParModules() { return ressourcesIllimitees(); }
function nomModule(n) { return (MODULES_STATION[n] || MODULES_STATION[5]).nom; }
// Bras robotique (dès le niveau 3) ou robot en stock : de quoi raccorder sans sortie.
function brasStation(st) { return (st.niveau || 1) >= 3; }

// Un module (extension de station) en stock : il s'amarre, à raccorder.
function amarrerModule(v, st, log) {
  const n = (st.niveau || 1) + 1;
  if (n > 5 || st.module || (st.stock.extensionsStation || 0) <= 0) return;
  st.stock.extensionsStation -= 1;
  st.module = { niveau: n, t: v.t };
  const M = MODULES_STATION[n];
  log(`🛰 ${M.nom} amarré ${au(st)}, comme ${M.comme} : à raccorder. Une sortie d’assemblage à deux le branche (orbiteur amarré, bouton « Sortie »)${brasStation(st) ? ', sinon le bras de la station' : ', sinon un robot'}, deux fois plus lentement.`);
}
// Module branché : la station passe au niveau suivant.
function raccorderModule(v, st, log) {
  if (!st.module) return;
  st.niveau = st.module.niveau;
  delete st.module;
  log(`🔌 ${nomModule(st.niveau)} raccordé ${au(st)} : niveau ${st.niveau}, ${niveauStation(st).apport}.`);
}

// ---------- Noyau ----------
// Astres autour desquels on peut lancer un noyau (pas de station, pas de noyau déjà en route).
function noyauEnRoute(v, astreId) { return (v.cargos || []).find((c) => c.noyau && c.cible === astreId) || null; }
function astresPourNoyau(v) {
  return ASTRES.filter((a) => a.type !== 'etoile' && a.type !== 'objet' && !stationSur(v, a.id) && !noyauEnRoute(v, a.id));
}
// Durée du trajet d'un noyau (s), fenêtre de tir comprise ; null si inconnue.
function dureeNoyau(origineId, astreId) {
  const d = Orbiteur.departCargo(origineId);
  if (!d) return null;
  if (d.centre === astreId) return estOrigine(astreId) && estOrigine(origineId) ? DUREE_NOYAU_LOCAL : DUREE_RDV_LOCAL;
  try { const p = Orbiteur.planTrajet({ ...d, transfert: null, cible: astreId }); return p.fin === 'arrivee' ? p.tFin - p.t0 : null; } catch (e) { return null; }
}

function ouvrirLancementNoyau(v, astreId, apres) {
  const a = ASTRES_PAR_ID[astreId];
  if (stationSur(v, astreId)) return Orbiteur.log(`Il y a déjà une station ${enOrbite(a)}.`);
  if (noyauEnRoute(v, astreId)) return Orbiteur.log(`Un noyau de station est déjà en route ${enOrbite(a)}.`);
  const origines = [];
  const terre = planeteOrigine();
  if (terre) {
    const prix = TARIFS.lanceurs.station.prix, val = TARIFS.materiel.kits.prix;
    origines.push({ id: terre.id, titre: `🚀 Depuis ${le(terre)} : ${estOrigine(astreId) ? 'Hercule' : 'Hercule et son étage de transfert'}`,
      texte: `${fmtEuros(prix)} le lancement, ${fmtEuros(val)} le module, plus l’assurance.` });
  }
  for (const st of v.stations) {
    if ((st.stock.kits || 0) > 0) origines.push({ id: st.id, titre: `🛰 Depuis ${le(st)} : un kit de station de son stock (${fmt(st.stock.kits)})`, texte: 'Un cargo l’emporte, sans lancement à payer.' });
  }
  const m = $('modale');
  const ligne = (o, i) => {
    const d = dureeNoyau(o.id, astreId);
    return `<label class="choix-ravito"><input type="radio" name="noyau-orig" value="${o.id}" ${i === 0 ? 'checked' : ''}>
      <b>${o.titre}</b><br><span class="doux">${o.texte} ${d ? `Arrivée dans ≈ ${fmtDuree(d)}, fenêtre de tir comprise.` : 'Trajet : durée inconnue pour l’instant.'}</span></label>`;
  };
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🛰 Noyau de station ${enOrbite(a)}</h2>
    <p>${majuscule(MODULES_STATION[1].quoi)}, comme ${MODULES_STATION[1].comme}. Il ${estOrigine(astreId) ? 'se met en orbite à 400 km' : 'fait le vrai trajet, puis se met en orbite seul'}, et déploie ses panneaux : la station existe, au niveau 1, vide. Elle grandira ensuite d’un module par niveau.</p></div><button class="fermer">✕</button></header>
    <section>${origines.length ? origines.map(ligne).join('') : '<p class="doux">Aucune origine possible : ni Terre, ni kit de station en stock.</p>'}</section>
    <div class="actions"><button id="noyau-ok" class="principal" ${origines.length ? '' : 'disabled'}>🚀 Lancer le noyau</button></div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  $('noyau-ok').onclick = () => {
    const c = m.querySelector('input[name=noyau-orig]:checked');
    Infos.fermer();
    if (c) Orbiteur.lancerNoyau(c.value, astreId);
    sauver(etat);
    if (apres) apres();
  };
}

Object.assign(Orbiteur, {
  lancerNoyau(origineId, astreId) {
    const v = this.v, a = ASTRES_PAR_ID[astreId];
    if (stationSur(v, astreId) || noyauEnRoute(v, astreId)) return this.log(`Il y a déjà une station (ou un noyau en route) ${enOrbite(a)}.`);
    const contenu = { kits: 1 };
    let origines = null, origine;
    if (estOrigine(origineId)) origine = SYSTEME.nomOrigine;
    else {
      const st = v.stations.find((s) => s.id === origineId);
      if (!st || (st.stock.kits || 0) < 1) return this.log('Pas de kit de station en stock à cette station.');
      origines = retirerOrigines(st, contenu);
      noterEnvoi(v, st, origines, astreId);
      st.stock.kits -= 1;
      origine = st.nom;
    }
    const depart = this.departCargo(origineId);
    const id = 'c' + Date.now();
    const cargo = {
      id, nom: `Noyau de station → ${majuscule(nomStation(a))}`, type: 'cargo', cible: astreId, dest: null, noyau: true, contenu, origine, origines,
      centre: depart.centre, r: depart.r.slice(), v: depart.v.slice(), transfert: null, etat: 'vol', tLancement: v.t,
    };
    if (depart.centre === astreId) { cargo.local = true; cargo.tArrivee = v.t + (estOrigine(origineId) ? DUREE_NOYAU_LOCAL : DUREE_RDV_LOCAL); }
    (v.cargos = v.cargos || []).push(cargo);
    if (estOrigine(origineId)) payerLancement(v, `Noyau de station ${enOrbite(a)} (Hercule)`, TARIFS.lanceurs.station.prix, contenu);
    this.arriveePrevue(cargo);
    this.log(`🚀 Noyau de station lancé ${estOrigine(origineId) && estOrigine(astreId) ? 'par Hercule' : `depuis ${le(origine)} vers ${le(a)}`}${cargo.tArrivee ? ` : en orbite dans ${fmtDuree(cargo.tArrivee - v.t)}` : ''}.`);
    if (!cargo.local) this.ouvrirTrajet(id);
  },
});

// Le noyau arrive : il se met en orbite basse et la station existe, au niveau 1, vide.
function creerStationNoyau(v, c, log) {
  const a = ASTRES_PAR_ID[c.cible];
  const deja = stationSur(v, a.id);
  if (deja) { ajouterAuStock(deja, c.contenu, c.origines); return log(`${c.nom} : il y a déjà une station, le module rejoint le stock ${de(deja)}.`); }
  const h = estOrigine(a.id) ? 400 : Math.max(100, altitudeOrbite(a) / 1000 + 50);
  const r0 = a.rayonKm + h;
  const terrestre = estOrigine(a.id) && !v.stations.some((s) => s.terrestre);
  const st = {
    id: 's' + Date.now(), nom: terrestre ? 'Station spatiale terrestre' : nomStation(a),
    centre: a.id, r: [0, -r0], v: [Math.sqrt(a.gm / r0), 0], t0: v.t, terrestre, niveau: 1,
    stock: STOCK_VIDE(), prochainCargo: v.t + intervalleCargo(a.id),
  };
  v.stations.push(st);
  log(`🛰 Le noyau s’est mis ${a.id === SYSTEME.origine ? 'en orbite à 400 km' : enOrbite(a)} et a déployé ses panneaux : ${le(st)} existe, au niveau 1, vide.${terrestre ? ' Comme Zarya en 1998 : le premier élément d’une station qui grandira module par module.' : ''} Premier ravitaillement dans ${fmtDuree(st.prochainCargo - v.t)}.`);
}

// Module amarré, pas encore raccordé, vu de profil en sortie : couvertures de protection du lancement (blanc
// cassé, matelassé), étiquettes rouges « à retirer », câbles pendants côté station, aucun feu. Grande poutre :
// treillis gris plus terne, embouts jaunes et noirs. col : assombrit selon la lumière.
function dessinerModuleInerte(ctx, E, k, b, col) {
  const [x0, y0] = E(b.x0, b.y1), [x1, y1] = E(b.x1, b.y0), w = x1 - x0, h = y1 - y0;
  if (b.type === 'poutre') {
    ctx.fillStyle = col('#7d8084'); ctx.fillRect(x0, y0, w, h);
    ctx.strokeStyle = col('#55585c'); ctx.lineWidth = Math.max(1, k * 0.08);
    for (let x = b.x0; x < b.x1; x += 2.4) { const [a, bb] = E(x, b.y1), [c2, d] = E(x + 2.4, b.y0); ctx.beginPath(); ctx.moveTo(a, bb); ctx.lineTo(c2, d); ctx.moveTo(a, d); ctx.lineTo(c2, bb); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? col('#212121') : col('#fbc02d'); ctx.fillRect(x0 + (b.x0 < 0 ? 0 : w - k * 0.6), y0 + (h * i) / 4, k * 0.6, h / 4); }   // embout
  } else {
    const gr = ctx.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, col('#efe9dc')); gr.addColorStop(1, col('#b9b2a4'));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, Math.min(8, k * 0.6)); ctx.fill();
    ctx.strokeStyle = col('#a39b8c'); ctx.lineWidth = 1;   // couvertures matelassées
    for (let x = x0 + k * 0.9; x < x1; x += k * 0.9) { ctx.beginPath(); ctx.moveTo(x, y0 + 2); ctx.lineTo(x, y1 - 2); ctx.stroke(); }
    for (let y = y0 + k * 0.9; y < y1; y += k * 0.9) { ctx.beginPath(); ctx.moveTo(x0 + 2, y); ctx.lineTo(x1 - 2, y); ctx.stroke(); }
    ctx.fillStyle = '#d32f2f';   // étiquettes « à retirer avant le vol »
    for (const f of [0.25, 0.7]) ctx.fillRect(x0 + w * f, y0 + h * 0.15, Math.max(3, k * 0.25), Math.max(6, k * 0.7));
  }
  // Câbles pendants, côté station (vers le centre), qui ondulent : rien n'est branché
  const t = performance.now() / 1500, versX = b.x0 + b.x1 > 0 ? x0 : x1, versY = b.y0 >= 1.2 ? y1 : b.y1 <= -1.2 ? y0 : (y0 + y1) / 2;
  ctx.lineWidth = Math.max(1.5, k * 0.09);
  [['#212121', 0], ['#ef6c00', 1]].forEach(([c, i]) => {
    ctx.strokeStyle = col(c); ctx.beginPath(); ctx.moveTo(versX, versY);
    ctx.quadraticCurveTo(versX + (i ? -1 : 1) * k * 1.2 + Math.sin(t + i) * k * 0.4, versY + k * (1.6 + i * 0.5), versX + (i ? 1 : -1) * k * 0.8, versY + k * (2.4 + 0.4 * Math.sin(t * 1.3 + i)));
    ctx.stroke();
  });
  texteSurFond(ctx, '🔌 À raccorder', (x0 + x1) / 2, Math.min(y0, y1) - 8, { police: '11px system-ui', couleur: '#ffd54f' });
}
