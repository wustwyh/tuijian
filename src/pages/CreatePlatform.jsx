import { useCompose } from '../compose.jsx';
import { CheckMark, PlatformArt, StepHead } from './parts.jsx';
import './knowledge.css';

export default function CreatePlatform() {
  const c = useCompose();
  return <>
    <StepHead no={3} title="选择平台" desc="选这次图文发到哪个平台，不同平台的节奏、篇幅和语气不同。" />
    {c.optionsError && <p role="alert" className="hint product-error">{c.optionsError}<button className="btn-ghost" onClick={c.refreshOptions}>重新加载</button></p>}
    {c.optionsLoading ? <p role="status">正在读取平台案例…</p> : <>
      <div className="grid grid-pf">
        {c.platforms.map(pf=><div key={pf.id} className={`pf knowledge-platform${c.platform?.id===pf.id?' is-on':''}`}>
          <button type="button" className="pf-pick" aria-pressed={c.platform?.id===pf.id}
            onClick={()=>c.set({platformId:c.platform?.id===pf.id?null:pf.id})}>
            <span className="pf-art"><PlatformArt form={pf.form} /></span>
            <span className="pf-name">{pf.name}</span><span className="pf-out">{pf.output}</span>
          </button>
          <details className="platform-sources"><summary>{pf.cases.length} 份图文结构参考</summary>
            <ul>{pf.cases.map(item=><li key={item.id} title={item.source}>{item.title}</li>)}</ul>
            <p title={pf.source}>P6 / 多平台公开案例研究</p>
          </details>
          {c.platform?.id===pf.id && <CheckMark />}
        </div>)}
      </div>
      <p className="knowledge-note">仅使用图文平台；公开案例用于研究结构与表达，案例中的其他品牌、体验和参数不作为所选产品的事实。</p>
    </>}
  </>;
}
