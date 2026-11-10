// 오선 사이 음표 머리가 어느 오선 것인지 진단: 가장 가까운 오선(가운데 기준)과 줄·칸 격자가 맞는 오선이 다른 머리 수
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
for (const f of process.argv.slice(2)) { try {
  const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
  if (!globalThis.__k) { globalThis.__k = 1; console.error(Object.keys(sc), Object.keys(sc.pages[0]), Object.keys(sc.layouts[0]), JSON.stringify(sc.layouts[0].staves[0]).slice(0, 300), JSON.stringify(sc.pages[0].glyphs.find(g => g.code === 207) || {}).slice(0, 300)); }
  let gap = 0, swap = 0, amb = 0; const ex = [];
  sc.pages.forEach((pg, pi) => { const st = sc.layouts[pi].staves; if (!st || st.length < 2) return;
    for (const g of pg.glyphs) { if (!(g.code === 207 || g.code === 250 || g.code === 119) || !/Maestro|Opus|Petrucci|Jazz|Engraver Font|Broadway|Sonata|Bravura|MusicFont|MuseScore-|Anastasia/i.test(g.font)) continue;
      let best = -1, bd = 1e9; st.forEach((s, i) => { if (s.top - 45 <= g.oy && g.oy <= s.bottom + 45) { const d = Math.abs(g.oy - s.mid); if (d < bd) { bd = d; best = i; } } });
      if (best < 0) continue; const s = st[best]; if (s.oneLine || s.lines.length !== 5) continue; const sp = (s.bottom - s.top) / 4;
      const out = g.oy < s.top ? s.top - g.oy : g.oy > s.bottom ? g.oy - s.bottom : 0; if (out < sp * 1.4) continue;
      const o = st[g.oy < s.top ? best - 1 : best + 1]; if (!o || o.lines.length !== 5) continue; const so = (o.bottom - o.top) / 4;
      const oo = g.oy < o.top ? o.top - g.oy : g.oy > o.bottom ? g.oy - o.bottom : 0; if (oo > 45) continue;
      gap++; const fit = (y, t, p) => { const k = (y - t) / (p / 2); return Math.abs(k - Math.round(k)); };
      const a = fit(g.oy, s.top, sp), b = fit(g.oy, o.top, so);
      if (a > 0.3 && b < 0.12) { swap++; ex.length < 3 && ex.push([pi + 1, best, Math.round(g.ox), Math.round(g.oy)]); } else if (a < 0.2 && b < 0.2) amb++;
    } });
  console.log(JSON.stringify({ f: f.split('/').pop().slice(0, 8), gap, swap, amb, ex }));
} catch (e) { console.log(JSON.stringify({ f: f.split('/').pop().slice(0, 8), err: String(e).slice(0, 100) })); } }
