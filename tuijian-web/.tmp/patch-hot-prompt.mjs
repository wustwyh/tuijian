import {readFileSync, writeFileSync} from 'node:fs';
const f = 'server/insights-api.mjs';
let s = readFileSync(f, 'utf8');
const before = s;

// 1) 提示词：只认「最近发生的事」+ 日历节点，不认常青内容
const oldPrompt = s.slice(s.indexOf('// —— 热点搜索 ——'), s.indexOf('export function validateHotTopics'));
const newPrompt = `// —— 热点 ——
// 热点 = 最近真发生的事（新品发布、降价促销、政策变化、社会话题）+ 日历上快到的节点，
// 不是「XX 怎么选 / 实测 / 选购指南」这类常青内容。
export function hotMessages({product, audience, platform, today, nodes, results}) {
  const numbered = results.map((item, i) => \`[\${i + 1}] \${item.date ? item.date + '｜' : ''}\${item.title}｜\${item.snippet || ''}｜\${item.url}\`).join('\\n');
  const agenda = nodes.length
    ? nodes.map(n => \`\${n.name}（\${n.date}，还有 \${n.daysAway} 天）\${n.note ? '：' + n.note : ''}\`).join('\\n')
    : '（近两个月没有大促节点）';
  const system = \`你是营销热点雷达。今天是 \${today}。
你要挑的是「最近确实发生、或很快就要发生」的事，能借势到这家公司的产品上。

【日历上快到的节点】（这些是算出来的，可以直接用，不用 ref）
\${agenda}

【刚刚联网抓到的资讯】（编号｜日期｜标题｜摘要｜链接，只能是最近发生的事）
\${numbered || '（这次没抓到资讯，只写上面的节点）'}

硬规矩：
- 只写上面出现过的事，或上面列出的节点；不许用你自己的记忆补充，不许编日期、折扣力度、活动规则、销量。
- 不要写常青内容：「怎么选 / 选购指南 / 实测 / 评测 / 值不值得买 / 盘点」这类一直存在的说法一律不要。
- 每条标题要点出「发生了什么」（例如「MateBook 新品发布」「双11 预售开启」），不要写产品形容词。
- 3 到 5 条，宁缺毋滥；每条都给 ref（资讯编号，节点给 0）。

输出 JSON：{"topics":[{"title":"发生了什么（不超过 20 字）","when":"什么时候（如 10月22日 / 11月11日，还有 18 天）","why":"为什么和这类客户有关（不超过 30 字）","angle":"怎么把产品接进去（不超过 30 字）","ref":编号}]}，不要代码围栏。\`;
  const user = JSON.stringify({product, audience, platform, today});
  return [{role: 'system', content: system}, {role: 'user', content: user}];
}

`;
s = s.replace(oldPrompt, newPrompt);

// 2) 校验：丢掉没有时间信息的常青标题
s = s.replace(`  })).filter((item) => item.title);
  if (!topics.length) throw fail(502, '没搜到可用热点，换个说法再试试');`,
`  })).filter((item) => item.title)
    // 没有时间锚点的「实测 / 怎么选 / 选购指南」属于常青内容，不算热点
    .filter((item) => !(EVERGREEN.test(item.title) && !/(\\d+月|\\d+日|\\d{4}|今天|本周|本月|节|季|双\\s*1)/.test(item.when + item.title)));
  if (!topics.length) throw fail(502, '没搜到可用热点，换个说法再试试');`);

s = s.replace(`export function validateHotTopics(value, refCount = 0) {`,
`const EVERGREEN = /实测|评测|测评|怎么选|选购|值得买|值得入手|盘点|排行|对比|攻略|指南|避坑|推荐/;

export function validateHotTopics(value, refCount = 0) {`);

writeFileSync(f, s);
console.log('prompt ok', s !== before);
