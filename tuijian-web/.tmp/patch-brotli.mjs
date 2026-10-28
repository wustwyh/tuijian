import {readFileSync, writeFileSync} from "node:fs";

let s = readFileSync("scripts/export-generations.mjs", "utf8");
s = s.replace("import {gzipSync} from 'node:zlib';", "import {brotliCompressSync} from 'node:zlib';");
s = s.replace("const outPath = join(root, 'server/seed/generations.json.gz');", "const outPath = join(root, 'server/seed/generations.json.br');");
s = s.replace("// 产物：server/seed/generations.json.gz（云端首次启动若表为空会自动导入）", "// 产物：server/seed/generations.json.br（brotli，避开仓库的 LFS 规则；云端首次启动若表为空会自动导入）");
s = s.replace("const gz = gzipSync(Buffer.from(raw, 'utf8'), {level: 9});", "const gz = brotliCompressSync(Buffer.from(raw, 'utf8'), {\n  params: {[require_zlib().constants.BROTLI_PARAM_QUALITY]: 9},\n});");
writeFileSync("scripts/export-generations.mjs", s);

let t = readFileSync("server/seed-generations.mjs", "utf8");
t = t.replace("// 把仓库里带的生成记录种子（server/seed/generations.json.gz）导入空数据库。", "// 把仓库里带的生成记录种子（server/seed/generations.json.br）导入空数据库。");
t = t.replace("import {gunzipSync} from 'node:zlib';", "import {brotliDecompressSync} from 'node:zlib';");
t = t.replace("const file = join(projectRoot, 'server/seed/generations.json.gz');", "const file = join(projectRoot, 'server/seed/generations.json.br');");
t = t.replace("const data = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'));", "const data = JSON.parse(brotliDecompressSync(readFileSync(file)).toString('utf8'));");
writeFileSync("server/seed-generations.mjs", t);
console.log("ok");
