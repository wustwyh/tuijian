import { createApi } from './api.mjs';
import { loadConfig } from './config.mjs';
import { loadLocalEnv } from './env.mjs';

let server;
try {
  loadLocalEnv();
  const config = loadConfig();
  server = createApi(config);
  server.once('error', () => {
    console.error('API 启动失败：请检查监听地址、端口和数据库权限。');
    server.close();
    process.exitCode = 1;
  });
  server.listen(config.port, config.host, () => console.log(`API ready on port ${config.port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close();
      setTimeout(() => process.exit(1), 10_000).unref();
    });
  }
} catch {
  console.error('API 启动失败：请检查 Node.js 版本、API 配置和数据库文件。');
  process.exitCode = 1;
}
