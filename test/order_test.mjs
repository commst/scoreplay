import { playbackOrder, orderToText, parseOrderText } from '../src/score-parser.js';
const mk = (n, f = {}) => Array.from({ length: n }, (_, i) => ({ number: i + 1, labels: [], ...(f[i + 1] || {}) }));
const show = (name, bars, want, opts) => {
  const got = orderToText(bars, playbackOrder(bars, opts));
  console.log((got === want ? 'OK  ' : 'FAIL') + ' ' + name + ' → ' + got + (got === want ? '' : '   (기대: ' + want + ')'));
};
// 1. 1·2번 괄호
show('1·2번 괄호', mk(6, { 1: { repeatStart: true }, 4: { volta: [1], repeatEnd: true }, 5: { volta: [2] } }), '1-4, 1-3, 5-6');
// 2. 1.2. / 3. 괄호 (세 번 반복)
show('1.2./3. 괄호', mk(5, { 1: { repeatStart: true }, 3: { volta: [1, 2], repeatEnd: true }, 4: { volta: [3] } }), '1-3, 1-3, 1-2, 4-5');
// 3. D.S. al Coda
show('D.S. al Coda', mk(10, { 3: { segno: true }, 5: { toCoda: true }, 8: { ds: true }, 9: { codaStart: true } }), '1-8, 3-5, 9-10');
// 4. D.C. al Fine
show('D.C. al Fine', mk(8, { 4: { fine: true }, 8: { dc: true } }), '1-8, 1-4');
// 5. 도돌이표 + D.S. (돌아간 뒤에는 반복 안 함, 마지막 괄호)
show('반복+D.S.', mk(9, { 2: { segno: true, repeatStart: true }, 4: { volta: [1], repeatEnd: true }, 5: { volta: [2] }, 7: { ds: true, }, 6: { fine: true } }), '1-4, 2-3, 5-7, 2-3, 5-6');
// 6. 괄호 뒤 두 번째 반복 구간(시작 도돌이표 없음)
show('연속 괄호 구간', mk(10, { 1: { repeatStart: true }, 2: { volta: [1], repeatEnd: true }, 3: { volta: [2] }, 4: { repeatStart: true }, 6: { volta: [1], repeatEnd: true }, 7: { volta: [2] } }), '1-2, 1, 3-6, 4-5, 7-10');
// 7. 반복 끔: 마지막 괄호만
show('반복 끔', mk(6, { 1: { repeatStart: true }, 4: { volta: [1], repeatEnd: true }, 5: { volta: [2] } }), '1-3, 5-6', { repeats: false });
// 8. 세뇨 없는 D.S. → 처음으로
show('세뇨 없는 D.S.', mk(4, { 4: { ds: true } }), '1-4, 1-4');
// 순서 글자 해석
const b = mk(12);
console.log(JSON.stringify(parseOrderText('1-4, 1-12, 9', b).order?.map(i => i + 1).join(' ')), parseOrderText('3-1', b).error, parseOrderText('1-20', b).error, parseOrderText('a', b).error);
show('괄호에 겹세로줄', mk(6, { 1: { repeatStart: true }, 4: { volta: [1], repeatEnd: true }, 5: { volta: [2], sectionStart: true } }), '1-4, 1-3, 5-6');
