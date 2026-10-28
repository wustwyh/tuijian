import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const exe = "node_modules/@esbuild/win32-x64/esbuild.exe";
const lines = readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
function test(label, ranges) {
  const copy = [...lines];
  for (const [a, b] of ranges) for (let i = a - 1; i <= b - 1; i++) copy[i] = "";
  const path = `.tmp/rsd-${label}.jsx`;
  writeFileSync(path, copy.join("\n"));
  try { execFileSync(exe, [path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"}); console.log(label, "OK"); return true; }
  catch (e) { console.log(label, "FAIL"); return false; }
}
console.log("总行数", lines.length);
test("noFailure", [[100, 112]]);
test("noHero", [[119, 130]]);
test("noArticle", [[132, 140]]);
test("noReview", [[142, 155]]);
test("noTop", [[70, 98]]);
