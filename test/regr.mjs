import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const A = await import(process.argv[2]), B = await import('../src/score-parser.js');
let ta = 0, tb = 0, diff = 0;
for (const f of process.argv.slice(3)) {
  const d = fs.readFileSync(f);
  let a, b; try { a = await A.loadScore(pdfjs, new Uint8Array(d)); b = await B.loadScore(pdfjs, new Uint8Array(d)); } catch (e) { continue; }
  const ids = a.lines.length ? a.lines.map((l, i) => i) : [null];
  const sig = (P, sc) => ids.map(id => { const r = P.analyzeLine(sc, id); return r.bars.map(b => b.number + ':' + b.barLen + ':' + b.events.map(e => e.t + '/' + e.dur + '/' + e.voice + (e.midis || '') + (e.roll ? 'r' : '') + (e.grace || '')).join(',') + '|' + b.warnings.join(';') + '|' + (b.labels || []).join(';') + '|' + (b.tempoMarks || []).map(m => m.text).join(';') + '|' + (b.kind || '') + (b.repeatStart ? 'rs' : '') + (b.repeatEnd ? 're' : '') + (b.ending || '')).join('#') + '@' + JSON.stringify(P.playbackOrder ? P.playbackOrder(r.bars) : '') + JSON.stringify(r.marks.tempo.map(t => t.kind + t.text)); });
  let t = performance.now(); const sa = sig(A, a); ta += performance.now() - t;
  t = performance.now(); const sb = sig(B, b); tb += performance.now() - t;
  const bad = ids.filter((id, k) => sa[k] !== sb[k]);
  if (bad.length) { diff++; console.log('DIFF', f.split('/').pop().slice(0, 10), bad.join(',')); }
}
console.log('files diff', diff, 'analyze ms before', ta.toFixed(0), 'after', tb.toFixed(0));
