import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/article-workbench.css";
let s = readFileSync(f, "utf8");
s = s.replace(".wb-cmp-pane{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}",
".wb-cmp-pane{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;flex:1 1 0;width:100%}");
s = s.replace(".wb-cmp-pane .wb-frame.is-desktop{width:100%;max-width:none;height:calc(100vh - 260px);min-height:420px}",
".wb-cmp-pane .wb-frame.is-desktop{width:min(720px,100%);flex:0 0 auto;max-width:none;height:calc(100vh - 260px);min-height:420px}");
writeFileSync(f, s);
console.log("ok");
