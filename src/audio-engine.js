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
    S['클릭'] = build(0.06, t => Math.sin(2 * Math.PI * 2000 * t) * env(t, 0.0002, 0.01) + 0.4 * Math.sin(2 * Math.PI * 4100 * t) * env(t, 0.0002, 0.006));
    S['클릭강'] = build(0.06, t => Math.sin(2 * Math.PI * 2600 * t) * env(t, 0.0002, 0.012) + 0.4 * Math.sin(2 * Math.PI * 5200 * t) * env(t, 0.0002, 0.006));
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
const GAIN = { '따': JG, '궁': 1.15 * JG, '북': 2.4 * BK, '북녹음': 2.6 * BK, '북짧게': 1.6 * BK, '바라': 0.72, '베이스드럼': 1.0, '하이햇': 0.75, '심벌': 0.8, '스네어': 0.85, '덩': 1.1 * JG, '꽹과리': 0.8 * KG, '꽹과리길게': 0.8 * KG, '꽹과리막음': 0.85 * KG };
// 셈여림 크기 (mf = 0.75 기준). p는 마디 번호 축 위치(0부터)
export function dynLevelAt(items, p) {
  let level = 0.75;
  for (const it of items) {
    if (it.p0 > p) break;
    if (it.kind === 'mark') { level = it.level; continue; }
    const target = it.target != null ? it.target : Math.max(0.2, Math.min(1, level + it.dir * 0.15));
    if (p < it.p1) return level + (target - level) * (p - it.p0) / Math.max(1e-6, it.p1 - it.p0);
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
    const b = bars[bi], s = spw(b.number), L = b.barLen.v, clk = clock(bi, L, s);
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
          // 마디를 넘는 붙임줄: 앞 음을 늘린다
          const prev = notes.slice(-40).reverse().find(n => n.line === e.line && n.voice === e.voice && n.midis.some(m => midis.includes(m)) && Math.abs(n.t + n.dur - ts) < 0.06);
          if (prev) prev.dur += dsec;
          continue;
        }
        const dl = opts.useLvl && e.lvl != null ? e.lvl / 0.75 : dynAt(bi + e.t.v / L);
        // 스타카토: 적힌 길이의 절반쯤만 소리 내고 끊는다 (선율 악기)
        const sdur = e.stacc && opts.stacc !== false ? Math.max(0.06, Math.min(dsec * 0.5, 0.35)) : dsec;
        notes.push({ t: ts, inst: mel.inst, midis, dur: sdur, gain: (e.accent ? 0.95 : 0.75) * dl * lg, line: e.line, voice: e.voice, bi,
          trem: !!e.roll && !e.trill, trill: e.trill && opts.trill !== false ? (e.trillInt || 2) : 0, nong: mel.nong !== false,
          graces: e.graceMidis ? e.graceMidis.map(m => m + 12 * (mel.oct || 0) + (opts.shift || 0)) : null });
        continue;
      }
      if (e.tie) continue;
      const key = (e.line != null ? opts.sounds[e.line + ':' + e.voice] : undefined) ?? opts.sounds[e.voice];
      if (!key || key === 'off' || lg <= 0) continue;
      const ts = cur + clk(e.t.v);
      const dl = (opts.useLvl && e.lvl != null ? e.lvl / 0.75 : dynAt(bi + e.t.v / L)) * lg;
      if (e.roll) {
        const rd = e.rollDur ? e.rollDur.v : e.dur.v;
        const dur = rd <= L - e.t.v + 1e-9 ? clk(e.t.v + rd) - clk(e.t.v) : rd * s / (tempoItems ? tempoFactorAt(tempoItems, bi + e.t.v / L, resets, ritF, accF) : 1);
        // 롤(굴림)은 한 덩어리로 넘기고 mix에서 사람이 굴리는 것처럼 만든다
        hits.push([ts, key, (e.accent ? 0.9 : 0.75) * dl, e.voice, { roll: Math.max(0.08, dur) }]);
        continue;
      }
      for (let gi = 0; gi < e.grace; gi++) hits.push([ts - 0.055 * (e.grace - gi), key, 0.68 * dl, e.voice, { grace: gi + 1, of: e.grace }]);
      hits.push([ts, key === '꽹과리' && e.accent ? '꽹과리길게' : key, (e.accent ? 1.0 : 0.68) * dl, e.voice, e.accent ? { acc: true } : undefined]);
    }
    cur += clk(L);
    const next = order[k + 1];
    // 늘임표(페르마타): 그 마디 끝에 울리고 있는 선율 음을 opts.fermata박만큼 늘이고 그만큼 쉰다 (기본 2박, 0이면 늘이지 않음)
    if (b.fermata && (next === bi + 1 || next == null)) {
      const fb = opts.fermata == null ? 2 : +opts.fermata;
      const extra = fb > 0 ? fb * UNIT_FRAC[rowFor(b.number).unit] * s : 0;
      if (extra) {
        for (let q = notes.length - 1; q >= 0 && notes[q].bi === bi; q--) if (notes[q].t + notes[q].dur >= cur - 0.08) notes[q].dur += extra;
        cur += extra;
      }
    }
  });
  return { hits, notes, barTimes, total: cur + (notes.length ? 2.2 : 1.2), t0 };
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
  const fam = k => k === '북녹음' || k === '북짧게' ? 'b' : k === '바라' ? 'r' : k === '심벌' ? 'c' : k === '하이햇' ? 'h' : k === '베이스드럼' ? 'd' : null;
  const nextSame = new Float64Array(hits.length).fill(Infinity);
  { const ord = hits.map((_, i) => i).sort((a, b) => hits[a][0] - hits[b][0]), last = {};
    for (let j = ord.length - 1; j >= 0; j--) { const i = ord[j], f = fam(hits[i][1]); if (!f) continue;
      if (last[f] != null && last[f] - hits[i][0] > 0.02) nextSame[i] = last[f];   // 동시에 친 두 성부는 그대로 둔다
      if (last[f] == null || last[f] - hits[i][0] > 0.02) last[f] = hits[i][0]; } }
  for (let hi = 0; hi < hits.length; hi++) {
    const [t, key, g, , extra] = hits[hi];
    if (extra && extra.roll) { addRoll(buf, S, key, t, extra.roll, g * (GAIN[key] || 1), vary, custom); continue; }
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
    const i0 = Math.round(t * SR);
    if (i0 < 0) continue;
    let m = Math.min(s.length, n - i0);
    const gain = gg * (GAIN[key] || 1);
    const nx = nextSame[hi];
    if (nx < Infinity) {
      const keep = Math.round(((nx - t) + 0.06) * SR), fade = Math.round(0.06 * SR);
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
function cymbalRoll(buf, r, t, dur, gain) {
  const n = buf.length, i0 = Math.round(t * SR), X = Math.round(0.15 * SR);
  let P = PEAK_CACHE.get(r);
  if (P == null) { const w = Math.round(0.05 * SR); let best = -1; P = 0;
    for (let i = 0; i + w < r.length && i < 3 * SR; i += w) { let e = 0; for (let j = i; j < i + w; j++) e += r[j] * r[j]; if (e > best) { best = e; P = i + (w >> 1); } }
    PEAK_CACHE.set(r, P); }
  const add = (from, to, at, fin, fout) => {   // r[from, to)를 at에 더한다. 앞뒤를 equal-power로 서서히
    const len = to - from;
    for (let i = 0; i < len; i++) { const k = at + i; if (k < 0) continue; if (k >= n) break;
      let w = 1; if (fin && i < fin) w *= Math.sin(Math.PI / 2 * i / fin); if (fout && i > len - fout) w *= Math.sin(Math.PI / 2 * (len - i) / fout);
      buf[k] += r[from + i] * gain * w; }
  };
  const D = Math.round(dur * SR), tail = Math.min(r.length, P + 3 * SR);
  if (D <= P) { add(P - D, tail, i0, Math.round(0.01 * SR), Math.round(0.4 * SR)); return; }
  add(0, P + X, i0, 0, X);                       // 커지는 부분
  const a = Math.max(0, P - Math.round(0.15 * SR)), L = Math.round(0.5 * SR);
  let seed = (i0 * 2654435761) >>> 0;
  for (let at = i0 + P; at < i0 + D; at += L - X) {   // 가장 큰 부분을 겹쳐 이어 붙임
    seed = (seed * 1664525 + 1013904223) >>> 0; const off = a + Math.floor((seed / 4294967296) * 0.1 * SR);
    add(off, Math.min(r.length, off + L), at, X, X);
  }
  add(P, tail, i0 + D, X, Math.round(0.4 * SR));  // 울림
}
function addRoll(buf, S, key, t, dur, gain, vary, custom = {}) {
  const n = buf.length, i0 = Math.round(t * SR);
  const put = (x, at, g, fadeLen) => {
    const m = Math.min(x.length, n - at); if (at < 0 || m <= 0) return;
    const fl = Math.min(fadeLen || 0, m);
    for (let i = 0; i < m; i++) buf[at + i] += x[i] * g * (fl && i > m - fl ? (m - i) / fl : 1);
  };
  const pick = k => { let s = S[k]; if (Array.isArray(s)) { vary[k] = (vary[k] || 0) + 1; s = s[vary[k] % s.length]; } return s; };
  // 녹음한 굴림 타가 있으면 그것으로 (직접 넣은 따 소리가 있으면 그 소리로)
  if ((key === '따' || key === '덩') && Array.isArray(S['굴림타']) && !custom['따']) { bounceRoll(buf, S, key, t, dur, gain, pick, S['굴림타']); return; }
  // 심벌 롤: 녹음한 롤(점점 커졌다 울리는 소리)을 길이에 맞춰
  if (key === '심벌' && Array.isArray(S['심벌롤']) && !custom['심벌']) { cymbalRoll(buf, S['심벌롤'][0], t, dur, gain * 0.9); return; }
  // 꽹과리: 녹음한 '개르르르'를 길이에 맞춰 (길면 이어 붙임)
  if (/^꽹과리/.test(key) && Array.isArray(S['꽹과리굴림']) && !custom['꽹과리']) {
    const r = S['꽹과리굴림'][0], seg = dur <= 1.1 ? dur + 1 : dur / Math.ceil(dur / 0.85);   // 길면 0.85초쯤마다 다시 친다
    for (let st = 0; st < dur; st += seg) {
      const left = dur - st, len = Math.min(r.length, Math.round((left + 0.25) * SR));
      const len2 = Math.min(len, Math.round((Math.min(left, seg) + 0.12) * SR) + (left > seg + 1e-6 ? 0 : len));
      put(r.subarray(0, Math.min(len, len2)), i0 + Math.round(st * SR), gain * (st ? 0.78 : 1) * (key === '꽹과리막음' ? 0.8 : 1), Math.round((left > seg + 1e-6 ? 0.12 : Math.min(0.25, left / 2 + 0.1)) * SR));
    }
    return;
  }
  const rollRec = S['굴림'] && (key === '따' || key === '덩');
  if (rollRec && dur <= 1.2) {
    const r = pick('굴림'); if (!r) return;
    const m = Math.min(r.length, Math.round((dur + 0.08) * SR));
    put(r.subarray(0, m), i0, gain * 1.1, Math.round(0.06 * SR));
    if (key === '덩' && S['궁']) put(pick('궁'), i0, gain * 0.8);
    return;
  }
  const base = pick(key); if (!base) return;
  // 꽹과리: 쇳소리가 이어지도록 긴 울림을 밑에 깐다
  if ((key === '꽹과리' || key === '꽹과리길게') && S['꽹과리길게']) {
    const bed = pick('꽹과리길게'), m = Math.min(bed.length, Math.round((dur + 0.15) * SR));
    put(bed.subarray(0, m), i0, gain * 0.45, Math.round(0.12 * SR));
  }
  let seed = (i0 * 2654435761) >>> 0;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const rate = key === '궁' || key === '북' || key === '북녹음' || key === '북짧게' ? 18 : 24;     // 북편·북은 조금 느리게
  let tt = 0, k = 0;
  // 한 타 소리: 고음을 살짝 깎은 복사본 (첫 타는 원래 소리)
  const soft = new Float32Array(Math.min(base.length, Math.round(0.25 * SR)));
  { let lp = 0; for (let i = 0; i < soft.length; i++) { lp += 0.35 * (base[i] - lp); soft[i] = lp; } }
  while (tt < dur) {
    const left = dur - tt;
    const step = (1 / rate) * (0.85 + 0.3 * rnd());
    const hand = k % 2 ? 0.86 : 1;                           // 양손(양 채) 세기 차이
    const swell = 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, tt / dur));
    const g = gain * (k === 0 ? 1 : 0.42 * hand * swell * (0.85 + 0.3 * rnd())) * (left < 0.12 ? left / 0.12 : 1);
    const x = k === 0 ? base : soft;
    const len = Math.min(x.length, Math.round((k === 0 ? 0.25 : step * 2.2) * SR));
    put(x.subarray(0, len), i0 + Math.round(tt * SR), g, Math.round(0.015 * SR));
    tt += step; k++;
  }
}

// 크기 맞추기: 예전에는 가장 큰 한 점(최댓값)을 0.89에 맞췄는데, 북을 여러 번 겹쳐 친 순간 같은 드문 큰 점 때문에
// 곡 전체가 작아졌다 → 거의 모든 소리(99.97%)가 0.8 안에 들도록 키우되 최대 6dB까지만, 넘치는 드문 점은 부드럽게 눌러 0.95 아래로
export function fitLevel(L, R = null) {
  let peak = 0; const st = Math.max(1, Math.floor(L.length / 200000)), smp = [];
  for (const x of R ? [L, R] : [L]) for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (i % st === 0) smp.push(a); }
  if (!(peak > 0)) return;
  smp.sort((a, b) => a - b);
  const p = Math.max(smp[Math.floor(smp.length * 0.9997)] || 0, peak / 2);   // 많아야 6dB
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
  const run = (C, x) => {
    let out = 0;
    for (const f of C.c) { const y = f.b[f.i]; f.lp = y * (1 - f.damp) + f.lp * f.damp; f.b[f.i] = x + f.lp * f.fb; if (++f.i >= f.b.length) f.i = 0; out += y; }
    for (const f of C.a) { const y = f.b[f.i]; const o = -out + y; f.b[f.i] = out + y * f.fb; if (++f.i >= f.b.length) f.i = 0; out = o; }
    return out;
  };
  const g = wet * 0.18;   // 지연선 여섯 개를 더한 크기를 맞춘다
  return {
    process(L, R, i0, i1) {
      if (stereo && R) for (let i = i0; i < i1; i++) { const x = (L[i] + R[i]) * 0.5; const yl = run(chans[0], x), yr = run(chans[1], x); L[i] += yl * g; R[i] += yr * g; }
      else for (let i = i0; i < i1; i++) L[i] += run(chans[0], L[i]) * g;
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
  if (out['징']) out['징'] = out['징'].map(y => {
    const n = Math.min(y.length, Math.round(3 * SR)), z = y.slice(0, n), a = Math.round(0.4 * SR), fo = Math.round(0.3 * SR);
    for (let i = a; i < n; i++) z[i] *= Math.exp(-(i - a) / SR / 0.9) * (i > n - fo ? (n - i) / fo : 1);
    return z;
  });
  // 북 녹음도 소리가 거의 100Hz 아래라 작은 스피커에서 잘 안 들리고 힘이 없다 → bukPunch (가죽 울림·채 소리 살리기)
  // 두 녹음이 같은 음색으로 들리지 않게: 낮고 길게는 큰북답게 반음 3개 낮추고(약 50Hz) 낮은 울림을 남기고 채 소리는 약하게,
  // 짧게는 작은북답게 반음 10개 높이고(약 195Hz, 악보 윗부분 음표 = 높은 북) 가죽·채 소리를 더 또렷하게
  const up = (y, r) => { const n = Math.floor(y.length / r), z = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; z[i] = y[j] * (1 - f) + (y[j + 1] || 0) * f; } return z; };
  if (out['북녹음']) out['북녹음'] = out['북녹음'].map((y, n) => bukRing(bukPunch(up(y, Math.pow(2, -3 / 12)), 2.5, 0.4, 26 + n, 30), 100, 0.3, 0.15, 0.3, 1.0));
  if (out['북짧게']) out['북짧게'] = out['북짧게'].map((y, n) => bukRing(bukPunch(up(y, Math.pow(2, 10 / 12)), BUK_MID, 1.0, 28 + n, 130), 192, 0.22, 0.35, 0.3, 0.8));
  return out;
}
