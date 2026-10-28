import {useState} from 'react';
import {Plus,Users} from 'lucide-react';
import {useCompose} from '../compose.jsx';
import AudienceDetails from './AudienceDetails.jsx';
import AudienceForm from './AudienceForm.jsx';
import '../create.css';
import './management.css';
export default function Audiences(){
  const c=useCompose(),[group,setGroup]=useState('全部'),[modal,setModal]=useState(null),[deleting,setDeleting]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const list=c.audiences.filter(a=>group==='全部'||a.group===group);
  async function remove(a){setBusy(true);setError('');try{const r=await fetch(`/api/audiences?id=${encodeURIComponent(a.id)}`,{method:'DELETE'});const data=await r.json();if(!r.ok)throw new Error(data.error);await c.refreshAudiences();setDeleting(null);setNotice('自建场景已删除。');}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div><header className="page-head"><h1>客户管理</h1><p>连接 P8 客户场景库，查看原始资料，管理大家共同使用的自建场景。</p></header>
    <div className="manage-toolbar"><span className="muted">默认场景只读 · 自建场景共同管理</span><button className="btn-primary" onClick={()=>setModal({kind:'add'})}><Plus size={18}/>添加客户场景</button></div>
    <div className="filter">{['全部','通用场景','行业与岗位','自建场景'].map(g=><button className="chip" key={g} aria-pressed={g===group} onClick={()=>setGroup(g)}>{g}<span className="chip-n">{c.audiences.filter(a=>g==='全部'||a.group===g).length}</span></button>)}</div>
    {(error||c.audiencesError)&&<p role="alert" className="product-error">{error||c.audiencesError}<button className="btn-ghost" onClick={c.refreshAudiences}>重新加载</button></p>}{notice&&<p role="status" className="product-notice">{notice}</p>}
    {c.audiencesLoading?<p role="status">正在读取客户场景库…</p>:<div className="grid grid-aud">{list.map(a=><article className="aud audience-manager" key={a.id}><div className="manage-card-heading"><Users size={20}/><span className="tag">{a.builtin?'默认 · 只读':'自建'}</span></div><h2 className="aud-name">{a.name}</h2><p className="aud-who">{a.who}</p><p className="manager-meta">{a.group} · {a.sources.length} 份原始资料</p><div className="manage-actions"><button className="product-cover-button" onClick={()=>setModal({kind:'view',audience:a})}>查看客户资料</button>{!a.builtin&&<><button className="btn-ghost" onClick={()=>setModal({kind:'edit',audience:a})}>编辑</button><button className="btn-text" onClick={()=>setDeleting(a.id)}>删除</button></>}</div>{deleting===a.id&&<div className="manage-delete"><p>删除“{a.name}”？所有人都将无法再选择它。</p><button className="btn-ghost" disabled={busy} onClick={()=>setDeleting(null)}>取消</button><button className="btn-primary" disabled={busy} onClick={()=>remove(a)}>{busy?'正在删除…':'确认删除'}</button></div>}</article>)}</div>}
    {!c.audiencesLoading&&!list.length&&<p className="hint">暂无匹配场景，可以添加一个。</p>}
    {modal?.kind==='view'&&<AudienceDetails audience={modal.audience} onClose={()=>setModal(null)} onEdit={()=>setModal({...modal,kind:'edit'})}/>}
    {['add','edit'].includes(modal?.kind)&&<AudienceForm audience={modal.audience} onClose={()=>setModal(null)} onSaved={()=>{setModal(null);setNotice('客户场景已保存，选择页面已同步。');}}/>}
  </div>;
}
