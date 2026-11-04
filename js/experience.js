// ─── Experience: pinned on desktop (heading and list stay, details swap), tap to open on small screens ───
(function () {
  const section = document.getElementById('experience');
  const header = section.querySelector('.section-header');
  const grid = section.querySelector('.exp-grid');
  const items = [...grid.querySelectorAll('.exp-item')];
  const folds = items.map(it => it.querySelector('.exp-fold'));
  const N = items.length;
  const wide = matchMedia(PIN_QUERY);
  const heads = items.map(it => {
    const h = document.createElement('div');
    h.className = 'exp-detail-head';
    h.innerHTML = it.querySelector('.exp-role').outerHTML + it.querySelector('.exp-company').outerHTML + it.querySelector('.exp-period').outerHTML;
    return h;
  });
  let stage = null, list = null, detail = null, active = -1;
  // fade the bottom edge while a long role still has more to read
  const cue = f => f.classList.toggle('more', stage !== null && f.scrollTop + f.clientHeight < f.scrollHeight - 4);
  folds.forEach(f => f.addEventListener('scroll', () => cue(f), { passive: true }));

  function setActive(i) {
    active = i;
    items.forEach((it, j) => { it.classList.toggle('on', j === i); it.classList.toggle('done', j < i); });
    folds.forEach((f, j) => { f.classList.toggle('on', j === i); if (j === i) { f.scrollTop = 0; cue(f); } });
  }
  function pin() {
    grid.classList.remove('tappable');
    list = document.createElement('div'); list.className = 'exp-list';
    detail = document.createElement('div'); detail.className = 'exp-detail';
    items.forEach((it, i) => { it.classList.remove('open'); list.appendChild(it); folds[i].firstElementChild.prepend(heads[i]); detail.appendChild(folds[i]); });
    grid.append(list, detail);
    grid.classList.add('pinned');
    active = -1;
    stage = pinStage([header, grid], { cls: 'exp-stage', stepVh: 0.55, minStep: 320, onIndex: setActive });
    stage.setCount(N);
  }
  function unpin() {
    if (!stage) return;
    stage.destroy(); stage = null;
    items.forEach((it, i) => { heads[i].remove(); it.querySelector('.exp-content').appendChild(folds[i]); grid.appendChild(it); it.classList.remove('on', 'done'); folds[i].classList.remove('on', 'more'); });
    list.remove(); detail.remove();
    grid.classList.remove('pinned');
  }
  function tappable() {
    unpin();
    grid.classList.add('tappable');
    items.forEach(it => it.classList.remove('open'));
  }
  items.forEach((it, i) => it.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    if (stage) stage.go(i);
    else it.classList.toggle('open');
  }));
  const mode = () => wide.matches ? (stage || pin()) : tappable();
  wide.addEventListener('change', mode);
  addEventListener('resize', () => { if (stage) folds.forEach(cue); });
  mode();
})();
