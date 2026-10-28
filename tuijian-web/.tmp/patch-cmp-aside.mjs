import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
s = s.replace(`                    <div className="wb-compare-row">
                      <div className="is-before"><em>修改前</em><p>{compare.before}</p></div>
                      <div className="is-after"><em>修改后</em><p>{compare.after}</p></div>
                    </div>`,
`                    {compare.scope === "whole" ? (
                      <div className="wb-compare-whole">
                        <p>整篇重写不在这里比文字，左边工作台已经是<b>两边排好版</b>的样子（修改前 / 修改后并排）。</p>
                        <p className="wb-hint-sm">修改前 {String(compare.before?.body || "").replace(/\\s/g, "").length} 字 → 修改后 {String(compare.after || "").replace(/\\s/g, "").length} 字</p>
                        <button type="button" className="wb-btn-apply" onClick={() => setCmpOpen(true)}>打开整版对比</button>
                      </div>
                    ) : (
                      <div className="wb-compare-row">
                        <div className="is-before"><em>修改前</em><p>{compare.before}</p></div>
                        <div className="is-after"><em>修改后</em><p>{compare.after}</p></div>
                      </div>
                    )}`);
writeFileSync(f, s);
console.log("ok");
