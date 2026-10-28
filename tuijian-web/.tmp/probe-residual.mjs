import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync('data/storage/tuijian.sqlite');
const rows = db.prepare("SELECT id, summary, result FROM generations WHERE result LIKE '%人工微调%' OR result LIKE '%补充一句%'").all();
console.log('匹配条数:', rows.length);
for (const row of rows) {
  const s = JSON.parse(row.summary);
  const result = JSON.parse(row.result);
  const hits = [];
  const walk = (v, path) => {
    if (typeof v === 'string') { if (v.includes('人工微调') || v.includes('补充一句')) hits.push(path); return; }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, path + '[' + i + ']'));
    if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => walk(x, path + '.' + k));
  };
  walk(result, 'result');
  console.log(row.id.slice(0, 8), s.platform, '| 命中路径:', [...new Set(hits)].slice(0, 6).join(', '));
}
