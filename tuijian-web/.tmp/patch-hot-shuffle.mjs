import {readFileSync, writeFileSync} from "node:fs";
const f = "server/insights-api.mjs";
let s = readFileSync(f, "utf8");
const before = s;
s = s.replace(`    const trimmed = results.slice(0, 10);`,
`    let trimmed = results.slice(0, 10);
    // 点「换一批」时打散素材顺序，逼模型换角度挑，不会每次都给同样的几条
    if (input?.refresh) trimmed = [...trimmed].sort(() => Math.random() - 0.5);`);
if (s === before) { console.log("NO MATCH"); process.exit(1); }
writeFileSync(f, s);
console.log("ok");
