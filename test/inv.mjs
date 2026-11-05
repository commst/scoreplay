// 악보 한 개 요약: node test/inv.mjs 악보.pdf → 제목·파트 이름·쪽·줄 수·줄 이름·첫 줄 마디·음·경고 수(JSON 한 줄). 여러 개는 xargs -P로
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const P = await import('../src/score-parser.js');
const f = process.argv[2];
const out = { file: f.split('/').pop() };
try {
  const data = new Uint8Array(fs.readFileSync(f));
  const doc = await pdfjs.getDocument({ data: data.slice() }).promise; out.pages = doc.numPages;
  const md = await doc.getMetadata().catch(() => ({})); out.meta = md.info?.Title || ''; out.creator = md.info?.Creator || md.info?.Producer || '';
  const sc = await P.loadScore(pdfjs, data);
  out.title = sc.title || ''; out.partName = sc.partName || ''; out.keys = Object.keys(sc).join(',');
  out.lines = sc.lines ? sc.lines.length : 0; out.names = (sc.lines || []).map(l => l.name).slice(0, 30);
  const r = P.analyzeLine(sc, out.lines ? 0 : null);
  out.bars = r.bars.length; out.notes = r.bars.reduce((n, b) => n + b.events.length, 0); out.warnBars = r.bars.filter(b => b.warnings.length).length; out.scanned = !!r.scanned;
} catch (e) { out.err = String(e.message || e).slice(0, 150); }
console.log(JSON.stringify(out));
