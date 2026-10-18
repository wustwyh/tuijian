import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createLLMAdapter, loadLLMConfig } from '../src/llm.mjs';

const config = () => loadLLMConfig({ LLM_API_KEY: 'test-only-key', LLM_MAX_RETRIES: '0' });
const input = { stage: 'personas', system: 'Workflow system', prompt: 'Workflow prompt', response_schema: { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } }, additionalProperties: false } };
const envelope = (content = '{"ok":true}', finish_reason = 'stop', extra = {}) => ({ choices: [{ finish_reason, message: { content, ...extra } }] });
const response = (...args) => Response.json(envelope(...args));
const code = (status, message) => (error) => error.code === 'LLM_FAILED' && error.status === status && (!message || error.message.includes(message));

test('passes Workflow prompts/schema, uses bearer POST without redirects, returns only JSON object', async () => {
  const llm = createLLMAdapter(config(), { fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai-next.com/v1/chat/completions');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer test-only-key');
    assert.ok(options.signal instanceof AbortSignal);
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'kimi-k2.5');
    assert.equal(request.stream, false);
    assert.equal(request.messages[1].content, input.prompt);
    assert.ok(request.messages[0].content.startsWith(input.system));
    assert.ok(request.messages[0].content.includes(JSON.stringify(input.response_schema)));
    assert.deepEqual(request.response_format, { type: 'json_object' });
    assert.equal(request.thinking, undefined);
    return response();
  } });
  assert.deepEqual(await llm(input), { ok: true });
});

test('missing key and oversized or unserializable inputs do not call upstream', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return response(); };
  await assert.rejects(createLLMAdapter(loadLLMConfig({}), { fetchImpl })(input), code(503));
  const llm = createLLMAdapter(config(), { fetchImpl });
  await assert.rejects(llm({ ...input, prompt: 'a'.repeat(513 * 1024) }), code(502));
  await assert.rejects(llm({ ...input, response_schema: { value: 1n } }), code(502));
  await assert.rejects(llm({ ...input, prompt: '' }), code(502));
  assert.equal(calls, 0);
});

test('does not reveal provider errors or retry authentication failures', async () => {
  let calls = 0;
  const llm = createLLMAdapter({ ...config(), maxRetries: 2 }, { fetchImpl: async () => {
    calls++; return new Response('private upstream test-only-key', { status: 401 });
  } });
  await assert.rejects(llm(input), (error) => code(502)(error) && !JSON.stringify(error).includes('test-only-key') && !error.message.includes('private'));
  assert.equal(calls, 1);
});

test('only transient transport/status failures retry and the bound is respected', async () => {
  for (const first of [() => { throw new TypeError('private network failure'); }, () => new Response('private', { status: 429 })]) {
    let calls = 0;
    const llm = createLLMAdapter({ ...config(), maxRetries: 1 }, { fetchImpl: async () => ++calls === 1 ? first() : response() });
    assert.deepEqual(await llm(input), { ok: true });
    assert.equal(calls, 2);
  }
  let calls = 0;
  await assert.rejects(createLLMAdapter({ ...config(), maxRetries: 1 }, { fetchImpl: async () => {
    calls++; return new Response('private', { status: 429 });
  } })(input), code(503));
  assert.equal(calls, 2);
});

test('invalid, refused, truncated, reasoning-only, fenced and non-object outputs are not retried', async () => {
  const invalid = [
    () => new Response('{invalid'),
    () => response('{"ok":true}', 'length'),
    () => response('{"ok":true}', 'stop', { refusal: 'private refusal' }),
    () => response(null, 'stop', { reasoning_content: '{"ok":true}' }),
    () => response('```json\n{"ok":true}\n```'),
    () => response('[]'), () => response('null'), () => Response.json({}),
  ];
  for (const make of invalid) {
    let calls = 0;
    await assert.rejects(createLLMAdapter({ ...config(), maxRetries: 2 }, { fetchImpl: async () => { calls++; return make(); } })(input), code(502));
    assert.equal(calls, 1);
  }
});

test('caps both advertised and streamed response size', async () => {
  for (const make of [
    () => new Response('{}', { headers: { 'content-length': String(3 * 1024 * 1024) } }),
    () => new Response('x'.repeat(2 * 1024 * 1024 + 1)),
  ]) await assert.rejects(createLLMAdapter(config(), { fetchImpl: async () => make() })(input), code(502, '大小限制'));
});

test('one deadline covers slow real HTTP headers and streaming body as well as retry backoff', async (t) => {
  const server = createServer((req, res) => {
    if (req.url.startsWith('/body/')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.write('{'); }
    // Deliberately stall. The client must cancel instead of waiting for upstream completion.
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const mode of ['headers', 'body']) {
    const started = Date.now();
    await assert.rejects(createLLMAdapter({ ...config(), baseUrl: `${base}/${mode}`, timeoutMs: 100, maxRetries: 2 })(input), code(504));
    assert.ok(Date.now() - started < 2000);
  }
  let calls = 0;
  await assert.rejects(createLLMAdapter({ ...config(), timeoutMs: 50, maxRetries: 2 }, { fetchImpl: async () => { calls++; return new Response('', { status: 503 }); } })(input), code(504));
  assert.equal(calls, 1);
});

test('config validates credentials, transport and bounded retry settings without printing values', () => {
  assert.equal(loadLLMConfig({}).apiKey, '');
  for (const env of [
    { LLM_BASE_URL: 'http://example.test/v1' }, { LLM_BASE_URL: 'https://user:secret@example.test' },
    { LLM_BASE_URL: 'https://example.test?secret=x' }, { LLM_BASE_URL: 'https://example.test#fragment' },
    { LLM_MODEL: 'model\nheader' }, { LLM_API_KEY: 'private\nheader' },
    { LLM_TIMEOUT_MS: '0' }, { LLM_MAX_RETRIES: '3' }, { LLM_MAX_RETRIES: '1.5' },
    { LLM_MAX_TOKENS: '999999' }, { LLM_JSON_MODE: 'maybe' }, { LLM_THINKING: 'auto' },
  ]) assert.throws(() => loadLLMConfig(env), (error) => !error.message.includes('secret') && !error.message.includes('private'));
});

test('thinking and JSON mode compatibility overrides are explicit', async () => {
  const cfg = loadLLMConfig({ LLM_API_KEY: 'test-only-key', LLM_JSON_MODE: 'false', LLM_THINKING: 'disabled' });
  await createLLMAdapter(cfg, { fetchImpl: async (_, options) => {
    const request = JSON.parse(options.body);
    assert.equal(request.response_format, undefined);
    assert.deepEqual(request.thinking, { type: 'disabled' });
    return response();
  } })(input);
});
