import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, X } from 'lucide-react';
import { useCompose } from '../compose.jsx';
import SourceText from './SourceText.jsx';
import './gallery.css';
import './knowledge.css';

export default function ProductDetails({product, editable=false, onClose}) {
  const c = useCompose(), dialog=useRef(null);
  const [data,setData]=useState(null), [selected,setSelected]=useState('');
  const [editing,setEditing]=useState(false), [draft,setDraft]=useState('');
  const [saving,setSaving]=useState(false), [error,setError]=useState(''), [notice,setNotice]=useState('');
  const [discard,setDiscard]=useState(false), [loading,setLoading]=useState(true);
  const doc=data?.documents.find(d=>d.id===selected);
  const dirty=editing && draft!==doc?.content;
  const close=()=>{ if (dirty) setDiscard(true); else onClose(); };
  useEffect(()=>{
    const element=dialog.current; element.showModal();
    const overflow=document.body.style.overflow; document.body.style.overflow='hidden';
    return ()=>{element.close(); document.body.style.overflow=overflow;};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    async function load() {
      try {
        const response=await fetch(`/api/products/details?productId=${encodeURIComponent(product.id)}`, {cache:'no-store',signal:controller.signal});
        const result=await response.json();
        if (!response.ok) throw new Error(result.error || '产品资料加载失败');
        setData(result); setSelected(result.documents[0]?.id || '');
      } catch (failure) { if (failure.name!=='AbortError') setError(failure.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load(); return ()=>controller.abort();
  },[product.id]);
  async function save() {
    setSaving(true); setError(''); setNotice('');
    try {
      const response=await fetch('/api/products/details',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({productId:product.id,documentId:doc.id,revision:doc.revision,content:draft})});
      const result=await response.json();
      if (!response.ok) throw new Error(result.error || '产品资料保存失败');
      setData(result); setEditing(false); setNotice('已保存到当前产品文件夹。产品参数与卖点资料请保持一致。');
      await c.refreshProducts();
    } catch (failure) {setError(failure.message);}
    finally {setSaving(false);}
  }
  return <dialog ref={dialog} className="gallery product-details" aria-labelledby="product-details-title"
    onCancel={event=>{event.preventDefault(); if (!saving) close();}}>
    <header className="gallery-head"><div><p>P1 产品资料</p><h2 id="product-details-title">{product.fullName}</h2></div>
      <button className="gallery-close" aria-label="关闭产品详情" disabled={saving} onClick={close}><X size={20}/></button>
    </header>
    <div className="product-details-body">
      <div className="detail-identity">
        {product.cover ? <img src={product.cover} alt={product.fullName}/> : <FileText size={40} aria-hidden="true"/>}
        <div><strong>{data?.product.dataStatus || product.dataStatus}</strong><p>{product.category}</p>
          <span>当前详情直接读取知识库文件</span></div>
      </div>
      {product.dataStatus!=='已有产品事实' && <p className="detail-caution">该条目尚无完整产品事实档案。以下仅展示现有发现资料、历史价格或款式记录，不推断缺失参数。</p>}
      {product.identityNote && <p className="detail-caution">{product.identityNote}</p>}
      {error && <p role="alert" className="product-error">{error}</p>}
      {notice && <p role="status" className="product-notice">{notice}</p>}
      {loading ? <p role="status">正在读取 P1 产品资料…</p> : data && <>
        {data.documents.length ? <>
          <label className="document-choice">资料原文<select aria-label="选择产品资料" value={selected} disabled={editing || saving}
            onChange={e=>{setSelected(e.target.value);setNotice('');setError('');}}>
            {data.documents.map(d=><option value={d.id} key={d.id}>{({'产品事实.md':'产品参数','卖点与限制.md':'卖点与限制','来源清单.csv':'资料来源','图片索引.csv':'图片索引'})[d.name] || d.name}{d.source.split('/').length>3?' · 商城款式图片':''}</option>)}
          </select></label>
          {doc && <><p className="source-path">P1-产品参数库 / {doc.source}</p>
            {doc.shared && <p className="detail-caution">这是多个产品共用的商城款式快照。编辑保存会同步影响引用这份原文的其他产品。</p>}
            {editing ? <label className="document-editor-label">编辑知识库原文<textarea className="document-editor" aria-label="产品资料原文" value={draft} disabled={saving}
              onChange={e=>setDraft(e.target.value)} spellCheck={false}/></label> : doc.kind==='table'
                ? <div className="source-table"><table><thead><tr>{Object.keys(doc.rows[0] || {}).map(key=><th key={key}>{key}</th>)}</tr></thead>
                  <tbody>{doc.rows.map((row,i)=><tr key={i}>{Object.entries(row).map(([key,value])=><td key={key}>{value}</td>)}</tr>)}</tbody></table>
                  {!doc.rows.length && <p>此清单暂无记录。</p>}</div>
                : <SourceText text={doc.content}/>}
          </>}
        </> : <p className="detail-caution">此条目暂未关联可展示的原文资料。</p>}
      </>}
    </div>
    <footer className="gallery-foot detail-footer">
      {discard ? <><p>有尚未保存的修改。</p><div className="gallery-actions"><button className="btn-ghost" onClick={()=>setDiscard(false)}>继续编辑</button><button className="btn-primary" onClick={onClose}>放弃修改并关闭</button></div></> : <>
        <p>{editing?'保存会同步修改 P1 对应文件，并保留修改前备份。':'参数、条件与来源以所展示的原文为准。'}</p>
        <div className="gallery-actions">
          {editing ? <><button className="btn-ghost" disabled={saving} onClick={()=>{setEditing(false);setError('');}}>取消编辑</button>
            <button className="btn-primary" disabled={saving || !draft.trim()} onClick={save}>{saving?'正在保存…':'保存到知识库'}</button></>
          : <><button className="btn-ghost" onClick={close}>关闭</button>
            {editable ? doc?.editable && <button className="btn-primary" onClick={()=>{setDraft(doc.content);setEditing(true);setNotice('');setError('');}}>编辑产品资料</button>
              : <Link className="btn-primary detail-manage" to={`/products?productId=${encodeURIComponent(product.id)}`} onClick={onClose}>前往产品管理</Link>}</>}
        </div>
      </>}
    </footer>
  </dialog>;
}
