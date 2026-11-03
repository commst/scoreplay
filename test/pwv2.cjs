// 새 배치 동작 시험: node pwv2.cjs <html> desktop|tablet|phone
const { chromium } = require('playwright'); const fs = require('fs');
const [, , HTML, MODE = 'desktop'] = process.argv;
const VP = { desktop: { width: 1366, height: 860 }, tablet: { width: 820, height: 1180, hasTouch: true }, phone: { width: 390, height: 844, hasTouch: true, isMobile: true } }[MODE];
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: VP.width, height: VP.height }, hasTouch: !!VP.hasTouch, isMobile: !!VP.isMobile });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + HTML); await p.waitForTimeout(400);
  const narrow = VP.width <= 900;
  ok(await p.evaluate(() => document.body.classList.contains('welcome')), 'starts on welcome screen');
  ok(!(await p.isVisible('#dock')), 'dock hidden on welcome');
  await p.click('#demoBtn'); await p.waitForTimeout(200);
  ok(await p.isVisible('#playBtn'), 'demo: play visible');
  // 재생 → 정지
  await p.click('#playBtn'); await p.waitForTimeout(2500);
  ok(/카운트인|마디/.test(await p.textContent('#nowText')), 'plays example: ' + (await p.textContent('#nowText')).slice(0, 30));
  await p.click('#barsStopBtn'); await p.waitForTimeout(300);
  ok(/정지/.test(await p.textContent('#nowText')), 'stop from dock');
  // 속도 단추
  await p.click('#dockSpdDown'); await p.click('#dockSpdDown');
  ok((await p.inputValue('#speed')) === '90' && (await p.textContent('#dockSpd')) === '90%', 'speed − → 90');
  await p.click('#dockSpdUp'); ok((await p.inputValue('#speed')) === '95', 'speed + → 95');
  // 구간 반복
  await p.click('#dockLoop'); ok(await p.isChecked('#optLoop') && (await p.getAttribute('#dockLoop', 'aria-pressed')) === 'true', 'loop toggle on');
  await p.click('#dockLoop'); ok(!(await p.isChecked('#optLoop')), 'loop toggle off');
  // 악보 올리기 (파일 창)
  await p.click('#filesBtn'); await p.waitForTimeout(200);
  ok(await p.isVisible('#pdfInput + *, label[for=pdfInput]'), 'files dialog shows upload');
  await p.setInputFiles('#pdfInput', pick('44e95fb3'));
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 60000 });
  ok(/Flower/.test(await p.textContent('#tbSongName')), 'topbar song: ' + await p.textContent('#tbSongName') + ' ' + await p.textContent('#tbSongInfo'));
  await p.click('#filesClose'); await p.waitForTimeout(150);
  ok(!(await p.evaluate(() => document.body.classList.contains('files-open'))), 'files dialog closed');
  // 탭 / 서랍
  const openTab = async t => { if (narrow) await p.click(`.dtab[data-tab="${t}"]`); else await p.click('#tab-' + t); await p.waitForTimeout(300); };
  await openTab('tempo'); ok(await p.isVisible('#tempoBody'), 'tempo tab shows tempo table');
  ok(!(await p.isVisible('#lineList')), 'inst pane hidden while tempo');
  await openTab('play'); ok(await p.isVisible('#optCount') && await p.isVisible('#sTranspose'), 'play tab: options + sound');
  await openTab('save'); ok(await p.isVisible('#saveBtn') && await p.isVisible('#exportMidiBtn') && await p.isVisible('#setSaveNow') && await p.isVisible('#editExport'), 'save tab: save/export/settings/edits');
  await openTab('inst'); ok(await p.isVisible('#allOn'), 'inst tab');
  if (narrow) {
    ok(await p.evaluate(() => document.body.classList.contains('sheet-open')), 'sheet open');
    await p.click('.dtab[data-tab="inst"]'); await p.waitForTimeout(300);
    ok(!(await p.evaluate(() => document.body.classList.contains('sheet-open'))), 'same tab closes sheet');
  }
  // 음원 저장 단추 → 저장 탭 (넓은 화면)
  if (!narrow) { await p.click('#saveJump'); await p.waitForTimeout(300); ok(await p.isVisible('#saveBtn'), 'saveJump opens save tab'); }
  // 빠르기 빈칸이면 빠르기 탭으로
  if (narrow) await p.click('.dtab[data-tab="tempo"]'); else await p.click('#tab-tempo');
  await p.waitForTimeout(250);
  await p.fill('#tempoBody input[type=number] >> nth=1', ''); await p.dispatchEvent('#tempoBody input[type=number] >> nth=1', 'change').catch(() => {});
  if (narrow) await p.click('#sheetClose'); else await p.click('#tab-inst');
  await p.waitForTimeout(200);
  await p.click('#playBtn'); await p.waitForTimeout(700);
  const t = await p.textContent('#nowText');
  if (/템포를 입력/.test(t)) ok(await p.isVisible('#tempoBody'), 'blocked tempo jumps to tempo tab');
  else console.log('note: tempo not blocked (' + t.slice(0, 20) + ')');
  // 화면 넘침
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(ov <= 0, 'no horizontal overflow (' + ov + ')');
  // 사용법 창
  await p.click('#helpBtn'); await p.waitForTimeout(200); ok(await p.isVisible('#fullHelp'), 'help dialog');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); ok(!(await p.isVisible('#fullHelp')), 'help closes with Esc');
  ok(!errs.length, 'no errors ' + errs.slice(0, 3).join(' | '));
  await b.close();
})();
