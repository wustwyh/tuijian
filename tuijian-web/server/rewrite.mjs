import {fail} from './generation-context.mjs';

// 改稿动作 → 给模型的人话指令。用户只需要点按钮/点关键词，不用会写提示词。
const INTENTS = {
  shorter: '压到原来长度的七成左右：删掉铺垫、重复和客套，事实与适用条件一个都不能少',
  casual: '改成更像朋友说话的口语，短句为主，去掉书面腔和公文腔',
  formal: '改成更专业、克制的商务表述，不要夸张，不要形容词堆砌',
  angle: '换一个卖点角度来讲同一件事，事实、参数、结论都不能变',
  concrete: '把抽象表述换成具体使用场景，不许新增参数、数字或结论',
  fix: '按给定的核验意见修正：删掉没有依据的断言，保留原文的适用条件',
  title: '换一个标题：稳重不夸张，不超过平台标题字数上限，不要序号和书名号',
  cta: '换一个面向所有读者的销售行动引导，不要出现“把你的资料发我”这类一对一咨询口吻',
  tags: '换一组话题标签，数量与原来一致，不要带 # 号',
  sales: '改成更有销售推动力的写法：先用场景痛点起头，再给有据卖点，最后给行动引导，不要夸大',
};

const SCOPE_NAME = {article: '整篇正文', title: '标题', lead: '开头', cta: '结尾行动引导', tags: '话题标签', paragraph: '这一段'};

export function rewriteMessages({platform, product, title, body, target, scope, instruction, count, keywords}) {
  const hints = [...new Set([...(Array.isArray(keywords) ? keywords : []), instruction].filter(Boolean))];
  const system = `你是资深营销编辑，负责改稿，不是重写事实。
只能改措辞、语序和结构：不得新增任何产品参数、价格、数字、奖项、评价或用户故事；不得改动或删除原文中的 [f_数字] 引用角标；不得放宽适用条件与承诺边界。
不要输出任何括号注释、编辑说明（例如「（已人工微调）」「（修改后）」「（版本2）」）、占位符或“以下是改写”这类提示语；候选必须是可以直接发布、直接替换的干净正文。
先写一句“需求”（requirement）：用一句人话说明你打算怎么改这个${SCOPE_NAME[scope] || '段落'}、改完保留什么，不超过 60 字；再给 ${count} 个可直接替换的版本。
输出严格为一个 JSON 对象：{"requirement":"...","candidates":[{"text":"..."}]}，不要解释、不要编号、不要代码围栏。
${scope === 'article' ? '每个版本都必须保留原文的段落结构（段落之间用两个换行分隔），并保留每一处 [f_数字]。' : '每个版本只输出改写后的文本，不要带小标题或序号。'}`;
  const user = {
    platform,
    product,
    title,
    rewriteScope: scope,
    userHints: hints.length ? hints : ['把这段写得更清楚'],
    count,
    ...(scope === 'article' ? {body} : {paragraph: target}),
  };
  return [
    {role: 'system', content: system},
    {role: 'user', content: JSON.stringify(user)},
  ];
}

// 点段落 → 先问模型「这段可以从哪些方向改」，返回可直接点的短词。
export function keywordMessages({platform, product, blockKind, text, requirementSeed}) {
  const system = `你是营销文案编辑助手。用户点开了${SCOPE_NAME[blockKind] || '一段文字'}想改，但说不出专业要求。
请给出 6 个可以直接点的修改方向，每个 2–6 个字（如「更口语」「再具体」「删形容词」「换个卖点」「加场景」「短一点」），必须针对这段文字本身的问题，不要泛泛而谈。
只能提“改写法”的方向，不能建议新增参数、价格、销量、评价、奖项或用户故事。
输出 JSON：{"keywords":["...","..."]}，不要代码围栏。`;
  const user = {platform, product, blockKind, text: String(text || '').slice(0, 1500), requirementSeed: requirementSeed || ''};
  return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify(user)}];
}

export function validateKeywords(value) {
  const list = Array.isArray(value?.keywords) ? value.keywords : Array.isArray(value) ? value : [];
  const cleaned = list
    .map(item => (typeof item === 'string' ? item : String(item?.label || item?.text || '')))
    .map(text => text.trim().replace(/^[「『"“]|[」』"”]$/g, ''))
    .filter(text => text && text.length <= 12);
  const unique = [...new Set(cleaned)].slice(0, 8);
  if (unique.length < 3) throw fail(502, '修改方向没生成出来，请再试一次');
  return unique;
}

export function validateRequirement(value) {
  const text = typeof value?.requirement === 'string' ? value.requirement.trim() : '';
  return text.slice(0, 120);
}

const markersOf = text => [...String(text).matchAll(/\[f_\d+\]/g)].map(m => m[0]);
const numbersOf = text => new Set([...String(text).replace(/\[f_\d+\]/g, '').matchAll(/\d+(?:\.\d+)?/g)].map(m => m[0]));

// 守卫：候选里出现原文没有的数字（=凭空编参数）、或丢了引用角标，直接不给用户看。
export function validateCandidates(value, {allowedNumbers, requiredMarkers, maxLength}) {
  const raw = Array.isArray(value?.candidates) ? value.candidates : Array.isArray(value) ? value : [];
  const list = raw.map(item => (typeof item === 'string' ? item : item?.text)).filter(t => typeof t === 'string' && t.trim());
  if (!list.length) throw fail(502, '改写没有返回可用文本，请重试');
  const keep = [];
  const rejected = [];
  for (const text of list) {
    const trimmed = text.trim();
    if (trimmed.length > maxLength) { rejected.push('too-long'); continue; }
    const extra = [...numbersOf(trimmed)].filter(n => !allowedNumbers.has(n));
    if (extra.length) { rejected.push('new-number'); continue; }
    const missing = requiredMarkers.filter(marker => !trimmed.includes(marker));
    if (missing.length) { rejected.push('lost-marker'); continue; }
    if (!keep.includes(trimmed)) keep.push(trimmed);
  }
  if (!keep.length) throw fail(502, '改写结果引入了原文没有的数字或丢了引用角标，已拦截，请再试一次');
  return {candidates: keep.slice(0, 3), rejected};
}

export {INTENTS, markersOf, numbersOf};


// 提需求：AI 先给出 3 条「可以点的需求」，用户不用自己组织语言。
export function requirementOptionMessages({platform, product, blockKind, text, scope}) {
  const system = `你是营销文案编辑。用户想改${SCOPE_NAME[blockKind] || '这一段'}，但不想自己写需求。
请提出 3 条互不相同、可以直接采用的改写需求（每条 12–26 字，说清「往哪个方向改 + 保留什么」），
针对这段文字当前的真实问题；不要建议新增参数、价格、销量、评价、奖项或用户故事，不要放宽适用条件。
输出 JSON：{"requirements":[{"label":"一句需求","detail":"为什么这样改（不超过 30 字）"}]}，不要代码围栏。`;
  const user = {platform, product, blockKind, scope, text: String(text || '').slice(0, 1500)};
  return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify(user)}];
}

// 分析需求：用户写一句大白话，AI 把它拆成可执行的改写要求（要点 / 必须保留 / 不要做）。
export function analyzeMessages({platform, product, blockKind, text, request}) {
  const system = `你是营销文案编辑，负责把用户随口说的一句话，翻译成可执行的改稿要求。
只做“改写方式”的分析：不得新增产品参数、价格、数字、奖项、评价或用户故事，不得放宽适用条件。
输出 JSON：{"requirement":"一句话改写指令（不超过 60 字）","points":["改什么"],"keep":["必须保留什么"],"avoid":["不要做什么"]}，
数组每项不超过 24 字，最多 3 项；不要代码围栏。`;
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


// 需求追问：用户只点了一个气泡（比如「短一点」），AI 围绕这一句一次问一个问题，
// 用选项让人点，而不是让人打字。问够了直接给结论。
export function requirementTurnMessages({platform, product, blockKind, text, seed, history, round}) {
  const said = (history || []).map(m => (m.role === 'user' ? '用户：' : 'AI：') + m.content).join('\n');
  const system = `你是营销文案编辑，正在和用户把一句很短的改稿想法问清楚。用户不想打字，所以你必须给选项。
要改的内容：${String(text || '').slice(0, 900)}
用户已经表达的方向：${seed || '（还没说）'}
已进行的问答：${said || '（无）'}

规则：
- 一次只问一个问题，问「怎么改」的取舍（保留哪些信息、改成什么语气、篇幅压多短、突出哪一点）；
- 不要问产品参数、不要问用户身份、不要问发布时间；
- 给 2–4 个可以直接点的选项，每个不超过 16 字，选项要具体（能直接拿去改稿）；
- 已经问过 ${round} 轮：到第 2 轮或信息已经够用时，直接给结论。

输出二选一的 JSON，不要代码围栏：
{"done":false,"question":"一句话问题（不超过 24 字）","options":["选项1","选项2"]}
或
{"done":true,"requirement":"一句话改写指令（不超过 60 字）","points":["改什么"],"keep":["必须保留什么"],"avoid":["不要做什么"]}，数组每项不超过 24 字、最多 3 项。`;
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

export function validateAnalysis(value) {
  if (!value || typeof value !== 'object') throw fail(502, '需求分析没有结果，请再试一次');
  const requirement = String(value.requirement || '').trim().slice(0, 200);
  if (!requirement) throw fail(502, '需求分析没有结果，请再试一次');
  return {requirement, points: cleanList(value.points), keep: cleanList(value.keep), avoid: cleanList(value.avoid)};
}
