// alignToSystem 회귀: node test/alignregr.mjs 악보.pdf … → 넘친 마디 수·다시 읽은 마디 수·경고 없던 마디 변화(alt=0이어야)·음높이 손실(lost)·마디 밖 음(broken)
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const P = await import('../src/score-parser.js');
const NEED = /박자보다 김|마디 길이를 넘음/;
const sig = b => JSON.stringify([b.number, String(b.barLen), b.events.map(e => [e.t, e.dur, e.voice, e.midis, e.tie]), b.warnings]);
let tot = { bad: 0, fixed: 0, lines: 0, alt: 0, broken: 0 };
for (const f of process.argv.slice(2)) {
  let sc; try { sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); } catch (e) { continue; }
  if (!sc.lines || sc.lines.length < 2) continue;
  const all = sc.lines.map((l, i) => P.analyzeLine(sc, i));
  let fb = 0, ff = 0;
  all.forEach((r, i) => {
    const bad = r.bars.filter(b => b.warnings.some(w => NEED.test(w))).length; if (!bad) return;
    const a = P.alignToSystem(r, all); tot.lines++;
    r.bars.forEach((b, k) => { const ab = a.bars[k];
      const isBad = b.warnings.some(w => NEED.test(w));
      if (!isBad && sig(b) !== sig(ab)) tot.alt++;
      if (isBad && ab !== b) { ff++; const v = x => typeof x === 'number' ? x : x.n / x.d;
        const ms = bb => bb.events.flatMap(e => e.midis || []).sort().join(',');
        if (ms(b) !== ms(ab)) { tot.lost = (tot.lost || 0) + 1; if (tot.lost < 8) console.log('PITCHES', f.split('/').pop().slice(0,8), sc.lines[i].name, b.number, ms(b), '=>', ms(ab)); }
        let ok = true, gap = false; for (const vo of ['R','L']) { const es = ab.events.filter(e => e.voice === vo && e.midis && e.midis.length).sort((x, y) => v(x.t) - v(y.t)); let end = 0;
          for (const e of es) { if (v(e.t) < end - 1e-6) ok = false; if (v(e.t) > end + 1e-6) gap = true; end = v(e.t) + v(e.dur); } if (es.length && Math.abs(end - v(ab.barLen)) > 1e-6) gap = true; }
        if (!ok) { tot.overlap = (tot.overlap || 0) + 1; console.log('OVL', f.split('/').pop().slice(0,8), sc.lines[i].name, b.number, ab.events.map(e => e.voice + v(e.t) + '+' + v(e.dur) + (e.tie ? 'T' : '') + ':' + e.midis).join(' ')); } if (!gap && ok) tot.full = (tot.full || 0) + 1;
        const L = v(ab.barLen); for (const e of ab.events) if (!(v(e.dur) > 0) || v(e.t) < -1e-9 || v(e.t) + v(e.dur) > L + 1e-6) { tot.broken++; console.log('BROKEN', f.split('/').pop().slice(0,8), sc.lines[i].name, b.number, e.t, e.dur, L); break; }
      } });
    fb += bad;
  });
  tot.bad += fb; tot.fixed += ff;
  if (fb) console.log(f.split('/').pop().slice(0, 8), 'bad', fb, 'aligned', ff);
}
console.log('TOTAL', JSON.stringify(tot));
