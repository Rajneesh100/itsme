// ─── Lightbox ───
const lb = document.getElementById('lightbox');
const lbBody = lb.querySelector('.lb-body');
document.addEventListener('click', e => {
  const t = e.target.closest('[data-full]');
  if (!t) return;
  const src = t.dataset.full;
  lbBody.innerHTML = '';
  let media;
  if (/\.mp4$/.test(src)) {
    media = document.createElement('video');
    Object.assign(media, { src, controls: true, autoplay: true, muted: true, loop: true, playsInline: true });
  } else {
    media = document.createElement('img');
    media.src = src;
    media.alt = '';
  }
  lbBody.appendChild(media);
  lb.showModal();
});
lb.addEventListener('click', e => { if (e.target === lb || e.target.closest('.lb-close')) lb.close(); });
lb.addEventListener('close', () => { lbBody.innerHTML = ''; });

// ─── Script players (Alexa-nxt, Durable Chat) ───
function scriptPlayer(root, steps) {
  const targets = {};
  let i = 0, timer = null, active = false;
  const target = sel => targets[sel] || (targets[sel] = document.getElementById(sel));
  function apply(s) {
    if (s.clear) { Object.values(targets).forEach(t => t.innerHTML = ''); return; }
    if (s.rm) target(s.to).querySelectorAll(s.rm).forEach(n => n.remove());
    if (!s.h) return;
    const d = document.createElement('div');
    d.className = 'sl ' + (s.c || '');
    d.innerHTML = s.h;
    const t = target(s.to);
    t.appendChild(d);
    while (t.scrollHeight > t.clientHeight + 4 && t.children.length > 1) t.firstChild.remove();
  }
  function next() {
    if (!active) return;
    const s = steps[i];
    apply(s);
    i = (i + 1) % steps.length;
    timer = setTimeout(next, s.d || 1100);
  }
  if (reduceMotion) {
    for (const s of steps) { if (s.clear) break; apply(s); }
    return;
  }
  whenVisible(root, () => { if (!active) { active = true; next(); } }, () => { active = false; clearTimeout(timer); });
}

scriptPlayer(document.getElementById('voice-script'), [
  { to: 'voice-script', c: 'u', h: '<span class="who">you</span>“hey angela…”', d: 1200 },
  { to: 'voice-script', c: 'sys', h: 'wake word ✓ · whisper.cpp → “play something lo-fi”' },
  { to: 'voice-script', c: 'tool', h: 'gpt-oss:20b (local) → tool <b>youtube_music</b>("lo-fi beats")' },
  { to: 'voice-script', c: 'a', h: '<span class="who">angela</span>“Playing lo-fi beats.” 🎵', d: 1400 },
  { to: 'voice-script', c: 'sys', h: 'state → 💤 sleeping while music plays' },
  { to: 'voice-script', c: 'u', h: '<span class="who">you</span><i>(singing along, badly)</i>' },
  { to: 'voice-script', c: 'tool', h: 'LLM → <b>skip</b> · that wasn’t for me', d: 1500 },
  { to: 'voice-script', c: 'u', h: '<span class="who">you</span>“hey angela, what was I stuck on yesterday?”', d: 1300 },
  { to: 'voice-script', c: 'tool', h: 'tool <b>memory_search</b> → pgvector + BM25 hybrid' },
  { to: 'voice-script', c: 'a', h: '<span class="who">angela</span>“A goroutine leak in the audio pipeline.”', d: 1500 },
  { to: 'voice-script', c: 'sys', h: '👀 vision · YOLO: person, laptop · face → “Rajneesh”', d: 2600 },
  { clear: true, d: 500 }
]);

const avatar = g => `<span class="av" style="background:${g}"></span>`;
const msg = (name, text, g) => `<div class="msg">${avatar(g)}<div><div class="nm">${name}</div><div class="tx">${text}</div></div></div>`;
scriptPlayer(document.querySelector('.chat-sim'), [
  { to: 'log-script', h: '<em>ws</em> alice → RoomDO#general', d: 600 },
  { to: 'chat-script', h: msg('alice', 'anyone up for chai? ☕', 'linear-gradient(135deg,#f472b6,#7c3aed)'), d: 700 },
  { to: 'log-script', h: 'reduce(state, <b>Message</b>) → [state′, effects]', d: 600 },
  { to: 'log-script', h: '<em>sqlite</em> INSERT INTO messages', d: 500 },
  { to: 'log-script', h: '<em>broadcast</em> → 3 sockets', d: 1000 },
  { to: 'chat-script', c: 'typing-row', h: 'bob is typing<i>.</i><i>.</i><i>.</i>', d: 400 },
  { to: 'log-script', h: '<em>ws</em> {type: "<b>typing</b>", user: "bob"}', d: 1300 },
  { to: 'chat-script', rm: '.typing-row', h: msg('bob', 'after this deploy 🙃', 'linear-gradient(135deg,#22d3ee,#0ea5e9)'), d: 500 },
  { to: 'log-script', h: '<em>sqlite</em> INSERT INTO messages', d: 1200 },
  { to: 'chat-script', h: msg('rajneesh', 'this channel is its own tiny server btw', 'linear-gradient(135deg,#00ff88,#06b6d4)'), d: 600 },
  { to: 'log-script', h: '<em>broadcast</em> → 3 sockets', d: 1400 },
  { to: 'log-script', h: '💤 hibernate · 0 CPU while idle', d: 3000 },
  { clear: true, d: 500 }
]);

// ─── Canvas helper: size to element, animate only while visible ───
function canvasSim(canvas, sim) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = 0, running = false, last = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = r.width; h = r.height;
    sim.resize(w, h);
    sim.draw(ctx, w, h);
  }
  new ResizeObserver(resize).observe(canvas);
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (w) { sim.step(dt); sim.draw(ctx, w, h); }
    if (running) raf = requestAnimationFrame(frame);
  }
  if (reduceMotion) return;
  whenVisible(canvas, () => {
    if (running) return;
    running = true; last = performance.now(); raf = requestAnimationFrame(frame);
  }, () => { running = false; cancelAnimationFrame(raf); });
}

// ─── Next-frame: A* teacher exploring a procedural grid world ───
canvasSim(document.getElementById('drive-canvas'), (() => {
  const C = 14;
  let cols = 0, rows = 0, grid, known, car, goal, path = [], trail = [], acc = 0, goals = 0, replans = 0;
  const rnd = n => Math.floor(Math.random() * n);
  const idx = (x, y) => y * cols + x;

  // the car is 2×2 cells, positioned by its top-left cell
  function fits(blocked, x, y) {
    if (x < 0 || y < 0 || x + 1 >= cols || y + 1 >= rows) return false;
    return !blocked(x, y) && !blocked(x + 1, y) && !blocked(x, y + 1) && !blocked(x + 1, y + 1);
  }
  const trueBlocked = (x, y) => grid[idx(x, y)] === 1;
  const knownBlocked = (x, y) => known[idx(x, y)] === 2;

  function astar(blocked, s, g) {
    const n = cols * rows, gs = new Float32Array(n).fill(Infinity), from = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
    const hfn = (x, y) => { const dx = Math.abs(x - g.x), dy = Math.abs(y - g.y); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const open = [[hfn(s.x, s.y), s.x, s.y]];
    gs[idx(s.x, s.y)] = 0;
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, x, y] = open[bi];
      open[bi] = open[open.length - 1]; open.pop();
      const ci = idx(x, y);
      if (closed[ci]) continue;
      closed[ci] = 1;
      if (x === g.x && y === g.y) {
        const out = [];
        for (let k = ci; k !== idx(s.x, s.y); k = from[k]) out.push({ x: k % cols, y: (k / cols) | 0 });
        return out.reverse();
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (!fits(blocked, nx, ny)) continue;
        if (dx && dy && (!fits(blocked, x + dx, y) || !fits(blocked, x, y + dy))) continue;
        const ng = gs[ci] + (dx && dy ? 1.414 : 1), ni = idx(nx, ny);
        if (ng < gs[ni]) { gs[ni] = ng; from[ni] = ci; open.push([ng + hfn(nx, ny), nx, ny]); }
      }
    }
    return null;
  }

  function randomSpot() {
    for (let k = 0; k < 400; k++) { const p = { x: rnd(cols - 1), y: rnd(rows - 1) }; if (fits(trueBlocked, p.x, p.y)) return p; }
    return null;
  }
  function sense() {
    for (let dy = -2; dy <= 3; dy++) for (let dx = -2; dx <= 3; dx++) {
      const x = car.x + dx, y = car.y + dy;
      if (x >= 0 && y >= 0 && x < cols && y < rows) known[idx(x, y)] = grid[idx(x, y)] ? 2 : 1;
    }
  }
  function newGoal() {
    for (let k = 0; k < 60; k++) {
      const g = randomSpot();
      if (g && Math.hypot(g.x - car.x, g.y - car.y) > cols * 0.4 && astar(trueBlocked, car, g)) { goal = g; path = astar(knownBlocked, car, goal) || []; return; }
    }
    world();
  }
  function world() {
    grid = new Uint8Array(cols * rows); known = new Uint8Array(cols * rows);
    const n = Math.floor(cols * rows / 26);
    for (let i = 0; i < n; i++) {
      const bw = 1 + rnd(3), bh = 1 + rnd(3), x = rnd(cols - bw), y = rnd(rows - bh);
      for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) grid[idx(xx, yy)] = 1;
    }
    car = randomSpot() || { x: 0, y: 0 };
    trail = []; goals = 0;
    sense();
    newGoal();
  }

  return {
    resize(w, h) {
      const nc = Math.floor(w / C), nr = Math.floor(h / C);
      if (nc !== cols || nr !== rows) { cols = nc; rows = nr; if (cols > 6 && rows > 6) world(); }
    },
    step(dt) {
      if (!car || !goal) return;
      acc += dt;
      if (acc < 0.09) return;
      acc = 0;
      sense();
      if (!path.length || path.some(p => !fits(knownBlocked, p.x, p.y))) {
        path = astar(knownBlocked, car, goal) || [];
        replans++;
      }
      const nxt = path.shift();
      if (nxt) { trail.push({ x: car.x, y: car.y }); if (trail.length > 60) trail.shift(); car = nxt; }
      sense();
      if (car.x === goal.x && car.y === goal.y) { goals++; if (goals >= 6) world(); else newGoal(); }
    },
    draw(ctx, w, h) {
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, w, h);
      if (!grid) return;
      const ox = (w - cols * C) / 2, oy = (h - rows * C) / 2;
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const k = known[idx(x, y)], b = grid[idx(x, y)];
        if (b) {
          ctx.fillStyle = k === 2 ? '#4b5d7c' : '#1a2030';
          ctx.fillRect(ox + x * C + 1, oy + y * C + 1, C - 2, C - 2);
        } else if (k === 1) {
          ctx.fillStyle = 'rgba(0,255,136,0.04)';
          ctx.fillRect(ox + x * C, oy + y * C, C, C);
        }
      }
      trail.forEach((p, i) => {
        ctx.fillStyle = `rgba(0,255,136,${i / trail.length * 0.25})`;
        ctx.fillRect(ox + p.x * C + C * 0.6, oy + p.y * C + C * 0.6, C * 0.8, C * 0.8);
      });
      ctx.fillStyle = '#06b6d4';
      path.forEach((p, i) => {
        if (i % 2) return;
        ctx.beginPath(); ctx.arc(ox + (p.x + 1) * C, oy + (p.y + 1) * C, 1.6, 0, Math.PI * 2); ctx.fill();
      });
      if (goal) {
        const gx = ox + (goal.x + 1) * C, gy = oy + (goal.y + 1) * C;
        ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(gx - 4, gy + 9); ctx.lineTo(gx - 4, gy - 10); ctx.stroke();
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.moveTo(gx - 4, gy - 10); ctx.lineTo(gx + 8, gy - 6); ctx.lineTo(gx - 4, gy - 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,255,136,0.8)'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + (car.x - 2) * C + 0.5, oy + (car.y - 2) * C + 0.5, 6 * C, 6 * C);
      ctx.fillStyle = 'rgba(0,255,136,0.06)';
      ctx.fillRect(ox + (car.x - 2) * C, oy + (car.y - 2) * C, 6 * C, 6 * C);
      ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(ox + car.x * C + 2, oy + car.y * C + 2, C * 2 - 4, C * 2 - 4);
      ctx.shadowBlur = 0;

      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textBaseline = 'middle';
      const label = `A* TEACHER · goals ${goals} · replans ${replans}`;
      const tw = ctx.measureText(label).width + 16;
      ctx.fillStyle = 'rgba(10,10,15,0.85)'; ctx.fillRect(10, 10, tw, 22);
      ctx.strokeStyle = '#252540'; ctx.strokeRect(10.5, 10.5, tw, 22);
      ctx.fillStyle = '#06b6d4'; ctx.fillText(label, 18, 21);
    }
  };
})());
