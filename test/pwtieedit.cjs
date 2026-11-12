// 168번: 음 수정 창의 붙임줄 잇기/끊기 — node test/pwtieedit.cjs <html> [desktop|mobile]
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright'); const fs = require('fs');
const FILE = require('path').resolve(process.argv[2] || 'index.html'), MODE = process.argv[3] || 'desktop';
const pdf = '/tmp/pick-b3a31a97.pdf'; fs.copyFileSync('/home/claude/samples/' + fs.readdirSync('/home/claude/samples').find(f => f.startsWith('b3a31a97')), pdf);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext(MODE === 'mobile' ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 900 } });
  const errs = []; const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
    await p.goto('file://' + FILE + '#allpanes'); await p.waitForFunction(() => window.__appReady === 'ok');
    await p.setInputFiles('#pdfInput', pdf); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(800);
    await p.click('#allOn'); await p.waitForTimeout(2500); return p; };
  let p = await open();
  // 선율 줄에서 붙임줄로 이어 읽은 음이 있는 마디와, 같은 높이 음이 연달아 나오는 마디 찾기
  const found = await p.evaluate(() => { const st = window.__st; let tieBar = null, joinBar = null;
    for (const [k, r] of Object.entries(st.lineRes)) { if (!st.lineIds.map(String).includes(String(k)) && !st.lineIds.includes(k)) continue;
      for (let i = 1; i < r.bars.length && (!tieBar || !joinBar); i++) { const bb = r.bars[i];
        if (!tieBar && bb.events.some(e => e.tie && e.midis && e.midis.length)) tieBar = { k, n: bb.number, i };
        if (!joinBar && bb.events.length && !bb.events.some(e => e.tie)) { const f = bb.events.filter(e => e.voice === 'R' && e.midis && e.midis.length).sort((a, c) => a.t.v - c.t.v)[0];
          const pv = r.bars[i - 1].events.filter(e => e.voice === 'R' && e.midis && !e.tie);
          if (f && f.t.v === 0 && pv.some(e => Math.abs(e.t.v + e.dur.v - r.bars[i - 1].barLen.v) < 1e-9 && e.midis.join() === f.midis.join())) joinBar = { k, n: bb.number, i }; } } }
    return { tieBar, joinBar }; });
  ok(found.tieBar && found.joinBar, MODE + ' 시험 마디 찾음 ' + JSON.stringify(found));
  const openEd = async n => { await p.evaluate(n => window.__openEditor(n), n); await p.waitForSelector('.edit-dlg'); };
  const evAt = (k, i, pick) => p.evaluate(([k, i, pick]) => { const r = window.__st.lineRes[k]; const evs = r.bars[i].events.filter(e => e.midis && e.midis.length); const e = pick === 'tie' ? evs.find(e => e.tie || e.untied) : evs.filter(e => e.voice === 'R').sort((a, c) => a.t.v - c.t.v)[0]; return e ? { tie: !!e.tie, untied: !!e.untied, tieEd: !!e.tieEd } : null; }, [k, i, pick]);
  // ① 이어 읽은 음 끊기
  const T = found.tieBar; await openEd(T.n);
  ok(await p.locator('.ed-voice', { hasText: '붙임줄로 앞 음에 이어 읽은 음' }).count() > 0, MODE + ' 창에 \'붙임줄로 이어 읽은 음\' 칸');
  const tb = p.locator('.ed-row .ed-tie.on', { hasText: '이어 감' }).last(); await tb.click(); await p.waitForTimeout(500);
  const anyBar = (n, f) => p.evaluate(([n, f]) => Object.values(window.__st.lineRes).some(r => { const bb = r.bars.find(x => x.number === n); return bb && bb.events.some(e => f === 'un' ? e.untied && !e.tie : e.tieEd && e.tie); }), [n, f]);
  ok(await anyBar(T.n, 'un'), MODE + ' [이어 감] 누르면 붙임줄 끊김(다시 침)');
  ok(await p.locator('.ed-row .ed-tie', { hasText: '다시 침' }).count() > 0 && await p.locator('.ed-row.changed').count() > 0, MODE + ' 버튼이 [다시 침], 고친 줄 표시');
  // ② 같은 높이 음을 앞 음과 잇기
  const J = found.joinBar; await openEd(J.n);
  e = await evAt(J.k, J.i, 'first'); ok(e && !e.tie, MODE + ' 잇기 전: 새로 치는 음');
  const sec = p.locator('.ed-line').filter({ has: p.locator('.ed-row') });
  const btn = p.locator('.ed-row .ed-tie', { hasText: '앞 음과 잇기' }).first(); await btn.click(); await p.waitForTimeout(500);
  ok(await anyBar(J.n, 'ed'), MODE + ' [앞 음과 잇기] → 붙임줄(tieEd)');
  ok(await p.locator('.ed-row .ed-tie.on', { hasText: '이어 감' }).count() > 0, MODE + ' 버튼이 [이어 감]');
  // ③ 다시 열어도 그대로(저장)
  await p.close(); p = await open();
  const anyBar2 = (n, f) => p.evaluate(([n, f]) => Object.values(window.__st.lineRes).some(r => { const bb = r.bars.find(x => x.number === n); return bb && bb.events.some(e => f === 'un' ? e.untied && !e.tie : e.tieEd && e.tie); }), [n, f]);
  ok(await anyBar2(T.n, 'un') && await anyBar2(J.n, 'ed'), MODE + ' 다시 열어도 붙임줄 수정이 그대로');
  // ④ 되돌리기
  await openEd(T.n); await p.locator('.ed-row.changed .ed-rev').first().click(); await p.waitForTimeout(500);
  ok(!(await anyBar2(T.n, 'un')), MODE + ' ↺ 되돌리면 다시 붙임줄');
  ok(errs.length === 0, MODE + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0); })();
