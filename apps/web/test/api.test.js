import test from 'node:test';
import assert from 'node:assert/strict';
import { createApi, ApiError } from '../src/api.js';

test('unfrozen auth and response adapters fail closed without network requests', async () => {
  let called = false;
  const api = createApi({ fetchImpl: async () => { called = true; } });
  await assert.rejects(api.session(), { code: 'INTEGRATION_PENDING' });
  await assert.rejects(api.login({ account: 'test-only', password: 'test-only' }), { code: 'INTEGRATION_PENDING' });
  await assert.rejects(api.tasks(), { code: 'INTEGRATION_PENDING' });
  assert.equal(called, false);
});
test('task creation forwards only supplied input, uses same-origin auth, and adapts the response', async () => {
  let received;
  const input = { product_query: 'test fixture', platform: 'xiaohongshu' };
  const api = createApi({ integration: { responses: { task: raw => raw.result } }, fetchImpl: async (path, init) => {
    received = { path, init }; return Response.json({ result: { id: 'fixture-task' } });
  } });
  assert.deepEqual(await api.createTask(input), { id: 'fixture-task' });
  assert.equal(received.path, '/api/tasks'); assert.equal(received.init.method, 'POST');
  assert.equal(received.init.credentials, 'same-origin'); assert.equal(received.init.cache, 'no-store');
  assert.deepEqual(JSON.parse(received.init.body), input);
});
test('401 clears identity and retains contract error details', async () => {
  let expired = 0;
  const api = createApi({ onUnauthorized: () => expired++, fetchImpl: async () => Response.json({ error: { code: 'UNAUTHORIZED', message: 'expired', details: ['fixture'] } }, { status: 401 }) });
  await assert.rejects(api.request('/api/tasks'), err => err instanceof ApiError && err.status === 401 && err.details[0] === 'fixture');
  assert.equal(expired, 1);
});
test('403 is a real error and does not substitute an empty list or expire a valid session', async () => {
  let expired = false;
  const api = createApi({ onUnauthorized: () => { expired = true; }, fetchImpl: async () => Response.json({ error: { code: 'FORBIDDEN', message: 'denied' } }, { status: 403 }) });
  await assert.rejects(api.request('/api/tasks/other-user'), { code: 'FORBIDDEN', message: 'denied' });
  assert.equal(expired, false);
});
test('HTML fallback, network failure and canceled requests remain distinct', async () => {
  await assert.rejects(createApi({ fetchImpl: async () => new Response('<html>fallback</html>') }).request('/api/tasks'), { code: 'INVALID_RESPONSE' });
  await assert.rejects(createApi({ fetchImpl: async () => { throw new TypeError('offline'); } }).request('/api/tasks'), { code: 'NETWORK_ERROR' });
  const error = new DOMException('canceled', 'AbortError');
  await assert.rejects(createApi({ fetchImpl: async () => { throw error; } }).request('/api/tasks'), err => err === error);
});
test('API transport refuses outside endpoints and encodes task IDs', async () => {
  const paths = [];
  const api = createApi({ integration: { responses: { detail: raw => raw } }, fetchImpl: async path => { paths.push(path); return Response.json({}); } });
  await assert.rejects(api.request('https://other.example/api/tasks'), { code: 'INVALID_API_PATH' });
  await assert.rejects(api.request('/api/../secrets'), { code: 'INVALID_API_PATH' });
  await api.task('fixture/with space');
  assert.deepEqual(paths, ['/api/tasks/fixture%2Fwith%20space']);
});
