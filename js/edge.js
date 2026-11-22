/* Dithered, torn edge where the page turns dark: ink bleeds up into the paper as ordered-dither dots. Drawn once, static. */
(() => {
  const band = document.getElementById('contact');
  if (!band) return;
  const cv = document.createElement('canvas');
  cv.className = 'edge'; cv.setAttribute('aria-hidden', 'true');
  band.prepend(cv);

  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));
  const lcg = (s) => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;   // seeded: same edge on every load and resize

  const draw = () => {
    const small = innerWidth < 700, CELL = small ? 2 : 3, H = small ? 60 : 96;
    const w = band.clientWidth, cols = Math.ceil(w / CELL), rows = Math.floor(H / CELL);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.style.height = H + 'px';
    cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr);
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, H);
    g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0a0a0a';

    const r = lcg(7), ph = [r() * 6, r() * 6, r() * 6];
    const patch = new Float32Array(cols);              // runs of columns that bleed further up, so the edge looks eroded in clumps
    for (let c = 0, v = 0; c < cols; c++) { if (c % 9 === 0) v = r() < .35 ? .6 + r() * 1.4 : r() * .5; patch[c] = v; }

    for (let c = 0; c < cols; c++) {
      const x = c / cols * 6.28;
      const base = rows * (.2 + .06 * Math.sin(x * 3 + ph[0]) + .04 * Math.sin(x * 9 + ph[1]) + .03 * Math.sin(x * 23 + ph[2])) + (r() - .5) * 2;
      const reach = 3 + patch[c] * rows * .28;         // how far the dither spreads above the solid edge
      for (let y = 0; y < rows; y++) {                 // y counts up from the bottom of the canvas
        const d = y - base;
        let on;
        if (d <= 0) on = true;
        else {
          on = Math.exp(-d / reach) * .95 > BAYER[y & 3][c & 3] && r() > .08;   // a few dropped cells keep it from looking mechanical
          if (!on && r() < .012 * (1 - d / rows)) on = true;                  // stray dots
        }
        if (on) g.fillRect(c * CELL, H - (y + 1) * CELL, CELL, CELL);
      }
    }
    g.globalAlpha = .5;                                // thin torn-scanline streaks
    for (let i = 0; i < 6; i++) g.fillRect(Math.floor(r() * w), H - Math.round((.15 + r() * .45) * rows) * CELL, 30 + r() * 160, 1);
    g.globalAlpha = 1;
  };

  let t; draw();
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 120); });
})();
