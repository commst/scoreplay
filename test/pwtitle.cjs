// 곡 제목 바꾸기: 악보 파일 창에서 고치면 위 막대·설정에 반영, 다시 열면 그대로, [악보 제목으로] 되돌리기
const { chromium } = require('playwright'); const fs = require('fs');
const pre = '9203ad49', SM = process.env.SAMPLES || '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
 for (const [name, vp] of [['desktop', { width: 1280, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: name === 'phone' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|commst\.github\.io).*/, r => r.abort());
  await p.route('https://commst.github.io/scoreworks/**', r => { const f = r.request().url().split('/scoreworks/')[1].split('?')[0] || 'index.html'; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  const open = async () => { await p.goto('https://commst.github.io/scoreworks/'); await p.setInputFiles('#pdfInput', t);
    await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1200);
    await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); }); };
  await p.goto('https://commst.github.io/scoreworks/'); await p.waitForTimeout(500);
  ok(await p.$eval('#songRename', e => e.hidden), name + ' 악보 없을 때 곡 제목 칸 숨김');
  await open();
  const orig = await p.textContent('#tbSongName');
  await p.click('#tbSong'); await p.waitForTimeout(300);
  ok(await p.$eval('#songRename', e => !e.hidden && e.getBoundingClientRect().height > 0), name + ' 곡 이름을 누르면 곡 제목 칸이 보임');
  ok((await p.$eval('#songTitleIn', e => e.value)) === orig, name + ' 처음 값 = 읽은 제목 ' + orig);
  await p.fill('#songTitleIn', '프론티어 연습'); await p.press('#songTitleIn', 'Enter'); await p.waitForTimeout(1200);
  ok((await p.textContent('#tbSongName')) === '프론티어 연습', name + ' 위 막대에 바뀐 제목, [악보 제목으로] 보임');
  const saved = await p.evaluate(() => Object.keys(localStorage).filter(k => /^hapju-set/.test(k)).map(k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }).filter(Boolean));
  ok(saved.some(S => S.songTitle === '프론티어 연습' && S.titleRead === orig), name + ' 설정에 저장(songTitle·titleRead)');
  await open(); await p.waitForTimeout(800);
  ok((await p.textContent('#tbSongName')) === '프론티어 연습', name + ' 다시 열면 바뀐 제목 유지');
  await p.click('#tbSong'); await p.waitForTimeout(300);
  await p.fill('#songTitleIn', ''); await p.press('#songTitleIn', 'Enter'); await p.waitForTimeout(1200);
  ok((await p.textContent('#tbSongName')) === orig && (await p.$eval('#songTitleIn', e => e.value)) === orig, name + ' 비우면 읽은 제목으로 되돌림');
  await p.fill('#songTitleIn', '   '); await p.press('#songTitleIn', 'Enter'); await p.waitForTimeout(300);
  ok((await p.textContent('#tbSongName')) === orig, name + ' 빈 칸이면 읽은 제목');
  ok(errs.length === 0, name + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await ctx.close(); }
 await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); })();
