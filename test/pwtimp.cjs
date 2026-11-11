// 타악 소리 목록에 팀파니(높은 음 G·낮은 음 C): 예시 장단 줄에서 윗·아랫성부를 팀파니로 골라 WAV 저장 → 소리가 나는지, 짝 소리
const { chromium } = require('playwright'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/^https:\/\//, r => r.abort()); await p.goto('file:///home/claude/scoreplay/index.html#allpanes'); await p.waitForFunction(() => window.__appReady === 'ok');
  if (await p.isVisible('#demoBtn')) await p.click('#demoBtn'); await p.waitForTimeout(500);
  const sels = await p.$$('#lineList select'); let upSel = null;
  for (const s of sels) { const opts = await s.$$eval('option', os => os.map(o => o.value)); if (opts.includes('팀파니높게')) { upSel = upSel || s; } }
  ok(!!upSel, '타악 소리 목록에 팀파니(높은 음·낮은 음)');
  const lab = await p.$eval('#lineList select option[value="팀파니높게"]', o => o.textContent);
  ok(/팀파니/.test(lab), '이름: ' + lab);
  await upSel.selectOption('팀파니높게'); await upSel.dispatchEvent('change'); await p.waitForTimeout(400);
  const vals = await p.$$eval('#lineList select', ss => ss.map(s => s.value).filter(v => /팀파니/.test(v)));
  ok(vals.includes('팀파니높게') && vals.includes('팀파니'), '윗성부 높은 음 → 아랫성부 낮은 음 짝 ' + vals.join(','));
  await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('sCount', false); set('sMetro', false); set('saveFormat', 'wav'); });
  const dl = p.waitForEvent('download', { timeout: 120000 }); await p.click('#saveBtn'); const d = await dl; await d.saveAs('/tmp/timp.wav');
  const buf = fs.readFileSync('/tmp/timp.wav'); let mx = 0; for (let i = 44; i + 1 < buf.length; i += 2) mx = Math.max(mx, Math.abs(buf.readInt16LE(i)));
  ok(mx > 3000, '저장한 소리가 남 (최대 ' + mx + ')');
  ok(!errs.length, '페이지 오류 0 ' + errs.join(' | '));
  await b.close(); console.log(fails ? 'FAILS ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0); })();
