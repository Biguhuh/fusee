'use strict';
// Écrans hors vol : hangar, carte du système solaire, résultat.

const $ = (id) => document.getElementById(id);

// ---------- Sauvegarde (équipement + astres réussis) ----------
const CLE_SAUVEGARDE = 'fusee-systeme-solaire';
function charger() {
  const vide = { equipement: equipementParDefaut(), records: {}, science: {}, masque: false, voyage: null };
  try {
    const s = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE));
    if (s && s.equipement) {
      return {
        equipement: { ...equipementParDefaut(), ...s.equipement },
        records: s.records || {}, science: s.science || {}, masque: !!s.masque, voyage: s.voyage || null,
      };
    }
  } catch (e) { /* stockage indisponible */ }
  return vide;
}
function sauver(etat) {
  try {
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({
      equipement: etat.equipement, records: etat.records, science: etat.science, masque: etat.masque, voyage: etat.voyage,
    }));
  } catch (e) { /* ignoré */ }
}

// ---------- Fichier de sauvegarde (télécharger / charger) ----------
// Le fichier est du JSON simple. À l'import, on ne lui fait pas confiance :
// lecture par JSON.parse (jamais exécuté), taille limitée, structure vérifiée,
// et chaque texte nettoyé pour qu'il ne puisse pas glisser du HTML dans les pages.
const TAILLE_MAX_SAUVEGARDE = 5 * 1024 * 1024;

function exporterSauvegarde(etat) {
  sauver(etat);
  const contenu = {
    jeu: 'fusee', format: 1, date: new Date().toISOString(),
    sauvegarde: JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || 'null'),
    spationaute: JSON.parse(localStorage.getItem(CLE_SPATIO) || 'null'),
  };
  const blob = new Blob([JSON.stringify(contenu)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fusee-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Copie « propre » : seulement des objets, tableaux, nombres finis, booléens et textes sans balises.
function nettoyerDonnees(x, profondeur = 0) {
  if (profondeur > 40) throw new Error('structure trop profonde');
  if (x === null || typeof x === 'boolean') return x;
  if (typeof x === 'number') { if (!Number.isFinite(x)) throw new Error('nombre invalide'); return x; }
  if (typeof x === 'string') return x.slice(0, 2000).replace(/</g, '‹').replace(/>/g, '›').replace(/"/g, '”').replace(/`/g, '’');
  if (Array.isArray(x)) return x.slice(0, 100000).map((e) => nettoyerDonnees(e, profondeur + 1));
  if (typeof x === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(x)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype' || k.length > 100) continue;
      o[nettoyerDonnees(k, profondeur + 1)] = nettoyerDonnees(val, profondeur + 1);
    }
    return o;
  }
  throw new Error('type inattendu');
}

// Lit le fichier choisi ; appelle fini(message d'erreur ou null).
function importerSauvegarde(fichier, fini) {
  if (!fichier) return;
  if (fichier.size > TAILLE_MAX_SAUVEGARDE) return fini('Fichier trop gros pour être une sauvegarde du jeu.');
  const lecteur = new FileReader();
  lecteur.onerror = () => fini('Impossible de lire ce fichier.');
  lecteur.onload = () => {
    let d;
    try { d = nettoyerDonnees(JSON.parse(lecteur.result)); } catch (e) { return fini('Ce fichier n’est pas une sauvegarde valide (' + e.message + ').'); }
    if (!d || d.jeu !== 'fusee' || !d.sauvegarde || typeof d.sauvegarde.equipement !== 'object') return fini('Ce fichier n’est pas une sauvegarde de La fusée de l’espace.');
    // Essai à blanc : la sauvegarde doit pouvoir être chargée sans erreur.
    try {
      if (d.sauvegarde.voyage) { const v = migrerVoyage(d.sauvegarde.voyage); resumeCampagne(v); }
    } catch (e) { return fini('Sauvegarde abîmée : elle ne peut pas être chargée.'); }
    try {
      // On garde l'ancienne sauvegarde de côté, au cas où.
      const avant = localStorage.getItem(CLE_SAUVEGARDE);
      if (avant) localStorage.setItem(CLE_SAUVEGARDE + '-avant-import', avant);
      localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(d.sauvegarde));
      if (d.spationaute && typeof d.spationaute === 'object') localStorage.setItem(CLE_SPATIO, JSON.stringify(d.spationaute));
    } catch (e) { return fini('Le navigateur refuse d’enregistrer cette sauvegarde (stockage plein ou bloqué).'); }
    fini(null);
  };
  lecteur.readAsText(fichier);
}

// ---------- Hangar ----------
function descriptionPiece(cat, o) {
  switch (cat) {
    case 'moteur': return `${fmt(o.poussee / 1000)} kN · Isp ${o.isp} s`;
    case 'reservoir': return `${fmt(o.carburant)} kg de carburant`;
    case 'coque': return `jusqu'à ${fmt(o.pressionMax)} bar`;
    case 'bouclier': return `jusqu'à ${fmt(o.tempMax)} °C`;
    case 'panneau': return `protection ${fmt(o.protection, 1)}`;
  }
  return '';
}

function deltaV(f) { return f.isp * G0 * Math.log(f.masseTotale / f.masseSeche); }

// Estimation du Δv pour repartir du sol jusqu'à l'orbite basse (vitesse orbitale + pertes).
function besoinRetourOrbite(a) {
  if (a.type !== 'solide') return 0;
  const vO = vitesseOrbitale(a, altitudeOrbite(a));
  const pertes = Math.sqrt(2 * a.g * altitudeOrbite(a)) * 0.5 + (a.atm ? Math.min(2000, 300 * Math.sqrt(a.atm.p0)) : 0);
  return vO + pertes;
}

function afficherHangar(etat, auChangement) {
  const conteneur = $('pieces');
  conteneur.innerHTML = '';
  for (const cat in EQUIPEMENTS) {
    const def = EQUIPEMENTS[cat];
    const bloc = document.createElement('div');
    bloc.className = 'categorie';
    bloc.innerHTML = `<h2>${def.titre}</h2><p class="aide">${def.aide}</p>`;
    const opts = document.createElement('div');
    opts.className = 'options';
    for (const o of def.options) {
      const b = document.createElement('button');
      b.className = 'option' + (etat.equipement[cat] === o.id ? ' choisi' : '');
      b.innerHTML = `<span class="nom">${o.nom}</span><span class="stat">${descriptionPiece(cat, o)}</span><span class="masse">${o.masse ? '+ ' + fmt(o.masse) + ' kg' : 'aucun poids'}</span>`;
      b.onclick = () => { etat.equipement[cat] = o.id; sauver(etat); afficherHangar(etat, auChangement); };
      opts.appendChild(b);
    }
    bloc.appendChild(opts);
    conteneur.appendChild(bloc);
  }

  const f = assemblerFusee(etat.equipement);
  const twrLune = f.poussee / (f.masseTotale * ASTRES_PAR_ID.lune.g);
  const twrTerre = f.poussee / (f.masseTotale * ASTRES_PAR_ID.terre.g);
  const twrJup = f.poussee / (f.masseTotale * ASTRES_PAR_ID.jupiter.g);
  $('resume-fusee').innerHTML = `
    <dt>Masse à vide</dt><dd>${fmt(f.masseSeche)} kg</dd>
    <dt>Masse au départ</dt><dd>${fmt(f.masseTotale)} kg</dd>
    <dt>Poussée</dt><dd>${fmt(f.poussee / 1000)} kN</dd>
    <dt>Δv disponible</dt><dd>${fmt(deltaV(f))} m/s</dd>
    <dt>Poussée/poids Lune</dt><dd style="color:${twrLune < 1 ? 'var(--danger)' : 'inherit'}">${fmt(twrLune, 2)}</dd>
    <dt>Poussée/poids Terre</dt><dd style="color:${twrTerre < 1 ? 'var(--danger)' : 'inherit'}">${fmt(twrTerre, 2)}</dd>
    <dt>Poussée/poids Jupiter</dt><dd style="color:${twrJup < 1 ? 'var(--danger)' : 'inherit'}">${fmt(twrJup, 2)}</dd>
    <dt>Pression max</dt><dd>${fmt(f.pressionMax)} bar</dd>
    <dt>Température max</dt><dd>${fmt(f.tempMax)} °C</dd>
    <dt>Protection rayonnement</dt><dd>${fmt(f.protection, 1)}</dd>`;

  const cv = $('apercu');
  const cx = cv.getContext('2d');
  cx.clearRect(0, 0, cv.width, cv.height);
  dessinerFusee(cx, { f, angle: 0, throttle: 0, temp: 20 }, cv.width / 2, cv.height - 30, 150);
  if (auChangement) auChangement();
}

// ---------- Carte ----------
const ORDRE_CARTE = [
  ['soleil', []],
  ['mercure', []],
  ['venus', []],
  ['terre', ['lune']],
  ['mars', []],
  ['jupiter', ['io', 'europe', 'ganymede', 'callisto']],
  ['saturne', ['titan', 'rhea']],
  ['uranus', ['titania', 'oberon']],
  ['neptune', ['triton']],
  ['pluton', ['l901']],
  ['a1', ['a4', 'a2', 'a10']],   // ceinture d'astéroïdes : Cérès, Vesta, Pallas, Hygie
];

function tailleDisque(a) { return Math.round(10 + 9 * Math.log(a.rayonKm / 500)); }

function badge(rec) {
  if (rec === 'orbite' || rec === 'liberation' || rec === 'plongee' || rec === 'retour') return '★ réussi';
  if (rec === 'pose') return '✓ posé';
  return '';
}

function afficherCarte(etat, choisir) {
  const sys = $('systeme');
  sys.innerHTML = '';
  const bouton = (id) => {
    const a = ASTRES_PAR_ID[id];
    const b = document.createElement('button');
    b.className = 'astre' + (etat.destination === id ? ' choisi' : '');
    const d = Math.max(12, tailleDisque(a));
    b.innerHTML = `<span class="disque" style="width:${d}px;height:${d}px;background:${a.couleurs.disque}"></span><span>${a.nom}</span><span class="badge">${badge(etat.records[id])}</span>`;
    b.onclick = () => choisir(id);
    return b;
  };
  for (const [pid, lunes] of ORDRE_CARTE) {
    const col = document.createElement('div');
    col.className = 'colonne';
    col.appendChild(bouton(pid));
    if (lunes.length) {
      const l = document.createElement('div');
      l.className = 'lunes';
      lunes.forEach((id) => l.appendChild(bouton(id)));
      col.appendChild(l);
    }
    sys.appendChild(col);
  }
  afficherFiche(etat);
}

// Altitude (négative) où la pression atteint p, sous le niveau 1 bar d'une géante.
function profondeurPour(a, p) {
  const T0 = a.atm.t0 + KELVIN;
  return -((Math.pow(p / a.atm.p0, 1 / 3.5) - 1) * T0 / Math.abs(a.atm.gradient)) * 1000;
}

function verifications(a, f) {
  const res = [];
  const ajoute = (niveau, texte) => res.push({ niveau, texte });
  const dv = deltaV(f);

  if (a.type === 'etoile') {
    ajoute('danger', `Température de la photosphère : ${fmt(a.tempSurface)} °C. Aucun bouclier ne tient : vous brûlerez avant d'arriver.`);
    const c = conditions(a, a.depart.alt);
    ajoute(c.rad > f.protection ? 'danger' : 'alerte', `Rayonnement au départ : ${fmt(c.rad)} (protection ${fmt(f.protection, 1)}), il augmente en 1/d².`);
    ajoute(c.t > f.tempMax ? 'danger' : 'alerte', `Chaleur au départ : ${fmt(c.t)} °C (bouclier ${fmt(f.tempMax)} °C).`);
    return res;
  }

  const twr = f.poussee / (f.masseTotale * a.g);
  if (a.type === 'gazeuse') {
    ajoute(twr < 1 ? 'danger' : twr < 1.4 ? 'alerte' : 'ok', `Poussée/poids : ${fmt(twr, 2)}. ${twr < 1 ? 'Impossible de remonter.' : 'Il faut plus de 1 pour remonter.'}`);
    const pc = a.cible;
    ajoute(pc > f.pressionMax ? 'danger' : pc * 2 > f.pressionMax ? 'alerte' : 'ok', `Pression visée : ${fmt(pc)} bar (coque ${fmt(f.pressionMax)} bar). Elle grimpe sans fin en descendant.`);
    const tc = conditions(a, profondeurPour(a, pc)).t;
    ajoute(tc > f.tempMax ? 'danger' : tc > f.tempMax - 50 ? 'alerte' : 'ok', `Température à ${fmt(pc)} bar : ${fmt(tc)} °C (bouclier ${fmt(f.tempMax)} °C).`);
  } else {
    const aide = a.atm && a.atm.rho0 > 0.5 ? " L'air freine aussi." : '';
    ajoute(twr < 1 ? 'danger' : twr < 1.3 ? 'alerte' : 'ok', `Poussée/poids au sol : ${fmt(twr, 2)}. ${twr < 1 ? 'Le moteur ne peut pas freiner la chute.' : 'Plus de 1 : vous pouvez freiner et redécoller.'}${aide}`);
    const p = a.atm ? a.atm.p0 : 0;
    ajoute(p > f.pressionMax ? 'danger' : p * 1.3 > f.pressionMax ? 'alerte' : 'ok', `Pression au sol : ${fmtP(p)} (coque : ${fmt(f.pressionMax)} bar sans dégâts${p > f.pressionMax ? ', au-delà elle s\'abîme puis cède' : ''}).`);
    ajoute(a.tempSurface > f.tempMax ? 'danger' : a.tempSurface > f.tempMax - 50 ? 'alerte' : 'ok', `Température au sol : ${fmt(a.tempSurface)} °C (bouclier : ${fmt(f.tempMax)} °C sans dégâts${a.tempSurface > f.tempMax ? ', au-delà la coque brûle peu à peu' : ''}).`);
    const besoin = a.depart.vitesse + Math.sqrt(2 * a.g * a.depart.alt) * (a.atm && a.atm.rho0 > 0.5 ? 0.3 : 1);
    ajoute(dv < besoin ? 'danger' : dv < besoin * 1.5 ? 'alerte' : 'ok', `Δv : ${fmt(dv)} m/s (≈ ${fmt(besoin)} m/s pour se poser sans air pour freiner).`);
    const retour = besoinRetourOrbite(a);
    ajoute(dv < besoin + retour ? 'alerte' : 'ok', `Retour en orbite : ≈ ${fmt(retour)} m/s de plus (vitesse orbitale ${fmtV(vitesseOrbitale(a, altitudeOrbite(a)))}).${dv < besoin + retour ? ' Pas assez pour repartir : prenez un plus gros réservoir.' : ''}`);
  }
  const rad = conditions(a, 0).rad;
  ajoute(rad > f.protection ? (rad > f.protection * 3 ? 'danger' : 'alerte') : 'ok', `Rayonnement : ${fmt(rad, 1)} (protection ${fmt(f.protection, 1)}).`);
  return res;
}

function afficherFiche(etat) {
  const fiche = $('fiche');
  const a = ASTRES_PAR_ID[etat.destination];
  $('lancer').disabled = !a;
  if (!a) { fiche.innerHTML = '<p class="vide">Cliquez sur un astre.</p>'; return; }
  const f = assemblerFusee(etat.equipement);
  const typeTxt = { solide: 'Astre solide', gazeuse: 'Géante gazeuse — pas de sol', etoile: 'Étoile' }[a.type];
  const atm = a.atm
    ? `<dt>Pression ${a.type === 'solide' ? 'au sol' : 'de référence'}</dt><dd>${fmtP(a.atm.p0)}</dd><dt>Densité de l'air</dt><dd>${a.atm.rho0 < 0.01 ? a.atm.rho0.toExponential(1).replace('.', ',') : fmt(a.atm.rho0, 3)} kg/m³</dd>`
    : '<dt>Atmosphère</dt><dd>aucune</dd>';
  fiche.innerHTML = `
    <div>
      <h2>${a.nom}</h2>
      <p class="note">${typeTxt}. ${a.note}</p>
      <dl>
        <dt>Rayon</dt><dd>${fmt(a.rayonKm)} km</dd>
        <dt>Gravité ${a.type === 'solide' ? 'de surface' : ''}</dt><dd>${fmt(a.g, 2)} m/s² (${fmt(a.g / G0, 2)} g)</dd>
        ${atm}
        <dt>Température</dt><dd>${fmt(a.tempSurface)} °C</dd>
        <dt>Surface</dt><dd>${a.surface}</dd>
        ${a.type === 'solide' ? `<dt>Vitesse d'atterrissage max</dt><dd>${a.vMax} m/s</dd>` : ''}
        <dt>Distance au Soleil</dt><dd>${a.distanceUA ? fmt(a.distanceUA, 2) + ' UA' : '—'}</dd>
        <dt>Départ</dt><dd>${fmtAlt(a.depart.alt)}, ${fmtV(a.depart.vitesse)} ↓</dd>
      </dl>
    </div>
    <div>
      <h2>Votre engin sur place</h2>
      <ul class="controle">${verifications(a, f).map((v) => `<li class="${v.niveau}">${v.texte}</li>`).join('')}</ul>
      ${a.type === 'solide' || a.type === 'gazeuse' ? '<button id="adapter" style="margin-top:10px">⚙ Équiper pour se poser et repartir</button><p id="adapter-info" class="doux"></p>' : ''}
    </div>`;
  const b = $('adapter');
  if (b) {
    b.onclick = () => {
      $('adapter-info').textContent = 'Vols d’essai en cours…';
      setTimeout(() => {
        const c = concevoirAtterrisseur(a);
        if (c.ok) { etat.equipement = { ...c.choix }; sauver(etat); afficherFiche(etat); $('adapter-info').textContent = 'Fusée équipée : ' + descriptionConception(c); }
        else $('adapter-info').textContent = c.raison;
      }, 30);
    };
  }
}

// ---------- Résultat ----------
function texteResultat(r) {
  const a = r.astre, f = r.fusee, c = r.conditions;
  const i = r.impact;
  switch (r.cause) {
    case 'ecrasee': {
      const raisons = [];
      if (i.vv > a.vMax) raisons.push(`vitesse verticale ${fmt(i.vv, 1)} m/s`);
      if (i.vh > a.vMax) raisons.push(`vitesse horizontale ${fmt(i.vh, 1)} m/s`);
      if (i.inc > INCLINAISON_MAX) raisons.push(`inclinaison ${fmt(i.inc)}°`);
      if (i.pente > INCLINAISON_MAX) raisons.push(`sol en pente de ${fmt(i.pente)}°`);
      const suite = i.exces < MARGE_RUPTURE ? ` La coque, déjà abîmée (${fmt(i.integriteAvant)} %), n'a pas tenu le choc.` : '';
      return ['Écrasée', 'echec', `Contact trop brutal avec le sol de ${a.nom} : ${raisons.join(', ')}. Sans dégâts : ${a.vMax} m/s, ${INCLINAISON_MAX}° d'inclinaison et de pente au maximum.${suite}`];
    }
    case 'carburant':
      return ['À court de carburant', 'echec', `Réservoir vide à ${fmtAlt(Math.max(0, r.carburantVideAlt || 0))} d'altitude. Sans moteur pour freiner, le module s'est écrasé à ${fmt(i.vv, 1)} m/s (maximum ${a.vMax} m/s).`];
    case 'bloque':
      return ['Posé… mais à court de carburant', 'partiel', `Le module est intact sur ${a.nom}, mais le réservoir est vide : impossible de redécoller.`];
    case 'brulee':
      return ['Brûlée', 'echec', a.type === 'etoile'
        ? `La coque a chauffé jusqu'à ${fmt(r.temp)} °C à ${fmtAlt(r.stats.altMin)} de la photosphère, au-delà des ${fmt(f.tempMax)} °C du bouclier, et a fini par fondre. Se poser sur le Soleil est impossible : tout brûle bien avant.`
        : `La coque a chauffé jusqu'à ${fmt(r.temp)} °C, au-delà des ${fmt(f.tempMax)} °C du bouclier, et s'est consumée peu à peu. Extérieur : ${fmt(c.t)} °C.`];
    case 'pressurisee':
      return ['Pressurisée', 'echec', `La pression extérieure est montée jusqu'à ${fmtP(c.p)} pour une coque prévue pour ${fmt(f.pressionMax)} bar : elle s'est déformée puis a cédé.` +
        (a.type === 'gazeuse' ? (r.carburantRestant <= 0 ? ` Réservoir vide, la sonde a sombré vers le centre de ${a.nom}.` : ` Plus on descend dans ${a.nom}, plus la pression monte.`) : '')];
    case 'irradiee':
      return ['Irradiée', 'echec', `Le rayonnement (${fmt(c.rad, 1)}, protection ${fmt(f.protection, 1)}) a grillé l'électronique. Il faut un panneau anti-vent solaire plus épais.`];
    case 'pose':
      return [`Réussite : posé sur ${a.nom}`, 'succes', `Contact à ${fmt(i ? i.vv : 0, 1)} m/s.` +
        (i && i.degats > 0 ? ` Atterrissage dur : la coque a perdu ${fmt(i.degats)} %.` : '') +
        ' Pour la réussite totale, redécollez et atteignez la vitesse orbitale.'];
    case 'orbite':
      return ['Réussite totale : retour en orbite', 'succes', `Posé sur ${a.nom}, puis mis en orbite à ${fmtAlt(Math.max(0, r.altitude))} et ${fmtV(r.vitesse)} : l'orbiteur vous récupère.`];
    case 'liberation':
      return ['Réussite totale : libéré de la gravité', 'succes', `Posé sur ${a.nom}, puis parti à ${fmtV(r.vitesse)}, au-delà de la vitesse de libération : l'orbiteur vous récupère.`];
    case 'plongee':
      return [`Réussite : plongée dans ${a.nom}`, 'succes', `Descente jusqu'à ${fmt(a.cible)} bar puis remontée jusqu'au niveau 1 bar.`];
    case 'abandon':
      return ['Mission abandonnée', 'partiel', `L’engin a quitté ${a.nom} sans terminer la mission.`];
  }
  return [r.cause, 'partiel', ''];
}

function afficherResultat(r) {
  let [titre, classe, message] = texteResultat(r);
  if (r.messageLancement) { titre = 'Lancement réussi'; classe = 'succes'; message = r.messageLancement; }
  else if (r.fusee && r.fusee.mega) { titre = 'Échec du lancement : ' + titre.toLowerCase(); }
  const h = $('res-titre');
  h.textContent = titre;
  h.className = classe;
  $('res-message').textContent = message;
  $('res-stats').innerHTML = `
    <dt>Destination</dt><dd>${r.astre.nom}</dd>
    <dt>Durée du vol</dt><dd>${fmt(r.temps)} s</dd>
    <dt>Vitesse max</dt><dd>${fmtV(r.stats.vMax)}</dd>
    <dt>Pression max</dt><dd>${fmtP(r.stats.pMax)}</dd>
    <dt>Température coque max</dt><dd>${fmt(r.stats.tMax)} °C</dd>
    <dt>Intégrité de la coque</dt><dd>${fmt(Math.max(0, r.integrite))} %</dd>
    <dt>Dégâts pression / chaleur / chocs</dt><dd>${fmt(r.degats.pression)} / ${fmt(r.degats.chaleur)} / ${fmt(r.degats.impact)} %</dd>
    <dt>Carburant restant</dt><dd>${fmt(r.carburantRestant)} kg</dd>
    <dt>Dose de rayonnement</dt><dd>${fmt(Math.min(100, r.dose))} %</dd>`;
  // Lancement : la chronologie, du compte à rebours à la mise en orbite.
  if (r.fusee && r.fusee.mega && r.chrono && r.chrono.length) {
    $('res-stats').innerHTML = `<dt>Lanceur</dt><dd>${r.fusee.nomLanceur}</dd><dt>Durée de la montée</dt><dd>${fmtDuree(r.chrono[r.chrono.length - 1].t)}</dd>` +
      r.chrono.filter((e) => !e.avant || /T−/.test(e.texte)).map((e) => `<dt>${e.avant ? '' : 'T+' + fmtDuree(e.t)}</dt><dd style="text-align:left">${e.texte}</dd>`).join('');
  }
}
