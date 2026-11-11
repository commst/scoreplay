// 화면 그림: 첫 화면·악보 올린 뒤 위 막대 (컴퓨터·휴대폰, 밝은·어두운) → /tmp/shot-<이름>.png
// node test/pwshot.cjs [접두어(기본 before)]
const { chromium } = require('playwright'); const fs = require('fs');
const tag = process.argv[2] || 'before', pre = '9203ad49', SM = process.env.SAMPLES || '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch();
 for (const [nm, vp, dark] of [['desk', { width: 1280, height: 860 }, false], ['laptop', { width: 1024, height: 700 }, false], ['wide', { width: 1600, height: 900 }, false], ['phone', { width: 390, height: 844 }, false], ['desk-dark', { width: 1280, height: 860 }, true], ['phone-dark', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: nm.startsWith('phone'), hasTouch: nm.startsWith('phone'), colorScheme: dark ? 'dark' : 'light', deviceScaleFactor: 2 }); const p = await ctx.newPage();
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  // 글꼴: 작업 공간에서는 CDN에 못 닿으므로 npm으로 받은 파일로 (/home/claude/work/fonts: npm i pretendard@1.3.9 @fontsource-variable/outfit)
  const FD = '/home/claude/work/fonts/node_modules/';
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const f = r.request().url().split('/variable/')[1].replace('.min.css', '.css'); const fp = FD + 'pretendard/dist/web/variable/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: FD + '@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|fonts\.g|commst\.github\.io).*/, r => r.abort());
  await p.route('https://commst.github.io/scoreplay/**', r => { const f = r.request().url().split('/scoreplay/')[1].split('?')[0] || 'index.html'; const fp = '/home/claude/scoreplay/' + f; return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.goto('https://commst.github.io/scoreplay/'); await p.waitForFunction(() => window.__appReady === 'ok'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(900);
  await p.screenshot({ path: `/tmp/shot-${tag}-${nm}-welcome.png`, fullPage: nm.startsWith('phone') });
  if (dark) { await ctx.close(); continue; }
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 2 && !document.body.classList.contains('welcome'), null, { timeout: 150000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  await p.screenshot({ path: `/tmp/shot-${tag}-${nm}-loaded.png` });
  await ctx.close();
 }
 await b.close();
})();
