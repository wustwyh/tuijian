import {randomUUID} from 'node:crypto';
import { sameOrigin } from './same-origin.mjs';
import {generationContext,fail} from './generation-context.mjs';
import {deepseekConfig,callJson} from './deepseek.mjs';
import {WORKFLOW_VERSION} from './generation-prompts.mjs';
import {revisionWorkflow} from './revision-workflow.mjs';
import {planningMessages,reviewMessages} from './generation-prompts.mjs';
import {validateReview,hardChecks} from './generation-schema.mjs';
import {prepareWritingContext} from './writing-package.mjs';
import {rewriteMessages,keywordMessages,requirementOptionMessages,analyzeMessages,requirementTurnMessages,validateRequirementTurn,validateKeywords,validateRequirement,validateRequirements,validateAnalysis,validateCandidates,markersOf,numbersOf} from './rewrite.mjs';
import {generationError} from '../src/generationError.js';
import {seedGenerations} from './seed-generations.mjs';
export function generationStore({db,projectRoot,store}){
  // 同一份稿子的改稿历史：每次保存或采用一版都留一条，可以回溯。
  db.exec(`CREATE TABLE IF NOT EXISTS revisions(id INTEGER PRIMARY KEY AUTOINCREMENT,generation_id TEXT NOT NULL,at TEXT NOT NULL,scope TEXT,requirement TEXT,source TEXT,article TEXT NOT NULL);`);
  db.exec(`CREATE TABLE IF NOT EXISTS generations(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,status TEXT NOT NULL,summary TEXT NOT NULL,input TEXT NOT NULL,result TEXT,error TEXT);
    UPDATE generations SET status='failed',error='服务重启中断了上次生成，请重新生成' WHERE status IN ('planning','generating','reviewing','revising');`);
  // 云端首次启动时把仓库里带的生成记录导进来（表里已经有记录就跳过）
  seedGenerations({db, projectRoot});
  let closed=false;const active=new Map(),retries=new Map();
  const update=(id,status,result=null,error=null)=>{if(!closed)db.prepare('UPDATE generations SET status=?,result=?,error=? WHERE id=?').run(status,result?JSON.stringify(result):null,error,id);};
  async function run(id,context,config,controller){
    const trace=[];let partial={};
    try{
      const {draft,basis,verification,conversation:finalConversation,writingPackage,selection,progress,images}=await revisionWorkflow({context,
        call:options=>callJson({...options,config,signal:controller.signal,trace}),
        onProgress:(status,turns,details)=>{partial={...details,conversation:structuredClone(turns)};update(id,status,{...partial,trace});}});
      const result={workflowVersion:WORKFLOW_VERSION,model:config.model,scene:draft.scene,basis,article:{...draft.article,image_plan:draft.article.image_plan.map(i=>({...images.find(im=>im.id===i.image_id),...i}))},verification,conversation:finalConversation,writingPackage,selection,progress,trace,completedAt:new Date().toISOString()};
      update(id,'succeeded',result);
    }catch(e){const message=e.status?e.message:'生成未完成，请稍后重试';update(id,'failed',{...partial,trace,failure:{...generationError(message),stage:trace.at(-1)?.name||'准备资料'}},message);}
    finally{active.delete(id);}
  }
  function start(input){
    if(active.size>=2)throw fail(429,'当前已有两个任务正在生成，请稍后重试');
    const config=deepseekConfig(projectRoot);if(!config.key)throw fail(503,'请先在服务器后台密钥里配置模型 API Key（LLM_API_KEY），再开始生成');
    return launch(generationContext(projectRoot,store,input),config);
  }
  function launch(context,config){
    const id=randomUUID(),controller=new AbortController();
    const summary={product:context.product.fullName,audience:context.audience.name,platform:context.platform.name,platformId:context.platform.id,task:context.task,format:context.format,materialCount:context.materials.length};
    db.prepare('INSERT INTO generations(id,created_at,status,summary,input) VALUES (?,?,?,?,?)').run(id,context.createdAt,'generating',JSON.stringify(summary),JSON.stringify(context));
    active.set(id,controller);void run(id,context,config,controller);return {id};
  }
  function retry(id){
    const previous=get(id);
    if(previous.status!=='failed')throw fail(409,'本次任务尚未失败，请先重新读取任务状态');
    const existing=retries.get(id);if(existing&&active.has(existing))return {id:existing};
    if(active.size>=2)throw fail(429,'当前已有两个任务正在生成，请稍后重试');
    const config=deepseekConfig(projectRoot);if(!config.key)throw fail(503,'请先在服务器后台密钥里配置模型 API Key（LLM_API_KEY），再重试');
    const started=launch({...previous.input,createdAt:new Date().toISOString(),retryOf:id},config);
    retries.set(id,started.id);return started;
  }
  function get(id){const row=db.prepare('SELECT * FROM generations WHERE id=?').get(id);if(!row)throw fail(404,'生成记录不存在，请从历史记录重新打开');return {id:row.id,createdAt:row.created_at,status:row.status,summary:JSON.parse(row.summary),input:JSON.parse(row.input),result:row.result?JSON.parse(row.result):null,error:row.error};}
  function confirmImages(id){
    const job=get(id);if(job.status!=='succeeded'||!job.result?.verification)throw fail(409,'只有已完成的生成记录可以确认');
    const verification=job.result.verification;
    for(const check of verification.checks)if(check.type==='image'&&check.status==='pending'){check.status='passed';check.action='none';check.reason=`${check.reason}（用户已确认配图来自本地 ima 资料且型号相符。）`;}
    verification.pending_questions=verification.pending_questions.filter(q=>!/(?:图片|配图|原图|图源|画面|ima.*(?:来源|图片)|(?:来源|图片).*ima)/i.test(q));
    verification.overall_status=['conflict','rejected','pending'].find(s=>verification.checks.some(ch=>ch.status===s))||(verification.pending_questions.length?'pending':'passed');
    verification.imageSourceConfirmedAt=new Date().toISOString();
    update(id,'succeeded',job.result);return get(id);
  }
  function list(){return db.prepare('SELECT id,created_at,status,summary,error FROM generations ORDER BY created_at DESC LIMIT 100').all().map(r=>({id:r.id,createdAt:r.created_at,status:r.status,summary:JSON.parse(r.summary),error:r.error}));}
  function editArticle(id,input){
    const job=get(id);if(job.status!=='succeeded'||!job.result?.article)throw fail(409,'请等待生成完成后再编辑');
    if(input?.revision!==(job.result.editorial?.revision||0))throw fail(409,'内容已更新，请重新读取后再编辑');
    const article=input.article;if(!article||typeof article!=='object')throw fail(400,'请填写文案');
    const text=(value,max,required=false)=>{if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw fail(400,'文案为空或超过长度限制');return value;};
    if(!Array.isArray(article.tags)||article.tags.length>30)throw fail(400,'最多填写30个话题');
    if(!Array.isArray(article.image_plan)||article.image_plan.length>12)throw fail(400,'最多使用12张图片');
    const images=job.input.images||job.input.product?.images||[];
    const seen=new Set();
    const image_plan=article.image_plan.map(image=>{const source=images.find(i=>i.id===image.image_id);if(!source||seen.has(source.id))throw fail(400,'请选择本产品的不同配图');seen.add(source.id);return {...source,image_id:source.id,caption:text(image.caption,2000),position:text(image.position,500),purpose:text(image.purpose,500)};});
    const next={...job.result.article,title:text(article.title,500,true),lead:text(article.lead,6000),body:text(article.body,60000,true),cta:text(article.cta,3000),tags:article.tags.map(t=>text(t,100)),image_plan};
    job.result.originalArticle??=structuredClone(job.result.article);
    job.result.versions=[...(Array.isArray(job.result.versions)?job.result.versions:[]),{article:structuredClone(job.result.article),at:new Date().toISOString(),revision:job.result.editorial?.revision||0}].slice(-10);
    job.result.article=next;job.result.editorial={revision:(job.result.editorial?.revision||0)+1,editedAt:new Date().toISOString(),status:'pending'};
    update(id,'succeeded',job.result);return get(id);
  }
  function approveArticle(id,input){
    const job=get(id);if(job.status!=='succeeded'||!job.result?.article)throw fail(409,'请等待生成完成后再审核');
    if(input?.revision!==(job.result.editorial?.revision||0))throw fail(409,'内容已更新，请重新读取后再审核');
    if(['rejected','conflict'].includes(job.result.verification.overall_status))throw fail(409,'请先处理核验拦截或资料冲突，再审核定稿');
    job.result.editorial={...job.result.editorial,revision:input.revision,status:'approved',approvedAt:new Date().toISOString()};
    update(id,'succeeded',job.result);return get(id);
  }
  // 点选式改写：只返回候选文本，不落库；用户选中后再走 editArticle 保存。
  async function rewrite(id,input){
    const job=get(id);if(job.status!=='succeeded'||!job.result?.article)throw fail(409,'请等待生成完成后再改写');
    const config=deepseekConfig(projectRoot);if(!config.key)throw fail(503,'请先在服务器后台密钥里配置模型 API Key（LLM_API_KEY），再改写');
    const article=job.result.article;
    const scope=['article','title','lead','cta','tags','caption'].includes(input?.scope)?input.scope:'paragraph';
    const instruction=typeof input?.instruction==='string'?input.instruction.slice(0,600):'casual';
    const count=Math.min(3,Math.max(1,Number(input?.count)||3));
    const blocks=String(article.body||'').split(/\n{2,}/);
    let target='';
    if(scope==='paragraph'){
      if(typeof input?.target==='string'&&input.target.trim()){
        target=input.target.slice(0,4000);
      }else{
        const index=Number(input?.index);
        if(!Number.isInteger(index)||index<0||index>=blocks.length)throw fail(400,'这个位置已经变化，请刷新页面后重试');
        target=blocks[index]||'';
      }
      if(!target.trim())throw fail(400,'这一段是空的，换一段再改');
    }
    if(scope==='caption')target=String(input?.target||'').slice(0,2000);
    if(scope==='title')target=String(article.title||'');
    if(scope==='lead')target=String(article.lead||'');
    if(scope==='cta')target=String(article.cta||'');
    if(scope==='tags')target=(article.tags||[]).join(' ');
    const source=scope==='article'?String(article.body||''):target;
    const keywords=Array.isArray(input?.keywords)?input.keywords.filter(k=>typeof k==='string').slice(0,3).map(k=>k.slice(0,20)):[];
    // AI 主动提需求：返回几条可以直接点的需求，用户不必自己写。
    if(input?.mode==='requirements'){
      const value=await callJson({config,messages:requirementOptionMessages({platform:job.summary.platform,product:job.summary.product,blockKind:scope,text:source,scope}),validate:validateRequirements,signal:new AbortController().signal,trace:[],name:'AI 提需求'});
      return {scope,requirements:value};
    }
    // 分析用户随手写的一句话，拆成可执行的改写要求。
    if(input?.mode==='turn'){
    // 需求追问：一次问一个问题，用户点选项就行
    const seed=String(input?.seed||'').slice(0,200);
    const history=(Array.isArray(input?.history)?input.history:[]).slice(-6).map(m=>({role:m.role==='user'?'user':'assistant',content:String(m.content||'').slice(0,200)}));
    const round=history.filter(m=>m.role==='assistant').length;
    const value=await callJson({config,messages:requirementTurnMessages({platform:job.summary.platform,product:job.summary.product,blockKind:scope,text:source,seed,history,round}),validate:validateRequirementTurn,signal:new AbortController().signal,trace:[],name:'需求追问'});
    return {scope,...value};
  }
  if(input?.mode==='analyze'){
      const request=String(input?.request||'').slice(0,300);
      if(!request.trim())throw fail(400,'先写一句你想怎么改');
      const value=await callJson({config,messages:analyzeMessages({platform:job.summary.platform,product:job.summary.product,blockKind:scope,text:source,request}),validate:validateAnalysis,signal:new AbortController().signal,trace:[],name:'需求分析'});
      return {scope,analysis:value};
    }
    if(input?.mode==='keywords'){
      const value=await callJson({config,messages:keywordMessages({platform:job.summary.platform,product:job.summary.product,blockKind:scope,text:source,requirementSeed:instruction}),validate:v=>v,signal:new AbortController().signal,trace:[],name:'修改方向'});
      return {scope,keywords:validateKeywords(value)};
    }
    const allowedNumbers=numbersOf(source+' '+(job.summary.product||''));
    const requiredMarkers=[...new Set(markersOf(source))];
    const messages=rewriteMessages({platform:job.summary.platform,product:job.summary.product,title:article.title,body:String(article.body||''),target,scope,instruction,count,keywords});
    const value=await callJson({config,messages,validate:v=>v,signal:new AbortController().signal,trace:[],name:'改写候选'});
    const {candidates}=validateCandidates(value,{allowedNumbers,requiredMarkers,maxLength:scope==='article'?60000:scope==='tags'?600:scope==='caption'?2000:4000});
    return {scope,instruction,keywords,requirement:validateRequirement(value)||[...keywords,...(instruction?[instruction]:[])].join('、'),candidates};
  }
  // 版本快照：保存前留一份，支持“撤回上一次保存”。
  function restore(id,input){
    const job=get(id);if(job.status!=='succeeded'||!job.result?.article)throw fail(409,'请等待生成完成后再撤回');
    const versions=Array.isArray(job.result.versions)?job.result.versions:[];
    if(!versions.length)throw fail(404,'现在没有可以撤回的版本');
    const index=input?.index===undefined||input?.index===null?versions.length-1:Number(input.index);
    const target=versions[index];
    if(!target)throw fail(404,'这个版本已经不存在了');
    job.result.versions=versions.filter((_,i)=>i!==index);
    job.result.article=target.article;
    job.result.editorial={revision:(job.result.editorial?.revision||0)+1,editedAt:new Date().toISOString(),status:'pending'};
    update(id,'succeeded',job.result);return get(id);
  }  // 改完稿重新核验：复用生成时的核验提示词与硬检查，把结论写回同一条记录。
  async function reverify(id){
    const job=get(id);if(job.status!=='succeeded'||!job.result?.article)throw fail(409,'请等待生成完成后再核验');
    const config=deepseekConfig(projectRoot);if(!config.key)throw fail(503,'请先在服务器后台密钥里配置模型 API Key（LLM_API_KEY），再重新核验');
    // 库里存的 input 就是完整的生成上下文（不是请求参数），直接复用，别再走一遍 generationContext。
    const context={...job.input,createdAt:job.input.createdAt||new Date().toISOString()};
    const prepared=prepareWritingContext(context);
    const c={...context,images:prepared.images};
    const article=job.result.article;
    const basis=job.result.basis.map(b=>({...b}));
    const draft={article,scene:job.result.scene,basis:job.result.basis.map(b=>({fact_id:b.fact_id,group:b.group}))};
    const trace=[];
    const review=await callJson({config,messages:reviewMessages(c,draft,basis,job.result.writingPackage),validate:d=>validateReview(d,draft,basis),signal:new AbortController().signal,trace,name:'修改后独立核验'});
    const checks=[...review.checks,...hardChecks(draft,c,basis)];
    if(job.result.verification?.imageSourceConfirmedAt)for(const check of checks)if(check.type==='image'&&check.status==='pending'){check.status='passed';check.action='none';check.reason=`${check.reason}（用户已确认配图来源。）`;}
    const status=['conflict','rejected','pending'].find(s=>review.overall_status===s||checks.some(ch=>ch.status===s))||(draft.scene.questions.length||review.pending_questions.length?'pending':'passed');
    job.result.verification={checks,overall_status:status,pending_questions:[...new Set([...draft.scene.questions,...review.pending_questions,...checks.filter(ch=>ch.action==='confirm').map(ch=>ch.reason)])],reviewed:true,reverifiedAt:new Date().toISOString()};
    job.result.trace=[...(job.result.trace||[]),...trace];
    update(id,'succeeded',job.result);return get(id);
  }

  // —— 改稿历史 ——
  function listRevisions(id){
    const job=get(id);if(!job)throw fail(404,'这条记录不存在');
    const rows=db.prepare('SELECT id,at,scope,requirement,source,article FROM revisions WHERE generation_id=? ORDER BY id DESC LIMIT 30').all(id);
    return {revisions:rows.map(r=>{const a=JSON.parse(r.article);return {id:r.id,at:r.at,scope:r.scope||'段落修改',requirement:r.requirement||'',source:r.source||'保存',
      title:a.title||'',lead:String(a.lead||'').slice(0,60),chars:String(a.body||'').replace(/\s/g,'').length};})};
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

  return {start,retry,get,confirmImages,editArticle,approveArticle,reverify,rewrite,restore,list,listRevisions,addRevision,restoreRevision,config:()=>{const c=deepseekConfig(projectRoot);return {configured:Boolean(c.key),model:c.model};},close:()=>{for(const [id,c]of active){update(id,'failed',null,'服务重启中断了生成，请重新生成');c.abort();}closed=true;}};
}
export async function generationApi({req,path,json,store}){
  if(!path.startsWith('/api/generations'))return false;
  const suffix=path.slice('/api/generations'.length);
  const editorialMatch=suffix.match(/^\/([0-9a-f-]{36})\/(article|approve)$/);
  if(editorialMatch){
    if(req.method!==(editorialMatch[2]==='article'?'PUT':'POST')){json(405,{error:'操作方式不支持'});return true;}
    if (!sameOrigin(req)){json(403,{error:'请在本站操作'});return true;}
    try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>300000)throw fail(413,'文案过长');chunks.push(chunk);}let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'文案格式不正确');}json(200,editorialMatch[2]==='article'?store.generations.editArticle(editorialMatch[1],input):store.generations.approveArticle(editorialMatch[1],input));}catch(e){json(e.status||400,{error:e.message});}return true;
  }
  const rewriteMatch=suffix.match(/^\/([0-9a-f-]{36})\/(rewrite|restore)$/);
  if(rewriteMatch){
    if(req.method!=='POST'){json(405,{error:'操作方式不支持'});return true;}
    if (!sameOrigin(req)){json(403,{error:'请在本站操作'});return true;}
    let input={};
    try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>200000)throw fail(413,'请求过大');chunks.push(chunk);}
      const raw=Buffer.concat(chunks).toString('utf8');input=raw?JSON.parse(raw):{};
    }catch(e){if(e.status)throw e;input={};}
    try{json(200,rewriteMatch[2]==='rewrite'?await store.generations.rewrite(rewriteMatch[1],input):store.generations.restore(rewriteMatch[1],input));}
    catch(e){json(e.status||502,{error:e.message});}return true;
  }
  const revisionMatch=suffix.match(/^\/([0-9a-f-]{36})\/revisions(?:\/(\d+))?$/);
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
  const reverifyMatch=suffix.match(/^\/([0-9a-f-]{36})\/reverify$/);
  if(reverifyMatch){
    if(req.method!=='POST'){json(405,{error:'操作方式不支持'});return true;}
    if (!sameOrigin(req)){json(403,{error:'请在本站操作'});return true;}
    try{json(200,await store.generations.reverify(reverifyMatch[1]));}catch(e){json(e.status||400,{error:e.message});}return true;
  }
  const confirmMatch=suffix.match(/^\/([0-9a-f-]{36})\/confirm-images$/);
  if(confirmMatch){
    if(req.method!=='POST'){json(405,{error:'操作方式不支持'});return true;}
    if (!sameOrigin(req)){json(403,{error:'请在本站确认'});return true;}
    try{json(200,store.generations.confirmImages(confirmMatch[1]));}catch(e){json(e.status||400,{error:e.message});}return true;
  }
  if(req.method==='GET'){
    if(suffix==='/config')json(200,store.generations.config());
    else if(!suffix)json(200,{generations:store.generations.list()});
    else if(/^\/[0-9a-f-]{36}$/.test(suffix))json(200,store.generations.get(suffix.slice(1)));
    else json(404,{error:'生成入口不存在'});return true;
  }
  const retryMatch=suffix.match(/^\/([0-9a-f-]{36})\/retry$/);
  if(req.method!=='POST'||(suffix&&!retryMatch)){json(405,{error:'操作方式不支持'});return true;}
  if (!sameOrigin(req)){json(403,{error:'请在本站发起生成'});return true;}
  if(retryMatch){json(201,store.generations.retry(retryMatch[1]));return true;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>32768){json(413,{error:'输入要求过长'});return true;}chunks.push(chunk);}
  let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(400,{error:'生成请求格式不正确'});return true;}
  json(201,store.generations.start(input));return true;
}
