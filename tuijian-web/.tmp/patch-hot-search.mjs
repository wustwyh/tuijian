import {readFileSync, writeFileSync} from "node:fs";
const f = "server/insights-api.mjs";
let s = readFileSync(f, "utf8");

s = s.replace(`import {callJson, deepseekConfig} from './deepseek.mjs';
import {sameOrigin} from './same-origin.mjs';`, `import {callJson, deepseekConfig} from './deepseek.mjs';
import {sameOrigin} from './same-origin.mjs';
import {searchWeb} from './web-search.mjs';`);

// 热点提示词：只许依据真实搜索结果
s = s.replace(`function hotMessages({product, audience, platform, query}) {
  const system = \`你是营销热点雷达。找出最近与「\${query || '当前'}」相关、可以借势到该产品图文里的热点。
要求：
- 只写你确实有把握存在的话题方向（例如季节/大促节点、政策与行业变化、消费者正在讨论的问题），不要编造具体日期、折扣力度、活动规则、销量；
- 每个热点要写清"是什么热点"和"怎么把产品接进去"，但要避免夸大；
- 宁可少写，也不要写没有把握的具体数字。
输出 JSON：{"topics":[{"title":"热点名（不超过 20 字）","when":"时间范围或节点（不超过 12 字，可为空）","why":"为什么和客户相关（不超过 30 字）","angle":"怎么接到产品上（不超过 30 字）"}]}，最多 5 条，不要代码围栏。\`;
  return [{role: 'system', content: system}, {role: 'user', content: JSON.stringify({product, audience, platform, query: query || ''})}];
}`,
`function hotMessages({product, audience, platform, query, results}) {
  const numbered = results.map((item, i) => \`[\${i + 1}] \${item.title}｜\${item.snippet || ''}｜\${item.url}\`).join('\\n');
  const system = \`你是营销热点雷达。用户搜的是「\${query}」，下面是刚刚联网抓到的真实搜索结果（编号｜标题｜摘要｜链接）。
只能依据这些结果总结热点，不许使用你自己的记忆补内容，不许编造日期、折扣力度、活动规则或销量。
每条热点必须标出它依据的结果编号 ref。
输出 JSON：{"topics":[{"title":"热点名（不超过 20 字）","when":"时间范围或节点（不超过 12 字，可为空）","why":"为什么和客户相关（不超过 30 字）","angle":"怎么接到产品上（不超过 30 字）","ref":依据的结果编号（数字）}]}，最多 5 条，不要代码围栏。\`;
  const user = JSON.stringify({product, audience, platform, query, searchResults: numbered});
  return [{role: 'system', content: system}, {role: 'user', content: user}];
}`);

// 校验时带上编号范围
s = s.replace(`export function validateHotTopics(value) {`, `export function validateHotTopics(value, refCount = 0) {`);
s = s.replace(`    angle: String(item?.angle || item?.how || '').trim().slice(0, 60),
  })).filter((item) => item.title);`,
`    angle: String(item?.angle || item?.how || '').trim().slice(0, 60),
    ref: Number(item?.ref) >= 1 && Number(item?.ref) <= refCount ? Number(item.ref) : 0,
  })).filter((item) => item.title);`);

// 搜索全挂时的兜底提示词（明确标注未联网）
s = s.replace(`// 真正的联网搜索：配了 SEARCH_API_URL/Search API 才用，返回纯文本结果。`, `// 联网不可用时的兜底：只用模型知识，返回里会带 source:'model' 与原因。`);

// 替换 webSearch 旧实现（如果还残留）
s = s.replace(/\/\/ 联网不可用时的兜底[\s\S]*?\n\}\n\n/, "");

// 路由主体：先真搜，再总结
s = s.replace(`    // 热点搜索
    const query = String(input?.query || '').trim().slice(0, 60);
    const key = \`hot:\${input?.productId || '-'}:\${input?.audienceId || '-'}:\${platform}:\${query}\`;
    const hit = cacheGet(key);
    if (hit) { json(200, {...hit, cached: true}); return true; }
    const web = await webSearch(query || \`\${platform} \${productBrief.name} 热点\`);
    const messages = hotMessages({product: productBrief, audience: audienceBrief, platform, query});
    if (web) {
      messages[1].content = JSON.stringify({
        product: productBrief, audience: audienceBrief, platform, query,
        searchResults: web.lines,
        note: '以下是搜索结果的标题与摘要，只依据它们总结热点，不要补充没有出现的信息',
      });
    }
    const value = await callJson({config, name: '热点搜索', trace: [], messages, validate: validateHotTopics, signal: new AbortController().signal});
    const payload = {
      topics: value.map((t, i) => ({id: \`hot-\${i + 1}\`, ...t})),
      source: web ? 'web' : 'model',
      note: web
        ? '热点来自实时搜索结果，写进正文前请再核对一次时间与政策'
        : '没配联网搜索，以下热点来自模型知识，时间与政策请自己再核对一遍再用',
    };
    cacheSet(key, payload);
    json(200, payload);
    return true;`,
`    // 热点搜索：先真的联网搜，再让模型归纳（不联网就不归纳）
    const query = String(input?.query || '').trim().slice(0, 60) || \`\${productBrief.name} 最新 新闻\`;
    const key = \`hot:\${input?.productId || '-'}:\${input?.audienceId || '-'}:\${platform}:\${query}\`;
    const hit = input?.refresh ? null : cacheGet(key);
    if (hit) { json(200, {...hit, cached: true}); return true; }
    const web = await searchWeb(query, {limit: 8});
    if (!web) {
      json(502, {
        error: '联网搜索没通：服务器访问百度/搜狗/必应都被拒或超时。请检查服务器出网，或配置 SEARCH_API_URL + SEARCH_API_KEY。',
        source: 'none',
      });
      return true;
    }
    const value = await callJson({
      config, name: '热点搜索', trace: [],
      messages: hotMessages({product: productBrief, audience: audienceBrief, platform, query, results: web.results}),
      validate: (v) => validateHotTopics(v, web.results.length),
      signal: new AbortController().signal,
    });
    const payload = {
      topics: value.map((t, i) => {
        const source = web.results[(t.ref || 0) - 1];
        return {
          id: \`hot-\${i + 1}\`, title: t.title, when: t.when, why: t.why, angle: t.angle,
          url: source?.url || '', sourceTitle: source?.title || '',
        };
      }),
      source: 'web',
      provider: web.provider,
      searchedAt: web.searchedAt,
      results: web.results.map(({title, url, snippet}) => ({title, url, snippet: (snippet || '').slice(0, 80)})),
      note: \`已联网搜索（\${web.provider}，\${web.results.length} 条结果），热点由 AI 依据这些结果归纳；发布时间与政策请以来源页为准\`,
    };
    cacheSet(key, payload);
    json(200, payload);
    return true;`);
writeFileSync(f, s);
console.log("ok");
