// 악보로 보기의 단 합치기(svSystem) 규칙을 해석기 layouts에 돌려 봄: node test/_sysmerge.mjs <접두어…>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'); const SM = '/home/claude/samples/';
function merged(sc, page) { const L = sc.layouts[page]; if (!L || !L.systems || !L.sysOf) return null;
  const n = L.staves.length, same = sc.layouts.filter((o, i) => i !== page && o && o.sysOf && o.staves.length === n), groups = L.systems.map(x => x.slice());
  for (let j = groups.length - 1; j > 0; j--) { const a = groups[j - 1][groups[j - 1].length - 1], b = groups[j][0]; const t = same.filter(o => o.sysOf[a] === o.sysOf[b]).length; if (same.length >= 2 && t * 2 > same.length) { groups[j - 1].push(...groups[j]); groups.splice(j, 1); } }
  return groups; }
for (const pre of process.argv.slice(2)) { const f = fs.readdirSync(SM).find(x => x.startsWith(pre)); const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + f)));
  const ch = []; sc.layouts.forEach((L, i) => { const g = merged(sc, i); if (g && g.length !== L.systems.length) ch.push(`p${i}: ${L.systems.length}→${g.length}`); });
  const multi = sc.layouts.filter(L => L && L.systems && L.systems.length > 1).length;
  console.log(pre, f.slice(9, 40), 'pages', sc.layouts.length, '여러 단 쪽', multi, '합친 쪽', ch.length, ch.slice(0, 6).join(' ')); }
