import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function loadConfig(env = process.env) {
  const host = env.API_HOST || '127.0.0.1';
  const port = Number(env.API_PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT must be a valid port');
  if (env.API_DATABASE_PATH === ':memory:') throw new Error('API_DATABASE_PATH must be a persistent file');
  const databasePath = env.API_DATABASE_PATH
    ? resolve(env.API_DATABASE_PATH)
    : fileURLToPath(new URL('../.runtime/marketing.sqlite', import.meta.url));
  const production = env.NODE_ENV === 'production';
  if (env.API_COOKIE_SECURE && !['true', 'false'].includes(env.API_COOKIE_SECURE)) throw new Error('API_COOKIE_SECURE must be true or false');
  const secureCookies = env.API_COOKIE_SECURE ? env.API_COOKIE_SECURE === 'true' : production;
  if (production && !secureCookies) throw new Error('Production sessions require Secure cookies');
  const allowedOrigins = (env.API_ALLOWED_ORIGINS || `http://localhost:${port},http://127.0.0.1:${port}`)
    .split(',').map((value) => value.trim());
  for (const origin of allowedOrigins) {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || parsed.username || parsed.password) {
      throw new Error('API_ALLOWED_ORIGINS must contain exact HTTP(S) origins');
    }
    if (production && parsed.protocol !== 'https:') throw new Error('Production browser origins require HTTPS');
  }
  if (production && !env.API_ALLOWED_ORIGINS) throw new Error('Production requires API_ALLOWED_ORIGINS');
  return { host, port, databasePath, allowedOrigins, secureCookies };
}
