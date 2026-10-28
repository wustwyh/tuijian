import {readFileSync, writeFileSync} from "node:fs";
const file = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(file, "utf8");

// 1) 新增状态
s = s.replace(
  "  const [toast, setToast] = useState('');",
  `  const [toast, setToast] = useState('');
  const [scopeMode, setScopeMode] = useState('local'); // local 这一段 | whole 整篇
  const [requirements, setRequirements] = useState(null); // AI 提的几条改法
  const [requirement, setRequirement] = useState(''); // 选中的那条需求
  const [request, setRequest] = useState(''); // 用户随手写的一句
  const [analysis, setAnalysis] = useState(null); // AI 拆解后的要点`
);

// 2) 新增处理函数（放在 applyKeyword 之前）
const handlers = `
  function switchScope(next) {
    setScopeMode(next);
    setSelected(null); setPanel(null); setKeywords(null);
    setRequirements(null); setAnalysis(null); setRequirement(''); setRequest('');
  }

  // ① AI 提需求：直接给几条能点的改法
  async function loadRequirements() {
    if (!target) return;
    setBusy('requirements'); setError(''); setAnalysis(null);
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/rewrite\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: 'requirements', scope: scopeOf(target), target: target.text}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '没能给出改法');
      setRequirements(d.requirements || []);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  function chooseRequirement(item) {
    setRequirement(item.label);
    setAnalysis(null);
  }

  // ② 用户写一句，AI 拆成可执行的要求
  async function analyzeRequest() {
    if (!target || !request.trim()) return;
    setBusy('analyze'); setError('');
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/rewrite\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: 'analyze', scope: scopeOf(target), target: target.text, request: request.trim()}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '需求没分析出来');
      setAnalysis(d.analysis);
      setRequirement(d.analysis?.requirement || request.trim());
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  // ③ 按需求重写
  async function rewriteByRequirement() {
    const instruction = requirement || analysis?.requirement;
    if (!target || !instruction) return;
    await rewriteWith(instruction, null);
  }

  async function rewriteWith(instruction, keyword) {
    if (!target) return;
    setBusy('rewrite'); setError('');
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/rewrite\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scope: scopeOf(target), target: target.text, instruction, keywords: keyword ? [keyword] : [], count: 3}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '改写失败');
      setPanel({requirement: d.requirement, candidates: d.candidates, index: 0, keyword});
      applyCandidate(d, 0);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

`;
s = s.replace("  async function applyKeyword(keyword) {", handlers + "  async function applyKeyword(keyword) {");

// 3) 点选块时回到「这一段」
s = s.replace("  function pick(block, seed = '') {\n    setMode('edit');", "  function pick(block, seed = '') {\n    setMode('edit');\n    setScopeMode('local');");

// 4) target 计算
s = s.replace(
  "  const resultView = useMemo(() => ({...base, article: current}), [base, current]);",
  `  const resultView = useMemo(() => ({...base, article: current}), [base, current]);
  // 改稿目标：整篇时就是全文，否则是点中的那块
  const target = scopeMode === 'whole' ? {kind: 'article', text: String(current.body || '')} : selected;
  const effectiveRequirement = requirement || analysis?.requirement || '';`
);

// 5) 替换整个 aside
const start = s.indexOf('        <aside className="wb-side">');
const end = s.indexOf('        </aside>') + '        </aside>'.length;
if (start < 0 || end < 0) throw new Error("找不到 aside");
const aside = readFileSync(".tmp/aside.jsx.txt", "utf8");
s = s.slice(0, start) + aside + s.slice(end);
writeFileSync(file, s);
console.log("aside replaced");
