import { ArrowUp } from 'lucide-react';

// 常驻回顶入口，避免用户需要先滚动一定距离才发现按钮。
export default function ScrollTop() {
  return (
    <button
      type="button"
      className="scroll-top is-show"
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
      aria-label="回到顶部"
      title="回到顶部"
    >
      <ArrowUp size={20} />
    </button>
  );
}
