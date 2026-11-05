// 해석기 고치기 전/후 마디 비교: PREV=이전 score-parser.js 절대경로 node test/bdiff.mjs <샘플 접두어> [보여줄 수] → 바뀐 마디의 경고·음 전후
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const A = await import(process.env.PREV || '/home/claude/score-parser.prev.js'), B = await import('../src/score-parser.js');
const v = x => typeof x === 'number' ? x : x.n / x.d;
const [pre, maxShow = 6] = process.argv.slice(2);
const f = (process.env.SAMPLES || '/home/claude/samples') + '/' + fs.readdirSync(process.env.SAMPLES || '/home/claude/samples').find(x => x.startsWith(pre));
const d = fs.readFileSync(f);
const a = await A.loadScore(pdfjs, new Uint8Array(d)), b = await B.loadScore(pdfjs, new Uint8Array(d));
let better = 0, worse = 0, same = 0, shown = 0;
const sig = bb => String(bb.barLen) + bb.events.map(e => e.t + '/' + e.dur + e.voice + (e.midis || '')).join(',');
for (let i = 0; i < a.lines.length; i++) {
  const ra = A.analyzeLine(a, i), rb = B.analyzeLine(b, i);
  if (ra.bars.length !== rb.bars.length) { console.log('BARCOUNT', a.lines[i].name, ra.bars.length, rb.bars.length); continue; }
  ra.bars.forEach((x, k) => { const y = rb.bars[k]; if (sig(x) === sig(y)) return;
    const wa = x.warnings.filter(w => !/숨김/.test(w)).length, wb = y.warnings.filter(w => !/숨김/.test(w)).length;
    if (wb < wa) better++; else if (wb > wa) worse++; else same++;
    if (shown++ < +maxShow) { console.log('==', a.lines[i].name, x.number, 'len', v(x.barLen), '->', v(y.barLen), '| warn', x.warnings.join(';'), '->', y.warnings.join(';'));
      for (const [lab, bb] of [['old', x], ['new', y]]) console.log('  ', lab, bb.events.map(e => `${e.voice}${v(e.t).toFixed(3)}+${v(e.dur).toFixed(3)}`).join(' ').slice(0, 240)); }
  });
}
console.log(pre, 'changed bars: fewer warnings', better, 'more', worse, 'same', same);
