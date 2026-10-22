// 营销图文的选择状态：React Context + sessionStorage（刷新不丢，关标签页清空）
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { recommendFor } from './audiences.js';
import useMaterials from './useMaterials.js';

export const STEPS = [
  { key: 'product', no: 1, label: '产品', path: '/create/product' },
  { key: 'audience', no: 2, label: '客户', path: '/create/audience' },
  { key: 'platform', no: 3, label: '平台', path: '/create/platform' },
  { key: 'topic', no: 4, label: '选题与要求', path: '/create/topic' },
];

const KEY = 'tuijian_compose';
// audienceId 为 null 表示「不指定，让 AI 判断」
const EMPTY = {
  productId: null,
  audienceId: null,
  platformId: null,
  task: '选型号',
  format: '问题清单',
  topicIds: [],
  extra: '',
  materialIncludedIds:[],
  materialExcludedIds:[],
};

function load() {
  try {
    const old = JSON.parse(sessionStorage.getItem(KEY)) || {};
    return {...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).filter(k=>k in old).map(k=>[k,old[k]])),
      platformId: old.platformId === 'poster' ? 'store' : old.platformId || null,
      materialIncludedIds:Array.isArray(old.materialIncludedIds)?old.materialIncludedIds:[],
      materialExcludedIds:Array.isArray(old.materialExcludedIds)?old.materialExcludedIds:[],
      topicIds: Array.isArray(old.topicIds) ? old.topicIds : []};
  } catch {
    return EMPTY;
  }
}

const Ctx = createContext(null);

export function ComposeProvider({ children }) {
  const [state, setState] = useState(load);
  const [audiences,setAudiences]=useState([]), [audiencesError,setAudiencesError]=useState(''), [audiencesLoading,setAudiencesLoading]=useState(true);
  const refreshAudiences=useCallback(async()=>{
    try{const r=await fetch('/api/audiences',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error || '客户场景加载失败');
      setAudiences(data.audiences);setAudiencesError('');setState(s=>s.audienceId&&!data.audiences.some(a=>a.id===s.audienceId)?{...s,audienceId:null}:s);
    }catch(e){setAudiencesError(e.message);}finally{setAudiencesLoading(false);}
  },[]);
  useEffect(()=>{refreshAudiences();window.addEventListener('focus',refreshAudiences);return()=>window.removeEventListener('focus',refreshAudiences);},[refreshAudiences]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [options, setOptions] = useState({platforms:[], topics:[], tasks:[], formats:[]});
  const [optionsError, setOptionsError] = useState('');
  const [optionsLoading, setOptionsLoading] = useState(true);
  const refreshOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/compose-options', {cache:'no-store'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '平台和选题资料加载失败');
      setOptions(data); setOptionsError('');
    } catch (error) { setOptionsError(error.message); }
    finally { setOptionsLoading(false); }
  }, []);

  const refreshProducts = useCallback(async () => {
    try {
      const response = await fetch('/api/products', { cache: 'no-store' });
      if (!response.ok) throw new Error('产品库加载失败，请重试');
      const data = await response.json();
      if (!Array.isArray(data.products)) throw new Error('产品库返回异常，请重启服务后重试');
      setProducts(data.products);
      setState(s=>s.productId && !data.products.some(p=>p.id===s.productId) ? {...s,productId:null} : s);
      setProductsError('');
    } catch (error) {
      setProductsError(error.message);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const saveCover = useCallback(async (productId, imageId) => {
    const response = await fetch('/api/products/cover', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, imageId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '封面保存失败，请重试');
    setProducts(data.products);
    setProductsError('');
  }, []);

  useEffect(() => {
    refreshProducts();
    window.addEventListener('focus', refreshProducts);
    return () => window.removeEventListener('focus', refreshProducts);
  }, [refreshProducts]);
  useEffect(() => { refreshOptions(); }, [refreshOptions]);

  useEffect(() => {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(() => {
    const set = (patch) => setState((s) => ({ ...s, ...patch }));
    const product = products.find((p) => p.id === state.productId) || null;
    const recommendations=product?recommendFor(product,audiences):[];
    const audienceAuto=state.audienceId===null;
    const audience=audienceAuto ? recommendations[0] || null : audiences.find(a=>a.id===state.audienceId) || null;
    const platform = options.platforms.find((p) => p.id === state.platformId) || null;
    const topics = state.topicIds.map((id) => options.topics.find((s) => s.id === id)).filter(Boolean);
    const task = options.tasks.includes(state.task) ? state.task : options.tasks[0];
    const format = options.formats.includes(state.format) ? state.format : options.formats[0];

    return {
      state,
      products,
      audiences,audiencesError,audiencesLoading,refreshAudiences,recommendations,audienceAuto,
      productsLoading,
      productsError,
      refreshProducts,
      saveCover,
      ...options, optionsError, optionsLoading, refreshOptions,
      set,
      product,
      audience,
      platform,
      task, format, purpose: task && format ? `${task} · ${format}` : '',
      selectedTopics: topics,
      topicNames: topics.map(t=>t.name),
      extra: state.extra.trim(),
      canGenerate: Boolean(product && audience && platform && task && format && !optionsError && !audiencesError),
      selectPlatform: (pf) => set({platformId:pf.id}),
      toggleTopic: (id) =>
        setState((s) => ({
          ...s,
          topicIds: s.topicIds.includes(id) ? s.topicIds.filter((x) => x !== id) : [...s.topicIds, id],
        })),
    };
  }, [state, audiences,audiencesError,audiencesLoading,refreshAudiences, products, productsLoading, productsError, refreshProducts, saveCover, options, optionsError, optionsLoading, refreshOptions]);

  const materials=useMaterials(state,setState);
  return <Ctx.Provider value={{...value,...materials}}>{children}</Ctx.Provider>;
}

export const useCompose = () => useContext(Ctx);
