import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {generationStore,generationApi} from './generations.mjs';
import {callJson} from './deepseek.mjs';
import {generationError} from '../src/generationError.js';
import {generationOutcome} from '../src/generationOutcome.js';
import {validateReview,validatePlan} from './generation-schema.mjs';
import {revisionWorkflow} from './revision-workflow.mjs';
import {fixture} from './workflow-fixtures.mjs';

test('重试沿用资料快照，保留失败记录，运行中重复请求复用同一任务',async t=>{
  t.mock.method(globalThis,'fetch',()=>new Promise(()=>{}));
  const oldKey=process.env.LLM_API_KEY;process.env.LLM_API_KEY='offline-test';
  const db=new DatabaseSync(':memory:');
  const store=generationStore({db,projectRoot:process.cwd(),store:{}});
  const id='00000000-0000-0000-0000-000000000001';
  const input={...fixture().context,extra:'保留要求'};
  db.prepare('INSERT INTO generations(id,created_at,status,summary,input,error) VALUES (?,?,?,?,?,?)').run(id,new Date().toISOString(),'failed','{}',JSON.stringify(input),'旧错误');
  try{
    const first=store.retry(id),second=store.retry(id);
    assert.equal(first.id,second.id);
    assert.equal(store.get(id).error,'旧错误');
    const retry=store.get(first.id);
    assert.equal(retry.input.retryOf,id);
    assert.equal(retry.input.extra,'保留要求');
    assert.deepEqual(retry.input.product,input.product);
    assert.equal(retry.status,'planning');
    assert.throws(()=>store.retry(first.id),/尚未失败/);
  }finally{store.close();db.close();if(oldKey===undefined)delete process.env.LLM_API_KEY;else process.env.LLM_API_KEY=oldKey;}
});

test('重试接口校验同站来源并返回新任务ID',async()=>{
  let calls=0;const store={generations:{retry:id=>{calls++;return {id};}}};
  const path='/api/generations/00000000-0000-0000-0000-000000000001/retry';
  let response;
  const json=(status,data)=>{response={status,data};};
  await generationApi({req:{method:'POST',headers:{origin:'https://other.example',host:'localhost'}},path,json,store});
  assert.equal(response.status,403);assert.equal(calls,0);
  await generationApi({req:{method:'POST',headers:{host:'localhost'}},path,json,store});
  assert.equal(response.status,201);assert.equal(calls,1);
});

test('网络、超时、授权、额度、限流、服务错误均可识别',async t=>{
  for(const [status,code] of [[401,'auth'],[402,'balance'],[403,'auth'],[408,'timeout'],[413,'input'],[429,'rate_limit'],[500,'unavailable'],[503,'unavailable'],[504,'timeout']]){
    const mock=t.mock.method(globalThis,'fetch',async()=>new Response('{}',{status}));
    try{await assert.rejects(callJson({config:{key:'test',model:'test'},messages:[],validate:x=>x,signal:new AbortController().signal,trace:[],name:'离线检查'}),e=>generationError(e.message).code===code);}
    finally{mock.mock.restore();}
  }
  for(const [error,code] of [[new TypeError('fetch failed'),'network'],[Object.assign(new Error(),{name:'TimeoutError'}),'timeout']]){
    const mock=t.mock.method(globalThis,'fetch',async()=>{throw error;});
    try{await assert.rejects(callJson({config:{key:'test',model:'test'},messages:[],validate:x=>x,signal:new AbortController().signal,trace:[],name:'离线检查'}),e=>generationError(e.message).code===code);}
    finally{mock.mock.restore();}
  }
});

test('格式重试给出具体未知编号及允许范围，最多调用两次',async t=>{
  const trace=[];let calls=0;
  t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({checks:[{type:'fact',claim:'原句',status:'passed',fact_id:'f_99',reason:'理由'},...['image','compliance','platform'].map(type=>({type,claim:'检查',status:'passed',fact_id:null,reason:'理由'}))],overall_status:'passed',pending_questions:[]})}}]});});
  await assert.rejects(callJson({config:{key:'test',model:'test'},messages:[],validate:v=>validateReview(v,{article:{claim_citations:[]} },[{fact_id:'f_1'}]),signal:new AbortController().signal,trace,name:'核验'}),/f_99.*f_1/);
  assert.equal(calls,2);assert.match(trace[1].messages.at(-1).content,/f_99.*f_1/);
});

test('直接展示最终稿与实际审核通过保持区分',()=>{
  const outcome=generationOutcome('succeeded',{reviewed:false,overall_status:'pending'});
  assert.equal(outcome.state,'done');assert.equal(outcome.label,'生成完成');
  assert.equal(generationOutcome('succeeded',{reviewed:true,overall_status:'passed'}).label,'生成完成，核验通过');
  assert.equal(generationOutcome('succeeded',{reviewed:true,overall_status:'rejected'}).state,'failed');
});

test('多余字段明确指出名称，截断与成功响应均保存原始输出',async t=>{
  const {context,plan}=fixture();
  assert.throws(()=>validatePlan({...plan,type:'json_object'},context),/多余 type/);
  const trace=[];let count=0;
  t.mock.method(globalThis,'fetch',async()=>Response.json({choices:[{finish_reason:count++===0?'length':'stop',message:{content:count===1?'{"partial":':'{"ok":true}'}}]}));
  const result=await callJson({config:{key:'test',model:'test'},messages:[],validate:x=>x,signal:new AbortController().signal,trace,name:'原始输出检查'});
  assert.deepEqual(result,{ok:true});
  assert.equal(trace[0].rawOutput,'{"partial":');
  assert.equal(trace[0].invalidOutput,'{"partial":');
  assert.match(trace[0].formatError,/finish_reason=length/);
  assert.equal(trace[1].rawOutput,'{"ok":true}');
  assert.equal(trace[1].validationStatus,'passed');
});

test('走满两次修订后直接展示，不触发第三次审核',async()=>{
  const {context,plan,article,review}=fixture();
  const names=[];
  const result=await revisionWorkflow({context,onProgress:async()=>{},call:async options=>{names.push(options.name);return options.validate(options.name==='资料整理与任务规划'?structuredClone(plan):options.name.includes('核验')?review('rejected'):{article:structuredClone(article)});}});
  assert.deepEqual(names,['资料整理与任务规划','初稿创作','第1次独立核验','第1次反馈修订','第2次独立核验','第2次反馈修订']);
  assert.equal(result.verification.reviewed,false);
  assert.equal(result.conversation.filter(t=>t.role==='writer').length,3);
  assert.equal(result.conversation.at(-1).message,'修订完成，最终稿已就绪。');
});

test('网络失败写入错误类型和失败阶段，原任务快照可继续重试',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{throw new TypeError('offline');});
  const oldKey=process.env.LLM_API_KEY;process.env.LLM_API_KEY='offline-test';
  const db=new DatabaseSync(':memory:');const store=generationStore({db,projectRoot:process.cwd(),store:{}});
  const id='00000000-0000-0000-0000-000000000002';
  const input=fixture().context;
  db.prepare('INSERT INTO generations(id,created_at,status,summary,input) VALUES (?,?,?,?,?)').run(id,new Date().toISOString(),'failed','{}',JSON.stringify(input));
  try{
    const started=store.retry(id);
    for(let n=0;n<10&&store.get(started.id).status!=='failed';n++)await new Promise(setImmediate);
    const failed=store.get(started.id);
    assert.equal(failed.status,'failed');assert.equal(failed.result.failure.code,'network');
    assert.equal(failed.result.failure.stage,'资料整理与任务规划');assert.equal(failed.result.trace.length,1);
    assert.equal(store.get(id).status,'failed');
  }finally{store.close();db.close();if(oldKey===undefined)delete process.env.LLM_API_KEY;else process.env.LLM_API_KEY=oldKey;}
});
