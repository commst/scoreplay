// 두 해석기의 마디 사건을 줄마다 비교(바뀐 마디 모두): PREV=<이전> node test/_bdall.mjs <접두어> [최대]
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const A = await import(process.env.PREV), B = await import('../src/score-parser.js');
const [pre, max = 40] = process.argv.slice(2); const SM = '/home/claude/samples/';
const d = fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)));
const a = await A.loadScore(pdfjs, new Uint8Array(d)), b = await B.loadScore(pdfjs, new Uint8Array(d));
const fm = e => `${e.voice}${e.t}+${e.dur}${e.sus ? 's' + e.sus : ''}${e.tie ? 'T' : ''}[${(e.midis || ['p' + (e.pos ?? '')]).join('.')}]`;
let n = 0; const kinds = {};
for (let li = 0; li < a.lines.length; li++) { const ra = A.analyzeLine(a, li), rb = B.analyzeLine(b, li);
  for (const x of ra.bars) { const y = rb.bars.find(q => q.number === x.number); if (!y) continue; const sa = x.events.map(fm).sort().join(' '), sb = y.events.map(fm).sort().join(' '); if (sa === sb) continue;
    // 음높이 집합이 바뀌었나(붙임줄 말고)
    const pa = x.events.flatMap(e => (e.midis || []).map(m => e.t + '@' + m)).sort().join(','), pb = y.events.flatMap(e => (e.midis || []).map(m => e.t + '@' + m)).sort().join(',');
    const k = pa === pb ? 'tieOnly' : 'NOTES'; kinds[k] = (kinds[k] || 0) + 1;
    if (n++ < +max || k === 'NOTES') { console.log(`${k} ${li} ${a.lines[li].name} bar ${x.number}`); console.log('  old', x.events.map(fm).join(' ').slice(0, 300)); console.log('  new', y.events.map(fm).join(' ').slice(0, 300)); } } }
console.log(JSON.stringify(kinds));
