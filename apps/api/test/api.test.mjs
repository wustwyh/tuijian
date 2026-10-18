import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { createApi } from '../src/api.mjs';
import { loadConfig } from '../src/config.mjs';
import { Store } from '../src/store.mjs';

const PASSWORD = 'test-only-passphrase-2026';
const INPUT = { product_query: 'test-product', platform: 'xiaohongshu', audience_hint: '测试人群', scenario: '测试场景', goal: '测试动作' };
const ORIGIN = 'http://localhost:5173';

async function fixture(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'huawei-api-b1-'));
  const databasePath = join(directory, 'database.sqlite');
  let server;
  const app = {
    databasePath,
    async open() {
      server = createApi({ databasePath, allowedOrigins: [ORIGIN], ...options });
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      app.base = `http://127.0.0.1:${server.address().port}`;
    },
    async close() {
      if (!server?.listening) return;
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
    async request(path, { method = 'GET', cookie, body, raw, headers = {} } = {}) {
      const response = await fetch(`${app.base}${path}`, {
        method,
        headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
        body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
        redirect: 'error',
      });
      const text = await response.text();
      return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : undefined,
        cookie: response.headers.get('set-cookie')?.split(';')[0] };
    },
    async register(email) {
      const result = await app.request('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });
      assert.equal(result.status, 201, JSON.stringify(result.data));
      assert.ok(result.cookie);
      return result;
    },
  };
  t.after(async () => { await app.close(); await rm(directory, { recursive: true, force: true }); });
  await app.open();
  return app;
}

test('passwords and sessions are real, durable, hashed, and revoked on logout', async (t) => {
  const app = await fixture(t);
  const registered = await app.register('Sales.A@Example.test');
  const { user } = registered.data;
  assert.equal(user.email, 'sales.a@example.test');
  assert.match(user.id, /^user_/u);
  assert.deepEqual(Object.keys(user).sort(), ['created_at', 'email', 'id']);
  assert.match(registered.headers.get('set-cookie'), /HttpOnly; SameSite=Lax; Max-Age=86400/u);
  assert.equal(registered.headers.get('cache-control'), 'no-store');
  assert.equal((await app.request('/api/auth/me', { cookie: registered.cookie })).data.user.id, user.id);
  assert.equal((await app.request('/api/auth/me')).status, 401);
  assert.equal((await app.request('/api/auth/me', { cookie: 'huawei_session=forged' })).status, 401);

  const task = (await app.request('/api/tasks', { method: 'POST', cookie: registered.cookie, body: INPUT })).data.task;
  await app.close();
  const db = new DatabaseSync(app.databasePath);
  const stored = db.prepare('SELECT * FROM users').get();
  assert.notEqual(stored.password_hash, PASSWORD);
  assert.match(stored.password_hash, /^[a-f0-9]{128}$/u);
  assert.match(stored.password_salt, /^[a-f0-9]{32}$/u);
  const storedSession = db.prepare('SELECT * FROM sessions').get();
  assert.notEqual(storedSession.token_hash, registered.cookie.split('=')[1]);
  assert.match(storedSession.token_hash, /^[a-f0-9]{64}$/u);
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
  assert.equal(db.prepare('SELECT user_id FROM tasks WHERE id = ?').get(task.id).user_id, user.id);
  db.close();
  await app.open();
  assert.equal((await app.request('/api/auth/me', { cookie: registered.cookie })).status, 200);
  assert.equal((await app.request(`/api/tasks/${task.id}`, { cookie: registered.cookie })).data.task.id, task.id);

  const incorrect = await app.request('/api/auth/login', { method: 'POST', body: { email: user.email, password: 'wrong-password-123' } });
  const nonexistent = await app.request('/api/auth/login', { method: 'POST', body: { email: 'missing@example.test', password: 'wrong-password-123' } });
  assert.equal(incorrect.status, 401);
  assert.deepEqual(incorrect.data, nonexistent.data);
  const duplicate = await app.request('/api/auth/register', { method: 'POST', body: { email: 'SALES.A@example.test', password: PASSWORD } });
  assert.equal(duplicate.status, 400);
  const login = await app.request('/api/auth/login', { method: 'POST', body: { email: 'SALES.A@example.test', password: PASSWORD } });
  assert.equal(login.status, 200);
  assert.notEqual(login.cookie, registered.cookie);
  assert.equal(login.data.user.id, user.id);
  const logout = await app.request('/api/auth/logout', { method: 'POST', cookie: login.cookie });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/u);
  assert.equal((await app.request('/api/auth/me', { cookie: login.cookie })).status, 401);
  await app.close();
  await app.open();
  assert.equal((await app.request('/api/auth/me', { cookie: login.cookie })).status, 401);
});

test('two users cannot list, read, modify, or spoof ownership of each other’s tasks', async (t) => {
  const app = await fixture(t);
  const a = await app.register('a@example.test');
  const b = await app.register('b@example.test');
  for (const method of ['GET', 'POST']) {
    assert.equal((await app.request('/api/tasks', { method, ...(method === 'POST' ? { body: INPUT } : {}) })).status, 401);
  }
  const created = await app.request('/api/tasks', { method: 'POST', cookie: a.cookie, body: INPUT });
  assert.equal(created.status, 201);
  const { task } = created.data;
  assert.equal(task.user_id, a.data.user.id);
  assert.equal(task.status, 'draft');
  assert.equal(task.resolved_product_name, null);
  assert.equal((await app.request('/api/tasks', { cookie: a.cookie })).data.tasks.length, 1);
  assert.deepEqual((await app.request('/api/tasks', { cookie: b.cookie })).data.tasks, []);
  for (const method of ['GET', 'PATCH']) {
    const attack = await app.request(`/api/tasks/${task.id}`, { method, cookie: b.cookie,
      ...(method === 'PATCH' ? { body: { goal: 'unauthorized edit' } } : {}) });
    assert.equal(attack.status, 404);
    assert.deepEqual(attack.data, (await app.request('/api/tasks/task_missing', { cookie: b.cookie })).data);
  }
  for (const field of ['user_id', 'id', 'status', 'resolved_product_name']) {
    const spoof = await app.request('/api/tasks', { method: 'POST', cookie: b.cookie, body: { ...INPUT, [field]: a.data.user.id } });
    assert.equal(spoof.status, 400);
    const patch = await app.request(`/api/tasks/${task.id}`, { method: 'PATCH', cookie: a.cookie, body: { [field]: 'verified' } });
    assert.equal(patch.status, 400);
  }
  const update = await app.request(`/api/tasks/${task.id}`, { method: 'PATCH', cookie: a.cookie, body: { audience_hint: '另一个人群', platform: 'wechat_official' } });
  assert.equal(update.status, 200);
  assert.equal(update.data.task.audience_hint, '另一个人群');
  assert.equal(update.data.task.platform, 'wechat_official');
  assert.equal(update.data.task.user_id, a.data.user.id);
  assert.equal(update.data.task.product_query, INPUT.product_query);
  await app.close();
  await app.open();
  const reopened = await app.request(`/api/tasks/${task.id}`, { cookie: a.cookie });
  assert.deepEqual(reopened.data.task, update.data.task);
  assert.deepEqual((await app.request('/api/tasks', { cookie: b.cookie })).data.tasks, []);
});

test('cookie authentication rejects untrusted browser origins and cross-site writes', async (t) => {
  const app = await fixture(t);
  const a = await app.register('origin@example.test');
  const allowed = await app.request('/api/auth/me', { cookie: a.cookie, headers: { Origin: ORIGIN } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(allowed.headers.get('access-control-allow-credentials'), 'true');
  const blocked = await app.request('/api/tasks', { method: 'POST', cookie: a.cookie, body: INPUT, headers: { Origin: 'https://attacker.invalid' } });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  assert.equal((await app.request('/api/auth/logout', { method: 'POST', cookie: a.cookie, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await app.request('/api/auth/me', { cookie: a.cookie })).status, 200);
  const preflight = await app.request('/api/tasks', { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(preflight.status, 204);
  assert.equal((await app.request('/api/tasks', { method: 'OPTIONS', headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'DELETE' } })).status, 403);
});

test('rejects invalid inputs and oversized bodies; SQL-like task text remains data', async (t) => {
  const app = await fixture(t);
  assert.equal((await app.request('/api/auth/register', { method: 'POST', body: { email: 'invalid', password: PASSWORD } })).status, 400);
  assert.equal((await app.request('/api/auth/register', { method: 'POST', body: { email: 'valid@example.test', password: 'short' } })).status, 400);
  const a = await app.register('validation@example.test');
  for (const body of [null, [], {}, { ...INPUT, platform: 'unknown' }, { ...INPUT, product_query: '' }, { ...INPUT, product_query: 42 }, { ...INPUT, scenario: null }, { ...INPUT, goal: 'a'.repeat(2001) }]) {
    const result = await app.request('/api/tasks', { method: 'POST', cookie: a.cookie, body });
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.equal(result.data.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(result.data.error.details, []);
  }
  assert.equal((await app.request('/api/tasks', { method: 'POST', cookie: a.cookie, raw: '{' })).status, 400);
  assert.equal((await app.request('/api/tasks', { method: 'POST', cookie: a.cookie, body: INPUT, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await app.request('/api/tasks', { method: 'POST', cookie: a.cookie, raw: JSON.stringify({ goal: 'a'.repeat(33 * 1024) }) })).status, 413);
  const injection = "test'); DROP TABLE users; --";
  const created = await app.request('/api/tasks', { method: 'POST', cookie: a.cookie, body: { ...INPUT, product_query: injection } });
  assert.equal(created.status, 201);
  assert.equal(created.data.task.product_query, injection);
  assert.equal((await app.request('/api/auth/me', { cookie: a.cookie })).status, 200);
  assert.equal((await app.request(`/api/tasks/${created.data.task.id}`, { method: 'PATCH', cookie: a.cookie, body: {} })).status, 400);
  const duplicateCookies = `${a.cookie}; ${a.cookie}`;
  assert.equal((await app.request('/api/tasks', { cookie: duplicateCookies })).status, 401);
});

test('sessions expire on the server, auth attempts are limited, secure cookies use Host prefix', async (t) => {
  let time = Date.now();
  const app = await fixture(t, { now: () => time, sessionTtlMs: 1000, authLimit: 3, secureCookies: true });
  const a = await app.register('expiry@example.test');
  assert.match(a.cookie, /^__Host-huawei_session=/u);
  assert.match(a.headers.get('set-cookie'), /; Secure$/u);
  assert.equal((await app.request('/api/auth/me', { cookie: a.cookie })).status, 200);
  time += 1001;
  assert.equal((await app.request('/api/auth/me', { cookie: a.cookie })).status, 401);
  for (let i = 0; i < 2; i++) {
    assert.equal((await app.request('/api/auth/login', { method: 'POST', body: { email: 'expiry@example.test', password: 'wrong-password-123' } })).status, 401);
  }
  const limited = await app.request('/api/auth/login', { method: 'POST', body: { email: 'expiry@example.test', password: PASSWORD } });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '900');
  time += 15 * 60 * 1000;
  assert.equal((await app.request('/api/auth/login', { method: 'POST', body: { email: 'expiry@example.test', password: PASSWORD } })).status, 200);
});

test('runtime config requires persistent storage and safe production cookie/origin settings', () => {
  const config = loadConfig({});
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 3001);
  assert.match(config.databasePath, /marketing\.sqlite$/u);
  assert.equal(config.secureCookies, false);
  assert.throws(() => new Store(':memory:'), /persistent/u);
  for (const env of [
    { API_DATABASE_PATH: ':memory:' }, { API_PORT: 'NaN' }, { API_PORT: '0' },
    { API_ALLOWED_ORIGINS: '*' }, { API_ALLOWED_ORIGINS: 'https://example.test/path' },
    { NODE_ENV: 'production' },
    { NODE_ENV: 'production', API_COOKIE_SECURE: 'false', API_ALLOWED_ORIGINS: 'https://example.test' },
    { NODE_ENV: 'production', API_ALLOWED_ORIGINS: 'http://example.test' },
  ]) assert.throws(() => loadConfig(env));
  assert.equal(loadConfig({ NODE_ENV: 'production', API_ALLOWED_ORIGINS: 'https://example.test' }).secureCookies, true);
});
