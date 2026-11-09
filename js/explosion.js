'use strict';
// ---------- Destruction d'un grand lanceur ----------
// D'abord on la voit s'effondrer : au sol, elle s'affaisse, bascule et se brise en deux ; en vol, elle se casse en
// deux tronçons qui partent en vrille. Puis l'explosion : éclair, boule de feu, onde de choc, débris qui retombent
// et grand nuage de fumée qui monte. Le temps est le temps réel (la scène dure ≈ 7 s avant le résultat).

const DUREE_EXPLOSION_LANCEUR = 7.5;

function creerExplosionLanceur(vol) {
  const alt = vol.y - vol.sol(vol.x);
  const auSol = alt < vol.f.hauteur * 1.5;
  return {
    lanceur: true, auSol, t: 0, duree: DUREE_EXPLOSION_LANCEUR,
    tBoom: auSol ? 1.9 : 1.1,                       // l'effondrement, puis l'explosion
    sens: Math.random() < 0.5 ? -1 : 1, coupe: 0.45 + Math.random() * 0.15,   // côté de la chute, hauteur de la cassure
    debris: null, fumee: [], etincelles: null,
  };
}

// x, y : pied de la fusée à l'écran ; h : sa hauteur à l'écran.
function dessinerExplosionLanceur(ctx, vol, ex, x, y, h, dt) {
  ex.t += dt;
  const t = ex.t, s = ex.sens, hc = h * ex.coupe;
  // Où tout explose : au sol, là où la fusée s'est couchée ; en vol, au milieu des deux tronçons.
  const cx = ex.auSol ? x + s * h * 0.35 : x, cy = ex.auSol ? y - h * 0.06 : y - h * 0.5;
  dessinerFumeeExplosion(ctx, ex, h, dt);   // derrière tout le reste

  // ---------- 1. L'effondrement ----------
  if (t < ex.tBoom + 0.15) {
    const u = Math.min(1, t / ex.tBoom);
    const angle0 = vol.angle || 0;
    let a1, a2, dx1 = 0, dy1 = 0, dx2 = 0, dy2 = 0;
    if (ex.auSol) {
      a1 = s * 1.25 * u * u;                          // elle bascule de plus en plus vite
      a2 = a1 + s * 0.9 * Math.max(0, (u - 0.45) / 0.55) ** 2;   // le haut se plie à la cassure
      dy1 = h * 0.08 * u;                             // et s'affaisse sur le pas de tir
    } else {
      a1 = angle0 - s * 1.6 * u; a2 = angle0 + s * 2.4 * u;     // deux tronçons qui partent en vrille
      dx1 = -s * h * 0.25 * u; dy1 = h * 0.15 * u * u; dx2 = s * h * 0.3 * u; dy2 = -h * 0.1 * u + h * 0.25 * u * u;
    }
    const sauve = vol.angle;
    vol.angle = 0;
    // Tronçon du bas
    ctx.save(); ctx.translate(x + dx1, y + dy1); ctx.rotate(a1);
    ctx.beginPath(); ctx.rect(-h, -hc, 2 * h, h * 2); ctx.clip();
    dessinerFusee(ctx, vol, 0, 0, h);
    ctx.restore();
    // Tronçon du haut, articulé à la cassure
    ctx.save(); ctx.translate(x + dx1, y + dy1); ctx.rotate(a1); ctx.translate(dx2, -hc + dy2); ctx.rotate(a2 - a1);
    ctx.beginPath(); ctx.rect(-h, -h * 2, 2 * h, h * 2); ctx.clip();
    dessinerFusee(ctx, vol, 0, hc, h);
    ctx.restore();
    vol.angle = sauve;
    // Le feu : à la base (au sol) et à la cassure, de plus en plus fort
    const feu = (fx, fy, r) => {
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
      g.addColorStop(0, 'rgba(255,250,210,0.95)'); g.addColorStop(0.35, 'rgba(255,170,40,0.85)'); g.addColorStop(1, 'rgba(200,40,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
    };
    const pc = [x + dx1 + Math.sin(a1) * hc, y + dy1 - Math.cos(a1) * hc];   // la cassure, à l'écran
    if (ex.auSol) feu(x, y - h * 0.03, h * (0.12 + 0.25 * u) * (0.9 + 0.2 * Math.random()));
    if (u > 0.35) feu(pc[0], pc[1], h * 0.12 * (u - 0.2) * (0.8 + 0.4 * Math.random()));
    // Fumée qui commence à monter
    if (Math.random() < 0.35) ex.fumee.push({ x: ex.auSol ? x + (Math.random() - 0.5) * h * 0.2 : pc[0], y: ex.auSol ? y : pc[1], r: h * 0.035, vy: -h * 0.12, vx: (Math.random() - 0.5) * h * 0.05, t: 0, vie: 3 + Math.random() * 2, gris: 60 + Math.random() * 40 });
  }

  // ---------- 2. L'explosion ----------
  const tb = t - ex.tBoom;
  if (tb >= 0) {
    if (!ex.debris) {
      // Débris : morceaux de coque, de réservoirs, de moteurs, projetés et retombant.
      ex.debris = Array.from({ length: 46 }, () => {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * (ex.auSol ? 2.6 : Math.PI * 2);
        const v = h * (0.6 + Math.random() * 1.8);
        return { x: cx, y: cy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10,
          w: h * (0.015 + Math.random() * 0.05), l: h * (0.03 + Math.random() * 0.12), c: ['#eceff1', '#cfd8dc', '#90a4ae', '#37474f', '#212121', '#b71c1c'][Math.floor(Math.random() * 6)], feu: Math.random() < 0.5, pose: false };
      });
      ex.etincelles = Array.from({ length: 160 }, () => {
        const ang = Math.random() * Math.PI * 2, v = h * (0.8 + Math.random() * 2.5);
        return { vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - h * 0.3, vie: 0.5 + Math.random() * 1.3 };
      });
    }
    // Secousse de la caméra, qui s'amortit
    const sec = Math.max(0, 1 - tb / 1.2) * h * 0.04;
    ctx.save(); ctx.translate((Math.random() - 0.5) * sec, (Math.random() - 0.5) * sec);
    const g0 = h * 1.2;   // « gravité » à l'écran (px/s²)
    const yBas = ex.auSol ? y + h * 0.02 : Infinity;
    // Lueur sur le sol
    if (ex.auSol) {
      const k = Math.max(0, 1 - tb / 4);
      const g = ctx.createRadialGradient(cx, y, 0, cx, y, h * 2.2);
      g.addColorStop(0, `rgba(255,140,40,${0.5 * k})`); g.addColorStop(1, 'rgba(255,80,0,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - h * 2.2, y - h * 0.4, h * 4.4, h * 0.8);
    }
    // Fumée : un grand nuage sombre qui monte et s'étale (champignon)
    if (tb < 2.5) for (let i = 0; i < 3; i++) {
      const ang = Math.random() * Math.PI * 2, r = Math.random() * h * 0.3;
      ex.fumee.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r * 0.6, r: h * (0.06 + Math.random() * 0.08), vy: -h * (0.25 + Math.random() * 0.45), vx: (Math.random() - 0.5) * h * 0.25, t: 0, vie: 4 + Math.random() * 3, gris: 35 + Math.random() * 45 });
    }
    // Boule de feu : plusieurs boules qui gonflent, du blanc au rouge sombre
    if (tb < 3) {
      const k = tb / 3;
      for (let i = 0; i < 7; i++) {
        const a = i * 2.4 + 0.7, d = h * 0.28 * Math.min(1, tb * 2) * (0.4 + (i % 3) * 0.3);
        const bx = cx + Math.cos(a) * d, by = cy + Math.sin(a) * d * 0.7 - h * 0.25 * k;
        const r = h * (0.25 + 0.55 * Math.min(1, tb * 1.5)) * (0.7 + 0.1 * (i % 4)) * (1 - 0.35 * k);
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
        g.addColorStop(0, `rgba(255,255,230,${0.95 * (1 - k)})`);
        g.addColorStop(0.3, `rgba(255,190,60,${0.9 * (1 - k)})`);
        g.addColorStop(0.7, `rgba(220,70,10,${0.7 * (1 - k)})`);
        g.addColorStop(1, 'rgba(80,20,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Onde de choc
    if (tb < 1.2) {
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - tb / 1.2)})`; ctx.lineWidth = Math.max(2, h * 0.02);
      ctx.beginPath(); ctx.ellipse(cx, cy, h * 3 * tb, h * (ex.auSol ? 0.9 : 3) * tb, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Étincelles
    for (const e of ex.etincelles) {
      if (tb > e.vie) continue;
      const k = tb / e.vie;
      ctx.fillStyle = `rgba(255,${Math.round(230 - 160 * k)},60,${1 - k})`;
      ctx.beginPath(); ctx.arc(cx + e.vx * tb, cy + e.vy * tb + 0.5 * g0 * tb * tb, Math.max(1, h * 0.006 * (1 - k)), 0, Math.PI * 2); ctx.fill();
    }
    // Débris
    for (const d of ex.debris) {
      if (!d.pose) {
        d.vy += g0 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
        if (d.y > yBas) { d.y = yBas; d.pose = true; }
      }
      if (d.feu && tb < 3 && !d.pose && Math.random() < 0.5) ex.fumee.push({ x: d.x, y: d.y, r: h * 0.015, vy: -h * 0.02, vx: 0, t: 0, vie: 1.2, gris: 50, feu: true });
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
      ctx.fillStyle = d.c; ctx.fillRect(-d.l / 2, -d.w / 2, d.l, d.w);
      if (d.feu && tb < 4) { ctx.fillStyle = 'rgba(255,150,30,0.8)'; ctx.fillRect(-d.l / 2, -d.w / 2, d.l * 0.3, d.w); }
      ctx.restore();
    }
    // Éclair blanc au moment de l'explosion
    if (tb < 0.45) { ctx.fillStyle = `rgba(255,250,235,${0.85 * (1 - tb / 0.45)})`; ctx.fillRect(-5000, -5000, 10000, 10000); }
    ctx.restore();
  }
}

// Fumée des deux phases : dessinée en premier, derrière la fusée et le feu. Elle monte et s'élargit lentement.
function dessinerFumeeExplosion(ctx, ex, h, dt) {
  for (const f of ex.fumee) {
    f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy *= 1 - 0.08 * dt; f.r += h * 0.035 * dt;
  }
  ex.fumee = ex.fumee.filter((f) => f.t < f.vie).slice(-350);
  for (const f of ex.fumee) {
    const k = f.t / f.vie, a = (f.feu ? 0.55 : 0.4) * (1 - k) * Math.min(1, f.t * 4);
    const c = f.feu && k < 0.4 ? `rgba(255,140,40,${a})` : `rgba(${f.gris},${f.gris},${f.gris},${a})`;
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
  }
}
