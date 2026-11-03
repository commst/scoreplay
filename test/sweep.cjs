// 샘플 전곡 앱 점검: node sweep.cjs <html> <out.json> [startIdx] [endIdx]
const { chromium } = require('playwright'); const fs = require('fs');
const [, , HTML, OUT, S0 = '0', S1 = '999'] = process.argv;
const SM = '/home/claude/samples/'; const files = fs.readdirSync(SM).filter(f => /\.pdf$/i.test(f)).sort().slice(+S0, +S1);
(async () => {
  const b = await chromium.launch(); const res = [];
  for (const f of files) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 860 } }); const p = await ctx.newPage();
    const errs = [], warns = [];
    p.on('pageerror', e => errs.push('PAGE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); else if (m.type() === 'warning') warns.push(m.text()); });
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const x = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + x, contentType: 'text/javascript' }); });
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    const r = { f }; const t0 = Date.now();
    try {
      await p.goto('file://' + HTML); await p.waitForTimeout(200);
      await p.setInputFiles('#pdfInput', SM + f);
      await p.waitForFunction(() => !document.body.classList.contains('welcome') || /못|없|않/.test(document.getElementById('fileName').textContent + document.getElementById('msg').textContent), null, { timeout: 120000 });
      await p.waitForTimeout(800);
      r.loadMs = Date.now() - t0;
      Object.assign(r, await p.evaluate(() => ({
        welcome: document.body.classList.contains('welcome'), msg: document.getElementById('msg').hidden ? '' : document.getElementById('msg').textContent.slice(0, 160),
        info: document.getElementById('fileInfo').textContent.slice(0, 120), song: document.getElementById('tbSongName').textContent + ' | ' + document.getElementById('tbSongInfo').textContent,
        lines: document.querySelectorAll('#lineList .lcard').length, on: document.querySelectorAll('#lineList .lcard:not(.off)').length,
        bars: document.querySelectorAll('#bars .b').length, warnBars: document.querySelectorAll('#bars .b.warn').length,
        tempoNeed: document.querySelectorAll('#tempoBody input.need').length, tempoRows: document.querySelectorAll('#tempoBody tr').length,
        reh: document.querySelectorAll('#rehBtns button').length, warnList: document.getElementById('warnList').textContent.slice(0, 160),
        names: [...document.querySelectorAll('#lineList .lname')].map(e => e.textContent).join(' / ').slice(0, 200)
      })));
      if (!r.welcome && r.bars) {
        if (r.tempoNeed) { await p.evaluate(() => { document.querySelectorAll('#tempoBody input.need').forEach(i => { i.value = 90; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }); }); }
        await p.click('#playBtn'); const t1 = Date.now();
        await p.waitForFunction(() => /마디/.test(document.getElementById('nowText').textContent) && !/만드는/.test(document.getElementById('nowText').textContent), null, { timeout: 90000 }).catch(() => {});
        r.renderMs = Date.now() - t1; await p.waitForTimeout(1500);
        r.now = (await p.textContent('#nowText')).slice(0, 60);
        await p.click('#barsStopBtn');
        await p.click('#viewScore'); await p.waitForTimeout(2500);
        r.score = await p.evaluate(() => ({ hidden: document.getElementById('scoreView').hidden, canv: document.querySelectorAll('#svWrap canvas').length, text: document.getElementById('svWrap').textContent.slice(0, 80) }));
        await p.click('#viewMap');
      }
    } catch (e) { r.fail = String(e.message).slice(0, 200); }
    r.errs = errs.slice(0, 5); r.warns = [...new Set(warns)].slice(0, 3);
    res.push(r); fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
    console.log(f, r.fail ? 'FAIL ' + r.fail.slice(0, 80) : `bars ${r.bars} lines ${r.lines} need ${r.tempoNeed} err ${errs.length} ${r.loadMs}ms ${r.renderMs || ''}ms`);
    await ctx.close();
  }
  await b.close();
})();
