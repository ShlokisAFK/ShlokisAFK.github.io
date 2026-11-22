/* A tiny terminal. Press ` (or use the footer link) to open it. Everything it prints is from the CV and the page. */
(() => {
  const EMAIL = 'singhshlok720@gmail.com';
  const GH = 'https://github.com/ShlokisAFK';
  const PROJECTS = [
    { id: 'pitwall', name: 'PitWall', line: 'XGBoost F1 predictor, live on a Raspberry Pi 5. 93.3% podium, 60% winner, 1.06 position error (first 15 races of 2026).', url: GH + '/PitWall' },
    { id: 'malware', name: 'Malware binary classifier', line: '25 families from grayscale images. ResNet18 reaches 98.12% test accuracy, 2.5 points above the MLP baseline.', url: GH + '/malware-binary-classifier' },
    { id: 'mnist', name: 'MNIST from scratch', line: 'NumPy only, no ML libraries. 90.78% validation accuracy on 60k samples.', url: GH + '/MNIST-Digit-Classifier' },
    { id: 'agent', name: 'Autonomous AI agent', line: 'LLaMA via Groq, Tavily web search, persistent memory, a tool registry.', url: GH + '/ai_agent' },
    { id: 'heatseek', name: 'HeatSeek', line: 'A seeker that learns where you hide. BFS pathfinding, 70/30 explore and exploit.', url: GH + '/HeatSeek' },
    { id: 'dailypulse', name: 'DailyPulse', line: 'Daily email digest: gold and silver prices, F1 schedule, news.', url: GH + '/DailyPulse' },
    { id: 'minitalker', name: 'Minitalker-AI', line: 'Local AI assistant with on-device inference, a Flask backend and an animated chat UI.', url: GH + '/Minitalker-AI' }
  ];
  const COMMANDS = ['help', 'whoami', 'projects', 'open', 'skills', 'ping', 'contact', 'mail', 'resume', 'github', 'linkedin', 'clear', 'exit'];

  const term = document.createElement('div');
  term.id = 'term'; term.setAttribute('role', 'dialog'); term.setAttribute('aria-label', 'Terminal'); term.inert = true;
  term.innerHTML = `
    <div class="t-bar"><span>shlok@portfolio ~</span><button type="button" class="t-x" aria-label="Close terminal">esc</button></div>
    <div class="t-out" role="log" aria-live="polite" tabindex="0"></div>
    <label class="t-line"><span class="t-prompt" aria-hidden="true">&gt;</span><input class="t-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal command"></label>`;
  document.body.append(term);
  const out = term.querySelector('.t-out'), input = term.querySelector('.t-in'), closeBtn = term.querySelector('.t-x');

  const print = (text, cls) => { const d = document.createElement('div'); d.className = 't-l' + (cls ? ' ' + cls : ''); d.textContent = text; out.append(d); out.scrollTop = out.scrollHeight; return d; };
  const history = []; let hi = 0, opener = null, welcomed = false, lastPing = 0;

  function open() {
    opener = document.activeElement;
    term.inert = false; term.classList.add('open');
    if (!welcomed) { welcomed = true; print('shlok-portfolio 1.0'); print('Type help to see what this can do. Esc closes.', 'dim'); }
    setTimeout(() => input.focus(), 30);
  }
  function close() {
    term.classList.remove('open'); term.inert = true;
    if (opener && opener.focus) opener.focus();
  }
  const isOpen = () => term.classList.contains('open');

  const find = (q) => { q = (q || '').toLowerCase(); return PROJECTS.find(p => p.id.startsWith(q) || p.name.toLowerCase().startsWith(q)); };
  const go = (url) => window.open(url, '_blank', 'noopener');

  const run = {
    help() {
      print('whoami        who I am');
      print('projects      what I have built');
      print('open <name>   open a project on GitHub (pitwall, malware, mnist, agent, heatseek)');
      print('skills        what I work with');
      print('ping          time a real round trip to the Raspberry Pi behind pitwal.site');
      print('contact       how to reach me');
      print('resume        download my resume (PDF)');
      print('github  linkedin  mail    open those');
      print('clear  exit');
    },
    whoami() {
      print('Shlok Singh. Third-year B.Tech in Computer Science Engineering (AI and ML) at UPES, Dehradun.');
      print('I build and deploy ML models. Looking for an ML internship.');
    },
    projects() { PROJECTS.forEach((p, i) => { print(`${i + 1}. ${p.name}`); print('   ' + p.line, 'dim'); }); },
    open(arg) {
      const p = find(arg);
      if (!p) return print(arg ? `No project called "${arg}". Try: projects` : 'Usage: open <name>', 'err');
      print(`Opening ${p.name} on GitHub...`); go(p.url);
    },
    skills() {
      print('Languages   Python, C, Java, HTML, CSS');
      print('ML          PyTorch, TensorFlow, XGBoost, scikit-learn, Pandas, NumPy');
      print('Tools       Git, Linux, FastAPI, REST APIs, Raspberry Pi');
    },
    async ping() {
      if (Date.now() - lastPing < 2000) return print('Easy. One ping every two seconds.', 'dim');
      lastPing = Date.now();
      const line = print('pinging pitwal.site ...');
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000); const t0 = performance.now();
      try {
        await fetch(`https://pitwal.site/api/health?t=${Date.now()}`, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal });
        line.textContent = `pitwal.site answered in ${Math.round(performance.now() - t0)} ms, timed from your browser.`;
      } catch { line.textContent = "pitwal.site didn't answer. The Pi may be asleep."; line.classList.add('err'); }
      clearTimeout(to);
    },
    contact() { print('Email     ' + EMAIL); print('GitHub    github.com/ShlokisAFK'); print('LinkedIn  linkedin.com/in/shlokisafk'); },
    mail() { print('Opening your mail client...'); location.href = 'mailto:' + EMAIL; },
    resume() { print('Downloading the resume...'); const a = document.createElement('a'); a.href = 'assets/Shlok-Singh-Resume.pdf'; a.download = ''; document.body.append(a); a.click(); a.remove(); },
    github() { print('Opening GitHub...'); go(GH); },
    linkedin() { print('Opening LinkedIn...'); go('https://www.linkedin.com/in/shlokisafk/'); },
    clear() { out.textContent = ''; },
    exit() { close(); }
  };
  run.cd = run.ls = () => print('This is not that kind of shell. Try: help', 'dim');

  function exec(raw) {
    const cmd = raw.trim(); if (!cmd) return;
    print('> ' + cmd, 'echo');
    history.push(cmd); hi = history.length;
    if (/^sudo\s+hire\s+shlok$/i.test(cmd)) { print('[sudo] permission granted.'); print('Opening a draft to Shlok...'); location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Internship opportunity')}`; return; }
    const [name, ...rest] = cmd.split(/\s+/);
    const fn = run[name.toLowerCase()];
    if (!fn) return print(`command not found: ${name}. Try: help`, 'err');
    fn(rest.join(' '));
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { exec(input.value); input.value = ''; }
    else if (e.key === 'ArrowUp') { if (hi > 0) input.value = history[--hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hi = Math.min(history.length, hi + 1); input.value = history[hi] || ''; e.preventDefault(); }
    else if (e.key === 'Tab' && input.value && !e.shiftKey) {
      const m = COMMANDS.filter(c => c.startsWith(input.value.toLowerCase()));
      if (m.length === 1) { input.value = m[0]; e.preventDefault(); e.stopPropagation(); }   // completion must not trigger the focus trap
    }
  });
  closeBtn.addEventListener('click', close);
  term.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); e.preventDefault(); }
    if (e.key === 'Tab') {                                   // keep focus inside the dialog
      const els = [closeBtn, out, input], i = els.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { input.focus(); e.preventDefault(); }
      else if (!e.shiftKey && i === els.length - 1) { closeBtn.focus(); e.preventDefault(); }
    }
  });
  addEventListener('keydown', (e) => {
    if (e.key !== '`' || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if (typing && t !== input) return;
    e.preventDefault(); isOpen() ? close() : open();
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-open-terminal]')) { e.preventDefault(); open(); } });
})();
