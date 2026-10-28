import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync('data/storage/tuijian.sqlite');
const needles = ['（已人工微调）', '\n\n补充一句：线下门店可以现场对比不同屏幕版本。', '补充一句：线下门店可以现场对比不同屏幕版本。'];
const scrub = value => {
  if (typeof value === 'string') { let out = value; for (const n of needles) out = out.split(n).join(''); return out; }
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scrub(v)]));
  return value;
};
const rows = db.prepare('SELECT id, result FROM generations').all();
let touched = 0;
for (const row of rows) {
  if (!row.result) continue;
  if (!needles.some(n => row.result.includes(n.slice(0, 6)))) continue;
  const cleaned = JSON.stringify(scrub(JSON.parse(row.result)));
  if (cleaned !== row.result) { db.prepare('UPDATE generations SET result=? WHERE id=?').run(cleaned, row.id); touched++; console.log('cleaned', row.id); }
}
console.log('处理条数:', touched);
const left = db.prepare("SELECT id FROM generations WHERE result LIKE '%人工微调%' OR result LIKE '%补充一句%'").all();
console.log('仍有残留:', left.length);
