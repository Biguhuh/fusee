'use strict';
// Boucle de jeu.
//  - Mission directe : hangar → carte → vol → résultat → hangar.
//  - Voyage : hangar → orbiteur (navigation) → descente → vol / exploration → retour à l'orbiteur.

const etat = { ...charger(), destination: null, ecran: 'hangar', vol: null, explo: null, pause: false, warp: 1, finDepuis: 0, enVoyage: false };
etat.voyage = migrerVoyage(etat.voyage);

// Sauvegarde d'une version précédente du jeu : on complète les champs qui manquent.
function migrerVoyage(v) {
  if (!v) return v;
  const neuf = Orbiteur.nouveauVoyage();
  const m = { ...neuf, ...v };
  for (const cle of ['visites', 'echantillonsABord', 'echantillonsRapportes']) m[cle] = m[cle] || {};
  m.provisions = { fleurs: 0, fruits: 0, ...(v.provisions || {}) };
  m.bases = (m.bases || []).map((b) => ({ niveau: 1, ...b }));
  m.sites = m.sites || {};
  m.cargos = m.cargos || [];
  m.stations = (m.stations || []).map((s) => ({
    ...s,
    terrestre: s.terrestre || !!s.base,
    stock: { ...STOCK_VIDE(), ...(s.stock || {}) },
    prochainCargo: s.prochainCargo || m.t + intervalleCargo(s.centre),
  }));
  if (m.orb) {
    // Expédition en cours avec l'ancien format : on lui donne le chargement actuel.
    if (v.ergolsAtt === undefined) m.ergolsAtt = ORBITEUR.ergolsAtt;
    if (v.robots === undefined) m.robots = ORBITEUR.robots;
    if (v.kitsBase === undefined) m.kitsBase = ORBITEUR.kitsBase;
    if (!m.expeditions) m.expeditions = 1;
  }
  delete m.carburantAtt;
  return m;
}
const canvas = $('vol');
const ctx = canvas.getContext('2d');
const toile = $('nav');
const ctxNav = toile.getContext('2d');
const touches = new Set();
const touchesBreves = new Set(); // appuis relâchés avant la prochaine image : comptent quand même une fois

const PALIERS_TEMPS = [1, 2, 5, 10, 50, 100, 1000];
const PAS_PHYSIQUE = 0.02; // s

function montrer(ecran) {
  etat.ecran = ecran;
  $('ecran-accueil').classList.toggle('cache', ecran !== 'accueil');
  $('ecran-lancement').classList.toggle('cache', ecran !== 'lancement');
  $('ecran-hangar').classList.toggle('cache', ecran !== 'hangar');
  $('ecran-carte').classList.toggle('cache', ecran !== 'carte');
  $('ecran-resultat').classList.toggle('cache', ecran !== 'resultat');
  canvas.classList.toggle('cache', ecran !== 'vol' && ecran !== 'explo');
  $('ecran-nav').classList.toggle('cache', ecran !== 'nav');
  Infos.infobulle(0, 0, null);
  window.scrollTo(0, 0);
}

function allerHangar() {
  afficherHangar(etat);
  const v = etat.voyage;
  $('voyage-reprendre').classList.toggle('cache', !v);
  $('voyage-reprendre').textContent = v && v.orb ? '▶ Reprendre l’expédition en cours' : '🚀 Lancer une expédition (méga-fusée)';
  $('voyage-nouveau').textContent = v ? '↺ Nouvelle campagne' : '🛰 Commencer la campagne';
  $('voyage-etat').innerHTML = v ? resumeCampagne(v) : '';
  $('vers-carte').textContent = 'Visite rapide : choisir la destination →';
  montrer('hangar');
}

// ---------- Accueil ----------
// « Aller partout » : les astres où l'on peut se poser (ou plonger), hors Terre et Soleil.
function astresAVisiter() { return ASTRES.filter((a) => a.type !== 'etoile' && a.id !== 'terre'); }
const PRINCIPAUX = ['mercure', 'venus', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune', 'pluton', 'lune', 'io', 'europe', 'ganymede', 'callisto', 'titan', 'rhea', 'titania', 'oberon', 'triton', 'a1'];

function allerAccueil() {
  const v = etat.voyage;
  $('accueil-reprendre').classList.toggle('cache', !v);
  $('accueil-reprendre').textContent = v && v.orb ? '▶ Reprendre l’expédition' : '▶ Reprendre (lancer une expédition)';
  $('accueil-campagne').textContent = v ? '↺ Nouvelle campagne' : '🛰 Commencer';
  if (v) {
    const vus = Object.keys(v.visites).filter((id) => v.visites[id].pose && ASTRES_PAR_ID[id]);
    const nPrinc = PRINCIPAUX.filter((id) => vus.includes(id)).length;
    $('progres-accueil').innerHTML = `Progression : <b>${vus.length} astre${vus.length > 1 ? 's' : ''} visité${vus.length > 1 ? 's' : ''}</b> sur ${astresAVisiter().length} (dont ${nPrinc} des ${PRINCIPAUX.length} principaux). ` + resumeCampagne(v);
  } else $('progres-accueil').innerHTML = '';
  montrer('accueil');
  animerAccueil();
}

// Petit système solaire animé en bandeau : planètes à leurs vraies positions, temps accéléré.
let animAccueil = null;
function animerAccueil() {
  if (animAccueil) return;
  const cv = $('ciel-accueil');
  const c = cv.getContext('2d');
  const t0 = performance.now();
  const ids = ['mercure', 'venus', 'terre', 'mars', 'jupiter', 'saturne', 'uranus', 'neptune'];
  const image = () => {
    if (etat.ecran !== 'accueil') { animAccueil = null; return; }
    const W = (cv.width = cv.clientWidth), H = (cv.height = cv.clientHeight);
    c.fillStyle = '#02040a'; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.6)';
    for (const e of ETOILES) c.fillRect(e.x * W, e.y * H, e.r, e.r);
    const t = DATE_DEBUT + ((performance.now() - t0) / 1000) * 20 * JOUR;   // 1 s = 20 jours
    const cx = W * 0.7, cy = H * 0.5, rMax = Math.min(W * 0.32, H * 0.48);
    const echelle = (a) => rMax * Math.log(1 + a / (0.3 * UA_KM)) / Math.log(1 + 30.1 / 0.3);
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, 22);
    g.addColorStop(0, '#fff3c0'); g.addColorStop(1, 'rgba(255,160,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 22, 0, 7); c.fill();
    for (const id of ids) {
      const a = ASTRES_PAR_ID[id];
      const p = etatRelatif(a, t).r;
      const d = echelle(V.norm(p)), ang = Math.atan2(p[1], p[0]);
      c.strokeStyle = 'rgba(140,160,200,0.18)'; c.beginPath(); c.arc(cx, cy, echelle(a.orbite.a), 0, 7); c.stroke();
      const x = cx + d * Math.cos(ang), y = cy - d * Math.sin(ang);
      const r = Math.max(2.5, Math.log(a.rayonKm / 1000 + 1) * 2.4);
      c.fillStyle = a.couleurs.disque; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      if (id === 'saturne') { c.strokeStyle = 'rgba(230,210,160,0.7)'; c.beginPath(); c.ellipse(x, y, r * 2, r * 0.6, -0.4, 0, 7); c.stroke(); }
    }
    animAccueil = requestAnimationFrame(image);
  };
  animAccueil = requestAnimationFrame(image);
}

function resumeCampagne(v) {
  const n = Object.values(v.echantillonsRapportes).reduce((s, x) => s + x, 0);
  return `${fmtDate(v.t, false)} · ${v.stations.length} station${v.stations.length > 1 ? 's' : ''} · ${v.bases.length} base${v.bases.length > 1 ? 's' : ''} · ${n} échantillon${n > 1 ? 's' : ''} rapporté${n > 1 ? 's' : ''} sur Terre` +
    (v.provisions.fleurs + v.provisions.fruits ? ` · à emporter : ${v.provisions.fleurs} fleurs, ${v.provisions.fruits} fruits` : '');
}
function allerCarte() { afficherCarte(etat, choisirDestination); montrer('carte'); }
function choisirDestination(id) { etat.destination = id; afficherCarte(etat, choisirDestination); }

function lancer(options = {}) {
  const astre = ASTRES_PAR_ID[etat.destination];
  if (!astre) return;
  etat.vol = new Vol(astre, options.fusee || assemblerFusee(etat.equipement), options);
  etat.enVoyage = !!options.voyage;
  etat.warp = 1;
  etat.pause = false;
  etat.finDepuis = 0;
  touches.clear();
  redim();
  montrer('vol');
}

function finVol(r) {
  const rang = { pose: 1, orbite: 2, liberation: 2, plongee: 2 };
  if (rang[r.cause] && (rang[r.cause] > (rang[etat.records[r.astre.id]] || 0))) etat.records[r.astre.id] = r.cause;
  const v = etat.voyage;
  const reussi = ['orbite', 'liberation', 'plongee'].includes(r.cause);
  etat.suiteResultat = etat.enVoyage ? 'nav' : 'visite';
  if (etat.vol.lancement) {
    // Lancement de la méga-fusée depuis la Terre.
    if (reussi) {
      Orbiteur.charger(v);
      Orbiteur.demarrerExpedition();
      Orbiteur.camPlacee = false;
      const f = etat.vol.f;
      if (f.lanceur === 'lune') {
        const tli = Orbiteur.injectionTranslunaire(deltaVRestant(f, etat.vol.carburant));
        etat.reprendreAuto = tli.ok;   // le planificateur poursuit le voyage à l'ouverture de l'orbiteur
        r.messageLancement = `${f.nomLanceur} a placé l’expédition en orbite terrestre. ` + tli.texte;
      } else {
        r.messageLancement = `${f.nomLanceur} a placé l’expédition en orbite terrestre.` + (v.stations.some((s) => s.terrestre) ? ' Rendez-vous avec la station spatiale.' : ' Première tâche : construire la station spatiale.');
      }
      etat.suiteResultat = 'nav';
    } else {
      Orbiteur.charger(v);
      Orbiteur.log('Échec du lancement de la méga-fusée.');
      etat.suiteResultat = 'accueil';
    }
  } else if (etat.enVoyage) {
    const a = r.astre.id;
    if (reussi) {
      // L'atterrisseur rejoint l'orbiteur avec ses échantillons ; ses ergols restants retournent en réserve.
      v.ergolsAtt += r.carburantRestant;
      if (etat.vol.echantillons) v.echantillonsABord[a] = (v.echantillonsABord[a] || 0) + etat.vol.echantillons;
      Orbiteur.log(`Atterrisseur récupéré en orbite de ${r.astre.nom}${etat.vol.echantillons ? ` avec ${etat.vol.echantillons} échantillon(s)` : ''}.`);
    } else {
      v.atterrisseurs = Math.max(0, v.atterrisseurs - 1);
      Orbiteur.log(`Atterrisseur perdu sur ${r.astre.nom}${etat.vol.echantillons ? ' avec ses échantillons' : ''}. Il en reste ${v.atterrisseurs}.`);
    }
    v.visites[a] = { ...(v.visites[a] || {}), pose: r.dejaPose || r.cause === 'pose' };
  }
  sauver(etat);
  afficherResultat(r);
  $('vers-hangar').textContent = { nav: 'Aller à l’orbiteur', visite: '🎯 Autre destination', accueil: '← Accueil' }[etat.suiteResultat];
  $('rejouer').classList.toggle('cache', etat.enVoyage || etat.vol.lancement);
  $('rejouer').textContent = etat.vol.lancement ? 'Relancer' : 'Rejouer cette visite';
  montrer('resultat');
}

// Visite rapide : la fusée est équipée automatiquement pour se poser et repartir (si possible).
function lancerVisite() {
  const a = ASTRES_PAR_ID[etat.destination];
  if (!a) return;
  if (!$('equip-auto').checked || !(a.type === 'solide' || a.type === 'gazeuse') || a.id === 'terre') {
    etat.fuseeVisite = null;
    return lancer();
  }
  const b = $('lancer');
  b.textContent = 'Préparation de la fusée (vols d’essai)…';
  b.disabled = true;
  setTimeout(() => {
    const c = concevoirAtterrisseur(a);
    b.textContent = 'Lancer la mission';
    b.disabled = false;
    etat.fuseeVisite = c.ok ? c.choix : null;
    lancer(c.ok ? { fusee: assemblerFusee(c.choix) } : {});
  }, 30);
}
function rejouerVisite() { lancer(etat.fuseeVisite ? { fusee: assemblerFusee(etat.fuseeVisite) } : {}); }

// ---------- Campagne : lancement, descente, robot, retour ----------
function lancerMegaFusee(type = etat.typeLanceur || 'station') {
  etat.typeLanceur = type;
  etat.destination = 'terre';
  lancer({ fusee: megaFusee(type), lancement: true, depuisSol: true, voyage: false });
}

// Centre de lancement : on choisit la destination, la fusée qui va avec est sur le pas de tir.
function allerLancement() {
  const v = etat.voyage;
  const station = v && v.stations.find((s) => s.terrestre);
  const notes = {
    station: station ? `Rendez-vous et amarrage à ${station.nom}.` : 'Arrivée en orbite basse : vous y construirez la station spatiale.',
    lune: 'Après la mise en orbite, le 3e étage rallume pour l’injection translunaire : l’expédition part directement vers la Lune (environ 5 jours de trajet).',
  };
  $('lanceurs').innerHTML = ['station', 'lune'].map((type) => {
    const l = LANCEURS[type], c = caracteristiquesLanceur(l);
    return `<article class="lanceur">
      <canvas width="120" height="300" data-type="${type}"></canvas>
      <div>
        <h2>${l.nom}</h2>
        <p class="dest">→ ${l.destination}</p>
        <p>${l.description}</p>
        <dl>
          <dt>Hauteur</dt><dd>${fmt(c.hauteur)} m</dd>
          <dt>Masse au décollage</dt><dd>${fmt(c.masse / 1000)} t</dd>
          <dt>Poussée au décollage</dt><dd>${fmt(c.poussee / 1e6, 1)} MN (${fmt(c.twr, 2)} fois son poids)</dd>
          <dt>Étages</dt><dd>${l.etages.length}</dd>
          <dt>Charge utile</dt><dd>${fmt(l.chargeUtile / 1000)} t</dd>
        </dl>
        <p class="note">${notes[type]}</p>
        <button class="principal" data-lancer="${type}">🚀 Aller sur le pas de tir</button>
      </div>
    </article>`;
  }).join('');
  $('lanceurs').querySelectorAll('canvas').forEach((cv) => {
    const f = megaFusee(cv.dataset.type);
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    dessinerTour(c, cv.width / 2 + 22, 210, 190 / f.hauteur, f.hauteur);
    dessinerFusee(c, { f, angle: 0, throttle: 0, temp: 20 }, cv.width / 2, 210, 190 * (f.hauteur / 120));
  });
  $('lanceurs').querySelectorAll('[data-lancer]').forEach((b) => { b.onclick = () => lancerMegaFusee(b.dataset.lancer); });
  montrer('lancement');
}

function basesSur(id) { return etat.voyage ? etat.voyage.bases.filter((b) => b.astre === id) : []; }

function descendre(id) {
  const v = etat.voyage, a = ASTRES_PAR_ID[id];
  const c = concevoirAtterrisseur(a);
  if (!c.ok) return Orbiteur.log(c.raison);
  if (v.ergolsAtt < c.fusee.carburant) return Orbiteur.log(`Pas assez d’ergols pour l’atterrisseur (${fmt(v.ergolsAtt / 1000, 1)} t sur ${fmt(c.fusee.carburant / 1000, 1)} t) : ravitaillez à une station.`);
  v.ergolsAtt -= c.fusee.carburant;
  etat.destination = id;
  lancer({ voyage: true, fusee: c.fusee, bases: basesSur(id), site: siteDescente(id) });
}

// Zone repérée par une sonde : la descente vise un peu à côté (l'aire d'atterrissage de la base).
function siteDescente(id) {
  const s = etat.voyage && (etat.voyage.sites || {})[id];
  return s ? { ...s, xDescente: s.x - 90 } : null;
}

// Robot largué en aller simple (là où un atterrisseur ne pourrait pas repartir, comme sur Vénus).
function larguerRobot(id) {
  const v = etat.voyage, a = ASTRES_PAR_ID[id];
  if (v.robots <= 0) return Orbiteur.log('Plus de robot à bord.');
  v.robots--;
  etat.destination = id;
  etat.vol = new Vol(a, assemblerFusee(equipementParDefaut()), { voyage: true, depuisSol: true, bases: basesSur(id), site: siteDescente(id) });
  etat.vol.robotSeul = true;
  etat.enVoyage = true;
  etat.explo = new Exploration(etat.vol, 'robot', etat.science);
  Orbiteur.log(`Robot largué sur ${a.nom}.`);
  touches.clear();
  redim();
  montrer('explo');
}

function construireBase() {
  const v = etat.voyage, vol = etat.vol;
  if (!vol || !vol.pose || !etat.enVoyage) return;
  const a = vol.astre;
  if (!v.stations.some((s) => s.centre === a.id)) return (vol.messageExplo = { texte: `Il faut d’abord une station en orbite de ${a.nom} pour ravitailler la base.`, vie: 6 });
  if (v.kitsBase <= 0) return (vol.messageExplo = { texte: 'Plus de kit de base à bord (un ravito « Kit d’expédition » ou l’atelier d’une station en fournit).', vie: 6 });
  if (v.bases.some((b) => b.astre === a.id && Math.abs(b.x - vol.x) < 2000)) return (vol.messageExplo = { texte: 'Il y a déjà une base ici.', vie: 5 });
  // Une base a besoin d'un terrain plat, repéré par une sonde.
  const site = (v.sites || {})[a.id];
  if (!site) return (vol.messageExplo = { texte: `Impossible de construire une base ici : le relief est trop accidenté. Conseil : remontez en orbite et envoyez une sonde vers ${a.nom}, elle repérera une zone compatible.`, vie: 10 });
  if (Math.abs(site.x - vol.x) > 400) return (vol.messageExplo = { texte: `La zone plate repérée par la sonde est à ${fmtAlt(Math.abs(site.x - vol.x))} : posez-vous plus près (la descente vise désormais cette zone).`, vie: 10 });
  v.kitsBase--;
  const [ressource, prod] = ressourceLocale(a);
  const b = { id: 'b' + Date.now(), astre: a.id, x: site.x, t0: v.t, tMaj: v.t, stock: 0, niveau: 1 };
  v.bases.push(b);
  vol.bases.push(b);
  Orbiteur.log(`Base construite sur ${a.nom}.` + (prod ? ` Elle exploite : ${ressource} (${fmt(prod / 1000, 1)} t d’ergols par jour).` : ' Pas de ressource exploitable ici : tout viendra de la Terre.'));
  vol.messageExplo = { texte: `Base construite !${prod ? ` Ressource locale : ${ressource}.` : ' Pas de ressource locale.'}`, vie: 7 };
  sauver(etat);
}

// Posé près d'une base : on fait le plein avec ses ergols.
function pleinALaBase(vol) {
  if (vol.pleinFait || !vol.pose || !vol.bases.length) return;
  const b = vol.bases.find((x) => Math.abs(x.x - vol.x) < 300);
  if (!b) return;
  vol.pleinFait = true;
  const q = Math.min(b.stock || 0, vol.f.carburant - vol.carburant);
  if (q > 0) { b.stock -= q; vol.carburant += q; }
  vol.messageExplo = { texte: q > 0 ? `Plein fait à la base : ${fmt(q / 1000, 1)} t d’ergols produits sur place.` : 'Base à proximité (pas encore d’ergols en réserve).', vie: 6 };
}

function rentrerSurTerre() {
  const res = Orbiteur.rentrerSurTerre();
  sauver(etat);
  const h = $('res-titre');
  h.textContent = 'Retour sur Terre';
  h.className = 'succes';
  $('res-message').textContent = res.n
    ? `La capsule s’est posée en douceur sous ses parachutes. ${res.n} échantillon${res.n > 1 ? 's' : ''} rapporté${res.n > 1 ? 's' : ''} : ${res.liste}.`
    : 'La capsule s’est posée en douceur sous ses parachutes. Pas d’échantillon cette fois.';
  $('res-stats').innerHTML = resumeCampagne(etat.voyage).split(' · ').map((x) => `<dt>•</dt><dd style="text-align:left">${x}</dd>`).join('');
  etat.suiteResultat = 'accueil';
  $('vers-hangar').textContent = '← Accueil';
  $('rejouer').classList.add('cache');
  montrer('resultat');
}

function terminerExpedition(texte) {
  sauver(etat);
  const h = $('res-titre');
  h.textContent = 'Expédition perdue';
  h.className = 'echec';
  $('res-message').textContent = texte;
  $('res-stats').innerHTML = '';
  etat.suiteResultat = 'accueil';
  $('vers-hangar').textContent = '← Accueil';
  $('rejouer').classList.add('cache');
  montrer('resultat');
}

// Promenade sur Terre : fleurs, fruits, et une bière au bar.
function promenadeSurTerre() {
  if (!etat.voyage) etat.voyage = Orbiteur.nouveauVoyage();
  const terre = ASTRES_PAR_ID.terre;
  etat.destination = 'terre';
  etat.vol = new Vol(terre, megaFusee(), { depuisSol: true });
  etat.vol.promenade = true;
  etat.enVoyage = false;
  etat.explo = new Exploration(etat.vol, 'spationaute', etat.science, { terre: true, provisions: etat.voyage });
  touches.clear();
  redim();
  montrer('explo');
}

// ---------- Voyage (orbiteur) ----------
function allerNavigation() {
  if (!etat.voyage) etat.voyage = Orbiteur.nouveauVoyage();
  // Pas d'expédition en cours : tout part de la Terre, depuis le centre de lancement.
  if (!etat.voyage.orb) return allerLancement();
  Orbiteur.charger(etat.voyage);
  if (etat.reprendreAuto) { Orbiteur.auto = true; etat.reprendreAuto = false; }
  Orbiteur.construireHud();
  if (!Orbiteur.camPlacee) { Orbiteur.centrerSur('orbiteur'); Orbiteur.camPlacee = true; }
  etat.pause = false;
  redim();
  montrer('nav');
}

Orbiteur.contexte = {
  equipement: () => etat.equipement,
  masque: () => etat.masque,
  basculerMasque: () => { etat.masque = !etat.masque; sauver(etat); },
  estEnPause: () => etat.pause,
  basculerPause: () => { etat.pause = !etat.pause; },
  hangar: () => { sauver(etat); allerAccueil(); },
  descendre: (id) => descendre(id),
  larguerRobot: (id) => larguerRobot(id),
  rentrer: () => rentrerSurTerre(),
  finExpedition: (texte) => terminerExpedition(texte),
  journal: () => {
    const m = $('modale');
    m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>Journal de bord</h2></div><button class="fermer">✕</button></header>
      <ol class="journal">${etat.voyage.journal.slice().reverse().map((j) => `<li><span class="doux">${fmtDate(j.t)}</span> ${j.texte}</li>`).join('')}</ol></div>`;
    m.classList.remove('cache');
    m.querySelector('.fermer').onclick = () => Infos.fermer();
  },
  alerte: (texte) => { Orbiteur.messages.push({ texte, vie: 8 }); },
};

$('voyage-nouveau').onclick = () => {
  if (etat.voyage && !confirm('Recommencer une nouvelle campagne ? Les stations, bases et sondes actuelles seront perdues.')) return;
  etat.voyage = Orbiteur.nouveauVoyage();
  Orbiteur.camPlacee = false;
  sauver(etat);
  allerNavigation();
};
$('voyage-reprendre').onclick = allerNavigation;
$('promenade').onclick = promenadeSurTerre;

// ---------- Informations ----------
Infos.contexte = {
  estEnPause: () => etat.pause,
  basculerPause: () => { etat.pause = !etat.pause; },
  masque: () => etat.masque,
  basculerMasque: () => { etat.masque = !etat.masque; sauver(etat); },
  actions: (a) => {
    const l = [];
    if (etat.ecran === 'nav') l.push(...Orbiteur.actionsPour(a));
    if (etat.ecran !== 'nav' && etat.ecran !== 'vol' && etat.ecran !== 'explo') {
      l.push({ texte: '🚀 Visite rapide ici', action: () => { etat.destination = a.id; montrer('carte'); afficherCarte(etat, choisirDestination); lancerVisite(); } });
    }
    return l;
  },
  surFermeture: () => {},
};

function ouvrirFiche(id) {
  // La lecture met en pause ; un bouton de la fiche permet de relancer le mouvement.
  if (['vol', 'explo', 'nav'].includes(etat.ecran)) etat.pause = true;
  Infos.ouvrirFiche(id);
}

$('vers-carte').onclick = allerCarte;
$('retour-hangar').onclick = allerHangar;
$('lancer').onclick = lancerVisite;
$('vers-hangar').onclick = () => {
  if (etat.suiteResultat === 'nav' && etat.voyage && etat.voyage.orb) allerNavigation();
  else if (etat.suiteResultat === 'visite') allerCarte();
  else allerAccueil();
};
$('rejouer').onclick = () => (etat.vol && etat.vol.lancement ? lancerMegaFusee() : rejouerVisite());
$('accueil-campagne').onclick = () => $('voyage-nouveau').click();
$('accueil-reprendre').onclick = allerNavigation;
$('accueil-visite').onclick = allerCarte;
$('accueil-hangar').onclick = allerHangar;
$('accueil-promenade').onclick = promenadeSurTerre;
document.querySelectorAll('.vers-accueil').forEach((b) => { b.onclick = allerAccueil; });
document.querySelectorAll('.ouvrir-encyclo').forEach((b) => { b.onclick = () => Infos.ouvrirEncyclopedie(); });

// Souris : infobulle au survol des astres, fiche au clic.
function astreSousSouris(e) {
  if (etat.ecran === 'nav') return Orbiteur.astreSous(e.clientX, e.clientY);
  if (etat.ecran === 'vol' || etat.ecran === 'explo') return astreDuCielSous(e.clientX, e.clientY);
  return null;
}
let glisser = null;
for (const el of [canvas, toile]) {
  el.addEventListener('mousemove', (e) => {
    if (glisser && etat.ecran === 'nav') {
      const s = Orbiteur.cam.echelle;
      Orbiteur.cam.decal = [glisser.decal[0] - (e.clientX - glisser.x) / s, glisser.decal[1] + (e.clientY - glisser.y) / s];
      glisser.bouge = glisser.bouge || Math.hypot(e.clientX - glisser.x, e.clientY - glisser.y) > 4;
      return;
    }
    const id = astreSousSouris(e);
    if (etat.ecran === 'nav') Orbiteur.survole = id;
    el.style.cursor = id ? 'pointer' : etat.ecran === 'nav' ? 'grab' : 'default';
    Infos.infobulle(e.clientX, e.clientY, id);
  });
  el.addEventListener('mouseleave', () => { Infos.infobulle(0, 0, null); glisser = null; });
  el.addEventListener('mousedown', (e) => { if (etat.ecran === 'nav') glisser = { x: e.clientX, y: e.clientY, decal: Orbiteur.cam.decal.slice() }; });
  el.addEventListener('mouseup', (e) => {
    const bouge = glisser && glisser.bouge;
    glisser = null;
    if (bouge) return;
    if (etat.ecran === 'nav' && Orbiteur.clicMiniCarte(e.clientX, e.clientY)) return;
    const id = astreSousSouris(e);
    if (id) ouvrirFiche(id);
  });
  el.addEventListener('dblclick', (e) => { const id = astreSousSouris(e); if (id && etat.ecran === 'nav') Orbiteur.centrerSur(id); });
}
toile.addEventListener('wheel', (e) => { e.preventDefault(); Orbiteur.molette(e); }, { passive: false });

// ---------- Clavier ----------
const CODES_JEU = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];
const PLUS_GAZ = ['ArrowUp', 'KeyW'], MOINS_GAZ = ['ArrowDown', 'KeyS'];
const PAS_MANETTE = 0.05;      // un appui = 5 %
const VITESSE_MANETTE = 0.6;   // touche maintenue : 60 % par seconde

addEventListener('keydown', (e) => {
  if (Infos.estOuverte()) {
    if (e.code === 'Escape') Infos.fermer();
    return;
  }
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyI') { Infos.ouvrirEncyclopedie(); return; }
  if (etat.ecran === 'nav') {
    if (CODES_JEU.includes(e.code)) e.preventDefault();
    if (e.code === 'KeyP') etat.pause = !etat.pause;
    Orbiteur.touche(e);
    return;
  }
  if (etat.ecran === 'explo') {
    if (CODES_JEU.includes(e.code)) e.preventDefault();
    touches.add(e.code); touchesBreves.add(e.code);
    const x = etat.explo;
    if (e.code === 'KeyE') x.agir();
    if (e.code === 'KeyV') x.basculerRover();
    if (e.code === 'Escape') {
      if (x.terre) x.terminer('retour', `Fin de la promenade : ${x.bouquet || 0} fleurs, ${x.panier || 0} fruits, ${x.bieres} bière(s).`);
      else x.agirRappel();
    }
    // Écoulement du temps pendant l'exploration : ×1 à ×50.
    const pal = [1, 2, 5, 10, 20, 50], i = pal.indexOf(x.warp);
    if (e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') x.warp = pal[Math.min(pal.length - 1, i + 1)];
    if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus') x.warp = pal[Math.max(0, i - 1)];
    if (e.code === 'KeyP') etat.pause = !etat.pause;
    return;
  }
  if (etat.ecran !== 'vol') return;
  if (CODES_JEU.includes(e.code)) e.preventDefault();
  touches.add(e.code);
  touchesBreves.add(e.code);
  const v = etat.vol;
  if (v.fin) return;
  // Toute commande manuelle reprend la main sur le pilote automatique.
  const manuel = [...PLUS_GAZ, ...MOINS_GAZ, 'ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'KeyX', 'Space'].includes(e.code);
  if (manuel) v.autopilote = false;
  if (!e.repeat) {
    if (PLUS_GAZ.includes(e.code)) v.manette = Math.min(1, v.manette + PAS_MANETTE);
    if (MOINS_GAZ.includes(e.code)) v.manette = Math.max(0, v.manette - PAS_MANETTE);
  }
  if (e.code === 'KeyX') v.manette = 0;
  if (e.code === 'Space') v.manette = 1;
  if (e.code === 'KeyL') { v.autopilote = !v.autopilote; v.cibleX = null; v.tCible = -1; }
  if (e.code === 'KeyT') v.demanderDecollage();
  if (e.code === 'KeyB') construireBase();
  if ((e.code === 'KeyE' || e.code === 'KeyR') && v.pose && v.astre.type === 'solide') {
    etat.explo = new Exploration(v, e.code === 'KeyE' ? 'spationaute' : 'robot', etat.science);
    touches.clear();
    montrer('explo');
    return;
  }
  const max = v.astre.type === 'etoile' ? 1000 : 100;
  const i = PALIERS_TEMPS.indexOf(etat.warp);
  if (e.key === '+' || e.code === 'NumpadAdd' || e.code === 'Equal') etat.warp = Math.min(max, PALIERS_TEMPS[Math.min(PALIERS_TEMPS.length - 1, i + 1)]);
  if (e.key === '-' || e.code === 'NumpadSubtract' || e.code === 'Minus') etat.warp = PALIERS_TEMPS[Math.max(0, i - 1)];
  if (e.code === 'KeyP') etat.pause = !etat.pause;
  if (e.code === 'Enter') v.finirAuSol();
  if (e.code === 'Escape') v.abandonner();
});
addEventListener('keyup', (e) => touches.delete(e.code));
addEventListener('blur', () => touches.clear());

// ZQSD (AZERTY) et WASD (QWERTY) tombent sur les mêmes touches physiques.
function commandes() {
  const t = (code) => touches.has(code) || touchesBreves.has(code);
  return {
    gauche: t('ArrowLeft') || t('KeyA'),
    droite: t('ArrowRight') || t('KeyD'),
    saut: t('ArrowUp') || t('KeyW') || t('Space'),
  };
}

// Touche de gaz maintenue : la manette monte ou descend en continu (en temps réel).
function reglerManette(v, dt) {
  if (v.autopilote) return;
  const enfoncee = (codes) => codes.some((c) => touches.has(c));
  if (enfoncee(PLUS_GAZ)) v.manette = Math.min(1, v.manette + VITESSE_MANETTE * dt);
  if (enfoncee(MOINS_GAZ)) v.manette = Math.max(0, v.manette - VITESSE_MANETTE * dt);
}

function redim() {
  canvas.width = innerWidth; canvas.height = innerHeight;
  toile.width = innerWidth; toile.height = innerHeight;
}
addEventListener('resize', redim);

// Le joueur choisit l'écoulement du temps. Près du sol, on le limite pour qu'il reste toujours
// au moins 2 secondes réelles avant le contact : une descente lente sur une petite lune peut être accélérée,
// une arrivée rapide repasse d'elle-même à ×1.
function warpEffectif(v) {
  if (v.astre.type !== 'solide' || v.pose || v.fin) return etat.warp;
  const alt = v.altSol();
  const vDesc = Math.max(0.05, -v.vy, Math.abs(v.vx) * 0.2);
  const tContact = Math.max(0, alt - 5) / vDesc;     // secondes de jeu avant le contact
  const max = Math.max(1, tContact / 2);
  let w = 1;
  for (const p of PALIERS_TEMPS) if (p <= etat.warp && p <= max) w = p;
  return w;
}

function dessinerPause(c, W, H) {
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#fff';
  c.font = 'bold 30px system-ui, sans-serif';
  c.textAlign = 'center';
  c.fillText('Pause', W / 2, H / 2);
  c.font = '14px system-ui, sans-serif';
  c.fillText('P pour reprendre', W / 2, H / 2 + 26);
  c.textAlign = 'left';
}

// ---------- Boucle ----------
let avant = performance.now();
let tSauvegarde = 0;
function boucle(t) {
  const dt = Math.min(0.05, (t - avant) / 1000);
  avant = t;
  if (etat.ecran === 'vol' && etat.vol) {
    const v = etat.vol;
    // Dès que la coque s'abîme, le temps repasse à ×1 pour laisser réagir.
    if (v.enDegats()) etat.warp = 1;
    const w = warpEffectif(v);
    if (!etat.pause && !v.fin) {
      reglerManette(v, dt);
      const total = dt * w;
      const n = Math.min(20000, Math.max(1, Math.ceil(total / PAS_PHYSIQUE)));
      const cmd = commandes();
      for (let i = 0; i < n && !v.fin; i++) v.step(total / n, cmd);
    }
    touchesBreves.clear();
    if (etat.enVoyage) pleinALaBase(v);
    v.warpChoisi = etat.warp;
    dessinerVol(ctx, v, canvas.width, canvas.height, etat.pause ? 0 : dt, w);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctx, canvas.width, canvas.height);
    if (v.fin) {
      etat.finDepuis += dt;
      if (etat.finDepuis > (v.fin.detruite ? 1.8 : 0.6)) finVol(v.fin);
    }
  } else if (etat.ecran === 'explo' && etat.explo) {
    const x = etat.explo;
    if (!etat.pause && !x.fin) {
      const cmd = commandes();
      const total = dt * x.warp;
      const n = Math.max(1, Math.ceil(total / PAS_PHYSIQUE));
      for (let i = 0; i < n && !x.fin; i++) x.step(total / n, cmd);
    }
    touchesBreves.clear();
    x.dessiner(ctx, canvas.width, canvas.height, etat.pause ? 0 : dt);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctx, canvas.width, canvas.height);
    if (x.fin) {
      etat.vol.messageExplo = { texte: x.fin.texte, vie: 8 };
      if (etat.voyage && etat.enVoyage) etat.voyage.journal.push({ t: etat.voyage.t, texte: `${etat.vol.astre.nom} : ${x.fin.texte}` });
      etat.explo = null;
      touches.clear();
      sauver(etat);
      if (etat.vol.promenade) allerAccueil();                // fin de la promenade sur Terre
      else if (etat.vol.robotSeul) allerNavigation();        // le robot reste sur place, on revient à l'orbiteur
      else montrer('vol');                                   // retour à la fusée posée
    }
  } else if (etat.ecran === 'nav' && etat.voyage && etat.voyage.orb) {
    Orbiteur.mettreAJour(dt, etat.pause);
    Orbiteur.dessiner(ctxNav, toile.width, toile.height);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctxNav, toile.width, toile.height);
    Orbiteur.majHud(false);
    if (t - tSauvegarde > 5000) { sauver(etat); tSauvegarde = t; }
  }
  requestAnimationFrame(boucle);
}

allerAccueil();
requestAnimationFrame(boucle);
