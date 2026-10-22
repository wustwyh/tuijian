import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Images } from 'lucide-react';
import { useCompose } from '../compose.jsx';
import AddProduct from './AddProduct.jsx';
import ProductCover from './ProductCover.jsx';
import ProductGallery from './ProductGallery.jsx';
import ProductDetails from './ProductDetails.jsx';
import '../create.css';
import './gallery.css';

export default function Products() {
  const c = useCompose();
  const [category, setCategory] = useState('全部');
  const [adding,setAdding]=useState(false);
  const [gallery, setGallery] = useState(null);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useSearchParams();
  const detailProduct = c.products.find(p=>p.id === search.get('productId'));
  const categories = ['全部', ...new Set(c.products.map((p) => p.category))];
  const count = (name) => c.products.filter((p) => name === '全部' || p.category === name).length;
  const list = c.products.filter((p) => category === '全部' || p.category === category);

  return (
    <div className="products-page">
      <header className="page-head"><h1>产品管理</h1><p>查看并编辑 P1 产品原文、选择默认封面。保存后，产品资料与知识库保持一致。</p></header>
      <div className="manage-toolbar"><span className="muted">{c.products.length} 个产品 · 仅鸿蒙电脑与 Windows 笔记本</span><button className="btn-primary" onClick={()=>setAdding(true)}>＋ 添加产品</button></div>
      {notice && <p className="product-notice" role="status">{notice}</p>}
      {c.productsError && <p role="alert" className="hint product-error">{c.productsError} <button className="btn-ghost" onClick={c.refreshProducts}>重新加载</button></p>}
      {c.productsLoading ? <p role="status">正在加载产品库…</p> : <>
        <div className="filter" role="group" aria-label="按产品分类筛选">
          {categories.map((name) => <button key={name} className="chip" aria-pressed={name === category} onClick={() => setCategory(name)}>{name}<span className="chip-n">{count(name)}</span></button>)}
        </div>
        <div className="grid grid-product">
          {list.map((p) => <article className="product manager-card" key={p.id}>
            <ProductCover product={p} />
            <div className="product-body">
              <div className="tags">{p.tags.map((t) => <span key={t.text} className={`tag${t.solid ? ' is-solid' : ''}`}>{t.text}</span>)}</div>
              <h2 className="product-name">{p.series}</h2><p className="product-full">{p.fullName}</p>
              <p className="manager-meta">{p.dataStatus} · {p.imageCount} 张图片</p>
              {!p.imageCount && <p className="manager-meta">{p.imageStatus}</p>}
              <button className="product-cover-button product-detail-button" aria-label={`查看并管理 ${p.short} 的产品资料`}
                onClick={()=>setSearch({productId:p.id})}>查看 / 管理产品资料</button>
              <button className="product-cover-button" disabled={!p.imageCount} aria-label={`更换 ${p.short} 的默认封面`}
                onClick={() => { setNotice(''); setGallery(p); }}><Images size={16} aria-hidden="true" />{p.imageCount ? '更换默认封面' : '暂无可选图片'}</button>
            </div>
          </article>)}

        </div>
      </>}
      {adding && <AddProduct onClose={()=>setAdding(false)} onSaved={id=>{setAdding(false);setCategory('全部');setNotice('产品已保存到 P1 文件夹，产品库与封面已同步。');setSearch({productId:id});}}/>}
      {gallery && <ProductGallery key={gallery.id} product={gallery} onSave={c.saveCover}
        onClose={(saved) => { setGallery(null); if (saved) setNotice('默认封面已保存，营销图文中的产品卡片已同步更新。'); }} />}
      {detailProduct && <ProductDetails key={detailProduct.id} product={detailProduct} editable onClose={()=>setSearch({})} />}
    </div>
  );
}
