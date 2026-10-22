import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import './gallery.css';
import './management.css';
export default function ManagementDialog({title,eyebrow='资料管理',busy=false,onClose,children}){
  const ref=useRef(null);
  useEffect(()=>{const el=ref.current;el.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=old;};},[]);
  return <dialog ref={ref} className="gallery manage-dialog" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <header className="gallery-head"><div><p>{eyebrow}</p><h2>{title}</h2></div><button type="button" className="gallery-close" aria-label="关闭窗口" disabled={busy} onClick={onClose}><X size={20}/></button></header>{children}
  </dialog>;
}
