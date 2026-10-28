import {readFileSync, writeFileSync} from "node:fs";
const f = "server/card-deck.test.mjs";
let s = readFileSync(f, "utf8");
const before = s;
s = s.replace(
"    const lines = card.text.split('\\n').reduce((sum, p) => sum + linesOf(p), 0);",
`    // 卡内多段之间还有 10px 段间距，折算成行数一起算
    const paragraphs = card.text.split(/\\n+/).filter(Boolean);
    const lines = paragraphs.reduce((sum, p) => sum + linesOf(p), 0)
      + Math.ceil(((paragraphs.length - 1) * 10) / (15 * 1.9));`);
if (s === before) { console.log("NO MATCH"); process.exit(1); }
writeFileSync(f, s);
console.log("test patched");
