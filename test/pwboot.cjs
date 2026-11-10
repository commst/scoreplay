// 시작 시험: 저장된 설정(localStorage)이 여러 가지인 상태로 앱을 열어 끝까지 시작되는지(__appReady) 본다.
// node test/pwboot.cjs <index.html 절대경로>   (113번: '악보로 보기'를 저장해 두면 시작이 멈추던 문제)
const { chromium } = require('playwright');
const html = require('path').resolve(process.argv[2] || 'index.html');
const states = {
  empty: {},
  scoreView: { 'hapju-view': JSON.stringify({ mode: 'score', zoom: 1.5, follow: true }) },
  scoreViewNoFollow: { 'hapju-view': JSON.stringify({ mode: 'score', zoom: 1, follow: false }) },
  tabSave: { 'hapju.tab': 'save' },
  tabPlayScore: { 'hapju.tab': 'play', 'hapju-view': JSON.stringify({ mode: 'score' }) },
  prefsOff: { 'hapju-prefs': JSON.stringify({ autoSave: false, autoLoad: false }) },
};
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [name, ls] of Object.entries(states)) {
    const ctx = await b.newContext(); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, ls);
    await p.goto('file://' + html);
    let ok = false; try { await p.waitForFunction(() => window.__appReady === 'ok', null, { timeout: 15000 }); ok = true; } catch (e) {}
    const shown = await p.evaluate(() => { const m = document.getElementById('bootMsg'); return m && !m.hidden ? document.getElementById('bootText').textContent.slice(0, 120) : ''; });
    if (!ok || shown || errs.length) bad++;
    console.log((ok && !shown && !errs.length ? 'ok  ' : 'FAIL') + ' ' + name + (errs.length ? ' · ' + errs.join(' | ').slice(0, 200) : '') + (shown ? ' · 안내: ' + shown : ''));
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
