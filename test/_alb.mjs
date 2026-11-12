// 세로 맞춤 뒤 마디 사건: node test/_alb.mjs <접두어> <줄> <마디…>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js'); const SM = '/home/claude/samples/';
const NEED = /박자보다 김|마디 길이를 넘음|마디선이 보이지 않아|쉼표 일부 숨김/;
const [pre, li, ...bars] = process.argv.slice(2);
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
const all = sc.lines.map((l, i) => P.analyzeLine(sc, i)); const r = P.alignToSystem(all[+li], all);
for (const n of bars) { const b = r.bars.find(q => q.number == n); console.log(n, String(b.barLen), b.warnings.join(';').slice(0, 60), '|', b.events.map(e => `${e.voice}${e.t}+${e.dur}${e.tie ? 'T' : ''}[${(e.midis || []).join('.')}]`).join(' ')); }
