'use strict';
// Départ science-fiction vers une autre étoile : technologies de propulsion, sondes interstellaires,
// choix de la planète de base, traversée animée, arrivée et nouvelle campagne dans le système visé.

// Technologies. vitesse : fraction de la vitesse de la lumière en croisière ; phases (années) : accélération et freinage.
const TECHNOLOGIES = {
  fusion: {
    nom: 'Fusion (type Daedalus)', vitesse: 0.12, accel: 2, frein: 2, plausible: 'plausible, projet étudié dans les années 1970',
    detail: 'Des pastilles de deutérium et d’hélium 3 explosent 250 fois par seconde dans une chambre magnétique. On accélère deux ans, on croise, on se retourne et on freine deux ans.',
  },
  voile: {
    nom: 'Voile laser + frein magnétique', vitesse: 0.2, accel: 0.2, frein: 6, plausible: 'plausible, dans l’esprit du projet Breakthrough Starshot',
    detail: 'Des lasers géants restés dans le Système solaire poussent une voile de plusieurs kilomètres. À l’arrivée, une boucle supraconductrice déployée freine contre le vent de l’étoile pendant des années.',
  },
  antimatiere: {
    nom: 'Antimatière', vitesse: 0.5, accel: 1, frein: 1, plausible: 'théorique : produire assez d’antimatière est hors de portée aujourd’hui',
    detail: 'La matière et l’antimatière s’annihilent en énergie pure. À la moitié de la vitesse de la lumière, le temps passe moins vite à bord que sur Terre (relativité).',
  },
  saut: {
    nom: 'Saut (pure fiction)', jours: 21, plausible: 'pure fiction : aucune physique connue ne le permet',
    detail: 'Une bulle de distorsion contracte l’espace devant le vaisseau et le dilate derrière (« métrique d’Alcubierre »). Quelques semaines, quelle que soit la distance.',
  },
};

// Durée du voyage (années, temps de la Terre) et temps vécu à bord, pour une distance en années-lumière.
function dureeTechnologie(cle, dAL) {
  const T = TECHNOLOGIES[cle];
  if (T.jours) return { ans: T.jours / 365.25, ansBord: T.jours / 365.25 };
  const v = T.vitesse, phases = T.accel + T.frein;
  const ans = dAL / v + phases / 2;                         // accélération et freinage à vitesse moyenne v/2
  const gamma = 1 / Math.sqrt(1 - v * v);
  const croisiere = Math.max(0, ans - phases);
  const ansBord = croisiere / gamma + phases * (1 + 1 / gamma) / 2;
  return { ans, ansBord, gamma };
}

// ---------- Sondes interstellaires ----------
const SONDES_GRAPPE_INTERSTELLAIRE = 6;   // une grappe
const VITESSE_SONDES_INTERSTELLAIRES = 0.2;   // voiles laser légères, 20 % de c

function sondesDisponibles(v) {
  const st = stationDeDepart(v);
  return (v.sondes || 0) + (st ? st.stock.sondes || 0 : 0);
}
function etatSondesSysteme(v, sys) {
  if (v.systemesSondes && v.systemesSondes[sys]) return { recu: true, ...v.systemesSondes[sys] };
  const s = (v.sondesInterstellaires || []).find((x) => x.systeme === sys);
  return s ? { enRoute: true, ...s } : null;
}
function envoyerSondesInterstellaires(v, sys, log) {
  if (etatSondesSysteme(v, sys)) return log('Des sondes ont déjà été envoyées vers ce système.');
  if (sondesDisponibles(v) < SONDES_GRAPPE_INTERSTELLAIRE) return log(`Il faut ${SONDES_GRAPPE_INTERSTELLAIRE} sondes (à bord de l’orbiteur et à la grande station).`);
  let reste = SONDES_GRAPPE_INTERSTELLAIRE;
  const prisBord = Math.min(v.sondes, reste); v.sondes -= prisBord; reste -= prisBord;
  const st = stationDeDepart(v); if (reste > 0 && st) st.stock.sondes -= reste;
  const d = DONNEES_ETOILES[sys].distanceAL;
  const arrivee = v.t + (d / VITESSE_SONDES_INTERSTELLAIRES) * ANNEE_S;
  const reception = arrivee + d * ANNEE_S;                  // les données reviennent à la vitesse de la lumière
  v.sondesInterstellaires = v.sondesInterstellaires || [];
  v.sondesInterstellaires.push({ systeme: sys, depart: v.t, arrivee, reception, n: SONDES_GRAPPE_INTERSTELLAIRE });
  log(`Grappe de ${SONDES_GRAPPE_INTERSTELLAIRE} sondes à voile laser lancée vers ${DONNEES_ETOILES[sys].nom} : arrivée vers ${fmtAnnee(anneeDuJeu(arrivee))}, données reçues vers ${fmtAnnee(anneeDuJeu(reception))}.`);
}
// Données reçues : les sondes ont cartographié les planètes et repéré une zone de base sur chaque astre solide.
function mettreAJourSondesInterstellaires(v, log) {
  for (const s of v.sondesInterstellaires || []) {
    if (v.t < s.reception) continue;
    const sys = SYSTEMES[s.systeme], sites = {};
    for (const a of sys.astres) if (a.type === 'solide') {
      const x = chercherZonePlate(a);
      const [ressource, prod] = ressourceLocale(a);
      if (x !== null) sites[a.id] = { x, ressource, prod, t: v.t };
    }
    v.systemesSondes = v.systemesSondes || {};
    v.systemesSondes[s.systeme] = { recu: v.t, sites };
    const n = Object.keys(sites).length;
    log(`Données reçues des sondes de ${DONNEES_ETOILES[s.systeme].nom} : ${sys.astres.filter((a) => a.type !== 'etoile').length} astre(s) cartographié(s), ${n} zone${n > 1 ? 's' : ''} de base repérée${n > 1 ? 's' : ''}. On peut choisir la planète où s’installer.`);
  }
  if (v.sondesInterstellaires) v.sondesInterstellaires = v.sondesInterstellaires.filter((s) => v.t < s.reception);
}

// Astres où l'on peut s'installer (solides) et ce que les sondes en disent.
function planetesDeBase(v, sys) {
  const recu = v.systemesSondes && v.systemesSondes[sys];
  return SYSTEMES[sys].astres.filter((a) => a.type === 'solide').map((a) => ({ a, site: recu ? recu.sites[a.id] : null, connu: !!recu }));
}

// ---------- Dessins des vaisseaux ----------
// (x, y) : centre ; L : longueur en pixels ; le vaisseau pointe vers la droite.
function dessinerVaisseauInterstellaire(ctx, cle, x, y, L, t, poussee = 1) {
  ctx.save(); ctx.translate(x, y);
  const metal = '#cfd8dc', sombre = '#455a64';
  if (cle === 'fusion') {
    // Daedalus : grosse tuyère en cloche à l'arrière, sphères de carburant, bouclier à l'avant.
    if (poussee > 0) { const g = ctx.createRadialGradient(-L * 0.5, 0, 0, -L * 0.5, 0, L * 0.35); g.addColorStop(0, 'rgba(200,220,255,0.95)'); g.addColorStop(1, 'rgba(120,160,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(-L * 0.55, 0, L * 0.35 * (0.9 + 0.1 * Math.sin(t * 40)), 0, 2 * Math.PI); ctx.fill(); }
    ctx.fillStyle = sombre; ctx.beginPath(); ctx.moveTo(-L * 0.5, -L * 0.22); ctx.quadraticCurveTo(-L * 0.25, -L * 0.05, -L * 0.15, -L * 0.05); ctx.lineTo(-L * 0.15, L * 0.05); ctx.quadraticCurveTo(-L * 0.25, L * 0.05, -L * 0.5, L * 0.22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = metal; ctx.fillRect(-L * 0.15, -L * 0.02, L * 0.55, L * 0.04);
    for (const [dx, r] of [[-0.05, 0.09], [0.08, 0.09], [0.21, 0.07]]) for (const sg of [-1, 1]) { ctx.fillStyle = '#b0bec5'; ctx.beginPath(); ctx.arc(L * dx, sg * L * 0.08, L * r * 0.6, 0, 2 * Math.PI); ctx.fill(); }
    ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.ellipse(L * 0.45, 0, L * 0.03, L * 0.1, 0, 0, 2 * Math.PI); ctx.fill();
  } else if (cle === 'voile') {
    // Voile laser immense (vue en biais), filins, petite charge utile ; boucle magnétique pour freiner.
    ctx.strokeStyle = 'rgba(220,230,255,0.5)'; ctx.lineWidth = 1;
    for (const k of [-1, -0.5, 0, 0.5, 1]) { ctx.beginPath(); ctx.moveTo(L * 0.2, 0); ctx.lineTo(-L * 0.25, k * L * 0.45); ctx.stroke(); }
    const g = ctx.createLinearGradient(-L * 0.3, -L * 0.5, -L * 0.2, L * 0.5);
    g.addColorStop(0, 'rgba(230,240,255,0.95)'); g.addColorStop(0.5, 'rgba(170,190,230,0.9)'); g.addColorStop(1, 'rgba(230,240,255,0.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-L * 0.27, 0, L * 0.06, L * 0.48, 0, 0, 2 * Math.PI); ctx.fill();
    if (poussee > 0) { ctx.strokeStyle = `rgba(255,80,80,${0.25 + 0.15 * Math.sin(t * 6)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-L * 2, 0); ctx.lineTo(-L * 0.33, 0); ctx.stroke(); }
    ctx.fillStyle = metal; ctx.fillRect(L * 0.15, -L * 0.03, L * 0.2, L * 0.06);
    ctx.strokeStyle = 'rgba(120,200,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(L * 0.45, 0, L * 0.04, L * 0.18, 0, 0, 2 * Math.PI); ctx.stroke();
  } else if (cle === 'antimatiere') {
    // Longue poutre, réservoir magnétique d'antimatière, tuyère magnétique et radiateurs.
    if (poussee > 0) { const g = ctx.createLinearGradient(-L * 0.5, 0, -L * 1.1, 0); g.addColorStop(0, 'rgba(255,120,255,0.9)'); g.addColorStop(1, 'rgba(120,60,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-L * 0.48, -L * 0.04); ctx.lineTo(-L * 1.1, -L * 0.12); ctx.lineTo(-L * 1.1, L * 0.12); ctx.lineTo(-L * 0.48, L * 0.04); ctx.fill(); }
    ctx.fillStyle = sombre; ctx.fillRect(-L * 0.5, -L * 0.05, L * 0.08, L * 0.1);
    ctx.fillStyle = metal; ctx.fillRect(-L * 0.42, -L * 0.015, L * 0.82, L * 0.03);
    for (const dx of [-0.25, -0.1, 0.05]) for (const sg of [-1, 1]) { ctx.fillStyle = 'rgba(200,90,70,0.85)'; ctx.fillRect(L * dx, sg > 0 ? L * 0.02 : -L * 0.16, L * 0.1, L * 0.14); }
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.fillStyle = `rgba(230,120,255,${pulse})`; ctx.beginPath(); ctx.arc(L * 0.22, 0, L * 0.05, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#b39ddb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(L * 0.22, 0, L * 0.07, 0, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#90a4ae'; ctx.fillRect(L * 0.32, -L * 0.04, L * 0.1, L * 0.08);
  } else {
    // Saut : vaisseau entouré d'un anneau de distorsion, l'espace est tordu autour.
    ctx.strokeStyle = `rgba(120,220,255,${0.4 + 0.3 * Math.sin(t * 3)})`; ctx.lineWidth = 3;
    for (const k of [0.95, 1.15]) { ctx.beginPath(); ctx.ellipse(0, 0, L * 0.18 * k, L * 0.42 * k, 0, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.fillStyle = metal; ctx.beginPath(); ctx.moveTo(L * 0.4, 0); ctx.lineTo(-L * 0.3, -L * 0.07); ctx.lineTo(-L * 0.3, L * 0.07); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4dd0e1'; ctx.fillRect(-L * 0.05, -L * 0.012, L * 0.25, L * 0.024);
  }
  ctx.restore();
}

// ---------- Traversée animée ----------
class TransitInterstellaire {
  constructor(info) {
    this.i = info; this.t = 0; this.fini = false;
    this.duree = info.tech === 'saut' ? 12 : 22;        // secondes à l'écran
    this.etoiles = Array.from({ length: 260 }, (_, k) => [hash(k * 3.1) * 2 - 1, hash(k * 7.3) * 2 - 1, 0.2 + hash(k * 1.9) * 0.8]);
  }
  step(dt) { if (dt > 0) { this.t += dt; if (this.t >= this.duree) this.fini = true; } }
  passer() { this.fini = true; }
  dessiner(ctx, W, H) {
    const f = Math.min(1, this.t / this.duree), i = this.i, T = TECHNOLOGIES[i.tech];
    ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H);
    // Phase et vitesse (fraction de c) à cet instant du voyage.
    const ph = i.tech === 'saut' ? (f < 0.1 ? 'accélération' : f > 0.9 ? 'freinage' : 'saut') : (f < 0.15 ? 'accélération' : f > 0.82 ? 'freinage' : 'croisière');
    const vit = i.tech === 'saut' ? 1 : (ph === 'accélération' ? f / 0.15 : ph === 'freinage' ? (1 - f) / 0.18 : 1) * T.vitesse;
    // Étoiles qui défilent (plus vite quand la vitesse monte) ; en saut, tunnel lumineux.
    const cx = W * 0.55, cy = H * 0.52;
    for (const [x, y, b] of this.etoiles) {
      const z = (((x + 1) * 0.5 - this.t * (0.05 + vit * 0.9)) % 1 + 1) % 1;
      const px = cx + (z - 0.5) * W * 1.6, py = cy + y * H * 0.55;
      const lon = 1 + vit * 60;
      ctx.strokeStyle = i.tech === 'saut' && ph === 'saut' ? `rgba(140,220,255,${b})` : `rgba(255,255,255,${b * 0.8})`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + lon, py); ctx.stroke();
    }
    if (i.tech === 'saut' && ph === 'saut') for (let k = 0; k < 6; k++) { const r = ((this.t * 220 + k * 70) % 420); ctx.strokeStyle = `rgba(120,220,255,${0.3 * (1 - r / 420)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.5, 0, 0, 2 * Math.PI); ctx.stroke(); }
    // Le Soleil qui s'éloigne derrière, l'étoile visée qui grossit devant.
    const sol = Math.max(0.5, 30 * (1 - f) ** 3);
    halo(ctx, W * 0.08, cy, sol * 4, [255, 230, 160], 0.6); halo(ctx, W * 0.08, cy, sol, [255, 245, 210], 1);
    const cible = 2 + 60 * f ** 4;
    const coul = DONNEES_ETOILES[i.systeme].etoiles[0].couleur;
    const c = [parseInt(coul.slice(1, 3), 16), parseInt(coul.slice(3, 5), 16), parseInt(coul.slice(5, 7), 16)];
    halo(ctx, W * 0.93, cy, cible * 4, c, 0.6); halo(ctx, W * 0.93, cy, cible, c, 1);
    dessinerVaisseauInterstellaire(ctx, i.tech, cx, cy, Math.min(W, H) * 0.38, this.t, ph === 'croisière' && i.tech !== 'voile' ? 0 : 1);
    // Panneau
    const ans = i.ans * f, bord = i.ansBord * f;
    const lignes = [
      [`Vers ${DONNEES_ETOILES[i.systeme].nom}`, '#ffffff', 600, 17],
      [T.nom, '#ffd666', 600, 13],
      [`Phase : ${ph} · vitesse ${i.tech === 'saut' ? '— (espace distordu)' : `${fmt(vit * 100, 1)} % de la vitesse de la lumière`}`, '#cfd8e3', 400, 13],
      [`Distance restante : ${fmt(i.distanceAL * (1 - (i.tech === 'saut' ? f : Math.min(1, f * 1.02))), 2)} années-lumière`, '#cfd8e3', 400, 13],
      [`Date du jeu : ${fmtAnnee(i.anneeDepart + ans)} · temps vécu à bord : ${fmtDureeAnnees(bord)}`, '#bfe0ff', 400, 13],
      [f >= 1 ? `Arrivée par l’extérieur du système, cap sur ${i.nomBase}.` : `Arrivée prévue vers ${fmtAnnee(i.anneeDepart + i.ans)}.`, '#e6edf6', 400, 13],
    ];
    ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const w = Math.min(460, W - 28);
    let hh = 16; for (const [, , , ta] of lignes) hh += ta + 9;
    ctx.fillStyle = 'rgba(8,14,28,0.78)'; ctx.beginPath(); ctx.roundRect(14, 14, w, hh, 10); ctx.fill();
    let yy = 24; for (const [txt, col, gr, ta] of lignes) { ctx.font = `${gr} ${ta}px system-ui, sans-serif`; ctx.fillStyle = col; yy = ecrireLignes(ctx, txt, 26, yy, w - 24, ta + 9); }
    ctx.restore();
    texteSurFond(ctx, 'Entrée, Espace ou toucher : passer', W / 2, H - 14, { police: '12px system-ui, sans-serif', couleur: '#8fa3b8' });
  }
}

// ---------- Arrivée : nouvelle campagne dans l'autre système ----------
// Le vaisseau emporte le chargement de la grande station et de l'orbiteur ; à l'arrivée, une station est déployée
// en orbite de la planète de base (avec les matériaux et les ergols) et l'orbiteur garde kits, robots et atterrisseurs.
function arriverDansSysteme(v, info) {
  const st = stationDeDepart(v), k = st ? { ...st.stock } : {};
  const ech = Object.values(v.echantillonsRapportes || {}).reduce((s, x) => s + x, 0);
  v.historique = v.historique || [];
  v.historique.push({ systeme: v.systeme || 'solaire', nom: SYSTEME.nom, quitte: info.tDepart, stations: v.stations.length, bases: v.bases.length, echantillons: ech });
  v.t = info.tArrivee;
  v.systeme = info.systeme;
  v.planeteBase = info.base;
  choisirSystemeCampagne(v);
  const a = ASTRES_PAR_ID[info.base];
  const r0 = rayonOrbiteBasse(a), vc = Math.sqrt(a.gm / r0);
  v.orb = { centre: a.id, r: [r0, 0], v: [0, vc], transfert: null };
  for (const cle of ['kits', 'kitsBase', 'atterrisseurs', 'robots', 'sondes']) v[cle] = (v[cle] || 0) + (k[cle] || 0);
  v.carburant = ORBITEUR.carburantMax;
  const r1 = r0 * 1.02;
  const station = {
    id: 's' + Date.now(), nom: `Station ${a.nom}`, centre: a.id, r: [0, r1], v: [-Math.sqrt(a.gm / r1), 0], t0: v.t, terrestre: false, niveau: 1,
    stock: { ...STOCK_VIDE(), carburant: k.carburant || 0, ergols: k.ergols || 0, materiaux: k.materiaux || 0, lanceurRetour: k.lanceurRetour || 0, extensions: k.extensions || 0, extensionsStation: k.extensionsStation || 0 },
    chantiers: [],
  };
  v.stations = [station];
  v.bases = []; v.sondesEnVol = []; v.cargos = []; v.robotsAuto = []; v.conteneurs = [];
  v.sites = { ...((v.systemesSondes && v.systemesSondes[info.systeme] && v.systemesSondes[info.systeme].sites) || {}) };
  v.visites = {}; v.echantillonsABord = {}; v.echantillonsRapportes = {}; v.cible = null;
  if (v.equipe) for (const m of v.equipe) { if (m.etat === 'mission') m.etat = 'bord'; delete m.mission; }
  v.journal.push({ t: v.t, texte: `Arrivée dans le ${SYSTEME.nom} après ${fmtDureeAnnees(info.ans)} (${fmtDureeAnnees(info.ansBord)} vécus à bord). ${station.nom} déployée en orbite de ${a.nom}. Prochaine étape : se poser et construire la base.` });
  return station;
}
