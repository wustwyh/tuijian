import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/ArticleWorkbench.jsx";
let s = readFileSync(f, "utf8");
s = s.replace(`    if (compare?.scope !== 'whole' || !compare?.before || compare?.after == null) { setCmpDocs(null); return; }`,
`    window.__cmp = {ran: (window.__cmp?.ran || 0) + 1, scope: compare?.scope, hasBefore: !!compare?.before, after: typeof compare?.after};
    if (compare?.scope !== 'whole' || !compare?.before || compare?.after == null) { setCmpDocs(null); return; }
    window.__cmp.going = true;`);
s = s.replace(`      .then(([before, after]) => { if (alive) { setCmpDocs({before, after}); setCmpLoading(false); } })
      .catch(e => { if (alive) { setError(e.message || '对比稿生成失败'); setCmpLoading(false); } });`,
`      .then(([before, after]) => { window.__cmp.done = [before.length, after.length]; if (alive) { setCmpDocs({before, after}); setCmpLoading(false); } })
      .catch(e => { window.__cmp.fail = String(e && e.message || e); if (alive) { setError(e.message || '对比稿生成失败'); setCmpLoading(false); } });`);
writeFileSync(f, s);
console.log("debug added");
