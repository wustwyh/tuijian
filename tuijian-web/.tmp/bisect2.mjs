import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const exe = "node_modules/@esbuild/win32-x64/esbuild.exe";
const lines = readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
function test(label, ranges) {
  const copy = [...lines];
  for (const [a, b] of ranges) for (let i = a - 1; i <= b - 1; i++) copy[i] = "";
  const path = `.tmp/rs-${label}.jsx`;
  writeFileSync(path, copy.join("\n"));
  try {
    execFileSync(exe, [path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"});
    console.log(label, "OK");
  } catch (e) {
    const text = String(e.stderr || "");
    const hit = text.split("\n").filter(l => /rs-|ERROR/.test(l)).slice(0, 3).join(" | ");
    console.log(label, "FAIL", hit);
  }
}
test("hero", [[119, 124]]);
test("article", [[126, 134]]);
test("review", [[136, 149]]);
test("scene", [[153, 159]]);
test("basis", [[161, 163]]);
test("pkg", [[165, 165]]);
test("conv", [[167, 169]]);
test("materials", [[171, 173]]);
test("trace", [[175, 177]]);
