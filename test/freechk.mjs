// 자유 박 맞춤(alignFreeBars) 점검: 파일마다 맞춘 마디 수, 마디 밖으로 나간 음, 줄끼리 마디 길이가 다른 자유 박 마디
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
for (const f of process.argv.slice(2)) { try {
  const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); if (sc.lines.length < 2) continue;
  const raw = sc.lines.map((l, i) => P.analyzeLine(sc, i)), al = raw.map(r => P.alignToSystem(r, raw));
  let free = 0, out = 0, warn = 0, nonmono = 0; const lens = new Map(), ex = [];
  al.forEach((r, li) => r.bars.forEach((b, i) => { if (b.warnings.filter(w => !/세로 자리를 맞춰/.test(w)).length) warn++; if (!b.warnings.some(w => /자유 박/.test(w))) return; free++;
    const k = b.number + '@' + (r.geo[i] || {}).page; (lens.get(k) || lens.set(k, new Set()).get(k)).add(String(b.barLen));
    for (const e of b.events) if (e.t.add(e.dur).v > b.barLen.v + 1e-9) { out++; ex.length < 3 && ex.push(li + ':' + b.number); }
    for (const v of ['R', 'L']) { const ev = b.events.filter(e => e.voice === v && e.x != null).sort((p, q) => p.x - q.x); for (let j = 1; j < ev.length; j++) if (ev[j].t.v < ev[j - 1].t.v) nonmono++; } }));
  console.log(JSON.stringify({ f: f.split('/').pop().slice(0, 8), bars: al[0].bars.length, first: al[0].bars[0].number, warn, free, out, nonmono, lenMismatch: [...lens.values()].filter(s => s.size > 1).length, ex }));
} catch (e) { console.log(f.split('/').pop().slice(0, 8), 'ERR', String(e).slice(0, 100)); } }
