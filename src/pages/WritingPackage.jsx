import SourceText from './SourceText.jsx';
import Section from './Section.jsx';
import { ClipboardList } from 'lucide-react';

export default function WritingPackage({plan,selection,generatedTime}){
  if(!plan&&!selection)return null;
  const fallbackTime=generatedTime||'未记录';
  // 图片与 ima 来源类待确认在本地导出库方案下不需要用户处理，不在此处展示。
  const pending=(plan?.pending||[]).filter(q=>!/(?:图片|配图|原图|图源|画面|ima)/i.test(q.question));
  return <Section icon={<ClipboardList size={15}/>} title="写作任务包">
    {selection&&<><p className="knowledge-note">完整事实片段：{selection.factSelected} / {selection.factTotal}；参考素材：{selection.referenceSelected} / {selection.referenceTotal}；候选图片：{selection.imageSelected} / {selection.imageTotal}。</p>
      {selection.omittedMaterials?.length>0&&<div className="verification-questions"><h3>本次未装入的手选素材</h3><ul>{selection.omittedMaterials.map(m=><li key={m.id}>{m.name}：{m.reason}</li>)}</ul></div>}
      {(selection.factOmitted?.length>0||selection.referenceSectionsOmitted>0||selection.audienceSectionsOmitted>0)&&<details className="result-details"><summary>资料筛选范围</summary><p>{selection.note}</p><p>未入选事实编号：{selection.factOmitted?.join('、')||'无'}；未入选参考章节：{selection.referenceSectionsOmitted}；未入选客户章节：{selection.audienceSectionsOmitted}。</p></details>}</>}
    {plan&&<><div className="scene-grid"><div><small>写作目标</small><strong>{plan.goal}</strong></div><div><small>核心切入点</small><strong>{plan.angle}</strong></div></div><p>{plan.style}</p>
      <details className="result-details" open><summary>写作提纲</summary><ol>{plan.outline.map((s,i)=><li key={i}>{s}</li>)}</ol></details>
      {plan.boundaries.length>0&&<details className="result-details"><summary>适用条件与表达边界</summary><ul>{plan.boundaries.map((s,i)=><li key={i}>{s}</li>)}</ul></details>}
      <details className="result-details"><summary>精选原文证据 · {plan.facts.length} 条</summary>{plan.facts.map(f=><details className="result-details" key={f.fact_id}><summary>{f.fact_id} · {f.group} · {f.source_title}</summary><p className="document-source">{f.source}</p><SourceText text={f.original_snippet}/></details>)}</details>
      {plan.references.length>0&&<details className="result-details"><summary>素材使用方法</summary><ul>{plan.references.map(r=><li key={r.material_id}>{r.guidance}</li>)}</ul></details>}
      {plan.images?.length>0&&<details className="result-details"><summary>候选产品原图 · {plan.images.length} 张</summary>{plan.images.map(image=><div className="result-details" key={image.id}><strong>{image.file}</strong><p>{image.description||'可信图片说明待补充'}</p><p>产品图</p><p>ima条目：{image.file}</p><p>ima获取时间：{fallbackTime}</p></div>)}</details>}
      {pending.length>0&&<details className="result-details"><summary>待确认事项 · {pending.length} 项</summary><ul>{pending.map((q,i)=><li key={i}>{q.question}（{q.impact==='blocking'?'影响相关断言，正文需避开':'发布前确认'}）</li>)}</ul></details>}
    </>}
  </Section>;
}
