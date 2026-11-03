'use strict';
// ---------- Vivres et eau potable ----------
// Comme sur l'ISS : la nourriture vient de la Terre (≈ 1,8 kg par personne et par jour, emballages compris) ; l'eau
// est recyclée à 98 % (urine, humidité de l'air), mais une partie part dans l'oxygène fabriqué par électrolyse :
// il faut en apporter ≈ 0,5 kg par personne et par jour. Les cargos réguliers ravitaillent les stations ; amarré, on
// fait le plein. Hors de la Terre : l'eau peut venir de la glace des bases ; une petite serre de bord (R&D) produit
// une part des vivres, comme Veggie sur l'ISS (laitue, piments), mais pas tout.
// Pénurie : on prévient tôt ; à sec, rationnement (manœuvres plus souvent ratées), puis des morts :
// sans eau, au bout de 3 jours, puis un par jour ; sans vivres, au bout de 3 semaines, puis un par semaine.

const VIVRES_PAR_JOUR = 1.8;           // kg par personne
const EAU_PAR_JOUR = 0.5;              // kg par personne, après recyclage
const VIVRES_MAX = 2500, EAU_MAX = 800;   // kg à bord de l'orbiteur
const EAU_GLACE_PAR_JOUR = 40;         // kg d'eau par jour et par niveau, pour une base qui exploite de la glace
const RISQUE_RATIONNEMENT = 0.1;       // manœuvres ratées en plus quand on est à sec
const JOURS_AVANT_MORT = { eau: [3, 1], vivres: [21, 7] };   // première mort, puis les suivantes

function vivresMax(v) { return VIVRES_MAX * (1 + 0.25 * niveauAmelio('soutes', v)); }
function eauMax(v) { return EAU_MAX * (1 + 0.25 * niveauAmelio('reservoirs', v)); }
function bouchesABord(v) {
  if (!v.equipe) return v.equipagePerdu ? 0 : 1;
  return v.equipe.filter((m) => (m.etat === 'bord' || m.etat === 'mission') && !(m.principal && v.equipagePerdu)).length;
}
// Consommation par jour de tout l'équipage (la serre produit une part des vivres, mais boit un peu d'eau).
function consommation(v) {
  if (niveauAmelio('ecosysteme', v) >= 1) return { vivres: 0, eau: 0 };   // écosystème fermé : autonomie complète
  const n = bouchesABord(v), serre = niveauAmelio('serre', v);
  return { vivres: n * VIVRES_PAR_JOUR * (1 - 0.1 * serre), eau: n * (EAU_PAR_JOUR + 0.1 * serre) };
}
function joursRestants(v, cle) { const c = consommation(v)[cle]; return c > 0 ? (v[cle] || 0) / c : Infinity; }
function risqueVivres(v) { return v && v.equipe && ((v.eau ?? 1) <= 0 || (v.vivres ?? 1) <= 0) ? RISQUE_RATIONNEMENT : 0; }
function texteJours(j) { return j === Infinity ? '—' : j >= 100 ? `${fmt(j)} j` : `${fmt(j, j < 10 ? 1 : 0)} j`; }
function resumeVivres(v) {
  if (v.vivres === undefined) return '';
  return `🍞 Vivres : ${fmt(v.vivres)} kg (${texteJours(joursRestants(v, 'vivres'))}) · 💧 Eau : ${fmt(v.eau)} kg (${texteJours(joursRestants(v, 'eau'))})`;
}

// Un membre à bord meurt de faim ou de soif.
function mourirDePenurie(v, cause, log) {
  const l = (v.equipe || []).filter((m) => m.etat === 'bord' && !(m.principal && v.equipagePerdu));
  if (!l.length) return;
  const m = l[Math.floor(Math.random() * l.length)];
  const nom = m.principal ? nomSpatio() : m.nom;
  if (m.principal) v.equipagePerdu = true; else m.etat = 'perdu';
  noterPerte(v, nom, v.orb ? v.orb.centre : SYSTEME.origine, cause, lieuAbord(v));   // à bord : en orbite, ou en route
  v.proposerRappel = { nom, acc: accordMembre(m) };
  verifierEquipageEntierPerdu(v);
  log(`💀 ${majuscule(nom)} est mort${accordMembre(m)} : ${cause}.`);
}

// À chaque mise à jour de la campagne.
function mettreAJourVivres(v, log) {
  if (v.vivres === undefined) { v.vivres = vivresMax(v); v.eau = eauMax(v); }
  const dtJ = Math.max(0, v.t - (v.tVivres ?? v.t)) / JOUR;
  v.tVivres = v.t;
  // Eau tirée de la glace par les bases : leur navette la monte à la station de l'astre.
  for (const b of v.bases || []) {
    if (b.deploiement || !/glace/.test(ressourceLocale(ASTRES_PAR_ID[b.astre])[0] || '')) continue;
    const st = stationSur(v, b.astre);
    if (st) st.stock.eau = Math.min(capaciteStation(st, 'eau'), (st.stock.eau || 0) + EAU_GLACE_PAR_JOUR * (b.niveau || 1) * dtJ);
  }
  if (!dtJ || !v.equipe || !v.orb) return;   // pas d'orbiteur en route : l'équipage est sur Terre
  const c = consommation(v);
  for (const cle of ['eau', 'vivres']) {
    const avant = v[cle];
    v[cle] = Math.max(0, avant - c[cle] * dtJ);
    const jours = joursRestants(v, cle), nom = cle === 'eau' ? 'd’eau potable' : 'de vivres';
    // Alertes : à 30, 10 et 3 jours, puis à sec. On réarme quand on a refait le plein.
    v.alertesVivres = v.alertesVivres || {};
    for (const seuil of [30, 10, 3]) {
      const k = cle + seuil;
      if (jours < seuil && !v.alertesVivres[k] && v[cle] > 0) { v.alertesVivres[k] = true; log(`${cle === 'eau' ? '💧' : '🍞'} Plus que ${texteJours(jours)} ${nom} à bord : faites le plein à une station, ou envoyez un ravito « Vivres et eau ».`); }
      if (jours > seuil + 5) v.alertesVivres[k] = false;
    }
    if (v[cle] > 0) { v['sans' + cle] = 0; v['morts' + cle] = 0; continue; }
    if (avant > 0) log(`${cle === 'eau' ? '💧' : '🍞'} Plus ${nom} à bord : rationnement. L’équipage s’affaiblit et rate plus souvent ses manœuvres. ${cle === 'eau' ? 'Sans eau, on meurt en 3 jours.' : 'Sans vivres, on tient environ 3 semaines.'}`);
    v['sans' + cle] = (v['sans' + cle] || 0) + dtJ;
    const [premier, suivants] = JOURS_AVANT_MORT[cle];
    if (v['sans' + cle] >= (v['morts' + cle] ? suivants : premier)) {
      v['sans' + cle] = 0; v['morts' + cle] = (v['morts' + cle] || 0) + 1;
      mourirDePenurie(v, cle === 'eau' ? 'mort de soif, à court d’eau potable' : 'mort de faim, à court de vivres', log);
    }
  }
}
