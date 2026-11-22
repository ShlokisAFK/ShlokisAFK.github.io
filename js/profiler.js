/* Profiler tags: point at a project and a small card reads out facts about it.
   Every value comes from the project's own row data (data-profile) and the CV. */
(() => {
  if (!matchMedia('(hover: hover)').matches) return;
  const rows = [...document.querySelectorAll('.work-row[data-profile]')];
  if (!rows.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrambleTextPlugin);

  const tag = document.createElement('div');
  tag.id = 'profiler'; tag.setAttribute('aria-hidden', 'true');
  tag.innerHTML = '<div class="p-head"></div><div class="p-body"></div>';
  document.body.append(tag);
  const head = tag.querySelector('.p-head'), body = tag.querySelector('.p-body');

  let x = 0, y = 0, tx = 0, ty = 0, shown = false, raf = 0;
  const place = () => { x += (tx - x) * 0.22; y += (ty - y) * 0.22; tag.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.4 && shown) ? requestAnimationFrame(place) : 0; };
  const aim = (cx, cy) => {
    const w = tag.offsetWidth, h = tag.offsetHeight;
    tx = cx + 20 + w > innerWidth - 8 ? cx - w - 20 : cx + 20;
    ty = Math.min(innerHeight - h - 8, Math.max(66, cy + 16));
    if (!raf) raf = requestAnimationFrame(place);
  };

  function fill(row) {
    head.textContent = '> profile: ' + row.querySelector('h3').textContent.trim().toLowerCase();
    body.textContent = '';
    for (const item of row.dataset.profile.split('|')) {
      const [k, ...v] = item.split(':');
      const line = document.createElement('div'); line.className = 'p-row';
      const ke = document.createElement('span'); ke.className = 'k'; ke.textContent = k.trim();
      const ve = document.createElement('span'); ve.className = 'v'; ve.textContent = v.join(':').trim();
      line.append(ke, ve); body.append(line);
      if (hasGsap && !reduced) gsap.fromTo(ve, { scrambleText: { text: '', chars: '01#%/<>', speed: 1 } }, { duration: 0.5, scrambleText: { text: ve.textContent, chars: '01#%/<>', speed: 0.8, revealDelay: 0.1 }, ease: 'none' });
    }
  }
  const show = () => { shown = true; tag.classList.add('on'); };
  const hide = () => { shown = false; tag.classList.remove('on'); };

  rows.forEach(row => {
    row.addEventListener('pointerenter', e => { fill(row); show(); x = tx = e.clientX + 20; y = ty = e.clientY + 16; aim(e.clientX, e.clientY); });
    row.addEventListener('pointermove', e => aim(e.clientX, e.clientY));
    row.addEventListener('pointerleave', hide);
    row.addEventListener('focusin', () => {                 // keyboard: pin it to the row's right side
      fill(row); show(); const r = row.getBoundingClientRect();
      aim(r.right - tag.offsetWidth - 40, r.top + 24);
    });
    row.addEventListener('focusout', hide);
  });
  addEventListener('scroll', () => { if (shown && !matchMedia('(hover: none)').matches) { /* follows the pointer on next move */ } }, { passive: true });
})();
