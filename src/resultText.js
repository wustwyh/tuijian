import {publicationText} from './publication.js';
function legacyResultText(job){
  const r=job.result,v=r.verification,blocked=['rejected','conflict'].includes(v.overall_status);
  const body=blocked?'草稿未通过核验，正文已拦截。':publicationText(`### ${r.article.title}\n\n${r.article.lead}\n\n${r.article.body}\n\n${r.article.cta}\n\n${r.article.tags.join(' ')}\n\n${r.article.image_plan.map(i=>`- ${i.caption}｜${i.position}｜${i.purpose}\n  文件：${i.file}\n  来源：${i.pageUrl||i.sourceUrl||'本地知识库'}`).join('\n')}`);
  return `# 图文创作记录\n\n产品：${job.summary.product}\n时间：${job.createdAt}\n平台：${job.summary.platform}\n\n## 一、场景判断\n\n客户：${r.scene.persona}${r.scene.inferred?'（系统推断）':''}\n场景：${r.scene.usage_scenarios.join('、')}\n问题：${r.scene.main_problem}\n${r.scene.reasoning}\n\n## 二、知识库依据\n\n${r.basis.map(f=>`### ${f.fact_id} ${f.group}\n\n${f.original_snippet}\n来源：${f.source}\n版本：${f.version}\n资料日期：${f.recorded_date}\n${f.urls.join('\n')}`).join('\n\n')}\n\n## 三、图文软文\n\n${body}\n\n## 四、核验结果\n\n总体状态：${v.overall_status}${v.reviewed===false?'（最终稿未再次审核）':''}\n\n${v.checks.map(c=>`- [${c.status}] ${c.claim}：${c.reason}`).join('\n')}\n\n待确认：\n${v.pending_questions.map(q=>'- '+q).join('\n')}\n\n## 审核与修订对话\n\n${(r.conversation||[]).map(t=>`### ${t.role} · 第${t.round}轮\n\n${t.message}\n${(t.issues||[]).map(i=>'- '+i.claim+'：'+i.reason).join('\n')}\n${(t.pending_questions||[]).map(q=>'- '+q).join('\n')}${t.article?'\n\n'+publicationText(t.article.title+'\n\n'+t.article.body):''}`).join('\n\n')}\n\n## 本次素材\n\n${job.input.materials.map(m=>'- '+m.material.name+'｜'+m.material.source).join('\n')}`;
}
export function resultText(job){
  let text=legacyResultText(job);
  const p=job.result.writingPackage,s=job.result.selection;
  if(p){
    const packageText=`## 写作任务包\n\n目标：${p.goal}\n切入点：${p.angle}\n风格：${p.style}\n\n提纲：\n${p.outline.map(t=>'- '+t).join('\n')}\n\n表达边界：\n${p.boundaries.map(t=>'- '+t).join('\n')}\n\n素材使用方法：\n${p.references.map(r=>'- '+r.material_id+'：'+r.guidance).join('\n')}\n\n精选证据：${p.selected_facts.map(f=>f.fact_id).join('、')}\n待确认：\n${p.pending.map(q=>'- '+q.question+'（'+q.impact+'）').join('\n')}\n\n${s?`事实片段：${s.factSelected}/${s.factTotal}；参考素材：${s.referenceSelected}/${s.referenceTotal}\n未装入素材：${s.omittedMaterials.map(m=>m.name+'：'+m.reason).join('；')||'无'}\n`:''}`;
    text=text.replace('## 一、场景判断',packageText+'\n\n## 一、场景判断');
  }
  const images=job.result.article.image_plan;
  const generatedAt=job.result.completedAt||job.createdAt;
  const generatedTime=generatedAt?new Date(generatedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未记录';
  if(images.length)text+='\n\n## 产品图片来源记录\n\n'+images.map(i=>`- ${i.file}｜${i.provenance?.confirmed?'产品图 · 来源 ima':'产品图'}\n  型号：${job.summary.product}\n  ima条目：${i.file}\n  ima获取时间：${generatedTime}\n  说明：${i.description||'待补齐'}\n  建议位置：${i.position}`).join('\n');
  return text;
}
