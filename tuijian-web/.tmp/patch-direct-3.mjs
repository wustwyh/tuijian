import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
const before = s;
s = s.replace(/function applyCandidate\(data, index\) \{\r?\n    const text = data\?\.candidates\?\.\[index\];\r?\n    if \(!text \|\| !selected\) return;\r?\n    pushUndo\(\);\r?\n    const kind = selected\.kind;/,
  "function applyText(text, block) {\n    if (!text || !block) return;\n    pushUndo();\n    const kind = block.kind;");
if (s === before) console.log("NO MATCH");
writeFileSync(f, s);
console.log("done");
