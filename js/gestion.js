'use strict';
// Gestion des bases et des colonies (version simple), dans l'esprit du jeu : on vient en scientifique respectueux,
// pas en conquérant. La main-d'œuvre est faite de robots ; on prélève peu, on ne pollue pas, on protège
// d'éventuelles traces de vie.
// - Ressources de la planète : ce qu'on peut tirer sur place (eau, métaux, gaz, énergie, sol cultivable en serre).
// - Robots de la base (2 par niveau) répartis entre mine, serres, énergie et entretien.
// - Empreinte : grandit avec la mine (deux fois moins en mode sobre, le mode par défaut) ; zone protégée si la vie est possible.
// - Astromobile de colonie (base de niveau 3) : cabine pressurisée, zone de vie, recharge, soute ; expéditions de plusieurs jours.

const TRAVAUX = {
  mine: { icone: '⛏', nom: 'Mine', effet: 'matériaux (plus de robots, plus de production, plus d’empreinte)' },
  serres: { icone: '🌱', nom: 'Serres', effet: '2 kg de vivres par jour et par robot, pour les colons' },
  energie: { icone: '🔆', nom: 'Énergie', effet: 'panneaux et batteries : un robot par niveau, sinon tout tourne au ralenti' },
  entretien: { icone: '🔧', nom: 'Entretien', effet: 'moins d’usure, donc moins de pannes' },
};
const ROVER_COLONIE = { materiaux: 8000, duree: 30 * JOUR, niveau: 3 };

function robotsBase(b) { return 2 * (b.niveau || 1); }
function travauxDe(b) {
  if (!b.travaux) {
    // Par défaut : un robot par niveau à l'énergie, la mine à son régime habituel, le reste aux serres et à l'entretien.
    const n = robotsBase(b), niv = b.niveau || 1;
    b.travaux = { energie: niv, mine: mineParDefaut(b), serres: 0, entretien: 0 };
    let reste = n - b.travaux.energie - b.travaux.mine;
    while (reste > 0) { const k = b.travaux.serres <= b.travaux.entretien ? 'serres' : 'entretien'; b.travaux[k]++; reste--; }
  }
  // Un nouveau niveau apporte deux robots : ils vont à l'énergie, puis à l'entretien.
  const libres = robotsBase(b) - Object.values(b.travaux).reduce((s, x) => s + x, 0);
  if (libres > 0) { const e = Math.max(0, (b.niveau || 1) - b.travaux.energie); b.travaux.energie += Math.min(e, libres); b.travaux.entretien += libres - Math.min(e, libres); }
  if (b.sobre === undefined) b.sobre = true;
  return b.travaux;
}
// Régime habituel de la mine (la production d'avant la gestion des robots).
function mineParDefaut(b) { return Math.max(1, Math.floor((b.niveau || 1) / 2)); }
function zoneProtegee(v) { return !!(typeof butsDe === 'function' && v.systeme !== 'solaire' && butsDe(v).vie); }

// Ressources de la planète, en clair.
function ressourcesPlanete(a) {
  const l = [];
  const r = ressourceLocale(a)[0];
  if (r) l.push(['💧', r]);
  if (a.type === 'solide') l.push(['🪨', 'métaux et silicates du régolithe (mine, à partir du niveau 2)']);
  if (a.atmosphere && a.atmosphere.pression > 0) l.push(['🌫', `gaz de l’atmosphère (${fmt(a.atmosphere.pression / 101325, 3)} bar) : azote, CO₂… à capter pour les serres`]);
  const flux = typeof fluxSolaire === 'function' ? fluxSolaire(a) : null;
  l.push(['🔆', flux ? `énergie : ${fmt(flux)} W/m² de lumière` : 'énergie : panneaux solaires, et un petit réacteur au-delà de Mars']);
  l.push(['🌱', 'sol cultivable : seulement en serre, avec le régolithe lavé et enrichi']);
  return l;
}

// Appelé dans la boucle des bases (orbiteur.js) : agit sur la production du jour.
function gererProduction(v, b, a, prod, mat, dt, log) {
  const t = travauxDe(b), jours = dt / JOUR, n = b.niveau || 1;
  // Énergie : sans assez de robots aux panneaux, tout tourne à 70 %.
  const ralenti = t.energie < n ? 0.7 : 1;
  if (ralenti < 1 && !b.alerteEnergie) { b.alerteEnergie = true; log(`🔆 Base ${de(a)} : pas assez de robots à l’énergie, tout tourne au ralenti.`); }
  if (ralenti === 1) b.alerteEnergie = false;
  // Mine : proportionnelle aux robots (régime habituel = ×1, en mode sobre) ; hors mode sobre, moitié plus ;
  // zone protégée (vie possible), moitié moins.
  const facteurMine = Math.min(2, t.mine / mineParDefaut(b)) * (b.sobre ? 1 : 1.5) * (zoneProtegee(v) ? 0.5 : 1);
  mat *= facteurMine * ralenti;
  prod *= ralenti;
  // Empreinte : grandit avec ce qu'on prélève, se résorbe un peu (restauration des sites).
  b.empreinte = Math.max(0, (b.empreinte || 0) + mat / 2e5 - 0.002 * jours);
  // Serres : des vivres pour les colons.
  if (t.serres && typeof colonsDe === 'function' && colonsDe(v, b).length) {
    const k = b.reserve || (b.reserve = { vivres: 0, eau: 0 });
    k.vivres = Math.min(2000, (k.vivres || 0) + 2 * t.serres * jours * ralenti);
  }
  // Usure : l'entretien la compense (voir activites.js pour les pannes).
  b.usure = Math.max(0, (b.usure || 0) + jours * (0.01 * n - 0.008 * t.entretien));
  // Astromobile de colonie : chantier, puis expéditions au sol.
  if (b.chantierRover && v.t >= b.chantierRover.fin) { delete b.chantierRover; b.roverColonie = true; log(`🚙 Base ${de(a)} : l’astromobile de colonie est prête (cabine pressurisée, zone de vie, recharge, soute à matériaux).`); }
  if (b.expeditionSol && v.t >= b.expeditionSol.fin) finExpeditionSol(v, b, a, log);
  return { prod, mat };
}
function texteEmpreinte(b) {
  const e = b.empreinte || 0;
  return e < 0.5 ? '🍃 faible' : e < 2 ? '🌿 modérée' : '⚠ forte (réduisez la mine, ou passez en mode sobre)';
}

// ---------- Astromobile de colonie et expéditions au sol ----------
function construireRoverColonie(v, b, a) {
  const st = stationSur(v, a.id);
  if (!st || (st.stock.materiaux || 0) < ROVER_COLONIE.materiaux) return Orbiteur.log(`Il faut ${fmt(ROVER_COLONIE.materiaux / 1000)} t de matériaux à la station ${de(a)} pour l’astromobile de colonie.`);
  st.stock.materiaux -= ROVER_COLONIE.materiaux;
  b.chantierRover = { fin: v.t + ROVER_COLONIE.duree };
  Orbiteur.log(`🚙 Base ${de(a)} : les robots assemblent l’astromobile de colonie (${fmtDuree(ROVER_COLONIE.duree)}).`);
}
function partirExpeditionSol(v, b, a, jours) {
  const colons = typeof colonsDe === 'function' ? colonsDe(v, b).filter((m) => !m.blessure) : [];
  if (!colons.length) return Orbiteur.log('Pas de colon disponible pour partir avec l’astromobile.');
  const equipage = colons.slice(0, 2);
  b.expeditionSol = { fin: v.t + jours * JOUR, jours, km: Math.round(jours * 25), membres: equipage.map((m) => m.id) };
  Orbiteur.log(`🚙 ${listeNoms(equipage.map(nomMembre))} part${equipage.length > 1 ? 'ent' : ''} en astromobile pour ${nombre(jours, 'jour')}, jusqu’à ${fmt(jours * 25 / 2)} km de la base.`);
}
const DECOUVERTES_SOL = [
  'un champ de blocs d’un autre âge, posés là par un ancien impact',
  'une falaise striée de couches : des millions d’années d’histoire de la planète',
  'un ancien lit de rivière asséché',
  'une source de gaz tiède au fond d’une crevasse',
  'des cristaux de sel en grandes plaques',
  'une grotte de lave, abri naturel pour une future station',
];
function finExpeditionSol(v, b, a, log) {
  const x = b.expeditionSol;
  delete b.expeditionSol;
  const membres = (v.equipe || []).filter((m) => x.membres.includes(m.id));
  const trouve = DECOUVERTES_SOL[Math.floor(Math.random() * DECOUVERTES_SOL.length)];
  const n = Math.max(1, Math.round(x.jours / 2));
  b.echantillonsSol = (b.echantillonsSol || 0) + n;
  v.echantillonsABord = v.echantillonsABord || {};
  log(`🚙 Retour de l’astromobile à la base ${de(a)} après ${fmt(x.km)} km : ${listeNoms(membres.map(nomMembre))} ${membres.length > 1 ? 'ont' : 'a'} trouvé ${trouve}, et rapporté ${nombre(n, 'échantillon')}. Seules les traces des roues restent.`);
}

// ---------- Fenêtre « Gérer la base » ----------
function htmlGestionBase(v, a) {
  const b = (v.bases || []).find((x) => x.astre === a.id && !x.deploiement);
  return b ? '<button id="nav-gestion-base">🏗 Gérer la base (robots, ressources, astromobile)</button>' : '';
}
function ouvrirGestionBase(v, a, apres) {
  const b = (v.bases || []).find((x) => x.astre === a.id && !x.deploiement);
  if (!b) return;
  const rendu = () => {
    const t = travauxDe(b), n = robotsBase(b), libres = n - Object.values(t).reduce((s, x) => s + x, 0);
    const colons = typeof colonsDe === 'function' ? colonsDe(v, b) : [];
    const m = $('modale');
    m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🏗 ${majuscule(nomBase(a))}, niveau ${b.niveau || 1}</h2>
      <p>On vient en scientifique : prélever peu, ne rien polluer, laisser l’endroit comme on l’a trouvé. Le travail est fait par ${nombre(n, 'robot')}.</p></div><button class="fermer">✕</button></header>
      <section><h3>Ressources ${de(a)}</h3><ul>${ressourcesPlanete(a).map(([i, x]) => `<li>${i} ${x}</li>`).join('')}</ul></section>
      <section><h3>Robots (${n}${libres ? `, ${libres} libre${libres > 1 ? 's' : ''}` : ''})</h3><ul>${Object.entries(TRAVAUX).map(([k, x]) => `<li>${x.icone} <b>${x.nom}</b> : ${t[k]} <button data-moins="${k}" ${t[k] ? '' : 'disabled'}>−</button> <button data-plus="${k}" ${libres > 0 || Object.values(t).some((q) => q > 0) ? '' : 'disabled'}>+</button><br><span class="doux">${x.effet}</span></li>`).join('')}</ul>
      <p><label><input type="checkbox" id="gestion-sobre" ${b.sobre ? 'checked' : ''}> Mode sobre : la mine prélève le strict nécessaire (sinon, moitié plus, et l’empreinte grandit plus vite)</label>${zoneProtegee(v) ? '<br>🦠 Zone protégée : des traces de vie sont possibles, la mine est encore réduite de moitié.' : ''}</p>
      <p>Empreinte sur l’environnement : <b>${texteEmpreinte(b)}</b>. Usure : ${fmt(Math.min(100, (b.usure || 0) * 100))} %.</p></section>
      <section><h3>🚙 Astromobile de colonie</h3>${b.roverColonie
        ? (b.expeditionSol ? `<p>En expédition, retour le ${fmtDate(b.expeditionSol.fin, false)}.</p>`
          : colons.length ? `<p>Cabine pressurisée, zone de vie, recharge, soute. Partir explorer loin de la base :</p><p>${[3, 7, 15].map((j) => `<button data-sol="${j}">${j} jours</button>`).join(' ')}</p>` : '<p class="doux">Il faut des colons à la base pour partir en expédition.</p>')
        : b.chantierRover ? `<p>En construction, prête le ${fmtDate(b.chantierRover.fin, false)}.</p>`
          : (b.niveau || 1) >= ROVER_COLONIE.niveau ? `<button id="gestion-rover">Construire l’astromobile de colonie (${fmt(ROVER_COLONIE.materiaux / 1000)} t de matériaux de la station)</button>` : `<p class="doux">À partir d’une base de niveau ${ROVER_COLONIE.niveau}.</p>`}</section>
      <div class="actions"><span></span><button class="principal fermer2">Fermer</button></div></div>`;
    m.classList.remove('cache');
    const fin = () => { Infos.fermer(); if (apres) apres(); };
    m.querySelector('.fermer').onclick = fin;
    m.querySelector('.fermer2').onclick = fin;
    m.querySelectorAll('[data-moins]').forEach((bt) => { bt.onclick = () => { t[bt.dataset.moins]--; rendu(); }; });
    m.querySelectorAll('[data-plus]').forEach((bt) => { bt.onclick = () => {
      const k = bt.dataset.plus;
      if (n - Object.values(t).reduce((s, x) => s + x, 0) <= 0) {   // pas de robot libre : on en prend un ailleurs
        const autre = ['entretien', 'serres', 'mine', 'energie'].find((x) => x !== k && t[x] > 0);
        if (!autre) return;
        t[autre]--;
      }
      t[k]++; rendu();
    }; });
    $('gestion-sobre').onchange = (e) => { b.sobre = e.target.checked; rendu(); };
    const br = $('gestion-rover'); if (br) br.onclick = () => { construireRoverColonie(v, b, a); rendu(); };
    m.querySelectorAll('[data-sol]').forEach((bt) => { bt.onclick = () => { partirExpeditionSol(v, b, a, Number(bt.dataset.sol)); rendu(); }; });
  };
  rendu();
}
