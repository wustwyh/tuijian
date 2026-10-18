import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

/** Server runtime only. Existing process environment takes precedence. Never print loaded values. */
export function loadLocalEnv(path = fileURLToPath(new URL('../.env', import.meta.url))) {
  try { loadEnvFile(path); return true; } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw new Error('服务端环境配置文件读取失败');
  }
}
