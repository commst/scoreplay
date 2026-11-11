// 트레몰로 + 꺾쇠: 연변목가 총보 양금 줄만 켜고 1~4마디를 WAV로 받아 0.1초마다 크기와 치는 횟수를 봄.  node test/tremwav.mjs [html] [접두어] [줄 이름] [마디부터] [마디까지]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const [html = '/home/claude/scoreplay/index.html', pre = '52271c34', lname = '양금', from = '1', to = '4'] = process.argv.slice(2);
const SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const b = await chromium.launch(); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
await p.goto('file://' + html + '#allpanes'); await p.setInputFiles('#pdfInput', t);
await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 2, null, { timeout: 120000 }); await p.waitForTimeout(800);
await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
await p.click('#allOff'); await p.waitForTimeout(500);
const names = await p.$$eval('#lineList .lname', es => es.map(e => e.textContent.trim()));
const li = names.findIndex(n => n.includes(lname)); await p.click(`#lineList .lcard:nth-child(${li + 1}) .lsw`); await p.waitForTimeout(1200);
await p.evaluate(([from, to]) => { const set = (id, v) => { const e = document.getElementById(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
  set('sFrom', from); set('sTo', to); set('sCount', false); set('sMetro', false); set('sDyn', true); set('saveFormat', 'wav'); set('sSpeed', 100); set('sReverb', '0'); }, [from, to]);
await p.waitForTimeout(300);
const dl = p.waitForEvent('download', { timeout: 300000 }); await p.click('#saveBtn'); const d = await dl; await d.saveAs('/tmp/trem.wav');
await b.close();
const buf = fs.readFileSync('/tmp/trem.wav'), dv = new DataView(buf.buffer, buf.byteOffset), ch = dv.getUint16(22, true), SR = dv.getUint32(24, true), n = (buf.length - 44) / 2 / ch;
const x = i => dv.getInt16(44 + i * 2 * ch, true) / 32768, W = Math.round(0.1 * SR), rows = [];
for (let i = 0; i + W <= n; i += W) { let s = 0; for (let k = i; k < i + W; k++) s += x(k) ** 2; rows.push(20 * Math.log10(Math.sqrt(s / W) + 1e-9)); }
// 치는 횟수: 10ms 창 에너지가 앞 창보다 크게 뛰는 곳
let hits = 0, prev = 0; const w = Math.round(0.01 * SR);
for (let i = 0; i + w <= n; i += w) { let s = 0; for (let k = i; k < i + w; k++) s += Math.abs(x(k)); s /= w; if (s > prev * 1.25 && s > 0.01) hits++; prev = s; }
console.log(`${lname} ${from}~${to}마디 · ${(n / SR).toFixed(1)}초 · 치는 곳 약 ${hits}번`);
console.log('0.5초마다 크기(dB):', rows.filter((_, i) => i % 5 === 0).map(v => v.toFixed(0)).join(' '));
