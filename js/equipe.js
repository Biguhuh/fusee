'use strict';
// Équipe de spationautes de l'expédition. Le ou la spationaute du joueur est simulé en détail (sorties à l'écran) ;
// les autres partent en missions « de fond », simples minuteries : un atterrisseur les dépose sur un astre pour
// une durée choisie, ils prélèvent des échantillons, encaissent la dose du lieu, puis remontent tout seuls.
// Ainsi plusieurs missions avancent en parallèle sans rien coûter au navigateur.

const TAILLE_EQUIPE = 4;            // le joueur + 3 coéquipiers
const TAILLE_EQUIPE_HABITAT = 8;    // avec une station de niveau 4 (habitat)
const NOMS_EQUIPE = ['Inès', 'Hugo', 'Amina', 'Yuki', 'Mateo', 'Sofia', 'Kwame', 'Lena', 'Rahul', 'Chloé', 'Nadia', 'Tomás', 'Aiko', 'Malik', 'Elsa', 'Diego'];
const DUREES_MISSION = [1, 3, 7];   // jours
const HEURES_PAR_ECHANTILLON = 6;
const ECHANTILLONS_MAX_MISSION = 8;

function capaciteEquipe(v) { return v.stations.some((s) => niveauStation(s).habitat) ? TAILLE_EQUIPE_HABITAT : TAILLE_EQUIPE; }

// ---------- Pertes de l'expédition (pour le message du retour sur Terre) ----------
// Chaque perte : { nom, astre, cause, t }. Remises à zéro à chaque nouvelle expédition.
function noterPerte(v, nom, astreId, cause) { (v.pertesEquipage = v.pertesEquipage || []).push({ nom, astre: astreId, cause, t: v.t }); }
function causeSortie(texte) {
  if (/pression/.test(texte)) return 'combinaison écrasée par la pression';
  if (/chaleur/.test(texte)) return 'combinaison détruite par la chaleur';
  if (/rayonnement/.test(texte)) return 'dose mortelle de rayonnement';
  if (/oxygène/.test(texte)) return 'plus d’oxygène';
  if (/libération/.test(texte)) return 'perdu dans l’espace';
  return 'perdu pendant une sortie';
}
function causeVol(c) {
  return { ecrasee: 'atterrisseur écrasé', brulee: 'atterrisseur brûlé', pressurisee: 'atterrisseur écrasé par la pression', irradiee: 'dose mortelle de rayonnement', carburant: 'atterrisseur à court de carburant', pose: 'laissé au sol avec l’atterrisseur' }[c] || 'atterrisseur perdu';
}
// « Inès — dose mortelle de rayonnement, sur Callisto ; Notre spationaute — combinaison écrasée par la pression, sur Vénus »
function textePertes(v) {
  return (v.pertesEquipage || []).map((p) => `${majuscule(p.nom)} — ${p.cause}, ${sur(ASTRES_PAR_ID[p.astre] || { nom: p.astre })}`).join(' ; ');
}

// Nouvelle équipe au départ d'une expédition.
function initialiserEquipe(v) {
  v.equipagePerdu = false;       // nouvelle équipe, nouveau départ (voir le point 10 de la carte 4)
  v.pertesEquipage = [];
  const pris = new Set();
  const nom = () => { const libres = NOMS_EQUIPE.filter((n) => !pris.has(n)); const n = libres[Math.floor(Math.random() * libres.length)] || 'Recrue'; pris.add(n); return n; };
  v.equipe = [{ id: 'e0', nom: nomSpatio(), principal: true, dose: 0, etat: 'bord' }];
  for (let i = 1; i < TAILLE_EQUIPE; i++) v.equipe.push({ id: 'e' + i, nom: nom(), dose: 0, etat: 'bord' });
}

// Recrue supplémentaire (habitat d'une station de niveau 4).
function recruter(v, log) {
  if (v.equipe.length >= capaciteEquipe(v)) return log(`L’équipe est au complet (${capaciteEquipe(v)} places${capaciteEquipe(v) < TAILLE_EQUIPE_HABITAT ? ' ; une station de niveau 4 en accueille 8' : ''}).`);
  const libres = NOMS_EQUIPE.filter((n) => !v.equipe.some((m) => m.nom === n));
  const m = { id: 'e' + Date.now(), nom: libres[0] || 'Recrue', dose: 0, etat: 'bord' };
  v.equipe.push(m);
  log(`${m.nom} rejoint l’équipe (${v.equipe.length}/${capaciteEquipe(v)}).`);
}

// Dose reçue pendant une mission : environ 40 % du temps dehors, le reste dans l'atterrisseur (protégé par son panneau).
function doseMission(a, jours) {
  const sv = doseSurface(a).svJour, c = concevoirAtterrisseur(a);
  const prot = c.ok ? c.fusee.protection : 1;
  return jours * (0.4 * sv + 0.6 * (sv / prot));
}
function echantillonsMission(jours) { return Math.min(ECHANTILLONS_MAX_MISSION, Math.floor((jours * 24) / HEURES_PAR_ECHANTILLON)); }

// Une mission est-elle possible d'ici ? Renvoie un texte d'empêchement, ou '' si tout va bien.
function empechementMission(v, a) {
  if (!v.orb || v.orb.centre !== a.id) return `l’orbiteur doit être ${enOrbite(a)}`;
  if (a.type !== 'solide' || estOrigine(a.id)) return `on ne se pose pas ${sur(a)}`;
  if (AEROSTAT[a.id]) return 'sur Vénus, le module ne peut pas repartir seul';
  if (v.atterrisseurs <= 0) return 'plus d’atterrisseur libre';
  const c = concevoirAtterrisseur(a);
  if (!c.ok) return c.raison;
  if (v.ergolsAtt < c.fusee.carburant) return `pas assez d’ergols pour l’atterrisseur (${fmt(c.fusee.carburant / 1000, 1)} t)`;
  return '';
}

function lancerMission(v, membreId, a, jours, log) {
  const m = v.equipe.find((x) => x.id === membreId);
  if (!m || m.etat !== 'bord') return;
  const pb = empechementMission(v, a);
  if (pb) return log(`Mission impossible : ${pb}.`);
  const c = concevoirAtterrisseur(a);
  v.ergolsAtt -= c.fusee.carburant;
  v.atterrisseurs -= 1;
  m.etat = 'mission';
  m.mission = { astre: a.id, debut: v.t, fin: v.t + jours * JOUR, jours };
  log(`${m.nom} part en mission ${sur(a)} pour ${jours} jour${jours > 1 ? 's' : ''} (${fmtDose(doseSurface(a).svJour)} en surface).`);
}

// Missions terminées : retour à bord avec les échantillons, ou perte si la dose a été mortelle.
function mettreAJourEquipe(v, log) {
  mettreAJourRobotsAuto(v, log);
  for (const m of v.equipe || []) {
    if (m.etat !== 'mission' || v.t < m.mission.fin) continue;
    const a = ASTRES_PAR_ID[m.mission.astre], jours = m.mission.jours;
    m.dose += doseMission(a, jours);
    v.atterrisseurs += 1;                                  // l'atterrisseur remonte seul, avec ou sans équipage
    v.visites[a.id] = { ...(v.visites[a.id] || {}), pose: true };
    if (m.dose >= DOSE_MORTELLE) {
      m.etat = 'perdu';
      noterPerte(v, m.nom, a.id, 'dose mortelle de rayonnement pendant sa mission');
      log(`${m.nom} n’a pas survécu à sa mission ${sur(a)} : dose de ${fmtDoseTotale(m.dose)}. L’atterrisseur est remonté seul.`);
    } else {
      const n = echantillonsMission(jours);
      v.echantillonsABord[a.id] = (v.echantillonsABord[a.id] || 0) + n;
      m.etat = 'bord';
      log(`${m.nom} est de retour ${de(a)} avec ${n} échantillon${n > 1 ? 's' : ''} (dose cumulée ${fmtDoseTotale(m.dose)}).`);
    }
    m.derniere = m.mission.astre;
    delete m.mission;
  }
}

// ---------- Robots de prélèvement automatiques ----------
// Un robot descend seul (aller simple), prélève un échantillon toutes les 12 h, puis lance son conteneur
// d'échantillons en orbite à la fin de la mission. S'il est grillé par le rayonnement avant, tout est perdu.
// Le conteneur attend en orbite que l'orbiteur passe le récupérer.
const DUREES_ROBOT = [3, 7, 30];          // jours
const HEURES_PAR_ECHANTILLON_ROBOT = 12;
const ECHANTILLONS_MAX_ROBOT = 12;
function echantillonsRobot(jours) { return Math.min(ECHANTILLONS_MAX_ROBOT, Math.floor((jours * 24) / HEURES_PAR_ECHANTILLON_ROBOT)); }

function empechementRobotAuto(v, a) {
  if (!v.orb || v.orb.centre !== a.id) return `l’orbiteur doit être ${enOrbite(a)}`;
  if (a.type !== 'solide' || estOrigine(a.id)) return `pas de sol à explorer ${sur(a)}`;
  if (v.robots <= 0) return 'plus de robot à bord';
  return '';
}

function lancerRobotAuto(v, a, blindage, jours, log) {
  const pb = empechementRobotAuto(v, a);
  if (pb) return log(`Robot impossible : ${pb}.`);
  const cout = coutBlindage(a, blindage);
  if (cout.ergols > v.ergolsAtt) return log(`Pas assez d’ergols pour descendre le blindage (${fmt(cout.ergols, 0)} kg).`);
  v.ergolsAtt -= cout.ergols;
  v.robots -= 1;
  v.robotsAuto = v.robotsAuto || [];
  const vie = dureeVieRobot(a, blindage);
  v.robotsAuto.push({ id: 'r' + Date.now(), astre: a.id, blindage, debut: v.t, fin: v.t + jours * JOUR, jours, panne: vie < jours * JOUR ? v.t + vie : null });
  replique('reviendrai');
  log(`Robot de prélèvement largué ${sur(a)} pour ${jours} jours (blindage ${BLINDAGES_ROBOT[blindage].nom.toLowerCase()}).`);
}

function mettreAJourRobotsAuto(v, log) {
  for (const r of v.robotsAuto || []) {
    if (r.fini) continue;
    const a = ASTRES_PAR_ID[r.astre];
    if (r.panne && v.t >= r.panne) {
      r.fini = true;
      log(`Le robot de prélèvement ${de(a)} a été grillé par le rayonnement au bout de ${fmtDuree(r.panne - r.debut)} : ses échantillons sont perdus.`);
    } else if (v.t >= r.fin) {
      r.fini = true;
      const n = echantillonsRobot(r.jours);
      v.conteneurs = v.conteneurs || [];
      v.conteneurs.push({ astre: r.astre, n, t: v.t });
      v.visites[a.id] = { ...(v.visites[a.id] || {}) };
      log(`Le robot ${de(a)} a terminé : conteneur de ${n} échantillon${n > 1 ? 's' : ''} lancé en orbite, à récupérer par l’orbiteur.`);
    }
  }
  if (v.robotsAuto) v.robotsAuto = v.robotsAuto.filter((r) => !r.fini);
  // Conteneurs en orbite : l'orbiteur les récupère quand il est en orbite du même astre.
  if (v.conteneurs && v.orb) {
    for (const c of v.conteneurs.filter((x) => x.astre === v.orb.centre)) {
      v.echantillonsABord[c.astre] = (v.echantillonsABord[c.astre] || 0) + c.n;
      log(`Conteneur récupéré ${enOrbite(ASTRES_PAR_ID[c.astre])} : ${c.n} échantillon${c.n > 1 ? 's' : ''} à bord.`);
    }
    v.conteneurs = v.conteneurs.filter((x) => x.astre !== v.orb.centre);
  }
}

function ouvrirRobotAuto(v, log, apres) {
  const a = ASTRES_PAR_ID[v.orb.centre], d = doseSurface(a), conseil = blindageConseille(a);
  const fen = $('modale');
  fen.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🤖 Robot de prélèvement ${sur(a)}</h2>
    <p>Le robot descend seul, prélève un échantillon toutes les ${HEURES_PAR_ECHANTILLON_ROBOT} h (${ECHANTILLONS_MAX_ROBOT} au plus), puis lance son conteneur en orbite à la fin. Rayonnement en surface : ${fmtDose(d.svJour)}. S’il est grillé avant la fin, ses échantillons sont perdus. ${v.robots} robot${v.robots > 1 ? 's' : ''} à bord.</p></div><button class="fermer">✕</button></header>
    <div class="sections"><section><h3>Blindage</h3>${Object.entries(BLINDAGES_ROBOT).map(([cle, b]) => {
      const vie = dureeVieRobot(a, cle), c = coutBlindage(a, cle);
      return `<label class="choix-ravito"><input type="radio" name="ra-blindage" value="${cle}" ${cle === conseil ? 'checked' : ''} ${c.ergols > v.ergolsAtt ? 'disabled' : ''}> <b>${b.nom}</b>${cle === conseil ? ' <span class="doux">(conseillé)</span>' : ''}<br><span class="doux">tient ${vie > 3650 * 86400 ? 'plus de 10 ans' : fmtDuree(vie)}${b.masse ? ` · ${fmt(c.ergols, 0)} kg d’ergols` : ''}</span></label>`;
    }).join('')}</section>
    <section><h3>Durée</h3>${DUREES_ROBOT.map((j, i) => `<label class="choix-ravito"><input type="radio" name="ra-duree" value="${j}" ${i === 1 ? 'checked' : ''}> <b>${j} jours</b> — ${echantillonsRobot(j)} échantillons</label>`).join('')}</section></div>
    <p id="ra-info" class="doux"></p>
    <div class="actions"><span></span><button id="ra-ok" class="principal">🤖 Larguer le robot</button></div></div>`;
  fen.classList.remove('cache');
  fen.querySelector('.fermer').onclick = () => Infos.fermer();
  const lire = () => ({ b: fen.querySelector('input[name=ra-blindage]:checked').value, j: Number(fen.querySelector('input[name=ra-duree]:checked').value) });
  const info = () => { const { b, j } = lire(); const vie = dureeVieRobot(a, b); $('ra-info').textContent = vie < j * JOUR ? `⚠ Avec ce blindage, le robot sera grillé au bout de ${fmtDuree(vie)}, avant la fin : échantillons perdus.` : ''; };
  fen.querySelectorAll('input').forEach((i) => { i.onchange = info; });
  info();
  $('ra-ok').onclick = () => { const { b, j } = lire(); lancerRobotAuto(v, a, b, j, log); Infos.fermer(); if (apres) apres(); };
}

function missionsEnCours(v) { return (v.equipe || []).filter((m) => m.etat === 'mission'); }
function survivants(v) { return (v.equipe || []).filter((m) => m.etat !== 'perdu' && !(m.principal && v.equipagePerdu)); }

// Liste de l'équipe pour le panneau de l'orbiteur, avec les boutons de mission vers l'astre survolé.
function htmlEquipe(v) {
  if (!v.equipe) return '';
  const a = v.orb ? ASTRES_PAR_ID[v.orb.centre] : null;
  const pb = a ? empechementMission(v, a) : 'pas d’orbiteur';
  const lignes = v.equipe.map((m) => {
    let etat;
    if (m.etat === 'perdu' || (m.principal && v.equipagePerdu)) etat = '✝ perdu';
    else if (m.etat === 'mission') etat = `en mission ${sur(ASTRES_PAR_ID[m.mission.astre])}, retour dans ${fmtDuree(m.mission.fin - v.t)}`;
    else etat = m.principal ? 'à bord (vous)' : 'à bord';
    const btn = m.etat === 'bord' && !m.principal && !pb ? ` <button data-mission="${m.id}">🧑‍🚀 Mission</button>` : '';
    return `<li>${m.nom} — ${etat}${m.dose > 0.001 ? ` · ${fmtDoseTotale(m.dose)}` : ''}${btn}</li>`;
  }).join('');
  // Robots de prélèvement en cours, conteneurs en attente, et bouton pour en larguer un ici.
  const robots = (v.robotsAuto || []).map((r) => `<li>🤖 Robot ${sur(ASTRES_PAR_ID[r.astre])} — conteneur lancé dans ${fmtDuree(r.fin - v.t)}</li>`).join('');
  const conteneurs = (v.conteneurs || []).map((c) => `<li>📦 Conteneur de ${c.n} échantillons ${enOrbite(ASTRES_PAR_ID[c.astre])} (à récupérer)</li>`).join('');
  const pbR = a ? empechementRobotAuto(v, a) : 'pas d’orbiteur';
  return `<h3>Équipe (${survivants(v).length}/${capaciteEquipe(v)})</h3><ul class="sondes">${lignes}${robots}${conteneurs}</ul>` +
    (pb && a ? `<p class="doux">Missions : ${pb}.</p>` : '') +
    (!pbR ? `<button id="nav-robot-auto">🤖 Robot de prélèvement (${v.robots})</button>` : '');
}

// Fenêtre de mission : durée, dose et échantillons attendus.
function ouvrirMission(v, membreId, log, apres) {
  const m = v.equipe.find((x) => x.id === membreId), a = ASTRES_PAR_ID[v.orb.centre];
  const c = concevoirAtterrisseur(a);
  const fen = $('modale');
  fen.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🧑‍🚀 Mission ${de(m)} ${sur(a)}</h2>
    <p>Un atterrisseur dépose ${m.nom} ${sur(a)} ; la mission se déroule seule pendant que vous jouez, puis l’atterrisseur remonte avec les échantillons. Coût : un atterrisseur occupé pendant la mission et ${fmt(c.fusee.carburant / 1000, 1)} t d’ergols.</p></div><button class="fermer">✕</button></header>
    <section>${DUREES_MISSION.map((j, i) => {
      const d = m.dose + doseMission(a, j);
      return `<label class="choix-ravito"><input type="radio" name="duree" value="${j}" ${i === 0 ? 'checked' : ''}> <b>${j} jour${j > 1 ? 's' : ''}</b> — ${echantillonsMission(j)} échantillons<br><span class="doux">dose reçue ${fmtDoseTotale(doseMission(a, j))}, cumulée ${fmtDoseTotale(d)}${d >= DOSE_MORTELLE ? ' : MORTELLE' : d >= DOSE_MORTELLE / 2 ? ' : dangereuse' : ''}</span></label>`;
    }).join('')}</section>
    <div class="actions"><span></span><button id="mission-ok" class="principal">🚀 Lancer la mission</button></div></div>`;
  fen.classList.remove('cache');
  fen.querySelector('.fermer').onclick = () => Infos.fermer();
  $('mission-ok').onclick = () => {
    const j = Number(fen.querySelector('input[name=duree]:checked').value);
    if (m.dose + doseMission(a, j) >= DOSE_MORTELLE && !confirm(`Cette mission serait mortelle pour ${le(m)}. La lancer quand même ?`)) return;
    lancerMission(v, membreId, a, j, log);
    Infos.fermer();
    if (apres) apres();
  };
}
