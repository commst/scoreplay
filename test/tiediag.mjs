// 곡선 중 끝 음을 못 찾았지만 양 끝에 같은 높이 머리가 있는 것(붙임줄 후보 누락) 찾기
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js');
const [pre, lsel] = process.argv.slice(2); const SM = '/home/claude/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const lines = lsel == null ? sc.lines.map((_, i) => i) : lsel.split(',').map(Number);
let tot = 0;
for (const li of lines) {
  globalThis.__curveLog = [];
  const r = P.analyzeLine(sc, li);
  for (const L of globalThis.__curveLog) {
    if (L.end.length) continue;
    const ccy = (L.c.y0 + L.c.y1) / 2;
    const s = L.hs.filter(h => L.c.x0 - 10 <= h[0] && h[0] <= L.c.x0 + 4);
    const e = L.hs.filter(h => L.c.x1 - 6 <= h[0] && h[0] <= L.c.x1 + 12 && h[0] > L.c.x0 + 2);
    const pairs = s.flatMap(a => e.filter(b => Math.abs(a[1] - b[1]) < 1 && Math.abs(a[1] - ccy) < 7).map(b => [a, b]));
    if (!pairs.length) continue;
    // 마디 번호
    const g = r.geo.find(g => g.page === L.pi && Math.abs(sc.layouts[L.pi].staves[g.staff].top - L.st) < 1 && g.x0 - 2 <= L.c.x1 && L.c.x0 <= g.x1 + 2);
    const bar = g ? r.bars[r.geo.indexOf(g)].number : '?';
    tot++;
    console.log(`line ${li} ${sc.lines[li].name} p${L.pi} bar ${bar} curve x${L.c.x0.toFixed(0)}-${L.c.x1.toFixed(0)} y${L.c.y0.toFixed(1)}-${L.c.y1.toFixed(1)} ccy${ccy.toFixed(1)} v${L.voice} pairs ${pairs.map(p => p[0][1] + '(' + p[0][2] + ')>' + p[1][1] + '(' + p[1][2] + ')').join(' ')}`);
  }
}
console.log('total', tot);
