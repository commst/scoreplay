const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'); const SM = '/home/claude/samples/'; const pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const errs = [];
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'), contentType: 'text/javascript' }));
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.waitForTimeout(800);
    await p.setInputFiles('#pdfInput', pick('b3a31a97')); await p.waitForFunction(() => /마디를 읽었습니다|하나 이상 켜세요/.test(document.querySelector('#fileInfo').textContent), null, { timeout: 120000 }); await p.waitForTimeout(1200); return p; };
  const rng = async (p, t) => console.log(t, await p.inputValue('#from'), await p.inputValue('#to'), '| save', await p.inputValue('#sFrom'), await p.inputValue('#sTo'));
  let p = await open(); await rng(p, 'load');
  await p.click('#allOff'); await p.waitForTimeout(1200); await rng(p, 'all off');
  await p.locator('.lcard').first().locator('.seg button').first().click(); await p.waitForTimeout(1000); await rng(p, 'one on');
  await p.click('#allOff'); await p.waitForTimeout(1500);   // 자동 저장
  p = await open(); await rng(p, 'reopen (saved while all off)'); await p.locator('.lcard').first().locator('.seg button').first().click(); await p.waitForTimeout(1200); await rng(p, 'reopen then one on');
  await p.fill('#from', '5'); await p.dispatchEvent('#from', 'change'); await p.fill('#to', '20'); await p.dispatchEvent('#to', 'change');
  await p.click('#allOn'); await p.waitForTimeout(1200); await rng(p, 'custom 5-20 then allOn');
  await p.click('#allOff'); await p.waitForTimeout(800); await p.locator('.lcard').first().locator('.seg button').first().click(); await p.waitForTimeout(1200); await rng(p, 'off/on keeps 5-20');
  console.log('errs', errs.join(';')); await b.close();
})();
