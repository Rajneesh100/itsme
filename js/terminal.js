// ─── Hero terminal: types itself out once, the first time it's on screen ───
(function () {
  const body = document.getElementById('term');
  if (!body || reduceMotion) return;
  const steps = [...body.children];
  const cmds = [...body.querySelectorAll('.t-cmd')];
  // split each command into a typed part and a hidden rest, so its width is reserved from the start
  cmds.forEach(c => { c.dataset.text = c.textContent; c.innerHTML = '<span class="typed"></span><span class="t-caret"></span><span class="rest"></span>'; c.querySelector('.rest').textContent = c.dataset.text; c.querySelector('.t-caret').hidden = true; });
  steps.forEach(el => el.classList.add('t-wait'));
  body.classList.add('typing');

  function type(cmd, done) {
    const text = cmd.dataset.text, typed = cmd.querySelector('.typed'), rest = cmd.querySelector('.rest'), caret = cmd.querySelector('.t-caret');
    let n = 0;
    caret.hidden = false;
    (function tick() {
      n++;
      typed.textContent = text.slice(0, n); rest.textContent = text.slice(n);
      if (n < text.length) setTimeout(tick, (28 + Math.random() * 42) * pace);
      else { caret.hidden = true; setTimeout(done, 260 * pace); }
    })();
  }
  const pace = matchMedia('(max-width: 700px)').matches ? 0.5 : 1;   // phones see it scrolled into view, so get to the point faster
  let i = 0;
  function next() {
    if (i >= steps.length) { body.classList.remove('typing'); return; }
    const el = steps[i++];
    el.classList.remove('t-wait'); el.classList.add('t-reveal');
    const cmd = el.querySelector('.t-cmd');
    if (cmd) type(cmd, next); else setTimeout(next, (el.classList.contains('t-branches') ? 420 : 320) * pace);
  }
  let started = false;
  whenVisible(body, () => { if (!started) { started = true; setTimeout(next, 500 * pace); } }, () => {});
})();
