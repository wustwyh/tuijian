import {useState} from 'react';
import {BookOpen,Plus} from 'lucide-react';
import {useCompose} from '../compose.jsx';
import MaterialDialog from './MaterialDialog.jsx';
import './materials.css';
export default function Materials(){
  const c=useCompose(),[category,setCategory]=useState('全部'),[query,setQuery]=useState(''),[page,setPage]=useState(1),[modal,setModal]=useState(null),[notice,setNotice]=useState('');
  const list=c.materials.filter(m=>(category==='全部'||m.category===category)&&`${m.name} ${m.source}`.toLowerCase().includes(query.trim().toLowerCase())),pages=Math.max(1,Math.ceil(list.length/18)),current=Math.min(page,pages);
  return <div><header className="page-head"><h1>素材管理</h1><p>整理沟通方法、验证步骤与写作参考，让每次创作都有合适的素材。</p></header>
    <div className="manage-toolbar"><label className="material-search">查找素材<input type="search" placeholder="名称或文件路径" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/></label><button className="btn-primary" onClick={()=>setModal({create:true})}><Plus size={18}/>添加素材</button></div>
    <div className="filter">{['全部','P2','P5','P6'].map(group=><button key={group} className="chip" aria-pressed={category===group} onClick={()=>{setCategory(group);setPage(1);}}>{({全部:'全部',P2:'卖点话术',P5:'培训方法',P6:'营销素材'})[group]}<span className="chip-n">{c.materials.filter(m=>group==='全部'||m.category===group).length}</span></button>)}</div>
    <p className="knowledge-note">生成时会按产品、客户、平台和选题自动关联；你也可以在“选题与要求”里自行调整。</p>
    {notice&&<p role="status" className="product-notice">{notice}</p>}{c.materialsError&&<p role="alert" className="product-error">{c.materialsError}<button className="btn-ghost" onClick={c.refreshMaterials}>重新加载</button></p>}
    {c.materialsLoading?<p role="status">正在读取素材库…</p>:<><div className="material-grid">{list.slice((current-1)*18,current*18).map(m=><article className={`material-card${m.enabled?'':' is-disabled'}`} key={m.id}>
      <div className="material-card-top"><BookOpen size={20}/><span>{m.category} · {m.kind}</span><span className="material-status">{m.enabled?'启用':'停用'}</span></div><h2>{m.name}</h2><p className="material-source">{m.source}</p>
      <p className="material-meta">{m.productIds.length?`关联 ${m.productIds.length} 个产品`:'不限产品'} · {m.platformIds.length?`关联 ${m.platformIds.length} 个平台`:'不限平台'} · {m.characters.toLocaleString()} 字符</p>
      <button className="product-cover-button" onClick={()=>setModal({materialId:m.id})}>查看 / 管理素材</button></article>)}</div>
      <div className="material-pagination"><button className="btn-ghost" disabled={current<=1} onClick={()=>setPage(current-1)}>上一页</button><span>第 {current} / {pages} 页，共 {list.length} 份素材</span><button className="btn-ghost" disabled={current>=pages} onClick={()=>setPage(current+1)}>下一页</button></div></>}
    {modal&&<MaterialDialog {...modal} onClose={()=>setModal(null)} onSaved={()=>setNotice('素材已保存到知识库，原文与关联关系已同步。')}/>}
  </div>;
}
