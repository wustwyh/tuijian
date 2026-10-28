import {readFileSync, writeFileSync} from "node:fs";
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
