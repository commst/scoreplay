import { looksOutlined, recognizeOutlines } from './outline-glyphs.js';
// Finale(Maestro 글꼴) 벡터 PDF 타악기 악보 리듬 해석기
// pdf.js 문서 객체를 받아 마디 목록과 이벤트를 만든다. 브라우저와 Node 양쪽에서 동작.

// ---------- 분수 ----------
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
export class Fr {
  constructor(n, d = 1) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); this.n = n / g; this.d = d / g; }
  add(o) { return new Fr(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Fr(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return typeof o === 'number' ? new Fr(this.n * o, this.d) : new Fr(this.n * o.n, this.d * o.d); }
  div(k) { return new Fr(this.n, this.d * k); }
  eq(o) { return this.n * o.d === o.n * this.d; }
  lt(o) { return this.n * o.d < o.n * this.d; }
  gt(o) { return this.n * o.d > o.n * this.d; }
  get v() { return this.n / this.d; }
  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`; }
}
const F = (n, d = 1) => new Fr(n, d);
const ZERO = F(0);
const frMax = (a, b) => (a.lt(b) ? b : a);
const frSum = arr => arr.reduce((s, x) => s.add(x), ZERO);

// ---------- Maestro 글꼴 코드 ----------
const HEAD_FILLED = 207, HEAD_WHOLE = 119, HEAD_HALF = 250;
const REST_Q = 206, REST_8 = 228, REST_16 = 197, REST_32 = 168, REST_HALF = 238, REST_WHOLE = 183;
const DOT = 46, FLAG_UP = 106, FLAG_DN = 74, FLAG16_UP = 114, FLAG16_DN = 82;
const ACCENT = 62, MEAS_REPEAT = 212, TWO_BAR_REPEAT = 199, COMMON_TIME = 99;
const FERMATA = 85, TRILL_EXT = 126, TREMOLO3 = 190;
const isDigit = c => c >= 48 && c <= 57;
// SMuFL·MScore 글꼴의 글자 자리(U+E000~) → Maestro 코드 (tools/gen_outline_templates.py의 MAP과 같은 대응, MuseScore 2.0.3 글꼴에서 뽑음)
const MSCORE_PUA = new Map([[48, 48], [49, 49], [50, 50], [51, 51], [52, 52], [53, 53], [54, 54], [55, 55], [56, 56], [57, 57], [102, 102], [109, 109], [112, 112], [114, 114], [115, 115], [122, 122], [57498, 99], [57499, 67], [57600, 183], [57601, 238], [57606, 183], [57607, 206], [57609, 228], [57610, 197], [57611, 168], [57612, 168], [57614, 35], [57619, 110], [57620, 98], [57626, 186], [57628, 220], [57639, 46], [57642, 119], [57643, 119], [57644, 250], [57645, 207], [57648, 207], [57652, 207], [57656, 207], [57657, 119], [57658, 250], [57659, 207], [57660, 207], [57688, 85], [57689, 85], [57719, 37], [57720, 222], [57744, 106], [57745, 114], [57746, 114], [57748, 74], [57751, 82], [57752, 82], [57754, 66], [57756, 63], [57758, 38], [57760, 214], [57815, 38], [57816, 38], [57819, 63], [58528, 62], [58529, 62], [58530, 46], [58531, 46]]);
const SMUFL_PUA = new Map([[57415, 37], [57416, 222], [57424, 38], [57426, 38], [57427, 38], [57436, 66], [57442, 63], [57444, 63], [57449, 214], [57450, 214], [57472, 48], [57473, 49], [57474, 50], [57475, 51], [57476, 52], [57477, 53], [57478, 54], [57479, 55], [57480, 56], [57481, 57], [57482, 99], [57483, 67], [57504, 119], [57506, 119], [57507, 250], [57508, 207], [57511, 119], [57512, 250], [57513, 207], [57523, 207], [57534, 207], [57563, 207], [57601, 207], [57831, 46], [57890, 190], [57920, 106], [57921, 74], [57922, 114], [57923, 82], [57924, 114], [57925, 82], [57952, 98], [57953, 110], [57954, 35], [57955, 220], [57956, 186], [58528, 62], [58529, 62], [58530, 46], [58531, 46], [58560, 85], [58561, 85], [58594, 183], [58595, 183], [58596, 238], [58597, 206], [58598, 228], [58599, 197], [58600, 168], [58601, 168], [58624, 212], [58625, 199], [58656, 112], [58657, 109], [58658, 102], [58659, 114], [58660, 115], [58661, 122]]);
// Adobe Symbol 글꼴의 글자 자리 (유니코드 → 코드)
const SYMBOL_UNI = new Map([...'ΑΒΧΔΕΦΓΗΙϑΚΛΜΝΟΠΘΡΣΤΥςΩΞΨΖ'].map((ch, i) => [ch.codePointAt(0), 0x41 + i])
  .concat([...'αβχδεφγηιϕκλμνοπθρστυϖωξψζ'].map((ch, i) => [ch.codePointAt(0), 0x61 + i]))
  .concat([[0x2212, 0x2D], [0xB5, 0x6D], [0x2022, 0xB7], [0x2260, 0xB9], [0x2261, 0xBA], [0x2217, 0x2A], [0x2245, 0x40], [0x22A5, 0x5E], [0x223C, 0x7E], [0x2032, 0xA2], [0x2264, 0xA3], [0x221E, 0xA5], [0x2265, 0xB3], [0x221D, 0xB5], [0x2202, 0xB6]]));


// 셈여림 (Maestro 글꼴, MacRoman 코드). mf=F, mp=P 는 달빛항해에서 확인, 나머지는 Maestro 배치표 기준 추정
const DYN_COMPOSITE = { 70: 'mf', 80: 'mp', 185: 'pp', 184: 'ppp', 196: 'ff', 236: 'fff', 167: 'sfz' };
const DYN_LETTER = { 112: 'p', 102: 'f', 115: 's', 122: 'z', 114: 'r', 109: 'm' };
export const DYN_LEVEL = { ppp: 0.22, pp: 0.32, p: 0.45, mp: 0.6, mf: 0.75, f: 0.9, ff: 1.0, fff: 1.0 };
const DYN_ACCENT = new Set(['sf', 'sfz', 'fz', 'rfz', 'sffz', 'fp', 'sfp', 'fzp']);
const DYN_AFTER = { fp: 'p', sfp: 'p', fzp: 'p' };
const SEGNO = 37;                       // %
const CODA_CODES = new Set([175, 191, 222]); // Ø, ø, 222(축연무에서 확인)

function addLabel(m, s) { (m.labels || (m.labels = [])).push(s); }

// 악보 글꼴이 아닌 글자를 같은 줄끼리 묶는다
function textRuns(glyphs) {
  const gs = glyphs.filter(g => !isMusicFont(g.font)).sort((a, b) => a.oy - b.oy || a.ox - b.ox);
  const rows = [];
  for (const g of gs) {
    const r = rows.find(r => Math.abs(r.y - g.oy) < 2);
    if (r) r.g.push(g); else rows.push({ y: g.oy, g: [g] });
  }
  const runs = [];
  for (const row of rows) {
    row.g.sort((a, b) => a.ox - b.ox);
    let cur = null;
    for (const g of row.g) {
      const ch = String.fromCodePoint(g.code);
      const prev = cur && cur.g[cur.g.length - 1];
      const dash = ch === '-' && prev && String.fromCodePoint(prev.code) === '-';
      if (cur && g.x0 - prev.x1 < (dash ? 14 : 7)) cur.g.push(g);
      else { cur = { g: [g] }; runs.push(cur); }
    }
  }
  return runs.map(r => ({ text: r.g.map(g => String.fromCodePoint(g.code)).join(''), x0: r.g[0].x0, x1: r.g[r.g.length - 1].x1,
    y: r.g[0].oy, size: r.g[0].size, used: false }));
}

// 획(stroke)으로 그린 선분
function strokeSegs(drawings) {
  const out = [];
  for (const d of drawings) {
    if (d.type !== 's') continue;
    for (const it of d.items) {
      if (it.op !== 'l') continue;
      let [p, q] = [it.p, it.q];
      if (q[0] < p[0]) [p, q] = [q, p];
      out.push({ x0: p[0], y0: p[1], x1: q[0], y1: q[1], used: false });
    }
  }
  return out;
}

// ---------- 1. pdf.js 연산자 해석 ----------
// 악보 글꼴(Maestro 등)은 PDF마다 PUA(U+F0xx) 또는 일반 유니코드로 담긴다. 둘 다 Mac 문자표 번호로 맞춘다.
const MAC_HI = 'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…\u00a0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ\uf8ffÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';
const UNI_TO_MAC = new Map([...MAC_HI].map((c, i) => [c.codePointAt(0), 128 + i]));
const MUSIC_FONT = /Maestro|Opus|Petrucci|Jazz|Engraver Font|Broadway|Sonata|Bravura|MusicFont|MuseScore-|Anastasia/i;
const isMusicFont = f => MUSIC_FONT.test(f);
function glyphCode(font, g) {
  const cp = g.unicode ? g.unicode.codePointAt(0) : (g.originalCharCode || 0);
  if (cp >= 0xF000 && cp < 0xF100) return cp;               // 아래에서 0xF000을 뺀다
  if (MUSIC_FONT.test(font) && UNI_TO_MAC.has(cp)) {
    const mac = UNI_TO_MAC.get(cp);
    if (/OpusSpecial/i.test(font) && mac === 170) return 0xF000 + 46;   // Sibelius 점
    return 0xF000 + mac;
  }
  if (/MaestroPercussion/i.test(font) && (cp === 120 || cp === 121)) return 0xF000 + 207;   // X 머리 → 보통 머리로
  if (MUSIC_FONT.test(font) && cp < 128) return 0xF000 + cp;
  return cp;
}
function mmul(m1, m2) { // m1 * m2 (m2 먼저 적용 후 m1)  — pdf.js Util.transform 과 동일
  return [m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5]];
}
function toHex(a) {
  const c = typeof a[0] === 'string' ? null : (a[0] && a[0].length >= 3 ? a[0] : a);
  if (!c) return a[0];
  return '#' + [0, 1, 2].map(i => Math.round(c[i]).toString(16).padStart(2, '0')).join('');
}
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

// Encore(Anastasia 글꼴): 오선·마디선·기둥까지 글자로 찍는다 → 선으로 바꾸고, 기호 코드는 Maestro에 맞춘다
function convertEncore(glyphs, drawings) {
  if (!glyphs.some(g => /Anastasia/i.test(g.font))) return;
  const line = (x0, y0, x1, y1, w) => drawings.push({ type: 's', items: [{ op: 'l', p: [x0, y0], q: [x1, y1] }],
    rect: { x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) }, width: w, seq: drawings.length });
  const stems = [];
  const out = [];
  for (const g of glyphs) {
    if (!/Anastasia/i.test(g.font)) { out.push(g); continue; }
    const s = g.size / 1000, X = fx => g.ox + fx * s, Y = fy => g.oy - fy * s;
    switch (g.code) {
      case 61: for (let k = 0; k <= 4; k++) line(X(0), Y(k * 250), X(1011), Y(k * 250), 18 * s); break;      // 오선 한 토막
      case 108: line(X(12), Y(1000), X(12), Y(0), 25 * s); break;                                           // 마디선
      case 210: line(X(75), Y(1000), X(75), Y(0), 150 * s); line(X(240), Y(1000), X(240), Y(0), 37 * s); break; // 굵은+가는 겹세로줄
      case 211: line(X(216), Y(1000), X(216), Y(0), 37 * s); line(X(380), Y(1000), X(380), Y(0), 150 * s); break;
      case 199: stems.push([X(291), Y(259), Y(0)]); break;                                                  // 위로 뻗는 기둥 한 토막
      case 200: stems.push([X(9), Y(0), Y(-259)]); break;                                                   // 아래로 뻗는 기둥 한 토막
      case 95: case 76: case 194: case 105: case 96: break;                                                 // 덧줄, 단 괄호 끝, 조표 등은 버림
      case 123: {                                                                                           // 도돌이 점 두 개
        for (const fy of [370, 633]) out.push({ ...g, code: 46, uni: '.', ox: X(0), oy: Y(fy), x0: X(0), x1: X(126), y0: Y(fy + 63), y1: Y(fy - 63) });
        break;
      }
      case 163: out.push({ ...g, font: 'EncoreTuplet,BoldItalic', code: 51, uni: '3' }); break;              // 잇단음표 3
      case 192: {                                                                                           // X 머리: 같은 자리 머리가 2분·온음표면 그 길이
        const mate = glyphs.find(h => /Anastasia/i.test(h.font) && (h.code === 250 || h.code === 119) && Math.abs(h.ox - g.ox) < 1.5 && Math.abs(h.oy - g.oy) < g.size * 1.2);
        out.push({ ...g, code: mate ? mate.code : 207 }); break;
      }
      case 246: out.push({ ...g, code: 207 }); break;                                                       // 다른 성부 머리 → 보통 머리
      case 231: out.push({ ...g, code: 190 }); break;                                                       // 트레몰로(사선 2개)
      case 83: out.push({ ...g, code: 115 }, { ...g, code: 102, ox: X(400), x0: X(400) }); break;           // sf
      default: out.push(g);
    }
  }
  // 토막 난 기둥을 한 줄로 잇는다
  stems.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const st of stems) {
    const m = merged.find(o => Math.abs(o[0] - st[0]) < 0.3 && st[1] <= o[2] + 0.6 && st[2] >= o[1] - 0.6);
    if (m) { m[1] = Math.min(m[1], st[1]); m[2] = Math.max(m[2], st[2]); } else merged.push([...st]);
  }
  for (const [x, y0, y1] of merged) { line(x, y0, x, y1, 0.5); drawings[drawings.length - 1].stem = true; }
  // 한 기둥에 붙은 음이 겹쳐 옆으로 밀려난 머리(기둥 없음)는 리듬에 필요 없으니 뺀다
  // 같은 자리에 똑같이 두 번 찍힌 머리는 하나만
  for (let i = out.length - 1; i >= 0; i--) {
    const g = out[i];
    if (!/Anastasia/i.test(g.font) || ![207, 250, 119].includes(g.code)) continue;
    if (out.some((h, j) => j < i && h.code === g.code && h.font === g.font && Math.abs(h.ox - g.ox) < 0.3 && Math.abs(h.oy - g.oy) < 0.3)) out.splice(i, 1);
  }
  const isHead = g => /Anastasia/i.test(g.font) && (g.code === 207 || g.code === 250);
  const stemmed = g => merged.some(([x, y0, y1]) => x > g.ox - 1.2 && x < g.ox + g.size * 0.3 + 1.2 && y0 - 3 <= g.oy && g.oy <= y1 + 3);
  const heads = out.filter(isHead), withStem = new Set(heads.filter(stemmed));
  const drop = new Set(heads.filter(h => !withStem.has(h) && heads.some(m => withStem.has(m) && Math.abs(m.oy - h.oy) <= h.size * 0.3 && Math.abs(m.ox - h.ox) > 0.5 && Math.abs(m.ox - h.ox) < h.size * 0.45)));
  if (drop.size) for (let i = out.length - 1; i >= 0; i--) if (drop.has(out[i])) out.splice(i, 1);
  // 글자 상자를 실제 모양에 맞춘다 (기둥 끝·꼬리 위치 비교에 씀)
  for (const g of out) {
    if (!/Anastasia/i.test(g.font)) continue;
    const b = ANAS_BBOX[g.code] || (g.code >= 48 && g.code <= 57 ? [0, -241, 378, 241] : null);
    if (!b || g.code === 46 && g.y1 - g.y0 < g.size * 0.2) continue;
    const s = g.size / 1000;
    g.x0 = g.ox + b[0] * s; g.x1 = g.ox + b[2] * s; g.y0 = g.oy - b[3] * s; g.y1 = g.oy - b[1] * s;
  }
  glyphs.length = 0; glyphs.push(...out);
}
const ANAS_BBOX = {"46":[0,-46,94,48],"47":[0,0,174,500],"52":[0,-241,378,241],"62":[0,4,417,257],"70":[0,-172,834,413],"74":[0,-874,264,-124],"80":[0,-172,800,266],"85":[0,0,658,352],"102":[0,-172,515,413],"106":[282,124,546,874],"112":[0,-172,445,266],"119":[0,-126,412,126],"183":[0,125,313,250],"185":[0,-172,821,266],"190":[0,0,300,479],"196":[0,-172,801,413],"197":[0,-384,331,322],"206":[0,-355,252,400],"207":[0,-128,300,128],"212":[0,0,610,509],"228":[0,-384,262,78],"236":[0,-172,1087,413],"238":[0,0,313,125],"250":[0,-134,300,134]};

export async function extractPages(doc, OPS, onPage) {
  const pages = [];
  // 다음 쪽 두 개를 미리 요청해 둔다: 브라우저에서는 PDF 해석(작업 스레드)과 이 쪽 처리(화면 스레드)가 겹쳐 돈다
  const fetchOL = pn => doc.getPage(pn).then(p => p.getOperatorList().then(ol => ({ page: p, ol })));
  const ahead = new Map();
  const want = pn => { if (pn <= doc.numPages && !ahead.has(pn)) { const pr = fetchOL(pn); pr.catch(() => {}); ahead.set(pn, pr); } };
  for (let pn = 1; pn <= doc.numPages; pn++) {
    if (onPage) onPage(pn, doc.numPages);
    want(pn); want(pn + 1); want(pn + 2);
    const { page, ol } = await ahead.get(pn); ahead.delete(pn);
    // 쪽 회전(/Rotate)까지 반영해 위에서 아래로 내려가는 화면 좌표로 바꾼다
    const vp = page.getViewport({ scale: 1 });
    const H = vp.height, VT = vp.transform;
    const flip = (x, y) => [VT[0] * x + VT[2] * y + VT[4], VT[1] * x + VT[3] * y + VT[5]];
    const glyphs = [], drawings = [], whites = [];
    let st = { ctm: [1, 0, 0, 1, 0, 0], font: '', size: 0, cs: 0, ws: 0, hs: 1, rise: 0, lw: 1, sc: '#000000', fc: '#000000' };
    const stack = [];
    let tm = [1, 0, 0, 1, 0, 0], lm = [1, 0, 0, 1, 0, 0], leading = 0;
    let path = null, pcur = null, pstart = null;
    const fontName = id => { try { const f = page.commonObjs.get(id); return f.name || f.loadedName || id; } catch (e) { return id; } };
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], a = ol.argsArray[i];
      switch (fn) {
        case OPS.save: stack.push({ ...st, ctm: st.ctm.slice() }); break;
        case OPS.restore: if (stack.length) st = stack.pop(); break;
        case OPS.transform: st.ctm = mmul(st.ctm, a); break;
        case OPS.setLineWidth: st.lw = a[0]; break;
        case OPS.setStrokeRGBColor: st.sc = toHex(a); break;
        case OPS.setFillRGBColor: st.fc = toHex(a); break;
        case OPS.setStrokeGray: st.sc = a[0] >= 0.95 ? '#ffffff' : '#000000'; break;
        case OPS.setFillGray: st.fc = a[0] >= 0.95 ? '#ffffff' : '#000000'; break;
        case OPS.beginText: tm = [1, 0, 0, 1, 0, 0]; lm = [1, 0, 0, 1, 0, 0]; break;
        case OPS.setFont: st.font = fontName(a[0]); st.size = a[1]; break;
        case OPS.setTextMatrix: tm = a.slice(); lm = a.slice(); break;
        case OPS.moveText: lm = mmul(lm, [1, 0, 0, 1, a[0], a[1]]); tm = lm.slice(); break;
        case OPS.setLeadingMoveText: leading = -a[1]; lm = mmul(lm, [1, 0, 0, 1, a[0], a[1]]); tm = lm.slice(); break;
        case OPS.nextLine: lm = mmul(lm, [1, 0, 0, 1, 0, -leading]); tm = lm.slice(); break;
        case OPS.setLeading: leading = a[0]; break;
        case OPS.setCharSpacing: st.cs = a[0]; break;
        case OPS.setWordSpacing: st.ws = a[0]; break;
        case OPS.setHScale: st.hs = a[0] / 100; break;
        case OPS.setTextRise: st.rise = a[0]; break;
        case OPS.showText:
        case OPS.showSpacedText: {
          for (const g of a[0]) {
            if (typeof g === 'number') { tm = mmul(tm, [1, 0, 0, 1, -g * st.size / 1000 * st.hs, 0]); continue; }
            if (!g) continue;
            const m = mmul(st.ctm, tm);
            const [px, py] = apply(m, 0, st.rise);
            const [x, y] = flip(px, py);
            const vs = Math.hypot(m[2], m[3]) * st.size;
            const adv = (g.width || 0) * st.size / 1000;
            const cp = glyphCode(st.font, g);
            const advPage = adv * st.hs * Math.hypot(m[0], m[1]);
            glyphs.push({
              code: cp >= 0xF000 && cp < 0xF100 ? cp - 0xF000 : cp, uni: g.unicode || '', font: st.font, raw: g.unicode ? g.unicode.codePointAt(0) : 0,
              size: vs, ox: x, oy: y, x0: x, x1: x + advPage, y0: y - 0.8 * vs, y1: y + 0.2 * vs,
            });
            let tx = adv + st.cs + (g.isSpace ? st.ws : 0);
            tm = mmul(tm, [1, 0, 0, 1, tx * st.hs, 0]);
          }
          break;
        }
        case OPS.constructPath: {
          const [ops, coords] = a;
          if (!path) { path = []; pcur = null; pstart = null; }
          let k = 0, cur = pcur, start = pstart;
          const P = (x, y) => flip(...apply(st.ctm, x, y));
          for (const op of ops) {
            if (op === OPS.moveTo) { cur = P(coords[k], coords[k + 1]); start = cur; k += 2; }
            else if (op === OPS.lineTo) { const q = P(coords[k], coords[k + 1]); if (cur) path.push({ op: 'l', p: cur, q }); else start = q; cur = q; k += 2; }
            else if (op === OPS.curveTo) { const a1 = P(coords[k], coords[k + 1]); const pts = [cur || a1, a1, P(coords[k + 2], coords[k + 3]), P(coords[k + 4], coords[k + 5])]; path.push({ op: 'c', pts }); cur = pts[3]; k += 6; }
            else if (op === OPS.curveTo2 || op === OPS.curveTo3) { const a1 = P(coords[k], coords[k + 1]); const pts = [cur || a1, a1, P(coords[k + 2], coords[k + 3])]; path.push({ op: 'c', pts }); cur = pts[2]; k += 4; }
            else if (op === OPS.rectangle) {
              const [x, y, w, h] = coords.slice(k, k + 4); k += 4;
              const c = [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)];
              path.push({ op: 're', pts: c });
            } else if (op === OPS.closePath) {
              if (cur && start && (Math.abs(cur[0] - start[0]) > 0.01 || Math.abs(cur[1] - start[1]) > 0.01)) path.push({ op: 'l', p: cur, q: start });
              cur = start;
            }
          }
          pcur = cur; pstart = start;
          break;
        }
        case OPS.stroke: case OPS.closeStroke: case OPS.fill: case OPS.eoFill:
        case OPS.fillStroke: case OPS.eoFillStroke: case OPS.closeFillStroke: case OPS.closeEOFillStroke: case OPS.endPath: {
          const isWhite = c => /^#(f[0-9a-f]){3}$/i.test(c || '');
          const paintWhite = (fn === OPS.stroke || fn === OPS.closeStroke) ? isWhite(st.sc) : isWhite(st.fc);
          if (path && path.length && fn !== OPS.endPath && paintWhite && fn !== OPS.stroke) {
            const pts = path.flatMap(it => it.op === 'l' ? [it.p, it.q] : it.pts).filter(Boolean);
            const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
            whites.push({ x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), seq: drawings.length });
          }
          if (path && path.length && fn !== OPS.endPath && !paintWhite) {
            const type = (fn === OPS.stroke || fn === OPS.closeStroke) ? 's' : (fn === OPS.fill || fn === OPS.eoFill) ? 'f' : 'fs';
            const pts = path.flatMap(it => it.op === 'l' ? [it.p, it.q] : it.pts);
            const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
            const sc = Math.sqrt(Math.abs(st.ctm[0] * st.ctm[3] - st.ctm[1] * st.ctm[2]));
            drawings.push({
              type, items: path,
              rect: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) },
              width: st.lw * sc, seq: drawings.length,
            });
          }
          path = null;
          break;
        }
        default: break;
      }
    }
    for (const d of drawings) { d.rect.width = d.rect.x1 - d.rect.x0; d.rect.height = d.rect.y1 - d.rect.y0; }
    // 이름이 감춰진 악보 글꼴(예: TTE18A08A0t00)은 글자 구성으로 알아낸다: 음표 머리 œ, 쉼표 Œ ‰, 타악기 음자리표 ÷ 등
    const MUSIC_MARK = new Set([0x153, 0x152, 0x2030, 0xF7, 0x2211, 0x2d9]);
    const cnt = {};
    // 윈도 기호 글꼴 자리(U+F020~F0FF, 예: Microsoft Print to PDF로 만든 Finale 악보의 'CIDFont+F1')도 같은 방법으로
    const PUA_MARK = new Set([207, 206, 183, 228, 250, 214]);
    for (const g of glyphs) if (!isMusicFont(g.font) && (MUSIC_MARK.has(g.raw) || (g.raw >= 0xF020 && g.raw <= 0xF0FF && PUA_MARK.has(g.raw - 0xF000)))) cnt[g.font] = (cnt[g.font] || 0) + 1;
    for (const [f, c] of Object.entries(cnt)) if (c >= 5) {
      for (const g of glyphs) if (g.font === f) {
        const mac = UNI_TO_MAC.get(g.raw);
        g.code = g.raw >= 0xF020 && g.raw <= 0xF0FF ? g.raw - 0xF000 : mac != null ? mac : (g.raw < 128 ? g.raw : g.code);
        g.font = f + ' (MusicFont)';
      }
    }
    // MuseScore 2.1+(MScore 글꼴)·SMuFL 글꼴(Bravura, Leland, Emmentaler 등: MuseScore 3·4, Dorico)로 찍은 기호를 Maestro 코드로
    for (const g of glyphs) {
      const tab = /MScore(?!Text)/i.test(g.font) ? MSCORE_PUA : /Bravura|Leland|Petaluma|Gootville|Emmentaler|Edwin|Leipzig|Sebastian|Finale ?(Maestro|Broadway|Ash|Jazz|Legacy)/i.test(g.font) && !/Text/i.test(g.font) ? SMUFL_PUA : null;
      if (!tab) continue;
      const c = tab.get(g.raw);
      if (c != null) g.code = c; else if (g.raw >= 0xE000 && g.raw <= 0xF8FF) g.code = 0;
      if (tab === SMUFL_PUA) { const o = { 0xE052: -1, 0xE053: 1, 0xE051: -2, 0xE054: 2, 0xE064: -1, 0xE065: 1, 0xE063: -2, 0xE066: 2 }[g.raw]; if (o) g.clefOct = o; }
      if (!/\(MusicFont\)/.test(g.font)) g.font += ' (MusicFont)';
    }
    // SMuFL 글자 글꼴(BravuraText·LelandText 등)의 메트로놈 음표: 빠르기 표시 '♩.=110'
    {
      const MET = new Map([[0xECA3, 104], [0xECA5, 113], [0xECA7, 101], [0xECB7, 107], [0xE1D3, 104], [0xE1D5, 113], [0xE1D7, 101], [0xE1E7, 107]]);
      for (const g of glyphs) if (/Bravura|Leland|Petaluma|Finale|MScore|Emmentaler/i.test(g.font) && /Text/i.test(g.font) && MET.has(g.raw)) { g.code = MET.get(g.raw); g.font += ' (MusicFont)'; }
    }
    // Maestro를 CID 글꼴로 넣은 PDF(PDF-XChange 등): 일부 글자의 유니코드가 Symbol 글꼴 배치의 그리스 문자로 나오고,
    // 그 자리가 실제 글자보다 하나 앞이다 (α→b 내림표, ι→j·Ι→J 꼬리, ϖ→w 온음표, −→. 점, µ→n 제자리표)
    {
      const byFont = {};
      for (const g of glyphs) if (/Maestro/i.test(g.font) && g.raw >= 0x391 && g.raw <= 0x3D6 && g.raw !== 0x3C0 && g.raw !== 0x3A9) byFont[g.font] = (byFont[g.font] || 0) + 1;   // π·Ω는 보통 Maestro(MacRoman)에도 있는 글자
      for (const [f, c] of Object.entries(byFont)) if (c >= 3) {
        for (const g of glyphs) if (g.font === f) { const sc = SYMBOL_UNI.get(g.raw); if (sc != null) g.code = sc + 1; else if (g.raw > 32 && g.raw < 127) g.code = g.raw + 1; }   // ASCII 자리 글자도 하나씩 밀려 있다 (% → & 높은음자리표, > → ? 낮은음자리표, 숫자)
      }
    }
    // 굵게 보이려고 같은 글자를 살짝 어긋나게 여러 번 찍은 경우(가짜 굵은 글씨) 하나만 남긴다
    {
      const keep = [], grid = new Map();
      for (const g of glyphs) {
        const k = g.font + '|' + g.code + '|' + Math.round(g.ox) + '|' + Math.round(g.oy);
        const near = [];
        for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) { const a = grid.get(g.font + '|' + g.code + '|' + (Math.round(g.ox) + dx) + '|' + (Math.round(g.oy) + dy)); if (a) near.push(...a); }
        const music = isMusicFont(g.font);
        const dup = near.some(h => { const d = Math.hypot(h.ox - g.ox, h.oy - g.oy); return music ? (d > 0.01 && d < 0.6) : d < 0.6; });
        if (dup) continue;
        keep.push(g);
        if (!grid.has(k)) grid.set(k, []); grid.get(k).push(g);
      }
      glyphs.length = 0; glyphs.push(...keep);
    }
    // 흰색으로 덮인 가로선(숨긴 오선)은 지운다
    const hidden = d => {
      const r = d.rect; if (r.height > 0.3 || r.width < 50) return false;
      let cov = 0; for (const w of whites) if (w.seq > d.seq && w.y0 <= r.y0 + 0.3 && w.y1 >= r.y0 - 0.3) cov += Math.max(0, Math.min(w.x1, r.x1) - Math.max(w.x0, r.x0));
      return cov > r.width * 0.9;
    };
    convertEncore(glyphs, drawings);
    // 오선·마디선을 한 경로에 몰아 그린 PDF(Finale 2004~2005 + Distiller 6 등): 선분마다 따로 나눈다
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      if (d.type !== 's' || d.items.length <= 6 || !d.items.every(it => it.op === 'l')) continue;
      const parts = d.items.map(it => ({ type: 's', items: [it], width: d.width, seq: d.seq,
        rect: { x0: Math.min(it.p[0], it.q[0]), y0: Math.min(it.p[1], it.q[1]), x1: Math.max(it.p[0], it.q[0]), y1: Math.max(it.p[1], it.q[1]),
          width: Math.abs(it.p[0] - it.q[0]), height: Math.abs(it.p[1] - it.q[1]) } }));
      drawings.splice(i, 1, ...parts);
    }
    // 똑같은 도형을 두 번 그린 경우(doPDF 등) 하나만 남긴다 — 빔이 두 겹으로 세어지지 않게
    {
      const seen = new Set();
      for (let i = 0; i < drawings.length; i++) {
        const d = drawings[i], r = d.rect;
        const k = d.type + '|' + d.items.length + '|' + [r.x0, r.y0, r.x1, r.y1].map(v => Math.round(v * 20)).join(',');
        if (seen.has(k)) { drawings.splice(i, 1); i--; } else seen.add(k);
      }
    }
    let kept = drawings.filter(d => !(d.type === 's' && hidden(d)));
    kept = mergeHatched(kept);
    // 글꼴 없이 기호를 외곽선으로 그린 PDF(MuseScore 2 등): 모양으로 기호를 알아본다
    let outlined = false;
    if (looksOutlined(glyphs, kept)) {
      const r = recognizeOutlines(kept);
      if (r.glyphs.length >= 10) { glyphs.push(...r.glyphs); kept = r.drawings; outlined = true; }
    }
    pages.push({ glyphs, drawings: kept, width: vp.width, height: H, outlined, encore: glyphs.some(g => /Anastasia/i.test(g.font)) });
  }
  return pages;
}

// 굵은 선을 얇은 선 여러 개로 촘촘히 겹쳐 그린 PDF(pdfFactory 등): 나란한 얇은 선을 굵은 선 하나로 합친다
function mergeHatched(drawings) {
  const single = [], other = [];
  for (const d of drawings) {
    if (d.type === 's' && d.items.length === 1 && d.items[0].op === 'l' && (d.width || 0) < 0.6) single.push(d); else other.push(d);
  }
  const used = new Set(), out = [...other];
  const vert = single.filter(d => d.rect.width < 0.05 && d.rect.height > 2), horz = single.filter(d => d.rect.height < 0.05 && d.rect.width > 2);
  const groupBy = (list, key, pos) => {
    const m = new Map();
    for (const d of list) { const k = key(d); if (!m.has(k)) m.set(k, []); m.get(k).push(d); }
    for (const g of m.values()) {
      g.sort((a, b) => pos(a) - pos(b));
      let run = [g[0]];
      const flush = () => {
        if (run.length >= 2) {
          const lo = pos(run[0]), hi = pos(run[run.length - 1]), mid = (lo + hi) / 2, w = hi - lo + (run[0].width || 0.24);
          const r = run[0].rect, isV = r.width < 0.05;
          const p = isV ? [mid, r.y0] : [r.x0, mid], q = isV ? [mid, r.y1] : [r.x1, mid];
          out.push({ type: 's', items: [{ op: 'l', p, q }], rect: { x0: Math.min(p[0], q[0]), y0: Math.min(p[1], q[1]), x1: Math.max(p[0], q[0]), y1: Math.max(p[1], q[1]), width: Math.abs(q[0] - p[0]), height: Math.abs(q[1] - p[1]) }, width: w });
          run.forEach(d => used.add(d));
        }
      };
      for (let i = 1; i < g.length; i++) { if (pos(g[i]) - pos(run[run.length - 1]) < 0.45) run.push(g[i]); else { flush(); run = [g[i]]; } }
      flush();
    }
  };
  // 기울어진 빔을 얇은 사선 여러 개로 그린 경우
  const slant = single.filter(d => d.rect.width > 2 && d.rect.height >= 0.05 && d.rect.height / d.rect.width < 0.7);
  {
    const L = d => { const { p, q } = d.items[0]; return p[0] <= q[0] ? [p, q] : [q, p]; };
    const m = new Map();
    for (const d of slant) { const [a, b] = L(d); const k = Math.round(a[0] * 5) + ':' + Math.round(b[0] * 5) + ':' + Math.round((b[1] - a[1]) * 5); if (!m.has(k)) m.set(k, []); m.get(k).push(d); }
    for (const g of m.values()) {
      g.sort((x, y) => L(x)[0][1] - L(y)[0][1]);
      let run = [g[0]];
      const flush = () => {
        if (run.length >= 3) {
          const [a0, b0] = L(run[0]), [a1, b1] = L(run[run.length - 1]);
          const p = [a0[0], (a0[1] + a1[1]) / 2], q = [b0[0], (b0[1] + b1[1]) / 2];
          out.push({ type: 's', items: [{ op: 'l', p, q }], rect: { x0: p[0], y0: Math.min(p[1], q[1]), x1: q[0], y1: Math.max(p[1], q[1]), width: q[0] - p[0], height: Math.abs(q[1] - p[1]) }, width: a1[1] - a0[1] + (run[0].width || 0.06) });
          run.forEach(d => used.add(d));
        }
      };
      for (let i = 1; i < g.length; i++) { if (L(g[i])[0][1] - L(run[run.length - 1])[0][1] < 0.45) run.push(g[i]); else { flush(); run = [g[i]]; } }
      flush();
    }
  }
  groupBy(vert, d => Math.round(d.rect.y0 * 5) + ':' + Math.round(d.rect.y1 * 5), d => d.rect.x0);
  groupBy(horz, d => Math.round(d.rect.x0 * 5) + ':' + Math.round(d.rect.x1 * 5), d => d.rect.y0);
  for (const d of single) if (!used.has(d)) out.push(d);
  return out;
}

// ---------- 2. 악보 구조 해석 ----------
function findStaves(drawings) {
  const vls = vlines(drawings);
  // 가로선: 같은 높이에서 맞닿아 이어지는 선(마디마다 끊어 그린 오선, MuseScore 등)은 하나로 잇는다
  const segs = [];
  for (const d of drawings) {
    if (d.type !== 's' || (d.width || 0) > 1.5) continue;
    if (d.items.length === 1 && d.items[0].op === 'l') {
      const r = d.rect;
      if (r.height < 0.1 && r.width > 10) segs.push([r.y0, r.x0, r.x1]);
    } else if (d.items.length === 5 && d.items.every(it => it.op === 'l' && Math.abs(it.p[1] - it.q[1]) < 0.1 && Math.abs(it.q[0] - it.p[0]) > 10)
      && d.items.every(it => Math.abs(Math.min(it.p[0], it.q[0]) - Math.min(d.items[0].p[0], d.items[0].q[0])) < 0.5)
      && (() => { const ys = d.items.map(it => it.p[1]).sort((a, b) => a - b), g = ys.slice(1).map((y, i) => y - ys[i]); return g.every(v => Math.abs(v - g[0]) < 0.3 && v > 2); })()) {
      // 한 번에 다섯 줄을 그린 오선 토막(MuseScore 2.1 등)
      for (const it of d.items) segs.push([it.p[1], Math.min(it.p[0], it.q[0]), Math.max(it.p[0], it.q[0])]);
    }
  }
  segs.sort((a, b) => Math.round(a[0] * 10) - Math.round(b[0] * 10) || a[1] - b[1]);
  const hl = [];
  const usedSeg = new Set();
  for (let i = 0; i < segs.length; i++) {
    if (usedSeg.has(i)) continue;
    let [y, x0, x1] = segs[i];
    for (let k = i + 1; k < segs.length && Math.abs(segs[k][0] - y) < 0.15; k++) {
      if (usedSeg.has(k)) continue;
      if (segs[k][1] <= x1 + 1 && segs[k][1] >= x0 - 1) { x1 = Math.max(x1, segs[k][2]); usedSeg.add(k); }
    }
    if (x1 - x0 > 100) hl.push([y, x0, x1]);
  }
  hl.sort((a, b) => a[0] - b[0]);
  const groups = []; let cur = [];
  for (const h of hl) {
    if (cur.length && h[0] - cur[cur.length - 1][0] > 11) { groups.push(cur); cur = []; }
    cur.push(h);
  }
  if (cur.length) groups.push(cur);
  // 오선 바로 위·아래에 붙은 긴 선(1·2번 괄호 선, '2nd time only ____' 연장선 등)이 오선 줄과 한 덩어리가 되면 뺀다:
  // 오선 줄은 모두 같은 자리에서 시작하고 끝나는데, 이런 선은 마디 중간에서 시작한다
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]; if (g.length < 6) continue;
    const mx0 = [...g.map(h => h[1])].sort((a, b) => a - b)[g.length >> 1], mx1 = [...g.map(h => h[2])].sort((a, b) => a - b)[g.length >> 1];
    const keep = g.filter(h => Math.abs(h[1] - mx0) < 4 && Math.abs(h[2] - mx1) < 4);
    if (keep.length >= 5 && keep.length < g.length && (g[0] !== keep[0] || g[g.length - 1] !== keep[keep.length - 1])) groups[gi] = keep;
  }
  // 오선 바로 위·아래에 붙은 긴 선(1·2번 괄호 선, '2nd time only ____' 연장선 등)이 오선 줄과 한 덩어리가 되면 뺀다:
  // 오선 줄은 모두 같은 자리에서 시작하고 끝나는데, 이런 선은 마디 중간에서 시작한다
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]; if (g.length < 6) continue;
    const mx0 = [...g.map(h => h[1])].sort((a, b) => a - b)[g.length >> 1], mx1 = [...g.map(h => h[2])].sort((a, b) => a - b)[g.length >> 1];
    const keep = g.filter(h => Math.abs(h[1] - mx0) < 4 && Math.abs(h[2] - mx1) < 4);
    if (keep.length >= 5 && keep.length < g.length && (g[0] !== keep[0] || g[g.length - 1] !== keep[keep.length - 1])) groups[gi] = keep;
  }
  // 오선 두 개가 11pt보다 가깝게 붙어 한 덩어리가 된 경우: 줄 간격이 갑자기 넓어지는 곳에서 나눈다
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]; if (g.length < 6) continue;
    const gaps = g.slice(1).map((h, i) => h[0] - g[i][0]);
    const med = [...gaps].sort((a, b) => a - b)[gaps.length >> 1];
    const cut = gaps.findIndex(d => d > med * 1.6);
    if (cut >= 0) { groups.splice(gi, 1, g.slice(0, cut + 1), g.slice(cut + 1)); gi--; }
  }
  const out1 = [];
  // 한 줄 오선은 단의 왼쪽 끝에서 시작한다. 1·2번 괄호 선, '2nd time only ____' 같은 연장선, 긴 셈여림 선은 마디 중간에서 시작하므로 오선이 아니다
  const multiX0 = groups.filter(g => g.length >= 2).map(g => Math.min(...g.map(h => h[1])));
  const singleX0 = groups.filter(g => g.length === 1).map(g => g[0][1]);
  const singles = groups.filter(g => g.length === 1).map(g => g[0]);
  const startsSystem = (x0, y, x1) => multiX0.length ? multiX0.some(v => Math.abs(v - x0) < 4)
    : singleX0.filter(v => Math.abs(v - x0) < 4).length >= Math.max(1, singleX0.length / 2)
      // 첫 단을 들여 쓴 한 줄 파트보: 맨 위 줄은 시작이 달라도 오른쪽 끝이 다른 줄과 같으면 오선
      || (y === Math.min(...singles.map(h => h[0])) && singles.filter(h => Math.abs(h[2] - x1) < 2).length >= Math.max(2, singles.length / 2));
  for (const g of groups.filter(g => g.length === 1)) {
    const [y, x0, x1] = g[0];
    if (!startsSystem(x0, y, x1)) continue;
    const cross = vls.filter(v => !v[4] && v[0] > x0 - 1 && v[0] < x1 + 1 && v[1] < y - 2 && v[2] > y + 2 && v[2] - v[1] > 6 && (v[2] - v[1] < 17 || (v[2] - v[1] < 24 && Math.abs(v[1] + v[2] - 2 * y) < 6)));
    const med = a => a.sort((p, q) => p - q)[a.length >> 1];
    let top, bottom;
    if (cross.length) {
      // 길이가 다른 세로선이 섞이면(겹마디쉼표 양끝의 짧은 선 등) 두 개 이상 있는 것 중 가장 긴 것이 마디선
      const tall = cross.filter(v => cross.filter(o => Math.abs(o[1] - v[1]) < 0.6 && Math.abs(o[2] - v[2]) < 0.6).length >= 2).sort((a, b) => (b[2] - b[1]) - (a[2] - a[1]))[0];
      if (tall) { top = tall[1]; bottom = tall[2]; } else { top = med(cross.map(v => v[1])); bottom = med(cross.map(v => v[2])); }
    }
    else {
      // 여러 오선을 한꺼번에 관통하는 마디선만 있는 경우 (총보의 타악기 줄)
      const span = vls.filter(v => !v[4] && v[0] > x0 - 1 && v[0] < x1 + 1 && v[1] < y - 2 && v[2] > y + 2 && v[2] - v[1] > 25);   // 묶음의 맨 끝 줄은 마디선이 줄 바로 아래(2~3pt)에서 끝나기도 한다
      if (span.length < 2) continue;
      top = Math.max(y - 5, med(span.map(v => v[1]))); bottom = Math.min(y + 5, med(span.map(v => v[2])));
    }
    out1.push({ lines: [y], top, bottom, mid: y, x0, x1, oneLine: true });
  }
  return [...out1, ...groups.filter(g => g.length >= 2).map(g => {
    const lines = g.map(h => h[0]);
    return { lines, top: lines[0], bottom: lines[lines.length - 1], mid: (lines[0] + lines[lines.length - 1]) / 2,
      x0: Math.min(...g.map(h => h[1])), x1: Math.max(...g.map(h => h[2])) };
  })].sort((a, b) => a.top - b.top);
}

// 한 쪽의 오선들을 단으로 묶는다: 여러 오선을 함께 지나는 세로선(단 왼쪽 줄, 관통 마디선)으로 연결된 오선은 같은 단
export function pageLayout(pg) {
  const staves = findStaves(pg.drawings).filter(s => s.bottom > 0 && s.top < (pg.height || 1e9));   // 쪽 밖으로 넘친 오선(잘려서 안 보임)은 버림
  const vls = vlines(pg.drawings);
  const vlsJoin = vlines(pg.drawings, true);   // 단 묶기용: 겹쳐 이어 그린 괄호 토막도 하나로
  const parent = staves.map((_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (const v of vlsJoin) {
    if (v[2] - v[1] < 20) continue;
    const cov = [];
    staves.forEach((st, i) => { if (v[1] <= st.top + 1.5 && v[2] >= st.bottom - 1.5 && v[0] >= st.x0 - 3 && v[0] <= st.x1 + 3) cov.push(i); });
    for (let k = 1; k < cov.length; k++) parent[find(cov[k])] = find(cov[0]);
  }
  // 왼쪽 큰 괄호(굵은 세로 막대)로 묶인 경우도
  for (const d of pg.drawings) {
    const r = d.rect;
    if (r.height < 25 || r.width > 8) continue;
    if (d.type === 's' && (d.width || 0) < 1.5) continue;
    const cov = [];
    staves.forEach((st, i) => { if (r.y0 <= st.top + 3 && r.y1 >= st.bottom - 3 && r.x1 <= st.x0 + 3 && r.x1 >= st.x0 - 15) cov.push(i); });
    for (let k = 1; k < cov.length; k++) parent[find(cov[k])] = find(cov[0]);
  }
  // 한 단이 마디선이 끊겨 두 묶음으로 갈린 경우(관악 묶음과 나머지 사이에 마디선이 이어지지 않음): 바로 붙어 있고
  // 마디선 위치가 같으면 한 단으로 합친다
  {
    const pre = new Map(); staves.forEach((st, i) => { const r = find(i); if (!pre.has(r)) pre.set(r, []); pre.get(r).push(i); });
    const gs = [...pre.values()].map(g => g.sort((a, b) => staves[a].top - staves[b].top)).sort((a, b) => staves[a[0]].top - staves[b[0]].top);
    const inner = gs.flatMap(g => g.slice(1).map((i, k) => staves[i].top - staves[g[k]].bottom)).sort((a, b) => a - b);
    const typ = inner.length ? inner[inner.length >> 1] : 0;
    const bx = i => vls.filter(v => v[1] <= staves[i].top + 1.5 && v[2] >= staves[i].bottom - 1.5 && v[0] > staves[i].x0 + 5).map(v => v[0]);
    for (let k = 0; k + 1 < gs.length; k++) {
      const a = gs[k], b = gs[k + 1], A = staves[a[a.length - 1]], B = staves[b[0]];
      if (!typ || B.top - A.bottom > typ * 2.2 || Math.abs(A.x0 - B.x0) > 2 || Math.abs(A.x1 - B.x1) > 2) continue;
      // 총보의 한 단이면 두 묶음 모두 오선마다 다른 악기 이름이 붙어 있다 (파트보의 이어진 단은 이름이 없거나 같다)
      const lab = i => pg.glyphs.filter(g => !isMusicFont(g.font) && g.code > 32 && g.x1 <= staves[i].x0 + 1 && g.oy > staves[i].top - 6 && g.oy < staves[i].bottom + 6).sort((p, q) => p.ox - q.ox).map(g => g.uni || '').join('');
      const la = a.map(lab), lb = b.map(lab);
      if (la.filter(Boolean).length < a.length * 0.6 || lb.filter(Boolean).length < b.length * 0.6 || lb.some(t => t && la.includes(t))) continue;
      const xa = bx(a[a.length - 1]), xb = bx(b[0]);
      if (xa.length < 2 || xb.length < 2) continue;
      const hit = xa.filter(x => xb.some(y => Math.abs(x - y) < 1.5)).length;
      if (hit >= Math.max(2, 0.8 * Math.min(xa.length, xb.length))) parent[find(b[0])] = find(a[0]);   // 단 사이 간격이 오선 사이 간격과 같을 때만
    }
  }
  const groups = new Map();
  staves.forEach((st, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); });
  const systems = [...groups.values()].map(g => g.sort((a, b) => staves[a].top - staves[b].top)).sort((a, b) => staves[a[0]].top - staves[b[0]].top);
  const sysOf = new Array(staves.length), posOf = new Array(staves.length);
  systems.forEach((g, k) => g.forEach((i, p) => { sysOf[i] = k; posOf[i] = p; }));
  // 줄 왼쪽 글자 = 악기 이름, 첫 악보 기호 = 음자리표
  // 왼쪽 글자는 세로로 가장 가까운 오선에 붙인다 (괄호로 묶은 악기 이름은 오선 사이에 있기도 함)
  // 쪽 맨 위의 큰 파트 이름(예: "타악")은 빼고, 줄 옆 작은 악기 이름만
  const clefsTmp = st => { const g = pg.glyphs.filter(g => isMusicFont(g.font) && g.ox >= st.x0 - 2 && g.ox < st.x0 + 18 && g.oy > st.top - 10 && g.oy < st.bottom + 10).sort((a, b) => a.ox - b.ox)[0]; return g && (g.code === 38 || g.code === 63 || g.code === 66) ? 'p' : 'x'; };
  const leftAll = pg.glyphs.filter(g => !isMusicFont(g.font) && g.x1 <= Math.min(...staves.map(s => s.x0)) + 1 && g.code > 32 && g.size < 14);
  // 숫자는 마디 번호일 수 있어 빼되, 글자 바로 뒤에 붙은 숫자('가야금2', '해금 1')는 이름의 일부로 남긴다
  const leftGlyphs = leftAll.filter(g => !isDigit(g.code) || leftAll.some(o => !isDigit(o.code) && Math.abs(o.oy - g.oy) < 1.5 && g.x0 - o.x1 > -1 && g.x0 - o.x1 < Math.max(3, g.size * 0.4)));
  const nearestStaff = y => { let b = -1, bd = 26; staves.forEach((st, i) => { const d = Math.max(0, st.top - y, y - st.bottom - 4); if (d < bd) { bd = d; b = i; } }); return b; };
  // 한글 글꼴의 유니코드 표가 깨져 같은 글자로 나오는 PDF(예: '피리'→'피피', '거문고'→'거거거', '대고'→'대거'):
  // 이 쪽 이름 글자 가운데 떨어져 찍힌 같은 글자가 이어지는 이름이 둘 이상인 글꼴은 깨진 것으로 보고,
  // 알려진 악기 이름이 아니면 첫 글자 + 글자 수(+ 선율/타악)로 악기 이름을 정한다
  const brokenFonts = new Set();
  {
    const byFont = {};
    for (const g of leftGlyphs) if (g.code >= 0xAC00 && g.code <= 0xD7A3) (byFont[g.font] = byFont[g.font] || []).push(g);
    for (const [f, gs] of Object.entries(byFont)) {
      gs.sort((a, b) => a.oy - b.oy || a.ox - b.ox);
      let n = 0;
      for (let k = 1; k < gs.length; k++) { const a = gs[k - 1], b = gs[k]; if (a.code === b.code && Math.abs(a.oy - b.oy) < 1 && b.ox - a.ox > a.size * 0.6 && b.ox - a.ox < a.size * 1.6 && !(k > 1 && gs[k - 2].code === a.code && Math.abs(gs[k - 2].oy - a.oy) < 1)) n++; }
      if (n >= 2) brokenFonts.add(f);
    }
  }
  const KNOWN_INST = /^(소금|대금|중금|피리|대피리|세피리|향피리|태평소|생황|단소|해금|저해금|아쟁|소아쟁|대아쟁|가야금|거문고|양금|장구|장고|꽹과리|쇠|징|북|대고|모듬북|바라|공|편종|편경|박|피아노|신디|타악기?)$/;
  const BROKEN_BY = { 2: { '소': '소금', '피': '피리', '해': '해금', '양': '양금', '장': '장구', '북': '북', '징': '징', '쇠': '쇠', '생': '생황', '바': '바라', '단': '단소', '아': '아쟁' },
    3: { '태': '태평소', '소': '소아쟁', '대': '대아쟁', '가': '가야금', '거': '거문고', '꽹': '꽹과리', '모': '모듬북', '저': '저해금', '피': '피아노', '타': '타악기', '대피': '대피리' } };
  const fixBroken = (w, perc) => {
    if (KNOWN_INST.test(w) || !/^[가-힣]+$/.test(w)) return w;
    const n = [...w].length, c0 = [...w][0];
    if (n === 2 && c0 === '대') return perc ? '대고' : '대금';
    return (BROKEN_BY[n] && BROKEN_BY[n][c0]) || w;
  };
  const labels = staves.map((st, i) => {
    const gs = leftGlyphs.filter(g => nearestStaff(g.oy) === i).sort((a, b) => a.ox - b.ox);
    // 일부 PDF의 한글 폰트는 글리프의 유니코드 매핑이 실제 인쇄 문자와 다르다.
    // 같은 문자가 연속된다는 이유로 제거하면 '소금'이 '소'로 잘리는 문제가 생기므로
    // 원문자열을 먼저 보존하고, 확인된 해당 폰트의 대표 오매핑만 교정한다.
    // 굵게 보이려고 같은 글자를 바로 옆(1.2pt 안)에 한 번 더 찍은 것은 하나로 친다.
    // (글자만 같고 떨어져 있으면 다른 글자 — 아래 오매핑 교정을 위해 남긴다)
    // 여러 줄로 쓴 이름(예: 'Cymbal' 아래 '꽹과리 징')은 줄마다 따로 읽어 ' / '로 잇는다.
    // x 순서로만 이으면 두 줄의 글자가 섞인다('C꽹ym가b리징al'). 글자 하나씩 세로로 쓴 이름(장/구)은 그대로 붙인다
    const rowsG = [];
    for (const g of [...gs].sort((a, b) => a.oy - b.oy)) { const r = rowsG.find(r => Math.abs(r.y - g.oy) < Math.max(1.5, g.size * 0.3)); if (r) r.g.push(g); else rowsG.push({ y: g.oy, g: [g] }); }
    const readRow = list => { let raw = '', t = '', prev = null;
      for (const g of list.sort((a, b) => a.ox - b.ox)) {
        const c = g.uni || String.fromCodePoint(g.code);
        raw += c;
        if (!(prev && prev.c === c && Math.abs(g.ox - prev.ox) < 1.2 && Math.abs(g.oy - prev.oy) < 1)) t += c;
        prev = { c, ox: g.ox, oy: g.oy };
      }
      return [raw.replace(/\s+/g, ''), t.replace(/\s+/g, ' ').trim()]; };
    const isPercSt = clefsTmp(st) !== 'p';
    const parts = rowsG.map(r => { const p = readRow(r.g); return r.g.some(g => brokenFonts.has(g.font)) ? [p[0], p[1].split(/\s+/).map(w => fixBroken(w, isPercSt)).join(' ')] : p; }).filter(p => p[1]);
    const vertical = parts.length > 1 && parts.every(p => [...p[1].replace(/\s/g, '')].length <= 1);
    let raw = parts.map(p => p[0]).join(''), t = parts.length > 1 && !vertical ? parts.map(p => p[1]).join(' / ') : parts.map(p => p[1].replace(/\s+/g, '')).join('');
    // 일부 PDF(Finale Type3 한글 글꼴)는 둘째 글자 이후를 모두 '소'로 잘못 알려 준다 → 알려진 악기 이름으로 교정
    const MISLABEL = { '소소': '소금', '대소': '대금', '태소': '태평소', '태태소': '태평소', '해소': '해금', '양소': '양금', '가소': '가야금', '가가소': '가야금' };
    // Finale+Ghostscript의 Type3 한글 글꼴: 글자가 모두 같은 자리에 찍히고 둘째 글자부터 엉뚱한 글자로 나온다.
    // 이름 끝(오른쪽 맞춤된 공백)까지의 폭으로 글자 수를 세어, 첫 글자 + 글자 수로 악기 이름을 정한다
    if (gs.length && gs.length <= 4 && parts.length === 1) {
      const xs = gs.map(g => g.ox), sz = gs[0].size, span = Math.max(...xs) - Math.min(...xs);
      const sp = pg.glyphs.find(g => g.code === 32 && Math.abs(g.oy - gs[0].oy) < 1 && g.ox > Math.max(...xs) && g.ox - Math.min(...xs) < sz * 5);
      if (span < sz * 0.4 && sp) {
        const n = Math.round((sp.ox - Math.min(...xs)) / sz), c0 = [...t][0];
        const BY = { 2: { '소': '소금', '대': '대금', '피': '피리', '해': '해금', '양': '양금', '장': '장구', '북': '북', '징': '징', '쇠': '쇠', '생': '생황' },
          3: { '태': '태평소', '소': '소아쟁', '대': '대아쟁', '가': '가야금', '거': '거문고', '꽹': '꽹과리', '모': '모듬북', '저': '저해금', '피': '피아노', '타': '타악기' } };
        if (BY[n] && BY[n][c0]) return BY[n][c0];
      }
    }
    return MISLABEL[t] || MISLABEL[raw.replace(/(.)\1+/g, '$1')] || t;
  });
  // 두 오선을 묶은 악기(25현 가야금, 양금 등)는 이름이 두 오선 사이에 하나만 있다 → 이름 없는 옆 오선에도 붙인다
  staves.forEach((st, i) => {
    if (!labels[i]) return;
    const gs = leftGlyphs.filter(g => nearestStaff(g.oy) === i); if (!gs.length) return;
    const y = gs.reduce((a, g) => a + g.oy, 0) / gs.length;
    const j = y > st.bottom + 2 ? i + 1 : y < st.top - 2 ? i - 1 : -1;
    const o = staves[j];
    if (!o || labels[j] || sysOf[j] !== sysOf[i] || clefsTmp(o) !== clefsTmp(st)) return;
    if (Math.abs(posOf[j] - posOf[i]) !== 1) return;
    const gap = j > i ? o.top - st.bottom : st.top - o.bottom;
    if (gap > (st.bottom - st.top) * 2.5) return;
    labels[j] = labels[i];
  });
  const clefs = staves.map(st => {
    const g = pg.glyphs.filter(g => isMusicFont(g.font) && g.ox >= st.x0 - 2 && g.ox < st.x0 + 18 && g.oy > st.top - 10 && g.oy < st.bottom + 10).sort((a, b) => a.ox - b.ox)[0];
    if (!g) return 'perc';
    if (g.code === 214 || g.code === 47) return 'perc';
    if (g.code === 38 || g.code === 63 || g.code === 66) return 'pitched';
    return 'perc';
  });
  return { staves, vls, systems, sysOf, posOf, labels, clefs };
}

// 단마다 같은 줄(악기)을 찾아 번호를 붙인다
export function assignLines(pages) {
  const layouts = pages.map(pageLayout);
  let tmpl = null;
  for (const L of layouts) for (const g of L.systems) if (!tmpl || g.length > tmpl.g.length) tmpl = { L, g };
  if (!tmpl) return { layouts, lines: [] };
  const lines = tmpl.g.map((i, k) => ({ id: k, name: tmpl.L.labels[i] || '', clef: tmpl.L.clefs[i], oneLine: !!tmpl.L.staves[i].oneLine, first: null, count: 0 }));
  // 총보 뒤에 파트보를 이어 붙인 PDF: 총보가 끝난 뒤 쪽마다 1~2단짜리 단만 여럿 있으면 파트보 → 읽지 않는다
  let partFrom = layouts.length;
  if (tmpl.g.length >= 4) {
    let k = layouts.length;
    while (k > 0 && layouts[k - 1].systems.every(g => g.length <= 2)) k--;
    const tail = layouts.slice(k), nSys = tail.reduce((a, L) => a + L.systems.length, 0);
    if (k > 0 && tail.length >= 2 && nSys >= tail.length * 3) partFrom = k;
  }
  layouts.forEach((L, pi) => {
    L.lineOf = new Array(L.staves.length).fill(null);
    if (pi >= partFrom) { L.partPage = true; return; }
    for (const g of L.systems) {
      if (g.length === lines.length) g.forEach((i, k) => { L.lineOf[i] = k; });
      else {
        // 쉬는 악기를 숨긴 단: 이름이 같은 줄, 아니면 같은 종류의 다음 줄
        let next = 0;
        for (const i of g) {
          let k = L.labels[i] ? lines.findIndex(l => l.name && (l.name.startsWith(L.labels[i]) || L.labels[i].startsWith(l.name))) : -1;
          if (k < next) k = -1;
          if (k < 0) { k = lines.findIndex((l, j) => j >= next && l.clef === L.clefs[i] && l.oneLine === !!L.staves[i].oneLine); }
          if (k < 0) k = next < lines.length ? next : -1;
          if (k < 0) { L.lineOf[i] = null; continue; }   // 남은 줄이 없으면(첫 단에 없던 악기, 예: 끝에만 나오는 Bell) 이 오선은 버린다. 마지막 줄에 겹쳐 붙이면 그 줄 마디가 늘어난다
          L.lineOf[i] = k; next = k + 1;
        }
      }
      for (const i of g) { if (L.lineOf[i] == null) continue; const ln = lines[L.lineOf[i]]; ln.count++; if (!ln.first) ln.first = { page: pi, top: L.staves[i].top, bottom: L.staves[i].bottom, x0: L.staves[i].x0, x1: L.staves[i].x1 }; if (!ln.name && L.labels[i]) ln.name = L.labels[i];
        if (g.length === lines.length && L.labels[i]) { const v = ln.votes || (ln.votes = {}); v[L.labels[i]] = (v[L.labels[i]] || 0) + 1; } }
    }
  });
  // 첫 쪽에서 읽은 이름이 다른 줄 이름과 겹치고(옆 악기 이름을 잘못 붙임) 다른 쪽들은 다른 이름으로 읽었으면 그 이름으로
  const names0 = lines.map(l => l.name);
  lines.forEach((l, k) => {
    const v = l.votes; if (!v) return;
    const best = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0];
    const dup = names0.some((n, j) => Math.abs(j - k) > 1 && n === names0[k]);   // 바로 옆 줄과 같은 이름은 두 줄 악기라 괜찮다
    if (best !== l.name && (dup || !l.name) && v[best] > (v[l.name] || 0)) l.name = best;
  });
  lines.forEach(l => { delete l.votes; });
  return { layouts, lines };
}

function vlines(drawings, overlap = false) {
  const out = [];
  for (const d of drawings) {
    if (d.type !== 's') continue;
    for (const it of d.items) {
      if (it.op !== 'l') continue;
      const [p, q] = [it.p, it.q];
      if (Math.abs(p[0] - q[0]) < 0.1 && Math.abs(p[1] - q[1]) > 3) out.push([p[0], Math.min(p[1], q[1]), Math.max(p[1], q[1]), d.width || 0, !!d.stem]);
    }
  }
  // 토막으로 이어 그린 세로선(Encore의 단 괄호 등)은 하나로 잇는다
  out.sort((a, b) => Math.round(a[0] * 5) - Math.round(b[0] * 5) || a[1] - b[1]);
  const merged = [];
  for (const v of out) {
    const same = merged.filter(m => Math.abs(m[0] - v[0]) < 0.15 && Math.abs(m[3] - v[3]) < 0.1 && m[4] === v[4]);
    if (same.some(m => v[1] >= m[1] - 0.05 && v[2] <= m[2] + 0.05)) continue;   // 이미 있는 선 안에 들어감(두 번 그림 등)
    const m = same.find(m => v[1] <= m[2] + 0.6 && v[1] >= (overlap ? m[1] : m[2] - 1));                              // 끝과 끝이 이어짐 (overlap: 겹쳐도 이음)
    if (m) m[2] = Math.max(m[2], v[2]); else merged.push([...v]);
  }
  return merged.map(m => m.slice(0, 5));
}

const cx = g => (g.x0 + g.x1) / 2;
const cy = g => (g.y0 + g.y1) / 2;
const isMaestro = g => isMusicFont(g.font);

function decodeRun(gs) { return gs.map(g => String.fromCharCode(g.code)).join(''); }

// 템포 표시 찾기 (EngraverText 글꼴 또는 작은 Maestro 음표)
// Sibelius 메트로놈 글꼴: 숫자를 Option+숫자 자리(맥 문자)에 둔다. '='는 » 자리
const OPT_CHAR = { 193: '1', 170: '2', 163: '3', 162: '4', 176: '5', 164: '6', 166: '7', 165: '8', 187: '9', 188: '0', 200: '=' };
function findTempoMarks(glyphs) {
  const marks = [];
  const eng = glyphs.filter(g => g.font.includes('Engraver')).sort((a, b) => a.oy - b.oy || a.ox - b.ox);
  const runs = [];
  for (const g of eng) {
    const r = runs[runs.length - 1];
    if (r && Math.abs(r[r.length - 1].oy - g.oy) < 2 && g.ox - r[r.length - 1].x1 < 8) r.push(g); else runs.push([g]);
  }
  for (const r of runs) {
    // '♩=70~73'의 물결표가 다른 글꼴로 찍혀 빠지면 숫자 사이가 벌어진다 → 그 자리를 '~'로
    const s = r.map((g, k) => (k && isDigit(g.code) && isDigit(r[k - 1].code) && g.x0 - r[k - 1].x1 > 2.5 ? '~' : '') + String.fromCharCode(g.code)).join('');
    const m = s.match(/([qehx])\s*([.k]?)\s*=\s*(\d+)(?:\s*[-~]\s*(\d+))?/);
    if (!m) continue;
    const unit = { q: [1, 4], e: [1, 8], h: [1, 2], x: [1, 16] }[m[1]];
    const dotted = !!m[2];
    const lo = +m[3], hi = m[4] ? +m[4] : lo;
    marks.push({ x: r[0].ox, y: r[0].oy, unit, dotted, bpm: Math.round((lo + hi) / 2), text: `${dotted ? '♩.' : '♩'}=${m[3]}${m[4] ? '-' + m[4] : ''}` });
  }
  // 악보 글꼴 음표(q, e, h) 뒤에 일반 글꼴 "=숫자"
  const plain = glyphs.filter(g => !MUSIC_FONT.test(g.font));
  for (const g of glyphs) {
    if (!MUSIC_FONT.test(g.font) || ![113, 101, 104].includes(g.code)) continue;
    if (marks.some(mk => Math.abs(mk.y - g.oy) < 3 && Math.abs(mk.x - g.ox) < 30)) continue;
    // 점: 악보 글꼴의 점, 또는 바로 붙여 쓴 일반 글꼴 '.'(Sibelius가 '♩.=48'의 점을 글자 글꼴로 찍기도 함)
    const dotted = glyphs.some(h => (h.code === 107 || h.code === 46) && Math.abs(h.oy - g.oy) < 3 && h.ox > g.ox && (MUSIC_FONT.test(h.font) ? h.ox - g.x1 < 5 : h.x0 - g.x1 < 2.5));
    const right = glyphs.filter(h => h !== g && Math.abs(h.oy - g.oy) < 4 && h.ox > g.ox && h.ox - g.x1 < 70).sort((a, b) => a.ox - b.ox);
    let txt = '', last = g.x1 + 4;
    for (const h of right) { if (h.x0 - last > 9) break; txt += MUSIC_FONT.test(h.font) && OPT_CHAR[h.code] ? OPT_CHAR[h.code] : String.fromCodePoint(h.code); last = h.x1; }
    // 'Tempo I' 같은 글자가 음표와 '=' 사이에 끼어 있어도 읽는다
    const m = txt.replace(/^[.k]/, '').match(/^\s*(?:[A-Za-z]\s*){0,2}=\s*(?:c(?:a|irca)?\.?\s*)?(\d+)(?:\s*[-~]\s*(\d+))?/i);
    // 음표=음표 (빠르기 바꿈 없이 박 단위만 바꿈, 예: ♩=♪, ♪=♩)
    const eq = !m && txt.replace(/^[.k]/, '').match(/^\s*=\s*([qeh])\s*([.k]?)/);
    if (eq) {
      const unit = { 113: [1, 4], 101: [1, 8], 104: [1, 2] }[g.code];
      const ru = { q: [1, 4], e: [1, 8], h: [1, 2] }[eq[1]];
      const sym = u => u[1] === 8 ? '♪' : u[1] === 2 ? '2분' : '♩';
      marks.push({ x: g.ox, y: g.oy, unit, dotted, bpm: null, eq: { left: unit[0] / unit[1] * (dotted ? 1.5 : 1), right: ru[0] / ru[1] * (eq[2] ? 1.5 : 1) },
        text: `${sym(unit)}${dotted ? '.' : ''}=${sym(ru)}${eq[2] ? '.' : ''}` });
      continue;
    }
    if (!m) continue;
    const lo = +m[1], hi = m[2] ? +m[2] : lo;
    const unit = { 113: [1, 4], 101: [1, 8], 104: [1, 2] }[g.code];
    marks.push({ x: g.ox, y: g.oy, unit, dotted, bpm: Math.round((lo + hi) / 2), text: `${dotted ? '♩.' : '♩'}=${m[1]}${m[2] ? '-' + m[2] : ''}`.replace('♩', unit[1] === 8 ? '♪' : unit[1] === 2 ? '2분' : '♩') });
  }
  // Maestro 작은 음표(q)로 표기된 템포: 숫자를 읽을 수 없는 경우가 많다
  for (const g of glyphs) {
    if (isMaestro(g) && g.code === 113 && g.size < 16) {
      const dotted = glyphs.some(h => isMaestro(h) && h.code === 107 && Math.abs(h.oy - g.oy) < 2 && h.ox > g.ox && h.ox - g.x1 < 4);
      if (!marks.some(mk => Math.abs(mk.y - g.oy) < 3 && Math.abs(mk.x - g.ox) < 30))
        marks.push({ x: g.ox, y: g.oy, unit: [1, 4], dotted, bpm: null, text: dotted ? '♩.=?' : '♩=?' });
    }
  }
  return marks;
}

// 쪽마다 줄(악기)과 상관없는 준비 작업. 총보에서 여러 줄을 읽을 때 쪽마다 한 번만 한다.
const PAGE_PREP = new WeakMap();
function pagePrep(pg, layout, pi) {
  // 읽는 도중 '썼음(used)' 표시를 다는 목록(템포 표시·글자 묶음·선)은 줄마다 새로 복사해 준다
  const fresh = v => ({ ...v, pageMarks: v.pageMarks.map(o => ({ ...o })), runs: v.runs.map(o => ({ ...o })), segs: v.segs.map(o => ({ ...o })) });
  const hit = PAGE_PREP.get(pg); if (hit && hit.layout === layout) return fresh(hit.v);
  const { glyphs, drawings } = pg; const staves = layout.staves;
  const fills = drawings.filter(d => d.type === 'f' || d.type === 'fs');
  const rects = fills.filter(d => d.items.length === 1 && d.items[0].op === 're').map(d => d.rect);
  // 빔: 직사각형 또는 기울어진 사각형(선 4개로 닫힌 다각형)
  // doPDF: 붙임줄을 곡선 테두리 + 같은 크기의 사각형 채움으로 그린다 → 빔이 아니라 붙임줄
  const curveStrokes = drawings.filter(d => d.type === 's' && d.items.some(i => i.op === 'c')).map(d => d.rect);
  const tieRect = r => curveStrokes.some(c => Math.abs(c.x0 - r.x0) < 0.6 && Math.abs(c.x1 - r.x1) < 0.6 && Math.abs(c.y0 - r.y0) < 1 && Math.abs(c.y1 - r.y1) < 1);
  const tieRects = rects.filter(tieRect);
  const beamList = rects.filter(r => r.height <= 4 && r.width >= 2 && !tieRects.includes(r)).map(r => ({ x0: r.x0, x1: r.x1, yAt: () => (r.y0 + r.y1) / 2 }));
  for (const d of fills) {
  if (!(d.items.length >= 3 && d.items.length <= 5 && d.items.every(i => i.op === 'l'))) continue;
  const pts = [];
  for (const it of d.items) for (const p of [it.p, it.q]) if (p && !pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.05)) pts.push(p);
  if (pts.length !== 4) continue;
  pts.sort((a, b) => a[0] - b[0]);
  const [l1, l2, r1, r2] = pts;
  if (Math.abs(l1[0] - l2[0]) > 0.6 || Math.abs(r1[0] - r2[0]) > 0.6) continue;
  const th = Math.abs(l1[1] - l2[1]), w = r1[0] - l1[0];
  if (th < 0.8 || th > 4 || w < 2) continue;
  const ly = (l1[1] + l2[1]) / 2, ry = (r1[1] + r2[1]) / 2;
  if (Math.abs(ry - ly) / w > 0.7) continue;
  beamList.push({ x0: l1[0], x1: r1[0], yAt: x => ly + (ry - ly) * (x - l1[0]) / w });
  }
  // 굵은 선(stroke)으로 그린 빔 (Finale 2004~2005 + Distiller 6 등)
  for (const d of drawings) {
  if (d.type !== 's' || d.items.length !== 1 || d.items[0].op !== 'l' || !((d.width || 0) >= 1.2 && d.width <= 4)) continue;
  const { p, q } = d.items[0]; const [a, b] = p[0] <= q[0] ? [p, q] : [q, p]; const w = b[0] - a[0];
  if (w < 2 || Math.abs(b[1] - a[1]) / w > 0.7) continue;
  beamList.push({ x0: a[0], x1: b[0], yAt: x => a[1] + (b[1] - a[1]) * (x - a[0]) / w });
  }
  const curves = [...fills.filter(d => d.items.some(i => i.op === 'c')).map(d => d.rect), ...tieRects];
  const thickH = drawings.filter(d => d.type === 's' && d.items.length === 1 && (d.width || 0) > 1.5 && d.rect.height < 0.2 && d.rect.width > 20).map(d => d.rect);
  const boxes = drawings.filter(d => d.type === 's' && ((d.items.length === 1 && d.items[0].op === 're') ||
  (d.items.length >= 4 && d.items.length <= 5 && d.items.every(i => i.op === 'l' && (Math.abs(i.p[0] - i.q[0]) < 0.1 || Math.abs(i.p[1] - i.q[1]) < 0.1)))) &&
  d.rect.width > 5 && d.rect.height > 5 && d.rect.height < 25).map(d => d.rect);
  const brackets = drawings.filter(d => d.type === 's' && d.items.length === 2 && d.items.every(i => i.op === 'l')).map(d => d.rect);
  const maestro = glyphs.filter(isMaestro);
  // 이 쪽의 보통 음표 머리 크기 (악보를 축소해 찍으면 글자 크기가 작아지므로 절대값 대신 비율로)
  const hs = maestro.filter(g => g.code === HEAD_FILLED || g.code === HEAD_HALF).map(g => g.size).sort((a, b) => a - b);
  const normSize = hs.length ? hs[Math.floor(hs.length * 0.75)] : 20;
  const smallSize = normSize * 0.75;
  // 잇단음표 숫자: Finale은 굵은 기울임, Sibelius는 OpusText 글꼴의 작은 숫자 하나 (옆에 다른 글자가 붙어 있으면 템포 등 글자)
  const lone = g => !glyphs.some(o => o !== g && Math.abs(o.oy - g.oy) < 1.5 && o.code > 32 && (Math.abs(o.x0 - g.x1) < 3 || Math.abs(g.x0 - o.x1) < 3));
  const tupletNums = glyphs.filter(g => ((g.code === 51 || g.code === 57) && (g.font.includes('BoldItal') || (/OpusText|Opus Text/.test(g.font) && g.size < normSize * 0.75 && lone(g))))
    // MuseScore 2 등: 기울임 글꼴의 작은 숫자 하나(3·4·5·6·7) — 4잇단(겹박자에서 셋 자리에 넷) 등도
    || ([51, 52, 53, 54, 55].includes(g.code) && /Italic|Oblique/i.test(g.font) && !MUSIC_FONT.test(g.font) && g.size < normSize * 0.75 && lone(g)));
  const runs = textRuns(glyphs);
  const segs = strokeSegs(drawings);
  const italicNums = glyphs.filter(g => !MUSIC_FONT.test(g.font) && isDigit(g.code) && g.size < 14);
  const sysNums = glyphs.filter(g => !MUSIC_FONT.test(g.font) && isDigit(g.code) && g.size < 20);
  const staffOf = y => {
  let best = null, bd = 1e9;
  staves.forEach((s, i) => { if (s.top - 45 <= y && y <= s.bottom + 45) { const dd = Math.abs(y - s.mid); if (dd < bd) { best = i; bd = dd; } } });
  return best;
  };
  // 템포 표시 → 바로 아래 단
  const pageMarks = findTempoMarks(glyphs).map(mk => {
  const below = staves.map((s, i) => [i, s.top - mk.y]).filter(([, d]) => d > -5 && d < 90).sort((a, b) => a[1] - b[1]);
  return below.length ? { ...mk, staff: below[0][0], page: pi } : null;
  }).filter(Boolean);

  // 오선별 악보 기호 (staffOf를 오선마다 다시 돌리지 않게)
  let byStaff = null;
  const sgOf = si => { if (!byStaff) { byStaff = new Map(); for (const g of maestro) { const k = staffOf(g.oy); if (k == null) continue; if (!byStaff.has(k)) byStaff.set(k, []); byStaff.get(k).push(g); } } return byStaff.get(si) || []; };
  const v = { fills, rects, tieRects, beamList, curves, thickH, boxes, brackets, maestro, normSize, smallSize, tupletNums, runs, segs, italicNums, sysNums, staffOf, pageMarks, sgOf };
  PAGE_PREP.set(pg, { layout, v });
  return fresh(v);
}

export function parseScore(pages, opts = {}) {
  const lineSel = opts.line ?? null;
  const LA = opts.layouts || (lineSel != null ? assignLines(pages).layouts : null);
  const measures = [];
  const systemNumbers = [];
  const tempoMarks = [];
  let pendingTimesig = null, pendingTwoBar = false, prevRightDouble = false;
  const pendingTie = {};
  let scanned = 0, maestroCount = 0;
  const marks = [];       // 셈여림·템포 변화 (마디 인덱스 + 마디 안 위치)
  const codaSigns = [];
  const lineState = { clef: 30, key: {}, pitched: false };   // 음높이용: 직전 단의 음자리표와 조표
  let curPage = null;

  pages.forEach((pg, pi) => {
    const { glyphs, drawings } = pg;
    const layout = LA ? LA[pi] : pageLayout(pg);
    const staves = layout.staves;
    const vls = layout.vls;
    const sysOf = i => (i == null ? -1 : layout.sysOf[i]);
    const sysTop = si => staves[layout.systems[layout.sysOf[si]][0]];
    const { fills, rects, tieRects, beamList, curves, thickH, boxes, brackets, maestro, normSize, smallSize, tupletNums, runs, segs, italicNums, sysNums, staffOf, pageMarks, sgOf } = pagePrep(pg, layout, pi);
    maestroCount += maestro.length;
    if (!staves.length) { scanned++; return; }

    curPage = { sg: maestro, runs, segs, staffOf, sysOf, sysTop, smallSize };
    // 큰 박자표 (Sibelius 등 '단 위에 크게' 쓰는 박자표): 오선 밖, 오선 높이보다 훨씬 큰 숫자를 위아래로 쌓은 것.
    // 바로 아래 오선이 속한 단의 모든 오선에 적용한다
    const bigTs = (() => {
      const hs = staves.map(t => t.bottom - t.top).sort((a, b) => a - b), sh = hs[hs.length >> 1] || 0;
      const inStaff = g => staves.some(t => t.top - 2 <= g.oy && g.oy <= t.bottom + 2);
      const dg = glyphs.filter(g => isDigit(g.code) && g.size > sh * 1.3 && !inStaff(g)).sort((a, b) => a.ox - b.ox);
      const runs2 = [];
      for (const g of dg) { const r = runs2.find(r => { const p = r[r.length - 1]; return Math.abs(p.oy - g.oy) < 1 && g.ox - p.ox < g.size * 0.75 && g.ox > p.ox; }); if (r) r.push(g); else runs2.push([g]); }
      const out = [];
      for (const a of runs2) for (const b of runs2) {
        if (a === b) continue;
        const ax = (a[0].ox + a[a.length - 1].ox) / 2, bx = (b[0].ox + b[b.length - 1].ox) / 2, dy = b[0].oy - a[0].oy;
        if (Math.abs(ax - bx) > a[0].size * 0.4 || dy < a[0].size * 0.3 || dy > a[0].size * 0.8) continue;
        const below = staves.map((t, i) => [t, i]).filter(([t]) => t.top > b[0].oy - 2).sort((p, q) => p[0].top - q[0].top)[0];
        if (!below || below[0].top - b[0].oy > a[0].size * 2) continue;
        out.push({ x: Math.min(a[0].x0, b[0].x0), x1: Math.max(a[a.length - 1].x1, b[b.length - 1].x1), sys: sysOf(below[1]),
          ts: [+a.map(g => g.code - 48).join(''), +b.map(g => g.code - 48).join('')] });
      }
      return out;
    })();
    staves.forEach((st, si) => {
      if (lineSel != null && layout.lineOf[si] !== lineSel) return;
      // 총보가 아닌데 한 단에 오선이 여러 개면(선택 없이 읽을 때) 단의 첫 오선만
      if (lineSel == null && layout.posOf[si] !== 0) return;
      const sg = sgOf(si);
      const tst = sysTop(si);
      const cand = sysNums.filter(g => tst.top - 25 < g.oy && g.oy < tst.top && g.ox < st.x0 + 25 && g.ox > st.x0 - 15).sort((a, b) => a.ox - b.ox);
      // 숫자 묶음이 여럿이면(쪽 번호 등) 오선에 가장 가까운 묶음
      const numRuns = [];
      for (const g of cand) { const r = numRuns.find(r => { const p = r[r.length - 1]; return p.font === g.font && Math.abs(p.oy - g.oy) < 1 && g.x0 - p.x1 < 3 && g.x0 - p.x1 > -1; }); if (r) r.push(g); else numRuns.push([g]); }
      numRuns.sort((a, b) => b[0].oy - a[0].oy || a[0].ox - b[0].ox);
      const nums = numRuns.length && numRuns[0][0].ox <= st.x0 + 10 ? numRuns[0] : [];
      if (nums.length) { const last = nums[nums.length - 1]; if (glyphs.some(g => !isDigit(g.code) && g.code > 32 && !isMusicFont(g.font) && Math.abs(g.oy - last.oy) < 2 && g.x0 - last.x1 > -0.5 && g.x0 - last.x1 < 3)) nums.length = 0; }
      // '♩ = 150' 같은 빠르기 숫자는 마디 번호가 아님
      if (nums.length) { const f0 = nums[0]; if (glyphs.some(g => g.code === 61 && !isMusicFont(g.font) && Math.abs(g.oy - f0.oy) < 2 && f0.x0 - g.x1 > -0.5 && f0.x0 - g.x1 < 14)) nums.length = 0; }
      if (nums.length) systemNumbers.push([measures.length, +nums.map(g => String.fromCharCode(g.code)).join('')]);

      // 음표 머리에 붙은 세로선은 기둥 (작은 오선에서 기둥 길이가 오선 높이와 거의 같을 때)
      const stemHeads = sg.filter(g => g.code === HEAD_FILLED || g.code === HEAD_HALF);
      const touchesHead = v => !(Math.abs(v[1] - st.top) < 0.15 && Math.abs(v[2] - st.bottom) < 0.15) && stemHeads.some(g => g.x0 - 0.8 <= v[0] && v[0] <= g.x1 + 0.8 && (Math.abs(g.oy - v[1]) < 2.5 || Math.abs(g.oy - v[2]) < 2.5));
      const isBar = v => !v[4] && !touchesHead(v) && (Math.abs(v[1] - st.top) < 0.6 && Math.abs(v[2] - st.bottom) < 0.6)
        || (v[1] <= st.top + 1.2 && v[2] >= st.bottom - 1.2 && v[2] - v[1] > (st.bottom - st.top) + 20
          // 마디선은 어떤 오선의 맨 윗줄에서 시작해 어떤 오선의 맨 아랫줄에서 끝난다 (두 오선에 걸친 화음 기둥은 위·아래로 삐져나옴)
          && staves.some(o => Math.abs(v[1] - o.top) < 1.5 || (o.oneLine && v[1] <= o.mid + 1.5 && v[1] >= o.mid - 9)) && staves.some(o => Math.abs(v[2] - o.bottom) < 1.5 || (o.oneLine && v[2] >= o.mid - 1.5 && v[2] <= o.mid + 9) || vls.some(w => w !== v && Math.abs(w[0] - v[0]) < 0.3 && w[1] <= v[2] + 0.5 && Math.abs(w[2] - o.bottom) < 1.5))
          && staves.some((o, oi) => oi !== si && v[1] <= o.top + 1.5 && (v[2] >= o.bottom - 1.5
          // 큰보표 마디선을 토막으로 나눠 그린 경우(위 오선~아래 오선 가운데, 아래 오선 부분 따로)
          || (v[2] >= o.top - 0.5 && vls.some(w => w !== v && Math.abs(w[0] - v[0]) < 0.3 && w[1] <= v[2] + 0.5 && w[2] >= o.bottom - 1.5)))));
      // 같은 자리에 두 번 그린 마디선(한컴 PDF 등)은 하나로: 겹세로줄로 잘못 읽어 마디마다 '구간 시작'이 되던 문제
      const bars = vls.filter(isBar).sort((a, b) => a[0] - b[0]).filter((v, i, arr) => !(i > 0 && Math.abs(v[0] - arr[i - 1][0]) < 0.5 && Math.abs((v[3] || 0) - (arr[i - 1][3] || 0)) < 0.3));
      const groups = [];
      for (const v of bars) {
        const lg = groups[groups.length - 1];
        if (lg && v[0] - lg[lg.length - 1][0] < 6) lg.push(v); else groups.push([v]);
      }
      const bounds = [[st.x0, st.x0, 0], ...groups.map(g => [g[0][0], g[g.length - 1][0], g.length])];
      const regions = [], leftDouble = [];
      for (let i = 0; i < bounds.length; i++) {
        const left = bounds[i][1];
        const right = i + 1 < bounds.length ? bounds[i + 1][0] : st.x1;
        // 단 맨 앞의 굵은+가는 세로줄(Encore 등의 단 시작 표시)은 겹세로줄로 보지 않는다
        if (right - left > 3) { regions.push([left, right]); leftDouble.push(bounds[i][2] >= 2 && !(i > 0 && bounds[i][0] < st.x0 + 4)); }
      }

      // 높은·낮은·가온음자리표가 보이는 5줄 오선만 선율 악보로 본다 (다음 단은 음자리표를 이어받음)
      const percClef = sg.some(g => (g.code === 47 || g.code === 214) && g.x0 < st.x0 + 40);
      const pitchClef = sg.some(g => [38, 63, 66].includes(g.code) && g.oy > st.top - 15 && g.oy < st.bottom + 15);
      const pitchedStaff = st.lines && st.lines.length === 5 && !percClef && (pitchClef || lineState.pitched);
      lineState.pitched = pitchedStaff;
      const heads = sg.filter(g => g.code === HEAD_FILLED || g.code === HEAD_WHOLE || g.code === HEAD_HALF);
      const rests = sg.filter(g => [REST_Q, REST_8, REST_16, REST_32, REST_HALF, REST_WHOLE].includes(g.code) && g.size > smallSize);
      const dots = sg.filter(g => g.code === DOT).filter((g, i, a) => !a.slice(0, i).some(o => Math.abs(o.ox - g.ox) < 0.3 && Math.abs(o.oy - g.oy) < 0.3));   // 같은 자리에 두 번 찍은 점은 하나
      // 도돌이표 점: 같은 x에 위아래 대칭인 점 두 개 + 바로 옆이 겹세로줄(굵은 줄 포함)
      const reserved = new Set();
      dots.forEach((a, i) => dots.forEach((b, j) => {
        if (j <= i || Math.abs(a.ox - b.ox) > 0.6 || Math.abs(a.oy - b.oy) < 2 || Math.abs((a.oy + b.oy) / 2 - st.mid) > 1.5) return;
        const near = groups.some(gr => gr.length >= 2 && gr.some(v => Math.abs(v[0] - a.ox) < 10));
        if (near) { reserved.add(i); reserved.add(j); }
      }));
      const usedDots = new Set();
      const staffSp = st.lines && st.lines.length === 5 ? (st.bottom - st.top) / 4 : 5;   // 줄 간격 (작은 오선이면 점 높이 차 허용도 줄인다)
      // 부점 높이: 칸에 있는 음은 머리와 같은 높이, 줄 위의 음은 반 칸 위. 그보다 멀면 스타카토 점
      const dotTol = g => {
        if (!pitchedStaff) return 3.5;
        const k = (st.bottom - g.oy) / (staffSp / 2), onSpace = Math.abs(Math.round(k)) % 2 === 1;
        return Math.min(3.5, staffSp * (onSpace ? 0.3 : 0.75));
      };
      const stems = vls.filter(v => !isBar(v) && st.top - 30 < v[1] && v[2] < st.bottom + 30);

      const stemsOf = g => stems.filter(v => g.x0 - 1.2 <= v[0] && v[0] <= g.x1 + 1.2 && v[1] - 3 <= g.oy && g.oy <= v[2] + 3);
      const makeNote = (g, isRest, forceStem = null, forceDots = null) => {
        const n = { voice: g.oy < st.mid ? 'R' : 'L', x: cx(g), y: g.oy, rest: isRest, grace: g.size < smallSize, accent: false, tied: false, roll: false, tuplet: false, dur: ZERO };
        if (isRest) {
          n.dur = { [REST_Q]: F(1, 4), [REST_8]: F(1, 8), [REST_16]: F(1, 16), [REST_32]: F(1, 32), [REST_HALF]: F(1, 2), [REST_WHOLE]: F(1) }[g.code];
          if (g.code === REST_WHOLE) n.wholeRest = true;
          if (Math.abs(g.oy - st.mid) < 4 || g.code === REST_WHOLE) n.centered = true;
        }
        else if (g.code === HEAD_WHOLE) n.dur = F(1);
        else {
          const cand = stems.filter(v => g.x0 - 1.2 <= v[0] && v[0] <= g.x1 + 1.2 && v[1] - 3 <= g.oy && g.oy <= v[2] + 3);
          let beams = 0, flags = 0;
          if (cand.length) {
            let v = forceStem || cand.reduce((b, v) => (Math.min(Math.abs(v[0] - g.x0), Math.abs(v[0] - g.x1)) < Math.min(Math.abs(b[0] - g.x0), Math.abs(b[0] - g.x1)) ? v : b));
            // 같은 자리에 머리가 두 개(두 성부가 같은 음): 하나는 위 기둥, 하나는 아래 기둥
            const twins = heads.filter(h => Math.abs(h.ox - g.ox) < 0.5 && Math.abs(h.oy - g.oy) < 0.5 && h.size === g.size);
            if (!forceStem && twins.length >= 2) {
              const k = twins.indexOf(g);
              const want = cand.filter(c => k === 0 ? c[1] < g.oy - 4 : c[2] > g.oy + 4);
              if (want.length) v = want[0];
            }
            const up = v[1] < g.oy - 4;
            n.voice = up ? 'R' : 'L';
            n._stem = v[0]; n._up = up;
            const tip = up ? v[1] : v[2];
            for (const r of beamList) {
              if (!(r.x0 - 0.6 <= v[0] && v[0] <= r.x1 + 0.6)) continue;
              const ry = r.yAt(v[0]);
              // 짧은 토막 빔(점8분+16분 등): 양 끝에 기둥이 둘 다 걸치면 끝이 더 가까운 기둥 하나의 것
              const tipY = (v[1] < g.oy - 4) ? v[1] : v[2];
              if (r.x1 - r.x0 < g.size * 0.45 && Math.abs(ry - tipY) > 1.5) {
                const near = stems.filter(o => r.x0 - 0.6 <= o[0] && o[0] <= r.x1 + 0.6 && o[1] - 3 <= ry && ry <= o[2] + 3);
                const endD = o => Math.min(Math.abs(o[0] - r.x0), Math.abs(o[0] - r.x1));
                if (near.length === 2 && near.some(o => endD(o) < endD(v) - 0.4)) continue;
                // 기둥 간격과 토막 길이가 같아 어느 쪽 것인지 모를 때: 왼쪽 기둥 것으로 보고, 마디가 넘치면 나중에 되돌린다
                if (near.length === 2 && v[0] > Math.min(near[0][0], near[1][0]) + 0.5 && Math.abs(endD(near[0]) - endD(near[1])) < 0.2) { n._ambigBeam = true; continue; }
              }
              if (up && tip - 2 <= ry && ry <= tip + 10) beams++;
              if (!up && tip - 10 <= ry && ry <= tip + 2) beams++;
            }
            for (const f of sg) {
              const fl = (f.code === FLAG_UP || f.code === FLAG_DN) ? 1 : (f.code === FLAG16_UP || f.code === FLAG16_DN) ? 2 : 0;
              if (fl && Math.abs(f.x0 - v[0]) < 2.5 && Math.abs(f.size - g.size) < 3 &&
                Math.min(Math.abs(f.y0 - tip), Math.abs(f.y1 - tip), Math.abs(f.oy - tip)) < 8) flags += fl;
            }
          }
          n.dur = (g.code === HEAD_HALF ? F(1, 2) : F(1, 4)).div(2 ** (beams + flags));
        }
        let nd = forceDots ?? 0, firstDot = null;
        // 2도 화음: 기둥 반대쪽으로 비켜 찍은 머리가 오른쪽에 있으면 점은 그 머리 뒤에 온다
        let gx1 = g.x1;
        if (!isRest && pitchedStaff) for (let k = 0; k < 3; k++) for (const h of heads) if (h !== g && h.x0 > g.x0 + 1 && h.x0 < gx1 + 0.5 && h.x1 > gx1 && Math.abs(h.oy - g.oy) < staffSp * 1.6 && Math.abs(h.size - g.size) < 1) gx1 = h.x1;
        if (forceDots == null) dots.forEach((dg, i) => {
          if (usedDots.has(i) || reserved.has(i)) return;
          if (firstDot && Math.abs(dg.oy - firstDot.oy) > 1) return;   // 겹점은 같은 높이에
          if (gx1 + 0.3 <= dg.x0 && dg.x0 <= gx1 + 6 + nd * 4 && Math.abs(dg.oy - g.oy) < (isRest ? 8 : dotTol(g))
            && (isRest || !heads.some(h => h !== g && Math.abs(cx(h) - cx(g)) < 1.5 && Math.abs(h.oy - dg.oy) < Math.abs(g.oy - dg.oy) - 0.1))   // 화음(타악의 위·아래 성부 포함): 점은 높이가 가장 가까운 머리의 것
            && (isRest || !pitchedStaff || !heads.some(h => h !== g && h.x0 > g.x1 - 0.5 && Math.abs((dg.x0 + dg.x1) / 2 - (h.x0 + h.x1) / 2) < (h.x1 - h.x0) * 0.2 && Math.abs(dg.oy - h.oy) > staffSp * 0.6 && Math.abs(dg.oy - h.oy) < staffSp * 1.8))   // 다른 머리 한가운데 위·아래 점 = 스타카토
            && !bars.some(b => b[0] > g.x1 - 0.5 && b[0] < dg.x0 + 0.5)) { usedDots.add(i); nd++; firstDot = firstDot || dg; }
        });
        if (nd === 1) n.dur = n.dur.mul(F(3, 2)); else if (nd >= 2) n.dur = n.dur.mul(F(7, 4));
        n._dots = nd;
        return n;
      };
      // 머리 하나에 위·아래 기둥이 모두 붙으면 두 성부가 같이 치는 음: 음표 둘로 나눈다
      const headNotesAll = heads.flatMap(g => {
        if (g.code === HEAD_WHOLE) return [makeNote(g, false)];
        const twins = heads.filter(h => Math.abs(h.ox - g.ox) < 0.5 && Math.abs(h.oy - g.oy) < 0.5 && h.size === g.size);
        const cand = stemsOf(g);
        const upS = cand.filter(c => c[1] < g.oy - 4 && c[2] <= g.oy + 3), dnS = cand.filter(c => c[2] > g.oy + 4 && c[1] >= g.oy - 3);
        if (twins.length < 2 && upS.length && dnS.length) {
          const a = makeNote(g, false, upS[0]);
          return [a, makeNote(g, false, dnS[0], a._dots)];
        }
        return [makeNote(g, false)];
      });
      // Encore: 한 기둥에 머리가 여럿(화음)이면 기둥 끝 쪽 머리만 그 성부, 나머지 하나는 반대 성부(장구의 덩), 더 있으면 버린다
      if (false && pg.encore) {   // 시험해 보니 Encore 파트·총보 사이 일치가 나빠져 꺼 둠
        const byStem = new Map();
        for (const n of headNotesAll) if (n._stem != null && !n.grace) { const k = n._stem.toFixed(1) + (n._up ? 'u' : 'd'); if (!byStem.has(k)) byStem.set(k, []); byStem.get(k).push(n); }
        const drop = new Set();
        for (const grp of byStem.values()) {
          if (grp.length < 2) continue;
          grp.sort((a, b) => grp[0]._up ? a.y - b.y : b.y - a.y);        // 기둥 끝에 가까운 머리부터
          const other = grp[0].voice === 'R' ? 'L' : 'R';
          const busy = headNotesAll.some(o => o.voice === other && !o.grace && Math.abs(o.x - grp[0].x) < 2 && !grp.includes(o));
          grp.slice(1).forEach((n, i) => { if (i === 0 && !busy && Math.abs(n.y - grp[0].y) > 2) n.voice = other; else drop.add(n); });
        }
        if (drop.size) for (let i = headNotesAll.length - 1; i >= 0; i--) if (drop.has(headNotesAll[i])) headNotesAll.splice(i, 1);
      }
      // 선율 악보에서 한 기둥에 붙은 여러 머리(화음): 첫 머리만 길이 계산에 쓰고 나머지는 같은 때 함께 울린다
      if (pitchedStaff) {
        const groups = new Map();
        for (const n of headNotesAll) {
          if (n.grace) continue;
          const k = n.voice + (n._stem != null ? 's' + Math.round(n._stem * 4) : 'x' + Math.round(n.x));
          if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n);
        }
        for (const g of groups.values()) if (g.length > 1) {
          g.sort((a, b) => a.x - b.x || a.y - b.y);
          // 한 기둥의 머리는 길이가 같다: 점이 붙은 머리가 있으면(2도 화음 등에서 점 하나를 두 머리가 나눠 씀) 모두 점음표로
          const sm = g.filter(n => n._stem != null), mx = sm.reduce((b, n) => (n._dots || 0) > (b?._dots || 0) ? n : b, null);
          if (mx && mx._dots) for (const n of sm) if ((n._dots || 0) < mx._dots && n.dur.mul(mx._dots === 1 ? F(3, 2) : F(7, 4)).div(n._dots === 1 ? F(3, 2) : F(1)).eq(mx.dur)) { n.dur = mx.dur; n._dots = mx._dots; }
          // 기둥 없는 음(온음표)은 x가 거의 같을 때만
          for (const n of g.slice(1)) if (n._stem != null || Math.abs(n.x - g[0].x) < 1.5) { if (n.dur.eq(g[0].dur)) n.chordOf = g[0]; }
        }
      }
      // 타악 오선에서 한 기둥에 머리가 둘(장구 덩 등): 기둥 끝 쪽 머리는 그 성부, 다른 머리는 같은 때 반대 성부로 친다
      // (전에는 같은 성부의 음 둘로 이어 읽어 마디가 길어졌음)
      if (!pitchedStaff) {
        const byStem = new Map();
        for (const n of headNotesAll) if (n._stem != null && !n.grace) { const k = n.voice + Math.round(n._stem * 4); if (!byStem.has(k)) byStem.set(k, []); byStem.get(k).push(n); }
        for (const grp of byStem.values()) {
          if (grp.length < 2) continue;
          grp.sort((a, b) => grp[0]._up ? a.y - b.y : b.y - a.y);
          const main = grp[0];
          grp.slice(1).forEach(n => { if (Math.abs(n.y - main.y) > 1 && n.dur.eq(main.dur)) { n.chordOf = main; n.voice = main.voice === 'R' ? 'L' : 'R'; } });
        }
      }
      const notes = [...headNotesAll, ...rests.map(g => makeNote(g, true))];
      const headNotes = notes.filter(n => !n.rest);
      for (const t of sg.filter(g => g.code === TREMOLO3)) {
        const c = headNotes.filter(n => !n.grace && Math.abs(n.x - cx(t)) < 8);
        if (c.length) c.reduce((b, n) => Math.hypot(n.x - cx(t), n.y - t.oy) < Math.hypot(b.x - cx(t), b.y - t.oy) ? n : b).tremolo = true;
      }

      for (const a of sg.filter(g => g.code === ACCENT)) {
        const voice = a.oy < st.mid ? 'R' : 'L';
        const c = headNotes.filter(n => n.voice === voice && !n.grace && Math.abs(n.x - cx(a)) < 5);
        if (c.length) c.reduce((b, n) => Math.abs(n.x - cx(a)) < Math.abs(b.x - cx(a)) ? n : b).accent = true;
      }
      // 잇단음표 숫자 → 길이 배율 (3: 셋을 둘 자리, 4: 넷을 셋 자리, 5·7: 넷 자리, 6: 넷 자리)
      const TUP_F = { 51: F(2, 3), 52: F(3, 4), 53: F(4, 5), 54: F(2, 3), 55: F(4, 7), 57: F(2, 3) };
      for (const t of tupletNums.filter(g => staffOf(g.oy) === si)) {
        const tf = TUP_F[t.code] || F(2, 3), tk = t.code - 48;
        const voice = t.oy < st.mid ? 'R' : 'L';
        let br = brackets.find(b => b.x0 - 2 <= cx(t) && cx(t) <= b.x1 + 2 && Math.abs((b.y0 + b.y1) / 2 - cy(t)) < 8);
        if (!br) {
          // 괄호가 숫자 양쪽으로 끊겨 그려진 경우: 숫자 왼쪽에서 끝나는 가로선 + 오른쪽에서 시작하는 가로선
          const hz = segs.filter(q => Math.abs(q.y1 - q.y0) < Math.max(0.3, (q.x1 - q.x0) * 0.12) && q.x1 - q.x0 > 2 && Math.abs(q.y0 - cy(t)) < 8);   // 기울어진 괄호(빔을 따라 비스듬히)도
          const L = hz.filter(q => q.x1 <= t.x0 + 2 && q.x1 >= t.x0 - 8).sort((a, b) => b.x1 - a.x1)[0];
          const R = hz.filter(q => q.x0 >= t.x1 - 2 && q.x0 <= t.x1 + 8 && (!L || Math.abs(q.y0 - L.y0) < 1.5)).sort((a, b) => a.x0 - b.x0)[0];
          if (L && R) br = { x0: L.x0, x1: R.x1 };
        }
        if (br) {
          // 잇단음표 숫자와 세로로 가장 가까운 음표의 성부에 적용 (숫자가 오선 위에 있어도 아랫성부일 수 있음)
          const inBr = notes.filter(n => !n.grace && br.x0 - 4 <= n.x && n.x <= br.x1 + 4);
          const v = inBr.length ? inBr.reduce((b, n) => Math.abs(n.y - t.oy) < Math.abs(b.y - t.oy) ? n : b).voice : voice;
          inBr.forEach(n => { if (n.voice === v) n.tuplet = tf; });
        } else {
          // 괄호 없이 숫자 3만 빔 묶음 위·아래에 적힌 경우: 숫자 가운데에 놓인 이웃한 음표 3개
          const near = notes.filter(n => !n.grace && Math.abs(n.x - cx(t)) < 20);
          if (near.length && t.code === 57) {
            // 9잇단: 숫자 위·아래의 가장 긴 빔이 덮는 음표·쉼표 전부
            const v = near.reduce((b, n) => Math.abs(n.y - t.oy) < Math.abs(b.y - t.oy) ? n : b).voice;
            const bm = beamList.filter(b => b.x0 - 3 <= cx(t) && cx(t) <= b.x1 + 3 && Math.abs(b.yAt(cx(t)) - t.oy) < 25).sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0))[0];
            const inSpan = n => n.x >= bm.x0 - 5 && n.x <= bm.x1 + 5;
            const solo = bm && !notes.some(n => !n.rest && n.voice !== v && inSpan(n));
            if (bm) notes.forEach(n => { if ((n.voice === v || (n.rest && solo)) && !n.grace && inSpan(n)) n.tuplet = tf; });
          } else if (near.length) {
            const v = near.reduce((b, n) => Math.abs(n.y - t.oy) < Math.abs(b.y - t.oy) ? n : b).voice;
            const xs = [...new Set(notes.filter(n => n.voice === v && !n.grace).map(n => Math.round(n.x * 10) / 10))].sort((a, b) => a - b);
            let best = null, bd = 1e9;
            for (let i = 0; i + tk - 1 < xs.length; i++) { const d = Math.abs((xs[i] + xs[i + tk - 1]) / 2 - cx(t)); if (d < bd) { bd = d; best = i; } }
            if (best != null && bd < 6 && xs[best + tk - 1] - xs[best] < 20 * (tk - 1)) {
              const lo = xs[best] - 0.2, hi = xs[best + tk - 1] + 0.2;
              notes.forEach(n => { if (n.voice === v && !n.grace && n.x >= lo && n.x <= hi) n.tuplet = tf; });
            }
          }
        }
      }
      // 두 성부가 같은 리듬으로 함께 치는 잇단음표(화음을 윗·아랫성부로 나눈 경우): 숫자는 한 성부 쪽에만 있으므로,
      // 다른 성부에도 잇단음표 음과 같은 자리(x)에만 음이 놓여 있으면 그 음들도 잇단음표로 본다
      {
        const tupl = notes.filter(n => n.tuplet && !n.grace);
        const groups = [];
        for (const n of tupl.sort((a, b) => a.x - b.x)) { const g = groups.find(g => g.v === n.voice && n.x - g.xs[g.xs.length - 1] < 40); if (g) g.xs.push(n.x); else groups.push({ v: n.voice, xs: [n.x], tf: n.tuplet }); }
        for (const g of groups) {
          if (g.xs.length < 2) continue;
          const lo = g.xs[0] - 1.5, hi = g.xs[g.xs.length - 1] + 1.5;
          for (const v of ['R', 'L']) {
            if (v === g.v) continue;
            const other = notes.filter(n => n.voice === v && !n.grace && n.x >= lo && n.x <= hi);
            if (other.length < 2 || other.some(n => n.tuplet)) continue;
            const ox = [...new Set(other.map(n => Math.round(n.x)))];
            if (ox.length === new Set(g.xs.map(x => Math.round(x))).size && ox.every(x => g.xs.some(t => Math.abs(t - x) < 1.6))) other.forEach(n => { n.tuplet = g.tf; });
          }
        }
      }
      for (const c of curves) {
        if (!(st.top - 30 < c.y0 && c.y0 < st.bottom + 30) || c.width < 4) continue;
        const ccy = (c.y0 + c.y1) / 2;
        const voice = ccy < st.mid ? 'R' : 'L';
        const vn = headNotes.filter(n => n.voice === voice && !n.grace);
        const start = vn.filter(n => c.x0 - 10 <= n.x && n.x <= c.x0 + 4 && Math.abs(n.y - ccy) < 10);
        const end = vn.filter(n => c.x1 - 6 <= n.x && n.x <= c.x1 + 12 && Math.abs(n.y - ccy) < 10 && n.x > c.x0 + 2);
        if (end.length) end.reduce((b, n) => n.x < b.x ? n : b).tied = true;
        else if (start.length && c.x1 > st.x1 - 15) pendingTie[voice] = true;
      }
      const ferm = sg.filter(g => g.code === FERMATA);
      const trills = sg.filter(g => g.code === TRILL_EXT).sort((a, b) => a.x0 - b.x0);
      const rollSpan = trills.length ? [trills[0].x0, trills[trills.length - 1].x1] : null;

      const staffStart = measures.length;
      for (let i = 0; i < regions.length; i++) {
        const [a, b] = regions[i];
        const isBeam = r => beamList.some(bm => bm.x0 - 2 <= r.x0 && r.x1 <= bm.x1 + 2 && Math.abs(bm.yAt((r.x0 + r.x1) / 2) - (r.y0 + r.y1) / 2) < 3) && (notes.filter(n => !n.rest && n.x >= r.x0 - 4 && n.x <= r.x1 + 4).length >= 2
          || glyphs.filter(g => isMaestro(g) && (g.code === HEAD_FILLED || g.code === HEAD_HALF) && g.ox >= r.x0 - 6 && g.ox <= r.x1 + 4 && Math.abs(g.oy - st.mid) < 45).length >= 2);   // 빔 아래(옆 오선 포함)에는 음표가 있다 (여러 마디 쉼표 막대에는 없음)
        // 마디 안의 굵은 가로 막대(여러 마디 쉼표)로 마디를 나눈다. 가운데 줄 높이에 놓인 빔(16분음표 묶음 등)은 제외
        const r = [...rects, ...thickH].find(r => a <= r.x0 && r.x1 <= b && r.width > 20 && Math.abs((r.y0 + r.y1) / 2 - st.mid) < 3 && !isBeam(r));
        if (r && notes.some(n => n.x > r.x1 + 3 && n.x < b)) { regions.splice(i, 1, [a, r.x1 + 2], [r.x1 + 2, b]); leftDouble.splice(i + 1, 0, false); i++; }
      }
      // ---- 음높이: 음자리표·조표·임시표로 음표마다 MIDI 번호를 붙인다 (오선 5줄, 타악기 음자리표가 아닐 때) ----
      if (pitchedStaff) {
        const sp = (st.bottom - st.top) / 4;
        const stepOf = y => Math.round((st.bottom - y) / (sp / 2));
        // 음자리표: 맨 아랫줄의 음 (C0=0부터 센 온음계 번호)
        const clefs = sg.filter(g => [38, 63, 66].includes(g.code) && g.oy > st.top - sp * 3 && g.oy < st.bottom + sp * 3).map(g => {
          let base = g.code === 38 ? 30 : g.code === 63 ? 18 : 24;           // 높은음 E4, 낮은음 G2, 가온(알토) F3
          if (g.code === 66 && stepOf(g.oy) >= 6) base = 22;                 // 테너 음자리표(넷째 줄 C)
          if (g.clefOct) base += g.clefOct * 7;                             // 옥타브 음자리표(아래 8 = 한 옥타브 낮게 소리 남)
          return { x: g.x0, x1: g.x1, base };
        }).sort((a, b) => a.x - b.x);
        // 임시표·조표 글자
        const ACC = { 98: -1, 35: 1, 110: 0, 186: -2, 220: 2 };
        const accs = sg.filter(g => g.code in ACC && g.size > smallSize * 0.9 && g.oy > st.top - sp * 4 && g.oy < st.bottom + sp * 4);
        const heads0 = notes.filter(n => !n.rest);
        // 음자리표 바로 뒤에 이어 놓인 ♭·♯ 묶음은 조표 (첫 음표와 높이가 같아도 그 음의 임시표로 보지 않는다)
        const keyRun = new Set();
        for (const c of clefs) {
          let edge = c.x1;
          for (const a of accs.filter(a => a.x0 > c.x1 - 1 && ACC[a.code] !== 0).sort((p, q) => p.x0 - q.x0)) {
            if (a.x0 - edge > sp * 2.2) break;
            if (heads0.some(n => n.x < a.x0 && n.x > c.x1)) break;
            keyRun.add(a); edge = a.x1;
          }
        }
        const attached = a => !keyRun.has(a) && heads0.some(n => Math.abs(n.y - a.oy) < sp * 0.6 && n.x - a.x1 > -1 && n.x - a.x1 < sp * 4.5);
        // 음표에 붙지 않은 임시표 묶음 = 조표 (단 처음, 또는 조바꿈)
        // 오선에서 멀리 떨어진 것(코드 이름 'E♭' 등의 ♭)은 조표가 아니다. 조표는 오선 위·바로 위아래에 놓인다
        const accSz = Math.max(0, ...accs.filter(a => a.oy >= st.top - sp && a.oy <= st.bottom + sp).map(a => a.size));
        const keyAcc = accs.filter(a => !attached(a) && a.oy >= st.top - sp * 1.6 && a.oy <= st.bottom + sp * 1.2 && a.size > accSz * 0.85).sort((a, b) => a.x0 - b.x0);
        const keyChanges = [];
        for (const a of keyAcc) {
          const last = keyChanges[keyChanges.length - 1];
          if (last && a.x0 - last.x1 < sp * 3) { last.items.push(a); last.x1 = a.x1; } else keyChanges.push({ x: a.x0, x1: a.x1, items: [a] });
        }
        const clefAt = x => { let b = lineState.clef; for (const c of clefs) if (c.x <= x) b = c.base; return b; };
        const keyFromItems = (items, x) => {
          const base = clefAt(x), k = {};
          for (const a of items) { if (ACC[a.code] !== 0) k[(base + stepOf(a.oy)) % 7] = ACC[a.code]; }
          return k;
        };
        const keyAt = x => { let k = lineState.key; for (const c of keyChanges) if (c.x <= x) k = keyFromItems(c.items, c.x); return k; };
        const SEMI = [0, 2, 4, 5, 7, 9, 11];
        for (const [rx0, rx1] of regions) {
          const barAcc = {};      // 이 마디에서 임시표가 붙은 음 (온음계 번호 → 변화)
          const inBar = notes.filter(n => !n.rest && n.x >= rx0 && n.x < rx1).sort((a, b) => a.x - b.x);
          for (const n of inBar) {
            const base = clefAt(n.x), d = base + stepOf(n.y);
            const acc = accs.find(a => attached(a) && Math.abs(n.y - a.oy) < sp * 0.6 && n.x - a.x1 > -1 && n.x - a.x1 < sp * 4.5 && !heads0.some(o => o !== n && Math.abs(o.y - a.oy) < sp * 0.6 && o.x > a.x1 - 1 && o.x < n.x - 0.5));
            if (acc) barAcc[d] = ACC[acc.code];
            const key = keyAt(n.x);
            const alt = d in barAcc ? barAcc[d] : (key[d % 7] || 0);
            n.midi = 12 * (Math.floor(d / 7) + 1) + SEMI[((d % 7) + 7) % 7] + alt;
          }
        }
        // 다음 단으로 넘길 상태 (끝의 음자리표·조표)
        if (clefs.length) lineState.clef = clefs[clefs.length - 1].base;
        if (keyChanges.length) lineState.key = keyFromItems(keyChanges[keyChanges.length - 1].items, keyChanges[keyChanges.length - 1].x);
      }

      regions.forEach(([rx0, rx1], ri) => {
        const inr = x => rx0 <= x && x < rx1;
        const m = { page: pi, staff: si, x0: rx0, x1: rx1, timesig: null, notes: notes.filter(n => inr(n.x)), kind: 'normal', multirest: 0,
          repeatStart: false, repeatEnd: false, fermata: false, sectionStart: false, warnings: [], tempoMarks: [] };
        let content = m.notes.length > 0;
        const ts = sg.filter(g => isDigit(g.code) && inr(cx(g)) && st.top - 2 <= g.oy && g.oy <= st.bottom + 2);
        const cts = sg.filter(g => g.code === COMMON_TIME && inr(cx(g)));
        let tsig = null;
        if (ts.length) {
          const big = Math.max(...ts.map(g => g.size));
          const ts2 = ts.filter(g => g.size > big - 1.5);
          const x0 = Math.min(...ts2.map(g => g.ox));
          // 더해 쓴 박자(3+3+2/8): 분자 숫자 바로 옆에 '+'(Maestro ˆ)가 끼어 이어지는 경우만 이어 읽어 더한다
          let near = ts2.filter(g => g.ox - x0 < 12);
          let num = near.filter(g => g.oy < st.mid + 0.5).sort((a, b) => a.ox - b.ox);
          const den = near.filter(g => g.oy >= st.mid + 0.5).sort((a, b) => a.ox - b.ox);
          let numV = +num.map(g => g.code - 48).join('');
          if (num.length) {
            const row = sg.filter(g => (isDigit(g.code) || g.code === 43 || g.code === 246) && Math.abs(g.oy - num[0].oy) < 1 && g.ox >= num[0].ox).sort((a, b) => a.ox - b.ox);
            const chain = [row[0]];
            for (const g of row.slice(1)) { const p = chain[chain.length - 1]; if (g.ox - p.ox > g.size * 0.75) break; chain.push(g); }
            const pl = chain.filter(g => g.code === 43 || g.code === 246);
            const isP = g => g.code === 43 || g.code === 246;
            const ok = pl.length && isDigit(chain[0].code) && isDigit(chain[chain.length - 1].code) && chain.every((g, i) => i === 0 || !(isP(g) && isP(chain[i - 1])));
            if (ok) {
              let sum = 0, cur = ''; for (const g of chain) { if (!isDigit(g.code)) { sum += +cur || 0; cur = ''; } else cur += String(g.code - 48); } numV = sum + (+cur || 0);
            }
          }
          if (num.length && den.length) tsig = [numV, +den.map(g => g.code - 48).join('')];
        } else if (cts.length) tsig = [4, 4];
        if (!tsig) { const bt = bigTs.find(t => t.sys === sysOf(si) && inr((t.x + t.x1) / 2)); if (bt) tsig = bt.ts; }
        if (tsig) pendingTimesig = tsig;
        if (sg.some(g => g.code === MEAS_REPEAT && inr(cx(g)))) { m.kind = 'repeat1'; content = true; }
        let pendingTwoBarNext = false;
        if (sg.some(g => g.code === TWO_BAR_REPEAT && rx0 + 3 < cx(g) && cx(g) <= rx1 + 3)) { m.kind = 'repeat2a'; content = true; pendingTwoBarNext = true; }
        const mr = [...rects, ...thickH].filter(r => inr(r.x0 + 1) && r.width > 20 && Math.abs((r.y0 + r.y1) / 2 - st.mid) < 3);
        if (mr.length) {
          const r = mr[0];
          const above = g => isDigit(g.code) && g.oy < (st.oneLine ? st.mid - 2 : st.top - 2) && g.oy > st.top - 30;
          const rc = (r.x0 + r.x1) / 2;
          const pickRun = list => {
            list = [...list].sort((a, b) => Math.abs(a.oy - b.oy) < 1 ? a.ox - b.ox : a.oy - b.oy);
            const runs = [];
            for (const g of list) { const lr = runs[runs.length - 1]; const p = lr && lr[lr.length - 1];
              if (p && p.font === g.font && Math.abs(p.oy - g.oy) < 1 && g.x0 - p.x1 < 3) lr.push(g); else runs.push([g]); }
            let best = null, bd = 1e9;
            for (const rn of runs) { const c = (rn[0].x0 + rn[rn.length - 1].x1) / 2, d = Math.abs(c - rc); if (d < bd) { bd = d; best = rn; } }
            return best && bd < 15 ? best : [];
          };
          let nd = pickRun(sg.filter(above));
          // 네모 칸 안의 마디 번호('222 - 224' 등)는 쉼표 마디 수가 아니다
          const inBox = g => boxes.some(b => b.x0 - 0.5 <= cx(g) && cx(g) <= b.x1 + 0.5 && b.y0 - 0.5 <= g.oy - g.size * 0.3 && g.oy - g.size * 0.3 <= b.y1 + 0.5);
          if (!nd.length) nd = pickRun(italicNums.filter(g => isDigit(g.code) && !inBox(g) && g.oy < st.top + 2 && g.oy > st.top - 30));
          if (!nd.length) nd = pickRun(glyphs.filter(g => isDigit(g.code) && !inBox(g) && g.size < 26 && g.oy < st.top + 2 && g.oy > st.top - 30));
          m.kind = 'multirest'; m.multirest = Math.max(1, nd.length ? +nd.map(g => g.code - 48).join('') : 1); content = true;
          // 숫자 일부가 네모 칸에 가려졌거나 못 찾았으면 나중에 인쇄된 마디 번호로 맞춘다
          m.mrUncertain = !nd.length || glyphs.some(g => isDigit(g.code) && inBox(g) && Math.abs(cx(g) - rc) < (r.x1 - r.x0) / 2 + 10 && g.oy < st.top + 2 && g.oy > st.top - 30);
        }
        // 도돌이 점: 같은 세로줄에 가운데선 위·아래로 대칭인 점 두 개.
        // 음표의 부점으로도 쓰인 점이면 겹세로줄(굵은+가는 선) 옆일 때만 도돌이로 본다
        const near = (inRange) => {
          const ds = dots.map((g, i) => ({ g, used: usedDots.has(i) })).filter(d => inRange(d.g) && Math.abs(d.g.oy - st.mid) < 6);
          for (const a of ds) for (const b of ds) {
            if (a === b || Math.abs(a.g.ox - b.g.ox) > 0.8 || !(a.g.oy < st.mid && b.g.oy > st.mid)) continue;
            if (Math.abs(a.g.oy + b.g.oy - 2 * st.mid) > 2.5) continue;
            return (a.used || b.used) ? 'weak' : 'pair';
          }
          return st.oneLine ? (ds.some(d => !d.used) ? 'single' : null) : null;
        };
        const rightDbl = bounds.slice(1).some(bb => Math.abs(bb[0] - rx1) < 1 && bb[2] >= 2);
        const st0 = near(g => rx0 - 1 <= g.x0 && g.x0 <= rx0 + 7), st1 = near(g => rx1 - 7 <= g.x1 && g.x1 <= rx1 + 1);
        if (st0 === 'pair' || ((st0 === 'weak' || st0 === 'single') && leftDouble[ri])) m.repeatStart = true;
        if (st1 === 'pair' || ((st1 === 'weak' || st1 === 'single') && rightDbl)) m.repeatEnd = true;
        m.sectionStart = leftDouble[ri] || (ri === 0 && prevRightDouble);
        const rightIsDouble = bounds.slice(1).some(bb => Math.abs(bb[0] - rx1) < 1 && bb[2] >= 2);
        m.fermata = ferm.some(g => rx0 - 3 <= cx(g) && cx(g) <= rx1 + 3);
        const inRoll = rollSpan && rollSpan[0] < rx0 && rollSpan[1] > rx0 + 5;
        const isFirst = ri === 0;
        const isTrailing = ri === regions.length - 1 && (!groups.length || rx0 >= groups[groups.length - 1][groups[groups.length - 1].length - 1][0] - 0.5) && rx1 >= st.x1 - 0.5;
        if (pendingTwoBar && isFirst && !content) content = true;
        if (isFirst && !content) {
          const head = sg.filter(g => inr(cx(g)) && g.oy > st.top - 12 && g.oy < st.bottom + 12);
          const used = head.length ? Math.max(...head.map(g => g.x1)) : rx0;
          if (rx1 - used > 40) content = true;
        }
        if (!content && !isFirst && !isTrailing) {
          // 겹세로줄과 도돌이 시작 사이에 박자표만 들어 있는 좁은 칸은 마디가 아니다
          const head = sg.filter(g => inr(cx(g)) && g.oy > st.top - 12 && g.oy < st.bottom + 12);
          const used = head.length ? Math.max(...head.map(g => g.x1)) : rx0;
          content = !(tsig && rx1 - rx0 < 45 && rx1 - used < 12 && !rests.some(r => inr(cx(r))));
        }
          if (!content) { if (m.repeatEnd && measures.length) measures[measures.length - 1].repeatEnd = true; return; }
        if (pendingTwoBar && m.kind === 'normal' && !m.notes.length) m.kind = 'repeat2b';
        for (const v of Object.keys(pendingTie)) {
          const vn = m.notes.filter(n => n.voice === v && !n.rest && !n.grace).sort((a, b) => a.x - b.x);
          if (vn.length) vn[0].tied = true;
          delete pendingTie[v];
        }
        if (pendingTimesig) { m.timesig = pendingTimesig; pendingTimesig = null; }
        if (rollSpan) m.notes.forEach(n => { if (!n.rest && rollSpan[0] - n.x > 0 && rollSpan[0] - n.x < 20) n.roll = true; });
        if (inRoll && !m.notes.length) m.rollExt = true;
        measures.push(m);
        prevRightDouble = rightIsDouble;
        pendingTwoBar = m.kind === 'repeat2a' ? pendingTwoBarNext : false;
      });
      // 템포 표시는 그 x 위치 이후 처음 시작하는 마디에 붙인다
      for (const mk of pageMarks) {
        if (sysOf(mk.staff) !== sysOf(si) || mk.used) continue;
        const tgt = measures.slice(staffStart).find(m => m.x1 > mk.x + 1);
        if (tgt) { tgt.tempoMarks.push(mk); mk.used = true; }
      }
      readMarks(st, si, measures.slice(staffStart), staffStart);
    });
  });

  // 코다: To Coda 글자가 없으면 코다 기호 두 개 중 앞은 To Coda, 뒤는 코다 시작
  codaSigns.sort((a, b) => a.mi - b.mi);
  if (!measures.some(m => m.toCoda) && codaSigns.length >= 2) {
    const c = codaSigns.shift(); measures[c.mi].toCoda = true; addLabel(measures[c.mi], 'To Coda');
  }
  for (const c of codaSigns) if (!measures[c.mi].toCoda && !measures[c.mi].codaStart) { measures[c.mi].codaStart = true; addLabel(measures[c.mi], 'Coda'); }

  return { measures, systemNumbers, scanned, maestroCount, marks };

  // ---- 한 단의 악상기호 읽기 ----
  function readMarks(st, si, sm, base) {
    if (!sm.length) return;
    const pg = curPage;
    const { sg, runs, segs, staffOf, sysOf, sysTop } = pg;
    const sameSys = i => i != null && sysOf(i) === sysOf(si);
    const tTop = sysTop(si).top;
    const posAt = x => {
      const k = sm.findIndex(m => x < m.x1);
      if (k < 0) return { mi: base + sm.length - 1, frac: 1 };
      const m = sm[k];
      return { mi: base + k, frac: Math.max(0, Math.min(1, (x - m.x0) / Math.max(1, m.x1 - m.x0))) };
    };
    const mAt = x => measures[posAt(x).mi];
    // 기호 바로 위·아래 음표 (25pt 안). 시간 위치를 그 음표에 맞춘다
    const nearNote = (p, x) => {
      const c = measures[p.mi].notes.filter(n => !n.grace && Math.abs(n.x - x) < 25);
      return c.length ? c.reduce((b, n) => Math.abs(n.x - x) < Math.abs(b.x - x) ? n : b) : null;
    };
    const at = x => { const p = posAt(x); return { ...p, note: nearNote(p, x) }; };
    const outside = y => y > st.bottom + 2 || y < st.top - 2;

    // 셈여림 글자
    const dg = sg.filter(g => staffOf(g.oy) === si && (DYN_COMPOSITE[g.code] || DYN_LETTER[g.code]) && g.size > pg.smallSize && outside(g.oy))
      .sort((a, b) => a.ox - b.ox);
    const groups = [];
    for (const g of dg) {
      const lg = groups[groups.length - 1];
      if (lg && Math.abs(lg[lg.length - 1].oy - g.oy) < 2 && g.x0 - lg[lg.length - 1].x1 < 3) lg.push(g); else groups.push([g]);
    }
    for (const grp of groups) {
      const lab = grp.map(g => DYN_COMPOSITE[g.code] || DYN_LETTER[g.code]).join('');
      if (!(lab in DYN_LEVEL) && !DYN_ACCENT.has(lab)) continue;
      const x = (grp[0].x0 + grp[grp.length - 1].x1) / 2;
      const p = posAt(x), m = measures[p.mi];
      addLabel(m, lab);
      if (DYN_ACCENT.has(lab)) {
        const c = m.notes.filter(n => !n.rest && !n.grace);
        if (c.length) c.reduce((b, n) => Math.abs(n.x - x) < Math.abs(b.x - x) ? n : b).accent = true;
      }
      const lv = DYN_LEVEL[DYN_AFTER[lab] || lab];
      if (lv != null) marks.push({ type: 'dyn', ...at(grp[0].x0 + 2), label: lab, level: lv });
    }

    // 세뇨, 코다 기호
    for (const g of sg) {
      if (!sameSys(staffOf(g.oy)) || g.oy > tTop) continue;
      if (g.code === SEGNO) { const m = mAt(cx(g) + 3); m.segno = true; addLabel(m, 'Segno'); }
      if (CODA_CODES.has(g.code)) codaSigns.push({ mi: posAt(cx(g) + 3).mi });
    }

    // 1·2번 괄호: 오선 위 가로선 + 왼쪽 아래 "1." 같은 숫자
    for (const s of segs) {
      if (s.used || Math.abs(s.y1 - s.y0) > 0.3 || s.x1 - s.x0 < 12) continue;
      if (!(s.y0 < tTop - 4 && s.y0 > tTop - 45) || !sameSys(staffOf(s.y0))) continue;
      const r = runs.find(r => !r.used && /^\s*\d+(\s*[.,]\s*\d+)*\s*\.?\s*$/.test(r.text) && r.text.trim().length <= 6 && r.x0 >= s.x0 - 3 && r.x0 <= s.x0 + 20 && r.y >= s.y0 + 2 && r.y <= s.y0 + 18);
      if (!r) continue;
      r.used = true; s.used = true;
      const nums = r.text.match(/\d+/g).map(Number);
      let first = true;
      for (const m of sm) {
        const ov = Math.min(m.x1, s.x1) - Math.max(m.x0, s.x0);
        if (ov > 0.5 * (m.x1 - m.x0)) { m.volta = nums; if (first) { addLabel(m, nums.join(',') + '.'); first = false; } }
      }
    }

    // 점선 끝 찾기 (글자 '-' 또는 짧은 선분)
    const rampEnd = r => {
      let x = r.x1, found = /-\s*-/.test(r.text);
      for (;;) {
        const s = segs.find(s => !s.used && s.x1 - s.x0 < 9 && Math.abs(s.y1 - s.y0) < 0.3 && s.y0 > r.y - 9 && s.y0 < r.y + 2 && s.x0 >= x - 1 && s.x0 - x < 14);
        if (!s) break;
        s.used = true; x = s.x1; found = true;
      }
      return { x, found };
    };

    // 글자로 된 지시어
    for (const r of runs) {
      if (r.used) continue;
      const own = staffOf(r.y) === si, sys = sameSys(staffOf(r.y));
      if (!sys) continue;
      let t = r.text.replace(/\s+/g, ' ').trim();
      if (!t || /=/.test(t)) continue;
      // 단 왼쪽 바깥의 글자는 악기 이름(예: 'D. S. 1' = Drum Set 1)이지 지시어가 아니다
      if (r.x1 < st.x0 + 2) continue;
      if (/^([A-Za-z]-){2,}/.test(t)) t = t.replace(/([A-Za-z])-(?=[A-Za-z])/g, '$1').replace(/^([A-Za-z]+)-/, '$1 -');
      // 셈여림 글자는 그 줄 것만, 반복·빠르기 지시는 단 전체 공통
      if (!own && /^(cresc|dim|decresc)|점점\s*(세게|여리게)/i.test(t)) continue;
      let hit = true;
      if (/(^|[^A-Za-z])D\.\s?S\.?|^D\.?S\.?$|달\s*세뇨/.test(t)) { const m = mAt(r.x1 - 2); m.ds = true; addLabel(m, 'D.S.'); }
      else if (/(^|[^A-Za-z])D\.\s?C\.?|^D\.?C\.?$|다\s*카\s*포/.test(t)) { const m = mAt(r.x1 - 2); m.dc = true; addLabel(m, 'D.C.'); }
      else if (/to\s*coda|코다로/i.test(t)) { const m = mAt(r.x1 - 2); m.toCoda = true; addLabel(m, 'To Coda'); }
      else if (/^coda$|^코다$/i.test(t)) codaSigns.push({ mi: posAt(r.x0 + 2).mi });
      else if (/^fine\.?$|^피네$/i.test(t)) { const m = mAt(r.x1 - 2); m.fine = true; addLabel(m, 'Fine'); }
      else if (/^(a tempo|tempo i\b|tempo primo)|(원래|처음)\s*빠르기/i.test(t)) { marks.push({ type: 'atempo', a: at(r.x0 + 2) }); addLabel(mAt(r.x0), 'a tempo'); }
      else if (/^(rit|rall)|점점\s*느리게/i.test(t)) { const e = rampEnd(r); marks.push({ type: 'tramp', kind: 'rit', a: at(r.x0 + 2), b: posAt(e.x), dashed: e.found }); addLabel(mAt(r.x0), 'rit.'); }
      else if (/^accel|점점\s*빠르게/i.test(t)) { const e = rampEnd(r); marks.push({ type: 'tramp', kind: 'accel', a: at(r.x0 + 2), b: posAt(e.x), dashed: e.found }); addLabel(mAt(r.x0), 'accel.'); }
      else if (/^cresc|점점\s*세게/i.test(t)) { const e = rampEnd(r); marks.push({ type: 'dramp', dir: 1, a: at(r.x0 + 2), b: posAt(e.x), dashed: e.found }); addLabel(mAt(r.x0), 'cresc.'); }
      else if (/^(dim|decresc)|점점\s*여리게/i.test(t)) { const e = rampEnd(r); marks.push({ type: 'dramp', dir: -1, a: at(r.x0 + 2), b: posAt(e.x), dashed: e.found }); addLabel(mAt(r.x0), 'dim.'); }
      else hit = false;
      if (hit) r.used = true;
    }

    // 헤어핀 < >
    const diag = segs.filter(s => !s.used && s.x1 - s.x0 > 8 && Math.abs(s.y1 - s.y0) > 0.4 && Math.abs(s.y1 - s.y0) / (s.x1 - s.x0) < 0.35
      && staffOf((s.y0 + s.y1) / 2) === si && outside((s.y0 + s.y1) / 2));
    for (let i = 0; i < diag.length; i++) for (let j = i + 1; j < diag.length; j++) {
      const a = diag[i], b = diag[j];
      if (a.used || b.used) continue;
      let dir = 0;
      if (Math.hypot(a.x0 - b.x0, a.y0 - b.y0) < 1.5 && Math.abs(a.y1 - b.y1) > 2) dir = 1;
      else if (Math.hypot(a.x1 - b.x1, a.y1 - b.y1) < 1.5 && Math.abs(a.y0 - b.y0) > 2) dir = -1;
      if (!dir) continue;
      a.used = b.used = true;
      const x0 = Math.min(a.x0, b.x0), x1 = Math.max(a.x1, b.x1);
      marks.push({ type: 'dramp', dir, a: at(x0), b: posAt(x1), dashed: true });
      addLabel(mAt(x0), dir > 0 ? '<' : '>');
    }
  }
}

// ---------- 3. 시간 계산 ----------
function timing(m, barLen) {
  fixCenteredRests(m);
  // 온쉼표: 그 성부에 다른 음표가 없으면 마디 전체, 있으면 온음표 길이
  for (const n of m.notes) if (n.wholeRest) n.dur = m.notes.some(o => o !== n && o.voice === n.voice && !o.grace) ? F(1) : barLen;
  const chordMembers = m.notes.filter(n => n.chordOf && !n.grace);
  const main = m.notes.filter(n => !n.grace && !n.chordOf);
  const graces = m.notes.filter(n => n.grace);
  fixAmbigBeams(m, barLen);
  for (const v of ['R', 'L']) {
    const vn = main.filter(n => n.voice === v);
    if (vn.some(n => n.tuplet)) {
      const plain = frSum(vn.map(n => n.dur));
      const scaled = frSum(vn.map(n => n.tuplet ? n.dur.mul(n.tuplet === true ? F(2, 3) : n.tuplet) : n.dur));
      if (scaled.eq(barLen) || (!plain.eq(barLen) && scaled.lt(plain))) vn.forEach(n => { if (n.tuplet) n.dur = n.dur.mul(n.tuplet === true ? F(2, 3) : n.tuplet); });
    }
  }
  const onset = new Map();
  const complete = new Set();
  for (const v of ['R', 'L']) {
    const vn = main.filter(n => n.voice === v).sort((a, b) => a.x - b.x);
    const tot = frSum(vn.map(n => n.dur));
    if (vn.length && tot.eq(barLen)) {
      complete.add(v);
      let t = ZERO;
      for (const n of vn) { onset.set(n, t); t = t.add(n.dur); }
    }
  }
  const cols = [];
  for (const n of [...main].sort((a, b) => a.x - b.x)) {
    const lc = cols[cols.length - 1];
    if (lc && n.x - lc[0] < 2.0) lc[1].push(n); else cols.push([n.x, [n]]);
  }
  let t = ZERO; const ends = []; const lastEnd = { R: ZERO, L: ZERO };
  for (const [, col] of cols) {
    const anchor = col.filter(n => onset.has(n)).map(n => onset.get(n));
    if (anchor.length) t = anchor[0];
    for (const n of col) {
      if (!onset.has(n)) onset.set(n, frMax(t, lastEnd[n.voice]));
      lastEnd[n.voice] = onset.get(n).add(n.dur);
      ends.push(onset.get(n).add(n.dur));
    }
    const later = ends.filter(e => e.gt(t));
    if (later.length) t = later.reduce((a, b) => (b.lt(a) ? b : a));
  }
  for (const v of ['R', 'L']) {
    if (complete.has(v)) continue;
    const vn = main.filter(n => n.voice === v);
    if (!vn.length) continue;
    const endMax = vn.map(n => onset.get(n).add(n.dur)).reduce((a, b) => frMax(a, b));
    if (endMax.gt(barLen)) m.warnings.push(`${v === 'R' ? '윗' : '아랫'}성부가 마디 길이를 넘음`);
    else m.warnings.push(`${v === 'R' ? '윗' : '아랫'}성부 쉼표 일부 숨김 → 위치로 추정`);
  }
  const gcount = new Map();
  for (const g of graces) {
    const c = main.filter(n => n.voice === g.voice && !n.rest && n.x >= g.x - 4);
    if (c.length) { const tgt = c.reduce((b, n) => n.x < b.x ? n : b); gcount.set(tgt, (gcount.get(tgt) || 0) + 1); }
  }
  const evs = [];
  for (const n of chordMembers) if (onset.has(n.chordOf)) { onset.set(n, onset.get(n.chordOf)); main.push(n); }
  for (const n of main) n.onset = onset.get(n);
  const seen = new Map();
  // 꾸밈음 음높이 (선율용)
  const graceMidi = new Map();
  for (const g of graces) {
    if (g.midi == null) continue;
    const c = main.filter(n => n.voice === g.voice && !n.rest && n.x >= g.x - 4);
    if (c.length) { const tgt = c.reduce((b, n) => n.x < b.x ? n : b); if (!graceMidi.has(tgt)) graceMidi.set(tgt, []); graceMidi.get(tgt).push(g.midi); }
  }
  for (const n of [...main].sort((a, b) => a.x - b.x)) {
    if (n.rest) continue;
    if (n.tied) {
      // 붙임줄로 이어진 음: 선율 악기는 앞 음을 길게 (마디를 넘는 붙임줄은 재생할 때 잇는다)
      if (n.midi != null) {
        const prev = evs.filter(e => e.voice === n.voice && e.midis && e.midis.includes(n.midi) && e.t.lt(onset.get(n))).pop();
        if (prev && prev.t.add(prev.sus || prev.dur).eq(onset.get(n))) prev.sus = (prev.sus || prev.dur).add(n.dur);
        else evs.push({ voice: n.voice, t: onset.get(n), dur: n.dur, tie: true, midis: [n.midi] });
      }
      continue;
    }
    const key = n.voice + onset.get(n).toString();
    const ex = seen.get(key);
    if (ex) { ex.accent = ex.accent || n.accent; ex.roll = ex.roll || n.roll || !!n.tremolo; if (n.midi != null && ex.midis && !ex.midis.includes(n.midi)) ex.midis.push(n.midi); continue; }
    const ev = { voice: n.voice, t: onset.get(n), dur: n.dur, accent: n.accent, grace: gcount.get(n) || 0, roll: n.roll || !!n.tremolo };
    if (n.tremolo && !n.roll) ev.rollDur = n.dur;
    if (n.midi != null) { ev.midis = [n.midi]; if (graceMidi.has(n)) ev.graceMidis = graceMidi.get(n); }
    seen.set(key, ev); evs.push(ev);
  }
  evs.sort((a, b) => a.t.v - b.t.v);
  return evs;
}

// 박자 길이를 사람이 읽는 박자표로 (추정한 경우)
function lenToSig(L) {
  const e = L.n * 8 / L.d;
  if (Number.isInteger(e) && e % 3 === 0 && e >= 6) return [e, 8];
  if ((L.n * 4) % L.d === 0) return [L.n * 4 / L.d, 4];
  if (Number.isInteger(e)) return [e, 8];
  return [L.n * 16 / L.d, 16];
}

// 오선 가운데 쉼표는 성부를 위치로 알 수 없다: 음표가 한 성부뿐이면 그 성부, 아니면 가까운 음표의 성부
function fixCenteredRests(m) {
  if (m._restsFixed) return; m._restsFixed = true;
  const heads = m.notes.filter(n => !n.rest && !n.grace);
  const voices = new Set(heads.map(n => n.voice));
  // 두 성부가 모두 있으면 각 성부 음표 높이의 중간을 기준으로 쉼표 성부를 정한다
  const avg = v => { const h = heads.filter(n => n.voice === v); return h.length ? h.reduce((a, n) => a + n.y, 0) / h.length : null; };
  const yR = avg('R'), yL = avg('L');
  for (const n of m.notes) {
    if (!n.rest || !heads.length) continue;
    if (voices.size === 1) { if (n.centered) n.voice = [...voices][0]; continue; }
    if (yR != null && yL != null && yL - yR > 2) n.voice = n.y < (yR + yL) / 2 ? 'R' : 'L';
    else if (n.centered) n.voice = heads.reduce((b, h) => Math.abs(h.x - n.x) < Math.abs(b.x - n.x) ? h : b).voice;
  }
}

// 애매한 토막 빔을 뺐더니(긴 음표로 읽음) 마디가 넘치면 그 음표를 짧게 되돌린다
function fixAmbigBeams(m, barLen) {
  if (!m.notes.some(n => n._ambigBeam)) return;
  fixCenteredRests(m);
  for (const v of ['R', 'L']) {
    const vn = m.notes.filter(n => n.voice === v && !n.grace && !n.chordOf);
    let tot = frSum(vn.map(n => n.dur));
    for (const n of vn.filter(n => n._ambigBeam && !n._ambigDone).sort((a, b) => a.x - b.x)) {
      if (!tot.gt(barLen)) break;
      const nd = n.dur.mul(F(1, 2)); tot = tot.sub(n.dur.sub(nd)); n.dur = nd; n._ambigDone = true;
    }
  }
}

// 성부별 음표 길이 합 (잇단음표 표시가 있으면 2/3로 줄인 값도 고려)
function voiceSums(m) {
  fixCenteredRests(m);
  const out = {};
  for (const v of ['R', 'L']) {
    const vn = m.notes.filter(n => n.voice === v && !n.grace && !n.chordOf);
    if (!vn.length || (vn.length === 1 && vn[0].wholeRest)) continue;
    const plain = frSum(vn.map(n => n.dur));
    const scaled = frSum(vn.map(n => n.tuplet ? n.dur.mul(n.tuplet === true ? F(2, 3) : n.tuplet) : n.dur));
    out[v] = [plain, scaled];
  }
  return out;
}

export function resolveBars(measures, systemNumbers = []) {
  const out = [];
  let ts = [4, 4], tsLen = F(4, 4), num = 1, inferredTs = false, tsExplicit = false;
  const printedAt = new Map(systemNumbers);
  // 마디선을 숨긴 칸(MuseScore 등): 음표 뒤에 마디 가운데 온쉼표가 따로 이어지면 쉼표마다 한 마디.
  // 다음 단의 인쇄된 마디 번호가 모자란 만큼과 꼭 맞을 때만 나눈다 (♩+온쉼표 같은 5/4 마디를 잘못 나누지 않게)
  const trailingRests = m => {
    if (m.kind !== 'normal' || m._first == null) return 0;
    const wr = m.notes.filter(n => n.wholeRest && n.centered && !n.grace).sort((a, b) => a.x - b.x).filter((n, i, a) => i === 0 || n.x - a[i - 1].x > 3);
    if (!wr.length || wr.some(n => Math.abs(n.y - wr[0].y) > 1)) return 0;
    const others = m.notes.filter(n => !n.grace && !(n.wholeRest && wr.some(w => Math.abs(w.x - n.x) < 3)));
    if (others.length ? others.some(o => o.x > wr[0].x - 8) : wr.length < 2) return 0;
    if (wr.length >= 2) { const sp = (wr[wr.length - 1].x - wr[0].x) / (wr.length - 1); if (wr.some((w, i) => i && Math.abs(w.x - wr[i - 1].x - sp) > sp * 0.25)) return 0; }
    return others.length ? wr.length : wr.length - 1;
  };
  let sysStart = 0;
  const splitHiddenBars = diff => {
    const cand = [];
    // 온쉼표가 없으면(붙임줄로 이은 긴 음 등) 늘려 읽은 마디 길이가 박자의 정수배인 마디
    const overK = j => { const m = measures[j], e = out[m._first]; if (m.kind !== 'normal' || !e || !m._tsLen || !e.warnings.some(w => /보다 김/.test(w))) return 0; const r = e.barLen.v / m._tsLen.v; return Math.abs(r - Math.round(r)) < 1e-9 && r >= 2 ? Math.round(r) - 1 : 0; };
    for (let j = sysStart; j < measures.length && measures[j] !== curM; j++) { const k = trailingRests(measures[j]) || overK(j); if (k) cand.push([j, k]); }
    if (!cand.length || cand.reduce((a, c) => a + c[1], 0) !== diff) return false;
    for (const [j, k] of cand.reverse()) {
      const at = measures[j]._first, e = out[at];
      e.barLen = measures[j]._tsLen || e.barLen;
      e.warnings = e.warnings.filter(w => !/보다 김/.test(w));
      const tail = { repeatEnd: e.repeatEnd, ds: e.ds, dc: e.dc, fine: e.fine, toCoda: e.toCoda };
      Object.assign(e, { repeatEnd: false, ds: false, dc: false, fine: false, toCoda: false });
      const add = Array.from({ length: k }, (_, q) => ({ ...e, ...(q === k - 1 ? tail : {}), number: e.number + 1 + q, events: [], note: '쉼', kind: 'rest', labels: [], segno: false, codaStart: false,
        repeatStart: false, sectionStart: false, fermata: false, warnings: q === 0 ? ['마디선이 숨겨져 있어 온쉼표마다 마디를 나눠 읽음'] : [], tempoMarks: [], timesigChange: false }));
      // 늘려 읽은 마디의 뒤쪽 음은 나눈 마디로 옮긴다
      const L = e.barLen;
      for (const ev of e.events.slice()) { const t = typeof ev.t === 'object' ? ev.t : F(0); const q = Math.min(k, Math.floor(t.v / L.v + 1e-9)); if (q > 0) { e.events.splice(e.events.indexOf(ev), 1); add[q - 1].events.push({ ...ev, t: t.sub(L.mul(F(q))) }); add[q - 1].note = ''; add[q - 1].kind = 'normal'; } }
      out.splice(at + 1, 0, ...add);
      for (let q = at + 1 + k; q < out.length; q++) out[q].number += k;
      for (let q = j + 1; q < measures.length; q++) if (measures[q]._first != null) measures[q]._first += k;
    }
    return true;
  };
  let curM = null;
  measures.forEach((m, mi) => {
    curM = m;
    if (m.timesig) { ts = m.timesig; tsLen = F(ts[0], ts[1]); inferredTs = false; tsExplicit = true; }
    // 악보에 인쇄된 단 첫 마디 번호에 맞춘다 (숨긴 마디선이 있으면 번호가 건너뜀)
    const printed = printedAt.get(mi);
    if (printed && printed < num && num - printed < 200 && out.length) {
      // 인쇄된 번호보다 많이 셌다: 바로 앞쪽의 여러 마디 쉼표 숫자를 잘못 읽은 경우가 많다 → 그 쉼표를 줄인다
      const diff = num - printed;
      let j = mi - 1;
      while (j >= 0 && measures[j].kind !== 'multirest' && mi - j < 12) j--;
      const mr = j >= 0 ? measures[j] : null;
      if (mr && mr.kind === 'multirest' && mr._count > diff) {
        const at = mr._first + mr._count - diff;
        out.splice(at, diff);
        mr._count -= diff; mr.multirest -= diff;
        for (let k = j + 1; k < mi; k++) if (measures[k]._first != null) measures[k]._first -= diff;
        for (let k = at; k < out.length; k++) out[k].number -= diff;
        if (out[at - 1]) out[at - 1].warnings.push(`여러 마디 쉼표 숫자를 인쇄된 마디 번호(${printed})에 맞춰 ${mr._count}마디로 고침`);
        num = printed;
      }
    }
    if (printed && printed > num && printed - num < 200 && out.length) {
      // 숫자가 가려진 여러 마디 쉼표가 바로 앞에 있으면 그 쉼표를 늘린다
      let j = mi - 1;
      while (j >= 0 && measures[j].kind !== 'multirest' && mi - j < 12) j--;
      const mr = j >= 0 ? measures[j] : null;
      if (mr && mr.kind === 'multirest' && mr.mrUncertain) {
        const diff = printed - num, at = mr._first + mr._count, tpl = out[at - 1];
        const add = Array.from({ length: diff }, (_, k) => ({ ...tpl, number: tpl.number + 1 + k, repeatStart: false, repeatEnd: false, sectionStart: false, warnings: [], tempoMarks: [], timesigChange: false }));
        out.splice(at, 0, ...add);
        mr._count += diff; mr.multirest += diff;
        for (let k = j + 1; k < mi; k++) if (measures[k]._first != null) measures[k]._first += diff;
        for (let k = at + diff; k < out.length; k++) out[k].number += diff;
        out[at + diff - 1].warnings.push(`가려진 여러 마디 쉼표 숫자를 인쇄된 마디 번호(${printed})에 맞춰 ${mr._count}마디로 읽음`);
        num = printed;
      }
    }
    if (printed && printed > num && printed - num < 40 && out.length && splitHiddenBars(printed - num)) num = printed;
    if (printed && printed > num && printed - num < 40 && out.length) {
      out[out.length - 1].warnings.push(`마디선이 보이지 않아 ${out[out.length - 1].number}~${printed - 1}마디를 한 마디로 읽음`);
      num = printed;
    } else if (printed && printed > num && !out.length && printed < 2000) {
      num = printed;   // 총보에서 처음 몇 단 동안 숨겨진 악기: 처음 보이는 단의 인쇄 번호부터
    } else if (printed && printed > num && out.length) {
      // 총보에서 쉬는 동안 이 악기 오선을 숨긴 경우: 인쇄된 번호가 크게 뛴다. 뒤 단 번호도 계속 커지면 믿고 맞춘다
      const later = [...printedAt.entries()].filter(([k]) => k > mi).sort((a, b) => a[0] - b[0])[0];
      if (!later || later[1] > printed) num = printed;
    }
    if (printedAt.has(mi)) sysStart = mi;
    let barLen = tsLen;
    let thisTs = ts, tsNote = '';
    // 박자표를 못 읽었거나 다른 경우: 두 성부 길이가 같으면 그 길이를 박자로 본다
    if (m.kind === 'normal' && m.notes.length) {
      fixAmbigBeams(m, tsLen);
      const vs = voiceSums(m);
      const vals = Object.values(vs);
      const matches = vals.some(([p, q]) => p.eq(tsLen) || q.eq(tsLen));
      if (!matches && vals.length) {
        let L = null, strong = false;
        if (vals.length === 2) {
          for (const x of vals[0]) for (const y of vals[1]) if (!L && x.eq(y)) { L = x; strong = true; }
        }
        if (!L) { const mx = vals.flat().reduce((a, b) => (b.gt(a) ? b : a)); if (mx.gt(tsLen)) L = mx; }
        if (L && L.lt(tsLen)) {
          // 짧은 쪽은 다음 마디도 같을 때만 새 박자로 본다 (쉼표를 못 읽었을 수 있음)
          const nxt = measures.slice(mi + 1).find(x => x.kind === 'normal' && x.notes.length);
          const ok = strong && !m.timesig && nxt && !nxt.timesig && Object.values(voiceSums(nxt)).some(([p, q]) => p.eq(L) || q.eq(L));
          if (!ok) L = null;
        }
        if (L) {
          barLen = L;
          // 새 박자로 볼지: 더 길거나, 다음 마디도 같은 길이일 때만
          const nxt = measures.slice(mi + 1).find(x => x.kind === 'normal' && x.notes.length);
          const nextAgrees = nxt && !nxt.timesig && Object.values(voiceSums(nxt)).some(([p, q]) => p.eq(L) || q.eq(L));
          // 악보에 박자표가 적혀 있으면 두 성부가 모두 같고 다음 마디도 같을 때만 바꾼다
          // 박자표가 적힌 악보에서 짧아지는 쪽은 바꾸지 않는다: 짧아진 박자라면 박자표가 적혀 있었을 것이고, 대개 쉼표를 못 읽은 것
          const adopt = tsExplicit ? (strong && nextAgrees && L.gt(tsLen)) : ((strong && (L.gt(tsLen) || nextAgrees)) || (L.gt(tsLen) && nextAgrees));
          if (!m.timesig && adopt) { tsLen = L; ts = lenToSig(L); inferredTs = true; thisTs = ts; tsNote = 'infer'; }
          else if (strong) { thisTs = lenToSig(L); }
          else if (!strong) { m.warnings.push('음표 길이가 박자보다 김 → 마디를 늘려 읽음'); }
        }
      }
    }
    const marks = m.tempoMarks;
    m._tsLen = tsLen;
    m._first = out.length; m._count = m.kind === 'multirest' ? m.multirest : 1; m.timesigLen = barLen.v;
    const flags = (k, cnt) => ({ segno: !!m.segno && k === 0, codaStart: !!m.codaStart && k === 0, volta: m.volta || null,
      ds: !!m.ds && k === cnt - 1, dc: !!m.dc && k === cnt - 1, fine: !!m.fine && k === cnt - 1, toCoda: !!m.toCoda && k === cnt - 1,
      labels: k === 0 ? (m.labels || []).slice() : [] });
    if (m.kind === 'multirest') {
      for (let k = 0; k < m.multirest; k++) {
        out.push({ ...flags(k, m.multirest), number: num++, timesig: ts, barLen: tsLen, events: [], note: '쉼', kind: 'rest', src: mi,
          repeatStart: m.repeatStart && k === 0, repeatEnd: m.repeatEnd && k === m.multirest - 1,
          sectionStart: m.sectionStart && k === 0, fermata: false, warnings: [], tempoMarks: k === 0 ? marks : [], timesigChange: !!m.timesig && k === 0, tsInferred: inferredTs });
      }
      return;
    }
    const prevBar = out[out.length - 1];
    const e = { ...flags(0, 1), number: num++, timesig: thisTs, barLen, src: mi, repeatStart: m.repeatStart, repeatEnd: m.repeatEnd,
      sectionStart: m.sectionStart, fermata: m.fermata, note: '', kind: m.kind, warnings: m.warnings, tempoMarks: marks,
      timesigChange: !!m.timesig || (tsNote === 'infer' && (!prevBar || prevBar.barLen.v !== barLen.v)), tsInferred: inferredTs };
    const copy = arr => arr.map(x => ({ ...x }));
    if (m.kind === 'repeat1' && !out.length) { e.events = []; e.note = '% (앞 마디 없음)'; }
    else if (m.kind === 'repeat1') {
      const prev = out[out.length - 1];
      e.events = copy(prev.events); e.barLen = prev.barLen; e.timesig = prev.timesig; e.timesigChange = false;
      e.note = prev.note === '롤 연장' ? '롤 연장' : '% 앞 마디 반복';
      if (prev.note === '롤 연장') e.kind = 'rollext';
    } else if ((m.kind === 'repeat2a' || m.kind === 'repeat2b') && out.length < 2) { e.events = []; e.note = '두 마디 반복 (앞 마디 없음)'; }
    else if (m.kind === 'repeat2a' || m.kind === 'repeat2b') {
      const src = out[out.length - 2];
      e.events = copy(src.events); e.barLen = src.barLen; e.timesig = src.timesig; e.timesigChange = false;
      e.note = m.kind === 'repeat2a' ? '두 마디 반복 ①' : '두 마디 반복 ②';
    } else {
      e.events = timing(m, barLen);
      // 그래도 넘치면 마디를 늘린다
      const end = e.events.reduce((a, ev) => frMax(a, ev.t.add(ev.dur)), ZERO);
      if (end.gt(e.barLen)) e.barLen = end;
      if (!m.notes.length) { e.note = m.rollExt ? '롤 연장' : '쉼'; e.kind = m.rollExt ? 'rollext' : 'rest'; }
    }
    out.push(e);
  });
  // 롤 길이
  out.forEach((b, i) => {
    for (const ev of b.events) if (ev.roll && !ev.rollDur) {
      let total = b.barLen.sub(ev.t), j = i + 1;
      while (j < out.length && out[j].note === '롤 연장') { total = total.add(out[j].barLen); j++; }
      ev.rollDur = total;
    }
  });
  return out;
}

// 악상기호 위치를 마디 번호 축(0부터, 소수 = 마디 안 위치)으로 바꾼다
export function resolveMarks(measures, marks) {
  const P = q => {
    const m = measures[q.mi];
    if (q.note && q.note.onset && m.timesigLen) return m._first + q.note.onset.v / m.timesigLen;
    return m._first + q.frac * (m._count || 1);
  };
  const dyn = [], tempo = [];
  for (const k of marks) {
    if (k.type === 'dyn') dyn.push({ kind: 'mark', p0: P(k), level: k.level, label: k.label });
    else if (k.type === 'dramp') dyn.push({ kind: 'ramp', p0: P(k.a), p1: P(k.b), dir: k.dir, dashed: k.dashed });
    else if (k.type === 'tramp') tempo.push({ kind: k.kind, p0: P(k.a), p1: P(k.b), dashed: k.dashed });
    else if (k.type === 'atempo') tempo.push({ kind: 'atempo', p0: P(k.a), p1: P(k.a) });
  }
  const byP = (a, b) => a.p0 - b.p0;
  dyn.sort(byP); tempo.sort(byP);
  for (const list of [dyn, tempo]) {
    list.forEach((it, i) => {
      if (it.kind === 'mark' || it.kind === 'atempo') return;
      const next = list.slice(i + 1).find(x => x.p0 > it.p0 + 0.01);
      if (!it.dashed || it.p1 - it.p0 < 0.2) it.p1 = Math.min(it.p0 + 2, next ? next.p0 : Infinity);
      if (list === dyn) { const t = list.find(x => x.kind === 'mark' && x.p0 > it.p0 + 0.01 && x.p0 <= it.p1 + 1); it.target = t ? t.level : null; }
    });
  }
  return { dyn, tempo };
}

// 연주 순서: 도돌이표, 1·2번 괄호, D.S./D.C., 코다, Fine
// D.S.·D.C.로 돌아간 뒤에는 도돌이표를 반복하지 않고 마지막 괄호를 연주한다(일반 관례)
export function playbackOrder(bars, { from = 1, to = Infinity, repeats = true } = {}) {
  const N = bars.length;
  const vmax = new Array(N).fill(0);
  for (let i = 0; i < N;) {
    if (!bars[i].volta) { i++; continue; }
    let j = i, mx = 0;
    while (j < N && bars[j].volta) { mx = Math.max(mx, ...bars[j].volta); j++; }
    for (let k = i; k < j; k++) vmax[k] = mx;
    i = j;
  }
  const order = [];
  if (!repeats) {
    for (let i = 0; i < N; i++) if (!bars[i].volta || bars[i].volta.includes(vmax[i])) order.push(i);
  } else {
    const segno = bars.findIndex(b => b.segno);
    const coda = bars.findIndex(b => b.codaStart);
    let i = 0, back = 0, pass = 1, after = false, landed = true, guard = 0;
    const used = new Set();
    while (i < N && guard++ < 50000) {
      const b = bars[i];
      const justLanded = landed; landed = false;
      if ((b.repeatStart || (b.sectionStart && !b.volta)) && !justLanded) { back = i; pass = 1; }
      const ep = after ? (vmax[i] || pass) : pass;
      if (b.volta && !b.volta.includes(ep)) { i++; continue; }
      if (!b.volta && !justLanded && pass > 1 && order.length && bars[order[order.length - 1]].volta) { pass = 1; back = i; }
      order.push(i);
      if (b.repeatEnd && !after) {
        const total = b.volta ? Math.max(2, vmax[i]) : 2;
        if (pass < total) { pass++; i = back; landed = true; continue; }
      }
      if (b.repeatEnd) { back = i + 1; pass = 1; }
      if (after && b.fine) break;
      if (after && b.toCoda && coda > i) { i = coda; back = coda; landed = true; continue; }
      if ((b.ds || b.dc) && !used.has(i)) {
        used.add(i); after = true;
        i = b.ds && segno >= 0 ? segno : 0; back = i; pass = 1; landed = true; continue;
      }
      i++;
    }
  }
  return order.filter(k => bars[k].number >= from && bars[k].number <= to);
}

export function orderToText(bars, order) {
  const segs = [];
  for (const k of order) {
    const n = bars[k].number, last = segs[segs.length - 1];
    if (last && n === last[1] + 1) last[1] = n; else segs.push([n, n]);
  }
  return segs.map(([a, b]) => a === b ? `${a}` : `${a}-${b}`).join(', ');
}

export function parseOrderText(text, bars) {
  const idx = new Map(bars.map((b, i) => [b.number, i]));
  const out = [];
  for (const tok of text.split(',').map(t => t.trim()).filter(Boolean)) {
    const m = tok.match(/^(\d+)\s*(?:[-~]\s*(\d+))?$/);
    if (!m) return { error: `"${tok}"를 이해하지 못했습니다. 9-12처럼 적어 주세요.` };
    const a = +m[1], b = m[2] ? +m[2] : a;
    if (!idx.has(a) || !idx.has(b)) return { error: `${!idx.has(a) ? a : b}마디는 이 악보에 없습니다.` };
    if (b < a) return { error: `${tok}: 작은 번호를 앞에 적어 주세요.` };
    for (let n = a; n <= b; n++) if (idx.has(n)) out.push(idx.get(n));
  }
  if (!out.length) return { error: '연주할 마디를 적어 주세요.' };
  return { order: out };
}

// 템포 구간 기본값: 템포 표시 + 박자표 변경 위치
export function defaultTempoRows(bars) {
  const rows = [];
  const unitFor = ts => (ts[1] === 8 && ts[0] % 3 === 0) ? 'dq' : ts[1] === 8 ? 'e' : ts[1] === 2 ? 'h' : 'q';
  // '♩=♪'처럼 박자표를 바꾸며 빠르기를 바꾼 뒤, 표시 없이 원래 박자표로 돌아오면 원래 빠르기로 (악보에 되돌림 표시를 빠뜨린 경우)
  let modFrom = null, prevTs = null;
  for (const b of bars) {
    const tsKey = b.timesig ? b.timesig.join('/') : '';
    if (modFrom && !b.tempoMarks.length && b.timesigChange && tsKey === modFrom.ts && rows[rows.length - 1] === modFrom.row) {
      const base = modFrom.base;
      rows.push({ start: b.number, unit: base.unit, bpm: base.bpm, auto: true, text: `${modFrom.ts} 복귀 (표시 없음)`, restoreOf: base.start });
      modFrom = null;
    }
    const seenMk = new Set();
    for (const mk of b.tempoMarks) {
      if (seenMk.has(mk.text)) continue;   // 총보에서 여러 오선 묶음 위에 같은 표시가 거듭 찍힌 것
      if (mk.bpm == null && !mk.eq && rows.length && rows[rows.length - 1].start === b.number && rows[rows.length - 1].bpm) continue;   // 같은 마디에서 숫자를 읽은 표시가 있으면 못 읽은 표시('♩=?')는 버린다
      seenMk.add(mk.text);
      const unit = mk.dotted ? 'dq' : ({ '1/4': 'q', '1/8': 'e', '1/2': 'h' }[mk.unit.join('/')] || 'q');
      if (rows.length && rows[rows.length - 1].start === b.number) rows.pop();
      let bpm = mk.bpm;
      if (mk.eq) {
        // 왼쪽 음표의 새 빠르기 = 오른쪽 음표의 이전 빠르기
        const prev = rows[rows.length - 1];
        const UF = { q: 1 / 4, e: 1 / 8, h: 1 / 2, dq: 3 / 8 };
        // 왼쪽 음표 단위가 표에 없는 길이(점8분 등)면 4분음표 기준으로 바꿔 적는다
        const UNIT_OF = { [1 / 4]: 'q', [3 / 8]: 'dq', [1 / 8]: 'e', [1 / 2]: 'h' };
        let u = UNIT_OF[mk.eq.left], conv = 1;
        if (!u) { u = 'q'; conv = mk.eq.left / (1 / 4); }
        if (prev && prev.bpm) bpm = Math.round(prev.bpm * UF[prev.unit] / mk.eq.right * conv);
        rows.push({ start: b.number, unit: u, bpm, auto: true, text: mk.text, eq: { left: UF[u], right: mk.eq.right / conv }, eqFrom: prev ? prev.start : null });
        // 박자표도 함께 바뀐 경우만 '돌아옴'을 지켜본다. 앞 구간이 이미 바뀐 구간이면 그 앞의 원래 빠르기를 기준으로
        // 이미 바꾼 구간에서 원래 박자표로 돌아오며 붙은 표시면 '돌아옴' 표시이므로 지켜볼 것이 없다
        if (modFrom && tsKey === modFrom.ts) modFrom = null;
        else if (b.timesigChange && prevTs && prevTs !== tsKey && prev) modFrom = { row: rows[rows.length - 1], ts: prevTs, base: prev };
        else modFrom = null;
        continue;
      }
      rows.push({ start: b.number, unit, bpm, auto: true, text: mk.text });
      modFrom = null;
    }
    prevTs = tsKey;
  }
  if (!rows.length || rows[0].start !== 1) rows.unshift({ start: 1, unit: unitFor(bars[0].timesig), bpm: null, auto: false, text: '' });
  return rows;
}

// PDF를 읽어 쪽·단·줄 구조까지 만든다 (해석은 analyzeLine에서)
export async function loadScore(pdfjs, data, onPage) {
  const doc = await pdfjs.getDocument({ data, disableFontFace: true, isEvalSupported: false }).promise;
  const pages = await extractPages(doc, pdfjs.OPS, onPage);
  const { layouts, lines } = assignLines(pages);
  const isFull = layouts.some(L => L.systems.some(g => g.length > 1));
  const title = (() => {
    let g = pages[0]?.glyphs.filter(g => !isMaestro(g) && !g.font.includes('Engraver') && g.oy < 120 && g.code > 0xAC00) || [];
    // 표지 쪽: 제목이 쪽 위쪽 1/3 안의 큰 글자로 따로 있다
    if (!g.length && pages[0]) g = pages[0].glyphs.filter(g => !isMaestro(g) && !g.font.includes('Engraver') && g.oy < pages[0].height * 0.35 && g.code > 0xAC00 && g.size >= 18);
    if (!g.length) {
      // 한글이 없는 제목(영문 등): 맨 위의 가장 큰 글자 줄
      const all = (pages[0]?.glyphs || []).filter(g => !isMusicFont(g.font) && !g.font.includes('Engraver') && g.oy < 130 && g.code >= 32);
      const big = Math.max(0, ...all.filter(g => g.code > 32).map(x => x.size));
      if (big < 16) return '';
      const y = all.find(g => g.size > big - 1 && g.code > 32).oy;
      return all.filter(x => x.size > big - 1 && Math.abs(x.oy - y) < 2).sort((a, b) => a.ox - b.ox).map(x => x.uni || String.fromCharCode(x.code)).join('').replace(/\s+/g, ' ').trim();
    }
    const big = Math.max(...g.map(x => x.size));
    const t = g.filter(x => x.size > big - 1).sort((a, b) => a.ox - b.ox);
    const seen = new Set(); let s = '';
    for (const x of t) { const k = Math.round(x.ox); if (seen.has(k)) continue; seen.add(k); if (!s.endsWith(x.uni)) s += x.uni; }
    return s;
  })();
  // 왼쪽 위 작은 글자 = 파트 이름 (예: 장구, 쇠, 모듬북)
  const partName = (() => {
    const pg = pages[0]; if (!pg) return '';
    const g = pg.glyphs.filter(g => !isMusicFont(g.font) && g.oy < 110 && g.ox < pg.width * 0.3 && g.code > 0xAC00).sort((a, b) => a.oy - b.oy || a.ox - b.ox);
    if (!g.length) return '';
    const y = g[0].oy; let s = ''; for (const x of g.filter(x => Math.abs(x.oy - y) < 2)) if (!s.endsWith(x.uni)) s += x.uni; return s;
  })();
  const musicCount = pages.reduce((a, p) => a + p.glyphs.filter(isMaestro).length, 0);
  // 글꼴 탓에 첫 글자만 남은 악기 이름(예: Ghostscript로 만든 Finale PDF의 '소', '피', '거')을 채운다
  const ONE = { '소': '소금', '피': '피리', '거': '거문고', '해': '해금', '가': '가야금', '양': '양금', '아': '아쟁', '태': '태평소' };
  const named = new Set(lines.map(l => l.name));
  lines.forEach(l => { if (l.name && ONE[l.name] && !named.has(ONE[l.name])) l.name = ONE[l.name];
    else if (l.name === '대') l.name = named.has('대금') ? '대아쟁' : '대금'; });
  lines.forEach(l => { l.label = l.name || `${l.id + 1}번째 줄`; });
  // 같은 이름이 이어진 두 줄 = 한 악기의 윗줄·아랫줄
  lines.forEach((l, i) => { const n = lines[i + 1]; if (n && l.name && n.name === l.name && !(lines[i - 1] && lines[i - 1].name === l.name)) { l.label = l.name + ' (윗줄)'; n.label = n.name + ' (아랫줄)'; } });
  // 이름 없는 오선이 이름 있는 선율 오선 바로 아래에 붙어 있으면 같은 악기의 아랫줄 (큰보표에 이름을 하나만 쓴 경우: '가야금1' 등)
  lines.forEach((l, i) => { const p = lines[i - 1]; if (!l.name && p && p.name && !/\(윗줄\)|\(아랫줄\)/.test(p.label) && l.clef === 'pitched' && p.clef === 'pitched') { p.label = p.name + ' (윗줄)'; l.label = p.name + ' (아랫줄)'; } });
  return { doc, pages, layouts, lines: isFull ? lines : [], isFull, title, partName, numPages: doc.numPages, maestroCount: musicCount };
}

// 한 줄(파트보면 null)을 해석한다
export function analyzeLine(score, line = null) {
  const res = parseScore(score.pages, line == null ? {} : { line, layouts: score.layouts });
  const bars = res.measures.length ? resolveBars(res.measures, res.systemNumbers) : [];
  const marks = bars.length ? resolveMarks(res.measures, res.marks) : { dyn: [], tempo: [] };
  // 인쇄된 마디 번호와 대조 (번호를 맞춘 뒤에도 다른 곳)
  const mismatches = res.systemNumbers.filter(([mi, printed]) => res.measures[mi] && bars[res.measures[mi]._first] && bars[res.measures[mi]._first].number !== printed);
  return { bars, marks, mismatches, scanned: res.scanned };
}

export async function analyzePdf(pdfjs, data) {
  const score = await loadScore(pdfjs, data);
  const first = score.isFull ? (score.lines.find(l => l.clef === 'perc') || score.lines[0]).id : null;
  const r = analyzeLine(score, first);
  return { ...r, partName: score.partName, title: score.title, pages: score.pages.length, numPages: score.numPages, maestroCount: score.maestroCount, lines: score.lines };
}
