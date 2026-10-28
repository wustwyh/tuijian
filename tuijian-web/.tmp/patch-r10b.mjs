import {readFileSync, writeFileSync} from "node:fs";

let cs = readFileSync("src/pages/ComposeSheet.jsx", "utf8");
const oldRows = `    { label: '选题', path: '/create/topic', value: c.topicNames.join('、'), fallback: '不限' },
    { label: '素材', path:'/create/topic',value:c.recommendLoading?'正在关联…':\`\${c.selectedMaterials.length} 份参考素材\` },
    { label: 'AI 提需求', path: '/create/discovery', value: c.extra ? '已梳理' : null, fallback: '还没聊', ai: true },
    { label: '其他要求', path: '/create/discovery', value: c.extra, fallback: '无' },`;
const newRows = `    { label: '选题', path: '/create/topic', value: c.topicNames.join('、'), fallback: '不限' },
    { label: '借势热点', path: '/create/topic', value: c.hotTopics.map(t=>t.title).join('、'), fallback: '没用热点' },
    { label: '素材', path:'/create/topic',value:c.recommendLoading?'正在关联…':\`\${c.selectedMaterials.length} 份参考素材\` },
    { label: '提需求', path: '/create/discovery', value: c.extra, fallback: '还没写', ai: true },`;
if (!cs.includes(oldRows)) throw new Error("rows 没匹配");
cs = cs.replace(oldRows, newRows);
writeFileSync("src/pages/ComposeSheet.jsx", cs);

let st = readFileSync("src/pages/CreateStyle.jsx", "utf8");
st = st.replace(`      {topicsLoading && !pool.length && <p className="insight-state"><span className="result-spinner"/>AI 正在按这个客户和平台想选题…</p>}

      <div className="grid grid-style topic-grid">`, `      {topicsLoading && !c.aiTopics.length && <p className="insight-state"><span className="result-spinner"/>AI 正在按这个客户和平台想选题…</p>}

      {!(topicsLoading && !c.aiTopics.length) && <div className="grid grid-style topic-grid">`);
st = st.replace(`        })}
      </div>

      {c.aiTopics.length === 0 && !topicsLoading && <p className="insight-note">`, `        })}
      </div>}

      {c.aiTopics.length === 0 && !topicsLoading && <p className="insight-note">`);
writeFileSync("src/pages/CreateStyle.jsx", st);
console.log("ok");
