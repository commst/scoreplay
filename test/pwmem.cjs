const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const s = SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(s, t); return t; }   // 한글 파일 이름은 setInputFiles가 올리지 못해 영어 이름으로 복사;
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
 await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
 await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
 const cdp = await p.context().newCDPSession(p);
 const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); await p.waitForTimeout(300); await cdp.send('HeapProfiler.collectGarbage'); const u = await cdp.send('Runtime.getHeapUsage'); return Math.round(u.usedSize / 1048576); };
 await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.waitForTimeout(500);
 console.log('start', await heap(), 'MB');
 const seq = ['b3a31a97', 'a9697ae6', 'c61daae9', 'b3a31a97', 'a9697ae6', 'c61daae9', 'b3a31a97', 'a9697ae6'];
 for (let k = 0; k < seq.length; k++) {
   await p.setInputFiles('#pdfInput', pick(seq[k]));
   await p.waitForFunction(id => document.getElementById('fileInfo').textContent.includes('읽었습니다') && document.querySelectorAll('#lineList .lcard').length > 1 && document.getElementById('fileName').textContent.includes(id), seq[k], { timeout: 120000 });
   await p.waitForTimeout(500);
   await p.click('#viewScore'); await p.waitForTimeout(2000);
   await p.click('#playBtn'); await p.waitForFunction(() => /마디/.test(document.getElementById('nowText').textContent) && !/만드는/.test(document.getElementById('nowText').textContent), null, { timeout: 120000 }).catch(() => {});
   await p.waitForTimeout(1500); await p.click('#barsStopBtn'); await p.click('#viewMap'); await p.waitForTimeout(300);
   console.log(k + 1, seq[k], await heap(), 'MB', 'canvases', await p.evaluate(() => document.querySelectorAll('canvas').length));
 }
 await b.close(); })();
