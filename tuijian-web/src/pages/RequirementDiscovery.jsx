import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Sparkles, RotateCcw, Send, Loader2, Check, CornerDownLeft, MessageSquareQuote, Wand2} from 'lucide-react';
import './discovery.css';

const STORE = 'tuijian_discovery_v3';

const readStore = () => {
  try { return JSON.parse(sessionStorage.getItem(STORE)) || null; } catch { return null; }
};

// 对话式需求澄清：一次只问一个问题，答案决定下一问；随时可以把聊过的内容整理成「额外要求」。
export default function RequirementDiscovery({c}) {
  const [session, setSession] = useState(null);
  const [turns, setTurns] = useState([]);
  const [current, setCurrent] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | starting | asking | thinking | summarizing | done
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [covered, setCovered] = useState([]);
  const [applied, setApplied] = useState('');
  const thread = useRef(null);
  const input = useRef(null);

  const sig = useMemo(() => JSON.stringify({
    productId: c.state.productId, audienceId: c.state.audienceId, platformId: c.state.platformId,
    task: c.task, format: c.format, topicIds: c.state.topicIds, materialIds: c.selectedMaterials.map(m => m.id),
  }), [c]);

  const card = () => ({
    productId: c.state.productId, audienceId: c.state.audienceId, platformId: c.state.platformId,
    task: c.task, format: c.format, topicIds: c.state.topicIds,
    materialIds: c.selectedMaterials.map(m => m.id), extra: c.state.extra || '',
  });

  // 换组合就重来；同一组合回到这一步时把对话接上。
  useEffect(() => {
    const saved = readStore();
    if (saved && saved.sig === sig) {
      setSession(saved.session); setTurns(saved.turns || []); setCurrent(saved.current || null);
      setPhase(saved.phase === 'done' ? 'done' : saved.current ? 'asking' : 'idle');
      setSummary(saved.summary || ''); setCovered(saved.covered || []); setApplied(saved.applied || '');
      return;
    }
    setSession(null); setTurns([]); setCurrent(null); setPhase('idle'); setSummary(''); setCovered([]); setError(''); setApplied('');
  }, [sig]);

  useEffect(() => {
    if (phase === 'idle') return;
    sessionStorage.setItem(STORE, JSON.stringify({sig, session, turns, current, phase, summary, covered, applied}));
  }, [sig, session, turns, current, phase, summary, covered, applied]);

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, phase]);

  const pushTurn = (turn) => setTurns(prev => [...prev, turn]);

  const begin = useCallback(async () => {
    setError(''); setSummary(''); setTurns([]); setCurrent(null); setCovered([]); setApplied('');
    setPhase('starting');
    try {
      const r = await fetch('/api/generations/discovery/start', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(card())});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '对话没有开始，请重试');
      setSession({sessionId: d.sessionId, cardKey: d.cardKey});
      setCurrent(d.question);
      setTurns([{role: 'ai', text: d.understanding || '先确认几件关键的事，问完就能直接写。', question: d.question}]);
      setPhase('asking');
      setTimeout(() => input.current?.focus(), 60);
    } catch (e) { setError(e.message); setPhase('idle'); }
  }, [c]);

  async function answer(payload) {
    if (!session || !current || phase === 'thinking' || phase === 'summarizing') return;
    setError('');
    const label = payload.optionId ? current.options.find(o => o.id === payload.optionId)?.label : payload.text;
    pushTurn({role: 'me', text: label || '（跳过这题）'});
    setPhase('thinking');
    try {
      const r = await fetch('/api/generations/discovery/answer', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId: session.sessionId, cardKey: session.cardKey, questionId: current.id, ...payload}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '没接上，请再说一次');
      setCovered(d.covered || (current.dimension ? [...new Set([...covered, current.dimension])] : covered));
      if (d.done) { setSummary(d.extraSummary); setCurrent(null); setPhase('done'); return; }
      setCurrent(d.question);
      pushTurn({role: 'ai', text: d.understanding || '', question: d.question});
      setPhase('asking');
      setTimeout(() => input.current?.focus(), 60);
    } catch (e) { setError(e.message); setPhase('asking'); }
  }

  async function finish() {
    if (!session) return;
    setError('');
    setPhase('summarizing');
    try {
      const r = await fetch('/api/generations/discovery/answer', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId: session.sessionId, cardKey: session.cardKey, questionId: current?.id, skip: true, finish: true}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '整理失败，请重试');
      setSummary(d.extraSummary); setCurrent(null); setPhase('done');
    } catch (e) { setError(e.message); setPhase('asking'); }
  }

  function sendText() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    answer({text});
  }

  const apply = () => { c.set({extra: summary}); setApplied(summary); };

  const rounds = turns.filter(t => t.role === 'me').length;
  const busy = phase === 'thinking' || phase === 'summarizing';

  return <section className="dc">
    <header className="dc-head">
      <div className="dc-head-left">
        <span className="dc-badge"><MessageSquareQuote size={13}/>对话式</span>
        <h2>AI 帮你提需求</h2>
        <p>一次只问一件事，你答完它接着往下问；聊够了就整理成「额外要求」。问过的不再重复。</p>
      </div>
      <div className="dc-head-right">
        {rounds > 0 && <span className="dc-rounds">第 {rounds} 轮</span>}
        {covered.length > 0 && <span className="dc-covered">已覆盖 {covered.length} 个维度</span>}
        {(phase === 'asking' || phase === 'thinking') && <button type="button" className="dc-restart" onClick={begin}><RotateCcw size={14}/>重新开始</button>}
      </div>
    </header>

    {error && <p className="dc-error" role="alert">{error}</p>}

    {phase === 'idle' && (
      <div className="dc-empty">
        <div className="dc-empty-art"><Wand2 size={26}/></div>
        <h3>从一句话开始，把需求聊清楚</h3>
        <p>它会先问最影响这篇图文的那一件事，你选一个（或直接说），再问下一件。</p>
        <button type="button" className="btn-primary dc-start" onClick={begin} disabled={!c.canGenerate}>
          <Sparkles size={16}/>开始梳理需求
        </button>
        {!c.canGenerate && <small>先把产品、客户、平台和选题选好</small>}
      </div>
    )}

    {(phase === 'starting' || turns.length > 0) && (
      <div className="dc-thread" ref={thread}>
        {turns.map((turn, i) => turn.role === 'me'
          ? <div className="dc-row is-me" key={i}><div className="dc-bubble is-me">{turn.text}</div></div>
          : <div className="dc-row is-ai" key={i}>
              <span className="dc-avatar"><Sparkles size={13}/></span>
              <div className="dc-ai-block">
                {turn.text && <div className="dc-bubble is-ai">{turn.text}</div>}
                {turn.question && <div className="dc-question">
                  <div className="dc-question-head"><span className="dc-dim">{turn.question.dimension}</span><h4>{turn.question.question}</h4></div>
                  <div className="dc-options">
                    {turn.question.options.map(o => (
                      <button type="button" key={o.id}
                        className={`dc-option${turn === turns[turns.length - 1] && current ? '' : ' is-muted'}`}
                        disabled={busy || !(turn === turns[turns.length - 1] && current)}
                        onClick={() => answer({optionId: o.id})}>
                        <span className="dc-option-label">{o.label}</span>
                        {turn.question.recommended === o.id && <span className="dc-recommend">推荐</span>}
                      </button>
                    ))}
                  </div>
                  {turn === turns[turns.length - 1] && current && <button type="button" className="dc-skip" disabled={busy} onClick={() => answer({skip: true})}>这题跳过</button>}
                </div>}
              </div>
            </div>
        )}
        {phase === 'starting' && <div className="dc-typing"><span/><span/><span/></div>}
        {phase === 'thinking' && <div className="dc-typing"><span/><span/><span/></div>}
        {phase === 'summarizing' && <p className="dc-typing-note">正在把这轮对话整理成「额外要求」…</p>}
        {phase === 'done' && summary && (
          <div className="dc-summary">
            <div className="dc-summary-head"><Check size={15}/>整理完成，可以直接用这段要求</div>
            <p>{summary}</p>
            <div className="dc-summary-actions">
              <button type="button" className="btn-primary" onClick={apply}>{applied === summary ? '已填入其他要求' : '填入其他要求'}</button>
              <button type="button" className="dc-restart" onClick={begin}><RotateCcw size={14}/>再聊一轮</button>
            </div>
            {applied === summary && <small className="dc-applied">已写入「其他要求」，生成时会一起带上。</small>}
          </div>
        )}
      </div>
    )}

    {current && phase !== 'done' && (
      <footer className="dc-composer">
        <div className="dc-input-wrap">
          <input ref={input} value={draft} placeholder="也可以直接说你的想法，例如「主要想打动第一次换机的家长」"
            onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendText(); }} disabled={busy}/>
          <button type="button" className="dc-send" onClick={sendText} disabled={busy || !draft.trim()} aria-label="发送"><Send size={15}/></button>
        </div>
        <button type="button" className="dc-finish" onClick={finish} disabled={busy || !rounds}>
          <CornerDownLeft size={14}/>就聊到这儿，整理成要求
        </button>
      </footer>
    )}

    {busy && !turns.length && <p className="dc-wait" role="status"><Loader2 size={15} className="spin"/>正在开始…</p>}
  </section>;
}
