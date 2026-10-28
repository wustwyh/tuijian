import {readFileSync, writeFileSync, appendFileSync} from "node:fs";
const file = "server/rewrite.mjs";
let s = readFileSync(file, "utf8");
if (!s.includes("requirementOptionMessages")) {
  s += `

// 提需求：AI 先给出 3 条「可以点的需求」，用户不用自己组织语言。
export function requirementOptionMessages({platform, product, blockKind, text, scope}) {
  const system = \`你是营销文案编辑。用户想改\${SCOPE_NAME[blockKind] || '这一段'}，但不想自己写需求。
请提出 3 条互不相同、可以直接采用的改写需求（每条 12–26 字，说清「往哪个方向改 + 保留什么」），
针对这段文字当前的真实问题；不要建议新增参数、价格、销量、评价、奖项或用户故事，不要放宽适用条件。
输出 JSON：{"requirements":[{"label":"一句需求","detail":"为什么这样改（不超过 30 字）"}]}，不要代码围栏。\`;
  const user = {platform, product, blockKind, scope, text: String(text || '').slice(0, 1500)};
  return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify(user)}];
}

// 分析需求：用户写一句大白话，AI 把它拆成可执行的改写要求（要点 / 必须保留 / 不要做）。
export function analyzeMessages({platform, product, blockKind, text, request}) {
  const system = \`你是营销文案编辑，负责把用户随口说的一句话，翻译成可执行的改稿要求。
只做“改写方式”的分析：不得新增产品参数、价格、数字、奖项、评价或用户故事，不得放宽适用条件。
输出 JSON：{"requirement":"一句话改写指令（不超过 60 字）","points":["改什么"],"keep":["必须保留什么"],"avoid":["不要做什么"]}，
数组每项不超过 24 字，最多 3 项；不要代码围栏。\`;
  const user = {platform, product, blockKind, text: String(text || '').slice(0, 1500), userRequest: String(request || '').slice(0, 300)};
  return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify(user)}];
}

const cleanList = (value, max = 3) => (Array.isArray(value) ? value : [])
  .map(item => (typeof item === 'string' ? item : String(item?.text || item?.label || '')))
  .map(t => t.trim()).filter(Boolean).slice(0, max).map(t => t.slice(0, 40));

export function validateRequirements(value) {
  const list = Array.isArray(value?.requirements) ? value.requirements : Array.isArray(value) ? value : [];
  const cleaned = list.map(item => {
    const label = typeof item === 'string' ? item : String(item?.label || item?.requirement || item?.text || '');
    const detail = typeof item === 'object' && item ? String(item?.detail || item?.why || '') : '';
    return {label: label.trim().slice(0, 60), detail: detail.trim().slice(0, 60)};
  }).filter(item => item.label);
  const unique = [];
  for (const item of cleaned) if (!unique.some(u => u.label === item.label)) unique.push(item);
  if (!unique.length) throw fail(502, '没想出可用的需求，请再试一次');
  return unique.slice(0, 4);
}

export function validateAnalysis(value) {
  if (!value || typeof value !== 'object') throw fail(502, '需求分析没有结果，请再试一次');
  const requirement = String(value.requirement || '').trim().slice(0, 200);
  if (!requirement) throw fail(502, '需求分析没有结果，请再试一次');
  return {requirement, points: cleanList(value.points), keep: cleanList(value.keep), avoid: cleanList(value.avoid)};
}
`;
  writeFileSync(file, s);
}
console.log("rewrite ok");
