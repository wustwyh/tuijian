import {useCallback,useEffect,useMemo,useState} from 'react';
export default function useMaterials(state,setState){
  const [materials,setMaterials]=useState([]),[materialsLoading,setLoading]=useState(true),[materialsError,setError]=useState('');
  const [report,setReport]=useState({recommendations:[],incompatibleIds:[]}),[recommendLoading,setRecommendLoading]=useState(false),[recommendError,setRecommendError]=useState('');
  const refreshMaterials=useCallback(async()=>{try{const r=await fetch('/api/materials',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'素材加载失败');setMaterials(d.materials);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}},[]);
  useEffect(()=>{refreshMaterials();window.addEventListener('focus',refreshMaterials);return()=>window.removeEventListener('focus',refreshMaterials);},[refreshMaterials]);
  const signature=JSON.stringify({productId:state.productId,audienceId:state.audienceId,platformId:state.platformId,task:state.task,topicIds:state.topicIds});
  useEffect(()=>{if(materialsLoading)return;const controller=new AbortController();setRecommendLoading(true);setReport({recommendations:[],incompatibleIds:[]});
    fetch('/api/materials/recommend',{method:'POST',headers:{'Content-Type':'application/json'},body:signature,signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'自动关联失败');setReport(d);setRecommendError('');}).catch(e=>{if(e.name!=='AbortError')setRecommendError(e.message);}).finally(()=>{if(!controller.signal.aborted)setRecommendLoading(false);});return()=>controller.abort();
  },[signature,materials,materialsLoading]);
  const materialIncludedIds=state.materialIncludedIds||[];
  const selectedMaterials=useMemo(()=>{const ids=new Set(materialIncludedIds);return materials.filter(m=>m.enabled&&ids.has(m.id));},[materials,materialIncludedIds]);
  const toggleMaterial=id=>setState(s=>({...s,materialIncludedIds:(s.materialIncludedIds||[]).includes(id)?(s.materialIncludedIds||[]).filter(x=>x!==id):[...new Set([...(s.materialIncludedIds||[]),id])]}));
  const adoptRecommendations=()=>setState(s=>({...s,materialIncludedIds:[...new Set(report.recommendations.map(m=>m.id))],materialExcludedIds:[]}));
  return {materials,materialsLoading,materialsError,refreshMaterials,selectedMaterials,toggleMaterial,adoptRecommendations,materialRecommendations:report.recommendations,incompatibleMaterialIds:report.incompatibleIds,recommendLoading,recommendError,resetMaterials:()=>setState(s=>({...s,materialIncludedIds:[],materialExcludedIds:[]}))};
}
