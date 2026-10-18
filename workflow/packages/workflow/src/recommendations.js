import { createHash } from 'node:crypto';
import { context, needFacts, validatePersonas, guardClaims, fail, isText } from './guards.js';

export function prepareRecommendedTask({ task }) {
  if (!task || !isText(task.id) || !isText(task.resolved_product_name)) fail('请先选择真实目录中明确的产品型号');
  const result = structuredClone(task);
  const defaults_applied = [];
  const defaults = {
    product_query: task.resolved_product_name,
    platform: 'xiaohongshu',
    audience_hint: '系统推荐：探索与产品证据相关的潜在人群（营销假设）',
    scenario: '系统推荐：围绕候选人群的具体任务评估适用性（营销假设）',
    goal: '引导到店体验',
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (result[key] === undefined || result[key] === null || result[key] === '') {
      result[key] = value;
      defaults_applied.push({ field: key, value, source: 'system_default' });
    } else if (!isText(result[key])) fail(`推荐偏好 ${key} 无效`);
    else result[key] = result[key].trim();
  }
  if (!['xiaohongshu', 'wechat_official'].includes(result.platform)) fail('推荐初稿当前只支持小红书与公众号');
  return { task: result, defaults_applied, mode: 'recommended' };
}

function digest(ctx, report) {
  // Internal dependency binding, never authentication or a client-issued permission.
  const brief = ['id', 'product_query', 'resolved_product_name', 'platform', 'audience_hint', 'scenario', 'goal'].map((key) => ctx.task[key]);
  const records = [...ctx.evidence].sort((a, b) => a.id.localeCompare(b.id)).map((item) => [
    item.id, item.knowledge_base_id, item.media_id, item.applicable_model, item.applicable_version,
    item.verification_status, item.fact_excerpt, item.image_metadata, item.source_metadata?.scope,
  ]);
  return createHash('sha256').update(JSON.stringify([brief, records, report])).digest('hex');
}

export function recommendPersona({ task, evidence, personaReport, personaName }) {
  const ctx = context(task, evidence);
  needFacts(ctx);
  validatePersonas(personaReport, ctx);
  guardClaims(personaReport.personas, ctx);
  const selected = personaName === undefined ? personaReport.personas[0] : personaReport.personas.find((p) => p.name === personaName);
  if (!selected) fail('所选人群不在当前画像报告中');
  return {
    source: personaName === undefined ? 'system_recommended' : 'user_selected',
    task_id: task.id, persona_report_id: personaReport.id, persona_name: selected.name,
    reason: personaName === undefined
      ? '采用本次候选报告的首个人群形成可调整初稿；这是营销假设，未做市场排名或用户确认。'
      : '采用用户选中的当前候选人群形成初稿；选择不等于确认其中的营销假设或事实。',
    context_key: digest(ctx, personaReport),
  };
}

export function validateSelection(selection, report, ctx) {
  if (selection === undefined) return validatePersonas(report, ctx, true);
  validatePersonas(report, ctx);
  if (!selection || !['system_recommended', 'user_selected'].includes(selection.source) ||
      selection.task_id !== ctx.task.id || selection.persona_report_id !== report.id ||
      !report.personas.some((p) => p.name === selection.persona_name) ||
      selection.context_key !== digest(ctx, report) || !isText(selection.reason)) fail('推荐选择已过时或与当前任务、证据、画像不匹配，请重新选择');
}
