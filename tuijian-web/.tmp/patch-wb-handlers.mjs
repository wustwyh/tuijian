import {readFileSync, writeFileSync} from "node:fs";
const file = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(file, "utf8");

// 1) 新状态
s = s.replace(
  "  const [analysis, setAnalysis] = useState(null); // AI 拆解后的要点",
  `  const [analysis, setAnalysis] = useState(null); // AI 拆解后的要点
  const [chips, setChips] = useState([]); // 选中的「你可能想改」气泡
  const [showOwn, setShowOwn] = useState(false); // 自己提需求的方框，点了按钮才出现
  const [candidates, setCandidates] = useState(null); // 这次改写给出的版本
  const [picked, setPicked] = useState(0);
  const [compare, setCompare] = useState(null); // 修改前 / 修改后
  const [revisions, setRevisions] = useState([]); // 这份稿子的历史
  const [historyOpen, setHistoryOpen] = useState(false);`
);

// 2) 重置 + 新流程
s = s.replace(
  "  function switchScope(next) {",
  `  const PRESETS = ['短一点', '更口语', '更具体', '删形容词', '换个卖点', '加个场景'];

  function resetEdit() {
    setChips([]); setShowOwn(false); setRequest(''); setAnalysis(null);
    setRequirement(''); setCandidates(null); setPicked(0); setCompare(null);
  }

  function switchScope(next) {`
);
s = s.replace(
  "    setRequirements(null); setAnalysis(null); setRequirement(''); setRequest('');\n  }",
  "    setRequirements(null); setAnalysis(null); setRequirement(''); setRequest('');\n    setChips([]); setShowOwn(false); setCandidates(null); setPicked(0); setCompare(null);\n  }"
);

s = s.replace("  function chooseRequirement(item) {", `  function toggleChip(word) {
    setChips(list => list.includes(word) ? list.filter(w => w !== word) : [...list, word]);
  }

  function chooseRequirement(item) {`);

// 3) 用新的三步替换旧的 analyze / rewrite
s = s.replace(
  `  // ② 用户写一句，AI 拆成可执行的要求
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
  }`,
  `  // ② AI 梳理：把点中的气泡、写的那句话揉成一条可执行的要求
  async function analyzeRequest() {
    if (!target) return;
    const ask = request.trim() || chips.join('、');
    if (!ask) return;
    setBusy('analyze'); setError('');
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/rewrite\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: 'analyze', scope: scopeOf(target), target: target.text, request: ask}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '需求没梳理出来');
      setAnalysis(d.analysis);
      setRequirement(d.analysis?.requirement || ask);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  // ③ 开始修改：段落给 3 个版本，整篇只给 1 篇
  async function rewriteByRequirement() {
    if (!target) return;
    const instruction = requirement || analysis?.requirement || request.trim() || chips.join('、');
    if (!instruction) { setError('先点一个方向，或自己写一句'); return; }
    const count = scopeMode === 'whole' ? 1 : 3;
    setBusy('rewrite'); setError(''); setCandidates(null); setCompare(null);
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/rewrite\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scope: scopeOf(target), target: target.text, instruction, keywords: chips, count}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '改写失败');
      setCandidates(d.candidates || []);
      setPanel({requirement: d.requirement, candidates: d.candidates, index: 0});
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  // 选一版用上，并把「修改前 / 修改后」摆出来给人对比
  function adoptCandidate(index) {
    if (!candidates?.[index] || !target) return;
    const before = stripMarkers(target.text);
    setPicked(index);
    applyCandidate({candidates}, index);
    setCompare({before, after: candidates[index], scope: scopeMode});
  }

  // —— 改稿历史：同一份稿子的每一版都能回溯 ——
  async function loadRevisions() {
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/revisions\`, {cache: 'no-store'});
      const d = await r.json();
      if (r.ok) setRevisions(d.revisions || []);
    } catch { /* 历史读不到不影响改稿 */ }
  }

  async function pushRevision(source, requirementText) {
    try {
      await fetch(\`/api/generations/\${draftJob.id}/revisions\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({article: current, scope: scopeMode === 'whole' ? '整篇重写' : '段落修改', requirement: requirementText || '', source}),
      });
      loadRevisions();
    } catch { /* 忽略：历史存不下不影响正文 */ }
  }

  async function restoreRevision(revId) {
    setRestoring(true); setError('');
    try {
      const r = await fetch(\`/api/generations/\${draftJob.id}/revisions/\${revId}\`, {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}',
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '这一版找不回来');
      pushUndo();
      setDraft(d.article);
      setCompare(null); setCandidates(null); setHistoryOpen(false);
      setToast('已回溯到这一版，确认无误后点保存');
    } catch (e) { setError(e.message); }
    finally { setRestoring(false); }
  }`
);

// 4) 保存成功后记一条历史
s = s.replace(
  `      setDraftJob(final);`,
  `      setDraftJob(final);
      pushRevision('保存', requirement || analysis?.requirement || chips.join('、'));`
);

// 5) 打开工作台时读历史
s = s.replace(
  "  useEffect(() => { setDraftJob(job); }, [job]);",
  "  useEffect(() => { setDraftJob(job); }, [job]);\n\n  useEffect(() => { if (job?.id) loadRevisions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [job?.id]);"
);

// 6) 点新块时清空上一轮
s = s.replace(
  "    setSelected(block);\n    setImagePicker(false);",
  "    setSelected(block);\n    setImagePicker(false);\n    resetEdit();"
);

writeFileSync(file, s);
console.log("handlers ok");
