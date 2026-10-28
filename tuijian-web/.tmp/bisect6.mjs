import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const exe = "node_modules/@esbuild/win32-x64/esbuild.exe";
const lines = readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
function compile(copy, label) {
  const path = `.tmp/rsc-${label}.jsx`;
  writeFileSync(path, copy.join("\n"));
  try { execFileSync(exe, [path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"}); return true; }
  catch (e) { const m = String(e.stderr).split("\n").filter(l=>/result|rsc-|ERROR/.test(l)).slice(0,2).join(" | "); return m; }
}
for (const [a, b] of [[1,40],[40,70],[70,100],[100,120],[50,120]]) {
  const copy = [...lines];
  for (let i = a - 1; i <= b - 1; i++) copy[i] = "";
  console.log(`删 ${a}-${b}:`, compile(copy, `${a}-${b}`));
}
