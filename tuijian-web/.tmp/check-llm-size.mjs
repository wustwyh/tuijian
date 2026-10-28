// 探测网关对大体积请求的行为：不同输入长度分别发一次，看清是网络层断裂还是 HTTP 拒绝。
import {deepseekConfig} from '../server/deepseek.mjs';

const config = deepseekConfig(process.cwd());
const post = async (chars) => {
  const filler = '华为笔记本的屏幕比例、分辨率、接口与重量在不同型号上有区别，需要按具体配置核对。'.repeat(
    Math.ceil(chars / 37),
  ).slice(0, chars);
  const body = JSON.stringify({
    model: config.model,
    messages: [
      {role: 'system', content: '你是测试机器人，只输出 JSON。'},
      {role: 'user', content: filler + '\n\n返回 {"ok": true} 这个 JSON。'},
    ],
    response_format: {type: 'json_object'},
    max_tokens: 200,
    stream: false,
  });
  const started = Date.now();
  try {
    const r = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json'},
      body,
      signal: AbortSignal.timeout(120000),
    });
    const text = await r.text();
    console.log(`${String(Math.round(body.length / 1024)).padStart(4)}KB → HTTP ${r.status}｜${Date.now() - started}ms｜${text.slice(0, 120).replace(/\s+/g, ' ')}`);
  } catch (e) {
    console.log(`${String(Math.round(body.length / 1024)).padStart(4)}KB → 网络失败｜${Date.now() - started}ms｜${e.name}｜cause=${e.cause?.code || e.cause?.message || '无'}`);
  }
};

for (const chars of [1000, 20000, 60000, 120000, 240000]) await post(chars);
