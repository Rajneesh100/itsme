// ─── Hero swarm: drone dots fly in and lock onto the name ───
// The <h1> keeps the real text (selectable, read by screen readers and search
// engines); while the swarm runs that text is transparent and a canvas draws
// the name as dots. One ~1.4 s intro, then the canvas sits still until a
// pointer comes near: dots scatter away from it and spring back.
(function () {
  const root = document.documentElement;
  const h1 = document.querySelector('.hero-name');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const give_up = () => root.classList.remove('swarm-pending', 'swarm-on');
  if (!h1 || reduce || !root.classList.contains('swarm-pending')) { give_up(); return; }

  const canvas = document.createElement('canvas');
  canvas.className = 'swarm';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  if (!ctx) { give_up(); return; }
  h1.appendChild(canvas);

  const hex = v => { const h = getComputedStyle(root).getPropertyValue(v).trim().replace('#', '');
    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const INK = hex('--ink'), PINK = hex('--pink');
  const SHADES = 4;   // ink → pink in steps; a dot's shade shows how far it is from home
  const shade = i => { const t = i / (SHADES - 1);
    return `rgb(${INK.map((c, k) => Math.round(c + (PINK[k] - c) * t)).join(',')})`; };
  const COLORS = Array.from({ length: SHADES }, (_, i) => shade(i));

  let PAD = 40, W = 0, H = 0, dpr = 1, pitch = 4, size = 3, R = 80;
  let n = 0, hx, hy, x, y, vx, vy, sx, sy, delay, arc;
  let mode = 'rest', t0 = 0, raf = 0;
  const ptr = { x: -1e4, y: -1e4, near: false };

  // Draw the name off-screen exactly where the browser laid it out, then keep
  // one dot per grid cell that lands on ink.
  function layout() {
    const span = h1.querySelector('span');
    const cs = getComputedStyle(span);
    const fs = parseFloat(cs.fontSize);
    pitch = Math.max(3, Math.round(fs / 34));   // at least 3 px, so phones still show dots, not grey
    size = pitch * 0.8;
    R = fs * 0.55;
    PAD = Math.round(fs * 0.3);
    const r = h1.getBoundingClientRect();
    W = Math.ceil(r.width) + PAD * 2;
    H = Math.ceil(r.height) + PAD * 2;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    canvas.style.left = -PAD + 'px'; canvas.style.top = -PAD + 'px';

    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    o.textBaseline = 'alphabetic';
    const asc = o.measureText('Rk').fontBoundingBoxAscent || fs * 0.92;
    const range = document.createRange();
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      const s = node.nodeValue;
      for (let i = 0; i < s.length; i++) {
        if (!s[i].trim()) continue;
        range.setStart(node, i); range.setEnd(node, i + 1);
        const cr = range.getClientRects()[0];
        if (cr) o.fillText(s[i], cr.left - r.left + PAD, cr.top - r.top + PAD + asc);
      }
    }
    const img = o.getImageData(0, 0, W, H).data;
    const pts = [];
    for (let py = Math.floor(pitch / 2); py < H; py += pitch)
      for (let px = Math.floor(pitch / 2); px < W; px += pitch)
        if (img[(py * W + px) * 4 + 3] > 140) pts.push(px, py);

    n = pts.length / 2;
    hx = new Float32Array(n); hy = new Float32Array(n);
    x = new Float32Array(n); y = new Float32Array(n);
    vx = new Float32Array(n); vy = new Float32Array(n);
    sx = new Float32Array(n); sy = new Float32Array(n);
    delay = new Float32Array(n); arc = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      hx[i] = x[i] = pts[2 * i]; hy[i] = y[i] = pts[2 * i + 1];
    }
    return n > 0;
  }

  // Drones start scattered across the canvas and lock on left to right.
  function startIntro() {
    for (let i = 0; i < n; i++) {
      // a soft oval cloud around the name: no straight edges from the canvas box
      let px, py;
      do {
        const a = Math.random() * Math.PI * 2, d = Math.sqrt(-2 * Math.log(1 - Math.random())) * 0.38;
        px = W / 2 + Math.cos(a) * d * W / 2; py = H / 2 + Math.sin(a) * d * H / 2;
      } while (px < 2 || py < 2 || px > W - 2 || py > H - 2);
      sx[i] = px; sy[i] = py;
      delay[i] = (hx[i] / W) * 420 + Math.random() * 160;
      arc[i] = (Math.random() - 0.5) * 2 * PAD;
      x[i] = sx[i]; y[i] = sy[i];
    }
    mode = 'intro'; t0 = performance.now(); wake();
  }

  const FLY = 820;
  const ease = t => 1 - Math.pow(1 - t, 3);

  function stepIntro(now) {
    let done = true;
    const buckets = COLORS.map(() => []);
    const fade = Math.min(1, (now - t0) / 260);
    for (let i = 0; i < n; i++) {
      let t = (now - t0 - delay[i]) / FLY;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      if (t < 1) done = false;
      const e = ease(t), dx = hx[i] - sx[i], dy = hy[i] - sy[i];
      const len = Math.hypot(dx, dy) || 1, bend = Math.sin(Math.PI * t) * arc[i];
      x[i] = sx[i] + dx * e - (dy / len) * bend;
      y[i] = sy[i] + dy * e + (dx / len) * bend;
      buckets[Math.round((1 - t) * (SHADES - 1))].push(i);   // pink in flight, ink once locked
    }
    draw(buckets, fade);
    if (done) { mode = 'rest'; for (let i = 0; i < n; i++) { x[i] = hx[i]; y[i] = hy[i]; vx[i] = vy[i] = 0; } }
    return !done;
  }

  function stepPhysics() {
    let moving = false;
    const buckets = COLORS.map(() => []);
    const R2 = R * R, push = R * 0.06, maxD = R * 0.6;
    for (let i = 0; i < n; i++) {
      if (ptr.near) {
        const dx = x[i] - ptr.x, dy = y[i] - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < R2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / R) * push;
          vx[i] += (dx / d) * f; vy[i] += (dy / d) * f;
        }
      }
      vx[i] = (vx[i] + (hx[i] - x[i]) * 0.045) * 0.84;
      vy[i] = (vy[i] + (hy[i] - y[i]) * 0.045) * 0.84;
      x[i] += vx[i]; y[i] += vy[i];
      const off = Math.hypot(x[i] - hx[i], y[i] - hy[i]);
      if (off > 0.15 || Math.abs(vx[i]) + Math.abs(vy[i]) > 0.05) moving = true;
      else { x[i] = hx[i]; y[i] = hy[i]; vx[i] = vy[i] = 0; }
      buckets[Math.min(SHADES - 1, Math.floor((off / maxD) * SHADES))].push(i);
    }
    draw(buckets, 1);
    return moving || ptr.near;
  }

  function draw(buckets, alpha) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = alpha;
    const h = size / 2;
    buckets.forEach((list, b) => {
      if (!list.length) return;
      ctx.fillStyle = COLORS[b];
      ctx.beginPath();
      for (const i of list) ctx.rect(x[i] - h, y[i] - h, size, size);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = 0;
    const again = mode === 'intro' ? stepIntro(now) : stepPhysics();
    if (again) raf = requestAnimationFrame(frame);
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }

  // Pointer: only wakes the loop when it is over or near the name.
  function track(e, impulse) {
    if (mode === 'intro') return;
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const near = px > -R && py > -R && px < W + R && py < H + R;
    ptr.x = px; ptr.y = py;
    if (near !== ptr.near || near) { ptr.near = near; wake(); }
    if (impulse && near) {                       // a tap gives a short burst
      for (let i = 0; i < n; i++) {
        const dx = x[i] - px, dy = y[i] - py, d = Math.hypot(dx, dy);
        if (d < R * 1.2 && d > 0.1) { const f = (1 - d / (R * 1.2)) * R * 0.12; vx[i] += (dx / d) * f; vy[i] += (dy / d) * f; }
      }
    }
  }
  const away = () => { if (ptr.near) { ptr.near = false; wake(); } };
  addEventListener('pointermove', e => track(e, false), { passive: true });
  addEventListener('pointerdown', e => track(e, true), { passive: true });
  document.addEventListener('pointerleave', away);
  addEventListener('blur', away);

  // Relayout when the name's box changes size (rotation, resize, late font).
  let lastW = 0, timer = 0;
  new ResizeObserver(([entry]) => {
    const w = Math.round(entry.contentRect.width);
    if (!lastW || w === lastW) { lastW = w; return; }
    lastW = w;
    clearTimeout(timer);
    timer = setTimeout(() => { if (layout()) { mode = 'rest'; ptr.near = false; stepPhysics(); } }, 150);
  }).observe(h1);

  function start() {
    if (!layout()) { give_up(); return; }
    root.classList.add('swarm-on');
    root.classList.remove('swarm-pending');
    const r = h1.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) startIntro();   // only play it if the name is on screen
    else { mode = 'rest'; stepPhysics(); }
  }

  // Sample only once the display font is in, so the dots match the real letters.
  const cs = getComputedStyle(h1.querySelector('span'));
  const fontReady = document.fonts && document.fonts.load
    ? document.fonts.load(`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, 'Rajneesh Kumar.')
    : Promise.resolve();
  Promise.race([fontReady, new Promise(r => setTimeout(r, 2000))])
    .then(start, start);
})();
