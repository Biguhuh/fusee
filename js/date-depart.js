'use strict';
// Date de départ d'une nouvelle campagne : au choix, de Spoutnik (4 octobre 1957) à 2100 ; aujourd'hui par défaut.
// Le ciel, les saisons, les tempêtes de Mars et les vraies missions suivent la date.

const DATE_MIN_CAMPAGNE = '1957-10-04', DATE_MAX_CAMPAGNE = '2100-12-31';

// « AAAA-MM-JJ » ↔ secondes depuis J2000 (à midi UTC).
function tDeDateISO(s) {
  const [a, m, j] = s.split('-').map(Number);
  return (Date.UTC(a, m - 1, j, 12) / 86400000 + 2440587.5 - J2000_JD) * JOUR;
}
function dateISODeT(t) {
  const d = new Date(((t / JOUR) + J2000_JD - 2440587.5) * 86400000);
  return d.toISOString().slice(0, 10);
}

function choisirDateDepart(suite) {
  const m = $('modale');
  const auj = dateISODeT(dateDuJour());
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>📅 Date de départ</h2>
    <p>La campagne commence à la date de votre choix, de Spoutnik (4 octobre 1957) à 2100. Le ciel, les saisons et les tempêtes de Mars suivent la date ; dans le passé, les vraies missions se déroulent sous vos yeux.</p></div><button class="fermer">✕</button></header>
    <section><label>Date : <input type="date" id="date-depart" min="${DATE_MIN_CAMPAGNE}" max="${DATE_MAX_CAMPAGNE}" value="${auj}"></label>
    <p class="doux" id="date-depart-info"></p>
    <p>${[['1957-10-04', 'Spoutnik'], ['1969-07-16', 'Apollo 11'], ['1997-07-04', 'Pathfinder sur Mars'], ['2012-08-06', 'Curiosity'], [auj, 'Aujourd’hui']].map(([d, n]) => `<button data-date="${d}">${n}</button>`).join(' ')}</p></section>
    <div class="actions"><button id="date-annuler">Annuler</button><button id="date-ok" class="principal">Commencer la campagne</button></div></div>`;
  m.classList.remove('cache');
  const champ = $('date-depart'), info = $('date-depart-info');
  const maj = () => { const ok = champ.value >= DATE_MIN_CAMPAGNE && champ.value <= DATE_MAX_CAMPAGNE; info.textContent = ok ? `Départ le ${fmtDate(tDeDateISO(champ.value), false)}.` : 'Choisissez une date entre 1957 et 2100.'; $('date-ok').disabled = !ok; };
  champ.oninput = maj;
  m.querySelectorAll('[data-date]').forEach((b) => { b.onclick = () => { champ.value = b.dataset.date; maj(); }; });
  maj();
  const fermer = () => Infos.fermer();
  m.querySelector('.fermer').onclick = fermer;
  $('date-annuler').onclick = fermer;
  $('date-ok').onclick = () => { const t = tDeDateISO(champ.value); fermer(); suite(t); };
}
