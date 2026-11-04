const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fade in on scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 80);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Run callbacks when an element scrolls into / out of view
function whenVisible(el, onShow, onHide) {
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) onShow(); else if (onHide) onHide();
  }, { threshold: 0.2 }).observe(el);
}


const PIN_QUERY = '(min-width: 1000px) and (min-height: 640px)';
const rand = (a, b) => a + Math.random() * (b - a);

// ─── Pin a section to the screen while the reader scrolls through its steps ───
// The heading and content stay put; scrolling only changes which step is shown, so nothing on the page moves.
function pinStage(parts, opts) {
  const nav = document.querySelector('nav');
  const track = document.createElement('div'); track.className = 'pin-track';
  const stage = document.createElement('div'); stage.className = 'pin-stage ' + (opts.cls || '');
  parts[0].before(track); track.appendChild(stage); stage.append(...parts);
  let n = 1, step = 1, index = -1;
  const navH = () => nav.offsetHeight;
  function measure() {
    document.documentElement.style.setProperty('--nav-h', navH() + 'px');
    step = Math.max(opts.minStep || 320, innerHeight * (opts.stepVh || 0.55));
    track.style.height = (innerHeight - navH() + (n - 1) * step) + 'px';
  }
  function update() {
    const x = (navH() - track.getBoundingClientRect().top) / step;
    const i = Math.max(0, Math.min(n - 1, Math.floor(x + 0.5)));
    if (i !== index) { index = i; opts.onIndex(i); }
    if (opts.onScroll) opts.onScroll();
  }
  const onResize = () => { measure(); update(); };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', onResize);
  return {
    track,
    setCount(c) { n = Math.max(1, c); index = -1; measure(); update(); },
    go(i, instant) {
      scrollTo({ top: track.getBoundingClientRect().top + scrollY - navH() + i * step + 2, behavior: instant || reduceMotion ? 'instant' : 'smooth' });
    },
    inView() { const r = track.getBoundingClientRect(); return r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5; },
    destroy() { removeEventListener('scroll', update); removeEventListener('resize', onResize); track.before(...parts); track.remove(); }
  };
}
