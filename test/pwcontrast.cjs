// 밝은·어두운 모드 글자 대비 검사: node pwcontrast.cjs <html> [shotdir]
const { chromium } = require('playwright'); const fs = require('fs');
const [, , HTML, SHOT] = process.argv;
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const audit = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const bgOf = el => { const stack = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= .99) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; if (!stack.length || stack[stack.length - 1].a < .99) base = parse(getComputedStyle(document.body).backgroundColor) || base; for (let i = stack.length - 1; i >= 0; i--) base = blend(stack[i], base); return base; };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const t = walker.currentNode; if (!t.textContent.trim()) continue;
    const el = t.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    if (el.closest('svg, canvas, script, style, template, option')) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
    if (op < .3) continue;
    const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + Math.min(r.width / 2, 20))), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (hit && !el.contains(hit) && !hit.contains(el)) continue;   // 가려진 글자
    let fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el); fg = blend({ ...fg, a: fg.a * op }, bg);
    const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const disabled = el.closest('button:disabled, input:disabled, .disabled');
    if (ratio < (disabled ? 1.8 : 3)) out.push(`${ratio.toFixed(2)} "${t.textContent.trim().slice(0, 24)}" <${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 30)}> fg ${cs.color} bg rgb(${bg.r | 0},${bg.g | 0},${bg.b | 0})`);
  }
  return out;
};
(async () => {
  const b = await chromium.launch(); let total = 0;
  for (const scheme of ['light', 'dark']) for (const [nm, w, h] of [['phone', 390, 844], ['desk', 1366, 860]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900, colorScheme: scheme });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.goto('file://' + HTML); await p.waitForTimeout(400);
    const check = async (state) => { const bad = await p.evaluate(audit); total += bad.length; console.log(`${scheme} ${nm} ${state}: ${bad.length ? 'LOW ' + bad.length : 'ok'}`); bad.slice(0, 6).forEach(x => console.log('   ' + x)); if (SHOT) await p.screenshot({ path: `${SHOT}/c-${scheme}-${nm}-${state}.png` }); };
    await check('welcome');
    await p.setInputFiles('#pdfInput', pick('44e95fb3'));
    await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 60000 }); await p.waitForTimeout(500);
    await check('map');
    for (const t of ['inst', 'tempo', 'play', 'save']) { if (w < 900) { await p.click(`.dtab[data-tab="${t}"]`); } else await p.click('#tab-' + t); await p.waitForTimeout(350); await check('tab-' + t); }
    if (w < 900) await p.click('#sheetClose');
    await p.click('#expandAll').catch(() => {});
    await p.click('#filesBtn'); await p.waitForTimeout(250); await check('files'); await p.click('#filesClose');
    await p.click('#helpBtn'); await p.waitForTimeout(250); await check('help'); await p.keyboard.press('Escape');
    await p.click('#histBtn').catch(() => {}); await p.waitForTimeout(250); if (await p.$('.hist-dlg')) { await check('history'); await p.keyboard.press('Escape'); }
    await p.click('#viewScore'); await p.waitForTimeout(1500); await check('score'); await p.click('#svFull'); await p.waitForTimeout(800); await check('score-full'); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    if (errs.length) console.log('  errors', errs);
    await ctx.close();
  }
  console.log('TOTAL low-contrast', total); await b.close();
})();
