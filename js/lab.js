// ─── Videos: load + play only while visible (and, when pinned, only the project on screen) ───
function playVideo(v) {
  const ex = v.closest('.exhibit');
  if (ex && ex.closest('.pin-stage') && !ex.classList.contains('on')) return;
  if (!v.getAttribute('src')) v.src = v.dataset.src;
  if (!reduceMotion) v.play().catch(() => {});
}
document.querySelectorAll('video[data-src]').forEach(v => {
  if (reduceMotion) v.controls = true;
  whenVisible(v, () => playVideo(v), () => v.pause());
});

// Kinetic clip tabs
document.querySelectorAll('.ex-tab').forEach(btn => btn.addEventListener('click', () => {
  const box = btn.closest('.exhibit');
  const v = box.querySelector('video');
  box.querySelectorAll('.ex-tab').forEach(b => b.classList.toggle('active', b === btn));
  v.poster = btn.dataset.poster;
  v.dataset.src = v.dataset.full = v.src = btn.dataset.clip;
  box.querySelector('.ex-path').textContent = btn.dataset.path;
  if (!reduceMotion) v.play().catch(() => {});
}));

// ─── After Hours: heading and filters stay put, one project at a time with its game behind it ───
(function () {
  const container = document.querySelector('#lab .container');
  const header = container.querySelector('.section-header');
  const intro = container.querySelector('.lab-intro');
  const bar = container.querySelector('.range-bar');
  const wrap = container.querySelector('.exhibits');
  const exhibits = [...wrap.querySelectorAll('.exhibit')];
  const cards = [...container.querySelectorAll('.project-card')];
  const chips = [...bar.querySelectorAll('.range-chip')];
  const all = [...exhibits, ...cards];
  const note = container.querySelector('.sub-filter');
  const wide = matchMedia(PIN_QUERY);
  const counter = document.createElement('span');
  counter.className = 'lab-counter';
  bar.appendChild(counter);
  let filter = 'all', slides = exhibits.slice(), stage = null, active = -1;
  const cats = el => el.dataset.cat.split(' ');
  const matches = el => filter === 'all' || cats(el).includes(filter);
  // under a filter, projects that are mainly about that topic come first
  const rank = el => filter === 'all' || cats(el)[0] === filter ? 0 : 1;
  const pad2 = n => String(n).padStart(2, '0');
  const cue = b => b.classList.toggle('more', stage !== null && b.scrollTop + b.clientHeight < b.scrollHeight - 4);
  exhibits.forEach(el => { const b = el.querySelector('.ex-body'); b.addEventListener('scroll', () => cue(b), { passive: true }); });

  chips.forEach(c => {
    const f = c.dataset.filter;
    c.querySelector('.n').textContent = f === 'all' ? all.length : all.filter(el => cats(el).includes(f)).length;
  });

  function applyFilter() {
    slides = exhibits.filter(matches).sort((a, b) => rank(a) - rank(b));
    exhibits.forEach(el => { el.classList.toggle('is-hidden', !matches(el)); el.style.order = slides.indexOf(el); });
    cards.forEach(el => { el.classList.toggle('is-hidden', !matches(el)); el.style.order = rank(el); });
    // the chips are pinned up with the projects, so say down here when they're hiding cards
    const shown = cards.filter(matches).length;
    note.hidden = shown === cards.length;
    if (!note.hidden) note.innerHTML = `showing ${shown} of ${cards.length} · <button type="button">show all</button>`;
    slides.forEach((el, i) => {
      el.querySelector('.ex-index').textContent = `${pad2(i + 1)} / ${pad2(slides.length)}`;
      el.classList.toggle('flip', i % 2 === 1);
    });
    if (stage) { active = -1; stage.setCount(slides.length); fit(); }
  }
  // size each video window so the whole project fits on one screen
  function fit() {
    if (!stage) return;
    const availH = wrap.clientHeight;
    exhibits.forEach(el => {
      if (el.classList.contains('is-hidden')) return;
      const win = el.querySelector('.ex-window'), scr = el.querySelector('.ex-screen');
      win.style.width = '';
      const colW = el.querySelector('.ex-media').clientWidth;
      const [aw, ah] = (scr.style.getPropertyValue('--ar') || '16 / 10').split('/').map(Number);
      // narrowing the window can wrap the tabs and caption, so re-measure until it settles
      for (let k = 0; k < 3; k++) {
        const extra = win.offsetHeight - scr.offsetHeight + (el.querySelector('.ex-caption')?.offsetHeight || 0) + 16;
        const tabs = win.querySelector('.ex-tabs'), minW = Math.max(260, tabs ? tabs.scrollWidth + 2 : 0);
        win.style.width = Math.round(Math.min(colW, Math.max(minW, (availH - extra) * aw / ah))) + 'px';
      }
    });
    slides.forEach(el => cue(el.querySelector('.ex-body')));
  }
  function sync() {
    const live = stage && stage.inView();
    World.setScene(live && slides[active] ? slides[active].dataset.bg : null);
  }
  function show(i) {
    active = i;
    exhibits.forEach(el => el.classList.toggle('on', el === slides[i]));
    counter.textContent = slides.length ? `${pad2(i + 1)} / ${pad2(slides.length)}` : '';
    exhibits.forEach(el => {
      const v = el.querySelector('video');
      if (!v) return;
      if (el === slides[i] && stage.inView()) playVideo(v); else v.pause();
    });
    if (slides[i]) cue(slides[i].querySelector('.ex-body'));
    sync();
  }
  function pin() {
    exhibits.forEach(el => el.classList.remove('fade-in'));
    active = -1;
    stage = pinStage([header, intro, bar, wrap], { cls: 'lab-stage', stepVh: 0.75, minStep: 420, onIndex: show, onScroll: sync });
    stage.setCount(slides.length);
    fit();
  }
  function unpin() {
    if (!stage) return;
    stage.destroy(); stage = null;
    exhibits.forEach(el => { el.classList.remove('on'); el.querySelector('.ex-window').style.width = ''; el.querySelector('.ex-body').classList.remove('more'); });
    counter.textContent = '';
    World.setScene(null);
  }
  note.addEventListener('click', e => {
    if (!e.target.closest('button')) return;
    const head = note.parentElement, y = head.getBoundingClientRect().top;
    chips.find(c => c.dataset.filter === 'all').click();
    scrollTo({ top: scrollY + head.getBoundingClientRect().top - y, behavior: 'instant' });   // keep the cards where they were
  });
  chips.forEach(c => c.addEventListener('click', () => {
    filter = c.dataset.filter;
    chips.forEach(x => x.classList.toggle('active', x === c));
    applyFilter();
    if (stage && stage.inView()) stage.go(0, true);
  }));
  window.goToProject = key => {
    const el = exhibits.find(e => e.dataset.bg === key);
    if (!el) return;
    if (!slides.includes(el)) chips.find(c => c.dataset.filter === 'all').click();
    if (stage) stage.go(slides.indexOf(el));
    else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  };
  const mode = () => wide.matches ? (stage || pin()) : unpin();
  wide.addEventListener('change', mode);
  addEventListener('resize', () => { if (stage) fit(); });
  applyFilter();
  mode();
})();
