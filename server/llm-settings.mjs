import { AsyncLocalStorage } from 'node:async_hooks';
import { sameOrigin } from './same-origin.mjs';
import { randomUUID } from 'node:crypto';
import { BUILTIN_BASE_URLS } from './llm-defaults.mjs';

const context = new AsyncLocalStorage();
export const currentLlmOverrides = () => context.getStore() || {};

export function validateLlmSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('请填写有效的模型配置');
  const value = {};
  for (const field of ['model', 'baseUrl', 'key']) {
    if (input[field] !== undefined && typeof input[field] !== 'string') throw new Error('模型配置必须是文本');
    value[field] = (input[field] || '').trim();
    if (value[field].length > (field === 'key' ? 4096 : 512)) throw new Error('模型配置内容过长');
  }
  if (value.baseUrl) {
    let url;
    try { url = new URL(value.baseUrl); } catch { throw new Error('请填写完整的 API 地址'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('API 地址应为不带凭证与参数的 HTTPS 地址');
    value.baseUrl = value.baseUrl.replace(/\/+$/, '');
    if (value.baseUrl.endsWith('/chat/completions')) value.baseUrl = value.baseUrl.slice(0, -17);
    if (!BUILTIN_BASE_URLS.includes(value.baseUrl) && !value.key) throw new Error('使用自定义 API 地址时，请同时填写该服务的 API Key');
  }
  return value;
}

export function llmSettingsMiddleware(defaults) {
  const sessions = new Map();
  return async (req, res, next) => {
    const now = Date.now();
    for (const [id, session] of sessions) if (session.expires < now) sessions.delete(id);
    const token = /(?:^|;\s*)tuijian_llm=([a-f0-9-]{36})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    const session = sessions.get(token);
    if (req.url?.split('?')[0] !== '/api/settings/llm') return context.run(session?.config || {}, next);
    const json = (status, data) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
    const view = config => ({model:config?.model || '',baseUrl:config?.baseUrl || '',hasCustomKey:Boolean(config?.key),defaultModel:defaults().model,defaultBaseUrl:defaults().baseUrl,defaultConfigured:Boolean(defaults().key)});
    if (req.method === 'GET') return json(200, view(session?.config));
    if (req.method !== 'PUT') return json(405, {error:'操作方式不支持'});
    if (!sameOrigin(req)) return json(403, {error:'请在本站保存设置'});
    try {
      const chunks=[]; let size=0;
      for await (const chunk of req) { size+=chunk.length; if(size>8192)return json(413,{error:'配置内容过长'}); chunks.push(chunk); }
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      // 未重新输入时保留本会话的密钥；恢复默认明确清空全部覆盖项。
      const config=validateLlmSettings(input.reset ? {} : {...input,key:input.keepKey ? session?.config.key || '' : input.key});
      const id=token && sessions.has(token) ? token : randomUUID();
      if(sessions.size>=200&&!sessions.has(id))sessions.delete(sessions.keys().next().value);
      sessions.set(id,{config,expires:now+86400000});
      res.setHeader('Set-Cookie',`tuijian_llm=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${req.socket.encrypted ? '; Secure' : ''}`);
      return json(200,view(config));
    } catch(e) { return json(400,{error:e instanceof SyntaxError ? '配置格式不正确' : e.message}); }
  };
}
