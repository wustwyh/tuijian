// 用真实 key 打一次模型服务：先看鉴权与模型列表，再走一遍 callJson（含 response_format=json_object）。
// 不打印密钥本身，只打印长度与结果。
import {deepseekConfig} from '../server/deepseek.mjs';
import {callJson} from '../server/deepseek.mjs';

const root = process.cwd();
const config = deepseekConfig(root);
console.log('配置：', JSON.stringify({baseUrl: config.baseUrl, model: config.model, keyLength: (config.key || '').length}));
if (!config.key) { console.log('没有可用 key，先从 .env 填 LLM_API_KEY 或 DEEPSEEK_API_KEY'); process.exit(1); }

// 1) 鉴权 + 模型列表
let modelOk = null;
try {
  const r = await fetch(`${config.baseUrl}/models`, {headers: {Authorization: `Bearer ${config.key}`}});
  const text = await r.text();
  if (r.ok) {
    const ids = (JSON.parse(text).data || []).map((m) => m.id);
    modelOk = ids.includes(config.model);
    console.log(`GET /models → ${r.status}｜共 ${ids.length} 个模型｜${config.model} 在列表里：${modelOk ? '是' : '否'}`);
    if (!modelOk) console.log('  含 deepseek 的模型：', ids.filter((id) => /deepseek/i.test(id)).join(', '));
  } else {
    console.log(`GET /models → ${r.status}｜${text.slice(0, 200)}`);
  }
} catch (e) {
  console.log('GET /models 失败：', e.message);
}

// 2) 走应用真正用的那条路：callJson（会带 response_format=json_object、max_tokens=8000）
const trace = [];
const started = Date.now();
try {
  const value = await callJson({
    config,
    messages: [
      {role: 'system', content: '你是测试机器人，只输出 JSON，不要多余文字。'},
      {role: 'user', content: '返回 {"ok": true, "model": "你的模型名", "product": "HUAWEI MateBook"} 这个 JSON。'},
    ],
    validate: (v) => v,
    signal: new AbortController().signal,
    trace,
    name: '连通性检查',
  });
  const record = trace.at(-1) || {};
  console.log(`chat/completions → 通过｜耗时 ${Date.now() - started}ms｜finish_reason=${record.finishReason}｜输出 ${record.outputCharacters} 字`);
  console.log('返回内容：', JSON.stringify(value));
  console.log('usage：', JSON.stringify(record.usage || {}));
} catch (e) {
  console.log(`chat/completions → 失败（${Date.now() - started}ms）：${e.message}`);
  console.log('trace：', JSON.stringify((trace.at(-1) || {}).formatError || (trace.at(-1) || {}).requestError || '无'));
}
