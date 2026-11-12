// 앱에서 줄을 켜고 그 줄의 마디 사건(세로 맞춤 뒤) 보기: node test/_pwbar.cjs <접두어> <줄 이름 부분> <마디…>
const { chromium } = require('playwright'); const fs = require('fs');
const [pre, nm, ...bars] = process.argv.slice(2), SM = '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); p.on('pageerror', e => console.log('ERR', e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + require('path').resolve('index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(1500);
  await p.click('#allOn').catch(()=>{}); await p.waitForTimeout(4000);
  const out = await p.evaluate(([nm, bars]) => { const st = window.__st; const r = [];
    for (const [k, v] of Object.entries(st.lineRaw || {})) { if (!/9|10/.test(k)) continue; for (const n of bars) { const b = v.bars.find(x => x.number == n); if (b) r.push(k + ' ' + n + ' ' + b.barLen + ' ' + b.events.map(e => e.voice + e.t + '[' + (e.midis || []).join('.') + ']').join(' ')); } }
    return r; }, [nm, bars]);
  console.log(JSON.stringify(out)); await b.close(); })();
