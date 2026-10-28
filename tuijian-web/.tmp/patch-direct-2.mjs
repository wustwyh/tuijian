import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");

// 删掉重复的 applyCandidate 包装（255-259）
s = s.replace(`  function applyCandidate(data, index) {
    const text = data?.candidates?.[index];
    if (!text || !selected) return;
    applyText(text, selected);
  }

  // 直接改：自己敲的字，不经过 AI`, `  // 直接改：自己敲的字，不经过 AI`);

// 把老的 applyCandidate 改成 applyText(text, block)
s = s.replace(`  function applyCandidate(data, index) {
    const text = data?.candidates?.[index];
    if (!text || !selected) return;
    pushUndo();
    const kind = selected.kind;`, `  function applyText(text, block) {
    if (!text || !block) return;
    pushUndo();
    const kind = block.kind;`);

// 恢复 applyCandidate 包装（放在 applyText 之后）
s = s.replace(`  async function nextCandidate() {`, `  function applyCandidate(data, index) {
    const text = data?.candidates?.[index];
    if (!text || !selected) return;
    applyText(text, selected);
  }

  async function nextCandidate() {`);

// 选中状态只在真有 selected 时更新
s = s.replace(`    setSelected(prev => (prev ? {...prev, text: stripMarkers(text).trim()} : prev));`,
`    setSelected(prev => (prev ? {...prev, text: stripMarkers(text).trim()} : prev));
    setDirectText('');`);
writeFileSync(f, s);
console.log("ok");
