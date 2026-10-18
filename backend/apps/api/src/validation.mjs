import { invalid } from './errors.mjs';

export const PLATFORMS = ['wechat_official', 'xiaohongshu', 'wechat_moments', 'store_poster'];
const TASK_FIELDS = ['product_query', 'platform', 'audience_hint', 'scenario', 'goal'];

export function objectOnly(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('请求体必须是 JSON 对象');
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw invalid('请求包含不支持的字段');
}

function string(value, field, max, required = false) {
  if (typeof value !== 'string') throw invalid(`${field} 必须是字符串`);
  const result = value.trim();
  if (result.length > max || (required && !result)) throw invalid(`${field} 为空或超出长度限制`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(result)) throw invalid(`${field} 包含无效字符`);
  return result;
}

export function credentials(body) {
  objectOnly(body, ['email', 'password']);
  const email = string(body.email, 'email', 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) throw invalid('请输入有效邮箱');
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) {
    throw invalid('密码长度必须为 12—128 个字符');
  }
  return { email, password: body.password };
}

export function taskInput(body, { patch = false } = {}) {
  objectOnly(body, TASK_FIELDS);
  if (patch && !Object.keys(body).length) throw invalid('请提供需要更新的任务字段');
  const result = {};
  for (const key of TASK_FIELDS) {
    if (patch && !Object.hasOwn(body, key)) continue;
    if (key === 'platform') {
      if (!PLATFORMS.includes(body[key])) throw invalid('不支持的平台');
      result[key] = body[key];
    } else {
      const required = key === 'product_query';
      const value = Object.hasOwn(body, key) ? body[key] : (required ? undefined : '');
      result[key] = string(value, key, required ? 200 : 2000, required);
    }
  }
  return result;
}
