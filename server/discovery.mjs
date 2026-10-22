import {randomUUID,createHash} from 'node:crypto';
import { sameOrigin } from './same-origin.mjs';
import {deepseekConfig,callJson} from './deepseek.mjs';
import {composeOptions} from './compose-options.mjs';
import {fail} from './generation-context.mjs';

const DIMENSIONS=['用户场景','首要目标','核心疑虑或卖点','行动与CTA','购买或内容阶段'];
const MAX_ROUNDS=7;
const TTL_MS=30*60*1000;
const shapeError=message=>fail(502,'需求梳理输出格式不合格：'+message);

export function cardKey(input){
  const norm=arr=>[...new Set(Array.isArray(arr)?arr:[])].sort().join(',');
  return createHash('sha256').update(JSON.stringify({
    p:input.productId,a:input.audienceId||'',pf:input.platformId,t:input.task,f:input.format,
    tp:norm(input.topicIds),m:norm(input.materialIds)
  })).digest('hex');
}

export function validateQuestion(v,remaining){
  if(!v||typeof v!=='object'||Array.isArray(v))throw shapeError('问题必须是JSON对象');
  if(!remaining.includes(v.dimension))throw shapeError('dimension 必须是剩余维度之一：'+remaining.join('、'));
  if(typeof v.question!=='string'||!v.question.trim()||v.question.length>300)throw shapeError('question 应为简短文本');
  if(!Array.isArray(v.options)||v.options.length<2)throw shapeError('options 应为2到6个选项');
  v.options=v.options.slice(0,6).map((o,i)=>{
    if(typeof o==='string')return {id:'opt'+(i+1),label:o};
    if(!o||typeof o!=='object')throw shapeError('选项格式无效');
    const label=String(o.label||o.text||o.option||o.value||'').trim();
    if(!label)throw shapeError('每个选项需含label');
    return {id:String(o.id||o.key||'opt'+(i+1)),label};
  });
  const asBool=v=>v===undefined?true:!(v===false||v===0||v==='0'||v==='false'||v==='否');
  v.allowOther=asBool(v.allowOther);
  v.allowSkip=asBool(v.allowSkip);
  return v;
}

export function discoveryStore({projectRoot,list,audiences,materials}){
  const sessions=new Map();

  function buildCard(input){
    const opts=composeOptions(projectRoot);
    const product=list().find(p=>p.id===input.productId);
    if(!product)throw fail(400,'请选择有效产品');
    const audience=input.audienceId?audiences.list().find(a=>a.id===input.audienceId):null;
    const platform=opts.platforms.find(p=>p.id===input.platformId);
    if(!platform||!opts.tasks.includes(input.task)||!opts.formats.includes(input.format))throw fail(400,'客户、平台或任务已变化，请重新选择');
    if(!Array.isArray(input.topicIds)||input.topicIds.some(id=>!opts.topics.some(t=>t.id===id)))throw fail(400,'请重新选择有效选题');
    if(!Array.isArray(input.materialIds))throw fail(400,'素材选择无效');
    const topics=opts.topics.filter(t=>input.topicIds.includes(t.id)).map(t=>t.name);
    const materialList=materials.list();
    const chosen=input.materialIds.map(id=>{const m=materialList.find(x=>x.id===id);if(!m)throw fail(409,'本次素材已停用或移除');return {name:m.name,kind:m.kind};});
    return {
      product:{id:product.id,name:product.fullName},
      audience:{id:audience?.id||'',name:audience?.name||'系统推荐客户'},
      audienceAuto:!input.audienceId,
      platform:{id:platform.id,name:platform.name},
      task:input.task,format:input.format,topics,materials:chosen,
      extra:typeof input.extra==='string'?input.extra.slice(0,6000):''
    };
  }

  function prune(){
    const now=Date.now();
    for(const [id,s]of sessions)if(now-s.updatedAt>TTL_MS)sessions.delete(id);
    if(sessions.size>200){const oldest=[...sessions.values()].sort((a,b)=>a.updatedAt-b.updatedAt).slice(0,sessions.size-200);for(const s of oldest)sessions.delete(s.id);}
  }

  function questionMessages(card,remaining,history){
    const system='你是图文营销的“需求梳理”助手。目标是在用户开始生成前，用尽量少的轮次澄清其额外要求。每轮只问一个简短选择题，帮助生成任务写得更贴合场景、更有销售指向。'+
      '已由卡片确定的信息（产品、客户、平台、任务、表达形式、选题、素材）不要再询问。'+
      '只围绕“剩余维度”提问，每轮覆盖其中一个维度，不要重复已覆盖的维度。选项2到6个，尽量互斥、可行动；必须允许“其他/暂不确定”。'+
      '不输出产品事实、参数、价格，也不接收或输出任何密钥。只输出一个JSON对象，不要代码围栏。';
    const user={card:{product:card.product.name,audience:card.audience.name,audienceAuto:card.audienceAuto,platform:card.platform.name,task:card.task,format:card.format,topics:card.topics,materials:card.materials.map(m=>m.name)},remainingDimensions:remaining,history,existingExtra:card.extra};
    return [{role:'system',content:system},{role:'user',content:JSON.stringify(user)}];
  }

  function summaryMessages(card,history){
    const system='你是图文营销的“需求梳理”助手。把已经完成的问答整理成一段直接可作为“额外要求”的摘要，交给生成智能体使用。'+
      '摘要要具体、可执行：写清目标客户场景、核心卖点与收益的取舍、必须保留的适用条件、期望的行动引导与语气；不要把问题清单本身当结论，也不要编造未确认的产品事实、价格或参数。'+
      '不接收或输出任何密钥。只输出一个JSON对象{"extraSummary":"..."}，不要代码围栏。';
    const user={card:{product:card.product.name,audience:card.audience.name,audienceAuto:card.audienceAuto,platform:card.platform.name,task:card.task,format:card.format,topics:card.topics,materials:card.materials.map(m=>m.name)},history,existingExtra:card.extra};
    return [{role:'system',content:system},{role:'user',content:JSON.stringify(user)}];
  }

  async function askNext(session){
    const remaining=DIMENSIONS.filter(d=>!session.covered.includes(d));
    const config=deepseekConfig(projectRoot);
    const question=await callJson({config,messages:questionMessages(session.card,remaining,session.history),
      validate:v=>validateQuestion(v,remaining),signal:new AbortController().signal,trace:[],name:'需求梳理提问'});
    session.round++;session.updatedAt=Date.now();session.lastDimension=question.dimension;
    return {sessionId:session.id,round:session.round,cardKey:session.key,done:false,question:question.question,dimension:question.dimension,options:question.options,allowOther:question.allowOther,allowSkip:question.allowSkip,rationale:question.rationale||''};
  }

  function start(input){
    prune();
    const card=buildCard(input);
    const session={id:randomUUID(),key:cardKey(input),card,round:0,covered:[],history:[],done:false,summary:'',lastDimension:null,createdAt:Date.now(),updatedAt:Date.now()};
    sessions.set(session.id,session);
    return askNext(session);
  }

  async function answer({sessionId,answer,cardKey,dimension}){
    const session=sessions.get(sessionId);
    if(!session)throw fail(404,'梳理会话已失效，请重新开始');
    if(cardKey&&cardKey!==session.key)throw fail(409,'卡片选择已变化，请重新梳理需求');
    if(session.done)throw fail(409,'本轮梳理已完成，请使用摘要或重新开始');
    const text=typeof answer?.text==='string'?answer.text.trim():'';
    const optionId=typeof answer?.optionId==='string'?answer.optionId:'';
    if(!text&&!optionId)throw fail(400,'请选择一项或填写你的答案');
    session.history.push({round:session.round+1,answer:text||optionId});
    session.updatedAt=Date.now();
    const dim=dimension||session.lastDimension;
    if(dim&&DIMENSIONS.includes(dim)&&!session.covered.includes(dim))session.covered.push(dim);
    const remaining=DIMENSIONS.filter(d=>!session.covered.includes(d));
    if(!remaining.length||session.round>=MAX_ROUNDS){
      const config=deepseekConfig(projectRoot);
      const {extraSummary}=await callJson({config,messages:summaryMessages(session.card,session.history),
        validate:v=>{if(!v||typeof v.extraSummary!=='string'||!v.extraSummary.trim()||v.extraSummary.length>6000)throw shapeError('extraSummary 应为有效文本');return v;},
        signal:new AbortController().signal,trace:[],name:'需求梳理摘要'});
      session.done=true;session.summary=extraSummary.trim();session.updatedAt=Date.now();
      return {sessionId:session.id,round:session.round,cardKey:session.key,done:true,extraSummary:session.summary};
    }
    return askNext(session);
  }

  return {start,answer};
}

export async function discoveryApi({req,path,json,store}){
  if(!path.startsWith('/api/generations/discovery/'))return false;
  if(req.method!=='POST'){json(405,{error:'操作方式不支持'});return true;}
  if (!sameOrigin(req)){json(403,{error:'请在本站发起梳理'});return true;}
  const suffix=path.slice('/api/generations/discovery'.length);
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>32768){json(413,{error:'输入要求过长'});return true;}chunks.push(chunk);}
  let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{json(400,{error:'梳理请求格式不正确'});return true;}
  try{
    if(suffix==='/start')json(201,await store.discovery.start(input));
    else if(suffix==='/answer')json(200,await store.discovery.answer(input));
    else{json(404,{error:'梳理入口不存在'});return true;}
  }catch(e){json(e.status||500,{error:e.status?e.message:'需求梳理暂时不可用，请重试'});}
  return true;
}
