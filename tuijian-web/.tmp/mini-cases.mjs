import {writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const exe = "node_modules/@esbuild/win32-x64/esbuild.exe";
const cases = {
  tpl: `<div>{true ? '初稿' : \`第\${1}次修订\`}</div>;`,
  obj: `<div>{({a:'x'})[1]}</div>;`,
  both: `<div><strong>{({planner:'资料整理'})[1]} · {true ? '初稿' : \`第\${1}次修订\`}</strong></div>;`,
  issue: `<div>{[1].map((x,i)=><li key={i}><b>{x}</b>：{x}</li>)}</div>;`,
};
for (const [name, code] of Object.entries(cases)) {
  const path = `.tmp/case-${name}.jsx`;
  writeFileSync(path, `export default () => ${code}`);
  try { execFileSync(exe, [path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"}); console.log(name, "OK"); }
  catch (e) { console.log(name, "FAIL", String(e.stderr).split("\n").filter(l=>/ERROR/.test(l))[0]); }
}
