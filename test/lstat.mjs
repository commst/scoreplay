// 총보 줄마다 마디·음·경고 수·세로 맞춤(alignToSystem) 마디 수와 경고 종류 집계: node test/lstat.mjs 악보.pdf
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const P = await import('../src/score-parser.js');
const f = process.argv[2];
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const all = sc.lines.map((l, i) => P.analyzeLine(sc, i));
const wc = {};
all.forEach((r, i) => { const a = P.alignToSystem(r, all);
  const wb = a.bars.filter(b => b.warnings.length);
  for (const b of wb) for (const w of b.warnings) { const k = w.replace(/\d+/g, 'N').slice(0, 40); wc[k] = (wc[k] || 0) + 1; }
  console.log(String(i).padStart(2), sc.lines[i].name.padEnd(14).slice(0,14), sc.lines[i].clef, 'bars', a.bars.length, 'ev', a.bars.reduce((n, b) => n + b.events.length, 0), 'warn', wb.length, 'aligned', a.aligned || 0, 'tempo', r.marks.tempo.length);
});
console.log(Object.entries(wc).sort((a, b) => b[1] - a[1]).slice(0, 15));
