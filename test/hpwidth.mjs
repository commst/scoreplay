// 그린 꺾쇠(헤어핀) 크기 분포: 악센트(>) 크기의 짧은 것이 꺾쇠로 읽히는지 — node test/hpwidth.mjs <악보들>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
for (const f of process.argv.slice(2)) { globalThis.__hpLog = []; let sc; try { sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); for (let li = 0; li < sc.lines.length; li++) P.analyzeLine(sc, li); } catch (e) { continue; }
  const seen = new Set();
  for (const h of globalThis.__hpLog) { const k = h.pi + ':' + h.y.toFixed(1) + ':' + h.w.toFixed(1); if (seen.has(k)) continue; seen.add(k); console.log('HP', JSON.stringify([f.split('/').pop().slice(0, 8), +h.w.toFixed(1), +h.open.toFixed(1), h.pi, +h.y.toFixed(0)])); } }
