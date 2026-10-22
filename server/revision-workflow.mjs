import {planningMessages,composeMessages,reviewMessages,revisionMessages} from './generation-prompts.mjs';
import {validatePlan,validateArticle,validateReview,hardChecks} from './generation-schema.mjs';
import {prepareWritingContext,packageEvidence} from './writing-package.mjs';

export async function revisionWorkflow({context,call,onProgress}){
  const conversation=[];let plan,prepared;
  const publicPackage=()=>({...plan,facts:packageEvidence(prepared,plan),images:prepared.images.filter(i=>plan.image_ids.includes(i.id))});
  const report=async(stage,round=0)=>onProgress(stage==='selecting'||stage==='planning'?'planning':stage==='revising'?'revising':stage==='reviewing'?'reviewing':'generating',conversation,{progress:{stage,round},...(prepared?{selection:prepared.selection}:{}),...(plan?{writingPackage:publicPackage()}:{})});
  await report('selecting');
  prepared=prepareWritingContext(context);
  conversation.push({role:'system',round:0,message:`资料筛选完成：${prepared.selection.factTotal}条原文中选入${prepared.facts.length}条完整片段；未入选内容保留在原始快照。`});
  await report('planning');
  plan=await call({messages:planningMessages(prepared),validate:v=>validatePlan(v,prepared),name:'资料整理与任务规划'});
  conversation.push({role:'planner',round:0,message:'写作任务包已就绪：'+plan.angle});
  const c={...context,images:prepared.images};
  await report('writing');
  let draft=await call({messages:composeMessages(c,plan),validate:v=>validateArticle(v,c,plan),name:'初稿创作'});
  conversation.push({role:'writer',round:0,message:'初稿已完成。',article:draft.article});
  for(let round=0;round<=2;round++){
    const basis=draft.basis.map(b=>({...context.facts.find(f=>f.fact_id===b.fact_id),group:b.group,model_name:context.product.fullName}));
    const result=verification=>({draft,basis,verification,conversation,writingPackage:publicPackage(),selection:prepared.selection,progress:{stage:'completed',round},images:prepared.images});
    if(round===2){
      const checks=hardChecks(draft,c,basis);
      const verification={overall_status:'pending',checks,pending_questions:[...new Set([...draft.scene.questions,...checks.filter(ch=>ch.action==='confirm').map(ch=>ch.reason)])],reviewed:false};
      conversation.push({role:'system',round,message:'修订完成，最终稿已就绪。'});
      return result(verification);
    }
    await report('reviewing',round);
    const review=await call({messages:reviewMessages(c,draft,basis,plan),validate:d=>validateReview(d,draft,basis),name:`第${round+1}次独立核验`});
    const checks=[...review.checks,...hardChecks(draft,c,basis)];
    const status=['conflict','rejected','pending'].find(s=>review.overall_status===s||checks.some(ch=>ch.status===s))||(draft.scene.questions.length||review.pending_questions.length?'pending':'passed');
    const verification={checks,overall_status:status,pending_questions:[...new Set([...draft.scene.questions,...review.pending_questions,...checks.filter(ch=>ch.action==='confirm').map(ch=>ch.reason)])],reviewed:true};
    const issues=checks.filter(ch=>ch.action==='revise');
    conversation.push({role:'reviewer',round,message:issues.length?'请一次性处理以下全部可修改问题。':status==='passed'?'本轮核验通过。':'没有需要改稿的问题，待确认事项已单独保留。',issues:checks.filter(ch=>ch.status!=='passed'),pending_questions:review.pending_questions});
    if(!issues.length)return result(verification);
    conversation.push({role:'system',round:round+1,message:`正在进行第${round+1}次定向修订。`});
    await report('revising',round+1);
    draft=await call({messages:revisionMessages(c,draft,verification,round+1,plan),validate:d=>validateArticle(d,c,plan),name:`第${round+1}次反馈修订`});
    conversation.push({role:'writer',round:round+1,message:`第${round+1}次修订完成。`,article:draft.article});
  }
}
