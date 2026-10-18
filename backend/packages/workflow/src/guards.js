export class WorkflowError extends Error {
  constructor(code, message, details = []) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.details = details;
  }
}
export const fail = (message, details = []) => { throw new WorkflowError('VALIDATION_ERROR', message, details); };
export const normalize = (value) => String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/gu, '');
export const isText = (v) => typeof v === 'string' && v.trim().length > 0;
export const isImage = (item) => item.media_type === 'IMG';
export const materialKey = (item) => JSON.stringify([item.knowledge_base_id, item.media_id]);

function remoteUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase());
  } catch { return false; }
}

// Trusted server-side IMA adapter records may have no durable public URL.
// This checks provenance shape only; Backend must obtain the record from IMA,
// never accept a client assertion of retrieval='ima_openapi' as proof.
function traceableSource(item) {
  if (item.source_url === null) {
    const meta = item.source_metadata;
    return meta?.retrieval === 'ima_openapi' && meta.requires_refresh === true &&
      remoteUrl(meta.download_origin) && isText(meta.source_url_note) &&
      Array.isArray(meta.checks) && meta.checks.length > 0 && meta.checks.every(isText);
  }
  return remoteUrl(item.source_url);
}

export function context(task, evidence) {
  if (!task || !['id', 'product_query', 'audience_hint', 'scenario', 'goal'].every((key) => isText(task[key]))) fail('任务缺少必填字段');
  if (!['xiaohongshu', 'wechat_official', 'wechat_moments', 'store_poster'].includes(task.platform)) fail('未知平台');
  if (!Array.isArray(evidence)) fail('evidence 必须为数组');
  if (!isText(task.resolved_product_name)) fail('产品型号不明确，请先确认具体型号与版本', [
    { candidates: [...new Set(evidence.map((item) => item?.applicable_model).filter(isText))] },
  ]);
  const ids = new Set();
  for (const item of evidence) {
    if (!item || !isText(item.id) || item.task_id !== task.id) fail('证据必须属于当前任务');
    if (ids.has(item.id)) fail('证据 ID 重复');
    ids.add(item.id);
    if (!['knowledge_base_id', 'media_id', 'media_type', 'title', 'applicable_model'].every((key) => isText(item[key])) ||
        !traceableSource(item) || !isText(item.fetched_at) || !Number.isFinite(Date.parse(item.fetched_at)) ||
        !['passed', 'pending', 'rejected'].includes(item.verification_status)) fail('证据溯源字段不完整或来源地址无效', [{ evidence_id: item.id }]);
  }
  const eligible = evidence.filter((item) => normalize(item.applicable_model) === normalize(task.resolved_product_name) && item.verification_status !== 'rejected');
  const facts = eligible.filter((item) => !isImage(item) && isText(item.fact_excerpt));
  const materialIds = new Set();
  const images = eligible.filter((item) => {
    if (!isImage(item) || materialIds.has(materialKey(item))) return false;
    materialIds.add(materialKey(item));
    return true;
  });
  return { task, evidence: eligible, facts, images, byId: new Map(eligible.map((item) => [item.id, item])) };
}

export function needFacts(ctx) {
  if (!ctx.facts.length) throw new WorkflowError('IMA_NO_RESULT', '当前已确认型号没有可用事实证据，请重新检索线上 ima');
}

export function references(ids, ctx, kind) {
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) fail('证据引用为空或重复');
  for (const id of ids) {
    const item = ctx.byId.get(id);
    if (!item || (kind === 'image' ? !isImage(item) : isImage(item) || !isText(item.fact_excerpt))) fail('引用了未知、被拒绝或型号不符的证据', [{ evidence_id: id }]);
  }
}

export function validatePersonas(report, ctx, confirmed = false) {
  if (!report || report.task_id !== ctx.task.id || !isText(report.id)) fail('画像不属于当前任务');
  if (confirmed && report.status !== 'confirmed') fail('请先确认客群画像');
  if (!['draft', 'confirmed'].includes(report.status) || !Array.isArray(report.personas) || report.personas.length < 2 || report.personas.length > 3) fail('需要 2—3 个画像');
  const names = new Set();
  for (const persona of report.personas) {
    if (!persona || !isText(persona.name) || names.has(normalize(persona.name)) || !isText(persona.content_angle)) fail('画像名称或切入点无效');
    names.add(normalize(persona.name));
    for (const key of ['typical_tasks', 'pain_points', 'buying_triggers', 'objections', 'assumptions', 'pending_checks']) {
      if (!Array.isArray(persona[key]) || !persona[key].length || !persona[key].every(isText)) fail(`画像缺少 ${key}`);
    }
    references(persona.evidence_ids, ctx, 'fact');
  }
}

export function validateStrategy(strategy, report, ctx) {
  if (!strategy || strategy.task_id !== ctx.task.id || !isText(strategy.id)) fail('策略不属于当前任务');
  if (!report.personas.some((p) => p.name === strategy.primary_persona)) fail('策略必须选择已确认画像中的一个人群');
  for (const key of ['main_conflict', 'primary_persona', 'key_message', 'cta']) if (!isText(strategy[key])) fail(`策略缺少 ${key}`);
  for (const key of ['proof_points', 'outline', 'risk_notes']) if (!Array.isArray(strategy[key]) || !strategy[key].length || !strategy[key].every(isText)) fail(`策略缺少 ${key}`);
  // proof_points stays string[] in the shared contract; citations use [evidence_id].
  for (const point of strategy.proof_points) {
    const ids = [...point.matchAll(/\[([^\[\]\r\n]+)\]/gu)].map((match) => match[1]);
    references(ids, ctx, 'fact');
  }
}

export const desiredImages = (ctx) => Math.min(ctx.images.length, ctx.task.platform === 'xiaohongshu' ? 6 : 2);
export const minimumImages = (platform) => platform === 'xiaohongshu' ? 3 : 2;
export const platformSections = ['场景问题', '产品证据', '适用边界', '行动建议'];

export function platformValid(draft) {
  if (draft.platform === 'xiaohongshu') {
    const cards = [...draft.body.matchAll(/^### 卡片 [1-6](?:[：｜|\s]|$)/gmu)];
    return cards.length >= 3 && cards.length <= 6 && new Set(cards.map((v) => v[0].match(/[1-6]/u)[0])).size === cards.length;
  }
  return draft.platform === 'wechat_official' && platformSections.every((title) => draft.body.includes(`## ${title}`));
}

export function validateDraft(draft, ctx, enforceCount = true) {
  if (!draft || draft.task_id !== ctx.task.id || !isText(draft.id) || draft.platform !== ctx.task.platform) fail('成稿任务或平台不匹配');
  if (!Number.isInteger(draft.version) || draft.version < 1) fail('内容版本必须是正整数');
  if (!Array.isArray(draft.title_options) || draft.title_options.length !== 3 || !draft.title_options.every(isText) || !draft.title_options.includes(draft.selected_title)) fail('需要三个标题且选中标题属于候选');
  if (!isText(draft.body) || !isText(draft.cta) || !normalize(draft.body).includes(normalize(ctx.task.resolved_product_name))) fail('正文必须保留已确认的完整型号');
  if (!platformValid(draft)) fail('正文不符合平台结构要求');
  for (const text of [...draft.title_options, draft.body, draft.cta]) {
    const ids = [...text.matchAll(/\[([^\[\]\r\n]+)\]/gu)].map((match) => match[1]);
    if (ids.length) references([...new Set(ids)], ctx, 'fact');
  }
  if (!Array.isArray(draft.image_plan)) fail('缺少配图方案');
  if (draft.image_plan.length) references(draft.image_plan.map((item) => item.evidence_id), ctx, 'image');
  const materials = new Set();
  for (const item of draft.image_plan) {
    const key = materialKey(ctx.byId.get(item.evidence_id));
    if (materials.has(key)) fail('同一 ima 素材不能通过不同证据 ID 重复配图');
    materials.add(key);
    if (!['cover', 'body', 'ending'].includes(item.position) || !isText(item.caption) || !isText(item.purpose) ||
        !normalize(item.caption).includes(normalize(ctx.task.resolved_product_name))) fail('图片位置、用途或完整型号图注无效');
  }
  if (enforceCount && draft.image_plan.length !== desiredImages(ctx)) fail('配图数量不符合平台与可用证据要求');
}

// Deterministic red flags complement semantic review. They do not prove all prose factual.
export function claimProblems(text, ctx) {
  const source = normalize(ctx.facts.map((item) => item.fact_excerpt).join('\n'));
  const problems = [];
  const numericPattern = /\d+(?:\.\d+)?\s*(?:万?元|块钱|%|％|小时|分钟|毫秒|英寸|公斤|克|kg|g\b|hz\b|gb\b|tb\b|mah\b|瓦|w\b|倍|台|人|项|次|分贝)/giu;
  const sourceNumbers = new Set((ctx.facts.map((item) => item.fact_excerpt).join('\n').match(numericPattern) ?? []).map(normalize));
  const numbers = String(text).match(numericPattern) ?? [];
  for (const claim of numbers) if (!sourceNumbers.has(normalize(claim))) problems.push(`数值缺少证据：${claim}`);
  for (const sentence of String(text).split(/[。！？\n]/u)) {
    for (const group of [
      ['价格', /售价|到手价|仅售|价格|优惠价|免费/gu],
      ['补贴', /补贴|国补/gu], ['销量', /销量|热销|畅销/gu],
      ['评价', /好评|用户评价|用户反馈|亲测|实测/gu], ['奖项', /获奖|荣获|奖项/gu],
    ]) {
      const words = sentence.match(group[1]) ?? [];
      if (words.length && !/待人工核验|待确认|未提供|不承诺|请核验|需核验|现场核验|没有证据|尚未核验/u.test(sentence) && !words.some((word) => source.includes(normalize(word)))) problems.push(`${group[0]}断言缺少证据`);
    }
  }
  if (/全网最低|行业第一|全球第一|绝对领先|百分之百保证|100[%％]保证|零风险|永久免[费息]/u.test(text)) problems.push('含绝对化或保证性营销表述');
  if (/\b[a-z]:[\\/]|file:\/\/|\\\\[^\s\\]+\\/iu.test(text)) problems.push('输出含本地文件路径，不得作为线上来源或成稿');
  return [...new Set(problems)];
}

export function guardClaims(value, ctx) {
  const problems = claimProblems(textLeaves(value).join('\n'), ctx);
  if (problems.length) fail('生成结果包含无依据或不合规断言', problems);
}

export function textLeaves(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(textLeaves);
  if (value && typeof value === 'object') return Object.values(value).flatMap(textLeaves);
  return [];
}
