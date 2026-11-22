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
  (() => {
    const cv = document.createElement('canvas');
    cv.className = 'topfall'; cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    const g = cv.getContext('2d');
    const CELL = 3;
    let w = 0, H = 0, cols = [], dCols = 0, dRows = 0, dPatch, dPhase, dRnd;
    let burst = null, nextBurst = 2.5, tear = null, nextTear = 2;

    const setup = () => {
      const small = innerWidth < 700;
      w = document.documentElement.clientWidth; H = small ? 120 : 210;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(H * dpr);
      cv.style.height = H + 'px';
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = [];
      for (let x = rand(0, 10); x < w; x += rand(6, 13)) {
        if (Math.random() < .35) continue;
        cols.push({ x: Math.round(x), speed: rand(16, 52), period: rand(24, 76), len: rand(6, 20), off: rand(0, 90), amp: rand(.16, .38), reach: rand(.55, 1) });
      }
      // dust clinging to the top: dense at the nav, thinning out downward, in uneven clumps
      dCols = Math.ceil(w / CELL); dRows = small ? 10 : 18;
      dPatch = new Float32Array(dCols); dPhase = new Float32Array(dCols); dRnd = new Float32Array(dCols * dRows);
      for (let c = 0, v = 0; c < dCols; c++) { if (c % 8 === 0) v = Math.random() < .4 ? rand(.8, 2) : rand(0, .6); dPatch[c] = v; dPhase[c] = rand(0, 6.28); }
      for (let i = 0; i < dRnd.length; i++) dRnd[i] = Math.random();
    };

    const frame = (t) => {
      g.clearRect(0, 0, w, H);
      if (tear && t > tear.end) tear = null;
      if (!tear && t > nextTear) { tear = { y: Math.floor(rand(0, dRows * .8)), h: 1 + Math.floor(rand(0, 3)), dx: (Math.random() < .5 ? -1 : 1) * Math.floor(rand(3, 10)), end: t + .14 }; nextTear = t + rand(2, 4.5); }
      if (burst && t > burst.end) burst = null;
      if (!burst && t > nextBurst) { const x0 = rand(0, w * .85); burst = { x0, x1: x0 + rand(80, 260), end: t + rand(.6, 1.2) }; nextBurst = t + rand(4, 8); }

      // dither dust
      g.fillStyle = INK;
      for (let c = 0; c < dCols; c++) {
        const swell = 1 + .4 * Math.sin(c * .03 - t * .6 + dPhase[c] * .2);
        const reach = (4 + dPatch[c] * 7) * swell;
        const hot = burst && c * CELL >= burst.x0 && c * CELL <= burst.x1 ? 1.6 : 1;
        for (let r = 0; r < dRows; r++) {
          const k = dRnd[c * dRows + r];
          const thr = BAYER[r & 3][c & 3] + .12 * Math.sin(t * .8 + dPhase[c] + r);
          if (Math.exp(-r / (reach * hot)) * .5 <= thr || k < .15) continue;
          const dx = tear && r >= tear.y && r < tear.y + tear.h ? tear.dx : 0;
          g.globalAlpha = .62 - (r / dRows) * .35;
          g.fillRect(c * CELL + dx, r * CELL, CELL, CELL);
        }
      }

      // falling streaks
      for (const c of cols) {
        const boost = burst && c.x >= burst.x0 && c.x <= burst.x1 ? 1.8 : 1;
        const reach = H * c.reach * (boost > 1 ? 1.15 : 1);
        for (let y = 0; y < reach; y += 3) {
          if ((((y - t * c.speed * boost + c.off) % c.period) + c.period) % c.period >= c.len) continue;
          g.globalAlpha = Math.min(.75, c.amp * boost) * Math.sin(Math.PI * (.12 + .88 * y / reach)) ;   // starts firm at the top, fades out as it falls
          g.fillRect(c.x, y, 1, 3);
        }
      }
      g.globalAlpha = 1;
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
    makeZone({ box, host: band, avoid: () => ['#contact h2', '.band-sub', '.cmd', '.foot'], slots: small ? 2 : 4, dark: true, rate: .09 });
  }
  const hero = document.getElementById('hero');
  if (hero) {
    const box = document.createElement('div');
    box.className = 'errs errs-hero'; box.setAttribute('aria-hidden', 'true');
    const fit = () => { box.style.height = hero.offsetHeight + 'px'; };
    fit(); addEventListener('resize', fit);
    document.body.append(box);
    makeZone({ box, host: hero, avoid: () => ['.nav', '.display .ln', '.hero-sub', '.ping-line', '.pause'], slots: small ? 1 : 2, dark: false, rate: .06, minY: small ? 90 : 140 });
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
      setTimeout(run, hold + rand(22000, 36000));
    };
    setTimeout(run, rand(8000, 12000));
  })();
})();
