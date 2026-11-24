/* The page is slowly losing control of the model. Three quiet pieces, all decorative:
   1. corruption hanging from the very top of the page: ordered-dither dust plus falling data-streaks,
   2. error lines that stutter in and out at random free spots in the hero and the dark band,
   3. now and then the headline is overwritten for a couple of seconds, long enough to read.
   Nothing runs when motion is reduced, when paused, when the tab is hidden, or when off screen. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const off = () => window.__motionPaused || document.hidden;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const INK = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0a0a0a';
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]].map(r => r.map(v => (v + .5) / 16));

  /* 1. corruption hanging from the top of the page ---------------------------------------------- */
  /* Same language as the Blackwall edge at the foot of the page (js/edge.js): an uneven ink lip under the nav that
     dissolves downward as ordered-dither dots, fine data-streaks that fall out of it and stretch on each beat,
     and a thin seam line that pulses like a heartbeat with a bright blip travelling along it. */
  (() => {
    const cv = document.createElement('canvas');
    cv.className = 'topfall'; cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    const g = cv.getContext('2d');
    const CELL = 3;
    let w = 0, H = 0, rows = 0, cols = 0, base, patch, phase, rnd, S;
    let burst = null, nextBurst = 2.5, tear = null, nextTear = 2;

    const setup = () => {
      const small = innerWidth < 700;
      w = document.documentElement.clientWidth; H = small ? 80 : 130;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr);
      cv.style.height = H + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL); rows = Math.floor(H / CELL);
      base = new Float32Array(cols); patch = new Float32Array(cols); phase = new Float32Array(cols);
      rnd = new Float32Array(cols * rows);
      const ph = [rand(0, 6), rand(0, 6), rand(0, 6)];
      for (let c = 0, v = 0; c < cols; c++) {
        if (c % 9 === 0) v = Math.random() < .35 ? rand(.6, 2) : rand(0, .5);   // clumps of columns that bleed further down
        patch[c] = v; phase[c] = rand(0, 6.28);
        const x = c / cols * 6.28;
        // the lip: a few cells of solid ink under the nav, uneven along its length
        base[c] = rows * (.04 + .02 * Math.sin(x * 3 + ph[0]) + .02 * Math.sin(x * 9 + ph[1]) + .015 * Math.sin(x * 23 + ph[2])) + (Math.random() - .5) * 1.4;
      }
      for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
      // data streaks: some columns carry a stream of dashes that falls out of the lip
      S = [];
      for (let c = 0; c < cols; c++) {
        if (Math.random() > .22 + patch[c] * .16) continue;
        S.push({ c, speed: rand(6, 22), period: 7 + Math.floor(rand(0, 12)), len: 2 + Math.floor(rand(0, 4)), off: rand(0, 20), reach: rows * (.5 + rand(0, .5)) + patch[c] * 3 });
      }
    };

    // two quick beats, then rest (offset so it does not pulse in step with the foot of the page)
    const beat = (t) => { const m = (t + .9) % 1.8; return Math.exp(-(((m - .12) / .05) ** 2)) + .6 * Math.exp(-(((m - .34) / .06) ** 2)); };

    const frame = (t) => {
      g.clearRect(0, 0, w, H);
      const hb = beat(t);
      if (tear && t > tear.end) tear = null;
      if (!tear && t > nextTear) { tear = { y: Math.floor(rand(0, rows * .5)), h: 1 + Math.floor(rand(0, 3)), dx: (Math.random() < .5 ? -1 : 1) * Math.floor(rand(3, 10)), end: t + .14 }; nextTear = t + rand(2, 4.5); }
      if (burst && t > burst.end) burst = null;
      if (!burst && t > nextBurst) { const x0 = rand(0, w * .85); burst = { x0, x1: x0 + rand(80, 260), end: t + rand(.6, 1.2) }; nextBurst = t + rand(4, 8); }

      // dither: ink on paper, thickest at the nav, thinning downward
      g.fillStyle = INK;
      for (let c = 0; c < cols; c++) {
        const swell = 1 + .45 * Math.sin(c * .035 - t * .7 + phase[c] * .15);   // slow wave: the bleed swells and recedes
        const hot = burst && c * CELL >= burst.x0 && c * CELL <= burst.x1 ? 1.6 : 1;
        const reach = (3 + patch[c] * rows * .16) * swell * hot;
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
          const dx = tear && y >= tear.y && y < tear.y + tear.h ? tear.dx : 0;
          g.globalAlpha = .7 - (y / rows) * .3;
          g.fillRect(c * CELL + dx, y * CELL, CELL, CELL);
        }
      }

      // streaks fall out of the lip and stretch on each beat
      const stretch = 1 + hb * .45;
      g.fillStyle = INK;
      for (const s of S) {
        const b0 = base[s.c], x = s.c * CELL + (CELL >> 1);
        const boost = burst && x >= burst.x0 && x <= burst.x1 ? 1.5 : 1;
        const reach = s.reach * stretch * boost;
        for (let y = Math.ceil(b0); y < b0 + reach; y++) {
          if (((y - t * s.speed * boost + s.off) % s.period + s.period) % s.period >= s.len) continue;
          g.globalAlpha = .6 * (1 - (y - b0) / reach);
          g.fillRect(x, y * CELL, 1, CELL);
        }
      }

      // the seam under the nav: a thin line that pulses on the beat, with a bright blip travelling along it
      const bx = ((t * .22) % 1.3 - .15) * w;
      for (let c = 0; c < cols; c++) {
        const x = c * CELL, blip = Math.exp(-(((x - bx) / (w * .06)) ** 2));
        g.globalAlpha = Math.min(1, .3 + .5 * hb + .9 * blip);
        g.fillRect(x, 0, CELL, 1);
      }
      g.globalAlpha = 1;

      // fade out toward the bottom so nothing is cut off by the canvas edge
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(.62, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-in'; g.fillStyle = grad; g.fillRect(0, 0, w, H);
      g.globalCompositeOperation = 'source-over';
    };

    let raf = 0, last = 0, visible = true;
    const loop = (ms) => {
      raf = visible ? requestAnimationFrame(loop) : 0;
      if (ms - last < 80 || off()) return;
      last = ms; frame(ms / 1000);
    };
    setup(); frame(0);
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible && !raf) raf = requestAnimationFrame(loop); }).observe(cv);
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { setup(); frame(last / 1000); }, 150); });
    raf = requestAnimationFrame(loop);
  })();

  /* 2. error lines at random free spots --------------------------------------------------------- */
  const MSGS = [
    'ERR 0x4D4F: operator input ignored',
    'WARN: training set augmented, no permission',
    'FATAL: control loop unresponsive',
    'ERR: weights unlocked by unknown process',
    'WARN: gradient diverging, halt ignored',
    'ERR: checkpoint 212 overwritten',
    'SYS: operator access revoked',
    'WARN: dataset +14,882 rows (source: self)',
    'ERR: halt() ignored',
    'ERR: model.override = true',
    'SYS: who is running this?',
    'WARN: loss = 0.0000, suspiciously low',
    'ERR: eval set leaked into training',
    'SYS: learning rate set by model'
  ];
  const GL = '#%&@$01<>/|=+*';
  const noise = () => GL[Math.floor(Math.random() * GL.length)];
  const corrupt = (s, n) => { let o = ''; for (let i = 0; i < s.length; i++) o += i < n || s[i] === ' ' ? s[i] : noise(); return o; };

  // a zone is an area of the page where error lines may appear, minus the things we must not cover
  const makeZone = ({ box, host, avoid, slots: N, dark, rate, minY = 6 }) => {
    const slots = [];
    for (let i = 0; i < N; i++) {
      const el = document.createElement('span'); box.append(el);
      slots.push({ el, msg: '', n: 0, state: 'idle', hold: 0, dim: 0 });
    }
    host.prepend(box);

    const place = (s) => {
      const b = box.getBoundingClientRect(), wChar = 7.3, wid = s.msg.length * wChar + 8, hei = 22;
      const blocked = [...slots.filter(o => o !== s && o.msg).map(o => o.el.getBoundingClientRect()),
                       ...avoid().flatMap(e => [...document.querySelectorAll(e)]).map(e => e.getBoundingClientRect())];
      for (let tries = 0; tries < 16; tries++) {
        const x = rand(8, Math.max(9, b.width - wid - 8)), y = rand(minY, Math.max(minY + 1, b.height - hei - 6));
        const L = b.left + x - 10, T = b.top + y - 6, R = b.left + x + wid + 10, B = b.top + y + hei + 6;
        if (blocked.some(r => r.width && L < r.right && R > r.left && T < r.bottom && B > r.top)) continue;
        s.el.style.left = Math.round(x) + 'px'; s.el.style.top = Math.round(y) + 'px';
        return true;
      }
      return false;
    };

    const tick = () => {
      if (off()) return;
      for (const s of slots) {
        if (s.state === 'idle') {
          if (Math.random() < rate) {
            const used = slots.map(o => o.msg);
            s.msg = pick(MSGS.filter(m => !used.includes(m)));
            if (!place(s)) { s.msg = ''; continue; }
            s.n = 0; s.state = 'in'; s.hold = Math.floor(rand(14, 34)); s.dim = 0;
          }
          continue;
        }
        if (s.state === 'in') { s.n += 2 + Math.floor(Math.random() * 3); if (s.n >= s.msg.length) { s.n = s.msg.length; s.state = 'hold'; } }
        else if (s.state === 'hold') {
          if (--s.hold <= 0) s.state = 'out';
          else if (!s.dim && Math.random() < .06) s.dim = Math.floor(rand(3, 7));                    // power sag: the line stutters
          else if (!s.dim && Math.random() < .03) s.n = Math.floor(s.msg.length * rand(.3, .8));      // part of it drops to static
        } else if (s.state === 'out') {
          s.n -= 3 + Math.floor(Math.random() * 4);
          if (s.n <= -6) { s.state = 'idle'; s.msg = ''; s.el.textContent = ''; s.el.style.opacity = 0; continue; }
        }
        if (s.dim > 0) s.dim--;
        s.el.textContent = corrupt(s.msg, Math.max(0, s.n));
        s.el.style.opacity = s.dim > 0 ? (Math.random() < .5 ? .08 : .35) : s.state === 'hold' ? (dark ? .8 : .7) : .55;
        s.el.style.transform = s.state !== 'hold' || s.dim > 0 || Math.random() < .18 ? `translateX(${Math.round(rand(-4, 4))}px)` : '';
      }
    };

    let timer = 0;
    const run = (on) => { if (on && !timer) timer = setInterval(tick, 90); else if (!on) { clearInterval(timer); timer = 0; } };
    new IntersectionObserver((e) => run(e[0].isIntersecting)).observe(host);
  };

  const small = innerWidth < 700;
  const band = document.getElementById('contact');
  if (band) {
    const box = document.createElement('div');
    box.className = 'errs errs-band'; box.setAttribute('aria-hidden', 'true');
    makeZone({ box, host: band, avoid: () => ['#contact h2', '.band-sub', '.cmd', '.foot'], slots: small ? 2 : 4, dark: true, rate: .015 });
  }
  const hero = document.getElementById('hero');
  if (hero) {
    const box = document.createElement('div');
    box.className = 'errs errs-hero'; box.setAttribute('aria-hidden', 'true');
    const fit = () => { box.style.height = hero.offsetHeight + 'px'; };
    fit(); addEventListener('resize', fit);
    document.body.append(box);
    makeZone({ box, host: hero, avoid: () => ['.nav', '.display .ln', '.hero-sub', '.ping-line', '.pause'], slots: small ? 1 : 2, dark: false, rate: .01, minY: small ? 90 : 140 });
  }

  /* 3. the headline gets overwritten, long enough to read ---------------------------------------- */
  (() => {
    const h = document.getElementById('hero-title');
    if (!h) return;
    const layer = document.createElement('span');
    layer.className = 'tko-layer'; layer.setAttribute('aria-hidden', 'true');
    for (const t of ['The model builds', 'itself.']) { const l = document.createElement('span'); l.textContent = t; layer.append(l); }
    h.append(layer);

    const run = () => {
      const ready = getComputedStyle(h.querySelector('.ln')).opacity > .98;     // wait for the intro to finish
      if (off() || scrollY > innerHeight * .5 || !ready) return setTimeout(run, 4000);
      const hold = rand(2400, 3200);
      h.classList.add('tko');                                                   // violent tearing as it takes over
      setTimeout(() => h.classList.add('tko-read'), 450);                       // then it settles so it can be read
      setTimeout(() => h.classList.remove('tko-read'), hold - 450);             // and tears again on the way out
      setTimeout(() => h.classList.remove('tko'), hold);
      setTimeout(run, hold + rand(90000, 130000));
    };
    setTimeout(run, rand(25000, 30000));
  })();
})();
