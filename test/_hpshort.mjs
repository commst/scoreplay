import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('/home/claude/scoreplay/src/score-parser.js');
const [pre] = process.argv.slice(2); const SM='/home/claude/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
let n=0;
for (let li=0; li<sc.lines.length; li++){ const r=P.analyzeLine(sc,li);
 for (const d of r.marks.dyn) if (d.hp && d.p1d - d.p0 < +(process.env.SPAN||0.2)) { const b=r.bars[Math.floor(d.p0)]; if(n++<12) console.log(li, sc.lines[li].name, 'bar', b&&b.number, 'span', (d.p1d-d.p0).toFixed(3), 'dir', d.dir, 'target', d.target); } }
console.log('short total', n);
