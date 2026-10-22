import {useState} from 'react';
import {Pencil,Save,X,Plus,Trash2} from 'lucide-react';
import './article-editor.css';

export default function ArticleEditor({job,onSaved,onEditing}){
  const [draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const article=job.result.article;
  const images=job.input.images||job.input.product?.images||[];
  const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
  function begin(){setDraft(structuredClone(article));setError('');onEditing(true);}
  function cancel(){setDraft(null);setError('');onEditing(false);}
  function imageChange(index,key,value){setDraft(d=>({...d,image_plan:d.image_plan.map((im,i)=>i===index?{...im,[key]:value}:im)}));}
  async function save(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{const r=await fetch(`/api/generations/${job.id}/article`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:job.result.editorial?.revision||0,article:draft})});const data=await r.json();if(!r.ok)throw new Error(data.error||'保存失败');onSaved(data);setDraft(null);onEditing(false);}catch(e){setError(e.message||'保存失败，请重试');}finally{setBusy(false);}}
  if(!draft)return <div className="article-edit-entry"><button type="button" className="btn-ghost" onClick={begin}><Pencil size={16}/>修改</button></div>;
  return <form className="article-editor" onSubmit={save}><div className="article-editor-heading"><div><h3>微调图文</h3><p>保存后可在下方预览；修改内容需要重新审核。</p></div></div>
    <label>标题<input value={draft.title} maxLength={500} required onChange={e=>set('title',e.target.value)}/></label>
    <label>开头<textarea rows={3} value={draft.lead} maxLength={6000} onChange={e=>set('lead',e.target.value)}/></label>
    <label>正文<textarea className="article-body-input" rows={16} value={draft.body} maxLength={60000} required onChange={e=>set('body',e.target.value)}/></label>
    <label>结尾与行动引导<textarea rows={3} value={draft.cta} maxLength={3000} onChange={e=>set('cta',e.target.value)}/></label>
    <label>话题标签（用空格分隔）<input value={draft.tags.join(' ')} onChange={e=>set('tags',e.target.value.split(/\s+/).filter(Boolean))}/></label>
    <div className="article-editor-heading"><h3>配图与图片文案</h3><button type="button" className="btn-ghost" disabled={draft.image_plan.length>=12||images.every(im=>draft.image_plan.some(p=>p.image_id===im.id))} onClick={()=>{const im=images.find(im=>!draft.image_plan.some(p=>p.image_id===im.id));if(im)set('image_plan',[...draft.image_plan,{...im,image_id:im.id,caption:'',position:'正文后',purpose:'产品展示'}]);}}><Plus size={16}/>添加配图</button></div>
    {draft.image_plan.map((image,index)=><div className="article-image-editor" key={index}><img src={images.find(im=>im.id===image.image_id)?.url||image.url} alt={`配图 ${index+1}`}/><div><label>配图 {index+1}<select value={image.image_id} onChange={e=>imageChange(index,'image_id',e.target.value)}>{images.filter(im=>im.id===image.image_id||!draft.image_plan.some(p=>p.image_id===im.id)).map(im=><option key={im.id} value={im.id}>{im.file}</option>)}</select></label><label>图片文案<textarea rows={2} maxLength={2000} value={image.caption} onChange={e=>imageChange(index,'caption',e.target.value)}/></label><label>插入位置<input maxLength={500} value={image.position} onChange={e=>imageChange(index,'position',e.target.value)}/></label><label>配图用途<input maxLength={500} value={image.purpose} onChange={e=>imageChange(index,'purpose',e.target.value)}/></label><button type="button" className="btn-ghost" onClick={()=>set('image_plan',draft.image_plan.filter((_,i)=>i!==index))}><Trash2 size={15}/>移除这张</button></div></div>)}
    {error&&<p role="alert" className="product-error">{error}</p>}<div className="article-editor-actions"><button type="button" className="btn-ghost" disabled={busy} onClick={cancel}><X size={16}/>取消修改</button><button type="submit" className="btn-primary" disabled={busy}><Save size={16}/>{busy?'保存中…':'保存并预览'}</button></div>
  </form>;
}
