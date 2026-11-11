// 사용설명서용 화면 캡처
const { chromium } = require('playwright'); const fs = require('fs');
const NICE = { b3a31a97: 'Yeonbyeon-Mokga-score', '44e95fb3': 'Flowers-of-K-score', b36addce: 'Yeonbyeon-Mokga-Janggo', '952d391a': 'Yeonbyeon-Mokga-Moktak', '70437fac': 'Yeonbyeon-Mokga-Buk' };   // 그림에 보이는 파일 이름
fs.mkdirSync('/tmp/manual-pick', { recursive: true });
const SM = '/home/claude/samples/', pick = p => { const t = '/tmp/manual-pick/' + (NICE[p] || p) + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t); return t; };   // 한글 파일 이름은 Playwright로 올라가지 않아 영어 이름으로 복사
const O = '/home/claude/work/manual/img/';
const HTML = 'file:///home/claude/web/deploy-hapju/index.html';
async function setup(b, w, h, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: !!mobile, hasTouch: !!mobile, colorScheme: 'light', acceptDownloads: true });
  const p = await ctx.newPage();
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  // 글꼴: 작업 공간에서는 CDN에 못 닿으므로 npm으로 받은 파일 (/home/claude/work/fonts에서 npm i pretendard@1.3.9 @fontsource-variable/outfit)
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: '/home/claude/work/fonts/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const fp = '/home/claude/work/fonts/node_modules/pretendard/dist/web/variable/' + r.request().url().split('/variable/')[1].replace('.min.css', '.css'); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto(HTML); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  return p;
}
const loadFull = async (p, id) => { await p.setInputFiles('#pdfInput', pick(id)); await p.waitForFunction(() => !document.body.classList.contains('welcome') && document.querySelectorAll('#lineList .lcard').length >= 1, null, { timeout: 90000 }); await p.waitForTimeout(1200); };
const shot = (p, n, opt = {}) => p.screenshot({ path: O + n + '.png', ...opt });
const el = async (p, sel, n, pad = 6) => { const bx = await p.locator(sel).first().boundingBox(); await shot(p, n, { clip: { x: Math.max(0, bx.x - pad), y: Math.max(0, bx.y - pad), width: bx.width + pad * 2, height: bx.height + pad * 2 } }); };
(async () => {
  const b = await chromium.launch();
  let p = await setup(b, 1280, 800);
  await shot(p, '01_welcome');
  await loadFull(p, 'b3a31a97');
  await shot(p, '03_main');
  await p.click('#filesBtn'); await p.waitForTimeout(300); await shot(p, '02_files'); await p.click('#filesClose');
  // 악기: 대금 펼침
  const lineIdx = async name => p.evaluate(n => [...document.querySelectorAll('#lineList .lname')].findIndex(e => e.textContent.trim() === n), name);
  const names = await p.$$eval('#lineList .lname', es => es.map(e => e.textContent.trim())); console.log(names.join(' / '));
  let di = names.findIndex(n => /대금/.test(n)); if (di < 0) di = 0;
  const card = i => `#lineList .lcard:nth-child(${i + 1})`;
  if (await p.$(card(di) + '.off')) { await p.click(card(di) + ' .lsw'); await p.waitForTimeout(1500); }
  await p.click(card(di) + ' .lfold'); await p.waitForTimeout(400);
  await p.locator(card(di)).scrollIntoViewIfNeeded(); await el(p, card(di), '04_card_melody');
  await p.click(card(di) + ' .lfold');
  let ji = names.findIndex(n => /장고|장구/.test(n)); if (ji >= 0) { if (await p.$(card(ji) + '.off')) { await p.click(card(ji) + ' .lsw'); await p.waitForTimeout(1500); } await p.click(card(ji) + ' .lfold'); await p.waitForTimeout(300); await p.locator(card(ji)).scrollIntoViewIfNeeded(); await el(p, card(ji), '05_card_perc'); await p.click(card(ji) + ' .lfold'); }
  await p.evaluate(() => document.getElementById('sidebar').scrollTop = 0); await p.waitForTimeout(200);
  await el(p, '#sidebar', '06_inst_tab', 0);
  // 솔로
  await p.click(card(di) + ' .sm-row .solo'); await p.waitForTimeout(300); await p.evaluate(() => document.getElementById('sidebar').scrollTop = 0); await el(p, '#sidebar', '07_solo', 0); await p.click('#soloClear');
  // 빠르기·연주·저장 탭
  await p.click('#tab-tempo'); await p.waitForTimeout(300); await el(p, '#sidebar', '08_tempo_tab', 0);
  await p.click('#tab-play'); await p.waitForTimeout(300); await el(p, '#sidebar', '10_play_tab', 0);
  await p.click('#tab-save'); await p.waitForTimeout(300); await el(p, '#sidebar', '11_save_tab', 0);
  await p.evaluate(() => document.getElementById('sidebar').scrollTop = 99999); await p.waitForTimeout(200); await el(p, '#sidebar', '11b_save_tab2', 0);
  await p.click('#tab-inst');
  // 연주 막대 + 악보 보기 재생
  await p.click('#viewScore'); await p.waitForTimeout(2500);
  const rb = await p.$$('#rehBtns button'); if (rb.length > 3) { await rb[3].click(); }
  else await p.click('#playBtn');
  await p.waitForTimeout(9000); await shot(p, '12_score_play');
  await el(p, '#dock', '13_dock', 0);
  await p.click('#barsStopBtn'); await p.waitForTimeout(300);
  // 내 파트만
  const opts = await p.$$eval('#svPartSel option', os => os.map(o => [o.value, o.textContent]));
  const mine = opts.find(o => /대금/.test(o[1])) || opts[1]; if (mine) { await p.selectOption('#svPartSel', mine[0]); await p.waitForTimeout(2500); await shot(p, '14_mypart'); await p.selectOption('#svPartSel', ''); await p.waitForTimeout(800); }
  // 음 고치기
  await p.click('#svEdit'); await p.waitForTimeout(300);
  const pg = p.locator('.sv-page').first(); const bx = await pg.boundingBox(); await p.mouse.click(bx.x + bx.width * 0.45, bx.y + bx.height * 0.33); await p.waitForTimeout(900);
  if (await p.$('.edit-dlg')) { await shot(p, '15_edit'); await p.keyboard.press('Escape'); }
  await p.click('#svEdit');
  await p.click('#viewMap'); await p.waitForTimeout(600); await el(p, '#stage', '16_map', 0);
  // 구간 반복 + 점점 빠르게
  await p.click('#tab-play'); await p.click('#optRamp'); await p.waitForTimeout(200); await el(p, '#tPlay', '17_ramp_opts', 0).catch(() => {});
  const rb2 = await p.$$('#rehBtns button'); await p.selectOption('#rehMode', 'range'); if (rb2.length > 3) await rb2[3].click(); await p.waitForTimeout(9000); await el(p, '#dock', '18_dock_ramp', 0); await p.click('#barsStopBtn');
  await p.click('#optRamp'); await p.click('#dockLoop').catch(() => {}); await p.click('#rangeAll');
  // 사용법·이력
  await p.click('#histBtn'); await p.waitForTimeout(300); await p.click('.hist-dlg .hlist summary >> nth=0'); await shot(p, '19_history'); await p.keyboard.press('Escape');
  await p.context().close();
  // 빠르기 못 읽은 악보
  p = await setup(b, 1280, 800); await loadFull(p, '44e95fb3'); await p.click('#tab-tempo'); await p.waitForTimeout(300);
  await p.click('#playBtn'); await p.waitForTimeout(900); await shot(p, '09_tempo_missing');
  await p.context().close();
  // 파트보
  p = await setup(b, 1280, 800); await p.setInputFiles('#partsInput', [pick('b36addce'), pick('952d391a'), pick('70437fac')]   /* 연변목가 장고·목탁꽹과리·북 파트보 (지금 샘플) */);
  await p.waitForFunction(() => !document.body.classList.contains('welcome') && document.querySelectorAll('#lineList .lcard').length >= 3, null, { timeout: 90000 }); await p.waitForTimeout(1200);
  await shot(p, '20_parts'); await p.context().close();
  // 휴대폰
  p = await setup(b, 390, 844, true); await shot(p, '21_phone_welcome'); await loadFull(p, 'b3a31a97'); await shot(p, '22_phone_main');
  await p.click('.dtab[data-tab="inst"]'); await p.waitForTimeout(400); await shot(p, '23_phone_sheet'); await p.click('#sheetClose');
  await p.click('#viewScore'); await p.waitForTimeout(2500); await shot(p, '24_phone_score');
  await p.context().close();
  await b.close(); console.log('done');
})();
