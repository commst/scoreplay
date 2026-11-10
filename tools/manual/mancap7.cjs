// 사용설명서 그림 다시 찍기(122·123번 화면): 빠르기 칸, 빠르기 못 읽은 악보, 저장 칸 아래쪽, 공유 설정, 마디 골라 넣기, 마디 미리보기
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const O = '/home/claude/work/manual/img/', HTML = 'file:///home/claude/web/deploy-hapju/index.html';
async function setup(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: 'light' }); const p = await ctx.newPage();
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.route(/^https:\/\/(api\.github|raw\.githubusercontent)\.com\/.*/, r => r.fulfill({ status: 404, body: '' }));
  await p.goto(HTML); await p.waitForTimeout(400); return p;
}
const loadFull = async (p, id) => { await p.setInputFiles('#pdfInput', pick(id)); await p.waitForFunction(() => !document.body.classList.contains('welcome') && document.querySelectorAll('#lineList .lcard').length >= 1, null, { timeout: 90000 }); await p.waitForTimeout(1500); };
const el = async (p, sel, n, pad = 6) => { const bx = await p.locator(sel).first().boundingBox(); await p.screenshot({ path: O + n + '.png', clip: { x: Math.max(0, bx.x - pad), y: Math.max(0, bx.y - pad), width: bx.width + pad * 2, height: bx.height + pad * 2 } }); };
(async () => { const b = await chromium.launch();
  let p = await setup(b, 1280, 800); await loadFull(p, 'b3a31a97');
  await p.click('#tab-tempo'); await p.waitForTimeout(300); await el(p, '#sidebar', '08_tempo_tab', 0);
  // 마디 골라 넣기: 단추를 누른 상태
  await p.click('#tempoPick'); await p.waitForTimeout(400); await p.screenshot({ path: O + '08b_tempo_pick.png' });
  await p.$eval('#bars .b[data-n="33"]', e => e.click()); await p.waitForTimeout(600); await el(p, '#sidebar', '08c_tempo_inserted', 0);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  // 저장 칸 아래쪽 + 공유 설정
  await p.click('#tab-save'); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById('setBox').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await el(p, '#sidebar', '11b_save_tab2', 0);
  await p.evaluate(() => { document.getElementById('ghTokenBox').open = true; document.getElementById('ghBox').scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(300); await el(p, '#sidebar', '11c_share', 0);
  await p.click('#tab-inst'); await p.context().close();
  // 마디 미리보기
  p = await setup(b, 1280, 900); await loadFull(p, 'b3a31a97');
  await p.evaluate(() => { const e = document.querySelector('.bar-view-settings'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }); await p.waitForTimeout(400);
  await p.locator('#bars .b[data-n="32"]').hover(); await p.waitForTimeout(700); await p.screenshot({ path: O + '16d_bar_tip.png' });
  await p.context().close();
  // 빠르기 못 읽은 악보
  p = await setup(b, 1280, 800); await loadFull(p, '44e95fb3'); await p.click('#tab-tempo'); await p.waitForTimeout(300);
  await p.click('#playBtn'); await p.waitForTimeout(900); await p.screenshot({ path: O + '09_tempo_missing.png' });
  await p.context().close(); await b.close(); console.log('done'); })();
