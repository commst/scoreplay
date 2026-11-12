// 160번: 꺾쇠 뒤 크기가 다음 셈여림 글자까지 눌려 남는 곳 세기 (옛 계산 대 새 계산)
// node test/dynstuck.mjs <악보들> → 줄마다 '기준(마지막 셈여림 글자)의 60% 미만으로 눌린 마디 수' 옛/새
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'); const E = await import('../src/audio-engine.js');
function oldLvl(items, p) { let level = 0.75; for (let i = 0; i < items.length; i++) { const it = items[i]; if (it.p0 > p) break; if (it.kind === 'mark') { level = it.level; continue; }
  const amt = it.hp ? 0.25 : 0.15; const target = it.target != null ? it.target : it.dir < 0 ? Math.max(0.08, level * (it.hp ? 0.25 : 0.45)) : Math.max(0.2, Math.min(1, level + amt));
  let p1 = it.p1; for (let j = i + 1; j < items.length; j++) if (items[j].p0 > it.p0 + 1e-6) { p1 = Math.min(p1, items[j].p0); break; }
  if (p < p1) return level + (target - level) * (p - it.p0) / Math.max(1e-6, p1 - it.p0); level = target; } return level; }
function baseAt(items, p) { let b = 0.75; for (const it of items) { if (it.p0 > p) break; if (it.kind === 'mark') b = it.level; else if (it.target != null && it.p1 <= p) b = it.target; } return b; }
const T = { files: 0, lines: 0, linesOld: 0, linesNew: 0, barsOld: 0, barsNew: 0 };
for (const f of process.argv.slice(2)) {
  let sc; try { sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); } catch (e) { continue; } if (!sc.lines.length) continue; T.files++;
  const out = [];
  for (let li = 0; li < sc.lines.length; li++) { let r; try { r = P.analyzeLine(sc, li); } catch (e) { continue; } T.lines++;
    const d = r.marks.dyn; if (!d.some(x => x.kind !== 'mark')) continue;
    let o = 0, n = 0; const ob = [];
    r.bars.forEach((b, i) => { if (!b.events.length) return; const q = i + 0.5, base = baseAt(d, q), inRamp = d.some(x => x.kind !== 'mark' && x.p0 <= q && q < x.p1);
      if (inRamp) return; if (oldLvl(d, q) < base * 0.6) { o++; ob.push(b.number); } if (E.dynLevelAt(d, q) < base * 0.6) n++; });
    if (o) T.linesOld++; if (n) T.linesNew++; T.barsOld += o; T.barsNew += n;
    if (o >= 4) out.push(`${li}:${sc.lines[li].name} ${o}/${n} [${ob[0]}~${ob[ob.length - 1]}]`);
  }
  if (out.length) console.log(f.split('/').pop().slice(0, 40), '|', out.slice(0, 6).join(' | '));
}
console.log('TOTAL', JSON.stringify(T));
