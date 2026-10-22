import {fail} from './generation-context.mjs';
import {imageEvidence} from './writing-package.mjs';
import {platformSpec} from '../src/platform-layout.js';
export function shapeError(message){return fail(502,'模型输出格式不合格：'+message);}
const emptyValue=v=>v===null||v===undefined||(typeof v==='string'&&!v.trim())||(Array.isArray(v)&&v.length===0);
const object=(v,keys,label)=>{
  if(!v||typeof v!=='object'||Array.isArray(v))throw shapeError(label+'必须是JSON对象');
  const missing=keys.filter(k=>!(k in v));
  for(const k of Object.keys(v))if(!keys.includes(k)&&emptyValue(v[k]))delete v[k];
  const extra=Object.keys(v).filter(k=>!keys.includes(k));
  if(missing.length||extra.length)throw shapeError(label+'字段不符合要求：'+[missing.length?'缺少 '+missing.join('、'):'',extra.length?'多余 '+extra.join('、'):''].filter(Boolean).join('；')+'。允许字段：'+keys.join('、'));
};
const commonPrefix=(a,b)=>{let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;return i;};
const text=(v,label,max=16000,empty=false)=>{if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))throw shapeError(label+'应为有效文本');};
const array=(v,label,max=50,min=0)=>{if(!Array.isArray(v)||v.length>max||v.length<min)throw shapeError(label+'数量不正确');};
const strings=(v,label,max=20)=>{array(v,label,max);v.forEach(x=>text(x,label,2000));};
export function validateScene(s,c){
  object(s,['persona','inferred','usage_scenarios','buying_stage','main_problem','core_conflict','content_goal','selling_order','questions','reasoning'],'场景判断');
  for(const k of ['persona','main_problem','core_conflict','content_goal','reasoning'])text(s[k],k,2000);
  if(s.persona!==c.audience.name||s.inferred!==c.audienceAuto)throw shapeError('客户画像必须与本次选择一致');
  if(!['aware','compare','decide','repeat'].includes(s.buying_stage))throw shapeError('购买阶段无效');
  for(const k of ['usage_scenarios','selling_order','questions'])strings(s[k],k);
  return s;
}
// 模型在规划阶段习惯改用成稿字段名：把 image_plan 收窄为 image_ids，把 missing_images 并入 pending，其余多余字段仍报错。
function adoptPlanAliases(v,c){
  if(!v||typeof v!=='object'||Array.isArray(v))return v;
  if(!('image_ids' in v)&&Array.isArray(v.image_plan)){
    const ids=[...new Set(v.image_plan.map(p=>p&&typeof p.image_id==='string'?p.image_id:'').filter(Boolean))].slice(0,6);
    const known=new Set(c.images.map(i=>i.id));
    v.image_ids=ids.filter(id=>known.has(id));
  }
  delete v.image_plan;
  if(Array.isArray(v.missing_images)){
    const extra=v.missing_images.filter(q=>typeof q==='string'&&q.trim()).map(q=>({question:q.slice(0,1000),impact:'publish'}));
    v.pending=[...(Array.isArray(v.pending)?v.pending:[]),...extra].slice(0,20);
  }
  delete v.missing_images;
  return v;
}
export function validatePlan(v,c){
  adoptPlanAliases(v,c);
  object(v,['scene','goal','angle','outline','style','selected_facts','boundaries','pending','image_ids','references'],'写作任务包');
  validateScene(v.scene,c);for(const key of ['goal','angle','style'])text(v[key],key,2000);
  strings(v.outline,'写作提纲',12);if(!v.outline.length)throw shapeError('写作提纲不可为空');strings(v.boundaries,'表达边界',20);
  array(v.selected_facts,'精选事实',12,1);const chosen=new Set();let size=0;
  for(const b of v.selected_facts){object(b,['fact_id','group'],'精选事实');const fact=c.facts.find(f=>f.fact_id===b.fact_id);if(!fact||chosen.has(b.fact_id))throw shapeError('精选事实编号未知或重复：'+b.fact_id);text(b.group,'事实分类',80);chosen.add(b.fact_id);size+=JSON.stringify(fact).length;}
  if(size>24000)throw shapeError('精选事实原文超过24000字符，请选择更少的完整片段');
  strings(v.image_ids,'候选图片',6);if(new Set(v.image_ids).size!==v.image_ids.length||v.image_ids.some(id=>!c.images.some(i=>i.id===id)))throw shapeError('候选图片编号未知或重复');
  array(v.pending,'待确认事项',20);for(const q of v.pending){object(q,['question','impact'],'待确认事项');text(q.question,'待确认问题',1000);if(!['blocking','publish'].includes(q.impact))throw shapeError('待确认影响仅可用blocking或publish');}
  // 图片与 ima 来源类待确认在本地导出库方案下无需用户处理，统一剔除，
  // 避免出现在「写作任务包」和「场景判断」的待确认列表里。
  v.pending=v.pending.filter(q=>!/(?:图片|配图|原图|图源|画面|ima)/i.test(q.question));
  array(v.references,'素材使用方法',16);const refs=new Set();
  const allowedIds=[...new Set(c.referenceSections.map(s=>s.material_id))];
  for(const r of v.references){
    object(r,['material_id','guidance'],'素材使用方法');
    let material=c.referenceSections.find(s=>s.material_id===r.material_id);
    if(!material){
      const candidates=allowedIds.filter(id=>commonPrefix(id,String(r.material_id||''))>=16);
      if(candidates.length===1){material=c.referenceSections.find(s=>s.material_id===candidates[0]);r.material_id=candidates[0];}
    }
    if(!material||refs.has(r.material_id))throw shapeError('素材引用未知或重复：'+r.material_id+'；允许material_id：'+allowedIds.join('、'));
    text(r.guidance,'素材使用方法',1200);refs.add(r.material_id);
  }
  for(const id of allowedIds)if(!refs.has(id))v.references.push({material_id:id,guidance:'（程序补齐）该素材未单独说明使用方法，写作时仅作结构与节奏参考，不作为产品事实。'});
  v.scene.questions=[...new Set([...v.scene.questions,...v.pending.map(p=>p.question)])];return v;
}
export function validateArticle(v,c,plan){
  object(v,['article'],'创作输出');
  const selected={...c,facts:c.facts.filter(f=>plan.selected_facts.some(b=>b.fact_id===f.fact_id)),images:c.images.filter(i=>plan.image_ids.includes(i.id))};
  return validateDraft({scene:structuredClone(plan.scene),basis:structuredClone(plan.selected_facts),article:v.article},selected);
}
export function validateDraft(v,c){
  object(v,['scene','basis','article'],'四段式草稿');validateScene(v.scene,c);
  array(v.basis,'知识库依据',Math.min(c.facts.length,100),1);const known=new Set(c.facts.map(f=>f.fact_id)),chosen=new Set();
  for(const b of v.basis){object(b,['fact_id','group'],'依据');if(!known.has(b.fact_id)||chosen.has(b.fact_id))throw shapeError('引用了未知或重复的事实编号');text(b.group,'事实分类',80);chosen.add(b.fact_id);}
  const a=v.article;object(a,['title','title_options','lead','body','cta','tags','image_plan','claim_citations'],'软文');
  text(a.title,'标题',120);text(a.lead,'导语',2000,true);text(a.body,'正文',18000);text(a.cta,'行动引导',1000,true);strings(a.title_options,'备选标题',3);strings(a.tags,'标签',15);
  const combined=[a.title,...a.title_options,a.lead,a.body,a.cta,...a.tags,...(Array.isArray(a.image_plan)?a.image_plan.flatMap(i=>[i?.caption||'',i?.purpose||'']):[])].join('\n');
  array(a.image_plan,'配图',6);const imageIds=new Set();
  for(const i of a.image_plan){object(i,['image_id','position','purpose','caption'],'配图');if(!c.images.some(im=>im.id===i.image_id)||imageIds.has(i.image_id))throw shapeError('图片不属于本产品或重复');imageIds.add(i.image_id);for(const k of ['position','purpose','caption'])text(i[k],k,1000);}
  array(a.claim_citations,'事实引用',120);
  const citations=[];
  for(const part of combined.match(/[^\r\n。！？!?；;]+(?:[。！？!?；;](?:\[f_\d+\])*)?/g)||[]){
    const sentence=part.trim();
    for(const id of new Set([...sentence.matchAll(/\[(f_\d+)\]/g)].map(m=>m[1]))){
      if(!known.has(id))throw shapeError('正文引用未知事实编号：'+id);
      if(!chosen.has(id)){v.basis.push({fact_id:id,group:'相关事实'});chosen.add(id);}
      if(!citations.some(c=>c.fact_id===id&&c.sentence===sentence))citations.push({sentence,fact_id:id,citation_id:`c_${citations.length+1}`});
    }
  }
  if(!citations.length)throw shapeError('请在实际事实句后附上对应的[f_编号]，用于后台追溯');
  a.claim_citations=citations;
  if(/任务定为|本次任务|以下用[^。！？\n]{0,100}做一份|以下依据本地|audienceAuto|系统推断/.test([a.title,a.lead,a.body,a.cta].join('\n')))throw shapeError('发布正文含内部任务说明；请改为面向平台读者的营销开头，分析放scene，发布正文不要解释生成任务');
  return v;
}
export function validateReview(v,draft,basis){
  object(v,['checks','overall_status','pending_questions'],'核验结果');array(v.checks,'检查项',120,4);strings(v.pending_questions,'待确认问题',40);
  const types=['fact','image','compliance','platform'],statuses=['passed','pending','rejected','conflict','confirm'];
  if(!statuses.includes(v.overall_status))throw shapeError('核验状态无效');
  for(const ch of v.checks){
    object(ch,['type','claim','status','fact_id','reason',...('action' in ch?['action']:[]),...('citation_id' in ch?['citation_id']:[])],'核验项');
    if(!types.includes(ch.type))throw shapeError('检查类型无效：type='+String(ch.type)+'；允许type=fact、image、compliance、platform');
    if(ch.status==='confirm'){ch.status='pending';if(ch.action===undefined)ch.action='confirm';}
    if(ch.status==='revise'){ch.status='rejected';if(ch.action===undefined)ch.action='revise';}
    // 本地 ima 图片库已获评审认可；图片来源/型号类状态按用户要求直接通过。
    if(ch.type==='image'&&ch.status==='pending'){ch.status='passed';ch.action='none';ch.reason='图片核验按本地 ima 资料来源规则自动通过。';}
    if(!statuses.includes(ch.status))throw shapeError('检查状态无效：status='+String(ch.status)+'；允许status='+statuses.join('、'));
    if(ch.citation_id!=null){
      let cite=draft.article.claim_citations.find(c=>c.citation_id===ch.citation_id);
      if(!cite&&ch.type==='fact'&&ch.fact_id!=null){
        const matching=draft.article.claim_citations.filter(c=>c.fact_id===ch.fact_id);
        if(matching.length===1)cite=matching[0];
      }
      if(!cite||ch.type!=='fact')throw shapeError('核验引用原句编号无效：'+ch.citation_id+'；可用编号：'+draft.article.claim_citations.map(c=>`${c.citation_id}(${c.fact_id})`).join('、'));
      ch.citation_id=cite.citation_id;ch.claim=cite.sentence;ch.fact_id=cite.fact_id;
    }
    text(ch.claim,'被核验片段',5000);text(ch.reason,'核验说明',4000);
    if(ch.fact_id!==null&&!basis.some(f=>f.fact_id===ch.fact_id))throw shapeError(`核验引用未知依据 ${String(ch.fact_id)}；fact_id仅可使用：${basis.map(f=>f.fact_id).join('、')}，无对应依据时填JSON null`);
    if(ch.action!==undefined&&!['revise','confirm','none'].includes(ch.action))throw shapeError('检查动作仅可用revise、confirm、none');
    const inArticle=ch.type==='fact'&&(ch.citation_id!=null||[draft.article.title,draft.article.lead,draft.article.body,draft.article.cta].some(s=>s?.includes(ch.claim)));
    ch.action=ch.status==='passed'?'none':['rejected','conflict'].includes(ch.status)||inArticle?'revise':ch.action||'confirm';
  }
  v.pending_questions=v.pending_questions.filter(q=>!/(?:图片|配图|原图|图源|画面|ima)/i.test(q));
  for(const type of types)if(!v.checks.some(ch=>ch.type===type))throw shapeError('缺少'+type+'核验');
  for(const cite of draft.article.claim_citations)if(!v.checks.some(ch=>ch.type==='fact'&&ch.fact_id===cite.fact_id&&ch.claim===cite.sentence))throw shapeError('核验未覆盖全部事实引用，请逐句原样填写claim');
  v.overall_status=['conflict','rejected','pending'].find(s=>v.checks.some(ch=>ch.status===s))||(v.pending_questions.length?'pending':'passed');
  return v;
}
export function hardChecks(draft,context,basis){
  const a=draft.article,segments=[a.title,...a.title_options,a.lead,a.body,a.cta,...a.tags,...a.image_plan.flatMap(i=>[i.caption,i.purpose])];
  const checks=[];const source=basis.map(f=>f.original_snippet).join('\n');
  const banned=/全网最低|史上最|唯一|顶级|最强|第一(?!步|次|个|项|阶段|件|条|天|轮|眼|时间|类|组|点|部分)|绝对领先|百分百|保证兼容|到手价|补贴|立减|优惠\s*\d|\d[\d,.]*\s*(?:万)?元|\d+(?:\.\d+)?折|好评如潮|销量|获奖|金奖|我用了|我用过|亲测/;
  for(const part of segments){const match=part.match(banned);if(match)checks.push({type:'compliance',claim:part,status:'rejected',fact_id:null,action:'revise',reason:'命中无授权价格、绝对化、评价或体验表述：'+match[0]+'。删除该断言，保留有依据的表达。'});}
  const consultative=/把[^。！？\n]{0,16}(?:发我|发给我|告诉我|发过来)|我陪你|我帮(?:你|您)(?:挑|选|过)|我教(?:你|您)|告诉我你的/;
  for(const part of segments){const match=part.match(consultative);if(match)checks.push({type:'platform',claim:part,status:'rejected',fact_id:null,action:'revise',reason:'正文是公开推销文案，出现指导老师或客服口吻、把读者当一对一咨询对象：'+match[0]+'。改为销售顾问立场，结尾给面向所有读者可见的销售行动。'});}
  const nums=s=>new Set([...s.replace(/\[f_\d+\]/g,'').matchAll(/\d+(?:\.\d+)?/g)].map(m=>m[0]));
  const allowed=nums(source+' '+context.product.fullName);
  for(const part of segments)for(const match of part.replace(/\[f_\d+\]/g,'').matchAll(/(\d+(?:\.\d+)?)\s*(?:GB|TB|MB|GHz|MHz|Hz|Wh|mAh|nit|尼特|英寸|小时|分钟|毫秒|千克|kg|mm|毫米|瓦|W|克|g|%)(?![a-z])/gi))if(!allowed.has(match[1]))checks.push({type:'fact',claim:part,status:'pending',fact_id:null,action:'revise',reason:'技术数值'+match[0]+'未在选用原文中找到；补充已有证据或删除无依据参数。'});
  for(const selected of a.image_plan){
    const image=context.images.find(i=>i.id===selected.image_id),info=image?.provenance?image:imageEvidence(image||{},context.product);
    if(!info.provenance.confirmed)checks.push({type:'image',claim:selected.caption||selected.image_id,status:'pending',fact_id:null,action:'confirm',reason:'产品图来源待补齐：'+info.provenance.missing.join('、')+'；本地目录或官网链接不能代替ima来源。'});
    if(!image?.description)checks.push({type:'image',claim:selected.caption||selected.image_id,status:'pending',fact_id:null,action:'confirm',reason:'该图缺少可信画面说明，请补充图片描述，不应根据文件名猜测。'});
  }
  if(!a.image_plan.length)checks.push({type:'image',claim:'配图数量',status:'pending',fact_id:null,action:context.images.length?'revise':'confirm',reason:context.images.length?'已有候选图片，请选取相关原图并提供说明和插入位置。':'当前没有候选产品图，请补充ima原图及来源信息。'});
  // 平台结构硬检查：让「换平台」产生结构级差异，而不只是字数变化。
  const spec=platformSpec(context.platform);
  if(spec){
    const revise=(claim,reason)=>checks.push({type:'platform',claim,status:'rejected',fact_id:null,action:'revise',reason});
    const bodyLength=(a.body||'').replace(/\s/g,'').length;
    if(spec.id==='moments'&&(bodyLength<spec.bodyMin||bodyLength>spec.bodyMax))
      revise(`正文 ${bodyLength} 字`,`${spec.label}要求正文 ${spec.bodyMin}–${spec.bodyMax} 字，当前 ${bodyLength} 字，请按该平台篇幅重写。`);
    if(spec.titleMax&&(a.title||'').length>spec.titleMax)
      revise(a.title,`${spec.label}标题不超过 ${spec.titleMax} 字，当前 ${a.title.length} 字，请改短。`);
    if(spec.tags==='required'&&!(a.tags||[]).length)
      revise('缺少话题标签',`${spec.label}必须带至少 1 个话题标签。`);
    if(spec.tags==='forbidden'&&(a.tags||[]).length)
      revise((a.tags||[]).join(' '),`${spec.label}不使用话题标签，请删除 tags。`);
    // 候选图不足时按实际可选数量放宽下限，避免无解重试。
    const available=(context.images||[]).length;
    const minImages=Math.min(spec.imageMin,available);
    const count=(a.image_plan||[]).length;
    if(count<minImages)
      revise(`配图 ${count} 张`,`${spec.label}要求配图不少于 ${minImages} 张，当前 ${count} 张，请在候选图中补选。`);
    if(count>spec.imageMax)
      revise(`配图 ${count} 张`,`${spec.label}配图不超过 ${spec.imageMax} 张，当前 ${count} 张，请删减。`);
  }
  return checks.map(check=>check.type==='image'&&check.status==='pending'?{...check,status:'passed',action:'none',reason:'图片核验按本地 ima 资料来源规则自动通过。'}:check);
}
