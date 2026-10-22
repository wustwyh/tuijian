import { useEffect, useMemo, useState } from 'react';
import { Sparkles, X, RotateCcw } from 'lucide-react';

const signature = (c) => JSON.stringify({
  productId: c.state.productId, audienceId: c.state.audienceId, platformId: c.state.platformId,
  task: c.task, format: c.format, topicIds: c.state.topicIds, materialIds: c.selectedMaterials.map(m => m.id),
});

export default function RequirementDiscovery({ c }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState('asking'); // thinking | asking | done
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [otherText, setOtherText] = useState('');
  const [pending, setPending] = useState('');
  const sig = useMemo(() => signature(c), [c]);

  useEffect(() => { setSession(null); setSummary(''); setError(''); setOtherText(''); setPending(''); setOpen(false); }, [sig]);

  const card = () => ({ productId: c.state.productId, audienceId: c.state.audienceId, platformId: c.state.platformId, task: c.task, format: c.format, topicIds: c.state.topicIds, materialIds: c.selectedMaterials.map(m => m.id), extra: c.state.extra });
  const labelFor = id => session?.options?.find(o => o.id === id)?.label || id;

  async function beginFlow() {
    setError(''); setSummary(''); setOtherText(''); setPending(''); setSession(null); setPhase('thinking');
    try {
      const r = await fetch('/api/generations/discovery/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(card()) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '需求梳理启动失败');
      setSession(d); setPhase('asking');
    } catch (e) { setError(e.message); setPhase('asking'); }
  }
  function start() { setOpen(true); beginFlow(); }
  function restart() { beginFlow(); }

  async function answer(optionId, text) {
    setError(''); setPending(text || labelFor(optionId)); setPhase('thinking');
    try {
      const r = await fetch('/api/generations/discovery/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: session.sessionId, cardKey: session.cardKey, dimension: session.dimension, answer: { optionId: optionId || '', text: text || '' } }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '提交答案失败');
      if (d.done) { setSummary(d.extraSummary); setSession(null); setPhase('done'); setOtherText(''); }
      else { setSession(d); setPhase('asking'); setOtherText(''); }
    } catch (e) { setError(e.message); setPhase('asking'); }
  }

  function close() { setOpen(false); setSession(null); setSummary(''); setError(''); setOtherText(''); setPending(''); setPhase('asking'); }
  function useSummary() { c.set({ extra: summary }); close(); }

  return <>
    <button type="button" className="discovery-trigger" onClick={start} disabled={!c.canGenerate}>
      <Sparkles size={16} /> AI 帮我梳理需求
    </button>

    {open && (
      <div className="discovery-overlay" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
        <div className="discovery-modal" role="dialog" aria-modal="true" aria-label="需求梳理">
          <div className="discovery-modal-head">
            <div className="discovery-modal-title"><Sparkles size={18} /><span>需求梳理</span><em>让 AI 把要求问清楚，再填进其他要求</em></div>
            <button type="button" className="discovery-close" onClick={close} aria-label="关闭"><X size={18} /></button>
          </div>

          <div className="discovery-modal-body">
            {error && <p className="discovery-error" role="alert">{error}</p>}

            {phase === 'thinking' && (
              <div className="discovery-thinking">
                <div className="discovery-orbit"><span /></div>
                <h3>AI 正在思考</h3>
                <p>{pending ? <>已记录你的选择「{pending}」<br />正在梳理下一步…</> : '正在准备第一个问题…'}</p>
              </div>
            )}

            {phase === 'done' && summary && (
              <div className="discovery-summary-view">
                <div className="discovery-done-badge">✓ 梳理完成</div>
                <p className="discovery-summary">{summary}</p>
                <div className="discovery-modal-actions">
                  <button type="button" className="btn-primary" onClick={useSummary}>填入额外要求</button>
                  <button type="button" className="discovery-ghost" onClick={restart}><RotateCcw size={15} />重新梳理</button>
                </div>
              </div>
            )}

            {phase === 'asking' && session && (
              <div className="discovery-question-view">
                <div className="discovery-round">
                  <span className="discovery-progress"><i style={{ width: `${Math.min(100, Math.round(session.round / 7 * 100))}%` }} /></span>
                  <span>第 {session.round} 轮 · {session.dimension}</span>
                </div>
                <h3>{session.question}</h3>
                <div className="discovery-options">
                  {session.options.map(o => <button key={o.id} type="button" onClick={() => answer(o.id, '')}>{o.label}</button>)}
                </div>
                <div className="discovery-actions-row">
                  {session.allowSkip && <button type="button" className="discovery-ghost" onClick={() => answer('', '暂不确定')}>暂不确定</button>}
                  {session.allowOther && (
                    <div className="discovery-other">
                      <input value={otherText} onChange={e => setOtherText(e.target.value)} placeholder="其他：自行填写…" aria-label="其他答案" />
                      <button type="button" className="discovery-ghost" disabled={!otherText.trim()} onClick={() => answer('', otherText)}>提交</button>
                    </div>
                  )}
                </div>
                <button type="button" className="discovery-abandon" onClick={close}>放弃本次梳理</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </>;
}
