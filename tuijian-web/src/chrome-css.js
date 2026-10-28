// 各平台「外壳」CSS：预览（React）与导出 HTML 共用同一份文本，不许两边各写一套。
// 类名统一 pf-*，每种平台用 .pf-<kind> 覆盖主色与圆角。
export const CHROME_CSS = `
.pf{--pf-accent:#c85a7f;--pf-accent-weak:#fdeef4;--pf-text:#222;--pf-muted:#8b8b8b;--pf-line:#ececf0;--pf-bg:#fff;
  max-width:var(--pf-w,680px);margin:0 auto;background:var(--pf-bg);color:var(--pf-text);
  border:1px solid var(--pf-line);border-radius:var(--pf-radius,14px);overflow:hidden;
  font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif}
.pf-top{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--pf-line);background:var(--pf-head-bg,#fff)}
.pf-avatar{flex:none;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#f1e3ea,#e6ecf7);display:grid;place-items:center;font-size:12px;font-weight:700;color:#8a6a7a}
.pf-id{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.pf-name{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pf-sub{font-size:11.5px;color:var(--pf-muted)}
.pf-follow{flex:none;height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--pf-accent);background:var(--pf-accent-weak);color:var(--pf-accent);font-size:12px;font-weight:600;display:inline-flex;align-items:center}
.pf-dots{margin-left:6px;color:#b0b0b0;font-size:15px;letter-spacing:1px}\n.pf-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--pf-accent);background:var(--pf-accent-weak);border-radius:4px;padding:2px 6px}
.pf-body{display:block;padding:18px 18px 20px}
.pf-news .pf-body{padding:22px 22px 24px}
.pf-doc .pf-body{padding:24px 24px 26px}
.pf-feed .pf-body{padding:14px 16px 18px}
.pf-card .pf-body,.pf-poster .pf-body,.pf-moment .pf-body{padding:0}
.pf-foot{display:flex;align-items:center;gap:18px;padding:10px 16px;border-top:1px solid var(--pf-line);background:var(--pf-head-bg,#fff);color:var(--pf-muted);font-size:12px}
.pf-act{display:inline-flex;align-items:center;gap:5px}
.pf-act i{font-style:normal;font-size:13px;opacity:.85}
.pf-crumb{display:flex;align-items:center;gap:8px;padding:9px 16px;border-bottom:1px solid var(--pf-line);font-size:12px;color:var(--pf-muted);background:var(--pf-head-bg,#fff)}
.pf-crumb b{color:var(--pf-text);font-weight:600}
.pf-tabs{display:flex;gap:18px;padding:0 16px;border-bottom:1px solid var(--pf-line);font-size:13px;color:var(--pf-muted)}
.pf-tabs span{padding:10px 0;border-bottom:2px solid transparent}
.pf-tabs span.on{color:var(--pf-text);font-weight:600;border-bottom-color:var(--pf-accent)}
.pf-hero{display:block;width:100%}

/* 公众号 */
.pf-wechat{--pf-accent:#3a7d5d;--pf-accent-weak:#eef7f1;--pf-radius:8px}
.pf-wechat .pf-top{padding:10px 16px}
/* 知乎 */
.pf-qa{--pf-accent:#0084ff;--pf-accent-weak:#eef6ff;--pf-radius:6px;--pf-line:#e8eaed}
.pf-qa .pf-top{padding:14px 18px}
.pf-qa .pf-tabs span.on{border-bottom-color:#0084ff}
/* 微博 */
.pf-feed{--pf-accent:#eb7350;--pf-accent-weak:#fff2ee;--pf-radius:10px;--pf-line:#f0efef}
.pf-feed .pf-name{color:#333}
/* 新闻稿 */
.pf-news{--pf-accent:#8a6d3b;--pf-accent-weak:#faf5ea;--pf-radius:2px;--pf-line:#e8e2d6}
.pf-news .pf-top{border-bottom:2px solid #8a6d3b}
/* 小红书 */
.pf-card{--pf-accent:#ff2e4d;--pf-accent-weak:#ffeef1;--pf-radius:12px;--pf-line:#f2f2f4}
/* 朋友圈：不要外壳线，像一张卡 */
.pf-moment{--pf-radius:10px}
.pf-moment{--pf-accent:#576b95;--pf-accent-weak:#eef2fb;--pf-radius:8px;--pf-line:#ededed}

/* 手机机身 */
.phone-frame{width:390px;height:844px;padding:12px;border-radius:46px;background:linear-gradient(160deg,#23262c,#3a3f47);
  box-shadow:0 24px 60px rgba(20,10,20,.28),inset 0 0 0 2px #4a4f57;position:relative;display:flex;flex-direction:column;flex:none}
.phone-screen{position:relative;flex:1;min-height:0;border-radius:36px;overflow:hidden;background:#fff;display:flex;flex-direction:column}
.phone-screen::before{content:'';position:absolute;top:8px;left:50%;transform:translateX(-50%);width:104px;height:22px;border-radius:999px;background:#23262c;z-index:5}
.phone-status{flex:none;display:flex;align-items:center;justify-content:space-between;padding:9px 20px 4px;font-size:11.5px;color:#4a4f57;font-weight:600;z-index:6}
.phone-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scroll-behavior:smooth}
.phone-scroll::-webkit-scrollbar{width:0}
.phone-home{flex:none;display:grid;place-items:center;padding:6px 0 8px}
.phone-home i{width:112px;height:4px;border-radius:999px;background:#c9ccd2}
.phone-frame iframe{width:100%;height:100%;border:0;display:block;background:#fff}
.phone-scale{transform-origin:top center}
@media (max-height:900px){
  .phone-frame{transform:scale(.92);transform-origin:top center}
}
.pf-body>h1:first-child,.pf-body>.headline:first-child,.pf-body>.flow>h1:first-child{margin-top:0}
.pf-news .pf-body{font-family:Georgia,"Songti SC","SimSun",serif}
.pf-card .deck{padding:0 12px 8px}
.pf-card .hint{padding:10px 12px 6px;font-size:11.5px;color:#9a9a9a;text-align:center}
.pf-moment .post{width:100%;max-width:none;border-radius:0;padding:14px 16px}
.pf-poster .page{width:100%;height:auto;min-height:520px;box-shadow:none}
`;
