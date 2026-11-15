'use strict';
// ---------- Colonies : la descente sans retour ----------
// Sur une planète de la taille de la Terre, il faudrait ≈ 11 km/s pour remonter en orbite : aucun atterrisseur ne
// peut repartir. Si une base y est installée, l'équipage peut quand même descendre, sans retour, dans un module de
// descente seule (bouclier, parachutes, rétrofusées) : il devient les colons de la base. C'est définitif, tant
// qu'aucun lanceur lourd n'aura été construit sur place.

// Module de descente seule : même coque, bouclier et panneau que l'atterrisseur, mais assez d'ergols pour se poser,
// pas pour repartir. Le plus léger qui a de la marge (Δv ≥ 1,5 fois le besoin) et assez de poussée.
const cacheDescenteSeule = {};
function concevoirDescenteSeule(a) {
  if (cacheDescenteSeule[a.id]) return cacheDescenteSeule[a.id];
  const pMax = a.atm ? a.atm.p0 : 0, tMax = a.tempSurface + (a.atm ? 60 : 20);
  const rad = Math.max(doseLocale(a, 0), doseLocale(a, a.depart.alt)) / (DOSE_MORTELLE / 10);
  const premier = (cat, ok) => EQUIPEMENTS[cat].options.find(ok);
  const coque = premier('coque', (o) => o.pressionMax >= pMax * 1.05), bouclier = premier('bouclier', (o) => o.tempMax >= tMax);
  const panneau = premier('panneau', (o) => o.protection >= rad);
  let res = { ok: false, raison: 'Aucun module ne résiste aux conditions de la descente.' };
  if (coque && bouclier && panneau) {
    const besoin = besoinDescente(a), candidats = [];
    for (const m of EQUIPEMENTS.moteur.options) for (const r of EQUIPEMENTS.reservoir.options) {
      const choix = { moteur: m.id, reservoir: r.id, coque: coque.id, bouclier: bouclier.id, panneau: panneau.id };
      const f = assemblerFusee(choix), dv = deltaV(f), twr = f.poussee / (f.masseTotale * a.g);
      if (dv >= besoin * 1.5 && twr >= 1.5) candidats.push({ choix, fusee: f, dv, twr });
    }
    candidats.sort((x, y) => x.fusee.masseTotale - y.fusee.masseTotale);
    res = candidats.length ? { ok: true, besoin, ...candidats[0] } : { ok: false, raison: `Aucun module ne freine assez pour se poser ${sur(a)}.` };
  }
  return (cacheDescenteSeule[a.id] = res);
}

// La descente sans retour est-elle possible ici ? { base, conc } ou { raison }.
function colonsPossibles(v, a) {
  if (!v || a.type !== 'solide' || estPetitCorps(a) || AEROSTAT[a.id] || estOrigine(a.id)) return { raison: '' };
  const b = baseSur(v, a.id);
  if (!b) return { raison: `pour y descendre sans retour, il faut d’abord une base ${sur(a)} (déployée depuis la station)` };
  if (b.deploiement && v.t < b.deploiement.fin) return { raison: `la base ${de(a)} est encore en cours de déploiement` };
  if (placesLibres(v, idBase(b)) <= 0) return { raison: `la base ${de(a)} est pleine (${capaciteBase(b)} places)` };
  const conc = concevoirDescenteSeule(a);
  if (!conc.ok) return { raison: conc.raison };
  return { base: b, conc };
}

// Bouton de l'orbiteur, sous le refus de l'atterrisseur.
function htmlColons(v, a) {
  const p = colonsPossibles(v, a);
  if (!p.base) return p.raison ? `<p class="doux">🏠 Descente sans retour : ${p.raison}.</p>` : '';
  return `<button id="nav-colons">⬇ Descente sans retour : rejoindre la base ${de(a)}</button>
    <p class="doux">Module de descente seule (${fmt(p.conc.fusee.carburant / 1000, 1)} t d’ergols) : l’équipage se pose près de la base et y reste, comme colons. ${placesLibres(v, idBase(p.base))} place${placesLibres(v, idBase(p.base)) > 1 ? 's' : ''} libre${placesLibres(v, idBase(p.base)) > 1 ? 's' : ''} à la base.</p>`;
}

// Après le choix de l'équipage : confirmation, puis la descente (pilotée comme d'habitude).
function descendreColons(v, a, compo) {
  const p = colonsPossibles(v, a);
  if (!p.base) return Orbiteur.log(`Descente sans retour impossible : ${p.raison}.`);
  const ids = [compo.equipier.id || (v.equipe.find((m) => m.principal) || {}).id, ...(compo.passagers || [])].filter(Boolean);
  const membres = ids.map((id) => v.equipe.find((m) => m.id === id)).filter(Boolean);
  const places = placesLibres(v, idBase(p.base));
  if (membres.length > places) return Orbiteur.log(`Descente sans retour : la base ${de(a)} n’a que ${places} place${places > 1 ? 's' : ''} libre${places > 1 ? 's' : ''}.`);
  const plein = p.conc.fusee.carburant;
  if (v.ergolsAtt < plein) return Orbiteur.log(`Descente sans retour : il faut ${fmt(plein / 1000, 1)} t d’ergols pour le module, il n’en reste que ${fmt(v.ergolsAtt / 1000, 1)} t. Ravitaillez à la station.`);
  const noms = listeNoms(membres.map((m) => (m.principal ? majuscule(nomSpatio()) : m.nom)));
  const plusieurs = membres.length > 1;
  if (!confirm(`Descente sans retour ${sur(a)}.\n\nAucun module ne peut repartir ${de(a)} : il faudrait ≈ ${fmt(besoinAtterrisseur(a) * 1.2 / 1000, 1)} km/s pour remonter en orbite.\n\n${noms} ${plusieurs ? 'deviendront les colons' : 'deviendra colon'} de la base, et n’en ${plusieurs ? 'repartiront' : 'repartira'} pas, tant qu’un lanceur lourd n’aura pas été construit sur place.\n\nC’est définitif. Descendre ?`)) return;
  v.ergolsAtt -= plein;
  etat.destination = a.id;
  lancer({ voyage: true, fusee: p.conc.fusee, carburant: plein, bases: basesSur(a.id), site: siteDescente(a.id), equipier: compo.equipier, passagers: compo.passagers, rover: null });
  etat.vol.sansRetour = true;
}

// Posé : l'équipage rejoint la base, pour de bon ; le module reste à côté (ses ergols servent à la base).
function fonderColonie(v, r) {
  const a = r.astre, b = baseSur(v, a.id), vol = etat.vol;
  v.atterrisseurs = Math.max(0, v.atterrisseurs - 1);
  const pilote = vol.equipier && vol.equipier.id ? v.equipe.find((m) => m.id === vol.equipier.id) : v.equipe.find((m) => m.principal);
  const membres = [pilote, ...(vol.passagers || []).map((id) => v.equipe.find((m) => m.id === id))].filter(Boolean);
  for (const m of membres) { m.etat = 'base'; m.lieu = idBase(b); m.colon = true; }
  const noms = listeNoms(membres.map((m) => (m.principal ? majuscule(nomSpatio()) : m.nom)));
  b.colons = (b.colons || 0) + membres.length;
  const plusieurs = membres.length > 1;
  Orbiteur.log(`🏠 ${noms} ${plusieurs ? 'se sont posés' : `s’est posé${accordMembre(membres[0])}`} près de la base ${de(a)} : désormais colon${plusieurs ? 's' : ''} de la base. Pas de retour possible tant qu’aucun lanceur lourd n’aura été construit sur place.`);
  if (pilote && pilote.principal) Orbiteur.log('🧑‍🚀 Votre spationaute vit désormais à la base. L’orbiteur continue avec le reste de l’équipage.');
  r.messageColonie = `${noms} ${membres.length > 1 ? 'vivent' : 'vit'} désormais à la base ${de(a)}.`;
}

// Écran de résultat : « Posé : colonie fondée ».
(function () {
  const texte = texteResultatModule;
  texteResultatModule = function (r) {
    if (r.cause !== 'colonie') return texte(r);
    const i = r.impact;
    return [`Posé ${sur(r.astre)} : sans retour`, 'succes', `Contact à ${fmt(i ? i.vv : 0, 1)} m/s, près de la base.${r.messageColonie ? ' ' + r.messageColonie : ''} Le module de descente reste sur place : aucun ne pourrait repartir.`];
  };
})();

// ---------- La vie à la base ----------
// Les colons mangent et boivent sur la réserve de la base, que la navette de la station complète (ravitaillement.js,
// avec rationnement puis des morts si elle se vide). Ici : leur fiche, et les sorties à pied depuis la base.
function colonsDe(v, b) { return (v.equipe || []).filter((m) => m.colon && m.lieu === idBase(b) && m.etat === 'base' && !(m.principal && v.equipagePerdu)); }
function nomMembre(m) { return m.principal ? majuscule(nomSpatio()) : m.nom; }

// Encart de l'orbiteur : les colons de la base, leur réserve, et le bouton de sortie.
function htmlBaseColons(v, a) {
  const b = baseSur(v, a.id);
  if (!b) return '';
  const l = colonsDe(v, b);
  if (!l.length) return '';
  const k = b.reserve || {}, c = consoParPersonne(v), n = l.length;
  const jours = (cle) => (c[cle] ? `${fmt((k[cle] || 0) / (n * c[cle]))} j` : 'sans limite');
  const valides = l.filter((m) => !(m.blessure && m.blessure.gravite === 'grave'));
  return `<p class="encart">🏠 <b>Colonie ${de(a)}</b> : ${listeNoms(l.map(nomMembre))}. Réserve : vivres ${jours('vivres')}, eau ${jours('eau')}${stationSur(v, a.id) ? ' (la navette de la station la complète)' : ' (pas de station : seule la glace donne de l’eau)'}.</p>`
    + (valides.length ? `<button id="nav-sortie-base">🚶 Sortie depuis la base ${de(a)}</button>` : '<p class="doux">Aucun colon en état de sortir.</p>') + htmlLanceurColonie(v, a, b);
}

// Sortie à pied depuis la base : un colon (et un second s'il y en a un), sans module ; on rentre à la base.
function sortieDepuisBase(v, a) {
  const b = baseSur(v, a.id), l = b ? colonsDe(v, b).filter((m) => !(m.blessure && m.blessure.gravite === 'grave')) : [];
  if (!l.length) return Orbiteur.log('Aucun colon en état de sortir.');
  const dessin = concevoirDescenteSeule(a);
  etat.destination = a.id;
  etat.vol = new Vol(a, dessin.ok ? dessin.fusee : assemblerFusee(etat.equipement), { depuisSol: true, voyage: true, bases: basesSur(a.id) });
  etat.vol.x = b.x + 25; etat.vol.y = etat.vol.sol(etat.vol.x) + 0.01;   // on sort par le sas, à côté de la base
  etat.vol.depuisBase = idBase(b);
  etat.vol.equipier = equipierDeMembre(l[0]);
  etat.vol.passagers = l.slice(1, 2).map((m) => m.id);
  etat.enVoyage = true;
  etat.explo = new Exploration(etat.vol, 'spationaute', etat.science, {});
  etat.explo.dire(`🏠 Sortie depuis la base ${de(a)}. Retour : E près du sas de la base.`);
  touches.clear();
  redim();
  montrer('explo');
}
// Fin de la sortie : on revient à l'orbiteur ; les échantillons sont déjà comptés pour la science.
function finSortieBase(vol) {
  if (etat.voyage && vol.echantillons) Orbiteur.log(`🏠 Retour à la base ${de(vol.astre)} : ${vol.echantillons} échantillon${vol.echantillons > 1 ? 's' : ''} analysé${vol.echantillons > 1 ? 's' : ''} sur place.`);
}

// ---------- Lanceur lourd construit sur place ----------
// Les colons construisent un lanceur d'équipage à deux étages (comme l'Aube qui part de la Terre) avec ce que
// produit la base : ergols tirés de la glace (eau → hydrogène et oxygène) et matériaux de la mine. Il faut une base
// de niveau 3 (mine, atelier) ; la production part d'abord au lanceur ; l'assemblage dure au moins un an.
// Une fois prêt, il remonte jusqu'à 4 colons en orbite, une fois. Le décollage se pilote.
const LANCEUR_COLONIE = { niveau: 3, ergols: 500000, materiaux: 60000, dureeMin: 365 * JOUR, places: 4 };

function htmlLanceurColonie(v, a, b) {
  const L = LANCEUR_COLONIE, c = b.chantierLanceur;
  if (b.lanceurPret) return `<button id="nav-lanceur-colonie">🚀 Décoller avec le lanceur de la base (${Math.min(L.places, colonsDe(v, b).length)} place${Math.min(L.places, colonsDe(v, b).length) > 1 ? 's' : ''})</button>`;
  if (c) {
    const pctE = Math.min(100, (100 * c.ergols) / L.ergols), pctM = Math.min(100, (100 * c.materiaux) / L.materiaux);
    return `<p class="doux">🏗 Lanceur en construction : ergols ${fmt(c.ergols / 1000)} / ${fmt(L.ergols / 1000)} t (${fmt(pctE)} %), matériaux ${fmt(c.materiaux / 1000)} / ${fmt(L.materiaux / 1000)} t (${fmt(pctM)} %) ; assemblage jusqu’au ${fmtDate(c.debut + L.dureeMin, false)} au moins.</p>`;
  }
  if ((b.niveau || 1) < L.niveau) return `<p class="doux">🚀 Un lanceur lourd pourra être construit sur place quand la base sera au niveau ${L.niveau} (mine et atelier) : aujourd’hui niveau ${b.niveau || 1}.</p>`;
  if (!productionBase(a)) return `<p class="doux">🚀 Pas de lanceur sur place : la base ne tire aucun ergol du sol ${de(a)}.</p>`;
  const jours = Math.max(L.ergols / (productionBase(a) * b.niveau), L.materiaux / Math.max(1, productionMateriaux(a, b.niveau)), L.dureeMin / JOUR);
  return `<button id="nav-chantier-lanceur">🏗 Construire un lanceur sur place (${fmt(L.ergols / 1000)} t d’ergols, ${fmt(L.materiaux / 1000)} t de matériaux, ≈ ${(jours <= 366 ? "1 an" : fmtDureeAnnees(jours / 365.25))})</button>`;
}
function lancerChantierLanceur(v, a) {
  const b = baseSur(v, a.id);
  if (!b || b.chantierLanceur || b.lanceurPret || (b.niveau || 1) < LANCEUR_COLONIE.niveau || !colonsDe(v, b).length) return;
  b.chantierLanceur = { debut: v.t, ergols: 0, materiaux: 0 };
  Orbiteur.log(`🏗 Les colons ${de(a)} commencent un lanceur à deux étages. Les ergols tirés de la glace et les matériaux de la mine iront d’abord au chantier ; l’assemblage durera au moins un an.`);
}
// Appelé par la mise à jour des bases : prend la production pour le chantier ; renvoie ce qui reste.
function alimenterChantierLanceur(v, b, prod, mat, log) {
  const L = LANCEUR_COLONIE, c = b.chantierLanceur;
  const e = Math.min(prod, Math.max(0, L.ergols - c.ergols)), m = Math.min(mat, Math.max(0, L.materiaux - c.materiaux));
  c.ergols += e; c.materiaux += m;
  if (c.ergols >= L.ergols && c.materiaux >= L.materiaux && v.t >= c.debut + L.dureeMin) {
    delete b.chantierLanceur;
    b.lanceurPret = true;
    log(`🚀 Le lanceur de la base ${de(ASTRES_PAR_ID[b.astre])} est prêt sur son pas de tir : ${L.places} places pour remonter en orbite.`);
  }
  return { prod: prod - e, mat: mat - m };
}
// Décollage : jusqu'à 4 colons, valides, montent dans la capsule ; on pilote la montée jusqu'à l'orbite.
function decollerLanceurColonie(v, a) {
  const b = baseSur(v, a.id);
  if (!b || !b.lanceurPret) return;
  const l = colonsDe(v, b).filter((m) => !(m.blessure && m.blessure.gravite === 'grave')).slice(0, LANCEUR_COLONIE.places);
  if (!l.length) return Orbiteur.log('Aucun colon en état de partir.');
  if (!confirm(`Décollage du lanceur de la base ${de(a)}.\n\nÀ bord : ${listeNoms(l.map(nomMembre))}.\nIl faut atteindre l’orbite, ≈ ${fmt(besoinAtterrisseur(a) * 1.2 / 1000, 1)} km/s, puis rejoindre l’orbiteur.\n\nDécoller ?`)) return;
  const f = megaFusee('equipage');
  f.nomLanceur = `Lanceur de la base ${de(a)}`;
  etat.destination = a.id;
  lancer({ voyage: true, fusee: f, carburant: f.carburant, bases: basesSur(a.id), site: { x: b.x + 150 }, depuisSol: true, equipier: equipierDeMembre(l[0]), passagers: l.slice(1).map((m) => m.id), rover: null });
  etat.vol.lanceurColonie = idBase(b);
}
// Fin du vol du lanceur : en orbite, les colons rejoignent l'orbiteur (ou la station s'il est plein) ; sinon, perdus.
function finLanceurColonie(v, r, reussi) {
  const vol = etat.vol, b = baseDe(v, vol.lanceurColonie), a = r.astre;
  const ids = [vol.equipier && vol.equipier.id, ...(vol.passagers || [])].filter(Boolean);
  const membres = ids.map((id) => v.equipe.find((m) => m.id === id)).filter(Boolean);
  if (vol.equipier && vol.equipier.principal) membres.unshift(v.equipe.find((m) => m.principal));
  const noms = listeNoms(membres.map(nomMembre));
  if (r.cause === 'abandon' && !(vol.stats && vol.stats.altMax > 50)) return Orbiteur.log('Décollage annulé : le lanceur reste sur son pas de tir.');
  if (b) { b.lanceurPret = false; b.lanceursPartis = (b.lanceursPartis || 0) + 1; }
  if (reussi) {
    const st = stationSur(v, a.id);
    for (const m of membres) {
      m.colon = false;
      if (placesLibres(v, 'orbiteur') > 0) { m.etat = 'bord'; m.lieu = null; } else if (st) { m.etat = 'station'; m.lieu = 'st:' + st.id; }
      else { m.etat = 'bord'; m.lieu = null; }
    }
    Orbiteur.log(`🚀 ${noms} ${membres.length > 1 ? 'ont quitté' : 'a quitté'} ${le(a)} à bord du lanceur construit sur place : de retour en orbite.`);
    return;
  }
  for (const m of membres) {
    if (m.principal) v.equipagePerdu = true; else m.etat = 'perdu';
    noterPerte(v, nomMembre(m), a.id, causeVol(r.cause));
  }
  verifierEquipageEntierPerdu(v);
  Orbiteur.log(`💥 Le lanceur de la base ${de(a)} est perdu, avec ${noms}.`);
}

// Dans les textes de la sortie : la base, quand on est sorti de la base ; sinon le module.
Object.assign(Exploration.prototype, {
  abri(forme) {
    const b = !!(this.vol && this.vol.depuisBase);
    return { au: b ? 'à la base' : 'au module', du: b ? 'de la base' : 'du module', le: b ? 'la base' : 'le module', Le: b ? 'Base' : 'Module', nom: b ? 'base' : 'module' }[forme];
  },
});
