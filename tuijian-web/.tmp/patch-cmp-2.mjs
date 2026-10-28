import {readFileSync, writeFileSync} from 'node:fs';
const f = 'src/pages/ArticleWorkbench.jsx';
let s = readFileSync(f, 'utf8');

const cmpView = `        <section className={\`wb-stage\${cmpOpen && compare?.scope === 'whole' ? ' is-cmp' : ''}\`}>
          {cmpOpen && compare?.scope === 'whole' ? (
            <div className="wb-cmp">
              <div className="wb-cmp-bar">
                <div className="wb-cmp-title">
                  <strong>整篇重写 · 左右对比</strong>
                  <span>{cmpLoading ? '正在排两版…' : compare.applied ? '右边这一版已经用上了' : '右边还没用上，满意再点「用右边这一版」'}</span>
                </div>
                <div className="wb-cmp-actions">
                  <button type="button" className="wb-btn-apply is-inline" onClick={adoptCandidate}>{compare.applied ? '重新用这一版' : '用右边这一版'}</button>
                  <button type="button" className="wb-chip" onClick={() => setCmpOpen(false)}>收起对比</button>
                </div>
              </div>
              <div className="wb-cmp-panes">
                {[['before', '修改前'], ['after', '修改后']].map(([key, label]) => (
                  <div className={\`wb-cmp-pane is-\${key}\`} key={key}>
                    <span className="wb-cmp-tag">{label}</span>
                    {cmpLoading || !cmpDocs
                      ? <p className="wb-state">排版中…</p>
                      : device === 'mobile'
                        ? <PhoneFrame label={\`\${label}手机效果\`}><iframe title={\`\${label}发布稿\`} srcDoc={cmpDocs[key]} sandbox="allow-same-origin allow-scripts"/></PhoneFrame>
                        : <div className="wb-frame is-desktop"><iframe title={\`\${label}发布稿\`} srcDoc={cmpDocs[key]} sandbox="allow-same-origin allow-scripts"/></div>}
                  </div>
                ))}
              </div>
            </div>
          ) : mode === 'publish' ? (`;

s = s.replace(`        <section className="wb-stage">
          {mode === 'publish' ? (`, cmpView);

// 被替换掉的那一行需要把后面原本的 publish 分支内容接上：原结构是
//   {mode === 'publish' ? ( <> ... </> ) : ( device === 'mobile' ? ... )}
// 我们插入了新的三元起始，因此需要把 publish 分支的结尾 ) : 改成 ) } 结构不变，
// 这里保持原样即可（新增的三元以 ( 结束，原来的 ) : (...) 仍能闭合）。
writeFileSync(f, s);
console.log('stage ok');
