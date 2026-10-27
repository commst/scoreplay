import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const P = await import(process.argv[2]);
for (const f of process.argv.slice(3)) {
  try {
    const r = await P.analyzePdf(pdfjs, new Uint8Array(fs.readFileSync(f)));
    const ev = r.bars.reduce((a, b) => a + b.events.length, 0), w = r.bars.filter(b => b.warnings.length).length;
    console.log(f.split('/').pop().slice(0, 12), r.bars.length, ev, w);
  } catch (e) { console.log(f.split('/').pop().slice(0, 12), 'ERR'); }
}
