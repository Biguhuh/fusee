'use strict';
// Spécialités des personnages : 1 à 3 chacun, inspirées des vrais équipages (NASA, ESA), plus des talents pour rire.
// Dans un équipage : pilote et médecin obligatoires (on peut partir sans, à ses risques) ; ingénieur et scientifique conseillés.
// Effets : sans pilote, plus de manœuvres ratées ; sans médecin, blessures plus lentes à guérir (un infirmier aide) ;
// un ingénieur à bord répare les pannes de la station où l'on est amarré ; les talents animent le journal.

// m : masculin, f : féminin, n : sans genre précisé.
const SPECIALITES = {
  commandant: { icone: '⭐', m: 'commandant', f: 'commandante', n: 'commandant·e' },
  pilote: { icone: '🕹', m: 'pilote', f: 'pilote', n: 'pilote' },
  ingenieur: { icone: '🔧', m: 'ingénieur de vol', f: 'ingénieure de vol', n: 'ingénieur·e de vol' },
  medecin: { icone: '🩺', m: 'médecin', f: 'médecin', n: 'médecin' },
  infirmier: { icone: '💉', m: 'infirmier', f: 'infirmière', n: 'infirmier·e' },
  physicien: { icone: '⚛', m: 'physicien', f: 'physicienne', n: 'physicien·ne', science: true },
  geologue: { icone: '🪨', m: 'géologue', f: 'géologue', n: 'géologue', science: true },
  biologiste: { icone: '🧫', m: 'biologiste', f: 'biologiste', n: 'biologiste', science: true },
  chimiste: { icone: '⚗', m: 'chimiste', f: 'chimiste', n: 'chimiste', science: true },
  astronome: { icone: '🔭', m: 'astronome', f: 'astronome', n: 'astronome', science: true },
  communications: { icone: '📡', m: 'spécialiste des communications', f: 'spécialiste des communications', n: 'spécialiste des communications' },
  informaticien: { icone: '💻', m: 'informaticien', f: 'informaticienne', n: 'informaticien·ne' },
  // Talents (pour rire)
  musicien: { icone: '🎻', m: 'musicien', f: 'musicienne', n: 'musicien·ne', talent: true },
  echecs: { icone: '♟', m: 'joueur d’échecs', f: 'joueuse d’échecs', n: 'joueur·se d’échecs', talent: true },
  foot: { icone: '⚽', m: 'fan de foot', f: 'fan de foot', n: 'fan de foot', talent: true },
  tricot: { icone: '🧶', m: 'tricoteur', f: 'tricoteuse', n: 'tricoteur·se', talent: true },
  cuisine: { icone: '🍳', m: 'cordon-bleu', f: 'cordon-bleu', n: 'cordon-bleu', talent: true },
  jardinage: { icone: '🌱', m: 'jardinier', f: 'jardinière', n: 'jardinier·e', talent: true },
  photo: { icone: '📷', m: 'photographe', f: 'photographe', n: 'photographe', talent: true },
  conteur: { icone: '📖', m: 'conteur', f: 'conteuse', n: 'conteur·se', talent: true },
  magie: { icone: '🎩', m: 'magicien amateur', f: 'magicienne amateur', n: 'magicien·ne amateur', talent: true },
  origami: { icone: '🦢', m: 'as de l’origami', f: 'as de l’origami', n: 'as de l’origami', talent: true },
};
const METIERS = Object.keys(SPECIALITES).filter((k) => !SPECIALITES[k].talent && k !== 'commandant');
const TALENTS = Object.keys(SPECIALITES).filter((k) => SPECIALITES[k].talent);

// Ce que fait chaque talent, de temps en temps (au journal).
const MOMENTS_TALENTS = {
  musicien: ['joue du violon pour tout l’équipage : même le pilote auto semble apprécier.', 'compose une chanson sur l’apesanteur. Le refrain flotte encore dans le module.'],
  echecs: ['bat l’ordinateur de bord aux échecs, pour la troisième fois de la semaine.', 'propose une partie d’échecs magnétiques : les pièces ne s’envolent plus.'],
  foot: ['suit un match de foot en différé et hurle au but, avec quelques minutes de retard sur la Terre.', 'organise un tournoi de balle en apesanteur. Personne ne comprend les règles.'],
  tricot: ['tricote une écharpe aux couleurs de la mission. Les aiguilles sont attachées par un fil.', 'offre des chaussettes tricotées main à tout l’équipage.'],
  cuisine: ['réussit un gâteau lyophilisé presque mangeable : fête à bord.', 'invente une sauce pour les rations. L’équipage en redemande.'],
  jardinage: ['fait pousser des radis sous les lampes : première récolte de la mission.', 'parle à ses plants de laitue. Ils poussent, alors personne ne se moque.'],
  photo: ['prend une photo du lever d’astre par le hublot : elle fera le tour des journaux.', 'organise une exposition de photos dans le module.'],
  conteur: ['raconte une histoire avant le coucher : même les plus durs écoutent.', 'invente la suite d’une saga, un épisode par soir.'],
  magie: ['fait disparaître un stylo en apesanteur. On le retrouve trois jours plus tard dans un filtre.', 'réussit un tour de cartes… les cartes flottent, ça aide.'],
  origami: ['plie une grue en papier qui tourne lentement au milieu du module.', 'décore le vaisseau de cent petites étoiles en papier.'],
};

function formeSpecialite(k, genre) {
  const s = SPECIALITES[k];
  if (!s) return k;
  return genre === 'femme' ? s.f : genre === 'homme' ? s.m : s.n;
}
// Tirage : 1 ou 2 métiers, et souvent un talent (3 au plus).
function tirerSpecialites() {
  const l = [];
  const metiers = METIERS.slice();
  const n = Math.random() < 0.45 ? 2 : 1;
  for (let i = 0; i < n; i++) l.push(metiers.splice(Math.floor(Math.random() * metiers.length), 1)[0]);
  if (Math.random() < 0.6) l.push(TALENTS[Math.floor(Math.random() * TALENTS.length)]);
  return l;
}
// Spécialités d'un profil (les anciens profils en reçoivent, gardées dans le profil).
// Le spationaute joué commande et pilote, plus un talent.
function specialitesDe(p, principal = false) {
  if (!p) return [];
  if (!Array.isArray(p.specialites) || !p.specialites.length) {
    p.specialites = principal ? ['commandant', 'pilote', TALENTS[Math.floor(Math.random() * TALENTS.length)]] : tirerSpecialites();
  }
  return p.specialites;
}
function profilMembre(m) { return m.principal ? SPATIO : m.profil; }
function texteSpecialites(p, principal = false) {
  return specialitesDe(p, principal).map((k) => `${(SPECIALITES[k] || {}).icone || ''} ${formeSpecialite(k, p.genre)}`).join(', ');
}
function aLaSpecialite(m, k) { return specialitesDe(profilMembre(m), m.principal).includes(k); }

// Couverture d'un équipage (liste de profils { p, principal }) : ce qui manque.
function manquesEquipage(liste) {
  const a = (k) => liste.some(({ p, principal }) => specialitesDe(p, principal).includes(k));
  const science = liste.some(({ p, principal }) => specialitesDe(p, principal).some((k) => SPECIALITES[k] && SPECIALITES[k].science));
  return {
    obligatoires: [!a('pilote') && 'pilote', !a('medecin') && 'médecin'].filter(Boolean),
    conseilles: [!a('ingenieur') && 'ingénieur de vol', !science && 'scientifique'].filter(Boolean),
    infirmier: a('infirmier'),
  };
}
function manquesExpedition(v) {
  return manquesEquipage((v.equipe || []).filter((m) => m.etat === 'bord' || m.etat === 'mission').map((m) => ({ p: profilMembre(m), principal: m.principal })));
}
function htmlCouverture(liste) {
  const mq = manquesEquipage(liste);
  if (!mq.obligatoires.length && !mq.conseilles.length) return '<p class="objectif">✅ Équipage complet : pilote, médecin, ingénieur et scientifique.</p>';
  return `<p class="objectif">${mq.obligatoires.length ? `⚠ Il manque : <b>${mq.obligatoires.join(' et ')}</b> (obligatoire${mq.obligatoires.length > 1 ? 's' : ''} : vous pouvez partir quand même, à vos risques). ` : ''}`
    + `${mq.conseilles.length ? `Conseillé${mq.conseilles.length > 1 ? 's' : ''} : ${mq.conseilles.join(', ')}.` : ''}</p>`;
}

// ---------- Effets ----------
// Sans pilote : une manœuvre sur dix est ratée en plus.
const _rateParTrauma = rateParTrauma;
rateParTrauma = function (v) {
  if (_rateParTrauma(v)) return true;
  if (v.cible && estOrigine(v.cible)) return false;
  return !!v.equipe && manquesExpedition(v).obligatoires.includes('pilote') && Math.random() < 0.1;
};
// Sans médecin : une blessure bénigne guérit deux fois plus lentement (une fois et demie avec un infirmier).
const _noterBlessure = noterBlessure;
noterBlessure = function (v, eq, blessure) {
  _noterBlessure(v, eq, blessure);
  const m = membreDe(v, eq), b = m && m.blessure;
  if (!b || !b.fin || b.ralenti) return;
  const mq = manquesExpedition(v);
  if (!mq.obligatoires.includes('médecin')) return;
  b.fin = v.t + (b.fin - v.t) * (mq.infirmier ? 1.5 : 2);
  b.ralenti = true;
};

// Une fois par jour de jeu : l'ingénieur répare une panne de la station où l'on est amarré (après trois semaines),
// et les talents animent la vie à bord (toutes les deux à six semaines).
function mettreAJourSpecialites(v, log) {
  if (!v.equipe || !v.orb) return;
  const aBord = v.equipe.filter((m) => m.etat === 'bord');
  if (!aBord.length) return;
  if (!v.tSpecialites) v.tSpecialites = v.t;
  if (v.t - v.tSpecialites < JOUR) return;
  v.tSpecialites = v.t;
  const st = v.amarre && (v.stations || []).find((s) => s.id === v.amarre);
  const ing = aBord.find((m) => aLaSpecialite(m, 'ingenieur'));
  if (st && ing && (st.pannes || []).length) {
    const p = st.pannes.find((x) => v.t - x.t > 21 * JOUR);
    if (p) {
      st.pannes = st.pannes.filter((x) => x !== p);
      const nom = ing.principal ? nomSpatio() : ing.nom;
      log(`🔧 ${majuscule(nom)}, ${formeSpecialite('ingenieur', profilMembre(ing).genre)}, a réparé ${le(st)} de l’intérieur : ${PANNES_STATION[p.type].nom.toLowerCase()}.`);
    }
  }
  if (!v.tTalent) v.tTalent = v.t + (14 + Math.random() * 28) * JOUR;
  if (v.t < v.tTalent) return;
  v.tTalent = v.t + (14 + Math.random() * 28) * JOUR;
  const doues = [];
  for (const m of aBord) for (const k of specialitesDe(profilMembre(m), m.principal)) if (MOMENTS_TALENTS[k]) doues.push([m, k]);
  if (!doues.length) return;
  const [m, k] = doues[Math.floor(Math.random() * doues.length)];
  const l = MOMENTS_TALENTS[k];
  log(`${SPECIALITES[k].icone} ${majuscule(m.principal ? nomSpatio() : m.nom)} ${l[Math.floor(Math.random() * l.length)]}`);
}

// Équipage proposé : une nouvelle recrue reçoit la spécialité obligatoire qui manque (pilote, médecin).
const _equipeProposee = equipeProposee;
equipeProposee = function (v) {
  const l = _equipeProposee(v);
  const mq = manquesEquipage(l.map((p) => ({ p: p.principal ? SPATIO : p.profil, principal: p.principal })));
  const recrues = l.filter((p) => !p.principal && !p.veteran && p.profil);
  for (const nom of mq.obligatoires) {
    const p = recrues.shift();
    if (!p) break;
    const k = nom === 'pilote' ? 'pilote' : 'medecin';
    p.profil.specialites = [k, ...specialitesDe(p.profil).filter((x) => x !== k)].slice(0, 3);
  }
  return l;
};

// Recrues tirées au hasard : avec leurs spécialités.
const _profilAleatoire = profilAleatoire;
profilAleatoire = function (nomsPris) { const p = _profilAleatoire(nomsPris); p.specialites = tirerSpecialites(); return p; };
