import {readFileSync, writeFileSync} from 'node:fs';
const f = 'src/pages/ArticleWorkbench.jsx';
let s = readFileSync(f, 'utf8');
const before = s;

// ── 状态与逻辑 ──
s = s.replace(
  `  const [analysis, setAnalysis] = useState(null); // AI 拆解后的要点`,
  `  const [analysis, setAnalysis] = useState(null); // AI 问完之后给出的需求
  const [turn, setTurn] = useState(null); // 需求追问：{question, options, history}
  const [turnSeed, setTurnSeed] = useState(''); // 这一轮追问针对的那句需求
  const [turnLoading, setTurnLoading] = useState(false);
  const [turnInput, setTurnInput] = useState(''); // 追问时自己补一句`
);

// ── 追问逻辑 ──
s = s.replace(
  `  async function analyzeRequest() {`,
  `  // 需求追问：点一个气泡就开始问，用户只点选项，不用打字
  async function askTurn(seed, history = []) {
    if (!target || !seed) return;
    setTurnSeed(seed);
    setTurnLoading(true); setError('');
    setTurn({question: '', options: [], history});
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/rewrite\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: 'turn', scope: scopeOf(target), target: target.text, seed, history}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'AI 没回应，请再试一次');
      if (d.done) {
        setAnalysis({requirement: d.requirement, points: d.points, keep: d.keep, avoid: d.avoid});
        setTurn(null);
      } else {
        setTurn({question: d.question, options: d.options, history});
      }
    } catch (e) { setError(e.message); setTurn(null); }
    finally { setTurnLoading(false); }
  }

  function answerTurn(value) {
    if (!turn || !value.trim()) return;
    const history = [...(turn.history || []), {role: 'assistant', content: turn.question}, {role: 'user', content: value.trim()}];
    askTurn(turnSeed, history);
  }

  async function analyzeRequest() {`
);

// 点气泡就触发追问：chips/自写内容变化后自动问一次
s = s.replace(
  `  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !selected) onClose(); };`,
  `  // 点了气泡（或自己写了一句）就开始追问，不用再按按钮
  useEffect(() => {
    if (editTab !== 'ai' || !target) return;
    const seed = chips.join('、') || request.trim();
    if (!seed) { setTurn(null); return; }
    if (analysis && analysis.seed === seed) return;
    const timer = setTimeout(() => { setAnalysis(null); askTurn(seed); }, 600);
    return () => clearTimeout(timer);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [chips.join('、'), request.trim(), editTab, scopeMode, selected?.text]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !selected) onClose(); };`
);

writeFileSync(f, s);
console.log('logic ok', s !== before);
