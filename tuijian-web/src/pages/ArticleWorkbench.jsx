import {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft, Download, Monitor, Smartphone, FileText, Wand2, Undo2, RefreshCw, X,
  Sparkles, Check, Loader2, ImagePlus, RotateCcw, ExternalLink, PenLine, Plus, History,
} from 'lucide-react';
import ArticlePreview from './ArticlePreview.jsx';
import PhoneFrame from './PhoneFrame.jsx';
import {ChromeStyle} from './PlatformChrome.jsx';
import {buildPublishDoc, downloadPublishHtml} from '../export.js';
import {platformSpec} from '../platform-layout.js';
import './article-workbench.css';

// 图文软文工作台：预览（发布稿 HTML / 渲染稿）和改稿都在这里，
// 保存后把最新结果回传给结果页，原界面（03）同步更新。
const stripMarkers = text => String(text || '').replace(/\[f_\d+\]/g, '');
const chars = value => String(value || '').replace(/\s/g, '').length;
const LABELS = {title: '标题', lead: '开头', cta: '结尾行动引导', tags: '话题标签', figure: '这段图注', caption: '这段图注', image: '这张图', heading: '小标题', para: '这一段', article: '整篇正文'};

export default function ArticleWorkbench({job, platformKind, generatedTime, suggestion, onClose, onSaved}) {
  const [draftJob, setDraftJob] = useState(job);
  const [draft, setDraft] = useState(null);
  const [mode, setMode] = useState('publish'); // publish | edit
  const [device, setDevice] = useState('mobile'); // 默认按手机看，想宽一点再切电脑
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [keywords, setKeywords] = useState(null);
  const [panel, setPanel] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [undoStack, setUndoStack] = useState([]);
  const [imagePicker, setImagePicker] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState('');
  const [scopeMode, setScopeMode] = useState('local'); // local 这一段 | whole 整篇
  const [requirements, setRequirements] = useState(null); // AI 提的几条改法
  const [requirement, setRequirement] = useState(''); // 选中的那条需求
  const [request, setRequest] = useState(''); // 用户随手写的一句
  const [analysis, setAnalysis] = useState(null); // AI 问完之后给出的需求
  const [turn, setTurn] = useState(null); // 需求追问：{question, options, history}
  const [turnSeed, setTurnSeed] = useState(''); // 这一轮追问针对的那句需求
  const [turnLoading, setTurnLoading] = useState(false);
  const [turnInput, setTurnInput] = useState(''); // 追问时自己补一句
  const [chips, setChips] = useState([]); // 选中的「你可能想改」气泡
  const [showOwn, setShowOwn] = useState(false); // 自己提需求的方框，点了按钮才出现
  const [editTab, setEditTab] = useState('direct'); // direct 直接改 | ai 让 AI 改
  const [directText, setDirectText] = useState(''); // 直接改窗口里的字
  const [candidates, setCandidates] = useState(null); // 这次改写给出的版本
  const [picked, setPicked] = useState(0);
  const [compare, setCompare] = useState(null); // 修改前 / 修改后
  const [cmpOpen, setCmpOpen] = useState(false); // 整篇重写：整版对比（两边都排版渲染）
  const [cmpDocs, setCmpDocs] = useState(null); // {before, after} 两份发布稿 HTML
  const [cmpLoading, setCmpLoading] = useState(false);
  const [revisions, setRevisions] = useState([]); // 这份稿子的历史
  const [historyOpen, setHistoryOpen] = useState(false);
  const handledSuggestion = useRef(null);

  const base = draftJob.result;
  const article = base.article;
  const images = draftJob.input?.images || draftJob.input?.product?.images || [];
  const spec = platformSpec(draftJob.summary?.platformId || draftJob.summary?.platform);
  const current = draft || article;
  const resultView = useMemo(() => ({...base, article: current}), [base, current]);
  // 改稿目标：整篇时就是全文，否则是点中的那块
  const target = scopeMode === 'whole' ? {kind: 'article', text: String(current.body || '')} : selected;
  const directValue = target ? (directText || stripMarkers(target.text)) : '';
  // 整篇对比要拿整篇文章（标题/导语/正文/配图一起），段落对比只要那一段文字
  const buildBefore = () => (scopeMode === 'whole' ? {...current} : stripMarkers(target?.text || ''));
  // 按钮上要能看出这条需求整合了什么
  const reqSummary = (analysis?.requirement || chips.join('、') || request.trim() || '').replace(/\s+/g, ' ').slice(0, 26);
  const effectiveRequirement = requirement || analysis?.requirement || '';

  useEffect(() => { setDraftJob(job); }, [job]);

  useEffect(() => { if (job?.id) loadRevisions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [job?.id]);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    buildPublishDoc(draftJob)
      .then(doc => { if (alive) { setHtml(doc); setLoading(false); } })
      .catch(e => { if (alive) { setError(e.message || '发布稿生成失败'); setLoading(false); } });
    return () => { alive = false; };
  }, [draftJob]);

  // 换了一处要改的地方，直接改窗口回到那一处的原文
  useEffect(() => { setDirectText(''); }, [selected?.kind, selected?.text, selected?.imageIndex, scopeMode]);

  // 整篇重写：把「修改前 / 修改后」各排一版，左右并排比排版
  useEffect(() => {
    let alive = true;
    if (compare?.scope !== 'whole' || !compare?.before || compare?.after == null) { setCmpDocs(null); return; }
    setCmpLoading(true); setCmpDocs(null);
    const beforeJob = {...draftJob, result: {...base, article: {...compare.before}}};
    const afterArticle = typeof compare.after === 'string' ? {...compare.before, body: compare.after} : compare.after;
    const afterJob = {...draftJob, result: {...base, article: afterArticle}};
    Promise.all([buildPublishDoc(beforeJob), buildPublishDoc(afterJob)])
      .then(([before, after]) => { if (alive) { setCmpDocs({before, after}); setCmpLoading(false); } })
      .catch(e => { if (alive) { setError(e.message || '对比稿生成失败'); setCmpLoading(false); } });
    return () => { alive = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [compare]);

  // 点了气泡（或自己写了一句）就开始追问：AI 围绕这句问，用户只点选项
  useEffect(() => {
    if (editTab !== 'ai' || !target) return;
    const seed = chips.join('、') || request.trim();
    if (!seed) { setTurn(null); return; }
    if (analysis && analysis.seed === seed) return;
    const timer = setTimeout(() => { setAnalysis(null); askTurn(seed); }, 500);
    return () => clearTimeout(timer);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [chips.join('、'), request.trim(), editTab, scopeMode, selected?.text]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !selected) onClose(); };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose, selected]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const pushUndo = () => setUndoStack(stack => [...stack.slice(-19), structuredClone(current)]);
  function undo() {
    if (!undoStack.length) return;
    setDraft(undoStack.at(-1));
    setUndoStack(stack => stack.slice(0, -1));
    setPanel(null);
  }

  // 文字类和图片走得是两套逻辑：文字给关键词→需求→重写；图片只给换图、改图注和来源信息。
  function isImageBlock(block) {
    return block?.kind === 'image';
  }

  function scopeOf(block) {
    if (block.kind === 'para' || block.kind === 'heading') return 'paragraph';
    if (block.kind === 'figure' || block.kind === 'caption') return 'caption';
    if (block.kind === 'article') return 'article';
    return block.kind;
  }

  async function fetchKeywords(block, seed = '') {
    setBusy('keywords'); setKeywords(null); setPanel(null); setError('');
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: 'keywords', scope: scopeOf(block), target: block.text, instruction: seed}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '没能给出修改方向');
      setKeywords(d.keywords || []);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  function pick(block, seed = '') {
    setMode('edit');
    setSelected(block);
    setImagePicker(false);
    setPanel(null);
    setKeywords(null);
    // 图片是另一套：不拉关键词、不提问需求，直接给换图和图注编辑。
    if (isImageBlock(block)) return;
    fetchKeywords(block, seed);
  }

  // 从核验建议「按这条改」进来
  useEffect(() => {
    if (!suggestion) return;
    if (handledSuggestion.current === suggestion.key) return;
    handledSuggestion.current = suggestion.key;
    const hit = String(current.body || '').split(/\r?\n+/).find(block => stripMarkers(block).includes(String(suggestion.claim || '').slice(0, 16)));
    if (hit) pick({kind: 'para', text: stripMarkers(hit).trim()}, `按这条核验意见修正：${suggestion.reason || suggestion.claim}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion]);


  const PRESETS = ['短一点', '更口语', '更具体', '删形容词', '换个卖点', '加个场景'];

  function clearSelection() {
    setSelected(null); setPanel(null); setCandidates(null); setCompare(null);
  }

  function resetEdit() {
    setChips([]); setShowOwn(false); setRequest(''); setAnalysis(null);
    setRequirement(''); setCandidates(null); setPicked(0); setCompare(null);
  }

  function switchScope(next) {
    setScopeMode(next);
    setSelected(null); setPanel(null); setKeywords(null);
    setRequirements(null); setAnalysis(null); setRequirement(''); setRequest('');
    setChips([]); setShowOwn(false); setCandidates(null); setPicked(0); setCompare(null);
  }

  // ① AI 提需求：直接给几条能点的改法
  async function loadRequirements() {
    if (!target) return;
    setBusy('requirements'); setError(''); setAnalysis(null);
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({mode: 'requirements', scope: scopeOf(target), target: target.text}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '没能给出改法');
      setRequirements(d.requirements || []);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  function toggleChip(word) {
    setChips(list => list.includes(word) ? list.filter(w => w !== word) : [...list, word]);
  }

  function chooseRequirement(item) {
    setRequirement(item.label);
    setAnalysis(null);
  }

  // ② AI 梳理：把点中的气泡、写的那句话揉成一条可执行的要求
  // 需求追问：点一个气泡就开始问，用户只点选项，不用打字
  async function askTurn(seed, history = []) {
    if (!target || !seed) return;
    setTurnSeed(seed);
    setTurnLoading(true); setError('');
    setTurn({question: '', options: [], history});
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
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

  async function analyzeRequest() {
    if (!target) return;
    const ask = request.trim() || chips.join('、');
    if (!ask) return;
    setBusy('analyze'); setError('');
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
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
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scope: scopeOf(target), target: target.text, instruction, keywords: chips, count}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '改写失败');
      const list = d.candidates || [];
      setCandidates(list);
      setPicked(0);
      setPanel({requirement: d.requirement, candidates: list, index: 0});
      // 一生成就直接摆出「修改前 / 修改后」，不用先点采用
      if (list[0]) {
        setCompare({before: buildBefore(), after: list[0], scope: scopeMode, applied: false});
        if (scopeMode === 'whole') setCmpOpen(true);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  // 直接改：自己敲的字，不经过 AI
  function applyDirect() {
    if (!target) return;
    const text = directText.trim();
    if (!text) { setToast('还没写内容'); return; }
    if (text === stripMarkers(target.text).trim()) { setToast('跟原来一样，没有变化'); return; }
    applyText(text, target);
    setToast('已改好，记得保存');
  }

  // 选一版只是预览对比，点「用这一版」才真正改稿
  function previewCandidate(index) {
    if (!candidates?.[index] || !target) return;
    setPicked(index);
    setCompare({before: buildBefore(), after: candidates[index], scope: scopeMode, applied: false});
    setPanel(p => ({...(p || {}), index}));
  }

  function adoptCandidate() {
    const text = candidates?.[picked];
    if (!text || !target) return;
    applyCandidate({candidates}, picked);
    setCompare({before: buildBefore(), after: text, scope: scopeMode, applied: true});
    setToast('已用上这一版，记得保存');
  }

  // —— 改稿历史：同一份稿子的每一版都能回溯 ——
  async function loadRevisions() {
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/revisions`, {cache: 'no-store'});
      const d = await r.json();
      if (r.ok) setRevisions(d.revisions || []);
    } catch { /* 历史读不到不影响改稿 */ }
  }

  async function pushRevision(source, requirementText) {
    try {
      await fetch(`/api/generations/${draftJob.id}/revisions`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({article: current, scope: scopeMode === 'whole' ? '整篇重写' : '段落修改', requirement: requirementText || '', source}),
      });
      loadRevisions();
    } catch { /* 忽略：历史存不下不影响正文 */ }
  }

  async function restoreRevision(revId) {
    setRestoring(true); setError('');
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/revisions/${revId}`, {
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
  }

  async function rewriteWith(instruction, keyword) {
    if (!target) return;
    setBusy('rewrite'); setError('');
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
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

  async function applyKeyword(keyword) {
    if (!selected) return;
    setBusy('rewrite'); setError('');
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scope: scopeOf(selected), target: selected.text, instruction: keyword, keywords: [keyword], count: 3}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '改写失败');
      setPanel({requirement: d.requirement, candidates: d.candidates, index: 0, keyword});
      applyCandidate(d, 0);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  function applyText(text, block) {
    if (!text || !block) return;
    pushUndo();
    const kind = block.kind;
    if (kind === 'title' || kind === 'lead' || kind === 'cta') {
      setDraft(d => ({...(d || article), [kind]: text.trim()}));
    } else if (kind === 'tags') {
      setDraft(d => ({...(d || article), tags: String(text).trim().split(/[\s,，#]+/).filter(Boolean).slice(0, 30)}));
    } else if (kind === 'figure' || kind === 'caption') {
      setDraft(d => ({...(d || article), image_plan: (d || article).image_plan.map((image, i) => i === block.imageIndex ? {...image, caption: text.trim()} : image)}));
    } else if (kind === 'article') {
      setDraft(d => ({...(d || article), body: text}));
    } else {
      setDraft(d => {
        const baseArticle = d || article;
        const paragraphs = String(baseArticle.body || '').split(/\r?\n+/);
        const before = String(block.text).trim();
        const heading = kind === 'heading' || /^#{1,6}\s+/.test(before);
        const next = (heading ? '## ' : '') + stripMarkers(text).replace(/^#{1,6}\s+/, '').trim();
        // 整段命中：直接换掉这一段。
        const hit = paragraphs.findIndex(p => stripMarkers(p).trim() === before);
        if (hit >= 0) {
          paragraphs[hit] = next;
          return {...baseArticle, body: paragraphs.join('\n\n')};
        }
        // 一张卡里装了好几段：按顺序找到这几段，整体换掉（新内容可以还是多段）。
        const lines = before.split(/\r?\n+/).map(t => t.trim()).filter(Boolean);
        if (lines.length > 1) {
          const at = paragraphs.findIndex((_, i) => lines.every((line, j) => {
            const target = paragraphs[i + j];
            return target !== undefined && stripMarkers(target).replace(/^#{1,6}\s+/, '').trim() === line;
          }));
          if (at >= 0) {
            paragraphs.splice(at, lines.length, ...stripMarkers(text).split(/\r?\n+/).map(t => t.trim()).filter(Boolean));
            return {...baseArticle, body: paragraphs.join('\n\n')};
          }
        }
        // 卡片里的一段只是正文的一部分（segment）：原位替换那一段文字，不动其他内容。
        const segAt = paragraphs.findIndex(p => stripMarkers(p).includes(before));
        if (segAt >= 0) {
          const raw = paragraphs[segAt];
          const at = stripMarkers(raw).indexOf(before);
          if (at >= 0) {
            paragraphs[segAt] = raw.slice(0, at) + next + raw.slice(at + before.length);
            return {...baseArticle, body: paragraphs.join('\n\n')};
          }
        }
        return {...baseArticle, body: String(baseArticle.body || '') + '\n\n' + next};
      });
    }
    setSelected(prev => (prev ? {...prev, text: stripMarkers(text).trim()} : prev));
    setDirectText('');
  }

  function applyCandidate(data, index) {
    const text = data?.candidates?.[index];
    if (!text || !selected) return;
    applyText(text, selected);
  }

  async function nextCandidate() {
    if (!panel) return;
    if (panel.index + 1 < panel.candidates.length) {
      const index = panel.index + 1;
      setPanel({...panel, index});
      applyCandidate(panel, index);
      return;
    }
    await applyKeyword(panel.keyword);
  }

  async function save() {
    if (busy) return;
    setBusy('save'); setError('');
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/article`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({revision: draftJob.result.editorial?.revision || 0, article: current}),
      });
      const saved = await r.json();
      if (!r.ok) throw new Error(saved.error || '保存失败');
      setBusy('verify');
      let final = saved;
      try {
        const rv = await fetch(`/api/generations/${draftJob.id}/reverify`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
        const checked = await rv.json();
        if (rv.ok) final = checked;
        else setError(`文案已保存，但重新核验失败：${checked.error || '请稍后重试'}`);
      } catch { setError('文案已保存，但重新核验没跑通，请稍后重试一次。'); }
      setDraftJob(final);
      pushRevision('保存', requirement || analysis?.requirement || chips.join('、'));
      setDraft(null); setUndoStack([]); setSelected(null); setPanel(null); setKeywords(null);
      setMode('publish');
      onSaved?.(final);
      setToast('已保存并重新核验，原界面已同步');
    } catch (e) { setError(e.message || '保存失败'); }
    finally { setBusy(''); }
  }

  async function restoreVersion() {
    if (restoring) return;
    setRestoring(true); setError('');
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/restore`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '撤回失败');
      let final = data;
      try {
        const rv = await fetch(`/api/generations/${draftJob.id}/reverify`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}'});
        const checked = await rv.json();
        if (rv.ok) final = checked;
      } catch {}
      setDraftJob(final);
      setDraft(null); setUndoStack([]); setSelected(null); setPanel(null);
      onSaved?.(final);
      setToast('已撤回上一次保存，并重新核验');
    } catch (e) { setError(e.message || '撤回失败'); }
    finally { setRestoring(false); }
  }

  async function download() {
    if (downloading) return;
    setDownloading(true);
    try { await downloadPublishHtml(draftJob); } finally { setDownloading(false); }
  }

  function wholeTone(intent) {
    setSelected({kind: 'article', text: String(current.body || '')});
    setKeywords(null);
    applyWholeTone(intent);
  }

  async function applyWholeTone(intent) {
    setBusy('rewrite'); setError(''); setPanel(null);
    try {
      const r = await fetch(`/api/generations/${draftJob.id}/rewrite`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scope: 'article', instruction: intent, keywords: [intent], count: 3}),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || '改写失败');
      setPanel({requirement: d.requirement, candidates: d.candidates, index: 0, keyword: intent});
      applyCandidate(d, 0);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  const dirty = Boolean(draft);
  const pending = busy === 'save' || busy === 'verify';

  return (
    <div className="wb" role="dialog" aria-modal="true" aria-label="图文软文工作台">
      <ChromeStyle/>
      <header className="wb-head">
        <button type="button" className="wb-back" onClick={onClose}><ArrowLeft size={16}/>原界面</button>
        <div className="wb-title">
          <strong>图文软文工作台</strong>
          <span>{draftJob.summary.platform} · {draftJob.summary.product}</span>
        </div>
        <div className="wb-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'publish'} className={mode === 'publish' ? 'is-on' : ''} onClick={() => setMode('publish')}><FileText size={14}/>预览</button>
          <button type="button" role="tab" aria-selected={mode === 'edit'} className={mode === 'edit' ? 'is-on' : ''} onClick={() => setMode('edit')}><Wand2 size={14}/>修改</button>
        </div>
        <div className="wb-device" role="group" aria-label="预览宽度">
          <button type="button" aria-pressed={device === 'desktop'} className={device === 'desktop' ? 'is-on' : ''} onClick={() => setDevice('desktop')}><Monitor size={14}/>电脑</button>
          <button type="button" aria-pressed={device === 'mobile'} className={device === 'mobile' ? 'is-on' : ''} onClick={() => setDevice('mobile')}><Smartphone size={14}/>手机</button>
        </div>
        <div className="wb-actions">
          {draftJob.result?.versions?.length > 0 && <button type="button" className="wb-ghost" onClick={restoreVersion} disabled={restoring || pending}><RotateCcw size={14}/>{restoring ? '撤回中…' : '撤回上次保存'}</button>}
          <button type="button" className="wb-ghost" onClick={download} disabled={downloading || loading}><Download size={14}/>{downloading ? '下载中…' : '下载 HTML'}</button>
          <button type="button" className={`wb-save${dirty ? ' is-dirty' : ''}`} onClick={save} disabled={pending || !dirty}>
            {pending ? <Loader2 size={15} className="spin"/> : <Check size={15}/>}
            {busy === 'save' ? '保存中…' : busy === 'verify' ? '核验中…' : dirty ? '保存并重新核验' : '已是最新'}
          </button>
          <button type="button" className="wb-close" onClick={onClose} aria-label="关闭工作台"><X size={17}/></button>
        </div>
      </header>

      <div className={`wb-body mode-${mode} device-${device}`}>
        <section className={`wb-stage${cmpOpen && compare?.scope === 'whole' ? ' is-cmp' : ''}`}>
          {cmpOpen && compare?.scope === 'whole' ? (
            <div className="wb-cmp">
              <div className="wb-cmp-bar">
                <div className="wb-cmp-title">
                  <strong>整篇重写 · 左右对比</strong>
                  <span>{cmpLoading ? '正在排两版…' : compare.applied ? '右边这一版已经用上了' : '右边还没用上，满意再点「用右边这一版」'}</span>
                </div>
                <div className="wb-cmp-actions">
                  <button type="button" className="wb-btn-apply is-inline" onClick={adoptCandidate}>{compare.applied ? '重新用这一版' : '用右边这一版'}</button>
                  {compare.applied && <button type="button" className="wb-btn-apply is-inline" onClick={save} disabled={Boolean(busy)}>
                    {busy === 'save' ? '保存中…' : '保存这一版'}
                  </button>}
                  <button type="button" className="wb-chip" onClick={() => setCmpOpen(false)}>收起对比</button>
                </div>
              </div>
              <div className="wb-cmp-panes">
                {[['before', '修改前'], ['after', '修改后']].map(([key, label]) => (
                  <div className={`wb-cmp-pane is-${key}`} key={key}>
                    <span className="wb-cmp-tag">{label}</span>
                    {cmpLoading || !cmpDocs
                      ? <p className="wb-state">排版中…</p>
                      : device === 'mobile'
                        ? <PhoneFrame label={`${label}手机效果`}><iframe title={`${label}发布稿`} srcDoc={cmpDocs[key]} sandbox="allow-same-origin allow-scripts"/></PhoneFrame>
                        : <div className="wb-frame is-desktop"><iframe title={`${label}发布稿`} srcDoc={cmpDocs[key]} sandbox="allow-same-origin allow-scripts"/></div>}
                  </div>
                ))}
              </div>
            </div>
          ) : mode === 'publish' ? (
            <>
              {loading && <p className="wb-state">正在排版发布稿…</p>}
              {error && !loading && <p className="wb-state is-error">{error}</p>}
              {!loading && !error && (device === 'mobile'
                ? <PhoneFrame label="发布稿手机预览"><iframe title="发布稿预览" srcDoc={html} sandbox="allow-same-origin allow-scripts"/></PhoneFrame>
                : <div className="wb-frame is-desktop">
                    <iframe title="发布稿预览" srcDoc={html} sandbox="allow-same-origin allow-scripts"/>
                  </div>)}
            </>
          ) : (device === 'mobile'
            ? <PhoneFrame label="改稿手机预览">
                <div className="wb-render-inner">
                  <ArticlePreview job={draftJob} result={resultView} platformKind={platformKind} generatedTime={generatedTime} edit={{selected, onPick: pick, onFlip: clearSelection}}/>
                </div>
              </PhoneFrame>
            : <div className="wb-frame is-desktop is-render">
                <div className="wb-render-inner">
                  <ArticlePreview job={draftJob} result={resultView} platformKind={platformKind} generatedTime={generatedTime} edit={{selected, onPick: pick, onFlip: clearSelection}}/>
                </div>
              </div>)}
        </section>

        <aside className="wb-side">
          <div className="wb-side-head">
            <div className="wb-scope" role="group" aria-label="改哪里">
              <button type="button" className={scopeMode === 'local' ? 'is-on' : ''} onClick={() => switchScope('local')}>段落修改</button>
              <button type="button" className={scopeMode === 'whole' ? 'is-on' : ''} onClick={() => switchScope('whole')}>整篇重写</button>
            </div>
            <button type="button" className={`wb-history${historyOpen ? ' is-on' : ''}`} onClick={() => { setHistoryOpen(v => !v); if (!historyOpen) loadRevisions(); }}>
              历史 {revisions.length > 0 ? revisions.length : ''}
            </button>
            {dirty && <em className="wb-dirty">未保存</em>}
          </div>

          {historyOpen ? (
            <div className="wb-revs">
              <div className="wb-revs-head">
                <strong>这份稿子的历史版本</strong>
                <span>共 {revisions.length} 版，最多保留 30 版</span>
              </div>
              {revisions.length === 0 && <p className="wb-hint-sm">还没有历史版本。改完点「保存并重新核验」就会留下一版。</p>}
              <ul>
                {revisions.map(rev => (
                  <li key={rev.id}>
                    <div className="wb-rev-main">
                      <span className="wb-rev-at">{new Date(rev.at).toLocaleString('zh-CN', {hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}</span>
                      <span className="wb-rev-scope">{rev.scope}</span>
                      <span className="wb-rev-meta">{rev.chars} 字 · {rev.source}</span>
                    </div>
                    {rev.requirement && <p className="wb-rev-req">{rev.requirement}</p>}
                    <p className="wb-rev-lead">{rev.lead}</p>
                    <button type="button" className="wb-rev-restore" onClick={() => restoreRevision(rev.id)} disabled={restoring}>回溯到这一版</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              {target && isImageBlock(target) && (() => {
                const currentImage = current.image_plan?.[target.imageIndex];
                return (
                  <div className="wb-panel wb-panel-image">
                    <div className="wb-panel-head">
                      <div>
                        <strong>这张图</strong>
                        <em>{stripMarkers(target.text).slice(0, 36)}{stripMarkers(target.text).length > 36 ? '…' : ''}</em>
                      </div>
                      <button type="button" className="wb-panel-close" onClick={() => { setSelected(null); setPanel(null); setImagePicker(false); }} aria-label="取消选择"><X size={15}/></button>
                    </div>

                    <div className="wb-image-preview">
                      {currentImage?.url ? <img src={currentImage.url} alt=""/> : <span>这张图暂未取到原图</span>}
                      <div className="wb-image-meta">
                        <span>{currentImage?.position || '配图'} · {currentImage?.purpose || '产品图'}</span>
                        <span>{currentImage?.width && currentImage?.height ? `${currentImage.width}×${currentImage.height}` : ''}</span>
                      </div>
                    </div>

                    <p className="wb-question">图片是另一套改法：这里只换图或改图注。</p>
                    <div className="wb-chips">
                      <button type="button" className="wb-chip is-primary" onClick={() => setImagePicker(v => !v)}><ImagePlus size={13}/>{imagePicker ? '收起候选图' : '换一张图'}</button>
                      <button type="button" className="wb-chip" onClick={() => pick({kind: 'caption', imageIndex: target.imageIndex, text: target.text})}><PenLine size={13}/>改这段图注</button>
                    </div>

                    {imagePicker && (
                      <div className="wb-thumbs">
                        {images.map((image, i) => (
                          <button type="button" key={image.id || i} className={`wb-thumb${image.url === currentImage?.url ? ' is-on' : ''}`}
                            onClick={() => {
                              pushUndo();
                              setDraft(d => ({...(d || article), image_plan: (d || article).image_plan.map((im, j) => j === target.imageIndex ? {...image, image_id: image.id, caption: im.caption, position: im.position, purpose: im.purpose} : im)}));
                              setImagePicker(false);
                              setToast('已换图，记得保存');
                            }}>
                            <img src={image.url} alt=""/>
                          </button>
                        ))}
                        {!images.length && <p className="wb-state-inline">这条记录没有其他候选图。</p>}
                      </div>
                    )}

                    <p className="wb-foot-note"><ExternalLink size={12}/>换图只影响这张；要改字请点旁边的图注或正文。</p>
                  </div>
                );
              })()}

              {(!target || !isImageBlock(target)) && <>
                {!target && (
                  <div className="wb-empty">
                    <Wand2 size={18}/>
                    <p>在左边点一下想改的<strong>标题、段落、图注</strong>，或者直接切到「整篇重写」。</p>
                    <button type="button" className="wb-chip" onClick={() => switchScope('whole')}>不改段落，直接整篇重写</button>
                  </div>
                )}

                {target && (
                  <div className="wb-target">
                    <div className="wb-target-head">
                      <em>{LABELS[target.kind] || '这一段'}</em>
                      <span>{chars(target.text)} 字</span>
                      <button type="button" onClick={() => { setSelected(null); setPanel(null); resetEdit(); }} aria-label="取消选择"><X size={14}/></button>
                    </div>
                    <p>{stripMarkers(target.text).slice(0, 72)}{stripMarkers(target.text).length > 72 ? '…' : ''}</p>
                  </div>
                )}

                {target && (
                  <div className="wb-tabbar" role="tablist">
                    <button type="button" role="tab" aria-selected={editTab === 'direct'} className={editTab === 'direct' ? 'is-on' : ''} onClick={() => setEditTab('direct')}>直接改</button>
                    <button type="button" role="tab" aria-selected={editTab === 'ai'} className={editTab === 'ai' ? 'is-on' : ''} onClick={() => setEditTab('ai')}>让 AI 改</button>
                  </div>
                )}

                {target && editTab === 'direct' && (
                  <section className="wb-step">
                    <h4><i>1</i>直接改</h4>
                    <textarea className="wb-input wb-direct" rows={Math.min(12, Math.max(4, Math.ceil(directValue.length / 22)))}
                      value={directValue} onChange={e => setDirectText(e.target.value)}
                      onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') applyDirect(); }}
                      placeholder="在这儿直接写，改字、加词、删词都行"/>
                    <div className="wb-direct-foot">
                      <span>{directValue.length} 字</span>
                      {undoStack.length > 0 && <button type="button" className="wb-chip" onClick={undo}><Undo2 size={12}/>撤销上一步</button>}
                      <button type="button" className="wb-chip" onClick={() => setDirectText('')} disabled={!directText}>还原</button>
                      <button type="button" className="wb-btn-apply" onClick={applyDirect} disabled={!directText.trim()}>保存这处修改</button>
                    </div>
                    <p className="wb-hint-sm">加减几个字、改个标题，直接在这儿敲，不用走 AI；⌘/Ctrl + Enter 保存。</p>
                  </section>
                )}

                {editTab === 'ai' && <>
                <section className="wb-step">
                  <h4><i>1</i>提需求</h4>
                  <p className="wb-step-label">你可能想改：</p>
                  <div className="wb-chip-row">
                    {(keywords && keywords.length ? keywords : PRESETS).map(word => (
                      <button type="button" key={word} className={`wb-chip${chips.includes(word) ? ' is-on' : ''}`} onClick={() => toggleChip(word)}>{word}</button>
                    ))}
                    <button type="button" className={`wb-chip wb-chip-add${showOwn ? ' is-on' : ''}`} onClick={() => setShowOwn(v => !v)}>
                      <Plus size={12}/>{showOwn ? '收起' : '自己提需求'}
                    </button>
                  </div>
                  {busy === 'keywords' && <p className="wb-state-inline"><Loader2 size={13} className="spin"/>正在看这段可以从哪改…</p>}

                  {showOwn && (
                    <div className="wb-own">
                      <textarea className="wb-input" rows={3} value={request} onChange={e => setRequest(e.target.value)}
                        placeholder="一句话说清：往哪个方向改、要保留什么。例如：别堆形容词，说清楚能装多少本书"/>
                      <button type="button" className="wb-btn-soft" onClick={analyzeRequest} disabled={Boolean(busy) || (!request.trim() && !chips.length)}>
                        {busy === 'analyze' ? <><Loader2 size={14} className="spin"/>AI 正在梳理…</> : <><Wand2 size={14}/>让 AI 梳理这条需求</>}
                      </button>
                    </div>
                  )}
                </section>

                <section className="wb-step">
                  <h4><i>2</i>AI 问清楚需求</h4>
                  {turnLoading && <p className="wb-state-inline"><Loader2 size={13} className="spin"/>AI 正在想该问你什么…</p>}
                  {analysis ? (
                    <div className="wb-analysis">
                      <p className="wb-analysis-req"><Sparkles size={13}/>{analysis.requirement}</p>
                      {analysis.points?.length > 0 && <p><em>改什么</em>{analysis.points.join('、')}</p>}
                      {analysis.keep?.length > 0 && <p><em>必须保留</em>{analysis.keep.join('、')}</p>}
                      {analysis.avoid?.length > 0 && <p><em>不要做</em>{analysis.avoid.join('、')}</p>}
                      <button type="button" className="wb-chip" onClick={() => { const seed = turnSeed || chips.join('、') || request.trim(); setAnalysis(null); askTurn(seed); }}>
                        <RefreshCw size={12}/>再问一遍
                      </button>
                    </div>
                  ) : !turnLoading && turn?.question ? (
                    <div className="wb-turn">
                      <p className="wb-turn-q">{turn.question}</p>
                      <div className="wb-chip-row">
                        {turn.options.map(option => (
                          <button type="button" className="wb-chip" key={option} onClick={() => answerTurn(option)}>{option}</button>
                        ))}
                      </div>
                      <div className="wb-turn-own">
                        <input value={turnInput} onChange={e => setTurnInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { answerTurn(turnInput); setTurnInput(''); } }}
                          placeholder="也可以自己补一句"/>
                        <button type="button" className="wb-btn-soft" disabled={!turnInput.trim()}
                          onClick={() => { answerTurn(turnInput); setTurnInput(''); }}>这样改</button>
                      </div>
                      {(turn.history || []).some(m => m.role === 'user') && <p className="wb-hint-sm">
                        {(turn.history || []).filter(m => m.role === 'user').map(m => m.content).join(' → ')}
                      </p>}
                    </div>
                  ) : (
                    <p className="wb-hint-sm">{chips.length > 0 || request.trim() ? 'AI 马上就会围绕这句问你。' : '点上面任意一个气泡，AI 会围绕它问你一两个问题，你只要点选项。'}</p>
                  )}
                </section>

                <section className="wb-step">
                  <h4><i>3</i>{scopeMode === 'whole' ? '整篇重写' : '开始修改'}</h4>
                  <button type="button" className="wb-btn-primary" onClick={rewriteByRequirement}
                    disabled={Boolean(busy) || (!chips.length && !request.trim() && !analysis)}>
                    {busy === 'rewrite'
                      ? <><Loader2 size={14} className="spin"/>{scopeMode === 'whole' ? '正在重写整篇…' : '正在改这一段…'}</>
                      : <><RefreshCw size={14}/>{scopeMode === 'whole' ? '整篇重写' : '改这一段'}{reqSummary && <em className="wb-btn-req">{reqSummary}</em>}</>}
                  </button>

                  {candidates?.length > 0 && (
                    <ul className="wb-cands">
                      {candidates.map((candidate, i) => (
                        <li key={i}>
                          <button type="button" className={picked === i ? 'is-on' : ''} onClick={() => previewCandidate(i)}>
                            <em>{i + 1}</em>
                            <span>{stripMarkers(candidate).slice(0, 46)}{stripMarkers(candidate).length > 46 ? '…' : ''}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {candidates?.length > 0 && <button type="button" className="wb-btn-apply" onClick={adoptCandidate}>{compare?.applied ? '重新用这一版' : '用这一版'}</button>}
                </section>
                </>}

                {compare && (
                  <section className="wb-compare">
                    <div className="wb-compare-head">
                      <strong>对比</strong>
                      <span>{compare.scope === 'whole' ? '整篇重写' : '这一段'}{compare.applied ? ' · 已用上' : ' · 还没用'}</span>
                      {compare.applied && <button type="button" className="wb-chip" onClick={() => { undo(); setCompare(null); }}><Undo2 size={12}/>撤销这次</button>}
                    </div>
                    {compare.scope === 'whole' ? (
                      <div className="wb-compare-whole">
                        <p>整篇重写不在这里比文字：工作台左边已经是<b>两边排好版</b>的样子，修改前与修改后并排。</p>
                        <p className="wb-hint-sm">修改前 {String(compare.before?.body || '').replace(/\s/g, '').length} 字 → 修改后 {String(compare.after || '').replace(/\s/g, '').length} 字</p>
                        <button type="button" className="wb-btn-apply" onClick={() => setCmpOpen(true)}>打开整版对比</button>
                        {compare.applied && <button type="button" className="wb-btn-primary is-save" onClick={save} disabled={Boolean(busy)}>
                          {busy === 'save' ? <><Loader2 size={14} className="spin"/>保存中…</> : <><Check size={14}/>保存这一版</>}
                        </button>}
                      </div>
                    ) : (
                      <div className="wb-compare-row">
                        <div className="is-before"><em>修改前</em><p>{compare.before}</p></div>
                        <div className="is-after"><em>修改后</em><p>{compare.after}</p></div>
                      </div>
                    )}
                    {compare.applied && (
                      <button type="button" className="wb-btn-primary is-save" onClick={save} disabled={Boolean(busy)}>
                        {busy === 'save' ? <><Loader2 size={14} className="spin"/>保存中…</> : <><Check size={14}/>保存这一版</>}
                      </button>
                    )}
                  </section>
                )}

                <p className="wb-foot-note"><ExternalLink size={12}/>满意就点右上角「保存并重新核验」，这一版会进「历史」。</p>
              </>}
            </>
          )}

          {error && <p className="wb-error" role="alert">{error}</p>}
          <p className="wb-foot-note"><ExternalLink size={12}/>保存后自动重新核验，原界面会同步更新。</p>
        </aside>


      </div>

      {toast && <div className="wb-toast">{toast}</div>}
    </div>
  );
}