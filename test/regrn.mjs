// 마디 번호로 맞대는 회귀 검사(성부 빼고): node test/regrn.mjs <이전 score-parser.js> <악보들>
// 유형: FILL(빈 마디→음), EMPTIED(음→빈 마디), OTHER(음이 바뀜), NEW/LOST(그 번호 마디가 생김/없어짐). 마디 수 변화도
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const A = await import(process.argv[2]), B = await import('../src/score-parser.js');
const T = { TIE: 0, STEM: 0, ww: 0, w_: 0, _w: 0, __: 0, files: 0, FILL: 0, EMPTIED: 0, OTHER: 0, NEW: 0, LOST: 0, wa: 0, wb: 0, barsA: 0, barsB: 0 };
const s = bar => bar.barLen + ':' + bar.events.map(e => e.t + '/' + e.dur + '/' + (e.midis || []).slice().sort().join('.') + (e.roll ? 'r' : '') + (e.grace || '') + (e.tie ? 't' : '')).sort().join(',');
for (const f of process.argv.slice(3)) {
  const d = fs.readFileSync(f); let a, b; try { a = await A.loadScore(pdfjs, new Uint8Array(d)); b = await B.loadScore(pdfjs, new Uint8Array(d)); } catch (e) { continue; }
  const ids = a.lines.length ? a.lines.map((l, i) => i) : [null]; const c = { FILL: [], EMPTIED: [], OTHER: [], NEW: [], LOST: [], NEWWARN: [], STEMS: [] }; let wa = 0, wb = 0, na = 0, nb = 0;
  for (const id of ids) {
    const ra = A.analyzeLine(a, id), rb = B.analyzeLine(b, id); na += ra.bars.length; nb += rb.bars.length;
    const ma = new Map(), mb = new Map(); for (const x of ra.bars) if (!ma.has(x.number)) ma.set(x.number, x); for (const x of rb.bars) if (!mb.has(x.number)) mb.set(x.number, x);
    for (const [n, x] of ma) { const y = mb.get(n); const tag = (id ?? 0) + ':' + n;
      if (!y) c.LOST.push(tag); else if (s(x) !== s(y)) { const cc = !x.events.length && y.events.length ? c.FILL : x.events.length && !y.events.length ? c.EMPTIED : c.OTHER; cc.push(tag);
        if (cc === c.OTHER) {
          // 붙임줄만 바뀜: 새 판에서 사라진 시작음이 모두 새 판의 이어진 음(sus·tie)에 덮이고, 새로 생긴 시작음이 없음
          const att = bb => bb.events.filter(e => !e.tie).flatMap(e => (e.midis || ['p']).map(m => e.t + '@' + m + '#' + e.dur));
          const oa = new Set(att(x)), na = new Set(att(y));
          const val = q => typeof q === 'object' ? q.v : (String(q).includes('/') ? +String(q).split('/')[0] / +String(q).split('/')[1] : +q);
          const covered = k => { const at = k.indexOf('@'); const t = val(k.slice(0, at)), m = k.slice(at + 1).split('/')[0]; return y.events.some(e => (e.midis || ['p']).map(String).includes(m) && (e.tie || e.sus) && val(e.t) <= t + 1e-9 && t < val(e.t) + val(e.sus || e.dur) - 1e-9); };
          const tieOnly = [...na].every(k => oa.has(k) || [...oa].some(o => o.split('#')[0] === k.split('#')[0])) && [...oa].filter(k => !na.has(k)).every(k => covered(k) || [...na].some(o => o.split('#')[0] === k.split('#')[0]));
          T[tieOnly ? 'TIE' : 'STEM']++; if (!tieOnly) (c.STEMS ??= []).push(tag);
          const k = (x.warnings.length ? 'w' : '_') + (y.warnings.length ? 'w' : '_'); T[k]++; if (k === '_w') (c.NEWWARN ??= []).push(tag); } } }
    for (const n of mb.keys()) if (!ma.has(n)) c.NEW.push((id ?? 0) + ':' + n);
    wa += ra.bars.filter(x => x.warnings.length).length; wb += rb.bars.filter(x => x.warnings.length).length;
  }
  T.files++; T.wa += wa; T.wb += wb; T.barsA += na; T.barsB += nb; for (const k in c) T[k] = (T[k] || 0) + c[k].length;
  if (Object.values(c).some(v => v.length) || na !== nb) console.log(f.split('/').pop().slice(0, 8), 'bars', na, '->', nb, 'warn', wa, '->', wb, Object.entries(c).filter(([, v]) => v.length).map(([k, v]) => k + ' ' + v.length + ' [' + v.slice(0, 8).join(' ') + ']').join(' | '));
}
console.log('TOTAL', JSON.stringify(T));
