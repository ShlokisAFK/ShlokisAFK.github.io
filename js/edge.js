/* Blackwall edge: where the page turns dark, ink bleeds up into the paper as ordered-dither dots, fine vertical
   data-streaks stream up out of it (and down into the dark), and a thin line along the seam pulses like a heartbeat.
   ~12fps, only while on screen, static if motion is reduced. */
(() => {
  const band = document.getElementById('contact');
  if (!band) return;
  const cv = document.createElement('canvas');
  cv.className = 'edge'; cv.setAttribute('aria-hidden', 'true');
  band.prepend(cv);
  const g = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const T = { up: null, down: '#ffffff', line: '#ffffff' };      // up: null = the page ink

  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));
  const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;   // seeded: same edge on every load

  let INK, CELL, H, G, w, cols, rows, gRows, base, patch, phase, rnd, S;

  const setup = () => {
    const small = innerWidth < 700;
    CELL = small ? 2 : 3; H = small ? 64 : 104; G = small ? 24 : 56;      // G: canvas below the seam, for the downward streaks
    w = band.clientWidth; cols = Math.ceil(w / CELL); rows = Math.floor(H / CELL); gRows = Math.floor(G / CELL);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.style.height = (H + G) + 'px'; cv.style.bottom = `calc(100% - ${G}px)`;
    cv.width = Math.round(w * dpr); cv.height = Math.round((H + G) * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    INK = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0a0a0a';
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
    // data streaks: some columns carry a stream of dashes (speed, spacing, dash length, how far they reach)
    S = [];
    for (let c = 0; c < cols; c++) {
      if (r() > .24 + patch[c] * .16) continue;
      S.push({ c, speed: 6 + r() * 16, period: 7 + Math.floor(r() * 12), len: 2 + Math.floor(r() * 4), off: r() * 20,
               up: rows * (.6 + r() * .9) + patch[c] * 5, dn: gRows * (.4 + r() * .6) });
    }
  };

  // two quick beats, then rest
  const beat = (t) => { const m = t % 1.8; return Math.exp(-(((m - .12) / .05) ** 2)) + .6 * Math.exp(-(((m - .34) / .06) ** 2)); };

  let glitch = null, nextGlitch = 1.5;
  const frame = (t) => {
    g.clearRect(0, 0, w, H + G);
    const ypx = (y) => H + G - (y + gRows + 1) * CELL;          // y counts up from the band's top edge
    const hb = beat(t);

    if (glitch && t > glitch.end) glitch = null;
    if (!glitch && t > nextGlitch) {                            // a row tear, now and then
      glitch = { y: Math.floor(Math.random() * rows * .7), h: 1 + Math.floor(Math.random() * 3), dx: (Math.random() < .5 ? -1 : 1) * (2 + Math.floor(Math.random() * 6)), end: t + .12 };
      nextGlitch = t + 2 + Math.random() * 3;
    }

    // dither: ink on paper
    g.fillStyle = INK;
    for (let c = 0; c < cols; c++) {
      const swell = 1 + .45 * Math.sin(c * .035 - t * .7 + phase[c] * .15);   // slow wave: the bleed swells and recedes
      const reach = (3 + patch[c] * rows * .28) * swell;
      const col = c * rows;
      for (let y = 0; y < rows; y++) {
        const d = y - base[c], k = rnd[col + y];
        let on = d <= 0;
        if (!on) {
          const thr = BAYER[y & 3][c & 3] + .12 * Math.sin(t * .9 + phase[c] + y);
          on = Math.exp(-d / reach) * .95 > thr && k > .08;
          if (!on && k > .988 && (k * 977) % 1 < 1 - d / rows) on = true;   // stray dots
        }
        if (!on) continue;
        const dx = glitch && y >= glitch.y && y < glitch.y + glitch.h ? glitch.dx : 0;
        g.fillRect(c * CELL + dx, ypx(y), CELL, CELL);
      }
    }

    // streaks: dashes stream up out of the seam into the paper, and down into the dark; they stretch on each beat
    const stretch = 1 + hb * .45;
    for (const s of S) {
      const b0 = base[s.c], x = s.c * CELL + (CELL >> 1);
      const upH = s.up * stretch, dnH = s.dn * stretch;
      g.fillStyle = T.up || INK;
      for (let y = Math.ceil(b0); y < b0 + upH; y++) {
        if (((y - t * s.speed + s.off) % s.period + s.period) % s.period >= s.len) continue;
        g.globalAlpha = .9 * (1 - (y - b0) / upH);
        g.fillRect(x, ypx(y), 1, CELL);
      }
      g.fillStyle = T.down;
      for (let y = Math.floor(b0) - 1; y > b0 - dnH && y >= -gRows; y--) {
        if (((-y - t * s.speed + s.off) % s.period + s.period) % s.period >= s.len) continue;
        g.globalAlpha = .75 * (1 - (b0 - y) / dnH);
        g.fillRect(x, ypx(y), 1, CELL);
      }
    }

    // the seam: a thin line that pulses on the beat, with a bright blip travelling along it
    const bx = ((t * .22) % 1.3 - .15) * w;
    g.fillStyle = T.line;
    for (let c = 0; c < cols; c++) {
      const x = c * CELL, blip = Math.exp(-(((x - bx) / (w * .06)) ** 2));
      g.globalAlpha = Math.min(1, .16 + .5 * hb + .9 * blip);
      g.fillRect(x, ypx(Math.floor(base[c]) - 1), CELL, 1);
    }
    g.globalAlpha = 1;

    // fade everything out toward the top (and the bottom of the streaks) so nothing is cut off by the canvas edge
    const grad = g.createLinearGradient(0, 0, 0, H + G);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop((H * .62) / (H + G), 'rgba(0,0,0,1)');
    grad.addColorStop(1 - (G * .45) / (H + G), 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = grad; g.fillRect(0, 0, w, H + G);
    g.globalCompositeOperation = 'source-over';
  };

  let raf = 0, last = 0, visible = false;
  const loop = (ms) => {
    raf = visible ? requestAnimationFrame(loop) : 0;
    if (ms - last < 80 || window.__motionPaused || document.hidden) return;   // ~12fps
    last = ms; frame(ms / 1000);
  };
  const start = () => { if (!reduce && visible && !raf) raf = requestAnimationFrame(loop); };

  setup(); frame(0);
  if (!reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; start(); }, { rootMargin: '80px' }).observe(cv);
  }
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { setup(); frame(last / 1000); }, 120); });
})();
