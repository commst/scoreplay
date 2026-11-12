// 163번: 총보는 하나만 — 새 총보를 올리면 지금 연 악보(총보·추가한 악보)를 닫고 새 총보를 엶, 여러 개를 놓으면 첫 파일만, 단추 이름 '총보 바꾸기'
// NODE_PATH=/opt/npm-tools/node_modules node test/pwonescore.cjs [index.html]
const { chromium } = require('playwright'); const fs = require('fs');
const html = require('path').resolve(process.argv[2] || 'index.html'), SM = process.env.SAMPLES || '/home/claude/samples/';
const pick = pre => { const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t); return t; };
const A = pick('fe4bc337'), B = pick('e86f5ac0'), X = pick('5d8eb240');   // 밀양아리랑 피리, 홀로아리랑 대금, 밀양아리랑 태평소
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
 for (const [name, vp] of [['desktop', { width: 1280, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: name === 'phone' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + html); await p.waitForFunction(() => window.__appReady === 'ok');
  ok(await p.evaluate(() => !document.getElementById('pdfInput').multiple && document.getElementById('pdfInputLabel').textContent === '총보 추가'), name + ' 총보 칸은 파일 하나만 고름, 처음 단추는 [총보 추가]');
  const loaded = fn => p.waitForFunction(fn => window.__st.fileName === fn && /읽었습니다/.test(document.getElementById('fileInfo').textContent), fn, { timeout: 120000 });
  await p.setInputFiles('#pdfInput', A); await loaded('pick-fe4bc337.pdf');
  await p.setInputFiles('#extraInput', [X]); await p.waitForFunction(() => (window.__st.extras || []).length === 1, null, { timeout: 120000 });
  const st = () => p.evaluate(() => ({ fn: window.__st.fileName, ex: (window.__st.extras || []).length, full: document.querySelectorAll('#fullFileList li').length, lab: document.getElementById('pdfInputLabel').textContent, title: document.getElementById('pdfInputLabel').title }));
  let s = await st();
  ok(s.fn === 'pick-fe4bc337.pdf' && s.ex === 1 && s.full === 1 && s.lab === '총보 바꾸기' && /닫고/.test(s.title), name + ' 총보를 연 뒤 단추는 [총보 바꾸기] ' + JSON.stringify(s));
  await p.setInputFiles('#pdfInput', B); await loaded('pick-e86f5ac0.pdf'); await p.waitForTimeout(500);
  s = await st();
  ok(s.fn === 'pick-e86f5ac0.pdf' && s.ex === 0 && s.full === 1, name + ' 새 총보를 올리면 예전 총보·추가한 악보를 닫고 새 총보만 ' + JSON.stringify(s));
  ok(await p.evaluate(() => /e86f5ac0/.test(document.getElementById('fullFileList').textContent) && !/fe4bc337/.test(document.getElementById('fullFileList').textContent)), name + ' 올린 총보 목록에 새 총보 하나');
  // 상자에 두 파일을 끌어 놓으면 첫 파일만 열고 안내
  const bytes = f => [...fs.readFileSync(f)];
  await p.evaluate(([a, x]) => { const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(a)], 'drop-a.pdf', { type: 'application/pdf' })); dt.items.add(new File([new Uint8Array(x)], 'drop-x.pdf', { type: 'application/pdf' }));
    document.getElementById('drop').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, [bytes(A), bytes(X)]);
  await loaded('drop-a.pdf'); await p.waitForTimeout(400);
  s = await st();
  ok(s.fn === 'drop-a.pdf' && s.ex === 0 && s.full === 1, name + ' 두 파일을 놓으면 첫 파일만 총보로 ' + JSON.stringify(s));
  ok(/하나만/.test(await p.textContent('#msg')), name + ' 안내: ' + (await p.textContent('#msg')).slice(0, 60));
  ok(errs.length === 0, name + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await ctx.close(); }
 await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); })();
