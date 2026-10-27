// 선율 악기 소리 합성 (녹음 없이). 음 하나 = midi 번호 + 길이(초) + 세기
// 뜯는 악기(가야금·거문고·양금)는 Karplus-Strong 줄 모형, 부는·켜는 악기(대금·소금·피리·태평소·해금·아쟁)는
// 배음 표(한 주기 파형)를 떨림(비브라토)과 함께 읽고 숨·활 소리를 섞는다.
import { SR } from './audio-engine.js';

export const INSTRUMENTS = {
  gayageum: { name: '가야금 (녹음)', kind: 'pluck', bright: 0.55, decay: 2.6, ring: 0.9, nong: 22, bank: 'gayageum' },
  gayageum_syn: { name: '가야금 (합성음)', kind: 'pluck', bright: 0.55, decay: 2.6, ring: 0.9, nong: 22 },
  geomungo: { name: '거문고 (녹음)', kind: 'pluck', bank: 'geomungo', bright: 0.3, decay: 1.6, ring: 0.5, click: 0.35, nong: 28 },
  geomungo_syn: { name: '거문고 (합성음)', kind: 'pluck', bright: 0.3, decay: 1.6, ring: 0.5, click: 0.35, nong: 28 },
  yanggeum: { name: '양금', kind: 'pluck', bright: 0.85, decay: 3.2, ring: 1.4, click: 0.15 },
  daegeum: { name: '대금 (녹음)', kind: 'wind', bank: 'daegeum', harm: [1, 0.32, 0.16, 0.09, 0.05, 0.03], breath: 0.10, buzz: 0.06, atk: 0.07, vib: [5.2, 18], formant: [] },
  daegeum_syn: { name: '대금 (합성음)', kind: 'wind', harm: [1, 0.32, 0.16, 0.09, 0.05, 0.03], breath: 0.10, buzz: 0.06, atk: 0.07, vib: [5.2, 18], formant: [] },
  sogeum: { name: '소금 (녹음)', kind: 'wind', bank: 'sogeum', harm: [1, 0.22, 0.08, 0.04], breath: 0.08, buzz: 0.02, atk: 0.05, vib: [5.5, 15], formant: [] },
  sogeum_syn: { name: '소금 (합성음)', kind: 'wind', harm: [1, 0.22, 0.08, 0.04], breath: 0.08, buzz: 0.02, atk: 0.05, vib: [5.5, 15], formant: [] },
  piri: { name: '피리 (녹음)', kind: 'wind', bank: 'piri', harm: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.28, 0.22, 0.17, 0.13], breath: 0.05, atk: 0.04, vib: [5.8, 30], formant: [[1100, 450, 2.2], [2600, 700, 1.0]] },
  piri_syn: { name: '피리 (합성음)', kind: 'wind', harm: [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.42, 0.35, 0.28, 0.22, 0.17, 0.13], breath: 0.05, atk: 0.04, vib: [5.8, 30], formant: [[1100, 450, 2.2], [2600, 700, 1.0]] },
  taepyeongso: { name: '태평소 (녹음)', kind: 'wind', bank: 'taepyeongso', harm: [1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2], breath: 0.04, atk: 0.03, vib: [6, 25], formant: [[1400, 500, 2.5], [3000, 800, 1.4]] },
  taepyeongso_syn: { name: '태평소 (합성음)', kind: 'wind', harm: [1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2], breath: 0.04, atk: 0.03, vib: [6, 25], formant: [[1400, 500, 2.5], [3000, 800, 1.4]] },
  haegeum: { name: '해금 (녹음)', kind: 'bow', bank: 'haegeum', harm: null, breath: 0.07, atk: 0.07, vib: [6, 28], formant: [[900, 300, 1.8], [2200, 600, 1.2]] },
  haegeum_syn: { name: '해금 (합성음)', kind: 'bow', harm: null, breath: 0.07, atk: 0.07, vib: [6, 28], formant: [[900, 300, 1.8], [2200, 600, 1.2]] },
  ajaeng: { name: '아쟁 (녹음)', kind: 'bow', bank: 'ajaeng', harm: null, breath: 0.12, atk: 0.09, vib: [5, 20], formant: [[500, 250, 1.6], [1500, 500, 1.0]] },
  ajaeng_syn: { name: '아쟁 (합성음)', kind: 'bow', harm: null, breath: 0.12, atk: 0.09, vib: [5, 20], formant: [[500, 250, 1.6], [1500, 500, 1.0]] },
  piano: { name: '피아노 (녹음)', kind: 'piano', bank: 'piano' },
  piano_syn: { name: '피아노 (합성음)', kind: 'piano' },
};

// 줄 이름으로 악기 짐작
export function guessInstrument(name = '') {
  if (/가야금|가야/.test(name)) return 'gayageum';
  if (/거문고/.test(name)) return 'geomungo';
  if (/양금/.test(name)) return 'yanggeum';
  if (/소금/.test(name)) return 'sogeum';
  if (/해금/.test(name)) return 'haegeum';   // '저해금'의 '저'를 대금(저)으로 읽지 않게 먼저
  if (/대금|^저$|^중금|^저\s/.test(name)) return 'daegeum';
  if (/태평소|날라리|새납/.test(name)) return 'taepyeongso';
  if (/피리/.test(name)) return 'piri';
  if (/해금/.test(name)) return 'haegeum';
  if (/아쟁/.test(name)) return 'ajaeng';
  if (/piano|피아노|pno|syn|신디|keyboard|건반/i.test(name)) return 'piano';   // 신디사이저·건반 줄은 피아노 소리로
  // 녹음이 없는 악기는 가장 비슷한 소리로: 생황(리드 화음 악기) → 피리, 콘트라베이스·첼로(활로 켜는 낮은 현) → 아쟁
  if (/생황/.test(name)) return 'piri';
  if (/contra\s*bass|^cb\.?$|콘트라베이스|베이스|cello|vc\.?$|첼로/i.test(name)) return 'ajaeng';
  return null; // 악기명을 확실히 알아내지 못하면 임의로 가야금 소리를 지정하지 않는다.
}

const hz = m => 440 * Math.pow(2, (m - 69) / 12);
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; }; }

// 뜯는 줄
function pluck(ins, f, dur, vel, seed) {
  const len = Math.min(6, Math.max(0.25, dur + ins.ring)), n = Math.round(len * SR);
  const y = new Float32Array(n);
  const P = SR / f;
  const r = rnd(seed);
  // 처음 튕김: 밝기에 따라 걸러 낸 잡음 (한 주기 남짓)
  const E = Math.ceil(P) + 2;
  let lp = 0; const a = 0.15 + 0.8 * ins.bright;
  for (let i = 0; i < E && i < n; i++) { lp += a * (r() - lp); y[i] = lp; }
  let mean = 0; for (let i = 0; i < E; i++) mean += y[i]; mean /= E; for (let i = 0; i < E && i < n; i++) y[i] -= mean;
  // 높은 음일수록 빨리 사라짐
  const g = Math.pow(0.001, 1 / (ins.decay * SR / P * Math.min(1, 220 / f + 0.45)));
  // 지연 D + 평균 필터(0.5표본) = 한 주기 P
  const D = P - 0.5, Di = Math.floor(D), fr = D - Di;
  for (let i = E; i < n; i++) {
    const k = i - Di;
    const x0 = y[k] * (1 - fr) + y[k - 1] * fr, x1 = y[k - 1] * (1 - fr) + y[k - 2] * fr;
    y[i] = g * 0.5 * (x0 + x1);
  }
  // 긴 음은 농현처럼 살짝 떨어 준다 (가야금·거문고)
  if (ins.nong && dur > 0.45) {
    const src = y.slice(), depth = Math.pow(2, ins.nong / 1200) - 1, on = 0.22;
    let pos = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, k = pos | 0, fr = pos - k;
      y[i] = k + 1 < n ? src[k] * (1 - fr) + src[k + 1] * fr : 0;
      pos += 1 + (t > on ? depth * Math.min(1, (t - on) / 0.3) * Math.sin(2 * Math.PI * 4.5 * (t - on)) : 0);
    }
  }
  if (ins.click) { const cl = Math.round(0.02 * SR); for (let i = 0; i < cl && i < n; i++) y[i] += ins.click * r() * (1 - i / cl) * 0.6; }
  // 손으로 줄을 막는 것처럼 음 길이 뒤에 서서히 줄임
  const rel0 = Math.round((dur + ins.ring * 0.6) * SR), rel = Math.round(0.25 * SR);
  for (let i = rel0; i < n; i++) y[i] *= Math.max(0, 1 - (i - rel0) / rel);
  return scale(y, vel);
}

// 배음 표로 한 주기 파형 만들기
const tables = new Map();
function table(key, f, harm, formant) {
  const k = key + '|' + Math.round(f);
  if (tables.has(k)) return tables.get(k);
  const L = 2048, t = new Float32Array(L + 1);
  const H = harm || Array.from({ length: 24 }, (_, h) => 1 / (h + 1));
  for (let h = 1; h <= H.length; h++) {
    const fh = f * h; if (fh > SR * 0.45) break;
    let a = H[h - 1];
    for (const [fc, bw, gain] of (formant || [])) a *= 1 + gain * Math.exp(-Math.pow((fh - fc) / bw, 2));
    const ph = (h * 1.7) % (2 * Math.PI);
    for (let i = 0; i <= L; i++) t[i] += a * Math.sin(2 * Math.PI * h * i / L + ph);
  }
  let m = 0; for (const v of t) m = Math.max(m, Math.abs(v)); for (let i = 0; i <= L; i++) t[i] /= m || 1;
  tables.set(k, t);
  return t;
}

// 부는·켜는 악기
function sustained(ins, f, dur, vel, seed, key) {
  const rel = 0.09, len = Math.max(0.12, dur) + rel, n = Math.round(len * SR);
  const y = new Float32Array(n);
  const T = table(key, f, ins.harm, ins.formant), L = 2048;
  const r = rnd(seed);
  const [vf, vc] = ins.vib, vdepth = Math.pow(2, vc / 1200) - 1;
  const vibOn = Math.min(0.35, dur * 0.4), atk = ins.atk;
  let ph = 0, nz = 0, nz2 = 0;
  const bw = Math.min(0.9, 2 * Math.PI * f * 1.5 / SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const vib = t > vibOn ? vdepth * Math.min(1, (t - vibOn) / 0.25) * Math.sin(2 * Math.PI * vf * t) : 0;
    ph += f * (1 + vib) * L / SR; if (ph >= L) ph -= L;
    const k = ph | 0, fr = ph - k;
    let s = T[k] * (1 - fr) + T[k + 1] * fr;
    // 숨(활) 소리: 음 높이 근처로 걸러 낸 잡음
    nz += bw * (r() - nz); nz2 += bw * (nz - nz2);
    s += ins.breath * 6 * (nz - nz2) * (t < atk * 2 ? 2 : 1);
    if (ins.buzz) s += ins.buzz * Math.sign(Math.sin(2 * Math.PI * f * 2 * t)) * 0.5;   // 대금 청 울림 비슷하게
    const e = t < atk ? t / atk : t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1;
    y[i] = s * e * (ins.kind === 'bow' ? 0.9 + 0.1 * Math.sin(2 * Math.PI * 0.7 * t) : 1);
  }
  return scale(y, vel);
}

function piano(f, dur, vel) {
  const len = Math.min(5, dur + 1.2), n = Math.round(len * SR), y = new Float32Array(n);
  const B = 0.0004;
  for (let h = 1; h <= 8; h++) {
    const fh = f * h * Math.sqrt(1 + B * h * h); if (fh > SR * 0.45) break;
    const a = 1 / Math.pow(h, 1.3), dec = 1.8 / Math.pow(h, 0.7) * Math.min(1.5, 300 / f + 0.5);
    for (let i = 0; i < n; i++) { const t = i / SR; y[i] += a * Math.exp(-t / dec) * Math.sin(2 * Math.PI * fh * t); }
  }
  const rel0 = Math.round(dur * SR), rel = Math.round(0.2 * SR);
  for (let i = rel0; i < n; i++) y[i] *= Math.max(0, 1 - (i - rel0) / rel);
  for (let i = 0; i < Math.min(n, 64); i++) y[i] *= i / 64;
  return scale(y, vel);
}

function scale(y, vel) { let m = 0; for (const v of y) m = Math.max(m, Math.abs(v)); const k = m ? vel / m : 0; for (let i = 0; i < y.length; i++) y[i] *= k; return y; }

// ---------- 녹음 음원 ----------
// meta: [[종류('p' 뜯기 | 'n' 농현 | 't' 트레몰로), 실제 음높이(midi, 소수), 시작(초), 길이(초)], ...]
// pcm: meta의 소리들이 이어 붙은 녹음 (SR 표본률, Float32)
export const BANKS = {};
export function setBank(name, meta, pcm) {
  const bank = { p: [], n: [], t: [] };
  for (const [kind, m, s, L] of meta) {
    // mp3 앞의 빈 구간 길이가 해독기마다 달라서, 소리가 시작하는 곳을 직접 찾는다
    const i0 = Math.round(s * SR), n = Math.round(L * SR);
    const a = Math.max(0, i0 - Math.round(0.04 * SR)), b = Math.min(pcm.length, i0 + n);
    let peak = 0; for (let i = a; i < b; i++) peak = Math.max(peak, Math.abs(pcm[i]));
    let st = a; while (st < b && Math.abs(pcm[st]) < peak * 0.08) st++;
    st = Math.max(a, st - Math.round(0.002 * SR));
    const y = pcm.slice(st, Math.min(pcm.length, st + n));
    for (let i = 0; i < y.length; i++) y[i] /= peak || 1;
    bank[kind].push({ m, y });
  }
  BANKS[name] = bank;
}
export const NONG_MIN = 0.7;   // 이 길이(초) 이상인 음에 농현

// 4점 보간으로 rate배 빠르게 읽기 (음높이 바꾸기)
function readAt(src, rate, n) {
  const y = new Float32Array(n), L = src.length;
  let pos = 0;
  for (let i = 0; i < n; i++, pos += rate) {
    const k = pos | 0; if (k + 2 >= L) break;
    const f = pos - k, xm = k > 0 ? src[k - 1] : src[k], x0 = src[k], x1 = src[k + 1], x2 = src[k + 2];
    const c = (x1 - xm) * 0.5, v = x0 - x1, w = c + v, a = w + v + (x2 - x0) * 0.5, bb = w + a;
    y[i] = ((a * f - bb) * f + c) * f + x0;
  }
  return y;
}
// 트레몰로처럼 계속되는 소리를 원하는 길이까지 이어 붙이기 (가운데 부분 반복, 겹쳐 잇기)
function extend(src, need) {
  if (src.length >= need) return src;
  const xf = Math.round(0.08 * SR), ls = Math.round(0.35 * SR), le = src.length - Math.round(0.12 * SR);
  if (le - ls < xf * 3) return src;
  const out = new Float32Array(need + xf);
  out.set(src.subarray(0, le));
  let w = le;
  while (w < need) {
    // 반복 구간 시작을 조금씩 바꿔서 같은 소리가 되풀이되는 느낌을 줄인다
    const s0 = ls + ((w * 7919) % Math.max(1, Math.round((le - ls) * 0.3)));
    for (let i = 0; i < xf; i++) { const g = i / xf * Math.PI / 2; out[w - xf + i] = out[w - xf + i] * Math.cos(g) + src[s0 + i] * Math.sin(g); }   // 같은 힘으로 겹쳐 잇기 (가운데 꺼짐 줄임)
    const seg = Math.min(le - s0 - xf, out.length - w);
    out.set(src.subarray(s0 + xf, s0 + xf + seg), w);
    w += seg;
  }
  return out.subarray(0, need);
}
function nearest(list, midi) { let best = null; for (const c of list) if (!best || Math.abs(c.m - midi) < Math.abs(best.m - midi)) best = c; return best; }
// 녹음에서 쓸 음 고르기: 트레몰로 / (긴 음) 농현 / 기본음
function pickClip(bank, midi, dur, opt) {
  const trem = !!(opt.trem && bank.t.length), nong = !trem && opt.nong !== false && dur >= NONG_MIN && bank.n.length > 0;
  let c = nearest(trem ? bank.t : nong ? bank.n : bank.p, midi);
  // 고른 종류에 가까운 음이 없으면(3반음 넘게 떨어짐) 다른 종류에서 더 가까운 음을 쓴다 (음을 많이 옮기면 소리가 어색해짐)
  if (Math.abs(c.m - midi) > 3) for (const alt of [bank.p, bank.n]) { const d = alt.length && nearest(alt, midi); if (d && Math.abs(d.m - midi) + 2 <= Math.abs(c.m - midi)) c = d; }
  return { c, trem, rate: Math.pow(2, (midi - c.m) / 12) };
}

// 피아노: 녹음은 건반을 누르고 있던 0.5초쯤만 있다. 더 긴 음은 녹음 뒷부분을 겹쳐 이어 붙이고
// 실제 피아노처럼 점점 작아지게 만든다 (낮은 음일수록 오래 울림). 높이는 4점 보간으로 바꾼다
function rmsOf(a, i0, i1) { let e = 0; for (let i = i0; i < i1; i++) e += a[i] * a[i]; return Math.sqrt(e / Math.max(1, i1 - i0)); }
function pianoStream(src, rate, n, midi) {
  const need = Math.ceil(n * rate) + 4;
  if (src.length >= need) return readAt(src, rate, n);
  const xf = Math.round(0.05 * SR), Ls = Math.max(xf * 2, src.length - Math.round(0.03 * SR));
  const a = Math.min(Math.round(0.16 * SR), Ls - xf * 3), G = Math.max(xf * 2, Math.min(Ls - a, Math.round(0.2 * SR)));
  const ext = new Float32Array(need + G);
  ext.set(src.subarray(0, Ls));
  const lvl = rmsOf(src, Ls - Math.round(0.03 * SR), Ls) || 1e-6;
  const tau = Math.min(4, Math.max(0.5, 1.3 * Math.pow(2, (60 - midi) / 18))) * rate;   // 녹음 시간 기준 (나중에 rate배로 읽으므로)
  let w = Ls - xf, seed = Math.round(midi * 7919) >>> 0;
  while (w < need) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const s0 = a + Math.floor((seed / 4294967296) * Math.max(1, Ls - a - G));
    const k = lvl / (rmsOf(src, s0, s0 + G) || 1e-6);
    for (let i = 0; i < G && w + i < ext.length; i++) {
      const t = (w + i - Ls) / SR, dec = Math.exp(-Math.max(0, t) / tau);
      const fin = i < xf ? Math.sin(Math.PI / 2 * i / xf) : 1, fout = i >= G - xf ? Math.sin(Math.PI / 2 * (G - i) / xf) : 1;
      const v = src[s0 + i] * k * dec * fin * fout;
      if (i < xf) ext[w + i] = ext[w + i] * Math.cos(Math.PI / 2 * i / xf) + v; else ext[w + i] = v;
    }
    w += G - xf;
  }
  return readAt(ext, rate, n);
}

// 녹음 소리를 음 높이에 맞춰 늘인 '원본 줄기'를 음(악기·높이·종류)마다 한 번만 만들어 두고,
// 음표마다 앞부분을 잘라 끝맺음만 입혀 바로 더한다 (음표마다 다시 계산하지 않아 총보 전체도 빠름)
const RAW = new Map(); let rawSize = 0;
const RAW_LIMIT = 9e6;   // 표본 수 (약 36MB)
function rawStream(ins, c, rate, trem, need) {
  const key = ins.bank + '|' + c.m + '|' + rate.toFixed(5) + (trem ? 't' : '') + (c.y.length);
  let r = RAW.get(key);
  if (r && r.y.length >= need) { RAW.delete(key); RAW.set(key, r); return r; }   // 최근 쓴 것으로
  let y;
  if (ins.kind === 'piano') y = pianoStream(c.y, rate, Math.max(need, r ? Math.ceil(r.y.length * 1.5) : need), c.m + 12 * Math.log2(rate));
  else if (ins.kind === 'pluck' && !trem) y = readAt(c.y, rate, Math.floor((c.y.length - 3) / rate));
  else { const n = Math.max(need, r ? Math.ceil(r.y.length * 1.5) : need); y = readAt(extend(c.y, Math.ceil(n * rate) + 4), rate, n); }
  // 앞에서부터의 최댓값을 256표본 단위로 적어 둔다 → 음표마다 그 길이 안의 최댓값으로 크기를 맞춘다 (예전 방식과 같은 크기)
  const B = 256, pre = new Float32Array(Math.ceil(y.length / B)); let mx = 0;
  for (let b = 0; b < pre.length; b++) { const e = Math.min(y.length, (b + 1) * B); for (let i = b * B; i < e; i++) { const v = y[i] < 0 ? -y[i] : y[i]; if (v > mx) mx = v; } pre[b] = mx || 1e-9; }
  if (r) rawSize -= r.y.length;
  r = { y, pre }; RAW.delete(key); RAW.set(key, r); rawSize += y.length;
  while (rawSize > RAW_LIMIT && RAW.size > 1) { const [k0, v0] = RAW.entries().next().value; if (v0 === r) break; RAW.delete(k0); rawSize -= v0.y.length; }
  return r;
}
// 녹음 음 하나를 buf의 t초 자리에 바로 더한다
function addSampled(buf, ins, bank, midi, dur, gain, t, opt) {
  const { c, trem, rate } = pickClip(bank, midi, dur, opt);
  const sus = ins.kind !== 'pluck' || trem;
  const rel = Math.round((sus ? (trem ? 0.12 : ins.kind === 'piano' ? 0.16 : 0.1) : 0.25) * SR);   // 피아노: 건반을 떼면 댐퍼가 0.16초쯤에 소리를 멈춘다
  const want = sus ? Math.round(Math.max(0.12, dur) * SR) + rel : Math.round((dur + ins.ring * 0.6 + 0.25) * SR);
  const r = rawStream(ins, c, rate, trem, want);
  const n = Math.min(want, r.y.length), y = r.y;
  const rel0 = sus ? n - rel : Math.round((dur + ins.ring * 0.6) * SR), tail = sus ? 0 : Math.min(n, Math.round(0.03 * SR));
  // 크기: 줄어들기 전 구간의 최댓값을 gain에 맞춘다 (예전 방식과 같은 크기)
  const g = gain / r.pre[Math.max(0, Math.min(r.pre.length, Math.ceil(Math.min(n, Math.max(256, rel0)) / 256)) - 1)];
  const i0 = Math.round(t * SR); if (i0 >= buf.length) return;
  const st = Math.max(0, -i0), m = Math.min(n, buf.length - i0);
  // 구간별로 나눠 더한다 (표본마다 조건을 따지지 않게)
  const a1 = Math.min(m, Math.max(st, rel0));
  for (let i = st, o = i0 + st; i < a1; i++, o++) buf[o] += y[i] * g;
  const a2 = Math.min(m, Math.max(a1, n - tail)), inv = 1 / rel;
  for (let i = a1, o = i0 + a1; i < a2; i++, o++) { const e = 1 - (i - rel0) * inv; if (e <= 0) break; buf[o] += y[i] * g * e; }
  if (tail) for (let i = Math.max(st, n - tail), o = i0 + i; i < m; i++, o++) { const e = (i >= rel0 ? Math.max(0, 1 - (i - rel0) * inv) : 1) * (n - 1 - i) / tail; buf[o] += y[i] * g * e; }
}

function sampled(ins, bank, midi, dur, vel, opt) {
  const { c, trem, rate } = pickClip(bank, midi, dur, opt);
  let y;
  if (ins.kind === 'piano') {
    const rel = Math.round(0.16 * SR), n = Math.round(Math.max(0.12, dur) * SR) + rel;
    y = pianoStream(c.y, rate, n, midi);
    for (let i = 0; i < rel; i++) y[n - rel + i] *= 1 - i / rel;
  } else if (ins.kind !== 'pluck') {
    // 부는·켜는 악기: 녹음 가운데를 이어 붙여 음 길이만큼, 끝은 활을 떼듯 짧게 줄인다
    const rel = Math.round(0.1 * SR), n = Math.round(Math.max(0.12, dur) * SR) + rel;
    y = readAt(extend(c.y, Math.ceil(n * rate) + 4), rate, n);
    for (let i = 0; i < rel; i++) y[n - rel + i] *= 1 - i / rel;
  } else if (trem) {
    const n = Math.round((dur + 0.12) * SR);
    y = readAt(extend(c.y, Math.ceil(n * rate) + 4), rate, n);
    const rel = Math.round(0.12 * SR); for (let i = 0; i < rel; i++) y[n - rel + i] *= 1 - i / rel;
  } else {
    // 뜯은 뒤 울림은 남기고, 음 길이 뒤에 손으로 막듯이 줄인다
    const want = Math.round((dur + ins.ring * 0.6 + 0.25) * SR);
    const n = Math.min(want, Math.floor((c.y.length - 3) / rate));
    y = readAt(c.y, rate, n);
    const rel0 = Math.round((dur + ins.ring * 0.6) * SR), rel = Math.round(0.25 * SR);
    for (let i = rel0; i < n; i++) y[i] *= Math.max(0, 1 - (i - rel0) / rel);
    const tail = Math.min(n, Math.round(0.03 * SR)); for (let i = 0; i < tail; i++) y[n - 1 - i] *= i / tail;
  }
  return scale(y, vel);
}

// 음 하나 소리. opt: { trem: 트레몰로, nong: 긴 음에 농현 }
export function synthNote(instKey, midi, dur, vel = 0.8, opt = {}) {
  const ins = INSTRUMENTS[instKey] || INSTRUMENTS.gayageum;
  const f = hz(midi), seed = midi * 977 + Math.round(dur * 100);
  if (ins.bank && BANKS[ins.bank]) return sampled(ins, BANKS[ins.bank], midi, dur, vel, opt);
  if (ins.kind === 'pluck') return pluck(opt.nong === false ? { ...ins, nong: 0 } : ins, f, dur, vel, seed);
  if (ins.kind === 'piano') return piano(f, dur, vel);
  return sustained(ins, f, dur, vel, seed, instKey);
}

// 음들을 버퍼에 더한다. notes: [{ t, inst, midis, dur, gain, graces }]
let cacheSize = 0;
// 소리를 다 만든 뒤 휴대폰 메모리를 돌려준다
export function clearNoteCache() { RAW.clear(); rawSize = 0; if (mixNotes.cache) mixNotes.cache.clear(); cacheSize = 0; }
export function mixNotes(buf, notes, onProgress) {
  const cache = mixNotes.cache || (mixNotes.cache = new Map());
  let done = 0;
  for (const nt of notes) {
    const ins = INSTRUMENTS[nt.inst] || INSTRUMENTS.gayageum;
    const voices = nt.midis.length;
    const bank = ins.bank && BANKS[ins.bank];
    for (const m of nt.midis) {
      if (bank) { addSampled(buf, ins, bank, m, Math.max(0.05, nt.dur), nt.gain / Math.sqrt(voices), nt.t, { trem: !!nt.trem, nong: nt.nong !== false }); continue; }
      // 뜯는 악기는 길이와 상관없이 비슷하므로 길이를 묶어 재사용
      const dk = ins.kind === 'pluck' || ins.kind === 'piano' ? Math.min(40, Math.round(nt.dur * 8)) / 8 : Math.round(nt.dur * 40) / 40;
      const opt = { trem: !!nt.trem, nong: nt.nong !== false };
      const ck = nt.inst + '|' + m + '|' + dk + (opt.trem ? 't' : '') + (opt.nong ? '' : 'x') + (ins.bank && BANKS[ins.bank] ? 'b' : '');
      let s = cache.get(ck);
      if (!s) {
        s = synthNote(nt.inst, m, Math.max(0.05, opt.trem ? Math.round(nt.dur * 40) / 40 : dk), 1, opt);
        // 휴대폰 메모리: 저장해 두는 소리는 모두 합쳐 약 600만 표본(24MB)까지만
        cacheSize += s.length; cache.set(ck, s);
        while (cacheSize > 6e6 && cache.size > 1) { const [k0, v0] = cache.entries().next().value; cache.delete(k0); cacheSize -= v0.length; }
      }
      add(buf, s, nt.t, nt.gain / Math.sqrt(voices));
    }
    if (nt.graces) nt.graces.forEach((m, i) => {
      const s = synthNote(nt.inst, m, 0.07, 1);
      add(buf, s.subarray(0, Math.round(0.11 * SR)), nt.t - 0.07 * (nt.graces.length - i), nt.gain * 0.6);
    });
    if (onProgress && (++done % 200 === 0)) onProgress(done / notes.length);
  }
}
function add(buf, s, t, g) {
  const i0 = Math.round(t * SR); if (i0 >= buf.length) return;
  const st = Math.max(0, -i0), m = Math.min(s.length, buf.length - i0);
  for (let i = st; i < m; i++) buf[i0 + i] += s[i] * g;
}
