import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('/home/claude/scoreplay/src/score-parser.js'); const SM='/home/claude/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith('2bc31eef')))));
for (const li of [9,10]) { const r = P.analyzeLine(sc, li);
  r.bars.forEach((b,i) => { const ds = b.events.filter(e=>e.voice==='R').map(e=>String(e.dur)).join(',');
    if (/^1\/8,3\/16,1\/16,1\/8/.test(ds) || b.sectionStart) console.log(li, b.number, b.sectionStart?'||':'', 'p'+r.geo[i].page, b.warnings.join(';').slice(0,80), '|', b.events.map(e=>`${e.voice}${e.t}+${e.dur}${e.tie?'T':''}[${(e.midis||[]).join('.')}]`).join(' ')); }); }
