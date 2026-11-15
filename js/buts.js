'use strict';
// Buts dans les autres systèmes : ce qu'une expédition vient y chercher, en scientifique.
// 💧 trouver de l'eau liquide (forage d'une base sous la glace d'une planète tempérée) ;
// 🦠 chercher des traces de vie (se poser sur trois astres du système) : la réponse reste prudente ;
// 🏠 rendre une colonie autonome (des colons dans une base de niveau 3) ;
// 📡 envoyer un message vers la Terre (depuis une station) : il arrive des années plus tard, à la vitesse de la lumière.

const BUTS_SYSTEME = [
  { id: 'eau', icone: '💧', nom: 'Trouver de l’eau liquide', aide: 'une base de niveau 2 sur une planète tempérée qui a de la glace : le forage descend sous la glace' },
  { id: 'vie', icone: '🦠', nom: 'Chercher des traces de vie', aide: 'se poser sur trois astres du système et y prélever des échantillons' },
  { id: 'colonie', icone: '🏠', nom: 'Rendre une colonie autonome', aide: 'des colons installés dans une base de niveau 3 (vivres, eau et énergie sur place)' },
  { id: 'message', icone: '📡', nom: 'Envoyer un message vers la Terre', aide: 'depuis une station du système' },
];
// Ce que disent les échantillons. Rien n'est sûr : on reste prudent, comme les vrais scientifiques.
const VERDICTS_VIE = {
  trappist1: 'des molécules organiques complexes dans la glace : origine inconnue, peut-être purement chimique. Il faudra des années d’analyses.',
  proxima: 'rien de vivant dans les échantillons : les éruptions de l’étoile stérilisent la surface. Le sous-sol reste à explorer.',
  default: 'aucune trace de vie dans les échantillons. L’absence de preuve n’est pas la preuve de l’absence : on continue de chercher.',
};

function butsDe(v, sys = v.systeme) { v.buts = v.buts || {}; return (v.buts[sys] = v.buts[sys] || {}); }
function planeteEauLiquide(v) {
  return (v.bases || []).find((b) => {
    const a = ASTRES_PAR_ID[b.astre];
    return a && (b.niveau || 1) >= 2 && a.tempSurface !== undefined && a.tempSurface > -60 && a.tempSurface < 60 && /glace/.test(ressourceLocale(a)[0] || '');
  });
}
// (Seuls les astres du système affiché sont chargés dans ASTRES_PAR_ID.)
function astresPoses(v) { return Object.keys(v.visites || {}).filter((id) => ASTRES_PAR_ID[id] && v.visites[id].pose); }
function colonieAutonome(v) {
  return (v.bases || []).find((b) => (b.niveau || 1) >= 3 && (v.equipe || []).some((m) => m.colon && m.etat === 'base' && m.lieu === idBase(b)));
}

// Vérifié à chaque pas (orbiteur) : un but atteint est annoncé une fois ; un message arrivé sur Terre aussi.
function verifierButs(v, log) {
  for (const msg of v.messagesTerre || []) {
    if (!msg.recu && v.t >= msg.reception) { msg.recu = true; log(`📡 La Terre reçoit le message envoyé du ${nomSystemeDe(msg.sys)} le ${fmtDate(msg.t, false)}, après ${fmtDureeAnnees((msg.reception - msg.t) / ANNEE_S)} de trajet : « ${msg.texte} »`); }
  }
  if (!v || v.systeme === 'solaire') return;
  const b = butsDe(v);
  const atteint = (id, texte) => { if (b[id]) return; b[id] = v.t; log(`🎯 But atteint dans le ${SYSTEME.nom} : ${texte}`); };
  const e = planeteEauLiquide(v);
  if (e) atteint('eau', `de l’eau liquide sous la glace ${de(ASTRES_PAR_ID[e.astre])}, à quelques centaines de mètres de profondeur. On prélève peu, et on referme le forage.`);
  if (astresPoses(v).length >= 3) atteint('vie', VERDICTS_VIE[v.systeme] || VERDICTS_VIE.default);
  const c = colonieAutonome(v);
  if (c) atteint('colonie', `la colonie ${de(ASTRES_PAR_ID[c.astre])} vit de ses propres ressources, avec ses robots, en prélevant le moins possible.`);
}

function envoyerMessageTerre(v) {
  if (!(v.stations || []).length) return;
  const d = typeof delaiLumiere === 'function' ? delaiLumiere(v.systeme, 'solaire') : 0;
  const texte = `Ici l’expédition du ${SYSTEME.nom}. Nous sommes bien arrivés. ${astresPoses(v).length ? `Nous nous sommes posés sur ${nombre(astresPoses(v).length, 'astre')} d’ici.` : ''} Pensez à nous.`;
  (v.messagesTerre = v.messagesTerre || []).push({ sys: v.systeme, t: v.t, reception: v.t + d, texte });
  butsDe(v).message = v.t;
  Orbiteur.log(`📡 Message envoyé vers la Terre. À la vitesse de la lumière, il arrivera vers ${fmtAnnee(anneeDuJeu(v.t + d))}.`);
}

// Encart de l'orbiteur, dans les autres systèmes.
function htmlButsSysteme(v) {
  if (!v || v.systeme === 'solaire') return '';
  const b = butsDe(v);
  const lignes = BUTS_SYSTEME.map((x) => `<li>${b[x.id] ? '✅' : '⬜'} ${x.icone} ${x.nom}${b[x.id] ? ` <span class="doux">(${fmtDate(b[x.id], false)})</span>` : ` <span class="doux">: ${x.aide}</span>`}</li>`).join('');
  const bouton = !b.message && (v.stations || []).length ? '<button id="nav-message-terre">📡 Envoyer un message vers la Terre</button>' : '';
  return `<details class="buts-systeme"><summary>🎯 Buts dans le ${SYSTEME.nom} (${BUTS_SYSTEME.filter((x) => b[x.id]).length}/${BUTS_SYSTEME.length})</summary><ul>${lignes}</ul>${bouton}</details>`;
}
