import {useState} from 'react';
import {useCompose} from '../compose.jsx';
import ManagementDialog from './ManagementDialog.jsx';
export default function AudienceForm({audience,onClose,onSaved}){
  const c=useCompose();
  const [draft,setDraft]=useState({name:audience?.name||'',who:audience?.who||'',tasks:audience?.tasks||'',pains:audience?.pain_points.join('\n')||'',revision:audience?.revision});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(e){e.preventDefault();setBusy(true);setError('');
    try{const r=await fetch('/api/audiences'+(audience?`?id=${encodeURIComponent(audience.id)}`:''),{method:audience?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});const data=await r.json();if(!r.ok)throw new Error(data.error);await c.refreshAudiences();onSaved(data.audience);}
    catch(e){setError(e.message);}finally{setBusy(false);}}
  const fields=[['name','场景名称','例如：出差频繁的区域销售经理'],['who','客户描述','描述客户角色、工作环境和使用范围'],['tasks','典型任务','列出真实工作任务和需要的软件、外设'],['pains','典型痛点','每行一个痛点，尽量具体']];
  return <ManagementDialog title={audience?'编辑客户场景':'添加客户场景'} eyebrow="P8 自建客户资料" busy={busy} onClose={onClose}>
    <form onSubmit={save}><fieldset disabled={busy} className="manage-body manage-fields"><p className="manage-note">保存后所有人均可使用、修改和删除此场景。默认资料保持只读。</p>
      {fields.map(([key,label,placeholder])=><label className="manage-field" key={key}>{label}{key==='name'?<input required maxLength={80} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})} placeholder={placeholder}/>:<textarea required rows={key==='who'?3:4} maxLength={20000} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})} placeholder={placeholder}/>}</label>)}
      {error&&<p role="alert" className="product-error">{error}</p>}</fieldset><footer className="gallery-foot"><div><button type="button" className="btn-ghost" disabled={busy} onClick={onClose}>取消</button><button className="btn-primary" disabled={busy}>{busy?'正在保存…':'保存客户场景'}</button></div></footer></form>
  </ManagementDialog>;
}
