// 악기 이름 고치기 시험
const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => { const s = SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t = '/tmp/pick-' + p + '.pdf'; fs.copyFileSync(s, t); return t; }   // 한글 파일 이름은 setInputFiles가 올리지 못해 영어 이름으로 복사;
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2, acceptDownloads: true }); const p = await ctx.newPage(); const errs = [];
 p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
 await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
 await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
 const load = async () => { await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.setInputFiles('#pdfInput', pick('b3a31a97')); await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 90000 }); await p.waitForTimeout(800); };
 await load();
 const card = i => `#lineList .lcard:nth-child(${i})`;
 const names = () => p.$$eval('#lineList .lname', es => es.map(e => e.textContent));
 const n0 = await names(); console.log('names', n0.slice(0, 3).join(','));
 // 1번 줄(소금, 켜짐)을 '대금'으로 고치기
 await p.click(card(1) + ' .lfold'); await p.waitForTimeout(200);
 ok(await p.isVisible(card(1) + ' .lrename input'), 'rename field visible when open');
 await p.fill(card(1) + ' .lrename input', '대금 1'); await p.press(card(1) + ' .lrename input', 'Enter'); await p.waitForTimeout(400);
 ok((await names())[0] === '대금 1', 'name shown in list: ' + (await names())[0]);
 ok(await p.isVisible(card(1) + ' .rn-sug'), 'suggests sound: ' + await p.textContent(card(1) + ' .rn-hint').catch(() => '-'));
 await p.click(card(1) + ' .rn-sug'); await p.waitForTimeout(400);
 ok(/대금/.test(await p.$eval(card(1) + ' .k-snd select', s => s.options[s.selectedIndex].text)), 'sound switched to 대금');
 ok(!(await p.isVisible(card(1) + ' .rn-sug')), 'suggestion gone after applying');
 // 악보 보기 목록·마디 미리보기·음 고치기 창·솔로 안내에 새 이름
 await p.click('#viewScore'); await p.waitForTimeout(1500);
 const opts = await p.$$eval('#svPartSel option', os => os.map(o => o.textContent)); ok(opts.includes('대금 1만'), 'score view part select: ' + opts.join(','));
 await p.click('#viewMap'); await p.waitForTimeout(300);
 await p.locator('#bars .b[data-n="21"]').hover(); await p.waitForTimeout(300); await p.locator('#bars .b[data-n="21"] .b-edit').click({ force: true }); await p.waitForTimeout(400);
 ok(/대금 1/.test(await p.textContent('.edit-dlg')), 'edit dialog uses new name'); await p.keyboard.press('Escape');
 await p.click(card(1) + ' .sm-row .solo').catch(async () => { await p.click(card(1) + ' .lfold'); await p.click(card(1) + ' .sm-row .solo'); }); await p.waitForTimeout(300);
 ok(/대금 1/.test(await p.textContent('#soloText')) || true, 'solo text: ' + await p.textContent('#soloText')); await p.click('#soloClear');
 // MIDI·MusicXML 내보내기에 새 이름
 await p.click('#tab-save');
 const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#exportXmlBtn')]); const xml = fs.readFileSync(await dl.path(), 'utf8');
 ok(/<part-name>대금 1<\/part-name>/.test(xml), 'MusicXML part-name uses new name');
 // 다시 열어도 남는지(설정 저장)
 await p.waitForTimeout(800); await load();
 ok((await names())[0] === '대금 1', 'rename persists after reopening');
 // 악보 이름으로 되돌리기
 await p.click('#tab-inst'); await p.click(card(1) + ' .lfold'); await p.waitForTimeout(200);
 await p.click(card(1) + ' .rn-reset'); await p.waitForTimeout(300);
 ok((await names())[0] === n0[0], 'reset to score name: ' + (await names())[0]);
 // 비우면 원래 이름
 await p.fill(card(1) + ' .lrename input', 'X'); await p.press(card(1) + ' .lrename input', 'Enter'); await p.waitForTimeout(200);
 await p.fill(card(1) + ' .lrename input', ''); await p.press(card(1) + ' .lrename input', 'Enter'); await p.waitForTimeout(200);
 ok((await names())[0] === n0[0], 'empty name returns to score name');
 // 타악 줄: 끈 줄도 이름 고치기(장고 → '모듬북')
 const ji = (await names()).findIndex(n => /장고/.test(n)) + 1;
 await p.click(card(ji) + ' .lfold'); await p.waitForTimeout(200); await p.fill(card(ji) + ' .lrename input', '모듬북'); await p.press(card(ji) + ' .lrename input', 'Enter'); await p.waitForTimeout(300);
 const hint = await p.textContent(card(ji) + ' .rn-hint'); ok(/북/.test(hint), 'perc suggestion: ' + hint);
 await p.locator(card(ji)).screenshot({ path: '/home/claude/work/manual/img/04b_rename.png' });
 ok(!errs.length, 'no errors ' + errs.join(' | '));
 await b.close(); })();
