// 지금 해석기의 마디 사건: node test/_bdn.mjs <접두어> <줄> <마디…>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const B = await import('../src/score-parser.js');
const [pre, li, ...bars] = process.argv.slice(2); const SM='/home/claude/samples/';
const b = await B.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
const rb = B.analyzeLine(b, +li);
const fm = e => `${e.voice}${e.t}+${e.dur}${e.sus?'s'+e.sus:''}${e.tie?'T':''}[${(e.midis||['p'+(e.pos??'')]).join('.')}]`;
for (const n of bars) { const y = rb.bars.find(q=>q.number==n); console.log(n, y.events.map(fm).join(' ')); }
