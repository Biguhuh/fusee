'use strict';
// ---------- Transport des spationautes (carte 6, point 7) ----------
// Nouvelles recrues venues de la Terre, ou spationautes déplacés entre l'orbiteur, les stations et les bases : ils
// voyagent dans un vaisseau de transfert (4 places), sur une vraie trajectoire (la même que les cargos), en
// arrière-plan, avec un message à l'arrivée. Plus d'apparition instantanée à bord.
// Lieux : 'orbiteur', 'st:<id de station>', 'base:<id de base>'. États d'un membre : 'transit', 'station', 'base'.
const PLACES_TRANSFERT = 4;               // places par vaisseau de transfert
const ERGOLS_TRANSFERT = 20000;           // kg d'ergols pris à la station de départ, par vaisseau (la Terre fournit)
const DUREE_NAVETTE = JOUR;               // navette entre une base et la station de son astre

function capaciteBase(b) { return 2 * (b.niveau || 1); }
function capaciteStationEquipe(st) { return niveauStation(st).habitat ? TAILLE_EQUIPE_HABITAT : 0; }
function stationDe(v, lieu) {
  if (lieu.startsWith('st:')) return v.stations.find((s) => s.id === lieu.slice(3)) || null;
  if (lieu.startsWith('base:')) { const b = v.bases.find((x) => String(x.id ?? x.astre) === lieu.slice(5)); return b ? stationSur(v, b.astre) : null; }
  return null;
}
function baseDe(v, lieu) { return lieu.startsWith('base:') ? v.bases.find((x) => String(x.id ?? x.astre) === lieu.slice(5)) || null : null; }
function idBase(b) { return 'base:' + String(b.id ?? b.astre); }
function nomLieu(v, lieu) {
  if (lieu === 'orbiteur') return `l’orbiteur ${nomVaisseau(v)}`;
  if (lieu === 'terre') return le(planeteOrigine());
  const b = baseDe(v, lieu);
  if (b) return `la base ${de(ASTRES_PAR_ID[b.astre])}`;
  const st = stationDe(v, lieu);
  return st ? le(st) : lieu;
}
// Où est un membre : 'orbiteur', 'st:…', 'base:…', ou null (mission, transit, perdu…).
function lieuMembre(m) { return m.etat === 'bord' ? 'orbiteur' : (m.etat === 'station' || m.etat === 'base') ? m.lieu : null; }
// Places libres à un lieu (en comptant ceux qui y sont déjà et ceux qui y vont).
function placesLibres(v, lieu) {
  const vont = (v.equipe || []).filter((m) => m.etat === 'transit' && m.transit && m.transit.vers === lieu).length;
  if (lieu === 'orbiteur') return capaciteEquipe(v) - aBordOrbiteur(v).length - (v.equipe || []).filter((m) => m.etat === 'mission').length - vont;
  const ici = (v.equipe || []).filter((m) => lieuMembre(m) === lieu).length;
  const b = baseDe(v, lieu);
  if (b) return capaciteBase(b) - ici - vont;
  const st = stationDe(v, lieu);
  return st ? capaciteStationEquipe(st) - ici - vont : 0;
}
// Station de départ ou d'arrivée pour l'orbiteur : celle autour de son astre (null : en orbite de la Terre sans station).
function stationOrbiteur(v) { return v.orb ? stationSur(v, v.orb.centre) : null; }
function orbiteurJoignable(v) { return !!v.orb && Orbiteur.orbiteFermee() && (!!stationOrbiteur(v) || estOrigine(v.orb.centre)); }

// Point de départ d'un vaisseau de transfert (id pour departCargo : planète d'origine ou station), ou null.
function departTransfert(v, lieu) {
  if (lieu === 'terre') return SYSTEME.origine;
  if (lieu === 'orbiteur') { const st = stationOrbiteur(v); return st ? st.id : (v.orb && estOrigine(v.orb.centre) ? SYSTEME.origine : null); }
  const st = stationDe(v, lieu);
  return st ? st.id : null;
}
// Station d'arrivée (null : rendez-vous avec l'orbiteur en orbite de la Terre, sans station).
function arriveeTransfert(v, lieu) { return lieu === 'orbiteur' ? stationOrbiteur(v) : stationDe(v, lieu); }

// Lance un vaisseau de transfert : un objet du même genre qu'un cargo (même trajectoire, même suivi).
function lancerTransfert(v, depuis, vers, membres, log) {
  const origineId = departTransfert(v, depuis), dest = arriveeTransfert(v, vers);
  const depart = Orbiteur.departCargo(origineId);
  const centreDest = dest ? dest.centre : v.orb.centre;
  const c = {
    id: 't' + Date.now() + Math.floor(Math.random() * 1000), nom: `🧑‍🚀 Transfert → ${dest ? dest.nom : 'orbiteur'}`, type: 'cargo',
    cible: centreDest, dest: dest ? dest.id : null, contenu: {}, passagers: membres.map((m) => m.id), versLieu: vers, origine: nomLieu(v, depuis),
    centre: depart.centre, r: depart.r.slice(), v: depart.v.slice(), transfert: null, etat: 'vol', tLancement: v.t,
  };
  if (depart.centre === centreDest) { c.local = true; c.tArrivee = v.t + DUREE_RDV_LOCAL; }
  (v.cargos = v.cargos || []).push(c);
  if (!c.local) Orbiteur.arriveePrevue(c);
  // Départ d'une base : la navette monte d'abord à la station (un jour de plus).
  if (depuis.startsWith('base:') && c.tArrivee) c.tArrivee += DUREE_NAVETTE;
  for (const m of membres) { m.etat = 'transit'; m.lieu = null; m.transit = { vers, cargo: c.id }; }
  return c;
}

// Arrivée d'un vaisseau de transfert (appelée à la place de la livraison d'un cargo).
function arriveeTransfertEquipage(v, c, log) {
  const membres = (v.equipe || []).filter((m) => c.passagers.includes(m.id) && m.etat === 'transit');
  const noms = listeEt(membres.map((m) => m.nom));
  const vers = c.versLieu, st = c.dest ? v.stations.find((s) => s.id === c.dest) : null;
  for (const m of membres) {
    if (vers.startsWith('base:')) { m.transit = { vers, tArrivee: v.t + DUREE_NAVETTE }; continue; }   // la navette descend
    m.transit = null;
    if (vers === 'orbiteur' && orbiteurIci(v, c.cible)) { m.etat = 'bord'; m.lieu = null; }
    else { m.etat = 'station'; m.lieu = st ? 'st:' + st.id : null; m.attendOrbiteur = vers === 'orbiteur'; if (!m.lieu) { m.etat = 'bord'; } }
  }
  const ici = st ? au(st) : `en orbite ${de(ASTRES_PAR_ID[c.cible])}`;
  if (vers.startsWith('base:')) log(`🧑‍🚀 ${noms} ${membres.length > 1 ? 'sont arrivés' : 'est arrivé' + accordMembre(membres[0])} ${ici} ; la navette ${membres.length > 1 ? 'les emmène' : 'l’emmène'} à ${nomLieu(v, vers)} (≈ ${fmtDuree(DUREE_NAVETTE)}).`);
  else if (vers === 'orbiteur' && membres.every((m) => m.etat === 'bord')) log(`🧑‍🚀 ${noms} ${membres.length > 1 ? 'ont rejoint' : 'a rejoint'} ${nomLieu(v, 'orbiteur')} : bienvenue à bord ! (équipe ${aBordOrbiteur(v).length}/${capaciteEquipe(v)})`);
  else log(`🧑‍🚀 ${noms} ${membres.length > 1 ? 'sont arrivés' : 'est arrivé' + accordMembre(membres[0])} ${ici}${vers === 'orbiteur' ? ' : l’orbiteur n’y est plus, ils l’attendent et monteront à bord à son retour' : ''}.`);
}
function orbiteurIci(v, astreId) { return !!v.orb && v.orb.centre === astreId && Orbiteur.orbiteFermee(); }

// À chaque mise à jour : navettes vers les bases, et ceux qui attendent l'orbiteur à une station.
function mettreAJourTransferts(v, log) {
  for (const m of v.equipe || []) {
    if (m.etat === 'transit' && m.transit && m.transit.tArrivee && v.t >= m.transit.tArrivee && !m.transit.cargo) {
      m.etat = 'base'; m.lieu = m.transit.vers; m.transit = null;
      log(`🏠 ${m.nom} est arrivé${accordMembre(m)} à ${nomLieu(v, m.lieu)}.`);
    }
    if (m.etat === 'station' && m.attendOrbiteur) {
      const st = stationDe(v, m.lieu);
      if (st && orbiteurIci(v, st.centre) && placesLibres(v, 'orbiteur') > 0) {
        m.etat = 'bord'; m.lieu = null; m.attendOrbiteur = false;
        log(`🧑‍🚀 ${m.nom} monte à bord de l’orbiteur, ${au(st)}.`);
      }
    }
  }
}

// ---------- Fenêtre d'envoi ----------
// Qui (nouvelles recrues, spationautes en service), d'où, vers où ; combien de vaisseaux, durée prévue.
function ouvrirEnvoiEquipage(v, log, apres, versPreselection) {
  const m = $('modale');
  const lieuxDest = [];
  if (orbiteurJoignable(v)) lieuxDest.push('orbiteur');
  for (const st of v.stations) if (capaciteStationEquipe(st) > 0) lieuxDest.push('st:' + st.id);
  for (const b of v.bases) if (stationSur(v, b.astre)) lieuxDest.push(idBase(b));
  if (!lieuxDest.length) return log('🧑‍🚀 Aucune destination possible : l’orbiteur doit être en orbite de la Terre ou d’un astre qui a une station ; une station accueille l’équipe à partir du niveau 4 (habitat) ; une base, si une station tourne au-dessus.');
  // Spationautes en service qu'on peut déplacer (pas votre spationaute : il reste aux commandes de l'orbiteur).
  const dispo = (v.equipe || []).filter((x) => !x.principal && lieuMembre(x) && !(x.blessure && x.blessure.gravite === 'grave'));
  const choixDest = versPreselection && lieuxDest.includes(versPreselection) ? versPreselection : lieuxDest[0];
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🧑‍🚀 Envoyer des spationautes</h2>
    <p>Ils voyagent dans un vaisseau de transfert de ${PLACES_TRANSFERT} places (plusieurs s’il le faut), sur une vraie trajectoire, pendant que vous continuez. Depuis la Terre, c’est gratuit ; depuis une station, chaque vaisseau prend ${fmtStock('ergols', ERGOLS_TRANSFERT)} d’ergols à son stock. Une base passe par la station de son astre (navette : ${fmtDuree(DUREE_NAVETTE)}).</p></div><button class="fermer">✕</button></header>
    <section><h3>Qui</h3>
      <label class="choix-ravito">Nouvelles recrues, depuis ${le(planeteOrigine())} : <input type="number" id="env-recrues" min="0" max="12" value="${dispo.length ? 0 : 1}" style="width:4em"></label>
      ${dispo.map((x) => `<label class="choix-ravito"><input type="checkbox" name="env-qui" value="${x.id}"> <b>${x.nom}</b> <span class="doux">— ${nomLieu(v, lieuMembre(x))}</span></label>`).join('')}
    </section>
    <section><h3>Vers où</h3>${lieuxDest.map((l) => `<label class="choix-ravito"><input type="radio" name="env-vers" value="${l}" ${l === choixDest ? 'checked' : ''}> ${majuscule(nomLieu(v, l))} <span class="doux">(${Math.max(0, placesLibres(v, l))} place${placesLibres(v, l) > 1 ? 's' : ''} libre${placesLibres(v, l) > 1 ? 's' : ''})</span></label>`).join('')}</section>
    <p id="env-info" class="doux"></p><p id="env-erreur" class="encart-refus cache"></p>
    <div class="actions"><span></span><button id="env-ok" class="principal">🚀 Envoyer</button></div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  const lire = () => {
    const vers = m.querySelector('input[name=env-vers]:checked').value;
    const recrues = Math.max(0, Math.min(12, Math.round(Number($('env-recrues').value) || 0)));
    const qui = [...m.querySelectorAll('input[name=env-qui]:checked')].map((i) => v.equipe.find((x) => x.id === i.value));
    // Groupes par lieu de départ : la Terre (recrues), puis le lieu de chacun (sauf ceux déjà à destination).
    const groupes = new Map();
    if (recrues) groupes.set('terre', { n: recrues, membres: [] });
    for (const x of qui) { const l = lieuMembre(x); if (l === vers) continue; if (!groupes.has(l)) groupes.set(l, { n: 0, membres: [] }); const g = groupes.get(l); g.n++; g.membres.push(x); }
    return { vers, recrues, groupes };
  };
  const verifier = ({ vers, groupes }) => {
    const total = [...groupes.values()].reduce((s, g) => s + g.n, 0);
    if (!total) return 'Choisissez au moins une recrue ou un spationaute.';
    if (total > placesLibres(v, vers)) return `Pas assez de place : ${Math.max(0, placesLibres(v, vers))} place(s) libre(s) à ${nomLieu(v, vers)}.`;
    for (const [l, g] of groupes) {
      if (!departTransfert(v, l)) return `${majuscule(nomLieu(v, l))} : pas de station d’où partir.`;
      if (l !== 'terre' && !estOrigine(departTransfert(v, l))) {
        const st = v.stations.find((s) => s.id === departTransfert(v, l)), besoin = Math.ceil(g.n / PLACES_TRANSFERT) * ERGOLS_TRANSFERT;
        if ((st.stock.ergols || 0) < besoin) return `${majuscule(le(st))} n’a pas assez d’ergols : il en faut ${fmtStock('ergols', besoin)}.`;
      }
    }
    return '';
  };
  const maj = () => {
    const l = lire(), err = verifier(l);
    $('env-erreur').textContent = err; $('env-erreur').classList.toggle('cache', !err); $('env-ok').disabled = !!err;
    const dest = arriveeTransfert(v, l.vers);
    $('env-info').textContent = [...l.groupes].map(([dep, g]) => {
      const o = departTransfert(v, dep), d = o && dest ? Orbiteur.estimerRavito(o, dest.id) : (o ? DUREE_RDV_LOCAL : null);
      return `${g.n} depuis ${nomLieu(v, dep)} : ${Math.ceil(g.n / PLACES_TRANSFERT)} vaisseau${g.n > PLACES_TRANSFERT ? 'x' : ''}${d ? `, arrivée dans ≈ ${fmtDuree(d + (l.vers.startsWith('base:') ? DUREE_NAVETTE : 0))}` : ''}`;
    }).join(' · ');
  };
  m.querySelectorAll('input').forEach((i) => { i.onchange = maj; i.oninput = maj; });
  maj();
  $('env-ok').onclick = () => {
    const l = lire();
    if (verifier(l)) return;
    for (const [dep, g] of l.groupes) {
      const membres = [...g.membres];
      // Nouvelles recrues : elles rejoignent l'équipe dès le départ (registre des équipages).
      for (let i = 0; i < (dep === 'terre' ? g.n : 0); i++) {
        const profil = profilAleatoire([...v.equipe.map((x) => x.nom), ...Object.values(registre()).map((f) => f.nom)]);
        const r = { id: 'e' + Date.now() + i, nom: profil.prenom, profil, dose: 0, etat: 'transit' };
        v.equipe.push(r); regRecrue(v, r); membres.push(r);
      }
      const o = departTransfert(v, dep);
      if (!estOrigine(o)) { const st = v.stations.find((s) => s.id === o); st.stock.ergols -= Math.ceil(membres.length / PLACES_TRANSFERT) * ERGOLS_TRANSFERT; }
      for (let i = 0; i < membres.length; i += PLACES_TRANSFERT) {
        const lot = membres.slice(i, i + PLACES_TRANSFERT), c = lancerTransfert(v, dep, l.vers, lot, log);
        log(`🚀 ${listeEt(lot.map((x) => x.nom))} ${lot.length > 1 ? 'partent' : 'part'} depuis ${nomLieu(v, dep)} vers ${nomLieu(v, l.vers)}${c.tArrivee ? ` : arrivée le ${fmtDate(c.tArrivee, false)}` : ''}.`);
      }
    }
    Infos.fermer();
    if (apres) apres();
  };
}
