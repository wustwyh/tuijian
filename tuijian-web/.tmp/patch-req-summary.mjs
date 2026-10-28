import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
const before = s;

// 1) 按钮上显示整合后的需求
s = s.replace(
  `  const buildBefore = () => (scopeMode === 'whole' ? {...current} : stripMarkers(target?.text || ''));`,
  `  const buildBefore = () => (scopeMode === 'whole' ? {...current} : stripMarkers(target?.text || ''));
  // 按钮上要能看出这条需求整合了什么
  const reqSummary = (analysis?.requirement || chips.join('、') || request.trim() || '').replace(/\\s+/g, ' ').slice(0, 26);`
);

// 2) 第 1 步不再需要那个按钮（点气泡就自动追问）
s = s.replace(
  `                      <button type="button" className="wb-btn-soft" onClick={analyzeRequest} disabled={Boolean(busy) || (!request.trim() && !chips.length)}>
                        {busy === 'analyze' ? <><Loader2 size={14} className="spin"/>AI 正在梳理…</> : <><Wand2 size={14}/>让 AI 梳理这条需求</>}
                      </button>
`,
  ''
);

// 3) 用上之后给一个明确的保存键
s = s.replace(
  `                        <button type="button" className="wb-btn-apply" onClick={() => setCmpOpen(true)}>打开整版对比</button>`,
  `                        <button type="button" className="wb-btn-apply" onClick={() => setCmpOpen(true)}>打开整版对比</button>
                        {compare.applied && <button type="button" className="wb-btn-primary is-save" onClick={save} disabled={Boolean(busy)}>
                          {busy === 'save' ? <><Loader2 size={14} className="spin"/>保存中…</> : <><Check size={14}/>保存这一版</>}
                        </button>}`
);
s = s.replace(
  `                      <div className="wb-compare-row">
                        <div className="is-before"><em>修改前</em><p>{compare.before}</p></div>
                        <div className="is-after"><em>修改后</em><p>{compare.after}</p></div>
                      </div>
                    )}`,
  `                      <div className="wb-compare-row">
                        <div className="is-before"><em>修改前</em><p>{compare.before}</p></div>
                        <div className="is-after"><em>修改后</em><p>{compare.after}</p></div>
                      </div>
                    )}
                    {compare.applied && <button type="button" className="wb-btn-primary is-save" onClick={save} disabled={Boolean(busy)}>
                      {busy === 'save' ? <><Loader2 size={14} className="spin"/>保存中…</> : <><Check size={14}/>保存这一版</>}
                    </button>}`
);

// 4) 整版对比条里也用同一个保存键
s = s.replace(
  `                  <button type="button" className="wb-chip" onClick={() => setCmpOpen(false)}>收起对比</button>`,
  `                  {compare.applied && <button type="button" className="wb-btn-apply is-inline" onClick={save} disabled={Boolean(busy)}>
                    {busy === 'save' ? '保存中…' : '保存这一版'}
                  </button>}
                  <button type="button" className="wb-chip" onClick={() => setCmpOpen(false)}>收起对比</button>`
);
writeFileSync(f, s);
console.log("ok", s !== before);
