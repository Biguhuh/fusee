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
