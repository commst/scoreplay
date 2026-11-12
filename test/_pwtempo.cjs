// 앱에서 악보를 열었을 때 빠르기 표 (공유 설정 적용 전/후): node test/_pwtempo.cjs <접두어>
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2], SM = '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  p.on('dialog', d => d.accept()); p.on('pageerror', e => console.log('ERR', e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|commst\.github\.io|raw\.githubusercontent).*/, r => r.abort());
  await p.route('https://commst.github.io/scoreworks/**', r => { const f = r.request().url().split('/scoreworks/')[1].split('?')[0] || 'index.html'; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.route('https://raw.githubusercontent.com/commst/scoreworks/main/**', r => { const f = r.request().url().split('/main/')[1].split('?')[0]; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp, contentType: 'application/json' }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto('https://commst.github.io/scoreworks/'); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(2500);
  const rows = () => p.evaluate(() => JSON.stringify(window.__st.tempoRows.map(r => [r.start, r.unit, r.bpm, r.text || '', r.manual ? 'M' : '', r.edited ? 'E' : ''])));
  console.log('처음', await rows());
  console.log('offer', await p.evaluate(() => !document.getElementById('ghOffer').hidden && document.getElementById('ghOfferText').textContent));
  const okb = await p.$('#ghOffer button'); if (okb && await okb.isVisible()) { await okb.click(); await p.waitForTimeout(2500); console.log('공유 적용 뒤', await rows()); }
  await b.close(); })();
