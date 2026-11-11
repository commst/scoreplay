// [문제점 신고하기]: 단추 자리(위 막대·첫 화면·사용법 창), 미리 채움, 전송(FormSubmit는 가짜 응답), 실패하면 메일 앱으로 넘길지 물음
const { chromium } = require('playwright'); const fs = require('fs');
const pre = '9203ad49', SM = process.env.SAMPLES || '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
 for (const [name, vp] of [['desktop', { width: 1280, height: 860 }], ['laptop', { width: 1024, height: 700 }], ['tablet', { width: 820, height: 1180 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: name === 'phone' || name === 'tablet' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const dlg = []; let accept = true; p.on('dialog', d => { dlg.push(d.message()); accept ? d.accept() : d.dismiss(); });
  let mode = 'ok'; const sent = [];
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/formsubmit\.co\/.*/, r => { sent.push({ url: r.request().url(), body: JSON.parse(r.request().postData() || '{}') });
    if (mode === 'ok') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"true","message":"The form was submitted successfully."}' });
    if (mode === 'activate') return r.fulfill({ status: 200, contentType: 'application/json', body: '{"success":"false","message":"This form needs Activation."}' });
    return r.abort(); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|formsubmit|commst\.github\.io).*/, r => r.abort());
  await p.route('https://commst.github.io/scoreworks/**', r => { const f = r.request().url().split('/scoreworks/')[1].split('?')[0] || 'index.html'; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto('https://commst.github.io/scoreworks/'); await p.waitForTimeout(800);
  const vis = id => p.evaluate(id => { const e = document.getElementById(id); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, id);
  // 위 막대: 넓은 화면에서는 [사용설명서 받기] 오른쪽에 간격을 두고, 좁은 화면에서는 숨김(첫 화면·사용법 창에 있음)
  const wide = vp.width > 900;
  ok((await vis('reportBtn')) === wide, name + ' 위 막대 단추 ' + (wide ? '보임' : '숨김'));
  if (wide) { const g = await p.evaluate(() => { const a = document.getElementById('manualBtn').getBoundingClientRect(), c = document.getElementById('reportBtn').getBoundingClientRect(); return [c.left - a.right, Math.abs(c.top - a.top)]; }); ok(g[0] >= 12 && g[1] < 2, name + ' [사용설명서 받기] 옆에 간격 ' + g.join(',')); }
  ok(await p.evaluate(() => { const t = document.getElementById('topbar'); return t.scrollWidth <= t.clientWidth + 1 && [...t.children].every(c => { const r = c.getBoundingClientRect(); return r.width === 0 || r.right <= innerWidth + 1; }); }), name + ' 위 막대가 넘치지 않음');
  ok(!(await p.$('#reportBtn2')) && !(await p.$('#histBtn3')) && !(await p.$('#manualBtn2')), name + ' 첫 화면 소개의 단추 줄 없음');
  if (wide) { const ws = await p.$$eval('.topbar .tb-btn', bs => bs.filter(b => b.getBoundingClientRect().width > 0).map(b => [b.id, Math.round(b.getBoundingClientRect().width)]));
    ok(ws.map(x => x[0]).join() === 'histBtn,helpBtn,manualBtn,reportBtn' && new Set(ws.map(x => x[1])).size === 1, name + ' 첫 화면 위 막대 단추 순서·같은 너비 ' + JSON.stringify(ws));
    ok(await p.$eval('#reportBtn', e => { const c = getComputedStyle(e).color.match(/\d+/g).map(Number); return c[0] > c[1] + 60 && c[0] > c[2] + 60; }), name + ' 신고 단추 빨간 글씨');
    ok((await p.textContent('#helpBtn .ll')).trim() === '프로그램 사용법' && /사용법/.test(await p.evaluate(() => [...document.querySelectorAll('#helpBtn span')].filter(e => e.offsetWidth).map(e => e.textContent).join(''))) && (await p.getAttribute('#helpBtn', 'title')) === '프로그램 사용법', name + ' 사용법 단추(넓으면 \'프로그램 사용법\', 좁으면 \'사용법\', 마우스를 올리면 전체 이름)'); }
  // 예시 장단(악보 없음)에서 열기: 곡명·마디 빈 칸
  if (wide) await p.click('#reportBtn'); else { await p.click('#helpBtn'); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('reportBtn3').click()); } await p.waitForTimeout(300);
  ok(await p.evaluate(() => !!document.querySelector('.rep-dlg') && document.getElementById('repSong').value === '' && document.getElementById('repBar').value === '' && document.querySelector('input[name=repKind]:checked').value === '문제'), name + ' 창 열림·빈 칸·분류 기본 문제');
  ok(await p.evaluate(() => { const d = document.querySelector('.rep-dlg').getBoundingClientRect(); return d.left >= -1 && d.right <= innerWidth + 1 && d.top >= -1; }), name + ' 창이 화면 안');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(!(await p.$('.rep-dlg')), name + ' Esc로 닫힘');
  // 악보를 올리고 열기: 곡명 미리 채움
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  // 사용법 창의 단추로 열기
  await p.evaluate(() => document.getElementById('helpBtn').click()); await p.waitForTimeout(300);
  ok(await vis('reportBtn3'), name + ' 사용법 창 단추 보임');
  await p.evaluate(() => document.getElementById('reportBtn3').click()); await p.waitForTimeout(300);
  const song = await p.$eval('#repSong', e => e.value);
  ok(song.length > 0, name + ' 곡명 미리 채움: ' + song);
  // 전송 성공
  await p.check('input[name=repKind][value="기능개선"]'); await p.fill('#repBar', '12'); await p.fill('#repBody', '시험 제보입니다');
  mode = 'ok'; sent.length = 0; await p.click('.rep-dlg button[type=submit]'); await p.waitForTimeout(800);
  const B = (sent[0] || {}).body || {};
  ok(sent.length === 1 && /formsubmit\.co\/ajax\/.+@.+/.test(sent[0].url), name + ' FormSubmit로 한 번 보냄');
  ok(B['분류'] === '기능개선' && B['곡명'] === song && B['마디 위치'] === '12' && B['내용'] === '시험 제보입니다' && /앱 판/.test(B['환경'] || '') && /기능개선/.test(B._subject) && /12마디/.test(B._subject), name + ' 보낸 내용: ' + B._subject);
  ok(/보냈습니다/.test(await p.textContent('.rep-dlg .rep-state')) && await p.$eval('.rep-dlg button[type=submit]', e => e.hidden), name + ' 보냄 안내');
  await p.click('.rep-dlg .ed-foot .btn'); await p.waitForTimeout(200); ok(!(await p.$('.rep-dlg')), name + ' 닫기');
  // 내용이 비면 물어봄(취소하면 안 보냄)
  await p.evaluate(() => document.getElementById('reportBtn3').click()); await p.waitForTimeout(300);
  accept = false; dlg.length = 0; sent.length = 0; await p.click('.rep-dlg button[type=submit]'); await p.waitForTimeout(400); accept = true;
  ok(dlg.some(m => /비어 있습니다/.test(m)) && sent.length === 0, name + ' 빈 내용은 물어보고 취소하면 안 보냄');
  // 확인 전(Activation)·연결 실패: 메일 앱으로 넘길지 물음 (취소 → 그대로)
  for (const m of ['activate', 'fail']) {
    mode = m; await p.fill('#repBody', '실패 시험'); accept = false; dlg.length = 0; await p.click('.rep-dlg button[type=submit]'); await p.waitForTimeout(800); accept = true;
    ok(dlg.some(x => /메일 앱/.test(x)) && /보내지 못했습니다/.test(await p.textContent('.rep-dlg .rep-state')) && (await p.$eval('#repBody', e => e.value)) === '실패 시험', name + ' ' + m + ': 메일 앱 안내, 적은 내용 남음');
  }
  await p.keyboard.press('Escape');
  ok(errs.length === 0, name + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await ctx.close(); }
 await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); })();
