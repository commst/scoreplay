// 소리 합성과 렌더링. DOM 없이 동작한다 (Node에서도 시험 가능).
export const SR = 32000;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }
function biquad(x, type, f, Q = 0.707) {
  const w = 2 * Math.PI * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; } // bandpass
  a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function noise(n, seed) { const r = rng(seed); const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = r(); return x; }
function band(n, lo, hi, seed) { let x = noise(n, seed); x = biquad(biquad(x, 'hp', lo), 'hp', lo); x = biquad(biquad(x, 'lp', hi), 'lp', hi); return norm(x); }
function norm(x) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] /= m; return x; }
const env = (t, atk, dec) => (atk > 0 && t < atk ? t / atk : 1) * Math.exp(-t / dec);

// 북을 "때리는" 소리로: 스피커가 못 내는 아주 낮은 소리(70Hz 아래)는 줄여 자리(최대 크기)를 비우고,
// 가죽 울림(150Hz~1.5kHz)을 키우고, 채가 닿는 순간의 딱 소리(1.5~5kHz, 몇 ms)를 더한다. 최댓값 1로 맞춤
function bukPunch(y, mid, click, seed, hp = 70) {
  let z = biquad(biquad(y, 'hp', hp), 'hp', hp);
  let m = biquad(biquad(y, 'hp', 150), 'hp', 150); m = biquad(m, 'lp', 1500);
  let pk = 0; for (const v of y) pk = Math.max(pk, Math.abs(v));
  let on = 0; while (on < y.length && Math.abs(y[on]) < pk * 0.1) on++;
  const cn = Math.round(0.03 * SR), nz = band(cn, 1500, 5000, seed);
  const out = new Float32Array(y.length);
  for (let i = 0; i < y.length; i++) { const j = i - on; out[i] = z[i] + mid * m[i] + (j >= 0 && j < cn ? click * pk * nz[j] * Math.exp(-j / SR / 0.006) : 0); }
  return norm(out);
}
// 북 울림: 가죽이 계속 떠는 소리(그 북의 음높이로 서서히 줄어드는 소리)와 북통·방에서 되울리는 짧은 잔향을 더한다
function bukRing(y, f, tau, amt, wet, rt) {
  let pk = 0; for (const v of y) pk = Math.max(pk, Math.abs(v));
  let on = 0; while (on < y.length && Math.abs(y[on]) < pk * 0.1) on++;
  const n = y.length + Math.round(rt * SR), z = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = (i - on) / SR; z[i] = (y[i] || 0) + (t >= 0 ? amt * pk * Math.sin(2 * Math.PI * f * t) * Math.min(1, t / 0.006) * Math.exp(-t / tau) : 0); }
  // 짧은 잔향 (빗살 4개 + 올패스 2개)
  const w = new Float32Array(n);
  for (const ms of [29.7, 37.1, 41.1, 43.7]) { const d = Math.round(ms / 1000 * SR), g = Math.pow(10, -3 * (ms / 1000) / rt); const c = new Float32Array(n); for (let i = 0; i < n; i++) c[i] = z[i] + (i >= d ? g * c[i - d] : 0); for (let i = 0; i < n; i++) w[i] += c[i] / 4; }
  let r = w; for (const [ms, g] of [[5, 0.7], [1.7, 0.7]]) { const d = Math.round(ms / 1000 * SR), o = new Float32Array(n); for (let i = 0; i < n; i++) { const xd = i >= d ? r[i - d] : 0, yd = i >= d ? o[i - d] : 0; o[i] = -g * r[i] + xd + g * yd; } r = o; }
  r = biquad(r, 'lp', 3000);
  for (let i = 0; i < n; i++) z[i] = z[i] * (1 - wet) + r[i] * wet;
  return norm(z);
}
function build(sec, fn) { const n = Math.round(sec * SR); const y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = fn(i / SR, i); return norm(y); }

export function makeSounds() {
  const S = {};
  { // 따: 장구 채편
    const n = Math.round(0.25 * SR), crack = band(n, 1500, 7000, 11), body = band(n, 300, 1200, 12);
    S['따'] = build(0.25, (t, i) => 0.55 * Math.sin(2 * Math.PI * 410 * t) * env(t, 0.0005, 0.045) + 0.3 * Math.sin(2 * Math.PI * 780 * t) * env(t, 0.0005, 0.025)
      + 0.9 * crack[i] * env(t, 0.0002, 0.012) + 0.35 * body[i] * env(t, 0.001, 0.05));
  }
  { // 궁: 장구 북편
    const n = Math.round(0.6 * SR), nz = band(n, 80, 600, 13); let ph = 0;
    S['궁'] = build(0.6, (t, i) => { const f = 75 + 55 * Math.exp(-t / 0.04); ph += 2 * Math.PI * f / SR;
      return Math.sin(ph) * env(t, 0.002, 0.22) + 0.3 * Math.sin(2 * ph) * env(t, 0.002, 0.08) + 0.25 * nz[i] * env(t, 0.001, 0.03); });
  }
  { const a = S['따'], b = S['궁']; const y = new Float32Array(Math.max(a.length, b.length)); for (let i = 0; i < y.length; i++) y[i] = (a[i] || 0) * 0.8 + (b[i] || 0); S['덩'] = norm(y); }
  { // 북
    // 예전 북은 소리가 거의 60Hz 아래에만 있어 노트북·휴대폰 스피커에서 잘 안 들렸다 → 가죽 울림(150~400Hz)과 채 닿는 소리를 넣음
    const n = Math.round(0.9 * SR), nz = band(n, 60, 900, 14), sk = band(n, 180, 2200, 24); let ph = 0;
    S['북'] = build(0.9, (t, i) => { const f = 72 + 50 * Math.exp(-t / 0.045); ph += 2 * Math.PI * f / SR;
      return 0.8 * Math.sin(ph) * env(t, 0.003, 0.38) + 0.85 * Math.sin(1.59 * ph) * env(t, 0.002, 0.18) + 0.5 * Math.sin(2.14 * ph) * env(t, 0.002, 0.1)
        + 0.25 * Math.sin(2.65 * ph) * env(t, 0.002, 0.06) + 0.35 * nz[i] * env(t, 0.001, 0.04) + 0.9 * sk[i] * env(t, 0.0005, 0.035); });
    S['북'] = bukRing(bukPunch(S['북'], 1.5, BUK_CLICK, 25), 120, 0.25, 0.25, 0.3, 0.8);
  }
  { // 북 테 (나무 몸통)
    const n = Math.round(0.12 * SR), nz = band(n, 2000, 5000, 15);
    S['북테'] = build(0.12, (t, i) => 0.6 * Math.sin(2 * Math.PI * 920 * t) * env(t, 0.0003, 0.02) + 0.35 * Math.sin(2 * Math.PI * 1930 * t) * env(t, 0.0003, 0.012) + 0.5 * nz[i] * env(t, 0.0002, 0.008));
  }
  { // 꽹과리
    const n = Math.round(0.6 * SR), nz = band(n, 3000, 9000, 16);
    const parts = [[1180, 1, 0.32], [1745, 0.8, 0.25], [2310, 0.7, 0.2], [2890, 0.55, 0.18], [3620, 0.45, 0.14], [4480, 0.35, 0.1]];
    S['꽹과리'] = build(0.6, (t, i) => parts.reduce((s, [f, a, d]) => s + a * Math.sin(2 * Math.PI * f * t) * env(t, 0.0005, d), 0) + 0.6 * nz[i] * env(t, 0.0002, 0.03));
  }
  { // 징
    const parts = [[98, 1, 3.2], [196.5, 0.5, 2.4], [262, 0.35, 2.0], [330, 0.25, 1.6], [415, 0.15, 1.2]];
    S['징'] = build(4.0, t => { const g = 1 + 0.02 * (1 - Math.exp(-t / 0.6));
      return parts.reduce((s, [f, a, d]) => s + a * Math.sin(2 * Math.PI * f * g * t) * env(t, 0.015, d), 0); });
  }
  { // 클릭
    // 메트로놈·카운트인: 예전 소리(2kHz 사인 10ms)는 너무 짧고, 국악관현악 소리가 가장 많이 몰린 대역(1~3kHz)과 겹쳐 묻혔다.
    // 프론티어 모든 줄 소리를 재 보면 4~6kHz는 2kHz 근처보다 Hz당 11~15dB 비어 있다 → 그 대역의 짧고 날카로운 '틱'(마디 첫 박은 더 높게)
    // + 아주 짧은 5~9kHz 잡음 머리. 크기는 음악과 따로 맞춘다(앱에서 음악 크기 맞추기 뒤에 더함)
    const nz = band(Math.round(0.06 * SR), 5000, 9000, 31);
    const clk = (f, d) => build(0.06, (t, i) => Math.sin(2 * Math.PI * f * t) * env(t, 0.0002, d) + 0.5 * Math.sin(2 * Math.PI * f * 1.52 * t) * env(t, 0.0002, d * 0.6)
      + 0.7 * nz[i] * env(t, 0.0001, 0.003));
    S['클릭'] = clk(4000, 0.022);
    S['클릭강'] = clk(5000, 0.028);   // 마디 첫 박은 높고 조금 길게
  }
  { // 쉬는 마디 박 짚기: 나무 막대(우드블록) 소리와 셰이커 소리. 악기·클릭과 구분되도록
    const wood = (f, n) => { const nz = band(Math.round(0.09 * SR), 600, 3000, n);
      return build(0.09, (t, i) => Math.sin(2 * Math.PI * f * t) * env(t, 0.0003, 0.022) + 0.45 * Math.sin(2 * Math.PI * f * 2.76 * t) * env(t, 0.0003, 0.01) + 0.3 * nz[i] * env(t, 0.0002, 0.006)); };
    S['쉼박강'] = wood(1180, 21);
    S['쉼박'] = wood(860, 22);
    const sh = band(Math.round(0.07 * SR), 4500, 11000, 23);
    S['쉼분박'] = build(0.07, (t, i) => sh[i] * (t < 0.004 ? t / 0.004 : 1) * Math.exp(-t / 0.018));
  }
  return S;
}

// 장구(따·궁·덩)와 북은 짧게 치는 소리라 같은 100%에서도 길게 울리는 선율 악기보다 작게 들린다 → 크게 (장구 약 +6dB, 북 약 +3dB, 10월 31일 북을 장구 덩만큼 더 키움)
const JG = 2.0, BK = 1.4;
// 꽹과리도 같은 100%에서 장구보다 10dB쯤 작게 들려 약 +9dB
const KG = 2.8;
const BUK_MID = 4, BUK_CLICK = 0.6;
const GAIN = { '따': JG, '궁': 1.15 * JG, '북': 2.4 * BK, '북녹음': 2.8 * BK, '북짧게': 1.6 * BK, '바라': 0.72, '베이스드럼': 1.0, '하이햇': 0.75, '심벌': 0.8, '스네어': 0.85, '덩': 1.1 * JG, '꽹과리': 0.8 * KG, '꽹과리길게': 0.8 * KG, '꽹과리막음': 0.85 * KG,
  // 11월 1일 넣은 녹음: 녹음 크기가 제각각이라 들리는 크기로 맞춤 (봉고 ≈ 장구 따, 탬버린·트라이앵글 ≈ 심벌·바라, 카바사는 조금 작게)
  '봉고': 1.6, '봉고높게': 1.6, '팀파니': 1.3, '팀파니높게': 1.3, '카바사': 2.25, '탬버린': 1.5, '트라이앵글': 0.85, '윈드차임': 0.5 };
// 셈여림 크기 (mf = 0.75 기준). p는 마디 번호 축 위치(0부터)
export function dynLevelAt(items, p) {
  let level = 0.75;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.p0 > p) break;
    if (it.kind === 'mark') { level = it.level; continue; }
    // 그린 꺾쇠(hp)는 셈여림 글자가 없어도 귀에 들리게 0.25(약 4dB), 글자 cresc.·dim.은 0.15
    // 작아질 때(>·dim.)는 더 뚜렷하게: 그 순간 크기의 25%까지(약 −12dB, 글자 dim.은 45%) — 같은 양만 빼면 거의 들리지 않았음(연변목가 양금 트레몰로)
    const amt = it.hp ? 0.25 : 0.15;
    const target = it.target != null ? it.target : it.dir < 0 ? Math.max(0.08, level * (it.hp ? 0.25 : 0.45)) : Math.max(0.2, Math.min(1, level + amt));
    // 다음 셈여림(꺾쇠·글자)이 이 꺾쇠가 끝나기 전에 시작하면 거기서 끝낸다(< 뒤 바로 > 가 겹쳐 > 가 들리지 않던 것 — 연변목가 양금 1마디)
    let p1 = it.p1;
    for (let j = i + 1; j < items.length; j++) if (items[j].p0 > it.p0 + 1e-6) { p1 = Math.min(p1, items[j].p0); break; }
    if (p < p1) return level + (target - level) * (p - it.p0) / Math.max(1e-6, p1 - it.p0);
    level = target;
  }
  return level;
}

// rit./accel. 빠르기 배율. 템포 표의 새 구간이 시작되면 원래 빠르기로 돌아간다
export function tempoFactorAt(items, p, resets = [], ritF = 0.8, accF = 1.2) {
  let rs = 0;
  for (const r of resets) if (r <= p && r > rs) rs = r;
  let f = 1;
  for (const it of items) {
    if (it.p0 > p) break;
    if (it.p0 < rs) continue;
    if (it.kind === 'atempo') { f = 1; continue; }
    const target = it.f > 0 ? it.f : it.kind === 'rit' ? ritF : accF;   // f: 그 표시만의 끝 빠르기(직접 넣은 값)
    if (p < it.p1) return f + (target - f) * (p - it.p0) / Math.max(1e-6, it.p1 - it.p0);
    f = target;
  }
  return f;
}

// 악센트(>) 세기: 보통 음보다 타악 약 +5dB(0.68 → 1.2), 선율 약 +4dB(0.75 → 1.2). 예전에는 타악 +3dB, 선율 +2dB라 잘 드러나지 않았음
const ACC_PERC = 1.2, ACC_MEL = 1.2;
// 사람처럼 연주: 음마다 정해진(같은 악보면 늘 같은) 작은 흔들림. -1~1 두 개
function humanRnd(bi, t, line, voice) {
  let h = 2166136261 ^ (bi * 1000003) ^ Math.round(t * 960);
  const str = String(line) + (voice || '');
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
  const a = ((h >>> 0) % 10007) / 10006 * 2 - 1, b = (((h >>> 0) >>> 12) % 9973) / 9972 * 2 - 1;
  return [a, b];
}
export const UNIT_FRAC = { q: 1 / 4, dq: 3 / 8, e: 1 / 8, h: 1 / 2 };
export const DEFAULT_BPM = 80;

// bars: 해석 결과, order: 연주 순서 (bars 인덱스), opts: {tempoRows, speed, sounds:{R,L}, countIn, metronome, custom}
export function renderPlan(bars, order, opts) {
  const rows = [...opts.tempoRows].sort((a, b) => a.start - b.start);
  const rowFor = n => { let r = rows[0]; for (const x of rows) if (x.start <= n) r = x; return r; };
  const spw = n => { const r = rowFor(n); const bpm = r && r.bpm > 0 ? r.bpm : DEFAULT_BPM; return 60 / bpm / UNIT_FRAC[r ? r.unit : 'q'] / opts.speed; };
  const hits = []; // [time, soundKey, gain]
  const notes = []; // 선율 악기 음 (melody-engine.mixNotes로 합성)
  const barTimes = [];
  let cur = 0.3;
  if (opts.countIn && order.length) {
    const b = bars[order[0]], s = spw(b.number), unit = UNIT_FRAC[rowFor(b.number).unit];
    const beats = Math.max(1, Math.round(b.barLen.v / unit));
    for (let k = 0; k < beats; k++) hits.push([cur + k * unit * s, k === 0 ? '클릭강' : '클릭', 0.9]);
    cur += beats * unit * s;
  }
  const t0 = cur;
  const tempoItems = opts.tempo && opts.tempo.length ? opts.tempo : null;
  const resets = rows.map(r => { const i = bars.findIndex(b => b.number >= r.start); return i < 0 ? bars.length : i; });
  const ritF = opts.ritF || 0.8, accF = opts.accF || 1.2;
  // 마디 안 시간: rit./accel.이 있으면 마디를 잘게 나눠 적분
  const clock = (bi, L, s) => {
    if (!tempoItems) return w => w * s;
    const N = 32, cum = new Float64Array(N + 1);
    for (let k = 0; k < N; k++) cum[k + 1] = cum[k] + (L / N) * s / tempoFactorAt(tempoItems, bi + (k + 0.5) / N, resets, ritF, accF);
    return w => { const x = Math.max(0, Math.min(N, w / L * N)), k = Math.min(N - 1, Math.floor(x)); return cum[k] + (cum[k + 1] - cum[k]) * (x - k); };
  };
  const dynAt = p => opts.dyn ? dynLevelAt(opts.dyn, p) / 0.75 : 1;
  // 모듬북처럼 두 성부 모두 북 소리인 줄: 성부보다 오선 위 자리(ev.pos)로 북을 고른다 (자리마다 다른 북)
  //  가장 많이 친 자리 = 기본 북(아랫성부 소리), 그보다 위로 갈수록 높은 북(2칸 위부터 윗성부 소리), 아래로 가면 더 낮게
  const BUKS = new Set(['북', '북녹음', '북짧게']), bukRef = {};
  const keyOf = (line, v) => (line != null ? opts.sounds[line + ':' + v] : undefined) ?? opts.sounds[v];
  for (const b of bars) for (const e of b.events) {
    if (e.line == null || e.pos == null || e.tie || (opts.melodic && opts.melodic[e.line] && e.midis)) continue;
    if (!(BUKS.has(keyOf(e.line, 'R')) && BUKS.has(keyOf(e.line, 'L')))) continue;
    const c = bukRef[e.line] || (bukRef[e.line] = {}); c[e.pos] = (c[e.pos] || 0) + 1;
  }
  for (const l of Object.keys(bukRef)) { const c = bukRef[l]; bukRef[l] = +Object.keys(c).reduce((a, b) => c[b] > c[a] ? b : a); }
  // 꽹과리 막음: 꽹과리 소리로 치는 줄의 X 머리 음표는 성부와 상관없이 막음 소리(사용자 규칙, 143번).
  // 예전에는 윗성부의 X만, 그리고 윗성부를 거의 다 X로 적은 악보는 막음으로 치지 않았다 → 연변목가 꽹과리 73마디(아랫성부 X)가 열린 소리로 났음
  let hum = 12345;   // 사람이 치는 것처럼 세기·때를 조금씩 흔든다 (늘 같은 결과가 나오게 정해진 난수)
  const rnd = () => { hum = (hum * 1664525 + 1013904223) >>> 0; return hum / 4294967296 * 2 - 1; };
  // 쉬는 마디: 칠 음이 없는 마디(롤이 이어지는 마디는 제외). 연주 순서에서 연속된 묶음마다 몇 번째인지
  const isRest = bi => !bars[bi].events.length && bars[bi].kind !== 'rollext' && bars[bi].note !== '롤 연장';
  const restInfo = order.map(() => null);
  for (let k = 0; k < order.length;) {
    if (!isRest(order[k])) { k++; continue; }
    let j = k; while (j < order.length && isRest(order[j])) j++;
    for (let q = k; q < j; q++) restInfo[q] = { k: q - k + 1, n: j - k };
    k = j;
  }
  order.forEach((bi, k) => {
    const b = bars[bi], s = spw(b.number), L = b.barLen.v, clk0 = clock(bi, L, s);
    // 마디 가운데 음의 늘임표(fermataT): 그 음을 늘이고 뒤 음들을 그만큼 늦춘다 (마디 끝 늘임표는 아래에서 따로)
    const fbeat = opts.fermata == null ? 2 : +opts.fermata;
    const fIn = b.fermata && b.fermataT && b.fermataT.length && fbeat > 0 ? b.fermataT.map(t => t.v).filter(t => t < L - 1e-9) : [];
    const fExtra = fbeat * UNIT_FRAC[rowFor(b.number).unit] * s;
    const clk = fIn.length ? w => clk0(w) + fExtra * fIn.filter(t => t < w - 1e-9).length : clk0;
    barTimes.push({ t: cur - t0, abs: cur, idx: bi, number: b.number, rest: restInfo[k] });
    if (opts.restCount && opts.restCount !== 'off' && restInfo[k]) {
      const u = rowFor(b.number).unit, unit = UNIT_FRAC[u];
      const sub = opts.restCount === 'sub' ? ({ q: 1 / 8, dq: 1 / 8, h: 1 / 4, e: 1 / 16 }[u] || unit / 2) : unit;
      for (let x = 0, j = 0; x < L - 1e-9; x += sub, j++) {
        const onBeat = Math.abs(x / unit - Math.round(x / unit)) < 1e-6;
        const key = j === 0 ? '쉼박강' : onBeat ? '쉼박' : '쉼분박';
        hits.push([cur + clk(x), key, j === 0 ? 0.55 : onBeat ? 0.42 : 0.24]);
      }
    }
    if (opts.metronome) {
      const unit = UNIT_FRAC[rowFor(b.number).unit];
      for (let x = 0, j = 0; x < L - 1e-9; x += unit, j++) hits.push([cur + clk(x), j === 0 ? '클릭강' : '클릭', 0.55]);
    }
    for (const e of b.events) {
      const lg = e.line != null && opts.lineGain && opts.lineGain[e.line] != null ? opts.lineGain[e.line] : 1;
      const mel = e.line != null && opts.melodic ? opts.melodic[e.line] : null;
      if (mel && e.midis) {
        // 선율 악기: 음 높이와 길이를 살려 notes에 담는다
        if (lg <= 0) continue;
        const ts = cur + clk(e.t.v);
        const d = (e.sus || e.dur).v;
        const dsec = e.t.v + d <= L + 1e-9 ? clk(e.t.v + d) - clk(e.t.v) : d * s;
        const midis = e.midis.map(m => m + 12 * (mel.oct || 0) + (opts.shift || 0));   // shift: 조옮김(반음) + 기준음 높이(소수)
        if (e.tie) {
          // 마디를 넘는 붙임줄: 앞 음을 늘린다. 붙임줄 곡선 높이로 성부를 정해 앞 음과 성부가 다르게 읽히기도 하므로 성부는 따지지 않는다.
          // 이을 앞 음이 없으면(이음줄을 붙임줄로 읽은 경우 등) 버리지 않고 새 음으로 친다 (예전에는 그 음이 통째로 빠졌다)
          const prev = notes.slice(-60).reverse().find(n => n.line === e.line && n.midis.some(m => midis.includes(m)) && Math.abs(n.t + n.dur - ts) < 0.06);
          if (prev) { prev.dur += dsec; continue; }
        }
        let dl = opts.useLvl && e.lvl != null ? e.lvl / 0.75 : dynAt(bi + e.t.v / L);
        let tsH = ts;
        if (e.ten && opts.stacc !== false) dl *= 1.06;   // 테누토: 조금 무게 있게 (길이는 원래대로 꽉)
        if (opts.human) {   // 세기 ±6%, 박 사이 음은 조금 여리게, 치는 때 ±8ms (첫 음은 그대로 두어 카운트인과 어긋나지 않게)
          const [ha, hb] = humanRnd(bi, e.t.v, e.line, e.voice), u = UNIT_FRAC[rowFor(b.number).unit], onBeat = Math.abs(e.t.v / u - Math.round(e.t.v / u)) < 1e-6;
          dl *= (1 + 0.06 * ha) * (onBeat || e.accent ? 1 : 0.93);
          if (ts > t0 + 0.02) tsH = ts + 0.008 * hb;
        }
        // 스타카토: 적힌 길이의 절반쯤만 소리 내고 끊는다 (선율 악기)
        const sdur = e.stacc && !e.ten && opts.stacc !== false ? Math.max(0.06, Math.min(dsec * 0.5, 0.35)) : dsec;
        notes.push({ t: tsH, inst: mel.inst, midis, dur: sdur, gain: (e.accent ? ACC_MEL : 0.75) * dl * lg, line: e.line, voice: e.voice, bi,
          dynL: e.dynL || null, dynOff: e.dynOff || 0,
          trem: !!e.roll && !e.trill, trill: e.trill && opts.trill !== false ? (e.trillInt || 2) : 0, nong: mel.nong !== false,
          graces: e.graceMidis ? e.graceMidis.map(m => m + 12 * (mel.oct || 0) + (opts.shift || 0)) : null });
        continue;
      }
      if (e.tie) continue;
      let key = (e.line != null ? opts.sounds[e.line + ':' + e.voice] : undefined) ?? opts.sounds[e.voice];
      if (!key || key === 'off' || lg <= 0) continue;
      let ts = cur + clk(e.t.v);
      let dl = (opts.useLvl && e.lvl != null ? e.lvl / 0.75 : dynAt(bi + e.t.v / L)) * lg;
      let sh = 0;
      if (e.ten && opts.stacc !== false) dl *= 1.08;   // 타악 테누토: 조금 세게
      if (key === '꽹과리' && e.xh) key = '꽹과리막음';
      if (BUKS.has(key)) {
        if (e.line != null && bukRef[e.line] != null && e.pos != null) {
          const d = bukRef[e.line] - e.pos;   // 기본 북보다 몇 칸 위
          if (d >= 2) { key = keyOf(e.line, 'R'); sh = Math.max(-6, Math.min(6, 2 * (d - 4))); }
          else { key = keyOf(e.line, 'L'); sh = Math.max(-6, Math.min(6, 2 * d)); }
        }
        // 박 머리는 그대로, 박 사이 음은 조금 여리게 + 세기 ±7%, 때 ±3ms (빠르게 몰아칠 때 기계 소리처럼 들리지 않게)
        const u = UNIT_FRAC[rowFor(b.number).unit], onBeat = Math.abs(e.t.v / u - Math.round(e.t.v / u)) < 1e-6;
        dl *= (onBeat || e.accent ? 1 : 0.88) * (1 + 0.07 * rnd());
        if (!e.roll && !e.grace) ts += 0.003 * rnd();
      } else if (opts.human && !e.roll) {   // 다른 타악기도 사람처럼: 세기 ±6%, 박 사이 조금 여리게, 때 ±4ms
        const [ha, hb] = humanRnd(bi, e.t.v, e.line, e.voice), u = UNIT_FRAC[rowFor(b.number).unit], onBeat = Math.abs(e.t.v / u - Math.round(e.t.v / u)) < 1e-6;
        dl *= (1 + 0.06 * ha) * (onBeat || e.accent ? 1 : 0.93);
        if (!e.grace && ts > t0 + 0.02) ts += 0.004 * hb;
      }
      if (e.roll) {
        const rd = e.rollDur ? e.rollDur.v : e.dur.v;
        const dur = rd <= L - e.t.v + 1e-9 ? clk(e.t.v + rd) - clk(e.t.v) : rd * s / (tempoItems ? tempoFactorAt(tempoItems, bi + e.t.v / L, resets, ritF, accF) : 1);
        // 롤(굴림)은 한 덩어리로 넘기고 mix에서 사람이 굴리는 것처럼 만든다
        hits.push([ts, key, (e.accent ? 1.05 : 0.75) * dl, e.voice, { roll: Math.max(0.08, dur), dynL: e.dynL || null, dynOff: e.dynOff || 0 }]);
        continue;
      }
      for (let gi = 0; gi < e.grace; gi++) hits.push([ts - 0.055 * (e.grace - gi), key, 0.68 * dl, e.voice, sh ? { grace: gi + 1, of: e.grace, sh } : { grace: gi + 1, of: e.grace }]);
      const ex = e.accent ? { acc: true } : undefined;
      hits.push([ts, key === '꽹과리' && e.accent ? '꽹과리길게' : key, (e.accent ? ACC_PERC : 0.68) * dl, e.voice, sh ? { ...ex, sh } : ex]);
    }
    cur += clk(L);
    const next = order[k + 1];
    // 늘임표(페르마타): 그 마디 끝에 울리고 있는 선율 음을 opts.fermata박만큼 늘이고 그만큼 쉰다 (기본 2박, 0이면 늘이지 않음)
    if (b.fermata && !fIn.length && (next === bi + 1 || next == null)) {
      const fb = opts.fermata == null ? 2 : +opts.fermata;
      const extra = fb > 0 ? fb * UNIT_FRAC[rowFor(b.number).unit] * s : 0;
      if (extra) {
        for (let q = notes.length - 1; q >= 0 && notes[q].bi === bi; q--) if (notes[q].t + notes[q].dur >= cur - 0.08) notes[q].dur += extra;
        cur += extra;
      }
    }
  });
  // 트레몰로 음: 음 길이 동안의 셈여림 변화(꺾쇠 < >)를 0.04초마다 적어 둔다(첫 값 대비 비율) → 녹음 트레몰로가 없는 악기는 이 크기로 되풀이해 친다
  if ((opts.dyn || opts.useLvl) && barTimes.length) {
    const ends = barTimes.map((b, j) => j + 1 < barTimes.length ? barTimes[j + 1].abs : cur);
    const posAt = t => { let j = 0; while (j + 1 < barTimes.length && barTimes[j + 1].abs <= t + 1e-9) j++; const b = barTimes[j], d = Math.max(1e-6, ends[j] - b.abs); return b.idx + Math.min(0.9999, Math.max(0, (t - b.abs) / d)); };
    for (const nt of notes) {
      if (!nt.trem || nt.dur < 0.2) continue;
      // 그 줄의 셈여림(dynL)이 있으면 그것으로(앱은 음마다 그 줄의 셈여림을 쓴다), 없으면 곡 전체 셈여림
      const lv = nt.dynL && opts.useLvl ? (q => dynLevelAt(nt.dynL, q + nt.dynOff)) : dynAt;
      const base = lv(posAt(nt.t)) || 1, env = [];
      for (let t = 0; t < nt.dur; t += 0.04) env.push(dramatic(lv(posAt(nt.t + t)) / base));
      if (env.some(v => Math.abs(v - 1) > 0.02)) { nt.env = env; nt.envStep = 0.04; }
    }
    for (const nt of notes) { delete nt.dynL; delete nt.dynOff; }
    // 타악기 굴림(북·장구 트레몰로 등)도 같은 방식: 굴리는 동안 셈여림을 따라 커지고 작아진다
    for (const h of hits) {
      const x = h[4]; if (!x || !x.roll) continue;
      if (x.roll >= 0.2) {
        const lv = x.dynL && opts.useLvl ? (q => dynLevelAt(x.dynL, q + x.dynOff)) : dynAt;
        const base = lv(posAt(h[0])) || 1, env = [];
        for (let t = 0; t < x.roll; t += 0.04) env.push(dramatic(lv(posAt(h[0] + t)) / base));
        if (env.some(v => Math.abs(v - 1) > 0.02)) { x.env = env; x.envStep = 0.04; }
      }
      delete x.dynL; delete x.dynOff;
    }
  }
  for (const h of hits) if (h[4] && h[4].roll) { delete h[4].dynL; delete h[4].dynOff; }
  return { hits, notes, barTimes, total: cur + (notes.length ? 2.2 : 1.2), t0 };
}

// 북 높이 바꾸기(반음 sh개): 녹음을 빠르게/느리게 읽는다. 한 번 만든 것은 다시 쓴다
const pitchCache = new WeakMap();
function pitched(y, sh) {
  let m = pitchCache.get(y); if (!m) pitchCache.set(y, m = new Map());
  if (m.has(sh)) return m.get(sh);
  const r = Math.pow(2, sh / 12), n = Math.floor(y.length / r), z = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; z[i] = y[j] * (1 - f) + (y[j + 1] || 0) * f; }
  m.set(sh, z); return z;
}
export function mix(plan, sounds, custom = {}, extra = null, normalize = true) {
  custom = custom || {};
  const S = { ...sounds, ...custom };
  let hits = plan.hits;
  // 녹음된 덩이 있으면 동시에 울리는 따+궁을 덩 하나로
  if (Array.isArray(S['덩'])) {
    hits = [...hits].sort((a, b) => a[0] - b[0]);
    const out = [], used = new Set();
    for (let i = 0; i < hits.length; i++) {
      if (used.has(i)) continue;
      const h = hits[i];
      let pair = -1;
      const plain = x => !x[4] || !(x[4].roll || x[4].grace);
      if ((h[1] === '따' || h[1] === '궁') && plain(h)) for (let j = i + 1; j < hits.length && hits[j][0] - h[0] < 0.005; j++) {
        if (!used.has(j) && plain(hits[j]) && ((h[1] === '따' && hits[j][1] === '궁') || (h[1] === '궁' && hits[j][1] === '따'))) { pair = j; break; }
      }
      if (pair >= 0) { used.add(pair); out.push([h[0], '덩', Math.max(h[2], hits[pair][2]), h[3], (h[4] && h[4].acc) || (hits[pair][4] && hits[pair][4].acc) ? { acc: true } : undefined]); } else out.push(h);
    }
    hits = out;
  }
  const n = Math.ceil(plan.total * SR);
  const buf = new Float32Array(n);
  const vary = {};
  let lastTa = -9, flip = 0;
  // 북·바라·심벌·베이스드럼은 울림이 길다. 같은 악기를 다시 치면 앞 울림을 짧게 줄여 낮은 소리가 쌓여 뭉개지지 않게 한다
  // 같은 악기(같은 북)를 다시 치면 앞 소리의 울림을 줄인다. 높이가 다른 북·다른 북 소리끼리는 서로 끊지 않는다
  const fam = (k, ex) => k === '북녹음' || k === '북짧게' || k === '북' ? k + ':' + ((ex && ex.sh) || 0) : k === '바라' ? 'r' : k === '심벌' ? 'c' : k === '하이햇' ? 'h' : k === '베이스드럼' ? 'd' : k === '봉고' || k === '봉고높게' || k === '팀파니' || k === '팀파니높게' ? k : null;
  const nextSame = new Float64Array(hits.length).fill(Infinity);
  { const ord = hits.map((_, i) => i).sort((a, b) => hits[a][0] - hits[b][0]), last = {};
    for (let j = ord.length - 1; j >= 0; j--) { const i = ord[j], f = fam(hits[i][1], hits[i][4]); if (!f) continue;
      if (last[f] != null && last[f] - hits[i][0] > 0.02) nextSame[i] = last[f];   // 동시에 친 두 성부는 그대로 둔다
      if (last[f] == null || last[f] - hits[i][0] > 0.02) last[f] = hits[i][0]; } }
  for (let hi = 0; hi < hits.length; hi++) {
    const [t, key, g, , extra] = hits[hi];
    if (extra && extra.roll) { addRoll(buf, S, key, t, extra.roll, g * (GAIN[key] || 1), vary, custom, extra.env, extra.envStep); continue; }
    let k = key, gg = g;
    if (extra && extra.grace) {
      // 꾸밈음: 녹음한 꾸밈 소리(장구 '기', 꽹과리 '그·라·지')가 있으면 그것으로, 없으면 같은 소리를 작게
      const gk = (key === '따' || key === '덩') && !custom['따'] ? '따꾸밈' : /^꽹과리/.test(key) ? '꽹과리꾸밈' : null;
      const gs = gk && S[gk];
      if (Array.isArray(gs) && gs.length) {
        const idx = gk === '꽹과리꾸밈' && gs.length >= 3 ? (extra.of >= 2 ? (extra.grace === extra.of ? 1 : 0) : ((vary.gr = (vary.gr || 0) + 1) % 2 ? 1 : 2)) : 0;
        put1(buf, gs[idx], t, gg * (gk === '따꾸밈' ? 2.2 : 1.1) * (GAIN[key] || 1));
        continue;
      }
      gg *= 0.53;
    } else if (key === '따' && Array.isArray(S['따약']) && !custom['따']) {
      // 빠르게 이어 치는 채편: 둘째 타는 가볍게 '더' (같은 소리만 반복하면 기계 소리처럼 들린다)
      if (!(extra && extra.acc) && t - lastTa < 0.2 && (flip = 1 - flip)) { k = '따약'; gg *= 1.15; } else flip = 0;
      lastTa = t;
    }
    let s = S[k];
    if (Array.isArray(s)) { vary[k] = (vary[k] || 0) + 1; s = s[vary[k] % s.length]; }
    if (!s) continue;
    if (extra && extra.sh) s = pitched(s, extra.sh);
    const i0 = Math.round(t * SR);
    if (i0 < 0) continue;
    let m = Math.min(s.length, n - i0);
    const gain = gg * (GAIN[key] || 1);
    const nx = nextSame[hi];
    if (nx < Infinity) {
      const isBuk = key === '북' || key === '북녹음' || key === '북짧게';   // 북은 다시 쳐도 앞 울림이 조금 남는다
      const fs = isBuk ? 0.12 : 0.06, keep = Math.round(((nx - t) + fs) * SR), fade = Math.round(fs * SR);
      if (keep < m) { m = keep; const f0 = m - fade;
        for (let i = 0; i < m; i++) buf[i0 + i] += s[i] * gain * (i < f0 ? 1 : (m - i) / fade);
        continue; }
    }
    for (let i = 0; i < m; i++) buf[i0 + i] += s[i] * gain;
  }
  if (extra) extra(buf);   // 선율 악기 음 더하기
  if (!normalize) return buf;
  fitLevel(buf);
  return buf;
}

// 롤(굴림) 소리: 같은 녹음을 기계처럼 반복하면 "총 쏘는" 소리가 나므로
//  - 장구 채편의 짧은 굴림은 녹음한 굴림 소리를 그대로 쓰고
//  - 긴 굴림은 1초에 22~26번 정도로 빠르게, 간격·세기를 조금씩 흔들고, 한 번 친 소리의 꼬리를 잘라 겹침을 막고,
//    첫 타 뒤로는 소리를 부드럽게(고음을 깎아) 이어 붙인다. 꽹과리는 길게 울리는 소리를 밑에 깐다.
function put1(buf, x, t, g) {
  const i0 = Math.round(t * SR); if (!x || i0 < 0) return;
  const m = Math.min(x.length, buf.length - i0);
  for (let i = 0; i < m; i++) buf[i0 + i] += x[i] * g;
}
// 장구 채편 굴림: '더러러러' 녹음에서 떼어 낸 실제 타(7가지)를 채가 튀듯 점점 빠르고 약하게 잇는다.
// 길면 0.6초쯤마다 다시 세게 쳐서 굴림을 이어 간다.
function bounceRoll(buf, S, key, t, dur, gain, pick, strokes) {
  const put = (x, at, g, len, fade) => {
    const i0 = Math.round(at * SR), m = Math.min(x.length, len, buf.length - i0); if (i0 < 0 || m <= 0) return;
    const fl = Math.min(fade, m);
    for (let i = 0; i < m; i++) buf[i0 + i] += x[i] * g * (i > m - fl ? (m - i) / fl : 1);
  };
  let seed = (Math.round(t * SR) * 2654435761) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const groups = Math.max(1, Math.round(dur / 0.6)), G = dur / groups;
  let si = 0;
  for (let gi = 0; gi < groups; gi++) {
    const g0 = t + gi * G;
    // 첫 타: 굴림 처음은 원래 소리(덕·덩), 다음 묶음은 굴림 타 중 센 것
    const first = gi === 0 ? pick(key) : strokes[0];
    put(first, g0, gain * (gi === 0 ? 1 : 0.8), Math.round(0.3 * SR), Math.round(0.03 * SR));
    if (gi === 0 && key === '덩' && S['궁']) put(pick('궁'), g0, gain * 0.8, 1 << 30, 1);
    let sp = Math.min(0.11, Math.max(0.05, G / 6)), tt = sp, k = 1;
    while (tt < G - 0.02) {
      const x = strokes[1 + (si++ % (strokes.length - 1))];
      const lvl = gain * 0.62 * Math.pow(0.9, k) * (k % 2 ? 0.92 : 1) * (0.88 + 0.24 * rnd());
      const at = g0 + tt + (rnd() - 0.5) * 0.008;
      put(x, at, lvl * (G - tt < 0.08 ? (G - tt) / 0.08 : 1), Math.round(Math.max(0.06, sp * 2.2) * SR), Math.round(0.02 * SR));
      sp = Math.max(0.038, sp * 0.9); tt += sp * (0.92 + 0.16 * rnd()); k++;
    }
  }
}
// 심벌 롤: 녹음은 0.6초쯤 가장 커진 뒤 울리며 줄어든다.
//  짧은 롤은 커지는 부분의 뒤쪽부터 시작해 롤 끝에서 가장 크게, 긴 롤은 가장 큰 부분을 겹쳐 이어 붙인 뒤 울림으로 끝낸다
const PEAK_CACHE = new WeakMap();
// envAt(초)가 있으면 굴리는 동안 그 셈여림 곡선을 곱한다(울림은 끝 값). 작아지는 곡선이면 녹음의 '점점 커지는' 앞부분을 빼고 큰 부분부터
function cymbalRoll(buf, r, t, dur, gain, envAt = null, dim = false) {
  const n = buf.length, i0 = Math.round(t * SR), X = Math.round(0.15 * SR);
  let P = PEAK_CACHE.get(r);
  if (P == null) { const w = Math.round(0.05 * SR); let best = -1; P = 0;
    for (let i = 0; i + w < r.length && i < 3 * SR; i += w) { let e = 0; for (let j = i; j < i + w; j++) e += r[j] * r[j]; if (e > best) { best = e; P = i + (w >> 1); } }
    PEAK_CACHE.set(r, P); }
  const add = (from, to, at, fin, fout) => {   // r[from, to)를 at에 더한다. 앞뒤를 equal-power로 서서히
    const len = to - from;
    for (let i = 0; i < len; i++) { const k = at + i; if (k < 0) continue; if (k >= n) break;
      let w = 1; if (fin && i < fin) w *= Math.sin(Math.PI / 2 * i / fin); if (fout && i > len - fout) w *= Math.sin(Math.PI / 2 * (len - i) / fout);
      buf[k] += r[from + i] * gain * w * (envAt ? envAt(Math.min(dur, (k - i0) / SR)) : 1); }
  };
  const D = Math.round(dur * SR), tail = Math.min(r.length, P + 3 * SR);
  if (D <= P && !dim) { add(P - D, tail, i0, Math.round(0.01 * SR), Math.round(0.4 * SR)); return; }
  const a = Math.max(0, P - Math.round(0.15 * SR)), L = Math.round(0.5 * SR);
  if (!dim) add(0, P + X, i0, 0, X);             // 커지는 부분
  else add(a, a + X, i0, Math.round(0.01 * SR), X);   // 작아지는 롤: 큰 부분으로 바로 시작
  let seed = (i0 * 2654435761) >>> 0;
  for (let at = i0 + (dim ? X >> 1 : P); at < i0 + D; at += L - X) {   // 가장 큰 부분을 겹쳐 이어 붙임
    seed = (seed * 1664525 + 1013904223) >>> 0; const off = a + Math.floor((seed / 4294967296) * 0.1 * SR);
    add(off, Math.min(r.length, off + L), at, X, X);
  }
  add(P, tail, i0 + D, X, Math.round(0.4 * SR));  // 울림
}
// 트레몰로·굴림 안의 셈여림 변화: 비율을 dB로 1.8배 키운다 → 줄어들 땐 끝으로 갈수록 확 사그라들고, 커질 땐 끝에서 확 부푼다
function dramatic(r) { const db = 20 * Math.log10(Math.max(1e-4, r)) * 1.8; return Math.max(0.03, Math.min(4, Math.pow(10, db / 20))); }
function addRoll(buf, S, key, t, dur, gain, vary, custom = {}, env = null, envStep = 0.04) {
  const n = buf.length, i0 = Math.round(t * SR);
  // 셈여림 곡선(env): tt초 때의 크기 비율 (사이는 이어서)
  const envAt = tt => { if (!env) return 1; const f = tt / envStep, j = Math.min(env.length - 1, Math.floor(f)), j2 = Math.min(env.length - 1, j + 1), w = Math.max(0, Math.min(1, f - j)); return env[j] + (env[j2] - env[j]) * w; };
  // 녹음 굴림 소리를 셈여림 곡선대로 크기를 바꿔 넣는다
  const putEnv = (x, at, g, fadeLen, off) => {
    if (!env) { put(x, at, g, fadeLen); return; }
    const m = Math.min(x.length, n - at); if (at < 0 || m <= 0) return;
    const fl = Math.min(fadeLen || 0, m);
    for (let i = 0; i < m; i++) buf[at + i] += x[i] * g * envAt(off + i / SR) * (fl && i > m - fl ? (m - i) / fl : 1);
  };
  const put = (x, at, g, fadeLen) => {
    const m = Math.min(x.length, n - at); if (at < 0 || m <= 0) return;
    const fl = Math.min(fadeLen || 0, m);
    for (let i = 0; i < m; i++) buf[at + i] += x[i] * g * (fl && i > m - fl ? (m - i) / fl : 1);
  };
  const pick = k => { let s = S[k]; if (Array.isArray(s)) { vary[k] = (vary[k] || 0) + 1; s = s[vary[k] % s.length]; } return s; };
  // 녹음한 굴림 타가 있으면 그것으로 (직접 넣은 따 소리가 있으면 그 소리로)
  if ((key === '따' || key === '덩') && Array.isArray(S['굴림타']) && !custom['따']) { bounceRoll(buf, S, key, t, dur, gain, pick, S['굴림타']); return; }
  // 윈드차임: 한 번 훑는 소리 자체가 굴림이라 그대로 한 번
  if (key === '윈드차임') { const s = pick(key); if (s) put(s, i0, gain); return; }
  // 심벌 롤: 녹음한 롤(점점 커졌다 울리는 소리)을 길이에 맞춰
  if (key === '심벌' && Array.isArray(S['심벌롤']) && !custom['심벌']) { cymbalRoll(buf, S['심벌롤'][0], t, dur, gain * 0.9, env ? envAt : null, !!env && env[env.length - 1] < 0.8); return; }
  // 꽹과리: 녹음한 '개르르르'를 길이에 맞춰 (길면 이어 붙임)
  if (/^꽹과리/.test(key) && Array.isArray(S['꽹과리굴림']) && !custom['꽹과리']) {
    const r = S['꽹과리굴림'][0], seg = dur <= 1.1 ? dur + 1 : dur / Math.ceil(dur / 0.85);   // 길면 0.85초쯤마다 다시 친다
    for (let st = 0; st < dur; st += seg) {
      const left = dur - st, len = Math.min(r.length, Math.round((left + 0.25) * SR));
      const len2 = Math.min(len, Math.round((Math.min(left, seg) + 0.12) * SR) + (left > seg + 1e-6 ? 0 : len));
      putEnv(r.subarray(0, Math.min(len, len2)), i0 + Math.round(st * SR), gain * (st ? 0.78 : 1) * (key === '꽹과리막음' ? 0.8 : 1), Math.round((left > seg + 1e-6 ? 0.12 : Math.min(0.25, left / 2 + 0.1)) * SR), st);
    }
    return;
  }
  const rollRec = S['굴림'] && (key === '따' || key === '덩');
  if (rollRec && dur <= 1.2) {
    const r = pick('굴림'); if (!r) return;
    const m = Math.min(r.length, Math.round((dur + 0.08) * SR));
    putEnv(r.subarray(0, m), i0, gain * 1.1, Math.round(0.06 * SR), 0);
    if (key === '덩' && S['궁']) put(pick('궁'), i0, gain * 0.8);
    return;
  }
  const base = pick(key); if (!base) return;
  // 꽹과리: 쇳소리가 이어지도록 긴 울림을 밑에 깐다
  if ((key === '꽹과리' || key === '꽹과리길게') && S['꽹과리길게']) {
    const bed = pick('꽹과리길게'), m = Math.min(bed.length, Math.round((dur + 0.15) * SR));
    putEnv(bed.subarray(0, m), i0, gain * 0.45, Math.round(0.12 * SR), 0);
  }
  let seed = (i0 * 2654435761) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rate = key === '궁' || key === '북' || key === '북녹음' || key === '북짧게' ? 18 : 24;     // 북편·북은 조금 느리게
  let tt = 0, k = 0;
  // 한 타 소리: 고음을 살짝 깎은 복사본 (첫 타는 원래 소리)
  const metal = key === '트라이앵글' || key === '탬버린' || key === '카바사';
  const soft = new Float32Array(Math.min(base.length, Math.round(0.25 * SR)));
  { let lp = 0; for (let i = 0; i < soft.length; i++) { lp += 0.35 * (base[i] - lp); soft[i] = lp; } }
  while (tt < dur) {
    const left = dur - tt;
    const step = (1 / rate) * (0.85 + 0.3 * rnd());
    const hand = k % 2 ? 0.86 : 1;                           // 양손(양 채) 세기 차이
    // 셈여림 곡선이 있으면 그대로 따르고(가운데 부풂은 아주 조금만), 없으면 사람이 굴리듯 가운데가 조금 부푼다
    const swell = env ? 0.92 + 0.08 * Math.sin(Math.PI * Math.min(1, tt / dur)) : 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, tt / dur));
    const eg = envAt(tt);
    // 여려질수록 끝맺음도 부드럽게: 마지막 0.12초(env가 줄어드는 중이면 0.25초) 동안 사그라든다
    const tail = env && eg < 0.6 ? 0.25 : 0.12;
    const g = gain * eg * (k === 0 ? 1 : 0.42 * hand * swell * (0.85 + 0.3 * rnd())) * (left < tail ? left / tail : 1);
    // 쇳소리 작은 악기(트라이앵글·탬버린·카바사)는 고음을 깎지 않고, 트라이앵글은 울림이 이어지게 길게 겹친다
    const x = k === 0 || metal ? base : soft;
    const len = Math.min(x.length, Math.round((key === '트라이앵글' ? Math.max(0.25, step * 6) : k === 0 ? 0.25 : step * 2.2) * SR));
    put(x.subarray(0, len), i0 + Math.round(tt * SR), metal && k ? g * 1.3 : g, Math.round((key === '트라이앵글' ? 0.08 : 0.015) * SR));
    tt += step; k++;
  }
  if (key === '트라이앵글') put(base, i0 + Math.round(dur * SR), gain * 0.5, Math.round(0.3 * SR));   // 굴림이 끝나면 울림이 남는다
}

// 크기 맞추기: 예전에는 가장 큰 한 점(최댓값)을 0.89에 맞췄는데, 북을 여러 번 겹쳐 친 순간 같은 드문 큰 점 때문에
// 곡 전체가 작아졌다 → 거의 모든 소리(99.97%)가 0.8 안에 들도록 키우되 최대 6dB까지만, 넘치는 드문 점은 부드럽게 눌러 0.95 아래로
export function fitLevel(L, R = null) {
  let peak = 0; const st = Math.max(1, Math.floor(L.length / 200000)), smp = [];   // 표본은 숫자 배열 대신 Float32Array로 정렬 (같은 값, 훨씬 빠름)
  for (const x of R ? [L, R] : [L]) for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (i % st === 0) smp.push(a); }
  if (!(peak > 0)) return;
  const ss = Float32Array.from(smp).sort();
  const p = Math.max(ss[Math.floor(ss.length * 0.9997)] || 0, peak / 2);   // 많아야 6dB
  const k = Math.min(0.8 / p, 0.89 / peak * 2), T = 0.7, H = 0.95 - T;
  for (const x of R ? [L, R] : [L]) for (let i = 0; i < x.length; i++) {
    const v = x[i] * k, a = Math.abs(v);
    x[i] = a <= T ? v : Math.sign(v) * (T + H * Math.tanh((a - T) / H));
  }
}
export function encodeWav(buf, bufR = null) {
  const ch = bufR ? 2 : 1, n = buf.length, bytes = n * 2 * ch, ab = new ArrayBuffer(44 + bytes), v = new DataView(ab);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, SR, true);
  v.setUint32(28, SR * 2 * ch, true); v.setUint16(32, 2 * ch, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, bytes, true);
  const q = x => Math.max(-1, Math.min(1, x)) * 32767;
  if (bufR) for (let i = 0, o = 44; i < n; i++, o += 4) { v.setInt16(o, q(buf[i]), true); v.setInt16(o + 2, q(bufR[i]), true); }
  else for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, q(buf[i]), true);
  return new Uint8Array(ab);
}

// 잔향(울림): 여러 겹의 되울림 지연선(Freeverb 방식). wet = 울림 크기(0~0.4). 소리가 길어 조금씩 나눠 처리할 수 있게 상태를 들고 있다
export function makeReverb(wet, stereo) {
  const sc = SR / 44100, mk = (d, fb, damp) => ({ b: new Float32Array(Math.round(d * sc)), i: 0, fb, damp, lp: 0 });
  const combs = sp => [1116, 1188, 1277, 1356, 1422, 1491].map(d => mk(d + sp, 0.8, 0.3));
  const alls = sp => [556, 441, 341].map(d => mk(d + sp, 0.5, 0));
  const chans = [{ c: combs(0), a: alls(0) }, { c: combs(23), a: alls(23) }];
  // 지연선 하나씩 덩어리 전체를 돌린다 (한 점마다 아홉 개를 번갈아 부르던 때보다 몇 배 빠르고 결과는 같다)
  let X = new Float64Array(0), A = new Float64Array(0);
  const comb = (f, X, A, n) => {
    const b = f.b, len = b.length, fb = f.fb, d = f.damp, d1 = 1 - d; let i = f.i, lp = f.lp;
    for (let k = 0; k < n; k++) { const y = b[i]; lp = y * d1 + lp * d; b[i] = X[k] + lp * fb; if (++i >= len) i = 0; A[k] += y; }
    f.i = i; f.lp = lp;
  };
  const allp = (f, A, n) => {
    const b = f.b, len = b.length, fb = f.fb; let i = f.i;
    for (let k = 0; k < n; k++) { const out = A[k], y = b[i]; b[i] = out + y * fb; if (++i >= len) i = 0; A[k] = -out + y; }
    f.i = i;
  };
  const run = (C, n) => { A.fill(0, 0, n); for (const f of C.c) comb(f, X, A, n); for (const f of C.a) allp(f, A, n); };
  const g = wet * 0.18;   // 지연선 여섯 개를 더한 크기를 맞춘다
  return {
    process(L, R, i0, i1) {
      const n = i1 - i0; if (n <= 0) return;
      if (X.length < n) { X = new Float64Array(n); A = new Float64Array(n); }
      if (stereo && R) {
        for (let k = 0; k < n; k++) X[k] = (L[i0 + k] + R[i0 + k]) * 0.5;
        run(chans[0], n); for (let k = 0; k < n; k++) L[i0 + k] += A[k] * g;
        run(chans[1], n); for (let k = 0; k < n; k++) R[i0 + k] += A[k] * g;
      } else {
        for (let k = 0; k < n; k++) X[k] = L[i0 + k];
        run(chans[0], n); for (let k = 0; k < n; k++) L[i0 + k] += A[k] * g;
      }
    },
  };
}

// 압축 없는 zip (파일 하나). 다운로드 허용 형식에 wav가 없어 zip으로 감싼다.
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
export function zipOne(name, data) {
  const nb = new TextEncoder().encode(name), crc = crc32(data), sz = data.length;
  const lh = new DataView(new ArrayBuffer(30));
  lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
  lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true);
  lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
  const cd = new DataView(new ArrayBuffer(46));
  cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
  cd.setUint16(12, 0, true); cd.setUint16(14, 0x21, true); cd.setUint32(16, crc, true); cd.setUint32(20, sz, true); cd.setUint32(24, sz, true);
  cd.setUint16(28, nb.length, true); cd.setUint32(42, 0, true);
  const cdOff = 30 + nb.length + sz, cdSize = 46 + nb.length;
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, 1, true); end.setUint16(10, 1, true); end.setUint32(12, cdSize, true); end.setUint32(16, cdOff, true);
  return new Blob([lh, nb, data, cd, nb, end], { type: 'application/zip' });
}

// 녹음 소리 (base64 16비트 PCM, SR) → Float32Array 배열
export function decodeRecorded(obj) {
  const out = {};
  for (const [k, list] of Object.entries(obj)) {
    out[k] = list.map(b64 => {
      const bin = atob(b64), n = bin.length >> 1, y = new Float32Array(n);
      for (let i = 0; i < n; i++) { let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); if (v >= 32768) v -= 65536; y[i] = v / 32768; }
      return y;
    });
  }
  // 징: 녹음은 6초 가까이 울려 다음 소리를 덮는다 → 0.4초 뒤부터 빨리 줄여 3초 안에 끝나게
  // 봉고 한 쌍: 높은 봉고는 녹음을 반음 5개 높여 만든다
  // 꽹과리 막음: 녹음 두 개 중 0번은 30ms 딸깍 소리뿐(50ms 뒤 −39dB)이라 번갈아 쓰면 짝수 번째 막음이 안 들렸다(연변목가 꽹과리 73마디) → 몸통이 있는 1번만
  if (out['꽹과리막음'] && out['꽹과리막음'].length > 1) { const rms = y => { let s = 0; for (let i = 0; i < y.length; i++) s += y[i] * y[i]; return s / y.length; }; out['꽹과리막음'] = [out['꽹과리막음'].reduce((a, b) => rms(b) > rms(a) ? b : a)]; }
  // 팀파니(타악으로 칠 때): 선율용 팀파니 녹음(약 E3)에서 한 번 친 소리를 잘라 둔 것 → 낮은 음 C3(−4.2반음)·높은 음 G3(+2.8반음)
  { const rs = (y, st) => { const r = Math.pow(2, st / 12), n = Math.floor(y.length / r), z = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; z[i] = y[j] * (1 - f) + (y[j + 1] || 0) * f; } return z; };
    if (out['팀파니']) { const raw = out['팀파니']; out['팀파니높게'] = raw.map(y => rs(y, 55 - 52.2)); out['팀파니'] = raw.map(y => rs(y, 48 - 52.2)); } }
  if (out['봉고']) out['봉고높게'] = out['봉고'].map(y => { const r = Math.pow(2, 5 / 12), n = Math.floor(y.length / r), z = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; z[i] = y[j] * (1 - f) + (y[j + 1] || 0) * f; } return z; });
  if (out['징']) out['징'] = out['징'].map(y => {
    const n = Math.min(y.length, Math.round(3 * SR)), z = y.slice(0, n), a = Math.round(0.4 * SR), fo = Math.round(0.3 * SR);
    for (let i = a; i < n; i++) z[i] *= Math.exp(-(i - a) / SR / 0.9) * (i > n - fo ? (n - i) / fo : 1);
    return z;
  });
  // 북 녹음도 소리가 거의 100Hz 아래라 작은 스피커에서 잘 안 들리고 힘이 없다 → bukPunch (가죽 울림·채 소리 살리기)
  // 두 녹음이 같은 음색으로 들리지 않게: 낮고 길게는 원래 녹음(약 59Hz)이 너무 낮아 휴대폰·노트북에서 퍼지기만 하고 잘 안 들려
  // (11월 4일) 한 옥타브 올려(약 117Hz) 합성 북과 같은 높이·같은 다듬기(70Hz 아래 줄이기, 가죽 울림·채 소리, 120Hz 울림)로. 예전에는 반음 3개 낮춰 약 50Hz였다
  // (짧게보다는 여전히 낮고 길다: 117Hz·2초 vs 193Hz·1.3초),
  // 짧게는 작은북답게 반음 10개 높이고(약 195Hz, 악보 윗부분 음표 = 높은 북) 가죽·채 소리를 더 또렷하게
  const up = (y, r) => { const n = Math.floor(y.length / r), z = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; z[i] = y[j] * (1 - f) + (y[j + 1] || 0) * f; } return z; };
  if (out['북녹음']) out['북녹음'] = out['북녹음'].map((y, n) => bukRing(bukPunch(up(y, 2), 1.5, BUK_CLICK, 26 + n, 70), 120, 0.25, 0.25, 0.3, 0.8));
  if (out['북짧게']) out['북짧게'] = out['북짧게'].map((y, n) => bukRing(bukPunch(up(y, Math.pow(2, 10 / 12)), BUK_MID, 1.0, 28 + n, 130), 192, 0.22, 0.35, 0.3, 0.8));
  return out;
}
