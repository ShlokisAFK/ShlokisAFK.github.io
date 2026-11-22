/* Dust that gathers into the contact headline.
   The real <h2> stays in the page (screen readers, search, no-JS); this canvas paints it as particles. */
(() => {
  const h2 = document.querySelector('#contact-title');
  if (!h2 || !window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const REACH = 150;                           // extra canvas above and below the text, so loose dust is visible
  const wrap = document.createElement('div');
  wrap.className = 'dust-wrap';
  h2.replaceWith(wrap);
  const cv = document.createElement('canvas');
  cv.id = 'dust'; cv.setAttribute('aria-hidden', 'true');
  wrap.append(h2, cv);
  const ctx = cv.getContext('2d');

  let W = 0, H = 0, dpr = 1, n = 0;
  let hx, hy, x, y, vx, vy, delay, sz;
  let t0 = null;                               // set when the band scrolls into view
  let running = false, last = 0, nextGlitch = 0;
  const ptr = { x: -999, y: -999 };

  function build() {
    const r = h2.getBoundingClientRect();
    const cs = getComputedStyle(h2);
    W = Math.max(1, Math.round(r.width));
    const textH = Math.round(r.height);
    H = textH + REACH * 2;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 1. paint the headline offscreen, wrapped the way the real one wraps
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true });
    const fs = parseFloat(cs.fontSize);
    const lh = parseFloat(cs.lineHeight) || fs * 1.02;
    o.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    if ('letterSpacing' in o) o.letterSpacing = cs.letterSpacing;
    o.fillStyle = '#000'; o.textBaseline = 'alphabetic';
    const words = h2.textContent.trim().split(/\s+/);
    const lines = []; let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (o.measureText(test).width > W && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    lines.push(cur);
    const m = o.measureText('Hg');
    const asc = m.fontBoundingBoxAscent || fs * 0.9, desc = m.fontBoundingBoxDescent || fs * 0.25;
    lines.forEach((ln, i) => o.fillText(ln, 0, REACH + i * lh + (lh - (asc + desc)) / 2 + asc));

    // 2. every solid pixel on a coarse grid becomes a particle's home
    let step = W > 900 ? 4 : W > 520 ? 3 : 2;
    let pts;
    for (;;) {
      pts = [];
      const data = o.getImageData(0, 0, W, H).data;
      for (let py = 0; py < H; py += step) for (let px = 0; px < W; px += step) {
        if (data[(py * W + px) * 4 + 3] > 128) pts.push(px, py);
      }
      if (pts.length / 2 <= 7500) break;
      step++;
    }
    n = pts.length / 2;
    hx = new Float32Array(n); hy = new Float32Array(n); x = new Float32Array(n); y = new Float32Array(n);
    vx = new Float32Array(n); vy = new Float32Array(n); delay = new Float32Array(n); sz = new Float32Array(n);
    const size = step >= 4 ? 2 : step === 3 ? 1.8 : 1.5;
    for (let i = 0; i < n; i++) {
      hx[i] = pts[i * 2]; hy[i] = pts[i * 2 + 1];
      x[i] = Math.random() * W; y[i] = Math.random() * H;       // loose dust
      delay[i] = (hx[i] / W) * 1.1 + Math.random() * 0.6;       // the word assembles left to right
      sz[i] = size * (0.8 + Math.random() * 0.5);
    }
    if (t0 !== null) {                                           // rebuilt after a resize: no need to replay
      for (let i = 0; i < n; i++) { x[i] = hx[i]; y[i] = hy[i]; }
      t0 = performance.now() - 20000;
    }
  }

  const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

  function frame(now) {
    if (!running) return;
    const dt = Math.min(2.5, (now - last) / 16.67); last = now;
    const time = now / 1000;
    const el = t0 === null ? -1 : (now - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';

    // an occasional glitch: a slice of the word jolts sideways and springs back
    if (el > 4 && now > nextGlitch) {
      nextGlitch = now + 5000 + Math.random() * 6000;
      const y0 = REACH + Math.random() * (H - REACH * 2), band = 18 + Math.random() * 40, dir = Math.random() < 0.5 ? -1 : 1;
      for (let i = 0; i < n; i++) if (Math.abs(hy[i] - y0) < band) vx[i] += dir * (9 + Math.random() * 9);
    }

    for (let i = 0; i < n; i++) {
      const s = el < 0 ? 0 : ease((el - delay[i]) / 0.9);       // 0 = loose dust, 1 = home
      if (s < 1) {                                              // drift
        vx[i] += Math.sin(y[i] * 0.012 + time * 0.7 + i) * 0.025 * (1 - s) * dt;
        vy[i] += Math.cos(x[i] * 0.009 + time * 0.55 + i * 0.3) * 0.025 * (1 - s) * dt;
      }
      vx[i] += (hx[i] - x[i]) * 0.07 * s * dt;                  // pull home
      vy[i] += (hy[i] - y[i]) * 0.07 * s * dt;
      const dx = x[i] - ptr.x, dy = y[i] - ptr.y, d2 = dx * dx + dy * dy;
      if (d2 < 8100) {                                          // the cursor scatters the dust
        const d = Math.sqrt(d2) || 1, f = (90 - d) / 90 * 2.6;
        vx[i] += dx / d * f * dt; vy[i] += dy / d * f * dt;
      }
      const damp = Math.pow(0.8 + (1 - s) * 0.18, dt);
      vx[i] *= damp; vy[i] *= damp;
      x[i] += vx[i] * dt; y[i] += vy[i] * dt;
      if (s < 1) {                                              // wrap loose dust inside the canvas
        if (x[i] < 0) x[i] += W; else if (x[i] > W) x[i] -= W;
        if (y[i] < 0) y[i] += H; else if (y[i] > H) y[i] -= H;
      }
      const sh = s >= 1 ? Math.sin(time * 2.2 + i) * 0.18 : 0;   // formed dust still breathes a little
      ctx.fillRect(x[i] + sh, y[i] + sh, sz[i], sz[i]);
    }
    requestAnimationFrame(frame);
  }

  function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }

  const init = () => {
    build();
    wrap.classList.add('dust-on');
    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '200px' }).observe(wrap);
    ScrollTrigger.create({ trigger: wrap, start: 'top 82%', once: true, onEnter: () => { t0 = performance.now(); } });
    addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    }, { passive: true });
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(build, 220); });
  };

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => { try { init(); } catch (err) { wrap.classList.remove('dust-on'); console.warn('dust off', err); } });
})();
