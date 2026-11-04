// ─── Hero pets: every side project as a tiny creature wandering one strip ───
(function () {
  const canvas = document.getElementById('pets');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  let W = 0, H = 0, raf = 0, last = 0, running = false, hover = null, mx = -1;
  const gy = () => H - 10;   // ground line; sprites stand on it

  const pets = [
    { key: 'swarm', name: 'HAWK', c: '#06b6d4' },
    { key: 'flow', name: 'Kinetic', c: '#ff8a5b' },
    { key: 'race', name: 'Rocket Rally', c: '#ff4d5e' },
    { key: 'voice', name: 'Alexa-nxt', c: '#00ff88' },
    { key: 'chat', name: 'Durable Chat', c: '#f59e0b' },
    { key: 'grid', name: 'Next-Frame', c: '#38bdf8' },
  ];
  pets.forEach(p => Object.assign(p, { x: null, dir: Math.random() < 0.5 ? -1 : 1, sp: rand(0.2, 0.4), rest: rand(0, 1500), s: { t: 0 } }));

  // Rocket Rally: two cars drive at each other and lob shells, artillery style
  const G = 0.16;                                    // gravity for the shells, px per frame²
  const race = pets.find(p => p.key === 'race');
  race.s.cars = [{ c: '#ff4d5e', dir: 1 }, { c: '#22d3ee', dir: -1 }].map(c => ({ ...c, x: null, sp: rand(0.9, 1.3), spin: 0, cd: rand(20, 60) }));
  race.s.rk = []; race.s.fx = []; race.s.kills = 0;
  const zone = () => Math.min(130, W * 0.2);         // half width of the cars' stretch of road

  function stepRace(p, k) {
    const s = p.s, R = zone(), [a, b] = s.cars;
    p.x += p.dir * 0.12 * k;                         // the whole stretch drifts slowly
    s.cars.forEach(c => {
      if (c.spin > 0) c.spin = Math.max(0, c.spin - k / 55);
      else c.x += c.dir * c.sp * k;
      if (c.x < p.x - R) { c.x = p.x - R; c.dir = 1; }
      if (c.x > p.x + R) { c.x = p.x + R; c.dir = -1; }
      if (Math.random() < 0.01 * k) c.sp = rand(0.8, 1.4);
    });
    // only while they're facing each other: aim where the other car will be, with a bit of error
    s.cars.forEach(c => {
      if ((c.cd -= k) > 0 || c.spin) return;
      const o = c === a ? b : a, dx = o.x - c.x, dist = Math.abs(dx);
      if (Math.sign(dx) === c.dir && dist > 40 && dist < 190) {
        const T = rand(32, 42), x0 = c.x + c.dir * 7, aim = o.x + (o.spin ? 0 : o.dir * o.sp) * T + rand(-14, 14);
        s.rk.push({ x: x0, y: 9, vx: (aim - x0) / T, vy: (G * T * T / 2 - 5) / T, tgt: o, trail: [] });
        c.cd = rand(60, 120);
      } else c.cd = 10;
    });
    s.rk = s.rk.filter(r => {
      r.trail.unshift({ x: r.x, y: r.y }); if (r.trail.length > 8) r.trail.pop();
      r.x += r.vx * k; r.vy -= G * k; r.y += r.vy * k;
      if (r.vy < 0 && r.y < 10 && !r.tgt.spin && Math.abs(r.x - r.tgt.x) < 8) {
        r.tgt.spin = 1; s.fx.push({ x: r.tgt.x, y: 6, r: 2, a: 1, boom: true }); s.kills++; return false;
      }
      if (r.y <= 0) { s.fx.push({ x: r.x, y: 1, r: 1, a: 0.6 }); return false; }
      return true;
    });
    s.fx.forEach(f => { f.r += (f.boom ? 0.6 : 0.35) * k; f.a *= Math.pow(0.9, k); });
    s.fx = s.fx.filter(f => f.a > 0.05);
  }

  function resize() {
    const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    if (!r.width) return;
    W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    pets.forEach((p, i) => {
      const m = p.key === 'race' ? zone() + 12 : 18;
      if (p.x === null) p.x = (i + 0.5) * W / pets.length;
      p.x = clamp(p.x, m, W - m);
    });
    race.s.cars.forEach((c, i) => { if (c.x === null) c.x = race.x + (i ? 1 : -1) * zone(); c.x = clamp(c.x, race.x - zone(), race.x + zone()); });
    draw();
  }

  function step(k, dt) {
    pets.forEach(p => {
      const s = p.s; s.t += dt;
      if (p.key === 'race') stepRace(p, k);
      else if (p.rest > 0) p.rest -= dt;
      else if (p.key === 'grid') {
        if (s.t > 380) { s.t = 0; p.x += p.dir * 6; if (Math.random() < 0.04) p.rest = rand(800, 2000); if (Math.random() < 0.05) p.dir *= -1; }
      } else {
        p.x += p.dir * p.sp * k;
        if (Math.random() < 0.003 * k) p.rest = rand(800, 2400);
        if (Math.random() < 0.002 * k) p.dir *= -1;
      }
      const m = p.key === 'race' ? zone() + 12 : 18;
      if (p.x < m || p.x > W - m) { p.dir *= -1; p.x = clamp(p.x, m, W - m); }
      if (p.key === 'swarm') {
        s.tg = s.tg || { x: p.x + 20, y: 30 }; s.d = s.d || { x: p.x, y: 0 };
        const dx = s.tg.x - s.d.x, dy = s.tg.y - s.d.y, dist = Math.hypot(dx, dy) || 1;
        s.d.x += dx / dist * Math.min(dist, 1.1 * k); s.d.y += dy / dist * Math.min(dist, 1.1 * k);
        if (dist < 3) { s.pop = { x: s.tg.x, y: s.tg.y, r: 2, a: 1 }; s.tg = { x: clamp(p.x + rand(-34, 34), 8, W - 8), y: rand(14, H - 22) }; }
        if (s.pop) { s.pop.r += 0.6 * k; s.pop.a *= Math.pow(0.92, k); if (s.pop.a < 0.05) s.pop = null; }
      }
      if (p.key === 'voice' && s.t > (s.talk ? 1600 : 2200)) { s.t = 0; s.talk = !s.talk; }
      if (p.key === 'chat') { if (s.t > 2200) { s.t = 0; s.bub = { y: 0, a: 1 }; } if (s.bub) { s.bub.y += 0.25 * k; s.bub.a -= 0.012 * k; if (s.bub.a <= 0) s.bub = null; } }
    });
  }

  function car(c, x, y, dir) {
    ctx.save(); ctx.translate(x, y);
    if (c.spin) { ctx.translate(0, -5 - Math.sin(c.spin * Math.PI) * 9); ctx.rotate((1 - c.spin) * Math.PI * 2 * dir); ctx.translate(0, 5); }
    if (dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = c.c; ctx.fillRect(-7, -9, 14, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(1, -8, 3, 4);
    ctx.fillStyle = '#0a0a0f'; ctx.fillRect(-5, -3, 3, 3); ctx.fillRect(3, -3, 3, 3);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!W) return;
    const y = gy(), tt = performance.now();
    ctx.strokeStyle = 'rgba(148,163,184,0.18)'; ctx.setLineDash([2, 6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); ctx.setLineDash([]);
    pets.forEach(p => {
      const s = p.s, x = p.x;
      ctx.globalAlpha = hover === p ? 1 : 0.85;
      if (p.key === 'swarm') {
        const d = s.d || { x, y: 0 }, tg = s.tg || { x: x + 20, y: 30 };
        ctx.fillStyle = '#ff4d5e'; ctx.fillRect(tg.x - 2, y - tg.y - 2, 4, 4);
        ctx.save(); ctx.translate(d.x, y - d.y); ctx.rotate(Math.atan2(-(tg.y - d.y), tg.x - d.x)); ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, 3.5); ctx.lineTo(-2, 0); ctx.lineTo(-4, -3.5); ctx.fill(); ctx.restore();
        if (s.pop) { ctx.strokeStyle = `rgba(0,255,136,${s.pop.a})`; ctx.beginPath(); ctx.arc(s.pop.x, y - s.pop.y, s.pop.r, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#34445a'; ctx.fillRect(x - 6, y - 2, 12, 2);
      } else if (p.key === 'flow') {
        ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(x, y - 8, 9, 3, -0.15, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,138,91,0.55)';
        for (let n = 0; n < 3; n++) {
          const u = ((tt * 0.04 + n * 13) % 40) - 20, off = (n - 1) * 7, bend = Math.exp(-(u * u) / 60) * (off < 0 ? -3 : off > 0 ? 3 : -4);
          ctx.beginPath(); ctx.moveTo(x + u - 5, y - 8 + off + bend); ctx.lineTo(x + u, y - 8 + off + bend); ctx.stroke();
        }
      } else if (p.key === 'race') {
        ctx.globalAlpha = hover === p ? 1 : 0.9;
        s.cars.forEach(c => car(c, c.x, y, c.dir));
        s.rk.forEach(r => {
          r.trail.forEach((t, i) => { ctx.fillStyle = `rgba(245,158,11,${0.6 - i * 0.065})`; ctx.beginPath(); ctx.arc(t.x, y - t.y, Math.max(0.6, 1.6 - i * 0.12), 0, 7); ctx.fill(); });
          ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(r.x, y - r.y, 2, 0, 7); ctx.fill();
        });
        s.fx.forEach(f => {
          ctx.globalAlpha = f.a;
          if (!f.boom) { ctx.fillStyle = 'rgba(148,163,184,0.5)'; ctx.beginPath(); ctx.ellipse(f.x, y - 1, f.r * 1.6, f.r * 0.6, 0, 0, 7); ctx.fill(); return; }
          ctx.fillStyle = 'rgba(245,158,11,0.35)'; ctx.beginPath(); ctx.arc(f.x, y - f.y, f.r, 0, 7); ctx.fill();
          ctx.strokeStyle = '#ff4d5e';
          for (let n = 0; n < 6; n++) { const an = n * 1.047 + 0.3; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(an) * f.r * 0.6, y - f.y + Math.sin(an) * f.r * 0.6); ctx.lineTo(f.x + Math.cos(an) * f.r * 1.3, y - f.y + Math.sin(an) * f.r * 1.3); ctx.stroke(); }
        });
      } else if (p.key === 'voice') {
        ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = s.talk ? 8 : 2;
        ctx.beginPath(); ctx.arc(x - 6, y - 6, 4.5, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        for (let n = 0; n < 4; n++) { const h = s.talk ? 2 + Math.abs(Math.sin(tt * 0.012 + n * 1.7)) * 9 : 2; ctx.fillRect(x + 2 + n * 3, y - 1 - h, 2, h); }
      } else if (p.key === 'chat') {
        ctx.strokeStyle = p.c; ctx.lineWidth = 1.5; ctx.strokeRect(x - 5, y - 10, 10, 10); ctx.lineWidth = 1;
        if (s.bub) {
          const by = y - 18 - s.bub.y;
          ctx.globalAlpha = Math.max(0, s.bub.a) * 0.9; ctx.fillStyle = '#e2e8f0';
          ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 2, by - 6, 16, 9, 3) : ctx.rect(x + 2, by - 6, 16, 9); ctx.fill();
          ctx.fillStyle = '#0a0a0f'; [6, 10, 14].forEach(dx => ctx.fillRect(x + dx, by - 2, 1.5, 1.5));
        }
      } else if (p.key === 'grid') {
        ctx.setLineDash([2, 2]); ctx.strokeStyle = 'rgba(0,255,136,0.5)'; ctx.strokeRect(x - 10, y - 20, 20, 20); ctx.setLineDash([]);
        ctx.fillStyle = '#00ff88'; ctx.fillRect(x - 3, y - 13, 6, 6);
      }
      ctx.globalAlpha = 1;
    });
    if (hover) {
      ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillStyle = hover.c;
      const label = hover.key === 'race' && hover.s.kills ? `${hover.name} · ${hover.s.kills} takedowns` : hover.name;
      ctx.fillText(label, clamp(hover.key === 'race' ? (race.s.cars[0].x + race.s.cars[1].x) / 2 : hover.x, 70, W - 70), 10); ctx.textAlign = 'left';
    }
  }

  function pick() {
    let best = null, bd = 22;
    pets.forEach(p => {
      const xs = p.key === 'race' ? p.s.cars.map(c => c.x) : [p.x];
      xs.forEach(x => { const d = Math.abs(x - mx); if (d < bd) { bd = d; best = p; } });
    });
    return best;
  }
  function frame(now) {
    const dt = last ? Math.min(now - last, 50) : 16.67; last = now;
    step(dt / 16.67, dt);
    if (mx >= 0) { hover = pick(); canvas.style.cursor = hover ? 'pointer' : 'default'; }
    draw();
    if (running) raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener('mousemove', e => {
    mx = e.clientX - canvas.getBoundingClientRect().left;
    if (!running) { hover = pick(); canvas.style.cursor = hover ? 'pointer' : 'default'; draw(); }
  });
  canvas.addEventListener('mouseleave', () => { mx = -1; hover = null; if (!running) draw(); });
  canvas.addEventListener('click', () => { if (hover && window.goToProject) window.goToProject(hover.key); });
  new ResizeObserver(resize).observe(canvas);
  if (reduceMotion) return;
  whenVisible(canvas, () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } }, () => { running = false; cancelAnimationFrame(raf); });
})();
