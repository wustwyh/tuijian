import {writeFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const exe = "node_modules/@esbuild/win32-x64/esbuild.exe";
const lines = (await import("node:fs")).readFileSync("src/pages/Result.jsx", "utf8").split(/\r?\n/);
const l167 = lines[166];
const l168 = lines[167];
const head = `const Fold = ({children}) => <details>{children}</details>;\nconst articleText = () => "";\nconst SourceText = () => null;\nconst result = {conversation: []};\nexport default () => `;
for (const [name, body] of Object.entries({a167: `<section>${l167}</Fold></section>;`, a168: `<section><Fold>${l168}</Fold></section>;`})) {
  const path = `.tmp/x-${name}.jsx`;
  writeFileSync(path, head + body);
  try { execFileSync(exe, [path, "--loader:.jsx=jsx", "--outfile=.tmp/out.js"], {stdio: "pipe"}); console.log(name, "OK"); }
  catch (e) { console.log(name, "FAIL", String(e.stderr).split("\n").slice(0,6).join(" | ")); }
}
