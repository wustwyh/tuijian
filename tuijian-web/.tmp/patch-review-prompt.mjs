import {readFileSync, writeFileSync} from "node:fs";
const f = "server/generation-prompts.mjs";
let s = readFileSync(f, "utf8");
s = s.replace(
  "核验平台类时同时检查营销目的：是否围绕目标客户的具体场景呈现至少2个有据的产品卖点及其帮助，",
  "平台类只查结构（标题长度、话题标签、配图数量、画幅），不要因为正文字数与某个区间不符而判 revise，篇幅不算核验项。核验平台类时同时检查营销目的：是否围绕目标客户的具体场景呈现至少2个有据的产品卖点及其帮助，"
);
writeFileSync(f, s);
console.log("ok");
