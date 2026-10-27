'use strict';
// Registre des équipages : toutes les personnes parties en expédition, vivantes ou mortes.
// Pour chacune : apparence, expéditions, astres explorés, sorties et missions, échantillons, artefacts trouvés,
// dose de rayonnement, temps passé dans l'espace (même des siècles), et, le cas échéant, comment elle est morte.
// Gardé dans la sauvegarde (etat.registre), d'une campagne à l'autre.

const ID_JOUEUR = 'joueur';

function registre() { if (typeof etat === 'undefined') return {}; etat.registre = etat.registre || {}; return etat.registre; }
function nouvelIdPersonne() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

// Fiche d'une personne (créée au besoin). Votre spationaute garde l'apparence choisie sur l'accueil.
function fichePersonne(regId, nom, profil) {
  const r = registre();
  if (!r[regId]) {
    r[regId] = { id: regId, nom, profil: profil ? { ...profil } : null, statut: 'vivant', expeditions: [], astres: {}, sorties: 0, missions: 0, echantillons: 0, artefacts: [], doseSv: 0, tempsEspace: 0, debut: null };
  }
  const f = r[regId];
  if (regId === ID_JOUEUR) { f.nom = nomSpatio(); f.profil = { ...SPATIO }; }
  else if (nom) f.nom = nom;
  if (profil && regId !== ID_JOUEUR) f.profil = { ...profil };
  return f;
}
function ficheDe(m) {
  if (!m) return null;
  if (m.principal) return fichePersonne(ID_JOUEUR);
  if (!m.regId) m.regId = nouvelIdPersonne();
  return fichePersonne(m.regId, m.nom, m.profil);
}

// ---------- Événements ----------
function regDepart(v) {
  for (const m of v.equipe || []) {
    const f = ficheDe(m);
    if (!f.expeditions.includes(v.expeditions + 1)) f.expeditions.push(v.expeditions + 1);   // le compteur avance juste après
    if (f.debut === null) f.debut = v.t;
    f.statut = 'expedition';
    m.tDepart = v.t;
  }
}
function regRecrue(v, m) { const f = ficheDe(m); f.expeditions.push(v.expeditions); if (f.debut === null) f.debut = v.t; f.statut = 'expedition'; m.tDepart = v.t; }
function compterTemps(v, m, tFin) { const f = ficheDe(m); if (m.tDepart !== undefined) f.tempsEspace += Math.max(0, tFin - m.tDepart); m.tDepart = tFin; }
function regRetour(v) {
  for (const m of v.equipe || []) {
    if (m.etat === 'perdu' || (m.principal && v.equipagePerdu)) continue;
    compterTemps(v, m, v.t);
    ficheDe(m).statut = 'vivant';
  }
}
function regMort(v, m, cause, astreId) {
  const f = ficheDe(m);
  if (f.statut === 'mort') return;
  compterTemps(v, m, v.t);
  f.statut = 'mort';
  f.mort = { cause, astre: astreId, t: v.t, systeme: SYSTEME.id };
}
// Orbiteur écrasé : toute personne encore à bord ou en mission meurt avec l'expédition.
function regExpeditionPerdue(v, cause, astreId) {
  for (const m of v.equipe || []) {
    if (m.etat === 'perdu' || (m.principal && v.equipagePerdu)) continue;
    regMort(v, m, cause, astreId);
  }
}
function regVisite(m, astreId, echantillons, type) {
  const f = ficheDe(m);
  f.astres[astreId] = (f.astres[astreId] || 0) + 1;
  f.echantillons += echantillons || 0;
  if (type === 'mission') f.missions++; else f.sorties++;
}
function regDose(m, sv) { if (m && sv > 0) ficheDe(m).doseSv += sv; }
function regArtefact(m, idEgg) { const f = m ? ficheDe(m) : fichePersonne(ID_JOUEUR); if (!f.artefacts.includes(idEgg)) f.artefacts.push(idEgg); }
// Artefact vu depuis l'orbiteur : tout l'équipage à bord le partage.
function regArtefactBord(v, idEgg) { for (const m of (v && v.equipe) || []) if (m.etat === 'bord' && !(m.principal && v.equipagePerdu)) regArtefact(m, idEgg); }
function principal(v) { return ((v && v.equipe) || []).find((m) => m.principal) || null; }
// Départ vers une autre étoile : le temps du voyage s'ajoute (des siècles, s'il le faut).
function regVoyageEtoile(v, secondes, statut) {
  for (const m of v.equipe || []) {
    if (m.etat === 'perdu' || (m.principal && v.equipagePerdu)) continue;
    compterTemps(v, m, v.t);
    const f = ficheDe(m);
    f.tempsEspace += secondes;
    if (statut) f.statut = statut;
  }
}

// ---------- Composition de l'équipage, avant le lancement ----------
function personnesDisponibles(v, exclure = []) {
  // Les personnes encore en expédition ont le statut « expedition » : seules les vivantes à terre sont libres.
  const prises = new Set(exclure);
  return Object.values(registre()).filter((f) => f.id !== ID_JOUEUR && f.statut === 'vivant' && !prises.has(f.id))
    .sort((a, b) => b.expeditions.length - a.expeditions.length);
}
// Les 3 places sont attribuées au hasard : un vétéran disponible (une chance sur deux), sinon une nouvelle recrue.
// Tout reste modifiable dans la fenêtre de composition.
function equipeProposee(v) {
  const l = [{ regId: ID_JOUEUR, principal: true }];
  const veterans = personnesDisponibles(v);
  while (l.length < TAILLE_EQUIPE) {
    if (veterans.length && Math.random() < 0.5) {
      const f = veterans.splice(Math.floor(Math.random() * veterans.length), 1)[0];
      l.push({ regId: f.id, nom: f.nom, profil: { ...f.profil }, veteran: true });
      continue;
    }
    const p = profilAleatoire(l.map((x) => x.nom || '').concat([nomSpatio()]));
    l.push({ regId: nouvelIdPersonne(), nom: p.prenom, profil: p });
  }
  return l;
}
// Votre spationaute est mort : sa fiche reste au registre (sous un autre identifiant), et l'on en crée un nouveau.
function spationauteMort() { const f = registre()[ID_JOUEUR]; return !!(f && f.statut === 'mort'); }
function archiverSpationaute() {
  const r = registre(), f = r[ID_JOUEUR];
  if (!f) return null;
  const id = 'ancien-' + nouvelIdPersonne();
  r[id] = { ...f, id, ancienJoueur: true, profil: { ...SPATIO } };
  delete r[ID_JOUEUR];
  return r[id];
}

function apercuMembre(cv, profil) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7ec8f0'); g.addColorStop(1, '#d6efff');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#5a9a3a'; c.fillRect(0, H - 12, W, 12);
  dessinerSpationaute(c, W / 2, H - 12, (H - 24) / 2, { dir: 1, pas: 0.12 }, true, profil);
}

// Page « Équipage » : avant le choix du lanceur. Votre spationaute occupe la première place ; les autres sont
// tirées au hasard (vétérans disponibles ou nouvelles recrues) et restent modifiables. Puis : choisir le lanceur.
function allerEquipage(v) {
  // Votre spationaute est mort lors d'une expédition précédente : on en crée un nouveau d'abord.
  if (spationauteMort()) {
    const ancien = archiverSpationaute();
    const accAncien = (GENRES[SPATIO.genre] || GENRES.aucun).accord;
    SPATIO = { ...PROFIL_DEFAUT, choisi: false };
    sauverSpatio();
    v.equipePrevue = null;
    Infos.fermer();
    return afficherCreationSpatio(() => allerEquipage(v), {
      titre: 'Un nouveau spationaute',
      intro: `${majuscule(ancien.nom)} est mort${accAncien}${ancien.mort ? ` (${ancien.mort.cause})` : ''}. Sa fiche reste au registre des équipages. Choisissez qui prend sa place à la tête de la prochaine expédition.`,
    });
  }
  v.equipePrevue = v.equipePrevue && v.equipePrevue.length ? v.equipePrevue : equipeProposee(v);
  const l = v.equipePrevue;
  const resume = (p) => {
    if (p.principal) return 'Votre spationaute';
    const f = registre()[p.regId];
    if (!f || !f.expeditions.length) return 'Nouvelle recrue';
    const astres = Object.keys(f.astres).length;
    return `Vétéran : ${f.expeditions.length} expédition${f.expeditions.length > 1 ? 's' : ''}, ${astres} astre${astres > 1 ? 's explorés' : ' exploré'}`;
  };
  const zone = $('cartes-equipage');
  $('equipage-intro').textContent = `${TAILLE_EQUIPE} places. Votre spationaute en tête ; les autres places sont attribuées au hasard (vétérans disponibles ou nouvelles recrues). Chacune peut changer : 🎲 nouvelle recrue, ou un vétéran au choix. Prénom et apparence se modifient aussi.`;
  const rendu = () => {
    const dispo = personnesDisponibles(v, l.map((p) => p.regId));
    zone.innerHTML = l.map((p, i) => `<article class="carte-membre">
        <canvas width="110" height="130" data-apercu="${i}"></canvas>
        <div><b>${p.principal ? majuscule(nomSpatio()) : p.profil.prenom || 'Recrue'}</b><br><span class="doux">${resume(p)}</span></div>
        <div class="boutons-membre">
          <button data-modifier="${i}">✏ Prénom et apparence</button>
          ${p.principal ? '' : `<button data-hasard="${i}">🎲 Nouvelle recrue</button>`}
          ${p.principal || !dispo.length ? '' : `<select data-veteran="${i}"><option value="">Vétéran disponible…</option>${dispo.map((f) => `<option value="${f.id}">${f.nom} (${f.expeditions.length} exp.)</option>`).join('')}</select>`}
        </div></article>`).join('');
    zone.querySelectorAll('[data-apercu]').forEach((cv) => { const p = l[Number(cv.dataset.apercu)]; apercuMembre(cv, p.principal ? SPATIO : p.profil); });
    zone.querySelectorAll('[data-hasard]').forEach((bt) => { bt.onclick = () => {
      const i = Number(bt.dataset.hasard), np = profilAleatoire(l.map((x) => (x.profil ? x.profil.prenom : '')).concat([nomSpatio()]));
      l[i] = { regId: nouvelIdPersonne(), nom: np.prenom, profil: np }; rendu();
    }; });
    zone.querySelectorAll('[data-veteran]').forEach((sel) => { sel.onchange = () => {
      const f = registre()[sel.value]; if (!f) return;
      l[Number(sel.dataset.veteran)] = { regId: f.id, nom: f.nom, profil: { ...f.profil }, veteran: true }; rendu();
    }; });
    zone.querySelectorAll('[data-modifier]').forEach((bt) => { bt.onclick = () => {
      const i = Number(bt.dataset.modifier), p = l[i];
      const retour = () => allerEquipage(v);
      if (p.principal) afficherCreationSpatio(retour);
      else afficherCreationSpatio(retour, {
        profil: p.profil, titre: `Membre d’équipage : ${p.profil.prenom || 'recrue'}`,
        intro: 'Prénom, genre (pour les accords), apparence et aides éventuelles. Tout l’équipage porte la combinaison de l’ESA.',
        surValider: (np) => { l[i] = { ...p, profil: np, nom: np.prenom || 'Recrue' }; },
      });
    }; });
  };
  rendu();
  $('equipage-continuer').onclick = () => { sauver(etat); allerLancement(); };
  montrer('equipage');
}

// ---------- Fenêtre du registre ----------
function fmtTempsEspace(s) { return s >= 365.25 * 86400 ? fmtDureeAnnees(s / (365.25 * 86400)) : fmtDuree(s); }
function nomAstrePartout(id) { const a = typeof astrePartout === 'function' ? astrePartout(id) : ASTRES_PAR_ID[id]; return a ? a.nom : id; }
const STATUTS_REGISTRE = { vivant: '🟢 vivant', expedition: '🛰 en expédition', route: '🌌 en route vers une autre étoile', mort: '✝ mort' };

function ouvrirRegistre() {
  const r = registre();
  if (SPATIO && !r[ID_JOUEUR] && etat.voyage) fichePersonne(ID_JOUEUR);
  const ordre = { expedition: 0, vivant: 1, route: 2, mort: 3 };
  const fiches = Object.values(r).sort((a, b) => (ordre[a.statut] - ordre[b.statut]) || (b.expeditions.length - a.expeditions.length));
  const m = $('modale');
  const ligne = (f, i) => {
    const astres = Object.entries(f.astres).sort((a, b) => b[1] - a[1]).map(([id]) => nomAstrePartout(id));
    const artefacts = f.artefacts.map((id) => {
      if (id.startsWith('voiture-')) return 'Roadster';
      if (id.startsWith('trace:')) { const t = Object.values(TRACES_REELLES).flat().find((x) => x.id === id.slice(6)); return t ? t.nom : id; }
      const e = tousLesEggs().find((x) => x.id === id);
      return e ? nomAstrePartout(e.astre) : id;
    });
    const mort = f.mort ? `${f.mort.cause}${f.mort.astre ? `, ${sur(astrePartout(f.mort.astre))}` : ''}, le ${fmtDate(f.mort.t, false)}` : '';
    return `<article class="fiche-registre ${f.statut === 'mort' ? 'mort' : ''}">
      <canvas width="70" height="86" data-portrait="${i}"></canvas>
      <div class="corps-registre">
        <h3>${majuscule(f.nom)}${f.id === ID_JOUEUR ? ' <span class="doux">(vous)</span>' : f.ancienJoueur ? ' <span class="doux">(votre spationaute d’avant)</span>' : ''}</h3>
        <p class="doux">${STATUTS_REGISTRE[f.statut] || f.statut}${mort ? ` — ${mort}` : ''}</p>
        <dl>
          <dt>Expéditions</dt><dd>${f.expeditions.length ? f.expeditions.map((n) => 'n° ' + n).join(', ') : '—'}</dd>
          <dt>Astres explorés</dt><dd>${astres.length ? astres.join(', ') : '—'}</dd>
          <dt>Sorties, missions</dt><dd>${f.sorties} sortie${f.sorties > 1 ? 's' : ''}, ${f.missions} mission${f.missions > 1 ? 's' : ''}</dd>
          <dt>Échantillons</dt><dd>${f.echantillons}</dd>
          <dt>Artefacts</dt><dd>${artefacts.length ? `✨ ${artefacts.length} (${artefacts.join(', ')})` : '—'}</dd>
          <dt>Dose reçue</dt><dd>${fmtDoseTotale(f.doseSv)}</dd>
          <dt>Temps dans l’espace</dt><dd>${fmtTempsEspace(f.tempsEspace)}</dd>
        </dl>
      </div></article>`;
  };
  const vivants = fiches.filter((f) => f.statut !== 'mort').length;
  m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>👥 Registre des équipages</h2>
    <p>${fiches.length} personne${fiches.length > 1 ? 's' : ''} parties dans l’espace : ${vivants} en vie, ${fiches.length - vivants} mortes.</p></div><button class="fermer">✕</button></header>
    ${fiches.length ? `<div class="liste-registre">${fiches.map(ligne).join('')}</div>` : '<p class="doux">Personne n’est encore parti. Le registre se remplit au premier lancement d’une expédition.</p>'}</div>`;
  m.classList.remove('cache');
  m.querySelectorAll('[data-portrait]').forEach((cv) => { const f = fiches[Number(cv.dataset.portrait)]; apercuMembre(cv, f.id === ID_JOUEUR ? SPATIO : f.profil || PROFIL_DEFAUT); });
  m.querySelector('.fermer').onclick = () => Infos.fermer();
}
