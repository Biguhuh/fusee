'use strict';
// Activités sur les infrastructures (bases, colonies, stations orbitales) : pannes, maintenance, et la vie sur place.
// - Bases : l'usure (gestion.js) finit par causer des pannes (sas, poussière sur les panneaux, recycleur, foreuse, serre),
//   chacune ralentit la base de 20 %. Les robots d'entretien les réparent seuls ; une sortie de colons va plus vite.
// - Stations : leurs pannes se réparent en sortie (eva-missions.js) ; on peut aussi faire un grand entretien.
// - Activités : une à la fois par infrastructure, sur quelques jours, avec un résultat au journal.

const PANNES_BASE = {
  sas: { icone: '🚪', nom: 'Joint de sas qui fuit', ref: 'sur l’ISS, les joints des sas sont changés régulièrement' },
  poussiere: { icone: '🌫', nom: 'Panneaux couverts de poussière', ref: 'Spirit et Opportunity ont perdu de l’énergie ainsi, jusqu’à ce qu’un tourbillon les nettoie' },
  recycleur: { icone: '💧', nom: 'Recycleur d’eau encrassé', ref: 'le recycleur d’urine de l’ISS a souvent demandé des réparations' },
  foreuse: { icone: '⛏', nom: 'Foreuse bloquée', ref: 'la foreuse de Curiosity s’est bloquée en 2016 ; la NASA a inventé une autre façon de forer' },
  serre: { icone: '💡', nom: 'Lampes de la serre grillées', ref: 'les serres Veggie de l’ISS poussent sous des LED rouges et bleues' },
};
const ACTIVITES = {
  experience: { icone: '🔬', nom: 'Expérience scientifique', jours: 5, humains: true, ou: ['base', 'station'] },
  observation: { icone: '🔭', nom: 'Nuit d’observation du ciel', jours: 1, humains: true, ou: ['base', 'station'] },
  recolte: { icone: '🥬', nom: 'Récolte de la serre', jours: 2, ou: ['base'] },
  entretien: { icone: '🧹', nom: 'Grand entretien', jours: 5, ou: ['base', 'station'] },
  fete: { icone: '🎉', nom: 'Fête sur place', jours: 1, humains: true, ou: ['base', 'station'] },
};
const RESULTATS_EXPERIENCES = {
  base: ['les échantillons du sol révèlent des grains plus vieux que prévu', 'un sismomètre enregistre un petit séisme lointain', 'une plante pousse mieux que sur Terre dans la serre : la faible gravité lui plaît', 'les mesures de rayonnement au sol confirment l’épaisseur de blindage choisie'],
  station: ['une flamme sans gravité forme une petite boule bleue', 'des cristaux de protéines poussent plus réguliers qu’au sol', 'les muscles des volontaires fondent moins vite avec le nouveau programme de sport', 'un alliage coulé en apesanteur se révèle plus homogène'],
};
const OBSERVATIONS = ['une pluie d’étoiles filantes, rare ici', 'une comète à longue queue, inconnue des catalogues', 'le passage d’une lune devant l’étoile', 'une aurore pâle à l’horizon', 'la Voie lactée, d’une netteté impossible depuis la Terre'];

// Les humains présents : colons de la base, occupants de la station, ou équipage de l’orbiteur amarré.
function humainsA(v, lieu) {
  const l = (v.equipe || []).filter((m) => (m.etat === 'base' || m.etat === 'station') && m.lieu === lieu);
  if (lieu.startsWith('st:') && v.amarre === lieu.slice(3)) l.push(...(v.equipe || []).filter((m) => m.etat === 'bord'));
  return l.filter((m) => !(m.blessure && m.blessure.gravite === 'grave'));
}
function lieuInfra(x, type) { return type === 'base' ? idBase(x) : 'st:' + x.id; }

// ---------- Pannes des bases ----------
function mettreAJourPannesBases(v, log) {
  for (const b of v.bases || []) {
    if (b.deploiement) continue;
    b.pannes = b.pannes || [];
    // Une panne tous les 2 à 6 mois quand l'usure dépasse 30 %.
    if (!b.prochainePanne) b.prochainePanne = v.t + (60 + Math.random() * 120) * JOUR;
    if (v.t >= b.prochainePanne) {
      b.prochainePanne = v.t + (60 + Math.random() * 120) * JOUR;
      const libres = Object.keys(PANNES_BASE).filter((k) => !b.pannes.some((p) => p.type === k));
      if ((b.usure || 0) > 0.3 && libres.length) {
        const k = libres[Math.floor(Math.random() * libres.length)];
        b.pannes.push({ type: k, t: v.t });
        log(`${PANNES_BASE[k].icone} Base ${de(ASTRES_PAR_ID[b.astre])} : ${PANNES_BASE[k].nom.toLowerCase()} (base ralentie de 20 %).`);
      }
    }
    // Les robots d'entretien réparent seuls : 10 jours pour un robot, plus vite à plusieurs.
    const ent = (b.travaux && b.travaux.entretien) || 0;
    for (const p of b.pannes.slice()) {
      if (ent > 0 && v.t - p.t > (10 / ent) * JOUR) {
        b.pannes = b.pannes.filter((x) => x !== p);
        b.usure = Math.max(0, (b.usure || 0) - 0.2);
        log(`🔧 Base ${de(ASTRES_PAR_ID[b.astre])} : les robots d’entretien ont réparé : ${PANNES_BASE[p.type].nom.toLowerCase()}.`);
      }
    }
  }
}
// Une sortie de maintenance des colons répare une panne tout de suite.
function reparerParColons(v, b, k) {
  const h = humainsA(v, idBase(b));
  if (!h.length) return;
  b.pannes = (b.pannes || []).filter((p) => p.type !== k);
  b.usure = Math.max(0, (b.usure || 0) - 0.2);
  Orbiteur.log(`🔧 ${majuscule(h[0].principal ? nomSpatio() : h[0].nom)} sort réparer à la base ${de(ASTRES_PAR_ID[b.astre])} : ${PANNES_BASE[k].nom.toLowerCase()}. C’est réglé. (Pour l’anecdote : ${PANNES_BASE[k].ref}.)`);
}
// Production ralentie par les pannes de la base.
const _gererProductionActivites = gererProduction;
gererProduction = function (v, b, a, prod, mat, dt, log) {
  const r = _gererProductionActivites(v, b, a, prod, mat, dt, log);
  const f = Math.pow(0.8, (b.pannes || []).length);
  return { prod: r.prod * f, mat: r.mat * f };
};

// ---------- Activités ----------
function lancerActivite(v, x, type, k) {
  const A = ACTIVITES[k];
  x.activite = { k, fin: v.t + A.jours * JOUR };
  Orbiteur.log(`${A.icone} ${A.nom} ${type === 'base' ? `à la base ${de(ASTRES_PAR_ID[x.astre])}` : `à ${le(x)}`} (${nombre(A.jours, 'jour')}).`);
}
function finirActivites(v, log) {
  const tous = [...(v.bases || []).map((b) => [b, 'base']), ...(v.stations || []).map((s) => [s, 'station'])];
  for (const [x, type] of tous) {
    const act = x.activite;
    if (!act || v.t < act.fin) continue;
    delete x.activite;
    const A = ACTIVITES[act.k], ou = type === 'base' ? `Base ${de(ASTRES_PAR_ID[x.astre])}` : majuscule(le(x));
    const h = humainsA(v, lieuInfra(x, type));
    const qui = h.length ? majuscule(h[0].principal ? nomSpatio() : h[0].nom) : 'Les robots';
    const hasard = (l) => l[Math.floor(Math.random() * l.length)];
    if (act.k === 'experience') { v.science = (v.science || 0) + 1; log(`${A.icone} ${ou} : ${qui} termine l’expérience : ${hasard(RESULTATS_EXPERIENCES[type])}.`); }
    if (act.k === 'observation') log(`${A.icone} ${ou} : nuit d’observation, ${hasard(OBSERVATIONS)}.`);
    if (act.k === 'recolte') { const k = x.reserve || (x.reserve = { vivres: 0, eau: 0 }); const kg = 20 + 20 * ((x.travaux && x.travaux.serres) || 0); k.vivres = (k.vivres || 0) + kg; log(`${A.icone} ${ou} : récolte de la serre, ${fmt(kg)} kg de vivres frais.`); }
    if (act.k === 'entretien') {
      if (type === 'base') { x.usure = 0; log(`${A.icone} ${ou} : grand entretien terminé, la base est comme neuve.`); }
      else { x.prochainePanne = Math.max(x.prochainePanne || v.t, v.t) + 120 * JOUR; log(`${A.icone} ${ou} : grand entretien terminé ; la prochaine panne attendra.`); }
    }
    if (act.k === 'fete') {
      const talents = h.flatMap((m) => (typeof specialitesDe === 'function' ? specialitesDe(m.principal ? SPATIO : m.profil, m.principal) : []).filter((t) => typeof MOMENTS_TALENTS !== 'undefined' && MOMENTS_TALENTS[t]).map((t) => [m, t]));
      const [m, t] = talents.length ? hasard(talents) : [null, null];
      log(`${A.icone} ${ou} : petite fête${m ? ` ; ${m.principal ? nomSpatio() : m.nom} ${hasard(MOMENTS_TALENTS[t])}` : ' ; on rit, on mange, on regarde les étoiles.'}`);
    }
  }
}
function mettreAJourActivites(v, log) {
  mettreAJourPannesBases(v, log);
  finirActivites(v, log);
}

// ---------- Fenêtre « Activités » (astre de l'orbiteur) ----------
function htmlActivites(v, a) {
  const b = (v.bases || []).find((x) => x.astre === a.id && !x.deploiement), st = stationSur(v, a.id);
  if (!b && !st) return '';
  const pannes = ((b && b.pannes) || []).length + ((st && st.pannes) || []).length;
  return `<button id="nav-activites">🧰 Activités et maintenance${pannes ? ` (⚠ ${nombre(pannes, 'panne')})` : ''}</button>`;
}
function ouvrirActivites(v, a, apres) {
  const rendu = () => {
    const b = (v.bases || []).find((x) => x.astre === a.id && !x.deploiement), st = stationSur(v, a.id);
    const bloc = (x, type) => {
      const h = humainsA(v, lieuInfra(x, type));
      const nom = type === 'base' ? majuscule(nomBase(a)) : majuscule(le(x));
      const pannes = type === 'base'
        ? (x.pannes || []).map((p) => `<li>${PANNES_BASE[p.type].icone} ${PANNES_BASE[p.type].nom} ${h.length ? `<button data-reparer="${p.type}">Sortie de réparation</button>` : '<span class="doux">(les robots d’entretien s’en chargent)</span>'}</li>`).join('')
        : (x.pannes || []).map((p) => `<li>${PANNES_STATION[p.type].icone} ${PANNES_STATION[p.type].nom} <span class="doux">(réparation en sortie extravéhiculaire)</span></li>`).join('');
      const acts = Object.entries(ACTIVITES).filter(([, A]) => A.ou.includes(type)).map(([k, A]) => {
        const ok = !x.activite && (!A.humains || h.length);
        return `<button data-act="${type}:${k}" ${ok ? '' : 'disabled'} title="${A.humains && !h.length ? 'Personne sur place' : ''}">${A.icone} ${A.nom} (${nombre(A.jours, 'jour')})</button>`;
      }).join(' ');
      return `<h3>${type === 'base' ? '🏠' : '🛰'} ${nom}</h3><p class="doux">${h.length ? `Sur place : ${listeNoms(h.map((m) => (m.principal ? majuscule(nomSpatio()) : m.nom)))}.` : 'Personne sur place : seuls les robots travaillent.'}${type === 'base' ? ` Usure : ${fmt(Math.min(100, (x.usure || 0) * 100))} %.` : ''}</p>`
        + (pannes ? `<ul>${pannes}</ul>` : '<p class="doux">Aucune panne.</p>')
        + (x.activite ? `<p>En cours : ${ACTIVITES[x.activite.k].icone} ${ACTIVITES[x.activite.k].nom}, jusqu’au ${fmtDate(x.activite.fin, false)}.</p>` : `<p>${acts}</p>`);
    };
    const m = $('modale');
    m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🧰 Activités et maintenance ${de(a)}</h2>
      <p>La vie sur place : expériences, observations, récoltes, entretien, et parfois une fête. Une activité à la fois par lieu.</p></div><button class="fermer">✕</button></header>
      <section>${b ? bloc(b, 'base') : ''}${st ? bloc(st, 'station') : ''}</section>
      <div class="actions"><span></span><button class="principal fermer2">Fermer</button></div></div>`;
    m.classList.remove('cache');
    const fin = () => { Infos.fermer(); if (apres) apres(); };
    m.querySelector('.fermer').onclick = fin;
    m.querySelector('.fermer2').onclick = fin;
    m.querySelectorAll('[data-reparer]').forEach((bt) => { bt.onclick = () => { reparerParColons(v, b, bt.dataset.reparer); rendu(); }; });
    m.querySelectorAll('[data-act]').forEach((bt) => { bt.onclick = () => { const [type, k] = bt.dataset.act.split(':'); lancerActivite(v, type === 'base' ? b : st, type, k); rendu(); }; });
  };
  rendu();
}
