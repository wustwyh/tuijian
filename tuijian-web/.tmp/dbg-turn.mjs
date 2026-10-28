import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
s = s.replace(`    if (editTab !== 'ai' || !target) return;
    const seed = chips.join('、') || request.trim();`,
`    window.__turnDbg = {editTab, hasTarget: !!target, chips: chips.join('、'), req: request.trim(), at: Date.now()};
    if (editTab !== 'ai' || !target) return;
    const seed = chips.join('、') || request.trim();`);
writeFileSync(f, s);
console.log("dbg added");
