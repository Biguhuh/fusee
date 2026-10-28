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
  // Ancien nom du mode qui fait tout le voyage (devenu « Pilote auto »).
  if (m.mode === 'planif' + 'icateur') m.mode = 'pilote';
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
  // Drapeau « équipage perdu » resté levé d'une expédition précédente (perdue sans retour en capsule) :
  // s'il n'y a eu aucune perte depuis le départ de l'expédition en cours, on le baisse.
  if (m.equipagePerdu && m.orb && !(m.pertesEquipage || []).length) {
    const j = m.journal || [];
    const depart = j.map((e) => /^Expédition n°/.test(e.texte)).lastIndexOf(true);
    const perteDepuis = j.slice(depart + 1).some((e) => /Atterrisseur perdu|n’a pas survécu|a écrasé|a eu raison|Le rayonnement a |Plus d’oxygène|dans l’espace/.test(e.texte));
    if (depart >= 0 && !perteDepuis) m.equipagePerdu = false;
  }
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
  $('ecran-equipage').classList.toggle('cache', ecran !== 'equipage');
  $('ecran-hangar').classList.toggle('cache', ecran !== 'hangar');
  $('ecran-carte').classList.toggle('cache', ecran !== 'carte');
  $('ecran-resultat').classList.toggle('cache', ecran !== 'resultat');
  canvas.classList.toggle('cache', ecran !== 'vol' && ecran !== 'explo' && ecran !== 'scene');
  $('ecran-nav').classList.toggle('cache', ecran !== 'nav');
  $('ecran-spatio').classList.toggle('cache', ecran !== 'spatio');
  Infos.infobulle(0, 0, null);
  window.scrollTo(0, 0);
  if (ecran === 'vol' || ecran === 'explo') conseillerPaysage();
}

// Téléphone tenu en portrait pendant un vol ou une sortie : une bulle discrète conseille le paysage.
// Jamais forcé ; une fois par chargement de page, et plus du tout si on la ferme.
let conseilPaysageVu = false;
function conseillerPaysage() {
  if (conseilPaysageVu || !ECRAN_TACTILE || innerWidth > innerHeight) return;
  try { if (localStorage.getItem('fusee-conseil-paysage') === 'non') return; } catch (e) { /* stockage indisponible */ }
  conseilPaysageVu = true;
  const el = document.createElement('div');
  el.id = 'conseil-paysage';
  el.innerHTML = '<span>📱↻ Astuce : en paysage, on voit plus loin devant soi.</span><button aria-label="Ne plus afficher">✕</button>';
  document.body.appendChild(el);
  const fermer = () => el.remove();
  el.querySelector('button').onclick = () => { try { localStorage.setItem('fusee-conseil-paysage', 'non'); } catch (e) { /* ignoré */ } fermer(); };
  setTimeout(fermer, 7000);
  window.addEventListener('resize', function quand() { if (innerWidth > innerHeight) { fermer(); window.removeEventListener('resize', quand); } });
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

// Astre visité pendant la campagne : posé dessus, ou plongée réussie dans une géante gazeuse.
function astreVisite(v, id) { const x = v && v.visites && v.visites[id]; return !!(x && (x.pose || x.plonge)); }
// Astres où l'on s'est posé pendant la campagne. Corrige les parties où une visite sans atterrissage avait
// effacé un atterrissage précédent : une base, des échantillons rapportés ou une sortie y prouvent la visite.
function reconstituerVisites(v) {
  const poser = (id) => {
    const a = id && ASTRES_PAR_ID[id];
    if (!a) return;
    // Géante gazeuse : des prélèvements prouvent une plongée, pas un atterrissage.
    v.visites[id] = { ...(v.visites[id] || {}), ...(a.type === 'gazeuse' ? { plonge: true } : { pose: true }) };
  };
  for (const b of v.bases || []) poser(b.astre);
  for (const [id, n] of Object.entries(v.echantillonsRapportes || {})) if (n > 0) poser(id);
  for (const [id, n] of Object.entries(v.echantillonsABord || {})) if (n > 0) poser(id);
  for (const f of Object.values((typeof etat !== 'undefined' && etat.registre) || {})) for (const id of Object.keys(f.astres || {})) poser(id);
}

function allerAccueil() {
  const v = etat.voyage;
  // Campagne terminée par un départ vers une autre étoile : on ne la reprend plus.
  $('accueil-reprendre').classList.toggle('cache', !v || !!v.fin);
  $('accueil-reprendre').textContent = v && v.orb ? '▶ Reprendre l’expédition' : '▶ Reprendre la campagne';
  // Pas d'expédition en cours (après un retour sur Terre) : on propose d'abord de composer l'équipage,
  // puis on enchaîne sur le pas de tir. « Reprendre » devient secondaire.
  const sansExpedition = !!(v && !v.fin && !v.orb && (!v.systeme || v.systeme === 'solaire'));
  $('accueil-equipage').classList.toggle('cache', !sansExpedition);
  $('accueil-reprendre').classList.toggle('principal', !sansExpedition);
  $('accueil-campagne').textContent = v ? '↺ Nouvelle campagne' : '🛰 Commencer';
  if (v && v.fin) {
    const f = v.fin;
    $('progres-accueil').innerHTML = `<b>Campagne terminée.</b> Partie en ${f.anneeDepart} vers ${le(f.nomEtoile)} (${fmt(f.distanceAL, 2)} années-lumière) à ${fmt(f.vitesse, 1)} km/s : arrivée vers ${fmtAnnee(f.arriveeJeu)} (temps de jeu), vers ${fmtAnnee(f.arriveeVraie)} dans la vraie vie.`;
  } else if (v) {
    // La progression se compte dans le système de la campagne (qui peut être une autre étoile).
    choisirSystemeCampagne(v);
    reconstituerVisites(v);
    const vus = Object.keys(v.visites).filter((id) => astreVisite(v, id) && ASTRES_PAR_ID[id]);
    const nPrinc = SYSTEME.objectifs.filter((id) => vus.includes(id)).length;
    $('progres-accueil').innerHTML = (SYSTEME.id !== 'solaire' ? `<b>Campagne dans le ${SYSTEME.nom}</b> (${fmt(SYSTEME.distanceAL, 2)} années-lumière). ` : '') +
      `Progression : <b>${vus.length} astre${vus.length > 1 ? 's' : ''} visité${vus.length > 1 ? 's' : ''} en campagne ✅</b> sur ${astresAVisiter().length} (dont ${nPrinc} des ${SYSTEME.objectifs.length} principaux). ` + resumeCampagne(v);
  } else $('progres-accueil').innerHTML = '';
  // Easter eggs : rien tant que le premier n'est pas trouvé ; ensuite, la liste avec leurs références.
  const nEggs = nombreEggsTrouves();
  $('eggs-accueil').classList.toggle('cache', !nEggs);
  if (nEggs) {
    $('eggs-accueil').innerHTML = `✨ <b>${nEggs} easter egg${nEggs > 1 ? 's' : ''} trouvé${nEggs > 1 ? 's' : ''}</b> sur ${tousLesEggs().length}, marqués ✨ sur la carte des destinations pour les retrouver. <button id="accueil-eggs">Voir la liste et les références</button>`;
    $('accueil-eggs').onclick = () => ouvrirEggs(allerVersEgg);
  }
  // Les visites de la campagne sont versées dans la progression « toutes campagnes ».
  cumulerProgression(v);
  // Hors campagne (visite rapide, promenade, encyclopédie), on est dans le Système solaire.
  choisirSysteme('solaire');
  $('spatio-resume').textContent = resumeSpatio();
  montrer('accueil');
  ongletAccueil(etat.ongletAccueil || 'jouer');
  animerAccueil();
}

// Onglets de l'accueil : « Jouer » et « Progression ».
function ongletAccueil(nom) {
  etat.ongletAccueil = nom;
  document.querySelectorAll('[data-accueil]').forEach((b) => b.classList.toggle('choisi', b.dataset.accueil === nom));
  $('accueil-jouer').classList.toggle('cache', nom !== 'jouer');
  $('accueil-progression').classList.toggle('cache', nom !== 'progression');
  if (nom === 'progression') afficherProgression();
}
document.querySelectorAll('[data-accueil]').forEach((b) => { b.onclick = () => ongletAccueil(b.dataset.accueil); });
// Retrouver un easter egg : la carte de la visite rapide, l'astre choisi.
function allerVersEgg(id) { ongletAccueil('jouer'); etat.destination = id; allerCarte(); choisirDestination(id); }

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
  // Campagne : qui pilote cette descente (votre spationaute, ou un survivant s'il est mort).
  if (options.voyage && etat.voyage) etat.vol.equipier = equipierDescente(etat.voyage);
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
  etat.repriseCrash = null;
  if (etat.vol.lancement) {
    // Lancement de la méga-fusée depuis la Terre.
    if (reussi) {
      Orbiteur.charger(v);
      const fl = etat.vol.f;
      Orbiteur.demarrerExpedition(fl.lanceur === 'equipage');
      Orbiteur.camPlacee = false;
      const f = etat.vol.f;
      if (f.lanceur === 'lune') {
        const tli = Orbiteur.injectionTranslunaire(deltaVRestant(f, etat.vol.carburant));
        etat.reprendreAuto = tli.ok;   // le pilote auto poursuit le voyage à l'ouverture de l'orbiteur
        r.messageLancement = `${f.nomLanceur} a placé l’expédition en orbite terrestre. ` + tli.texte;
      } else {
        r.messageLancement = f.lanceur === 'equipage' ? `${f.nomLanceur} a monté l’équipage jusqu’à la station terrestre : il reprend l’orbiteur garé. Faites le plein à la station avant de repartir.` : `${f.nomLanceur} a placé l’expédition en orbite terrestre.` + (v.stations.some((s) => s.terrestre) ? ' Rendez-vous avec la station spatiale.' : ' Première tâche : construire la station spatiale.');
      }
      etat.suiteResultat = 'nav';
    } else {
      Orbiteur.charger(v);
      Orbiteur.log('Échec du lancement de la méga-fusée.');
      etat.suiteResultat = 'accueil';
    }
  } else if (etat.enVoyage && etat.vol.droneSeul) {
    // Drone : pas d'équipage ni d'atterrisseur en jeu ; il reste sur place. Les repérages sont déjà notés.
    const a = r.astre.id, n = Object.keys(etat.vol.vusDrone || {}).length;
    const fin = { ecrasee: 'écrasé', carburant: 'tombé, batterie vide', bloque: 'posé, batterie vide', pressurisee: 'écrasé par la pression', brulee: 'brûlé', abandon: 'laissé sur place' }[r.cause] || 'mission terminée';
    v.visites[a] = { ...(v.visites[a] || {}), drone: true };
    Orbiteur.log(`🚁 Mission du drone terminée ${sur(r.astre)} : ${fin}${n ? `, ${n} repérage${n > 1 ? 's' : ''}` : ''}.`);
    // Drone parti du robot : on revient au robot, qui continue son exploration.
    if (etat.retourRobot) {
      const rr = etat.retourRobot;
      etat.retourRobot = null;
      etat.vol = rr.vol; etat.explo = rr.explo;
      rr.explo.dire(`🚁 Fin du vol du drone : ${fin}${n ? `, ${n} repérage${n > 1 ? 's' : ''} photographié${n > 1 ? 's' : ''}` : ''}. Retour au robot.`);
      sauver(etat);
      touches.clear();
      montrer('explo');
      return;
    }
  } else if (etat.enVoyage) {
    const a = r.astre.id;
    if (!etat.vol.robotSeul && etat.vol.doseSv) regDose(piloteDuVol(v), etat.vol.doseSv);   // registre des équipages
    if (reussi) {
      // L'atterrisseur rejoint l'orbiteur avec ses échantillons ; ses ergols restants retournent en réserve.
      v.ergolsAtt += r.carburantRestant;
      if (etat.vol.echantillons) v.echantillonsABord[a] = (v.echantillonsABord[a] || 0) + etat.vol.echantillons;
      Orbiteur.log(`Atterrisseur récupéré ${enOrbite(r.astre)}${etat.vol.echantillons ? ` avec ${etat.vol.echantillons} échantillon(s)` : ''}.`);
    } else if (r.cause === 'abandon' && !r.dejaPose) {
      // Descente interrompue sans s'être posé : l'atterrisseur remonte à l'orbiteur, équipage compris ;
      // seuls les ergols brûlés sont perdus.
      v.ergolsAtt += r.carburantRestant;
      Orbiteur.log(`Descente interrompue ${sur(r.astre)} : l’atterrisseur est revenu à l’orbiteur.`);
    } else {
      v.atterrisseurs = Math.max(0, v.atterrisseurs - 1);
      if (!etat.vol.robotSeul) {                           // l'équipage était à bord de l'atterrisseur
        perdrePilote(v, a, causeVol(r.cause), etat.vol.equipier);
      }
      Orbiteur.log(`Atterrisseur perdu ${sur(r.astre)}${etat.vol.echantillons ? ' avec ses échantillons' : ''}. Il en reste ${v.atterrisseurs}.`);
    }
    // Une fois visité, l'astre le reste : une visite suivante ratée ne l'efface pas.
    // Géante gazeuse : on ne s'y pose pas, on y plonge (la plongée réussie compte comme la visite).
    const deja = v.visites[a] || {};
    if (r.astre.type === 'gazeuse') v.visites[a] = { ...deja, plonge: !!deja.plonge || r.cause === 'plongee' };
    else v.visites[a] = { ...deja, pose: !!deja.pose || !!r.dejaPose || r.cause === 'pose' };
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
  const gare = v && v.orbiteurGare && station;
  const notes = {
    equipage: gare ? `L’orbiteur garé ${au(station)} attend l’équipage : rendez-vous, amarrage, puis faites le plein à la station.`
      : `Indisponible : aucun orbiteur n’est garé ${station ? au(station) : 'en orbite (pas encore de station terrestre)'}. Il en reste un après chaque retour sur Terre de l’équipage, si la station existe ; sinon, prenez Hercule.`,
    station: station ? `Rendez-vous et amarrage ${au(station)}.${gare ? ' Un orbiteur neuf : celui qui est garé à la station y reste.' : ''}` : 'Arrivée en orbite basse : vous y construirez la station spatiale.',
    lune: 'Après la mise en orbite, le 3e étage rallume pour l’injection translunaire : l’expédition part directement vers la Lune (environ 5 jours de trajet).',
  };
  // Rappel de l'équipage composé, avec un retour vers sa page.
  const l = v && v.equipePrevue;
  const noms = l && l.length ? l.map((p) => (p.principal ? majuscule(nomSpatio()) : p.nom || (p.profil && p.profil.prenom))).join(', ') : '';
  $('lanceurs').innerHTML = (noms ? `<p class="equipage-choisi">👥 Équipage : <b>${noms}</b> <button id="lanceurs-equipage">✏ Modifier l’équipage</button></p>` : '') +
    ['equipage', 'station', 'lune'].map((type) => {
    const l = LANCEURS[type], c = caracteristiquesLanceur(l);
    const indispo = type === 'equipage' && !gare;
    return `<article class="lanceur ${indispo ? 'indisponible' : ''}">
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
        <button class="principal" data-lancer="${type}" ${indispo ? 'disabled' : ''}>🚀 Aller sur le pas de tir</button>
      </div>
    </article>`;
  }).join('');
  const be = $('lanceurs-equipage');
  if (be) be.onclick = () => allerEquipage(v);
  $('lanceurs').querySelectorAll('canvas').forEach((cv) => {
    const f = megaFusee(cv.dataset.type);
    const c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    dessinerTour(c, cv.width / 2 + 22, 210, 190 / f.hauteur, f.hauteur);
    dessinerFusee(c, { f, angle: 0, throttle: 0, temp: 20 }, cv.width / 2, 210, 190 * (f.hauteur / 120));
  });
  // Avant le pas de tir : composer l'équipage (vétérans ou recrues, prénoms et apparences).
  $('lanceurs').querySelectorAll('[data-lancer]').forEach((b) => {
    // L'équipage se compose sur sa page, avant le choix du lanceur ; à défaut, on y passe d'abord.
    b.onclick = () => (etat.voyage && !(etat.voyage.equipePrevue && etat.voyage.equipePrevue.length) ? allerEquipage(etat.voyage) : lancerMegaFusee(b.dataset.lancer));
  });
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
  if (v.equipe && !pilote(v)) return Orbiteur.log('Personne à bord de l’orbiteur pour piloter l’atterrisseur : rappelez l’équipage, ou attendez le retour d’une mission.');
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
  // Réserve insuffisante : on prévient (l'équipage ne pourra pas remonter), mais on laisse descendre avec ce qu'il reste.
  const plein = c.fusee.carburant, dispo = Math.min(plein, v.ergolsAtt);
  if (dispo < plein) {
    const gaz = a.type === 'gazeuse';
    if (!confirm(`⚠ Attention : il ne reste que ${fmt(dispo / 1000, 1)} t d’ergols pour l’atterrisseur, sur ${fmt(plein / 1000, 1)} t nécessaires.\n\nSi vous descendez, l’équipage ne pourra pas remonter ${gaz ? 'des profondeurs ' + de(a) : de(a)} : ${gaz ? 'la plongée' : 'la descente'} serait un aller simple.\n\nRavitaillez plutôt à une station. Descendre quand même ?`)) return;
  }
  v.ergolsAtt -= dispo;
  etat.destination = id;
  // Équipage traumatisé : la descente peut mal commencer (fausse manœuvre, ergols gaspillés).
  let carb = dispo;
  if (rateParTrauma(v)) {
    carb = dispo * 0.6;
    Orbiteur.log(`😰 Fausse manœuvre au départ de la descente ${sur(a)} : l’équipage traumatisé a gaspillé 40 % des ergols de l’atterrisseur.`);
  }
  lancer({ voyage: true, fusee: c.fusee, carburant: carb, bases: basesSur(id), site: siteDescente(id) });
}

// Dangers d'une sortie (spationaute ou robot) là où l'on est posé : pression, chaleur, rayonnement.
// Pour le rayonnement, le temps maximal dehors avant la dose mortelle.
function dangersSortie(vol, type) {
  const d = EXPLORATEURS[type], c = vol.c || conditions(vol.astre, vol.y), l = [];
  const qui = type === 'robot' ? 'le robot' : 'la combinaison';
  if (c.p > d.pressionMax) l.push(`Pression ${fmtP(c.p)} : ${qui} ne résiste qu’à ${fmt(d.pressionMax, 1)} bar. ${type === 'robot' ? 'Il' : 'Elle'} se déformera puis cédera.`);
  if (c.t > d.tempMax) l.push(`Température ${fmt(c.t)} °C : ${qui} ne supporte que ${fmt(d.tempMax)} °C.`);
  if (type === 'spationaute') {
    const ir = doseSurface(vol.astre), t = tempsAvantDoseMortelle(ir.svJour, vol.doseSv || 0);
    if (t < d.autonomie) l.push(`Rayonnement ${fmtDose(ir.svJour)} : dose mortelle en ${fmtDuree(t)}. Temps de sortie maximal : ${fmtDuree(Math.max(0, t * 0.8))} (retour au module compris), au-delà c’est la mort.`);
  }
  return l;
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
  Orbiteur.log(`Robot largué ${sur(a)} (blindage ${BLINDAGES_ROBOT[blindage].nom.toLowerCase()}, rayonnement ${fmtDose(doseSurface(a).svJour)}).`);
  // Avec de l'air, le drone voyage avec le robot dans la même capsule (comme Ingenuity avec Perseverance).
  const avecDrone = droneVolePossible(a) && v.drones > 0;
  if (avecDrone) { v.drones--; etat.vol.droneEmbarque = true; Orbiteur.log(`🚁 Le drone accompagne le robot ${sur(a)}.`); }
  // Petite animation : parachute (ou rétrofusées), ballons, rebonds, dégonflage ; puis l'exploration.
  jouerScene(new DescenteRobot(etat.vol), () => {
    etat.explo = new Exploration(etat.vol, 'robot', etat.science, { blindage });
    if (avecDrone) etat.explo.dire('🚁 Le drone est arrimé au robot : H (ou le bouton 🚁) pour le faire décoller. Il vole sur batterie et repère les objets en vol bas.');
    replique('reviendrai');
    touches.clear();
    redim();
    montrer('explo');
  });
}

// 🆘 Sauvetage réussi : le module de secours ramène le spationaute (et son sac). Le premier atterrisseur reste au sol.
function finSecours() {
  const v = etat.enVoyage && etat.voyage, vol = etat.vol, a = vol.astre;
  const nom = (vol.equipier || equipierDescente(null)).nom, n = vol.echantillons || 0;
  const h = $('res-titre');
  h.textContent = '🆘 Sauvetage réussi';
  h.className = 'succes';
  $('res-message').textContent = `Le module de secours a ramené ${nom} ${v ? 'à l’orbiteur' : 'en orbite'}${n ? ` avec ${n} échantillon${n > 1 ? 's' : ''}` : ''}. Le premier atterrisseur reste ${sur(a)}, pour toujours.`;
  $('res-stats').innerHTML = '';
  if (v) {
    v.atterrisseurs = Math.max(0, v.atterrisseurs - 1);   // l'atterrisseur bloqué est perdu ; celui de secours remonte
    if (n) v.echantillonsABord[a.id] = (v.echantillonsABord[a.id] || 0) + n;
    v.visites[a.id] = { ...(v.visites[a.id] || {}), pose: true };
    if (vol.doseSv) regDose(piloteDuVol(v), vol.doseSv);
    Orbiteur.log(`🆘 Sauvetage ${sur(a)} : ${nom} est de retour à bord${n ? ` avec ${n} échantillon${n > 1 ? 's' : ''}` : ''}. Un atterrisseur reste au sol (il en reste ${v.atterrisseurs}).`);
    etat.suiteResultat = 'nav';
    $('vers-hangar').textContent = 'Aller à l’orbiteur';
  } else {
    etat.suiteResultat = 'visite';
    $('vers-hangar').textContent = '🎯 Autre destination';
  }
  $('rejouer').classList.add('cache');
  sauver(etat);
  montrer('resultat');
}

// Drone arrimé au robot : il décolle d'à côté du robot, se pilote comme un module, puis on revient au robot.
function deployerDrone() {
  const x = etat.explo;
  if (!x || x.fin) return;
  if (x.type !== 'robot' || !x.vol.droneEmbarque) return x.dire('Pas de drone ici : il arrive avec le robot, sur les astres qui ont de l’air.');
  if (x.droneParti) return x.dire('Le drone a déjà volé : sa mission est terminée.');
  x.droneParti = true;
  const a = x.astre;
  etat.retourRobot = { explo: x, vol: etat.vol };
  const vd = new Vol(a, fuseeDrone(a), { voyage: true, depuisSol: true, bases: x.vol.bases });
  vd.x = x.p.x + 2; vd.y = vd.sol(vd.x) + 0.01;
  vd.xDepart = x.xFusee;            // les repérages se placent comme pour le robot
  vd.droneSeul = true; vd.equipier = null;
  vd.messageExplo = { texte: '🚁 Drone prêt : mettez les gaz pour décoller. Volez bas (moins de 60 m) pour repérer. Échap : fin du vol, retour au robot.', vie: 9 };
  etat.vol = vd; etat.explo = null; etat.enVoyage = true; etat.warp = 1;
  touches.clear();
  montrer('vol');
}

// Drone : largué depuis l'orbite dans une petite capsule, il se pilote ensuite comme un module d'atterrissage.
function larguerDrone(id) {
  const v = etat.voyage, a = ASTRES_PAR_ID[id];
  if (!droneVolePossible(a)) return Orbiteur.log(`Impossible de faire voler un drone ${sur(a)} : il faut de l’air pour ses rotors.`);
  if (!(v.drones > 0)) return Orbiteur.log('Plus de drone à bord : l’atelier d’une station en fabrique.');
  v.drones--;
  etat.destination = id;
  lancer({ voyage: true, fusee: fuseeDrone(a), bases: basesSur(id), site: siteDescente(id) });
  etat.vol.droneSeul = true;
  etat.vol.equipier = null;   // pas d'équipage
  etat.vol.messageExplo = { texte: `🚁 Drone largué ${sur(a)} : pilotez-le comme un module (gaz, inclinaison, L pour le pilote auto). Volez bas pour repérer. Échap : fin de la mission.`, vie: 9 };
  Orbiteur.log(`🚁 Drone largué ${sur(a)} (portance des rotors : air à ${fmtNombre(conditions(a, 0).rho, 3)} kg/m³ au sol).`);
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
  // Chaque personne de la capsule est hélitreuillée à son tour, avec son apparence.
  const personnes = v.equipe ? survivants(v).map((m) => ({ nom: m.nom, profil: m.principal ? SPATIO : m.profil || PROFIL_DEFAUT }))
    : (v.equipagePerdu ? [] : [{ nom: nomSpatio(), profil: SPATIO }]);
  regRetour(v);
  const res = Orbiteur.rentrerSurTerre();
  sauver(etat);
  jouerScene(new RetourTerre({ equipage, echantillons: res.n, nom, personnes }), () => afficherRetourTerre(res, equipage, nom));
}
// Capsule sans équipage : depuis l'orbite terrestre, les échantillons rentrent seuls ; l'expédition continue.
function renvoyerEchantillons() {
  const v = etat.voyage;
  let n = 0;
  for (const id in v.echantillonsABord) {
    v.echantillonsRapportes[id] = (v.echantillonsRapportes[id] || 0) + v.echantillonsABord[id];
    n += v.echantillonsABord[id];
  }
  if (!n) return;
  const liste = Object.entries(v.echantillonsABord).map(([id, k]) => `${k} ${de(ASTRES_PAR_ID[id])}`).join(', ');
  v.echantillonsABord = {};
  Orbiteur.log(`Capsule sans équipage envoyée vers la Terre avec ${n} échantillon${n > 1 ? 's' : ''} (${liste}).`);
  sauver(etat);
  jouerScene(new RetourTerre({ equipage: false, echantillons: n, nom: '' }), () => {
    const h = $('res-titre');
    h.textContent = 'Échantillons rapportés sur Terre';
    h.className = 'succes';
    $('res-message').textContent = `Capsule vide : retour sans équipage, comme prévu. Un navire a hissé la capsule à bord avec sa grue. ${n} échantillon${n > 1 ? 's' : ''} rapporté${n > 1 ? 's' : ''} : ${liste}.`;
    $('res-stats').innerHTML = resumeCampagne(v).split(' · ').map((x) => `<dt>•</dt><dd style="text-align:left">${x}</dd>`).join('');
    etat.suiteResultat = 'nav';
    $('vers-hangar').textContent = 'Aller à l’orbiteur';
    $('rejouer').classList.add('cache');
    montrer('resultat');
  });
}

function afficherRetourTerre(res, equipage, nom = nomSpatio()) {
  const h = $('res-titre');
  h.textContent = equipage ? 'Retour sur Terre' : 'Retour sur Terre : capsule vide';
  h.className = equipage ? 'succes' : 'partiel';
  const ech = res.n ? `${res.n} échantillon${res.n > 1 ? 's' : ''} rapporté${res.n > 1 ? 's' : ''} : ${res.liste}.` : 'Pas d’échantillon cette fois.';
  // Qui n'est pas revenu, où et pourquoi (pertes notées pendant l'expédition).
  const pertes = textePertes(etat.voyage);
  $('res-message').textContent = equipage
    ? `La capsule a amerri sous ses parachutes et l’hélicoptère a hélitreuillé ${nom}.${pertes ? ` Manquent à l’appel : ${pertes}.` : ''} ${ech}`
    : `Capsule vide : ${pertes ? `${pertes}.` : 'l’équipage n’est pas revenu.'} Un navire a hissé la capsule à bord avec sa grue. ${ech}`;
  // Orbiteur vide envoyé vers le Soleil : il y fond, sans personne à bord (environ deux mois et demi de chute).
  if (etat.voyage.orbiteurVersSoleil) {
    etat.voyage.orbiteurVersSoleil = false;
    const texte = '☀️ Pendant ce temps, l’orbiteur vide file vers le Soleil. Dans environ deux mois et demi, il fondra en passant à moins de 15 millions de km du Soleil, sans personne à bord.';
    $('res-message').textContent += ' ' + texte;
    etat.voyage.journal.push({ t: etat.voyage.t, texte });
  }
  $('res-stats').innerHTML = resumeCampagne(etat.voyage).split(' · ').map((x) => `<dt>•</dt><dd style="text-align:left">${x}</dd>`).join('');
  etat.suiteResultat = 'accueil';
  $('vers-hangar').textContent = '← Accueil';
  $('rejouer').classList.add('cache');
  montrer('resultat');
  if (equipage) replique('bienvenue');
}

// Point de reprise : l'expédition telle qu'elle était dans sa dernière orbite, quand on a choisi une cible.
// Après un crash, on peut recommencer de là, ou acter la perte et continuer. Gardé à part de la sauvegarde.
const CLE_REPRISE = CLE_SAUVEGARDE + '-reprise';
function noterPointReprise(v) {
  try { localStorage.setItem(CLE_REPRISE, JSON.stringify({ expedition: v.expeditions, t: v.t, centre: v.orb.centre, voyage: v, registre: registre() })); } catch (e) { /* stockage plein : pas de reprise */ }
}
function lirePointReprise(v) {
  try {
    const p = JSON.parse(localStorage.getItem(CLE_REPRISE));
    return p && v && !v.orb && p.voyage && p.expedition === v.expeditions && ASTRES_PAR_ID[p.centre] ? p : null;
  } catch (e) { return null; }
}
function oublierPointReprise() { try { localStorage.removeItem(CLE_REPRISE); } catch (e) { /* ignoré */ } }
function textePointReprise(p) { return `${enOrbite(ASTRES_PAR_ID[p.centre])}, le ${fmtDate(p.t, false)}`; }
function reprendreAvantCrash(p) {
  const v = p.voyage;
  v.warp = 1;
  if (v.tempsReel && v.tempsReel.actif) Object.assign(v.tempsReel, { departJeu: v.t, departReel: Date.now(), vuLe: Date.now() });
  etat.voyage = v;
  if (p.registre) etat.registre = p.registre;   // l'équipage n'est pas mort, finalement
  etat.repriseCrash = null;
  Orbiteur.camPlacee = false;
  allerNavigation();
  Orbiteur.log(`Expédition reprise avant le crash : ${textePointReprise(p)}.`);
  sauver(etat);
}

function terminerExpedition(texte) {
  sauver(etat);
  const p = lirePointReprise(etat.voyage);
  const h = $('res-titre');
  h.textContent = 'Expédition perdue';
  h.className = 'echec';
  $('res-message').textContent = texte + (p ? ` Vous pouvez recommencer cette étape depuis la dernière orbite (${textePointReprise(p)}), avec le même équipage, ou acter la perte et poursuivre la campagne avec une nouvelle expédition.` : '');
  $('res-stats').innerHTML = '';
  etat.suiteResultat = 'accueil';
  etat.repriseCrash = p;
  $('vers-hangar').textContent = p ? '✝ Acter la perte et continuer' : '← Accueil';
  $('rejouer').textContent = p ? '↺ Recommencer avant le crash' : 'Rejouer';
  $('rejouer').classList.toggle('cache', !p);
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
let trajetAnnonce = false;   // « Trajet repris » : dit une fois, à la première ouverture après le chargement
function allerNavigation() {
  if (!etat.voyage) etat.voyage = Orbiteur.nouveauVoyage();
  if (etat.voyage.fin) return allerAccueil();      // campagne terminée (départ vers une autre étoile)
  choisirSystemeCampagne(etat.voyage);
  if (!etat.voyage.orb) {
    // Autre système : pas de centre de lancement ici, l'expédition perdue ne se remplace pas.
    if (!ressourcesIllimitees()) { alert(`Plus d’orbiteur dans le ${SYSTEME.nom} : il n’y a pas de centre de lancement ici. Reprenez depuis une station ou une base.`); return allerAccueil(); }
    // Pas d'expédition en cours : tout part de la Terre. D'abord l'équipage, puis le lanceur.
    return allerEquipage(etat.voyage);
  }
  Orbiteur.charger(etat.voyage);
  if (etat.reprendreAuto) { Orbiteur.auto = true; etat.reprendreAuto = false; }
  // Partie rechargée en plein trajet : le pilote auto reprend là où il en était.
  if (!trajetAnnonce && Orbiteur.auto && etat.voyage.cible && ASTRES_PAR_ID[etat.voyage.cible]) {
    Orbiteur.log(`🚀 Trajet repris : le pilote auto poursuit vers ${le(ASTRES_PAR_ID[etat.voyage.cible])}.`);
  }
  trajetAnnonce = true;
  Orbiteur.construireHud();
  if (!Orbiteur.camPlacee) { Orbiteur.centrerSur('orbiteur'); Orbiteur.camPlacee = true; }
  etat.pause = false;
  redim();
  montrer('nav');
  // Mission en temps réel : la simulation rattrape le temps écoulé depuis la dernière visite, puis le résume.
  Orbiteur.rattraperAbsence();
  // Un membre d'équipage vient de mourir : proposer de rappeler les autres sur Terre.
  if (etat.voyage.proposerRappel && !Infos.estOuverte()) Orbiteur.proposerRappel();
  // Plus personne à bord : l'orbiteur rentre seul (on l'annonce, puis le pilote auto le ramène).
  if (etat.voyage.retourAuto === 'a_annoncer' && !Infos.estOuverte()) Orbiteur.annoncerRetourAuto();
  if (etat.voyage.retourAuto === 'en_cours' && !Orbiteur.auto) Orbiteur.lancerRetourAuto();
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
  const pr = lirePointReprise(v);   // orbiteur écrasé, perte pas encore actée
  // Expédition en cours et nulle part ailleurs où reprendre : on y retourne directement.
  // Sans expédition (après un retour sur Terre), on montre toujours le choix, pas directement le pas de tir.
  if (v.orb && !pr && !v.stations.length && !basesOk.length) return allerNavigation();
  const choix = [];
  if (pr) choix.push(['crash', '↺ Recommencer avant le crash', `${textePointReprise(pr)}, même équipage, même chargement`]);
  if (v.orb) choix.push(['ici', `▶ Là où vous étiez`, `${enOrbite(ASTRES_PAR_ID[v.orb.centre])}`]);
  for (const s of v.stations) choix.push(['station:' + s.id, `🛰 ${s.nom}`, `${enOrbite(ASTRES_PAR_ID[s.centre])}, amarré à la station`]);
  for (const b of basesOk) choix.push(['base:' + v.bases.indexOf(b), `🏠 ${nomBase(ASTRES_PAR_ID[b.astre])}, niveau ${b.niveau || 1}`, `au sol, l’atterrisseur garé à côté ; l’orbiteur attend en orbite`]);
  if (!choix.length && !ressourcesIllimitees()) return allerNavigation();
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
  if (id === 'crash') { const p = lirePointReprise(v); return p ? reprendreAvantCrash(p) : allerNavigation(); }
  if (lirePointReprise(v)) oublierPointReprise();   // repartir d'ailleurs : la perte est actée
  if (id === 'terre') return v.orb ? allerLancement() : allerEquipage(v);   // nouvelle expédition : l'équipage d'abord
  Orbiteur.charger(v);
  Orbiteur.auto = false;   // repartir d'une station ou d'une base : le trajet en cours s'arrête
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
    v.amarre = st.id;
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
  Orbiteur.log(`Reprise à ${le(nomBase(a))} (niveau ${b.niveau || 1}) : l’atterrisseur est posé à côté.`);
  sauver(etat);
  etat.destination = a.id;
  lancer({ voyage: true, fusee: c.fusee, bases: basesSur(a.id), site: { x: b.x, xDescente: b.x - 90 }, depuisSol: true });
}

// Départ réaliste vers une autre étoile : la campagne s'arrête là, avec ses dates d'arrivée.
function terminerParDepart(info) {
  const v = etat.voyage;
  v.fin = info;
  replique('force');
  regVoyageEtoile(v, info.ans * 365.25 * 86400, 'route');   // registre : des siècles dans l'espace, s'il le faut
  Orbiteur.log(`Départ pour ${le(info.nomEtoile)} (${fmt(info.distanceAL, 2)} années-lumière) à ${fmt(info.vitesse, 1)} km/s : ${info.nomProfil.toLowerCase()}. Arrivée vers ${fmtAnnee(info.arriveeJeu)}.`);
  sauver(etat);
  const h = $('res-titre');
  h.textContent = `En route vers ${le(info.nomEtoile)}`;
  h.className = 'succes';
  $('res-message').textContent = `L’expédition a quitté le ${SYSTEME.nom} en ${info.anneeDepart}. À ${fmt(info.vitesse, 1)} km/s, les ${fmt(info.distanceAL, 2)} années-lumière prendront ${fmtDureeAnnees(info.ans)}. Fin de la partie.`;
  const vus = Object.keys(v.visites).filter((id) => astreVisite(v, id) && ASTRES_PAR_ID[id]).length;
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
  replique('force');
  regVoyageEtoile(v, (info.ansBord || info.ans) * 365.25 * 86400);   // registre : le temps vécu à bord
  Orbiteur.log(`Départ pour ${le(info.nomSysteme)} en ${TECHNOLOGIES[info.tech].nom.toLowerCase()} : ${fmtDureeAnnees(info.ans)} de voyage, installation prévue sur ${info.nomBase}.`);
  sauver(etat);
  jouerScene(new TransitInterstellaire(info), () => {
    const st = arriverDansSysteme(v, info);
    for (const m of v.equipe || []) m.tDepart = v.t;   // le voyage est déjà compté dans le registre
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
// Avant de quitter le système : proposer de télécharger la partie, pour pouvoir la recharger plus tard.
function proposerSauvegardeAvantDepart(suite) {
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>💾 Avant de quitter le ${SYSTEME.nom}</h2>
    <p>Téléchargez la partie : vous pourrez la recharger plus tard (accueil → « Charger une sauvegarde ») et reprendre d’ici, juste avant le départ.</p></div><button class="fermer">✕</button></header>
    <div class="actions"><button id="dep-annuler">Annuler</button><button id="dep-sans">Partir sans télécharger</button><button id="dep-telecharger" class="principal">⬇ Télécharger, puis partir</button></div></div>`;
  m.classList.remove('cache');
  const fermer = () => Infos.fermer();
  m.querySelector('.fermer').onclick = fermer;
  $('dep-annuler').onclick = fermer;
  $('dep-sans').onclick = () => { fermer(); suite(); };
  $('dep-telecharger').onclick = () => { exporterSauvegarde(etat); fermer(); suite(); };
}
Depart.contexte = { terminer: (info) => proposerSauvegardeAvantDepart(() => terminerParDepart(info)), partirSF: (info) => proposerSauvegardeAvantDepart(() => partirVersSysteme(info)), log: (t) => { Orbiteur.log(t); sauver(etat); } };

Orbiteur.contexte = {
  equipement: () => etat.equipement,
  masque: () => etat.masque,
  basculerMasque: () => { etat.masque = !etat.masque; sauver(etat); },
  estEnPause: () => etat.pause,
  basculerPause: () => { etat.pause = !etat.pause; },
  hangar: () => { sauver(etat); allerAccueil(); },
  descendre: (id) => descendre(id),
  larguerRobot: (id, blindage) => larguerRobot(id, blindage),
  larguerDrone: (id) => larguerDrone(id),
  rentrer: () => rentrerSurTerre(),
  renvoyerEchantillons: () => renvoyerEchantillons(),
  finExpedition: (texte) => terminerExpedition(texte),
  journal: () => {
    const m = $('modale');
    m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>Journal de bord</h2></div><button class="fermer">✕</button></header>
      ${htmlTrouvailles()}
      ${htmlJournal(etat.voyage)}</div>`;
    brancherTrouvailles(m);
    const marquerLues = brancherJournal(m, etat.voyage);
    m.classList.remove('cache');
    m.querySelector('.fermer').onclick = () => { marquerLues(); sauver(etat); Infos.fermer(); };
  },
  alerte: (texte) => { Orbiteur.messages.push({ texte, vie: 8 }); },
};

$('voyage-nouveau').onclick = () => {
  if (etat.voyage && !confirm('Recommencer une nouvelle campagne ? Les stations, bases et sondes actuelles seront perdues.')) return;
  cumulerProgression(etat.voyage);   // ce qu'elle a fait reste dans « Toutes campagnes »
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
  if (etat.repriseCrash) { etat.repriseCrash = null; oublierPointReprise(); }   // perte actée
  if (etat.suiteResultat === 'nav' && etat.voyage && etat.voyage.orb) allerNavigation();
  else if (etat.suiteResultat === 'visite') allerCarte();
  else allerAccueil();
};
$('rejouer').onclick = () => {
  if (etat.repriseCrash) return reprendreAvantCrash(etat.repriseCrash);
  return etat.vol && etat.vol.lancement ? lancerMegaFusee() : rejouerVisite();
};
$('accueil-campagne').onclick = () => $('voyage-nouveau').click();
$('accueil-reprendre').onclick = ouvrirReprise;
$('accueil-equipage').onclick = () => composerApresAccueil();
// Composer un équipage, c'est lancer une nouvelle expédition : un crash pas encore acté l'est alors
// (« Recommencer avant le crash » ne se propose que dans « Reprendre la campagne »).
function composerApresAccueil() {
  const v = etat.voyage;
  if (lirePointReprise(v)) oublierPointReprise();
  allerEquipage(v);
}
$('accueil-visite').onclick = allerCarte;
$('accueil-hangar').onclick = allerHangar;
// « Se promener » : la Terre, ou un objet du ciel lointain observé de loin (puis retour à la liste).
const CONTEXTE_PROMENADE = {
  terre: () => promenadeSurTerre(),
  observer: (o) => jouerScene(new Observation(o), () => { allerAccueil(); ouvrirPromenade(CONTEXTE_PROMENADE); }),
};
$('accueil-promenade').onclick = () => ouvrirPromenade(CONTEXTE_PROMENADE);
$('accueil-spatio').onclick = () => afficherCreationSpatio(allerAccueil);
$('accueil-registre').onclick = () => ouvrirRegistre();
$('accueil-aide').onclick = () => ouvrirAide();
document.querySelectorAll('.ouvrir-aide').forEach((b) => { b.onclick = () => ouvrirAide(); });
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
    if ((etat.ecran === 'vol' || etat.ecran === 'explo') && clicTemps(e.clientX, e.clientY)) return;   // boutons − / + du temps
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
  if ((etat.ecran === 'vol' || etat.ecran === 'explo') && t0 && clicTemps(t0.clientX, t0.clientY)) { e.preventDefault(); return; }
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
    if (e.code === 'KeyH') deployerDrone();
    if (e.code === 'KeyU') x.appelUrgence();
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
    const type = e.code === 'KeyE' ? 'spationaute' : 'robot';
    if (type === 'spationaute' && v.spatioPerdu) {
      const q = v.equipier || { nom: nomSpatio(), acc: acc() };
      return refus(`${majuscule(q.nom)} n’est pas revenu${q.acc || ''} de sa sortie : plus personne à bord ne peut sortir. Il reste le robot (R), ou le décollage (T).`);
    }
    // Dehors, c'est mortel (pression, chaleur, rayonnement) : on prévient, mais on laisse sortir.
    const dangers = dangersSortie(v, type);
    if (dangers.length && !confirm(`⚠ Sortie dangereuse ${sur(v.astre)} :\n\n• ${dangers.join('\n• ')}\n\nSortir quand même ?`)) return;
    etat.explo = new Exploration(v, type, etat.science);
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
  if (e.code === 'Escape') {
    // Campagne, posé : quitter laisse l'atterrisseur et l'équipage sur place, pour toujours. On demande d'abord.
    if (etat.enVoyage && v.droneSeul && !v.fin && !confirm(`Arrêter la mission du drone ? Il reste ${v.pose ? 'posé' : 'là où il est'} ${sur(v.astre)} : on ne le récupère pas.`)) return;
    if (etat.enVoyage && v.pose && !v.robotSeul && !v.droneSeul && !v.lancement && !v.fin
      && !confirm(`Laisser l’atterrisseur et ${(etat.vol.equipier || equipierDescente(null)).nom} ${sur(v.astre)} ? Ils ne reviendront pas.\n\nPour repartir, décollez plutôt (T).`)) return;
    v.abandonner();
  }
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
// Séparation d'un étage ou de la coiffe : 4 s à ×1 pour la voir (sinon l'étage traverse l'écran en un éclair).
const DUREE_RALENTI_SEPARATION = 4000;
function separationRecente(v) { return !!(v.tSeparation && performance.now() - v.tSeparation < DUREE_RALENTI_SEPARATION); }
function warpEffectif(v) {
  if (separationRecente(v)) return 1;
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
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>⚠ Le jeu a rencontré une erreur</h2><p><i>Pas de panique.</i></p>
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
      // Une séparation pendant cette image : on s'arrête là (la suite repart à ×1).
      const tSep = v.tSeparation;
      for (let i = 0; i < n && !v.fin && v.tSeparation === tSep; i++) v.step(total / n, cmd);
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
      // Le module n'emporte qu'un spationaute : mort dehors, plus personne ne peut ressortir.
      if (x.fin.issue === 'perdu' && x.type === 'spationaute' && !x.terre) etat.vol.spatioPerdu = true;
      // Campagne : l'équipage perdu ne reviendra pas (la capsule rentrera vide).
      if (x.fin.issue === 'perdu' && x.type === 'spationaute' && !x.terre && etat.enVoyage && etat.voyage) {
        perdrePilote(etat.voyage, etat.vol.astre.id, causeSortie(x.fin.texte), etat.vol.equipier);
      }
      if (etat.voyage && etat.enVoyage) etat.voyage.journal.push({ t: etat.voyage.t, texte: `${etat.vol.astre.nom} : ${x.fin.texte}` });
      if (x.type === 'spationaute' && !x.terre && etat.enVoyage && etat.voyage) {
        regVisite(piloteDuVol(etat.voyage), etat.vol.astre.id, x.recoltes || 0, 'sortie');
        regDureeSortie(piloteDuVol(etat.voyage), x.dureeSortie || 0, etat.vol.astre.id);
      }
      etat.explo = null;
      touches.clear();
      sauver(etat);
      if (etat.vol.promenade) allerAccueil();                // fin de la promenade sur Terre
      else if (etat.vol.robotSeul) allerNavigation();        // le robot reste sur place, on revient à l'orbiteur
      else if (x.fin.issue === 'secouru') finSecours();             // le module de secours a ramené le spationaute
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
