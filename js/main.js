(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const PING_URL = 'https://pitwal.site/api/health';

  /* ---------- Nav border on scroll ---------- */
  const nav = $('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Thread: geometry ---------- */
  const hero = $('#hero');
  const threadEl = $('.thread');
  const svg = $('#thread-svg');
  const path = $('#thread-path');
  const meG = $('#node-me');
  const modelG = $('#node-model');
  const packLayer = $('#packets');

  let chars = [];                             // headline letters, filled once the intro has finished
  const pointer = { x: -9999, y: -9999, on: false };

  const N = 160;                              // samples along the thread
  const D = new Float32Array(N + 1);          // vertical displacement of each sample (px)
  const V = new Float32Array(N + 1);          // its velocity
  const P = { a: 0, b: 0 };                   // pointer-driven bend
  let W = 0, H = 0, L = 24;
  const xs = new Float32Array(N + 1), ys = new Float32Array(N + 1), baseY = new Float32Array(N + 1);

  const ends = () => ({ x0: L, y0: H * 0.24, x1: W - L, y1: H * 0.14 });

  function sample() {
    const { x0, y0, x1, y1 } = ends();
    const sag = H * 0.9 + P.a;
    const c1x = x0 + W * 0.28 + P.b, c1y = sag;
    const c2x = x1 - W * 0.28 + P.b, c2y = sag - H * 0.1;
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
      xs[i] = b0 * x0 + b1 * c1x + b2 * c2x + b3 * x1;
      baseY[i] = b0 * y0 + b1 * c1y + b2 * c2y + b3 * y1;
      ys[i] = baseY[i] + D[i];
    }
  }

  function render() {
    sample();
    let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
    for (let i = 1; i <= N; i++) d += `L${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
    path.setAttribute('d', d);
    const { x0, y0, x1, y1 } = ends();
    for (const [g, x, y, anchor] of [[meG, x0, y0, 'start'], [modelG, x1, y1, 'end']]) {
      $$('circle', g).forEach(c => { c.setAttribute('cx', x); c.setAttribute('cy', y); });
      const t = $('text', g);
      t.setAttribute('x', x); t.setAttribute('y', y - 18); t.setAttribute('text-anchor', anchor);
    }
  }

  function pointAt(t) {                       // t in 0..1 along the displaced thread
    const f = Math.min(N, Math.max(0, t * N)), i = Math.min(N - 1, Math.floor(f)), k = f - i;
    return { x: xs[i] + (xs[i + 1] - xs[i]) * k, y: ys[i] + (ys[i + 1] - ys[i]) * k };
  }

  function layout() {
    const r = svg.getBoundingClientRect();
    W = r.width; H = r.height;
    const wrap = $('.hero .wrap');
    L = wrap.getBoundingClientRect().left + parseFloat(getComputedStyle(wrap).paddingLeft) - r.left;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    render();
  }
  layout();
  addEventListener('resize', () => { layout(); cacheChars(); });

  if (reduced) { $('.n-core', modelG).setAttribute('fill', 'var(--ink)'); return; }

  /* ---------- Plugins ---------- */
  gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin);
  clearTimeout(window.__psafe);

  const start = () => {
    layout();
    intro();
    scrollMoments();
    ScrollTrigger.refresh();
  };
  // wait (briefly) for the published PitWall numbers, so the digits that scramble into place are the real ones
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const dataReady = Promise.race([window.__pitwallReady || Promise.resolve(), new Promise(r => setTimeout(r, 1500))]);
  Promise.all([fontsReady, dataReady]).then(start);

  /* ---------- Load sequence ---------- */
  function intro() {
    const lines = $$('.display .ln');
    const texts = lines.map(l => l.textContent);
    const chars = '01/\\|+-=<>';
    const tl = gsap.timeline();

    lines.forEach((el, i) => {
      tl.set(el, { opacity: 1 }, i * 0.18)
        .to(el, { duration: 1.2, scrambleText: { text: texts[i], chars, speed: 0.6, revealDelay: 0.15, tweenLength: false }, ease: 'none' }, i * 0.18);
    });
    tl.add(splitHeadline, 1.7);
    tl.fromTo('.hero-sub', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' }, 0.9);

    tl.set(meG, { opacity: 1 }, 0.5)
      .fromTo(meG, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.5, ease: 'back.out(2.4)' }, 0.5)
      .fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.1, ease: 'power2.inOut' }, 0.7)
      .set(modelG, { opacity: 1 }, 2.8)
      .fromTo(modelG, { scale: 0.2, transformOrigin: '50% 50%' }, { scale: 1, duration: 0.55, ease: 'back.out(2.4)' }, 2.8)
      .to($('.n-core', modelG), { fill: 'var(--ink)', duration: 0.3 }, 2.85)
      .add(startConversation, 3.0)
      .add(enablePointer, 3.0);
  }

  /* ---------- Headline: letters swell toward the cursor ---------- */
  function splitHeadline() {
    $$('.display .ln').forEach(ln => {
      const txt = ln.textContent;
      ln.innerHTML = [...txt].map(ch => ch === ' ' ? ' ' : `<span class="c">${ch}</span>`).join('');
    });
    chars = $$('.display .c').map(el => ({ el, ch: el.textContent, cx: 0, cy: 0, w: 450 }));
    cacheChars();
    if (canHover) gsap.ticker.add(swell);
    scheduleGlitch();
  }

  /* Now and then a few letters of the headline flicker into noise and snap back. */
  const NOISE = '01/\\|+-=<>#%';
  function scheduleGlitch() {
    gsap.delayedCall(8 + Math.random() * 8, () => {
      if (!document.hidden && scrollY < innerHeight * 0.6) {
        const picks = gsap.utils.shuffle(chars.slice()).slice(0, 3 + Math.floor(Math.random() * 3));
        let flickers = 0;
        const flick = () => {
          picks.forEach(c => { c.el.textContent = NOISE[Math.floor(Math.random() * NOISE.length)]; });
          gsap.delayedCall(0.07, () => { picks.forEach(c => { c.el.textContent = c.ch; }); if (++flickers < 2) gsap.delayedCall(0.06, flick); });
        };
        flick();
      }
      scheduleGlitch();
    });
  }
  function cacheChars() {
    for (const c of chars) { const r = c.el.getBoundingClientRect(); c.cx = r.left + r.width / 2 + scrollX; c.cy = r.top + r.height / 2 + scrollY; }
  }
  function swell() {
    if (!chars.length) return;
    const reach = Math.max(160, innerWidth * 0.11);
    let moving = false;
    for (const c of chars) {
      const dx = c.cx - (pointer.x + scrollX), dy = (c.cy - (pointer.y + scrollY)) * 0.7;
      const target = pointer.on ? 450 + 250 * Math.exp(-(dx * dx + dy * dy) / (reach * reach)) : 450;
      if (Math.abs(target - c.w) > 0.4) {
        c.w += (target - c.w) * 0.14; moving = true;
        c.el.style.fontVariationSettings = `"wght" ${c.w.toFixed(0)}, "opsz" 96`;
      }
    }
    if (moving) cacheCharsLight();
  }
  // widths change as weights change, so keep the centres of the characters honest (cheap: only x drifts)
  let lastCache = 0;
  function cacheCharsLight() { const n = performance.now(); if (n - lastCache > 250) { lastCache = n; cacheChars(); } }

  /* ---------- A conversation on the thread ---------- */
  const packets = [];
  const MAX_PINGS = 3;                         // a visitor never sends more than three real requests to the Pi
  let running = false, inView = true, lastMs = null, lastPing = -1e9, pingOut = false, pings = 0;
  const conv = gsap.timeline();                // everything the conversation does lives here, so one button can pause it

  function pulse(g) {
    gsap.fromTo($('.n-ring', g), { attr: { r: 5 }, opacity: 0.75 }, { attr: { r: 24 }, opacity: 0, duration: 0.9, ease: 'power2.out', overwrite: true });
    gsap.fromTo($('.n-core', g), { attr: { r: 8 } }, { attr: { r: 5 }, duration: 0.6, ease: 'elastic.out(1, 0.5)', overwrite: true });
  }

  /* A real request: time a round trip to the Raspberry Pi that serves PitWall.
     The API sends no CORS header, so the reply can't be read, but a no-cors fetch still resolves
     when the response arrives, and that is all a timing needs. */
  const liveTxt = $('#live-txt'), liveDot = $('#live-dot');
  function setLive(ok, ms) {
    liveDot.classList.toggle('ok', ok);
    liveTxt.textContent = ok
      ? `pitwal.site answered in ${ms} ms, timed from your browser. Drag the line.`
      : `pitwal.site didn't answer just now. The Pi may be asleep. Drag the line anyway.`;
  }
  async function ping() {
    if (pingOut || pings >= MAX_PINGS) return;
    pings++;
    pingOut = true; lastPing = performance.now();
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
    const t0 = performance.now();
    try {
      await fetch(`${PING_URL}?t=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal });
      lastMs = Math.round(performance.now() - t0);
      setLive(true, lastMs);
      pulse(modelG);                           // the model answered
    } catch { lastMs = null; setLive(false); }
    clearTimeout(to); pingOut = false;
  }

  function send(dir) {
    const g = document.createElementNS(NS, 'g');
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', '4');
    if (dir > 0) c.setAttribute('fill', 'currentColor');
    else { c.setAttribute('fill', 'var(--paper)'); c.setAttribute('stroke', 'currentColor'); c.setAttribute('stroke-width', '1.5'); }
    const t = document.createElementNS(NS, 'text');
    t.setAttribute('class', 'pk-label'); t.setAttribute('text-anchor', 'middle');
    if (dir > 0) {
      t.textContent = 'x';
      if (performance.now() - lastPing > 9000) ping();      // every few messages, send a real one
    } else {
      t.textContent = lastMs != null ? `ŷ ${lastMs} ms` : 'ŷ';
    }
    g.append(c, t); packLayer.append(g);
    const pk = { pos: dir > 0 ? 0 : 1, g, c, t, dir, done: false };
    packets.push(pk);
    conv.to(pk, {
      pos: dir > 0 ? 1 : 0, duration: 2.7, ease: 'sine.inOut',
      onComplete() { pk.done = true; g.remove(); pulse(dir > 0 ? modelG : meG); }
    }, conv.time());
  }

  function startConversation() {
    if (running) return;
    running = true;
    let dir = 1;
    const loop = () => { if (inView && !document.hidden) send(dir); dir = -dir; conv.call(loop, null, conv.time() + 1.5); };
    loop();
    gsap.ticker.add(tick);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: 0 }).observe(hero);

    $('#live').hidden = false;
    const btn = $('#pause');
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const pausing = !conv.paused();
      conv.paused(pausing);
      window.__motionPaused = pausing;           // the stray marks and the hex strips respect the same button
      html.classList.toggle('motion-paused', pausing);
      btn.setAttribute('aria-pressed', String(pausing));
      btn.textContent = pausing ? 'Play animation' : 'Pause animation';
    });
  }

  /* ---------- The string: weight, waves and plucking ---------- */
  const C = 0.35, K = 0.045, DAMP = 0.965;     // wave coupling, pull back to rest, energy loss per frame
  const AMP = () => Math.min(24, H * 0.07);    // how hard one packet pulls the thread down
  const drag = { active: false, t: 0.5, dy: 0 };

  function tick() {
    if (!inView) return;
    for (let i = packets.length - 1; i >= 0; i--) if (packets[i].done) packets.splice(i, 1);
    const amp = AMP(), sig = 0.075;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let target = 0;
      for (const pk of packets) { const d = (t - pk.pos) / sig; target += amp * Math.exp(-d * d); }
      if (drag.active) { const d = (t - drag.t) / 0.05; target += drag.dy * Math.exp(-d * d); }
      const e = Math.min(1, Math.min(t, 1 - t) / 0.1);     // the ends stay pinned to the nodes
      target *= e * e * (3 - 2 * e);
      const lap = (i > 0 && i < N) ? D[i - 1] + D[i + 1] - 2 * D[i] : 0;
      V[i] += C * lap + K * (target - D[i]);
      V[i] *= DAMP;
    }
    for (let i = 0; i <= N; i++) D[i] += V[i];             // two passes: every sample reads the same frame
    D[0] = D[N] = 0; V[0] = V[N] = 0;
    render();
    for (const pk of packets) {
      const p = pointAt(pk.pos);
      pk.c.setAttribute('cx', p.x); pk.c.setAttribute('cy', p.y);
      pk.t.setAttribute('x', p.x); pk.t.setAttribute('y', p.y + (pk.dir > 0 ? -12 : 24));   // requests ride above the line, answers below
    }
  }

  function nearThread(e) {                     // closest sample to the pointer, if it is within reach
    const r = svg.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let best = 0, bd = 1e9;
    for (let i = 0; i <= N; i += 2) { const d = Math.abs(xs[i] - px); if (d < bd) { bd = d; best = i; } }
    const dist = Math.abs(py - ys[best]);
    return { i: best, py, dist, ok: dist < 64 && best > 6 && best < N - 6 };
  }
  const pull = (n) => { drag.t = n.i / N; drag.dy = Math.max(-110, Math.min(110, n.py - baseY[n.i])); };

  /* ---------- Pointer: the thread bends toward you, and can be plucked ---------- */
  function enablePointer() {
    const qa = gsap.quickTo(P, 'a', { duration: 1.1, ease: 'power3.out' });
    const qb = gsap.quickTo(P, 'b', { duration: 1.1, ease: 'power3.out' });

    threadEl.addEventListener('pointerdown', e => {
      const n = nearThread(e); if (!n.ok) return;
      if (e.pointerType === 'touch') {                      // a tap plucks it (vertical drags still scroll the page)
        for (let i = 0; i <= N; i++) { const d = (i / N - n.i / N) / 0.05; V[i] += (n.py > baseY[n.i] ? 7 : -7) * Math.exp(-d * d); }
        return;
      }
      drag.active = true; pull(n); threadEl.setPointerCapture(e.pointerId); threadEl.style.cursor = 'grabbing';
    });
    threadEl.addEventListener('pointermove', e => { if (drag.active) pull(nearThread(e)); });
    const release = () => { drag.active = false; threadEl.style.cursor = ''; };
    threadEl.addEventListener('pointerup', release);
    threadEl.addEventListener('pointercancel', release);

    if (!canHover) return;
    hero.addEventListener('pointermove', e => {
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;
      if (drag.active) return;
      const r = svg.getBoundingClientRect();
      const nx = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      const ny = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
      qa(ny * H * 0.3); qb(nx * W * 0.14);
      threadEl.style.cursor = nearThread(e).ok ? 'grab' : '';
    });
    hero.addEventListener('pointerleave', () => { pointer.on = false; qa(0); qb(0); });
  }

  /* ---------- Scroll moments ---------- */
  function scrollMoments() {
    $$('.metric').forEach(m => {
      const bar = $('.bar i', m);
      const num = $('[data-count]', m);
      const final = num.textContent.trim();       // the real figure is already in the page; the digits just resolve into it
      const tl = gsap.timeline({ scrollTrigger: { trigger: m, start: 'top 90%', once: true } });
      tl.fromTo(bar, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.3, ease: 'steps(34)' }, 0)
        .to(num, { duration: 1.5, scrambleText: { text: final, chars: '0123456789', speed: 0.5, revealDelay: 0.35, tweenLength: false }, ease: 'none' }, 0);
    });

    const steps = $$('.flow .step');
    ScrollTrigger.create({
      trigger: '.flow', start: 'top 80%', once: true,
      onEnter() {
        steps.forEach((s, i) => {
          gsap.delayedCall(i * 0.5, () => {
            s.classList.add('on');
            if (i < steps.length - 1) gsap.delayedCall(0.5, () => s.classList.remove('on'));
          });
        });
      }
    });

    const cmd = $('.cmd-text');
    const full = cmd.textContent;
    const c = { n: 0 };
    ScrollTrigger.create({
      trigger: '.cmd', start: 'top 92%', once: true,
      onEnter() {
        cmd.style.visibility = 'visible';
        cmd.textContent = '';
        gsap.to(c, { n: full.length, duration: 1.5, ease: `steps(${full.length})`, onUpdate: () => { cmd.textContent = full.slice(0, Math.round(c.n)); } });
      }
    });
  }
})();
