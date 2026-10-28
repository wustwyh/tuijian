import {readFileSync,readdirSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {join,relative} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {knowledgePath} from './catalog-images.mjs';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const section=(text,title)=>text.match(new RegExp(`^## ${title}[^\\r\\n]*\\r?\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))`,'m'))?.[1].trim() || '';
const plain=text=>text.replace(/[*`#]/g,'').trim();
const bullets=text=>[...text.matchAll(/^- (.+)$/gm)].map(m=>plain(m[1]));
export function audienceStore(db,knowledgeRoot) {
  const root=join(knowledgeRoot,'P8-客户场景库');
  db.exec(`CREATE TABLE IF NOT EXISTS audiences(id TEXT PRIMARY KEY, metadata TEXT NOT NULL,
    builtin INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`);
  function defaults() {
    const result=[];
    for(const d of readdirSync(root,{withFileTypes:true}).filter(d=>d.isDirectory() && /^(0[1-9]|1[01])-/.test(d.name)).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file=readdirSync(join(root,d.name)).find(n=>n.endsWith('.md'));
      if(!file)continue;
      const text=readFileSync(join(root,d.name,file),'utf8');
      result.push({id:d.name,name:d.name.replace(/^\d+-/,''),group:'通用场景',
        who:plain(section(text,'一、指南定位与边界').split(/\r?\n\s*\r?\n/)[0] || ''),
        pain_points:[...section(text,'四、典型痛点').matchAll(/^### \d+\. (.+)$/gm)].map(m=>m[1].trim()),
        sources:[`${d.name}/${file}`]});
    }
    const order=['客户画像.md','问题清单.md','方案输出模板.md','验收清单.md','完整参考案例.md'];
    const industries=join(root,'12-行业场景');
    for(const d of readdirSync(industries,{withFileTypes:true}).filter(d=>d.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))) {
      const text=readFileSync(join(industries,d.name,'客户画像.md'),'utf8');
      result.push({id:`12-行业场景/${d.name}`,name:d.name.replace(/^\d+-/,''),group:'行业与岗位',
        who:plain(section(text,'主要使用者')),pain_points:bullets(section(text,'常见矛盾')),
        sources:readdirSync(join(industries,d.name)).filter(n=>n.endsWith('.md')).sort((a,b)=>order.indexOf(a)-order.indexOf(b)).map(n=>`12-行业场景/${d.name}/${n}`)});
    }
    const put=db.prepare(`INSERT INTO audiences(id,metadata,builtin) VALUES (?,?,1)
      ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata WHERE audiences.builtin=1 AND audiences.metadata<>excluded.metadata`);
    for(const a of result)put.run(a.id,JSON.stringify(a));
  }
  defaults();
  function list(){defaults();return db.prepare('SELECT * FROM audiences WHERE deleted=0 ORDER BY builtin DESC,id').all()
    .map(row=>({...JSON.parse(row.metadata),builtin:Boolean(row.builtin),revision:createHash('sha256').update(row.metadata).digest('hex')}));}
  function details(id){
    const a=list().find(a=>a.id===id);if(!a)throw fail(404,'客户场景不存在');
    return {audience:a,documents:a.sources.map(source=>({source:`P8-客户场景库/${source}`,name:source.split('/').pop(),content:readFileSync(knowledgePath(root,source),'utf8')}))};
  }
  function save(input,id){
    const old=id?list().find(a=>a.id===id):null;
    if(id&&!old)throw fail(404,'客户场景不存在');
    if(old?.builtin)throw fail(403,'默认客户场景不允许编辑或删除');
    if(old&&input.revision!==old.revision)throw fail(409,'资料已被其他人修改，请重新打开');
    for(const key of ['name','who','pains','tasks'])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>20000)throw fail(400,'请填写名称、客户描述、任务和痛点');
    if(input.name.length>80||/[\r\n]/.test(input.name))throw fail(400,'客户名称最多80个字且不能换行');
    const name=input.name.trim();
    if(list().some(a=>a.id!==id&&a.name===name))throw fail(409,'已有同名客户场景');
    const key=id || `custom-${randomUUID()}`, folder=`13-自建场景/${key}`;
    const a={id:key,name,who:input.who.trim(),group:'自建场景',pain_points:input.pains.split(/\r?\n/).map(plain).filter(Boolean),
      tasks:input.tasks.trim(),sources:[`${folder}/客户画像.md`]};
    const directory=join(root,folder);mkdirSync(directory,{recursive:true});
    const content=`# ${a.name}｜客户画像\n\n## 主要使用者\n\n${a.who}\n\n## 典型工作链路\n\n${a.tasks}\n\n## 常见矛盾\n\n${a.pain_points.map(p=>'- '+p).join('\n')}\n`;
    writeFileSync(join(directory,'客户画像.md.saving'),content);renameSync(join(directory,'客户画像.md.saving'),join(directory,'客户画像.md'));
    db.prepare(`INSERT INTO audiences(id,metadata,builtin) VALUES (?,?,0)
      ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata`).run(key,JSON.stringify(a));
    return details(key);
  }
  function remove(id){const a=list().find(a=>a.id===id);if(!a)throw fail(404,'客户场景不存在');if(a.builtin)throw fail(403,'默认客户场景不允许编辑或删除');
    db.prepare('UPDATE audiences SET deleted=1 WHERE id=? AND builtin=0').run(id);}
  return {list,details,save,remove};
}
