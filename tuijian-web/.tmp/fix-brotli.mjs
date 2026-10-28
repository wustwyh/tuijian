import {readFileSync, writeFileSync} from "node:fs";
const f = "scripts/export-generations.mjs";
let s = readFileSync(f, "utf8");
s = s.replace("import {brotliCompressSync} from 'node:zlib';", "import {brotliCompressSync, constants as zlibConstants} from 'node:zlib';");
s = s.replace("const gz = brotliCompressSync(Buffer.from(raw, 'utf8'), {\n  params: {[require_zlib().constants.BROTLI_PARAM_QUALITY]: 9},\n});", "const gz = brotliCompressSync(Buffer.from(raw, 'utf8'), {\n  params: {[zlibConstants.BROTLI_PARAM_QUALITY]: 9},\n});");
writeFileSync(f, s);
console.log("fixed");
