import { useState } from 'react';
import { useCompose } from '../compose.jsx';
import { CheckMark, StepHead } from './parts.jsx';
import ProductCover from './ProductCover.jsx';
import './gallery.css';

const ALL = '全部';

// ① 选产品：读取共享产品库；封面维护位于独立的产品管理页。
export default function CreateProduct() {
  const c = useCompose();
  const [cat, setCat] = useState(ALL);
  const PRODUCTS = c.products;
  const CATEGORIES = [...new Set(PRODUCTS.map((p) => p.category))];
  const list = cat === ALL ? PRODUCTS : PRODUCTS.filter((p) => p.category === cat);
  const count = (name) => (name === ALL ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === name).length);

  return (
    <>
      <StepHead
        no={1}
        title="选择产品"
        desc="选择这次要推荐的产品，注意区分型号和版本。"
      />

      {c.productsError && <p role="alert" className="hint product-error">{c.productsError} <button className="btn-ghost" onClick={c.refreshProducts}>重新加载</button></p>}
      {c.productsLoading ? <p role="status" className="hint">正在加载产品库…</p> : PRODUCTS.length === 0 && !c.productsError ? (
        <p className="hint">产品库暂无产品。</p>
      ) : (
        <>
          <div className="filter" role="group" aria-label="按分类筛选">
            {[ALL, ...CATEGORIES].map((name) => (
              <button
                key={name}
                type="button"
                className="chip"
                aria-pressed={cat === name}
                onClick={() => setCat(name)}
              >
                {name}
                <span className="chip-n">{count(name)}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-product">
            {list.map((p) => {
              const on = c.state.productId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`product${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => c.set({ productId: on ? null : p.id })}
                >
                  <ProductCover product={p} />
                  <span className="product-body">
                    <span className="tags">
                      {p.tags.map((t) => (
                        <span key={t.text} className={`tag${t.solid ? ' is-solid' : ''}`}>
                          {t.text}
                        </span>
                      ))}
                    </span>
                    <span className="product-name">{p.series}</span>
                    <span className="product-full">{p.fullName}</span>
                    <span className="src-ima">{p.imageCount ? `知识库 ${p.imageCount} 张图` : p.dataStatus}</span>
                  </span>
                  {on && <CheckMark />}
                </button>

              );
            })}
          </div>
        </>
      )}

    </>
  );
}
