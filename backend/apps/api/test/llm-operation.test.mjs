import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createLLMOperation } from '../src/llm-operation.mjs';
import { loadLLMConfig } from '../src/llm.mjs';

const config = () => loadLLMConfig({ LLM_API_KEY: 'test-only-key', LLM_MAX_RETRIES: '2', LLM_TIMEOUT_MS: '120000' });
const input = (stage = 'content') => ({ stage, system: 'test', prompt: 'test', response_schema: { type: 'object' } });
const response = () => Response.json({ choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }] });
const timedOut = (error) => error.status === 504 && error.code === 'LLM_FAILED';

test('clamps configured two retries to one, shares four calls across at most two returned outputs', async () => {
  let calls = 0;
  const operation = createLLMOperation(config(), { stage: 'content', fetchImpl: async () => {
    calls++;
    return calls % 2 ? new Response('', { status: 503 }) : response();
  } });
  try {
    assert.deepEqual(await operation.llm(input()), { ok: true });
    assert.deepEqual(await operation.llm(input()), { ok: true });
    await assert.rejects(operation.llm(input()), /次数/u);
    assert.equal(operation.stats().llmCalls, 2);
    assert.equal(operation.stats().upstreamCalls, 4);
    assert.equal(calls, 4);
  } finally { operation.close(); }
});

test('verify permits only one output and does not grant a repair attempt', async () => {
  const operation = createLLMOperation(config(), { stage: 'verify', fetchImpl: async () => response() });
  try {
    await operation.llm(input('verify'));
    await assert.rejects(operation.llm(input('verify')), /次数/u);
    assert.equal(operation.stats().upstreamCalls, 1);
  } finally { operation.close(); }
});

test('adapter failures do not open an output-repair retry path', async () => {
  for (const make of [() => new Response('', { status: 401 }), () => Response.json({ invalid: true })]) {
    let calls = 0;
    const operation = createLLMOperation(config(), { stage: 'content', fetchImpl: async () => { calls++; return make(); } });
    try {
      await assert.rejects(operation.llm(input()), (error) => error.code === 'LLM_FAILED');
      await assert.rejects(operation.llm(input()), /不能作为输出修复/u);
      assert.equal(calls, 1);
    } finally { operation.close(); }
  }
});

test('monotonic acceptance deadline guards second output and result commit, even after an idle gap', async () => {
  let time = 100;
  const operation = createLLMOperation(config(), { stage: 'content', now: () => time, startedAt: 0, fetchImpl: async () => response() });
  try {
    await operation.llm(input());
    time = 120000;
    assert.throws(() => operation.assertActive(), timedOut);
    await assert.rejects(operation.llm(input()), timedOut);
    assert.equal(operation.stats().upstreamCalls, 1);
    assert.equal(operation.signal.aborted, true);
  } finally { operation.close(); }
});

test('shared deadline aborts real stalled HTTP body and releases network socket', async (t) => {
  const server = createServer((req, res) => { res.writeHead(200); res.write('{'); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  const cfg = { ...config(), baseUrl: `http://127.0.0.1:${server.address().port}` };
  const operation = createLLMOperation(cfg, { stage: 'content', now: () => 119900, startedAt: 0 });
  const started = Date.now();
  try {
    await assert.rejects(operation.llm(input()), timedOut);
    assert.ok(Date.now() - started < 2000);
    assert.equal(operation.signal.aborted, true);
    assert.equal(operation.stats().upstreamCalls, 1);
  } finally { operation.close(); }
});

test('rejects cross-stage and parallel model calls without spending extra upstream calls; close cancels active request', async () => {
  const operation = createLLMOperation(config(), { stage: 'content', fetchImpl: async (_, options) => {
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('test cancelled')), { once: true }));
  } });
  await assert.rejects(operation.llm(input('personas')), /阶段/u);
  assert.equal(operation.stats().upstreamCalls, 0);
  const first = operation.llm(input());
  await assert.rejects(operation.llm(input()), /顺序/u);
  const started = Date.now();
  operation.close();
  await assert.rejects(first, /已结束/u);
  assert.ok(Date.now() - started < 200, 'cancellation must also interrupt transport retry backoff');
  assert.equal(operation.stats().upstreamCalls, 1);
});
