import {readFileSync, writeFileSync} from "node:fs";
const f = "server/web-search.mjs";
let s = readFileSync(f, "utf8");

const newsFn = `
// 百度资讯：按时间排序，带「10月22日」这种日期，用来抓最近真发生的事
async function baiduNews(query, limit) {
  const html = await get(\`https://www.baidu.com/s?tn=news&rtt=1&wd=\${encodeURIComponent(query)}\`);
  if (!html) return [];
  const out = [];
  for (const block of html.split(/<div[^>]+class="[^"]*c-container/).slice(1)) {
    const title = /<h3[^>]*>[\\s\\S]*?<a[^>]*>([\\s\\S]*?)<\\/a>/.exec(block);
    const href = /<h3[^>]*>[\\s\\S]*?<a[^>]+href="([^"]+)"/.exec(block);
    const name = decode(title?.[1]);
    const url = decode(href?.[1] || '');
    if (!name || !/^https?:\\/\\//.test(url)) continue;
    const date = /(\\d{4}年\\d{1,2}月\\d{1,2}日|\\d{1,2}月\\d{1,2}日|\\d+\\s*(?:小时|分钟|天)前)/.exec(decode(block));
    const summary = /class="[^"]*c-summary[^"]*"[^>]*>([\\s\\S]*?)<\\/span>/.exec(block);
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
`;
s = s.replace("// 返回 {provider, query, results, searchedAt} 或 null（全挂了）", newsFn + "\n// 返回 {provider, query, results, searchedAt} 或 null（全挂了）");
writeFileSync(f, s);
console.log("ok");
