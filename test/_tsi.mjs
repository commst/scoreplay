import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'); const SM='/home/claude/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(process.argv[2])))));
const r = P.analyzeLine(sc, +process.argv[3]); for (const n of process.argv.slice(4)) { const b = r.bars.find(x=>x.number==n); console.log(n, b.tsInferred, JSON.stringify(b.timesig), b.timesigChange); }
