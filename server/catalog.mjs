import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { files, readCsv } from './catalog-files.mjs';

export const PRODUCT_CATEGORIES = ['01-鸿蒙电脑', '02-MateBook-Windows'];

export function productFolders(sourceRoot) {
  const folders = PRODUCT_CATEGORIES.flatMap(category => readdirSync(join(sourceRoot, category), {withFileTypes:true})
    .filter(entry=>entry.isDirectory()).map(entry=>`${category}/${entry.name}`));
  if (!folders.length) throw new Error('产品目录为空，已停止同步');
  for (const id of folders) {
    for (const name of ['产品事实.md','卖点与限制.md','来源清单.csv','图片索引.csv','images']) {
      if (!existsSync(join(sourceRoot,id,name))) throw new Error(`产品档案不完整：${id}/${name}`);
    }
  }
  return folders;
}

// 两个类型中的一个产品文件夹对应一条产品；其他目录不参与建档。
export function importCatalog(db, sourceRoot) {
  const ids = productFolders(sourceRoot), placeholders=ids.map(()=>'?').join(',');
  db.prepare(`DELETE FROM product_images WHERE product_id NOT IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM products WHERE id NOT IN (${placeholders})`).run(...ids);
  const save=db.prepare(`INSERT INTO products (id,metadata) VALUES (?,?)
    ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata`);
  for (const id of ids) {
    const dir=id.split('/')[1], root=join(sourceRoot,id);
    const fact=readFileSync(join(root,'产品事实.md'),'utf8');
    const selling=readFileSync(join(root,'卖点与限制.md'),'utf8');
    const fullName=fact.replace(/^\uFEFF/,'').match(/^#\s+([^\r\n]+)/m)?.[1].replace(/\s*-\s*产品事实\s*$/,'').trim();
    if (!fullName) throw new Error(`产品事实缺少型号标题：${id}`);
    const sources=['产品事实.md','卖点与限制.md','来源清单.csv',
      ...files(root).filter(p=>p.endsWith('图片索引.csv')).map(p=>relative(root,p).replaceAll('\\','/'))]
      .map(name=>`${id}/${name}`);
    const references=readCsv(join(root,'来源清单.csv'));
    const harmony=id.startsWith('01-');
    const series=fullName.replace(/^HUAWEI\s+/i,'').replace('（鸿蒙版）','');
    const tags=[{text:harmony?'鸿蒙版':'Windows',solid:harmony}];
    if (!harmony && series.includes('酷睿 Ultra')) tags.unshift({text:'酷睿 Ultra',solid:true});
    if (!harmony && series.includes('SE 版')) tags.unshift({text:'SE 版',solid:true});
    save.run(id,JSON.stringify({id,dir,category:harmony?'鸿蒙电脑':'Windows 笔记本',series,tags,
      short:fullName,fullName,aliases:[dir,fullName],sources,dataStatus:'已有产品事实',
      officialUrl:references.find(r=>r['资料类型']==='产品页')?.URL || references[0]?.URL || '',
      catalogDate:references[0]?.['抓取日期'] || '',
      summary:selling.match(/## 一句话定位\s*\n([^\n]+)/)?.[1].trim() || ''}));
  }
  // 清除历史导入中落在其他目录的图片引用，保留产品目录内的封面。
  for (const image of db.prepare('SELECT id,product_id,relative_path FROM product_images').all()) {
    if (!image.relative_path.startsWith(`${image.product_id}/`)) db.prepare('DELETE FROM product_images WHERE id=?').run(image.id);
  }
  db.exec(`UPDATE products SET cover_id=NULL WHERE cover_id IS NOT NULL AND NOT EXISTS
    (SELECT 1 FROM product_images WHERE product_images.id=products.cover_id AND product_images.product_id=products.id)`);
}
