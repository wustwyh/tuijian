import {readFileSync, writeFileSync} from "node:fs";
const f = "server/rewrite.mjs";
let s = readFileSync(f, "utf8");
const before = s;

const add = `
// 需求追问：用户只点了一个气泡（比如「短一点」），AI 围绕这一句一次问一个问题，
// 用选项让人点，而不是让人打字。问够了直接给结论。
export function requirementTurnMessages({platform, product, blockKind, text, seed, history, round}) {
  const said = (history || []).map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\\n');
  const system = \`你是营销文案编辑，正在和用户把一句很短的改稿想法问清楚。用户不想打字，所以你必须给选项。
要改的内容：\${String(text || '').slice(0, 900)}
用户已经表达的方向：\${seed || '（还没说）'}
已进行的问答：\${said || '（无）'}

规则：
- 一次只问一个问题，问「怎么改」的取舍（保留哪些信息、改成什么语气、篇幅压多短、突出哪一点）；
- 不要问产品参数、不要问用户身份、不要问发布时间；
- 给 2–4 个可以直接点的选项，每个不超过 16 字，选项要具体（能直接拿去改稿）；
- 已经问过 \${round} 轮：到第 2 轮或信息已经够用时，直接给结论。

输出二选一的 JSON，不要代码围栏：
{"done":false,"question":"一句话问题（不超过 24 字）","options":["选项1","选项2"]}
或
{"done":true,"requirement":"一句话改写指令（不超过 60 字）","points":["改什么"],"keep":["必须保留什么"],"avoid":["不要做什么"]}，数组每项不超过 24 字、最多 3 项。\`;
  const user = JSON.stringify({platform, product, blockKind, seed, round});
  return [{role: 'system', content: system}, {role: 'user', content: user}];
}

export function validateRequirementTurn(value) {
  if (!value || typeof value !== 'object') throw fail(502, 'AI 没理解这一句，再说一次');
  if (value.done) {
    const requirement = String(value.requirement || '').trim().slice(0, 200);
    if (!requirement) throw fail(502, 'AI 没给出需求，请再试一次');
    return {done: true, requirement, points: cleanList(value.points), keep: cleanList(value.keep), avoid: cleanList(value.avoid)};
  }
  const question = String(value.question || '').trim().slice(0, 60);
  const options = (Array.isArray(value.options) ? value.options : [])
    .map(o => (typeof o === 'string' ? o : String(o?.label || o?.text || '')))
    .map(t => t.trim()).filter(Boolean).slice(0, 4);
  if (!question || options.length < 2) throw fail(502, 'AI 给出的追问不完整，请再试一次');
  return {done: false, question, options};
}
`;
s = s.replace("export function validateAnalysis(value) {", add + "\nexport function validateAnalysis(value) {");
if (s === before) { console.log("NO MATCH"); process.exit(1); }
writeFileSync(f, s);
console.log("ok");
