// 휴대폰 서랍: 악기 칸을 끝까지 굴려도 탭 줄과 ✕가 서랍 맨 위에 보이고 눌리는지 (세로·가로), 컴퓨터 왼쪽 탭은 그대로
const { chromium } = require('playwright'); const fs = require('fs');
const pre = '9203ad49', SM = process.env.SAMPLES || '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
 for (const [name, vp] of [['phone', { width: 390, height: 844 }], ['phoneLand', { width: 844, height: 390 }], ['tablet', { width: 820, height: 1180 }], ['desktop', { width: 1280, height: 860 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: name !== 'desktop', isMobile: name.startsWith('phone') }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|commst\.github\.io).*/, r => r.abort());
  await p.route('https://commst.github.io/scoreplay/**', r => { const f = r.request().url().split('/scoreplay/')[1].split('?')[0] || 'index.html'; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto('https://commst.github.io/scoreplay/'); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  if (name === 'desktop') {
    await p.click('#tab-inst'); await p.evaluate(() => { const s = document.getElementById('sidebar'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(300);
    const r = await p.evaluate(() => { const s = document.getElementById('sidebar').getBoundingClientRect(), t = document.getElementById('tab-inst').getBoundingClientRect(); return { d: t.top - s.top, closeShown: getComputedStyle(document.getElementById('sheetClose')).display !== 'none' }; });
    ok(r.d >= 0 && r.d < 12 && !r.closeShown, name + ' 굴려도 탭이 칸 맨 위, ✕ 없음 ' + JSON.stringify(r));
  } else {
    await p.click('.dtab[data-tab="inst"]'); await p.waitForTimeout(500);
    const before = await p.evaluate(() => { const s = document.getElementById('sidebar'), x = document.getElementById('sheetClose').getBoundingClientRect(); return { top: x.top - s.getBoundingClientRect().top, sh: s.scrollHeight, ch: s.clientHeight }; });
    await p.evaluate(() => { const s = document.getElementById('sidebar'); s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(400);
    const after = await p.evaluate(() => { const s = document.getElementById('sidebar'), sr = s.getBoundingClientRect(), x = document.getElementById('sheetClose').getBoundingClientRect(), t = document.getElementById('tab-inst').getBoundingClientRect();
      const el = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2); return { top: x.top - sr.top, tabTop: t.top - sr.top, st: s.scrollTop, hit: !!el && (el.id === 'sheetClose' || !!el.closest('#sheetClose')) }; });
    ok(before.sh > before.ch + 50 && after.st > 50, name + ' 서랍이 실제로 굴러감 ' + JSON.stringify([before.sh, before.ch, after.st]));
    ok(after.top >= 0 && after.top <= before.top + 1 && before.top - after.top <= 16 && after.tabTop >= 0 && after.tabTop < 30 && after.hit, name + ' 굴린 뒤에도 ✕·탭이 맨 위에 보이고 눌림(손잡이 14px만 말려 올라감) ' + JSON.stringify({ before: before.top, after }));
    await p.click('#sheetClose'); await p.waitForTimeout(500);
    ok(!(await p.evaluate(() => document.body.classList.contains('sheet-open'))), name + ' ✕로 닫힘');
    await p.click('.dtab[data-tab="inst"]'); await p.waitForTimeout(500);
    await p.screenshot({ path: `/tmp/sheetx-${name}.png` });
  }
  ok(!errs.length, name + ' 페이지 오류 0 ' + errs.join(' | '));
  await ctx.close();
 }
 await b.close(); console.log(fails ? 'FAILS ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
