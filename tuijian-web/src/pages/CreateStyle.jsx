import {useEffect, useState} from 'react';
import {useCompose} from '../compose.jsx';
import {StepHead} from './parts.jsx';
import SourceText from './SourceText.jsx';
import MaterialSelection from './MaterialSelection.jsx';
import {RefreshCw, Search, Sparkles, X} from 'lucide-react';
import './knowledge.css';
import './insights.css';

// 选题：由 AI 按「产品 + 客户 + 平台」现推，不再是固定的服务型选题库；
// 同时可以搜最近的热点（双 11、开学季这类），把热点接进这次的图文。
export default function CreateStyle() {
  const c = useCompose();
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState('');
  const [hotQuery, setHotQuery] = useState('');
  const [hotLoading, setHotLoading] = useState(false);
  const [hotError, setHotError] = useState('');
  const [hotResults, setHotResults] = useState(null);
  const [hotNote, setHotNote] = useState('');
  const [hotMeta, setHotMeta] = useState(null); // 搜索引擎、时间、原始结果
  const [hotSources, setHotSources] = useState([]);

  const productId = c.state.productId;
  const audienceId = c.state.audienceId;
  const platform = c.platform?.name || '';

  async function loadTopics(refresh = false) {
    if (!productId || !platform) return;
    setTopicsLoading(true); setTopicsError('');
    try {
      const r = await fetch('/api/topics/recommend', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({productId, audienceId, platform, task: c.task, refresh}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '选题没推出来');
      c.setRecommendedTopics(d.topics || []);
    } catch (e) { setTopicsError(e.message); }
    finally { setTopicsLoading(false); }
  }

  // 换了产品/客户/平台就重新推荐一次
  useEffect(() => {
    if (!productId || !platform) return;
    if (c.aiTopics.length) return;
    loadTopics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, audienceId, platform]);

  // 热点也自动来，不用用户搜
  useEffect(() => {
    if (!productId || !platform) return;
    searchHot({refresh: false, quiet: true});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, audienceId, platform]);

  async function searchHot({refresh = false, quiet = false} = {}) {
    if (!productId || !platform) return;
    setHotLoading(true); setHotError('');
    try {
      const r = await fetch('/api/hot-topics', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({productId, audienceId, platform, query: hotQuery.trim(), refresh}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '没搜到热点');
      setHotResults(d.topics || []);
      setHotNote(d.note || '');
      setHotMeta({provider: d.provider, at: d.searchedAt, source: d.source});
      setHotSources(d.results || []);
    } catch (e) { setHotError(e.message); }
    finally { setHotLoading(false); }
  }

  const pool = c.topicPool;

  return <>
    <StepHead no={4} title="选题" desc="选题按客户和平台现推；也可以搜最近的热点，把热点接进这篇图文。" />
    {c.optionsError && <p role="alert" className="hint product-error">{c.optionsError}<button className="btn-ghost" onClick={c.refreshOptions}>重新加载</button></p>}

    <section className="block">
      <div className="block-head">
        <h2>选题</h2>
        <span className="muted">可多选；换一批只是换推荐，不影响已选的</span>
        <button type="button" className="insight-refresh" onClick={() => loadTopics(true)} disabled={topicsLoading || !productId}>
          <RefreshCw size={13} className={topicsLoading ? 'spin' : ''}/>{topicsLoading ? '正在推荐…' : '换一批'}
        </button>
      </div>

      {topicsError && <p className="hint product-error" role="alert">{topicsError}
        <button type="button" className="btn-ghost" onClick={() => loadTopics(true)}>再试一次</button>
      </p>}

      {topicsLoading && !c.aiTopics.length && <p className="insight-state"><span className="result-spinner"/>AI 正在按这个客户和平台想选题…</p>}

      {!(topicsLoading && !c.aiTopics.length) && <div className="grid grid-style topic-grid">
        {pool.map(topic => {
          const idx = c.state.topicIds.indexOf(topic.id);
          return <button key={topic.id} type="button" className={`style-card topic-card${idx >= 0 ? ' is-on' : ''}`}
            aria-pressed={idx >= 0} onClick={() => c.toggleTopicById(topic)}>
            <span className="style-name">{topic.name}</span>
            <span className="style-desc">{topic.desc}</span>
            {idx >= 0 && <span className="check" aria-label={`第 ${idx + 1} 个选中`}>{idx + 1}</span>}
          </button>;
        })}
      </div>}

      {c.aiTopics.length === 0 && !topicsLoading && <p className="insight-note">
        暂时用的是选题库里的通用选题；先选好产品和平台，这里会换成针对性的推荐。
      </p>}

      {c.selectedTopics.map(topic => topic.guide ? <details className="topic-guide" key={topic.id}>
        <summary>{topic.name} · 查看知识库指引</summary><SourceText text={topic.guide} />
        <p className="source-path">{topic.source}</p>
      </details> : null)}
    </section>

    <section className="block insight-hot">
      <div className="block-head">
        <h2>借个热点</h2>
        <span className="muted">自动找最近发生的事和大促节点，不用自己搜</span>
        <button type="button" className="insight-refresh" onClick={() => searchHot({refresh: true})} disabled={hotLoading || !productId}>
          {hotLoading ? '正在找…' : '换一批'}
        </button>
      </div>
      <div className="insight-search">
        <Search size={15}/>
        <input value={hotQuery} onChange={e => setHotQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !hotLoading) searchHot({refresh: true}); }}
          placeholder="也可以搜指定的：例如 双11 轻薄本 / 开学季 选电脑" aria-label="搜索热点"/>
        <button type="button" onClick={() => searchHot({refresh: true})} disabled={hotLoading || !productId}>
          {hotLoading ? '正在搜…' : '搜一下'}
        </button>
      </div>
      {hotLoading && !hotResults && <p className="insight-note">正在联网找最近的热点…</p>}
      {hotError && <p className="hint product-error" role="alert">{hotError}</p>}
      {hotResults?.length > 0 && <>
        <ul className="hot-list">
          {hotResults.map(hot => {
            const on = c.hotTopics.some(t => t.title === hot.title);
            return <li key={hot.title}>
              <button type="button" className={`hot-card${on ? ' is-on' : ''}`} onClick={() => c.toggleHotTopic(hot)}>
                <div className="hot-head"><strong>{hot.title}</strong>{hot.when && <span>{hot.when}</span>}</div>
                {hot.why && <p>{hot.why}</p>}
                {hot.angle && <p className="hot-angle"><Sparkles size={12}/>{hot.angle}</p>}
                <div className="hot-foot">
                  <span className="hot-add">{on ? '已加入本次' : '加到本次'}</span>
                  {hot.url && <a className="hot-src" href={hot.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>来源</a>}
                </div>
              </button>
            </li>;
          })}
        </ul>
        {hotNote && <p className="insight-note">{hotNote}</p>}
        {hotSources.length > 0 && <details className="hot-sources">
          <summary>看到的原始搜索结果（{hotSources.length} 条，{hotMeta?.provider}）</summary>
          <ul>
            {hotSources.map(item => <li key={item.url}>
              <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
              {item.snippet && <span>{item.snippet}</span>}
            </li>)}
          </ul>
        </details>}
      </>}
      {c.hotTopics.length > 0 && <div className="hot-picked">
        <span className="hot-picked-label">本次借势</span>
        {c.hotTopics.map(hot => <span className="hot-chip" key={hot.title}>
          {hot.title}
          <button type="button" aria-label={`移除 ${hot.title}`} onClick={() => c.toggleHotTopic(hot)}><X size={12}/></button>
        </span>)}
        <button type="button" className="hot-clear" onClick={c.clearHotTopics}>全清</button>
      </div>}
    </section>

    <MaterialSelection/>
  </>;
}
