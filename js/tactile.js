'use strict';
// Commandes tactiles (téléphone, tablette).
// Chaque bouton envoie la même touche que le clavier : toutes les commandes existantes marchent telles quelles.
// Les boutons « maintenus » (gaz, orientation, marche, saut) restent enfoncés tant que le doigt est dessus.
// Sur l'orbiteur : glisser un doigt pour déplacer la carte, pincer à deux doigts pour zoomer.

const TOUCHES_SPECIALES = { plus: { code: 'NumpadAdd', key: '+' }, moins: { code: 'NumpadSubtract', key: '-' } };

function envoyerTouche(code, type) {
  const t = TOUCHES_SPECIALES[code] || { code, key: code };
  dispatchEvent(new KeyboardEvent(type, { code: t.code, key: t.key, bubbles: true }));
}

const Tactile = {
  el: null,
  cle: '',
  manuelJusqua: 0,   // instant (ms) jusqu'auquel les commandes manuelles restent visibles en mode auto
  enfoncees: new Map(),   // pointerId → code maintenu

  init() {
    if (!ECRAN_TACTILE) return;
    document.body.classList.add('tactile');
    this.el = document.createElement('div');
    this.el.id = 'tactile';
    document.body.appendChild(this.el);
    // Un doigt qui sort de l'écran ou une interruption relâche tout.
    addEventListener('blur', () => this.toutRelacher());
    // En mode auto, toucher l'écran de vol fait réapparaître les commandes manuelles quelques secondes.
    $('vol').addEventListener('pointerdown', () => { if (etat.vol && etat.vol.autopilote) this.manuelJusqua = performance.now() + 5000; });
    this.carteAuDoigt();
  },

  toutRelacher() {
    for (const code of this.enfoncees.values()) envoyerTouche(code, 'keyup');
    this.enfoncees.clear();
  },

  // Boutons à montrer selon l'écran et la situation. Renvoie [{ zone, label, code, maintenu, actif, confirmer }].
  boutons() {
    const b = [];
    const temps = (z) => { b.push({ zone: z, label: '⏪', code: 'moins', titre: 'Ralentir le temps' }); b.push({ zone: z, label: '⏩', code: 'plus', titre: 'Accélérer le temps' }); };
    if (etat.ecran === 'vol' && etat.vol && !etat.vol.fin) {
      const v = etat.vol;
      const solide = v.astre.type === 'solide';
      // Pilote automatique : les commandes manuelles disparaissent pour libérer l'écran.
      // Un toucher de l'écran les fait revenir 5 s ; en toucher une reprend la main (le pilote se coupe).
      const manuel = !v.autopilote || performance.now() < this.manuelJusqua;
      if (manuel) {
        b.push({ zone: 'gauche', label: '⟲', code: 'ArrowLeft', maintenu: true, titre: 'Pivoter à gauche' });
        b.push({ zone: 'gauche', label: '⟳', code: 'ArrowRight', maintenu: true, titre: 'Pivoter à droite' });
        b.push({ zone: 'droite', label: '▲', code: 'ArrowUp', maintenu: true, titre: 'Plus de gaz' });
        b.push({ zone: 'droite', label: '▼', code: 'ArrowDown', maintenu: true, titre: 'Moins de gaz' });
        b.push({ zone: 'droite2', label: '0', code: 'KeyX', titre: 'Couper les gaz' });
        b.push({ zone: 'droite2', label: 'Max', code: 'Space', titre: 'Plein gaz' });
      }
      b.push({ zone: 'actions', label: v.autopilote ? '🤖 Auto ✓' : '🤖 Auto', code: 'KeyL', actif: v.autopilote });
      if (v.pose && !(v.compteARebours > 0)) b.push({ zone: 'actions', label: v.lancement ? '🚀 Lancer' : '🚀 Décoller', code: 'KeyT', principal: true });
      if (v.pose && solide && !v.lancement && !v.promenade) {
        b.push({ zone: 'actions', label: '🧑‍🚀 Sortir', code: 'KeyE' });
        b.push({ zone: 'actions', label: '🛞 Robot', code: 'KeyR' });
        if (etat.enVoyage) b.push({ zone: 'actions', label: '🏗 Base', code: 'KeyB' });
        if (!v.voyage) b.push({ zone: 'actions', label: '✓ Terminer', code: 'Enter' });
      }
      temps('actions');
      b.push({ zone: 'actions', label: etat.pause ? '▶' : '⏸', code: 'KeyP' });
      b.push({ zone: 'actions', label: '✕', code: 'Escape', confirmer: v.pose ? null : 'Abandonner ce vol ?' });
    } else if (etat.ecran === 'explo' && etat.explo && !etat.explo.fin) {
      const x = etat.explo;
      b.push({ zone: 'gauche', label: '◀', code: 'ArrowLeft', maintenu: true, titre: 'Gauche' });
      b.push({ zone: 'gauche', label: '▶', code: 'ArrowRight', maintenu: true, titre: 'Droite' });
      if (x.saut && !x.enRover) b.push({ zone: 'droite', label: '⤒', code: 'ArrowUp', maintenu: true, titre: 'Sauter' });
      const action = x.terre ? '🌸 Cueillir' : x.type === 'robot' ? '🔬 Analyser' : '🪨 Ramasser';
      b.push({ zone: 'droite', label: action, code: 'KeyE', principal: true, large: true });
      if (x.rover) b.push({ zone: 'actions', label: x.enRover ? '🚶 Descendre' : '🛞 Rover', code: 'KeyV' });
      if (!x.terre && !x.enRover) b.push({ zone: 'actions', label: '🚩', code: 'KeyF', titre: 'Planter le drapeau' });
      temps('actions');
      b.push({ zone: 'actions', label: etat.pause ? '▶' : '⏸', code: 'KeyP' });
      b.push({ zone: 'actions', label: x.terre ? '🏠 Rentrer' : x.type === 'robot' ? '⏹ Arrêter' : '↩ Rentrer', code: 'Escape' });
    }
    return b;
  },

  // Appelé à chaque image : on ne reconstruit les boutons que si la situation change.
  majImage() {
    if (!this.el) return;
    const liste = this.boutons();
    const cle = liste.map((x) => x.zone + x.label + (x.actif ? 1 : 0)).join('|');
    if (cle === this.cle) return;
    this.cle = cle;
    this.toutRelacher();
    this.el.innerHTML = '';
    this.el.classList.toggle('cache', !liste.length);
    // Sans commandes manuelles (mode auto), le bandeau descend tout en bas de l'écran.
    this.el.classList.toggle('sans-manuel', !liste.some((x) => x.zone === 'gauche' || x.zone === 'droite'));
    const zones = {};
    for (const nom of ['gauche', 'droite', 'droite2', 'actions']) {
      zones[nom] = document.createElement('div');
      zones[nom].className = 'zone-tactile ' + nom;
      this.el.appendChild(zones[nom]);
    }
    if (liste.some((x) => x.zone === 'actions')) this.poignee(zones.actions);
    for (const x of liste) {
      const bt = document.createElement('button');
      bt.type = 'button';
      bt.textContent = x.label;
      if (x.titre) bt.setAttribute('aria-label', x.titre);
      if (x.actif) bt.classList.add('actif');
      if (x.principal) bt.classList.add('principal');
      if (x.large) bt.classList.add('large');
      bt.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (x.confirmer && !confirm(x.confirmer)) return;
        bt.classList.add('appui');
        if (x.maintenu) {
          try { bt.setPointerCapture(e.pointerId); } catch (err) { /* pas de capture possible : le relâchement suffit */ }
          this.enfoncees.set(e.pointerId, x.code);
          envoyerTouche(x.code, 'keydown');
        } else {
          envoyerTouche(x.code, 'keydown');
          envoyerTouche(x.code, 'keyup');
        }
      });
      const relacher = (e) => {
        bt.classList.remove('appui');
        const code = this.enfoncees.get(e.pointerId);
        if (code) { envoyerTouche(code, 'keyup'); this.enfoncees.delete(e.pointerId); }
      };
      bt.addEventListener('pointerup', relacher);
      bt.addEventListener('pointercancel', relacher);
      bt.addEventListener('lostpointercapture', relacher);
      bt.addEventListener('contextmenu', (e) => e.preventDefault());
      zones[x.zone].appendChild(bt);
    }
  },

  // Bandeau des actions (temps, pause, sortir…) : une poignée ⠿ pour le déplacer en glissant,
  // ou le replier d'un appui. Position et état mémorisés dans ce navigateur.
  bandeau: (() => { try { return JSON.parse(localStorage.getItem('fusee-bandeau')) || { dx: 0, dy: 0, replie: false }; } catch (e) { return { dx: 0, dy: 0, replie: false }; } })(),
  sauverBandeau() { try { localStorage.setItem('fusee-bandeau', JSON.stringify(this.bandeau)); } catch (e) { /* ignoré */ } },
  poignee(zone) {
    const b = this.bandeau;
    const appliquer = () => {
      zone.style.transform = `translate(${b.dx}px, ${b.dy}px)`;
      zone.classList.toggle('replie', !!b.replie);
      p.textContent = b.replie ? '⠿ ▸' : '⠿';
      p.setAttribute('aria-label', b.replie ? 'Déplier le bandeau (glisser pour déplacer)' : 'Replier le bandeau (glisser pour déplacer)');
    };
    const p = document.createElement('button');
    p.type = 'button';
    p.className = 'poignee';
    zone.appendChild(p);
    let depart = null;
    p.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { p.setPointerCapture(e.pointerId); } catch (err) { /* sans capture */ }
      depart = { x: e.clientX, y: e.clientY, dx: b.dx, dy: b.dy, bouge: false };
    });
    p.addEventListener('pointermove', (e) => {
      if (!depart) return;
      const mx = e.clientX - depart.x, my = e.clientY - depart.y;
      if (Math.hypot(mx, my) > 6) depart.bouge = true;
      if (!depart.bouge) return;
      // On reste dans l'écran.
      const r = zone.getBoundingClientRect();
      const baseX = r.left - b.dx, baseY = r.top - b.dy;
      b.dx = Math.max(-baseX, Math.min(innerWidth - r.width - baseX, depart.dx + mx));
      b.dy = Math.max(-baseY + 40, Math.min(innerHeight - r.height - baseY, depart.dy + my));
      appliquer();
    });
    const fin = () => {
      if (!depart) return;
      if (!depart.bouge) b.replie = !b.replie;   // simple appui : replier / déplier
      depart = null;
      appliquer();
      this.sauverBandeau();
    };
    p.addEventListener('pointerup', fin);
    p.addEventListener('pointercancel', fin);
    appliquer();
  },

  // Carte de l'orbiteur : glisser à un doigt, pincer à deux doigts.
  carteAuDoigt() {
    const toile = $('nav');
    let geste = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    toile.addEventListener('touchstart', (e) => {
      const t = e.touches;
      if (t.length === 2) {
        geste = { pince: true, d0: dist(t), echelle0: Orbiteur.cam.echelle };
        e.preventDefault();
      } else if (t.length === 1) {
        geste = { pince: false, x: t[0].clientX, y: t[0].clientY, decal: Orbiteur.cam.decal.slice(), bouge: false };
      }
    }, { passive: false });
    toile.addEventListener('touchmove', (e) => {
      if (!geste) return;
      const t = e.touches;
      e.preventDefault();
      if (geste.pince && t.length >= 2) {
        Orbiteur.cam.echelle = Math.max(1e-10, Math.min(5, geste.echelle0 * dist(t) / Math.max(1, geste.d0)));
      } else if (!geste.pince && t.length === 1) {
        const dx = t[0].clientX - geste.x, dy = t[0].clientY - geste.y;
        if (Math.hypot(dx, dy) > 6) geste.bouge = true;
        if (geste.bouge) {
          const s = Orbiteur.cam.echelle;
          Orbiteur.cam.decal = [geste.decal[0] - dx / s, geste.decal[1] + dy / s];
        }
      }
    }, { passive: false });
    toile.addEventListener('touchend', (e) => { if (e.touches.length === 0) geste = null; });
  },
};
Tactile.init();
