import {readFileSync,readdirSync,writeFileSync,mkdirSync,renameSync,realpathSync,statSync} from 'node:fs';
import {join,relative,sep} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {files} from './catalog-files.mjs';
import {knowledgePath} from './catalog-images.mjs';
import {inferLinks,matchMaterial} from './material-match.mjs';
import {recommendFor} from '../src/audiences.js';
const groups={P2:'P2-卖点话术库',P5:'P5-培训赋能库',P6:'P6-营销素材库'};
const hash=text=>createHash('sha256').update(text).digest('hex');
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function materialStore({db,root,storage,choices}){
  db.exec(`CREATE TABLE IF NOT EXISTS materials(id TEXT PRIMARY KEY,source TEXT NOT NULL UNIQUE,metadata TEXT NOT NULL DEFAULT '{}',enabled INTEGER NOT NULL DEFAULT 1)`);
  function pathFor(source){
    const path=knowledgePath(root,source),real=path&&realpathSync(path),prefix=realpathSync(root)+sep;
    if(!real||!real.toLowerCase().startsWith(prefix.toLowerCase()))throw fail(400,'素材路径不正确');return real;
  }
  function scan(){
    const insert=db.prepare('INSERT OR IGNORE INTO materials(id,source) VALUES (?,?)');
    for(const folder of Object.values(groups))for(const path of files(join(root,folder))){
      const source=relative(root,path).replaceAll('\\','/');
      if(!/\.(md|txt)$/i.test(source)||/总索引|00-总索引/.test(source))continue;
      if(source.startsWith('P6-')&&(/短视频|直播|视频号|B站|\/0[6-9]-|\/10-直播/.test(source)&&source.includes('13-多平台') || /短视频|直播|视频号|B站/.test(source)))continue;
      const text=readFileSync(pathFor(source),'utf8');
      if(source.startsWith('P6-')&&/^platform:\s*.*(?:视频|直播)/m.test(text))continue;
      insert.run(hash(source),source);
    }
  }
  function describe(row,options){
    let path;try{path=pathFor(row.source);}catch{return null;}
    const content=readFileSync(path,'utf8'),meta=JSON.parse(row.metadata),category=row.source.slice(0,2);
    const kind=category==='P2'?'沟通方法':category==='P5'?'验证与教学':row.source.includes('完整软文成稿')?'参考成稿':/案例研究/.test(row.source)?'案例研究':row.source.includes('平台模板')?'平台模板':'选题与写作方法';
    return {id:row.id,source:row.source,category,kind,name:meta.name||content.match(/^#\s+([^\r\n]+)/m)?.[1]||row.source.split('/').pop(),
      ...inferLinks(row.source,options),...meta,enabled:Boolean(row.enabled),revision:hash(content+row.metadata+row.enabled),
      modifiedAt:statSync(path).mtime.toISOString(),characters:content.length,custom:row.source.includes('/99-用户素材/')};
  }
  function list(){scan();const options=choices();return db.prepare('SELECT * FROM materials ORDER BY source').all().map(row=>describe(row,options)).filter(Boolean);}
  function details(id){const row=db.prepare('SELECT * FROM materials WHERE id=?').get(id);const m=row&&describe(row,choices());if(!m)throw fail(404,'素材已移除或不存在');return {material:m,content:readFileSync(pathFor(m.source),'utf8')};}
  function validate(input){
    if(typeof input.name!=='string'||!input.name.trim()||input.name.length>120)throw fail(400,'请填写素材名称，最多120字');
    if(typeof input.content!=='string'||!input.content.trim()||input.content.length>250000)throw fail(400,'请填写素材原文，最多25万字');
    if(typeof input.enabled!=='boolean')throw fail(400,'请设置是否启用');
    const options=choices(),allowed={productIds:options.products.map(p=>p.id),audienceIds:options.audiences.map(a=>a.id),platformIds:options.platforms.map(p=>p.id),tasks:options.tasks,topicIds:options.topics.map(t=>t.id)};
    const meta={name:input.name.trim()};
    for(const key of Object.keys(allowed)){
      if(!Array.isArray(input[key])||input[key].length>100||input[key].some(id=>!allowed[key].includes(id)))throw fail(400,'关联的卡片发生变化，请重新选择');
      meta[key]=[...new Set(input[key])];
    }
    return meta;
  }
  function save(input,id){
    const meta=validate(input);let source,path,old;
    if(id){old=details(id);if(old.material.revision!==input.revision)throw fail(409,'素材已被修改，请关闭后重新打开');source=old.material.source;path=pathFor(source);}
    else{
      if(!groups[input.category])throw fail(400,'请选择素材所属资料库');
      source=`${groups[input.category]}/99-用户素材/${randomUUID()}.md`;path=knowledgePath(root,source);mkdirSync(join(root,groups[input.category],'99-用户素材'),{recursive:true});id=hash(source);
    }
    if(old){const backup=join(storage,'material-backups');mkdirSync(backup,{recursive:true});
      writeFileSync(join(backup,`${id}-${Date.now()}-${randomUUID()}.json`),JSON.stringify(old));}
    writeFileSync(path+'.saving',input.content,'utf8');renameSync(path+'.saving',path);
    db.prepare(`INSERT INTO materials(id,source,metadata,enabled) VALUES (?,?,?,?) ON CONFLICT(id)
      DO UPDATE SET metadata=excluded.metadata,enabled=excluded.enabled`).run(id,source,JSON.stringify(meta),Number(input.enabled));
    return details(id);
  }
  function recommend(input){
    const options=choices();
    const product=options.products.find(p=>p.id===input.productId);
    const audience=input.audienceId?options.audiences.find(a=>a.id===input.audienceId):product?recommendFor(product,options.audiences)[0]:null;
    const selection={productId:product?.id,audienceId:audience?.id,platformId:options.platforms.find(p=>p.id===input.platformId)?.id,task:input.task,topicIds:Array.isArray(input.topicIds)?input.topicIds:[]};
    const matches=list().filter(m=>m.enabled).map(m=>({id:m.id,kind:m.kind,...matchMaterial(m,selection)}));
    const sorted=matches.filter(m=>m.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const result=[],counts={};
    for(const m of sorted){if(counts[m.kind])continue;result.push(m);counts[m.kind]=1;if(result.length===2)break;}
    return {recommendations:result,incompatibleIds:matches.filter(m=>m.incompatible).map(m=>m.id)};
  }
  return {list,details,save,recommend};
}
