import {readFileSync, writeFileSync} from "node:fs";
const file = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(file, "utf8");

s = s.replace("import ArticlePreview from './ArticlePreview.jsx';", "import ArticlePreview from './ArticlePreview.jsx';\nimport PhoneFrame from './PhoneFrame.jsx';");
s = s.replace("const [device, setDevice] = useState('desktop');", "const [device, setDevice] = useState('mobile'); // 默认按手机看，想宽一点再切电脑");

const oldStage = `          {mode === 'publish' ? (
            <>
              {loading && <p className="wb-state">正在排版发布稿…（图片内嵌成 base64，稍等两秒）</p>}
              {error && !loading && <p className="wb-state is-error">{error}</p>}
              {!loading && !error && (
                <div className={\`wb-frame is-\${device}\`}>
                  <iframe title="发布稿预览" srcDoc={html} sandbox="allow-same-origin"/>
                </div>
              )}
            </>
          ) : (
            <div className={\`wb-frame is-\${device} is-render\`}>
              <div className="wb-render-inner">
                <ArticlePreview job={draftJob} result={resultView} platformKind={platformKind} generatedTime={generatedTime} edit={{selected, onPick: pick}}/>
              </div>
            </div>
          )}`;

const newStage = `          {mode === 'publish' ? (
            <>
              {loading && <p className="wb-state">正在排版发布稿…（图片内嵌成 base64，稍等两秒）</p>}
              {error && !loading && <p className="wb-state is-error">{error}</p>}
              {!loading && !error && (device === 'mobile'
                ? <PhoneFrame label="发布稿手机预览"><iframe title="发布稿预览" srcDoc={html} sandbox="allow-same-origin"/></PhoneFrame>
                : <div className="wb-frame is-desktop">
                    <iframe title="发布稿预览" srcDoc={html} sandbox="allow-same-origin"/>
                  </div>)}
            </>
          ) : (device === 'mobile'
            ? <PhoneFrame label="改稿手机预览">
                <div className="wb-render-inner">
                  <ArticlePreview job={draftJob} result={resultView} platformKind={platformKind} generatedTime={generatedTime} edit={{selected, onPick: pick}}/>
                </div>
              </PhoneFrame>
            : <div className="wb-frame is-desktop is-render">
                <div className="wb-render-inner">
                  <ArticlePreview job={draftJob} result={resultView} platformKind={platformKind} generatedTime={generatedTime} edit={{selected, onPick: pick}}/>
                </div>
              </div>)}`;

if (!s.includes(oldStage)) throw new Error("找不到 stage 结构");
s = s.replace(oldStage, newStage);
writeFileSync(file, s);
console.log("workbench patched");
