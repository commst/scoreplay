// 악보 빠르기 읽기: node test/_tempo.mjs <접두어> [PARSER=…]
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js');
const [pre] = process.argv.slice(2); const SM = '/home/claude/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
const li = +(process.env.LINE || 0), r = P.analyzeLine(sc, li);
for (const b of r.bars) if (b.tempo || b.tempoText) console.log(b.number, JSON.stringify(b.tempo || null), b.tempoText || "");
console.log('rows', JSON.stringify(P.defaultTempoRows(r.bars)).slice(0, 800));
