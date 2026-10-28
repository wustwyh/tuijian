// 检查网关对 deepseek-v4.1-flash 的 thinking 参数与长输出表现（该型号会带 reasoning tokens）。
import {deepseekConfig} from '../server/deepseek.mjs';

const config = deepseekConfig(process.cwd());
const ask = async (label, extra, chars = 200) => {
  const filler = '屏幕比例、分辨率、接口与重量的差异要按具体配置核对。'.repeat(Math.ceil(chars / 24)).slice(0, chars);
  const started = Date.now();
  try {
    const r = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({model: config.model, messages: [{role: 'user', content: filler + '\n只输出 JSON：{"ok":true}'}], response_format: {type: 'json_object'}, max_tokens: 8000, stream: false, ...extra}),
      signal: AbortSignal.timeout(180000),
    });
    const text = await r.text();
    let usage = '';
    let finish = '';
    try { const d = JSON.parse(text); usage = JSON.stringify(d.usage?.completion_tokens_details || {}); finish = d.choices?.[0]?.finish_reason || ''; } catch {}
    console.log(`${label} → HTTP ${r.status}｜${Date.now() - started}ms｜finish=${finish}｜${usage}${r.ok ? '' : '｜' + text.slice(0, 160).replace(/\s+/g, ' ')}`);
  } catch (e) {
    console.log(`${label} → 网络失败 ${e.name}｜cause=${e.cause?.code || e.cause?.message || '无'}`);
  }
};

await ask('默认（带思考）', {});
await ask('thinking:disabled', {thinking: {type: 'disabled'}});
await ask('reasoning_effort=low', {reasoning_effort: 'low'});
await ask('长输出场景（2500 字要求）', {}, 1800);
