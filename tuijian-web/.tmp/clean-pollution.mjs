import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync('data/storage/tuijian.sqlite');
const id = 'b081e220-517b-4241-ac8e-0d5bb2861a71';
const row = db.prepare('SELECT * FROM generations WHERE id=?').get(id);
const result = JSON.parse(row.result);
if (!result.originalArticle) { console.log('没有 originalArticle，改用逐字段清洗'); process.exit(1); }
const before = JSON.stringify(result.article).includes('人工微调');
result.article = result.originalArticle;
result.versions = [];
result.editorial = {revision: (result.editorial?.revision || 0) + 1, editedAt: new Date().toISOString(), status: 'pending'};
db.prepare('UPDATE generations SET result=? WHERE id=?').run(JSON.stringify(result), id);
const after = JSON.parse(db.prepare('SELECT result FROM generations WHERE id=?').get(id).result);
console.log('清洗前含标记:', before);
console.log('清洗后含标记:', JSON.stringify(after).includes('人工微调'), '｜含测试句:', JSON.stringify(after).includes('补充一句'));
console.log('标题:', after.article.title);
console.log('首段:', after.article.body.split('\n')[0]);
