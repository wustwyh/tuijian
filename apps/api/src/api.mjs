import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Store } from './store.mjs';
import { ApiError, invalid, notFound, unauthorized } from './errors.mjs';
import { credentials, taskInput } from './validation.mjs';
import { authGuard, checkPassword, hashPassword, newSession, sessionCookie, sessionHash, sessionToken } from './auth.mjs';

const BODY_LIMIT = 32 * 1024;
const JSON_TYPE = /^application\/json(?:\s*;|$)/iu;

async function jsonBody(req) {
  if (!JSON_TYPE.test(req.headers['content-type'] ?? '')) throw new ApiError(415, 'VALIDATION_ERROR', '请求类型必须为 application/json');
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        chunks.length = 0;
        reject(new ApiError(413, 'VALIDATION_ERROR', '请求体超过 32 KiB'));
      } else chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > BODY_LIMIT) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(invalid('请求体不是有效 JSON')); }
    });
    req.on('error', () => reject(invalid('请求体读取失败')));
    req.on('aborted', () => reject(invalid('请求已中断')));
  });
}

function send(res, status, value, headers = {}) {
  res.writeHead(status, { ...(value === undefined ? {} : { 'Content-Type': 'application/json; charset=utf-8' }), ...headers });
  res.end(value === undefined ? undefined : JSON.stringify(value));
}

/** Real SQLite/password sessions only. No mock auth, local product facts, or upstream placeholders. */
export function createApi({ databasePath, allowedOrigins = [], secureCookies = false,
  sessionTtlMs = 24 * 60 * 60 * 1000, now = Date.now, authLimit = 20 } = {}) {
  const store = new Store(databasePath);
  const authOptions = { secureCookies, sessionTtlMs, cookieName: secureCookies ? '__Host-huawei_session' : 'huawei_session' };
  const guard = authGuard({ now, limit: authLimit });
  const origins = new Set(allowedOrigins);

  const server = createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    res.setHeader('Vary', 'Origin');
    route(req, res).catch((error) => {
      if (res.destroyed || res.headersSent) return;
      const known = error instanceof ApiError;
      // Never log raw exceptions, request bodies, SQL, cookies, or upstream errors.
      send(res, known ? error.status : 500, {
        error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : '服务暂时不可用', details: [] },
      }, error.status === 429 ? { 'Retry-After': '900' } : error.status === 413 ? { Connection: 'close' } : {});
    });
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;
  server.once('close', () => store.close());

  async function route(req, res) {
    const origin = req.headers.origin;
    if (origin && !origins.has(origin)) throw new ApiError(403, 'FORBIDDEN', '请求来源未获允许');
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['sec-fetch-site'] === 'cross-site') {
      throw new ApiError(403, 'FORBIDDEN', '不接受跨站写入');
    }
    if (req.method === 'OPTIONS') {
      const method = req.headers['access-control-request-method'];
      const headers = (req.headers['access-control-request-headers'] ?? '').toLowerCase().split(',').map((value) => value.trim()).filter(Boolean);
      if (!origin || !['GET', 'POST', 'PATCH'].includes(method) || headers.some((value) => value !== 'content-type')) {
        throw new ApiError(403, 'FORBIDDEN', '不支持的跨域请求');
      }
      return send(res, 204, undefined, { 'Access-Control-Allow-Methods': 'GET, POST, PATCH', 'Access-Control-Allow-Headers': 'Content-Type' });
    }
    const path = new URL(req.url, 'http://api.local').pathname;
    if (req.method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(path)) {
      const input = credentials(await jsonBody(req));
      return guard(req.socket.remoteAddress || 'unknown', async () => {
        if (path.endsWith('/register')) {
          const password = await hashPassword(input.password);
          const session = newSession(`user_${randomUUID()}`, now(), sessionTtlMs);
          const user = store.createUser(input.email, password, session, now());
          return send(res, 201, { user }, { 'Set-Cookie': sessionCookie(session, authOptions) });
        }
        const row = store.findUser(input.email);
        if (!await checkPassword(input.password, row)) throw new ApiError(401, 'UNAUTHORIZED', '邮箱或密码不正确');
        const session = newSession(row.id, now(), sessionTtlMs);
        store.saveSession(session, now());
        return send(res, 200, { user: { id: row.id, email: row.email, created_at: row.created_at } }, { 'Set-Cookie': sessionCookie(session, authOptions) });
      });
    }

    const token = sessionToken(req, authOptions.cookieName);
    const user = token && store.currentUser(sessionHash(token), now());
    if (!user) throw unauthorized();
    if (req.method === 'GET' && path === '/api/auth/me') return send(res, 200, { user });
    if (req.method === 'POST' && path === '/api/auth/logout') {
      store.deleteSession(sessionHash(token));
      return send(res, 204, undefined, { 'Set-Cookie': sessionCookie(null, authOptions) });
    }
    if (path === '/api/tasks') {
      if (req.method === 'GET') return send(res, 200, { tasks: store.listTasks(user.id) });
      if (req.method === 'POST') return send(res, 201, { task: store.createTask(user.id, taskInput(await jsonBody(req)), now()) });
    }
    const taskMatch = /^\/api\/tasks\/(task_[a-zA-Z0-9-]+)$/u.exec(path);
    if (taskMatch && req.method === 'GET') {
      return send(res, 200, { task: store.getTask(user.id, taskMatch[1]) });
    }
    if (taskMatch && req.method === 'PATCH') {
      const input = taskInput(await jsonBody(req), { patch: true });
      return send(res, 200, { task: store.updateTask(user.id, taskMatch[1], input, now()) });
    }
    throw notFound();
  }

  return server;
}
