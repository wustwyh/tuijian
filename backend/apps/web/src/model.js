export const platforms = {
  xiaohongshu: '小红书', wechat_official: '微信公众号', wechat_moments: '朋友圈', store_poster: '门店海报',
};
export const taskStatuses = { draft: '草稿', retrieved: '已检索', generated: '已生成', verified: '已核验', exported: '已导出' };
export const emptyInput = { product_query: '', platform: 'xiaohongshu', audience_hint: '', scenario: '', goal: '' };
export const tabs = ['任务', '画像', '策略', '内容', '核验'];

export function taskInput(task) {
  return Object.fromEntries(Object.keys(emptyInput).map(key => [key, task?.[key] ?? emptyInput[key]]));
}
export function validateInput(input) {
  const errors = {};
  for (const [key, label] of [['product_query', '产品关键词'], ['scenario', '使用场景'], ['goal', '目标动作']]) {
    if (!input[key]?.trim()) errors[key] = `请填写${label}`;
  }
  if (!Object.hasOwn(platforms, input.platform)) errors.platform = '请选择支持的平台';
  return errors;
}
export function routeFromHash(hash) {
  if (hash === '#/tasks') return { page: 'tasks' };
  if (hash === '#/leads') return { page: 'leads' };
  const match = /^#\/tasks\/([^/?#]+)$/.exec(hash);
  if (match) {
    try { return { page: 'workbench', id: decodeURIComponent(match[1]) }; } catch { /* fall back to login */ }
  }
  return { page: 'login' };
}
export function taskRoute(id) { return `#/tasks/${encodeURIComponent(id)}`; }
export function safeSource(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
export function verificationLabel(status) {
  return ({ passed: '已通过', pending: '待人工核验', rejected: '未通过' })[status] || '待人工核验';
}
export function formatTime(value) {
  if (!value) return '读取时间待确认';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '读取时间待确认' : date.toLocaleString('zh-CN', { hour12: false });
}
