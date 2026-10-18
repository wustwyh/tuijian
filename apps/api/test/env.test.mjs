import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('server env loader allows missing file and keeps process configuration ahead of local file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'backend-env-'));
  try {
    const path = join(directory, '.env');
    await writeFile(path, 'LLM_API_KEY=test-file-key\nLLM_MODEL=test-file-model\n');
    const moduleUrl = new URL('../src/env.mjs', import.meta.url).href;
    const source = `import assert from 'node:assert/strict';
      import {loadLocalEnv} from ${JSON.stringify(moduleUrl)};
      assert.equal(loadLocalEnv(process.argv[1]), true);
      assert.equal(process.env.LLM_API_KEY, 'test-process-key');
      assert.equal(process.env.LLM_MODEL, 'test-file-model');
      assert.equal(loadLocalEnv(process.argv[1] + '.missing'), false);`;
    const env = { ...process.env, LLM_API_KEY: 'test-process-key' };
    delete env.LLM_MODEL;
    execFileSync(process.execPath, ['--input-type=module', '-e', source, path], { env, stdio: 'pipe' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
