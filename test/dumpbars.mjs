// 대조용 마디 서명 뽑기: node test/dumpbars.mjs <출력폴더> <악보.pdf…> → <폴더>/<접두어>.json
// 줄마다 마디 [번호, 길이, 리듬 서명(시각/길이), 음높이 서명(시각/음), 경고, 쉼 여부]. 2줄 이상이면 세로 맞춤(alignToSystem)까지 (앱과 같게)
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js');
const NEED = /박자보다 김|마디 길이를 넘음/;
const [out, ...files] = process.argv.slice(2);
const fr = x => x == null ? '' : (typeof x === 'number' ? String(x) : x.n + '/' + x.d);
for (const f of files) {
  const pre = f.split('/').pop().slice(0, 8);
  try {
    const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
    const ids = sc.lines && sc.lines.length ? sc.lines.map((l, i) => i) : [null];
    const all = ids.map(id => P.analyzeLine(sc, id));
    const res = all.map(r => ids.length > 1 && r.bars.some(b => b.warnings.some(w => NEED.test(w))) ? P.alignToSystem(r, all) : r);
    const lines = res.map((r, k) => ({ name: (sc.lines[k] && (sc.lines[k].label || sc.lines[k].name)) || sc.partName || '', clef: sc.lines[k] && sc.lines[k].clef,
      bars: r.bars.map(b => {
        const ev = b.events.filter(e => !e.grace || true);
        // 리듬은 적힌 조각 그대로(붙임줄로 이어진 음도 따로): 붙임줄을 한쪽만 읽어도 리듬 비교가 어긋나지 않게. 붙임줄은 ts로 따로
        const pieces = ev.flatMap(e => { if (!e.pcs || e.pcs.length < 2) return [[e.t, e.dur]]; let t = e.t; return e.pcs.map(d => { const r = [t, d]; t = t.add(d); return r; }); });
        const rs = [...new Set(pieces.map(([t, d]) => fr(t) + '~' + fr(d)))].sort();
        const ts = [...new Set(ev.flatMap(e => { const o = []; if (e.tie) o.push(fr(e.t)); if (e.pcs && e.pcs.length > 1) { let t = e.t; e.pcs.slice(0, -1).forEach(d => { t = t.add(d); o.push(fr(t)); }); } return o; }))].sort();
        const pon = e => { if (!e.pcs || e.pcs.length < 2) return [e.t]; let t = e.t; return e.pcs.map(d => { const r = t; t = t.add(d); return r; }); };
        const ps = [...new Set(ev.flatMap(e => pon(e).flatMap(t => (e.midis || []).map(m => fr(t) + '@' + m))))].sort();
        return { n: b.number, len: fr(b.barLen), rs: rs.join(','), ts: ts.join(','), ps: ps.join(','), w: b.warnings, k: b.kind, ne: ev.length };
      }) }));
    fs.writeFileSync(`${out}/${pre}.json`, JSON.stringify({ file: f.split('/').pop(), title: sc.title, part: sc.partName, lines }));
  } catch (e) { fs.writeFileSync(`${out}/${pre}.json`, JSON.stringify({ file: f, err: String(e).slice(0, 200) })); }
}
