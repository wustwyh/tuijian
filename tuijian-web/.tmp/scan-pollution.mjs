import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync('data/storage/tuijian.sqlite');
const rows = db.prepare("SELECT id, created_at, status, summary, result FROM generations ORDER BY created_at DESC").all();
const needles = ['（已人工微调）', '补充一句：线下门店可以现场对比不同屏幕版本。'];
for (const row of rows) {
  if (!row.result) continue;
  const hits = needles.filter(n => row.result.includes(n));
  if (!hits.length) continue;
  const summary = JSON.parse(row.summary);
  console.log(row.id, '|', summary.platform, '|', summary.product, '|', row.created_at, '| hits:', hits.length);
  const result = JSON.parse(row.result);
  const a = result.article || {};
  for (const key of ['title', 'lead', 'body', 'cta']) {
    for (const n of needles) if (typeof a[key] === 'string' && a[key].includes(n)) console.log('   字段', key, '含', n.slice(0, 8));
  }
  console.log('   hasOriginal:', Boolean(result.originalArticle), '| versions:', (result.versions || []).length);
}
