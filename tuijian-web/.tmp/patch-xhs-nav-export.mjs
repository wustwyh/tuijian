import {readFileSync, writeFileSync} from "node:fs";

// 导出 HTML：导航放进 deck、压在两侧中部；不再给当前卡画红框
let p = readFileSync("src/publish-html.js", "utf8");
p = p.replace(`.deck{display:block;max-width:360px;margin:0 auto;padding:4px 0 0}`,
`.deck{position:relative;display:block;max-width:360px;margin:0 auto;padding:4px 0 0}`);
p = p.replace(`.card.is-active{display:flex;box-shadow:0 10px 30px rgba(255,46,77,.18);outline:2px solid #ff2e4d;outline-offset:3px}`,
`.card.is-active{display:flex;box-shadow:0 10px 26px rgba(0,0,0,.12)}`);
p = p.replace(`.nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px}
.nav button{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid #e6dde3;background:#fff;color:#7b6d74;font-size:18px;line-height:1;cursor:pointer}
.nav-idx{font-size:12px;color:#8b7d84;min-width:52px;text-align:center}`,
`.nav{position:absolute;inset:0;pointer-events:none}
.nav button{position:absolute;top:50%;transform:translateY(-50%);pointer-events:auto;display:grid;place-items:center;width:36px;height:36px;border-radius:50%;border:none;background:rgba(0,0,0,.42);color:#fff;font-size:20px;line-height:1;cursor:pointer}
.nav button:hover{background:rgba(0,0,0,.58)}
.nav button[data-step="-1"]{left:6px}
.nav button[data-step="1"]{right:6px}
.nav-idx{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);padding:2px 9px;border-radius:999px;background:rgba(0,0,0,.35);color:#fff;font-size:11.5px;pointer-events:none}`);

// 导航从 deck 外挪进 deck 内
p = p.replace(
  `      return \`<div class="hint">\${total} 张卡片 · 左右按钮切换，键盘左右键也行</div>\\n<div class="deck">\\n\${html}\\n</div>\\n\${nav}\\n\${src}\`;`,
  `      return \`<div class="hint">\${total} 张卡片 · 用卡片两侧的左右按钮翻页，也可以按键盘 ← →</div>\\n<div class="deck">\\n\${html}\\n\${nav}\\n</div>\\n\${src}\`;`
);
p = p.replace(`      const nav = \`<div class="nav"><button type="button" data-step="-1" aria-label="上一张">‹</button><span class="nav-idx">1 / \${total}</span><button type="button" data-step="1" aria-label="下一张">›</button></div>`,
`      const nav = \`<div class="nav"><button type="button" data-step="-1" aria-label="上一张">‹</button><button type="button" data-step="1" aria-label="下一张">›</button><span class="nav-idx">1 / \${total}</span></div>`);
writeFileSync("src/publish-html.js", p);

// 工作台 iframe 允许执行脚本，否则预览里翻页按钮点不动
let wb = readFileSync("src/pages/ArticleWorkbench.jsx", "utf8");
wb = wb.split('sandbox="allow-same-origin"').join('sandbox="allow-same-origin allow-scripts"');
writeFileSync("src/pages/ArticleWorkbench.jsx", wb);
console.log("export ok");
