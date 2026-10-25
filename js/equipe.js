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

// Nouvelle équipe au départ d'une expédition.
function initialiserEquipe(v) {
  const pris = new Set();
  const nom = () => { const libres = NOMS_EQUIPE.filter((n) => !pris.has(n)); const n = libres[Math.floor(Math.random() * libres.length)] || 'Recrue'; pris.add(n); return n; };
  v.equipe = [{ id: 'e0', nom: nomSpatio(), principal: true, dose: 0, etat: 'bord' }];
  for (let i = 1; i < TAILLE_EQUIPE; i++) v.equipe.push({ id: 'e' + i, nom: nom(), dose: 0, etat: 'bord' });
}

// Recrue supplémentaire (habitat d'une station de niveau 4).
function recruter(v, log) {
  if (v.equipe.length >= capaciteEquipe(v)) return log(`L’équipe est au complet (${capaciteEquipe(v)} places${capaciteEquipe(v) < TAILLE_EQUIPE_HABITAT ? ' ; une station de niveau 4 en accueille 8' : ''}).`);
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
  if (!v.orb || v.orb.centre !== a.id) return `l’orbiteur doit être en orbite de ${a.nom}`;
  if (a.type !== 'solide' || estOrigine(a.id)) return `on ne se pose pas sur ${a.nom}`;
  if (AEROSTAT[a.id]) return 'sur Vénus, le module ne peut pas repartir seul';
  if (v.atterrisseurs <= 0) return 'plus d’atterrisseur libre';
  const c = concevoirAtterrisseur(a);
  if (!c.ok) return c.raison;
  if (v.ergolsAtt < c.fusee.carburant) return `pas assez d’ergols pour l’atterrisseur (${fmt(c.fusee.carburant / 1000, 1)} t)`;
  return '';
}

function lancerMission(v, membreId, a, jours, log) {
  const m = v.equipe.find((x) => x.id === membreId);
  if (!m || m.etat !== 'bord') return;
  const pb = empechementMission(v, a);
  if (pb) return log(`Mission impossible : ${pb}.`);
  const c = concevoirAtterrisseur(a);
  v.ergolsAtt -= c.fusee.carburant;
  v.atterrisseurs -= 1;
  m.etat = 'mission';
  m.mission = { astre: a.id, debut: v.t, fin: v.t + jours * JOUR, jours };
  log(`${m.nom} part en mission sur ${a.nom} pour ${jours} jour${jours > 1 ? 's' : ''} (${fmtDose(doseSurface(a).svJour)} en surface).`);
}

// Missions terminées : retour à bord avec les échantillons, ou perte si la dose a été mortelle.
function mettreAJourEquipe(v, log) {
  for (const m of v.equipe || []) {
    if (m.etat !== 'mission' || v.t < m.mission.fin) continue;
    const a = ASTRES_PAR_ID[m.mission.astre], jours = m.mission.jours;
    m.dose += doseMission(a, jours);
    v.atterrisseurs += 1;                                  // l'atterrisseur remonte seul, avec ou sans équipage
    v.visites[a.id] = { ...(v.visites[a.id] || {}), pose: true };
    if (m.dose >= DOSE_MORTELLE) {
      m.etat = 'perdu';
      log(`${m.nom} n’a pas survécu à sa mission sur ${a.nom} : dose de ${fmtDoseTotale(m.dose)}. L’atterrisseur est remonté seul.`);
    } else {
      const n = echantillonsMission(jours);
      v.echantillonsABord[a.id] = (v.echantillonsABord[a.id] || 0) + n;
      m.etat = 'bord';
      log(`${m.nom} est de retour de ${a.nom} avec ${n} échantillon${n > 1 ? 's' : ''} (dose cumulée ${fmtDoseTotale(m.dose)}).`);
    }
    m.derniere = m.mission.astre;
    delete m.mission;
  }
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
    else if (m.etat === 'mission') etat = `en mission sur ${ASTRES_PAR_ID[m.mission.astre].nom}, retour dans ${fmtDuree(m.mission.fin - v.t)}`;
    else etat = m.principal ? 'à bord (vous)' : 'à bord';
    const btn = m.etat === 'bord' && !m.principal && !pb ? ` <button data-mission="${m.id}">🧑‍🚀 Mission</button>` : '';
    return `<li>${m.nom} — ${etat}${m.dose > 0.001 ? ` · ${fmtDoseTotale(m.dose)}` : ''}${btn}</li>`;
  }).join('');
  return `<h3>Équipe (${survivants(v).length}/${capaciteEquipe(v)})</h3><ul class="sondes">${lignes}</ul>` +
    (pb && a ? `<p class="doux">Missions : ${pb}.</p>` : '');
}

// Fenêtre de mission : durée, dose et échantillons attendus.
function ouvrirMission(v, membreId, log, apres) {
  const m = v.equipe.find((x) => x.id === membreId), a = ASTRES_PAR_ID[v.orb.centre];
  const c = concevoirAtterrisseur(a);
  const fen = $('modale');
  const de = /^[aeiouyéèêàâîïôûhAEIOUYÉÈÊÀÂÎÏÔÛH]/.test(m.nom) ? 'd’' : 'de ';
  fen.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🧑‍🚀 Mission ${de}${m.nom} sur ${a.nom}</h2>
    <p>Un atterrisseur dépose ${m.nom} sur ${a.nom} ; la mission se déroule seule pendant que vous jouez, puis l’atterrisseur remonte avec les échantillons. Coût : un atterrisseur occupé pendant la mission et ${fmt(c.fusee.carburant / 1000, 1)} t d’ergols.</p></div><button class="fermer">✕</button></header>
    <section>${DUREES_MISSION.map((j, i) => {
      const d = m.dose + doseMission(a, j);
      return `<label class="choix-ravito"><input type="radio" name="duree" value="${j}" ${i === 0 ? 'checked' : ''}> <b>${j} jour${j > 1 ? 's' : ''}</b> — ${echantillonsMission(j)} échantillons<br><span class="doux">dose reçue ${fmtDoseTotale(doseMission(a, j))}, cumulée ${fmtDoseTotale(d)}${d >= DOSE_MORTELLE ? ' : MORTELLE' : d >= DOSE_MORTELLE / 2 ? ' : dangereuse' : ''}</span></label>`;
    }).join('')}</section>
    <div class="actions"><span></span><button id="mission-ok" class="principal">🚀 Lancer la mission</button></div></div>`;
  fen.classList.remove('cache');
  fen.querySelector('.fermer').onclick = () => Infos.fermer();
  $('mission-ok').onclick = () => {
    const j = Number(fen.querySelector('input[name=duree]:checked').value);
    if (m.dose + doseMission(a, j) >= DOSE_MORTELLE && !confirm(`Cette mission serait mortelle pour ${m.nom}. La lancer quand même ?`)) return;
    lancerMission(v, membreId, a, j, log);
    Infos.fermer();
    if (apres) apres();
  };
}
