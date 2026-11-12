import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'); const SM='/home/claude/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith('2bc31eef')))));
const [a,z]=[+process.argv[2],+process.argv[3]];
for (let li=0; li<sc.lines.length; li++){ const r=P.analyzeLine(sc,li); console.log(li, sc.lines[li].name.padEnd(8), r.bars.filter(b=>b.number>=a&&b.number<=z).map(b=>b.number+':'+b.barLen+(b.warnings.length?'*':'')+(b.events.length?'':'_')).join(' ')); }
