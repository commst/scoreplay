// 경고 유형 집계(세로 맞춤 뒤): node test/wtally.mjs 악보… → 파일마다 JSON 한 줄 {f, bars, warn, types{}, ex{유형: [줄:마디…]}}
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
for (const f of process.argv.slice(2)) {
  try {
    const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
    const ids = sc.lines.length ? sc.lines.map((l, i) => i) : [null];
    const all = ids.map(i => P.analyzeLine(sc, i)); if (all[0].scanned) continue;
    const o = { f: f.split('/').pop().slice(0, 8), lines: ids.length, bars: 0, warn: 0, types: {}, ex: {} };
    all.forEach((r, li) => { const a = ids.length > 1 ? P.alignToSystem(r, all) : r; o.bars += a.bars.length;
      for (const b of a.bars) { const ws = b.warnings.filter(w => !/세로 자리를 맞춰/.test(w)); if (!ws.length) continue; o.warn++;
        for (const w of ws) { const k = w.replace(/[\d\/.]+/g, 'N').slice(0, 30); o.types[k] = (o.types[k] || 0) + 1; (o.ex[k] ||= []).length < 4 && o.ex[k].push(li + ':' + b.number); } } });
    console.log(JSON.stringify(o));
  } catch (e) { console.log(JSON.stringify({ f: f.split('/').pop().slice(0, 8), err: String(e).slice(0, 80) })); }
}
