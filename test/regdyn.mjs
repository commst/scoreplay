// 셈여림 글자 회귀: node test/regdyn.mjs <이전 score-parser.js> <악보들> → 줄마다 셈여림 수 변화, 새로 생긴/없어진 것
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const A = await import(process.argv[2]), B = await import('../src/score-parser.js');
const T = { files: 0, dynA: 0, dynB: 0, added: 0, lost: 0 };
const key = (r, d) => (r.bars[d.mi] ? r.bars[d.mi].number : d.mi) + ':' + d.label;
for (const f of process.argv.slice(3)) {
  const d = fs.readFileSync(f); let a, b; try { a = await A.loadScore(pdfjs, new Uint8Array(d)); b = await B.loadScore(pdfjs, new Uint8Array(d)); } catch (e) { continue; }
  const ids = a.lines.length ? a.lines.map((l, i) => i) : [null]; const add = [], lost = [];
  for (const id of ids) {
    const ra = A.analyzeLine(a, id), rb = B.analyzeLine(b, id);
    const ka = (ra.marks.dyn || []).filter(x => x.label).map(x => key(ra, x)), kb = (rb.marks.dyn || []).filter(x => x.label).map(x => key(rb, x));
    T.dynA += ka.length; T.dynB += kb.length;
    const ca = {}; ka.forEach(k => ca[k] = (ca[k] || 0) + 1); const cb = {}; kb.forEach(k => cb[k] = (cb[k] || 0) + 1);
    for (const k in cb) for (let i = ca[k] || 0; i < cb[k]; i++) add.push((id ?? 0) + '/' + k);
    for (const k in ca) for (let i = cb[k] || 0; i < ca[k]; i++) lost.push((id ?? 0) + '/' + k);
  }
  T.files++; T.added += add.length; T.lost += lost.length;
  if (add.length || lost.length) console.log(f.split('/').pop().slice(0, 8), 'add', add.length, add.slice(0, 12).join(' '), '| lost', lost.length, lost.slice(0, 8).join(' '));
}
console.log('TOTAL', JSON.stringify(T));
