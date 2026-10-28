import {readFileSync, writeFileSync} from "node:fs";
const file = "src/chrome-css.js";
let src = readFileSync(file, "utf8");
src = src.replace(".pf-body{display:block}", ".pf-body{display:block;padding:18px 18px 20px}\n.pf-news .pf-body{padding:22px 22px 24px}\n.pf-doc .pf-body{padding:24px 24px 26px}\n.pf-feed .pf-body{padding:14px 16px 18px}\n.pf-card .pf-body,.pf-poster .pf-body,.pf-moment .pf-body{padding:0}");
src = src.replace(".pf-moment{--pf-accent:#576b95;", ".pf-moment{--pf-radius:10px}\n.pf-moment{--pf-accent:#576b95;");
src = src.replace(".pf{margin:0 auto", ".pf{margin:0 auto");
// 平台色 + 外壳内的字体基调
src += `
.pf-body>h1:first-child,.pf-body>.headline:first-child,.pf-body>.flow>h1:first-child{margin-top:0}
.pf-news .pf-body{font-family:Georgia,"Songti SC","SimSun",serif}
.pf-card .deck{padding:0 12px 8px}
.pf-card .hint{padding:10px 12px 6px;font-size:11.5px;color:#9a9a9a;text-align:center}
.pf-moment .post{width:100%;max-width:none;border-radius:0;padding:14px 16px}
.pf-poster .page{width:100%;height:auto;min-height:520px;box-shadow:none}
`;
writeFileSync(file, src);
console.log("ok");
