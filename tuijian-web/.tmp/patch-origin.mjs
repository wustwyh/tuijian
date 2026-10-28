import { readFileSync, writeFileSync } from 'node:fs';

const files = ['discovery.mjs', 'generations.mjs', 'llm-settings.mjs', 'material-api.mjs', 'products.mjs'];
const root = new URL('../server/', import.meta.url);
const cond = /if\s*\(\s*req\.headers\.origin\s*&&\s*new URL\(req\.headers\.origin\)\.host\s*!==\s*req\.headers\.host\s*\)/g;
let total = 0;
for (const f of files) {
  const p = new URL(f, root);
  let src = readFileSync(p, 'utf8');
  const before = (src.match(cond) || []).length;
  src = src.replace(cond, 'if (!sameOrigin(req))');
  if (before && !src.includes("'./same-origin.mjs'")) {
    if (/^import /.test(src)) {
      src = src.replace(/^import[^\n]*\n/, (m) => m + "import { sameOrigin } from './same-origin.mjs';\n");
    } else {
      src = "import { sameOrigin } from './same-origin.mjs';\n" + src;
    }
  }
  writeFileSync(p, src);
  total += before;
  console.log(`${f}: 替换 ${before} 处`);
}
console.log(`合计 ${total} 处`);
