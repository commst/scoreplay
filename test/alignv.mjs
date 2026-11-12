// 세로 맞춤까지 한 결과를 이전 해석기와 견줌(성부 빼고): node test/alignv.mjs <이전 score-parser.js> <총보들>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const A = await import(process.argv[2]), B = await import('../src/score-parser.js');
const NEED = /박자보다 김|마디 길이를 넘음|마디선이 보이지 않아/, NEEDB = process.env.NEEDB ? new RegExp(process.env.NEEDB) : /박자보다 김|마디 길이를 넘음|마디선이 보이지 않아|쉼표 일부 숨김/;   // 앱의 ALIGN_NEED(166번에 쉼표 숨김 더함)
const s = bar => bar.number + ':' + bar.barLen + ':' + bar.events.map(e => e.t + '/' + e.dur + '/' + (e.midis || []).slice().sort().join('.')).sort().join(',');
const run = (P, sc, N) => { const all = sc.lines.map((l, i) => P.analyzeLine(sc, i)); return all.map(r => r.bars.some(b => b.warnings.some(w => N.test(w))) ? P.alignToSystem(r, all) : r); };
let T = 0;
for (const f of process.argv.slice(3)) {
  const d = fs.readFileSync(f); let a, b; try { a = await A.loadScore(pdfjs, new Uint8Array(d)); b = await B.loadScore(pdfjs, new Uint8Array(d)); } catch (e) { continue; }
  if (!a.lines || a.lines.length < 2) continue;
  const ra = run(A, a, NEED), rb = run(B, b, NEEDB), ch = [];
  ra.forEach((r, i) => r.bars.forEach((x, k) => { const y = rb[i].bars[k]; if (!y || s(x) !== s(y)) ch.push(i + ':' + x.number); }));
  T += ch.length; console.log(f.split('/').pop().slice(0, 8), 'changed', ch.length, ch.slice(0, 30).join(' '));
}
console.log('TOTAL', T);
