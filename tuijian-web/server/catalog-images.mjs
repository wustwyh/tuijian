import { existsSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { files, nameKey, readCsv } from './catalog-files.mjs';

const imageTypes = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export function knowledgePath(root, ...parts) {
  const path = resolve(root, ...parts);
  const rel = relative(root, path);
  return !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`) ? path : null;
}

export function importImages(db, sourceRoot) {
  const knowledgeRoot = dirname(sourceRoot);
  const products = db.prepare('SELECT id, metadata FROM products').all().map((r) => JSON.parse(r.metadata));
  const names = new Map();
  for (const p of products) {
    for (const name of [p.dir, p.fullName, ...(p.aliases || [])]) {
      const k = nameKey(name);
      if (!names.has(k)) names.set(k, new Set());
      names.get(k).add(p.id);
    }
  }
  const findName = (name) => name ? [...(names.get(nameKey(name)) || [])] : [];
  const indexes = products.flatMap(p=>files(join(sourceRoot,p.id))).filter(p=>p.endsWith('图片索引.csv'));
  const records = new Map();
  const pending = [];
  const insert = db.prepare(`INSERT INTO product_images (id, product_id, file, relative_path, position, metadata)
    VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET metadata = excluded.metadata`);
  for (const index of indexes) {
    for (const row of readCsv(index)) {
      const localDir = row['本地目录']
        ? knowledgePath(knowledgeRoot, row['本地目录']) : dirname(index);
      if (!localDir) throw new Error(`图片目录越界：${index}`);
      const filename = row['文件名'];
      if (!filename || filename !== filename.split(/[\\/]/).pop() || !imageTypes.has(extname(filename).toLowerCase())) {
        throw new Error(`图片索引文件名无效：${index}`);
      }
      const candidates = [join(localDir, 'images', filename), join(localDir, filename)];
      const path = candidates.find((p) => existsSync(p) && statSync(p).isFile());
      const rel = path ? relative(sourceRoot, path).replaceAll('\\', '/') : null;
      const folderProduct = products.find(p=>relative(sourceRoot,index).replaceAll('\\','/').startsWith(`${p.id}/`));
      if (path && !rel.startsWith(`${folderProduct.id}/`)) throw new Error(`图片不在对应产品目录内：${index}`);
      const directoryOwners = products.filter((p) => !p.id.startsWith('catalog/')
        && (relative(sourceRoot, localDir).replaceAll('\\', '/') === p.id
          || relative(sourceRoot, localDir).replaceAll('\\', '/').startsWith(`${p.id}/`))).map((p) => p.id);
      const namedOwners = findName(row['产品型号']);
      const owners = new Set([...directoryOwners, ...namedOwners]);
      const item = { file: filename, description: row['官网图片说明'] || row['画面说明'] || '',
        ima: {entryId:row['ima条目ID']||row['ima_entry_id']||'',mediaId:row['ima媒体ID']||row['media_id']||'',fetchedAt:row['ima获取时间']||row['ima_fetched_at']||'',productId:folderProduct?.id||''},
        sourceUrl: row['原始图片URL'] || '', pageUrl: row['来源页面'] || row['页面来源'] || row['商品页URL'] || '',
        indexes: [relative(knowledgeRoot, index).replaceAll('\\', '/')],
        reason: !path ? '索引对应文件未定位'
          : row['产品型号'] && namedOwners.length !== 1 ? '索引中的产品型号无法唯一识别'
          : owners.size !== 1 ? '没有唯一的产品归属' : null };
      // 同一图片的总索引和型号索引合并，保留所有来源；发现矛盾则不自动入库。
      const recordKey = rel || `${localDir}/${filename}`;
      const previous = records.get(recordKey);
      if (previous) {
        previous.indexes = [...new Set([...previous.indexes, ...item.indexes])];
        previous.description ||= item.description;
        previous.pageUrl ||= item.pageUrl;
        for(const k of ['entryId','mediaId','fetchedAt'])previous.ima[k] ||= item.ima[k];
        previous.reason ||= item.reason;
        for (const owner of owners) previous.owners.add(owner);
        if (previous.owners.size !== 1) previous.reason = '图片索引产品归属冲突';
      } else records.set(recordKey, { ...item, path: rel, owners });
    }
  }
  for (const record of records.values()) {
    const { owners, reason, path, ...metadata } = record;
    if (reason) { pending.push({ ...metadata, path, reason }); continue; }
    const productId = [...owners][0];
    const id = createHash('sha256').update(path).digest('hex');
    const existing = db.prepare('SELECT product_id FROM product_images WHERE id = ?').get(id);
    if (existing && existing.product_id !== productId) throw new Error(`已有图片归属冲突：${metadata.file}`);
    const position = db.prepare('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?').get(productId).n;
    insert.run(id, productId, metadata.file, path, position, JSON.stringify({ ...metadata, ownership: '型号索引或产品目录明确关联' }));
    db.prepare('UPDATE products SET cover_id = ? WHERE id = ? AND cover_id IS NULL').run(id, productId);
  }
  for (const p of products) {
    const count = db.prepare('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?').get(p.id).n;
    p.imageStatus = count ? '已关联产品图片' : p.variantOf ? '款式图片待确认' : '暂无明确归属图片';
    db.prepare('UPDATE products SET metadata = ? WHERE id = ?').run(JSON.stringify(p), p.id);
  }
  return { indexedImages: records.size, pendingImages: pending };
}
