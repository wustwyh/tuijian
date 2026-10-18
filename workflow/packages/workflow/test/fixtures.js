// Synthetic TEST ONLY data. Never imported by src or represented as live ima output.
export const model = 'HUAWEI MateBook 14（鸿蒙版）';
export function task(overrides = {}) {
  return { id: 'task_test', user_id: 'user_test', product_query: 'MateBook 14', resolved_product_name: model,
    platform: 'xiaohongshu', audience_hint: '准备开学的大学生', scenario: '课堂笔记与宿舍学习', goal: '引导到店体验',
    status: 'retrieved', created_at: '2026-10-18T00:00:00Z', updated_at: '2026-10-18T00:00:00Z', ...overrides };
}
export function evidence(count = 6) {
  const base = { task_id: 'task_test', knowledge_base_id: 'SYNTHETIC_TEST_ONLY',
    source_url: 'https://example.invalid/test-only', fetched_at: '2026-10-18T00:00:00Z',
    applicable_model: model, verification_status: 'passed' };
  return [
    { ...base, id: 'ev_fact', media_id: 'TEST_MARKDOWN', media_type: 'MARKDOWN', title: '测试事实（非线上结果）',
      fact_excerpt: '【合成测试文本，不是真实产品事实】这款测试设备可用于整理资料。未提供价格、补贴、销量、用户评价与奖项。' },
    ...Array.from({ length: count }, (_, i) => ({ ...base, id: `ev_image_${i}`, media_id: `TEST_IMG_${i}`, media_type: 'IMG',
      title: `测试图片 ${i}`, image_metadata: { width: 800, height: 1000, format: 'png', usage: '产品外观（合成测试元数据）' } })),
  ];
}
export function personaValue(audience = '准备开学的大学生') {
  return { personas: [
    { name: audience, typical_tasks: ['资料整理'], pain_points: ['场景切换需要整理资料'], buying_triggers: ['到店对照实际任务'],
      objections: ['适用性待确认'], content_angle: `${audience}的任务清单`, evidence_ids: ['ev_fact'],
      assumptions: ['基于产品事实的营销假设，需求待确认'], pending_checks: ['价格待人工核验'] },
    { name: `${audience}中重视资料管理的人`, typical_tasks: ['整理文档'], pain_points: ['文档查找费时'], buying_triggers: ['实际整理任务'],
      objections: ['兼容性待确认'], content_angle: '资料归档场景', evidence_ids: ['ev_fact'],
      assumptions: ['资料整理需求是营销假设'], pending_checks: ['软件兼容性待人工核验'] },
  ] };
}
export function strategyValue(persona) {
  return { main_conflict: '任务资料分散与整理需求', primary_persona: persona.name,
    key_message: `围绕${persona.name}的资料整理任务到店体验`, proof_points: ['可用于整理资料 [ev_fact]'],
    outline: ['场景问题', '证据', '适用边界', '行动建议'], cta: '带一份实际资料到店体验', risk_notes: ['价格待人工核验'] };
}
export function contentValue(data) {
  const { task: input, evidence: items, selected_persona: persona } = data;
  const xhs = input.platform === 'xiaohongshu';
  const images = items.filter((item) => item.media_type === 'IMG').slice(0, xhs ? 6 : 2);
  return {
    title_options: [`${persona.name}的资料整理清单`, '带实际任务到店体验', '先确认需求，再核验配置'],
    selected_title: `${persona.name}的资料整理清单`,
    body: xhs ? `### 卡片 1｜任务清单\n${model}，从${persona.name}的资料整理场景开始。\n### 卡片 2｜证据与边界\n可用于整理资料 [ev_fact]。价格待人工核验。\n### 卡片 3｜到店体验\n带一份实际资料确认适用性。`
      : `## 场景问题\n${persona.name}如何准备资料整理任务？\n## 产品证据\n${model}可用于整理资料 [ev_fact]。\n## 适用边界\n价格和软件兼容性待人工核验。\n## 行动建议\n准备工作流与配置需求。`,
    cta: xhs ? '带你的任务清单到店体验' : '携带工作流与配置需求咨询并核验',
    image_plan: images.map((item, i) => ({ evidence_id: item.id, position: i === 0 ? 'cover' : 'body',
      caption: `${model}，测试图片`, purpose: i === 0 ? '完整型号与外观介绍' : '解释素材位置，不暗示未证实功能' })),
  };
}
export function reviewValue() {
  return { checks: ['fact', 'image', 'platform', 'compliance'].map((type) => ({ type, item: `测试语义 ${type}`,
    status: 'passed', reason: '仅测试适配器返回，用于验证合并逻辑，不代表真实语义审核', evidence_ids: type === 'fact' ? ['ev_fact'] : [] })), manual_actions: [] };
}
export function adapter(requests = [], overrides = {}) {
  return async (request) => {
    requests.push(structuredClone(request));
    const data = JSON.parse(request.prompt.slice(request.prompt.indexOf('\n{') + 1));
    if (overrides[request.stage]) return overrides[request.stage](request, data);
    if (request.stage === 'personas') return personaValue(data.task.audience_hint);
    if (request.stage === 'strategy') return strategyValue(data.selected_persona);
    if (request.stage === 'content') return contentValue(data);
    return reviewValue();
  };
}
