import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
// 传 onFlip：翻页清选中，避免高亮残留
s = s.split("edit={{selected, onPick: pick}}").join("edit={{selected, onPick: pick, onFlip: clearSelection}}");
s = s.replace("  function resetEdit() {", `  function clearSelection() {
    setSelected(null); setPanel(null); setCandidates(null); setCompare(null);
  }

  function resetEdit() {`);
// 切回预览也清掉选中
s = s.replace("  const [mode, setMode] = useState('publish'); // publish | edit", "  const [mode, setMode] = useState('publish'); // publish | edit");
writeFileSync(f, s);
console.log("ok");
