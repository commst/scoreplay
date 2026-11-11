// 음량 시험 악보(test/levelref.py)를 앱에 올려 악기·타악 소리마다 크기 맞추기 없이 WAV로 받기.
// node test/levelstems.mjs <html> <levelref.musicxml> <출력 폴더>
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [html, xml, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const parts = JSON.parse(fs.readFileSync(xml + '.json', 'utf8'));
const b = await chromium.launch(); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
await p.route(/^https:\/\/.*/, r => r.abort());
await p.goto('file://' + html + '#allpanes'); await p.setInputFiles('#pdfInput', xml);
await p.waitForFunction(n => document.querySelectorAll('#lineList .lcard').length >= n, parts.length, { timeout: 120000 }); await p.waitForTimeout(800);
await p.evaluate(() => { window.__rawLevel = 0.25; const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
await p.click('#allOn'); await p.waitForTimeout(1000);
// 줄마다 역할·소리를 정확히 정함
await p.evaluate(parts => { const st = window.__st; st.lineIds.forEach((id, i) => { const c = st.lineCfg[id]; const pt = parts[i]; if (!c || !pt) return;
  if (pt.kind === 'm') { c.role = 'melody'; c.inst = pt.inst; c.oct = 0; c.nong = false; } else { c.role = 'perc'; c.R = pt.inst; c.L = pt.inst; }
  c.vol = 1; }); st.dirty = true; }, parts);
await p.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('sReverb', '0'); set('sStereo', false); set('sHuman', false); set('sCount', false); set('sMetro', false); set('sDyn', true); set('saveFormat', 'wav'); set('sSpeed', 100); });
await p.waitForTimeout(500);
for (let i = 0; i < parts.length; i++) {
  const sel = `#lineList .lcard:nth-child(${i + 1}) .sm-row button.solo`; if (!(await p.$(sel))) { console.log('no solo', i); continue; }
  await p.click(sel); await p.waitForTimeout(300);
  const dl = p.waitForEvent('download', { timeout: 300000 }); await p.click('#saveBtn'); const d = await dl; await d.saveAs(`${out}/${String(i).padStart(2, '0')}.wav`);
  const cfg = await p.evaluate(i => { const st = window.__st, c = st.lineCfg[st.lineIds[i]]; return [c.role, c.inst, c.R, c.L, c.oct]; }, i);
  console.log(i, parts[i].name, JSON.stringify(cfg));
  await p.click(sel); await p.waitForTimeout(300);
}
await b.close();
