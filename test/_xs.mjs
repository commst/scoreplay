import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'); const SM='/home/claude/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith('2bc31eef')))));
const n=+process.argv[2];
for (let li=0; li<sc.lines.length; li++){ const r=P.analyzeLine(sc,li); const b=r.bars.find(x=>x.number===n); if(!b||!b.events.length) continue;
 console.log(li, sc.lines[li].name.slice(0,6), String(b.barLen), b.warnings.length?'*':'', b.events.map(e=>`${e.t}@${Math.round(e.x)}`).join(' ')); }
