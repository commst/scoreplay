// node test/_bar.mjs <pdf접두어> <줄> <마디번호…> : 마디 이벤트 출력
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js');
const [pre, li, ...ns] = process.argv.slice(2); const SM = '/home/claude/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const fr = x => x == null ? '' : (typeof x === 'number' ? String(x) : x.n + '/' + x.d);
const N = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']; const nm = m => N[m % 12] + (Math.floor(m / 12) - 1);
if (li === 'names') { console.log(sc.lines.map((l, i) => i + ':' + l.name + '(' + l.clef + ')').join(' ')); process.exit(); }
const all = process.env.ALIGN ? sc.lines.map((l, i) => P.analyzeLine(sc, i)) : null;
let r = P.analyzeLine(sc, +li); if (all) r = P.alignToSystem(r, all);
for (const n of ns) for (const b of r.bars.filter(b => b.number === +n)) {
  console.log('bar', n, 'len', fr(b.barLen), b.kind, b.warnings.join(' | '));
  for (const e of b.events) console.log('  ', e.voice, fr(e.t), fr(e.dur), (e.midis || []).map(nm).join('+'), e.tie ? 'tie' : '', e.grace ? 'gr' : '', e.pcs ? 'pcs' + e.pcs.map(fr) : '', 'x' + Math.round(e.x || 0));
}
if (process.env.GEO) for (const n of ns) { const k = r.bars.findIndex(b => b.number === +n); console.log('geo', n, JSON.stringify(r.geo[k], (kk, v) => kk === 'heads' || kk === 'xs' ? undefined : v)); }
