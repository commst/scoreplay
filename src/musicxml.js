import { Fr, DYN_LEVEL } from './score-parser.js';
// MusicXML(.musicxml·.xml·.mxl) 읽기: 뮤즈스코어·도리코·시벨리우스·피날레에서 내보낸 악보 파일을
// PDF를 읽은 것과 같은 모양(마디 목록·이벤트·빠르기·셈여림·도돌이표·연습 번호)으로 바꾼다. 음 높이·길이가 파일에 그대로 있어 인식 오류가 없다.

// ---------- 작은 XML 해석기 (브라우저·Node 공통, 외부 도구 없이) ----------
function mxParseXml(text) {
  const root = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  const re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[\s\S]*?(?:\[[\s\S]*?\])?\s*>|<\/([^\s>]+)\s*>|<([^\s/>!?]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  const ent = s => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, e) => e === 'lt' ? '<' : e === 'gt' ? '>' : e === 'amp' ? '&' : e === 'quot' ? '"' : e === 'apos' ? "'" : String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
  let m;
  while ((m = re.exec(text))) {
    const top = stack[stack.length - 1];
    if (m[1] != null) top.text += m[1];
    else if (m[2]) { if (stack.length > 1) stack.pop(); }
    else if (m[3]) {
      const attrs = {}; const ar = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g; let a;
      while ((a = ar.exec(m[4] || ''))) attrs[a[1]] = ent(a[3] != null ? a[3] : a[4]);
      const el = { name: m[3], attrs, children: [], text: '' };
      top.children.push(el);
      if (!m[5]) stack.push(el);
    } else if (m[6] != null) top.text += ent(m[6]);
  }
  return root;
}
const mxKids = (el, name) => el ? el.children.filter(c => c.name === name) : [];
const mxKid = (el, name) => el ? el.children.find(c => c.name === name) : null;
const mxTxt = (el, name) => { const c = name ? mxKid(el, name) : el; return c ? c.text.trim() : ''; };
const mxNum = (el, name, d = null) => { const t = mxTxt(el, name); return t !== '' && !isNaN(+t) ? +t : d; };

// ---------- .mxl(압축) 풀기 ----------
async function mxInflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    try { const zlib = await import('node:zlib'); return new Uint8Array(zlib.inflateRawSync(bytes)); } catch (e) { throw new Error('이 브라우저는 압축된 MusicXML(.mxl)을 풀 수 없습니다. 압축하지 않은 .musicxml로 내보내 주세요.'); }
  }
  const ds = new DecompressionStream('deflate-raw');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
async function mxUnzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), files = {};
  let eocd = -1; for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('압축 파일(.mxl)을 열 수 없습니다.');
  const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  for (let k = 0; k < n; k++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nl));
    const lnl = dv.getUint16(lho + 26, true), lel = dv.getUint16(lho + 28, true), start = lho + 30 + lnl + lel;
    const raw = bytes.subarray(start, start + csize);
    files[name] = { method, raw };
    p += 46 + nl + el + cl;
  }
  const get = async name => { const f = files[name]; if (!f) return null; return f.method === 0 ? f.raw : await mxInflateRaw(f.raw); };
  return { names: Object.keys(files), get };
}
const mxDecodeText = bytes => {
  let enc = 'utf-8';
  if (bytes[0] === 0xff && bytes[1] === 0xfe) enc = 'utf-16le'; else if (bytes[0] === 0xfe && bytes[1] === 0xff) enc = 'utf-16be';
  return new TextDecoder(enc).decode(bytes);
};
export function isMusicXmlName(name) { return /\.(musicxml|mxl|xml)$/i.test(name || ''); }

// ---------- 읽기 ----------
const MX_STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const mxF = (n, d = 1) => new Fr(n, d);
export async function loadMusicXml(bytes, fileName = '') {
  let text;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {   // ZIP = .mxl
    const z = await mxUnzip(bytes);
    const c = await z.get('META-INF/container.xml');
    let path = null;
    if (c) { const r = mxKid(mxKid(mxParseXml(mxDecodeText(c)), 'container'), 'rootfiles'); const rf = r && mxKid(r, 'rootfile'); path = rf && rf.attrs['full-path']; }
    if (!path) path = z.names.find(n => /\.(musicxml|xml)$/i.test(n) && !/^META-INF\//.test(n));
    const b = path && await z.get(path); if (!b) throw new Error('압축 파일(.mxl) 안에서 악보를 찾지 못했습니다.');
    text = mxDecodeText(b);
  } else text = mxDecodeText(bytes);
  const doc = mxParseXml(text);
  const sp = mxKid(doc, 'score-partwise');
  if (!sp) throw new Error(mxKid(doc, 'score-timewise') ? '마디 단위(timewise) MusicXML은 아직 읽지 못합니다. 악보 프로그램에서 보통 MusicXML로 다시 내보내 주세요.' : 'MusicXML 악보가 아닙니다.');
  const title = mxTxt(mxKid(sp, 'work'), 'work-title') || mxTxt(sp, 'movement-title') || (mxKids(mxKid(sp, 'credit'), 'credit-words')[0] || { text: '' }).text.trim() || fileName.replace(/\.(musicxml|mxl|xml)$/i, '');
  const names = {};
  for (const p of mxKids(mxKid(sp, 'part-list'), 'score-part')) names[p.attrs.id] = mxTxt(p, 'part-name') || mxTxt(p, 'part-abbreviation') || mxTxt(mxKid(p, 'score-instrument'), 'instrument-name') || p.attrs.id;
  const parts = mxKids(sp, 'part').map(p => mxReadPart(p, names[p.attrs.id] || p.attrs.id));
  // 모든 파트의 마디 수를 같게 (짧은 파트는 쉬는 마디로 채움)
  const n = Math.max(0, ...parts.map(p => p.measures.length));
  for (const p of parts) while (p.measures.length < n) { const last = p.measures[p.measures.length - 1]; p.measures.push({ ...mxBlankMeasure(last ? last.timesig : [4, 4]), number: p.measures.length + 1 }); }
  // 빠르기·빠르기 말(rit. 등)·연습 번호·도돌이 지시는 보통 맨 위 파트에만 적는다 → 모든 줄에 함께 쓴다
  const glob = Array.from({ length: n }, (_, i) => {
    const withT = parts.find(p => p.measures[i] && p.measures[i].tempo.length);
    const words = []; const seenW = new Set();
    for (const p of parts) for (const w of (p.measures[i] ? p.measures[i].words : [])) if (/^(rit|rall|allarg|slent|accel|string|a tempo|in tempo|tempo i|tempo primo)|점점\s*(느리게|빠르게)|D\.\s?S|D\.\s?C|dal\s*segno|da\s*capo|^fine|to\s*coda/i.test(w.text) && !seenW.has(w.text)) { seenW.add(w.text); words.push(w); }
    const reh = [...new Set(parts.flatMap(p => p.measures[i] ? p.measures[i].rehearsal : []))];
    const flags = {}; for (const p of parts) { const f = p.measures[i] && p.measures[i].flags; if (f) for (const k of ['segno', 'coda', 'ds', 'dc', 'fine', 'toCoda', 'repeatStart', 'repeatEnd']) if (f[k]) flags[k] = true; if (f && f.volta && !flags.volta) flags.volta = f.volta; }
    return { tempo: withT ? withT.measures[i].tempo : [], words, rehearsal: reh, flags };
  });
  // 줄: 파트의 오선마다 하나 (큰보표 = 윗줄·아랫줄)
  const lines = [];
  parts.forEach((p, pi) => {
    for (let s = 1; s <= p.staves; s++) {
      const label = p.staves > 1 ? `${p.name} (${p.staves === 2 ? (s === 1 ? '윗줄' : '아랫줄') : s + '번째 줄'})` : p.name;
      lines.push({ id: lines.length, name: p.name, label, clef: p.perc ? 'perc' : 'pitched', oneLine: false, first: null, count: n, part: pi, staff: s });
    }
  });
  if (!lines.length) throw new Error('MusicXML에 파트가 없습니다.');
  const sc = { xml: true, xmlParts: parts, xmlGlobal: glob, title, partName: lines.length === 1 ? lines[0].name : '', lines: lines.length > 1 ? lines : [], xmlLines: lines, isFull: lines.length > 1,
    numPages: 0, maestroCount: 1, pages: [], layouts: [], doc: null, fileName };
  return sc;
}
function mxBlankMeasure(ts) { return { timesig: ts, len: mxF(ts[0], ts[1]), notes: [], dyn: [], tempo: [], words: [], rehearsal: [], flags: {} }; }

function mxReadPart(p, name) {
  let div = 1, ts = [4, 4], staves = 1, transpose = 0, perc = false;
  const measures = [];
  for (const me of mxKids(p, 'measure')) {
    const at = mxKid(me, 'attributes');
    const M = { ...mxBlankMeasure(ts), number: measures.length + 1, implicit: me.attrs.implicit === 'yes' };
    let cur = 0, maxT = 0, lastStart = 0; const graceBuf = {};
    let tsChanged = false;
    const step = el => {
      if (el.name === 'attributes') {
        div = mxNum(el, 'divisions', div);
        const t = mxKid(el, 'time'); if (t && mxNum(t, 'beats') && mxNum(t, 'beat-type')) { const nts = [parseInt(mxTxt(t, 'beats')) || 4, mxNum(t, 'beat-type')]; if (nts.join('/') !== ts.join('/') || !measures.length) tsChanged = true; ts = nts; }
        staves = Math.max(staves, mxNum(el, 'staves', 1));
        const tr = mxKid(el, 'transpose'); if (tr) transpose = mxNum(tr, 'chromatic', 0) + 12 * mxNum(tr, 'octave-change', 0);
        for (const c of mxKids(el, 'clef')) if (mxTxt(c, 'sign') === 'percussion') perc = true;
      } else if (el.name === 'backup') cur -= mxNum(el, 'duration', 0);
      else if (el.name === 'forward') { cur += mxNum(el, 'duration', 0); maxT = Math.max(maxT, cur); }
      else if (el.name === 'note') {
        const chord = !!mxKid(el, 'chord'), grace = !!mxKid(el, 'grace'), rest = !!mxKid(el, 'rest');
        const d = grace ? 0 : mxNum(el, 'duration', 0);
        const start = chord ? lastStart : cur;
        const voice = mxTxt(el, 'voice') || '1', staff = mxNum(el, 'staff', 1);
        let midi = null;
        const pt = mxKid(el, 'pitch'), un = mxKid(el, 'unpitched');
        if (pt) midi = (mxNum(pt, 'octave', 4) + 1) * 12 + MX_STEP[mxTxt(pt, 'step')] + mxNum(pt, 'alter', 0) + transpose;
        if (un) perc = true;
        const disp = un ? (mxNum(un, 'display-octave', 4) + 1) * 7 + 'CDEFGAB'.indexOf(mxTxt(un, 'display-step')) : null;   // 타악 음표 높이(성부 나누기용)
        const nots = mxKids(el, 'notations');
        const has = (grp, n) => nots.some(x => mxKids(x, grp).some(g => mxKid(g, n)));
        const tieStop = mxKids(el, 'tie').some(t => t.attrs.type === 'stop') || nots.some(x => mxKids(x, 'tied').some(t => t.attrs.type === 'stop'));
        if (grace) { if (midi != null && !rest) (graceBuf[voice + '|' + staff] = graceBuf[voice + '|' + staff] || []).push(Math.round(midi)); }
        else if (!rest) M.notes.push({ t: start, d, midi: midi != null ? Math.round(midi) : null, voice, staff, stem: mxTxt(el, 'stem'), disp, chord,
          accent: has('articulations', 'accent') || has('articulations', 'strong-accent'), stacc: has('articulations', 'staccato') || has('articulations', 'staccatissimo'),
          ten: has('articulations', 'tenuto'), trill: has('ornaments', 'trill-mark') || has('ornaments', 'wavy-line'), trem: has('ornaments', 'tremolo'),
          xh: mxTxt(el, 'notehead') === 'x', tieStop, graces: graceBuf[voice + '|' + staff] || null });
        if (!grace && !rest && graceBuf[voice + '|' + staff]) delete graceBuf[voice + '|' + staff];
        if (nots.some(x => mxKid(x, 'fermata')) || mxKid(el, 'fermata')) M.flags.fermata = true;
        if (!chord && !grace) { lastStart = cur; cur += d; maxT = Math.max(maxT, cur); }
      } else if (el.name === 'direction') {
        const off = cur + mxNum(el, 'offset', 0), staff = mxNum(el, 'staff', 1);
        for (const dt of mxKids(el, 'direction-type')) {
          for (const dy of mxKids(dt, 'dynamics')) for (const c of dy.children) if (DYN_LEVEL[c.name] != null || /^(sfz|sf|fz|sffz|fp|sfp|rfz)$/.test(c.name)) M.dyn.push({ t: off, staff, label: c.name });
          const w = mxKid(dt, 'wedge'); if (w) M.dyn.push({ t: off, staff, wedge: w.attrs.type });
          const mt = mxKid(dt, 'metronome');
          if (mt) { const bu = mxTxt(mt, 'beat-unit'), pm = parseFloat(mxTxt(mt, 'per-minute')); if (pm > 0) M.tempo.push({ t: off, unit: bu, dotted: !!mxKid(mt, 'beat-unit-dot'), bpm: pm }); }
          for (const wd of mxKids(dt, 'words')) M.words.push({ t: off, text: wd.text.trim() });
          for (const r of mxKids(dt, 'rehearsal')) M.rehearsal.push(r.text.trim());
          if (mxKid(dt, 'segno')) M.flags.segno = true;
          if (mxKid(dt, 'coda')) M.flags.coda = true;
        }
        const snd = mxKid(el, 'sound');
        if (snd) { if (snd.attrs.tempo && !mxKids(el, 'direction-type').some(dt => mxKid(dt, 'metronome'))) M.tempo.push({ t: off, unit: 'quarter', bpm: +snd.attrs.tempo, fromSound: true });
          if (snd.attrs.dalsegno) M.flags.ds = true; if (snd.attrs.dacapo === 'yes') M.flags.dc = true; if (snd.attrs.fine) M.flags.fine = true; if (snd.attrs.tocoda) M.flags.toCoda = true; }
      } else if (el.name === 'sound') {
        if (el.attrs.tempo) M.tempo.push({ t: cur, unit: 'quarter', bpm: +el.attrs.tempo, fromSound: true });
      } else if (el.name === 'barline') {
        const rp = mxKid(el, 'repeat'); if (rp) { if (rp.attrs.direction === 'forward') M.flags.repeatStart = true; else M.flags.repeatEnd = true; }
        const en = mxKid(el, 'ending'); if (en && en.attrs.type === 'start') M.flags.volta = (en.attrs.number || '1').split(/[,\s]+/).map(Number).filter(x => x > 0);
        if (mxKid(el, 'segno')) M.flags.segno = true; if (mxKid(el, 'coda')) M.flags.coda = true;
      }
    };
    for (const el of me.children) step(el);
    M.div = div; M.ts = ts.slice(); M.tsChanged = tsChanged;
    const tsLen = mxF(ts[0], ts[1]);
    // 못갖춘마디(implicit) 등 박자표보다 짧은 마디는 실제 길이로
    const contentLen = div > 0 ? mxF(Math.round(maxT), div * 4) : tsLen;
    M.len = M.implicit && contentLen.v > 0 && contentLen.lt(tsLen) ? contentLen : tsLen;
    M.timesig = ts.slice();
    measures.push(M);
  }
  return { name, measures, staves, perc };
}

// 줄 하나를 마디 목록으로 (PDF 해석 결과와 같은 모양)
export function analyzeXmlLine(sc, line = null) {
  const L = sc.xmlLines[line == null ? 0 : line]; const P = sc.xmlParts[L.part];
  const bars = [], dyn = [], tempo = [], rehearsal = [];
  let prevTs = null;
  // 성부 나누기: 오선 안에서 먼저 나온 성부(보통 1·5) = 윗성부, 나머지 = 아랫성부. 타악은 줄기 방향(위 = 윗성부), 없으면 높이
  const voiceOrder = [];
  P.measures.forEach((M, bi) => {
    const W = M.div * 4, Gm = (sc.xmlGlobal && sc.xmlGlobal[bi]) || { tempo: [], words: [], rehearsal: [], flags: {} };
    const ev = [];
    for (const n of M.notes) {
      if (n.staff !== L.staff) continue;
      if (!voiceOrder.includes(n.voice)) voiceOrder.push(n.voice);
      let v = voiceOrder.indexOf(n.voice) === 0 ? 'R' : 'L';
      if (P.perc) v = n.stem === 'down' ? 'L' : n.stem === 'up' ? 'R' : (n.disp != null && n.disp < 35 ? 'L' : 'R');   // 35 = B4
      const t = mxF(Math.round(n.t), W), d = mxF(Math.max(1, Math.round(n.d)), W);
      if (n.chord && n.midi != null) { const host = ev.find(e => e.voice === v && e.t.eq(t) && e.midis && !e.tie === !n.tieStop); if (host) { if (!host.midis.includes(n.midi)) host.midis.push(n.midi); continue; } }
      if (n.chord && n.midi == null && ev.some(e => e.voice === v && e.t.eq(t))) continue;
      const e = { voice: v, t, dur: d, accent: n.accent, grace: n.graces ? n.graces.length : 0, roll: n.trem || (P.perc && n.trill) };
      if (n.midi != null && !P.perc) { e.midis = [n.midi]; if (n.graces) e.graceMidis = n.graces; if (n.trill) { e.trill = true; e.trillInt = 2; } }
      if (n.tieStop && n.midi != null) e.tie = true;
      if (n.stacc) e.stacc = true; if (n.ten) e.ten = true; if (n.xh) e.xh = true;
      if (n.disp != null) e.pos = 35 - n.disp;
      ev.push(e);
    }
    ev.sort((a, b) => a.t.v - b.t.v);
    const tsKey = M.timesig.join('/');
    const tempoMarks = [];
    const seenT = new Set();
    const TM = Gm.tempo.length ? Gm.tempo : M.tempo;
    for (const tm of TM.filter(x => !x.fromSound || !TM.some(y => !y.fromSound))) {
      const UNIT = { whole: [1, 1], half: [1, 2], quarter: [1, 4], eighth: [1, 8], '16th': [1, 16] }[tm.unit] || [1, 4];
      const k = tm.bpm + tm.unit + tm.dotted; if (seenT.has(k)) continue; seenT.add(k);
      const sym = UNIT[1] === 8 ? '♪' : UNIT[1] === 2 ? '2분' : '♩';
      tempoMarks.push({ unit: UNIT, dotted: !!tm.dotted, bpm: Math.round(tm.bpm), text: `${sym}${tm.dotted ? '.' : ''}=${Math.round(tm.bpm)}` });
    }
    const labels = [];
    const f = { ...M.flags, ...Gm.flags };
    const wordsAll = [...Gm.words, ...M.words.filter(w => !Gm.words.some(g => g.text === w.text))];
    for (const w of wordsAll) {
      const t = w.text, p0 = bi + (W ? w.t / (M.len.v * W) : 0);
      if (/^(rit|rall|allarg|slent)|점점\s*느리게/i.test(t)) { tempo.push({ kind: 'rit', p0, p1: p0 + 2, dashed: false }); labels.push('rit.'); }
      else if (/^(accel|string)|점점\s*빠르게/i.test(t)) { tempo.push({ kind: 'accel', p0, p1: p0 + 2, dashed: false }); labels.push('accel.'); }
      else if (/^(a tempo|in tempo|tempo i\b|tempo primo)/i.test(t)) { tempo.push({ kind: 'atempo', p0, p1: p0 }); labels.push('a tempo'); }
      else if (/^cresc|점점\s*세게/i.test(t)) dyn.push({ kind: 'ramp', p0, p1: p0 + 2, dir: 1, dashed: false });
      else if (/^(dim|decresc)|점점\s*여리게/i.test(t)) dyn.push({ kind: 'ramp', p0, p1: p0 + 2, dir: -1, dashed: false });
      else if (/D\.\s?S\.?|dal\s*segno/i.test(t)) f.ds = true;
      else if (/D\.\s?C\.?|da\s*capo/i.test(t)) f.dc = true;
      else if (/^fine\.?$/i.test(t)) f.fine = true;
      else if (/to\s*coda/i.test(t)) f.toCoda = true;
    }
    for (const r of (Gm.rehearsal.length ? Gm.rehearsal : M.rehearsal)) if (r && r.length <= 6) rehearsal.push({ idx: bi, number: bi + 1, text: r });
    // 셈여림은 이 줄 오선 것 (오선 번호를 안 적은 파일은 모두)
    let wedge = null;
    for (const dmk of M.dyn) {
      if (dmk.staff !== L.staff && P.staves > 1) continue;
      const p0 = bi + (W ? dmk.t / (M.len.v * W) : 0);
      if (dmk.label) { const lv = DYN_LEVEL[dmk.label]; if (lv != null) dyn.push({ kind: 'mark', p0, level: lv, label: dmk.label }); }
      else if (dmk.wedge === 'crescendo' || dmk.wedge === 'diminuendo') wedge = { kind: 'ramp', p0, p1: p0 + 1, dir: dmk.wedge === 'crescendo' ? 1 : -1, dashed: true, open: true };
      if (wedge) dyn.push(wedge), wedge = null;
      if (dmk.wedge === 'stop') { const w = [...dyn].reverse().find(x => x.kind === 'ramp' && x.open); if (w) { w.p1 = Math.max(w.p0 + 0.1, p0); delete w.open; } }
    }
    if (f.segno) labels.push('Segno'); if (f.ds) labels.push('D.S.'); if (f.dc) labels.push('D.C.'); if (f.fine) labels.push('Fine'); if (f.toCoda) labels.push('To Coda');
    if (f.volta) labels.push(f.volta.join(',') + '.');
    bars.push({ segno: !!f.segno, codaStart: !!f.coda && !f.toCoda, volta: f.volta || null, ds: !!f.ds, dc: !!f.dc, fine: !!f.fine, toCoda: !!f.toCoda, labels,
      number: bi + 1, timesig: M.timesig.slice(), barLen: M.len, src: bi, repeatStart: !!f.repeatStart, repeatEnd: !!f.repeatEnd, sectionStart: false, fermata: !!f.fermata,
      note: ev.length ? '' : '쉼', kind: ev.length ? 'normal' : 'rest', warnings: [], tempoMarks, timesigChange: prevTs != null && prevTs !== tsKey, tsInferred: false, events: ev });
    prevTs = tsKey;
  });
  // 셈여림 꺾쇠: 끝(stop)이 없으면 다음 셈여림까지(최대 2마디)
  for (const d of dyn) if (d.kind === 'ramp') { delete d.open; const t = dyn.find(x => x.kind === 'mark' && x.p0 > d.p0 + 0.01 && x.p0 <= d.p1 + 1); d.target = t ? t.level : null; }
  dyn.sort((a, b) => a.p0 - b.p0); tempo.sort((a, b) => a.p0 - b.p0);
  return { bars, marks: { dyn, tempo }, mismatches: [], scanned: false, geo: null, rehearsal };
}
