import {readFileSync, writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const lines = readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
function test(label, ranges) {
  const copy = [...lines];
  for (const [a, b] of ranges) for (let i = a - 1; i <= b - 1; i++) copy[i] = "";
  const path = `.tmp/rs-${label}.jsx`;
  writeFileSync(path, copy.join("\n"));
  try {
    execFileSync("npx", ["esbuild", path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"});
    console.log(label, "OK");
    return true;
  } catch (e) {
    const msg = String(e.stderr || e.message).split("\n").filter(l => l.includes("ERROR") || l.includes(".jsx:")).slice(0, 2).join(" | ");
    console.log(label, "FAIL", msg);
    return false;
  }
}
test("A-hide-complete", [[113, 178]]);
test("B-hide-process", [[151, 178]]);
test("C-hide-review", [[136, 149]]);
test("D-hide-hero-article", [[113, 134]]);
test("E-hide-head", [[60, 92]]);
