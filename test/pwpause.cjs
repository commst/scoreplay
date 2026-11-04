const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'); const SM = '/home/claude/samples/'; const pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'), contentType: 'text/javascript' }));
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file:///home/claude/web/deploy-hapju/index.html#allpanes'); await p.waitForTimeout(800);
  await p.setInputFiles('#pdfInput', pick('b3a31a97')); await p.waitForFunction(() => /마디를 읽었습니다/.test(document.querySelector('#fileInfo').textContent), null, { timeout: 120000 }); await p.waitForTimeout(800);
  const now = () => p.textContent('#nowText');
  await p.evaluate(() => document.querySelector('.b[data-n="20"]').click()); await p.waitForFunction(() => /20마디/.test(document.querySelector('#nowText').textContent), null, { timeout: 120000 }); await p.waitForTimeout(2500);
  const a = await now(); await p.click('#playBtn'); await p.waitForTimeout(300); const pa = await now();
  await p.waitForTimeout(800); await p.click('#playBtn'); await p.waitForTimeout(700); const r1 = await now();
  console.log('playing', a, '| paused', pa, '| resumed', r1);
  await p.keyboard.press('Space'); await p.waitForTimeout(300); const ps = await now(); await p.keyboard.press('Space'); await p.waitForTimeout(700); console.log('space pause', ps, '| space resume', await now());
  // 연주 중 속도 바꾸기 → 일시정지 → 다시 재생은 그 마디부터(새로 만든 소리)
  await p.$eval('#speed', e => { e.value = 80; e.dispatchEvent(new Event('input', { bubbles: true })); }); await p.waitForTimeout(300); const pc = await now();
  // 속도만 바꾸면 멈추지 않고 그대로 이어 연주한다 (뒤에서 새 속도 소리로 바꿔 끼움)
  if (!/\d+마디 ·/.test(pc) || /일시정지/.test(pc)) { console.log('FAIL speed change paused playback:', pc); process.exitCode = 1; }
  await p.waitForTimeout(4000);
  console.log('after speed change', pc, '| resumed', await now());
  // 정지 단추 → 처음부터
  await p.click('#barsStopBtn'); await p.waitForTimeout(200); console.log('stop', await now()); await p.click('#playBtn'); await p.waitForTimeout(1200); console.log('after stop play', await now());
  await p.click('#playBtn');
  // 악기 켜고 끄기 중 → 일시정지 → 이어서
  await p.click('#playBtn'); await p.waitForTimeout(1500); await p.locator('.lcard').nth(1).locator('.seg button').first().click(); await p.waitForTimeout(300); const pl = await now();
  await p.click('#playBtn'); await p.waitForFunction(() => /\d+마디 ·|카운트인/.test(document.querySelector('#nowText').textContent) && !/일시정지|만드는/.test(document.querySelector('#nowText').textContent), null, { timeout: 120000 }); await p.waitForTimeout(500);
  console.log('line toggle', pl, '| resumed', await now());
  console.log('errs', errs.join(';')); await b.close();
})();
