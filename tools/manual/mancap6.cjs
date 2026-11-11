// 9장(MusicXML 저장 뒤 확인·겹쳐 보기) 그림: node tools/manual/mancap6.cjs [probe|shot] [마디] [줄 이름]
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const s = SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(s, t); return t; };
const O = '/home/claude/work/manual/img/', HTML = process.env.HTML || '/home/claude/web/deploy-hapju/index.html';
const [mode = 'probe', BAR, LINE] = process.argv.slice(2);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light', acceptDownloads: true })).newPage();
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
 await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  // 글꼴: 작업 공간에서는 CDN에 못 닿으므로 npm으로 받은 파일 (/home/claude/work/fonts에서 npm i pretendard@1.3.9 @fontsource-variable/outfit)
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: '/home/claude/work/fonts/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const fp = '/home/claude/work/fonts/node_modules/pretendard/dist/web/variable/' + r.request().url().split('/variable/')[1].replace('.min.css', '.css'); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
 await p.goto('file://' + HTML); await p.setInputFiles('#pdfInput', pick(process.env.PRE || 'b3a31a97'));
 await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 120000 }); await p.waitForTimeout(800);
 // 대금·가야금·장고 줄 켜기
 const names = await p.$$eval('#lineList .lname', es => es.map(e => e.textContent.trim()));
 for (const re of (process.env.LINES || '대금|가야금|장고').split('|')) { const i = names.findIndex(n => new RegExp(re).test(n)); if (i >= 0 && await p.$(`#lineList .lcard:nth-child(${i + 1}).off`)) { await p.click(`#lineList .lcard:nth-child(${i + 1}) .lsw`); await p.waitForTimeout(1500); } }
 await p.click('.tabs2 [data-tab="save"]').catch(() => {}); await p.waitForTimeout(500);
 const dl = p.waitForEvent('download', { timeout: 60000 }); await p.click('#exportXmlBtn'); await dl;
 await p.waitForSelector('.xchk-dlg', { timeout: 60000 }); await p.waitForTimeout(600);
 if (mode === 'probe') {
   console.log(await p.$eval('.xchk-sum', e => e.textContent));
   const L = await p.$$eval('.xchk-line', ls => ls.map(l => [l.querySelector('b').textContent, [...l.querySelectorAll('button')].slice(0, 30).map(x => (x.className.includes('bad') ? '*' : '') + x.textContent + ':' + (x.title.split(': ')[1] || '').slice(0, 60))]));
   console.log(JSON.stringify(L, null, 1).slice(0, 5000));
 } else {
   const d = await p.locator('.xchk-dlg').boundingBox(); await p.screenshot({ path: O + '25_xml_check.png', clip: { x: d.x - 8, y: d.y - 8, width: d.width + 16, height: d.height + 16 } });
   // 줄 LINE의 BAR 마디 번호 누르기
   const bt = p.locator('.xchk-line', { hasText: LINE }).locator('button', { hasText: new RegExp('^' + BAR + '$') }).first(); await bt.click(); await p.waitForTimeout(3500);
   await p.click('#svZoomIn').catch(() => {}); await p.click('#svZoomIn').catch(() => {}); await p.waitForTimeout(2500);
   await p.evaluate(() => { const e = document.querySelector('.sv-hl') || document.querySelector('.sv-ov'); if (e) e.scrollIntoView({ block: 'center', inline: 'center' }); }); await p.waitForTimeout(1500);
   const w = await p.locator('#svWrap').boundingBox(); await p.screenshot({ path: O + '26_xml_overlay.png', clip: { x: w.x, y: w.y, width: w.width, height: Math.min(w.height, 520) } });
   const tb = await p.locator('#svOverLbl').boundingBox(); console.log('overlay dots', await p.$$eval('.sv-ovn', e => e.length), 'bad', await p.$$eval('.sv-ovn.bad', e => e.length), 'miss', await p.$$eval('.sv-ovn.miss', e => e.length));
 }
 console.log('errs', errs.join(' | ')); await b.close(); })();
