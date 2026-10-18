import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { invalid, notFound } from './errors.mjs';

export class Store {
  constructor(path) {
    if (!path || path === ':memory:') throw new Error('A persistent SQLite file is required');
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (version > 1) throw new Error('Unsupported database schema version');
      if (version === 0) this.db.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        ) STRICT;
        CREATE INDEX sessions_expiry ON sessions(expires_at);
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          product_query TEXT NOT NULL,
          resolved_product_name TEXT,
          platform TEXT NOT NULL CHECK(platform IN ('wechat_official', 'xiaohongshu', 'wechat_moments', 'store_poster')),
          audience_hint TEXT NOT NULL,
          scenario TEXT NOT NULL,
          goal TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('draft', 'retrieved', 'generated', 'verified', 'exported')),
          revision INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        ) STRICT;
        CREATE INDEX tasks_owner_updated ON tasks(user_id, updated_at DESC, id);
        PRAGMA user_version = 1;
        COMMIT;
      `);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  close() { this.db.close(); }

  transaction(operation) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = operation();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  findUser(email) { return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email); }

  createUser(email, password, session, now) {
    return this.transaction(() => {
      const user = { id: session.userId, email, created_at: new Date(now).toISOString() };
      try {
        this.db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(user.id, email, password.salt, password.hash, user.created_at);
      } catch (error) {
        if (error.errcode === 2067) throw invalid('该邮箱已注册');
        throw error;
      }
      this.saveSession(session, now);
      return user;
    });
  }

  saveSession(session, now) {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    this.db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?)').run(session.hash, session.userId, session.createdAt, session.expiresAt);
  }

  currentUser(hash, now) {
    const row = this.db.prepare(`SELECT u.id, u.email, u.created_at FROM users u
      JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?`).get(hash, now);
    return row ?? null;
  }

  deleteSession(hash) { this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash); }

  listTasks(userId) {
    return this.db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY updated_at DESC, id').all(userId).map(publicTask);
  }

  getTask(userId, taskId) {
    const task = this.db.prepare('SELECT * FROM tasks WHERE user_id = ? AND id = ?').get(userId, taskId);
    if (!task) throw notFound();
    return publicTask(task);
  }

  createTask(userId, input, now) {
    const id = `task_${randomUUID()}`;
    const date = new Date(now).toISOString();
    this.db.prepare(`INSERT INTO tasks
      (id, user_id, product_query, platform, audience_hint, scenario, goal, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`).run(id, userId, input.product_query, input.platform, input.audience_hint, input.scenario, input.goal, date, date);
    return this.getTask(userId, id);
  }

  updateTask(userId, taskId, input, now) {
    // The ownership read and update are in one transaction; revision is reserved for B3 stale-result checks.
    return this.transaction(() => {
      const previous = this.getTask(userId, taskId);
      if (Object.keys(input).every((key) => previous[key] === input[key])) return previous;
      const task = { ...previous, ...input };
      this.db.prepare(`UPDATE tasks SET product_query = ?, platform = ?, audience_hint = ?, scenario = ?, goal = ?,
        resolved_product_name = NULL, status = 'draft', revision = revision + 1, updated_at = ?
        WHERE user_id = ? AND id = ?`).run(task.product_query, task.platform, task.audience_hint, task.scenario, task.goal, new Date(now).toISOString(), userId, taskId);
      return this.getTask(userId, taskId);
    });
  }
}

function publicTask(row) {
  const { revision, ...task } = row;
  return task;
}
