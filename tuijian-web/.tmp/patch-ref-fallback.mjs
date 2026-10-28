import {readFileSync, writeFileSync} from "node:fs";
const f = "server/insights-api.mjs";
let s = readFileSync(f, "utf8");

s = s.replace(`    const payload = {
      topics: value.map((t, i) => {
        const source = web.results[(t.ref || 0) - 1];
        return {
          id: \`hot-\${i + 1}\`, title: t.title, when: t.when, why: t.why, angle: t.angle,
          url: source?.url || '', sourceTitle: source?.title || '',
        };
      }),`,
`    // 模型没给 ref 时，按关键词重叠挑一条最相关的来源，保证每条热点都能点回原文。
    const overlap = (a, b) => {
      const words = String(a || '').replace(/[^\\u4e00-\\u9fa5A-Za-z0-9]/g, ' ').split(/\\s+/).filter(w => w.length >= 2);
      const target = String(b || '');
      return words.reduce((n, w) => n + (target.includes(w) ? w.length : 0), 0);
    };
    const payload = {
      topics: value.map((t, i) => {
        let source = t.ref >= 1 ? web.results[t.ref - 1] : null;
        if (!source) {
          const scores = web.results.map(r => overlap(\`\${t.title} \${t.angle}\`, \`\${r.title} \${r.snippet}\`));
          const best = scores.indexOf(Math.max(...scores));
          source = Math.max(...scores) > 0 ? web.results[best] : web.results[i % web.results.length];
        }
        return {
          id: \`hot-\${i + 1}\`, title: t.title, when: t.when, why: t.why, angle: t.angle,
          url: source?.url || '', sourceTitle: source?.title || '',
        };
      }),`);
s = s.replace("每条热点必须标出它依据的结果编号 ref。", "每条热点都必须给出 ref（1 到结果条数之间的编号），程序要靠它挂回原文链接。");
writeFileSync(f, s);
console.log("ok");
