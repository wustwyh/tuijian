import {readFileSync, writeFileSync} from "node:fs";
const file = "src/platform-chrome.js";
let src = readFileSync(file, "utf8");
const cut = src.indexOf("// React 版");
if (cut < 0) throw new Error("找不到 React 段");
src = src.slice(0, cut).trimEnd() + "\n";
writeFileSync(file, src);
writeFileSync("src/pages/PlatformChrome.jsx", `import {chromeTopHtml, chromeBottomHtml} from '../platform-chrome.js';

// 预览用：结构与导出 HTML 完全一致，只是渲染成 React 元素。
const parts = (html) => ({__html: html});

export function ChromeTop({kind, info}) {
  return <div className="pf-chrome" dangerouslySetInnerHTML={parts(chromeTopHtml(kind, info))} />;
}

export function ChromeBottom({kind, info}) {
  return <div className="pf-chrome" dangerouslySetInnerHTML={parts(chromeBottomHtml(kind, info))} />;
}
`);
console.log("split ok");
