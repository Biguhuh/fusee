'use strict';
// Accueil : onglet « Progression » (campagne en cours / toutes campagnes) et liste des easter eggs trouvés.
//
// Les visites d'une campagne sont gardées à part (etat.progression.campagnes[id]), puis cumulées pour
// « Toutes campagnes » : une nouvelle campagne ou un départ vers une autre étoile n'effacent plus rien.

// ---------- Références des easter eggs ----------
const REFERENCES_EGGS = {
  mercure: 'Terminator (1984) : le robot venu du futur qui promet de revenir. Double clin d’œil : le terminateur est aussi la ligne entre le jour et la nuit.',
  lune: 'On a marché sur la Lune (Tintin, Hergé, 1954) et sa fusée à damier rouge et blanc.',
  mars: 'Mercano el Marciano (2002), dessin animé argentin d’un petit Martien vert aux journées chaotiques.',
  'mars-tripode': 'La Guerre des mondes (H. G. Wells, 1898) : les tripodes martiens, vaincus par les microbes de la Terre.',
  ceres: 'Rencontres du troisième type (Spielberg, 1977) : cinq notes de musique pour parler aux extraterrestres, au pied d’une montagne au sommet plat.',
  phobos: 'Elvis Presley, le disque d’or, et la formule des annonceurs : « Elvis a quitté le bâtiment ».',
  deimos: 'Buzz l’Éclair (Toy Story, 1995), le jouet persuadé d’être un vrai ranger de l’espace.',
  vesta: 'Predator (1987) : le chasseur extraterrestre invisible, trahi par un tremblement de l’air.',
  chat: 'Aucune référence : un chat, sur un caillou. Aucune explication.',
  io: 'Le surnom réel d’Io, « la lune pizza », pour ses couleurs de soufre.',
  europe: '2001 et 2010 (Arthur C. Clarke, Stanley Kubrick) : le monolithe noir, et Europe interdite aux humains.',
  ganymede: 'Les Zinzins de l’espace (1997) : des extraterrestres bruyants, et un générique, « Monster Men », chanté par Iggy Pop.',
  callisto: 'WALL-E (Pixar, 2008) : le petit robot qui compacte les déchets, seul sur une Terre abandonnée.',
  encelade: 'Blade Runner (1982) : la licorne et le petit origami en papier plié.',
  pluton: 'Fait réel : Tombaugh Regio, le cœur de Pluton photographié par New Horizons en 2015.',
  triton: 'Création du jeu : un cri que personne n’entend, faute d’air pour le porter.',
  charon: 'Le Guide du voyageur galactique (Douglas Adams) : un bon voyageur sait toujours où est sa serviette.',
  japet: 'Stargate SG-1 : la porte des étoiles, et Teal’c, le guerrier impassible qui lève un sourcil.',
  rhea: 'SamSam (Serge Bloch, Pomme d’Api) : le plus petit des grands héros, sa SamSoucoupe et SamNounours.',
  titania: 'Superman : la forteresse de la Solitude, palais de glace du héros à la cape rouge.',
  titan: 'Lilo et Stitch (Disney, 2002) : Stitch arrive sur Terre dans une capsule de secours rouge.',
  miranda: 'Walker, Texas Ranger et les « Chuck Norris facts », ces exploits impossibles qu’on prête à l’acteur.',
  prospero: 'Walker, Texas Ranger et les « Chuck Norris facts » : il a compté jusqu’à l’infini. Deux fois.',
  'tauceti-oeuf': 'Alien (1979) : les œufs d’où sortent les créatures.',
  'epseri-main': 'Star Trek : le salut vulcain de Spock, « Longue vie et prospérité ».',
  'exrep-marais': 'Star Wars : le vieux maître caché dans les marais de Dagobah.',
  'exrep-desert': 'Star Wars : le jeune fermier de Tatooine, sous ses deux soleils.',
  'exrep-cites': 'Star Wars : la Cité des nuages de Bespin.',
  'exrep-cantine': 'Star Wars : la cantina de Mos Eisley, le contrebandier et son grand copilote poilu.',
  'exrep-foret': 'Star Wars : les Ewoks et leurs villages dans les arbres d’Endor.',
  'exrep-polaire': 'Star Wars : la bataille de Hoth et les marcheurs impériaux à quatre pattes.',
  'trappist-e': 'E.T. l’extra-terrestre (Spielberg, 1982), qui veut téléphoner à la maison.',
  'umbriel-flash': 'Men in Black (1997) : le petit appareil des agents en costume noir, qui efface la mémoire d’un éclair.',
  'pallas-galaxie': 'Men in Black (1997) : la galaxie tient dans une bille, accrochée au collier d’un chat nommé Orion.',
  'junon-casier': 'Men in Black II (2002) : une civilisation minuscule vit dans un casier de gare et vénère celui qui a la clé.',
  'hyperion-bibli': 'Interstellar (Christopher Nolan, 2014) : la bibliothèque, où des livres tombent pour transmettre un message à travers le temps.',
  'trappist-vague': 'Interstellar (2014) : la planète de Miller, ses vagues géantes, et le temps qui y passe bien plus lentement qu’ailleurs.',
  'mimas-robot': 'Interstellar (2014) : TARS, le robot fait de blocs articulés, réglé sur 75 % d’humour.',
  'mars-patates': 'Seul sur Mars (Andy Weir, 2011 ; film 2015) : un astronaute oublié sur Mars cultive des pommes de terre, avec pour seule musique les disques disco de sa commandante.',
  'barnard-ver': 'Dune (Frank Herbert, 1965) : sur Arrakis, les vers géants des sables viennent à qui marche en rythme.',
  'hygie-prince': 'Le Petit Prince (Saint-Exupéry, 1943) : l’astéroïde B 612, ses trois volcans, sa rose sous globe et ses baobabs à arracher.',
  'ariel-solaris': 'Solaris (Stanisław Lem, 1961 ; films de Tarkovski, 1972, et Soderbergh, 2002) : une planète qui fait réapparaître les êtres disparus.',
  'psyche-cabine': 'Doctor Who (depuis 1963) : le TARDIS, cabine de police bleue plus grande à l’intérieur qu’à l’extérieur.',
  'oberon-kerbal': 'Kerbal Space Program (2015) : le jeu des petits astronautes verts, toujours souriants, même quand la fusée explose.',
  'nereide-nono': 'Ulysse 31 (1981) : Nono, le petit robot qui mange des boulons, compagnon d’Ulysse et de son fils perdus dans l’espace.',
  'protee-feu': 'Outer Wilds (2019) : un feu de camp, des guimauves, et une boucle de 22 minutes avant que le Soleil n’explose.',
  'io-aliens': 'Toy Story (1995) : les petits extraterrestres à trois yeux de la machine à pince, qui vénèrent « le grappin ».',
  'callisto-plante': 'WALL-E (Pixar, 2008) : la petite plante dans une vieille chaussure, preuve que la vie peut revenir sur Terre.',
  'eunomie-kryptonite': 'Superman : la kryptonite verte, le seul caillou qui fasse peur au héros.',
  'soleil-sunshine': 'Sunshine (Danny Boyle, 2007) : l’Icarus II, envoyé rallumer notre Soleil mourant avec une bombe grande comme Manhattan.',
  'jupiter-albator': 'Albator (Leiji Matsumoto, 1978) : le capitaine pirate balafré et son vaisseau, l’Arcadia, au service de la seule liberté.',
  'neptune-eventhorizon': 'Event Horizon, le vaisseau de l’au-delà (Paul W. S. Anderson, 1997) : disparu près de Neptune, il réapparaît sept ans plus tard. Personne ne sait où il est allé.',
  'uranus-goldorak': 'Goldorak (Go Nagai, 1975 ; diffusé en France en 1978) : le robot géant à cornes, sa soucoupe, et son fulguropoing.',
  'rama': 'Rendez-vous avec Rama (Arthur C. Clarke, 1973) : un cylindre extraterrestre de 50 km traverse le Système solaire, indifférent aux humains.',
  'tethys-frigo': 'Indiana Jones et le Royaume du crâne de cristal (2008) : Indy survit à un essai atomique caché dans un réfrigérateur doublé de plomb.',
  'phoebe-crane': 'Indiana Jones et le Royaume du crâne de cristal (2008) : les crânes de cristal au front allongé, venus d’êtres d’un autre monde.',
  'lune-arche': 'Transformers 3 : La Face cachée de la Lune (2011) : un vaisseau transformer écrasé sur la Lune, la vraie raison secrète de la mission Apollo 11.',
  'interamnia-cube': 'Transformers (2007) : l’AllSpark, le cube qui donne vie aux machines, tombé du ciel il y a des millénaires.',
  'pluton-unicron': 'Transformers, le film (1986) : Unicron, le transformer grand comme une planète, qui dévore les mondes.',
  'dione-marteau': 'Thor (Marvel) : Mjöllnir, le marteau que seul celui qui en est digne peut soulever.',
  'tauceti-chapeau': 'One Piece (Eiichirō Oda, depuis 1997) : le chapeau de paille de Monkey D. Luffy, qui a juré de devenir le roi des pirates.',
  'aegir-navire': 'One Piece : le Thousand Sunny, navire à tête de lion de l’équipage du Chapeau de paille. Ægir est le dieu nordique de la mer.',
  'barnard-cylon': 'Battlestar Galactica (1978 ; 2004) : les Cylons, robots à l’œil rouge qui balaie de gauche à droite, et qui ont un plan.',
  'mars-galactica': 'Battlestar Galactica (1978 ; 2004) : le vaisseau de guerre Galactica escorte les derniers humains, à la recherche d’une planète mythique, la Terre.',
  'trappist-crematoria': 'Les Chroniques de Riddick (2004) : Crématoria, planète-prison où le lever du soleil brûle tout ; les évadés courent devant l’aube.',
  'barnard-yeux': 'Pitch Black (2000), premier film de la saga Riddick : ses yeux opérés voient dans le noir et brillent d’un éclat argenté.',
  'mars-casque': 'Mars Attacks! (Tim Burton, 1996) : les Martiens au cerveau énorme sous un casque de verre, vaincus par une chanson de yodel.',
  'mars-soucoupes': 'Mars Attacks! (Tim Burton, 1996) : les soucoupes martiennes, et le célèbre « Ack ack ack ! » des envahisseurs.',
  'lune-melies': 'Le Voyage dans la Lune (Georges Méliès, 1902) : l’obus des savants se plante dans l’œil de la Lune, l’une des images les plus célèbres du cinéma.',
  'delorean': 'Retour vers le futur (1985) : à 88 miles à l’heure, la DeLorean voyage dans le temps et laisse deux traînées de feu sur la route.',
  'proxima-b': 'Blade Runner (1982) : la ville sous la pluie, et le test qui démasque les répliquants.',
  'lune-soucoupe': 'Independence Day (1996) : le vaisseau-mère extraterrestre, large de 550 km, en orbite près de la Lune, vaincu par un virus informatique un 4 juillet.',
  saturne: 'Space Oddity (David Bowie, 1969) : Major Tom, perdu dans sa capsule.',
  'tauceti-balise': 'Alien (1979) : la compagnie Weyland, Ripley, seule survivante, et Jones, le chat.',
  'trappist-f': 'Le Cinquième Élément (Luc Besson, 1997) : le Floston Paradise, paquebot de croisière spatial.',
  'exrep-sphere': 'Star Wars : l’Étoile de la Mort, encore en chantier.',
  alphacen: 'Star Trek : Zefram Cochrane, inventeur du vol plus rapide que la lumière, retiré sur Alpha Centauri.',
  betelgeuse: 'Blade Runner (1982) : le dernier monologue du répliquant Roy Batty, qui a vu des vaisseaux en feu près de l’épaule d’Orion.',
  'iss-wolowitz': 'The Big Bang Theory : Howard Wolowitz, l’ingénieur parti sur l’ISS, qui en parle sans cesse.',
  'voiture-1': 'Fait réel : le Tesla Roadster rouge lancé par SpaceX en février 2018, avec un mannequin au volant.',
  'voiture-2': 'Fait réel : le Tesla Roadster de SpaceX tourne vraiment autour du Soleil. Ici, on le fait disparaître.',
  'voiture-3': 'Retour vers le futur (1985) : 2,21 gigowatts, l’énergie qu’il faut pour voyager dans le temps.',
};

// Où retrouver un easter egg déjà trouvé.
function lieuEgg(e) {
  if (e.id === 'betelgeuse') return 'dans « Se promener », en observant Bételgeuse';
  if (e.id === 'delorean') return 'en astromobile, sur n’importe quel astre : pied au plancher, à pleine vitesse, pendant quelques secondes';
  if (e.id === 'rama') return 'en route, en orbite autour du Soleil au-delà de 3 UA, avec l’équipage (en campagne)';
  if (e.id === 'iss-wolowitz') return 'à la Station spatiale internationale, en orbite terrestre (rendez-vous et amarrage, en campagne)';
  if (e.id.startsWith('voiture-')) return 'en orbite autour du Soleil, sur la route de la voiture rouge (en campagne)';
  if (e.orbite) return `en orbite ${de(astrePartout(e.astre))} : l’équipage de l’orbiteur l’aperçoit après un tour complet (en campagne)`;
  const def = EASTER_EGGS.find((x) => x.id === e.id);
  if (!def) return sur(astrePartout(e.astre));
  return `au sol, à ${fmt(Math.abs(def.dx))} m ${def.dx < 0 ? 'à gauche ◀' : 'à droite ▶'} du site de descente, à pied ou en astromobile`;
}

// Nom court d'une trouvaille (la voiture rouge compte trois étapes, mais un seul nom).
function nomEgg(e) {
  if (e.id === 'iss-wolowitz') return 'ISS';
  if (e.id.startsWith('voiture-')) return 'voiture rouge';
  return astrePartout(e.astre).nom;
}
function nomsEggs(l) { return [...new Set(l.map(nomEgg))].join(', '); }

// Easter eggs trouvés sur un astre (au sol ou en orbite).
function eggsTrouvesSur(id) { return tousLesEggs().filter((e) => e.astre === id && eggTrouve(e.id)); }

// Fiche de la carte (visite rapide) : où sont les easter eggs déjà trouvés sur cet astre.
function htmlEggsAstre(id) {
  const l = eggsTrouvesSur(id);
  if (!l.length) return '';
  return `<div class="encart eggs-astre"><b>✨ Easter egg${l.length > 1 ? 's' : ''} trouvé${l.length > 1 ? 's' : ''} ici</b><ul>${l.map((e) =>
    `<li>${majuscule(lieuEgg(e))}.<br><i>${e.texte}</i><br><span class="doux">Référence : ${REFERENCES_EGGS[e.id] || '—'}</span></li>`).join('')}</ul></div>`;
}

// Fenêtre « Easter eggs » : ceux qui sont trouvés, avec où les retrouver et leur référence. Les autres restent cachés.
function ouvrirEggs(allerA) {
  const tous = tousLesEggs(), trouves = tous.filter((e) => eggTrouve(e.id));
  const m = $('modale');
  const ligne = (e) => {
    const def = EASTER_EGGS.find((x) => x.id === e.id);
    const y = def && ASTRES_PAR_ID[e.astre] && allerA ? `<button data-aller="${e.astre}">🎯 Y aller en visite rapide</button>` : '';
    return `<li class="egg-ligne"><b>${majuscule(nomEgg(e))}</b> — ${lieuEgg(e)}.<br>
      <i>${e.texte}</i><br><span class="ref-egg">📚 ${REFERENCES_EGGS[e.id] || 'Référence non renseignée.'}</span>${y ? `<div>${y}</div>` : ''}</li>`;
  };
  m.innerHTML = `<div class="fenetre large"><header class="entete"><div><h2>✨ Easter eggs</h2>
    <p>${trouves.length} trouvé${trouves.length > 1 ? 's' : ''} sur ${tous.length}. Les autres restent cachés : il faut explorer, à pied, en astromobile ou en orbite.</p></div><button class="fermer">✕</button></header>
    ${trouves.length ? `<ul class="liste-eggs">${trouves.map(ligne).join('')}</ul>` : '<p class="doux">Aucun easter egg trouvé pour l’instant. Ils se cachent au sol de certains astres, et quelques-uns en orbite.</p>'}</div>`;
  m.classList.remove('cache');
  m.querySelector('.fermer').onclick = () => Infos.fermer();
  m.querySelectorAll('[data-aller]').forEach((b) => { b.onclick = () => { Infos.fermer(); allerA(b.dataset.aller); }; });
}

// ---------- Cumul des campagnes ----------
function progression() { etat.progression = etat.progression || { campagnes: {} }; return etat.progression; }
// Ajoute ce que la campagne a fait à sa fiche (sans rien retirer : la fiche ne fait que grandir).
function cumulerProgression(v) {
  if (!v || typeof etat === 'undefined') return;
  const id = idCampagne();
  if (!id) return;
  const p = progression();
  const c = (p.campagnes[id] = p.campagnes[id] || { visites: {}, echantillons: {}, bases: {}, stations: {}, debut: Date.now() });
  for (const [a, x] of Object.entries(v.visites || {})) c.visites[a] = { ...(c.visites[a] || {}), ...x };
  for (const [a, n] of Object.entries(v.echantillonsRapportes || {})) c.echantillons[a] = Math.max(c.echantillons[a] || 0, n);
  for (const b of v.bases || []) c.bases[b.astre] = Math.max(c.bases[b.astre] || 0, b.niveau || 1);
  for (const s of v.stations || []) c.stations[s.centre] = true;
  c.expeditions = Math.max(c.expeditions || 0, v.expeditions || 0);
  c.t = v.t;
  if (v.fin) c.fin = { etoile: v.fin.nomEtoile };
}

// ---------- Onglet Progression ----------
let ongletProgression = 'campagne';
const iconeVisite = (x) => [x.pose && '🧑‍🚀 posé', x.plonge && '🌊 plongée', x.drone && '🚁 drone', x.sonde && '🛰 sonde'].filter(Boolean).join(' · ');

// Sorties et missions par astre, d'après le registre (campagne en cours, ou totaux).
function sortiesParAstre(parCampagne) {
  const res = {};
  for (const f of Object.values(registre())) {
    const s = parCampagne ? statsCampagne(f, false) : f;
    if (!s) continue;
    for (const [a, n] of Object.entries(s.astres || {})) res[a] = (res[a] || 0) + n;
  }
  return res;
}

// Tableau des astres visités, rangés par système (planète et ses lunes), puis les autres systèmes stellaires.
function tableauAstres(d) {
  const ids = Object.keys(d.visites).filter((id) => iconeVisite(d.visites[id]));
  if (!ids.length) return '<p class="doux">Aucun astre visité pour l’instant.</p>';
  const groupes = [];
  const pris = new Set();
  for (const [pid, lunes] of SYSTEME.carte) {
    const l = [pid, ...lunes].filter((id) => ids.includes(id));
    if (l.length) { groupes.push([ASTRES_PAR_ID[pid].nom, l]); l.forEach((id) => pris.add(id)); }
  }
  const reste = ids.filter((id) => !pris.has(id));
  if (reste.length) groupes.push(['Autres astres', reste]);
  const ligne = (id) => {
    const x = d.visites[id], eggs = eggsTrouvesSur(id);
    const inst = [d.bases[id] && `🏠 base niv. ${d.bases[id]}`, d.stations[id] && '🛰 station'].filter(Boolean).join(', ');
    return `<tr><td><b>${majuscule(astrePartout(id).nom)}</b></td><td>${iconeVisite(x)}</td><td>${d.sorties[id] || '—'}</td>
      <td>${d.echantillons[id] || '—'}</td><td>${inst || '—'}</td><td>${eggs.length ? `<span title="${eggs.map((e) => e.texte).join(' / ')}">✨ ${eggs.length}</span>` : ''}</td>
      ${d.campagnes ? `<td>${d.campagnes[id] || ''}</td>` : ''}</tr>`;
  };
  return `<div class="defile-tableau"><table class="table-progression"><thead><tr><th>Astre</th><th>Visite</th><th>Sorties</th><th>Échantillons</th><th>Installations</th><th>✨</th>${d.campagnes ? '<th>Campagnes</th>' : ''}</tr></thead>
    ${groupes.map(([nom, l]) => `<tbody><tr class="groupe-ligne"><th colspan="${d.campagnes ? 7 : 6}">${nom}</th></tr>${l.map(ligne).join('')}</tbody>`).join('')}</table></div>`;
}

function htmlProgressionCampagne(v) {
  if (!v) return '<p class="doux">Aucune campagne en cours. Commencez-en une depuis l’onglet « Jouer ».</p>';
  cumulerProgression(v);
  const p = progression().campagnes[idCampagne()];
  const vus = Object.keys(v.visites).filter((id) => astreVisite(v, id) && ASTRES_PAR_ID[id]);
  const princ = SYSTEME.objectifs.map((id) => ({ id, ok: vus.includes(id) }));
  const nOk = princ.filter((x) => x.ok).length;
  // Artefacts de cette campagne (registre) : easter eggs et traces réelles.
  const arts = new Set();
  for (const f of Object.values(registre())) { const s = statsCampagne(f, false); for (const a of (s && s.artefacts) || []) arts.add(a); }
  const eggs = tousLesEggs().filter((e) => arts.has(e.id));
  const traces = [...arts].filter((a) => a.startsWith('trace:')).map((a) => Object.values(TRACES_REELLES).flat().find((t) => t.id === a.slice(6))).filter(Boolean);
  const morts = Object.values(registre()).filter((f) => f.statut === 'mort' && f.mort && f.mort.campagne === idCampagne());
  return `<p class="progres">${SYSTEME.id !== 'solaire' ? `<b>Campagne dans le ${SYSTEME.nom}.</b> ` : ''}<b>${vus.length} astre${vus.length > 1 ? 's' : ''} visité${vus.length > 1 ? 's' : ''}</b> sur ${astresAVisiter().length}, dont ${nOk} des ${princ.length} principaux · ${v.expeditions || 0} expédition${(v.expeditions || 0) > 1 ? 's' : ''} · ${resumeCampagne(v)}</p>
    <h3>Objectifs principaux (${nOk}/${princ.length})</h3>
    <div class="etiquettes">${princ.map((x) => `<span class="etiquette ${x.ok ? 'ok' : ''}">${x.ok ? '✅' : '⬜'} ${ASTRES_PAR_ID[x.id].nom}</span>`).join('')}</div>
    <h3>Où l’on est allé</h3>
    ${tableauAstres({ visites: v.visites, echantillons: v.echantillonsRapportes || {}, bases: p.bases, stations: p.stations, sorties: sortiesParAstre(true) })}
    <h3>Trouvailles de la campagne</h3>
    <ul class="sondes">
      <li>✨ Easter eggs : ${eggs.length ? nomsEggs(eggs) : 'aucun'}</li>
      <li>📍 Traces réelles : ${traces.length ? traces.map((t) => t.nom).join(', ') : 'aucune'}</li>
      ${v.voitureEtapes && v.voitureEtapes[1] ? `<li>🚗 Voiture rouge : ${v.voitureEtapes[3] ? 'incinérée' : v.voitureEtapes[2] ? 'envoyée vers le Soleil' : 'repérée'}</li>` : ''}
      ${morts.length ? `<li>✝ Perdus pendant la campagne : ${morts.map((f) => majuscule(f.nom)).join(', ')}</li>` : ''}
    </ul>`;
}

function htmlProgressionTotale(v) {
  if (v) cumulerProgression(v);
  const camp = Object.values(progression().campagnes);
  // Union des campagnes : visites, échantillons, installations, et le nombre de campagnes où l'astre a été visité.
  const d = { visites: {}, echantillons: {}, bases: {}, stations: {}, campagnes: {}, sorties: sortiesParAstre(false) };
  for (const c of camp) {
    for (const [a, x] of Object.entries(c.visites)) {
      d.visites[a] = { ...(d.visites[a] || {}), ...x };
      if (x.pose || x.plonge) d.campagnes[a] = (d.campagnes[a] || 0) + 1;
    }
    for (const [a, n] of Object.entries(c.echantillons)) d.echantillons[a] = (d.echantillons[a] || 0) + n;
    for (const [a, n] of Object.entries(c.bases)) d.bases[a] = Math.max(d.bases[a] || 0, n);
    for (const a of Object.keys(c.stations)) d.stations[a] = true;
  }
  // Les sorties notées au registre comptent comme des visites (parties d'avant ce suivi).
  for (const a of Object.keys(d.sorties)) {
    const t = astrePartout(a).type;
    if (!iconeVisite(d.visites[a] || {})) d.visites[a] = t === 'gazeuse' ? { plonge: true } : { pose: true };
  }
  const n = Object.values(d.visites).filter((x) => x.pose || x.plonge).length;
  const nEch = Object.values(d.echantillons).reduce((s, x) => s + x, 0);
  const fiches = Object.values(registre()), morts = fiches.filter((f) => f.statut === 'mort').length;
  const tous = tousLesEggs(), nEggs = tous.filter((e) => eggTrouve(e.id)).length;
  const traces = Object.keys(etat.tracesVues || {}).map((id) => Object.values(TRACES_REELLES).flat().find((t) => t.id === id)).filter(Boolean);
  const drapeaux = Object.values(etat.drapeaux || {}).reduce((s, l) => s + l.length, 0);
  const rapides = Object.entries(etat.records || {}).filter(([id, r]) => ASTRES_PAR_ID[id] && badge(r));
  const finies = camp.filter((c) => c.fin);
  return `<p class="progres"><b>${camp.length || (v ? 1 : 0)} campagne${camp.length > 1 ? 's' : ''}</b> · <b>${n} astre${n > 1 ? 's' : ''} visité${n > 1 ? 's' : ''}</b> · ${nEch} échantillon${nEch > 1 ? 's' : ''} rapporté${nEch > 1 ? 's' : ''} · ✨ ${nEggs} easter egg${nEggs > 1 ? 's' : ''} sur ${tous.length} · ${fiches.length} personne${fiches.length > 1 ? 's' : ''} parties dans l’espace, ${morts} mortes</p>
    ${finies.length ? `<p class="doux">🌌 Campagnes parties vers une autre étoile : ${finies.map((c) => c.fin.etoile).join(', ')}.</p>` : ''}
    <h3>Où l’on est allé, toutes campagnes confondues</h3>
    ${tableauAstres(d)}
    <h3>En visite rapide</h3>
    ${rapides.length ? `<div class="etiquettes">${rapides.map(([id, r]) => `<span class="etiquette ok">${badge(r)} ${ASTRES_PAR_ID[id].nom}</span>`).join('')}</div>` : '<p class="doux">Aucune visite rapide réussie pour l’instant.</p>'}
    <h3>Traces et souvenirs</h3>
    <ul class="sondes">
      <li>📍 Traces réelles vues : ${traces.length ? traces.map((t) => `${t.nom} (${t.annee})`).join(', ') : 'aucune'}</li>
      <li>🚩 Drapeaux plantés : ${drapeaux}</li>
    </ul>`;
}

// Rendu de l'onglet (dans #accueil-progression).
function afficherProgression(onglet = ongletProgression) {
  ongletProgression = onglet;
  const v = etat.voyage;
  const zone = $('accueil-progression');
  // La campagne se compte dans son système (qui peut être une autre étoile) ; le reste dans le Système solaire.
  let corps;
  if (onglet === 'campagne') {
    if (v) { choisirSystemeCampagne(v); reconstituerVisites(v); }
    corps = htmlProgressionCampagne(v);
    choisirSysteme('solaire');
  } else corps = htmlProgressionTotale(v);
  zone.innerHTML = `<div class="tete-progression"><div class="groupe-vue"><button data-prog="campagne" class="${onglet === 'campagne' ? 'choisi' : ''}">Campagne en cours</button><button data-prog="tout" class="${onglet === 'tout' ? 'choisi' : ''}">Toutes campagnes</button></div>
    <span><button id="prog-eggs">✨ Easter eggs</button> <button id="prog-registre">👥 Registre des équipages</button></span></div>${corps}`;
  zone.querySelectorAll('[data-prog]').forEach((b) => { b.onclick = () => afficherProgression(b.dataset.prog); });
  $('prog-registre').onclick = () => ouvrirRegistre(onglet === 'campagne' ? 'campagne' : 'tout');
  $('prog-eggs').onclick = () => ouvrirEggs(allerVersEgg);
}
