import { randomUUID } from 'node:crypto';
import {
  WorkflowError, fail, context, needFacts, references, validatePersonas, validateStrategy,
  validateDraft, guardClaims, claimProblems, isImage, minimumImages, desiredImages, textLeaves, materialKey,
} from './guards.js';
import { matchesSchema } from './schema.js';
import { requestFor } from './prompts.js';

export { WorkflowError } from './guards.js';

export function createWorkflow({ llm, createId = (prefix) => `${prefix}_${randomUUID()}` } = {}) {
  if (typeof llm !== 'function' || typeof createId !== 'function') fail('必须注入后端 LLM 调用适配器');
  async function complete(stage, ctx, extra) {
    const request = requestFor(stage, ctx, extra);
    try {
      const response = await llm(request);
      const result = typeof response === 'string' ? JSON.parse(response) : structuredClone(response);
      return matchesSchema(result, request.response_schema);
    } catch {
      // Never include provider responses/errors, which may contain headers or secrets.
      throw new WorkflowError('LLM_FAILED', `${stage} 阶段调用失败或返回结构无效`);
    }
  }
  function makeId(prefix) {
    const id = createId(prefix);
    if (typeof id !== 'string' || !id.trim()) fail('ID 工厂必须返回非空字符串');
    return id;
  }

  async function generatePersonas({ task, evidence }) {
    const ctx = context(task, evidence);
    needFacts(ctx);
    const value = await complete('personas', ctx);
    const report = { id: makeId('persona'), task_id: task.id, personas: value.personas, status: 'draft' };
    validatePersonas(report, ctx);
    guardClaims(report.personas, ctx);
    return report;
  }

  async function generateStrategy({ task, evidence, personaReport, personaName }) {
    const ctx = context(task, evidence);
    needFacts(ctx);
    validatePersonas(personaReport, ctx, true);
    const persona = personaReport.personas.find((p) => p.name === personaName);
    if (!persona) fail('请明确选择一个已确认画像');
    guardClaims(personaReport.personas, ctx);
    const value = await complete('strategy', ctx, { selected_persona: persona });
    const strategy = { id: makeId('strategy'), task_id: task.id, ...value };
    if (strategy.primary_persona !== personaName) fail('生成策略改变了所选画像');
    validateStrategy(strategy, personaReport, ctx);
    guardClaims(strategy, ctx);
    return strategy;
  }

  async function generateContent({ task, evidence, personaReport, strategy, version = 1 }) {
    const ctx = context(task, evidence);
    needFacts(ctx);
    if (!['xiaohongshu', 'wechat_official'].includes(task.platform)) fail('当前内容生成只支持小红书与公众号');
    if (!Number.isInteger(version) || version < 1) fail('内容版本必须是正整数');
    validatePersonas(personaReport, ctx, true);
    validateStrategy(strategy, personaReport, ctx);
    guardClaims([personaReport.personas, strategy], ctx);
    const selected = personaReport.personas.find((p) => p.name === strategy.primary_persona);
    const value = await complete('content', ctx, { selected_persona: selected, strategy });
    const draft = {
      id: makeId('content'), task_id: task.id, platform: task.platform, version,
      ...value, verification_status: 'draft',
    };
    validateDraft(draft, ctx);
    guardClaims(draft, ctx);
    return draft;
  }

  async function verifyContent({ task, evidence, draft, personaReport, strategy }) {
    const ctx = context(task, evidence);
    const checks = [];
    const actions = new Set();
    const add = (type, item, status, reason, evidence_ids = []) => checks.push({ type, item, status, reason, evidence_ids });
    try {
      validatePersonas(personaReport, ctx, true);
      validateStrategy(strategy, personaReport, ctx);
      validateDraft(draft, ctx);
      add('platform', '任务、画像与平台结构', 'passed', '任务一致，已确认画像、完整型号和平台字段满足代码规则');
    } catch (error) {
      add('platform', '任务、画像与平台结构', 'rejected', error instanceof WorkflowError ? error.message : '输入结构无效');
    }
    const cited = new Set();
    const proofPoints = Array.isArray(strategy?.proof_points) ? strategy.proof_points : [];
    for (const text of [...textLeaves(draft), ...proofPoints]) {
      for (const match of String(text).matchAll(/\[([^\[\]\r\n]+)\]/gu)) cited.add(match[1]);
    }
    for (const persona of Array.isArray(personaReport?.personas) ? personaReport.personas : []) {
      for (const id of Array.isArray(persona?.evidence_ids) ? persona.evidence_ids : []) cited.add(id);
    }
    if (!ctx.facts.length || !cited.size) add('fact', '事实引用', 'pending', '缺少可核验的产品事实或引用');
    for (const id of cited) {
      try {
        references([id], ctx, 'fact');
        const item = ctx.byId.get(id);
        add('fact', `事实引用 ${id}`, item.verification_status === 'passed' ? 'passed' : 'pending',
          item.verification_status === 'passed' ? '引用存在且属于当前任务和完整型号；语义支持另行检查' : '来源证据仍待核验', [id]);
        if (item.verification_status !== 'passed') actions.add(`人工核验证据 ${id} 的原文与适用版本`);
      } catch { add('fact', `事实引用 ${id}`, 'rejected', '引用不存在、已被拒绝、为图片或不适用于当前型号', [id]); }
    }
    const plan = Array.isArray(draft?.image_plan) ? draft.image_plan : [];
    const imageIds = new Set();
    const materialIds = new Set();
    for (const image of plan) {
      const id = image?.evidence_id;
      const item = ctx.byId.get(id);
      if (!item || !isImage(item) || imageIds.has(id) || materialIds.has(materialKey(item))) {
        add('image', '图片引用', 'rejected', '图片引用未知、型号不符、已拒绝或重复', typeof id === 'string' ? [id] : []);
      } else {
        const metadata = item.image_metadata;
        const ready = item.verification_status === 'passed' && Number.isFinite(metadata?.width) && metadata.width > 0 &&
          Number.isFinite(metadata?.height) && metadata.height > 0 && typeof metadata?.usage === 'string' && metadata.usage.trim();
        add('image', `图片引用 ${id}`, ready ? 'passed' : 'pending', ready ? '图片来源、型号、尺寸与用途元数据齐全；实际访问有效性和视觉语义仍需核验' : '图片证据待核验或缺少尺寸/用途元数据', [id]);
        materialIds.add(materialKey(item));
      }
      imageIds.add(id);
    }
    if (plan.length < minimumImages(task.platform)) {
      add('image', '平台素材数量', 'pending', `当前 ${plan.length} 张不同素材，平台至少需要 ${minimumImages(task.platform)} 张；不得复制或伪造补齐`, [...imageIds].filter((id) => typeof id === 'string'));
      actions.add('从线上 ima 补充相同完整型号的不同图片，再生成并核验');
    } else if (plan.length === desiredImages(ctx)) add('image', '平台素材数量', 'passed', '配图数量符合当前平台规则且未重复凑图');
    if (plan.length) {
      add('image', '实际图片与访问有效性', 'pending', '本模块未下载或查看图片，无法确认访问有效性、外观型号、参数及脚注是否保留');
      actions.add('发布前打开每张 ima 原图，核对外观型号、用途、参数脚注和链接有效性');
    }

    const text = textLeaves([personaReport?.personas, strategy, draft]).join('\n');
    const problems = claimProblems(text, ctx);
    for (const problem of problems) add('compliance', '确定性断言检查', 'rejected', problem);
    if (!problems.length) add('compliance', '确定性断言检查', 'passed', '未命中当前数值、无来源敏感断言和绝对化表述规则；仍需语义核验');
    try {
      const review = await complete('verify', ctx, { persona_report: personaReport, strategy, draft });
      for (const type of ['fact', 'image', 'platform', 'compliance']) {
        if (!review.checks.some((check) => check.type === type)) throw new Error('missing semantic category');
      }
      for (const check of review.checks) {
        for (const id of check.evidence_ids) if (!ctx.byId.has(id)) throw new Error('unknown semantic citation');
        if (check.type === 'fact' && check.status === 'passed' && (!check.evidence_ids.length || check.evidence_ids.some((id) => isImage(ctx.byId.get(id))))) throw new Error('ungrounded semantic fact check');
      }
      checks.push(...review.checks);
      review.manual_actions.forEach((action) => actions.add(action));
    } catch {
      add('fact', '语义核验', 'pending', 'LLM 语义核验不可用或输出无效；不能把代码规则通过当作事实通过');
      actions.add('恢复 LLM 后重新执行语义核验');
    }
    for (const check of checks) if (check.status !== 'passed') actions.add(`${check.item}：${check.reason}`);
    return {
      task_id: task.id,
      overall_status: checks.some((check) => check.status === 'rejected') ? 'rejected' : checks.some((check) => check.status === 'pending') ? 'pending' : 'passed',
      checks, manual_actions: [...actions],
    };
  }
  return { generatePersonas, generateStrategy, generateContent, verifyContent };
}
