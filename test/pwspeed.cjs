const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
 const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
 await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
 await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
 await p.addInitScript(() => { const O = window.Audio; window.Audio = function (...a) { const e = new O(...a); window.__au = e; return e; }; window.Audio.prototype = O.prototype; });
 await p.goto('file://' + (process.argv[3] || '/home/claude/web/deploy-hapju/index.html')); await p.setInputFiles('#pdfInput', pick(process.argv[2] || 'b3a31a97'));
 await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && !document.body.classList.contains('welcome'), null, { timeout: 90000 }); await p.waitForTimeout(1200);
 const A = () => p.evaluate(() => { const a = window.__au; return { src: a.src, rate: a.playbackRate, t: a.currentTime, paused: a.paused, now: document.getElementById('nowText').textContent }; });
 const waitPlay = () => p.waitForFunction(() => /마디|카운트/.test(document.getElementById('nowText').textContent) && !/만드는/.test(document.getElementById('nowText').textContent), null, { timeout: 120000 });
 let s = Date.now(); await p.click('#playBtn'); await waitPlay(); console.log('first play', Date.now() - s, 'ms');
 await p.waitForTimeout(6000);
 const a0 = await A(); const bar0 = +(a0.now.match(/^(\d+)/) || [])[1];
 s = Date.now(); await p.click('#dockSpdDown'); await p.waitForTimeout(100); const a1 = await A();
 ok(!a1.paused && /마디/.test(a1.now), 'keeps playing right after speed − (' + a1.now.slice(0, 25) + ')');
 ok(Math.abs(a1.rate - 0.95) < 0.01, 'instant rate 0.95 → ' + a1.rate);
 await p.waitForFunction(src => window.__au.src !== src && !window.__au.paused, a0.src, { timeout: 60000 }); console.log('swapped after', Date.now() - s, 'ms');
 await p.waitForTimeout(400); const a2 = await A(); const bar2 = +(a2.now.match(/^(\d+)/) || [])[1];
 ok(Math.abs(a2.rate - 1) < 0.001, 'after swap rate 1 → ' + a2.rate);
 ok(bar2 >= bar0 && bar2 <= bar0 + 4, `bar continuity ${bar0} → ${bar2}`);
 ok(/95%/.test(await p.textContent('#dockSpd')), 'dock shows 95%');
 // paused path: stop, speed +, play → instant
 await p.click('#barsStopBtn'); await p.waitForTimeout(300);
 await p.click('#dockSpdUp'); await p.click('#dockSpdUp'); s = Date.now(); await p.click('#playBtn'); await waitPlay(); const dt = Date.now() - s;
 ok(dt < 600, 'play right after speed change while stopped: ' + dt + 'ms'); const a3 = await A(); ok(Math.abs(a3.rate - 105 / 95) < 0.01, 'rate ' + a3.rate.toFixed(3));
 await p.waitForFunction(() => Math.abs(window.__au.playbackRate - 1) < 0.001, null, { timeout: 60000 }); ok(true, 'swapped to real 105% sound');
 // other setting changed during background build → full rebuild on next play, no stale swap
 await p.click('#barsStopBtn'); await p.click('#dockSpdDown'); await p.waitForTimeout(500);
 await p.evaluate(() => { const c = document.getElementById('optMetro'); c.checked = !c.checked; c.dispatchEvent(new Event('change', { bubbles: true })); });
 s = Date.now(); await p.click('#playBtn'); await waitPlay(); console.log('play after other change', Date.now() - s, 'ms');
 await p.waitForTimeout(3000); const a4 = await A(); ok(Math.abs(a4.rate - 1) < 0.001 && !a4.paused, 'metronome change → rebuilt, rate 1');
 // ramp + speed change while playing
 await p.click('#barsStopBtn'); await p.evaluate(() => { const l = document.getElementById('optLoop'); l.checked = true; l.dispatchEvent(new Event('change')); const r = document.getElementById('optRamp'); r.checked = true; r.dispatchEvent(new Event('change')); });
 await p.click('#playBtn'); await waitPlay(); await p.waitForTimeout(800); const r0 = await A(); ok(Math.abs(r0.rate - 0.7) < 0.01, 'ramp 70% rate ' + r0.rate);
 await p.click('#dockSpdUp'); await p.waitForTimeout(100); const r1 = await A(); ok(Math.abs(r1.rate - 0.7 * 100 / 95) < 0.01, 'ramp×speed rate ' + r1.rate.toFixed(3) + ' ' + r1.now.slice(0, 40));
 await p.waitForFunction(() => Math.abs(window.__au.playbackRate - 0.7) < 0.001, null, { timeout: 60000 }); const r2 = await A(); ok(/1번째/.test(r2.now), 'ramp lap still 1 after swap: ' + r2.now.slice(0, 40));
 // pause → speed → resume continues from same bar
 await p.waitForTimeout(12000); await p.keyboard.press('Space'); await p.waitForTimeout(200); const pz = await p.textContent('#nowText'); const pb = +(pz.match(/(\d+)/) || [])[1];
 await p.click('#dockSpdDown'); await p.waitForTimeout(200); await p.keyboard.press('Space'); await p.waitForTimeout(400); const rs = await A(); const rb = +(rs.now.match(/^(\d+)/) || [])[1];
 ok(!rs.paused && (pz.includes('카운트') || isNaN(pb) ? true : rb >= pb && rb <= pb + 1), `resume after speed change: [${pz}] → [${rs.now}]`);
 await p.waitForTimeout(4000); const rs2 = await A(); ok(!rs2.paused && Math.abs(rs2.rate - 0.7) < 0.001, 'swapped after resume, rate ' + rs2.rate);
 ok(errs.length === 0, 'no errors ' + errs.join(' | '));
 await b.close(); })();
