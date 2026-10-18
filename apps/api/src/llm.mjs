import { setTimeout as delay } from 'node:timers/promises';
import { ApiError } from './errors.mjs';

const RESPONSE_LIMIT = 2 * 1024 * 1024;
const REQUEST_LIMIT = 512 * 1024;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const failed = (status, message) => new ApiError(status, 'LLM_FAILED', message);

function integer(value, fallback, minimum, maximum, name) {
  const number = value === undefined || value === '' ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) throw new Error(`${name} 配置无效`);
  return number;
}

export function loadLLMConfig(env = process.env) {
  let base;
  try { base = new URL(env.LLM_BASE_URL || 'https://api.openai-next.com/v1'); } catch { throw new Error('LLM_BASE_URL 配置无效'); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('LLM_BASE_URL 必须是无凭证、无查询参数的 HTTPS 地址');
  const model = (env.LLM_MODEL || 'kimi-k2.5').trim();
  if (!/^[a-zA-Z0-9_./:-]{1,200}$/u.test(model)) throw new Error('LLM_MODEL 配置无效');
  const apiKey = (env.LLM_API_KEY || '').trim();
  if (apiKey.length > 4096 || /\s/u.test(apiKey)) throw new Error('LLM_API_KEY 格式无效');
  const thinking = env.LLM_THINKING?.trim() || undefined;
  if (thinking && !['enabled', 'disabled'].includes(thinking)) throw new Error('LLM_THINKING 配置无效');
  if (env.LLM_JSON_MODE && !['true', 'false'].includes(env.LLM_JSON_MODE)) throw new Error('LLM_JSON_MODE 配置无效');
  return {
    baseUrl: base.href.replace(/\/+$/u, ''), model, apiKey, thinking,
    timeoutMs: integer(env.LLM_TIMEOUT_MS, 60_000, 1000, 120_000, 'LLM_TIMEOUT_MS'),
    maxRetries: integer(env.LLM_MAX_RETRIES, 1, 0, 2, 'LLM_MAX_RETRIES'),
    maxTokens: integer(env.LLM_MAX_TOKENS, 8192, 128, 32768, 'LLM_MAX_TOKENS'),
    jsonMode: env.LLM_JSON_MODE !== 'false',
  };
}

async function readEnvelope(response) {
  if (!response.body) throw failed(502, '模型服务返回空响应');
  if (Number(response.headers.get('content-length')) > RESPONSE_LIMIT) {
    await response.body.cancel().catch(() => {});
    throw failed(502, '模型服务响应超出大小限制');
  }
  const reader = response.body.getReader();
  let size = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > RESPONSE_LIMIT) {
        await reader.cancel().catch(() => {});
        throw failed(502, '模型服务响应超出大小限制');
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw failed(502, '模型服务响应格式无效'); }
}

function extractResult(envelope) {
  const choice = envelope?.choices?.[0];
  if (choice?.finish_reason === 'length') throw failed(502, '模型输出达到长度上限，请缩短输入或提高输出上限');
  if (choice?.finish_reason !== 'stop' || choice.message?.refusal) throw failed(502, '模型未完成结构化输出');
  const content = choice.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw failed(502, '模型未返回 JSON 正文');
  let result;
  try { result = JSON.parse(content); } catch { throw failed(502, '模型正文不是有效 JSON'); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw failed(502, '模型正文必须是 JSON 对象');
  return result;
}

/** Workflow seam: ({stage, system, prompt, response_schema}) -> JSON object, not vendor envelope. */
export function createLLMAdapter(config = loadLLMConfig(), { fetchImpl = globalThis.fetch } = {}) {
  return async ({ system, prompt, response_schema } = {}) => {
    if (!config.apiKey) throw failed(503, '尚未配置服务端 LLM_API_KEY');
    if (typeof system !== 'string' || !system.trim() || typeof prompt !== 'string' || !prompt.trim() ||
      !response_schema || typeof response_schema !== 'object' || Array.isArray(response_schema)) {
      throw failed(502, '模型调用输入缺少提示词或 JSON Schema');
    }
    let body;
    try {
      body = JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: `${system}\n\nReturn only a JSON object matching this JSON Schema, with no code fences:\n${JSON.stringify(response_schema)}` },
          { role: 'user', content: prompt },
        ],
        stream: false,
        max_tokens: config.maxTokens,
        ...(config.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(config.thinking ? { thinking: { type: config.thinking } } : {}),
      });
    } catch { throw failed(502, '模型调用输入无法序列化'); }
    if (Buffer.byteLength(body) > REQUEST_LIMIT) throw failed(502, '模型调用输入超过大小限制');

    // One total deadline includes retries, response reading and backoff. Never follow credential-bearing redirects.
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        if (attempt) await delay(250 * attempt, undefined, { signal: controller.signal });
        let response;
        try {
          response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
            method: 'POST', redirect: 'error', signal: controller.signal,
            headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, body,
          });
        } catch {
          if (controller.signal.aborted) throw failed(504, '模型服务调用超时');
          if (attempt < config.maxRetries) continue;
          throw failed(502, '无法连接模型服务，请检查服务端网络与 API 地址');
        }
        if (!response.ok) {
          // Discard provider error text: it may contain keys, request content or internal routing information.
          await response.body?.cancel().catch(() => {});
          if (RETRYABLE.has(response.status) && attempt < config.maxRetries) continue;
          if ([401, 403].includes(response.status)) throw failed(502, '模型服务鉴权失败，请检查服务端 key 与账户权限');
          if (response.status === 429) throw failed(503, '模型服务限流或额度不足，请稍后重试或检查账户');
          throw failed(502, '模型服务请求失败，请检查模型名称、参数和服务状态');
        }
        // Invalid/truncated/refused model output is not retried as a transport failure.
        return extractResult(await readEnvelope(response));
      }
    } catch (error) {
      if (controller.signal.aborted) throw failed(504, '模型服务调用超时');
      if (error instanceof ApiError) throw error;
      throw failed(502, '模型服务响应读取失败');
    } finally { clearTimeout(deadline); }
  };
}
