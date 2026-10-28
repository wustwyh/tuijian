import {readFileSync, writeFileSync} from 'node:fs';
const f = 'src/pages/ArticleWorkbench.jsx';
let s = readFileSync(f, 'utf8');

// 1) 状态：直接改
s = s.replace(
  `  const [showOwn, setShowOwn] = useState(false); // 自己提需求的方框，点了按钮才出现`,
  `  const [showOwn, setShowOwn] = useState(false); // 自己提需求的方框，点了按钮才出现
  const [editTab, setEditTab] = useState('direct'); // direct 直接改 | ai 让 AI 改
  const [directText, setDirectText] = useState(''); // 直接改窗口里的字`
);

// 2) 选中/换范围时，把原文灌进直接改窗口
s = s.replace(
  `  const target = scopeMode === 'whole' ? {kind: 'article', text: String(current.body || '')} : selected;`,
  `  const target = scopeMode === 'whole' ? {kind: 'article', text: String(current.body || '')} : selected;
  const directValue = target ? (directText || stripMarkers(target.text)) : '';`
);

// 3) 把 applyCandidate 拆成 applyText(text, block)，直接改也复用它
s = s.replace(`  function applyCandidate(data, index) {
    const text = data?.candidates?.[index];
    if (!text || !selected) return;
    pushUndo();
    const kind = selected.kind;`,
`  function applyText(text, block) {
    if (!text || !block) return;
    pushUndo();
    const kind = block.kind;`);
s = s.replace(`      setDraft(d => ({...(d || article), image_plan: (d || article).image_plan.map((image, i) => i === selected.imageIndex ? {...image, caption: text.trim()} : image)}));`,
`      setDraft(d => ({...(d || article), image_plan: (d || article).image_plan.map((image, i) => i === block.imageIndex ? {...image, caption: text.trim()} : image)}));`);
s = s.replace(`        const before = String(selected.text).trim();`, `        const before = String(block.text).trim();`);

// applyText 里最后用到 selected.text 的地方都用 block.text 了，补回 applyCandidate 包装
s = s.replace(`  // 选一版只是预览对比，点「用这一版」才真正改稿`,
`  function applyCandidate(data, index) {
    const text = data?.candidates?.[index];
    if (!text || !selected) return;
    applyText(text, selected);
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

  // 选一版只是预览对比，点「用这一版」才真正改稿`);
writeFileSync(f, s);
console.log('logic ok');
