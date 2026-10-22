import {randomUUID} from 'node:crypto';
import { sameOrigin } from './same-origin.mjs';
import {generationContext,fail} from './generation-context.mjs';
import {deepseekConfig,callJson} from './deepseek.mjs';
import {WORKFLOW_VERSION} from './generation-prompts.mjs';
import {revisionWorkflow} from './revision-workflow.mjs';
import {generationError} from '../src/generationError.js';
export function generationStore({db,projectRoot,store}){
  db.exec(`CREATE TABLE IF NOT EXISTS generations(id TEXT PRIMARY KEY,created_at TEXT NOT NULL,status TEXT NOT NULL,summary TEXT NOT NULL,input TEXT NOT NULL,result TEXT,error TEXT);
    UPDATE generations SET status='failed',error='服务重启中断了上次生成，请重新生成' WHERE status IN ('planning','generating','reviewing','revising');`);
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
  return {start,retry,get,confirmImages,editArticle,approveArticle,list,config:()=>{const c=deepseekConfig(projectRoot);return {configured:Boolean(c.key),model:c.model};},close:()=>{for(const [id,c]of active){update(id,'failed',null,'服务重启中断了生成，请重新生成');c.abort();}closed=true;}};
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
