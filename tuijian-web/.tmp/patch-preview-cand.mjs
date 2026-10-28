import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");

// 生成完立刻给对比，选哪一版只改右边
s = s.replace(`      setCandidates(d.candidates || []);
      setPanel({requirement: d.requirement, candidates: d.candidates, index: 0});`,
`      const list = d.candidates || [];
      setCandidates(list);
      setPicked(0);
      setPanel({requirement: d.requirement, candidates: list, index: 0});
      // 一生成就直接摆出「修改前 / 修改后」，不用先点采用
      if (list[0]) setCompare({before: stripMarkers(target.text), after: list[0], scope: scopeMode, applied: false});`);

s = s.replace(`  // 选一版用上，并把「修改前 / 修改后」摆出来给人对比
  function adoptCandidate(index) {
    if (!candidates?.[index] || !target) return;
    const before = stripMarkers(target.text);
    setPicked(index);
    applyCandidate({candidates}, index);
    setCompare({before, after: candidates[index], scope: scopeMode});
  }`,
`  // 选一版只是预览对比，点「用这一版」才真正改稿
  function previewCandidate(index) {
    if (!candidates?.[index] || !target) return;
    setPicked(index);
    setCompare({before: stripMarkers(target.text), after: candidates[index], scope: scopeMode, applied: false});
    setPanel(p => ({...(p || {}), index}));
  }

  function adoptCandidate() {
    const text = candidates?.[picked];
    if (!text || !target) return;
    applyCandidate({candidates}, picked);
    setCompare({before: stripMarkers(target.text), after: text, scope: scopeMode, applied: true});
    setToast('已用上这一版，记得保存');
  }`);
writeFileSync(f, s);
console.log("ok");
