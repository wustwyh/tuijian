// 营销图文子页面共用的小组件
import { Check, LayoutTemplate, Plus } from 'lucide-react';

export function StepHead({ no, title, desc }) {
  return (
    <header className="step-head">
      <p className="step-count">
        <b>{no}</b> / 4
      </p>
      <h1>{title}</h1>
      <p className="step-desc">{desc}</p>
    </header>
  );
}

export function CheckMark() {
  return (
    <span className="check" aria-hidden="true">
      <Check size={16} strokeWidth={3} />
    </span>
  );
}

// 「添加」入口：本批只摆位置，下一批接粘贴解析
export function AddEntry({ title, desc }) {
  return (
    <button type="button" className="add" disabled>
      <Plus size={22} aria-hidden="true" />
      <span className="add-title">{title}</span>
      <span className="add-desc">{desc}</span>
      <span className="add-soon">下一批开放</span>
    </button>
  );
}

// 平台产出形态示意，纯 CSS 画。新增平台若 form 未知，显示通用图标
export function PlatformArt({ form }) {
  const ln = (short) => <span className={`a-ln${short ? ' short' : ''}`} />;

  if (form === 'xhs') {
    return (
      <span className="art art-xhs" aria-hidden="true">
        <span className="a-sheet s3" />
        <span className="a-sheet s2" />
        <span className="a-sheet s1">
          <span className="a-img" />
          {ln()}
          {ln(true)}
        </span>
        <span className="a-dots"><span /><span /><span /><span /></span>
      </span>
    );
  }
  if (form === 'article') {
    return (
      <span className="art art-article" aria-hidden="true">
        <span className="a-sheet">
          <span className="a-title" />
          <span className="a-img" />
          {ln()}
          {ln()}
          {ln(true)}
          <span className="a-img" />
          {ln()}
        </span>
      </span>
    );
  }
  if (form === 'moments') {
    return (
      <span className="art art-moments" aria-hidden="true">
        <span className="a-sheet">
          <span className="a-row">
            <span className="a-av" />
            <span className="a-ln short" />
          </span>
          {ln()}
          <span className="a-grid"><span className="a-img" /><span className="a-img" /><span className="a-img" /></span>
        </span>
      </span>
    );
  }
  if (form === 'poster') {
    return (
      <span className="art art-poster" aria-hidden="true">
        <span className="a-sheet">
          <span className="a-img" />
          <span className="a-title" />
          {ln(true)}
          <span className="a-cta" />
        </span>
      </span>
    );
  }
  return <LayoutTemplate size={40} strokeWidth={1.5} aria-hidden="true" />;
}
