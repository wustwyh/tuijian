import {readFileSync, writeFileSync} from 'node:fs';
const f = 'src/pages/ArticleWorkbench.jsx';
let s = readFileSync(f, 'utf8');
const before = s;

// ① 选中目标后，先给「直接改 / 让 AI 改」两个页签；默认直接改
s = s.replace(`                <section className="wb-step">
                  <h4><i>1</i>提需求</h4>`,
`                {target && (
                  <div className="wb-tabbar" role="tablist">
                    <button type="button" role="tab" aria-selected={editTab === 'direct'} className={editTab === 'direct' ? 'is-on' : ''} onClick={() => setEditTab('direct')}>直接改</button>
                    <button type="button" role="tab" aria-selected={editTab === 'ai'} className={editTab === 'ai' ? 'is-on' : ''} onClick={() => setEditTab('ai')}>让 AI 改</button>
                  </div>
                )}

                {target && editTab === 'direct' && (
                  <section className="wb-step">
                    <h4><i>1</i>直接改</h4>
                    <textarea className="wb-input wb-direct" rows={Math.min(12, Math.max(4, Math.ceil(directValue.length / 22)))}
                      value={directValue} onChange={e => setDirectText(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') applyDirect(); }}
                      placeholder="在这儿直接写，改字、加词、删词都行"/>
                    <div className="wb-direct-foot">
                      <span>{directValue.length} 字</span>
                      <button type="button" className="wb-chip" onClick={() => setDirectText('')} disabled={!directText}>还原</button>
                      <button type="button" className="wb-btn-apply" onClick={applyDirect} disabled={!directText.trim()}>保存这处修改</button>
                    </div>
                    <p className="wb-hint-sm">小改动（加减几个字、改标题、换说法）直接敲，不用走 AI；⌘/Ctrl + Enter 保存。</p>
                  </section>
                )}

                {editTab === 'ai' && <>
                <section className="wb-step">
                  <h4><i>1</i>提需求</h4>`);

// ② 三个步骤结束后关掉 AI 分支
s = s.replace(`                  {candidates?.length > 0 && <button type="button" className="wb-btn-apply" onClick={adoptCandidate}>{compare?.applied ? '重新用这一版' : '用这一版'}</button>}
                </section>

                {compare && (`,
`                  {candidates?.length > 0 && <button type="button" className="wb-btn-apply" onClick={adoptCandidate}>{compare?.applied ? '重新用这一版' : '用这一版'}</button>}
                </section>
                </>}

                {compare && (`);

if (s === before) { console.log('NO MATCH'); process.exit(1); }
writeFileSync(f, s);
console.log('ui ok');
