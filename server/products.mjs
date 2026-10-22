import { DatabaseSync } from 'node:sqlite';
import { sameOrigin } from './same-origin.mjs';
import { readdirSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { importCatalog } from './catalog.mjs';
import { importImages, knowledgePath } from './catalog-images.mjs';
import { composeOptions } from './compose-options.mjs';
import { productDocuments } from './product-documents.mjs';
import { audienceStore } from './audiences.mjs';
import { addProduct } from './add-product.mjs';
import {knowledgeRoot} from './knowledge-root.mjs';
import {materialStore} from './materials.mjs';
import {materialApi} from './material-api.mjs';
import {generationStore,generationApi} from './generations.mjs';
import {discoveryStore,discoveryApi} from './discovery.mjs';
import {deepseekConfig} from './deepseek.mjs';
import {llmSettingsMiddleware} from './llm-settings.mjs';

const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const imageUrl = (id) => `/api/product-images/${id}`;
const sequence = (name) => Number(name.match(/_(\d+)(?:_[0-9a-f]{6,})?\.\w+$/i)?.[1] || 9999);

export function openProducts(projectRoot, { databasePath } = {}) {
  const root=knowledgeRoot(projectRoot);
  const sourceRoot = join(root,'P1-产品参数库');
  const storage = join(projectRoot, 'data/storage');
  mkdirSync(storage, { recursive: true });
  const db = new DatabaseSync(databasePath || join(storage, 'tuijian.sqlite'));
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, metadata TEXT NOT NULL, cover_id TEXT
    );
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id),
      file TEXT NOT NULL, relative_path TEXT NOT NULL, position INTEGER NOT NULL
    );`);
  if (!db.prepare('PRAGMA table_info(product_images)').all().some((c) => c.name === 'metadata')) {
    db.exec("ALTER TABLE product_images ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'");
  }

  // 基础档案以产品事实建档，图片由索引补齐；已有 ID、封面和原图片顺序保留。
  const insertImage = db.prepare(`INSERT OR IGNORE INTO product_images
    (id, product_id, file, relative_path, position) VALUES (?, ?, ?, ?, ?)`);
  let imageAudit;
  db.exec('BEGIN');
  try {
    importCatalog(db, sourceRoot);
    for (const {id} of db.prepare('SELECT id FROM products').all()) {
      const imageDir=join(sourceRoot,id,'images');
      const files=readdirSync(imageDir,{withFileTypes:true}).filter(f=>f.isFile() && extensions.has(extname(f.name)))
        .map(f=>f.name).sort((a,b)=>sequence(a)-sequence(b)||a.localeCompare(b,'zh',{numeric:true}));
      const ids=files.map((file,position)=>{
        const relative=`${id}/images/${file}`, imageId=createHash('sha256').update(relative).digest('hex');
        insertImage.run(imageId,id,file,relative,position);
        return imageId;
      });
      if (ids.length) db.prepare('UPDATE products SET cover_id=? WHERE id=? AND cover_id IS NULL').run(ids[0],id);
    }
    imageAudit = importImages(db, sourceRoot);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }

  function list() {
    return db.prepare('SELECT * FROM products').all()
      .sort((a, b) => a.id.localeCompare(b.id, 'zh', { numeric: true }))
      .map((row) => {
        const images = db.prepare('SELECT id, file, metadata FROM product_images WHERE product_id = ? ORDER BY position, file').all(row.id)
          .map((im) => ({ ...JSON.parse(im.metadata), id: im.id, file: im.file, productId:row.id, url: imageUrl(im.id) }));
        return { ...JSON.parse(row.metadata), coverId: row.cover_id, cover: row.cover_id ? imageUrl(row.cover_id) : null, imageCount: images.length, images };
      });
  }

  function sync() {
    db.exec('BEGIN');
    try { importCatalog(db,sourceRoot); imageAudit=importImages(db,sourceRoot);db.exec('COMMIT'); }
    catch(error){db.exec('ROLLBACK');throw error;}
  }
  const audiences=audienceStore(db,resolve(sourceRoot,'..'));
  const materials=materialStore({db,root,storage,choices:()=>({products:list(),audiences:audiences.list(),...composeOptions(projectRoot)})});
  const discovery=discoveryStore({projectRoot,list,audiences,materials});
  const setCover=(productId,imageId)=>{
    if(!db.prepare('SELECT id FROM product_images WHERE id=? AND product_id=?').get(imageId,productId))return false;
    db.prepare('UPDATE products SET cover_id=? WHERE id=?').run(imageId,productId);return true;
  };
  const documents = productDocuments({sourceRoot, storage,
    findProduct: (id) => list().find(p=>p.id === id),
    refresh: sync});
  const generations=generationStore({db,projectRoot,store:{list,details:documents.details,audiences,materials}});
  return {
    generations,
    discovery,
    list,
    audiences,
    materials,
    addProduct: input=>addProduct(input,{sourceRoot,storage,products:list(),sync,setCover}),
    details: documents.details,
    saveDocument: documents.save,
    audit: () => ({ ...imageAudit, products: list() }),
    setCover(productId, imageId) {
      const image = db.prepare('SELECT id FROM product_images WHERE id = ? AND product_id = ?').get(imageId, productId);
      if (!image) return false;
      db.prepare('UPDATE products SET cover_id = ? WHERE id = ?').run(imageId, productId);
      return true;
    },
    image(id) {
      const row = db.prepare('SELECT relative_path FROM product_images WHERE id = ?').get(id);
      if (!row) return null;
      const path = knowledgePath(resolve(sourceRoot, '..'), 'P1-产品参数库', row.relative_path);
      if (!path) return null;
      return { bytes: readFileSync(path), type: { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }[extname(path)] };
    },
    close: () => {generations.close();db.close();},
  };
}

export function productApi(projectRoot) {
  function attach(server) {
    const store = openProducts(projectRoot);
    server.httpServer?.once('close', () => store.close());
    server.middlewares.use(llmSettingsMiddleware(() => deepseekConfig(projectRoot)));
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split('?')[0];
      if (!path?.startsWith('/api/')) return next();
      const json = (status, data) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(data));
      };
      try {
        if(await materialApi({req,res,path,json,store}))return;
        if(await discoveryApi({req,path,json,store}))return;
        if(await generationApi({req,path,json,store}))return;
        const management = path === '/api/audiences' || path === '/api/audiences/details' || (path === '/api/products' && req.method === 'POST');
        if(management){
          const id=new URL(req.url,'http://localhost').searchParams.get('id');
          if(req.method==='GET')return json(200,path.endsWith('/details')?store.audiences.details(id):{audiences:store.audiences.list()});
          if(path.endsWith('/details'))return json(405,{error:'此入口仅用于查看资料'});
          if(!['POST','PUT','DELETE'].includes(req.method))return json(405,{error:'操作方式不支持'});
          if (!sameOrigin(req))return json(403,{error:'请在本站保存资料'});
          const chunks=[];let size=0;
          for await(const chunk of req){size+=chunk.length;if(size>18*1024*1024)return json(413,{error:'内容超过18MB，请减少图片大小'});chunks.push(chunk);}
          let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{return json(400,{error:'内容格式不正确'});}
          if(!input||typeof input!=='object')return json(400,{error:'请填写资料'});
          if(path==='/api/products'){
            const productId=store.addProduct(input);return json(201,{productId,products:store.list()});
          }
          if(req.method==='DELETE'){store.audiences.remove(id);return json(200,{audiences:store.audiences.list()});}
          if(req.method==='PUT'&&!id)return json(400,{error:'请选择客户场景'});
          const detail=store.audiences.save(input,req.method==='PUT'?id:null);
          return json(req.method==='POST'?201:200,{...detail,audiences:store.audiences.list()});
        }
        if (path === '/api/compose-options' && req.method === 'GET') return json(200, composeOptions(projectRoot));
        if (path === '/api/products/details' && req.method === 'GET') {
          const productId = new URL(req.url, 'http://localhost').searchParams.get('productId');
          return json(200, store.details(productId));
        }
        if (path === '/api/products/details' && req.method === 'PUT') {
          if (!sameOrigin(req)) return json(403, {error:'请在本站保存产品资料'});
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 300000) return json(413, {error:'资料内容过长，请分开编辑'});
            chunks.push(chunk);
          }
          let input;
          try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return json(400, {error:'保存内容格式不正确'}); }
          if (!input || typeof input.productId !== 'string' || typeof input.documentId !== 'string') return json(400, {error:'请选择产品和资料'});
          return json(200, {...store.saveDocument(input), products:store.list()});
        }
        if (path === '/api/products' && req.method === 'GET') return json(200, { products: store.list() });
        if (path === '/api/products/cover' && req.method === 'PUT') {
          // 只接受同站保存，不允许其他网站触发共享库修改。
          if (!sameOrigin(req)) return json(403, { error: '请在本站保存封面' });
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 8192) return json(413, { error: '请求过大' });
          }
          let input;
          try { input = JSON.parse(body); } catch { return json(400, { error: '保存内容格式不正确' }); }
          if (typeof input?.productId !== 'string' || typeof input?.imageId !== 'string') return json(400, { error: '请选择产品和封面' });
          if (!store.setCover(input.productId, input.imageId)) return json(400, { error: '这张图片不属于该产品，请重新选择' });
          return json(200, { products: store.list() });
        }
        if (path.startsWith('/api/product-images/') && req.method === 'GET') {
          const image = store.image(path.slice('/api/product-images/'.length));
          if (!image) return json(404, { error: '图片不存在' });
          res.writeHead(200, { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=3600' });
          return res.end(image.bytes);
        }
        return json(404, { error: '接口不存在' });
      } catch (error) {
        console.error('产品库操作失败：', error.message);
        if (!res.headersSent) json(error.status || 500, { error: error.status ? error.message : '产品库暂时不可用，请重试' });
        else res.end();
      }
    });
  }
  return { name: 'tuijian-product-api', configureServer: attach, configurePreviewServer: attach };
}
