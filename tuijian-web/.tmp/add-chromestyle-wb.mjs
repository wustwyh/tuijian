import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
s = s.replace("import PhoneFrame from './PhoneFrame.jsx';", "import PhoneFrame from './PhoneFrame.jsx';\nimport {ChromeStyle} from './PlatformChrome.jsx';");
s = s.replace("    <div className=\"wb\" role=\"dialog\" aria-modal=\"true\" aria-label=\"图文软文工作台\">", "    <div className=\"wb\" role=\"dialog\" aria-modal=\"true\" aria-label=\"图文软文工作台\">\n      <ChromeStyle/>");
writeFileSync(f, s);
console.log("ok");
