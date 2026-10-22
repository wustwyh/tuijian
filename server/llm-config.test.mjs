import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {deepseekConfig} from './deepseek.mjs';
import {DEFAULT_BASE_URL, DEFAULT_MODEL} from './llm-defaults.mjs';

// 用空目录做 projectRoot，避免读到本地 .env 影响断言。
const root = mkdtempSync(join(tmpdir(), 'llm-config-'));
const KEYS = ['LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL', 'DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL', 'DEEPSEEK_BASE_URL'];

function withEnv(env, fn) {
  const saved = {};
  for (const key of KEYS) { saved[key] = process.env[key]; delete process.env[key]; }
  Object.assign(process.env, env);
  try { return fn(); } finally {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

test('什么都不配时走默认网关 + deepseek flash', () => {
  withEnv({}, () => {
    const config = deepseekConfig(root);
    assert.equal(config.baseUrl, DEFAULT_BASE_URL);
    assert.equal(config.model, DEFAULT_MODEL);
    assert.equal(config.key, '');
  });
});

test('服务器后台只填一个 key 就能用：LLM_API_KEY', () => {
  withEnv({LLM_API_KEY: 'sk-test-only-key'}, () => {
    const config = deepseekConfig(root);
    assert.equal(config.key, 'sk-test-only-key');
    assert.equal(config.baseUrl, DEFAULT_BASE_URL);
    assert.equal(config.model, DEFAULT_MODEL);
  });
});

test('旧的 DEEPSEEK_* 变量已彻底失效，不会和 LLM_* 混用', () => {
  withEnv({DEEPSEEK_API_KEY: 'old-key', DEEPSEEK_MODEL: 'deepseek-flash', DEEPSEEK_BASE_URL: 'https://api.deepseek.com'}, () => {
    const config = deepseekConfig(root);
    assert.equal(config.key, '', '旧变量名不应再被读取');
    assert.equal(config.baseUrl, DEFAULT_BASE_URL);
    assert.equal(config.model, DEFAULT_MODEL);
  });
});

test('LLM_* 可以换网关或换型号', () => {
  withEnv({
    LLM_API_KEY: 'new-key',
    LLM_MODEL: 'deepseek-v4-flash',
    LLM_BASE_URL: 'https://api.deepseek.com',
  }, () => {
    const config = deepseekConfig(root);
    assert.equal(config.key, 'new-key');
    assert.equal(config.model, 'deepseek-v4-flash');
    assert.equal(config.baseUrl, 'https://api.deepseek.com');
  });
});

test('默认地址不带 /chat/completions 后缀，拼接后正好是 chat/completions', () => {
  assert.ok(!DEFAULT_BASE_URL.endsWith('/chat/completions'));
  assert.equal(`${DEFAULT_BASE_URL}/chat/completions`, 'https://api.openai-next.com/v1/chat/completions');
});
