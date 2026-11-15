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
  'degatsRover', 'alertesVivres', 'orbiteurVersSoleil', 'autopilote', 'idExpedition', 'numero', 'pilotageAbsence', 'manoeuvreAbsence', 'spatio', 'idJoueur'];

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
  if (!v.idJoueur) { v.idJoueur = ID_JOUEUR; v.spatio = SPATIO; }   // son spationaute joué part avec elle
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
  incarner(v);
  if (v.rattrapageDepuis) {
    // Le système vient d'être retrouvé : l'expédition sera rattrapée avec lui (executerRattrapage).
    if (x.tRange < v.rattrapageDepuis) { const t = v.t; v.t = v.rattrapageDepuis; rattraperOrbiteur(v, x.tRange); v.t = t; }
  } else if (x.tRange < v.t) absenceVaisseau = rattraperVaisseauSeul(v, x.tRange);
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
  absenceVaisseau = null;
  reprendreExpedition(v, id);
  const fin = () => {
    Orbiteur.charger(v);
    Orbiteur.camPlacee = false;
    sauver(etat);
    if (v.orb) allerNavigation(); else allerAccueil();
  };
  const a = absenceVaisseau;
  absenceVaisseau = null;
  if (a) return montrerAbsence(v, `Vaisseau ${x.nomVaisseau || ''}`, v.t - a.t0, a.nouveautes, a.perte, false, fin);
  executerRattrapage(v, fin);
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
      const dl = delaiLumiere(v.systeme, i.systeme);
      detail = v.t >= i.tArrivee ? `arrivé dans le ${nomSystemeDe(i.systeme)} vers ${fmtAnnee(i.anneeDepart + i.ans)}${v.t < i.tArrivee + dl ? ` (la nouvelle arrivera ici vers ${fmtAnnee(anneeDuJeu(i.tArrivee + dl))})` : ''} : prendre la main`
        : `en route vers le ${nomSystemeDe(i.systeme)}, arrivée vers ${fmtAnnee(i.anneeDepart + i.ans)} (suivre le voyage : la date avance jusque-là)`;
    } else {
      const a = x.orb && astreDe(x.systeme, x.orb.centre);
      if (x.systeme !== v.systeme && delaiLumiere(v.systeme, x.systeme) > 0) {
        const w = (v.mondes || {})[x.systeme];
        l.push(['exp:' + x.idExpedition, titre, `dans le ${nomSystemeDe(x.systeme)} · dernières nouvelles : ${fmtDate((w && w.tRange) || x.tRange, false)} (${fmtDureeAnnees(delaiLumiere(v.systeme, x.systeme) / ANNEE_S)} de trajet pour la lumière)`]);
        continue;
      }
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
      (n || b ? `${nombre(n, 'station')}, ${nombre(b, 'base')}` : (s === 'solaire' ? 'centre de lancement : nouvelle expédition depuis la Terre' : 'rien encore'))
      + (w.tRange && delaiLumiere(v.systeme, s) > 0 ? ` · dernières nouvelles : ${fmtDate(w.tRange, false)}` : '')]);
  }
  return l;
}

// ---------- Rattrapage : le temps passé loin d'un système ----------
// Le temps est commun : en revenant dans un système (et à son expédition), on rejoue le temps écoulé depuis
// qu'on l'a quitté, comme si on y était resté en accéléré. Pilote auto : les manœuvres sont faites ;
// en manuel, elles attendent (et la trajectoire suit son cours). Vivres, bases, cargos et coûts suivent.
// Au-delà de quelques secondes de calcul, la fin est simplifiée (orbites seules, puis un seul bilan).
// suite() est appelée après, ou après la fenêtre « Pendant votre absence » s'il s'est passé quelque chose.
function executerRattrapage(v, suite, silencieux = false) {
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
      if (v.orb && (O.auto || !orbiteTranquille(v))) {
        // En route vers une cible : pas d'une journée (manœuvres à l'heure).
        O.avancer(Math.min(reste, Math.max(600, Math.min((O.auto ? 1 : 10) * 86400, reste / 50))), false);
        if (v.t <= tAvant) v.t = Math.min(cible, tAvant + 60);   // garde-fou : le temps avance toujours
      } else {
        // Sans orbiteur, ou en orbite stable sans consigne : l'orbite se calcule d'un coup, par pas de dix jours.
        const h = Math.min(reste, Math.max(3600, Math.min(10 * 86400, reste / 50)));
        v.t += h;
        if (v.orb) rattraperOrbiteur(v, v.t - h);
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
  if (v.orb && !silencieux) bilanAbsence(v, (t) => O.log(t));   // (nouvelles lointaines : le choix de pilotage reste)
  const nouveautes = v.journal.slice(debut);
  if (silencieux) return suite(nouveautes);
  montrerAbsence(v, `Dans le ${SYSTEME.nom}${nom ? `, avec le vaisseau ${nom}` : ''}`, cible - t0, nouveautes, perte, simplifie, suite);
}
function montrerAbsence(v, ou, duree, nouveautes, perte, simplifie, suite) {
  if (!nouveautes.length && !perte && !simplifie) return suite();
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>⏱ Pendant votre absence</h2>
    <p>${ou} : ${fmtDuree(duree)} écoulés. Nous sommes le ${fmtDate(v.t, false)}.</p></div><button class="fermer">✕</button></header>
    ${perte ? `<p class="objectif">${perte}</p>` : ''}
    ${simplifie ? '<p class="doux">Absence très longue : la fin a été calculée plus simplement (orbites, puis un seul bilan).</p>' : ''}
    ${nouveautes.length ? `<ul class="journal">${nouveautes.slice(-15).map((j) => `<li><b>${fmtDate(j.t, false)}</b> · ${j.texte}</li>`).join('')}</ul>` : '<p class="doux">Rien de notable.</p>'}
    <div class="actions"><span></span><button class="principal fermer2">Continuer</button></div></div>`;
  m.classList.remove('cache');
  const fin = () => { Infos.fermer(); suite(); };
  m.querySelector('.fermer').onclick = fin;
  m.querySelector('.fermer2').onclick = fin;
}

// Vaisseau repris dans le système affiché (qui, lui, a vécu sans lui) : seul le vaisseau rattrape son temps.
// Pilote auto : on enchaîne les étapes du trajet (prochaineEtape) ; manuel : la trajectoire suit son cours.
// Ses vivres sont décomptés. Renvoie { t0, nouveautes, perte } pour la fenêtre « Pendant votre absence ».
let absenceVaisseau = null;
function rattraperVaisseauSeul(v, t0) {
  const o = v.orb, cible = v.t, debut = v.journal.length, nom = v.nomVaisseau;
  const log = (t, texte) => { v.journal.push({ t, texte: `${nom ? `${nom} · ` : ''}${texte}` }); if (v.journal.length > 200) v.journal.shift(); };
  let perte = null;
  if (o) {
    const auto = v.pilotageAbsence !== 'manuel' && !!v.cible;
    let t = t0;
    // Avance sans poussée jusqu'à t2 ; s'arrête au changement de sphère d'influence (le trajet se recalcule).
    const balistique = (t2) => {
      for (let k = 0; k < 400 && t < t2 - 1e-3; k++) {
        const ev = [];
        const res = avancerVaisseau(o, t, t2 - t, ev, true);
        t = res === 'changement' ? ev[ev.length - 1].t : ev.tFin || t2;
        if (res === 'impact') return 'impact';
        if (res === 'changement') return 'changement';
      }
      t = Math.max(t, t2);
      return 'ok';
    };
    if (v.amarre && !auto) rattraperOrbiteur(v, t0);   // amarré, sans consigne : il reste à la station
    else {
      v.amarre = null;
      for (let n = 0; n < 200 && t < cible - 1e-3; n++) {
        let res;
        const e = auto ? prochaineEtape(o, t, v.cible) : null;
        if (!e || e.type === 'fini' || e.type === 'impossible') res = balistique(cible);
        else if (e.attenteEvenement || !e.dv || e.tExec > t + 1) res = balistique(Math.min(cible, Math.max(e.tExec, t + 60)));
        else {
          const reservoir = { kg: v.carburant };
          if (!appliquerImpulsion(o, e.dv(o, t), reservoir)) { log(t, `Carburant insuffisant pour « ${e.texte} ». Le vaisseau poursuit sur sa lancée.`); res = balistique(cible); }
          else { v.carburant = reservoir.kg; log(t, `${e.texte} (pilote auto).`); continue; }
        }
        if (res === 'impact') {
          const a = ASTRES_PAR_ID[o.centre];
          regExpeditionPerdue(v, 'orbiteur écrasé', o.centre);
          perte = `Le vaisseau ${nom || ''} s’est écrasé ${sur(a)} le ${fmtDate(t, false)}. L’expédition est perdue.`;
          log(t, perte);
          v.orb = null; v.echantillonsABord = {};
          break;
        }
        if (e && e.type === 'fini') break;
      }
      if (v.orb && t < cible) { const tt = v.t; v.t = cible; rattraperOrbiteur(v, t); v.t = tt; }
      if (v.orb && auto && v.orb.centre === v.cible && prochaineEtape(copieJSON(v.orb), cible, v.cible).type === 'fini') log(cible, `Arrivé ${enOrbite(ASTRES_PAR_ID[v.cible])}.`);
    }
  }
  // Vivres et eau du vaisseau (sans recompter l'eau des bases, qui a vécu de son côté).
  const bases = v.bases;
  v.bases = [];
  try { mettreAJourVivres(v, (texte) => log(cible, texte)); } finally { v.bases = bases; }
  bilanAbsence(v, (texte) => log(cible, texte));
  return { t0, nouveautes: v.journal.slice(debut), perte };
}

// ---------- Nouvelles en retard (délai de la lumière) ----------
// D'un système à l'autre, les nouvelles voyagent à la vitesse de la lumière : d'ici, on connaît un système lointain
// tel qu'il était il y a « distance en années-lumière » ans. Quand on ouvre « Reprendre », chaque système lointain
// avance jusqu'à cette date (rattrapage silencieux) ; ses événements arrivent au journal, datés de leur réception.
// Sur place, pas de délai : en y allant, on rattrape le reste. Les ordres, eux, ne sont pas retardés.
function positionSysteme(id) { return id === 'solaire' ? [0, 0, 0] : (DONNEES_ETOILES[id] && DONNEES_ETOILES[id].positionAL) || null; }
function delaiLumiere(a, b) {
  if (a === b) return 0;
  const p = positionSysteme(a), q = positionSysteme(b);
  if (!p || !q) return 0;
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) * ANNEE_S;
}
function recevoirNouvelles(v) {
  const ici = v.systeme, t = v.t;
  let recu = 0;
  for (const s of Object.keys(v.mondes || {})) {
    const w = v.mondes[s], d = delaiLumiere(ici, s), tN = t - d;
    if (!d || !(w.tRange < tN - JOUR)) continue;
    changerSysteme(v, s);          // le système lointain attend depuis w.tRange
    v.t = tN;
    executerRattrapage(v, (nouveautes) => {
      for (const j of nouveautes || []) { j.texte = `📡 ${majuscule(nomSystemeDe(s))}, nouvelle émise le ${fmtDate(j.t, false)} : ${j.texte}`; j.t += d; recu++; }
    }, true);
    changerSysteme(v, ici);        // le système lointain reste rangé à la date des nouvelles reçues
    v.t = t;
  }
  if (recu) v.journal.sort((a, b) => a.t - b.t);
  if (typeof Orbiteur !== 'undefined' && v.orb) Orbiteur.charger(v);
  return recu;
}

// Orbite fermée, loin du sol et dans la sphère d'influence (ou amarré) : rien ne peut s'y passer d'un coup.
function orbiteTranquille(v) {
  const o = v.orb;
  if (!o || o.transfert) return false;
  if (v.amarre) return true;
  const a = ASTRES_PAR_ID[o.centre];
  if (!a || a.type === 'etoile') return false;
  const el = elements(o.r, o.v, a.gm);
  return el.e < 1 && el.rp > a.rayonKm && el.ra < (a.soi || Infinity) * 0.9;
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

// Avant de démarrer une nouvelle expédition : ranger celle qui est à l'écran (pilote auto, sauf choix contraire),
// et mettre de côté les équipiers restés aux bases et aux stations (initialiserEquipe remplace l'équipe).
function preparerNouvelleExpedition(v) {
  if (expeditionActive(v)) {
    if (!v.pilotageAbsence) { v.pilotageAbsence = 'auto'; v.manoeuvreAbsence = prochaineManoeuvre(v); }
    const x = rangerExpedition(v);
    if (x) v.journal.push({ t: v.t, texte: `Le vaisseau ${x.nomVaisseau || ''} poursuit sa mission sans vous (pilotage ${x.pilotageAbsence === 'manuel' ? 'manuel' : 'auto'}) : « Reprendre » pour y revenir.` });
  }
  const restes = (v.equipe || []).filter((m) => m.etat === 'base' || m.etat === 'station');
  if (restes.length) v.equipeSurPlace = [...(v.equipeSurPlace || []), ...restes];
}

// ---------- Un spationaute joué par mission ----------
// Chaque expédition a son personnage joué (v.spatio : prénom, genre, apparence ; v.idJoueur : sa fiche au registre).
// SPATIO et ID_JOUEUR (globaux, lus partout) prennent ceux de l'expédition à l'écran.
function incarner(v) {
  if (!v || !v.idJoueur) return;
  ID_JOUEUR = v.idJoueur;
  if (v.spatio) SPATIO = v.spatio;
}
// Le spationaute joué actuel est-il déjà pris par une expédition (à l'écran ou rangée) ?
function joueurOccupe(v) {
  if (expeditionActive(v) && (v.idJoueur || ID_JOUEUR) === ID_JOUEUR && !v.equipagePerdu) return v.nomVaisseau || 'l’orbiteur';
  const x = (v.flotte || []).find((e) => (e.idJoueur || 'joueur') === ID_JOUEUR && !e.equipagePerdu);
  return x ? x.nomVaisseau || 'un autre vaisseau' : null;
}
// Page d'équipage : le spationaute joué est déjà en mission. Pour la nouvelle : en créer un, ou jouer un vétéran libre.
function choisirNouveauJoueur(v, suite) {
  const ou = joueurOccupe(v);
  const dispo = personnesDisponibles(v);
  const m = $('modale');
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🧑‍🚀 Qui jouez-vous dans cette mission ?</h2>
    <p>${majuscule(nomSpatio())} est à bord du vaisseau ${ou}. Chaque mission a son spationaute : créez-en un nouveau, ou prenez un vétéran disponible.</p></div><button class="fermer">✕</button></header>
    <section><label class="choix-ravito"><input type="radio" name="joueur" value="" checked> <b>Un nouveau spationaute</b><br><span class="doux">prénom et apparence à choisir</span></label>
    ${dispo.map((f) => `<label class="choix-ravito"><input type="radio" name="joueur" value="${f.id}"> <b>${majuscule(f.nom)}</b><br><span class="doux">vétéran : ${nombre(f.expeditions.length, 'expédition')}</span></label>`).join('')}</section>
    <div class="actions"><button id="joueur-annuler">Annuler</button><button id="joueur-ok" class="principal">Continuer</button></div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => { Infos.fermer(); allerAccueil(); };
  $('joueur-annuler').onclick = () => { Infos.fermer(); allerAccueil(); };
  $('joueur-ok').onclick = () => {
    const id = m.querySelector('input[name=joueur]:checked').value;
    Infos.fermer();
    v.equipePrevue = null;
    if (id) {
      const f = registre()[id];
      ID_JOUEUR = id;
      SPATIO = { ...PROFIL_DEFAUT, ...(f.profil || {}), prenom: (f.profil && f.profil.prenom) || f.nom, choisi: true };
      return suite();
    }
    ID_JOUEUR = 'joueur-' + nouvelIdPersonne();
    SPATIO = { ...PROFIL_DEFAUT, choisi: false };
    afficherCreationSpatio(suite, { titre: 'Un nouveau spationaute', intro: 'Le spationaute que vous jouerez dans cette mission : prénom, genre (pour les accords) et apparence.' });
  };
}

// Sauvegardes d'avant les missions en parallèle : rien de rangé.
function migrerFlotte(m) {
  m.mondes = m.mondes || {};
  m.flotte = m.flotte || [];
  for (const x of m.flotte) if (x.orb) delete x.orb.etape;
  for (const w of Object.values(m.mondes)) for (const s of [...(w.sondesEnVol || []), ...(w.cargos || [])]) delete s.etape;
  if (expeditionActive(m) && !m.numero) m.numero = m.expeditions || 1;
  // Un spationaute joué par mission : les expéditions d'avant gardent celui de la sauvegarde.
  if (expeditionActive(m) && !m.idJoueur) { m.idJoueur = 'joueur'; m.spatio = SPATIO; }
  for (const x of m.flotte) if (!x.idJoueur) { x.idJoueur = 'joueur'; x.spatio = { ...SPATIO }; }
  incarner(m);
  return m;
}
