import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
s = s.replace(`                          <button type="button" className={picked === i ? 'is-on' : ''} onClick={() => adoptCandidate(i)}>`,
`                          <button type="button" className={picked === i ? 'is-on' : ''} onClick={() => previewCandidate(i)}>`);
s = s.replace(`                  {candidates?.length > 0 && <p className="wb-hint-sm">点一版就用上，下面会给出修改前后的对比。</p>}`,
`                  {candidates?.length > 0 && <button type="button" className="wb-btn-apply" onClick={adoptCandidate}>{compare?.applied ? '重新用这一版' : '用这一版'}</button>}`);
s = s.replace(`                    <div className="wb-compare-head">
                      <strong>对比</strong>
                      <span>{compare.scope === 'whole' ? '整篇重写' : '这一段'}</span>
                      <button type="button" className="wb-chip" onClick={() => { undo(); setCompare(null); }}><Undo2 size={12}/>撤销这次</button>
                    </div>`,
`                    <div className="wb-compare-head">
                      <strong>对比</strong>
                      <span>{compare.scope === 'whole' ? '整篇重写' : '这一段'}{compare.applied ? ' · 已用上' : ' · 还没用'}</span>
                      {compare.applied && <button type="button" className="wb-chip" onClick={() => { undo(); setCompare(null); }}><Undo2 size={12}/>撤销这次</button>}
                    </div>`);
writeFileSync(f, s);
console.log("aside ok");
