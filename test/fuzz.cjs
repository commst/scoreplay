// 무작위로 화면을 조작해 오류(pageerror·console error)와 이상 상태를 찾는다
const { chromium, devices } = require('/opt/npm-tools/node_modules/playwright');
const fs = require('fs'); const SM = '/home/claude/samples/'; const all = fs.readdirSync(SM).filter(f => f.endsWith('.pdf'));
const pick = p => SM + all.find(f => f.startsWith(p));
const seed = +(process.argv[2] || 1), N = +(process.argv[3] || 120), mobile = process.argv[4] === 'mobile';
let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; const ri = n => Math.floor(rnd() * n);
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(mobile ? devices['iPhone 13'] : { viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' @' + log.slice(-3).join(' > ') + ' | ' + (e.stack || '').split('\n').slice(1, 4).map(x => x.trim().replace(/file:.*index.html:/, 'L')).join(' ; ')));
  p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource|MP3 인코더|lame/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200) + ' @' + log.slice(-3).join(' > ')); });
  p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'), contentType: 'text/javascript' }));
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.waitForTimeout(800);
  const log = [];
  const pdfs = ['b3a31a97', 'd95ddafe', '59ee4663', '5b2e1f54', '52cfd0bf', '1fe03d65', 'a05c32d0', '9e386483', '20983efb'];
  const safe = async (name, fn) => { log.push(name); try { await fn(); } catch (e) { if (!/Timeout|not visible|detached|intercepts|outside of the viewport|not enabled|disabled/i.test(e.message)) errs.push('ACT ' + name + ': ' + e.message.split('\n')[0]); } };
  const vis = async sel => { const n = await p.locator(sel).count(); return n ? p.locator(sel).nth(ri(n)) : null; };
  const acts = [
    ['loadFull', async () => { await p.setInputFiles('#pdfInput', pick(pdfs[ri(pdfs.length)])); await p.waitForFunction(() => /마디를 읽었습니다|읽지 못|예시/.test(document.querySelector('#fileInfo').textContent), null, { timeout: 120000 }); }, 2],
    ['loadParts', async () => { const k = 1 + ri(2), fs2 = []; for (let i = 0; i < k; i++) fs2.push(pick(['d95ddafe', '59ee4663', '9128e77f', 'bfb7e6f7', '26dd8f21'][ri(5)])); await p.setInputFiles('#partsInput', fs2); await p.waitForTimeout(4000); }, 1],
    ['addExtra', async () => { await p.setInputFiles('#extraInput', pick(['d95ddafe', '26dd8f21'][ri(2)])); await p.waitForTimeout(3000); }, 1],
    ['rmFile', async () => { const l = await vis('.flist .rm'); if (l) await l.click({ timeout: 2000 }); }, 1],
    ['role', async () => { const l = await vis('.lcard .seg button'); if (l) await l.click({ timeout: 2000 }); }, 6],
    ['inst', async () => { const l = await vis('.lcard .cfg select'); if (l) { const opts = await l.locator('option').evaluateAll(o => o.map(x => x.value)); await l.selectOption(opts[ri(opts.length)], { timeout: 2000 }); } }, 4],
    ['allOn', async () => p.click('#allOn', { timeout: 2000 }), 1],
    ['allOff', async () => p.click('#allOff', { timeout: 2000 }), 1],
    ['play', async () => { await p.click('#playBtn', { timeout: 2000 }); await p.waitForTimeout(300 + ri(1500)); }, 5],
    ['barClick', async () => { const l = await vis('#bars .b'); if (l) await l.click({ timeout: 2000, position: { x: 30, y: 10 } }); await p.waitForTimeout(ri(1000)); }, 4],
    ['space', async () => { await p.keyboard.press('Space'); await p.waitForTimeout(ri(800)); }, 2],
    ['speed', async () => { await p.$eval('#speed', (e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, String(50 + ri(101))); }, 2],
    ['range', async () => { await p.fill('#from', String(1 + ri(40))); await p.dispatchEvent('#from', 'change'); await p.fill('#to', String(1 + ri(200))); await p.dispatchEvent('#to', 'change'); }, 2],
    ['opt', async () => { const id = ['optRepeat', 'optCount', 'optMetro', 'optDyn', 'optLoop'][ri(5)]; await p.click('#' + id, { timeout: 2000 }); }, 2],
    ['rest', async () => p.selectOption('#optRest', ['off', 'beat', 'sub'][ri(3)]).catch(() => {}), 1],
    ['bpm', async () => { const l = await vis('#tempoBody input.num[id^="tb-"]'); if (l) { await l.fill(String([0, 1, 60, 120, 999, ''][ri(6)]), { timeout: 2000 }); await l.dispatchEvent('input'); await l.dispatchEvent('change'); } }, 3],
    ['tStart', async () => { const l = await vis('#tempoBody input[id^="ts-"]:not([disabled])'); if (l) { await l.fill(String(ri(300)), { timeout: 2000 }); await l.dispatchEvent('change'); } }, 1],
    ['addRow', async () => p.click('#addRow', { timeout: 2000 }), 1],
    ['delRow', async () => { const l = await vis('#tempoBody .x:not([hidden])'); if (l) await l.click({ timeout: 2000 }); }, 1],
    ['eqflip', async () => { const l = await vis('.eqflip'); if (l) await l.click({ timeout: 2000 }); }, 1],
    ['tchgAdd', async () => p.click('#tchgAdd', { timeout: 2000 }), 2],
    ['tchgEdit', async () => { const l = await vis('#tchgBody tr:not(.sum) input:not([disabled])'); if (l) { await l.fill(String([0, 1, 2, 4, 50, 150, 999, ''][ri(8)]), { timeout: 2000 }); await l.dispatchEvent('change'); } }, 2],
    ['tchgKind', async () => { const l = await vis('#tchgBody select'); if (l) await l.selectOption(['rit', 'accel', 'atempo'][ri(3)], { timeout: 2000 }); }, 1],
    ['tchgDel', async () => { const l = await vis('#tchgBody .x'); if (l) await l.click({ timeout: 2000 }); }, 1],
    ['ritF', async () => { await p.fill('#ritF', String([-5, 0, 50, 80, 300][ri(5)])); await p.dispatchEvent('#ritF', 'change'); }, 1],
    ['order', async () => { await p.fill('#orderText', ['1-8, 1-8', '3-1', 'a', '1-4, 9-12', ''][ri(5)]); await p.dispatchEvent('#orderText', 'change'); }, 1],
    ['orderAuto', async () => p.click('#orderAuto', { timeout: 1000 }), 1],
    ['edit', async () => { const l = await vis('#bars .b .b-edit'); if (l) { await l.click({ timeout: 2000, force: true }); await p.waitForTimeout(200); const bt = await vis('.edit-dlg .ed-pitch button'); if (bt) await bt.click({ timeout: 2000 }); const sel = await vis('.edit-dlg select'); if (sel) { const o = await sel.locator('option').evaluateAll(x => x.map(y => y.value)); await sel.selectOption(o[ri(o.length)]); } if (rnd() < 0.5) await p.keyboard.press('Escape'); else { const c = await vis('.edit-dlg .btn'); if (c) await c.click({ timeout: 2000 }); } } }, 2],
    ['undo', async () => { await p.keyboard.press('Control+z'); }, 1],
    ['save', async () => { await p.selectOption('#saveFormat', 'wav'); const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }).catch(() => null), p.click('#saveBtn', { timeout: 2000 })]); await p.waitForTimeout(300); }, 1],
    ['saveOpt', async () => { await p.fill('#sFrom', String(ri(50))); await p.dispatchEvent('#sFrom', 'change'); await p.fill('#sSpeed', String([0, 30, 100, 200][ri(4)])); await p.dispatchEvent('#sSpeed', 'change'); }, 1],
    ['setLoad', async () => p.click('#setLoadNow', { timeout: 1000 }), 1],
    ['setClear', async () => p.click('#setClear', { timeout: 1000 }), 1],
    ['setExportImport', async () => { const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#setExport', { timeout: 1000 })]); if (dl) { const f = await dl.path(); await p.setInputFiles('#setImport', f); await p.waitForTimeout(500); } }, 1],
    ['hist', async () => { await p.click('#histBtn', { timeout: 2000 }); await p.keyboard.press('Escape'); }, 1],
    ['vol', async () => { const l = await vis('.lcard input[type=range]'); if (l) { await l.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, String(ri(151))); } }, 2],
    ['track', async () => { const bx = await p.locator('#track').boundingBox(); if (bx) await p.mouse.click(bx.x + rnd() * bx.width, bx.y + 3); }, 1],
  ];
  const bag = acts.flatMap(a => Array(a[2]).fill(a));
  for (let i = 0; i < N; i++) {
    const [name, fn] = bag[ri(bag.length)];
    await safe(name, fn);
    if (i % 10 === 9) {   // 상태 점검
      await p.waitForTimeout(1500);
      const st = await p.evaluate(() => ({ now: document.querySelector('#nowText').textContent, bars: document.querySelectorAll('#bars .b').length, playDis: document.querySelector('#playBtn').disabled, msg: document.querySelector('#msg').textContent,
        starts: [...document.querySelectorAll('#tempoBody input[id^="ts-"]')].map(e => e.value), labels: [...document.querySelectorAll('#bars .b')].length,
        tch: [...document.querySelectorAll('#tchgBody tr:not(.sum)')].length, dlg: document.querySelectorAll('.edit-back').length }));
      if (new Set(st.starts).size !== st.starts.length) errs.push('INV duplicate tempo starts ' + st.starts.join(',') + ' @' + log.slice(-4).join(' > '));
      if (st.playDis && !/만드는 중/.test(st.now)) errs.push('INV play disabled but not building: ' + st.now + ' @' + log.slice(-4).join(' > '));
      if (st.dlg > 1) errs.push('INV multiple dialogs ' + st.dlg);
      log.push(`[${st.now.slice(0, 20)} bars${st.bars}${st.playDis ? ' DIS' : ''}]`);
    }
  }
  // 마지막: 재생이 되는지
  await p.click('#playBtn').catch(() => {}); await p.waitForTimeout(200);
  const ok = await p.waitForFunction(() => /마디|카운트인|템포를 입력|재생할 마디가 없|정지/.test(document.querySelector('#nowText').textContent) && !document.querySelector('#playBtn').disabled, null, { timeout: 120000 }).then(() => true).catch(() => false);
  console.log(`seed ${seed}: errors ${errs.length}${ok ? '' : ' | FINAL PLAY STUCK: ' + await p.textContent('#nowText')}`);
  for (const e of [...new Set(errs)].slice(0, 12)) console.log('  ', e);
  if (errs.length) console.log('  last actions:', log.slice(-12).join(' > '));
  await b.close();
})();
