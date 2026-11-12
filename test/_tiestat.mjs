import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const [pre, lsel] = process.argv.slice(2); const SM = '/home/claude/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const lines = lsel == null ? sc.lines.map((_, i) => i) : lsel.split(',').map(Number);
const cnt = {};
for (const li of lines) {
  globalThis.__curveLog = []; P.analyzeLine(sc, li);
  for (const L of globalThis.__curveLog) {
    if (!L.end.length) { cnt.noend = (cnt.noend || 0) + 1; continue; }
    const ccy = (L.c.y0 + L.c.y1) / 2; const e = L.end[0];
    const k = (e[2] === L.voice ? 'same' : 'diff') + (ccy < e[1] ? '-above' : '-below') + ' dy' + Math.round(Math.abs(ccy - e[1]));
    cnt[k] = (cnt[k] || 0) + 1;
  }
}
console.log(cnt);
