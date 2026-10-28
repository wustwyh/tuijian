import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// 结果页可收起的分段：标题左侧是编号或图标徽章，右侧是收起/展开按钮。
// action 用来在标题栏放一个分段专属按钮（例如「预览发布稿」）。
export default function Section({ id, no, icon, title, action, children }) {
  const [open, setOpen] = useState(true);
  return (
    <section id={id} className={`result-section${open ? '' : ' is-collapsed'}`}>
      <div className="result-section-title">
        {no ? <span>{no}</span> : icon ? <span className="result-section-icon">{icon}</span> : null}
        <h2>{title}</h2>
        {action && <div className="result-section-action">{action}</div>}
        <button type="button" className={`result-collapse${open ? ' is-open' : ''}`} onClick={() => setOpen(!open)} aria-label={open ? '收起' : '展开'} aria-expanded={open}>
          <ChevronDown size={16} />
        </button>
      </div>
      {open && <div className="result-section-body">{children}</div>}
    </section>
  );
}
