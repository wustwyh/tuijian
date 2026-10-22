import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import ManagementDialog from './ManagementDialog.jsx';
import SourceText from './SourceText.jsx';
import './knowledge.css';
export default function AudienceDetails({audience,onClose,onEdit}){
  const [data,setData]=useState(null),[error,setError]=useState(''),[index,setIndex]=useState(0);
  useEffect(()=>{const abort=new AbortController();
    fetch(`/api/audiences/details?id=${encodeURIComponent(audience.id)}`,{cache:'no-store',signal:abort.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});
    return()=>abort.abort();},[audience.id]);
  const doc=data?.documents[index];
  return <ManagementDialog title={audience.name} eyebrow="P8 客户场景资料" onClose={onClose}>
    <div className="manage-body"><p className="manage-note">{audience.builtin?'默认场景 · 原文只读，不允许编辑或删除':'自建场景 · 所有人可编辑和删除'}</p>
      {error&&<p role="alert" className="product-error">{error}</p>}{!data&&!error&&<p role="status">正在读取 P8 客户资料…</p>}
      {data&&<><label className="manage-field">资料文档<select value={index} onChange={e=>setIndex(Number(e.target.value))}>{data.documents.map((d,i)=><option key={d.source} value={i}>{d.name}</option>)}</select></label>
      {doc&&<><p className="document-source">{doc.source}</p><SourceText text={doc.content}/></>}</>}
    </div><footer className="gallery-foot"><div>{!audience.builtin&&onEdit?<button className="btn-primary" onClick={onEdit}>编辑客户场景</button>:<Link className="btn-ghost" to="/audiences" onClick={onClose}>前往客户管理</Link>}<button className="btn-ghost" onClick={onClose}>关闭</button></div></footer>
  </ManagementDialog>;
}
