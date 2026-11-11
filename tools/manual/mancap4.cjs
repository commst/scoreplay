const { chromium } = require('playwright'); const fs = require('fs');
const SM = '/home/claude/samples/', pick = p => SM + fs.readdirSync(SM).find(f => f.startsWith(p));
const O = '/home/claude/work/manual/img/';
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' })).newPage();
 await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
 await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  // 글꼴: 작업 공간에서는 CDN에 못 닿으므로 npm으로 받은 파일 (/home/claude/work/fonts에서 npm i pretendard@1.3.9 @fontsource-variable/outfit)
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: '/home/claude/work/fonts/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const fp = '/home/claude/work/fonts/node_modules/pretendard/dist/web/variable/' + r.request().url().split('/variable/')[1].replace('.min.css', '.css'); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
 await p.goto('file:///home/claude/web/deploy-hapju/index.html'); await p.setInputFiles('#pdfInput', pick('b3a31a97'));
 await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 90000 }); await p.waitForTimeout(800);
 await p.click('#viewMap'); await p.waitForTimeout(500);
 // 위쪽: 보기 단추·요약 (경고 목록은 몇 줄만)
 const st = await p.locator('#stage .bars-panel').boundingBox();
 await p.screenshot({ path: O + '16a_map_top.png', clip: { x: st.x, y: st.y, width: st.width, height: 330 } });
 // 마디 칸: 마디 미리보기 단추가 화면 위쪽에 오게 스크롤
 const sc = async sel => { await p.evaluate(s => { const e = document.querySelector(s); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70); }, sel); await p.waitForTimeout(400); };
 await sc('.bar-view-settings');
 const clipCells = async (n, h = 560) => { const bv = await p.locator('.bar-view-settings').boundingBox(); await p.screenshot({ path: O + n, clip: { x: bv.x - 10, y: bv.y - 10, width: bv.width + 20, height: h } }); };
 await clipCells('16b_map_cells.png');
 // 마우스를 올린 마디 미리보기 (32마디)
 const cell = p.locator('#bars .b[data-n="32"]'); await cell.hover(); await p.waitForTimeout(700);
 await p.screenshot({ path: O + '16d_bar_tip.png' });
 await p.mouse.move(5, 5); await p.waitForTimeout(600);
 // 상세 보기
 await p.click('#barViewDetail'); await p.waitForTimeout(500); await sc('.bar-view-settings'); await clipCells('16c_map_detail.png');
 await p.click('#barViewTimeline'); await p.waitForTimeout(300);
 // 재생 중 노란 마디
 await p.locator('#bars .b[data-n="33"]').click({ position: { x: 20, y: 12 } }); await p.waitForTimeout(9000); await p.mouse.move(5, 5);
 await sc('#bars .b.now'); await p.waitForTimeout(300); const now = await p.locator('#bars .b.now').boundingBox();
 const bv = await p.locator('#bars').boundingBox(); await p.screenshot({ path: O + '16e_map_play.png', clip: { x: bv.x - 10, y: Math.max(60, now.y - 140), width: bv.width + 20, height: 360 } });
 console.log('ok'); await b.close(); })();
