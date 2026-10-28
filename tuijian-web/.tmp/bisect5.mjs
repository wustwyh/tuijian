import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const exe = "node_modules/@esbuild/win32-x64/esbuild.exe";
const lines = readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
function compile(copy, label) {
  const path = `.tmp/rsb-${label}.jsx`;
  writeFileSync(path, copy.join("\n"));
  try { execFileSync(exe, [path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"}); return true; }
  catch { return false; }
}
// 逐块删除 120..195，找到「删掉后能编译」的块
for (const [a, b] of [[120,195],[120,160],[160,195],[120,140],[140,160],[160,178],[178,195]]) {
  const copy = [...lines];
  for (let i = a - 1; i <= b - 1; i++) copy[i] = "";
  console.log(`删 ${a}-${b}:`, compile(copy, `${a}-${b}`) ? "OK" : "FAIL");
}
