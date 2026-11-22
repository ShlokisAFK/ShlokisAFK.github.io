/* Two faint columns of drifting hex in the page margins, wide screens only. Decorative. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0');
  const LINES = 80;

  const make = (side) => {
    const col = document.createElement('div');
    col.className = 'hexstrip ' + side; col.setAttribute('aria-hidden', 'true');
    const inner = document.createElement('div'); inner.className = 'hs-in';
    const spans = [];
    for (let k = 0; k < 2 * LINES; k++) {                       // the list is doubled so the loop is seamless
      const s = document.createElement('span');
      s.textContent = k < LINES ? hex() : spans[k - LINES].textContent;
      spans.push(s); inner.append(s);
    }
    col.append(inner); document.body.append(col);
    return spans;
  };
  const sets = [make('left'), make('right')];

  // now and then a line rewrites itself, like a live data stream
  setInterval(() => {
    if (window.__motionPaused || document.hidden || innerWidth < 1120) return;
    for (const spans of sets) {
      const i = Math.floor(Math.random() * LINES), v = hex();
      spans[i].textContent = v; spans[i + LINES].textContent = v;
      spans[i].classList.add('hot'); spans[i + LINES].classList.add('hot');
      setTimeout(() => { spans[i].classList.remove('hot'); spans[i + LINES].classList.remove('hot'); }, 900);
    }
  }, 450);
})();
