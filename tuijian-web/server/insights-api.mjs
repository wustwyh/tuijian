import {callJson, deepseekConfig} from './deepseek.mjs';
import {sameOrigin} from './same-origin.mjs';
import {searchNews} from './web-search.mjs';
import {upcomingNodes, todayText} from './festivals.mjs';

// 选题推荐 + 热点搜索：两件事都需要「换个客户/平台就换一套」，
// 所以都走一次模型，并按「产品+客户+平台」缓存，避免反复点就反复调用。

const fail = (status, message) => Object.assign(new Error(message), {status});

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 200000) throw fail(413, '请求内容过长');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw fail(400, '内容格式不正确'); }
}

const cache = new Map();
const CACHE_MS = 20 * 60 * 1000;
const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) { cache.delete(key); return null; }
  return hit.value;
};
const cacheSet = (key, value) => {
  if (cache.size > 200) cache.delete(cache.keys().next().value);
  cache.set(key, {at: Date.now(), value});
};

// —— 选题推荐 ——
const TOPIC_SHAPES = '场景型（具体使用场景怎么做）、对比型（同价位怎么选）、清单型（几步搞定）、答疑型（常见误解）、节点型（开学/换机季/大促）、决策型（预算怎么分）';
function topicMessages({product, audience, platform, task}) {
  const system = `你是华为PC营销策划。根据「产品 + 客户 + 平台」，给出 6 个这个组合真正值得写的选题。
要求：
- 6 个选题类型要分散，从这些类型里挑：${TOPIC_SHAPES}；
- 必须贴合指定客户的真实处境与指定平台的发布习惯（小红书要生活化、知乎要问答、公众号要深度、微博要短平快、采购方案要决策依据）；
- 不要 6 个都是"服务/售后/怎么用"这类服务型选题，至少要有一半是关于"为什么选它、和别家比怎么样、什么场景最合适"的；
- 不许写价格、折扣、销量、奖项，也不要承诺具体活动；
- 每个选题：name 不超过 18 字（读者能看懂的话题名），desc 不超过 26 字（为什么值得写/写给谁看）。
输出 JSON：{"topics":[{"name":"...","desc":"..."}]}，不要代码围栏。`;
  return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify({product, audience, platform, task})}];
}

export function validateTopics(value) {
  const list = Array.isArray(value?.topics) ? value.topics : Array.isArray(value) ? value : [];
  const topics = list.map((item) => ({
    name: String(item?.name || item?.title || '').trim().slice(0, 24),
    desc: String(item?.desc || item?.why || '').trim().slice(0, 40),
  })).filter((item) => item.name);
  const unique = [];
  for (const topic of topics) if (!unique.some((t) => t.name === topic.name)) unique.push(topic);
  if (unique.length < 4) throw fail(502, '没想出合适的选题，请再试一次');
  return unique.slice(0, 6);
}

// —— 热点 ——
// 热点 = 最近真发生的事（新品发布、降价促销、政策变化、社会话题）+ 日历上快到的节点，
// 不是「XX 怎么选 / 实测 / 选购指南」这类常青内容。
export function hotMessages({product, audience, platform, today, nodes, results}) {
  const numbered = results.map((item, i) => `[${i + 1}] ${item.date ? item.date + '｜' : ''}${item.title}｜${item.snippet || ''}｜${item.url}`).join('\n');
  const agenda = nodes.length
    ? nodes.map(n => `${n.name}（${n.date}，还有 ${n.daysAway} 天）${n.note ? '：' + n.note : ''}`).join('\n')
    : '（近两个月没有大促节点）';
  const system = `你是营销热点雷达。今天是 ${today}。
你要挑的是「最近确实发生、或很快就要发生」的事，能借势到这家公司的产品上。

【日历上快到的节点】（这些是算出来的，可以直接用，不用 ref）
${agenda}

【刚刚联网抓到的资讯】（编号｜日期｜标题｜摘要｜链接，只能是最近发生的事）
${numbered || '（这次没抓到资讯，只写上面的节点）'}

硬规矩：
- 只写上面出现过的事，或上面列出的节点；不许用你自己的记忆补充，不许编日期、折扣力度、活动规则、销量。
- 不要写常青内容：「怎么选 / 选购指南 / 实测 / 评测 / 值不值得买 / 盘点」这类一直存在的说法一律不要。
- 每条标题要点出「发生了什么」（例如「MateBook 新品发布」「双11 预售开启」），不要写产品形容词。
- 3 到 5 条，宁缺毋滥；每条都给 ref（资讯编号，节点给 0）。

输出 JSON：{"topics":[{"title":"发生了什么（不超过 20 字）","when":"什么时候（如 10月22日 / 11月11日，还有 18 天）","why":"为什么和这类客户有关（不超过 30 字）","angle":"怎么把产品接进去（不超过 30 字）","ref":编号}]}，不要代码围栏。`;
  const user = JSON.stringify({product, audience, platform, today});
  return [{role: 'system', content: system}, {role: 'user', content: user}];
}

const EVERGREEN = /实测|评测|测评|怎么选|选购|值得买|值得入手|盘点|排行|对比|攻略|指南|避坑|推荐/;

export function validateHotTopics(value, refCount = 0) {
  const list = Array.isArray(value?.topics) ? value.topics : Array.isArray(value) ? value : [];
  const topics = list.map((item) => ({
    title: String(item?.title || item?.name || '').trim().slice(0, 30),
    when: String(item?.when || '').trim().slice(0, 20),
    why: String(item?.why || item?.reason || '').trim().slice(0, 60),
    angle: String(item?.angle || item?.how || '').trim().slice(0, 60),
    ref: Number(item?.ref) >= 1 && Number(item?.ref) <= refCount ? Number(item.ref) : 0,
  })).filter((item) => item.title)
    // 没有时间锚点的「实测 / 怎么选 / 选购指南」属于常青内容，不算热点
    .filter((item) => !(EVERGREEN.test(item.title) && !/(\d+月|\d+日|\d{4}|今天|本周|本月|节|季|双\s*1)/.test(item.when + item.title)));
  if (!topics.length) throw fail(502, '没搜到可用热点，换个说法再试试');
  return topics.slice(0, 5);
}

export async function insightsApi({req, path, json, store, projectRoot}) {
  if (path !== '/api/topics/recommend' && path !== '/api/hot-topics') return false;
  if (req.method !== 'POST') { json(405, {error: '操作方式不支持'}); return true; }
  if (!sameOrigin(req)) { json(403, {error: '请在本站操作'}); return true; }
  let input;
  try { input = await readJson(req); }
  catch (e) { json(e.status || 400, {error: e.message}); return true; }
  const product = input?.productId ? store.details(input.productId) : (store.list()[0] ? store.details(store.list()[0].id) : null);
  const audience = input?.audienceId ? store.audiences.details(input.audienceId) : null;
  const platform = input?.platform || '公众号长图文';
  const productBrief = product ? {name: product.product?.fullName || product.fullName || '产品', summary: (product.product?.summary || '').slice(0, 200)} : {name: '产品'};
  const audienceBrief = audience ? {name: audience.audience?.name || audience.name || '客户', profile: String(audience.audience?.profile || '').slice(0, 200)} : {name: '客户'};
  const config = deepseekConfig(projectRoot);

  try {
    if (path === '/api/topics/recommend') {
      const key = `topics:${input?.productId || '-'}:${input?.audienceId || '-'}:${platform}`;
      const hit = input?.refresh ? null : cacheGet(key);
      if (hit) { json(200, {...hit, cached: true}); return true; }
      const value = await callJson({
        config, name: '选题推荐', trace: [],
        messages: topicMessages({product: productBrief, audience: audienceBrief, platform, task: input?.task || ''}),
        validate: validateTopics,
        signal: new AbortController().signal,
      });
      const payload = {topics: value.map((t, i) => ({id: `rec-${i + 1}`, ...t, source: 'ai'})), note: '按客户与平台现推的选题，换一批可以重来'};
      cacheSet(key, payload);
      json(200, payload);
      return true;
    }

    // 热点：不用用户搜，按产品+客户+平台自动联网抓最近的事，再让模型挑能借势的
    const today = todayText();
    const nodes = upcomingNodes();
    const ask = String(input?.query || '').trim().slice(0, 60);
    const queries = ask
      ? [ask]
      : [
        `${productBrief.name} 新品`,
        `${audienceBrief.name.includes('政') ? '政企 商用 电脑' : '笔记本 电脑'} 新品 发布`,
      ];
    const key = `hot:${input?.productId || '-'}:${input?.audienceId || '-'}:${platform}:${ask || 'auto'}:${today}`;
    const hit = input?.refresh ? null : cacheGet(key);
    if (hit) { json(200, {...hit, cached: true}); return true; }

    const batches = await Promise.all(queries.map((q) => searchNews(q, {limit: 6})));
    const seen = new Set();
    const results = [];
    let provider = '';
    for (const batch of batches) {
      if (!batch) continue;
      provider = provider || batch.provider;
      for (const item of batch.results) {
        const dedupe = item.url || item.title;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        results.push(item);
      }
    }
    if (!results.length && !nodes.length) {
      json(502, {
        error: '联网搜索没通：服务器访问百度资讯/百度/搜狗/必应都被拒或超时。请检查服务器出网，或配置 SEARCH_API_URL + SEARCH_API_KEY。',
        source: 'none',
      });
      return true;
    }
    let trimmed = results.slice(0, 10);
    // 点「换一批」时打散素材顺序，逼模型换角度挑，不会每次都给同样的几条
    if (input?.refresh) trimmed = [...trimmed].sort(() => Math.random() - 0.5);
    const value = await callJson({
      config, name: '热点', trace: [],
      messages: hotMessages({product: productBrief, audience: audienceBrief, platform, today, nodes, results: trimmed}),
      validate: (v) => validateHotTopics(v, trimmed.length),
      signal: new AbortController().signal,
    });
    // 模型没给 ref 时，按关键词重叠挑一条最相关的来源，保证每条热点都能点回原文。
    const overlap = (a, b) => {
      const words = String(a || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
      const target = String(b || '');
      return words.reduce((n, w) => n + (target.includes(w) ? w.length : 0), 0);
    };
    const payload = {
      topics: value.map((t, i) => {
        let source = t.ref >= 1 ? trimmed[t.ref - 1] : null;
        if (!source) {
          const scores = trimmed.map(r => overlap(`${t.title} ${t.angle}`, `${r.title} ${r.snippet}`));
          const best = scores.indexOf(Math.max(...scores));
          source = Math.max(...scores) > 0 ? trimmed[best] : trimmed[i % Math.max(1, trimmed.length)] || null;
        }
        return {
          id: `hot-${i + 1}`, title: t.title, when: t.when, why: t.why, angle: t.angle,
          url: source?.url || '', sourceTitle: source?.title || '', date: source?.date || '',
        };
      }),
      source: results.length ? 'web' : 'calendar',
      provider: provider || '',
      searchedAt: new Date().toISOString(),
      today,
      nodes,
      results: trimmed.map(({title, url, snippet, date}) => ({title, url, date: date || '', snippet: (snippet || '').slice(0, 80)})),
      note: results.length
        ? `已联网抓最近资讯（${provider}，${trimmed.length} 条）+ 近两个月节点，热点由 AI 从中挑；具体时间与政策以来源页为准`
        : '这次只抓到日历节点，没有抓到最近资讯',
    };
    cacheSet(key, payload);
    json(200, payload);
    return true;
  } catch (e) {
    json(e.status || 502, {error: e.message || '获取失败，请再试一次'});
    return true;
  }
}
