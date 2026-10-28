import {readFileSync, writeFileSync} from 'node:fs';
const f = 'src/pages/ArticleWorkbench.jsx';
let s = readFileSync(f, 'utf8');
const map = [
  ["{scopeMode === 'whole' ? '整篇重写（只出 1 篇）' : '改这一段（给 3 个版本）'}", "{scopeMode === 'whole' ? '整篇重写' : '改这一段'}"],
  ['正在排版发布稿…（图片内嵌成 base64，稍等两秒）', '正在排版发布稿…'],
  ['小改动（加减几个字、改标题、换说法）直接敲，不用走 AI；⌘/Ctrl + Enter 保存。', '加减几个字、改个标题，直接在这儿敲，不用走 AI；⌘/Ctrl + Enter 保存。'],
  ['整篇重写不在这里比文字：工作台左边已经是<b>两边排好版</b>的样子（修改前 / 修改后并排）。', '整篇重写不在这里比文字：工作台左边已经是<b>两边排好版</b>的样子，修改前与修改后并排。'],
  ['保存后自动重新核验，结果页（原界面）会同步更新。', '保存后自动重新核验，原界面会同步更新。'],
];
let hit = 0;
for (const [a, b] of map) { if (s.includes(a)) { s = s.split(a).join(b); hit += 1; } else { console.log('MISS:', a.slice(0, 40)); } }
writeFileSync(f, s);
console.log('replaced', hit, 'of', map.length);
