import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ApiError } from './errors.mjs';

const derive = promisify(scrypt);
const DUMMY_SALT = randomBytes(16).toString('hex');
const DUMMY_HASH = randomBytes(64).toString('hex');

export async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = await derive(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: hash.toString('hex') };
}

export async function checkPassword(password, user) {
  const derived = await hashPassword(password, user?.password_salt ?? DUMMY_SALT);
  const equal = timingSafeEqual(Buffer.from(derived.hash, 'hex'), Buffer.from(user?.password_hash ?? DUMMY_HASH, 'hex'));
  return Boolean(user) && equal;
}

export const sessionHash = (token) => createHash('sha256').update(token).digest('hex');

export function newSession(userId, now, ttlMs) {
  const token = randomBytes(32).toString('hex');
  return { token, hash: sessionHash(token), userId, createdAt: now, expiresAt: now + ttlMs };
}

export function sessionToken(req, cookieName) {
  const cookies = (req.headers.cookie ?? '').split(';').map((part) => part.trim());
  const matches = cookies.filter((part) => part.startsWith(`${cookieName}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/u.test(token) ? token : null;
}

export function sessionCookie(session, { secureCookies, cookieName, sessionTtlMs }) {
  return `${cookieName}=${session?.token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${session ? Math.floor(sessionTtlMs / 1000) : 0}${secureCookies ? '; Secure' : ''}`;
}

// One API process, no trusted proxy IP headers. Bound memory and expensive scrypt work.
export function authGuard({ now, limit = 20, windowMs = 15 * 60 * 1000, maxConcurrent = 4 }) {
  const attempts = new Map();
  let active = 0;
  return async (ip, operation) => {
    const time = now();
    for (const [key, entry] of attempts) if (entry.resetAt <= time) attempts.delete(key);
    let entry = attempts.get(ip);
    if (!entry) {
      if (attempts.size >= 4096) throw new ApiError(429, 'RATE_LIMITED', '登录请求过多，请稍后重试');
      entry = { count: 0, resetAt: time + windowMs };
      attempts.set(ip, entry);
    }
    if (++entry.count > limit || active >= maxConcurrent) throw new ApiError(429, 'RATE_LIMITED', '登录请求过多，请稍后重试');
    active++;
    try { return await operation(); } finally { active--; }
  };
}
