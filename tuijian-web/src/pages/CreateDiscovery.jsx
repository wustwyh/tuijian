import {useState} from 'react';
import {useCompose} from '../compose.jsx';
import {StepHead} from './parts.jsx';
import RequirementDiscovery from './RequirementDiscovery.jsx';
import {MessageSquareQuote, Sparkles, CornerDownLeft, PenLine} from 'lucide-react';
import './discovery.css';
import './insights.css';

// 第 5 步：需求。自己写和 AI 聊放在同一处——两边写的都是同一份「其他要求」。
export default function CreateDiscovery() {
  const c = useCompose();
  const [mode, setMode] = useState('chat');
  return <>
    <StepHead no={5} title="提需求"
      desc="两个方式，写的是同一份要求：要么和 AI 一问一答聊出来，要么自己写。" />

    <section className="block req-switch">
      <div className="req-tabs" role="group" aria-label="需求填写方式">
        <button type="button" className={mode === 'chat' ? 'is-on' : ''} onClick={() => setMode('chat')}>
          <MessageSquareQuote size={14}/>和 AI 聊<em>推荐</em>
        </button>
        <button type="button" className={mode === 'self' ? 'is-on' : ''} onClick={() => setMode('self')}>
          <PenLine size={14}/>自己写
        </button>
      </div>
      <p className="req-hint">
        {mode === 'chat'
          ? '一次一个问题，问完自动整理成要求；聊出来的结果会填进下面的框，你还能改。'
          : '想到什么写什么，比如面向谁、要突出什么、不要写什么、要避开哪些说法。'}
      </p>
    </section>

    {mode === 'chat' && <>
      <section className="block dc-intro">
        <div className="dc-intro-grid">
          <div><MessageSquareQuote size={16}/><strong>一问一答</strong><p>先问最影响这篇图文的那件事，你答完再问下一件。</p></div>
          <div><Sparkles size={16}/><strong>越聊越准</strong><p>后面的问题接着你的回答往下问；问过的角度不会再来一遍。</p></div>
          <div><CornerDownLeft size={16}/><strong>随时收尾</strong><p>聊够了就整理成一段「其他要求」，不满意可以再聊一轮。</p></div>
        </div>
      </section>
      <RequirementDiscovery c={c}/>
    </>}

    <section className="block req-extra">
      <div className="block-head">
        <h2>其他要求</h2>
        <span className="muted">{mode === 'chat' ? 'AI 聊出来的结果会同步到这里，可以继续改' : '产品事实以 P1 原文为准'}</span>
      </div>
      <textarea className="extra" rows={mode === 'self' ? 6 : 4} aria-label="其他要求" value={c.state.extra}
        placeholder="例如：面向第一次换机的用户，列出备份前必须确认的问题；不要写价格和活动力度。"
        onChange={e => c.set({extra: e.target.value})} />
      {c.extra && <p className="req-count">{c.extra.length} 字 · 生成时会作为「其他要求」交给模型</p>}
    </section>
  </>;
}
