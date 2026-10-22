import { useCompose } from '../compose.jsx';
import { StepHead } from './parts.jsx';
import SourceText from './SourceText.jsx';
import MaterialSelection from './MaterialSelection.jsx';
import RequirementDiscovery from './RequirementDiscovery.jsx';
import './knowledge.css';

export default function CreateStyle() {
  const c = useCompose();
  return <>
    <StepHead no={4} title="选题与要求" desc="来自 P6 选题库的服务型内容。选择具体问题，保留适用条件与核验要求。" />
    {c.optionsError && <p role="alert" className="hint product-error">{c.optionsError}<button className="btn-ghost" onClick={c.refreshOptions}>重新加载</button></p>}
    {c.optionsLoading ? <p role="status">正在读取选题库…</p> : <section className="block">
      <div className="block-head"><h2>服务型选题</h2><span className="muted">可多选，也可以只使用上一页的内容目的</span></div>
      <div className="grid grid-style topic-grid">{c.topics.map(topic=>{
        const idx=c.state.topicIds.indexOf(topic.id);
        return <button key={topic.id} type="button" className={`style-card topic-card${idx>=0?' is-on':''}`}
          aria-pressed={idx>=0} onClick={()=>c.toggleTopic(topic.id)}>
          <span className="style-name">{topic.name}</span><span className="style-desc">{topic.desc}</span>
          {idx>=0 && <span className="check" aria-label={`第 ${idx+1} 个选中`}>{idx+1}</span>}
        </button>;
      })}</div>
      {c.selectedTopics.map(topic=><details className="topic-guide" key={topic.id}>
        <summary>{topic.name} · 查看知识库指引</summary><SourceText text={topic.guide} />
        <p className="source-path">{topic.source}</p>
      </details>)}
      <p className="knowledge-note">服务内容应链接官方支持页，区分设备与系统；活动价格和服务范围需标注抓取日期。</p>
    </section>}
    <MaterialSelection/>
    <section className="block"><div className="block-head"><h2>其他要求</h2><span className="muted">产品事实以 P1 原文为准</span></div>
      <textarea className="extra" rows={5} aria-label="其他要求" value={c.state.extra}
        placeholder="例如：面向第一次换机的用户，列出备份前必须确认的问题。"
        onChange={e=>c.set({extra:e.target.value})} />
      <RequirementDiscovery c={c} />
    </section>
  </>;
}
