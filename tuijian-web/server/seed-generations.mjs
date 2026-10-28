// 把仓库里带的生成记录种子（server/seed/generations.json.br）导入空数据库。
// 只在 generations 表为空时执行，之后云端自己产生的记录不会被覆盖。
import {readFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {brotliDecompressSync} from 'node:zlib';

export function seedGenerations({db, projectRoot}) {
  try {
    const count = db.prepare('SELECT COUNT(*) AS c FROM generations').get().c;
    if (count > 0) return {imported: 0, reason: 'already-has-records'};
    const file = join(projectRoot, 'server/seed/generations.json.br');
    if (!existsSync(file)) return {imported: 0, reason: 'no-seed-file'};
    const data = JSON.parse(brotliDecompressSync(readFileSync(file)).toString('utf8'));
    const insertGeneration = db.prepare(
      'INSERT OR IGNORE INTO generations(id,created_at,status,summary,input,result,error) VALUES (?,?,?,?,?,?,?)'
    );
    const insertRevision = db.prepare(
      'INSERT INTO revisions(generation_id,at,scope,requirement,source,article) VALUES (?,?,?,?,?,?)'
    );
    let imported = 0;
    db.exec('BEGIN');
    try {
      for (const row of data.generations || []) {
        insertGeneration.run(row.id, row.created_at, row.status, row.summary, row.input, row.result ?? null, row.error ?? null);
        imported += 1;
      }
      for (const rev of data.revisions || []) {
        insertRevision.run(rev.generation_id, rev.at, rev.scope, rev.requirement, rev.source, rev.article);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    console.log(`[seed] 已导入 ${imported} 条历史生成记录（导出时间 ${data.exportedAt || '未知'}）`);
    return {imported};
  } catch (error) {
    console.warn('[seed] 导入历史记录失败：', error.message);
    return {imported: 0, reason: error.message};
  }
}
