import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/PlatformChrome.jsx";
let s = readFileSync(f, "utf8");
s = s.replace("import {chromeTopHtml, chromeBottomHtml} from '../platform-chrome.js';", "import {chromeTopHtml, chromeBottomHtml} from '../platform-chrome.js';\nimport {CHROME_CSS} from '../chrome-css.js';");
s += `
// 外壳样式只在预览里挂一次（导出 HTML 自带同一份 CHROME_CSS）。
export function ChromeStyle() {
  return <style data-pf-chrome="">{CHROME_CSS}</style>;
}
`;
writeFileSync(f, s);
console.log("ok");
