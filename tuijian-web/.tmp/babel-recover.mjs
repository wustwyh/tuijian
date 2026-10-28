import {readFileSync} from "node:fs";
import {parse} from "@babel/parser";
const src = readFileSync("src/pages/Result.jsx", "utf8");
const ast = parse(src, {sourceType: "module", plugins: ["jsx"], errorRecovery: true});
console.log("错误数:", ast.errors.length);
for (const e of ast.errors.slice(0, 6)) console.log("-", e.message, "@", e.loc && `${e.loc.line}:${e.loc.column}`);
const lines = src.split(/\r?\n/);
if (ast.errors[0]?.loc) {
  const L = ast.errors[0].loc.line;
  for (let i = Math.max(0, L - 6); i < Math.min(lines.length, L + 2); i++) console.log(String(i + 1).padStart(4), lines[i].slice(0, 200));
}
