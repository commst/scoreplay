// 선언 전 접근 위험 찾기(113번 같은 문제): node test/tdzcheck.cjs [index.html]
// 앱 모듈 스크립트의 맨 위 let/const/class 이름이, 그 선언보다 앞쪽 코드(함수 안 포함)에서 쓰이는 곳을 모두 보여 준다.
// 함수 안이면 그 함수가 선언 줄보다 먼저 '불리는' 경우에만 오류가 나므로, 목록을 보고 시작할 때 불리는지 확인할 것
let acorn, walk; try { acorn = require('acorn'); walk = require('acorn-walk'); } catch (e) { acorn = require('/opt/npm-tools/node_modules/acorn'); walk = require('/opt/npm-tools/node_modules/acorn-walk'); }
const fs = require('fs'); const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const m = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)][0]; const code = m[1]; const base = html.slice(0, m.index).split('\n').length;
const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'module', locations: true });
const decl = new Map();
for (const n of ast.body) {
  if (n.type === 'VariableDeclaration' && n.kind !== 'var') for (const d of n.declarations) walk.simple({ type: 'Program', body: [], sourceType: 'module' }, {}); 
  if (n.type === 'VariableDeclaration' && n.kind !== 'var') for (const d of n.declarations) { const ids = []; (function f(p) { if (!p) return; if (p.type === 'Identifier') ids.push(p.name); else if (p.type === 'ObjectPattern') p.properties.forEach(q => f(q.value || q.argument)); else if (p.type === 'ArrayPattern') p.elements.forEach(f); else if (p.type === 'AssignmentPattern') f(p.left); else if (p.type === 'RestElement') f(p.argument); })(d.id); ids.forEach(id => decl.set(id, n.start)); }
  if (n.type === 'ClassDeclaration') decl.set(n.id.name, n.start);
}
const hits = new Map();
walk.fullAncestor(ast, (node, anc) => {
  if (node.type !== 'Identifier' || !decl.has(node.name) || node.start >= decl.get(node.name)) return;
  const p = anc[anc.length - 2]; if (p && ((p.type === 'MemberExpression' && p.property === node && !p.computed) || (p.type === 'Property' && p.key === node && !p.computed))) return;
  const fn = [...anc].reverse().find(a => /Function/.test(a.type));
  const ln = node.loc.start.line + base - 1;
  const k = node.name; if (!hits.has(k)) hits.set(k, []); hits.get(k).push(ln + (fn ? '' : '(맨 위!)'));
});
for (const [k, v] of [...hits].sort()) console.log(k.padEnd(18), '선언', code.slice(0, decl.get(k)).split('\n').length + base - 1, '줄 / 앞쪽에서 씀:', v.slice(0, 8).join(' '), v.length > 8 ? '…' + v.length : '');
