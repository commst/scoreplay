const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const O = '/home/claude/work/manual/img/';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' })).newPage();
 await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
 await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
 await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.setInputFiles('#pdfInput', pick('b3a31a97'));
 await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 90000 }); await p.waitForTimeout(800);
 // 장고도 켜서 미리보기에 두 줄
 const names = await p.$$eval('#lineList .lname', es => es.map(e => e.textContent.trim())); const ji = names.findIndex(n => /장고/.test(n));
 if (ji >= 0 && await p.$(`#lineList .lcard:nth-child(${ji + 1}).off`)) { await p.click(`#lineList .lcard:nth-child(${ji + 1}) .lsw`); await p.waitForTimeout(2500); }
 await p.click('#viewMap'); await p.waitForTimeout(400);
 const go = async (mode, file) => {
   await p.click(mode); await p.waitForTimeout(300);
   await p.evaluate(() => { const e = document.querySelector('#bars .b[data-n="37"]'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 420); }); await p.waitForTimeout(400);
   await p.mouse.move(5, 5); await p.waitForTimeout(500);
   await p.locator('#bars .b[data-n="37"]').hover(); await p.waitForTimeout(800);
   const t = await p.locator('.bar-tip.show').boundingBox(); const c = await p.locator('#bars .b[data-n="37"]').boundingBox();
   const x0 = Math.min(t.x, c.x) - 12, y0 = Math.min(t.y, c.y) - 12, x1 = Math.max(t.x + t.width, c.x + c.width) + 12, y1 = Math.max(t.y + t.height, c.y + c.height) + 12;
   await p.screenshot({ path: O + file, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
 };
 await go('#barViewTimeline', '16d_bar_tip.png'); await go('#barViewDetail', '16c_map_detail.png');
 await p.click('#barViewTimeline'); console.log('ok'); await b.close(); })();
