'use strict';
// Observatoires et sondes célèbres, en orbite autour de la Terre, du Soleil ou de Mars.
// Quelques mètres, quelques tonnes : on ne tourne pas autour, on les rejoint (rendez-vous).
// S'en approcher est une très mauvaise idée : la gravité de l'orbiteur (des centaines de tonnes) déplace
// l'observatoire et fausse ses mesures. Les équipes scientifiques du monde entier ne le pardonnent pas.
// Orbites simplifiées (2D) : altitudes réelles autour de la Terre et de Mars ; points de Lagrange L1 et L2
// (1,5 million de km de la Terre, côté Soleil et à l'opposé), qui tournent avec la Terre ; orbites
// héliocentriques réelles pour les télescopes à la retraite qui dérivent derrière la Terre, et pour Parker.

const J_2026 = 9496.5;   // 1er janvier 2026, en jours depuis J2000

const OBSERVATOIRES = [
  {
    id: 'hubble', nom: 'Hubble', art: 'le', nomArt: 'télescope Hubble', centre: 'terre', hp: 510, ha: 520, M0: 40,
    masseKg: 11100, taille: '13,2 m de long, miroir de 2,4 m', tailleCourte: '13 m',
    exploitant: 'NASA et ESA', lancement: '24 avril 1990, navette Discovery', etatObjet: 'en service', instrument: 'télescope visible, ultraviolet et proche infrarouge',
    note: 'Le télescope spatial le plus célèbre : des galaxies lointaines, les piliers de la Création, l’âge de l’Univers. Il tourne à environ 515 km d’altitude, en 95 minutes.',
    colere: 'Des milliers d’astronomes, de Baltimore à Paris, vous haïssent : 35 ans de pointage au millième de seconde d’arc, et vous voilà.',
  },
  {
    id: 'chandra', nom: 'Chandra', art: 'le', nomArt: 'télescope Chandra', centre: 'terre', hp: 14300, ha: 134000, M0: 200, varpi: 70,
    masseKg: 4800, taille: '13,8 m de long', tailleCourte: '14 m',
    exploitant: 'NASA', lancement: '23 juillet 1999, navette Columbia', etatObjet: 'en service', instrument: 'télescope à rayons X',
    note: 'Le grand télescope à rayons X : trous noirs, restes d’étoiles explosées, gaz brûlant des amas de galaxies. Une orbite très allongée de 64 heures, pour rester loin des ceintures de radiations.',
    colere: 'Les spécialistes des trous noirs vous haïssent : Chandra vise maintenant à côté.',
  },
  {
    id: 'xmm', nom: 'XMM-Newton', art: 'le', nomArt: 'télescope XMM-Newton', centre: 'terre', hp: 6000, ha: 114000, M0: 10, varpi: 250,
    masseKg: 3800, taille: '10 m de long', tailleCourte: '10 m',
    exploitant: 'ESA', lancement: '10 décembre 1999, Ariane 5', etatObjet: 'en service', instrument: 'trois télescopes à rayons X',
    note: 'Le grand observatoire européen des rayons X. Une orbite très allongée de 48 heures.',
    colere: 'L’Agence spatiale européenne vous a envoyé une lettre recommandée. Plusieurs, en fait.',
  },
  {
    id: 'tess', nom: 'TESS', art: 'le', nomArt: 'satellite TESS', centre: 'terre', hp: 101600, ha: 368600, M0: 120, varpi: 160,
    masseKg: 362, taille: '3,7 m', tailleCourte: '4 m',
    exploitant: 'NASA', lancement: '18 avril 2018, Falcon 9', etatObjet: 'en service', instrument: 'quatre caméras de chasse aux exoplanètes',
    note: 'Il cherche des planètes autour des étoiles proches, en guettant la petite baisse de lumière quand elles passent devant. Son orbite de 13,7 jours est réglée sur celle de la Lune (une demi-période).',
    colere: 'Les chasseurs d’exoplanètes vous haïssent : la baisse de lumière qu’ils viennent de mesurer, c’était vous.',
  },
  {
    id: 'jwst', nom: 'James Webb', art: 'le', nomArt: 'télescope James Webb', centre: 'soleil', lagrange: 0.01,
    masseKg: 6200, taille: '21 m × 14 m (pare-soleil), miroir de 6,5 m', tailleCourte: '21 m',
    exploitant: 'NASA, ESA et Agence spatiale canadienne', lancement: '25 décembre 2021, Ariane 5', etatObjet: 'en service', instrument: 'télescope infrarouge',
    ouOrbite: 'au point de Lagrange L2, à 1,5 million de km de la Terre, à l’opposé du Soleil', dephasage: 0,
    note: 'Le plus grand télescope spatial : les premières galaxies, l’atmosphère des exoplanètes. Son pare-soleil grand comme un court de tennis le garde à −230 °C.',
    colere: 'Le monde entier vous hait : 10 milliards de dollars, 25 ans de travail, et une rayure de plus sur le pare-soleil.',
  },
  {
    id: 'euclid', nom: 'Euclid', art: 'le', nomArt: 'télescope Euclid', centre: 'soleil', lagrange: 0.01,
    masseKg: 2000, taille: '4,7 m de haut', tailleCourte: '5 m',
    exploitant: 'ESA', lancement: '1er juillet 2023, Falcon 9', etatObjet: 'en service', instrument: 'télescope visible et infrarouge grand champ',
    ouOrbite: 'au point de Lagrange L2, près de James Webb', dephasage: 0.08,
    note: 'Il cartographie des milliards de galaxies pour comprendre la matière noire et l’énergie noire.',
    colere: 'Les cosmologistes vous haïssent : la matière noire, c’était votre orbiteur.',
  },
  {
    id: 'soho', nom: 'SOHO', art: 'l’', nomArt: 'observatoire SOHO', centre: 'soleil', lagrange: -0.01,
    masseKg: 1850, taille: '4,3 m (9,5 m avec les panneaux solaires)', tailleCourte: '4 m',
    exploitant: 'ESA et NASA', lancement: '2 décembre 1995, Atlas II', etatObjet: 'en service', instrument: 'douze instruments d’observation du Soleil',
    ouOrbite: 'au point de Lagrange L1, à 1,5 million de km de la Terre, côté Soleil', dephasage: 0,
    note: 'Il regarde le Soleil sans interruption depuis 1995, et a découvert plus de 5 000 comètes au passage.',
    colere: 'Les héliophysiciens vous haïssent : la prochaine éruption solaire, personne ne la verra venir.',
  },
  {
    id: 'gaia', nom: 'Gaia', art: 'la', nomArt: 'sonde Gaia', centre: 'soleil', aUA: 1.02, e: 0.01, decalage: -6,
    masseKg: 2030, taille: '10 m de diamètre (pare-soleil)', tailleCourte: '10 m',
    exploitant: 'ESA', lancement: '19 décembre 2013, Soyouz', etatObjet: 'à la retraite depuis mars 2025, éteinte et éloignée de L2', instrument: 'deux télescopes d’astrométrie',
    ouOrbite: 'autour du Soleil, en dérive loin de la Terre',
    note: 'Elle a mesuré la position et le mouvement de près de deux milliards d’étoiles : la carte en 3D de notre galaxie. Ses données serviront pendant des décennies.',
    colere: 'Même à la retraite : les astronomes vous haïssent par principe.',
  },
  {
    id: 'spitzer', nom: 'Spitzer', art: 'le', nomArt: 'télescope Spitzer', centre: 'soleil', aUA: 1.0035, e: 0.017, decalage: -150,
    masseKg: 950, taille: '4,5 m de haut', tailleCourte: '4 m',
    exploitant: 'NASA', lancement: '25 août 2003, Delta II', etatObjet: 'à la retraite depuis janvier 2020', instrument: 'télescope infrarouge',
    ouOrbite: 'autour du Soleil, loin derrière la Terre',
    note: 'Le télescope infrarouge qui a trouvé les sept planètes de TRAPPIST-1. Il suit la Terre de loin, et s’en éloigne lentement.',
    colere: 'Les anciens de Spitzer vous haïssent, avec nostalgie.',
  },
  {
    id: 'kepler', nom: 'Kepler', art: 'le', nomArt: 'télescope Kepler', centre: 'soleil', aUA: 1.0132, e: 0.036, decalage: -110,
    masseKg: 1050, taille: '4,7 m de haut', tailleCourte: '5 m',
    exploitant: 'NASA', lancement: '7 mars 2009, Delta II', etatObjet: 'à la retraite depuis octobre 2018', instrument: 'photomètre de chasse aux exoplanètes',
    ouOrbite: 'autour du Soleil, derrière la Terre',
    note: 'Il a découvert plus de 2 600 exoplanètes, et montré que les planètes sont plus nombreuses que les étoiles dans notre galaxie.',
    colere: 'Les chasseurs d’exoplanètes vous haïssent, en mémoire de Kepler.',
  },
  {
    id: 'parker', nom: 'Parker', art: 'la', nomArt: 'sonde Parker', centre: 'soleil', aUA: 0.3878, e: 0.8817, perihelie: 9123.5, varpi: 0,
    masseKg: 685, taille: '3 m, bouclier thermique de 2,3 m', tailleCourte: '3 m',
    exploitant: 'NASA', lancement: '12 août 2018, Delta IV Heavy', etatObjet: 'en service', instrument: 'instruments du vent solaire et de la couronne',
    ouOrbite: 'autour du Soleil, de 6,9 millions de km (record) à 0,73 UA',
    note: 'L’objet le plus rapide jamais construit : 190 km/s au plus près du Soleil, le 24 décembre 2024. Son bouclier encaisse plus de 1 300 °C.',
    colere: 'Les physiciens solaires vous haïssent : Parker a frôlé le Soleil sept ans pour rien.',
  },
  {
    id: 'mro', nom: 'MRO', art: 'la', nomArt: 'sonde MRO', centre: 'mars', hp: 255, ha: 320, M0: 300,
    masseKg: 2180, taille: '6,5 m de haut, 13,6 m avec les panneaux', tailleCourte: '7 m',
    exploitant: 'NASA', lancement: '12 août 2005, Atlas V', etatObjet: 'en service', instrument: 'caméra HiRISE (30 cm par pixel) et radar',
    ouOrbite: 'orbite polaire basse de Mars',
    note: 'Mars Reconnaissance Orbiter photographie Mars en très haute résolution et relaie vers la Terre les messages des robots au sol.',
    colere: 'Les équipes des robots martiens vous haïssent : plus de relais, plus de nouvelles du sol.',
  },
];

const nDegParJour = (gm, a) => (Math.sqrt(gm / (a * a * a)) / DEG) * JOUR;

(function creerObservatoires() {
  const terre = ASTRES_PAR_ID.terre && ASTRES_PAR_ID.terre.orbite;
  if (!terre) return;
  const longitudeTerre = (j) => terre.varpi + terre.M0 + terre.n * j;   // longitude moyenne (degrés)
  for (const d of OBSERVATOIRES) {
    const centre = ASTRES_PAR_ID[d.centre];
    if (!centre || ASTRES_PAR_ID[d.id]) continue;
    let orbite;
    if (d.lagrange) {
      // Points de Lagrange : même mouvement que la Terre, un peu plus loin (L2) ou plus près (L1) du Soleil.
      orbite = { centre: d.centre, a: terre.a * (1 + d.lagrange), e: terre.e, varpi: terre.varpi, M0: terre.M0 + (d.dephasage || 0), n: terre.n, retro: false };
    } else if (d.aUA) {
      const a = d.aUA * UA_KM, n = nDegParJour(centre.gm, a);
      const varpi = d.varpi !== undefined ? d.varpi : terre.varpi;
      // Position début 2026 : « decalage » degrés devant (+) ou derrière (−) la Terre ; ou date du périhélie.
      const M0 = d.perihelie !== undefined ? -n * d.perihelie : longitudeTerre(J_2026) + d.decalage - varpi - n * J_2026;
      orbite = { centre: d.centre, a, e: d.e, varpi, M0: ((M0 % 360) + 360) % 360, n, retro: false };
    } else {
      const rp = centre.rayonKm + d.hp, ra = centre.rayonKm + d.ha, a = (rp + ra) / 2;
      orbite = { centre: d.centre, a, e: (ra - rp) / (ra + rp), varpi: d.varpi || 0, M0: d.M0 || 0, n: nDegParJour(centre.gm, a), retro: false };
    }
    const soi = d.centre === 'soleil' ? 5000 : d.centre === 'terre' ? 50 : 20;   // zone de rendez-vous (km)
    const a = astreGenerique({
      id: d.id, nom: d.nom, parent: null, rayonKm: 0.005, gm: d.masseKg * G_KM,
      distanceUA: d.centre === 'soleil' ? orbite.a / UA_KM : centre.distanceUA || 1, famille: 'ceinture',
      surface: 'métal, panneaux solaires', note: d.note,
    });
    Object.assign(a, d, {
      type: 'objet', artificiel: true, observatoire: true, gm: d.masseKg * G_KM, systeme: 'solaire', grosse: true, categorie: 'objet',
      couleurs: { sol: '#b0bec5', ciel: '#000000', disque: '#e0e0e0' },
      orbite, soi, soiReelle: soi,
    });
    ASTRES.push(a);
    ASTRES_PAR_ID[a.id] = a;
    (ENFANTS[d.centre] = ENFANTS[d.centre] || []).push(a);
  }
})();

// L'orbiteur entre dans la zone de rendez-vous d'un observatoire et s'en approche : sa gravité le dérange.
function verifierObservatoires(orb) {
  const v = orb.v, a = ASTRES_PAR_ID[v.orb.centre];
  if (!a || !a.observatoire) return;
  v.deranges = v.deranges || {};
  if (v.deranges[a.id] || V.norm(v.orb.r) > Math.min(a.soi, 100)) return;
  v.deranges[a.id] = { t: v.t };
  orb.log(`😡 Vous avez frôlé ${le(a)} : la gravité de l’orbiteur a déplacé son orbite et faussé ses mesures. ${a.colere}`);
  if (typeof sauver === 'function') sauver(etat);
}
