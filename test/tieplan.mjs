// 159번 재발 막기: 재생 계획(renderPlan)의 붙임줄 잇기 — node test/tieplan.mjs (PDF 필요 없음)
import { renderPlan } from '../src/audio-engine.js';
let bad = 0; const ok = (n, c, x) => { if (!c) { bad++; console.log('FAIL', n, x || ''); } else console.log('ok  ', n); };
const F = v => ({ v }), ev = (t, dur, midis, extra) => ({ voice: 'L', t: F(t), dur: F(dur), midis, line: 'a', ...extra });
const bar = (number, events) => ({ number, barLen: F(1), events, warnings: [] });
const plan = bars => renderPlan(bars, bars.map((_, i) => i), { tempoRows: [{ start: 1, unit: 'q', bpm: 60 }], speed: 1, sounds: {}, melodic: { a: { inst: 'piri', oct: 0 } }, lineGain: {}, countIn: false, human: false });
const near = (a, b) => Math.abs(a - b) < 0.02, by = (p, m) => p.notes.filter(n => n.midis.includes(m));
// ① 화음 세 음 중 둘이 음마다 따로 적힌 붙임줄로 이어짐(방황 피리 64→65마디): 68·60은 8초, 65는 4초, 64는 새로
let p = plan([bar(1, [ev(0, 1, [68, 60, 65])]), bar(2, [ev(0, 1, [64]), ev(0, 1, [68], { tie: true }), ev(0, 1, [60], { tie: true })])]);
ok('① 68은 한 번만 치고 두 마디 길이', by(p, 68).length === 1 && near(by(p, 68)[0].dur, 8), JSON.stringify(by(p, 68).map(n => [n.t, n.dur])));
ok('① 60도 한 번만 치고 두 마디 길이(붙임줄이 음마다 따로 적혀도)', by(p, 60).length === 1 && near(by(p, 60)[0].dur, 8), JSON.stringify(by(p, 60).map(n => [n.t, n.dur])));
ok('① 이어지지 않은 65는 한 마디만', by(p, 65).length === 1 && near(by(p, 65)[0].dur, 4));
ok('① 새 음 64는 침', by(p, 64).length === 1);
// ② 세 마디에 걸쳐 이어짐
p = plan([bar(1, [ev(0, 1, [70, 62])]), bar(2, [ev(0, 1, [70], { tie: true }), ev(0, 1, [62], { tie: true })]), bar(3, [ev(0, 1, [70], { tie: true }), ev(0, 1, [62], { tie: true })])]);
ok('② 두 음 모두 한 번만, 세 마디 길이', by(p, 70).length === 1 && by(p, 62).length === 1 && near(by(p, 70)[0].dur, 12) && near(by(p, 62)[0].dur, 12), JSON.stringify(p.notes.map(n => [n.midis, n.t, n.dur])));
// ③ 사이에 다른 줄 음이 아주 많아도(예전 60음 제한) 이어짐
const many = Array.from({ length: 100 }, (_, i) => ({ ...ev(i / 100, 1 / 100, [50 + i % 12]), line: 'b' }));
p = renderPlan([bar(1, [ev(0, 1, [72]), ...many]), bar(2, [ev(0, 1, [72], { tie: true })])], [0, 1], { tempoRows: [{ start: 1, unit: 'q', bpm: 60 }], speed: 1, sounds: {}, melodic: { a: { inst: 'piri', oct: 0 }, b: { inst: 'gayageum', oct: 0 } }, lineGain: {}, countIn: false, human: false });
ok('③ 다른 줄 음 100개 뒤에도 이어짐', p.notes.filter(n => n.line === 'a').length === 1 && near(p.notes.find(n => n.line === 'a').dur, 8));
// ④ 앞 음이 없는 붙임줄은 새 음으로 침(버리지 않음)
p = plan([bar(1, [ev(0, 0.5, [60])]), bar(2, [ev(0, 1, [67], { tie: true })])]);
ok('④ 이을 앞 음이 없으면 새로 침', by(p, 67).length === 1);
console.log(bad ? `${bad} FAIL` : 'ALL OK'); process.exit(bad ? 1 : 0);
