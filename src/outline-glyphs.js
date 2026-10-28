import { OUTLINE_TEMPLATES } from './outline-templates.js';
// MuseScore 2 등 글꼴 없이 기호를 외곽선(채운 경로)으로 저장한 PDF에서 음악 기호를 알아본다.
// 경로 하나를 16×16 칸으로 칠해 보고, 음악 글꼴에서 미리 만든 견본(OUTLINE_TEMPLATES)과 가장 닮은 것을 고른다.
// 알아본 기호는 Maestro 글꼴 글자와 같은 모양의 객체로 바꿔 넘긴다 → 나머지 해석 과정은 그대로 쓴다.

const OG_N = 16;

function ogEdges(items) {
  const E = [];
  for (const it of items) {
    if (it.op === 'l') E.push([it.p[0], it.p[1], it.q[0], it.q[1]]);
    else if (it.op === 're') { const c = it.pts; for (let i = 0; i < 4; i++) E.push([c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1]]); }
    else if (it.op === 'c') {
      const p = it.pts;
      if (p.length === 4) {
        let [px, py] = p[0];
        for (let s = 1; s <= 8; s++) {
          const t = s / 8, u = 1 - t;
          const x = u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0];
          const y = u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1];
          E.push([px, py, x, y]); px = x; py = y;
        }
      } else { const a = p[0], b = p[p.length - 1]; E.push([a[0], a[1], b[0], b[1]]); }
    }
  }
  return E;
}

// 16×16 칸 채우기 (nonzero). 결과: 줄마다 16비트 정수 16개
function ogRaster(E, r) {
  const w = r.x1 - r.x0, h = r.y1 - r.y0, rows = new Array(OG_N).fill(0);
  for (let j = 0; j < OG_N; j++) {
    const y = r.y0 + (j + 0.5) * h / OG_N;
    const xs = [];
    for (const [x1, y1, x2, y2] of E) {
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push([x1 + (y - y1) * (x2 - x1) / (y2 - y1), y2 > y1 ? 1 : -1]);
    }
    if (!xs.length) continue;
    xs.sort((a, b) => a[0] - b[0]);
    let wind = 0, k = 0, bits = 0;
    for (let i = 0; i < OG_N; i++) {
      const x = r.x0 + (i + 0.5) * w / OG_N;
      while (k < xs.length && xs[k][0] <= x) { wind += xs[k][1]; k++; }
      if (wind !== 0) bits |= 1 << i;
    }
    rows[j] = bits;
  }
  return rows;
}

function ogPop(v) { v = v - ((v >> 1) & 0x55555555); v = (v & 0x33333333) + ((v >> 2) & 0x33333333); return (((v + (v >> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; }

let OG_T = null;
function ogTemplates() {
  if (OG_T) return OG_T;
  OG_T = OUTLINE_TEMPLATES.map(t => {
    const rows = new Array(OG_N).fill(0);
    // hex: 가장 큰 비트가 앞. 비트 (j*16+i)
    let big = BigInt('0x' + t.g);
    for (let j = 0; j < OG_N; j++) { rows[j] = Number(big & 0xFFFFn); big >>= 16n; }
    return { ...t, rows, fill: rows.reduce((s, v) => s + ogPop(v), 0) };
  });
  return OG_T;
}

// 쪽 하나에 음악 글꼴 글자가 없고 곡선 경로가 많으면 외곽선 악보로 본다
export function looksOutlined(glyphs, drawings) {
  const music = glyphs.filter(g => /Maestro|Opus|Petrucci|Jazz|Engraver Font|Broadway|Sonata|Bravura|MusicFont|Anastasia/i.test(g.font)).length;
  const curves = drawings.filter(d => d.type !== 's' && d.items.some(i => i.op === 'c')).length;
  return music < 5 && curves >= 30;
}

// drawings 중 알아본 기호를 글자로 바꾼다. 반환: { glyphs, drawings(남은 것) }
export function recognizeOutlines(drawings) {
  const T = ogTemplates();
  const cand = [];
  const keep = [];
  for (const d of drawings) {
    const r = d.rect, w = r.x1 - r.x0, h = r.y1 - r.y0;
    const curvy = d.items.some(i => i.op === 'c');
    const ok = d.type !== 's' && w < 45 && h < 45 && w > 0.8 && h > 0.8 && (curvy || d.items.length >= 6);
    if (!ok) { keep.push(d); continue; }
    // MuseScore 트레몰로: 기울어진 평행사변형 2~4개를 한 경로로 그림
    if (d.items.every(i => i.op === 'l') && [8, 12, 16].includes(d.items.length) && w < 10 && h > w * 1.2) {
      cand.push({ d, t: { t: 'trem', c: 190, n: 'tremolo', k: 'emm', b: [0, 0, 1, 1] }, dist: 0, em: null }); continue;
    }
    const rows = ogRaster(ogEdges(d.items), r);
    const a = w / h;
    let best = null, bd = 1e9;
    for (const t of T) {
      if (Math.abs(Math.log(a / t.a)) > 0.13) continue;
      let dist = 0;
      for (let j = 0; j < OG_N; j++) dist += ogPop(rows[j] ^ t.rows[j]);
      if (dist < bd) { bd = dist; best = t; }
    }
    if (best && bd <= 24) cand.push({ d, t: best, dist: bd, em: h / (best.b[3] - best.b[1]) });
    else keep.push(d);
  }
  // 기준 크기: 보통 음표 머리의 em 크기 (중앙값). 너무 크거나 작은 것은 버린다
  const heads = cand.filter(c => c.t.t === 'head').map(c => c.em).sort((x, y) => x - y);
  const emRef = heads.length ? heads[heads.length >> 1] : null;
  const glyphs = [];
  for (const c of cand) {
    const { d, t } = c, r = d.rect;
    if (t.t === 'trem') { glyphs.push({ font: 'MuseScore-emm', size: emRef || 20, ox: r.x0, oy: (r.y0 + r.y1) / 2, x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, outline: 'tremolo', code: 190, uni: '', raw: 190 }); continue; }
    if (emRef && t.k !== 'txt' && (c.em < emRef * 0.5 || c.em > emRef * 1.7)) { keep.push(d); continue; }
    const em = c.em;
    const ox = r.x0 - t.b[0] * em;
    let oy = r.y0 + t.b[3] * em;               // 글꼴 원점 (아래로 갈수록 y 증가)
    if (t.t === 'rest') oy = (r.y0 + r.y1) / 2;
    if (t.t === 'digit' || t.t === 'tuplet' || t.t === 'dyn' || t.t.startsWith('dyncombo')) oy = r.y1;
    const font = t.k === 'txt' ? 'MuseScoreText,BoldItalic' : 'MuseScore-' + t.k;
    const base = { font, size: em, ox, oy, x0: r.x0, x1: r.x1, y0: r.y0, y1: r.y1, outline: t.n };
    // 옥타브 음자리표(8vb 등): 실제 소리는 옥타브 아래·위
    { const m = /Clef(8|15)(vb|va|mb|ma)$/.exec(t.n || ''); if (m) base.clefOct = (m[1] === '8' ? 1 : 2) * (/b$/.test(m[2]) ? -1 : 1); }
    if (t.t.startsWith('dyncombo') && !t.c) {
      // 이어 쓴 셈여림 글자: 글자마다 하나씩 (sf, fp 등)
      const s = t.t.split(':')[1], step = (r.x1 - r.x0) / s.length;
      const L = { p: 112, f: 102, m: 109, s: 115, z: 122, r: 114 };
      [...s].forEach((ch, i) => glyphs.push({ ...base, code: L[ch], uni: ch, raw: L[ch], ox: r.x0 + i * step, x0: r.x0 + i * step, x1: r.x0 + (i + 1) * step }));
      continue;
    }
    let code = t.c;
    if (code === 183 || code === 238) {
      // 온쉼표와 2분쉼표는 모양이 같다: 줄에 매달리면 온쉼표, 줄 위에 앉으면 2분쉼표
      const mx = (r.x0 + r.x1) / 2;
      const lines = drawings.filter(o => o.type === 's' && o.items.length === 1 && o.items[0].op === 'l' && o.rect.y1 - o.rect.y0 < 0.2 && o.rect.x0 < mx && o.rect.x1 > mx);
      if (lines.some(o => Math.abs(o.rect.y0 - r.y1) < 0.8)) code = 238;
      else if (lines.some(o => Math.abs(o.rect.y0 - r.y0) < 0.8)) code = 183;
    }
    glyphs.push({ ...base, code, uni: String.fromCharCode(code), raw: code });
  }
  // 트레몰로(롤): 기둥 위의 짧고 기울어진 사선 2~3개 → 트레몰로 기호 하나
  const slash = rest0 => rest0.filter(d => d.type !== 's' && d.items.length >= 3 && d.items.length <= 5 && d.items.every(i => i.op === 'l')).map(d => {
    const pts = d.items.flatMap(i => [i.p, i.q]);
    const xs = pts.map(p => p[0]), w = Math.max(...xs) - Math.min(...xs);
    const L = pts.filter(p => p[0] < Math.min(...xs) + 0.3), R = pts.filter(p => p[0] > Math.max(...xs) - 0.3);
    const ly = L.reduce((a, p) => a + p[1], 0) / L.length, ry = R.reduce((a, p) => a + p[1], 0) / R.length;
    return { d, w, slope: w > 0 ? Math.abs(ry - ly) / w : 0 };
  }).filter(o => o.w > 2 && o.w < 9 && o.slope > 0.25);
  const sl = slash(keep), usedSl = new Set();
  for (const a of sl) {
    if (usedSl.has(a)) continue;
    const grp = sl.filter(b => !usedSl.has(b) && Math.abs(b.d.rect.x0 - a.d.rect.x0) < 0.6 && Math.abs(b.d.rect.x1 - a.d.rect.x1) < 0.6 && Math.abs(b.d.rect.y0 - a.d.rect.y0) < 8);
    if (grp.length < 2) continue;
    grp.forEach(b => usedSl.add(b));
    const x0 = Math.min(...grp.map(b => b.d.rect.x0)), x1 = Math.max(...grp.map(b => b.d.rect.x1));
    const y0 = Math.min(...grp.map(b => b.d.rect.y0)), y1 = Math.max(...grp.map(b => b.d.rect.y1));
    glyphs.push({ font: 'MuseScore-emm', size: emRef || 20, ox: x0, oy: (y0 + y1) / 2, x0, x1, y0, y1, outline: 'tremolo', code: 190, uni: '', raw: 190 });
  }
  const slashDrawings = new Set([...usedSl].map(b => b.d));
  for (let i = keep.length - 1; i >= 0; i--) if (slashDrawings.has(keep[i])) keep.splice(i, 1);
  // 알아보지 못한 곡선 경로 중 붙임줄처럼 납작하지 않은 것(글자 등)은 붙임줄로 오인하지 않게 버린다
  const rest = keep.filter(d => !(d.type !== 's' && d.items.some(i => i.op === 'c') && (d.rect.x1 - d.rect.x0) / Math.max(0.1, d.rect.y1 - d.rect.y0) < 1.8));
  return { glyphs, drawings: rest };
}
