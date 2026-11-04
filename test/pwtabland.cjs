// 태블릿 가로·세로: 왼쪽 탭(악기·빠르기·연주·저장)과 아래 서랍 탭을 누를 수 있는지
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const HTML = process.argv[2] || '/home/claude/web/deploy-hapju/index.html';
const SIZES = [['iPad mini 가로', 1024, 768], ['iPad Air 가로', 1180, 820], ['iPad Pro 11 가로', 1194, 834], ['iPad Pro 12.9 가로', 1366, 1024], ['갤럭시탭 가로', 1280, 800], ['작은 태블릿 가로', 960, 600], ['iPad 세로', 820, 1180]];
let bad = 0;
(async () => { const b = await chromium.launch();
 for (const [nm, w, h] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + HTML); await p.setInputFiles('#pdfInput', pick('b3a31a97'));
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && !document.body.classList.contains('welcome'), null, { timeout: 90000 }); await p.waitForTimeout(800);
  const probe = () => p.evaluate(() => {
    const vis = sel => [...document.querySelectorAll(sel)].map(el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return null; const x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = document.elementFromPoint(x, y); return { t: el.textContent.trim(), top: Math.round(r.top), ok: y > 0 && y < innerHeight && !!hit && (hit === el || el.contains(hit)), hit: hit ? (hit.id || String(hit.className).slice(0, 20) || hit.tagName) : null }; }).filter(Boolean);
    return { tabs: vis('.tab2'), dtabs: vis('.dtab'), topbar: Math.round(document.getElementById('topbar').getBoundingClientRect().bottom), sideTop: Math.round(document.getElementById('sidebar').getBoundingClientRect().top), scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight };
  });
  // 처음 화면, 그리고 페이지를 아래로 굴린 뒤(악보·목록을 보다가)
  const a = await probe();
  await p.mouse.wheel(0, 2000); await p.evaluate(() => window.scrollTo(0, 99999)); await p.waitForTimeout(300);
  const c = await probe();
  for (const [lab, s] of [['처음', a], ['굴린 뒤', c]]) {
    const all = [...s.tabs, ...s.dtabs]; const anyOk = s.tabs.length ? s.tabs.every(t => t.ok) : s.dtabs.every(t => t.ok);
    if (!anyOk) bad++;
    console.log(`${anyOk ? 'ok  ' : 'FAIL'} ${nm} ${w}x${h} ${lab}: scrollY ${s.scrollY}/${s.docH - h} topbar↓${s.topbar} sidebar↑${s.sideTop} | 탭 ${s.tabs.map(t => t.t + '@' + t.top + (t.ok ? '' : '✗' + t.hit)).join(' ') || '-'} | 서랍탭 ${s.dtabs.map(t => t.t + (t.ok ? '' : '✗' + t.hit)).join(' ') || '-'}`);
  }
  await p.screenshot({ path: `/home/claude/work/tab_${w}x${h}.png` });
  if (errs.length) console.log('  errors', errs);
  await ctx.close(); }
 await b.close(); process.exitCode = bad ? 1 : 0; })();
