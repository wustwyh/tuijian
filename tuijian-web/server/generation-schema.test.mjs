import test from 'node:test';
import assert from 'node:assert/strict';
import {parseModelJson} from './deepseek.mjs';
import {validatePlan,validateReview,hardChecks} from './generation-schema.mjs';
import {planningEvidence,prepareWritingContext} from './writing-package.mjs';
import {planningMessages} from './generation-prompts.mjs';
import {fixture} from './workflow-fixtures.mjs';

test('根对象提前闭合的坏JSON会被修掉多余大括号',()=>{
  const raw='{"scene":{"a":"b"},"goal":"g"},"outline":["x"],"style":"s"}';
  const parsed=parseModelJson(raw);
  assert.equal(parsed.repaired,1);
  assert.deepEqual(parsed.value,{scene:{a:'b'},goal:'g',outline:['x'],style:'s'});
});

test('真实失败形态：style后多一个右括号再接selected_facts',()=>{
  const raw='{"scene":{"persona":"医疗","inferred":false},"goal":"g","angle":"a","outline":["o"],"style":"微博图文","selected_facts":[{"fact_id":"f_1","group":"屏幕"}],"boundaries":[],"pending":[],"image_ids":[],"references":[]}';
  const broken=raw.replace('"style":"微博图文"','"style":"微博图文"}');
  const parsed=parseModelJson(broken);
  assert.equal(parsed.repaired,1);
  assert.equal(parsed.value.selected_facts[0].fact_id,'f_1');
});

test('JSON未闭合的报告为截断，不静默接受',()=>{
  assert.throws(()=>parseModelJson('{"scene":{"a":"b"},"goal":"g"'),/截断/);
});

test('完整对象后跟多余文本时丢弃尾部并记录长度',()=>{
  const parsed=parseModelJson('{"a":1} trailing junk');
  assert.deepEqual(parsed.value,{a:1});
  assert.equal(parsed.recovered,true);
  assert.ok(parsed.discarded>0);
});

test('本地 ima 图片来源确认按用户规则通过',()=>{
  const {context,plan,article}=fixture();
  const draft={scene:plan.scene,basis:plan.selected_facts,article:{...article,claim_citations:[{citation_id:'c_1',fact_id:'f_1',sentence:'本型号屏幕支持触控；具体配置以所选SKU为准。'}]}};
  const review={checks:[
    {citation_id:'c_1',type:'fact',claim:'原句',status:'passed',fact_id:'f_1',reason:'原文支持'},
    {citation_id:null,type:'image',claim:'配图',status:'confirm',fact_id:null,reason:'来源待补齐'},
    {citation_id:null,type:'compliance',claim:'合规',status:'passed',fact_id:null,reason:'无绝对化'},
    {citation_id:null,type:'platform',claim:'平台',status:'passed',fact_id:null,reason:'符合'}
  ],overall_status:'passed',pending_questions:[]};
  const result=validateReview(review,draft,draft.basis);
  const image=result.checks.find(c=>c.type==='image');
  assert.equal(image.status,'passed');
  assert.equal(image.action,'none');
  assert.equal(result.overall_status,'passed');
  assert.deepEqual(result.pending_questions,[]);
  assert.equal(context.product.id,'p');
});

test('核验引用句编号时按句绑定真实事实，纠正错误fact_id',()=>{
  const {plan,article}=fixture();
  const draft={scene:plan.scene,basis:plan.selected_facts,article:{...article,claim_citations:[{citation_id:'c_1',fact_id:'f_1',sentence:'本型号屏幕支持触控；具体配置以所选SKU为准。'}]}};
  const review={checks:[
    {citation_id:'c_1',type:'fact',claim:'随便写',status:'passed',fact_id:'f_99',reason:'原文支持'},
    {citation_id:null,type:'image',claim:'配图',status:'pending',fact_id:null,reason:'来源待补齐',action:'confirm'},
    {citation_id:null,type:'compliance',claim:'合规',status:'passed',fact_id:null,reason:'无绝对化'},
    {citation_id:null,type:'platform',claim:'平台',status:'passed',fact_id:null,reason:'符合'}
  ],overall_status:'passed',pending_questions:[]};
  const result=validateReview(review,draft,draft.basis);
  const fact=result.checks.find(c=>c.type==='fact');
  assert.equal(fact.fact_id,'f_1');
  assert.equal(fact.claim,'本型号屏幕支持触控；具体配置以所选SKU为准。');
});

test('合规硬检查放过“第一类/第一点”，拦住“第一品牌”',()=>{
  const {context,plan,article}=fixture();
  const clean={scene:plan.scene,basis:plan.selected_facts,article:{...article,body:'第一类办公场景适合本型号[f_1]。'}};
  assert.equal(hardChecks(clean,context,plan.selected_facts).filter(c=>c.type==='compliance').length,0);
  const dirty={scene:plan.scene,basis:plan.selected_facts,article:{...article,body:'本型号是第一品牌[f_1]。'}};
  assert.equal(hardChecks(dirty,context,plan.selected_facts).filter(c=>c.type==='compliance').length,1);
});

test('规划把image_plan收窄为image_ids，missing_images并入pending',()=>{
  const {plan}=fixture();
  const context={...fixture().context,referenceSections:[]};
  const {selected_facts,image_ids,pending,...rest}=plan;
  const stray={...rest,selected_facts,image_ids,pending,
    image_plan:[{image_id:'im_1',placement:'首图',usage:'外观',caption:'正面'},{image_id:'im_unknown',caption:'不存在'}],
    missing_images:['缺少包装清单图']};
  delete stray.image_ids;
  const result=validatePlan(stray,context);
  assert.deepEqual(result.image_ids,['im_1']);
  assert.ok(result.pending.some(p=>p.question==='缺少包装清单图'&&p.impact==='publish'));
  assert.equal('image_plan' in result,false);
  assert.equal('missing_images' in result,false);
});

test('规划输入用节选压缩，成稿仍保留完整原文',()=>{
  const long='# 屏幕\n'+'本段用于占位的完整事实原文。'.repeat(600);
  const context={...fixture().context,facts:[{...fixture().context.facts[0],fact_id:'f_1',original_snippet:long}],materials:[{material:{id:'m_1',name:'微博模板',source:'P6',category:'参考'},content:long}]};
  const prepared=prepareWritingContext(context);
  const evidence=planningEvidence(prepared);
  assert.equal(evidence.facts[0].fact_id,'f_1');
  assert.ok(evidence.facts[0].excerpt.length<400);
  assert.equal(evidence.facts[0].originalCharacters,long.length);
  assert.deepEqual(evidence.referenceMaterials.map(m=>m.material_id),['m_1']);
  const messages=planningMessages(prepared);
  const input=messages[1].content;
  assert.equal(input.includes(long),false);
  assert.ok(input.length<20000);
});

test('核验把revise误写成status时归一化为rejected+revise动作',()=>{
  const {plan,article}=fixture();
  const draft={scene:plan.scene,basis:plan.selected_facts,article:{...article,claim_citations:[{citation_id:'c_1',fact_id:'f_1',sentence:'本型号屏幕支持触控；具体配置以所选SKU为准。'}]}};
  const review={checks:[
    {citation_id:'c_1',type:'fact',claim:'原句',status:'passed',fact_id:'f_1',reason:'原文支持'},
    {citation_id:null,type:'image',claim:'配图',status:'passed',fact_id:null,reason:'来源齐备',action:'none'},
    {citation_id:null,type:'compliance',claim:'合规',status:'passed',fact_id:null,reason:'无绝对化'},
    {citation_id:null,type:'platform',claim:'平台',status:'revise',fact_id:null,reason:'补强产品价值'}
  ],overall_status:'passed',pending_questions:[]};
  const result=validateReview(review,draft,draft.basis);
  const platform=result.checks.find(c=>c.type==='platform');
  assert.equal(platform.status,'rejected');
  assert.equal(platform.action,'revise');
  assert.equal(result.overall_status,'rejected');
});

test('模型附带空的_note字段被丢弃，不判为多余键',()=>{
  const context={...fixture().context,referenceSections:[{material_id:'m_1',name:'微博模板',content:'参考',section:1}]};
  const plan={...fixture().plan,references:[{material_id:'m_1',guidance:'仅作节奏参考'}],style_note:'',references_note:''};
  const result=validatePlan(plan,context);
  assert.equal(result.references.length,1);
  assert.equal('style_note' in result,false);
});

test('模型抄错的material_id按前缀唯一匹配自动纠正',()=>{
  const correct='9223a9f9ff4db57cdca8112096d2c8e3c6796174a13b482acbae0f7360b858d0';
  const broken='9223a9f9ff4db57cdca8112096d2c8e3c3eb03c7bc5bd6e15766985901db';
  const context={...fixture().context,referenceSections:[{material_id:correct,name:'微博模板',content:'参考',section:1}]};
  const plan={...fixture().plan,references:[{material_id:broken,guidance:'仅作节奏参考'}]};
  const result=validatePlan(plan,context);
  assert.equal(result.references[0].material_id,correct);
});

test('模型漏写的素材自动补齐中性说明，不整轮失败',()=>{
  const context={...fixture().context,referenceSections:[
    {material_id:'m_1',name:'微博模板',content:'参考',section:1},
    {material_id:'m_2',name:'案例',content:'参考',section:1}
  ]};
  const plan={...fixture().plan,references:[{material_id:'m_1',guidance:'仅作节奏参考'}]};
  const result=validatePlan(plan,context);
  assert.deepEqual(result.references.map(r=>r.material_id).sort(),['m_1','m_2']);
  assert.ok(result.references.find(r=>r.material_id==='m_2').guidance.includes('程序补齐'));
});

test('正文出现“发我/我陪你/我教你”等咨询口吻时硬检查判为需修订',()=>{
  const {context,plan,article}=fixture();
  const dirty={scene:plan.scene,basis:plan.selected_facts,article:{...article,cta:'把你的常用软件和外设发我，我陪你过一遍清单。'}};
  const flagged=hardChecks(dirty,context,plan.selected_facts).filter(c=>c.type==='platform'&&/口吻/.test(c.reason));
  assert.equal(flagged.length,1);
  assert.equal(flagged[0].action,'revise');
  const clean={scene:plan.scene,basis:plan.selected_facts,article:{...article,cta:'马上咨询具体型号与配置，或预约到店体验。'}};
  assert.equal(hardChecks(clean,context,plan.selected_facts).filter(c=>c.type==='platform'&&/口吻/.test(c.reason)).length,0);
});
