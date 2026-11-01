'use strict';
// ---------- Déchets de l'équipage ----------
// L'équipage produit des déchets (emballages, déchets organiques, filtres usés) : environ 1,5 kg par personne et par
// jour, gardés dans une soute de l'orbiteur. Amarré à une station, on les y vidange ; la station s'en débarrasse peu à
// peu (cargos de retour qui brûlent dans l'atmosphère, comme les Progress de l'ISS). Soute pleine : l'hygiène se dégrade,
// l'équipage rate plus souvent ses manœuvres.

const DECHETS_PAR_JOUR = 1.5;          // kg par personne et par jour
const DECHETS_MAX_ORBITEUR = 300;      // kg : la soute à déchets de l'orbiteur
const DECHETS_STATION = 1000;          // kg par niveau de stockage de la station
const ELIMINATION_STATION = 25;        // kg par jour et par niveau de stockage
const VIDANGE_KG_PAR_HEURE = 100;      // débit du transfert, au sas de la station
const RISQUE_DECHETS = 0.05;           // risque en plus de rater une manœuvre, soute pleine

function capaciteDechetsStation(st) { return DECHETS_STATION * niveauStation(st).stock; }
function fmtKg(q) { return `${fmt(q)} kg`; }
function risqueDechets(v) { return v && (v.dechets || 0) >= DECHETS_MAX_ORBITEUR ? RISQUE_DECHETS : 0; }

// À chaque mise à jour de la campagne : production à bord, élimination dans les stations, fin d'une vidange.
function mettreAJourDechets(v, log, estAmarre) {
  const dt = Math.max(0, v.t - (v.tDechets ?? v.t));
  v.tDechets = v.t;
  const aBord = !v.orb ? 0 : v.equipe ? (v.equipe || []).filter((m) => m.etat === 'bord' && !(m.principal && v.equipagePerdu)).length : (v.equipagePerdu ? 0 : 1);
  const avant = v.dechets || 0;
  v.dechets = Math.min(DECHETS_MAX_ORBITEUR, avant + (aBord * DECHETS_PAR_JOUR * dt) / JOUR);
  if (avant < 0.8 * DECHETS_MAX_ORBITEUR && v.dechets >= 0.8 * DECHETS_MAX_ORBITEUR) log(`🗑 Soute à déchets remplie à 80 % (${fmtKg(v.dechets)}) : vidangez-la à la prochaine station.`);
  if (avant < DECHETS_MAX_ORBITEUR && v.dechets >= DECHETS_MAX_ORBITEUR) log(`🗑 Soute à déchets pleine : l’hygiène se dégrade à bord, l’équipage risque davantage de rater ses manœuvres (+${fmt(RISQUE_DECHETS * 100)} %). Amarrez-vous à une station pour vidanger.`);
  for (const st of v.stations || []) st.dechets = Math.max(0, (st.dechets || 0) - (ELIMINATION_STATION * niveauStation(st).stock * dt) / JOUR);
  // Vidange terminée (si l'orbiteur est resté amarré).
  const vd = v.vidange;
  if (vd && v.t >= vd.fin) {
    v.vidange = null;
    const st = (v.stations || []).find((s) => s.id === vd.st);
    if (!st || !estAmarre(st)) return log('🗑 Vidange interrompue : l’orbiteur s’est désamarré avant la fin.');
    const q = Math.min(vd.kg, v.dechets, capaciteDechetsStation(st) - (st.dechets || 0));
    v.dechets -= q; st.dechets = (st.dechets || 0) + q;
    log(`🗑 Vidange terminée ${au(st)} : ${fmtKg(q)} de déchets transférés. Soute de l’orbiteur : ${fmtKg(v.dechets)}.`);
  }
}

// Ce que la station peut prendre, et combien de temps prend le transfert.
function devisVidange(v, st) {
  const place = Math.max(0, capaciteDechetsStation(st) - (st.dechets || 0));
  const kg = Math.min(v.dechets || 0, place);
  return { kg, place, duree: Math.max(30 * 60, (kg / VIDANGE_KG_PAR_HEURE) * 3600) };
}
