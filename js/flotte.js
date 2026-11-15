'use strict';
// Missions en parallèle : plusieurs systèmes stellaires et plusieurs expéditions dans une même campagne.
// etat.voyage (v) reste ce qu'on voit à l'écran : un système et, au plus, une expédition en cours.
// Les autres sont rangés à part : v.mondes[idSysteme] (stations, bases, cargos…) et v.flotte (expéditions).
// Le temps est commun (temps terrestre de référence, v.t) : rien ne vieillit à part.

// Ce qui appartient à un système stellaire (reste sur place quand on le quitte).
const CHAMPS_SYSTEME = ['planeteBase', 'stations', 'bases', 'sondesEnVol', 'cargos', 'robotsAuto', 'conteneurs', 'sites', 'visites',
  'echantillonsRapportes', 'orbiteurGare', 'deranges', 'chutesObjets', 'orbitesObjets', 'objetsPerdus', 'alertesResidents', 'penuries',
  'tResidents', 'dernierRavito', 'retoursEchantillons'];
// Ce qui appartient à une expédition (le vaisseau, son équipe et son chargement).
const CHAMPS_EXPEDITION = ['orb', 'equipe', 'nomVaisseau', 'carburant', 'ergolsAtt', 'sondes', 'kits', 'kitsBase', 'robots', 'drones',
  'atterrisseurs', 'echantillonsABord', 'cible', 'manette', 'mode', 'orientation', 'vivres', 'eau', 'tVivres', 'dechets', 'tDechets',
  'amarre', 'aIss', 'rdvStation', 'equipagePerdu', 'traumatise', 'proposerRappel', 'retourAuto', 'sansEquipage', 'commandeSol',
  'pertesEquipage', 'propulseurs', 'prevision', 'voyageFinal', 'propulsionSolaire', 'vidange', 'observation', 'usureBatterieRover',
  'degatsRover', 'alertesVivres', 'orbiteurVersSoleil', 'autopilote', 'idExpedition', 'numero', 'pilotageAbsence', 'manoeuvreAbsence'];

// Valeurs d'un système vide, et d'un écran sans expédition.
function systemeVide() {
  return { stations: [], bases: [], sondesEnVol: [], cargos: [], robotsAuto: [], conteneurs: [], sites: {}, visites: {}, echantillonsRapportes: {} };
}
function sansExpedition() {
  return { orb: null, equipe: null, carburant: 0, ergolsAtt: 0, sondes: 0, kits: 0, kitsBase: 0, robots: 0, drones: 0, atterrisseurs: 0,
    echantillonsABord: {}, cible: null, manette: 0, mode: 'assistant', orientation: 'prograde' };
}

// Copie profonde (les sauvegardes sont du JSON : pas de fonctions à garder).
function copieJSON(x) { return x === undefined ? undefined : JSON.parse(JSON.stringify(x)); }

// Une expédition a-t-elle lieu à l'écran ?
// (Des équipiers restés seuls à une base ou une station ne font pas une expédition : ils restent avec leur système.)
function expeditionActive(v) { return !!(v.orb || (v.equipe && v.equipe.some((m) => ['bord', 'mission', 'transit'].includes(m.etat)))); }

// Range l'expédition affichée dans la flotte ; l'écran reste sans expédition. Renvoie l'expédition rangée (ou null).
function rangerExpedition(v) {
  if (!expeditionActive(v)) return null;
  if (!v.idExpedition) v.idExpedition = 'x' + Date.now().toString(36) + Math.floor(Math.random() * 1e4);
  if (!v.numero) v.numero = v.expeditions || 1;
  const x = { systeme: v.systeme, tRange: v.t };
  for (const c of CHAMPS_EXPEDITION) if (v[c] !== undefined) x[c] = copieJSON(v[c]);
  if (x.orb) delete x.orb.etape;
  v.flotte = (v.flotte || []).filter((e) => e.idExpedition !== x.idExpedition);
  v.flotte.push(x);
  for (const c of CHAMPS_EXPEDITION) delete v[c];
  Object.assign(v, sansExpedition());
  if (v.equipeSurPlace) { v.equipe = v.equipeSurPlace; delete v.equipeSurPlace; }   // les équipiers du système reviennent à l'écran
  oublierEtapeOrbiteur();
  return x;
}

// Reprend une expédition rangée (dans le système affiché : sinon, on y passe d'abord).
function reprendreExpedition(v, id) {
  const x = (v.flotte || []).find((e) => e.idExpedition === id);
  if (!x) return false;
  if (x.systeme !== v.systeme) changerSysteme(v, x.systeme);
  rangerExpedition(v);
  restaurerExpedition(v, x);
  return true;
}
// Remet à l'écran une expédition rangée du système affiché.
function restaurerExpedition(v, x) {
  v.flotte = v.flotte.filter((e) => e !== x);
  if (v.equipe && v.equipe.length) v.equipeSurPlace = v.equipe;   // équipiers restés aux bases et stations : mis de côté
  for (const c of CHAMPS_EXPEDITION) delete v[c];
  for (const c of CHAMPS_EXPEDITION) if (x[c] !== undefined) v[c] = x[c];
  if (v.rattrapageDepuis) {
    // Le système vient d'être retrouvé : l'expédition sera rattrapée avec lui (executerRattrapage).
    if (x.tRange < v.rattrapageDepuis) { const t = v.t; v.t = v.rattrapageDepuis; rattraperOrbiteur(v, x.tRange); v.t = t; }
  } else rattraperOrbiteur(v, x.tRange);
  oublierEtapeOrbiteur();
}

// Range le système affiché dans v.mondes et affiche un autre système (vide s'il n'a jamais été visité).
// L'expédition affichée est rangée avec : elle reste dans son système.
function changerSysteme(v, id) {
  if (id === v.systeme) return;
  const xr = rangerExpedition(v);
  const m = {};
  m.expeditionAffichee = xr ? xr.idExpedition : null;   // elle reviendra à l'écran avec son système
  for (const c of CHAMPS_SYSTEME) if (v[c] !== undefined) m[c] = copieJSON(v[c]);
  for (const s of [...(m.sondesEnVol || []), ...(m.cargos || [])]) delete s.etape;
  if (v.equipe && v.equipe.length) m.equipeSurPlace = copieJSON(v.equipe);   // équipiers restés aux bases et stations
  m.tRange = v.t;   // à partir d'ici, le système attend notre retour (executerRattrapage)
  v.mondes = v.mondes || {};
  v.mondes[v.systeme] = m;
  for (const c of CHAMPS_SYSTEME) delete v[c];
  const w = v.mondes[id] || {};
  Object.assign(v, systemeVide(), w);
  v.equipe = w.equipeSurPlace || null;
  delete v.equipeSurPlace;
  if (w.tRange < v.t) v.rattrapageDepuis = Math.min(v.rattrapageDepuis || Infinity, w.tRange);
  delete v.tRange;
  delete v.expeditionAffichee;
  delete v.mondes[id];
  v.systeme = id;
  choisirSystemeCampagne(v);
  const xa = w.expeditionAffichee && (v.flotte || []).find((e) => e.idExpedition === w.expeditionAffichee && e.systeme === id && !e.transit);
  if (xa) restaurerExpedition(v, xa);
}

// Toutes les expéditions de la campagne, affichée comprise : { id, systeme, nom, numero, active }.
function listeExpeditions(v) {
  const l = (v.flotte || []).map((x) => ({ id: x.idExpedition, systeme: x.systeme, nom: x.nomVaisseau, numero: x.numero, active: false }));
  if (expeditionActive(v)) l.unshift({ id: v.idExpedition || null, systeme: v.systeme, nom: v.nomVaisseau, numero: v.numero || v.expeditions, active: true });
  return l;
}
// Les systèmes où la campagne a quelque chose (affiché compris).
function listeSystemes(v) { return [...new Set([v.systeme, ...Object.keys(v.mondes || {}), ...(v.flotte || []).map((x) => x.systeme)])]; }

// ---------- Départ vers une autre étoile ----------
// L'expédition affichée part (orbiteur, équipage à bord, chargement de la grande station) ; le système reste.
// Les équipiers restés aux bases et aux stations ne partent pas. Renvoie l'expédition en route.
function partirVersEtoile(v, info) {
  const st = stationDeDepart(v), chargement = st ? { ...st.stock } : {};
  if (st) st.stock = STOCK_VIDE();   // tout le chargement de la grande station part avec le vaisseau
  const equipe = v.equipe || [];
  const partants = equipe.filter((m) => ['bord', 'mission', 'transit'].includes(m.etat));
  const restants = equipe.filter((m) => !partants.includes(m));
  for (const m of partants) { m.etat = 'bord'; delete m.mission; }
  const ech = Object.values(v.echantillonsRapportes || {}).reduce((s, x) => s + x, 0);
  (v.historique = v.historique || []).push({ systeme: v.systeme || 'solaire', nom: SYSTEME.nom, quitte: info.tDepart, stations: v.stations.length, bases: v.bases.length, echantillons: ech, vers: info.systeme });
  v.equipe = partants;
  v.amarre = null; v.aIss = false; v.rdvStation = null; v.cible = null;
  if (!v.orb) v.orb = { centre: planeteOrigine().id, r: [1, 0], v: [0, 0], transfert: null };   // (rangerExpedition veut une expédition)
  const x = rangerExpedition(v);
  x.systeme = info.systeme;
  x.orb = null;
  x.transit = { ...info, chargement };
  if (restants.length) v.equipe = restants;
  if (typeof lirePointReprise === 'function' && lirePointReprise(v)) oublierPointReprise();   // l'expédition est partie : plus de « avant le crash »
  return x;
}

// Arrivée d'une expédition en route : on passe dans son système, la date avance jusqu'à l'arrivée si besoin,
// puis la station est déployée (interstellaire.js). Renvoie la station.
function arriverExpedition(v, id) {
  const x = (v.flotte || []).find((e) => e.idExpedition === id);
  const info = x.transit;
  changerSysteme(v, x.systeme);
  v.t = Math.max(v.t, info.tArrivee);
  return v;
}
// Seconde moitié de l'arrivée, après le rattrapage du système d'arrivée.
function finirArrivee(v, id) {
  const x = (v.flotte || []).find((e) => e.idExpedition === id);
  reprendreExpedition(v, id);
  return arriverDansSysteme(v, x.transit);
}

// ---------- Laisser une expédition : prochaine manœuvre et pilotage en son absence ----------
// Prochaine manœuvre de l'expédition affichée : { t, texte }, ou null (orbite stable, rien à faire).
function prochaineManoeuvre(v) {
  const o = v.orb;
  if (!o) return null;
  if (v.cible && v.cible !== o.centre || o.transfert) {
    const e = prochaineEtape(copieJSON(o), v.t, v.cible || (o.transfert && o.transfert.cible));
    if (e && e.type !== 'fini' && e.type !== 'impossible') return { t: Math.max(v.t, e.tExec || v.t), texte: e.texte };
  }
  const a = ASTRES_PAR_ID[o.centre], el = a && elements(o.r, o.v, a.gm);
  if (el && (el.e >= 1 || el.rp < a.rayonKm)) return { t: v.t, texte: el.rp < a.rayonKm ? 'Corriger la trajectoire : elle coupe la surface' : 'Freiner : le vaisseau s’échappe' };
  return null;
}
// Avant de quitter l'expédition affichée : dire quand aura lieu la prochaine manœuvre, et qui pilote en attendant.
// Par défaut, le pilote automatique ; en manuel, il faut revenir à temps (sinon, la manœuvre n'est pas faite).
function confirmerAbsence(v, suite) {
  if (!v.orb) return suite();
  const p = prochaineManoeuvre(v);
  const quand = p ? `${p.texte}, le ${fmtDate(p.t, false)}${p.t > v.t ? ` (dans ${fmtDuree(p.t - v.t)})` : ' (maintenant)'}` : 'aucune : l’orbite est stable';
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🛰 Laisser le vaisseau ${v.nomVaisseau || ''}</h2>
    <p>Le temps continue de passer pour lui pendant que vous jouez ailleurs.</p></div><button class="fermer">✕</button></header>
    <section><p><b>Prochaine manœuvre :</b> ${quand}.</p>
    <label class="choix-ravito"><input type="radio" name="absence" value="auto" checked> <b>Pilotage automatique</b> (par défaut)<br><span class="doux">Le pilote auto fait les manœuvres à votre place.</span></label>
    <label class="choix-ravito"><input type="radio" name="absence" value="manuel"> <b>Pilotage manuel, à vos risques et périls</b><br><span class="doux">Revenez avant ${p ? `le ${fmtDate(p.t, false)}` : 'la prochaine manœuvre'} : à temps, tout va bien ; sinon, elle ne sera pas faite… et tant pis pour la trajectoire.</span></label></section>
    <div class="actions"><button id="abs-annuler">Annuler</button><button id="abs-ok" class="principal">Laisser le vaisseau</button></div></div>`;
  m.classList.remove('cache');
  const fermer = () => Infos.fermer();
  m.querySelector('.fermer').onclick = fermer;
  $('abs-annuler').onclick = fermer;
  $('abs-ok').onclick = () => {
    v.pilotageAbsence = m.querySelector('input[name=absence]:checked').value;
    v.manoeuvreAbsence = p;
    fermer();
    suite();
  };
}
// Au retour : en manuel, la manœuvre a-t-elle été manquée ?
function bilanAbsence(v, log) {
  const p = v.manoeuvreAbsence;
  if (v.pilotageAbsence === 'manuel' && p && v.t > p.t + 60) log(`Oups : la manœuvre « ${p.texte} » était prévue le ${fmtDate(p.t, false)}. Personne ne l’a faite.`);
  v.pilotageAbsence = null; v.manoeuvreAbsence = null;
}

// Prendre la main sur une expédition rangée (choix « Reprendre » de l'accueil).
function prendreExpedition(id) {
  const v = etat.voyage;
  const x = (v.flotte || []).find((e) => e.idExpedition === id);
  if (!x) return allerAccueil();
  if (x.transit) return suivreVoyage(id);
  reprendreExpedition(v, id);
  executerRattrapage(v, () => {
    if (v.pilotageAbsence) bilanAbsence(v, (t) => Orbiteur.log(t));   // même système : pas de rattrapage, mais le « Oups » éventuel
    Orbiteur.charger(v);
    Orbiteur.camPlacee = false;
    sauver(etat);
    if (v.orb) allerNavigation(); else allerAccueil();
  });
}

// Nom d'un système, et d'un astre d'un autre système que celui affiché.
function nomSystemeDe(id) { return (SYSTEMES[id] && SYSTEMES[id].nom) || id; }
function astreDe(sys, id) { return sys === SYSTEME.id ? ASTRES_PAR_ID[id] : ((SYSTEMES[sys] && SYSTEMES[sys].astres) || []).find((a) => a.id === id); }

// Choix de la fenêtre « Reprendre » : les expéditions rangées, puis les autres systèmes. [id, titre, détail]
function choixFlotte(v) {
  const l = [];
  for (const x of v.flotte || []) {
    const titre = `${x.transit ? '🚀' : '🛰'} ${x.nomVaisseau ? `Vaisseau ${x.nomVaisseau}` : 'Expédition'}${x.numero ? ` (expédition n° ${x.numero})` : ''}`;
    let detail;
    if (x.transit) {
      const i = x.transit;
      detail = v.t >= i.tArrivee ? `arrivé dans le ${nomSystemeDe(i.systeme)} : prendre la main`
        : `en route vers le ${nomSystemeDe(i.systeme)}, arrivée vers ${fmtAnnee(i.anneeDepart + i.ans)} (suivre le voyage : la date avance jusque-là)`;
    } else {
      const a = x.orb && astreDe(x.systeme, x.orb.centre);
      detail = `${x.systeme !== v.systeme ? `dans le ${nomSystemeDe(x.systeme)}, ` : ''}${a ? enOrbite(a) : 'en orbite'}`;
      const p = x.manoeuvreAbsence;
      if (p) detail += ` · prochaine manœuvre le ${fmtDate(p.t, false)}, pilotage ${x.pilotageAbsence === 'manuel' ? 'manuel' : 'auto'}${x.pilotageAbsence === 'manuel' && v.t > p.t ? ' ⚠ trop tard !' : ''}`;
    }
    l.push(['exp:' + x.idExpedition, titre, detail]);
  }
  const autres = [...new Set(['solaire', ...Object.keys(v.mondes || {})])].filter((s) => s !== v.systeme && SYSTEMES[s]);
  for (const s of autres) {
    const w = (v.mondes || {})[s] || {};
    const n = (w.stations || []).length, b = (w.bases || []).length;
    l.push(['sys:' + s, `🌌 Aller dans le ${nomSystemeDe(s)}`,
      n || b ? `${nombre(n, 'station')}, ${nombre(b, 'base')}` : (s === 'solaire' ? 'centre de lancement : nouvelle expédition depuis la Terre' : 'rien encore')]);
  }
  return l;
}

// ---------- Rattrapage : le temps passé loin d'un système ----------
// Le temps est commun : en revenant dans un système (et à son expédition), on rejoue le temps écoulé depuis
// qu'on l'a quitté, comme si on y était resté en accéléré. Pilote auto : les manœuvres sont faites ;
// en manuel, elles attendent (et la trajectoire suit son cours). Vivres, bases, cargos et coûts suivent.
// Au-delà de quelques secondes de calcul, la fin est simplifiée (orbites seules, puis un seul bilan).
// suite() est appelée après, ou après la fenêtre « Pendant votre absence » s'il s'est passé quelque chose.
function executerRattrapage(v, suite) {
  const t0 = v.rattrapageDepuis;
  delete v.rattrapageDepuis;
  const cible = v.t;
  if (!(t0 < cible - 1)) return suite();
  const O = Orbiteur, ctx = O.contexte, f = financesDe(v), tF = f.t;
  const debut = v.journal.length, nom = v.nomVaisseau;
  let perte = null;
  O.charger(v);
  O.contexte = { ...ctx, finExpedition: (t) => { perte = t; } };   // une perte ne quitte pas l'écran : on la raconte après
  O.auto = !!(v.orb && v.cible && v.pilotageAbsence !== 'manuel');
  O.avance = false;
  const warp = v.warp;
  v.t = t0;
  f.t = Math.min(f.t, t0);   // les coûts du système retrouvé courent pendant l'absence
  const tCalc = performance.now();
  let simplifie = false;
  try {
    while (v.t < cible - 1e-3) {
      if (performance.now() - tCalc > 4000) { simplifie = true; break; }
      const reste = cible - v.t, tAvant = v.t;
      if (v.orb) {
        O.avancer(Math.min(reste, Math.max(600, Math.min(86400, reste / 50))), false);
        if (v.t <= tAvant) v.t = Math.min(cible, tAvant + 60);   // garde-fou : le temps avance toujours
      } else {
        const h = Math.min(reste, Math.max(3600, Math.min(10 * 86400, reste / 50)));
        v.t += h;
        majFinances(v);
        O.mettreAJourSondes(h);
        O.mettreAJourLogistique();
      }
    }
    if (simplifie) {
      const t = v.t;
      v.t = cible;
      rattraperOrbiteur(v, t);
      majFinances(v);
      O.mettreAJourLogistique();
    }
  } finally {
    v.t = Math.max(v.t, cible);
    f.t = Math.max(tF, v.t);
    O.contexte = ctx;
    O.auto = false; O.avance = false; O.etape = null;
    v.warp = warp;
  }
  if (v.orb) bilanAbsence(v, (t) => O.log(t));
  const nouveautes = v.journal.slice(debut);
  if (!nouveautes.length && !perte && !simplifie) return suite();
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>⏱ Pendant votre absence</h2>
    <p>Dans le ${SYSTEME.nom}${nom ? `, avec le vaisseau ${nom}` : ''} : ${fmtDuree(cible - t0)} écoulés. Nous sommes le ${fmtDate(v.t, false)}.</p></div><button class="fermer">✕</button></header>
    ${perte ? `<p class="objectif">${perte}</p>` : ''}
    ${simplifie ? '<p class="doux">Absence très longue : la fin a été calculée plus simplement (orbites, puis un seul bilan).</p>' : ''}
    ${nouveautes.length ? `<ul class="journal">${nouveautes.slice(-15).map((j) => `<li><b>${fmtDate(j.t, false)}</b> · ${j.texte}</li>`).join('')}</ul>` : '<p class="doux">Rien de notable.</p>'}
    <div class="actions"><span></span><button class="principal fermer2">Continuer</button></div></div>`;
  m.classList.remove('cache');
  const fin = () => { Infos.fermer(); suite(); };
  m.querySelector('.fermer').onclick = fin;
  m.querySelector('.fermer2').onclick = fin;
}

// L'orbiteur rangé n'a pas bougé : on le replace là où il est à la date du jour.
function rattraperOrbiteur(v, t0) {
  const o = v.orb, dt = v.t - t0;
  if (!o || !(dt > 0)) return;
  const st = v.amarre && (v.stations || []).find((s) => s.id === v.amarre);
  if (st) { const e = propager(st.r, st.v, v.t - st.t0, ASTRES_PAR_ID[st.centre].gm); o.centre = st.centre; o.r = e.r; o.v = e.v; return; }
  const a = ASTRES_PAR_ID[o.centre];
  if (!a) return;
  const el = elements(o.r, o.v, a.gm);
  if (!o.transfert && el.e < 1 && el.ra < (a.soi || Infinity)) { const p = propager(o.r, o.v, dt, a.gm); o.r = p.r; o.v = p.v; return; }
  // En route : on avance par morceaux (au plus quelques centaines).
  let t = t0;
  for (let k = 0; k < 300 && t < v.t; k++) {
    const ev = [];
    avancerVaisseau(o, t, v.t - t, ev);
    t = ev.tFin || v.t;
  }
}

// L'orbiteur (écran de navigation) garde une étape calculée pour l'expédition affichée : on l'oublie.
function oublierEtapeOrbiteur() {
  if (typeof Orbiteur === 'undefined') return;
  Orbiteur.etape = null; Orbiteur.auto = false; Orbiteur.avance = false;
}

// Sauvegardes d'avant les missions en parallèle : rien de rangé.
function migrerFlotte(m) {
  m.mondes = m.mondes || {};
  m.flotte = m.flotte || [];
  for (const x of m.flotte) if (x.orb) delete x.orb.etape;
  for (const w of Object.values(m.mondes)) for (const s of [...(w.sondesEnVol || []), ...(w.cargos || [])]) delete s.etape;
  if (expeditionActive(m) && !m.numero) m.numero = m.expeditions || 1;
  return m;
}
