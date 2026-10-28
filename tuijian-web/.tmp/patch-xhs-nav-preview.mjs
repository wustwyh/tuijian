import {readFileSync, writeFileSync} from "node:fs";

// ---------- 1) React 预览：翻页按钮移到卡片左右两侧中部，翻页时清掉选中 ----------
let ap = readFileSync("src/pages/ArticlePreview.jsx", "utf8");
ap = ap.replace(
  `    const go = (step) => setDeckIndex((i) => Math.min(total - 1, Math.max(0, i + step)));`,
  `    const go = (step) => {
      setDeckIndex((i) => Math.min(total - 1, Math.max(0, i + step)));
      // 换卡片就把上一处选中清掉，避免高亮跟着跑到别的卡片上
      edit?.onFlip?.();
    };`
);
ap = ap.replace(
  `        <div className="xhs-hint">{total} 张卡片 · 桌面上三列平铺，手机上用左右按钮翻</div>`,
  `        <div className="xhs-hint">{total} 张卡片 · 用卡片两侧的左右按钮翻页，也可以按键盘 ← →</div>`
);
ap = ap.replace(
  `        {total > 1 && (
          <div className="xhs-nav">
            <button type="button" onClick={() => go(-1)} disabled={deckIndex === 0} aria-label="上一张">‹</button>
            <span>{deckIndex + 1} / {total}</span>
            <button type="button" onClick={() => go(1)} disabled={deckIndex === total - 1} aria-label="下一张">›</button>
          </div>
        )}`,
  ``
);
// 把导航放进 deck 里（绝对定位在卡片两侧中部）
ap = ap.replace(
  `          })}
        </div>
        {sources.length > 0 && (`,
  `          })}
          {total > 1 && (
            <div className="xhs-nav">
              <button type="button" className="is-prev" onClick={() => go(-1)} disabled={deckIndex === 0} aria-label="上一张">‹</button>
              <button type="button" className="is-next" onClick={() => go(1)} disabled={deckIndex === total - 1} aria-label="下一张">›</button>
              <span className="xhs-count">{deckIndex + 1} / {total}</span>
            </div>
          )}
        </div>
        {sources.length > 0 && (`
);
writeFileSync("src/pages/ArticlePreview.jsx", ap);

// ---------- 2) 预览 CSS ----------
let css = readFileSync("src/pages/platform-layout.css", "utf8");
css = css.replace(`.xhs-deck{display:flex;flex-direction:column;align-items:center;padding:2px 0 8px}`,
`.xhs-deck{position:relative;display:flex;flex-direction:column;align-items:center;padding:2px 0 8px}`);
// 去掉「永久高亮」：只有点中的那块高亮
css = css.replace(`/* 正在改的那一张加一圈高亮，一眼看得出改的是哪张 */
.xhs-deck.is-editing .xhs-card.is-active{outline:2px solid #ff2e4d;outline-offset:3px;box-shadow:0 12px 30px rgba(255,46,77,.18)}`, `/* 当前这张卡只用投影区分，不再画永久红框；高亮只跟着「点中的那块」走 */
.xhs-card.is-active{box-shadow:0 10px 26px rgba(0,0,0,.12)}`);
css = css.replace(`/* 翻页控件：手机和电脑都是左右按钮切换，不靠滑动 */
.xhs-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:14px}
.xhs-nav button{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:1px solid #e6dde3;background:#fff;color:#7b6d74;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.06)}
.xhs-nav button:disabled{opacity:.4;cursor:not-allowed}
.xhs-nav span{font-size:12.5px;color:#8b7d84;min-width:56px;text-align:center}`,
`/* 翻页控件：压在卡片左右两侧中部，不占额外高度 */
.xhs-nav{position:absolute;inset:0;pointer-events:none}
.xhs-nav button{position:absolute;top:50%;transform:translateY(-50%);pointer-events:auto;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:none;background:rgba(0,0,0,.42);color:#fff;font-size:20px;line-height:1;cursor:pointer;backdrop-filter:blur(2px)}
.xhs-nav button:hover:not(:disabled){background:rgba(0,0,0,.58)}
.xhs-nav button:disabled{opacity:.3;cursor:not-allowed}
.xhs-nav .is-prev{left:6px}
.xhs-nav .is-next{right:6px}
.xhs-count{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);padding:2px 9px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;font-size:11.5px;pointer-events:none}`);
writeFileSync("src/pages/platform-layout.css", css);
console.log("preview ok");
