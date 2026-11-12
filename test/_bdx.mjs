// 두 해석기 마디 비교: PREV=… NEW=… node test/_bdx.mjs <접두어> <줄> <마디…>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const A = await import(process.env.PREV), B = await import(process.env.NEW);
const [pre, li, ...bars] = process.argv.slice(2); const SM = '/home/claude/samples/';
const d = fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)));
const a = await A.loadScore(pdfjs, new Uint8Array(d)), b = await B.loadScore(pdfjs, new Uint8Array(d));
const ra = A.analyzeLine(a, +li), rb = B.analyzeLine(b, +li);
const fm = e => `${e.voice}${e.t}+${e.dur}${e.sus ? 's' + e.sus : ''}${e.tie ? 'T' : ''}[${(e.midis || ['p' + (e.pos ?? '')]).join('.')}]`;
console.log(a.lines[+li].name);
for (const n of bars) { const x = ra.bars.find(q => q.number == n), y = rb.bars.find(q => q.number == n); console.log(n, '\n old', x.events.map(fm).join(' '), '\n new', y.events.map(fm).join(' ')); }
