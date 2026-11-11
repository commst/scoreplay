// 메트로놈이 음악에 묻히지 않는지: 큰 총보(프론티어, 모든 줄)의 20~23마디를 [음원 저장] WAV로 메트로놈 끔·보통·크게 받아
// 박 자리(40ms)의 크기를 견줌.  node test/metrolvl.mjs [html]
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import fs from 'fs';
const html = process.argv[2] || '/home/claude/scoreplay/index.html', SM = '/home/claude/samples/';
const t = '/tmp/pick-9203ad49.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith('9203ad49')), t);
const b = await chromium.launch(); const p = await (await b.newContext({ acceptDownloads: true })).newPage();
await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
await p.goto('file://' + html + '#allpanes'); await p.setInputFiles('#pdfInput', t);
await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 2, null, { timeout: 120000 }); await p.waitForTimeout(800);
await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
await p.click('#allOn'); await p.waitForTimeout(1500);
const hasVol = await p.$('#optMetroVol');
const wav = async (metro, vol) => {
  if (hasVol) await p.selectOption('#optMetroVol', vol);
  await p.evaluate(([metro]) => { const set = (id, v) => { const e = document.getElementById(id); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
    set('sFrom', 20); set('sTo', 23); set('sCount', false); set('sMetro', metro); set('saveFormat', 'wav'); }, [metro]);
  await p.waitForTimeout(300);
  const dl = p.waitForEvent('download', { timeout: 300000 }); await p.click('#saveBtn'); const d = await dl;
  const f = '/tmp/metro-' + metro + vol + '.wav'; await d.saveAs(f); return fs.readFileSync(f);
};
const parse = buf => { const dv = new DataView(buf.buffer, buf.byteOffset), ch = dv.getUint16(22, true), SR = dv.getUint32(24, true), n = (buf.length - 44) / 2 / ch; return { x: i => dv.getInt16(44 + i * 2 * ch, true) / 32768, n, SR }; };
const off = parse(await wav(false, '1')), on = parse(await wav(true, '1')), big = parse(await wav(true, '1.6'));
// 박 자리: 메트로놈만 다른 두 소리의 차이가 큰 곳(클릭 시작)
const onsets = []; { const W = Math.round(0.01 * on.SR); let last = -1e9;
  for (let i = 0; i < Math.min(on.n, off.n); i += W) { let d = 0; for (let k = i; k < i + W && k < on.n; k++) d += Math.abs(on.x(k) - off.x(k)); if (d / W > 0.02 && i - last > 0.15 * on.SR) { onsets.push(i); last = i; } } }
const rmsAt = (S, i) => { let s = 0; const m = Math.round(0.04 * S.SR); for (let k = i; k < i + m && k < S.n; k++) s += S.x(k) ** 2; return Math.sqrt(s / m); };
const avg = S => onsets.reduce((a, i) => a + rmsAt(S, i), 0) / Math.max(1, onsets.length);
const db = v => (20 * Math.log10(v)).toFixed(1);
console.log('박 자리', onsets.length, '곳 · 박 자리 40ms 평균(dB): 메트로놈 없음', db(avg(off)), '/ 보통', db(avg(on)), '/ 크게', db(avg(big)));
console.log('메트로놈이 박 자리에서 더한 크기: 보통 +' + (20 * Math.log10(avg(on) / avg(off))).toFixed(1) + 'dB, 크게 +' + (20 * Math.log10(avg(big) / avg(off))).toFixed(1) + 'dB');
await b.close();
