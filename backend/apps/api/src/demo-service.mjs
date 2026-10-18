import { randomUUID, createHash } from 'node:crypto';
import { ApiError, invalid, notFound } from './errors.mjs';
import { createLLMOperation } from './llm-operation.mjs';

const ref = a => ({id:a.id,version:a.version});
export function createDemoService({store,research,ima:injectedIma,workflowFactory:injectedWorkflow,llmOperation=createLLMOperation}) {
  let catalog;
  const runs = new Map();
  const ima = async () => injectedIma ?? import('../../../packages/ima/index.mjs');
  const workflow = async llm => (injectedWorkflow ?? (await import('../../../packages/workflow/src/index.js')).createWorkflow)({llm});
  const safe = error => ({code:['LLM_FAILED','IMA_NO_RESULT','IMA_FETCH_FAILED','IMA_AUTH_FAILED','VALIDATION_ERROR','REVISION_CONFLICT'].includes(error.code)?error.code:'INTERNAL_ERROR',message:error.name==='WorkflowError'?error.message:'本阶段执行失败，请重试'});
  store.db.exec(`CREATE TABLE IF NOT EXISTS demo_customers (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),payload TEXT NOT NULL,updated_at TEXT NOT NULL
  ) STRICT;`);

  async function listProducts() {
    const client=await ima();
    const supported=client.DEMO_PRODUCT ?? 'HUAWEI MateBook 14（鸿蒙版）';
    const result=await client.retrieveProductEvidence({query:'MateBook 14',confirmedProduct:supported,needImages:true});
    if(result.status!=='resolved') throw new ApiError(502,'IMA_NO_RESULT','暂无可用完整型号');
    const id='product_'+createHash('sha256').update(result.knowledgeBaseId+'|'+result.product).digest('hex').slice(0,24);
    const image=result.evidence.find(e=>e.media_type==='IMG');
    catalog={id,result,image,read_at:new Date().toISOString()};
    return {status:'ready',products:[{id,product_id:id,name:result.product,product_name:result.product,category:'笔记本电脑',
      note:'线上 IMA 当前已接通的完整型号；资料与营销事实仍待核验。',image_url:image?`/api/products/${id}/image`:null,
      available:true,updated_at:catalog.read_at}],coverage:'当前只开放一个已接通型号',updated_at:catalog.read_at};
  }
  async function productImage(id) {
    if(!catalog || catalog.id!==id) throw notFound();
    return (await ima()).fetchProductImage({knowledgeBaseId:catalog.result.knowledgeBaseId,mediaId:catalog.image.media_id,confirmedProduct:catalog.result.product});
  }
  function detail(userId,taskId) {
    const value=research.detail(userId,taskId);
    const snap=store.execution.snapshot(userId,taskId);
    const latest=value.operations.find(op=>op.action==='recommended_plan');
    return {...value,task_id:taskId,personas:value.persona_report,contents:value.content?[value.content]:[],
      selection:snap.artifacts.persona_selection?.payload??null,
      prepared_task:snap.artifacts.prepared_task?.payload??null,
      run:runs.get(taskId)??{status:latest?.status==='succeeded'?'complete':latest?.status??'idle',stage:latest?.status==='succeeded'?'complete':null,error:latest?.error??null}};
  }
  async function startPlan(userId,body) {
    if(!body || !catalog || body.product_id!==catalog.id) throw invalid('请先刷新并选择当前产品目录中的型号');
    if(body.platform && !['xiaohongshu','wechat_official'].includes(body.platform)) throw invalid('请选择小红书或公众号');
    for(const key of ['goal','hint']) if(body[key]!==undefined && (typeof body[key]!=='string'||body[key].length>2000)) throw invalid('偏好内容过长或无效');
    const task=store.createTask(userId,{product_query:'MateBook 14',platform:body.platform??'xiaohongshu',audience_hint:body.hint??'',scenario:'',goal:body.goal??''},Date.now());
    return startExisting(userId,task.id,{product:catalog.result.product,knowledgeBaseId:catalog.result.knowledgeBaseId});
  }
  function startExisting(userId,taskId,selected) {
    const snap=store.execution.snapshot(userId,taskId);
    const task=store.getTask(userId,taskId);
    if(!selected && !snap.artifacts.model_selection) throw invalid('请先选择明确型号');
    const {operation}=store.execution.begin({userId,taskId,action:'recommended_plan',expectedRevision:snap.revision,request:{},now:Date.now()});
    runs.set(taskId,{status:'running',stage:'evidence',error:null});
    void generate(userId,taskId,operation.id,selected??{product:task.resolved_product_name}).catch(()=>{});
    return detail(userId,taskId);
  }
  async function generate(userId,taskId,operationId,selected) {
    const execution=store.execution;
    const snapshot=()=>execution.snapshot(userId,taskId);
    const get=kind=>{const a=snapshot().artifacts[kind];return a?.freshness==='current'?a:null;};
    const save=(outputs,options={})=>execution.commit({userId,taskId,operationId,outputs,complete:false,now:Date.now(),...options});
    const stage=async(name,fn)=>{
      runs.set(taskId,{status:'running',stage:name,error:null});
      const budget=llmOperation(undefined,{stage:name});
      try { const value=await fn(await workflow(budget.llm)); return {value,assertActive:budget.assertActive,close:budget.close}; }
      catch(error){budget.close();throw error;}
    };
    try {
      if(!get('evidence') || !get('model_selection')) {
        const result=await (await ima()).retrieveProductEvidence({query:'MateBook 14',confirmedProduct:selected.product,knowledgeBaseId:selected.knowledgeBaseId,needImages:true});
        if(result.status!=='resolved') throw new ApiError(502,'IMA_NO_RESULT','没有可用产品资料');
        const evidence=result.evidence.map(e=>({...e,id:`ev_${randomUUID()}`,task_id:taskId,user_id:userId}));
        save([{kind:'evidence',payload:evidence},{kind:'model_selection',payload:{product_name:result.product,source:'user_selected',selected_via:'product_card'}}],{taskPatch:{resolved_product_name:result.product,status:'retrieved'}});
      }
      const evidence=get('evidence');
      if(!get('prepared_task')) {
        const prepared=(await workflow(async()=>{})).prepareRecommendedTask({task:store.getTask(userId,taskId)});
        save([{kind:'prepared_task',payload:prepared,dependencies:{evidence:ref(evidence),model_selection:ref(get('model_selection'))}}]);
      }
      const prepared=get('prepared_task');
      const task=prepared.payload.task;
      const base={task,evidence:evidence.payload};
      if(!get('personas')) {
        const result=await stage('personas',w=>w.generatePersonas({...base,evidence:base.evidence.filter(e=>e.media_type!=='IMG')}));
        try {save([{kind:'personas',payload:result.value,dependencies:{evidence:ref(evidence),prepared_task:ref(prepared)}}],{assertActive:result.assertActive});} finally {result.close();}
      }
      const personas=get('personas');
      if(!get('persona_selection')) {
        const selection=(await workflow(async()=>{})).recommendPersona({...base,personaReport:personas.payload});
        save([{kind:'persona_selection',payload:selection,dependencies:{evidence:ref(evidence),personas:ref(personas),prepared_task:ref(prepared)}}]);
      }
      const selection=get('persona_selection');
      const context={...base,personaReport:personas.payload,selection:selection.payload};
      if(!get('strategy')) {
        const result=await stage('strategy',w=>w.generateStrategy(context));
        try {save([{kind:'strategy',payload:result.value,dependencies:{evidence:ref(evidence),personas:ref(personas),persona_selection:ref(selection)}}],{assertActive:result.assertActive});} finally {result.close();}
      }
      const strategy=get('strategy');
      if(!get('content')) {
        const version=execution.history(userId,taskId,'content').length+1;
        const result=await stage('content',w=>w.generateContent({...context,strategy:strategy.payload,version}));
        try {save([{kind:'content',payload:result.value,dependencies:{strategy:ref(strategy),evidence:ref(evidence),persona_selection:ref(selection)}}],{assertActive:result.assertActive,taskPatch:{status:'generated'}});} finally {result.close();}
      }
      const content=get('content');
      const result=await stage('verify',w=>w.verifyContent({...context,strategy:strategy.payload,draft:content.payload}));
      try {save([{kind:'verification',payload:result.value,dependencies:{content:ref(content),strategy:ref(strategy),evidence:ref(evidence)}}],{assertActive:result.assertActive,complete:true});} finally {result.close();}
      runs.set(taskId,{status:'complete',stage:'complete',error:null});
    } catch(error) {
      const failure=safe(error);
      execution.fail({userId,taskId,operationId,code:failure.code,now:Date.now()});
      runs.set(taskId,{status:'failed',stage:runs.get(taskId)?.stage,error:failure});
    }
  }
  const customer=(userId,id)=>{
    const row=store.db.prepare('SELECT payload FROM demo_customers WHERE user_id=? AND id=?').get(userId,id);
    if(!row)throw notFound(); return JSON.parse(row.payload);
  };
  const persistCustomer=(userId,value)=>{value.updated_at=new Date().toISOString();store.db.prepare('INSERT INTO demo_customers VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at WHERE demo_customers.user_id=excluded.user_id').run(value.id,userId,JSON.stringify(value),value.updated_at);return {customer:value};};
  function saveCustomer(userId,id,body) {
    const old=id?customer(userId,id):{id:`customer_${randomUUID()}`,name:'',needs:'',stage:'初识',next:'',time:'',timeline:[],content:[]};
    const patch={};
    for(const key of ['name','needs','stage','next','time'])if(body[key]!==undefined){if(typeof body[key]!=='string'||body[key].length>4000)throw invalid('客户字段无效');patch[key]=body[key];}
    if(!(patch.name??old.name).trim())throw invalid('请填写客户称呼');
    return persistCustomer(userId,{...old,...patch});
  }
  function followup(userId,id,body) {
    const value=customer(userId,id);
    if(typeof body.note!=='string'||!body.note.trim()||body.note.length>8000)throw invalid('请填写跟进记录');
    value.timeline.push({id:`followup_${randomUUID()}`,note:body.note,created_at:new Date().toISOString()});
    if(body.task_id){store.getTask(userId,body.task_id);value.content.push({task_id:body.task_id});}
    return persistCustomer(userId,value);
  }
  function exportTask(userId,taskId,format) {
    const value=detail(userId,taskId);
    if(!value.content || value.freshness.content.status!=='current')throw new ApiError(409,'PRECONDITION_FAILED','尚无当前有效内容');
    const status=value.verification?.overall_status??'pending';
    if(status==='rejected')throw new ApiError(409,'PRECONDITION_FAILED','内容核验已拒绝，请修订后再导出');
    const label=status==='passed'?'营销初稿':'待核验草稿 · 不可直接发布';
    return format==='json'?JSON.stringify({label,...value},null,2):`# ${label}\n\n# ${value.content.selected_title}\n\n${value.content.body}\n\n${value.content.cta}\n\n## 核验状态：${status}\n${(value.verification?.manual_actions??[]).map(s=>'- '+s).join('\n')}`;
  }
  return {listProducts,productImage,detail,startPlan,startExisting,exportTask,
    listCustomers:userId=>({status:'ready',customers:store.db.prepare('SELECT payload FROM demo_customers WHERE user_id=? ORDER BY updated_at DESC').all(userId).map(r=>JSON.parse(r.payload))}),
    customer:(userId,id)=>({customer:customer(userId,id)}),saveCustomer,followup};
}
