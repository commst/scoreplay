// 새 기능 시험: 마디 골라 빠르기·rit. 넣기, 공유 설정(GitHub는 가짜 서버로)
const { chromium } = require('playwright'); const fs = require('fs');
const pre = '9203ad49', SM = '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
 for (const [name, vp] of [['desktop', { width: 1280, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: name === 'phone' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  const store = {}; const calls = [];
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/api\.github\.com\/.*/, async r => { const q = r.request(), u = q.url().split('?')[0], path = u.split('/contents/')[1]; calls.push(q.method() + ' ' + path + ' auth=' + (q.headers().authorization || '').slice(0, 12));
    if ((q.headers().authorization || '') !== 'Bearer TESTTOKEN') return r.fulfill({ status: 401, body: '{}' });
    if (q.method() === 'GET') return store[path] ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'abc', content: store[path] }) }) : r.fulfill({ status: 404, body: '{}' });
    const body = JSON.parse(q.postData()); store[path] = body.content; return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
  await p.route(/^https:\/\/raw\.githubusercontent\.com\/.*/, r => { const path = r.request().url().split('/main/')[1].split('?')[0]; calls.push('RAW ' + path); return store[path] ? r.fulfill({ status: 200, contentType: 'application/json', body: Buffer.from(store[path], 'base64').toString('utf8') }) : r.fulfill({ status: 404, body: 'x' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|api\.github|raw\.githubusercontent).*/, r => r.abort());
  await p.route('https://commst.github.io/scoreplay/**', r => { const f = r.request().url().split('/scoreplay/')[1].split('?')[0] || 'index.html'; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  const open = async () => { await p.goto('https://commst.github.io/scoreplay/'); await p.setInputFiles('#pdfInput', t);
    await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1500); };
  const tab = async tb => { await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); }); if (name === 'desktop') await p.click('#tab-' + tb); else { if (!(await p.evaluate(() => document.body.classList.contains('sheet-open')))) await p.click(`.dtab[data-tab="${tb}"]`); else await p.click(`.tab2[data-tab="${tb}"]`); } await p.waitForTimeout(300); };
  await open();
  // --- 빠르기: 마디 골라 넣기
  await tab('tempo');
  const n0 = await p.$$eval('#tempoBody tr', x => x.length);
  await p.click('#tempoPick'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.body.classList.contains('picking')), name + ' 고르는 중 표시');
  if (name === 'phone') ok(!(await p.evaluate(() => document.body.classList.contains('sheet-open'))), name + ' 서랍이 내려감');
  await p.$eval('#bars .b[data-n="37"]', e => e.click()); await p.waitForTimeout(500);
  const rows = await p.$$eval('#tempoBody tr', trs => trs.map(tr => [tr.querySelector('input').value, tr.querySelectorAll('input')[1].value]));
  ok(rows.length === n0 + 1 && rows.some(r => r[0] === '37'), name + ' 37마디 빠르기 구간이 생김: ' + JSON.stringify(rows));
  ok(rows.map(r => +r[0]).every((v, i, a) => i === 0 || a[i - 1] < v), name + ' 표가 마디 순서');
  ok(!(await p.evaluate(() => document.body.classList.contains('picking'))), name + ' 고르기 끝남');
  ok(!(await p.evaluate(() => window.__playing)) && /정지|일시/.test(await p.textContent('#nowText')), name + ' 재생되지 않음');
  ok(await p.evaluate(() => document.activeElement && /^tb-/.test(document.activeElement.id)), name + ' BPM 칸에 초점');
  // 같은 마디에 또 넣으면 늘지 않음
  if (name === 'phone') await p.keyboard.press('Escape').catch(() => {});
  await tab('tempo'); await p.click('#tempoPick'); await p.waitForTimeout(200); await p.$eval('#bars .b[data-n="37"]', e => e.click()); await p.waitForTimeout(400);
  ok((await p.$$eval('#tempoBody tr', x => x.length)) === n0 + 1, name + ' 같은 마디는 한 번만');
  // Esc 취소
  await tab('tempo'); await p.click('#ritPick'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => document.body.classList.contains('picking'))), name + ' Esc로 취소');
  // --- rit.: 마디 골라 넣기
  const r0 = await p.$$eval('#tchgBody tr:not(.sum)', x => x.length);
  await tab('tempo'); await p.click('#ritPick'); await p.waitForTimeout(200); await p.$eval('#bars .b[data-n="50"]', e => e.click()); await p.waitForTimeout(500);
  const rr = await p.$$eval('#tchgBody tr:not(.sum)', trs => trs.map(tr => tr.querySelector('input').value + tr.querySelector('select').value));
  ok(rr.length === r0 + 1 && rr.includes('50rit'), name + ' 50마디 rit.가 생김: ' + rr.join(','));
  // --- 시작 마디를 바꾸면 뒤 구간·rit.도 함께 옮김 (37 → 41: 117 → 121, 121 → 125, rit 50 → 54)
  await tab('tempo');
  await p.$eval('#ts-1', e => { e.value = 41; e.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(500);
  const sh = await p.$$eval('#tempoBody tr', trs => trs.map(tr => tr.querySelector('input').value)).then(a => a.join(','));
  const shr = await p.$$eval('#tchgBody tr:not(.sum)', trs => trs.map(tr => tr.querySelector('input').value + tr.querySelector('select').value));
  ok(sh === '1,41,121,125' && shr.includes('54rit'), name + ' 함께 옮김: ' + sh + ' / ' + shr.join(','));
  // 넘치면 막음
  await p.$eval('#ts-1', e => { e.value = 100; e.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(400);
  ok((await p.$$eval('#tempoBody tr', trs => trs.map(tr => tr.querySelector('input').value))).join(',') === '1,41,121,125' && /넘습니다/.test(await p.textContent('#msg')), name + ' 마지막 마디를 넘으면 막음');
  // 끄면 그 구간만
  await p.uncheck('#tempoShift'); await p.$eval('#ts-1', e => { e.value = 37; e.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(400);
  ok((await p.$$eval('#tempoBody tr', trs => trs.map(tr => tr.querySelector('input').value))).join(',') === '1,37,121,125', name + ' 끄면 그 구간만');
  await p.check('#tempoShift');
  // --- 공유 설정
  await tab('save');
  await p.click('#ghSave'); await p.waitForTimeout(400);
  ok(/토큰/.test(await p.textContent('#ghState')) && await p.evaluate(() => document.getElementById('ghTokenBox').open), name + ' 토큰 없으면 안내');
  await p.fill('#ghToken', 'WRONG'); await p.click('#ghTokenSave'); await p.click('#ghSave'); await p.waitForTimeout(800);
  ok(/맞지 않/.test(await p.textContent('#ghState')), name + ' 틀린 토큰 안내: ' + await p.textContent('#ghState'));
  await p.fill('#ghToken', 'TESTTOKEN'); await p.click('#ghTokenSave'); await p.click('#ghSave'); await p.waitForTimeout(1200);
  ok(/저장했습니다/.test(await p.textContent('#ghState')), name + ' 저장: ' + await p.textContent('#ghState'));
  const path = Object.keys(store)[0]; ok(path && /^settings\/[0-9a-z-]+\.json$/i.test(path), name + ' 파일 경로 ' + path);
  const S = JSON.parse(Buffer.from(store[path], 'base64').toString('utf8'));
  ok(S.format === 'hapju-settings' && S.tempoRows.some(r => r.start === 37) && (S.tempoChanges || []).some(c => c.bar === 54) && !!S.key, name + ' 올린 내용(빠르기 37·rit 50·제목 ' + S.title + ')');
  // 다른 기기(저장된 것 없음, 토큰 없음): 열면 자동으로 받음
  await p.evaluate(() => localStorage.clear()); await open(); await p.waitForTimeout(1500);
  const rows2 = await p.$$eval('#tempoBody tr', trs => trs.map(tr => tr.querySelector('input').value));
  ok(rows2.includes('37'), name + ' 새 기기: 공유 설정 자동 적용 ' + rows2.join(','));
  ok(/불러왔습니다/.test(await p.textContent('#ghState')), name + ' 새 기기 상태: ' + await p.textContent('#ghState'));
  ok(calls.some(c => c.startsWith('RAW ')), name + ' 토큰 없이 raw 주소로 받음');
  // 이 기기에서 설정을 바꾼 뒤(로컬 있음) 저장소가 새로 바뀌면: 알리기만
  const S2 = { ...S, saved: new Date(Date.now() + 60000).toISOString(), tempoRows: S.tempoRows.filter(r => r.start !== 37) }; store[path] = Buffer.from(JSON.stringify(S2)).toString('base64');
  await open(); await p.waitForTimeout(1500);
  ok((await p.$$eval('#tempoBody tr', trs => trs.map(tr => tr.querySelector('input').value))).includes('37') && /새 공유 설정/.test(await p.textContent('#ghState')), name + ' 로컬 설정이 있으면 덮지 않고 알림');
  await tab('save'); await p.click('#ghLoad'); await p.waitForTimeout(1500);
  { const rws = await p.$$eval('#tempoBody tr', trs => trs.map(tr => tr.querySelector('input').value)); ok(!rws.includes('37'), name + ' [공유 설정 불러오기]로 받음: ' + rws.join(',') + ' / ' + await p.textContent('#ghState')); }
  ok(errs.length === 0, name + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await ctx.close(); }
 await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); })();
