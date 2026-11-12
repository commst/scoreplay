// 총보에서 마디를 넘는 붙임줄(t=0 tie)마다, 합친 이벤트 순서에서 앞 음과의 거리(사이 음 수) — renderPlan의 60개 창을 넘는지
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js');
const [pre] = process.argv.slice(2); const SM = '/home/claude/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const rs = sc.lines.map((_, li) => P.analyzeLine(sc, li));
const nums = [...new Set(rs.flatMap(r => r.bars.map(b => b.number)))].sort((a, b) => a - b);
const seq = [];   // 합친 순서: 마디 → 줄 → 이벤트
for (const n of nums) for (let li = 0; li < rs.length; li++) { const b = rs[li].bars.find(b => b.number === n); if (b) for (const e of b.events) if (e.midis) seq.push({ li, n, e }); }
let over = 0, tot = 0, max = 0;
seq.forEach((x, i) => {
  if (!(x.e.tie && x.e.t.v === 0)) return; tot++;
  let j = i - 1; while (j >= 0 && !(seq[j].li === x.li && seq[j].e.midis.some(m => x.e.midis.includes(m)))) j--;
  const gap = i - j; max = Math.max(max, gap);
  if (gap > 60) { over++; if (over <= 8) console.log(`line ${x.li} ${sc.lines[x.li].name} bar ${x.n} gap ${gap}`); }
});
console.log('cross-bar ties', tot, 'beyond 60-note window', over, 'max gap', max);
