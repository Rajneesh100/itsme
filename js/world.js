// ─── Background games: each project's own sim plays behind it while it's on screen ───
const World = (function () {
  const canvas = document.getElementById('world');
  const veil = document.getElementById('world-veil');
  const chip = document.getElementById('world-chip');
  const label = document.getElementById('world-label');
  const toggle = document.getElementById('world-toggle');
  const nav = document.querySelector('nav');
  const ctx = canvas.getContext('2d');
  const BG = '#0a0a0f';
  let W = 0, H = 0, top = 68, raf = 0, last = 0, t = 0;
  let paused = reduceMotion;
  try { if (localStorage.getItem('world-paused') === '1') paused = true; } catch (e) {}
  const gutter = () => Math.max(0, W / 2 - 590);
  const changed = () => updateLabel();

  // HAWK: interceptors launch from the pads and each takes the nearest target nobody has claimed
  const swarm = (() => {
    const N = 6, drones = [], bubbles = [];
    let targets = [], intercepted = 0, spawnIn = 300;
    const self = { color: '#06b6d4' };
    const pad = i => ({ x: 26 + i * 22, y: H - 28 });
    const dock = (d, cool) => { const p = pad(d.i); Object.assign(d, { x: p.x, y: p.y, vx: 0, vy: 0, cool, goal: null, trail: [] }); };
    for (let i = 0; i < N; i++) drones.push({ i, cool: 300 + i * 250 });
    self.resize = () => drones.forEach(d => { if (!d.goal) dock(d, d.cool || 0); });
    self.step = (k, dt) => {
      if ((spawnIn -= dt) < 0 && targets.length < 5) {
        spawnIn = rand(900, 2000);
        const fromLeft = Math.random() < 0.5;
        targets.push({ x: fromLeft ? -20 : W + 20, y: 0, y0: rand(top + 50, H - 120), vx: (fromLeft ? 1 : -1) * rand(1.1, 2), vy: 0, amp: rand(10, 50), ph: rand(0, 6) });
      }
      targets.forEach(o => {
        o.x += o.vx * k;
        const ny = o.y0 + Math.sin(o.ph + o.x * 0.012) * o.amp;
        o.vy = o.y ? (ny - o.y) / Math.max(k, 0.01) : 0; o.y = ny;
      });
      targets = targets.filter(o => o.x > -40 && o.x < W + 40);
      const claimed = new Set(drones.map(d => d.goal).filter(Boolean));
      drones.forEach(d => {
        if (d.cool > 0) { d.cool -= dt; return; }
        if (d.goal && !targets.includes(d.goal)) d.goal = null;
        if (!d.goal) {
          let best = null, bd = Infinity;
          targets.forEach(o => { const dd = Math.hypot(o.x - d.x, o.y - d.y); if (!claimed.has(o) && dd < bd) { bd = dd; best = o; } });
          if (best) { d.goal = best; claimed.add(best); }
        }
        const g = d.goal, home = pad(d.i);
        const gx = g ? g.x : home.x, gy = g ? g.y : home.y;
        const dist = Math.hypot(gx - d.x, gy - d.y) || 1;
        const sp = g ? 3.6 + d.i * 0.2 : 2.4;
        const lead = g ? Math.min(dist / sp, 30) : 0;
        const tx = gx + (g ? g.vx * lead : 0) - d.x, ty = gy + (g ? g.vy * lead : 0) - d.y, tl = Math.hypot(tx, ty) || 1;
        d.vx += ((tx / tl) * sp - d.vx) * 0.07 * k;
        d.vy += ((ty / tl) * sp - d.vy) * 0.07 * k;
        d.x += d.vx * k; d.y += d.vy * k;
        d.trail = d.trail || [];
        const lt = d.trail[0];
        if (!lt || Math.hypot(d.x - lt.x, d.y - lt.y) > 5) { d.trail.unshift({ x: d.x, y: d.y }); if (d.trail.length > 8) d.trail.pop(); }
        if (!g && dist < 6) { dock(d, 0); return; }
        if (g && dist < 14) {
          bubbles.push({ x: g.x, y: g.y, r: 4, a: 1 });
          targets = targets.filter(o => o !== g); intercepted++; changed();
          dock(d, 1200);
        }
      });
      bubbles.forEach(b => { b.r += 1.5 * k; b.a *= Math.pow(0.94, k); });
      for (let j = bubbles.length - 1; j >= 0; j--) if (bubbles[j].a < 0.03) bubbles.splice(j, 1);
    };
    self.draw = () => {
      targets.forEach(o => {
        ctx.fillStyle = '#ff4d5e';
        ctx.beginPath(); ctx.moveTo(o.x, o.y - 5); ctx.lineTo(o.x + 5, o.y); ctx.lineTo(o.x, o.y + 5); ctx.lineTo(o.x - 5, o.y); ctx.fill();
        ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,77,94,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(o.x, o.y, 14, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      });
      drones.forEach(d => {
        const tr = d.trail || [];
        for (let n = 1; n < tr.length; n++) { ctx.strokeStyle = `rgba(6,182,212,${0.35 * (1 - n / tr.length)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tr[n - 1].x, tr[n - 1].y); ctx.lineTo(tr[n].x, tr[n].y); ctx.stroke(); }
      });
      drones.forEach(d => {
        const docked = d.cool > 0 || (!d.goal && Math.hypot(d.vx, d.vy) < 0.2);
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(docked ? -Math.PI / 2 : Math.atan2(d.vy, d.vx));
        ctx.fillStyle = docked ? '#34445a' : '#06b6d4';
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, 5); ctx.lineTo(-3, 0); ctx.lineTo(-6, -5); ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      bubbles.forEach(b => { ctx.strokeStyle = `rgba(0,255,136,${b.a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke(); });
    };
    self.label = () => `<b>HAWK</b> · interceptors vs targets · ${intercepted} intercepted`;
    return self;
  })();

  // Kinetic: air flows around the reading column like a wing in the wind tunnel
  const flow = (() => {
    const self = { color: '#ff8a5b' };
    let P = [], cx = 0, cy = 0, a = 1, b = 1;
    const U = 2.4;
    const inside = (x, y) => ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 < 1.02;
    function spawn(p, anywhere) {
      p.x = anywhere ? rand(0, W) : rand(-40, 0); p.y = rand(top, H); p.life = rand(200, 520);
      if (inside(p.x, p.y)) p.x = rand(-40, 0);
      p.px = p.x; p.py = p.y;
    }
    self.resize = () => {
      cx = W / 2; cy = (top + H) / 2; a = Math.min(W * 0.34, 600); b = (H - top) * 0.32;
      const n = Math.max(220, Math.min(900, Math.round(W * H / 2400)));
      P = Array.from({ length: n }, () => { const p = {}; spawn(p, true); return p; });
    };
    self.step = k => {
      P.forEach(p => {
        const X = (p.x - cx) / a, Y = (p.y - cy) / b, r2 = X * X + Y * Y, r4 = r2 * r2;
        const u = U * (1 - (X * X - Y * Y) / r4);
        let v = -U * (b / a) * (2 * X * Y) / r4;
        if (X > 0.5) v += Math.sin(t * 0.004 + p.y * 0.035) * 0.5 * Math.exp(-Y * Y * 1.5) * Math.min(1, X - 0.5);
        p.u = u; p.v = v; p.sp = Math.hypot(u, v) / U;
        p.x += u * k; p.y += v * k; p.life -= k;
        if (p.x > W + 20 || p.y < top - 20 || p.y > H + 20 || p.life < 0 || inside(p.x, p.y)) spawn(p, false);
      });
    };
    self.draw = () => {
      ctx.lineWidth = 1.3;
      P.forEach(p => {
        const s = Math.min(1, Math.max(0, (p.sp - 0.6) / 1.1));
        ctx.strokeStyle = `hsla(${190 - s * 165}, 90%, 60%, ${0.35 + s * 0.45})`;
        ctx.beginPath(); ctx.moveTo(p.x - (p.u || 0) * 9, p.y - (p.v || 0) * 9); ctx.lineTo(p.x, p.y); ctx.stroke();
      });
    };
    self.label = () => `<b>Kinetic</b> · wind tunnel, air flowing around this page`;
    return self;
  })();

  // Rocket Rally: six cars lapping the screen edge, firing at whoever is ahead
  const race = (() => {
    const self = { color: '#ff4d5e' };
    const colors = ['#ff4d5e', '#f59e0b', '#00ff88', '#06b6d4', '#a78bfa', '#e2e8f0'];
    const STEP = 4;
    let pts = [], L = 1, takedowns = 0;
    const cars = colors.map((c, i) => ({ c, s: i * 34, lane: i % 2 ? -8 : 8, laneT: i % 2 ? -8 : 8, base: rand(3.4, 4.2), v: 0, spin: 0, cool: rand(1500, 4000), rot: 0 }));
    const rockets = [], sparks = [];
    self.resize = () => {
      const left = 40, right = W - 40, ty = top + 28, by = H - 40;
      const r = Math.min(170, (by - ty) * 0.3, W * 0.2);
      const raw = [];
      [[right - r, ty + r, -Math.PI / 2], [right - r, by - r, 0], [left + r, by - r, Math.PI / 2], [left + r, ty + r, Math.PI]].forEach(([x, y, a0]) => {
        for (let i = 0; i <= 24; i++) { const a = a0 + (i / 24) * Math.PI / 2; raw.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
      });
      raw.push(raw[0]);
      pts = []; let acc = 0, need = 0;
      for (let i = 1; i < raw.length; i++) {
        const [x0, y0] = raw[i - 1], [x1, y1] = raw[i], seg = Math.hypot(x1 - x0, y1 - y0);
        while (need <= acc + seg) { const f = (need - acc) / seg; pts.push({ x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f }); need += STEP; }
        acc += seg;
      }
      L = pts.length * STEP;
      pts.forEach((p, i) => {
        const nx = pts[(i + 1) % pts.length], pv = pts[(i - 1 + pts.length) % pts.length];
        const tx = nx.x - pv.x, ty2 = nx.y - pv.y, tl = Math.hypot(tx, ty2) || 1;
        p.tx = tx / tl; p.ty = ty2 / tl;
      });
      pts.forEach((p, i) => {
        const a = pts[(i + 6) % pts.length], b = pts[(i - 6 + pts.length) % pts.length];
        p.curv = Math.min(1, Math.abs(Math.atan2(a.tx * b.ty - a.ty * b.tx, a.tx * b.tx + a.ty * b.ty)) / 0.5);
      });
    };
    const at = (s, off) => { const p = pts[Math.floor((((s % L) + L) % L) / STEP) % pts.length]; return { x: p.x - p.ty * off, y: p.y + p.tx * off, a: Math.atan2(p.ty, p.tx), curv: p.curv }; };
    const ahead = (a, b) => ((b.s - a.s) % L + L) % L;
    self.step = (k, dt) => {
      cars.forEach(c => {
        const here = at(c.s, c.lane);
        if (c.spin > 0) { c.spin -= dt; c.v *= Math.pow(0.93, k); c.rot += 0.3 * k; }
        else { c.rot *= 0.8; c.v += (c.base * (1 - 0.45 * here.curv) - c.v) * 0.05 * k; }
        cars.forEach(o => { if (o !== c && ahead(c, o) < 26 && Math.abs(o.lane - c.lane) < 9) { c.laneT = -c.laneT; c.v *= 0.98; } });
        c.lane += (c.laneT - c.lane) * 0.08 * k;
        c.s += c.v * k;
        if ((c.cool -= dt) < 0 && c.spin <= 0) {
          const prey = cars.find(o => o !== c && ahead(c, o) > 40 && ahead(c, o) < 280);
          c.cool = rand(2500, 6000);
          if (prey) rockets.push({ s: c.s + 12, lane: c.lane, v: c.v + 6, owner: c, life: 1500 });
        }
      });
      for (let j = rockets.length - 1; j >= 0; j--) {
        const r = rockets[j]; r.s += r.v * k; r.life -= dt;
        const gap = o => { const d = ahead(r, o); return d < L / 2 ? d : d - L; };
        const hit = cars.find(o => o !== r.owner && o.spin <= 0 && Math.abs(gap(o)) < 9 && Math.abs(o.lane - r.lane) < 11);
        if (hit) {
          hit.spin = 1100; takedowns++; changed();
          const p = at(hit.s, hit.lane);
          for (let n = 0; n < 16; n++) sparks.push({ x: p.x, y: p.y, vx: rand(-3, 3), vy: rand(-3, 3), a: 1 });
          rockets.splice(j, 1);
        } else if (r.life < 0) rockets.splice(j, 1);
      }
      for (let j = sparks.length - 1; j >= 0; j--) { const p = sparks[j]; p.x += p.vx * k; p.y += p.vy * k; p.a *= Math.pow(0.92, k); if (p.a < 0.04) sparks.splice(j, 1); }
    };
    self.draw = () => {
      ctx.lineWidth = 1; ctx.setLineDash([6, 10]);
      [-20, 20].forEach(off => {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        for (let i = 0; i < pts.length; i += 3) { const p = pts[i], x = p.x - p.ty * off, y = p.y + p.tx * off; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.closePath(); ctx.stroke();
      });
      ctx.setLineDash([]);
      rockets.forEach(r => {
        const p = at(r.s, r.lane), q = at(r.s - 18, r.lane);
        ctx.strokeStyle = 'rgba(245,158,11,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      });
      cars.forEach(c => {
        const p = at(c.s, c.lane);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a + c.rot);
        ctx.fillStyle = c.c; ctx.fillRect(-8, -4, 16, 8);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(1, -3, 4, 6);
        ctx.restore();
      });
      sparks.forEach(p => { ctx.fillStyle = `rgba(255,${120 + p.a * 100 | 0},60,${p.a})`; ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); });
    };
    self.label = () => `<b>Rocket Rally</b> · 6 cars lapping your screen · ${takedowns} takedowns`;
    return self;
  })();

  // Alexa-nxt: voice waves across the screen; it wakes, talks, and goes back to listening
  const voice = (() => {
    const self = { color: '#00ff88', fade: 0.35 };   // the voice waves keep a soft glow trail
    const lines = ['hey angela', 'play something lo-fi', 'skip, that wasn’t for me', 'what was I stuck on yesterday?', 'memory_search', 'a goroutine leak', 'vision · person, laptop', 'sleeping while music plays'];
    let amp = 0.1, goal = 0.1, phaseT = 800, speaking = false, words = [], ripples = [], li = 0;
    self.resize = () => {};
    self.step = (k, dt) => {
      if ((phaseT -= dt) < 0) {
        speaking = !speaking;
        phaseT = speaking ? rand(1600, 3000) : rand(1200, 2400);
        goal = speaking ? rand(0.6, 1) : 0.08;
        if (speaking) {
          const left = li % 2 === 0, x = left ? 16 : W - 16, y = H * 0.62;
          ripples.push({ x: left ? Math.max(40, gutter() / 2) : W - Math.max(40, gutter() / 2), y, r: 6, a: 0.9 });
          words.push({ x, y: y - 34, left, text: lines[li++ % lines.length], a: 1 });
        }
        changed();
      }
      amp += (goal - amp) * 0.05 * k;
      words.forEach(w => { w.y -= 0.35 * k; w.a -= 0.004 * k; }); words = words.filter(w => w.a > 0);
      ripples.forEach(r => { r.r += 1.4 * k; r.a *= Math.pow(0.97, k); }); ripples = ripples.filter(r => r.a > 0.03);
    };
    self.draw = () => {
      const y0 = H * 0.62;
      [['0,255,136', 1, 0.9], ['6,182,212', 0.7, 1.3], ['124,58,237', 0.5, 1.7]].forEach(([c, s, f], n) => {
        ctx.strokeStyle = `rgba(${c},0.75)`; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const y = y0 + Math.sin(x * 0.012 * f + t * 0.004 * f + n) * (0.55 + 0.45 * Math.sin(x * 0.004 - t * 0.0012 + n)) * 70 * amp * s;
          x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      });
      ripples.forEach(r => { ctx.strokeStyle = `rgba(0,255,136,${r.a})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 7); ctx.stroke(); });
      ctx.font = '12px "JetBrains Mono", monospace';
      words.forEach(w => { ctx.textAlign = w.left ? 'left' : 'right'; ctx.fillStyle = `rgba(0,255,136,${w.a})`; ctx.fillText(w.text, w.x, w.y); });
      ctx.textAlign = 'left';
    };
    self.label = () => `<b>Alexa-nxt</b> · ${speaking ? 'talking' : 'listening for “hey angela”'}`;
    return self;
  })();

  // Durable Chat: every room is its own tiny server; messages go up to it and fan out to the others
  const chat = (() => {
    const self = { color: '#f59e0b' };
    const names = ['#general', '#random', '#builds', '#robots', '#music', '#deploys', '#infra', '#late-night'];
    let rooms = [], packets = [], msgs = 0, sendIn = 400;
    self.resize = () => {
      const cxL = Math.max(56, gutter() / 2), cxR = W - cxL;
      const rowsN = Math.max(2, Math.min(4, Math.floor((H - top - 60) / 170)));
      rooms = [];
      for (let r = 0; r < rowsN; r++) {
        const y = top + 90 + r * ((H - top - 170) / Math.max(1, rowsN - 1));
        [cxL, cxR].forEach((x, s) => rooms.push({ x, y, name: names[(r * 2 + s) % names.length], idle: rand(0, 3000), flash: 0, users: Array.from({ length: 3 }, (_, u) => ({ ang: u * 2.1 + rand(0, 1), r: rand(30, 40) })) }));
      }
      packets = [];
    };
    const upos = (rm, u) => ({ x: rm.x + Math.cos(u.ang) * u.r, y: rm.y + Math.sin(u.ang) * u.r });
    self.step = (k, dt) => {
      rooms.forEach(rm => { rm.idle += dt; rm.flash *= Math.pow(0.9, k); rm.users.forEach(u => u.ang += 0.004 * k); });
      if ((sendIn -= dt) < 0 && rooms.length) {
        sendIn = rand(350, 900);
        const rm = rooms[Math.floor(Math.random() * rooms.length)];
        packets.push({ rm, u: rm.users[Math.floor(Math.random() * 3)], p: 0, up: true });
      }
      packets.forEach(pk => pk.p += 0.035 * k);
      const done = packets.filter(pk => pk.p >= 1);
      packets = packets.filter(pk => pk.p < 1);
      done.forEach(pk => {
        if (!pk.up) return;
        pk.rm.flash = 1; pk.rm.idle = 0; msgs++; changed();
        pk.rm.users.forEach(u => { if (u !== pk.u) packets.push({ rm: pk.rm, u, p: 0, up: false }); });
      });
    };
    self.draw = () => {
      ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      rooms.forEach(rm => {
        const asleep = rm.idle > 4000;
        rm.users.forEach(u => {
          const p = upos(rm, u);
          ctx.strokeStyle = 'rgba(245,158,11,0.12)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(rm.x, rm.y); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.fillStyle = '#a78bfa'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill();
        });
        ctx.fillStyle = `rgba(245,158,11,${0.12 + rm.flash * 0.6})`; ctx.fillRect(rm.x - 9, rm.y - 9, 18, 18);
        ctx.strokeStyle = asleep ? 'rgba(245,158,11,0.35)' : '#f59e0b'; ctx.lineWidth = 1.5; ctx.strokeRect(rm.x - 9, rm.y - 9, 18, 18);
        ctx.fillStyle = asleep ? 'rgba(148,163,184,0.5)' : 'rgba(245,158,11,0.8)';
        ctx.fillText(asleep ? rm.name + ' · z' : rm.name, rm.x, rm.y + 58);
      });
      packets.forEach(pk => {
        const u = upos(pk.rm, pk.u), f = pk.up ? pk.p : 1 - pk.p;
        const x = u.x + (pk.rm.x - u.x) * f, y = u.y + (pk.rm.y - u.y) * f;
        ctx.fillStyle = pk.up ? '#f59e0b' : '#e2e8f0'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
      });
      ctx.textAlign = 'left';
    };
    self.label = () => `<b>Durable Chat</b> · one tiny server per room · ${msgs} messages`;
    return self;
  })();

  // Next-Frame: the A* teacher car exploring a grid; it only sees a small box around itself
  const grid = (() => {
    const self = { color: '#38bdf8' };
    const C = 22, FOV = 3, TICK = 85;
    let cols = 0, rows = 0, wall, known, car = { x: 0, y: 0 }, from = { x: 0, y: 0 }, goal = null, path = [], goals = 0, moveT = 0, pops = [];
    const idx = (x, y) => y * cols + x;
    const free = () => { for (let n = 0; n < 500; n++) { const x = Math.random() * cols | 0, y = Math.random() * rows | 0; if (!wall[idx(x, y)]) return { x, y }; } return { x: 0, y: 0 }; };
    function astar(sx, sy, gx, gy, blocked) {
      const N = cols * rows, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N), heap = [];
      const push = (f, i) => { heap.push([f, i]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
      const pop = () => { const topI = heap[0], lastI = heap.pop(); if (heap.length) { heap[0] = lastI; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return topI; };
      const h = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
      const s = idx(sx, sy), goalI = idx(gx, gy);
      g[s] = 0; push(h(sx, sy), s);
      while (heap.length) {
        const i = pop()[1];
        if (closed[i]) continue; closed[i] = 1;
        if (i === goalI) { const out = []; for (let c = i; c !== s; c = came[c]) out.push({ x: c % cols, y: (c / cols) | 0 }); return out.reverse(); }
        const x = i % cols, y = (i / cols) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const j = idx(nx, ny);
          if (blocked[j] || closed[j]) continue;
          if (dx && dy && (blocked[idx(nx, y)] || blocked[idx(x, ny)])) continue;
          const ng = g[i] + (dx && dy ? 1.414 : 1);
          if (ng < g[j]) { g[j] = ng; came[j] = i; push(ng + h(nx, ny), j); }
        }
      }
      return null;
    }
    function newGoal() {
      const gc = Math.floor(gutter() / C);
      for (let n = 0; n < 60; n++) {
        let p = free();
        if (gc >= 3) p = { x: Math.random() < 0.5 ? Math.random() * gc | 0 : cols - 1 - (Math.random() * gc | 0), y: Math.random() * rows | 0 };
        if (wall[idx(p.x, p.y)] || Math.hypot(p.x - car.x, p.y - car.y) < cols * 0.3) continue;
        if (astar(car.x, car.y, p.x, p.y, wall)) { goal = p; path = []; return; }
      }
      goal = null;
    }
    function gen() {
      wall = new Uint8Array(cols * rows); known = new Uint8Array(cols * rows);
      const blocks = Math.floor(cols * rows * 0.035);
      for (let b = 0; b < blocks; b++) {
        const bw = 1 + (Math.random() * 3 | 0), bh = 1 + (Math.random() * 3 | 0), x = Math.random() * (cols - bw) | 0, y = Math.random() * (rows - bh) | 0;
        for (let i = 0; i < bw; i++) for (let j = 0; j < bh; j++) wall[idx(x + i, y + j)] = 1;
      }
      car = free(); from = { ...car }; newGoal();
    }
    function reveal() {
      for (let dy = -FOV; dy <= FOV; dy++) for (let dx = -FOV; dx <= FOV; dx++) {
        const x = car.x + dx, y = car.y + dy;
        if (x >= 0 && y >= 0 && x < cols && y < rows) known[idx(x, y)] = wall[idx(x, y)];
      }
    }
    self.resize = () => { cols = Math.max(10, Math.floor(W / C)); rows = Math.max(6, Math.floor((H - top) / C)); goals = 0; gen(); };
    self.step = (k, dt) => {
      moveT += dt;
      if (moveT < TICK) return;
      moveT = 0;
      reveal();
      if (!goal) { newGoal(); if (!goal) gen(); return; }
      if (!path.length || known[idx(path[0].x, path[0].y)]) path = astar(car.x, car.y, goal.x, goal.y, known) || [];
      if (!path.length) { newGoal(); return; }
      from = { ...car }; car = path.shift();
      if (car.x === goal.x && car.y === goal.y) {
        pops.push({ x: car.x, y: car.y, r: 4, a: 1 }); goals++; changed();
        if (goals % 8 === 0) gen(); else newGoal();
      }
    };
    self.draw = () => {
      const ox = (W - cols * C) / 2, oy = top;
      const f = Math.min(1, moveT / TICK), cx = from.x + (car.x - from.x) * f, cy = from.y + (car.y - from.y) * f;
      ctx.strokeStyle = 'rgba(148,163,184,0.05)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) { ctx.moveTo(ox + x * C, oy); ctx.lineTo(ox + x * C, oy + rows * C); }
      for (let y = 0; y <= rows; y++) { ctx.moveTo(ox, oy + y * C); ctx.lineTo(ox + cols * C, oy + y * C); }
      ctx.stroke();
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!wall[idx(x, y)]) continue;
        ctx.fillStyle = known[idx(x, y)] ? '#3d4d68' : '#151b28';
        ctx.fillRect(ox + x * C + 1, oy + y * C + 1, C - 2, C - 2);
      }
      ctx.fillStyle = 'rgba(56,189,248,0.6)';
      path.forEach(p => ctx.fillRect(ox + p.x * C + C / 2 - 1.5, oy + p.y * C + C / 2 - 1.5, 3, 3));
      if (goal) {
        const gx = ox + goal.x * C + C / 2, gy = oy + goal.y * C + C / 2;
        ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(gx - 3, gy + 7); ctx.lineTo(gx - 3, gy - 8); ctx.stroke();
        ctx.fillStyle = '#00ff88'; ctx.beginPath(); ctx.moveTo(gx - 3, gy - 8); ctx.lineTo(gx + 7, gy - 5); ctx.lineTo(gx - 3, gy - 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,255,136,0.55)'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + (cx - FOV) * C + 0.5, oy + (cy - FOV) * C + 0.5, (FOV * 2 + 1) * C, (FOV * 2 + 1) * C);
      ctx.fillStyle = 'rgba(0,255,136,0.05)';
      ctx.fillRect(ox + (cx - FOV) * C, oy + (cy - FOV) * C, (FOV * 2 + 1) * C, (FOV * 2 + 1) * C);
      ctx.fillStyle = '#00ff88'; ctx.fillRect(ox + cx * C + 4, oy + cy * C + 4, C - 8, C - 8);
      pops.forEach(p => { p.r += 1.2; p.a *= 0.94; ctx.strokeStyle = `rgba(0,255,136,${p.a})`; ctx.beginPath(); ctx.arc(ox + p.x * C + C / 2, oy + p.y * C + C / 2, p.r, 0, 7); ctx.stroke(); });
      pops = pops.filter(p => p.a > 0.03);
    };
    self.label = () => `<b>Next-Frame</b> · A* car exploring, it only sees the green box · ${goals} goals`;
    return self;
  })();

  const scenes = { swarm, flow, race, voice, chat, grid };
  let cur = null, curName = null, pending = 0;

  function updateLabel() {
    if (!cur) return;
    label.innerHTML = paused ? `${cur.label()} · paused` : cur.label();
    chip.style.setProperty('--chip', cur.color);
  }
  function clear() { ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight; top = nav.offsetHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Object.values(scenes).forEach(s => s.resize());
    clear();
    if (cur && paused) still();
  }
  const running = () => cur && !paused && !document.hidden;
  function frame(now) {
    raf = 0;
    if (!running()) { last = 0; return; }
    const dt = last ? Math.min(now - last, 50) : 16.67; last = now; t += dt;
    const k = dt / 16.67;
    // most scenes clear fully each frame (crisp at any frame rate); a scene with `fade` keeps a glow trail,
    // and the fade is scaled by elapsed time so the trail is the same length at 30, 60 or 120 fps
    if (cur.fade) { ctx.fillStyle = `rgba(10,10,15,${1 - Math.pow(1 - cur.fade, k)})`; ctx.fillRect(0, 0, W, H); } else clear();
    cur.step(k, dt); cur.draw();
    raf = requestAnimationFrame(frame);
  }
  function schedule() { if (!raf && running()) raf = requestAnimationFrame(frame); }
  function still() { clear(); cur.step(0, 0); cur.draw(); }

  // fade the old game out, swap, fade the new one in
  function setScene(name) {
    name = name && scenes[name] ? name : null;
    if (name === curName) return;
    curName = name;
    clearTimeout(pending);
    canvas.classList.remove('live');
    veil.classList.toggle('live', !!name);
    chip.classList.toggle('show', !!name);
    pending = setTimeout(() => {
      cur = name ? scenes[name] : null;
      clear();
      if (cur) { updateLabel(); if (paused) still(); canvas.classList.add('live'); }
      schedule();
    }, reduceMotion ? 0 : 320);
  }
  function setPaused(p) {
    paused = p;
    try { localStorage.setItem('world-paused', p ? '1' : '0'); } catch (e) {}
    chip.classList.toggle('paused', p);
    toggle.textContent = p ? 'play' : 'pause';
    toggle.setAttribute('aria-pressed', String(p));
    updateLabel();
    if (cur && p) still(); else schedule();
  }
  toggle.addEventListener('click', () => setPaused(!paused));
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', schedule);
  resize();
  setPaused(paused);
  return { setScene };
})();
