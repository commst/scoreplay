// 마디 그림 잘라 보기: node test/crop.mjs <샘플 접두어> <줄 번호> <마디 번호...> → /tmp/crop-<접두어>-<줄>-<마디>.png (앞뒤 마디 조금 포함)
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs'; import { execSync } from 'child_process';
const P = await import('../src/score-parser.js');
const [pre, line, ...nums] = process.argv.slice(2), S = process.env.SAMPLES || '/home/claude/samples';
const f = S + '/' + fs.readdirSync(S).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const r = P.analyzeLine(sc, sc.lines.length ? +line : null);
for (const n of nums.map(Number)) {
  const k = r.bars.findIndex(b => b.number === n), g = r.geo[k]; if (!g) { console.log('no geo', n); continue; }
  const st = sc.layouts[g.page].staves[g.staff], R = +(process.env.R || 3), s = R * 72 / 72;
  const x0 = Math.max(0, g.x0 - 40), x1 = g.x1 + 40, y0 = Math.max(0, st.top - 35), y1 = st.bottom + 35;
  const out = `/tmp/crop-${pre}-${line}-${n}.png`;
  execSync(`pdftoppm -f ${g.page + 1} -l ${g.page + 1} -r ${72 * R} -x ${Math.round(x0 * s)} -y ${Math.round(y0 * s)} -W ${Math.round((x1 - x0) * s)} -H ${Math.round((y1 - y0) * s)} -png -singlefile "${f}" ${out.replace(/\.png$/, '')} 2>/dev/null`);
  console.log(out);
}
