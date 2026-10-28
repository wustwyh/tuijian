import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { STEPS, useCompose } from '../compose.jsx';

// 固定在视口内的步骤操作栏，切换后从新步骤顶部开始。
export default function StepNav() {
  const c = useCompose();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
  const index = STEPS.findIndex(s => pathname.startsWith(s.path));
  if (index < 0) return null;
  const prev = index > 0 ? STEPS[index - 1] : null;
  const next = index < STEPS.length - 1 ? STEPS[index + 1] : null;
  // 产品必选、平台必选；客户可不指定（交给 AI 判断）。
  const ready = index === 0 ? Boolean(c.product) : index === 2 ? Boolean(c.platform) : true;
  const canNext = Boolean(next) && ready;
  const hint = next
    ? (ready ? `已完成「${STEPS[index].label}」选择，继续下一步` : `请先完成「${STEPS[index].label}」选择`)
    : '确认「本次组合」后，点「生成图文」开始创作';

  return (
    <nav className={`step-nav${next ? '' : ' is-last'}`} aria-label="切换创作步骤">
      <button type="button" className="btn-ghost step-prev" onClick={() => prev && navigate(prev.path)} disabled={!prev}>
        <ArrowLeft size={16} />{prev ? `上一步：${prev.label}` : '上一步'}
      </button>
      <span className="step-nav-hint" role="status">{hint}</span>
      {next && (
        <button type="button" className="btn-primary step-next" onClick={() => canNext && navigate(next.path)} disabled={!canNext}>
          下一步：{next.label}<ArrowRight size={16} />
        </button>
      )}
    </nav>
  );
}
