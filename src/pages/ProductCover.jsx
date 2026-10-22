import { Package } from 'lucide-react';

export default function ProductCover({ product }) {
  return (
    <span className={`product-img${product.cover ? '' : ' product-no-image'}`}>
      {product.cover ? <img src={product.cover} alt="" loading="lazy" /> :
        <span><Package size={34} strokeWidth={1.3} aria-hidden="true" /><span>暂无图片</span></span>}
    </span>
  );
}
