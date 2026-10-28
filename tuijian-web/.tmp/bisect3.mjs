import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const exe = "node_modules/@esbuild/win32-x64/esbuild.exe";
const lines = readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
function test(label, ranges) {
  const copy = [...lines];
  for (const [a, b] of ranges) for (let i = a - 1; i <= b - 1; i++) copy[i] = "";
  const path = `.tmp/rs2-${label}.jsx`;
  writeFileSync(path, copy.join("\n"));
  try { execFileSync(exe, [path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"}); console.log(label, "OK"); }
  catch (e) { console.log(label, "FAIL", String(e.stderr).split("\n").filter(l=>/ERROR/.test(l))[0]); }
}
test("only168", [[168, 168]]);
test("only167", [[167, 167]]);
test("only169", [[169, 169]]);
test("167-168", [[167, 168]]);
