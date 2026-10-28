import {readFileSync} from "node:fs";
const src = readFileSync("src/pages/Result.jsx", "utf8");
const stack = [];
let i = 0, line = 1;
let mode = "code"; // code | sq | dq | tpl | lc | bc | jsxtext
while (i < src.length) {
  const c = src[i], n = src[i + 1];
  if (c === "\n") line++;
  if (mode === "code") {
    if (c === "/" && n === "/") { mode = "lc"; i += 2; continue; }
    if (c === "/" && n === "*") { mode = "bc"; i += 2; continue; }
    if (c === "'") { mode = "sq"; i++; continue; }
    if (c === '"') { mode = "dq"; i++; continue; }
    if (c === "`") { mode = "tpl"; i++; continue; }
    if (c === "{" || c === "(" || c === "[") stack.push({c, line});
    else if (c === "}" || c === ")" || c === "]") {
      const top = stack.pop();
      const pair = { "}": "{", ")": "(", "]": "[" }[c];
      if (!top || top.c !== pair) { console.log("MISMATCH at line", line, "found", c, "top", top); process.exit(0); }
    }
    i++; continue;
  }
  if (mode === "lc") { if (c === "\n") mode = "code"; i++; continue; }
  if (mode === "bc") { if (c === "*" && n === "/") { mode = "code"; i += 2; continue; } i++; continue; }
  if (mode === "sq" || mode === "dq") { if (c === "\\") { i += 2; continue; } if ((mode === "sq" && c === "'") || (mode === "dq" && c === '"')) mode = "code"; i++; continue; }
  if (mode === "tpl") { if (c === "\\") { i += 2; continue; } if (c === "`") { mode = "code"; i++; continue; } if (c === "$" && n === "{") { stack.push({c: "{", line, tpl: true}); i += 2; continue; } i++; continue; }
}
console.log("剩余未闭合:", stack.slice(-5));
