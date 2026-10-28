import {readFileSync, writeFileSync} from "node:fs";
const file = "src/chrome-css.js";
let src = readFileSync(file, "utf8");
const tailStart = src.indexOf("@media (max-height:900px){");
const tailEnd = src.indexOf("```", 0); // not used
const closing = src.indexOf("\n`;", tailStart);
if (closing < 0) throw new Error("找不到模板结尾");
const body = src.slice(0, closing);
const extra = src.slice(closing + 3).trim();
const merged = body + "\n" + extra + "\n`;\n";
writeFileSync(file, merged);
console.log("merged", extra.length);
