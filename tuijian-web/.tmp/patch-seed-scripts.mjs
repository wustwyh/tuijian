import {readFileSync, writeFileSync} from "node:fs";
const f = "scripts/export-generations.mjs";
let s = readFileSync(f, "utf8");
s = s.replace("const dbPath = join(root, 'data/storage/tuijian.sqlite');",
"const dbPath = process.env.TUJIAN_DATA_DIR ? join(process.env.TUJIAN_DATA_DIR, 'storage/tuijian.sqlite') : join(root, 'data/storage/tuijian.sqlite');");
writeFileSync(f, s);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.scripts = {...pkg.scripts, "seed:export": "node scripts/export-generations.mjs"};
writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
console.log("ok");
