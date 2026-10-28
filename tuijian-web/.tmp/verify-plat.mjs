import {buildPublishHtml} from '../src/publish-html.js';
import {platformSpec} from '../src/platform-layout.js';
import {writeFileSync} from 'node:fs';

const id = process.argv[2];
const res = await fetch(`http://localhost:5173/api/generations/${id}`, { cache: 'no-store' });
const data = await res.json();
const job = data.job || data;
const article = job.result?.article;
if (!article) { console.log('无成稿'); process.exit(1); }

const spec = platformSpec(job.summary?.platformId || job.summary?.platform);
const loaded = (article.image_plan || []).map((img) => ({
  img: { caption: img.caption, position: img.position },
  mime: 'image/png',
  bytes: new Uint8Array([137, 80, 78, 71]),
}));

const html = buildPublishHtml({ article, loaded, spec, generatedTime: '2026/10/21 23:30:00' });
writeFileSync(`.tmp/verify-${spec.id}.html`, html);

// 去掉 base64 与提示框，只留可读结构
const clean = html
  .replace(/data:image\/png;base64,[^"]+/g, 'IMG')
  .replace(/<div class="plat-warn">[\s\S]*?<\/div>/, '');
const imgCount = (clean.match(/<img\b[^>]*src="IMG"/g) || []).length;

console.log(`平台=${spec.label} layout=${spec.layout} 图片=${imgCount} 张`);
console.log(`标题(${article.title.length}字): ${article.title}`);
console.log(`正文(${article.body.replace(/\s/g, '').length}字) 平台上限=${spec.bodyMax}字`);

if (spec.id === 'store') {
  const block = /<ul class="points">([\s\S]*?)<\/ul>/.exec(clean);
  const points = block ? [...block[1].matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1]) : [];
  console.log('海报卖点:', points);
  console.log('条数:', points.length, '| 各条字数:', points.map((p) => p.length), '(上限 18)');
  console.log('固定画幅:', /\.page\{[^}]*height:820px/.test(html) ? '820px ✓' : '✗ 未固定');
  const totalEstimate = 318 + 24 + 50 + 50 + points.length * 32 + 86;
  console.log(`内容高度估算: ${totalEstimate}px / 820px`, totalEstimate <= 820 ? '✓ 不溢出' : '✗ 可能溢出');
} else if (spec.id === 'moments') {
  const post = /<div class="text">([\s\S]*?)<\/div>/.exec(clean);
  const postText = post ? post[1].replace(/&quot;/g, '"').trim() : '';
  console.log(`卡内文字(${postText.length}字，上限 150):`, postText.slice(0, 60) + '…');
  console.log('包含标题?', postText.includes(article.title.slice(0, 6)) ? '是 ✗' : '否 ✓');
  console.log('包含标签?', /#/.test(postText) ? '是 ✗' : '否 ✓');
  console.log('图片网格:', /class="grid (n\d)"/.exec(clean)?.[1] || '无', '| 图片数:', imgCount);
  console.log('卡外注释:', /class="clip"/.test(clean) ? '有 ✓' : '无 ✓');
}
