import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import { analyzePdf, playbackOrder, defaultTempoRows } from '../src/score-parser.js';
const data = new Uint8Array(fs.readFileSync(process.argv[2]));
const r = await analyzePdf(pdfjs, data);
console.log('title', r.title, 'pages', r.pages, 'bars', r.bars.length, 'mismatch', JSON.stringify(r.mismatches));
const lines = r.bars.map(b => {
  const evs = [...b.events].sort((a,c)=>a.t.v-c.t.v||(a.voice<c.voice?-1:1)).map(e=>`${e.voice}@${e.t}`+(e.accent?'!':'')+(e.grace?'g':'')+(e.roll?'~':'')).join(' ');
  return `${b.number} ${b.timesig.join('/')} ${(b.repeatStart?'|:':'')+(b.repeatEnd?':|':'')} ${evs}`;
});
fs.writeFileSync('js_out.txt', lines.join('\n')+'\n');
console.log(JSON.stringify(defaultTempoRows(r.bars)));
const ord = playbackOrder(r.bars);
console.log('order len', ord.length);
r.bars.filter(b=>b.warnings.length).forEach(b=>console.log(b.number, b.warnings.join('/')));
