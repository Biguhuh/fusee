'use strict';
// ---------- Pannes des stations et missions des sorties (étape 2) ----------
// Une station s'use : de temps en temps une panne (batteries, panneau solaire, fuite d'ammoniac, instrument) ralentit
// son atelier. Une sortie à deux la répare, tâche après tâche, comme les vraies sorties de l'ISS. Certaines tâches
// demandent les deux spationautes, d'autres les outils : si le sac à outils s'échappe, il faut le rattraper.
// Si le rayonnement est trop fort pour sortir, un robot (comme Dextre sur l'ISS) fait le travail, plus lentement.

const RALENTI_PANNE = 0.8;   // chaque panne : atelier 20 % plus lent
const PANNES_STATION = {
  batteries: {
    nom: 'Batteries usées', icone: '🔋', effet: 'moins d’énergie : atelier 20 % plus lent',
    ref: 'ISS, 2017 à 2021 : les vieilles batteries nickel-hydrogène remplacées par des lithium-ion, en une dizaine de sorties.',
    taches: [
      { nom: 'Débrancher et retirer l’ancienne batterie', lieu: ['poutre', 0.45, -1], duree: 25 * 60, outil: true },
      { nom: 'Installer la batterie neuve (à deux : elle fait 200 kg)', lieu: ['poutre', 0.45, -1], duree: 25 * 60, outil: true, deux: true },
      { nom: 'Rebrancher et vérifier', lieu: ['poutre', 0.45, -1], duree: 10 * 60 },
    ],
  },
  panneau: {
    nom: 'Panneau solaire dégradé', icone: '☀', effet: 'moins d’énergie : atelier 20 % plus lent',
    ref: 'ISS, 2021 à 2023 : des panneaux déroulants iROSA posés devant les anciens, en deux sorties par panneau.',
    taches: [
      { nom: 'Poser le support du nouveau panneau', lieu: ['panneau'], duree: 40 * 60, outil: true, deux: true },
      { nom: 'Dérouler le panneau neuf', lieu: ['panneau'], duree: 20 * 60, deux: true },
    ],
  },
  ammoniac: {
    nom: 'Fuite d’ammoniac', icone: '❄', effet: 'refroidissement en panne : atelier 20 % plus lent', fuite: true,
    ref: 'ISS, mai 2013 : des flocons blancs s’échappaient d’un radiateur ; Chris Cassidy et Tom Marshburn ont changé une pompe en une sortie préparée en deux jours.',
    taches: [
      { nom: 'Trouver la fuite (les flocons blancs)', lieu: ['poutre', -0.4, 1], duree: 15 * 60 },
      { nom: 'Changer la pompe du circuit', lieu: ['poutre', -0.4, 1], duree: 45 * 60, outil: true, deux: true },
    ],
  },
  instrument: {
    nom: 'Détecteur de particules en panne', icone: '🛰', niveau: 3, effet: 'science en panne : atelier 20 % plus lent',
    ref: 'ISS, 2019-2020 : le détecteur AMS réparé en quatre sorties, avec des outils inventés exprès (Luca Parmitano, Drew Morgan).',
    taches: [
      { nom: 'Couper les vieux tuyaux de refroidissement', lieu: ['module', 0.5], duree: 30 * 60, outil: true },
      { nom: 'Poser la nouvelle pompe (à deux)', lieu: ['module', 0.5], duree: 40 * 60, outil: true, deux: true },
      { nom: 'Raccorder les tuyaux un par un', lieu: ['module', 0.5], duree: 35 * 60, outil: true },
    ],
  },
};

function pannesDe(st) { return st.pannes || []; }
function facteurPannes(st) { return Math.pow(RALENTI_PANNE, pannesDe(st).length); }
// Une panne de temps en temps (tous les 4 à 10 mois), différente de celles en cours.
function mettreAJourPannes(v, log) {
  for (const st of v.stations || []) {
    if (!st.prochainePanne) { st.prochainePanne = v.t + (120 + Math.random() * 180) * JOUR; continue; }
    if (v.t < st.prochainePanne) continue;
    st.prochainePanne = v.t + (120 + Math.random() * 180) * JOUR;
    const libres = Object.entries(PANNES_STATION).filter(([k, p]) => !pannesDe(st).some((x) => x.type === k) && (st.niveau || 1) >= (p.niveau || 1));
    if (!libres.length) continue;
    const [k, p] = libres[Math.floor(Math.random() * libres.length)];
    (st.pannes = st.pannes || []).push({ type: k, t: v.t });
    log(`${p.icone} ${majuscule(le(st))} : ${p.nom.toLowerCase()} (${p.effet}). Une sortie extravéhiculaire peut la réparer.`);
  }
}
function texteePannes(st) { return pannesDe(st).map((x) => `${PANNES_STATION[x.type].icone} ${PANNES_STATION[x.type].nom}`).join(', '); }

// Abscisse, sur le contour de la station, du lieu d'une tâche.
function lieuTache(g, lieu) {
  if (lieu[0] === 'panneau') return plusProcheContour(g, g.panneaux[0], 1.2).s;
  if (lieu[0] === 'module') return plusProcheContour(g, 12 * lieu[1], 5.4).s;
  return plusProcheContour(g, (g.L / 2) * lieu[1], 1.2 * lieu[2]).s;
}
function dureeMission(type) { return PANNES_STATION[type].taches.reduce((s, t) => s + t.duree, 0); }

// ---------- Choix au départ ----------
function lancerSortieStation(v, st) {
  const l = candidatsSortie(v, st).sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0));
  if (l.length < 2) return Orbiteur.log('🧑‍🚀 Une sortie se fait à deux : il faut deux personnes valides, à bord ou à la station.');
  const a = ASTRES_PAR_ID[st.centre], dose = doseSortieOrbite(a), m = $('modale');
  const robots = (v.robots || 0) + ((st.stock && st.stock.robots) || 0);
  const dangereux = (type) => dose * ((dureeMission(type) * 1.5) / 86400) > 0.1 * DOSE_MORTELLE || dose > 0.05;
  const carte = (x) => {
    const p = PANNES_STATION[x.type], d = dureeMission(x.type), risque = dangereux(x.type);
    return `<article class="encart"><h3>${p.icone} ${p.nom}</h3><p class="doux">${p.effet}. ${p.ref}</p>
      <ol>${p.taches.map((t) => `<li>${t.nom} · ${fmtDuree(t.duree)}${t.deux ? ' · à deux' : ''}${t.outil ? ' · outils' : ''}</li>`).join('')}</ol>
      <p class="doux">Travail : ≈ ${fmtDuree(d)}, plus les déplacements. Dose prévue : ≈ ${fmtDoseTotale((dose * d * 1.5) / 86400)} chacun${risque ? ' ⚠ trop pour des humains' : ''}.</p>
      <div class="actions" style="justify-content:flex-start">${risque ? '' : `<button data-mission="${x.type}" class="principal">🧑‍🚀 Sortir réparer</button>`}
        ${risque || robots ? `<button data-robot="${x.type}" ${robots ? '' : 'disabled title="Aucun robot à bord ni à la station"'}>🤖 Confier au robot${robots ? '' : ' (aucun disponible)'}</button>` : ''}</div></article>`;
  };
  m.innerHTML = `<div class="fenetre"><header class="entete"><div><h2>🧑‍🚀 Sortie ${de(st)}</h2>
    <p>${l[0].principal ? majuscule(nomSpatio()) : l[0].nom} et ${l[1].principal ? nomSpatio() : l[1].nom} sortent par le sas. Rayonnement dehors : ${fmtDose(dose)}${dose > 0.05 ? ' : trop fort pour une longue sortie' : ''}.</p></div><button class="fermer">✕</button></header>
    ${pannesDe(st).length ? pannesDe(st).map(carte).join('') : '<p class="doux">Aucune panne : la station tourne bien.</p>'}
    <div class="actions"><button id="eva-inspection">🚶 Sortie d’inspection, sans tâche</button></div></div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  const partir = (type) => {
    Infos.fermer();
    v.t += EVA.prepa;   // préparation dans le sas : oxygène pur, combinaisons, vérifications
    Orbiteur.log(`🧑‍🚀 Préparation dans le sas ${de(st)} (≈ ${fmtDuree(EVA.prepa)}) : on respire de l’oxygène pur pour chasser l’azote du sang, on enfile les combinaisons, on vérifie tout. Dépressurisation…`);
    const scene = new SortieStation(v, st, l.slice(0, 2), type);
    jouerScene(scene, () => { Orbiteur.mettreAJourLogistique(); sauver(etat); allerNavigation(); });
  };
  $('eva-inspection').onclick = () => partir(null);
  m.querySelectorAll('[data-mission]').forEach((b) => { b.onclick = () => partir(b.dataset.mission); });
  m.querySelectorAll('[data-robot]').forEach((b) => { b.onclick = () => { Infos.fermer(); reparerParRobot(v, st, b.dataset.robot); }; });
}

// Le robot (bras et « mains » comme Dextre sur l'ISS) : il prend plus de temps, mais personne ne sort. Dans un
// rayonnement de plus de 1 Sv par jour, son électronique ne survit pas au travail.
function reparerParRobot(v, st, type) {
  const p = PANNES_STATION[type], a = ASTRES_PAR_ID[st.centre], dose = doseSortieOrbite(a), duree = dureeMission(type) * 2;
  v.t += duree;
  st.pannes = pannesDe(st).filter((x) => x.type !== type);
  let perdu = '';
  if (dose > 1) {
    if (st.stock && st.stock.robots > 0) st.stock.robots--; else v.robots = Math.max(0, (v.robots || 0) - 1);
    perdu = ` Le rayonnement (${fmtDose(dose)}) a grillé son électronique : le robot est perdu.`;
  }
  Orbiteur.log(`🤖 ${p.icone} ${p.nom} ${de(st)} : réparé par un robot, piloté depuis l’intérieur, en ${fmtDuree(duree)} (deux fois plus lent qu’une sortie, comme Dextre sur l’ISS).${perdu}`);
  Orbiteur.mettreAJourLogistique(); sauver(etat);
  if ($('nav-date')) Orbiteur.majHud(true);
}

// ---------- Dans la sortie ----------
Object.assign(SortieStation.prototype, {
  initMission(type) {
    this.mission = null; this.sac = { attache: true };
    if (!type || !PANNES_STATION[type]) return;
    const p = PANNES_STATION[type];
    this.mission = { type, p, taches: p.taches.map((t) => ({ ...t, s: lieuTache(this.g, t.lieu), fait: 0 })), i: 0, finie: false };
    this.flocons = [];
    // Le sac à outils peut s'échapper (une fois sur trois), quelques minutes après le début.
    this.tChuteSac = Math.random() < 0.35 ? (5 + Math.random() * 15) * 60 : null;
    this.dire(`${p.icone} Mission : ${p.nom.toLowerCase()}. Première tâche : ${this.mission.taches[0].nom}. Allez au repère orange, puis R pour travailler.`);
  },
  tacheCourante() { const m = this.mission; return m && !m.finie ? m.taches[m.i] : null; },
  // Touches de la mission : R (travailler) ; E rattrape aussi le sac à outils.
  toucheMission(code) {
    if (code === 'KeyR') { this.travailler(); return true; }
    if (code === 'KeyE' && this.sac && !this.sac.attache && !this.sac.perdu) {
      const c = this.c, p = c.libre || pointContour(this.g, c.s);
      if (Math.hypot(this.sac.x - p.x, this.sac.y - p.y) < 1.6) { this.sac = { attache: true }; this.dire('🎒 Sac à outils rattrapé, et accroché deux fois cette fois.'); return true; }
    }
    return false;
  },
  travailler() {
    const t = this.tacheCourante();
    if (!t) return this.dire(this.mission ? 'Mission terminée : rentrez au sas (Échap).' : 'Sortie d’inspection : pas de tâche ici.');
    if (this.travail) { this.travail = null; return this.dire('⏸ Travail interrompu.'); }
    const pb = this.empecheTravail(t);
    if (pb) return this.dire(pb);
    this.travail = true;
    this.dire(`🔧 ${t.nom} : au travail (≈ ${fmtDuree(t.duree - t.fait)}). Accélérez le temps si vous voulez (+).`);
  },
  empecheTravail(t) {
    const c = this.c, o = this.autre();
    if (c.libre) return 'Rattrapez d’abord une main courante (E).';
    if (Math.abs(ecartContour(this.g, c.s, t.s)) > 2) return `Allez au repère orange : la tâche « ${t.nom} » est à ${fmt(Math.abs(ecartContour(this.g, c.s, t.s)))} m.`;
    if (t.deux && (!o || o.mort || o.libre || !o.physio.conscient || Math.abs(ecartContour(this.g, o.s, t.s)) > 4)) return `Il faut être deux : ${o && !o.mort ? `${o.eq.nom} doit vous rejoindre (G : suis-moi)` : 'personne pour vous aider'}.`;
    if (t.outil && !this.sac.attache) return this.sac.perdu ? `Sans outils, « ${t.nom} » attendra une autre sortie.` : 'Les outils sont dans le sac qui s’éloigne : rattrapez-le d’abord (Espace pour vous lâcher, E à côté du sac).';
    return '';
  },
  majMission(dt) {
    const m = this.mission;
    if (!m) return;
    // Le sac à outils s'échappe.
    if (this.tChuteSac !== null && this.duree > this.tChuteSac && this.sac.attache) {
      this.tChuteSac = null;
      const c = this.c, p = c.libre || pointContour(this.g, c.s), nx = p.nx || 0, ny = p.ny || 1;
      this.sac = { attache: false, x: p.x + nx, y: p.y + ny + 1, vx: nx * 0.05 + 0.03, vy: ny * 0.05 + 0.02 };
      this.travail = null;
      this.dire(`⚠ 🎒 Le sac à outils de ${c.eq.nom} s’est décroché et s’éloigne doucement (comme en 2008 sur l’ISS). Rattrapez-le : Espace pour vous lâcher, la longe vous retient, E à côté du sac.`);
    }
    if (this.sac && !this.sac.attache && !this.sac.perdu) {
      this.sac.x += this.sac.vx * dt; this.sac.y += this.sac.vy * dt;
      if (Math.hypot(this.sac.x, this.sac.y) > 70) { this.sac.perdu = true; this.dire('🎒 Le sac à outils est perdu : il finira par retomber et brûler. Les tâches avec outils attendront une autre sortie.'); }
    }
    // Flocons d'ammoniac tant que la pompe n'est pas changée ; ceux qui passent dedans en gardent sur la combinaison.
    if (m.p.fuite && !m.finie) {
      const lp = pointContour(this.g, m.taches[0].s);
      if (Math.random() < 0.5) this.flocons.push({ x: lp.x, y: lp.y + 0.3, vx: (Math.random() - 0.5) * 0.6, vy: 0.3 + Math.random() * 0.5, t: 0 });
      for (const c of this.corps) {
        const p = c.libre || pointContour(this.g, c.s);
        // ammoniac : absent (undefined), secondes passées au soleil (nombre), évaporé (true)
        if (!c.mort && c.ammoniac === undefined && Math.hypot(p.x - lp.x, p.y - lp.y) < 3) { c.ammoniac = 0; this.dire(`❄ Flocons d’ammoniac sur la combinaison de ${c.eq.nom}. Toxique à l’intérieur : avant de rentrer, restez 30 min au soleil pour qu’ils s’évaporent.`); }
      }
    }
    for (const f of this.flocons || []) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    if (this.flocons) this.flocons = this.flocons.filter((f) => f.t < 20).slice(-200);
    // Décontamination : au soleil, l'ammoniac s'évapore.
    const auSoleil = (this.o || this.orbite(this.v.t)).hs > 0;   // orbite de l'image (eva.js)
    for (const c of this.corps) if (c.ammoniac !== undefined && c.ammoniac !== true && auSoleil) { c.ammoniac += dt; if (c.ammoniac >= 30 * 60) { c.ammoniac = true; this.dire(`☀ L’ammoniac s’est évaporé de la combinaison de ${c.eq.nom}.`); } }
    // Travail en cours.
    const t = this.tacheCourante();
    if (!this.travail || !t) return;
    const pb = this.empecheTravail(t);
    if (pb) { this.travail = null; return this.dire(`⏸ ${pb}`); }
    t.fait += dt;
    if (t.fait < t.duree) return;
    this.travail = null;
    m.i++;
    if (m.i >= m.taches.length) {
      m.finie = true;
      this.st.pannes = pannesDe(this.st).filter((x) => x.type !== m.type);
      this.dire(`✅ ${m.p.icone} ${m.p.nom} : réparé ! L’atelier ${de(this.st)} retrouve sa vitesse. Rentrez au sas (Échap).`);
    } else this.dire(`✅ ${t.nom} : fait. Ensuite : ${m.taches[m.i].nom}.`);
  },
  // Repère orange de la tâche en cours, barre d'avancement, sac et flocons.
  dessinerMission(ctx, E, k) {
    for (const f of this.flocons || []) { const [x, y] = E(f.x, f.y); ctx.fillStyle = `rgba(240,248,255,${0.9 - f.t / 25})`; ctx.fillRect(x, y, 2.5, 2.5); }
    if (this.sac && !this.sac.attache && !this.sac.perdu) {
      const [x, y] = E(this.sac.x, this.sac.y);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 0.4 * k, y - 0.3 * k, 0.8 * k, 0.6 * k);
      ctx.strokeStyle = '#ff7043'; ctx.lineWidth = 2; ctx.strokeRect(x - 0.4 * k, y - 0.3 * k, 0.8 * k, 0.6 * k);
      texteSurFond(ctx, '🎒 sac à outils', x, y - 0.6 * k, { police: '11px system-ui', couleur: '#ffab91' });
    }
    const t = this.tacheCourante();
    if (!t) return;
    const p = pointContour(this.g, t.s), [x, y] = E(p.x + p.nx * 0.4, p.y + p.ny * 0.4);
    const pulse = 1 + 0.15 * Math.sin(performance.now() / 250);
    ctx.strokeStyle = '#ff9800'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 0.9 * k * pulse, 0, Math.PI * 2); ctx.stroke();
    if (t.fait > 0) {
      const w = 3 * k, u = Math.min(1, t.fait / t.duree);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w / 2, y - 1.6 * k, w, 6);
      ctx.fillStyle = '#66bb6a'; ctx.fillRect(x - w / 2, y - 1.6 * k, w * u, 6);
    }
  },
  lignesMission() {
    const m = this.mission;
    if (!m) return [['Mission', 'inspection, sans tâche', '#b0bec5']];
    return m.taches.map((t, i) => [i === 0 ? `${m.p.icone} Tâches` : '', `${i < m.i || m.finie ? '✓' : i === m.i ? '▶' : '·'} ${t.nom}${i === m.i && !m.finie ? ` (${fmt(Math.min(100, (100 * t.fait) / t.duree))} %)` : ''}`, i < m.i || m.finie ? '#66bb6a' : i === m.i ? '#ffcc80' : '#90a4ae']);
  },
});
