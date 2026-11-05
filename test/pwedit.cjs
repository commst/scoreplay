// 음 고치기(✎) 기능 시험: node test/pwedit.cjs <html> [desktop|mobile] — 고치기·되돌리기·내보내기·가져오기·다시 열기·재생
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs');
const FILE = process.argv[2], MODE = process.argv[3] || 'desktop';
const pdf = '/home/claude/samples/' + fs.readdirSync('/home/claude/samples').find(f => f.startsWith('b3a31a97'));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(MODE === 'mobile' ? { ...devices['iPhone 13'], acceptDownloads: true } : { viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const errs = [];
  const setup = async page => {
    page.on('pageerror', e => errs.push(e.message)); page.on('dialog', d => d.accept());
    await page.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await page.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await page.goto('file://' + FILE + '#allpanes');
    await page.setInputFiles('#pdfInput', pdf);
    await page.waitForSelector('.lcard', { timeout: 120000 }); await page.waitForTimeout(800);
    const names = await page.$$eval('.lcard .lname', e => e.map(x => x.textContent));
    const i = names.findIndex(n => /^대금/.test(n)); const b = page.locator('.lcard').nth(i).locator('.seg button').first();
    if (await b.getAttribute('aria-pressed') !== 'true') { await b.click(); await page.waitForTimeout(500); }
  };
  const log = (...a) => console.log(...a);
  let page = await ctx.newPage(); await setup(page);
  log('tools visible', await page.isVisible('#editTools'), '|', await page.textContent('#editStatus'));
  // 9번째 마디(9마디) 수정 버튼
  const bar = page.locator('#bars .b').nth(8);
  if (MODE !== 'mobile') await bar.hover();
  log('edit btn visible', await bar.locator('.b-edit').isVisible());
  await bar.locator('.b-edit').click();
  await page.waitForSelector('.edit-dlg');
  log('dlg', (await page.textContent('.edit-dlg')).slice(0, 300), '| rows', await page.locator('.ed-row').count()); log('ERR', errs.join(' / '));
  const first = page.locator('.ed-row').first();
  const before = await first.locator('.ed-pitch b').first().textContent();
  await first.locator('.ed-pitch button[title="반음 올림"]').first().click(); await page.waitForTimeout(300);
  const after = await page.locator('.ed-row').first().locator('.ed-pitch b').first().textContent();
  log('pitch', before, '->', after, '| orig note', await page.locator('.ed-row').first().locator('.ed-orig').first().textContent().catch(() => '-'));
  // 마우스를 창 위 여기저기로 옮겨도 그대로인지
  await page.mouse.move(10, 10); await page.mouse.move(640, 450); await page.waitForTimeout(300);
  log('dlg still open after mouse move', await page.isVisible('.edit-dlg'));
  // 길이 바꾸기: 두 번째 음을 4분음표로
  await page.locator('.ed-row').nth(1).locator('select').selectOption('1/4'); await page.waitForTimeout(300);
  log('row2 dur', await page.locator('.ed-row').nth(1).locator('select').inputValue(), '| row3 pos', await page.locator('.ed-row').nth(2).locator('.ed-pos').textContent(), '| warn', await page.locator('.ed-warn').count());
  await page.click('.ed-foot .btn.primary'); // 닫기
  log('bar marked edited', await page.locator('#bars .b').nth(8).evaluate(e => e.classList.contains('edited')), '|', await page.textContent('#editStatus'));
  // 내보내기
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#editExport')]);
  const ex = JSON.parse(fs.readFileSync(await dl.path(), 'utf8')); fs.writeFileSync(__dirname + '/u1/edits_export.json', JSON.stringify(ex));
  log('export', ex.format, ex.scores.length, JSON.stringify(ex.scores[0].lines).slice(0, 160));
  // Ctrl+Z 두 번 → 수정 없음
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.waitForTimeout(300);
  log('after 2x undo', await page.textContent('#editStatus'));
  await page.keyboard.press('Control+z'); // 더 없음
  // 다시 실행 취소한 상태에서 가져오기
  await page.setInputFiles('#editImport', __dirname + '/u1/edits_export.json'); await page.waitForTimeout(500);
  log('after import', await page.textContent('#editStatus'), '| msg', await page.textContent('#msg'));
  // 새로 열어도 자동 적용 (같은 브라우저 저장소)
  await page.close(); page = await ctx.newPage(); await setup(page);
  log('reload status', await page.textContent('#editStatus'), '| bar9 edited', await page.locator('#bars .b').nth(8).evaluate(e => e.classList.contains('edited')));
  // 재생해 보기
  await page.click('#playBtn'); await page.waitForFunction(() => /마디|카운트인/.test(document.getElementById('nowText').textContent), null, { timeout: 120000 });
  log('play ok', await page.textContent('#nowText'));
  await page.click('#playBtn');
  // 모두 되돌리기
  await page.click('#editClearAll'); await page.waitForTimeout(300);
  log('after clear', await page.textContent('#editStatus'));
  log('scroll', await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth].join('/')));
  if (MODE === 'mobile') { await page.locator('#bars .b').nth(3).locator('.b-edit').click(); await page.waitForSelector('.edit-dlg'); await page.screenshot({ path: __dirname + '/u1/edit_mobile.png' }); }
  else { await page.locator('#bars .b').nth(3).hover(); await page.locator('#bars .b').nth(3).locator('.b-edit').click(); await page.waitForSelector('.edit-dlg'); await page.screenshot({ path: __dirname + '/u1/edit_desktop.png' }); }
  log(errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
  await browser.close();
})();
