import {readFileSync} from "node:fs";
import {parse} from "@babel/parser";
const src = readFileSync("src/pages/Result.jsx", "utf8");
try {
  parse(src, {sourceType: "module", plugins: ["jsx"], errorRecovery: false});
  console.log("babel: OK");
} catch (e) {
  console.log("babel error:", e.message);
  console.log("位置:", e.loc && `${e.loc.line}:${e.loc.column}`);
  const lines = src.split(/\r?\n/);
  if (e.loc) for (let i = Math.max(0, e.loc.line - 4); i < Math.min(lines.length, e.loc.line + 2); i++) console.log(String(i + 1).padStart(4), lines[i].slice(0, 160));
}
