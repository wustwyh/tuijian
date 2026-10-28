import {readFileSync, writeFileSync} from "node:fs";
let f = "src/publish-html.js";
let s = readFileSync(f, "utf8");
const before = s;
s = s.replace(
"return { cls: 'card text', html: `<div class=\"body\">${card.text.split('\\n').map(t => `<p>${esc(plain(t))}</p>`).join('')}</div>` };",
"return { cls: 'card text', html: `<div class=\"body\">${card.text.split(/\\n+/).map(t => t.trim()).filter(Boolean).map(t => `<p>${esc(plain(t))}</p>`).join('')}</div>` };");
if (s === before) console.log("NO MATCH card text");
writeFileSync(f, s);
console.log("ok");
