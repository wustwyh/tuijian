import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useCompose} from '../compose.jsx';
import MaterialDialog from './MaterialDialog.jsx';
import './materials.css';
export default function MaterialSelection(){
  const c=useCompose(),[details,setDetails]=useState(null),[group,setGroup]=useState('P6'),[query,setQuery]=useState(''),[page,setPage]=useState(1);
  const selected=new Set(c.selectedMaterials.map(m=>m.id)),recommended=new Map(c.materialRecommendations.map(r=>[r.id,r])),manual=new Set(c.state.materialIncludedIds||[]);
  const list=c.materials.filter(m=>m.enabled&&(group==='全部'||m.category===group)&&`${m.name} ${m.source}`.toLowerCase().includes(query.trim().toLowerCase()));
  const pages=Math.max(1,Math.ceil(list.length/12)),current=Math.min(page,pages);
  const render=m=><div className={`material-choice${selected.has(m.id)?' is-selected':''}`} key={m.id}><label><input type="checkbox" checked={selected.has(m.id)} disabled={!selected.has(m.id)&&selected.size>=16} onChange={()=>c.toggleMaterial(m.id)}/><span><strong>{m.name}</strong><small>{m.category} · {m.kind}</small><span className="material-reason">{manual.has(m.id)?'手动选择':recommended.get(m.id)?.reasons.join(' · ')||'可手动补选'}</span>{c.incompatibleMaterialIds.includes(m.id)&&<em>与当前卡片关联不匹配，请确认是否使用</em>}</span></label><button className="btn-text" onClick={()=>setDetails(m.id)}>原文</button></div>;
  const unavailable=(c.state.materialIncludedIds||[]).filter(id=>!c.materials.some(m=>m.id===id&&m.enabled));
  return <section className="block material-selection"><div className="block-head"><h2>本次使用素材</h2><span className="muted">已选 {selected.size} / 16 份</span></div>
    <p className="knowledge-note">下面是为你推荐的参考素材，勾选后才会用于本次创作。</p>
    {(c.materialsError||c.recommendError)&&<p role="alert" className="product-error">{c.materialsError||c.recommendError}<button className="btn-ghost" onClick={c.refreshMaterials}>重新加载</button></p>}
    {c.recommendLoading||c.materialsLoading?<p role="status">正在关联相关素材…</p>:<div className="material-choice-grid">{[...new Set([...c.materialRecommendations.map(r=>r.id),...c.selectedMaterials.map(m=>m.id)])].map(id=>c.materials.find(m=>m.id===id)).filter(Boolean).map(render)}</div>}
    {!!unavailable.length&&<p className="detail-caution">有 {unavailable.length} 份手选素材已停用或移除，不会用于本次生成。</p>}
    <div className="material-selection-actions"><button className="btn-ghost" onClick={c.adoptRecommendations} disabled={!c.materialRecommendations.length}>采用推荐（{c.materialRecommendations.length}份）</button><button className="btn-ghost" onClick={c.resetMaterials}>清空已选</button><Link to="/materials">管理素材库</Link></div>
    <details className="material-picker"><summary>添加其他素材</summary><div className="material-picker-tools"><div className="filter">{['全部','P2','P5','P6'].map(g=><button className="chip" key={g} aria-pressed={group===g} onClick={()=>{setGroup(g);setPage(1);}}>{g}</button>)}</div><label>查找素材<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}} placeholder="素材名称或文件路径"/></label></div><div className="material-choice-grid">{list.slice((current-1)*12,current*12).map(render)}</div><div className="material-pagination"><button className="btn-ghost" disabled={current===1} onClick={()=>setPage(current-1)}>上一页</button><span>{current} / {pages}</span><button className="btn-ghost" disabled={current===pages} onClick={()=>setPage(current+1)}>下一页</button></div></details>
    {details&&<MaterialDialog materialId={details} onClose={()=>setDetails(null)}/>}
  </section>;
}
