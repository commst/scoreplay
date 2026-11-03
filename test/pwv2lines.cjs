// 악기 줄 접기·펼치기 시험: node pwv2lines.cjs <html> <w> <h> <outprefix>
const { chromium } = require('playwright'); const fs = require('fs');
const [, , HTML, W = '1366', H = '860', OUT] = process.argv;
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 900 })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + HTML); await p.waitForTimeout(300);
  await p.setInputFiles('#pdfInput', pick('44e95fb3'));
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 60000 }); await p.waitForTimeout(600);
  if (+W <= 900) { await p.click('.dtab[data-tab="inst"]'); await p.waitForTimeout(300); }
  const cards = () => p.$$eval('#lineList .lcard', cs => cs.map(c => ({ open: c.classList.contains('open'), off: c.classList.contains('off'), h: c.offsetHeight, name: c.querySelector('.lname').textContent })));
  let cs = await cards(); const on0 = cs.filter(c => !c.off).length;
  ok(cs.every(c => !c.open), 'all folded at start; heights ' + cs.slice(0, 4).map(c => c.h).join(','));
  ok(await p.isVisible('#expandAll'), 'expand-all visible');
  if (OUT) await p.screenshot({ path: OUT + '-folded.png' });
  // 켜진 첫 줄: 소리·음량이 접힌 채로 보인다
  ok(await p.isVisible('#lineList .lcard:not(.off) .k-snd select'), 'sound select visible when folded');
  ok(!(await p.isVisible('#lineList .lcard:not(.off) .seg')), 'role seg hidden when folded');
  // 펼치기
  await p.click('#lineList .lcard:not(.off) .lfold'); await p.waitForTimeout(200);
  ok(await p.isVisible('#lineList .lcard.open .seg'), 'open shows role seg');
  await p.click('#lineList .lcard.open .lfold'); await p.waitForTimeout(200);
  ok(!(await p.$('#lineList .lcard.open')), 'fold again');
  // 꺼진 줄 켜기
  const offIdx = cs.findIndex(c => c.off);
  await p.click(`#lineList .lcard:nth-child(${offIdx + 1}) .lsw`); await p.waitForTimeout(1500);
  cs = await cards(); ok(!cs[offIdx].off && cs.filter(c => !c.off).length === on0 + 1, 'switch turns line on: ' + cs[offIdx].name);
  await p.click(`#lineList .lcard:nth-child(${offIdx + 1}) .lsw`); await p.waitForTimeout(1500);
  cs = await cards(); ok(cs[offIdx].off, 'switch turns line off again');
  // 모두 펼치기
  await p.click('#expandAll'); await p.waitForTimeout(300);
  cs = await cards(); ok(cs.filter(c => !c.off).every(c => c.open) && cs.filter(c => c.off).every(c => !c.open), 'expand all opens only on-lines');
  ok(/접기/.test(await p.textContent('#expandAll')), 'button says 모두 접기');
  if (OUT) await p.screenshot({ path: OUT + '-expanded.png' });
  await p.click('#expandAll'); await p.waitForTimeout(300); cs = await cards(); ok(cs.every(c => !c.open), 'collapse all');
  // 솔로 단추가 접힌 줄에서 동작
  await p.click('#lineList .lcard:not(.off) .sm-row .solo'); await p.waitForTimeout(300);
  ok(await p.isVisible('#soloBar'), 'solo from folded row');
  await p.click('#soloClear');
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(ov <= 0, 'no overflow');
  ok(!errs.length, 'no errors ' + errs.join(' | '));
  await b.close();
})();
