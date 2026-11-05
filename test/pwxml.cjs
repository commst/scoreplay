// MusicXML 내보내기: node pwxml.cjs <샘플 접두어...> → xmlout/<접두어>.musicxml (모든 줄 켜고)
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const s = SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(s, t); return t; }   // 한글 파일 이름은 setInputFiles가 올리지 못해 영어 이름으로 복사;
const HTML = process.env.HTML || '/home/claude/web/deploy-hapju/index.html';
(async () => { const b = await chromium.launch();
 for (const pre of process.argv.slice(2)) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + HTML + '#allpanes'); await p.setInputFiles('#pdfInput', pick(pre));
  try { await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 90000 }); } catch (e) { console.log(pre, 'load fail'); await p.close(); continue; }
  await p.waitForTimeout(800); await p.click('#allOn').catch(() => {}); await p.waitForTimeout(1500);
  const dl = p.waitForEvent('download', { timeout: 30000 }); await p.click('#exportXmlBtn'); const d = await dl;
  fs.copyFileSync(await d.path(), `xmlout/${pre}.musicxml`);
  const dj = p.waitForEvent('download', { timeout: 30000 }); await p.click('#exportJsonBtn'); fs.copyFileSync(await (await dj).path(), `xmlout/${pre}.json`);
  const info = await p.evaluate(() => ({ title: document.getElementById('tbSongName').textContent, lines: document.querySelectorAll('#lineList .lcard').length }));
  console.log(pre, info.title, 'lines', info.lines, 'errs', errs.length, errs.slice(0, 2).join(' | '));
  await p.close(); }
 await b.close(); })();
