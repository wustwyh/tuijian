import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useCompose } from '../compose.jsx';
import ProductDetails from './ProductDetails.jsx';
import AudienceDetails from './AudienceDetails.jsx';

// 已选产品打开 P1 详情，其他行返回对应选择步骤。
export default function ComposeSheet() {
  const c = useCompose();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [details, setDetails] = useState(false);
  const [expanded,setExpanded]=useState(false);
  useEffect(() => { setExpanded(false); }, [pathname]);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function generate(){if(busy)return;setBusy(true);setError('');try{const r=await fetch('/api/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:c.product.id,audienceId:c.state.audienceId,platformId:c.platform.id,task:c.task,format:c.format,topicIds:c.selectedTopics.map(t=>t.id),topicLabels:c.topicLabels,hotTopics:c.hotTopics,extra:c.extra,materialIds:c.selectedMaterials.map(m=>m.id)})});const d=await r.json();if(!r.ok)throw new Error(d.error||'生成未能开始');navigate(`/result/${d.id}`);}catch(e){setError(e.message);}finally{setBusy(false);}}

  const rows = [
    { label: '产品', path: '/create/product', value: c.product?.short, required: true, thumb: c.product?.cover },
    { label: '客户', path: '/create/audience', value: c.audience ? `${c.audience.name}${c.audienceAuto?'（AI 判断）':''}` : null, fallback: '不指定，AI 判断', ai: true },
    { label: '平台', path: '/create/platform', value: c.platform?.name, required: true },
    { label: '选题', path: '/create/topic', value: c.topicNames.join('、'), fallback: '不限' },
    { label: '借势热点', path: '/create/topic', value: c.hotTopics.map(t=>t.title).join('、'), fallback: '没用热点' },
    { label: '素材', path:'/create/topic',value:c.recommendLoading?'正在关联…':`${c.selectedMaterials.length} 份参考素材` },
    { label: '提需求', path: '/create/discovery', value: c.extra, fallback: '还没写', ai: true },
  ];

  const missing = rows.filter((r) => r.required && !r.value).map((r) => r.label);

  return (
    <aside className={`sheet${expanded?' is-expanded':''}`} aria-label="本次组合">
      <div className="sheet-head">
        <h2>本次组合</h2>
        <button type="button" className="mobile-sheet-toggle" aria-expanded={expanded} aria-controls="compose-sheet-content" onClick={()=>setExpanded(value=>!value)}>
          <span>{expanded?'收起组合':'查看组合并生成'}</span>{expanded?<ChevronDown size={18}/>:<ChevronUp size={18}/>}
        </button>
      </div>
      <div id="compose-sheet-content" className="sheet-content">
      <ul className="sheet-rows">
        {rows.map((r) => {
          let text = r.value;
          let cls = 'sheet-val';
          if (!text) {
            text = r.required ? '未选' : r.fallback;
            cls += r.ai ? ' inferred' : ' is-empty';
          }
          const detailRow = (r.label === '产品' && c.product) || (r.label==='客户'&&c.audience);
          const Control = detailRow ? 'button' : Link;
          return (
            <li key={r.label}>
              <Control {...(detailRow ? {type:'button',onClick:()=>setDetails(r.label),title:`查看${r.label}详细资料`} : {to:r.path})}
                  className={`sheet-row${pathname === r.path ? ' active' : ''}`}>
                <span className="sheet-label">{r.label}</span>
                <span className="sheet-value">
                  {r.thumb && r.value && <img src={r.thumb} alt="" className="sheet-thumb" />}
                  <span className={cls}>{text}</span>
                  {detailRow && <small className="sheet-detail-hint">查看详情</small>}
                </span>
              </Control>
            </li>
          );
        })}
      </ul>

      <div className="sheet-foot">
        {error&&<p role="alert" className="product-error">{error}</p>}
        <p className="sheet-hint">
          {missing.length
            ? `还差${missing.join('和')}，选好就能生成`
            : c.selectedMaterials.length>16?'参考素材超过16份，请减少后生成':'按当前卡片与素材生成，结果将保存到历史记录'}
        </p>
        <button
          type="button"
          className="btn-primary btn-block"
          disabled={!c.canGenerate||busy||c.materialsLoading||c.recommendLoading||Boolean(c.materialsError||c.recommendError)||c.selectedMaterials.length>16}
          onClick={generate}
        >
          {busy?'正在准备资料…':'生成图文'}
        </button>
      </div>
      </div>
      {details==='产品' && c.product && <ProductDetails key={c.product.id} product={c.product} onClose={()=>setDetails(false)} />}
      {details==='客户'&&c.audience&&<AudienceDetails key={c.audience.id} audience={c.audience} onClose={()=>setDetails(false)}/>}
    </aside>
  );
}
