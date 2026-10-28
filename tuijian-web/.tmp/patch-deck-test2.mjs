import {readFileSync, writeFileSync} from "node:fs";
const f = "server/card-deck.test.mjs";
let s = readFileSync(f, "utf8");
const before = s;
s = s.replace(/    \/\/ 卡内多段之间还有 10px 段间距，折算成行数一起算[\s\S]*?assert\.ok\(lines <= CARD_TEXT_CAPACITY\.lines, `单卡 \$\{lines\} 行，超过卡面 \$\{CARD_TEXT_CAPACITY\.lines\} 行：\$\{card\.text\.slice\(0, 20\)\}…`\);/,
`    // 卡面可用高度 397px（453 - 上下各 28），段间距 10px，按像素算才准
    const paragraphs = card.text.split(/\\n+/).filter(Boolean);
    const px = paragraphs.reduce((sum, p) => sum + linesOf(p) * 15 * 1.9, 0)
      + Math.max(0, paragraphs.length - 1) * 10;
    assert.ok(px <= 397, \`单卡 \${px.toFixed(0)}px，超过卡面 397px：\${card.text.slice(0, 20)}…\`);`);
if (s === before) { console.log("NO MATCH"); process.exit(1); }
writeFileSync(f, s);
console.log("ok");
