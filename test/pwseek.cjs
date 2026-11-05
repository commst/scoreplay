// 진행 막대 끌기: node pwseek.cjs [desktop|phone]
const { chromium } = require('playwright'); const fs = require('fs');
const MODE = process.argv[2] || 'desktop';
const SM = '/home/claude/samples/', pick = p => { const s = SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(s, t); return t; }   // 한글 파일 이름은 setInputFiles가 올리지 못해 영어 이름으로 복사;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
 const vp = MODE === 'phone' ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 860 } };
 const p = await (await b.newContext(vp)).newPage();
 const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
 await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
 await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
 await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.setInputFiles('#pdfInput', pick('b3a31a97'));
 await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && !document.body.classList.contains('welcome'), null, { timeout: 90000 }); await p.waitForTimeout(1200);
 if (MODE === 'phone') { await p.evaluate(() => document.body.classList.remove('sheet-open')); }
 const box = await p.locator('#track').boundingBox(); const y = box.y + box.height / 2;
 const cdp = MODE === 'phone' ? await p.context().newCDPSession(p) : null;
 const touch = async (type, x) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
 const down = x => cdp ? touch('touchStart', x) : (p.mouse.move(x, y), p.mouse.down());
 const move = x => cdp ? touch('touchMove', x) : p.mouse.move(x, y, { steps: 4 });
 const up = () => cdp ? touch('touchEnd') : p.mouse.up();
 const now = () => p.textContent('#nowText');
 // 1) 소리를 만들기 전에 막대 중간을 누르면: 만든 뒤 그 근처부터
 await down(box.x + box.width * 0.5); await up();
 await p.waitForFunction(() => /\d+마디/.test(document.getElementById('nowText').textContent) && !/만드는/.test(document.getElementById('nowText').textContent), null, { timeout: 120000 }); await p.waitForTimeout(600);
 const n1 = await now(); const bar1 = +n1.match(/(\d+)마디/)[1]; ok(bar1 > 20, 'before render: tap middle → plays from ' + n1.slice(0, 30));
 // 2) 재생 중 끌기: 끄는 동안 마디 표시, 손 떼면 그 마디부터
 await down(box.x + box.width * 0.2); await move(box.x + box.width * 0.6); await p.waitForTimeout(150);
 const tip = await p.evaluate(() => { const t = document.getElementById('trackTip'); return { hidden: t.hidden, txt: t.textContent }; });
 ok(!tip.hidden && /^\d+마디 · \d+:\d\d$/.test(tip.txt), 'tooltip while dragging: ' + tip.txt);
 if (MODE !== 'phone') await p.screenshot({ path: '/home/claude/work/seek_drag.png', clip: { x: 0, y: 860 - 160, width: 1280, height: 160 } });
 else await p.screenshot({ path: '/home/claude/work/seek_drag_phone.png', clip: { x: 0, y: 844 - 220, width: 390, height: 220 } });
 await up(); await p.waitForTimeout(700);
 const n2 = await now(); const want = +tip.txt.match(/^(\d+)/)[1], got = +(n2.match(/(\d+)마디/) || [])[1];
 ok(got >= want && got <= want + 1, `after release plays bar ${got} (tooltip said ${want})`);
 ok(await p.evaluate(() => document.getElementById('trackTip').hidden), 'tooltip hidden after release');
 // 3) 앞으로 끌기(왼쪽) 
 await down(box.x + box.width * 0.6); await move(box.x + box.width * 0.05); await p.waitForTimeout(100); const tip3 = await p.textContent('#trackTip'); await up(); await p.waitForTimeout(700);
 const n3 = await now(); ok(/카운트인|^\s*[1-9]마디|^[1-9]\D/.test(n3) || +(n3.match(/(\d+)마디/) || [0, 99])[1] <= +(tip3.match(/(\d+)/) || [0, 99])[1] + 1, `drag back: tip ${tip3} → ${n3.slice(0, 25)}`);
 // 4) 키보드 → (컴퓨터만)
 if (MODE !== 'phone') {
   await p.waitForTimeout(1500); const before = +((await now()).match(/(\d+)마디/) || [0, 0])[1];
   await p.focus('#track'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); const after = +((await now()).match(/(\d+)마디/) || [0, 0])[1];
   ok(after === before + 1 || after === before + 2, `→ key: ${before} → ${after}`);
   const vt = await p.getAttribute('#track', 'aria-valuetext'); ok(/마디/.test(vt), 'aria-valuetext ' + vt);
 }
 // 5) 일시정지 중 끌기 → 그 자리부터 재생
 await p.click('#playBtn'); await p.waitForTimeout(300); ok(/일시정지/.test(await now()), 'paused');
 await down(box.x + box.width * 0.8); await up(); await p.waitForTimeout(700); const n5 = await now(); ok(/\d+마디 ·/.test(n5) && !/일시정지/.test(n5), 'drag while paused → plays ' + n5.slice(0, 25));
 // 6) 페이지가 끌기로 스크롤되지 않음
 ok(await p.evaluate(() => getComputedStyle(document.getElementById('track')).touchAction) === 'none', 'touch-action none');
 ok(errs.length === 0, 'no errors ' + errs.join(' | '));
 await b.close(); })();
