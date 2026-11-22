/* PitWall, race by race.
   Reads data/pitwall-races.json (a walk-forward evaluation published from the Raspberry Pi) and builds the replay.
   Every race was predicted by a model trained only on the races before it, and is compared with a plain
   "starting grid = finishing order" baseline. The numbers elsewhere on the page are synced from the same file,
   so they can never disagree with it. */
(() => {
  const URL = 'data/pitwall-races.json';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const f1 = (n) => Number(n).toFixed(1), f2 = (n) => Number(n).toFixed(2);
  const dateLong = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };

  function valid(d) {
    const s = d && d.summary;
    return !!(d && Array.isArray(d.races) && d.races.length && s && s.model && s.grid_baseline && s.model.races > 0 &&
      d.races.every(r => Array.isArray(r.pred_podium) && Array.isArray(r.actual_podium) && typeof r.podium_hits === 'number' && typeof r.mae === 'number'));
  }

  /* ---- numbers used all over the page, always taken from the file ---- */
  function derive(d) {
    const m = d.summary.model, b = d.summary.grid_baseline;
    return { season: d.season, n: m.races, first: d.races[0].round, last: d.races[d.races.length - 1].round,
      podiumPct: m.podium_accuracy_pct, podiumHit: m.podium_slots_hit, podiumTotal: m.podium_slots_total,
      winners: m.winners_correct, winnerPct: m.winner_accuracy_pct, err: m.mean_position_error,
      base: { podiumPct: b.podium_accuracy_pct, winners: b.winners_correct, err: b.mean_position_error } };
  }

  function metricBlock(key, label, pct) {
    const m = el('div', 'metric'); m.dataset.pw = key;
    const top = el('div', 'm-top'), val = el('span', 'm-val'), b = el('b', null, f1(pct));
    b.dataset.count = pct; b.dataset.dec = 1; val.append(b, document.createTextNode('%'));
    top.append(el('span', null, label), val);
    const bar = el('div', 'bar'); bar.setAttribute('role', 'img'); bar.setAttribute('aria-label', `${label} ${f1(pct)} percent`);
    const i = el('i'); i.style.setProperty('--v', pct + '%'); bar.append(i);
    m.append(top, bar); return m;
  }

  // The project list: numbers appear only when the evaluation file is there.
  function syncHeadline(pw) {
    const box = $('#pw-metrics'); if (!box) return;
    box.textContent = '';
    box.append(metricBlock('podium', 'Podium accuracy', pw.podiumPct), metricBlock('winner', 'Winner accuracy', pw.winnerPct),
      el('p', 'note', `All ${pw.n} races of ${pw.season}, each predicted by a model trained only on earlier races. Mean position error: ${f2(pw.err)}. Grid order alone: ${f1(pw.base.podiumPct)}% podium, ${pw.base.winners} of ${pw.n} winners. See the replay below.`));
    const row = box.closest('.work-row');
    if (row) {
      if (!row.dataset.profileBase) row.dataset.profileBase = row.dataset.profile || '';
      row.dataset.profile = row.dataset.profileBase + `|evaluated: walk-forward, ${pw.n} races|podium: ${f1(pw.podiumPct)}%  (grid order ${f1(pw.base.podiumPct)}%)`;
    }
  }

  /* ---- the replay ---- */
  function build(d, pw) {
    const app = $('#replay-app'); if (!app) return;
    const races = d.races, N = races.length;
    app.textContent = '';

    const sum = el('div', 'rp-summary');
    const stat = (label, big, sub, pct, basePct, baseText) => {
      const s = el('div', 'rp-stat');
      s.append(el('div', 'rp-label', label), el('div', 'rp-value', big), el('div', 'rp-sub', sub));
      if (pct != null) {
        const bar = el('div', 'rp-bar'); bar.setAttribute('role', 'img');
        bar.setAttribute('aria-label', `${label} ${f1(pct)} percent. Grid order alone: ${f1(basePct)} percent.`);
        bar.style.setProperty('--v', pct + '%'); bar.style.setProperty('--b', basePct + '%');
        bar.append(el('i'), el('b', 'tick')); s.append(bar);
      }
      s.append(el('div', 'rp-base', baseText));
      return s;
    };
    sum.append(
      stat('Podium accuracy', f1(pw.podiumPct) + '%', `${pw.podiumHit} of ${pw.podiumTotal} podium places`, pw.podiumPct, pw.base.podiumPct, `Tick: grid order alone, ${f1(pw.base.podiumPct)}%`),
      stat('Winner accuracy', `${pw.winners} of ${pw.n}`, f1(pw.winnerPct) + '% of races', pw.winnerPct, (pw.base.winners / pw.n) * 100, `Tick: grid order alone, ${pw.base.winners} of ${pw.n}`),
      stat('Mean position error', f2(pw.err), 'places off, per driver', null, null, `Grid order alone: ${f2(pw.base.err)}`)
    );
    const scope = el('p', 'note rp-scope', `Each race is predicted by a model trained only on the races before it, then compared with the grid-order baseline, which is the number to beat.`);

    const ctl = el('div', 'rp-controls');
    const prev = el('button', 'rp-btn', '‹ Prev'), next = el('button', 'rp-btn', 'Next ›'), play = el('button', 'rp-btn rp-play', 'Play');
    [prev, next, play].forEach(b => b.type = 'button');
    prev.setAttribute('aria-label', 'Previous race'); next.setAttribute('aria-label', 'Next race');
    play.setAttribute('aria-pressed', 'false');
    const range = el('input', 'rp-range'); range.type = 'range'; range.min = 1; range.max = N; range.value = N; range.step = 1;
    range.setAttribute('aria-label', 'Race'); range.id = 'rp-range';
    const out = el('output', 'rp-out'); out.setAttribute('for', 'rp-range');
    ctl.append(prev, play, next, range, out);

    const strip = el('div', 'rp-strip'); strip.setAttribute('role', 'group'); strip.setAttribute('aria-label', 'Races of the season');
    const cells = races.map((r, i) => {
      const c = el('button', 'rp-cell'); c.type = 'button';
      c.setAttribute('aria-label', `Round ${r.round}, ${r.race}: ${r.podium_hits} of 3 podium places right`);
      c.append(el('span', 'rp-n', String(r.round)));
      const dots = el('span', 'rp-dots'); dots.setAttribute('aria-hidden', 'true');
      for (let k = 0; k < 3; k++) dots.append(el('span', k < r.podium_hits ? 'on' : ''));
      c.append(dots);
      c.addEventListener('click', () => { stop(); show(i); });
      strip.append(c); return c;
    });

    const stage = el('div', 'rp-stage');
    const head = el('h3', 'rp-race');
    const cols = el('div', 'rp-cols');
    const colP = el('div', 'rp-col'), colA = el('div', 'rp-col');
    const chipsP = el('div', 'rp-chips'), chipsA = el('div', 'rp-chips');
    colP.append(el('div', 'rp-colhead', 'The model predicted'), chipsP);
    colA.append(el('div', 'rp-colhead', 'What happened'), chipsA);
    cols.append(colP, colA);
    const facts = el('div', 'rp-facts'), tally = el('p', 'rp-tally');
    stage.append(head, cols, facts, tally);

    const live = el('p', 'sr-only'); live.setAttribute('aria-live', 'polite');
    const foot = el('p', 'note rp-foot', `Updated ${dateLong(d.generated_at) || 'recently'}. Dots show how many of the three podium places the model named.`);

    sum.classList.add('rp-summary-end');
    app.append(ctl, strip, stage, sum, scope, live, foot);   // scrub and see the result in one view; the season totals sit below
    app.hidden = false;
    const fb = $('#replay-fallback'); if (fb) fb.hidden = true;

    const chip = (code, hit, predicted) => {
      const c = el('span', 'chip ' + (hit ? 'hit' : 'miss'));
      c.append(el('b', null, code), el('span', 'mark', hit ? '✓' : '✗'), el('span', 'sr-only', hit ? (predicted ? ' correct' : ' predicted') : (predicted ? ' not on the podium' : ' missed')));
      return c;
    };
    let cur = -1, timer = 0;

    function show(i, animate = true) {
      i = Math.max(0, Math.min(N - 1, i));
      const r = races[i], pSet = new Set(r.pred_podium), aSet = new Set(r.actual_podium);
      cur = i; range.value = i + 1;
      out.textContent = `Round ${r.round} of ${races[N - 1].round}`;
      cells.forEach((c, k) => { c.classList.toggle('sel', k === i); if (k === i) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current'); });
      head.textContent = `Round ${r.round}, ${r.race}`;
      chipsP.textContent = ''; chipsA.textContent = '';
      r.pred_podium.forEach(code => chipsP.append(chip(code, aSet.has(code), true)));
      r.actual_podium.forEach(code => chipsA.append(chip(code, pSet.has(code), false)));
      facts.textContent = '';
      facts.append(el('p', null, `Winner: predicted ${r.pred_winner}, actual ${r.actual_winner} ${r.winner_correct ? '✓' : '✗'}`),
        el('p', null, `Position error this race: ${f2(r.mae)}`));
      if (r.grid) facts.append(el('p', 'dim', `Grid order alone: ${r.grid.podium_hits} of 3 podium places, winner ${r.grid.winner_correct ? '✓' : '✗'}`));
      const upto = races.slice(0, i + 1);
      const hits = upto.reduce((s, x) => s + x.podium_hits, 0), wins = upto.filter(x => x.winner_correct).length, err = upto.reduce((s, x) => s + x.mae, 0) / upto.length;
      const gh = upto.reduce((s, x) => s + (x.grid ? x.grid.podium_hits : 0), 0);
      tally.textContent = `Through round ${r.round}: podium ${hits} of ${upto.length * 3} (${f1(hits / (upto.length * 3) * 100)}%), winners ${wins} of ${upto.length}, mean error ${f2(err)}. Grid order alone: podium ${f1(gh / (upto.length * 3) * 100)}%.`;
      live.textContent = `Round ${r.round}, ${r.race}. Predicted ${r.pred_podium.join(', ')}. Actual ${r.actual_podium.join(', ')}. ${r.podium_hits} of 3 podium places right.`;
      if (animate && !reduced && window.gsap && window.ScrambleTextPlugin) {
        $$('.chip b', stage).forEach(b => { const t = b.textContent; gsap.fromTo(b, { scrambleText: { text: '', chars: '01#%/<>' } }, { duration: 0.4, scrambleText: { text: t, chars: '01#%/<>', speed: 1 }, ease: 'none', overwrite: true }); });
      }
    }

    function stop() { clearInterval(timer); timer = 0; play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); }
    function start() {
      if (cur >= N - 1) show(0);
      play.textContent = 'Pause'; play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => { if (cur >= N - 1) stop(); else show(cur + 1); }, 1200);
    }
    play.addEventListener('click', () => (timer ? stop() : start()));
    prev.addEventListener('click', () => { stop(); show(cur - 1); });
    next.addEventListener('click', () => { stop(); show(cur + 1); });
    range.addEventListener('input', () => { stop(); show(Number(range.value) - 1); });

    show(N - 1, false);                                  // opens on the latest race

    const bars = $$('.rp-bar', sum);
    if ('IntersectionObserver' in window && !reduced) {
      const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.4 });
      bars.forEach(b => io.observe(b));
    } else bars.forEach(b => b.classList.add('in'));
  }

  window.__pw = null;
  window.__pitwallReady = fetch(URL, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error('no data'); return r.json(); })
    .then(d => { if (!valid(d)) throw new Error('bad data'); const pw = derive(d); window.__pw = pw; syncHeadline(pw); build(d, pw); })
    .catch(() => { /* keep the fallback notes */ });
})();
