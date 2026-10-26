'use strict';
// Journal de bord à deux niveaux (carte 4, point 9).
// Essentiel : ce qu'il faut savoir ou faire (manœuvres, arrivées, pertes, constructions, découvertes…).
// Détail : le reste (confirmations d'actions, refus, navigation technique, routine…), visible avec « Tout afficher ».
// Le classement se fait à l'affichage, d'après le texte : les journaux des parties en cours en profitent aussi.

const JOURNAL_ALERTES = [
  /s’est écrasée?/, /expédition est perdue/, /Échec du lancement/, /Atterrisseur perdu/, /contact perdu/,
  /aucune trajectoire possible/, /cargo perdu/, /n’a pas survécu/, /grillé par le rayonnement/,
  /Réservoir de l’orbiteur vide/, /Carburant insuffisant/, /Manœuvre ratée/, /perdue? dans l’espace/,
  /Plus d’oxygène/, /a écrasé (le robot|la combinaison)/, /a eu raison/, /Le rayonnement a /, /Batterie vide/,
];
const JOURNAL_ESSENTIEL = [
  /^✨/, /^📍/, /^🚗/, /^☀️/,                                           // découvertes, traces réelles, voiture rouge
  /^Manœuvre prête/,                                                    // manœuvres à faire
  /Arrivée en orbite basse/, /Cargo arrivé/, /Conteneur récupéré/, /est de retour/, /Retour sur Terre/,
  /^Arrivée dans le/, /^Données reçues/, /est en orbite\s:\sdonnées/,    // arrivées et retours
  /est construite/, /Base construite/, /la base est opérationnelle/, /La base passe au niveau/, /est agrandie/,
  /^Atelier .* (terminée?|fabriquée?)/,                                 // constructions terminées
  /^Début de la campagne/, /^Expédition n°/, /Injection translunaire/, /Le 3e étage/, /^Départ pour/,
  /rangés? à bord/, /De retour à bord/, /Robot rentré/, /Robot rappelé/, /Le robot reste sur place/, /Fin de la promenade/,
];

function classerEntreeJournal(texte) {
  const alerte = JOURNAL_ALERTES.some((r) => r.test(texte));
  const essentiel = alerte || JOURNAL_ESSENTIEL.some((r) => r.test(texte));
  // Découverte : la ligne courte s'arrête à « Découverte sur la Lune » ; le texte complet se lit en dépliant.
  const m = /^(✨ Découverte [^:]*?)\s:\s/.exec(texte);
  return { niveau: essentiel ? 'essentiel' : 'detail', alerte, resume: m ? m[1] : texte };
}

// Date courte (15/02/2029) : la ligne essentielle garde la place pour le texte.
function fmtDateCourte(t) {
  const d = new Date((t / 86400 + 2451545.0 - 2440587.5) * 86400000);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function journalToutAfficher() { try { return localStorage.getItem('fusee-journal-tout') === 'oui'; } catch (e) { return false; } }

// HTML de la liste du journal (la plus récente en haut). Les alertes pas encore lues passent en tête.
function htmlJournal(v) {
  const vues = v.alertesLues || 0;
  const entrees = v.journal.map((j) => ({ ...j, ...classerEntreeJournal(j.texte) })).reverse();
  const nonLues = entrees.filter((e) => e.alerte && e.t > vues);
  const ligne = (e) => `<li class="${e.niveau}${e.alerte ? ' alerte' : ''}" title="Toucher pour déplier">
      <span class="doux">${fmtDateCourte(e.t)}</span> <span class="j-resume">${e.alerte ? '⚠ ' : ''}${e.resume}</span><span class="j-complet"><span class="doux">${fmtDate(e.t)}</span> ${e.texte}</span></li>`;
  return `<div class="barre-journal"><span class="doux">${entrees.filter((e) => e.niveau === 'essentiel').length} entrées essentielles, ${entrees.length} en tout</span>
      <button id="journal-tout">${journalToutAfficher() ? 'L’essentiel seulement' : 'Tout afficher'}</button></div>
    ${nonLues.length ? `<h3>⚠ À lire</h3><ol class="journal journal-niveaux">${nonLues.map(ligne).join('')}</ol>` : ''}
    <ol class="journal journal-niveaux ${journalToutAfficher() ? 'tout' : ''}" id="liste-journal">${entrees.map(ligne).join('')}</ol>`;
}

function brancherJournal(m, v) {
  const b = m.querySelector('#journal-tout'), l = m.querySelector('#liste-journal');
  if (b) b.onclick = () => {
    const tout = !journalToutAfficher();
    try { localStorage.setItem('fusee-journal-tout', tout ? 'oui' : 'non'); } catch (e) { /* ignoré */ }
    l.classList.toggle('tout', tout);
    b.textContent = tout ? 'L’essentiel seulement' : 'Tout afficher';
  };
  m.querySelectorAll('.journal-niveaux li').forEach((li) => { li.onclick = () => li.classList.toggle('deplie'); });
  // Les alertes affichées sont considérées comme lues à la fermeture du journal.
  const fin = v.journal.length ? v.journal[v.journal.length - 1].t : 0;
  return () => { v.alertesLues = Math.max(v.alertesLues || 0, fin); };
}
