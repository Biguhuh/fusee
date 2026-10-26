'use strict';
// Règles de la campagne : atterrisseur adapté à chaque astre, ravitaillement depuis la Terre,
// bases au sol et ressources locales.

// ---------- Atterrisseur adapté ----------
// Pour atterrir, il faut pouvoir repartir : on choisit les pièces les plus légères qui permettent
// de se poser puis de remonter en orbite (ou au niveau 1 bar pour les géantes), avec 20 % de marge.

function besoinDescente(a) {
  return a.depart.vitesse + Math.sqrt(2 * a.g * a.depart.alt) * (a.atm && a.atm.rho0 > 0.5 ? 0.3 : 1);
}

function besoinAtterrisseur(a) {
  if (a.type === 'solide') return besoinDescente(a) + besoinRetourOrbite(a);
  if (a.type === 'gazeuse') return 2.5 * Math.sqrt(2 * a.g * Math.abs(profondeurPour(a, a.cible)));
  return Infinity;
}

// ---------- Vénus : remontée en ballon ----------
// Repartir du sol de Vénus demanderait ≈ 12,6 km/s : impossible. On reprend un concept étudié par la NASA :
// le module blindé se pose ; pour repartir, un ballon emporte un petit lanceur à deux étages jusqu'à
// la couche de nuages (54 km : 0,7 bar, ≈ 30 °C), d'où il s'allume vers l'orbite. Le module reste au sol.
const AEROSTAT = { venus: { alt: 54000, vitesse: 6 } };
const LANCEUR_ASCENSION = {
  nom: 'Aphrodite', chargeUtile: 1500,                 // capsule d'équipage et échantillons
  charge: { hauteur: 3, largeur: 2.2, capsule: true },
  etages: [
    { nom: '1er étage', masseSeche: 3000, carburant: 30000, poussee: 0.9e6, isp: 330, hauteur: 17, largeur: 2.6, moteurs: 3 },
    { nom: '2e étage', masseSeche: 900, carburant: 7000, poussee: 0.12e6, isp: 380, hauteur: 8, largeur: 2.2, moteurs: 1 },
  ],
};
const MASSE_BALLON = 2500;   // enveloppe et hélium
function masseAscension() {
  const l = LANCEUR_ASCENSION;
  return l.chargeUtile + MASSE_BALLON + l.etages.reduce((s, e) => s + e.masseSeche + e.carburant, 0);
}
// Le module de descente ne transporte pas le lanceur de retour : une station en orbite le construit
// (atelier) et l'envoie au sol sous parachute quand on le demande (voir Vol.demanderDecollage).
function equiperAerostat(f, a) {
  if (!AEROSTAT[a.id] || f.aerostat) return f;
  return { ...f, aerostat: { ...AEROSTAT[a.id] } };
}
function fuseeAscension() {
  const l = LANCEUR_ASCENSION;
  const f = {
    mega: true, ascension: true, lanceur: 'ascension', nomLanceur: l.nom, etages: l.etages, chargeUtile: l.chargeUtile, charge: l.charge,
    choix: { moteur: 'raptor', reservoir: 'moyen', coque: 'leger', bouclier: 'ceramique', panneau: 'aucun' },
    pressionMax: 3, tempMax: 400, protection: 2,
  };
  configurerEtage(f, 0);
  return f;
}
function deltaVAscension() {
  const f = fuseeAscension();
  let dv = 0;
  for (let i = 0; i < f.etages.length; i++) { configurerEtage(f, i); dv += deltaV(f); }
  return dv;
}
// Fusée correspondant à une conception (avec le ballon si besoin).
function fuseeDeConception(c, a) {
  const f = assemblerFusee(c.choix);
  return c.aerostat ? equiperAerostat(f, a) : f;
}

// Résultats gardés en mémoire, et d'une partie à l'autre (les vols d'essai prennent un peu de temps).
const VERSION_CONCEPTION = 'v5';   // v5 : panneaux choisis d'après la vraie dose (Sv/jour)
const cacheConception = {};
function concevoirAtterrisseur(a) {
  if (cacheConception[a.id]) return cacheConception[a.id];
  const cle = 'fusee-atterrisseur-' + VERSION_CONCEPTION + '-' + a.id;
  try {
    const s = JSON.parse(localStorage.getItem(cle));
    if (s) {
      const res = s.ok ? { ...s, fusee: fuseeDeConception(s, a) } : s;
      cacheConception[a.id] = res;
      return res;
    }
  } catch (e) { /* stockage indisponible */ }
  const res = calculerConception(a);
  cacheConception[a.id] = res;
  try { localStorage.setItem(cle, JSON.stringify({ ok: res.ok, raison: res.raison, besoin: res.besoin, choix: res.choix, dv: res.dv, twr: res.twr, aerostat: res.aerostat })); } catch (e) { /* ignoré */ }
  return res;
}

function calculerConception(a) {
  if (a.type === 'etoile') return { ok: false, raison: 'Personne ne se pose sur le Soleil : tout brûle bien avant.' };
  if (estOrigine(a.id)) return { ok: false, raison: `Sur ${SYSTEME.origineSans}, on rentre à la maison en capsule.` };
  const gaz = a.type === 'gazeuse';
  const pMax = gaz ? a.cible * 2.5 : (a.atm ? a.atm.p0 : 0);
  const tMax = gaz ? conditions(a, profondeurPour(a, a.cible)).t + 80 : a.tempSurface + (a.atm ? 60 : 20);
  // Rayonnement : l'équipage doit pouvoir rester au moins 10 jours sur place avant la dose mortelle.
  const svMax = Math.max(doseLocale(a, 0), doseLocale(a, a.depart.alt));
  const rad = svMax / (DOSE_MORTELLE / 10);
  const premier = (cat, ok) => EQUIPEMENTS[cat].options.find(ok);
  const coque = premier('coque', (o) => o.pressionMax >= pMax * 1.05);
  const bouclier = premier('bouclier', (o) => o.tempMax >= tMax);
  const panneau = premier('panneau', (o) => o.protection >= rad);
  if (!coque) return { ok: false, raison: `Aucune coque ne résiste à ${fmtP(pMax)}.` };
  if (!bouclier) return { ok: false, raison: `Aucun bouclier ne résiste à ${fmt(tMax)} °C.` };
  if (!panneau) return { ok: false, raison: 'Aucun panneau ne protège d’un tel rayonnement.' };
  if (AEROSTAT[a.id]) {
    // Vénus : il suffit de freiner la descente (l'air épais aide) ; la remontée est confiée au ballon et au lanceur.
    const candidats = [];
    for (const m of EQUIPEMENTS.moteur.options) {
      for (const r of EQUIPEMENTS.reservoir.options) {
        const choix = { moteur: m.id, reservoir: r.id, coque: coque.id, bouclier: bouclier.id, panneau: panneau.id };
        const f = equiperAerostat(assemblerFusee(choix), a);
        const twr = f.poussee / (f.masseTotale * a.g);
        if (twr >= 1.3) candidats.push({ choix, fusee: f, dv: deltaV(f), twr });
      }
    }
    candidats.sort((x, y) => x.fusee.masseTotale - y.fusee.masseTotale);
    for (const c of candidats.slice(0, 14)) {
      if (simulerAllerRetour(a, c.fusee)) return { ok: true, aerostat: true, besoin: besoinDescente(a) * 1.2, ...c };
    }
    return { ok: false, raison: `Aucun module ne réussit la descente ${sur(a)} avec son ballon de remontée.` };
  }
  const besoin = besoinAtterrisseur(a) * 1.2;
  // Candidats plausibles, du plus léger au plus lourd ; on garde le premier qui réussit
  // vraiment l'aller-retour en simulation (pilote automatique).
  const candidats = [];
  for (const m of EQUIPEMENTS.moteur.options) {
    for (const r of EQUIPEMENTS.reservoir.options) {
      const choix = { moteur: m.id, reservoir: r.id, coque: coque.id, bouclier: bouclier.id, panneau: panneau.id };
      const f = assemblerFusee(choix);
      const dv = deltaV(f);
      const twr = f.poussee / (f.masseTotale * a.g);
      if (dv >= besoin * 0.8 && twr >= 1.5) candidats.push({ choix, fusee: f, dv, twr });
    }
  }
  candidats.sort((x, y) => x.fusee.masseTotale - y.fusee.masseTotale);
  let meilleur = null;
  for (const c of candidats.slice(0, 14)) {
    if (simulerAllerRetour(a, c.fusee)) { meilleur = c; break; }
  }
  if (!meilleur) {
    return { ok: false, besoin, raison: `Aucun atterrisseur ne pourrait repartir ${de(a)} : il faudrait ≈ ${fmtV(besoin)} de Δv. Larguez plutôt un robot (aller simple).` };
  }
  return { ok: true, besoin, ...meilleur };
}

// ---------- Lanceurs (départ de la Terre) ----------
// Deux destinations, deux fusées.
const LANCEURS = {
  station: {
    nom: 'Hercule', destination: 'la station spatiale (orbite basse, 400 km)',
    description: 'Lanceur lourd à 2 étages. Met 110 t en orbite basse : orbiteur, atterrisseur, kits et ergols.',
    chargeUtile: 110000,
    // Charge utile (orbiteur + atterrisseur) : hauteur et largeur sous la coiffe, en mètres.
    charge: { hauteur: 22, largeur: 10 },
    etages: [
      { nom: '1er étage', masseSeche: 150000, carburant: 2200000, poussee: 40e6, isp: 320, hauteur: 120, largeur: 12, moteurs: 9 },
      { nom: '2e étage', masseSeche: 40000, carburant: 450000, poussee: 5e6, isp: 440, hauteur: 55, largeur: 12, moteurs: 1 },
    ],
  },
  lune: {
    nom: 'Séléné', destination: 'la Lune (injection translunaire)',
    description: 'Lanceur géant à 3 étages, du gabarit de Saturn V. Le 3e étage atteint l’orbite, puis rallume pour envoyer l’expédition vers la Lune.',
    chargeUtile: 45000,
    charge: { hauteur: 20, largeur: 6.6, tour: true },
    etages: [
      { nom: '1er étage', masseSeche: 135000, carburant: 2150000, poussee: 39e6, isp: 330, hauteur: 111, largeur: 10, moteurs: 5, ailerons: true },
      { nom: '2e étage', masseSeche: 40000, carburant: 480000, poussee: 5.1e6, isp: 430, hauteur: 69, largeur: 10, moteurs: 5 },
      { nom: '3e étage', masseSeche: 13000, carburant: 107000, poussee: 1e6, isp: 421, hauteur: 34, largeur: 6.6, moteurs: 1 },
    ],
  },
};

function caracteristiquesLanceur(l) {
  const masse = l.chargeUtile + l.etages.reduce((s, e) => s + e.masseSeche + e.carburant, 0);
  const poussee = l.etages[0].poussee;
  return { masse, poussee, hauteur: l.etages[0].hauteur, twr: poussee / (masse * G0) };
}

// Fusée « mutable » : ses caractéristiques changent à chaque séparation d'étage.
function megaFusee(type = 'station') {
  const l = LANCEURS[type];
  const f = {
    mega: true, lanceur: type, nomLanceur: l.nom, etages: l.etages, chargeUtile: l.chargeUtile, charge: l.charge,
    choix: { moteur: 'raptor', reservoir: 'titanesque', coque: 'renforce', bouclier: 'ablatif', panneau: 'aucun' },
    pressionMax: 5, tempMax: 1200, protection: 5, largeurRel: type === 'lune' ? 0.09 : 0.11,
  };
  configurerEtage(f, 0);
  return f;
}

// Δv qu'il reste au dernier étage (pour l'injection translunaire).
function deltaVRestant(f, carburant) { return f.isp * G0 * Math.log((f.masseSeche + carburant) / f.masseSeche); }
function configurerEtage(f, i) {
  const e = f.etages[i];
  let reste = f.chargeUtile;
  for (let k = i; k < f.etages.length; k++) reste += f.etages[k].masseSeche + (k > i ? f.etages[k].carburant : 0);
  Object.assign(f, { etage: i, masseSeche: reste, carburant: e.carburant, poussee: e.poussee, isp: e.isp, hauteur: e.hauteur });
  f.masseTotale = f.masseSeche + f.carburant;
}

// ---------- Stocks des stations ----------
const CAPACITES_STATION = {
  carburant: 400000, ergols: 400000, materiaux: 300000, sondes: 10, kits: 4, kitsBase: 3, robots: 4, atterrisseurs: 4, extensions: 4, lanceurRetour: 2, extensionsStation: 2, propulseurs: 1,
};
const STOCK_VIDE = () => ({ carburant: 0, ergols: 0, materiaux: 0, sondes: 0, kits: 0, kitsBase: 0, robots: 0, atterrisseurs: 0, extensions: 0, lanceurRetour: 0, extensionsStation: 0, propulseurs: 0 });
const NOMS_STOCK = {
  carburant: 'carburant', ergols: 'ergols', materiaux: 'matériaux', sondes: 'sondes', kits: 'kits de station',
  kitsBase: 'kits de base', robots: 'robots', atterrisseurs: 'atterrisseurs', extensions: 'extensions de base',
  lanceurRetour: 'lanceurs de retour', extensionsStation: 'extensions de station', propulseurs: 'propulseurs solaires',
};

// Une seule station, une seule base et une seule sonde par astre.
function stationSur(v, astreId) { return v.stations.find((s) => s.centre === astreId) || null; }
function baseSur(v, astreId) { return v.bases.find((b) => b.astre === astreId) || null; }
function sondeVers(v, astreId) { return v.sondesEnVol.find((s) => s.cible === astreId) || null; }

// Anciennes parties : fusionne les doublons (deux stations ou deux bases sur le même astre, deux sondes vers la même cible).
// On garde le plus haut niveau, les stocks s'additionnent (dans la limite des capacités), les ravitos sont redirigés,
// les sondes en trop reviennent à bord de l'orbiteur. Renvoie la liste des fusions faites (pour le journal).
function fusionnerDoublons(v) {
  const notes = [];
  const garder = (liste, cle) => {
    const par = new Map();
    for (const o of liste) { const k = o[cle]; if (!par.has(k)) par.set(k, []); par.get(k).push(o); }
    return [...par.values()].filter((g) => g.length > 1);
  };
  for (const g of garder(v.stations, 'centre')) {
    g.sort((a, b) => (b.niveau || 1) - (a.niveau || 1));
    const [k, ...autres] = g;
    for (const s of autres) {
      for (const [cle, q] of Object.entries(s.stock || {})) k.stock[cle] = Math.min(capaciteStation(k, cle), (k.stock[cle] || 0) + q);
      k.chantiers = [...(k.chantiers || []), ...(s.chantiers || [])];
      k.terrestre = k.terrestre || s.terrestre;
      for (const c of v.cargos || []) if (c.dest === s.id) c.dest = k.id;
    }
    v.stations = v.stations.filter((s) => !autres.includes(s));
    notes.push(`${autres.length + 1} stations ${enOrbite(ASTRES_PAR_ID[k.centre])} regroupées en une seule (${k.nom}).`);
  }
  for (const g of garder(v.bases, 'astre')) {
    g.sort((a, b) => (b.niveau || 1) - (a.niveau || 1));
    const [k, ...autres] = g;
    for (const b of autres) k.stock = (k.stock || 0) + (b.stock || 0);
    v.bases = v.bases.filter((b) => !autres.includes(b));
    notes.push(`${autres.length + 1} bases ${sur(ASTRES_PAR_ID[k.astre])} regroupées en une seule (niveau ${k.niveau || 1}).`);
  }
  for (const g of garder(v.sondesEnVol, 'cible')) {
    g.sort((a, b) => (b.etat === 'orbite') - (a.etat === 'orbite'));
    const autres = g.slice(1);
    v.sondesEnVol = v.sondesEnVol.filter((s) => !autres.includes(s));
    if (v.orb) v.sondes = (v.sondes || 0) + autres.length;
    notes.push(`${autres.length} sonde${autres.length > 1 ? 's' : ''} en double vers ${le(ASTRES_PAR_ID[g[0].cible])}${v.orb ? ' revenue(s) à bord' : ' retirée(s)'}.`);
  }
  return notes;
}

// Niveaux des stations orbitales. Chaque niveau s'obtient avec une extension de station (atelier ou ravito),
// assemblée en orbite en quelques jours.
//   stock : multiplie les capacités de stockage ; vitesse : accélère les chantiers de l'atelier ;
//   ravito : multiplie le ravitaillement courant ; habitat : accueille l'équipe de spationautes ;
//   interstellaire : chantier du vaisseau de départ vers une autre étoile.
const NIVEAUX_STATION = {
  1: { stock: 1, vitesse: 1, ravito: 1, apport: 'amarrage, stock, atelier' },
  2: { stock: 2, vitesse: 1, ravito: 1, apport: 'stockage doublé' },
  3: { stock: 2, vitesse: 1.5, ravito: 2, apport: 'chantiers 1,5 fois plus rapides, ravitaillement courant doublé' },
  4: { stock: 3, vitesse: 1.5, ravito: 2, habitat: true, apport: 'habitat pour l’équipe de spationautes, stockage triplé' },
  5: { stock: 3, vitesse: 2, ravito: 2, habitat: true, interstellaire: true, apport: 'chantier interstellaire : assemble le vaisseau de départ vers une autre étoile, chantiers 2 fois plus rapides' },
};
const DUREE_AGRANDISSEMENT = 10 * JOUR;
function niveauStation(st) { return NIVEAUX_STATION[st.niveau || 1]; }
function capaciteStation(st, cle) { return (CAPACITES_STATION[cle] || Infinity) * niveauStation(st).stock; }

// Vénus : y a-t-il un lanceur de retour disponible en orbite de cet astre ? Renvoie { station, pret, chantier }.
function lanceurRetourDisponible(v, astreId) {
  const st = (v.stations || []).find((s) => s.centre === astreId);
  if (!st) return { station: null };
  const chantier = (st.chantiers || []).find((c) => c.cle === 'lanceurRetour');
  return { station: st, pret: (st.stock.lanceurRetour || 0) > 0, chantier };
}
function fmtStock(cle, q) { return ['carburant', 'ergols', 'materiaux'].includes(cle) ? `${fmt(q / 1000, q < 10000 ? 1 : 0)} t` : fmt(q); }
// « 1 extension de station, 10 t de matériaux, 60 t d’ergols » (accord au singulier, « de » devant les masses).
function nomStockAccorde(k, q) {
  const nom = NOMS_STOCK[k];
  if (['carburant', 'ergols', 'materiaux'].includes(k)) return (k === 'ergols' ? 'd’' : 'de ') + nom;
  return q === 1 ? nom.split(' ').map((w) => (w === 'de' ? w : w.replace(/s$/, ''))).join(' ') : nom;
}
function decrireContenu(c) { return Object.entries(c).filter(([, q]) => q > 0).map(([k, q]) => `${fmtStock(k, q)} ${nomStockAccorde(k, q)}`).join(', '); }

// Ravitos lancés par le joueur : contenus types (capacité d'un cargo lourd).
const CONTENUS_CARGO = {
  expedition: {
    nom: 'Kit d’expédition', description: 'De quoi repartir plus loin : carburant de l’orbiteur, ergols et atterrisseurs, sondes, kits de station et de base, robots.',
    contenu: { carburant: 60000, ergols: 60000, atterrisseurs: 2, sondes: 4, kits: 2, kitsBase: 1, robots: 2 },
  },
  extension: {
    nom: 'Extension de base', description: 'Agrandit la base de l’astre : plus de production, puis une mine de matériaux (à partir du niveau 2).',
    contenu: { extensions: 1, materiaux: 15000 },
  },
  // Cargos spécialisés (citerne, vrac) : trois fois ce qu'emporte un kit d'expédition, qui partage sa place avec le matériel.
  ergols: { nom: 'Ergols', description: 'Cargo-citerne, trois fois plus qu’un kit d’expédition. Carburant pour l’orbiteur et ergols pour les atterrisseurs.', contenu: { carburant: 180000, ergols: 180000 } },
  materiaux: { nom: 'Matériaux', description: 'Cargo de vrac (120 t), trois fois plus qu’un kit d’expédition. Pour l’atelier de la station : sondes, robots, atterrisseurs, kits.', contenu: { materiaux: 120000, kitsBase: 1 } },
  extensionStation: {
    nom: 'Extension de station', description: 'Agrandit la station de destination d’un niveau (plus de stockage, chantiers plus rapides, habitat, puis chantier interstellaire).',
    contenu: { extensionsStation: 1, materiaux: 10000 },
  },
};

// Atelier d'une station : ce qu'on fabrique avec les matériaux (et les ergols) du stock.
const RECETTES = {
  sondes: { nom: 'Sonde', fem: true, materiaux: 2000 },
  robots: { nom: 'Robot', materiaux: 3000 },
  atterrisseurs: { nom: 'Atterrisseur', materiaux: 8000 },
  kitsBase: { nom: 'Kit de base', materiaux: 15000 },
  kits: { nom: 'Kit de station', materiaux: 20000 },
  extensions: { nom: 'Extension de base', fem: true, materiaux: 12000 },
  extensionsStation: { nom: 'Extension de station', fem: true, materiaux: 30000, duree: 5 * JOUR },
  // Vénus : lanceur à deux étages et son ballon, construit en orbite puis envoyé au sol sous parachute.
  lanceurRetour: { nom: 'Lanceur de retour (ballon + Aphrodite)', materiaux: 20000, ergols: 37000, duree: 20 * JOUR },
  // Propulseur ionique largable (environ 18 km/s pour 1,3 t) : il envoie la voiture rouge dans le Soleil.
  propulseurs: { nom: 'Propulseur solaire', materiaux: 6000, ergols: 3000, duree: 5 * JOUR },
};

// Extensions encore utiles à une station (cle 'extensionsStation') ou à la base de son astre (cle 'extensions') :
// de quoi monter jusqu'au niveau 5, moins ce qui est déjà prévu (agrandissement ou descente en cours, stock,
// cargos en route, chantiers de l'atelier). On n'envoie pas plus que nécessaire.
function extensionsUtiles(v, st, cle) {
  const enRoute = (v.cargos || []).filter((c) => c.dest === st.id).reduce((s, c) => s + ((c.contenu || {})[cle] || 0), 0);
  const enChantier = (st.chantiers || []).filter((c) => c.cle === cle).length;
  const prevu = (st.stock[cle] || 0) + enRoute + enChantier;
  if (cle === 'extensionsStation') return { reste: Math.max(0, 5 - (st.niveau || 1) - (st.agrandissement ? 1 : 0) - prevu), niveau: st.niveau || 1, prevu };
  const b = (v.bases || []).find((x) => x.astre === st.centre);
  const niveau = b ? b.niveau || 1 : 1;
  return { reste: Math.max(0, 5 - niveau - (b && b.descente ? 1 : 0) - prevu), niveau, prevu, base: !!b };
}
// Texte d'empêchement si un envoi (ou une fabrication) dépasse ce qui est utile, sinon ''.
function extensionsEnTrop(v, st, contenu) {
  for (const cle of ['extensionsStation', 'extensions']) {
    const q = contenu[cle] || 0;
    if (!q) continue;
    const u = extensionsUtiles(v, st, cle);
    if (u.reste >= q) continue;
    const quoi = cle === 'extensionsStation' ? `${le(st)} (niveau ${u.niveau})` : `${le(nomBase(ASTRES_PAR_ID[st.centre]))} (niveau ${u.niveau})`;
    const objet = cle === 'extensionsStation' ? 'extension de station' : 'extension de base';
    return `${majuscule(quoi)} n’a plus besoin d’${objet} : de quoi atteindre le niveau 5 est déjà prévu${u.prevu ? ` (${u.prevu} en stock, en route ou à l’atelier)` : ''}.`;
  }
  return '';
}

// Cargo vers une station du même astre (Terre → station terrestre) : lancement et rendez-vous en orbite.
const DUREE_RDV_LOCAL = JOUR;

// ---------- Ravitaillement courant depuis la planète d'origine ----------
// Petit cargo automatique et régulier ; plus la station est loin, plus le trajet est long.
function intervalleCargo(centreId) {
  if (estOrigine(centreId)) return 30 * JOUR;
  const chaine = ancetres(centreId);
  const planete = ASTRES_PAR_ID[chaine[chaine.length - 2]];
  if (estOrigine(planete.id)) return 60 * JOUR;          // une lune de la planète d'origine
  const a1 = planeteOrigine().orbite.a, a2 = planete.orbite.a;
  const tof = Math.PI * Math.sqrt(Math.pow((a1 + a2) / 2, 3) / etoileRacine().gm);
  return Math.max(120 * JOUR, tof);
}

function ajouterAuStock(s, contenu) {
  const k = s.stock;
  for (const [cle, q] of Object.entries(contenu)) k[cle] = Math.min(capaciteStation(s, cle), (k[cle] || 0) + q);
}

// Ravitaillement courant : de quoi vivre et refaire un peu les pleins (doublé à partir du niveau 3).
// Le reste, ce sont les ravitos lancés par le joueur.
function livrerCargo(s) {
  const f = niveauStation(s).ravito;
  ajouterAuStock(s, s.terrestre ? { carburant: 30000 * f, ergols: 30000 * f, sondes: f, kits: 1 } : { carburant: 15000 * f, ergols: 15000 * f, sondes: f });
}

// ---------- Bases au sol et ressources locales ----------
// Production d'ergols (kg par jour) selon ce qu'on trouve sur place.
const RESSOURCES = {
  lune: ['glace des cratères polaires', 800],
  mars: ['CO₂ de l’air et glace du sol → méthane et oxygène', 3000],
  titan: ['méthane liquide des lacs', 5000],
  europe: ['glace d’eau → hydrogène et oxygène', 2500],
  ganymede: ['glace d’eau → hydrogène et oxygène', 2500],
  callisto: ['glace d’eau → hydrogène et oxygène', 2000],
  encelade: ['glace d’eau → hydrogène et oxygène', 2500],
  triton: ['glace d’azote et d’eau', 1500],
  pluton: ['glace d’eau et de méthane', 1500],
  mercure: ['glace des cratères polaires', 500],
  a1: ['argiles hydratées et glace', 1500],
};
function ressourceLocale(a) {
  if (a.ressource) return a.ressource;          // autres systèmes : ressource supposée, décrite avec l'astre
  if (RESSOURCES[a.id]) return RESSOURCES[a.id];
  if (a.nomJpl === 'Enceladus') return RESSOURCES.encelade;
  if (a.type === 'solide' && a.tempSurface < -120) return ['glace d’eau', 1000];
  return [null, 0];
}
function productionBase(a) { return ressourceLocale(a)[1]; }

// Matériaux tirés du sol (métaux du régolithe, silicates…) : seulement avec une base agrandie (niveau 2 et plus).
function productionMateriaux(a, niveau) { return a.type === 'solide' && niveau >= 2 ? 500 * (niveau - 1) : 0; } // kg par jour

// Module qui descend une extension de la station à la base : il se pose et devient le niveau suivant.
function moduleExtension(a) {
  if (a.id === 'venus') return { nom: 'Ballon-module', duree: 6 * 3600, description: 'capsule blindée, bouclier thermique puis ballon gonflé à 55 km, qui s’amarre à l’aérostat' };
  if (a.type !== 'solide') return { nom: 'Module-sonde', duree: 4 * 3600, description: 'module flottant amarré à la base' };
  if (a.atm && a.atm.p0 > 0.5) return { nom: 'Module à parachute', duree: 3 * 3600, description: 'bouclier thermique, parachutes puis rétrofusées' };
  if (a.atm && a.atm.p0 > 0.001) return { nom: 'Module de descente', duree: 2 * 3600, description: 'bouclier thermique, parachute supersonique puis rétrofusées' };
  return { nom: 'Module de descente', duree: 1.5 * 3600, description: 'freinage aux rétrofusées jusqu’au sol, à côté de la base' };
}

// Zone pour une base : un tronçon de 120 m en pente douce (moins de 8°, moins de 6 m de dénivelé),
// le plus près possible du point de descente. La construction terrasse ensuite le terrain.
function chercherZonePlate(a) {
  const h = creerTerrain(a);
  if (!h) return null;
  const plat = (x) => {
    let min = Infinity, max = -Infinity;
    for (let d = -60; d <= 60; d += 10) {
      const y = h(x + d);
      min = Math.min(min, y); max = Math.max(max, y);
      if (Math.abs(Math.atan2(h(x + d + 5) - h(x + d - 5), 10)) > 8 * Math.PI / 180) return false;
    }
    return max - min < 6;
  };
  for (let r = 0; r <= 60000; r += 25) {
    if (plat(r)) return r;
    if (r && plat(-r)) return -r;
  }
  return null;
}

// Vol d'essai complet au pilote automatique : descente, atterrissage, remontée.
function simulerAllerRetour(a, fusee) {
  const v = new Vol(a, fusee, { voyage: true });
  v.autopilote = true;
  for (let n = 0; n < 200000 && !v.fin; n++) {
    // Grands pas loin du sol, petits pas près du sol.
    v.step(v.altSol() > 800 ? 0.25 : 0.05, {});
    if (v.pose && !v.decollageDemande) v.demanderDecollage();
  }
  return !!v.fin && ['orbite', 'liberation', 'plongee'].includes(v.fin.cause) && v.integrite > 30;
}

function descriptionConception(c) {
  if (!c.ok) return c.raison;
  const p = (cat) => piece(cat, c.choix[cat]).nom;
  if (c.aerostat) {
    return `module blindé (moteur ${p('moteur')}, réservoir ${p('reservoir')}, coque ${p('coque')}, bouclier ${p('bouclier')}) qui reste au sol ; ` +
      `remontée : lanceur de retour construit par une station en orbite et envoyé au sol sous parachute ` +
      `(ballon jusqu’à ${fmtAlt(AEROSTAT.venus.alt)}, puis ${LANCEUR_ASCENSION.nom} à 2 étages, Δv ${fmtV(deltaVAscension())})`;
  }
  return `moteur ${p('moteur')}, réservoir ${p('reservoir')}, coque ${p('coque')}, bouclier ${p('bouclier')}, panneau ${p('panneau')} — Δv ${fmtV(c.dv)} pour ${fmtV(c.besoin / 1.2)} nécessaires`;
}
