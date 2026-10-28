import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
const before = s;
s = s.replace(`                      <button type="button" className="wb-chip" onClick={() => setDirectText("")} disabled={!directText}>还原</button>`,
`                      {undoStack.length > 0 && <button type="button" className="wb-chip" onClick={undo}><Undo2 size={12}/>撤销上一步</button>}
                      <button type="button" className="wb-chip" onClick={() => setDirectText("")} disabled={!directText}>还原</button>`);
if (s === before) { console.log("NO MATCH"); } else { writeFileSync(f, s); console.log("ok"); }
