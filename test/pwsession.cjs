// 열어 둔 악보 기억: 같은 탭을 다시 열면(휴대폰이 메모리 때문에 다시 연 경우) 저절로 다시 읽고 설정도 그대로,
// 새 탭에서는 첫 화면 [지난번 악보 다시 열기], 총보를 빼면 잊음, 파트보 묶음도. 휴대폰 화면 입력칸 16px
const { chromium } = require('playwright'); const fs = require('fs');
const SM = process.env.SAMPLES || '/home/claude/samples/'; const pick = pre => { const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t); return t; };
const full = pick('9203ad49'), p1 = pick('71309168'), p2 = pick('52f7f3f4');
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = [];
  const newPage = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route(/^https:\/\/(?!cdn\.jsdelivr|commst\.github\.io).*/, r => r.abort());
    await p.route('https://commst.github.io/scoreplay/**', r => { const f = r.request().url().split('/scoreplay/')[1].split('?')[0] || 'index.html'; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
    await p.goto('https://commst.github.io/scoreplay/'); await p.waitForFunction(() => window.__appReady === 'ok'); return p; };
  const loaded = p => p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 2 && /읽었습니다|파트보/.test(document.getElementById('fileInfo').textContent + document.getElementById('partsFileName').textContent) && !document.body.classList.contains('welcome'), null, { timeout: 150000 });
  const info = p => p.evaluate(() => ({ title: document.getElementById('tbSongName').textContent, n: document.querySelectorAll('#lineList .lcard').length, welcome: document.body.classList.contains('welcome'), resume: !document.getElementById('resumeBtn').hidden, resumeText: document.getElementById('resumeBtn').textContent, msg: document.getElementById('msg').textContent }));
  let p = await newPage();
  let i = await info(p); ok(!i.resume && i.welcome, '처음: 기억한 악보 없음 → 다시 열기 단추 없음');
  await p.setInputFiles('#pdfInput', full); await loaded(p); await p.waitForTimeout(1500);
  // 템포 첫 줄 고치기 → 설정 자동 저장
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); }); await p.click('.dtab[data-tab="tempo"]'); await p.waitForTimeout(400);
  const fs16 = await p.evaluate(() => getComputedStyle(document.querySelector('#tempoBody input')).fontSize);
  ok(fs16 === '16px', '휴대폰 빠르기 입력칸 글자 16px (iOS 저절로 확대 막음) ' + fs16);
  await p.screenshot({ path: '/tmp/sess-tempo.png' });
  await p.fill('#tempoBody tr:first-child input[type=number]:not(:first-child), #tempoBody tr:first-child td:nth-child(3) input', '150').catch(() => {});
  const bpmSel = await p.evaluate(() => { const ins = document.querySelectorAll('#tempoBody tr')[0].querySelectorAll('input'); return ins.length; });
  await p.evaluate(() => { const inp = document.querySelectorAll('#tempoBody tr')[0].querySelectorAll('input')[1]; inp.value = '150'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.waitForTimeout(1500);
  // 같은 탭 다시 열기(휴대폰이 페이지를 다시 연 것과 같음)
  await p.reload(); await p.waitForFunction(() => window.__appReady === 'ok'); await loaded(p); await p.waitForTimeout(1200);
  i = await info(p); ok(!i.welcome && i.n >= 19 && /다시 불러왔습니다/.test(i.msg), '같은 탭 다시 열기 → 저절로 다시 읽음 ' + JSON.stringify(i));
  const bpm = await p.evaluate(() => document.querySelectorAll('#tempoBody tr')[0].querySelectorAll('input')[1].value);
  ok(bpm === '150', '고친 빠르기도 그대로 ' + bpm);
  // 새 탭: 단추
  const q = await newPage(); await q.waitForTimeout(800); i = await info(q);
  ok(i.welcome && i.resume && /다시 열기/.test(i.resumeText), '새 탭: 첫 화면에 [지난번 악보 다시 열기] ' + i.resumeText);
  await q.click('#resumeBtn'); await loaded(q); await q.waitForTimeout(800); i = await info(q);
  ok(!i.welcome && i.n >= 19, '단추로 다시 열림');
  await q.close();
  // 파트보 묶음
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  await p.setInputFiles('#partsInput', [p1, p2]); await p.waitForFunction(() => /2개 파트보 등록됨/.test(document.getElementById('partsFileName').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1500);
  await p.reload(); await p.waitForFunction(() => window.__appReady === 'ok'); await p.waitForFunction(() => /2개 파트보 등록됨/.test(document.getElementById('partsFileName').textContent), null, { timeout: 150000 });
  i = await info(p); ok(i.n === 2 && !i.welcome, '파트보 둘도 다시 열면 그대로 ' + JSON.stringify(i));
  // 모두 빼면 잊음
  await p.evaluate(() => { document.querySelectorAll('#partsFileList .rm').forEach(b => b.click()); }); await p.waitForTimeout(400);
  await p.evaluate(() => { const r = document.querySelector('#partsFileList .rm'); if (r) r.click(); }); await p.waitForTimeout(1000);
  await p.reload(); await p.waitForFunction(() => window.__appReady === 'ok'); await p.waitForTimeout(1500);
  i = await info(p); ok(i.welcome && !i.resume, '모두 빼면 잊음(다시 열어도 첫 화면, 단추 없음) ' + JSON.stringify(i));
  ok(!errs.length, '페이지 오류 0 ' + errs.join(' | '));
  await b.close(); console.log(fails ? 'FAILS ' + fails : 'ALL OK'); process.exit(fails ? 1 : 0);
})();
