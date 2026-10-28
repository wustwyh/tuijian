// 真·联网搜索：服务器自己去抓搜索引擎的结果页，不需要任何 API Key。
// 优先用配置好的搜索 API（SEARCH_API_URL/SEARCH_API_KEY），否则依次抓 百度 → 搜狗 → 必应(RSS)。
// 只有全部失败才返回 null，调用方据此明确标注「未联网」，绝不假装联网。
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#34': '"'};
const decode = (text) => String(text || '')
  .replace(/<[^>]+>/g, '')
  .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, code) => {
    if (ENTITIES[code]) return ENTITIES[code];
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return m;
  })
  .replace(/\s+/g, ' ')
  .trim();

async function get(url, {referer, timeout = 9000} = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        ...(referer ? {Referer: referer} : {}),
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!r.ok) return null;
    return await r.text();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// 百度：结果的真实链接在容器上的 mu 属性里，标题在 h3
async function baiduSearch(query, limit) {
  const html = await get(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}&rn=10&ie=utf-8`);
  if (!html) return [];
  const out = [];
  for (const block of html.split(/<div[^>]+class="result c-container/).slice(1)) {
    const title = /<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/.exec(block);
    const mu = /mu="([^"]+)"/.exec(block);
    const abstract = /class="[^"]*(?:c-abstract|content-right)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|span)>/.exec(block);
    const name = decode(title?.[1]);
    const url = mu ? decode(mu[1]) : '';
    if (!name || !/^https?:\/\//.test(url)) continue;
    if (/recommend_list|nourl\.ubs|\.baidu\.com\/s\?/.test(url)) continue;
    out.push({title: name, url, snippet: decode(abstract?.[1])});
    if (out.length >= limit) break;
  }
  return out;
}

// 搜狗：结果在 vrwrap 里，链接是站内跳转，补上前缀即可打开
async function sogouSearch(query, limit) {
  const html = await get(`https://www.sogou.com/web?query=${encodeURIComponent(query)}`);
  if (!html) return [];
  const out = [];
  for (const block of html.split(/<div[^>]+class="[^"]*vrwrap/).slice(1)) {
    const title = /<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/.exec(block);
    const href = /<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/.exec(block);
    const snippet = /class="[^"]*(?:str-text-info|space-txt|text-layout)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/.exec(block);
    const name = decode(title?.[1]);
    if (!name) continue;
    const raw = decode(href?.[1] || '');
    const url = /^https?:\/\//.test(raw) ? raw : `https://www.sogou.com${raw.startsWith('/') ? '' : '/'}${raw}`;
    out.push({title: name, url, snippet: decode(snippet?.[1])});
    if (out.length >= limit) break;
  }
  return out;
}

// 必应 RSS：结构干净，作为兜底
async function bingSearch(query, limit) {
  const html = await get(`https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`);
  if (!html) return [];
  const out = [];
  for (const item of html.split('<item>').slice(1)) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(item);
    const link = /<link>([\s\S]*?)<\/link>/.exec(item);
    const desc = /<description>([\s\S]*?)<\/description>/.exec(item);
    const date = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(item);
    const name = decode(title?.[1]);
    const url = decode(link?.[1]);
    if (!name || !/^https?:\/\//.test(url)) continue;
    out.push({title: name, url, snippet: decode(desc?.[1]), date: decode(date?.[1])});
    if (out.length >= limit) break;
  }
  return out;
}

async function apiSearch(query, limit) {
  const endpoint = process.env.SEARCH_API_URL;
  const key = process.env.SEARCH_API_KEY;
  if (!endpoint || !key) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${key}`},
      body: JSON.stringify({q: query, query, num: limit, count: limit}),
      signal: controller.signal,
    });
    if (!r.ok) return [];
    const data = await r.json();
    const items = data?.organic || data?.results || data?.data || data?.web?.value || [];
    return items.slice(0, limit).map(item => ({
      title: String(item.title || item.name || ''),
      url: String(item.link || item.url || ''),
      snippet: String(item.snippet || item.description || item.content || ''),
      date: String(item.date || item.published || ''),
    })).filter(item => item.title && item.url);
  } catch { return []; }
  finally { clearTimeout(timer); }
}


// 百度资讯：按时间排序，带「10月22日」这种日期，用来抓最近真发生的事
async function baiduNews(query, limit) {
  const html = await get(`https://www.baidu.com/s?tn=news&rtt=1&wd=${encodeURIComponent(query)}`);
  if (!html) return [];
  const out = [];
  for (const block of html.split(/<div[^>]+class="[^"]*c-container/).slice(1)) {
    const title = /<h3[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/.exec(block);
    const href = /<h3[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/.exec(block);
    const name = decode(title?.[1]);
    const url = decode(href?.[1] || '');
    if (!name || !/^https?:\/\//.test(url)) continue;
    const date = /(\d{4}年\d{1,2}月\d{1,2}日|\d{1,2}月\d{1,2}日|\d+\s*(?:小时|分钟|天)前)/.exec(decode(block));
    const summary = /class="[^"]*c-summary[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(block);
    out.push({title: name, url, snippet: decode(summary?.[1]), date: date ? date[1] : ''});
    if (out.length >= limit) break;
  }
  return out;
}

// 资讯优先（要的是「最近发生的事」），没结果再退回普通搜索
export async function searchNews(query, {limit = 8} = {}) {
  const q = String(query || '').trim();
  if (!q) return null;
  const news = await baiduNews(q, limit);
  if (news.length) return {provider: '百度资讯', query: q, results: news, searchedAt: new Date().toISOString()};
  return searchWeb(q, {limit});
}

// 返回 {provider, query, results, searchedAt} 或 null（全挂了）
export async function searchWeb(query, {limit = 8} = {}) {
  const q = String(query || '').trim();
  if (!q) return null;
  const engines = [
    ['搜索 API', apiSearch],
    ['百度', baiduSearch],
    ['搜狗', sogouSearch],
    ['必应', bingSearch],
  ];
  for (const [provider, run] of engines) {
    const results = await run(q, limit);
    if (results.length) return {provider, query: q, results, searchedAt: new Date().toISOString()};
  }
  return null;
}
