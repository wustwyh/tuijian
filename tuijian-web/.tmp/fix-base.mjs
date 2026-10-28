import {readFileSync, writeFileSync} from "node:fs";
const file = "src/publish-html.js";
let src = readFileSync(file, "utf8");
const bad = src.slice(src.indexOf("// 注意：这里必须是合法 CSS。"), src.indexOf("const BASE = '*{box-sizing:border-box}';") + "const BASE = '*{box-sizing:border-box}';".length);
const good = [
  "// 这里必须是合法 CSS：以前写成裸声明 box-sizing:border-box; 时，浏览器会把紧跟其后的",
  "// 第一条规则（各版式的 body{max-width…}）整块丢掉，结果所有平台都变成通栏大图。",
  "const BASE = '*{box-sizing:border-box}';",
].join("\n");
src = src.replace(bad, good);
writeFileSync(file, src);
console.log("BASE 修好");
