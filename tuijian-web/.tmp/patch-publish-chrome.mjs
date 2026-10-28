import {readFileSync, writeFileSync} from "node:fs";
const file = "src/publish-html.js";
let src = readFileSync(file, "utf8");

src = src.replace(
  "import {buildArticleFlow} from './article-flow.js';",
  "import {buildArticleFlow} from './article-flow.js';\nimport {CHROME_CSS} from './chrome-css.js';\nimport {chromeTopHtml, chromeBottomHtml, chromeInfo} from './platform-chrome.js';"
);

const oldFn = `export function buildPublishHtml({ article, loaded, spec, generatedTime }) {
  const kind = spec?.layout && LAYOUTS[spec.layout] ? spec.layout : 'article';
  const layout = LAYOUTS[kind];
  const dateStr = generatedTime || '';
  const body = layout.body(article, loaded || [], dateStr);
  return \`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>\${BASE}\${layout.css}</style></head><body>
\${body}
</body></html>\`;
}`;

const newFn = `// 每种平台都套一层「平台外壳」（头像、昵称、关注、底部互动条），
// 让预览和下载出来的稿子看起来就是那个平台的一屏，而不是一份中性文档。
export function buildPublishHtml({ article, loaded, spec, generatedTime, meta }) {
  const kind = spec?.layout && LAYOUTS[spec.layout] ? spec.layout : 'article';
  const layout = LAYOUTS[kind];
  const dateStr = generatedTime || '';
  const body = layout.body(article, loaded || [], dateStr);
  const info = chromeInfo({platform: spec?.label || meta?.platform, product: meta?.product, audience: meta?.audience, time: dateStr});
  const width = {article: 620, news: 700, qa: 680, feed: 540, poster: 620, moment: 380, doc: 760, card: 1080}[kind] || 620;
  // 页面本身退成灰色背景，真正的「平台界面」是中间那张卡；
  // 手机（iframe 宽 390）时去掉外边距，让外壳铺满屏幕。
  const pageCss = \`body{margin:0 auto;padding:22px 12px;background:#eef0f3;max-width:none}
.pf{--pf-w:\${width}px}
@media (max-width:520px){body{padding:0;background:#fff}.pf{border:0;border-radius:0;max-width:none}}\`;
  return \`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>\${BASE}\${layout.css}\${CHROME_CSS}\${pageCss}</style></head><body>
<div class="pf pf-\${kind}">
\${chromeTopHtml(kind, info)}
<div class="pf-body">
\${body}
</div>
\${chromeBottomHtml(kind, info)}
</div>
</body></html>\`;
}`;

if (!src.includes(oldFn)) throw new Error("找不到 buildPublishHtml");
src = src.replace(oldFn, newFn);
writeFileSync(file, src);
console.log("ok");
