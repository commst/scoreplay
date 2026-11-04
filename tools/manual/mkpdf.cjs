const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file:///home/claude/work/manual/manual.html'); await p.waitForTimeout(1500);
 await p.pdf({ path: '/home/claude/work/manual/manual.pdf', format: 'A4', printBackground: true, displayHeaderFooter: true,
   headerTemplate: '<div></div>',
   footerTemplate: '<div style="width:100%;font-size:8px;color:#8a90a0;text-align:center;font-family:Noto Sans CJK KR">합주연습기 사용설명서 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
   margin: { top: '16mm', bottom: '18mm', left: '15mm', right: '15mm' } });
 await b.close(); })();
