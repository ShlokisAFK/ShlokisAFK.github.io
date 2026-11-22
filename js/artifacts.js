/* Stray marks in the white space: an outlier point, a patch of sensor noise, a glitch tear.
   One every few seconds, only where nothing else is. Never runs for reduced-motion visitors. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const INK = '#0a0a0a';
  const cv = document.createElement('canvas');
  cv.id = 'artifacts'; cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  const ctx = cv.getContext('2d');
  let vw = 0, vh = 0, dpr = 1;
  const size = () => {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = vw * dpr; cv.height = vh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size(); addEventListener('resize', size);

  const ptr = { x: 0, y: 0, t: -1e9 };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = performance.now(); }, { passive: true });

  /* ---------- Is this spot really empty? ---------- */
  const BLANK = new Set(['HTML', 'BODY', 'MAIN', 'SECTION', 'DIV', 'UL', 'OL', 'DL', 'HEADER', 'FOOTER']);
  const emptyAt = (x, y) => {
    if (x < 8 || y < 70 || x > vw - 8 || y > vh - 8) return false;
    const el = document.elementFromPoint(x, y);
    return !!el && BLANK.has(el.tagName) && !el.closest('.band, .nav, .thread, .pi, .cmd, .ping-line');
  };
  const emptyBox = (x, y, w, h) => {
    for (const fy of [0, 0.5, 1]) for (const fx of [0, 0.5, 1]) if (!emptyAt(x + w * fx, y + h * fy)) return false;
    return true;
  };

  /* ---------- Marks ---------- */
  const marks = [];
  let raf = 0, uid = 0;
  const rand = (a, b) => a + Math.random() * (b - a);
  const hash = (i, j, s) => { let h = (i * 374761393 + j * 668265263 + s * 2246822519) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const LABELS = () => [`z = ${rand(3.1, 6.9).toFixed(1)}`, `${rand(3, 7).toFixed(1)}σ`, 'outlier', `p < ${['0.01', '0.001', '0.0001'][Math.floor(Math.random() * 3)]}`];

  const KINDS = {
    outlier: { dur: 2300, dims: () => ({ w: 96, h: 22 }), init: (m) => { m.label = LABELS()[Math.floor(Math.random() * 4)]; } },
    noise: { dur: 1200, dims: () => ({ w: rand(60, 150), h: rand(26, 74) }), init: () => {} },
    tear: { dur: 150, dims: () => ({ w: rand(140, 460), h: rand(2, 6) }), init: (m) => { m.dx = rand(14, 46) * (Math.random() < 0.5 ? -1 : 1); } }
  };

  function spawn(kind) {
    if (document.hidden || window.__motionPaused) return;
    kind = kind || (() => { const r = Math.random(); return r < 0.4 ? 'outlier' : r < 0.7 ? 'noise' : 'tear'; })();
    const K = KINDS[kind], { w, h } = K.dims();
    const nearPointer = performance.now() - ptr.t < 4000 && Math.random() < 0.35;
    for (let k = 0; k < 10; k++) {
      let x, y;
      if (nearPointer) { const a = rand(0, 6.283), r = rand(70, 170); x = ptr.x + Math.cos(a) * r - w / 2; y = ptr.y + Math.sin(a) * r - h / 2; }
      else { x = rand(8, vw - w - 8); y = rand(70, vh - h - 8); }
      if (!emptyBox(x, y, w, h)) continue;
      const m = { kind, x, py: y + scrollY, w, h, t0: performance.now(), id: ++uid };
      K.init(m); marks.push(m);
      if (!raf) raf = requestAnimationFrame(frame);
      return;
    }
  }

  function draw(m, now, sy) {
    const u = (now - m.t0) / KINDS[m.kind].dur, y = m.py - sy;
    if (y < -90 || y > vh + 90) return;
    ctx.fillStyle = INK; ctx.strokeStyle = INK;
    if (m.kind === 'outlier') {
      const a = u < 0.55 ? 1 : u < 0.6 ? 0 : u < 0.82 ? 1 : Math.max(0, 1 - (u - 0.82) / 0.18);   // pop, hold, one flicker, fade
      if (a <= 0) return;
      const pop = Math.min(1, u / 0.05), cx = m.x + 9, cy = y + 11, r = 6 * (0.4 + 0.6 * pop);
      ctx.globalAlpha = a; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke();
      if (u > 0.08) { ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace'; ctx.fillText(m.label, m.x + 22, cy + 4); }
      ctx.globalAlpha = 1;
    } else if (m.kind === 'noise') {
      const dens = 0.55 * Math.min(1, u / 0.12) * Math.pow(Math.max(0, 1 - u), 1.4);            // fades in, then dissolves
      const bucket = Math.floor(now / 55), cell = 3;
      for (let j = 0; j < m.h / cell; j++) for (let i = 0; i < m.w / cell; i++) {
        if (hash(i, j, bucket + m.id * 7) < dens) ctx.fillRect(m.x + i * cell, y + j * cell, cell, cell);
      }
    } else {
      const on = u < 0.4 || (u > 0.55 && u < 0.95);
      if (!on) return;
      ctx.fillRect(m.x, y, m.w, m.h);
      ctx.fillRect(m.x + m.dx, y + m.h * 2.2, m.w * 0.55, Math.max(1, m.h * 0.6));
    }
  }

  function frame(now) {
    ctx.clearRect(0, 0, vw, vh);
    const sy = scrollY;
    for (let i = marks.length - 1; i >= 0; i--) {
      if (now - marks[i].t0 > KINDS[marks[i].kind].dur) { marks.splice(i, 1); continue; }
      draw(marks[i], now, sy);
    }
    raf = marks.length ? requestAnimationFrame(frame) : 0;
    if (!marks.length) ctx.clearRect(0, 0, vw, vh);
  }

  /* One every three to five seconds, starting once the intro has played. */
  const loop = () => setTimeout(() => { spawn(); loop(); }, rand(3000, 5200));
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => setTimeout(loop, 5200));
  addEventListener('portfolio:artifact', (e) => spawn(e.detail && e.detail.kind));   // lets tests trigger one on demand
})();
