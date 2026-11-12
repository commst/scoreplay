// 여러 마디를 한꺼번에 잘라 냄: node test/_cropmany.mjs <list.json> <outdir>  (list: [{f, li, n, cap}])
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs'; import { execSync } from 'child_process';
const P = await import(process.env.PARSER || '../src/score-parser.js');
const [lst, out] = process.argv.slice(2), S = '/home/claude/samples', L = JSON.parse(fs.readFileSync(lst)); fs.mkdirSync(out, { recursive: true });
const byF = {}; for (const x of L) (byF[x.f] = byF[x.f] || []).push(x);
for (const [pre, xs] of Object.entries(byF)) {
  const f = S + '/' + fs.readdirSync(S).find(x => x.startsWith(pre)); const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
  const cache = {};
  for (const x of xs) { const r = cache[x.li] || (cache[x.li] = P.analyzeLine(sc, x.li));
    const k = r.bars.findIndex(b => b.number === x.n), g = r.geo[k]; if (!g) continue;
    const st = sc.layouts[g.page].staves[g.staff], R = 2;
    const x0 = Math.max(0, g.x0 - 25), x1 = g.x1 + 10, y0 = Math.max(0, st.top - +(process.env.UP || 75)), y1 = st.bottom + +(process.env.DOWN || 30);
    execSync(`pdftoppm -f ${g.page + 1} -l ${g.page + 1} -r ${72 * R} -x ${Math.round(x0 * R)} -y ${Math.round(y0 * R)} -W ${Math.round((x1 - x0) * R)} -H ${Math.round((y1 - y0) * R)} -png -singlefile "${f}" ${out}/${x.id}`);
    fs.writeFileSync(`${out}/${x.id}.txt`, x.cap); } }
