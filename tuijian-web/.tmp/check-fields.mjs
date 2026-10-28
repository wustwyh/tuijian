import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync('data/storage/tuijian.sqlite');
const id = 'b081e220-517b-4241-ac8e-0d5bb2861a71';
const result = JSON.parse(db.prepare('SELECT result FROM generations WHERE id=?').get(id).result);
const mark = t => (t || '').includes('人工微调');
console.log('article 含标记:', mark(result.article.body), '| 含测试句:', (result.article.body||'').includes('补充一句'));
console.log('originalArticle 含标记:', mark(result.originalArticle?.body), '| 含测试句:', (result.originalArticle?.body||'').includes('补充一句'));
console.log('trace 含标记:', JSON.stringify(result.trace || []).includes('人工微调'));
console.log('conversation 含标记:', JSON.stringify(result.conversation || []).includes('人工微调'));
