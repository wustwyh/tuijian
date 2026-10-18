import { createHash, randomUUID } from 'node:crypto';
import { ApiError, invalid, notFound } from './errors.mjs';

const conflict = (code, message) => new ApiError(409, code, message);
const label = (value) => typeof value === 'string' && /^[a-z][a-z0-9_]{0,63}$/u.test(value);
const date = (now) => new Date(now).toISOString();

// Canonical JSON is only used for trusted service data, never provider errors/credentials.
function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  throw invalid('执行数据必须为 JSON');
}

export function migrateExecutionSchema(db) {
  if (db.prepare('PRAGMA user_version').get().user_version >= 2) return;
  db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE operations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      action TEXT NOT NULL,
      operation_key TEXT,
      request_hash TEXT NOT NULL,
      base_revision INTEGER NOT NULL CHECK(base_revision > 0),
      committed_revision INTEGER,
      status TEXT NOT NULL CHECK(status IN ('running','succeeded','failed','superseded')),
      started_at TEXT NOT NULL,
      finished_at TEXT,
      error_json TEXT,
      result_json TEXT,
      UNIQUE(user_id, task_id, action, operation_key),
      FOREIGN KEY(task_id, user_id) REFERENCES tasks(id, user_id)
    ) STRICT;
    CREATE UNIQUE INDEX tasks_id_owner ON tasks(id, user_id);
    CREATE UNIQUE INDEX operations_one_running ON operations(task_id) WHERE status = 'running';
    CREATE INDEX operations_recent ON operations(user_id, task_id, started_at DESC, id);
    CREATE TABLE artifacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      version INTEGER NOT NULL CHECK(version > 0),
      payload_json TEXT NOT NULL,
      dependencies_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(task_id, kind, version),
      UNIQUE(id, user_id, task_id, kind),
      FOREIGN KEY(task_id, user_id) REFERENCES tasks(id, user_id)
    ) STRICT;
    CREATE TABLE current_artifacts (
      user_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      freshness TEXT NOT NULL CHECK(freshness IN ('current','stale')),
      reasons_json TEXT NOT NULL,
      PRIMARY KEY(task_id, kind),
      FOREIGN KEY(artifact_id, user_id, task_id, kind) REFERENCES artifacts(id, user_id, task_id, kind)
    ) STRICT;
    PRAGMA user_version = 2;
    COMMIT;
  `);
}

/** Internal durable execution primitives; HTTP and Workflow policies are composed by the service. */
export class ExecutionStore {
  constructor(store) { this.store = store; this.db = store.db; }

  ownedTask(userId, taskId) {
    const task = this.db.prepare('SELECT * FROM tasks WHERE user_id = ? AND id = ?').get(userId, taskId);
    if (!task) throw notFound();
    return task;
  }

  ownedOperation(userId, taskId, operationId) {
    this.ownedTask(userId, taskId);
    const row = this.db.prepare('SELECT * FROM operations WHERE user_id = ? AND task_id = ? AND id = ?').get(userId, taskId, operationId);
    if (!row) throw notFound();
    return row;
  }

  snapshot(userId, taskId) {
    const task = this.ownedTask(userId, taskId);
    const artifacts = this.db.prepare(`SELECT a.*, c.freshness, c.reasons_json FROM current_artifacts c
      JOIN artifacts a ON a.id = c.artifact_id WHERE c.user_id = ? AND c.task_id = ?`).all(userId, taskId);
    return { revision: task.revision, artifacts: Object.fromEntries(artifacts.map((row) => [row.kind, artifact(row)])) };
  }

  history(userId, taskId, kind) {
    this.ownedTask(userId, taskId);
    return this.db.prepare('SELECT * FROM artifacts WHERE user_id = ? AND task_id = ? AND kind = ? ORDER BY version DESC').all(userId, taskId, kind).map(artifact);
  }

  listOperations(userId, taskId) {
    this.ownedTask(userId, taskId);
    return this.db.prepare('SELECT * FROM operations WHERE user_id = ? AND task_id = ? ORDER BY started_at DESC, id DESC LIMIT 20').all(userId, taskId).map(operation);
  }

  begin({ userId, taskId, action, expectedRevision, operationKey = null, request = {}, now }) {
    return this.store.transaction(() => {
      // Ownership precedes revision, idempotency lookup and validation; foreign identifiers reveal nothing.
      const task = this.ownedTask(userId, taskId);
      if (!label(action) || !Number.isSafeInteger(expectedRevision) || expectedRevision < 1
        || (operationKey !== null && (typeof operationKey !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(operationKey)))) {
        throw invalid('执行标识或版本无效');
      }
      const hash = createHash('sha256').update(canonical({ expectedRevision, request })).digest('hex');
      if (operationKey !== null) {
        const previous = this.db.prepare('SELECT * FROM operations WHERE user_id = ? AND task_id = ? AND action = ? AND operation_key = ?').get(userId, taskId, action, operationKey);
        if (previous) {
          if (hash !== previous.request_hash) throw conflict('IDEMPOTENCY_CONFLICT', '同一操作标识不能用于不同请求');
          if (previous.status === 'running') throw conflict('OPERATION_IN_PROGRESS', '操作正在执行');
          if (previous.status === 'superseded' || (previous.status === 'succeeded' && previous.committed_revision !== task.revision)) {
            throw conflict('REVISION_CONFLICT', '历史操作结果已不再是当前版本');
          }
          return { replayed: true, operation: operation(previous) };
        }
      }
      if (task.revision !== expectedRevision) throw conflict('REVISION_CONFLICT', '任务版本已改变');
      if (this.db.prepare("SELECT 1 FROM operations WHERE task_id = ? AND status = 'running'").get(taskId)) {
        throw conflict('OPERATION_IN_PROGRESS', '此任务已有执行中的操作');
      }
      const id = `op_${randomUUID()}`;
      this.db.prepare(`INSERT INTO operations(id,user_id,task_id,action,operation_key,request_hash,base_revision,status,started_at)
        VALUES (?,?,?,?,?,?,?,'running',?)`).run(id, userId, taskId, action, operationKey, hash, task.revision, date(now));
      return { replayed: false, operation: operation(this.ownedOperation(userId, taskId, id)) };
    });
  }

  commit({ userId, taskId, operationId, outputs, invalidate = [], complete = true, taskPatch = {}, now, assertActive = () => {} }) {
    let superseded = false;
    const result = this.store.transaction(() => {
      const task = this.ownedTask(userId, taskId);
      const op = this.ownedOperation(userId, taskId, operationId);
      if (op.status === 'superseded') throw conflict('REVISION_CONFLICT', '操作已被新的输入替代');
      if (op.status !== 'running') throw conflict('OPERATION_NOT_RUNNING', '操作已结束');
      if ((op.committed_revision ?? op.base_revision) !== task.revision) {
        this.supersede(userId, taskId, now);
        superseded = true;
        return null;
      }
      assertSynchronous(assertActive);
      if (!Array.isArray(outputs) || !outputs.length || new Set(outputs.map((item) => item.kind)).size !== outputs.length
        || !outputs.every((item) => label(item.kind))) throw invalid('提交产物类型无效');
      const saved = [];
      for (const output of outputs) {
        // Dependencies reference current, owned artifacts rather than trusting client-provided payloads.
        const dependencies = output.dependencies ?? {};
        if (!dependencies || Object.getPrototypeOf(dependencies) !== Object.prototype) throw invalid('依赖快照无效');
        for (const [kind, reference] of Object.entries(dependencies)) {
          const current = this.db.prepare(`SELECT a.id,a.version,c.freshness FROM current_artifacts c JOIN artifacts a ON a.id=c.artifact_id
            WHERE c.user_id=? AND c.task_id=? AND c.kind=?`).get(userId, taskId, kind);
          if (!current || current.freshness !== 'current' || current.id !== reference?.id || current.version !== reference?.version) {
            throw conflict('REVISION_CONFLICT', '产物依赖已改变或已失效');
          }
        }
        const version = this.db.prepare('SELECT COALESCE(MAX(version),0)+1 AS next FROM artifacts WHERE task_id=? AND kind=?').get(taskId, output.kind).next;
        const id = `artifact_${randomUUID()}`;
        this.db.prepare('INSERT INTO artifacts VALUES (?,?,?,?,?,?,?,?)')
          .run(id, userId, taskId, output.kind, version, canonical(output.payload), canonical(dependencies), date(now));
        saved.push({ id, kind: output.kind, version });
      }
      // The service supplies business invalidations; the storage layer does not invent dependency rules.
      this.invalidateWithinTransaction(userId, taskId, invalidate, ['upstream_changed']);
      for (const item of saved) {
        this.db.prepare(`INSERT INTO current_artifacts VALUES (?,?,?,?,'current','[]')
          ON CONFLICT(task_id,kind) DO UPDATE SET artifact_id=excluded.artifact_id,freshness='current',reasons_json='[]'`)
          .run(userId, taskId, item.kind, item.id);
      }
      const revision = task.revision + 1;
      if (Object.keys(taskPatch).some((key) => !['status', 'resolved_product_name'].includes(key))) throw invalid('内部任务更新字段无效');
      if (Object.hasOwn(taskPatch, 'resolved_product_name')) {
        this.db.prepare('UPDATE tasks SET resolved_product_name=? WHERE id=? AND user_id=?').run(taskPatch.resolved_product_name, taskId, userId);
      }
      if (Object.hasOwn(taskPatch, 'status')) this.db.prepare('UPDATE tasks SET status=? WHERE id=? AND user_id=?').run(taskPatch.status, taskId, userId);
      this.db.prepare('UPDATE tasks SET revision=?,updated_at=? WHERE user_id=? AND id=? AND revision=?')
        .run(revision, date(now), userId, taskId, task.revision);
      const previous = op.result_json ? JSON.parse(op.result_json) : [];
      const references = [...previous.filter((item) => !saved.some((next) => next.kind === item.kind)), ...saved];
      this.db.prepare('UPDATE operations SET status=?,committed_revision=?,finished_at=?,result_json=? WHERE id=?')
        .run(complete ? 'succeeded' : 'running', revision, complete ? date(now) : null, canonical(references), operationId);
      // Deadline checks live inside the same transaction as artifact, pointer and version writes.
      assertSynchronous(assertActive);
      return { revision, artifacts: saved };
    });
    if (superseded) throw conflict('REVISION_CONFLICT', '任务版本已改变，旧结果未保存');
    return result;
  }

  fail({ userId, taskId, operationId, code, now }) {
    return this.store.transaction(() => {
      const task = this.ownedTask(userId, taskId);
      const op = this.ownedOperation(userId, taskId, operationId);
      if (op.status !== 'running') return operation(op);
      if ((op.committed_revision ?? op.base_revision) !== task.revision) {
        this.supersede(userId, taskId, now);
      } else {
        // Do not persist arbitrary provider messages, URLs, headers or exception objects.
        const allowed = new Set(['LLM_FAILED', 'IMA_FETCH_FAILED', 'IMA_AUTH_FAILED', 'IMA_NO_RESULT', 'VALIDATION_ERROR']);
        const safeCode = allowed.has(code) ? code : 'INTERNAL_ERROR';
        this.db.prepare("UPDATE operations SET status='failed',finished_at=?,error_json=? WHERE id=?")
          .run(date(now), canonical({ code: safeCode, message: '执行失败，请重试或检查服务配置' }), operationId);
      }
      return operation(this.ownedOperation(userId, taskId, operationId));
    });
  }

  // Caller must hold the Store transaction; used by accepted input/selection edits and stage commits.
  invalidateWithinTransaction(userId, taskId, kinds, reasons) {
    this.ownedTask(userId, taskId);
    if (!Array.isArray(kinds) || !kinds.every(label) || !Array.isArray(reasons) || !reasons.every(label)) throw invalid('失效范围无效');
    for (const kind of kinds) this.db.prepare("UPDATE current_artifacts SET freshness='stale',reasons_json=? WHERE user_id=? AND task_id=? AND kind=?")
      .run(canonical(reasons), userId, taskId, kind);
  }

  supersede(userId, taskId, now) {
    this.ownedTask(userId, taskId);
    this.db.prepare("UPDATE operations SET status='superseded',finished_at=? WHERE user_id=? AND task_id=? AND status='running'")
      .run(date(now), userId, taskId);
  }

  // Only the exclusive API process startup calls this; opening another DB connection must not cancel active work.
  recoverInterrupted(now) {
    return this.store.transaction(() => this.db.prepare("UPDATE operations SET status='failed',finished_at=?,error_json=? WHERE status='running'")
      .run(date(now), canonical({ code: 'EXECUTION_INTERRUPTED', message: '服务重启中断了执行，请手动重试' })).changes);
  }
}

function assertSynchronous(check) {
  if (check()?.then) throw new Error('Commit deadline guard must be synchronous');
}

function artifact(row) {
  return { id: row.id, kind: row.kind, version: row.version, payload: JSON.parse(row.payload_json),
    dependencies: JSON.parse(row.dependencies_json), created_at: row.created_at,
    ...(row.freshness ? { freshness: row.freshness, reasons: JSON.parse(row.reasons_json) } : {}) };
}

function operation(row) {
  return { id: row.id, action: row.action, status: row.status, base_revision: row.base_revision,
    committed_revision: row.committed_revision, started_at: row.started_at, finished_at: row.finished_at,
    error: row.error_json ? JSON.parse(row.error_json) : null, result: row.result_json ? JSON.parse(row.result_json) : null };
}
