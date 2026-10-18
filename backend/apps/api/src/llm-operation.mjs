import { performance } from 'node:perf_hooks';
import { createLLMAdapter, loadLLMConfig } from './llm.mjs';
import { ApiError } from './errors.mjs';

const TOTAL_MS = 120_000;
const CALL_MS = 60_000;
const STAGES = new Set(['personas', 'strategy', 'content', 'verify']);
const failed = (status, message) => new ApiError(status, 'LLM_FAILED', message);

/** One single-stage user action. Construct at acceptance; close in finally after the guarded commit. */
export function createLLMOperation(config = loadLLMConfig(), {
  stage, now = () => performance.now(), startedAt = now(), fetchImpl = globalThis.fetch,
} = {}) {
  if (!STAGES.has(stage) || !Number.isFinite(startedAt)) throw new Error('模型业务操作配置无效');
  const deadline = startedAt + TOTAL_MS;
  const controller = new AbortController();
  const maxInvocations = stage === 'verify' ? 1 : 2;
  const maxCalls = stage === 'verify' ? 2 : 4;
  let closed = false;
  let active = false;
  let invocations = 0;
  let calls = 0;
  let transportFailed = false;
  const remaining = () => Math.max(0, deadline - now());
  const timer = setTimeout(() => controller.abort(), remaining());

  function assertActive() {
    if (closed) throw failed(503, '模型业务操作已结束');
    if (!remaining()) controller.abort();
    if (controller.signal.aborted) throw failed(504, '模型业务操作总时限已耗尽');
  }

  const guardedFetch = async (url, options) => {
    assertActive();
    if (calls >= maxCalls) throw failed(502, '模型业务操作外呼额度已耗尽');
    calls++;
    // The actual network and streamed body share both deadlines; no abandoned Promise.race requests.
    return fetchImpl(url, { ...options, signal: AbortSignal.any([options.signal, controller.signal]) });
  };

  async function llm(request) {
    assertActive();
    if (request?.stage !== stage || active) throw failed(502, '模型业务操作阶段或调用顺序无效');
    if (transportFailed) throw failed(502, '模型调用已失败，不能作为输出修复重试');
    if (invocations >= maxInvocations) throw failed(502, '模型业务操作输出次数已达上限');
    active = true;
    invocations++;
    // Even LLM_MAX_RETRIES=2 cannot expand a generation operation beyond two transport attempts per output.
    const adapter = createLLMAdapter({
      ...config, maxRetries: Math.min(config.maxRetries, 1),
      timeoutMs: Math.min(config.timeoutMs, CALL_MS, remaining()),
    }, { fetchImpl: guardedFetch, signal: controller.signal });
    try {
      const result = await adapter(request);
      assertActive();
      return result;
    } catch (error) {
      // An adapter rejection is not a returned artifact. Workflow must not spend a repair call on it.
      transportFailed = true;
      assertActive();
      throw error;
    } finally { active = false; }
  }

  return {
    llm, assertActive, signal: controller.signal,
    stats: () => ({ llmCalls: invocations, upstreamCalls: calls, remainingMs: Math.floor(remaining()) }),
    close() { closed = true; clearTimeout(timer); controller.abort(); },
  };
}
