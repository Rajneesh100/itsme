// ─── Clock Tool 1.1: India time in the desktop window ───
(function () {
  const date = document.getElementById('clock-date');
  const time = document.getElementById('clock-time');
  if (!date || !time) return;
  const fDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const fTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  let timer = 0;
  function tick() { const now = new Date(); date.textContent = fDate.format(now); time.textContent = fTime.format(now); }
  tick();
  whenVisible(time, () => { if (!timer) timer = setInterval(tick, 1000); tick(); }, () => { clearInterval(timer); timer = 0; });
})();
