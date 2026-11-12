// 붙임줄 짝짓기 비교: 새 해석기가 '예전에 치지 않던 음을 치는' 마디(붙임줄을 잃음)와 '예전에 치던 음을 잇는' 마디(붙임줄을 더함)를 가름
// PREV=<예전> NEW=<새> node test/_tiecmp.mjs <악보…>  → 줄마다 LOST(있으면 안 됨)·ADDED·OTHER 마디 목록 JSON 줄
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const A = await import(process.env.PREV), B = await import(process.env.NEW);
const struck = b => { const m = new Map(); for (const e of b.events) if (!e.tie) for (const x of (e.midis || ['p' + (e.pos ?? '') + e.voice])) { const k = e.t + '@' + x; m.set(k, (m.get(k) || 0) + 1); } return m; };
const key = b => b.events.map(e => `${e.voice}${e.t}+${e.dur}${e.sus ? 's' + e.sus : ''}${e.tie ? 'T' : ''}[${(e.midis || ['p' + (e.pos ?? '')]).join('.')}]`).sort().join(' ');
for (const f of process.argv.slice(2)) { const d = fs.readFileSync(f); let a, b; try { a = await A.loadScore(pdfjs, new Uint8Array(d)); b = await B.loadScore(pdfjs, new Uint8Array(d)); } catch (e) { continue; }
  const out = { f: f.split('/').pop().slice(0, 8), LOST: [], ADDED: [], OTHER: [] };
  for (let li = 0; li < a.lines.length; li++) { let ra, rb; try { ra = A.analyzeLine(a, li); rb = B.analyzeLine(b, li); } catch (e) { continue; }
    if (ra.bars.length !== rb.bars.length) { out.OTHER.push(li + ':bars'); continue; }
    ra.bars.forEach((x, k) => { const y = rb.bars[k]; if (key(x) === key(y)) return;
      const sa = struck(x), sb = struck(y); let lost = false, added = false;
      for (const [k2, c] of sb) if ((sa.get(k2) || 0) < c) lost = true;
      for (const [k2, c] of sa) if ((sb.get(k2) || 0) < c) added = true;
      (lost ? out.LOST : added ? out.ADDED : out.OTHER).push(li + ':' + x.number); }); }
  if (out.LOST.length + out.ADDED.length + out.OTHER.length) console.log(JSON.stringify(out)); }
