import {readFileSync, writeFileSync} from 'node:fs';
const f = 'server/insights-api.mjs';
let s = readFileSync(f, 'utf8');
const before = s;

// 引入节点日历 + 资讯搜索
s = s.replace("import {searchWeb} from './web-search.mjs';",
  "import {searchNews, searchWeb} from './web-search.mjs';\nimport {upcomingNodes, todayText} from './festivals.mjs';");

// 路由体：自动搜（不用用户输入），资讯优先，两个查询合并
const start = s.indexOf("    // 热点搜索：先真的联网搜，再让模型归纳（不联网就不归纳）");
const end = s.indexOf("    cacheSet(key, payload);\n    json(200, payload);", start);
if (start < 0 || end < 0) { console.log('NO MATCH'); process.exit(1); }

const body = `    // 热点：不用用户搜，按产品+客户+平台自动联网抓最近的事，再让模型挑能借势的
    const today = todayText();
    const nodes = upcomingNodes();
    const ask = String(input?.query || '').trim().slice(0, 60);
    const queries = ask
      ? [ask]
      : [
        \`\${productBrief.name} 新品\`,
        \`\${audienceBrief.name.includes('政') ? '政企 商用 电脑' : '笔记本 电脑'} 新品 发布\`,
      ];
    const key = \`hot:\${input?.productId || '-'}:\${input?.audienceId || '-'}:\${platform}:\${ask || 'auto'}:\${today}\`;
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
    const trimmed = results.slice(0, 10);
    const value = await callJson({
      config, name: '热点', trace: [],
      messages: hotMessages({product: productBrief, audience: audienceBrief, platform, today, nodes, results: trimmed}),
      validate: (v) => validateHotTopics(v, trimmed.length),
      signal: new AbortController().signal,
    });
    // 模型没给 ref 时，按关键词重叠挑一条最相关的来源，保证每条热点都能点回原文。
    const overlap = (a, b) => {
      const words = String(a || '').replace(/[^\\u4e00-\\u9fa5A-Za-z0-9]/g, ' ').split(/\\s+/).filter(w => w.length >= 2);
      const target = String(b || '');
      return words.reduce((n, w) => n + (target.includes(w) ? w.length : 0), 0);
    };
    const payload = {
      topics: value.map((t, i) => {
        let source = t.ref >= 1 ? trimmed[t.ref - 1] : null;
        if (!source) {
          const scores = trimmed.map(r => overlap(\`\${t.title} \${t.angle}\`, \`\${r.title} \${r.snippet}\`));
          const best = scores.indexOf(Math.max(...scores));
          source = Math.max(...scores) > 0 ? trimmed[best] : trimmed[i % Math.max(1, trimmed.length)] || null;
        }
        return {
          id: \`hot-\${i + 1}\`, title: t.title, when: t.when, why: t.why, angle: t.angle,
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
        ? \`已联网抓最近资讯（\${provider}，\${trimmed.length} 条）+ 近两个月节点，热点由 AI 从中挑；具体时间与政策以来源页为准\`
        : '这次只抓到日历节点，没有抓到最近资讯',
    };
`;
s = s.slice(0, start) + body + s.slice(end);
writeFileSync(f, s);
console.log('route ok', s !== before);
