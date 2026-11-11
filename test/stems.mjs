// 줄마다(솔로) 크기 맞추기 없이 WAV로 받기 — 음원과 악기별 크기·음색 비교용.
// node test/stems.mjs <html> <접두어> <출력 폴더> [잔향 0] [마디부터] [마디까지]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [html, pre, out, rev = '0', from = '', to = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const b = await chromium.launch(); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
await p.goto('file://' + html + '#allpanes'); await p.setInputFiles('#pdfInput', t);
await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 2, null, { timeout: 120000 }); await p.waitForTimeout(800);
await p.evaluate(() => { window.__rawLevel = 0.25; const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
await p.click('#allOn'); await p.waitForTimeout(1500);
await p.evaluate(([rev, from, to]) => { const set = (id, v) => { const e = document.getElementById(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('sReverb', rev); set('sStereo', false); set('sHuman', false);
  if (from) set('sFrom', from); if (to) set('sTo', to);
  set('sCount', false); set('sMetro', false); set('sDyn', true); set('saveFormat', 'wav'); set('sSpeed', 100); }, [rev, from, to]);
await p.waitForTimeout(500);
const cards = await p.$$eval('#lineList .lcard', es => es.map(e => ({ name: (e.querySelector('.lname') || {}).textContent, on: !e.classList.contains('off') && !!e.querySelector('.lsw:checked, .lsw[aria-checked="true"]'), cls: e.className })));
const meta = [];
for (let i = 0; i < (process.env.ONLYALL ? 0 : cards.length); i++) {
  const sel = `#lineList .lcard:nth-child(${i + 1}) .sm-row button.solo`; if (!(await p.$(sel))) continue;
  const info = await p.evaluate(i => { const c = window.__st.lineCfg[window.__st.lineIds[i]] || window.__st.lineCfg[i]; return c ? { role: c.role, inst: c.inst, R: c.R, L: c.L, vol: c.vol, oct: c.oct } : null; }, i);
  if (!info || info.role === 'off') continue;
  await p.click(sel); await p.waitForTimeout(300);
  const dl = p.waitForEvent('download', { timeout: 600000 }); await p.click('#saveBtn'); const d = await dl; const fn = `${out}/${String(i).padStart(2, '0')}.wav`; await d.saveAs(fn);
  meta.push({ i, name: cards[i].name.trim(), ...info, file: fn }); console.log(i, cards[i].name.trim(), JSON.stringify(info));
  await p.click(sel); await p.waitForTimeout(300);
}
fs.writeFileSync(out + '/meta.json', JSON.stringify(meta, null, 1));
// 모든 줄 함께(같은 크기 기준)
const dl = p.waitForEvent('download', { timeout: 600000 }); await p.click('#saveBtn'); const d = await dl; await d.saveAs(out + '/all.wav');
await b.close();
