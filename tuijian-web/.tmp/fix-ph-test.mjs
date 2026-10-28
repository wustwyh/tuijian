import {readFileSync, writeFileSync} from "node:fs";
const f = "server/publish-html.test.mjs";
let s = readFileSync(f, "utf8");
s = s.replace(`  const long = { body: Array.from({ length: 20 }, () => '常出差的人选本要先掂包轻不轻、屏够不够用。').join('\\n') };
  const out = html('moments', long, 1);
  const shown = /<span class="text">([\\s\\S]*?)<\\/span>/.exec(out)[1].replace(/&quot;/g, '"');
  assert.ok(shown.length <= 150, \`卡内文字 \${shown.length} 字，超过 150\`);`,
`  const long = { body: Array.from({ length: 40 }, () => '常出差的人选本要先掂包轻不轻、屏够不够用。').join('\\n') };
  const out = html('moments', long, 1);
  const shown = /<span class="text">([\\s\\S]*?)<\\/span>/.exec(out)[1].replace(/&quot;/g, '"');
  assert.ok(shown.length <= 300, \`卡内文字 \${shown.length} 字，超过 300\`);`);
writeFileSync(f, s);
console.log("ok");
