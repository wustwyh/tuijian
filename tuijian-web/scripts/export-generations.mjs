// 把本地 SQLite 里的生成记录导出成一个可提交的种子文件：
//   node scripts/export-generations.mjs
// 产物：server/seed/generations.json.br（brotli，避开仓库的 LFS 规则；云端首次启动若表为空会自动导入）
// 说明：只砍掉知识库里本来就有的原文（documents/rules/guides 的 content、facts 的 original_snippet），
// 成稿、核验、修订对话、模型调用记录、素材正文都保留，结果页看到的东西一项不少。
import {DatabaseSync} from 'node:sqlite';
import {brotliCompressSync, constants as zlibConstants} from 'node:zlib';
import {writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';

const root = process.cwd();
const dbPath = process.env.TUJIAN_DATA_DIR ? join(process.env.TUJIAN_DATA_DIR, 'storage/tuijian.sqlite') : join(root, 'data/storage/tuijian.sqlite');
const outPath = join(root, 'server/seed/generations.json.br');

const db = new DatabaseSync(dbPath);
const rows = db.prepare('SELECT id,created_at,status,summary,input,result,error FROM generations ORDER BY created_at').all();
const revisions = db.prepare('SELECT generation_id,at,scope,requirement,source,article FROM revisions ORDER BY id').all();
db.close();

const trimList = (list) => (Array.isArray(list) ? list.map(item => ({source: item.source, name: item.name, contentLength: (item.content || '').length})) : []);

function slimInput(raw) {
  let input;
  try { input = JSON.parse(raw); } catch { return raw; }
  if (!input || typeof input !== 'object') return raw;
  const {
    documents, rules, audienceDocuments, platformGuides, facts, versions, ...rest
  } = input;
  const materials = Array.isArray(input.materials)
    ? input.materials.map(m => ({
      material: m.material,
      content: typeof m.content === 'string' ? m.content.slice(0, 20000) : '',
      truncated: typeof m.content === 'string' && m.content.length > 20000,
    }))
    : [];
  return JSON.stringify({
    ...rest,
    materials,
    // 这些是知识库原文的副本，仓库里本来就有，不重复上传
    omitted: {
      documents: trimList(documents),
      rules: trimList(rules),
      audienceDocuments: trimList(audienceDocuments),
      platformGuides: trimList(platformGuides),
      facts: Array.isArray(facts) ? facts.length : 0,
      versions: Array.isArray(versions) ? versions.length : 0,
    },
  });
}

const slimRows = rows.map(row => ({
  ...row,
  input: slimInput(row.input),
}));

const payload = {
  exportedAt: new Date().toISOString(),
  note: '本地生成记录。云端首次启动（generations 表为空）时自动导入；之后的记录按云端自己的数据库走。',
  counts: {generations: slimRows.length, revisions: revisions.length},
  generations: slimRows,
  revisions,
};

const raw = JSON.stringify(payload);
const gz = brotliCompressSync(Buffer.from(raw, 'utf8'), {
  params: {[zlibConstants.BROTLI_PARAM_QUALITY]: 9},
});
mkdirSync(dirname(outPath), {recursive: true});
writeFileSync(outPath, gz);
console.log(`导出 ${slimRows.length} 条生成记录、${revisions.length} 条改稿版本`);
console.log(`原始 ${(raw.length / 1024 / 1024).toFixed(1)} MB → 压缩 ${(gz.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`写入 ${outPath}`);
