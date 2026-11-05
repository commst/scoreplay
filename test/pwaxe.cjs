// 접근성 검사(axe) + 중복 id
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const s = SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(s, t); return t; }   // 한글 파일 이름은 setInputFiles가 올리지 못해 영어 이름으로 복사;
const AXE = fs.readFileSync('/home/claude/work/axetmp/node_modules/axe-core/axe.min.js', 'utf8');
(async () => { const b = await chromium.launch(); const all = {};
 for (const [nm, w, h] of [['desk', 1280, 860], ['phone', 390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 900, hasTouch: w < 900 })).newPage();
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.waitForTimeout(400);
  const run = async (state) => {
    await p.addScriptTag({ content: AXE }).catch(() => {});
    const r = await p.evaluate(async () => { const res = await axe.run(document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: false } } }); return res.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(x => x.target.join(' ') + ' :: ' + (x.failureSummary || '').split('\n')[1]) })); });
    const dup = await p.evaluate(() => { const c = {}; document.querySelectorAll('[id]').forEach(e => c[e.id] = (c[e.id] || 0) + 1); return Object.entries(c).filter(x => x[1] > 1).map(x => x[0]); });
    for (const v of r) { const k = v.id; all[k] = all[k] || { help: v.help, impact: v.impact, where: new Set(), ex: v.ex }; all[k].where.add(nm + ':' + state); }
    if (dup.length) console.log(nm, state, 'DUP IDS', dup.join(','));
  };
  await run('welcome');
  await p.setInputFiles('#pdfInput', pick('b3a31a97')); await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 90000 }); await p.waitForTimeout(800);
  await run('map');
  for (const t of ['inst', 'tempo', 'play', 'save']) { if (w < 900) await p.click(`.dtab[data-tab="${t}"]`); else await p.click('#tab-' + t); await p.waitForTimeout(300); if (t === 'inst') { await p.click('#expandAll'); await p.waitForTimeout(300); } await run('tab-' + t); }
  if (w < 900) await p.click('#sheetClose');
  await p.click('#filesBtn'); await p.waitForTimeout(200); await run('files'); await p.click('#filesClose');
  await p.click('#helpBtn'); await p.waitForTimeout(200); await run('help'); await p.keyboard.press('Escape');
  await p.click('#viewScore'); await p.waitForTimeout(1500); await run('score');
  await p.click('#viewMap'); await p.waitForTimeout(300); await p.locator('#bars .b[data-n="21"]').hover(); await p.waitForTimeout(300); await p.locator('#bars .b[data-n="21"] .b-edit').click({ force: true }); await p.waitForTimeout(400); await run('edit'); await p.keyboard.press('Escape');
  await p.click('#histBtn').catch(() => p.click('#helpBtn').then(() => p.click('#histBtn2'))); await p.waitForTimeout(300); await run('history'); await p.keyboard.press('Escape');
  await p.context().close();
 }
 for (const [k, v] of Object.entries(all)) { console.log(`[${v.impact}] ${k}: ${v.help} | ${[...v.where].join(' ')}`); v.ex.forEach(e => console.log('     ' + e.slice(0, 220))); }
 await b.close(); })();
