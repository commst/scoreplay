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
  broken: { 'hapju-view': '{bad json', 'hapju.tab': 'nope', 'hapju-prefs': '[' },
};
// 탭 × 보기 조합 전부
for (const tab of ['inst', 'tempo', 'play', 'save']) for (const mode of ['map', 'score']) states[`${tab}-${mode}`] = { 'hapju.tab': tab, 'hapju-view': JSON.stringify({ mode, zoom: 2, follow: mode === 'map' }) };
const VPS = { desktop: { width: 1280, height: 800 }, phone: { width: 390, height: 844, isMobile: true, hasTouch: true }, tabletLand: { width: 1180, height: 820, isMobile: true, hasTouch: true } };
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [vpn, vp] of Object.entries(VPS)) for (const [name0, ls] of Object.entries(states)) {
    const name = vpn + ' ' + name0;
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, ls);
    await p.goto('file://' + html);
    let ok = false; try { await p.waitForFunction(() => window.__appReady === 'ok', null, { timeout: 15000 }); ok = true; } catch (e) {}
    const shown = await p.evaluate(() => { const m = document.getElementById('bootMsg'); return m && !m.hidden ? document.getElementById('bootText').textContent.slice(0, 120) : ''; });
    if (!ok || shown || errs.length) bad++;
    console.log((ok && !shown && !errs.length ? 'ok  ' : 'FAIL') + ' ' + name + (errs.length ? ' · ' + errs.join(' | ').slice(0, 200) : '') + (shown ? ' · 안내: ' + shown : ''));
    // 예시 장단 재생 한 번(시작 직후 단추가 동작하는지)
    if (ok) { try { await p.evaluate(() => document.getElementById('playBtn') && document.getElementById('playBtn').click()); await p.waitForTimeout(400); } catch (e) {} if (errs.length) { bad++; console.log('FAIL ' + name + ' 재생 후 오류 · ' + errs.join(' | ').slice(0, 200)); } }
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
