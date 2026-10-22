import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';
import { knowledgePath } from './catalog-images.mjs';
import { readCsv } from './catalog-files.mjs';

const hash = (text) => createHash('sha256').update(text).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), {status});
const title = (text) => text.replace(/^\uFEFF/,'').match(/^#\s+.+$/m)?.[0].trimEnd();
const identities = text => [title(text), text.match(/^product_name:.*$/m)?.[0],
  ...[...text.matchAll(/^\|\s*((?:HUAWEI\s+)?MateBook[^|]+)\|/gm)].map(m=>m[1].trim())];

export function productDocuments({sourceRoot, storage, findProduct, refresh}) {
  function details(productId) {
    const product = findProduct(productId);
    if (!product) throw fail(404, '产品不存在，请重新选择');
    const priority = (s) => s.endsWith('/产品事实.md') ? 0
      : s.endsWith('/卖点与限制.md') ? 1 : s.endsWith('/来源清单.csv') ? 2 : 3;
    const documents = (product.sources || []).filter(s=>s.startsWith(`${product.id}/`) && /\.(md|csv)$/.test(s))
      .sort((a,b)=>priority(a)-priority(b)||a.localeCompare(b,'zh',{numeric:true})).flatMap(source => {
        const path = knowledgePath(sourceRoot, source);
        if (!path || !existsSync(path)) return [];
        const bytes = readFileSync(path), content = bytes.toString('utf8');
        const csv=source.endsWith('.csv');
        return [{id:hash(source), source, name:basename(source), content, revision:hash(bytes),
          kind:csv?'table':'document', rows:csv?readCsv(path):undefined, editable:!csv, shared:false}];
      });
    return {product, documents};
  }
  function save({productId, documentId, content, revision}) {
    if (typeof content !== 'string' || !content.trim() || Buffer.byteLength(content) > 250000) throw fail(400, '请填写有效的产品资料，最多 25 万字节');
    const doc = details(productId).documents.find(d=>d.id === documentId);
    if (!doc) throw fail(404, '该资料不属于当前产品');
    if (!doc.editable) throw fail(400, '来源清单与图片索引用于核对，请在产品参数或卖点资料中编辑正文');
    if (revision !== doc.revision) throw fail(409, '资料已被其他人修改，请关闭后重新打开，再合并你的修改');
    if (JSON.stringify(identities(content)) !== JSON.stringify(identities(doc.content))) throw fail(400, '请保留一级标题、product_name 和款式表中的型号名称，避免改变产品身份');
    for (const label of ['产品类别','所属目录','官方页面','抓取日期']) {
      const pattern = new RegExp(`^- ${label}：.+$`, 'm');
      if (pattern.test(doc.content) && !pattern.test(content)) throw fail(400, `请保留“${label}”字段`);
    }
    if (content === doc.content) return details(productId);
    const path = knowledgePath(sourceRoot, doc.source);
    const backups = join(storage, 'document-backups');
    mkdirSync(backups, {recursive:true});
    writeFileSync(join(backups, `${doc.id}-${Date.now()}.md`), readFileSync(path));
    const temporary = `${path}.saving`;
    writeFileSync(temporary, content, 'utf8');
    renameSync(temporary, path);
    try { refresh(); }
    catch (error) {
      writeFileSync(path, doc.content, 'utf8');
      throw error;
    }
    return details(productId);
  }
  return {details, save};
}
