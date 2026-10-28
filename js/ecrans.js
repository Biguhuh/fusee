'use strict';
// Écrans hors vol : hangar, carte du système solaire, résultat.

const $ = (id) => document.getElementById(id);

// ---------- Sauvegarde (équipement + astres réussis) ----------
const CLE_SAUVEGARDE = 'fusee-systeme-solaire';
function charger() {
  const vide = { equipement: equipementParDefaut(), records: {}, science: {}, masque: false, voyage: null, drapeaux: {}, sauts: {}, sautsDuree: {}, progression: { campagnes: {} }, decouvertes: {}, reperes: {}, repliques: {}, registre: {} };
  try {
    const s = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE));
    if (s && s.equipement) {
      return {
        equipement: { ...equipementParDefaut(), ...s.equipement },
        records: s.records || {}, science: s.science || {}, masque: !!s.masque, voyage: s.voyage || null,
        drapeaux: s.drapeaux || {},   // drapeaux plantés : { astreId: [{ x, par, quand }] }
        essais: s.essais || {},           // centre d'essai : exercices réussis
        sautsDuree: s.sautsDuree || {},   // records de durée de saut : { astreId: { d (s), par, quand } }
        progression: s.progression || { campagnes: {} },   // ce que chaque campagne a fait (onglet Progression)
        sauts: s.sauts || {},         // records de saut : { astreId: { h, par, quand } }
        decouvertes: s.decouvertes || {},   // easter eggs trouvés : { id: { astre, quand, par } }
        repliques: s.repliques || {},   // répliques déjà affichées : { id: true }
        tracesVues: s.tracesVues || {}, // objets des missions précédentes vus sur place : { id: { astre, quand, par } }
        reperes: s.reperes || {},     // easter eggs signalés par un robot, pas encore examinés : { id: true }
        registre: s.registre || {},   // registre des équipages : { idPersonne: fiche }
      };
    }
  } catch (e) { /* stockage indisponible */ }
  return vide;
}
function sauver(etat) {
  try {
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify({
      equipement: etat.equipement, records: etat.records, science: etat.science, masque: etat.masque, voyage: etat.voyage,
      drapeaux: etat.drapeaux, sauts: etat.sauts, decouvertes: etat.decouvertes, reperes: etat.reperes, repliques: etat.repliques,
      registre: etat.registre || {}, tracesVues: etat.tracesVues || {},
      essais: etat.essais || {}, sautsDuree: etat.sautsDuree || {}, progression: etat.progression || { campagnes: {} },
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
    } catch (e) { return fini('Sauvegarde abîmée : elle ne peut pas être chargée.'); }
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
    case 'moteur': return `${fmt(o.poussee / 1000)} kN · Isp ${o.isp} s`;
    case 'reservoir': return `${fmt(o.carburant)} kg de carburant`;
    case 'coque': return `jusqu’à ${fmt(o.pressionMax)} bar`;
    case 'bouclier': return `jusqu’à ${fmt(o.tempMax)} °C`;
    case 'panneau': return o.protection > 1 ? `dose à bord ÷ ${fmt(o.protection)}` : 'pas de protection';
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
      b.innerHTML = `<span class="nom">${o.nom}</span><span class="stat">${descriptionPiece(cat, o)}</span><span class="masse">${o.masse ? '+ ' + fmt(o.masse) + ' kg' : 'aucun poids'}</span>`;
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
    <dt>Masse à vide</dt><dd>${fmt(f.masseSeche)} kg</dd>
    <dt>Masse au départ</dt><dd>${fmt(f.masseTotale)} kg</dd>
    <dt>Poussée</dt><dd>${fmt(f.poussee / 1000)} kN</dd>
    <dt>Δv disponible</dt><dd>${fmt(deltaV(f))} m/s</dd>
    <dt>Poussée/poids sur la Lune</dt><dd style="color:${twrLune < 1 ? 'var(--danger)' : 'inherit'}">${fmt(twrLune, 2)}</dd>
    <dt>Poussée/poids sur Terre</dt><dd style="color:${twrTerre < 1 ? 'var(--danger)' : 'inherit'}">${fmt(twrTerre, 2)}</dd>
    <dt>Poussée/poids sur Jupiter</dt><dd style="color:${twrJup < 1 ? 'var(--danger)' : 'inherit'}">${fmt(twrJup, 2)}</dd>
    <dt>Pression max</dt><dd>${fmt(f.pressionMax)} bar</dd>
    <dt>Température max</dt><dd>${fmt(f.tempMax)} °C</dd>
    <dt>Protection rayonnement</dt><dd>dose à bord ÷ ${fmt(f.protection)}</dd>`;

  const cv = $('apercu');
  const cx = cv.getContext('2d');
  cx.clearRect(0, 0, cv.width, cv.height);
  dessinerFusee(cx, { f, angle: 0, throttle: 0, temp: 20 }, cv.width / 2, cv.height - 30, 150);
  if (auChangement) auChangement();
}

// ---------- Carte ----------
// Ordre de la carte : planètes et lunes détaillées du système courant (systemes.js).

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
    // ★ / ✓ : meilleur vol, tous modes confondus ; ✅ : posé pendant la campagne en cours.
    const campagne = astreVisite(etat.voyage, id);
    const eggs = eggsTrouvesSur(id).length;
    b.innerHTML = `<span class="disque" style="width:${d}px;height:${d}px;background:${a.couleurs.disque}"></span><span>${a.nom}</span><span class="badge">${badge(etat.records[id])}${campagne ? ` <span title="${a.type === 'gazeuse' ? 'Plongée réussie' : 'Posé'} pendant la campagne">✅</span>` : ''}${eggs ? ` <span class="marque-egg" title="${eggs} easter egg${eggs > 1 ? 's' : ''} trouvé${eggs > 1 ? 's' : ''} ici">✨</span>` : ''}</span>`;
    b.onclick = () => choisir(id);
    return b;
  };
  // Choix de rangement : par système (planète et ses lunes) ou par catégorie.
  let choixMode = $('mode-carte');
  if (!choixMode) {
    choixMode = document.createElement('div');
    choixMode.id = 'mode-carte';
    choixMode.className = 'groupe-vue mode-carte';
    sys.parentElement.insertBefore(choixMode, sys);
  }
  const mode = etat.modeCarte || 'systeme';
  choixMode.innerHTML = `<button data-mode="systeme" class="${mode === 'systeme' ? 'choisi' : ''}">Par système</button><button data-mode="categorie" class="${mode === 'categorie' ? 'choisi' : ''}">Par catégorie</button>`;
  choixMode.querySelectorAll('button').forEach((b) => { b.onclick = () => { etat.modeCarte = b.dataset.mode; afficherCarte(etat, choisir); }; });

  if (mode === 'categorie') {
    const destinations = SYSTEME.carte.flatMap(([p, l]) => [p, ...l]);
    for (const [k, c] of Object.entries(CATEGORIES)) {
      const ids = destinations.filter((id) => ASTRES_PAR_ID[id].categorie === k);
      if (!ids.length) continue;
      const col = document.createElement('div');
      col.className = 'colonne';
      const titre = document.createElement('div');
      titre.className = 'titre-categorie';
      titre.textContent = `${c.icone} ${c.nom}`;
      titre.title = c.def;
      col.appendChild(titre);
      ids.forEach((id) => col.appendChild(bouton(id)));
      sys.appendChild(col);
    }
  } else {
    for (const [pid, lunes] of SYSTEME.carte) {
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
    ajoute('danger', `Température de la photosphère : ${fmt(a.tempSurface)} °C. Aucun bouclier ne tient : vous brûlerez avant d’arriver.`);
    const c = conditions(a, a.depart.alt);
    const sv = doseLocale(a, a.depart.alt, c) / f.protection;
    ajoute(sv > DOSE_MORTELLE ? 'danger' : 'alerte', `Rayonnement au départ : ${fmtDose(sv)} à bord (dose mortelle : ${DOSE_MORTELLE} Sv), il augmente en 1/d².`);
    ajoute(c.t > f.tempMax ? 'danger' : 'alerte', `Chaleur au départ : ${fmt(c.t)} °C (bouclier ${fmt(f.tempMax)} °C).`);
    return res;
  }

  const twr = f.poussee / (f.masseTotale * a.g);
  if (a.type === 'gazeuse') {
    ajoute(twr < 1 ? 'danger' : twr < 1.4 ? 'alerte' : 'ok', `Poussée/poids : ${fmt(twr, 2)}. ${twr < 1 ? 'Impossible de remonter.' : 'Il faut plus de 1 pour remonter.'}`);
    const pc = a.cible;
    ajoute(pc > f.pressionMax ? 'danger' : pc * 2 > f.pressionMax ? 'alerte' : 'ok', `Pression visée : ${fmt(pc)} bar (coque ${fmt(f.pressionMax)} bar). Elle grimpe sans fin en descendant.`);
    const tc = conditions(a, profondeurPour(a, pc)).t;
    ajoute(tc > f.tempMax ? 'danger' : tc > f.tempMax - 50 ? 'alerte' : 'ok', `Température à ${fmt(pc)} bar : ${fmt(tc)} °C (bouclier ${fmt(f.tempMax)} °C).`);
  } else {
    const aide = a.atm && a.atm.rho0 > 0.5 ? " L’air freine aussi." : '';
    ajoute(twr < 1 ? 'danger' : twr < 1.3 ? 'alerte' : 'ok', `Poussée/poids au sol : ${fmt(twr, 2)}. ${twr < 1 ? 'Le moteur ne peut pas freiner la chute.' : 'Plus de 1 : vous pouvez freiner et redécoller.'}${aide}`);
    const p = a.atm ? a.atm.p0 : 0;
    ajoute(p > f.pressionMax ? 'danger' : p * 1.3 > f.pressionMax ? 'alerte' : 'ok', `Pression au sol : ${fmtP(p)} (coque : ${fmt(f.pressionMax)} bar sans dégâts${p > f.pressionMax ? ', au-delà elle s’abîme puis cède' : ''}).`);
    ajoute(a.tempSurface > f.tempMax ? 'danger' : a.tempSurface > f.tempMax - 50 ? 'alerte' : 'ok', `Température au sol : ${fmt(a.tempSurface)} °C (bouclier : ${fmt(f.tempMax)} °C sans dégâts${a.tempSurface > f.tempMax ? ', au-delà la coque brûle peu à peu' : ''}).`);
    const besoin = a.depart.vitesse + Math.sqrt(2 * a.g * a.depart.alt) * (a.atm && a.atm.rho0 > 0.5 ? 0.3 : 1);
    ajoute(dv < besoin ? 'danger' : dv < besoin * 1.5 ? 'alerte' : 'ok', `Δv : ${fmt(dv)} m/s (≈ ${fmt(besoin)} m/s pour se poser sans l’aide de l’air).`);
    const retour = besoinRetourOrbite(a);
    ajoute(dv < besoin + retour ? 'alerte' : 'ok', `Retour en orbite : ≈ ${fmt(retour)} m/s de plus (vitesse orbitale ${fmtV(vitesseOrbitale(a, altitudeOrbite(a)))}).${dv < besoin + retour ? ' Pas assez pour repartir : prenez un plus gros réservoir.' : ''}`);
  }
  // Rayonnement : combien de temps l'équipage peut rester (dose mortelle 4 Sv), à bord ou dehors.
  const svSol = doseLocale(a, a.type === 'gazeuse' ? a.depart.alt : 0), svBord = svSol / f.protection;
  const tBord = tempsAvantDoseMortelle(svBord);
  ajoute(tBord < 86400 ? 'danger' : tBord < 10 * 86400 ? 'alerte' : 'ok', `Rayonnement ${a.type === 'gazeuse' ? 'à l’arrivée' : 'au sol'} : ${fmtDose(svSol)}, ${fmtDose(svBord)} à bord : dose mortelle (${DOSE_MORTELLE} Sv) en ${fmtDureeLongue(tBord)}${a.type === 'solide' ? `, ${fmtDureeLongue(tempsAvantDoseMortelle(svSol))} en sortie` : ''}.${tBord < 10 * 86400 ? ' Prenez un panneau plus épais.' : ''}`);
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
    ? `<dt>Pression ${a.type === 'solide' ? 'au sol' : 'de référence'}</dt><dd>${fmtP(a.atm.p0)}</dd><dt>Densité de l’air</dt><dd>${a.atm.rho0 < 0.01 ? a.atm.rho0.toExponential(1).replace('.', ',') : fmt(a.atm.rho0, 3)} kg/m³</dd>`
    : '<dt>Atmosphère</dt><dd>aucune</dd>';
  fiche.innerHTML = `
    <div>
      <h2>${a.nom}</h2>
      <p class="note">${typeTxt}. ${a.note}</p>
      ${htmlEggsAstre(a.id)}
      <dl>
        <dt>Rayon</dt><dd>${fmt(a.rayonKm)} km</dd>
        <dt>Gravité ${a.type === 'solide' ? 'de surface' : ''}</dt><dd>${fmt(a.g, 2)} m/s² (${fmt(a.g / G0, 2)} g)</dd>
        ${atm}
        <dt>Température</dt><dd>${fmt(a.tempSurface)} °C</dd>
        <dt>Surface</dt><dd>${a.surface}</dd>
        ${a.type === 'solide' ? `<dt>Vitesse d’atterrissage max</dt><dd>${a.vMax} m/s</dd>` : ''}
        <dt>Distance ${SYSTEME.distanceA}</dt><dd>${a.distanceUA ? fmt(a.distanceUA, 2) + ' UA' : '—'}</dd>
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
        if (c.ok) { etat.equipement = { ...c.choix }; sauver(etat); afficherFiche(etat); $('adapter-info').textContent = 'Fusée équipée : ' + descriptionConception(c); }
        else { $('adapter-info').textContent = '⚠ ' + c.raison; $('adapter-info').className = 'encart-refus'; }
      }, 30);
    };
  }
}

// ---------- Résultat ----------
// Module détruit avec l'équipage à bord : on le dit clairement, l'équipage est mort.
const CAUSES_MORTELLES = ['ecrasee', 'carburant', 'brulee', 'pressurisee'];
function texteResultat(r) {
  const res = texteResultatModule(r);
  // Drone : sa propre fin de mission (il reste sur place, avec ce qu'il a repéré).
  if (typeof etat !== 'undefined' && etat.vol && etat.vol.droneSeul && (r.cause === 'abandon' || r.cause === 'bloque')) {
    const n = Object.keys(etat.vol.vusDrone || {}).length;
    return ['Mission du drone terminée', 'succes', `Le drone reste ${sur(r.astre)}${r.cause === 'bloque' ? ', batterie vide' : ''}. ${n ? `${n} repérage${n > 1 ? 's' : ''} photographié${n > 1 ? 's' : ''} : une exploration humaine permettra d’examiner les objets inhabituels.` : 'Rien de remarquable repéré cette fois : volez bas, autour du point de largage.'}`];
  }
  const robot = typeof etat !== 'undefined' && etat.vol && (etat.vol.robotSeul || etat.vol.droneSeul || etat.vol.lancement);
  if (CAUSES_MORTELLES.includes(r.cause) && !robot && res) {
    // Une seule personne descend avec l'atterrisseur : les autres attendent à bord de l'orbiteur.
    const v = etat.enVoyage && etat.voyage;
    const eq = etat.vol.equipier || equipierDescente(null);
    // Survivants à bord (la personne qui pilotait vient d'être comptée parmi les pertes).
    const autres = v && v.equipe ? survivants(v).filter((m) => m.id !== eq.id && !(eq.principal && m.principal)).map((m) => (m.principal ? majuscule(nomSpatio()) : m.nom)) : [];
    const total = v && v.equipe ? v.equipe.length : 1;
    const morts = v && v.equipe ? total - survivants(v).length : 1;
    const liste = autres.length > 1 ? `${autres.slice(0, -1).join(', ')} et ${autres[autres.length - 1]}` : autres[0];
    res[0] += total > 1 ? ` : ${morts} membre${morts > 1 ? 's' : ''} d’équipage perdu${morts > 1 ? 's' : ''} sur ${total}` : ' : spationaute perdu';
    res[2] += ` ${majuscule(eq.nom)}, seul${eq.acc} à bord du module, est mort${eq.acc}.` +
      (autres.length ? ` ${liste} ${autres.length > 1 ? 'attendent' : 'attend'} toujours à bord de l’orbiteur.` : '');
  }
  return res;
}
function texteResultatModule(r) {
  const a = r.astre, f = r.fusee, c = r.conditions;
  const i = r.impact;
  switch (r.cause) {
    case 'ecrasee': {
      const raisons = [];
      if (i.vv > a.vMax) raisons.push(`vitesse verticale ${fmt(i.vv, 1)} m/s`);
      if (i.vh > a.vMax) raisons.push(`vitesse horizontale ${fmt(i.vh, 1)} m/s`);
      if (i.inc > INCLINAISON_MAX) raisons.push(`inclinaison ${fmt(i.inc)}°`);
      if (i.pente > INCLINAISON_MAX) raisons.push(`sol en pente de ${fmt(i.pente)}°`);
      const suite = i.exces < MARGE_RUPTURE ? ` La coque, déjà abîmée (${fmt(i.integriteAvant)} %), n’a pas tenu le choc.` : '';
      return ['Écrasée', 'echec', `Contact trop brutal avec le sol ${de(a)} : ${raisons.join(', ')}. Sans dégâts : ${a.vMax} m/s, ${INCLINAISON_MAX}° d’inclinaison et de pente au maximum.${suite}`];
    }
    case 'carburant':
      return ['À court de carburant', 'echec', `Réservoir vide à ${fmtAlt(Math.max(0, r.carburantVideAlt || 0))} d’altitude. Sans moteur pour freiner, le module s’est écrasé à ${fmt(i.vv, 1)} m/s (maximum ${a.vMax} m/s).`];
    case 'bloque':
      return ['Posé… mais à court de carburant', 'partiel', `Le module est intact ${sur(a)}, mais le réservoir est vide : impossible de redécoller.`];
    case 'brulee':
      return ['Brûlée', 'echec', a.type === 'etoile'
        ? `La coque a chauffé jusqu’à ${fmt(r.temp)} °C à ${fmtAlt(r.stats.altMin)} de la photosphère, au-delà des ${fmt(f.tempMax)} °C du bouclier, et a fini par fondre. Se poser sur le Soleil est impossible : tout brûle bien avant.`
        : `La coque a chauffé jusqu’à ${fmt(r.temp)} °C, au-delà des ${fmt(f.tempMax)} °C du bouclier, et s’est consumée peu à peu. Extérieur : ${fmt(c.t)} °C.`];
    case 'pressurisee':
      return ['Pressurisée', 'echec', `La pression extérieure est montée jusqu’à ${fmtP(c.p)} pour une coque prévue pour ${fmt(f.pressionMax)} bar : elle s’est déformée puis a cédé.` +
        (a.type === 'gazeuse' ? (r.carburantRestant <= 0 ? ` Réservoir vide, le module a sombré vers le centre ${de(a)}.` : ` Plus on descend dans ${le(a)}, plus la pression monte.`) : '')];
    case 'irradiee':
      return ['Irradiée', 'echec', `L’équipage a reçu une dose mortelle : ${fmtDoseTotale(r.doseSv || DOSE_MORTELLE)} (${fmtDose(r.svBord || 0)} à bord à la fin, panneau : dose ÷ ${fmt(f.protection)}). Il faut un panneau anti-vent solaire plus épais, ou rester moins longtemps.`];
    case 'pose':
      return [`Réussite : posé ${sur(a)}`, 'succes', `Contact à ${fmt(i ? i.vv : 0, 1)} m/s.` +
        (i && i.degats > 0 ? ` Atterrissage dur : la coque a perdu ${fmt(i.degats)} %.` : '') +
        ' Pour la réussite totale, redécollez et atteignez la vitesse orbitale.'];
    case 'orbite': {
      // La vitesse est comparée à la vitesse circulaire à cette altitude : le jeu valide l'orbite à 97 %,
      // l'orbiteur fait l'appoint au rendez-vous.
      const pct = r.vOrbitale ? ` (${fmt((r.vitesse / r.vOrbitale) * 100)} % de la vitesse orbitale à cette altitude, ${fmtV(r.vOrbitale)} : l’orbiteur fait l’appoint au rendez-vous)` : '';
      return ['Réussite totale : retour en orbite', 'succes', `Posé ${sur(a)}, puis mis en orbite à ${fmtAlt(Math.max(0, r.altitude))} et ${fmtV(r.vitesse)}${pct}. L’orbiteur vous récupère.`];
    }
    case 'liberation':
      return ['Réussite totale : libéré de la gravité', 'succes', `Posé ${sur(a)}, puis parti à ${fmtV(r.vitesse)}, au-delà de la vitesse de libération : l’orbiteur vous récupère.`];
    case 'plongee':
      return [`Réussite : plongée dans ${le(a)}`, 'succes', `Descente jusqu’à ${fmt(a.cible)} bar puis remontée jusqu’au niveau 1 bar.`];
    case 'abandon':
      return ['Mission abandonnée', 'partiel', `L’engin a quitté ${a.nom} sans terminer la mission.`];
  }
  return [r.cause, 'partiel', ''];
}

const minuscule = (t) => t.charAt(0).toLowerCase() + t.slice(1);

function afficherResultat(r) {
  let [titre, classe, message] = texteResultat(r);
  if (r.messageLancement) { titre = 'Lancement réussi'; classe = 'succes'; message = r.messageLancement; }
  // « Échec du lancement » ne concerne que les méga-fusées parties de la Terre
  // (pas le lanceur de remontée de Vénus, qui a aussi plusieurs étages).
  else if (r.lancementTerre) { titre = 'Échec du lancement : ' + titre.toLowerCase(); }
  // Le sort de l'équipage est séparé de celui de l'engin : on dit clairement ce qui s'est passé.
  const pertes = r.pertes || [];
  const equipage = pertes.find((p) => p.qui === 'spationaute');
  const robot = pertes.find((p) => p.qui === 'robot');
  if (equipage) {
    if (classe === 'succes') {
      titre = `Réussite partielle : ${titre.replace(/^Réussite( totale)? : /, '').toLowerCase()}, mais ${(etat.vol.equipier || equipierDescente(null)).nom} est perdu${(etat.vol.equipier || equipierDescente(null)).acc}`;
      classe = 'partiel';
    }
    message += ` Pendant la sortie à la surface : ${minuscule(equipage.texte)}`;
  }
  if (robot) message += ` Le robot a été perdu : ${minuscule(robot.texte)}`;
  const h = $('res-titre');
  h.textContent = titre;
  h.className = classe;
  $('res-message').textContent = message;
  $('res-stats').innerHTML = `
    <dt>Destination</dt><dd>${r.astre.nom}</dd>
    <dt>Durée du vol</dt><dd>${fmtDuree(r.temps)}</dd>
    <dt>Vitesse max</dt><dd>${fmtV(r.stats.vMax)}</dd>
    <dt>Pression max</dt><dd>${fmtP(r.stats.pMax)}</dd>
    <dt>Température max de la coque</dt><dd>${fmt(r.stats.tMax)} °C</dd>
    <dt>Intégrité de la coque</dt><dd>${fmt(Math.max(0, r.integrite))} %</dd>
    <dt>Dégâts pression / chaleur / chocs</dt><dd>${fmt(r.degats.pression)} / ${fmt(r.degats.chaleur)} / ${fmt(r.degats.impact)} %</dd>
    <dt>Carburant restant</dt><dd>${fmt(r.carburantRestant)} kg</dd>
    <dt>Dose de rayonnement (équipage)</dt><dd>${fmtDoseTotale(r.doseSv || 0)} (${fmt(Math.min(100, r.dose))} % de la dose mortelle)</dd>`;
  // Lancement : la chronologie, du compte à rebours à la mise en orbite.
  if (r.fusee && r.fusee.mega && r.chrono && r.chrono.length) {
    $('res-stats').innerHTML = `<dt>Lanceur</dt><dd>${r.fusee.nomLanceur}</dd><dt>Durée de la montée</dt><dd>${fmtDuree(r.chrono[r.chrono.length - 1].t)}</dd>` +
      r.chrono.filter((e) => !e.avant || /T−/.test(e.texte)).map((e) => `<dt>${e.avant ? '' : 'T+' + fmtDuree(e.t)}</dt><dd style="text-align:left">${e.texte}</dd>`).join('');
  }
}
