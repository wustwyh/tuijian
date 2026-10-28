import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import './gallery.css';

export default function ProductGallery({ product, onClose, onSave }) {
  const dialog = useRef(null);
  const [selected, setSelected] = useState(product.coverId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const image = product.images.find((im) => im.id === selected);

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      element.close();
      document.body.style.overflow = oldOverflow;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(product.id, selected);
      onClose(true);
    } catch (failure) {
      setError(failure.message || '封面保存失败，请重试');
      setSaving(false);
    }
  };

  return (
    <dialog ref={dialog} className="gallery" aria-labelledby="gallery-title"
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
      <header className="gallery-head">
        <div><p>产品图库 · {product.imageCount} 张</p><h2 id="gallery-title">{product.short}</h2></div>
        <button type="button" className="gallery-close" aria-label="关闭图库" disabled={saving} onClick={() => onClose()}><X size={20} /></button>
      </header>
      <div className="gallery-content">
        <div className="gallery-preview"><img src={image?.url} alt={`${product.short}封面预览`} /></div>
        <p className="gallery-caption" title={image?.file}>{image?.description || image?.file}</p>
        <div className="gallery-grid" role="group" aria-label="选择默认封面">
          {product.images.map((im, index) => (
            <button key={im.id} type="button" className={`gallery-image${selected === im.id ? ' is-selected' : ''}`}
              aria-label={`选择第 ${index + 1} 张图片`} aria-pressed={selected === im.id} disabled={saving} onClick={() => setSelected(im.id)}>
              <img src={im.url} alt={im.description || im.file} loading="lazy" />
              {im.id === product.coverId && <span className="gallery-current">当前封面</span>}
              {selected === im.id && <span className="gallery-check"><Check size={14} /></span>}
            </button>
          ))}
        </div>
      </div>
      <footer className="gallery-foot">
        <p role={error ? 'alert' : undefined} className={error ? 'gallery-error' : ''}>{error || '保存后，所有人都会看到这张默认封面。'}</p>
        <div><button type="button" className="btn-ghost" disabled={saving} onClick={() => onClose()}>取消</button>
          <button type="button" className="btn-primary" disabled={saving || !selected || selected === product.coverId} onClick={save}>{saving ? '正在保存…' : '设为默认封面'}</button></div>
      </footer>
    </dialog>
  );
}
