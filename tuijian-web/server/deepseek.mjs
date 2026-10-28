import {loadEnv} from 'vite';
import {fail} from './generation-context.mjs';
import {currentLlmOverrides} from './llm-settings.mjs';
import {DEFAULT_BASE_URL, DEFAULT_MODEL, thinkingDisabled} from './llm-defaults.mjs';
// 只认 LLM_* 一套配置（旧的 DEEPSEEK_* 已删除，避免两套变量混用）：
//   LLM_API_KEY（必填，后台密钥里填这一个） / LLM_BASE_URL / LLM_MODEL（可选，有代码默认值）。
export function deepseekConfig(projectRoot){
  const env={...loadEnv(process.env.NODE_ENV||'development',projectRoot,''),...process.env};
  const custom=currentLlmOverrides();
  return {
    key:custom.key||env.LLM_API_KEY?.trim()||'',
    model:custom.model||env.LLM_MODEL?.trim()||DEFAULT_MODEL,
    baseUrl:custom.baseUrl||env.LLM_BASE_URL?.trim()||DEFAULT_BASE_URL,
  };
}
// 扫描第一个括号闭合的JSON对象，返回是否闭合以及其后的剩余文本。
function scanObject(text){
  const s=String(text||'').trim(),start=s.indexOf('{');
  if(start<0)return null;
  let depth=0,inString=false,escaped=false;
  for(let i=start;i<s.length;i++){
    const ch=s[i];
    if(inString){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')inString=false;continue;}
    if(ch==='"'){inString=true;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0)return {json:s.slice(start,i+1),trailing:s.slice(i+1).trim(),closed:true};}
  }
  return {json:s.slice(start),trailing:'',closed:false};
}
// 严格优先整体解析；整体失败时只在末尾确实多出文本的情况下取首个闭合对象，并记录丢弃长度，交由结构校验兜底。
export function parseModelJson(text){
  const raw=String(text||'').trim();
  if(!raw)throw new Error('输出为空');
  try{return {value:JSON.parse(raw),recovered:false,discarded:0,repaired:0};}catch(wholeError){}
  let working=raw,repaired=0;
  // 常见坏形态：把根对象的 } 提前写在某个字段值后面，然后继续写后续字段（, 或 : 开头）。
  for(let i=0;i<3;i++){
    const scanned=scanObject(working);
    if(!scanned)throw new Error('输出没有可解析的JSON对象');
    if(!scanned.closed)throw new Error('JSON对象没有闭合，输出被截断');
    if(!scanned.trailing)break;
    if(!/^[,:]/.test(scanned.trailing))break;
    const rootClose=working.length-scanned.trailing.length-1;
    working=working.slice(0,rootClose)+working.slice(rootClose+1);
    repaired++;
  }
  const final=scanObject(working);
  if(!final)throw new Error('输出没有可解析的JSON对象');
  if(!final.closed)throw new Error('JSON对象没有闭合，输出被截断');
  let value;
  try{value=JSON.parse(final.json);}catch(e){throw new Error('JSON解析失败：'+e.message);}
  return {value,recovered:Boolean(final.trailing)||repaired>0,discarded:final.trailing.length,repaired};
}
export async function callJson({config,messages,validate,signal,trace,name}){
  let reason='',previous='',truncated=false;
  for(let attempt=0;attempt<2;attempt++){
    const retryHint=truncated?'。上次输出因长度上限被截断：请压缩说明性文字（goal、outline、boundaries、guidance、reason尽量简短），确保JSON完整闭合':'。重新完整输出符合示例的json对象，不得省略字段';
    const actual=attempt?[...messages,...(previous?[{role:'assistant',content:previous}]:[]),{role:'user',content:'上次输出未通过结构校验：'+reason+retryHint}]:messages;
    trace.push({name,attempt:attempt+1,model:config.model,messages:actual,inputCharacters:actual.reduce((n,m)=>n+String(m.content).length,0),startedAt:new Date().toISOString()});const record=trace.at(-1);
    let response;
    // 调用方可能没传 signal（例如离线脚本），不能直接塞进 AbortSignal.any，否则抛 TypeError 被误报成"连接中断"。
    try{response=await fetch(`${config.baseUrl||DEFAULT_BASE_URL}/chat/completions`,{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json'},body:JSON.stringify({model:config.model,messages:actual,response_format:{type:'json_object'},...(thinkingDisabled(config.baseUrl,config.model)?{thinking:{type:'disabled'}}:{}),max_tokens:8000,stream:false}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(120000)]):AbortSignal.timeout(120000)});}
    catch(e){record.completedAt=new Date().toISOString();record.durationMs=Date.parse(record.completedAt)-Date.parse(record.startedAt);record.requestError=e.name;record.networkCode=e.cause?.code;throw fail(504,e.name==='TimeoutError'?'模型服务响应超时，请稍后重试':'模型服务连接中断，请检查服务器网络后重试');}
    if(!response.ok){
      // 把上游自己的错误说明带出来（最多 200 字），否则"模型不存在"这类问题会被笼统的"服务繁忙"盖掉。
      let detail='';
      try{const raw=await response.text();try{const parsed=JSON.parse(raw);detail=String(parsed?.error?.message||parsed?.message||'');}catch{detail=raw;}detail=detail.replace(/\s+/g,' ').slice(0,200);}catch{}
      const message=({400:'模型服务不接受这次请求（格式或输入长度），请检查模型配置',401:'模型 API 密钥无效，请检查服务器密钥配置',402:'模型账户余额不足，请检查服务商账户',403:'模型账户授权不足，请检查账户权限',404:'模型或接口地址不存在，请检查 LLM_BASE_URL 与 LLM_MODEL',408:'模型服务响应超时，请稍后重试',413:'输入过长，请减少资料后重试',422:'模型请求参数格式异常，请检查模型配置',429:'模型服务请求过于频繁，请稍后重试',500:'模型服务内部异常，请稍后重试',502:'模型服务网关异常，请稍后重试',503:'模型服务繁忙，或该模型名不被支持（检查 LLM_MODEL）',504:'模型服务响应超时，请稍后重试'})[response.status]||`模型服务返回错误（HTTP ${response.status}），请稍后重试`;
      throw fail(502,detail?`${message}（上游：${detail}）`:message);
    }
    let data;try{data=await response.json();}catch(e){throw fail(502,e.name==='TimeoutError'?'模型服务响应超时，请稍后重试':'模型服务返回异常或响应中断，请稍后重试');}
    record.completedAt=new Date().toISOString();record.durationMs=Date.parse(record.completedAt)-Date.parse(record.startedAt);record.usage=data.usage;record.outputCharacters=data.choices?.[0]?.message?.content?.length||0;
    const content=data.choices?.[0]?.message?.content;previous=typeof content==='string'?content:'';
    record.rawOutput=previous;record.finishReason=data.choices?.[0]?.finish_reason;record.truncated=record.finishReason==='length';
    try{
      if(record.finishReason==='length')throw new Error('输出被截断，JSON不完整（finish_reason=length）');
      if(record.finishReason!=='stop')throw new Error('输出未正常完成（finish_reason='+String(record.finishReason)+'）');
      if(!previous.trim())throw new Error('输出为空');
      const parsed=parseModelJson(previous);
      record.jsonRecovered=parsed.recovered;record.discardedTrailingCharacters=parsed.discarded;record.repairedBraces=parsed.repaired;
      const value=validate(parsed.value);record.validationStatus='passed';return value;
    }
    catch(e){reason=e.message;truncated=Boolean(record.truncated);record.validationStatus='failed';record.formatError=reason;record.invalidOutput=previous;}
  }
  throw fail(502,'模型两次输出均未通过格式校验，请重试。'+reason.slice(0,1200));
}
