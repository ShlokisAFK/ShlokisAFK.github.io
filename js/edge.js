/* Dithered, torn edge where the page turns dark. The ink creeps up into the paper as ordered-dither dots,
   with a slow wave of corruption and the odd row glitch. ~10fps, only while on screen, static if motion is reduced. */
(() => {
  const band = document.getElementById('contact');
  if (!band) return;
  const cv = document.createElement('canvas');
  cv.className = 'edge'; cv.setAttribute('aria-hidden', 'true');
  band.prepend(cv);
  const g = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));
  const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;   // seeded: same edge on every load

  let CELL, H, w, cols, rows, base, patch, phase, rnd;

  const setup = () => {
    const small = innerWidth < 700;
    CELL = small ? 2 : 3; H = small ? 60 : 96;
    w = band.clientWidth; cols = Math.ceil(w / CELL); rows = Math.floor(H / CELL);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.style.height = H + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0a0a0a';
    const r = lcg(7), ph = [r() * 6, r() * 6, r() * 6];
    base = new Float32Array(cols); patch = new Float32Array(cols); phase = new Float32Array(cols);
    rnd = new Float32Array(cols * rows);
    for (let c = 0, v = 0; c < cols; c++) {
      if (c % 9 === 0) v = r() < .35 ? .6 + r() * 1.4 : r() * .5;     // clumps of columns that bleed further up
      patch[c] = v; phase[c] = r() * 6.28;
      const x = c / cols * 6.28;
      base[c] = rows * (.2 + .06 * Math.sin(x * 3 + ph[0]) + .04 * Math.sin(x * 9 + ph[1]) + .03 * Math.sin(x * 23 + ph[2])) + (r() - .5) * 2;
    }
    for (let i = 0; i < rnd.length; i++) rnd[i] = r();
  };

  let glitch = null, nextGlitch = 1.5;
  const frame = (t) => {
    g.clearRect(0, 0, w, H);
    if (glitch && t > glitch.end) glitch = null;
    if (!glitch && t > nextGlitch) {                  // a short row shift, now and then
      glitch = { y: Math.floor(Math.random() * rows * .7), h: 1 + Math.floor(Math.random() * 3), dx: (Math.random() < .5 ? -1 : 1) * (2 + Math.floor(Math.random() * 6)), end: t + .12 };
      nextGlitch = t + 2 + Math.random() * 3;
    }
    for (let c = 0; c < cols; c++) {
      // a slow wave travels along the edge, making the bleed swell and recede
      const swell = 1 + .45 * Math.sin(c * .035 - t * .7 + phase[c] * .15);
      const reach = (3 + patch[c] * rows * .28) * swell;
      const col = c * rows;
      for (let y = 0; y < rows; y++) {
        const d = y - base[c];
        let on;
        if (d <= 0) on = true;
        else {
          const k = rnd[col + y];
          const thr = BAYER[y & 3][c & 3] + .12 * Math.sin(t * .9 + phase[c] + y);   // dither threshold drifts, so dots flicker softly
          on = Math.exp(-d / reach) * .95 > thr && k > .08;
          if (!on && k > .988 && (k * 977) % 1 < 1 - d / rows) on = true;            // stray dots
        }
        if (!on) continue;
        const dx = glitch && y >= glitch.y && y < glitch.y + glitch.h ? glitch.dx : 0;
        g.fillRect(c * CELL + dx, H - (y + 1) * CELL, CELL, CELL);
      }
    }
  };

  let raf = 0, last = 0, visible = false;
  const loop = (ms) => {
    raf = visible ? requestAnimationFrame(loop) : 0;
    if (ms - last < 100 || window.__motionPaused || document.hidden) return;   // ~10fps
    last = ms; frame(ms / 1000);
  };
  const start = () => { if (!reduce && visible && !raf) raf = requestAnimationFrame(loop); };

  setup(); frame(0);
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; start(); }, { rootMargin: '80px' }).observe(cv);
  }
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { setup(); frame(last / 1000); }, 120); });
})();
