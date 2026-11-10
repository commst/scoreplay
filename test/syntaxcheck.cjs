// 옛 브라우저 문법 검사: node test/syntaxcheck.cjs <index.html> [ES판=2020]
// 앱의 스크립트가 지정한 ECMAScript 판 문법만 쓰는지 본다. 판을 넘는 문법(예: ??= 는 ES2021)이 하나라도 있으면
// 그 브라우저(Safari 13.x·Chrome 80~84 등)는 스크립트 전체를 읽지 못해 앱이 시작되지 않는다(113번).
// acorn은 NODE_PATH 또는 /opt/npm-tools/node_modules 에서 찾는다. 없으면 건너뜀(종료 코드 0)
let acorn; try { acorn = require('acorn'); } catch (e) { try { acorn = require('/opt/npm-tools/node_modules/acorn'); } catch (e2) { console.log('syntaxcheck: acorn 없음 — 건너뜀'); process.exit(0); } }
const fs = require('fs');
const [file, ver = '2020'] = process.argv.slice(2);
const html = fs.readFileSync(file, 'utf8'); const re = /<script([^>]*)>([\s\S]*?)<\/script>/g; let m, bad = 0;
while ((m = re.exec(html))) {
  if (/text\/plain|application\/json/.test(m[1]) || !m[2].trim()) continue;
  try { acorn.parse(m[2], { ecmaVersion: +ver, sourceType: /module/.test(m[1]) ? 'module' : 'script' }); }
  catch (e) { bad++; const l = html.slice(0, m.index).split('\n').length + (e.loc ? e.loc.line - 1 : 0); console.log(`syntaxcheck: ES${ver}을 넘는 문법 — index.html ${l}줄: ${e.message}\n  ${(html.split('\n')[l - 1] || '').trim().slice(0, 160)}`); }
}
if (bad) process.exit(1); console.log(`syntaxcheck: ES${ver} 문법 OK`);
