const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const s = SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(s, t); return t; }   // 한글 파일 이름은 setInputFiles가 올리지 못해 영어 이름으로 복사;
(async () => { const b = await chromium.launch(); let bad = 0;
 for (const [w, h] of [[1024, 768], [1180, 820], [893, 533], [844, 390]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true })).newPage();
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.setInputFiles('#pdfInput', pick('b3a31a97'));
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && !document.body.classList.contains('welcome'), null, { timeout: 90000 }); await p.waitForTimeout(600);
  // 위 막대를 두 줄로(글자 크게): 탭이 그 아래로 내려와야 한다
  await p.addStyleTag({ content: '.topbar { font-size: 22px !important; } .tb-btn { padding: 14px 20px !important; }' }); await p.evaluate(() => { document.getElementById('tbSongName').textContent = '아주 긴 곡 제목으로 위 막대가 두 줄이 되는지 보기 위한 이름'; }); await p.waitForTimeout(400);
  await p.evaluate(() => window.scrollTo(0, 99999)); await p.waitForTimeout(300);
  // 좁은 화면은 아래 서랍 단추로 '악기' 칸을 연다
  const dt = await p.$('.dtab'); if (dt && await dt.isVisible()) { await p.tap('.dtab[data-tab="tempo"]'); await p.waitForTimeout(500); }
  const r = await p.evaluate(() => { const tb = document.getElementById('topbar').getBoundingClientRect(); return [...document.querySelectorAll('.tab2')].map(el => { const q = el.getBoundingClientRect(); const hit = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { t: el.textContent.trim(), top: Math.round(q.top), ok: !!hit && el.contains(hit) }; }).concat([{ t: 'topbar', top: Math.round(tb.bottom), ok: true }]); });
  // 탭을 실제로 눌러 바뀌는지
  await p.tap('.tab2[data-tab="play"]').catch(e => console.log('tap fail', e.message.slice(0, 80)));
  await p.waitForTimeout(300);
  const on = await p.evaluate(() => document.querySelector('.pane2.on') && document.querySelector('.pane2.on').id);
  const ok = r.filter(x => x.t !== 'topbar').every(x => x.ok) && on === 'pane-play'; if (!ok) bad++;
  console.log(ok ? 'ok  ' : 'FAIL', `${w}x${h}`, r.map(x => x.t + '@' + x.top + (x.ok ? '' : '✗')).join(' '), '| 연주 탭 누름 →', on);
  await p.screenshot({ path: `/home/claude/work/tab2_${w}x${h}.png` });
 }
 await b.close(); process.exitCode = bad ? 1 : 0; })();
