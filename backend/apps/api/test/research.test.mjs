import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createApi } from '../src/api.mjs';

const PRODUCT = 'test-only exact product';
const INPUT = { product_query: 'test-only product query', platform: 'xiaohongshu', audience_hint: 'test audience', scenario: 'test scenario', goal: 'test goal' };
const BYTES = Buffer.from('test-only-image-bytes');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'backend-research-'));
  const app = { imageBytes: BYTES, imaCalls: 0, llmCalls: 0, closed: 0, beforeGenerate: async () => {}, beforeImage: async () => {} };
  const researchDependencies = {
    ima: {
      async retrieveProductEvidence(input) {
        app.imaCalls++;
        if (app.upstreamError) throw app.upstreamError;
        if (!input.confirmedProduct) return { status: 'ambiguous', knowledgeBaseId: 'test-kb', candidates: [{ product: PRODUCT, reason: 'test-only online candidate' }], warnings: ['test warning'] };
        assert.equal(input.confirmedProduct, PRODUCT);
        return { status: 'resolved', product: PRODUCT, knowledgeBaseId: 'test-kb', warnings: ['test warning'], evidence: [
          { knowledge_base_id: 'test-kb', media_id: 'test-doc', media_type: 'MARKDOWN', applicable_model: PRODUCT, source_url: null, verification_status: 'pending', fact_excerpt: 'test-only evidence' },
          { knowledge_base_id: 'test-kb', media_id: 'test-image', media_type: 'IMG', applicable_model: PRODUCT, source_url: null, verification_status: 'pending', image_metadata: { sha256: sha(BYTES) } },
        ] };
      },
      async fetchProductImage(input) {
        assert.equal(input.confirmedProduct, PRODUCT);
        assert.equal(input.mediaId, 'test-image');
        await app.beforeImage();
        return { bytes: app.imageBytes, contentType: 'image/png', imageMetadata: { sha256: sha(app.imageBytes) } };
      },
    },
    llmOperation: () => ({ llm: async () => { app.llmCalls++; return {}; }, assertActive() {}, close() { app.closed++; } }),
    workflowFactory: ({ llm }) => ({ async generatePersonas({ task, evidence }) {
      assert.equal(task.resolved_product_name, PRODUCT);
      assert.ok(evidence[0].id.startsWith('ev_'));
      await app.beforeGenerate();
      await llm({ stage: 'personas' });
      return { id: 'test-persona-report', task_id: task.id, status: 'draft', personas: [{ name: 'test-only audience' }] };
    } }),
  };
  let server;
  app.open = async () => {
    server = createApi({ databasePath: join(dir, 'db.sqlite'), researchDependencies });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    app.base = `http://127.0.0.1:${server.address().port}`;
  };
  app.close = () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  t.after(async () => { await app.close(); await rm(dir, { recursive: true, force: true }); });
  app.request = async (path, { cookie = app.cookie, method = 'GET', body } = {}) => {
    const response = await fetch(app.base + path, { method, headers: { ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, bytes, data: response.headers.get('content-type')?.startsWith('application/json') ? JSON.parse(bytes) : null };
  };
  app.register = async (email) => {
    const result = await app.request('/api/auth/register', { method: 'POST', cookie: '', body: { email, password: 'test-only-password-2026' } });
    return result.headers.get('set-cookie').split(';')[0];
  };
  await app.open();
  app.cookie = await app.register('a@example.test');
  app.foreignCookie = await app.register('b@example.test');
  app.taskId = (await app.request('/api/tasks', { method: 'POST', body: INPUT })).data.task.id;
  app.path = `/api/tasks/${app.taskId}`;
  app.post = (action, body, options = {}) => app.request(`${app.path}/${action}`, { method: 'POST', body, ...options });
  app.prepare = async () => {
    const searched = await app.post('ima-search', { expected_revision: 1 });
    assert.equal(searched.status, 200);
    assert.deepEqual(searched.data.retrieval.warnings, ['test warning']);
    const confirmed = await app.post('model-confirmation', { expected_revision: 2, candidate_id: searched.data.retrieval.candidates[0].candidate_id });
    assert.equal(confirmed.status, 200);
    return confirmed;
  };
  return app;
}

test('HTTP research persists evidence, user model selection and personas; repeat keys do not charge again', async (t) => {
  const app = await fixture(t);
  assert.equal((await app.request(app.path)).data.workflow_revision, 1);
  const confirmed = await app.prepare();
  assert.equal(confirmed.data.confirmations.model.source, 'user');
  assert.equal(confirmed.data.evidence[0].verification_status, 'pending');
  const request = { expected_revision: 3, operation_key: 'test-one-model-call' };
  const generated = await app.post('personas', request);
  assert.equal(generated.status, 200);
  assert.equal(generated.data.persona_report.status, 'draft');
  assert.equal(app.llmCalls, 1);
  assert.equal(app.closed, 1);
  assert.equal((await app.post('personas', request)).status, 200);
  assert.equal(app.llmCalls, 1);
  await app.close(); await app.open();
  const detail = await app.request(app.path);
  assert.equal(detail.data.workflow_revision, 4);
  assert.equal(detail.data.persona_report.id, 'test-persona-report');
  assert.equal(detail.data.freshness.personas.status, 'current');
  assert.equal((await app.request(app.path, { cookie: app.foreignCookie })).status, 404);
  assert.equal((await app.post('personas', { expected_revision: -1 }, { cookie: app.foreignCookie })).status, 404);
  assert.equal((await app.post('ima-search', { expected_revision: 4, evidence: [] })).status, 400);
});

test('image proxy enforces ownership and current evidence; actual access never marks verification passed', async (t) => {
  const app = await fixture(t);
  const selected = await app.prepare();
  const id = selected.data.evidence.find((item) => item.media_type === 'IMG').id;
  const path = `${app.path}/evidence/${id}/image`;
  assert.equal((await app.request(path, { cookie: '' })).status, 401);
  assert.equal((await app.request(path, { cookie: app.foreignCookie })).status, 404);
  const result = await app.request(path);
  assert.equal(result.status, 200);
  assert.deepEqual(result.bytes, BYTES);
  assert.equal(result.headers.get('content-type'), 'image/png');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal((await app.request(app.path)).data.evidence.find((item) => item.id === id).verification_status, 'pending');
  app.imageBytes = Buffer.from('test-only changed image');
  assert.equal((await app.request(path)).data.error.code, 'EVIDENCE_CHANGED');
  const changed = await app.request(app.path);
  assert.equal(changed.data.workflow_revision, 4);
  assert.equal(changed.data.freshness.evidence.status, 'stale');
  assert.equal((await app.request(path)).status, 404);
});

test('input edits during model or image requests prevent old responses from becoming current', async (t) => {
  const app = await fixture(t);
  const selected = await app.prepare();
  let release, entered;
  const entry = new Promise((resolve) => { entered = resolve; });
  const gate = new Promise((resolve) => { release = resolve; });
  app.beforeGenerate = async () => { entered(); await gate; };
  const pending = app.post('personas', { expected_revision: 3 });
  await entry;
  assert.equal((await app.post('personas', { expected_revision: 3 })).status, 409);
  await app.request(app.path, { method: 'PATCH', body: { goal: 'test-only newer input' } });
  release();
  assert.equal((await pending).data.error.code, 'REVISION_CONFLICT');
  assert.equal((await app.request(app.path)).data.persona_report, null);
  assert.equal(app.closed, 1);
  // Re-establish current evidence, then edit while the bytes are being refreshed.
  const searched = await app.post('ima-search', { expected_revision: 4 });
  const confirmed = await app.post('model-confirmation', { expected_revision: 5, candidate_id: searched.data.retrieval.candidates[0].candidate_id });
  app.beforeImage = async () => { await app.request(app.path, { method: 'PATCH', body: { goal: 'another input change' } }); };
  const id = confirmed.data.evidence.find((item) => item.media_type === 'IMG').id;
  assert.equal((await app.request(`${app.path}/evidence/${id}/image`)).data.error.code, 'REVISION_CONFLICT');
  assert.ok(selected.data.evidence.length);
});

test('upstream auth errors are sanitized and failed idempotent requests never reissue network calls', async (t) => {
  const app = await fixture(t);
  app.upstreamError = Object.assign(new Error('provider-secret-and-url'), { code: 'IMA_AUTH_FAILED' });
  const request = { expected_revision: 1, operation_key: 'test-error-once' };
  const first = await app.post('ima-search', request);
  assert.equal(first.status, 502);
  assert.equal(first.data.error.code, 'IMA_AUTH_FAILED');
  assert.ok(!JSON.stringify(first.data).includes('secret'));
  assert.equal((await app.post('ima-search', request)).status, 502);
  assert.equal(app.imaCalls, 1);
  assert.ok(!JSON.stringify((await app.request(app.path)).data.operations).includes('secret'));
});
