// node test/_geo.mjs <접두어> <줄> : 마디마다 쪽·오선·x, 쪽마다 단 구성
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const [pre, li, from, to] = process.argv.slice(2); const SM = '/home/claude/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const r = P.analyzeLine(sc, +li);
console.log('lines', sc.lines.length, 'bars', r.bars.length, 'geo', r.geo.length);
const pages = new Set();
r.bars.forEach((b, k) => { const g = r.geo[k]; if (!g) { console.log('bar', b.number, 'NO GEO'); return; } if (b.number >= +(from || 0) && b.number <= +(to || 9999)) console.log('bar', b.number, 'p', g.page, 'st', g.staff, 'x', g.x0.toFixed(0), g.x1.toFixed(0)); pages.add(g.page); });
for (const pi of [...pages].sort((a, b) => a - b)) { const L = sc.layouts[pi]; console.log('page', pi, 'staves', L.staves.length, 'systems', JSON.stringify(L.systems), 'sysOf', JSON.stringify(L.sysOf), 'lineOf', JSON.stringify(L.lineOf)); }
