// 마디 안(t≠0)에서 앞 음에 못 이어 따로 남은 tie 이벤트 찾기
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js');
const [pre] = process.argv.slice(2); const SM = '/home/claude/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const fr = x => x.n + '/' + x.d; let tot = 0;
for (let li = 0; li < Math.max(1, sc.lines.length); li++) {
  const r = P.analyzeLine(sc, sc.lines.length ? li : null);
  for (const b of r.bars) for (const e of b.events) if (e.tie && e.t.v !== 0) {
    const prev = b.events.filter(o => o.midis && o.midis.includes(e.midis[0]) && o.t.lt(e.t)).pop();
    tot++;
    console.log(`line ${li} ${sc.lines[li] ? sc.lines[li].name : ''} bar ${b.number} tie ${e.voice} t${fr(e.t)} d${fr(e.dur)} m${e.midis} prev:${prev ? prev.voice + ' t' + fr(prev.t) + ' d' + fr(prev.sus || prev.dur) : 'none'}`);
  }
}
console.log('total', tot);
