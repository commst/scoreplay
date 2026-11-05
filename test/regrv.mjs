// 성부를 빼고 비교하는 회귀 검사: node test/regrv.mjs <이전 score-parser.js 절대경로> <샘플들>
// 마디마다 음(시각·길이·음높이·롤·꾸밈음)과 마디 길이가 바뀐 곳, 경고 마디 수 변화를 센다 (성부 R/L만 바뀐 것은 차이로 치지 않음)
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const A = await import(process.argv[2]), B = await import('../src/score-parser.js');
let tot = { files: 0, chg: 0, wa: 0, wb: 0 };
for (const f of process.argv.slice(3)) {
  const d = fs.readFileSync(f);
  let a, b; try { a = await A.loadScore(pdfjs, new Uint8Array(d)); b = await B.loadScore(pdfjs, new Uint8Array(d)); } catch (e) { continue; }
  const ids = a.lines.length ? a.lines.map((l, i) => i) : [null];
  const chg = []; let wa = 0, wb = 0;
  for (const id of ids) {
    const ra = A.analyzeLine(a, id), rb = B.analyzeLine(b, id);
    const s = bar => bar.number + ':' + bar.barLen + ':' + bar.events.map(e => e.t + '/' + e.dur + '/' + (e.midis || []).slice().sort().join('.') + (e.roll ? 'r' : '') + (e.grace || '') + (e.tie ? 't' : '')).sort().join(',');
    const n = Math.max(ra.bars.length, rb.bars.length);
    for (let i = 0; i < n; i++) if (!ra.bars[i] || !rb.bars[i] || s(ra.bars[i]) !== s(rb.bars[i])) chg.push((id ?? 0) + ':' + (ra.bars[i] || rb.bars[i]).number);
    wa += ra.bars.filter(x => x.warnings.length).length; wb += rb.bars.filter(x => x.warnings.length).length;
  }
  tot.files++; tot.chg += chg.length; tot.wa += wa; tot.wb += wb;
  console.log(f.split('/').pop().slice(0, 8), 'changed', chg.length, chg.slice(0, 12).join(' '), 'warn', wa, '->', wb);
}
console.log('TOTAL', JSON.stringify(tot));
