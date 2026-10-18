import { loadLocalEnv } from './env.mjs';
import { createLLMAdapter, loadLLMConfig } from './llm.mjs';
import { ApiError } from './errors.mjs';

try {
  loadLocalEnv();
  const config = loadLLMConfig();
  if (!config.apiKey) {
    console.log(JSON.stringify({ ok: false, configured: false, model: config.model, message: '请在 apps/api/.env 填写 LLM_API_KEY 后重试' }));
    process.exitCode = 2;
  } else {
    const startedAt = Date.now();
    const llm = createLLMAdapter(config);
    const result = await llm({
      stage: 'connectivity_check', system: 'You are a connectivity checker. Return the requested JSON object only.',
      prompt: 'Return exactly {"ok":true}.',
      response_schema: { type: 'object', properties: { ok: { type: 'boolean', const: true } }, required: ['ok'], additionalProperties: false },
    });
    if (result.ok !== true || Object.keys(result).length !== 1) throw new ApiError(502, 'LLM_FAILED', '模型未返回预期的检查结果');
    console.log(JSON.stringify({ ok: true, configured: true, model: config.model, elapsed_ms: Date.now() - startedAt }));
  }
} catch (error) {
  console.log(JSON.stringify({ ok: false, code: 'LLM_FAILED', message: error instanceof ApiError ? error.message : '请检查后端 LLM 配置与网络' }));
  process.exitCode = 1;
}
