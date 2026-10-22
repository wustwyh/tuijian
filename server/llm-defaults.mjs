// 模型接入的默认值：外部 OpenAI 兼容网关 + deepseek-v4.1-flash。
// 服务器上只需要在后台密钥里填一个 key（LLM_API_KEY），
// 地址与型号走这里的默认值；要换网关或换型号再用 LLM_BASE_URL / LLM_MODEL 覆盖。
export const DEFAULT_BASE_URL = 'https://api.openai-next.com/v1';
export const DEFAULT_MODEL = 'deepseek-v4.1-flash';

// 这两个域名已知支持 DeepSeek 的 thinking 开关；其它地址一律不带这个参数，避免被 400 拒绝。
export const THINKING_HOSTS = ['api.deepseek.com', 'api.openai-next.com'];

// 关闭深度思考：deepseek 系型号会先花 reasoning tokens 再输出，既慢又占掉 max_tokens 预算，
// 我们的任务都是结构化 JSON，直接关掉更稳。只在"认识这个参数"的网关 + deepseek 型号上发送。
export function thinkingDisabled(baseUrl = DEFAULT_BASE_URL, model = DEFAULT_MODEL) {
  if (!/^deepseek/i.test(model || '')) return false;
  try {
    return THINKING_HOSTS.includes(new URL(baseUrl || DEFAULT_BASE_URL).host);
  } catch {
    return false;
  }
}

// 默认地址属于"内置服务"，选了它就不用再填自定义 key。
export const BUILTIN_BASE_URLS = [DEFAULT_BASE_URL];
