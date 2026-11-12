// node test/_tielog.mjs <접두어> <줄> <쪽> <x0> <x1> : 그 범위 곡선의 짝짓기 기록
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const [pre, li, pg, x0, x1] = process.argv.slice(2); const SM = '/home/claude/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
globalThis.__curveLog = []; P.analyzeLine(sc, +li);
for (const L of globalThis.__curveLog) if (L.pi === +pg && L.c.x1 >= +x0 && L.c.x0 <= +x1) console.log(JSON.stringify(L));
