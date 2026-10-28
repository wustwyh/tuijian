import {useEffect,useState} from 'react';
import {useCompose} from '../compose.jsx';
import ManagementDialog from './ManagementDialog.jsx';
import SourceText from './SourceText.jsx';
import './materials.css';
export default function MaterialDialog({materialId,create=false,onClose,onSaved}){
  const c=useCompose(),[data,setData]=useState(null),[editing,setEditing]=useState(create),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [draft,setDraft]=useState({name:'',content:'',category:'P6',enabled:true,productIds:[],audienceIds:[],platformIds:[],tasks:[],topicIds:[]});
  useEffect(()=>{if(create)return;const controller=new AbortController();fetch(`/api/materials/details?id=${encodeURIComponent(materialId)}`,{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);setDraft({...d.material,content:d.content});}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[materialId,create]);
  async function save(e){e.preventDefault();setError('');setBusy(true);try{const r=await fetch('/api/materials'+(create?'':`?id=${encodeURIComponent(materialId)}`),{method:create?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});const d=await r.json();if(!r.ok)throw new Error(d.error);await Promise.all([c.refreshMaterials(),c.refreshOptions()]);onSaved?.();onClose();}catch(e){setError(e.message);}finally{setBusy(false);}}
  const groups=[['productIds','关联产品',c.products.map(p=>[p.id,p.short])],['audienceIds','关联客户场景',c.audiences.map(a=>[a.id,a.name])],['platformIds','关联平台',c.platforms.map(p=>[p.id,p.name])],['tasks','关联任务',c.tasks.map(t=>[t,t])],['topicIds','关联选题',c.topics.map(t=>[t.id,t.name])]];
  const ready=create||data;
  return <ManagementDialog title={create?'添加素材':data?.material.name||'查看素材'} eyebrow="素材原文与卡片关联" busy={busy} onClose={onClose}>
    {!ready?<div className="manage-body">{error?<p role="alert" className="product-error">{error}</p>:<p role="status">正在读取素材…</p>}</div>:editing?<form onSubmit={save}><fieldset disabled={busy} className="manage-body manage-fields">
      <p className="manage-note">原文保存到知识库文件。关联选项留空表示不限制该项；停用后不再提供给生成任务。</p>
      <label className="manage-field">素材名称<input required maxLength={120} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      {create&&<label className="manage-field">所属资料库<select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}><option value="P2">P2 卖点话术库</option><option value="P5">P5 培训赋能库</option><option value="P6">P6 营销素材库</option></select></label>}
      <label className="manage-field">素材原文<textarea required rows={12} maxLength={250000} value={draft.content} onChange={e=>setDraft({...draft,content:e.target.value})} placeholder="填写或粘贴 Markdown / 纯文本内容"/></label>
      {create&&<label className="manage-field">从文本文件导入<input type="file" accept=".md,.txt,text/plain,text/markdown" onChange={async e=>{const file=e.target.files[0];if(!file)return;if(file.size>750000){setError('文件过大，请控制在25万字以内');return;}const text=await file.text();setDraft(d=>({...d,content:text,name:d.name||file.name.replace(/\.(md|txt)$/i,'')}));}}/></label>}
      <div className="material-associations">{groups.map(([key,label,items])=><details key={key}><summary>{label}<span>{draft[key].length?`已选 ${draft[key].length} 项`:'不限制'}</span></summary><div className="material-checks">{items.map(([id,name])=><label key={id}><input type="checkbox" checked={draft[key].includes(id)} onChange={e=>setDraft({...draft,[key]:e.target.checked?[...draft[key],id]:draft[key].filter(x=>x!==id)})}/>{name}</label>)}</div></details>)}</div>
      <label className="material-enabled"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>启用素材，可参与选择与自动关联</label>
      {error&&<p role="alert" className="product-error">{error}</p>}</fieldset><footer className="gallery-foot"><div><button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>取消</button><button className="btn-primary" disabled={busy}>{busy?'正在保存…':'保存素材'}</button></div></footer></form>:<>
      <div className="manage-body"><div className="material-tags"><span className="tag">{data.material.category}</span><span className="tag">{data.material.kind}</span><span className="tag">{data.material.enabled?'已启用':'已停用'}</span></div><p className="document-source">{data.material.source}</p><p className="manage-note">参考素材用于表达与结构，产品事实仍需引用 P1 / P7。</p><SourceText text={data.content}/></div>
      <footer className="gallery-foot"><div><button className="btn-ghost" onClick={onClose}>关闭</button><button className="btn-primary" onClick={()=>setEditing(true)}>编辑原文与关联</button></div></footer></>}
  </ManagementDialog>;
}
