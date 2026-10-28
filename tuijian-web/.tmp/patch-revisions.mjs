import {readFileSync, writeFileSync} from "node:fs";
const file = "server/generations.mjs";
let s = readFileSync(file, "utf8");

// 1) 建表
s = s.replace(
  `  db.exec(\`CREATE TABLE IF NOT EXISTS generations(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,status TEXT NOT NULL,summary TEXT NOT NULL,input TEXT NOT NULL,result TEXT,error TEXT);`,
  `  // 同一份稿子的改稿历史：每次保存或采用一版都留一条，可以回溯。
  db.exec(\`CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT,generation_id TEXT NOT NULL,at TEXT NOT NULL,scope TEXT,requirement TEXT,source TEXT,article TEXT NOT NULL);\`);
  db.exec(\`CREATE TABLE IF NOT EXISTS generations(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,status TEXT NOT NULL,summary TEXT NOT NULL,input TEXT NOT NULL,result TEXT,error TEXT);`
);

// 2) 方法
s = s.replace(
  `  }  return {start,retry,get,confirmImages,editArticle,approveArticle,reverify,rewrite,restore,list,`,
  `  }

  // —— 改稿历史 ——
  function listRevisions(id){
    const job=get(id);if(!job)throw fail(404,'这条记录不存在');
    const rows=db.prepare('SELECT id,at,scope,requirement,source,article FROM revisions WHERE generation_id=? ORDER BY id DESC LIMIT 30').all(id);
    return {revisions:rows.map(r=>{const a=JSON.parse(r.article);return {id:r.id,at:r.at,scope:r.scope||'段落修改',requirement:r.requirement||'',source:r.source||'保存',
      title:a.title||'',lead:String(a.lead||'').slice(0,60),chars:String(a.body||'').replace(/\\s/g,'').length};})};
  }
  function addRevision(id,input){
    const job=get(id);if(!job)throw fail(404,'这条记录不存在');
    const article=input?.article;if(!article||typeof article!=='object'||typeof article.body!=='string')throw fail(400,'没有可保存的版本');
    const at=new Date().toISOString();
    db.prepare('INSERT INTO revisions(generation_id,at,scope,requirement,source,article) VALUES (?,?,?,?,?,?)')
      .run(id,at,String(input?.scope||'段落修改').slice(0,20),String(input?.requirement||'').slice(0,300),String(input?.source||'保存').slice(0,20),JSON.stringify(article));
    db.prepare('DELETE FROM revisions WHERE generation_id=? AND id NOT IN (SELECT id FROM revisions WHERE generation_id=? ORDER BY id DESC LIMIT 30)').run(id,id);
    return {ok:true,...listRevisions(id)};
  }
  function restoreRevision(id,revisionId){
    const job=get(id);if(!job)throw fail(404,'这条记录不存在');
    const row=db.prepare('SELECT article FROM revisions WHERE generation_id=? AND id=?').get(id,Number(revisionId));
    if(!row)throw fail(404,'这一版已经找不到了');
    return {article:JSON.parse(row.article)};
  }

  return {start,retry,get,confirmImages,editArticle,approveArticle,reverify,rewrite,restore,list,listRevisions,addRevision,restoreRevision,`
);

// 3) 路由
s = s.replace(
  `  const reverifyMatch=suffix.match(/^\\/([0-9a-f-]{36})\\/reverify$/);`,
  `  const revisionMatch=suffix.match(/^\\/([0-9a-f-]{36})\\/revisions(?:\\/(\\d+))?$/);
  if(revisionMatch){
    const [,id,revId]=revisionMatch;
    if(req.method==='GET'){try{json(200,store.generations.listRevisions(id));}catch(e){json(e.status||400,{error:e.message});}return true;}
    if(req.method!=='POST'){json(405,{error:'操作方式不支持'});return true;}
    if (!sameOrigin(req)){json(403,{error:'请在本站操作'});return true;}
    let input={};
    try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>400000)throw fail(413,'版本过大');chunks.push(chunk);}
      const raw=Buffer.concat(chunks).toString('utf8');input=raw?JSON.parse(raw):{};
    }catch(e){if(e.status){json(e.status,{error:e.message});return true;}input={};}
    try{json(200,revId?store.generations.restoreRevision(id,revId):store.generations.addRevision(id,input));}
    catch(e){json(e.status||400,{error:e.message});}return true;
  }
  const reverifyMatch=suffix.match(/^\\/([0-9a-f-]{36})\\/reverify$/);`
);
writeFileSync(file, s);
console.log("revisions wired");
