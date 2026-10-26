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
  // Système stellaire de la partie (les parties d'avant n'en avaient pas : le Système solaire).
  // On s'y place d'abord : les astres de la suite (stations, bases) lui appartiennent.
  m.systeme = v.systeme || 'solaire';
  choisirSystemeCampagne(m);
  for (const cle of ['visites', 'echantillonsABord', 'echantillonsRapportes']) m[cle] = m[cle] || {};
  m.provisions = { fleurs: 0, fruits: 0, ...(v.provisions || {}) };
  m.bases = (m.bases || []).map((b) => ({ niveau: 1, ...b }));
  m.sites = m.sites || {};
  m.cargos = m.cargos || [];
  // Les étapes de navigation contiennent des fonctions, perdues à la sauvegarde : elles seront recalculées.
  for (const s of [...(m.sondesEnVol || []), ...m.cargos]) delete s.etape;
  m.stations = (m.stations || []).map((s) => ({
    ...s,
    terrestre: s.terrestre || !!s.base,
    stock: { ...STOCK_VIDE(), ...(s.stock || {}) },
    prochainCargo: s.prochainCargo || (ressourcesIllimitees() ? m.t + intervalleCargo(s.centre) : null),
  }));
  if (m.orb) {
    // Expédition en cours avec l'ancien format : on lui donne le chargement actuel.
    if (v.ergolsAtt === undefined) m.ergolsAtt = ORBITEUR.ergolsAtt;
    if (v.robots === undefined) m.robots = ORBITEUR.robots;
    if (v.kitsBase === undefined) m.kitsBase = ORBITEUR.kitsBase;
    if (!m.expeditions) m.expeditions = 1;
  }
  delete m.carburantAtt;
  // Expédition d'avant l'équipe : on lui en donne une.
  if (m.orb && !m.equipe) initialiserEquipe(m);
  // Une seule station, base et sonde par astre : les doublons des anciennes parties sont fusionnés.
  for (const texte of fusionnerDoublons(m)) m.journal.push({ t: m.t, texte });
  // Noms des stations : « Station Lune » est devenu « Station lunaire », « Station Europe » « Station d’Europe ».
  for (const s of m.stations) if (!s.terrestre && ASTRES_PAR_ID[s.centre]) s.nom = nomStation(ASTRES_PAR_ID[s.centre]);
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
  canvas.classList.toggle('cache', ecran !== 'vol' && ecran !== 'explo' && ecran !== 'scene');
  $('ecran-nav').classList.toggle('cache', ecran !== 'nav');
  $('ecran-spatio').classList.toggle('cache', ecran !== 'spatio');
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
  $('vers-carte').textContent = 'Visite rapide : choisir la destination →';
  montrer('hangar');
}

// ---------- Accueil ----------
// « Aller partout » : les astres où l'on peut se poser (ou plonger), hors planète d'origine et étoile.
function astresAVisiter() { return ASTRES.filter((a) => a.type !== 'etoile' && !estOrigine(a.id)); }

function allerAccueil() {
  const v = etat.voyage;
  // Campagne terminée par un départ vers une autre étoile : on ne la reprend plus.
  $('accueil-reprendre').classList.toggle('cache', !v || !!v.fin);
  $('accueil-reprendre').textContent = v && v.orb ? '▶ Reprendre l’expédition' : '▶ Reprendre (lancer une expédition)';
  $('accueil-campagne').textContent = v ? '↺ Nouvelle campagne' : '🛰 Commencer';
  if (v && v.fin) {
    const f = v.fin;
    $('progres-accueil').innerHTML = `<b>Campagne terminée.</b> Partie en ${f.anneeDepart} vers ${le(f.nomEtoile)} (${fmt(f.distanceAL, 2)} années-lumière) à ${fmt(f.vitesse, 1)} km/s : arrivée vers ${fmtAnnee(f.arriveeJeu)} (temps de jeu), vers ${fmtAnnee(f.arriveeVraie)} dans la vraie vie.`;
  } else if (v) {
    // La progression se compte dans le système de la campagne (qui peut être une autre étoile).
    choisirSystemeCampagne(v);
    const vus = Object.keys(v.visites).filter((id) => v.visites[id].pose && ASTRES_PAR_ID[id]);
    const nPrinc = SYSTEME.objectifs.filter((id) => vus.includes(id)).length;
    $('progres-accueil').innerHTML = (SYSTEME.id !== 'solaire' ? `<b>Campagne dans le ${SYSTEME.nom}</b> (${fmt(SYSTEME.distanceAL, 2)} années-lumière). ` : '') +
      `Progression : <b>${vus.length} astre${vus.length > 1 ? 's' : ''} visité${vus.length > 1 ? 's' : ''}</b> sur ${astresAVisiter().length} (dont ${nPrinc} des ${SYSTEME.objectifs.length} principaux). ` + resumeCampagne(v);
  } else $('progres-accueil').innerHTML = '';
  // Hors campagne (visite rapide, promenade, encyclopédie), on est dans le Système solaire.
  choisirSysteme('solaire');
  $('spatio-resume').textContent = resumeSpatio();
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
  const ids = SYSTEME.planetes;
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
      // Vu du pôle, éclairé depuis le Soleil au centre.
      // (bandeau en accéléré, 1 s = 20 jours : la vraie rotation ferait clignoter les planètes, on la ralentit)
      dessinerGlobe(c, a, x, y, r, { vue: 'pole', lon0: (performance.now() / 1000) * 12, lumiere: [cx - x, cy - y, 0.45 * Math.hypot(cx - x, cy - y)] });
    }
    animAccueil = requestAnimationFrame(image);
  };
  animAccueil = requestAnimationFrame(image);
}

function resumeCampagne(v) {
  const n = Object.values(v.echantillonsRapportes).reduce((s, x) => s + x, 0);
  return `${fmtDate(v.t, false)} · ${v.stations.length} station${v.stations.length > 1 ? 's' : ''} · ${v.bases.length} base${v.bases.length > 1 ? 's' : ''} · ${n} échantillon${n > 1 ? 's' : ''} rapporté${n > 1 ? 's' : ''} sur Terre` +
    (v.provisions.fleurs + v.provisions.fruits ? ` · à emporter : ${v.provisions.fleurs} fleurs, ${v.provisions.fruits} fruits` : '');
}
function allerCarte() { afficherCarte(etat, choisirDestination); montrer('carte'); }
function choisirDestination(id) {
  etat.destination = id;
  afficherCarte(etat, choisirDestination);
  // Téléphone : la fiche et le bouton « Lancer » sont sous la carte, on y descend.
  if (innerWidth < 700) $('fiche').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function lancer(options = {}) {
  const astre = ASTRES_PAR_ID[etat.destination];
  if (!astre) return;
  // Vénus : le module est équipé pour le ballon ; le lanceur de retour sera envoyé par une station.
  if (AEROSTAT[astre.id] && !options.fournisseurLanceur) options = { ...options, fournisseurLanceur: fournisseurLanceurRetour(astre.id) };
  etat.vol = new Vol(astre, options.fusee || equiperAerostat(assemblerFusee(etat.equipement), astre), options);
  etat.enVoyage = !!options.voyage;
  etat.warp = 1;
  etat.pause = false;
  etat.finDepuis = 0;
  touches.clear();
  redim();
  montrer('vol');
}

// Scènes animées (amarrage, retour sur Terre) : un objet avec step(dt), dessiner(ctx, W, H), passer() et fini ;
// « suite » est appelée à la fin. Entrée, Espace, Échap ou un toucher font passer la scène.
function jouerScene(obj, suite) {
  etat.scene = { obj, suite };
  touches.clear();
  redim();
  montrer('scene');
}
function passerScene() { if (etat.scene) etat.scene.obj.passer(); }

// Mise en orbite réussie : on passe d'abord en vue orbite pour le rendez-vous et l'amarrage.
function terminerVol(vol) {
  if (vol.fin.cause === 'orbite' && !vol.amarrageFait) {
    vol.amarrageFait = true;
    jouerScene(new Amarrage(vol.astre, vol.y, cibleAmarrage(vol), tempsCiel(vol), vol.lancement ? 'Expédition' : etat.enVoyage ? 'Atterrisseur' : 'Vous'), () => finVol(vol.fin));
    return;
  }
  finVol(vol.fin);
}
// Ce que l'engin doit rejoindre : la station terrestre (ou l'orbite de travail à 400 km) après un lancement,
// l'orbiteur après une remontée en campagne ; rien en visite rapide (on fait juste un tour d'orbite).
function cibleAmarrage(vol) {
  const voy = etat.voyage, a = vol.astre;
  const altDe = (r) => (Math.hypot(r[0], r[1]) - a.rayonKm) * 1000;
  if (vol.lancement) {
    const st = voy && voy.stations.find((s) => estOrigine(s.centre));
    if (st) return { nom: st.nom, alt: altDe(propager(st.r, st.v, voy.t - st.t0, a.gm).r), vaisseau: true };
    return { nom: 'l’orbite de travail', alt: 400000, vaisseau: false };
  }
  if (etat.enVoyage && voy && voy.orb && voy.orb.centre === a.id) return { nom: 'l’orbiteur', alt: altDe(voy.orb.r), vaisseau: true };
  return null;
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
        r.messageLancement = `${f.nomLanceur} a placé l’expédition en orbite terrestre.` + (v.stations.some((s) => s.terrestre) ? ' Rendez-vous avec la station spatiale.' : ' Première tâche : construire la station spatiale.');
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
      Orbiteur.log(`Atterrisseur récupéré ${enOrbite(r.astre)}${etat.vol.echantillons ? ` avec ${etat.vol.echantillons} échantillon(s)` : ''}.`);
    } else {
      v.atterrisseurs = Math.max(0, v.atterrisseurs - 1);
      if (!etat.vol.robotSeul) v.equipagePerdu = true;     // l'équipage était à bord de l'atterrisseur
      Orbiteur.log(`Atterrisseur perdu ${sur(r.astre)}${etat.vol.echantillons ? ' avec ses échantillons' : ''}. Il en reste ${v.atterrisseurs}.`);
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
  if (!$('equip-auto').checked || !(a.type === 'solide' || a.type === 'gazeuse') || estOrigine(a.id)) {
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
    etat.fuseeVisite = c.ok ? c : null;
    lancer(c.ok ? { fusee: fuseeDeConception(c, a) } : {});
  }, 30);
}
function rejouerVisite() { lancer(etat.fuseeVisite ? { fusee: fuseeDeConception(etat.fuseeVisite, ASTRES_PAR_ID[etat.destination]) } : {}); }

// ---------- Campagne : lancement, descente, robot, retour ----------
function lancerMegaFusee(type = etat.typeLanceur || 'station') {
  etat.typeLanceur = type;
  etat.destination = SYSTEME.origine;
  lancer({ fusee: megaFusee(type), lancement: true, depuisSol: true, voyage: false });
}

// Centre de lancement : on choisit la destination, la fusée qui va avec est sur le pas de tir.
function allerLancement() {
  const v = etat.voyage;
  const station = v && v.stations.find((s) => s.terrestre);
  const notes = {
    station: station ? `Rendez-vous et amarrage ${au(station)}.` : 'Arrivée en orbite basse : vous y construirez la station spatiale.',
    lune: 'Après la mise en orbite, le 3e étage rallume pour l’injection translunaire : l’expédition part directement vers la Lune (environ 5 jours de trajet).',
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
          <dt>Hauteur</dt><dd>${fmt(c.hauteur)} m</dd>
          <dt>Masse au décollage</dt><dd>${fmt(c.masse / 1000)} t</dd>
          <dt>Poussée au décollage</dt><dd>${fmt(c.poussee / 1e6, 1)} MN (${fmt(c.twr, 2)} fois son poids)</dd>
          <dt>Étages</dt><dd>${l.etages.length}</dd>
          <dt>Charge utile</dt><dd>${fmt(l.chargeUtile / 1000)} t</dd>
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

// Vénus : la station en orbite envoie au sol le lanceur de retour qu'elle a construit à son atelier.
// En visite rapide (pas de stations), une station de soutien est supposée en orbite.
function fournisseurLanceurRetour(astreId) {
  const a = ASTRES_PAR_ID[astreId];
  if (!etat.enVoyage) return () => ({ ok: true, texte: 'La station de soutien en orbite envoie le lanceur de retour : capsule sous parachute, 15 km au-dessus du site.' });
  return () => {
    const d = lanceurRetourDisponible(etat.voyage, astreId);
    const recette = RECETTES.lanceurRetour;
    const cout = `${fmtStock('materiaux', recette.materiaux)} de matériaux, ${fmtStock('ergols', recette.ergols)} d’ergols, ${fmtDuree(recette.duree)}`;
    if (!d.station) return { ok: false, texte: `Pas de lanceur de retour : il faut une station ${enOrbite(a)}, qui le construit à son atelier (${cout}). Sans lui, pas de retour en orbite.` };
    if (!d.pret) {
      return { ok: false, texte: d.chantier
        ? `Le lanceur de retour est en construction ${au(d.station)} : prêt le ${fmtDate(d.chantier.fin)}. Accélérez le temps à l’orbiteur ou patientez.`
        : `${Le(d.station)} n’a pas de lanceur de retour : lancez sa construction à l’atelier (${cout}).` };
    }
    d.station.stock.lanceurRetour -= 1;
    return { ok: true, texte: `${Le(d.station)} envoie le lanceur de retour : capsule sous parachute, 15 km au-dessus du site.` };
  };
}

function descendre(id) {
  const v = etat.voyage, a = ASTRES_PAR_ID[id];
  const c = concevoirAtterrisseur(a);
  if (!c.ok) return Orbiteur.log(c.raison);
  // Vénus : sans lanceur de retour prêt en orbite, la descente est un aller simple. On prévient.
  if (AEROSTAT[id]) {
    const d = lanceurRetourDisponible(v, id);
    if (!d.pret) {
      const pourquoi = !d.station ? `il n’y a pas de station ${enOrbite(a)} pour le construire`
        : d.chantier ? `il est en construction ${au(d.station)} (prêt le ${fmtDate(d.chantier.fin)})`
          : `${le(d.station)} ne l’a pas encore construit (atelier)`;
      if (!confirm(`Aucun lanceur de retour n’est prêt : ${pourquoi}.\n\nSans lui, le module ne pourra pas repartir ${de(a)} tant qu’il n’aura pas été construit et envoyé.\n\nDescendre quand même ?`)) return;
    }
  }
  if (v.ergolsAtt < c.fusee.carburant) return Orbiteur.log(`Pas assez d’ergols pour l’atterrisseur (${fmt(v.ergolsAtt / 1000, 1)} t sur ${fmt(c.fusee.carburant / 1000, 1)} t) : ravitaillez à une station.`);
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
function larguerRobot(id, blindage) {
  const v = etat.voyage, a = ASTRES_PAR_ID[id];
  if (v.robots <= 0) return Orbiteur.log('Plus de robot à bord.');
  v.robots--;
  etat.destination = id;
  blindage = blindage || 'standard';
  // Le blindage alourdit le module de descente : les ergols en plus sont pris sur la réserve de l'atterrisseur.
  const cout = coutBlindage(a, blindage);
  if (cout.ergols > v.ergolsAtt) { v.robots++; return Orbiteur.log(`Pas assez d’ergols en réserve pour descendre le blindage ${BLINDAGES_ROBOT[blindage].nom.toLowerCase()} (${fmt(cout.ergols, 0)} kg).`); }
  v.ergolsAtt -= cout.ergols;
  etat.vol = new Vol(a, assemblerFusee(equipementParDefaut()), { voyage: true, depuisSol: true, bases: basesSur(id), site: siteDescente(id) });
  etat.vol.robotSeul = true;
  etat.enVoyage = true;
  etat.explo = new Exploration(etat.vol, 'robot', etat.science, { blindage });
  Orbiteur.log(`Robot largué ${sur(a)} (blindage ${BLINDAGES_ROBOT[blindage].nom.toLowerCase()}, rayonnement ${fmtDose(doseSurface(a).svJour)}).`);
  touches.clear();
  redim();
  montrer('explo');
}

function construireBase() {
  const v = etat.voyage, vol = etat.vol;
  if (!vol) return;
  if (!etat.enVoyage) return (vol.messageExplo = { texte: 'Les bases se construisent pendant l’exploration du Système solaire (campagne), pas en visite rapide.', vie: 5 });
  if (!vol.pose) return (vol.messageExplo = { texte: 'Construire une base (B) : il faut d’abord être posé.', vie: 4 });
  const a = vol.astre;
  if (!v.stations.some((s) => s.centre === a.id)) return (vol.messageExplo = { texte: `Il faut d’abord une station ${enOrbite(a)} pour ravitailler la base.`, vie: 6 });
  if (v.kitsBase <= 0) return (vol.messageExplo = { texte: 'Plus de kit de base à bord (un ravito « Kit d’expédition » ou l’atelier d’une station en fournit).', vie: 6 });
  if (baseSur(v, a.id)) return (vol.messageExplo = { texte: `Base déjà installée ${sur(a)} : une seule base par astre.`, vie: 6 });
  // Une base a besoin d'un terrain plat, repéré par une sonde.
  const site = (v.sites || {})[a.id];
  if (!site) return (vol.messageExplo = { texte: `Impossible de construire une base ici : le relief est trop accidenté. Conseil : remontez en orbite et envoyez une sonde vers ${le(a)}, elle repérera une zone compatible.`, vie: 10 });
  if (Math.abs(site.x - vol.x) > 400) return (vol.messageExplo = { texte: `La zone plate repérée par la sonde est à ${fmtAlt(Math.abs(site.x - vol.x))} : posez-vous plus près (la descente vise désormais cette zone).`, vie: 10 });
  v.kitsBase--;
  const [ressource, prod] = ressourceLocale(a);
  const b = { id: 'b' + Date.now(), astre: a.id, x: site.x, t0: v.t, tMaj: v.t, stock: 0, niveau: 1 };
  v.bases.push(b);
  vol.bases.push(b);
  Orbiteur.log(`Base construite ${sur(a)}.` + (prod ? ` Elle exploite : ${ressource} (${fmt(prod / 1000, 1)} t d’ergols par jour).` : ' Pas de ressource exploitable ici : tout viendra de la Terre.'));
  vol.messageExplo = { texte: `Base construite !${prod ? ` Ressource locale : ${ressource}.` : ' Pas de ressource locale.'}`, vie: 7 };
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
  vol.messageExplo = { texte: q > 0 ? `Plein fait à la base : ${fmt(q / 1000, 1)} t d’ergols produits sur place.` : 'Base à proximité (pas encore d’ergols en réserve).', vie: 6 };
}

// Retour sur Terre : rentrée de la capsule, parachutes, amerrissage, puis récupération
// (hélicoptère pour l'équipage, ou navire à grue si la capsule revient vide).
function rentrerSurTerre() {
  const v = etat.voyage;
  // On attend le retour des coéquipiers partis en mission.
  const enCours = missionsEnCours(v);
  if (enCours.length) return Orbiteur.log(`Retour impossible : ${enCours.map((m) => `${m.nom} (${sur(ASTRES_PAR_ID[m.mission.astre])}, retour dans ${fmtDuree(m.mission.fin - v.t)})`).join(', ')} encore en mission.`);
  // Survivants de l'équipe (sans équipe : le ou la spationaute du joueur, s'il est vivant).
  const vivants = v.equipe ? survivants(v).map((m) => m.nom) : (v.equipagePerdu ? [] : [nomSpatio()]);
  const equipage = vivants.length > 0;
  const nom = vivants.length > 1 ? `${vivants.slice(0, -1).join(', ')} et ${vivants[vivants.length - 1]}` : (vivants[0] || nomSpatio());
  const res = Orbiteur.rentrerSurTerre();
  sauver(etat);
  jouerScene(new RetourTerre({ equipage, echantillons: res.n, nom }), () => afficherRetourTerre(res, equipage, nom));
}
function afficherRetourTerre(res, equipage, nom = nomSpatio()) {
  const h = $('res-titre');
  h.textContent = equipage ? 'Retour sur Terre' : 'Retour sur Terre : capsule vide';
  h.className = equipage ? 'succes' : 'partiel';
  const ech = res.n ? `${res.n} échantillon${res.n > 1 ? 's' : ''} rapporté${res.n > 1 ? 's' : ''} : ${res.liste}.` : 'Pas d’échantillon cette fois.';
  $('res-message').textContent = equipage
    ? `La capsule a amerri sous ses parachutes et l’hélicoptère a hélitreuillé ${nom}. ${ech}`
    : `Capsule vide : l’équipage n’est pas revenu. Un navire a hissé la capsule à bord avec sa grue. ${ech}`;
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
  if (etat.voyage.fin) return allerAccueil();      // campagne terminée (départ vers une autre étoile)
  choisirSystemeCampagne(etat.voyage);
  if (!etat.voyage.orb) {
    // Autre système : pas de centre de lancement ici, l'expédition perdue ne se remplace pas.
    if (!ressourcesIllimitees()) { alert(`Plus d’orbiteur dans le ${SYSTEME.nom} : il n’y a pas de centre de lancement ici. Reprenez depuis une station ou une base.`); return allerAccueil(); }
    // Pas d'expédition en cours : tout part de la Terre, depuis le centre de lancement.
    return allerLancement();
  }
  Orbiteur.charger(etat.voyage);
  if (etat.reprendreAuto) { Orbiteur.auto = true; etat.reprendreAuto = false; }
  Orbiteur.construireHud();
  if (!Orbiteur.camPlacee) { Orbiteur.centrerSur('orbiteur'); Orbiteur.camPlacee = true; }
  etat.pause = false;
  redim();
  montrer('nav');
  // Mission en temps réel : la simulation rattrape le temps écoulé depuis la dernière visite, puis le résume.
  Orbiteur.rattraperAbsence();
  sauver(etat);
}

// ---------- Reprendre la campagne d'où l'on veut ----------
// Là où l'on était, en orbite à une station, au sol près d'une base (l'atterrisseur y est garé),
// ou depuis la Terre (centre de lancement). Sans station ni base, on reprend directement.
function ouvrirReprise() {
  const v = etat.voyage;
  if (!v || v.fin) return allerNavigation();
  choisirSystemeCampagne(v);
  const basesOk = v.bases.filter((b) => !AEROSTAT[b.astre] && ASTRES_PAR_ID[b.astre]);
  if (!v.stations.length && !basesOk.length) return allerNavigation();
  const choix = [];
  if (v.orb) choix.push(['ici', `▶ Là où vous étiez`, `${enOrbite(ASTRES_PAR_ID[v.orb.centre])}`]);
  for (const s of v.stations) choix.push(['station:' + s.id, `🛰 ${s.nom}`, `${enOrbite(ASTRES_PAR_ID[s.centre])}, amarré à la station`]);
  for (const b of basesOk) choix.push(['base:' + v.bases.indexOf(b), `🏠 ${nomBase(ASTRES_PAR_ID[b.astre])}, niveau ${b.niveau || 1}`, `au sol, l’atterrisseur garé à côté ; l’orbiteur attend en orbite`]);
  if (ressourcesIllimitees()) choix.push(['terre', `🚀 Depuis ${SYSTEME.nomOrigine}`, v.orb ? 'centre de lancement (l’expédition en cours reste où elle est)' : 'centre de lancement, nouvelle méga-fusée']);
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>▶ Reprendre la campagne</h2><p>Choisissez d’où repartir.</p></div><button class="fermer">✕</button></header>
    <section>${choix.map(([id, nom, detail], i) => `<label class="choix-ravito"><input type="radio" name="reprise" value="${id}" ${i === 0 ? 'checked' : ''}> <b>${nom}</b><br><span class="doux">${detail}</span></label>`).join('')}</section>
    <div class="actions"><span></span><button id="reprise-ok" class="principal">▶ Jouer d’ici</button></div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  $('reprise-ok').onclick = () => {
    const id = m.querySelector('input[name=reprise]:checked').value;
    Infos.fermer();
    reprendreDepuis(id);
  };
}

// Place l'expédition au point choisi, puis lance le jeu de là.
function reprendreDepuis(id) {
  const v = etat.voyage;
  if (id === 'ici') return allerNavigation();
  if (id === 'terre') return allerLancement();
  Orbiteur.charger(v);
  if (!v.orb) {
    // Autre système : pas de nouvelle expédition possible (rien ne vient de la Terre).
    if (!ressourcesIllimitees()) { alert('Plus d’orbiteur : dans ce système, une nouvelle expédition ne peut pas être lancée.'); return allerAccueil(); }
    Orbiteur.demarrerExpedition();        // nouvelle expédition, montée à bord à la station ou à la base
  }
  Orbiteur.camPlacee = false;
  if (id.startsWith('station:')) {
    const st = v.stations.find((s) => s.id === id.slice(8));
    const e = Orbiteur.etatStation(st);
    v.orb = { centre: st.centre, r: e.r, v: e.v, transfert: null };
    v.cible = null;
    Orbiteur.log(`Reprise ${au(st)}, ${enOrbite(ASTRES_PAR_ID[st.centre])}.`);
    return allerNavigation();
  }
  // Base : l'orbiteur attend en orbite (à la station s'il y en a une), l'atterrisseur est posé à côté de la base.
  const b = v.bases[Number(id.slice(5))], a = ASTRES_PAR_ID[b.astre];
  const st = v.stations.find((s) => s.centre === a.id);
  if (st) { const e = Orbiteur.etatStation(st); v.orb = { centre: a.id, r: e.r, v: e.v, transfert: null }; }
  else { const r0 = a.rayonKm + Math.max(100, altitudeOrbite(a) / 1000 + 50); v.orb = { centre: a.id, r: [r0, 0], v: [0, Math.sqrt(a.gm / r0)], transfert: null }; }
  v.cible = null;
  const c = concevoirAtterrisseur(a);
  if (!c.ok) { Orbiteur.log(c.raison); return allerNavigation(); }
  Orbiteur.log(`Reprise à la base ${a.nom} (niveau ${b.niveau || 1}) : l’atterrisseur est posé à côté.`);
  sauver(etat);
  etat.destination = a.id;
  lancer({ voyage: true, fusee: c.fusee, bases: basesSur(a.id), site: { x: b.x, xDescente: b.x - 90 }, depuisSol: true });
}

// Départ réaliste vers une autre étoile : la campagne s'arrête là, avec ses dates d'arrivée.
function terminerParDepart(info) {
  const v = etat.voyage;
  v.fin = info;
  Orbiteur.log(`Départ pour ${le(info.nomEtoile)} (${fmt(info.distanceAL, 2)} années-lumière) à ${fmt(info.vitesse, 1)} km/s : ${info.nomProfil.toLowerCase()}. Arrivée vers ${fmtAnnee(info.arriveeJeu)}.`);
  sauver(etat);
  const h = $('res-titre');
  h.textContent = `En route vers ${le(info.nomEtoile)}`;
  h.className = 'succes';
  $('res-message').textContent = `L’expédition a quitté le ${SYSTEME.nom} en ${info.anneeDepart}. À ${fmt(info.vitesse, 1)} km/s, les ${fmt(info.distanceAL, 2)} années-lumière prendront ${fmtDureeAnnees(info.ans)}. Fin de la partie.`;
  const vus = Object.keys(v.visites).filter((id) => v.visites[id].pose && ASTRES_PAR_ID[id]).length;
  const ech = Object.values(v.echantillonsRapportes || {}).reduce((s, k) => s + k, 0);
  $('res-stats').innerHTML = `
    <dt>Destination</dt><dd>${info.nomEtoile}, ${fmt(info.distanceAL, 2)} années-lumière</dd>
    <dt>Propulsion</dt><dd>${info.nomProfil} (${fmt(info.vitesse, 1)} km/s)</dd>
    <dt>Durée du voyage</dt><dd>${fmtDureeAnnees(info.ans)}</dd>
    <dt>Arrivée (temps de jeu)</dt><dd>vers ${fmtAnnee(info.arriveeJeu)}</dd>
    <dt>Arrivée (vraie vie)</dt><dd>vers ${fmtAnnee(info.arriveeVraie)}</dd>
    <dt>Astres visités</dt><dd>${vus}</dd>
    <dt>Échantillons rapportés</dt><dd>${ech}</dd>
    <dt>Stations / bases</dt><dd>${v.stations.length} / ${v.bases.length}</dd>`;
  etat.suiteResultat = 'accueil';
  $('vers-hangar').textContent = '← Accueil';
  $('rejouer').classList.add('cache');
  montrer('resultat');
}
// Départ science-fiction : traversée animée, puis arrivée et nouvelle campagne dans l'autre système.
function partirVersSysteme(info) {
  const v = etat.voyage;
  Orbiteur.log(`Départ pour ${le(info.nomSysteme)} en ${TECHNOLOGIES[info.tech].nom.toLowerCase()} : ${fmtDureeAnnees(info.ans)} de voyage, installation prévue sur ${info.nomBase}.`);
  sauver(etat);
  jouerScene(new TransitInterstellaire(info), () => {
    const st = arriverDansSysteme(v, info);
    Orbiteur.charger(v);
    Orbiteur.camPlacee = false;
    sauver(etat);
    const h = $('res-titre');
    h.textContent = `Arrivée dans le ${SYSTEME.nom}`;
    h.className = 'succes';
    $('res-message').textContent = `Après ${fmtDureeAnnees(info.ans)} de voyage (${fmtDureeAnnees(info.ansBord)} vécus à bord), l’expédition est entrée dans le système par l’extérieur et s’est placée ${enOrbite(info.nomBase)}. ${Le(st)} est déployée avec le chargement. À vous de vous poser et de construire la base.`;
    $('res-stats').innerHTML = `
      <dt>Propulsion</dt><dd>${TECHNOLOGIES[info.tech].nom}</dd>
      <dt>Distance</dt><dd>${fmt(info.distanceAL, 2)} années-lumière</dd>
      <dt>Date d’arrivée</dt><dd>${fmtAnnee(info.anneeDepart + info.ans)}</dd>
      <dt>Planète de base</dt><dd>${info.nomBase}</dd>
      <dt>Station</dt><dd>${decrireContenu(st.stock) || 'stock vide'}</dd>
      <dt>À bord de l’orbiteur</dt><dd>${v.kitsBase} kits de base, ${v.kits} kits de station, ${v.atterrisseurs} atterrisseurs, ${v.robots} robots, ${v.sondes} sondes</dd>
      <dt>Équipe</dt><dd>${v.equipe ? survivants(v).map((m) => m.nom).join(', ') : nomSpatio()}</dd>`;
    etat.suiteResultat = 'nav';
    $('vers-hangar').textContent = 'Aller à l’orbiteur';
    $('rejouer').classList.add('cache');
    montrer('resultat');
  });
}
Depart.contexte = { terminer: (info) => terminerParDepart(info), partirSF: (info) => partirVersSysteme(info), log: (t) => { Orbiteur.log(t); sauver(etat); } };

Orbiteur.contexte = {
  equipement: () => etat.equipement,
  masque: () => etat.masque,
  basculerMasque: () => { etat.masque = !etat.masque; sauver(etat); },
  estEnPause: () => etat.pause,
  basculerPause: () => { etat.pause = !etat.pause; },
  hangar: () => { sauver(etat); allerAccueil(); },
  descendre: (id) => descendre(id),
  larguerRobot: (id, blindage) => larguerRobot(id, blindage),
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
  if (etat.voyage && !confirm('Recommencer une nouvelle campagne ? Les stations, bases et sondes actuelles seront perdues.')) return;
  etat.voyage = Orbiteur.nouveauVoyage();
  Orbiteur.camPlacee = false;
  sauver(etat);
  allerNavigation();
};
$('voyage-reprendre').onclick = ouvrirReprise;
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
    if (etat.ecran !== 'nav' && etat.ecran !== 'vol' && etat.ecran !== 'explo' && !a.artificiel) {
      l.push({ texte: '🚀 Visite rapide ici', action: () => { etat.destination = a.id; montrer('carte'); afficherCarte(etat, choisirDestination); lancerVisite(); } });
    }
    return l;
  },
  // Tableau de bord de l'astre pendant la campagne (actions seulement quand l'orbiteur est ouvert).
  tableau: (a) => (etat.voyage && !etat.voyage.fin ? tableauAstre(etat.voyage, a, etat.ecran === 'nav' && Orbiteur.v === etat.voyage) : null),
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
$('accueil-reprendre').onclick = ouvrirReprise;
$('accueil-visite').onclick = allerCarte;
$('accueil-hangar').onclick = allerHangar;
// « Se promener » : la Terre, ou un objet du ciel lointain observé de loin (puis retour à la liste).
const CONTEXTE_PROMENADE = {
  terre: () => promenadeSurTerre(),
  observer: (o) => jouerScene(new Observation(o), () => { allerAccueil(); ouvrirPromenade(CONTEXTE_PROMENADE); }),
};
$('accueil-promenade').onclick = () => ouvrirPromenade(CONTEXTE_PROMENADE);
$('accueil-spatio').onclick = () => afficherCreationSpatio(allerAccueil);
$('exporter').onclick = () => { exporterSauvegarde(etat); $('sauvegarde-info').textContent = 'Fichier téléchargé.'; };
$('importer').onclick = () => $('fichier-sauvegarde').click();
$('fichier-sauvegarde').onchange = (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  if (etat.voyage && !confirm('Charger ce fichier remplace la partie en cours dans ce navigateur. Continuer ?')) return;
  importerSauvegarde(f, (erreur) => {
    if (erreur) { $('sauvegarde-info').textContent = '⚠ ' + erreur; return; }
    location.reload();   // on repart proprement de la sauvegarde chargée
  });
};
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
    if (etat.ecran === 'scene') {
      if (etat.scene && etat.scene.obj.clic && etat.scene.obj.clic(e.clientX, e.clientY)) return;   // boutons de la scène (zoom)
      passerScene();
      return;
    }
    if ((etat.ecran === 'vol' || etat.ecran === 'explo') && clicFanion(e.clientX, e.clientY)) return;   // croix du fanion
    // Petit écran : un appui sur le tableau de bord compact l'agrandit (et inversement).
    if (etat.ecran === 'vol' && etat.vol && ZONE_HUD) {
      const z = ZONE_HUD;
      if (e.clientX >= z.x && e.clientX <= z.x + z.w && e.clientY >= z.y && e.clientY <= z.y + z.h) { etat.vol.hudComplet = !etat.vol.hudComplet; return; }
    }
    if (etat.ecran === 'nav' && Orbiteur.clicMiniCarte(e.clientX, e.clientY)) return;
    const id = astreSousSouris(e);
    if (id) ouvrirFiche(id);
  });
  el.addEventListener('dblclick', (e) => { const id = astreSousSouris(e); if (id && etat.ecran === 'nav') Orbiteur.centrerSur(id); });
}
// Scène animée : un toucher la fait passer.
canvas.addEventListener('touchend', (e) => {
  const t0 = e.changedTouches && e.changedTouches[0];
  if ((etat.ecran === 'vol' || etat.ecran === 'explo') && t0 && clicFanion(t0.clientX, t0.clientY)) { e.preventDefault(); return; }
  if (etat.ecran !== 'scene' || !etat.scene) return;
  e.preventDefault();
  const tc = e.changedTouches && e.changedTouches[0];
  if (tc && etat.scene.obj.clic && etat.scene.obj.clic(tc.clientX, tc.clientY)) return;
  passerScene();
});
canvas.addEventListener('wheel', (e) => { if (etat.ecran === 'scene' && etat.scene && etat.scene.obj.molette) { e.preventDefault(); etat.scene.obj.molette(e); } }, { passive: false });
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
  // Espace / Entrée sur un bouton qui a gardé le focus : c'est pour le jeu, pas pour recliquer le bouton.
  if (e.target && e.target.tagName === 'BUTTON' && ['Space', 'Enter'].includes(e.code) && ['vol', 'explo', 'nav'].includes(etat.ecran)) e.preventDefault();
  if (e.code === 'KeyI') { Infos.ouvrirEncyclopedie(); return; }
  if (etat.ecran === 'scene') {
    if (['Enter', 'Space', 'Escape', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); passerScene(); }
    else if (etat.scene && etat.scene.obj.touche) etat.scene.obj.touche(e);     // zoom de l'observation
    if (e.code === 'KeyP') etat.pause = !etat.pause;
    return;
  }
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
    if (e.code === 'KeyF') x.planterDrapeau();
    if (e.code === 'Escape') {
      if (x.terre) x.terminer('retour', `Fin de la promenade : ${x.bouquet || 0} fleurs, ${x.panier || 0} fruits, ${x.bieres} bière(s).`);
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
  // Chaque touche répond : elle agit, ou un message dit pourquoi elle ne peut pas agir maintenant.
  const refus = (texte) => { v.messageExplo = { texte, vie: 4 }; };
  if (e.code === 'KeyL') {
    v.autopilote = !v.autopilote; v.cibleX = null; v.tCible = -1;
    refus(v.autopilote ? 'Pilote automatique activé.' : 'Pilote automatique coupé : vous avez les commandes.');
  }
  if (e.code === 'KeyT') {
    if (v.pose) v.demanderDecollage();
    else refus('Décollage (T) : il faut d’abord être posé.');
  }
  if (e.code === 'KeyB') construireBase();
  if ((e.code === 'KeyE' || e.code === 'KeyR') && !(v.pose && v.astre.type === 'solide')) {
    refus(v.astre.type !== 'solide' ? 'Pas de sol ici : ni spationaute ni robot ne peuvent sortir.' : `${e.code === 'KeyE' ? 'Sortir le spationaute' : 'Sortir le robot'} : il faut d’abord être posé.`);
  }
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
// La prochaine image est demandée d'abord : une erreur dans une image ne doit jamais figer le jeu.
// L'erreur est montrée (une seule fois), le jeu se met en pause et on peut télécharger la sauvegarde.
let erreurAffichee = null;
function boucle(t) {
  requestAnimationFrame(boucle);
  try {
    image(t);
    if (typeof Tactile !== 'undefined') Tactile.majImage();
  } catch (e) {
    console.error(e);
    signalerErreur(e);
  }
}
function signalerErreur(e) {
  // Les 3 premiers appels de la pile (Chrome commence par une ligne « Error: … », Firefox directement par l'appel fautif).
  const pile = (e && e.stack || '').split('\n').filter((l) => l.trim() && !/^\w*Error\b/.test(l.trim()));
  const texte = `${e && e.message} — ${pile.slice(0, 3).join(' ').trim()}`;
  const date = etat.voyage ? fmtDate(etat.voyage.t) : '';
  try { localStorage.setItem('fusee-derniere-erreur', JSON.stringify({ texte, date, quand: new Date().toISOString(), ecran: etat.ecran })); } catch (x) { /* ignoré */ }
  etat.pause = true;
  if (erreurAffichee === texte) return;
  erreurAffichee = texte;
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>⚠ Le jeu a rencontré une erreur</h2>
    <p>Le jeu est en pause${date ? ` (date du jeu : ${date})` : ''}. Vous pouvez reprendre ; si l’erreur revient, téléchargez la sauvegarde et envoyez-la avec ce message pour qu’elle soit corrigée.</p></div><button class="fermer">✕</button></header>
    <pre class="erreur"></pre>
    <div class="actions"><button id="err-sauvegarde">⬇ Télécharger la sauvegarde</button><button id="err-accueil">← Accueil</button><button id="err-reprendre" class="principal">▶ Reprendre</button></div></div>`;
  m.querySelector('.erreur').textContent = texte;
  m.classList.remove('cache');
  const fermer = () => { m.classList.add('cache'); m.innerHTML = ''; };
  m.querySelector('.fermer').onclick = fermer;
  $('err-sauvegarde').onclick = () => exporterSauvegarde(etat);
  $('err-accueil').onclick = () => { fermer(); etat.pause = false; allerAccueil(); };
  $('err-reprendre').onclick = () => { fermer(); etat.pause = false; erreurAffichee = null; };
}
function image(t) {
  const dt = Math.max(0, Math.min(0.05, (t - avant) / 1000));
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
      if (etat.finDepuis > (v.fin.detruite ? 1.8 : 0.6)) terminerVol(v);
    }
  } else if (etat.ecran === 'scene' && etat.scene) {
    const sc = etat.scene;
    if (!etat.pause) sc.obj.step(dt);
    sc.obj.dessiner(ctx, canvas.width, canvas.height);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctx, canvas.width, canvas.height);
    if (sc.obj.fini) { etat.scene = null; sc.suite(); }
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
      // La dose de la sortie reste acquise : l'équipage la garde en remontant dans la fusée.
      if (x.type === 'spationaute' && !x.terre) { etat.vol.doseSv = x.doseSv; etat.vol.dose = x.dose; }
      // Une sortie qui tourne mal est notée : l'écran de résultat en parlera, même si la remontée réussit.
      if (x.fin.issue === 'perdu' && !x.terre) (etat.vol.pertes = etat.vol.pertes || []).push({ qui: x.type, texte: x.fin.texte });
      // Campagne : l'équipage perdu ne reviendra pas (la capsule rentrera vide).
      if (x.fin.issue === 'perdu' && x.type === 'spationaute' && !x.terre && etat.enVoyage && etat.voyage) etat.voyage.equipagePerdu = true;
      if (etat.voyage && etat.enVoyage) etat.voyage.journal.push({ t: etat.voyage.t, texte: `${etat.vol.astre.nom} : ${x.fin.texte}` });
      etat.explo = null;
      touches.clear();
      sauver(etat);
      if (etat.vol.promenade) allerAccueil();                // fin de la promenade sur Terre
      else if (etat.vol.robotSeul) allerNavigation();        // le robot reste sur place, on revient à l'orbiteur
      else montrer('vol');                                   // retour à la fusée posée
    }
  } else if (etat.ecran === 'nav' && etat.voyage && etat.voyage.orb) {
    Orbiteur.mettreAJour(dt, etat.pause);
    // La mise à jour a pu mettre fin à l'expédition (orbiteur écrasé) et ouvrir l'écran de résultat :
    // plus rien à dessiner ici.
    if (etat.ecran !== 'nav' || !etat.voyage || !etat.voyage.orb) return;
    Orbiteur.dessiner(ctxNav, toile.width, toile.height);
    if (etat.pause && !Infos.estOuverte()) dessinerPause(ctxNav, toile.width, toile.height);
    Orbiteur.majHud(false);
    if (t - tSauvegarde > 5000) { sauver(etat); tSauvegarde = t; }
  }
}

// Premier lancement : on choisit d'abord son ou sa spationaute.
if (SPATIO.choisi) allerAccueil(); else afficherCreationSpatio(allerAccueil);
requestAnimationFrame(boucle);
