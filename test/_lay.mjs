import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('/home/claude/scoreplay/src/score-parser.js');
const [pre, ...pgs] = process.argv.slice(2); const SM = '/home/claude/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
for (const p of pgs) { const L = sc.layouts[+p]; console.log('page', p, 'staves', L.staves.length, 'systems', JSON.stringify(L.systems), 'sysOf', JSON.stringify(L.sysOf), 'tops', L.staves.map(s => Math.round(s.top)).join(',')); }
