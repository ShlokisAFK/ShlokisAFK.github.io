/* One scan line sweeps the page on load, tagging a few things as it passes. Plays once. */
(() => {
  if (!window.gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const line = document.createElement('div');
  line.id = 'sweep'; line.setAttribute('aria-hidden', 'true');
  document.body.append(line);

  const targets = [
    { sel: '.display', text: '> headline: ok' },
    { sel: '.hero-sub', text: '> status: open to an ML internship' },
    { sel: '.thread', text: '> link: me <-> model' }
  ].map(t => ({ ...t, el: document.querySelector(t.sel), done: false }));

  const tagAt = (t) => {
    const r = t.el.getBoundingClientRect();
    if (!r.height || innerWidth < 700) return;
    const tag = document.createElement('div');
    tag.className = 'sweep-tag'; tag.setAttribute('aria-hidden', 'true'); tag.textContent = t.text;
    tag.style.top = Math.round(r.top + Math.min(r.height / 2, 60)) + 'px';
    document.body.append(tag);
    gsap.fromTo(tag, { opacity: 0 }, { opacity: 1, duration: 0.05, repeat: 3, yoyo: true, ease: 'steps(1)', onComplete: () => gsap.to(tag, { opacity: 0, delay: 0.7, duration: 0.25, onComplete: () => tag.remove() }) });
  };

  const run = () => gsap.fromTo(line, { y: -60 }, {
    y: innerHeight, duration: 1.9, ease: 'power1.inOut',
    onUpdate() {
      const y = gsap.getProperty(line, 'y');
      for (const t of targets) if (!t.done && t.el && y > t.el.getBoundingClientRect().top + 20) { t.done = true; tagAt(t); }
    },
    onComplete: () => line.remove()
  });
  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  ready.then(() => gsap.delayedCall(0.2, run));
})();
