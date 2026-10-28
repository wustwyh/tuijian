import {readFileSync, writeFileSync} from "node:fs";
const f = "server/insights-api.mjs";
let s = readFileSync(f, "utf8");
s = s.replace("import {searchNews, searchWeb} from './web-search.mjs';", "import {searchNews} from './web-search.mjs';");
writeFileSync(f, s);
console.log("ok");
