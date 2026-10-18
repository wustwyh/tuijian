import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { Store } from '../src/store.mjs';

const INPUT = { product_query: 'test-only-product', platform: 'xiaohongshu', audience_hint: '', scenario: '', goal: 'test-only-goal' };
const NOW = Date.UTC(2026, 9, 18, 8);

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'backend-execution-'));
  const path = join(dir, 'test.sqlite');
  const state = { path, store: new Store(path) };
  t.after(async () => { state.store.close(); await rm(dir, { recursive: true, force: true }); });
  for (const id of ['user_a', 'user_b']) {
    state.store.createUser(`${id}@example.test`, { salt: 'test-only', hash: 'test-only' },
      { userId: id, hash: `test-only-${id}`, createdAt: NOW, expiresAt: NOW + 10000 }, NOW);
  }
  state.taskA = state.store.createTask('user_a', INPUT, NOW).id;
  state.taskB = state.store.createTask('user_b', INPUT, NOW).id;
  state.begin = (options = {}) => state.store.execution.begin({ userId: 'user_a', taskId: state.taskA, action: 'personas', expectedRevision: 1, now: NOW, ...options });
  state.commit = (op, options = {}) => state.store.execution.commit({ userId: 'user_a', taskId: state.taskA, operationId: op.id,
    outputs: [{ kind: 'personas', payload: { testOnly: 'first' } }], now: NOW + 1, ...options });
  state.reopen = () => { state.store.close(); state.store = new Store(path); };
  return state;
}

const code = (expected) => (error) => error.code === expected;

test('schema upgrade preserves existing v1 accounts, sessions and tasks', async (t) => {
  const app = await fixture(t);
  app.store.close();
  const db = new DatabaseSync(app.path);
  db.exec('DROP TABLE current_artifacts; DROP TABLE artifacts; DROP TABLE operations; DROP INDEX tasks_id_owner; PRAGMA user_version=1;');
  db.close();
  app.store = new Store(app.path);
  assert.equal(app.store.db.prepare('PRAGMA user_version').get().user_version, 2);
  assert.equal(app.store.getTask('user_a', app.taskA).product_query, INPUT.product_query);
  assert.equal(app.store.currentUser('test-only-user_a', NOW + 1).id, 'user_a');
  assert.equal(app.store.findUser('user_b@example.test').password_hash, 'test-only');
  app.reopen();
  assert.equal(app.store.listTasks('user_a').length, 1);
});

test('artifact history, operation results and versions survive reopen; key replays never start a second execution', async (t) => {
  const app = await fixture(t);
  const first = app.begin({ operationKey: 'test-key', request: { b: 2, a: 1 } });
  assert.equal(first.replayed, false);
  assert.throws(() => app.begin({ operationKey: 'test-key', request: { a: 1, b: 2 } }), code('OPERATION_IN_PROGRESS'));
  app.commit(first.operation);
  app.reopen();
  const replay = app.begin({ operationKey: 'test-key', request: { a: 1, b: 2 } });
  assert.equal(replay.replayed, true);
  assert.equal(replay.operation.id, first.operation.id);
  assert.equal(replay.operation.status, 'succeeded');
  assert.equal(replay.operation.result[0].version, 1);
  assert.throws(() => app.begin({ operationKey: 'test-key', request: { a: 9, b: 2 } }), code('IDEMPOTENCY_CONFLICT'));
  const second = app.begin({ expectedRevision: 2, operationKey: 'another-key' });
  app.commit(second.operation, { outputs: [{ kind: 'personas', payload: { testOnly: 'second' } }] });
  assert.deepEqual(app.store.execution.history('user_a', app.taskA, 'personas').map((item) => item.version), [2, 1]);
  assert.equal(app.store.execution.snapshot('user_a', app.taskA).artifacts.personas.payload.testOnly, 'second');
  assert.throws(() => app.begin({ operationKey: 'test-key', request: { a: 1, b: 2 } }), code('REVISION_CONFLICT'));
  assert.throws(() => app.commit(first.operation), code('OPERATION_NOT_RUNNING'));
});

test('owned operations, history, snapshots, commits and dependencies reject foreign task IDs', async (t) => {
  const app = await fixture(t);
  const op = app.begin().operation;
  for (const taskId of [app.taskA, 'missing-task']) {
    assert.throws(() => app.store.execution.snapshot('user_b', taskId), code('NOT_FOUND'));
    assert.throws(() => app.store.execution.history('user_b', taskId, 'personas'), code('NOT_FOUND'));
    assert.throws(() => app.store.execution.listOperations('user_b', taskId), code('NOT_FOUND'));
    assert.throws(() => app.begin({ userId: 'user_b', taskId, expectedRevision: -1 }), code('NOT_FOUND'));
    assert.throws(() => app.store.execution.commit({ userId: 'user_b', taskId, operationId: op.id, now: NOW }), code('NOT_FOUND'));
    assert.throws(() => app.store.execution.fail({ userId: 'user_b', taskId, operationId: op.id, now: NOW }), code('NOT_FOUND'));
  }
  assert.throws(() => app.store.execution.ownedOperation('user_b', app.taskB, op.id), code('NOT_FOUND'));
  const saved = app.commit(op);
  const foreign = app.begin({ userId: 'user_b', taskId: app.taskB }).operation;
  assert.throws(() => app.store.execution.commit({ userId: 'user_b', taskId: app.taskB, operationId: foreign.id,
    outputs: [{ kind: 'strategy', payload: {}, dependencies: { personas: saved.artifacts[0] } }], now: NOW }), code('REVISION_CONFLICT'));
  // DB constraints additionally prevent accidentally binding a foreign owner to another user's task.
  assert.throws(() => app.store.db.prepare('UPDATE operations SET user_id=? WHERE id=?').run('user_b', op.id), /FOREIGN KEY/u);
});

test('two SQLite connections cannot run the same task concurrently; input change and change-back supersede the old work', async (t) => {
  const app = await fixture(t);
  const first = app.begin().operation;
  const other = new Store(app.path);
  try {
    assert.throws(() => other.execution.begin({ userId: 'user_a', taskId: app.taskA, action: 'content', expectedRevision: 1, now: NOW }), code('OPERATION_IN_PROGRESS'));
    // Opening a second connection is not a process restart and must not recover the active operation.
    assert.equal(other.execution.listOperations('user_a', app.taskA)[0].status, 'running');
    other.updateTask('user_a', app.taskA, { goal: 'changed' }, NOW + 1);
    other.updateTask('user_a', app.taskA, { goal: INPUT.goal }, NOW + 2);
    const replacement = other.execution.begin({ userId: 'user_a', taskId: app.taskA, action: 'personas', expectedRevision: 3, now: NOW + 3 }).operation;
    assert.throws(() => app.commit(first), code('REVISION_CONFLICT'));
    const committed = other.execution.commit({ userId: 'user_a', taskId: app.taskA, operationId: replacement.id,
      outputs: [{ kind: 'personas', payload: { testOnly: 'replacement' } }], now: NOW + 4 });
    assert.equal(committed.artifacts[0].version, 1);
    assert.equal(app.store.execution.snapshot('user_a', app.taskA).artifacts.personas.payload.testOnly, 'replacement');
  } finally { other.close(); }
});

test('deadline refusal rolls back all pointers, versions, invalidations and successful status', async (t) => {
  const app = await fixture(t);
  app.commit(app.begin().operation);
  const op = app.begin({ expectedRevision: 2 }).operation;
  let checks = 0;
  assert.throws(() => app.commit(op, { invalidate: ['personas'], assertActive() { if (++checks === 2) throw new Error('test deadline'); } }), /test deadline/u);
  assert.equal(checks, 2);
  assert.equal(app.store.execution.snapshot('user_a', app.taskA).revision, 2);
  assert.equal(app.store.execution.snapshot('user_a', app.taskA).artifacts.personas.freshness, 'current');
  assert.equal(app.store.execution.history('user_a', app.taskA, 'personas').length, 1);
  assert.equal(app.store.execution.ownedOperation('user_a', app.taskA, op.id).status, 'running');
  const result = app.commit(op);
  assert.equal(result.artifacts[0].version, 2);
});

test('service-supplied selective invalidation preserves upstream; stale dependencies cannot generate', async (t) => {
  const app = await fixture(t);
  const personas = app.commit(app.begin().operation).artifacts[0];
  const strategyOp = app.begin({ action: 'strategy', expectedRevision: 2 }).operation;
  app.commit(strategyOp, { outputs: [{ kind: 'strategy', payload: { testOnly: true }, dependencies: { personas } }] });
  const before = app.store.execution.snapshot('user_a', app.taskA);
  app.store.updateTask('user_a', app.taskA, { platform: 'wechat_official' }, NOW + 2,
    { expectedRevision: 3, invalidatedKinds: ['strategy', 'content', 'verification'] });
  const current = app.store.execution.snapshot('user_a', app.taskA);
  assert.equal(current.artifacts.personas.freshness, 'current');
  assert.equal(current.artifacts.strategy.freshness, 'stale');
  assert.deepEqual(current.artifacts.strategy.reasons, ['input_changed']);
  assert.equal(current.artifacts.strategy.id, before.artifacts.strategy.id);
  const contentOp = app.begin({ action: 'content', expectedRevision: 4 }).operation;
  assert.throws(() => app.commit(contentOp, { outputs: [{ kind: 'content', payload: {}, dependencies: { strategy: before.artifacts.strategy } }] }), code('REVISION_CONFLICT'));
  assert.throws(() => app.store.updateTask('user_a', app.taskA, { goal: 'old-edit' }, NOW + 3, { expectedRevision: 3 }), code('REVISION_CONFLICT'));
  assert.equal(app.store.execution.snapshot('user_a', app.taskA).revision, 4);
  // Unchanged input does not invalidate results, bump revision or supersede a running request.
  app.store.updateTask('user_a', app.taskA, { platform: 'wechat_official' }, NOW + 4);
  assert.equal(app.store.execution.ownedOperation('user_a', app.taskA, contentOp.id).status, 'running');
});

test('restart recovery preserves saved results and replays a sanitized failure without automatic regeneration', async (t) => {
  const app = await fixture(t);
  app.commit(app.begin().operation);
  const interrupted = app.begin({ expectedRevision: 2, operationKey: 'interrupted-key' }).operation;
  app.reopen();
  assert.equal(app.store.execution.recoverInterrupted(NOW + 2), 1);
  assert.equal(app.store.execution.recoverInterrupted(NOW + 3), 0);
  assert.equal(app.store.execution.snapshot('user_a', app.taskA).artifacts.personas.version, 1);
  const replay = app.begin({ expectedRevision: 2, operationKey: 'interrupted-key' });
  assert.equal(replay.replayed, true);
  assert.equal(replay.operation.id, interrupted.id);
  assert.equal(replay.operation.error.code, 'EXECUTION_INTERRUPTED');
  const retry = app.begin({ expectedRevision: 2, operationKey: 'explicit-new-attempt' }).operation;
  const failed = app.store.execution.fail({ userId: 'user_a', taskId: app.taskA, operationId: retry.id,
    code: 'upstream-secret-credential-value', now: NOW + 4 });
  assert.equal(failed.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(failed).includes('secret'));
  assert.equal(app.begin({ expectedRevision: 2, operationKey: 'explicit-new-attempt' }).replayed, true);
});

test('revision CAS rejects even an edit outside the operation helper, and persists superseded status', async (t) => {
  const app = await fixture(t);
  const op = app.begin().operation;
  app.store.db.prepare('UPDATE tasks SET revision=revision+1 WHERE id=?').run(app.taskA);
  assert.throws(() => app.commit(op), code('REVISION_CONFLICT'));
  app.reopen();
  assert.equal(app.store.execution.ownedOperation('user_a', app.taskA, op.id).status, 'superseded');
  assert.equal(app.store.execution.history('user_a', app.taskA, 'personas').length, 0);
});

test('one-click run checkpoints hold the task lock, preserve intermediate results, and track the latest revision', async (t) => {
  const app = await fixture(t);
  const op = app.begin({ action: 'generate_plan', operationKey: 'one-click-request' }).operation;
  const personas = app.commit(op, { complete: false }).artifacts[0];
  assert.equal(app.store.execution.ownedOperation('user_a', app.taskA, op.id).status, 'running');
  assert.throws(() => app.begin({ expectedRevision: 2, action: 'content' }), code('OPERATION_IN_PROGRESS'));
  app.reopen();
  const strategy = app.commit(op, { complete: false,
    outputs: [{ kind: 'strategy', payload: { testOnly: 'system recommendation' }, dependencies: { personas } }] }).artifacts[0];
  const done = app.commit(op, { outputs: [{ kind: 'content', payload: {}, dependencies: { strategy } }] });
  assert.equal(done.revision, 4);
  const replay = app.begin({ action: 'generate_plan', operationKey: 'one-click-request' });
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.operation.result.map((item) => item.kind), ['personas', 'strategy', 'content']);
  const next = app.begin({ expectedRevision: 4, action: 'generate_plan' }).operation;
  app.commit(next, { complete: false });
  app.store.updateTask('user_a', app.taskA, { goal: 'user edited after checkpoint' }, NOW + 4);
  assert.throws(() => app.commit(next), code('REVISION_CONFLICT'));
  assert.equal(app.store.execution.history('user_a', app.taskA, 'personas').length, 2);
});
