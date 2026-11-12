// 악보로 보기 따라가기 재현: node test/_pwfollow.cjs <접두어> <시작 마디> [모두켜기 1]
const { chromium } = require('playwright'); const fs = require('fs');
const [pre, from, allOn = '1'] = process.argv.slice(2), SM = '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: process.env.PHONE ? { width: 390, height: 844 } : { width: 1280, height: 900 }, hasTouch: !!process.env.PHONE, isMobile: !!process.env.PHONE })).newPage();
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + require('path').resolve('index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(800);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  if (allOn === '1') { await p.click('#tab-lines').catch(() => {}); await p.click('#allOn'); await p.waitForTimeout(1500); }
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (b) b.click(); }); await p.waitForTimeout(2500);
  const snap = () => p.evaluate(() => { const st = window.__st, hl = document.querySelector('.sv-hl'), w = document.getElementById('svWrap');
    const pg = hl && hl.parentNode, pr = pg && pg.getBoundingClientRect(), hr = hl && hl.getBoundingClientRect(), wr = w.getBoundingClientRect();
    return { playing: st.playing, bar: (document.getElementById('nowBar') || {}).textContent, hl: hl && !hl.hidden ? hl.firstChild.textContent : null, hlTop: hr ? Math.round(hr.top - wr.top) : null, hlH: hr ? Math.round(hr.height) : null, inView: hr ? hr.bottom > wr.top && hr.top < wr.bottom : null, scroll: Math.round(w.scrollTop), pageIdx: pg && pg.dataset ? pg.dataset.page : null }; });
  await p.evaluate(f => { for (const id of ['from']) { const e = document.getElementById(id); e.value = f; e.dispatchEvent(new Event('change', { bubbles: true })); } }, from);
  if (process.env.TAP) { await p.evaluate(n => { const st = window.__st; const k = st.bars.findIndex(b => b.number === +n); window.__tapK = k; }, from); await p.evaluate(n => { const pg = [...document.querySelectorAll('#svWrap [data-page]')].find(e => e.dataset.page === n); pg.scrollIntoView(); }, process.env.TAP); await p.waitForTimeout(1500); const box = await p.evaluate(n => { const pg = [...document.querySelectorAll('#svWrap [data-page]')].find(e => e.dataset.page === n); const r = pg.getBoundingClientRect(); return { x: r.left + r.width * 0.12, y: r.top + r.height * 0.3 }; }, process.env.TAP); await p.mouse.click(box.x, box.y); } else await p.click('#playBtn');
  for (let i = 0; i < 24; i++) { await p.waitForTimeout(1000); console.log(i, JSON.stringify(await snap())); }
  await b.close(); })();
