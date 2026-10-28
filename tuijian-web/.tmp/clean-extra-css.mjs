import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/article-workbench.css";
let s = readFileSync(f, "utf8");
s = s.replace(".edit-extra-targets{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}\n", "");
s = s.replace(/\.edit-extra-item\{[^}]*\}\n/, "");
s = s.replace(/\.edit-extra-item:hover\{[^}]*\}\n/, "");
writeFileSync(f, s);
console.log("css cleaned");
