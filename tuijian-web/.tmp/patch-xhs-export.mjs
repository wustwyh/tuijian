import {readFileSync, writeFileSync} from "node:fs";
const file = "src/publish-html.js";
let s = readFileSync(file, "utf8");

const oldCss = `.deck{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;padding:4px 20px 8px}
.card{width:100%;aspect-ratio:340/453;border-radius:16px;overflow:hidden;position:relative;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.08);display:flex;flex-direction:column}`;
const newCss = `.deck{display:block;max-width:360px;margin:0 auto;padding:4px 0 0}
.card{display:none;width:100%;aspect-ratio:340/453;border-radius:16px;overflow:hidden;position:relative;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.08);flex-direction:column}
.card.is-active{display:flex;box-shadow:0 10px 30px rgba(255,46,77,.18);outline:2px solid #ff2e4d;outline-offset:3px}
.nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px}
.nav button{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid #e6dde3;background:#fff;color:#7b6d74;font-size:18px;line-height:1;cursor:pointer}
.nav-idx{font-size:12px;color:#8b7d84;min-width:52px;text-align:center}`;
if (!s.includes(oldCss)) throw new Error("找不到 deck css");
s = s.replace(oldCss, newCss);

s = s.replace(`.nav{display:none}
@media (max-width:1000px){
.deck{display:block;padding:4px 16px 0}
.deck-js .card{display:none}
.deck-js .card.is-active{display:flex}
.nav{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:12px}
.nav button{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid #e6dde3;background:#fff;color:#7b6d74;font-size:18px;line-height:1;cursor:pointer}
.nav-idx{font-size:12px;color:#8b7d84;min-width:52px;text-align:center}
}`, "");

s = s.replace(
  `      const html = cards.map((c, i) => \`<section class="\${c.cls}">\${c.html}<span class="idx">\${i + 1}/\${total}</span></section>\`).join('\\n');`,
  `      const html = cards.map((c, i) => \`<section class="\${c.cls}\${i === 0 ? ' is-active' : ''}">\${c.html}<span class="idx">\${i + 1}/\${total}</span></section>\`).join('\\n');`
);

s = s.replace(
  `<script>(function(){document.body.classList.add('deck-js');var cards=[].slice.call(document.querySelectorAll('.deck > .card'));var out=document.querySelector('.nav-idx');var at=0;function show(n){at=Math.max(0,Math.min(cards.length-1,n));cards.forEach(function(c,k){c.classList.toggle('is-active',k===at)});if(out)out.textContent=(at+1)+' / '+cards.length;}[].forEach.call(document.querySelectorAll('.nav button'),function(btn){btn.addEventListener('click',function(){show(at+Number(btn.getAttribute('data-step')))})});show(0);})();<\\/script>`,
  `<script>(function(){var cards=[].slice.call(document.querySelectorAll('.deck > .card'));var out=document.querySelector('.nav-idx');var at=0;function show(n){at=Math.max(0,Math.min(cards.length-1,n));cards.forEach(function(c,k){c.classList.toggle('is-active',k===at)});if(out)out.textContent=(at+1)+' / '+cards.length;}[].forEach.call(document.querySelectorAll('.nav button'),function(btn){btn.addEventListener('click',function(){show(at+Number(btn.getAttribute('data-step')))})});show(0);})();<\\/script>`
);

s = s.replace(
  `      return \`<div class="hint">\${total} 张卡片 · 桌面上三列平铺，手机上用左右按钮翻</div>\\n<div class="deck">\\n\${html}\\n</div>\\n\${nav}\\n\${src}\`;`,
  `      return \`<div class="hint">\${total} 张卡片 · 左右按钮切换，键盘左右键也行</div>\\n<div class="deck">\\n\${html}\\n</div>\\n\${nav}\\n\${src}\`;`
);
writeFileSync(file, s);
console.log("xhs export patched");
