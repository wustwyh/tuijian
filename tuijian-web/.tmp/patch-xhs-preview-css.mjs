import {readFileSync, writeFileSync} from "node:fs";
const file = "src/pages/platform-layout.css";
let s = readFileSync(file, "utf8");

const oldDeck = `.xhs-deck{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:2px 0 8px}
.xhs-card{width:100%;aspect-ratio:340/453;border-radius:16px;overflow:hidden;position:relative;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.08);display:flex;flex-direction:column;margin:0}`;
const newDeck = `.xhs-deck{display:flex;flex-direction:column;align-items:center;padding:2px 0 8px}
.xhs-card{display:none;width:min(100%,360px);aspect-ratio:340/453;border-radius:16px;overflow:hidden;position:relative;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.08);flex-direction:column;margin:0}
.xhs-card.is-active{display:flex}
/* 正在改的那一张加一圈高亮，一眼看得出改的是哪张 */
.xhs-deck.is-editing .xhs-card.is-active{outline:2px solid #ff2e4d;outline-offset:3px;box-shadow:0 12px 30px rgba(255,46,77,.18)}`;
if (!s.includes(oldDeck)) throw new Error("deck css 没找到");
s = s.replace(oldDeck, newDeck);

s = s.replace(`/* 翻页控件：只在窄屏出现，按钮压在卡片左右两侧中部 */
.xhs-nav{display:none}`, `/* 翻页控件：手机和电脑都是左右按钮切换，不靠滑动 */
.xhs-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:14px}
.xhs-nav button{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;border:1px solid #e6dde3;background:#fff;color:#7b6d74;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.06)}
.xhs-nav button:disabled{opacity:.4;cursor:not-allowed}
.xhs-nav span{font-size:12.5px;color:#8b7d84;min-width:56px;text-align:center}`);

s = s.replace(`@media (max-width:1000px){
  .xhs-deck{display:block;position:relative}
  .xhs-card{display:none}
  .xhs-card.is-active{display:flex}
  .xhs-nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px}
  .xhs-nav button{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid #e6dde3;background:#fff;color:#7b6d74;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.06)}
  .xhs-nav button:disabled{opacity:.4;cursor:not-allowed}
  .xhs-nav span{font-size:12px;color:#8b7d84;min-width:52px;text-align:center}
}

`, "");
writeFileSync(file, s);
console.log("preview css patched");
