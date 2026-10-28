import {readFileSync, writeFileSync} from 'node:fs';
const f = 'src/pages/ArticleWorkbench.jsx';
let s = readFileSync(f, 'utf8');

// 1) 状态：整篇对比的排版稿
s = s.replace(
  `  const [compare, setCompare] = useState(null); // 修改前 / 修改后`,
  `  const [compare, setCompare] = useState(null); // 修改前 / 修改后
  const [cmpOpen, setCmpOpen] = useState(false); // 整篇重写：整版对比（两边都排版渲染）
  const [cmpDocs, setCmpDocs] = useState(null); // {before, after} 两份发布稿 HTML
  const [cmpLoading, setCmpLoading] = useState(false);`
);

// 2) 整篇重写时，对比的是「整篇文章对象」，不是一段文字
s = s.replace(
  `  const target = scopeMode === 'whole' ? {kind: 'article', text: String(current.body || '')} : selected;`,
  `  const target = scopeMode === 'whole' ? {kind: 'article', text: String(current.body || '')} : selected;
  // 整篇对比要拿整篇文章（标题/导语/正文/配图一起），段落对比只要那一段文字
  const buildBefore = () => (scopeMode === 'whole' ? {...current} : stripMarkers(target?.text || ''));`
);

// 3) 生成完：整篇自动打开整版对比
s = s.replace(
  `      if (list[0]) setCompare({before: stripMarkers(target.text), after: list[0], scope: scopeMode, applied: false});`,
  `      if (list[0]) {
        setCompare({before: buildBefore(), after: list[0], scope: scopeMode, applied: false});
        if (scopeMode === 'whole') setCmpOpen(true);
      }`
);
s = s.replace(
  `    setCompare({before: stripMarkers(target.text), after: candidates[index], scope: scopeMode, applied: false});`,
  `    setCompare({before: buildBefore(), after: candidates[index], scope: scopeMode, applied: false});`
);
s = s.replace(
  `    setCompare({before: stripMarkers(target.text), after: text, scope: scopeMode, applied: true});`,
  `    setCompare({before: buildBefore(), after: text, scope: scopeMode, applied: true});`
);

// 4) 对比文档：两边都用同一套发布排版（buildPublishDoc），看到的就是发出去的样子
s = s.replace(
  `  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !selected) onClose(); };`,
  `  // 整篇重写：把「修改前 / 修改后」各排一版，左右并排比
  useEffect(() => {
    let alive = true;
    if (compare?.scope !== 'whole' || !compare?.before || compare?.after == null) { setCmpDocs(null); return; }
    setCmpLoading(true); setCmpDocs(null);
    const beforeJob = {...draftJob, result: {...base, article: {...compare.before}}};
    const afterJob = {...draftJob, result: {...base, article: {...compare.before, ...(typeof compare.after === 'string' ? {body: compare.after} : compare.after)}}};
    Promise.all([buildPublishDoc(beforeJob), buildPublishDoc(afterJob)])
      .then(([before, after]) => { if (alive) { setCmpDocs({before, after}); setCmpLoading(false); } })
      .catch(e => { if (alive) { setError(e.message || '对比稿生成失败'); setCmpLoading(false); } });
    return () => { alive = false; };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [compare, base, draftJob]);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !selected) onClose(); };`
);
writeFileSync(f, s);
console.log('state+effect ok');
