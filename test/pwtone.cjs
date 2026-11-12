// 음색 · 기본 음량 탭(158번): 탭·카드, 막대 → 저장(localStorage hapju-tone)·요약, 들어보기 소리가 값대로 바뀌는지, 실제 재생 소리(buildAudio)에 반영되는지, 되돌리기
// NODE_PATH=/opt/npm-tools/node_modules node test/pwtone.cjs [index.html]
const { chromium } = require('playwright'); const fs = require('fs');
const html = require('path').resolve(process.argv[2] || 'index.html');
const pre = process.env.PRE || '9203ad49', SM = process.env.SAMPLES || '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
 for (const [name, vp] of [['desktop', { width: 1280, height: 860 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, hasTouch: name === 'phone', isMobile: name === 'phone' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + html); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  // 탭 열기
  if (name === 'phone') await p.click('.dtab[data-tab=tone]'); else await p.click('#tab-tone'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('pane-tone').classList.contains('on') && document.getElementById('tab-tone').getAttribute('aria-selected') === 'true'), name + ' 음색 탭 열림');
  ok(await p.evaluate(() => { const tabs = [...document.querySelectorAll('.tab2')]; return tabs.length === 5 && tabs.every(e => e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().width > 30); }), name + ' 탭 다섯 개가 잘리지 않음');
  ok((await p.$$eval('.tone-card', e => e.length)) === 29 && (await p.textContent('#toneState')) === '모두 기본값' && await p.$eval('#toneResetAll', e => e.disabled), name + ' 카드 29개(전체 1·선율 13·타악 15), 처음은 모두 기본값');
  await p.click('#toneExpand'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => { const sb = document.getElementById('sidebar'); return sb.scrollWidth <= sb.clientWidth + 1 && [...document.querySelectorAll('.tone-card .trow, .tone-card .tbtns')].every(r => { const a = r.getBoundingClientRect(), c = r.closest('.tone-card').getBoundingClientRect(); return a.left >= c.left - 1 && a.right <= c.right + 1; }); }), name + ' 모두 펼쳐도 옆으로 넘치지 않음');
  ok(await p.evaluate(() => !document.querySelector('.tone-card[data-kind=master] input[id$="-vol"]') && document.querySelectorAll('.tone-card[data-kind=master] input[type=range]').length === 3 && document.querySelectorAll('.tone-card[data-id=gayageum] input[type=range]').length === 4), name + ' 전체는 음색 3칸, 악기는 음량+음색 4칸');
  const set = (kind, id, f, v) => p.evaluate(([kind, id, f, v]) => { const c = document.querySelector(`.tone-card[data-kind="${kind}"][data-id="${id}"]`), i = [...c.querySelectorAll('input[type=range]')].find(e => e.id.endsWith('-' + f)); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [kind, id, f, v]);
  const demo = (kind, id) => p.evaluate(async ([kind, id]) => { const x = await window.__toneDemo(kind, id); let s = 0, hf = 0, lf = 0, lp = 0; for (let i = 2; i < x.length; i++) { s += x[i] * x[i]; const d = x[i] - 2 * x[i - 1] + x[i - 2]; hf += d * d; lp += (x[i] - lp) * 0.02; lf += lp * lp; } return { rms: Math.sqrt(s / x.length), hf: Math.sqrt(hf / x.length), lf: Math.sqrt(lf / x.length) }; }, [kind, id]);
  const ls = () => p.evaluate(() => JSON.parse(localStorage.getItem('hapju-tone') || 'null'));
  // 선율: 음량
  const d0 = await demo('inst', 'daegeum');
  await set('inst', 'daegeum', 'vol', 150);
  let L = await ls();
  ok(L && L.inst.daegeum && L.inst.daegeum.vol === 150 && Object.keys(L.inst.daegeum).length === 1, name + ' 대금 음량 150 저장 ' + JSON.stringify(L));
  ok(await p.evaluate(() => { const c = document.querySelector('.tone-card[data-id=daegeum]'); return c.classList.contains('changed') && /음량 150%/.test(c.querySelector('.tsum').textContent) && !c.querySelector('[data-act=reset]').disabled; }) && (await p.textContent('#toneState')) === '바꾼 값 있음' && !(await p.$eval('#toneResetAll', e => e.disabled)), name + ' 카드 요약·바꾼 표시');
  ok(await p.evaluate(() => window.__st.dirty === true), name + ' 바꾸면 다음 재생에 다시 만듦(dirty)');
  const d1 = await demo('inst', 'daegeum'), r1 = d1.rms / d0.rms;
  ok(r1 > 1.85 && r1 < 2.05, name + ' 들어보기: 150% → 약 1.96배 (' + r1.toFixed(2) + ')');
  // 선율: 높은음 +6 / 낮은음 −6
  await set('inst', 'daegeum', 'vol', 100); await set('inst', 'daegeum', 'hi', 6);
  const d2 = await demo('inst', 'daegeum');
  ok(d2.hf / d0.hf > 1.25 && Math.abs(d2.lf / d0.lf - 1) < 0.1, name + ' 높은음 +6dB → 높은 대역만 커짐 (' + (d2.hf / d0.hf).toFixed(2) + ', 낮은 ' + (d2.lf / d0.lf).toFixed(2) + ')');
  await p.evaluate(() => document.querySelector('.tone-card[data-id=daegeum] [data-act=reset]').click());
  const d3 = await demo('inst', 'daegeum'); L = await ls();
  ok(Math.abs(d3.rms / d0.rms - 1) < 0.01 && Math.abs(d3.hf / d0.hf - 1) < 0.01 && !L.inst.daegeum && (await p.textContent('#toneState')) === '모두 기본값', name + ' [기본값으로] → 처음 소리와 같음');
  // 합성음에도 적용(녹음 뱅크가 없는 _syn)
  // 타악: 음량·음색
  const j0 = await demo('perc', '장구');
  await set('perc', '장구', 'vol', 50); const j1 = await demo('perc', '장구');
  ok(Math.abs(j1.rms / j0.rms - 0.316) < 0.03, name + ' 장구 50% → 약 0.32배 (' + (j1.rms / j0.rms).toFixed(3) + ')');
  await set('perc', '장구', 'vol', 100); await set('perc', '장구', 'lo', 6); const j2 = await demo('perc', '장구');
  ok(j2.lf / j0.lf > 1.3 && Math.abs(j2.hf / j0.hf - 1) < 0.1, name + ' 장구 낮은음 +6dB → 낮은 대역만 커짐 (' + (j2.lf / j0.lf).toFixed(2) + ', 높은 ' + (j2.hf / j0.hf).toFixed(2) + ')');
  const g0 = await demo('perc', '꽹과리'); ok(g0.rms > 0.01, name + ' 다른 타악 묶음은 그대로 소리 남');
  // 전체
  const m0 = await demo('master', 'all'); await set('master', 'all', 'hi', -6); const m1 = await demo('master', 'all');
  ok(m1.hf / m0.hf < 0.8, name + ' 전체 높은음 −6dB → 높은 대역 줄어듦 (' + (m1.hf / m0.hf).toFixed(2) + ')');
  // 들어보기 단추: 재생 → 멈춤
  await p.evaluate(() => document.querySelector('.tone-card[data-id=gayageum] [data-act=play]').click());
  await p.waitForFunction(() => /멈춤/.test(document.querySelector('.tone-card[data-id=gayageum] [data-act=play]').textContent), null, { timeout: 20000 }).catch(() => {});
  ok(await p.evaluate(() => document.querySelector('.tone-card[data-id=gayageum] [data-act=play]').classList.contains('playing')), name + ' [▶ 들어보기] → ■ 멈춤');
  await p.evaluate(() => document.querySelector('.tone-card[data-id=gayageum] [data-act=play]').click()); await p.waitForTimeout(200);
  ok(await p.evaluate(() => /들어보기/.test(document.querySelector('.tone-card[data-id=gayageum] [data-act=play]').textContent)), name + ' 다시 누르면 멈춤');
  // 모두 기본값으로
  await p.click('#toneResetAll'); await p.waitForTimeout(200); L = await ls();
  ok(JSON.stringify(L) === '{"master":{},"inst":{},"perc":{}}' && (await p.textContent('#toneState')) === '모두 기본값' && (await p.$$eval('.tone-card.changed', e => e.length)) === 0, name + ' [모두 기본값으로]');
  // 실제 재생 소리: 크기 맞추기를 끄고(__rawLevel) 1~4마디를 만들어 견줌. 켠 악기 모두를 50%로 → 전체가 약 0.32배
  const render = () => p.evaluate(async () => {
    window.__rawLevel = 0.2; for (const id of ['optCount', 'optMetro', 'sHuman']) { const e = document.getElementById(id); if (e.checked) e.click(); }
    const f = document.getElementById('from'), t = document.getElementById('to'); f.value = 1; f.dispatchEvent(new Event('change', { bubbles: true })); t.value = 4; t.dispatchEvent(new Event('change', { bubbles: true }));
    const st = window.__st; st.dirty = true; document.getElementById('playBtn').click();
    for (let i = 0; i < 600 && !(st.rendered && !st.dirty && st.playing); i++) await new Promise(r => setTimeout(r, 100));
    document.getElementById('playBtn').click();
    const ab = await st.rendered.blob.arrayBuffer(), dv = new DataView(ab); let s = 0, n = 0, hf = 0, pv = 0, pv2 = 0; const ch = dv.getUint16(22, true) || 1;   // 좌우 두 줄이면 왼쪽 줄만으로 높은 대역을 잼(번갈아 놓인 좌우를 이어 재면 좌우 차이가 섞임)
    for (let o = 44, k = 0; o + 1 < ab.byteLength; o += 2, k++) { const v = dv.getInt16(o, true) / 32768; s += v * v; n++; if (k % ch) continue; const d = v - 2 * pv + pv2; hf += d * d; pv2 = pv; pv = v; } return { rms: Math.sqrt(s / n), hf: Math.sqrt(hf / n), n };
  });
  const R0 = await render();
  await p.evaluate(() => { const o = { master: {}, inst: {}, perc: {} }; for (const c of document.querySelectorAll('.tone-card')) if (c.dataset.kind !== 'master') o[c.dataset.kind][c.dataset.id] = { vol: 50 }; localStorage.setItem('hapju-tone', JSON.stringify(o)); });
  await p.reload(); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && window.__st.score, null, { timeout: 150000 }).catch(() => {}); await p.waitForTimeout(1500);
  if (!(await p.evaluate(() => !!window.__st.score))) { await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1200); }
  ok((await p.$$eval('.tone-card.changed', e => e.length)) === 28, name + ' 다시 열어도 저장한 값이 남음(28개 바뀜)');
  const R1 = await render();
  ok(R0.rms > 0.002 && Math.abs(R1.rms / R0.rms - 0.316) < 0.03 && R1.n === R0.n, name + ' 재생 소리: 모든 악기 50% → 약 0.32배 (' + (R1.rms / R0.rms).toFixed(3) + ', 처음 rms ' + R0.rms.toFixed(4) + ')');
  await p.evaluate(() => { localStorage.setItem('hapju-tone', JSON.stringify({ master: { hi: -6 }, inst: {}, perc: {} })); });
  await p.reload(); await p.waitForFunction(() => window.__appReady === 'ok'); await p.waitForFunction(() => window.__st.score, null, { timeout: 150000 }).catch(() => {}); await p.waitForTimeout(1500);
  if (!(await p.evaluate(() => !!window.__st.score))) { await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1200); }
  const R2 = await render();
  ok(R2.hf / R0.hf < 0.8, name + ' 재생 소리: 전체 높은음 −6dB → 높은 대역 줄어듦 (' + (R2.hf / R0.hf).toFixed(2) + ', rms ' + (R2.rms / R0.rms).toFixed(3) + ', 저장값 ' + await p.evaluate(() => localStorage.getItem('hapju-tone')) + ')');
  // 곡 설정 파일에는 들어가지 않음
  ok(await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hapju-settings:')).every(k => !/"tone"|hapju-tone/.test(localStorage.getItem(k)))), name + ' 곡 설정에는 넣지 않음');
  ok(errs.length === 0, name + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await ctx.close(); }
 await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); })();
