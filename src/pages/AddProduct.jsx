import {useState} from 'react';
import {useCompose} from '../compose.jsx';
import ManagementDialog from './ManagementDialog.jsx';
const readFile=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({name:file.name,data:r.result});r.onerror=()=>reject(new Error('图片读取失败，请重新选择'));r.readAsDataURL(file);});
export default function AddProduct({onClose,onSaved}){
  const c=useCompose(),[draft,setDraft]=useState({name:'',category:'01-鸿蒙电脑',facts:'',selling:'',sourceUrl:''}),[images,setImages]=useState([]),[coverIndex,setCoverIndex]=useState(0),[busy,setBusy]=useState(false),[reading,setReading]=useState(false),[error,setError]=useState('');
  async function upload(e){const files=[...e.target.files];setError('');setReading(true);setImages([]);setCoverIndex(0);
    try{if(files.length>8||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>3*1024*1024)||files.reduce((s,f)=>s+f.size,0)>12*1024*1024)throw new Error('请选择最多8张 PNG、JPEG 或 WebP，每张不超过3MB，总计不超过12MB');setImages(await Promise.all(files.map(readFile)));}
    catch(e){setError(e.message);}finally{setReading(false);}}
  async function save(e){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,images,coverIndex})});const data=await r.json();if(!r.ok)throw new Error(data.error);await c.refreshProducts();onSaved(data.productId);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <ManagementDialog title="添加产品" eyebrow="建立 P1 产品档案" busy={busy||reading} onClose={onClose}>
    <form onSubmit={save}><fieldset disabled={busy||reading} className="manage-body manage-fields"><p className="manage-note">按实际资料填写，保存后进入产品库，并写入所选类型的独立产品文件夹。未确认的参数请明确标注。</p>
      <label className="manage-field">产品名称<input required maxLength={80} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="完整产品型号，请与资料保持一致"/></label>
      <label className="manage-field">产品分类<select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}><option value="01-鸿蒙电脑">鸿蒙电脑</option><option value="02-MateBook-Windows">Windows 笔记本</option></select></label>
      <label className="manage-field">产品参数<textarea required rows={7} maxLength={80000} value={draft.facts} onChange={e=>setDraft({...draft,facts:e.target.value})} placeholder="填写产品事实、配置差异、参数及适用条件。支持 Markdown。"/></label>
      <label className="manage-field">卖点与限制<textarea required rows={5} maxLength={80000} value={draft.selling} onChange={e=>setDraft({...draft,selling:e.target.value})} placeholder="填写已确认卖点、使用边界和需要核验的事项。支持 Markdown。"/></label>
      <label className="manage-field">资料来源链接<input required type="url" maxLength={2000} value={draft.sourceUrl} onChange={e=>setDraft({...draft,sourceUrl:e.target.value})} placeholder="https://consumer.huawei.com/…"/></label>
      <label className="manage-field">产品图片<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={upload}/><small>最多8张，每张不超过3MB，总计不超过12MB。点击预览选择默认封面。</small></label>
      {!!images.length&&<div className="manage-image-grid" role="group" aria-label="选择默认封面">{images.map((im,i)=><label className={`manage-image${i===coverIndex?' is-selected':''}`} key={i}><img src={im.data} alt={im.name}/><span><input type="radio" name="cover" value={i} checked={i===coverIndex} onChange={()=>setCoverIndex(i)}/>{i===coverIndex?'默认封面':`图片 ${i+1}`}</span></label>)}</div>}
      {reading&&<p role="status">正在读取图片…</p>}{error&&<p role="alert" className="product-error">{error}</p>}</fieldset><footer className="gallery-foot"><div><button type="button" className="btn-ghost" disabled={busy||reading} onClick={onClose}>取消</button><button className="btn-primary" disabled={busy||reading||!images.length}>{busy?'正在建立档案…':'保存产品'}</button></div></footer></form>
  </ManagementDialog>;
}
