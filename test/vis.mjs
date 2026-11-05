// 다시 읽은(세로 맞춤) 마디를 PDF에서 잘라 그림으로: S=출력폴더(그 안에 vis/) node test/vis.mjs <샘플 접두어> [개수] [씨앗]
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs'; import { execSync } from 'child_process';
const P = await import('../src/score-parser.js');
const S = process.env.S;
const NEED = /박자보다 김|마디 길이를 넘음/;
const [pre, nmax, seed] = process.argv.slice(2);
const f = fs.readdirSync(process.env.SAMPLES || '/home/claude/samples').find(x => x.startsWith(pre)), path = (process.env.SAMPLES || '/home/claude/samples') + '/' + f;
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(path)));
const all = sc.lines.map((l, i) => P.analyzeLine(sc, i));
const v = x => typeof x === 'number' ? x : x.n / x.d;
const NM = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'], pn = m => NM[m % 12] + (Math.floor(m / 12) - 1);
const cands = [];
all.forEach((r, i) => { const a = P.alignToSystem(r, all); a.bars.forEach((ab, k) => { if (ab !== r.bars[k]) cands.push([i, k, r, ab]); }); });
let s = +seed || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const pick = cands.sort(() => rnd() - .5).slice(0, +nmax || 4);
for (const [i, k, r, ab] of pick) {
  const b = r.bars[k], g = r.geo[k], lay = sc.layouts[g.page], st = lay.staves[g.staff];
  const sx = 3, png = `${S}/vis/${pre}_${i}_${b.number}`;
  execSync(`pdftoppm -f ${g.page + 1} -l ${g.page + 1} -r ${72 * sx} -x ${Math.round((g.x0 - 8) * sx)} -y ${Math.round((st.top - 28) * sx)} -W ${Math.round((g.x1 - g.x0 + 16) * sx)} -H ${Math.round((st.bottom - st.top + 56) * sx)} -png -singlefile "${path}" ${png}`);
  console.log(`== ${png}.png  ${sc.lines[i].name} bar ${b.number} len ${v(b.barLen)}`);
  for (const [lab, bb] of [['before', b], ['after ', ab]]) for (const vo of ['R', 'L']) { const es = bb.events.filter(e => e.voice === vo); if (es.length) console.log('  ', lab, vo, es.map(e => `${v(e.t)}+${v(e.dur)}:${(e.midis || []).map(pn).join('.')}`).join('  ')); }
}
console.log('cands', cands.length);
