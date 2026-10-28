import {readFileSync, writeFileSync} from "node:fs";
const f = "src/pages/CreateStyle.jsx";
let s = readFileSync(f, "utf8");
const before = s;

// 1) 进页面就自动抓热点；换产品/客户/平台也重抓
s = s.replace(`  // 换了产品/客户/平台就重新推荐一次
  useEffect(() => {
    if (!productId || !platform) return;
    if (c.aiTopics.length) return;
    loadTopics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, audienceId, platform]);`,
`  // 换了产品/客户/平台就重新推荐一次
  useEffect(() => {
    if (!productId || !platform) return;
    if (c.aiTopics.length) return;
    loadTopics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, audienceId, platform]);

  // 热点也自动来，不用用户搜
  useEffect(() => {
    if (!productId || !platform) return;
    searchHot({refresh: false, quiet: true});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, audienceId, platform]);`);

// 2) searchHot 支持 refresh / 静默
s = s.replace(`  async function searchHot() {
    if (!productId || !platform) return;
    setHotLoading(true); setHotError('');
    try {
      const r = await fetch('/api/hot-topics', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({productId, audienceId, platform, query: hotQuery.trim()}),
      });`,
`  async function searchHot({refresh = false, quiet = false} = {}) {
    if (!productId || !platform) return;
    setHotLoading(true); setHotError('');
    try {
      const r = await fetch('/api/hot-topics', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({productId, audienceId, platform, query: hotQuery.trim(), refresh}),
      });`);

// 3) 顶部区块：说明改成自动 + 换一批
s = s.replace(`      <div className="block-head">
        <h2>借个热点</h2>
        <span className="muted">搜最近的新闻、大促、开学季，把热点接到产品上</span>
      </div>
      <div className="insight-search">
        <Search size={15}/>
        <input value={hotQuery} onChange={e => setHotQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !hotLoading) searchHot(); }}
          placeholder="例如：双11 轻薄本 换新 / 开学季 选电脑" aria-label="搜索热点"/>
        <button type="button" onClick={searchHot} disabled={hotLoading || !productId}>
          {hotLoading ? '正在搜…' : '搜一下'}
        </button>
      </div>`,
`      <div className="block-head">
        <h2>借个热点</h2>
        <span className="muted">自动找最近发生的事和大促节点，不用自己搜</span>
        <button type="button" className="insight-refresh" onClick={() => searchHot({refresh: true})} disabled={hotLoading || !productId}>
          {hotLoading ? '正在找…' : '换一批'}
        </button>
      </div>
      <div className="insight-search">
        <Search size={15}/>
        <input value={hotQuery} onChange={e => setHotQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !hotLoading) searchHot({refresh: true}); }}
          placeholder="也可以搜指定的：例如 双11 轻薄本 / 开学季 选电脑" aria-label="搜索热点"/>
        <button type="button" onClick={() => searchHot({refresh: true})} disabled={hotLoading || !productId}>
          {hotLoading ? '正在搜…' : '搜一下'}
        </button>
      </div>`);

// 4) 加载态 + 节点的展示
s = s.replace(`      {hotError && <p className="hint product-error" role="alert">{hotError}</p>}`,
`      {hotLoading && !hotResults && <p className="insight-note">正在联网找最近的热点…</p>}
      {hotError && <p className="hint product-error" role="alert">{hotError}</p>}`);
writeFileSync(f, s);
console.log("ui ok", s !== before);
