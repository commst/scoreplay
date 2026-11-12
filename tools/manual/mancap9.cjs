// 사용설명서 그림: 27_tone_tab(음색 칸: 태평소를 펼쳐 음량 80%·높은음 −3dB), 28_report(문제점 신고하기 창, 악보 파일 첨부 체크)
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const t = '/tmp/manual-pick/Yeonbyeon-Mokga-score.pdf'; fs.mkdirSync('/tmp/manual-pick', { recursive: true }); fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t); return t; };
const O = '/home/claude/work/manual/img/', HTML = 'file:///home/claude/web/deploy-hapju/index.html';
(async () => { const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme: 'light', locale: 'ko-KR' })).newPage();
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: '/home/claude/work/fonts/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const fp = '/home/claude/work/fonts/node_modules/pretendard/dist/web/variable/' + r.request().url().split('/variable/')[1].replace('.min.css', '.css'); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto(HTML); await p.evaluate(() => document.fonts.ready);
  await p.setInputFiles('#pdfInput', pick('b3a31a97'));
  await p.waitForFunction(() => !document.body.classList.contains('welcome') && document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 90000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  // 27: 음색 칸
  await p.click('#tab-tone'); await p.waitForTimeout(400);
  const set = (id, f, v) => p.evaluate(([id, f, v]) => { const c = document.querySelector(`.tone-card[data-id="${id}"]`), i = [...c.querySelectorAll('input[type=range]')].find(e => e.id.endsWith('-' + f)); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [id, f, v]);
  await set('taepyeongso', 'vol', 80); await set('taepyeongso', 'hi', -3); await set('북', 'mid', 4);
  await p.evaluate(() => { const c = document.querySelector('.tone-card[data-id="taepyeongso"]'); c.open = true; const sb = document.getElementById('sidebar'); sb.scrollTop = 0; sb.scrollTop = c.getBoundingClientRect().top - sb.getBoundingClientRect().top - 330; });
  await p.waitForTimeout(400);
  const sb = await p.locator('#sidebar').boundingBox(); await p.screenshot({ path: O + '27_tone_tab.png', clip: { x: sb.x, y: sb.y, width: sb.width, height: Math.min(sb.height, 720) } });
  await p.evaluate(() => { localStorage.removeItem('hapju-tone'); });
  // 28: 문제점 신고하기 (35마디쯤 재생하다 멈춘 것처럼 마디를 직접 채움)
  await p.click('#reportBtn'); await p.waitForTimeout(400);
  await p.fill('#repBar', '35'); await p.fill('#repBody', '가야금 윗줄 35마디 셋째 음이 악보보다 한 음 높게 들립니다.');
  await p.evaluate(() => document.getElementById('repAttach').click()); await p.waitForTimeout(300);
  const d = await p.locator('.rep-dlg').boundingBox(); await p.screenshot({ path: O + '28_report.png', clip: { x: d.x - 8, y: d.y - 8, width: d.width + 16, height: d.height + 16 } });
  console.log('done'); await b.close(); })();
