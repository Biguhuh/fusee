'use strict';
// ---------- Plissken : un avis de recherche ----------
// Après la destruction d'une fusée ou d'un atterrisseur, une fois sur 50, une ligne discrète en bas de l'écran
// de résultat (et dans le journal de la campagne). Une seule fois par sauvegarde.

const EGG_PLISSKEN = { id: 'plissken', astre: 'terre', chance: 1 / 50,
  texte: 'Avis de recherche : S. Plissken, pilote, pour vol de fusée. Dernière position connue : au-dessus de New York.' };
const CAUSES_DESTRUCTION = ['ecrasee', 'carburant', 'brulee', 'pressurisee'];

(function () {
  const afficher = afficherResultat;
  afficherResultat = function (r) {
    afficher(r);
    const ancien = $('res-plissken'); if (ancien) ancien.remove();
    if (!CAUSES_DESTRUCTION.includes(r.cause) || eggTrouve(EGG_PLISSKEN.id) || Math.random() >= EGG_PLISSKEN.chance) return;
    const p = document.createElement('p');
    p.id = 'res-plissken'; p.className = 'doux'; p.style.cssText = 'font-size:0.85em;font-style:italic;margin-top:1.2em;opacity:0.8';
    p.textContent = '📠 ' + EGG_PLISSKEN.texte;
    $('res-stats').after(p);
    const v = etat.enVoyage && etat.voyage;
    etat.decouvertes = etat.decouvertes || {};
    etat.decouvertes[EGG_PLISSKEN.id] = { astre: EGG_PLISSKEN.astre, quand: v ? v.t : null, par: nomSpatio() };
    if (v) v.journal.push({ t: v.t, texte: '📠 ' + EGG_PLISSKEN.texte });
    sauver(etat);
  };
})();
