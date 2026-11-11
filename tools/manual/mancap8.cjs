// 사용설명서 그림: 04b_rename(악기 이름 고치기: 장고 → 모듬북), 15_edit(마디맵 21마디 ✎ 음 수정 창)
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t); return t; };
const O = '/home/claude/work/manual/img/', HTML = 'file:///home/claude/web/deploy-hapju/index.html';
(async () => { const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: 'light' })).newPage();
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: '/home/claude/work/fonts/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const fp = '/home/claude/work/fonts/node_modules/pretendard/dist/web/variable/' + r.request().url().split('/variable/')[1].replace('.min.css', '.css'); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto(HTML); await p.evaluate(() => document.fonts.ready);
  await p.setInputFiles('#pdfInput', pick('b3a31a97'));
  await p.waitForFunction(() => !document.body.classList.contains('welcome') && document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 90000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  // 04b: 장고 줄 이름을 모듬북으로
  const names = await p.$$eval('#lineList .lname', es => es.map(e => e.textContent.trim()));
  const ji = names.findIndex(n => /장고|장구/.test(n)), card = `#lineList .lcard:nth-child(${ji + 1})`;
  if (await p.$(card + '.off')) { await p.click(card + ' .lsw'); await p.waitForTimeout(1500); }
  await p.click(card + ' .lfold'); await p.waitForTimeout(400);
  await p.fill(card + ' .lrename input', '모듬북'); await p.press(card + ' .lrename input', 'Enter'); await p.waitForTimeout(600);
  const c2 = `#lineList .lcard:nth-child(${ji + 1})`; await p.locator(c2).scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const bx = await p.locator(c2).boundingBox(); await p.screenshot({ path: O + '04b_rename.png', clip: { x: bx.x - 6, y: bx.y - 6, width: bx.width + 12, height: Math.min(bx.height, 540) + 12 } });
  // 15: 마디맵 21마디 ✎ 수정
  await p.click('#viewMap'); await p.waitForTimeout(600);
  const cell = p.locator('#bars .b[data-n="21"]'); await cell.scrollIntoViewIfNeeded(); await cell.hover(); await p.waitForTimeout(400);
  await p.locator('#bars .b[data-n="21"] .b-edit').click(); await p.waitForTimeout(700);
  await p.screenshot({ path: O + '15_edit.png' });
  console.log('done'); await b.close(); })();
