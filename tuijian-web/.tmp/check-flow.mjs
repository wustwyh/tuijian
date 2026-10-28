import {buildArticleFlow} from '../src/article-flow.js';

const id = process.argv[2];
const res = await fetch(`http://localhost:5173/api/generations/${id}`, { cache: 'no-store' });
if (!res.ok) { console.log('读取失败', res.status); process.exit(1); }
const data = await res.json();
const job = data.job || data;
const article = job.result?.article;
if (!article) { console.log('无成稿'); process.exit(0); }
const flow = buildArticleFlow(article);
const seq = flow.map((b) => (b.type === 'para' ? '文' : `图${b.imageIndex + 1}`)).join(' → ');
console.log(`平台: ${job.summary?.platform} | 图片: ${(article.image_plan || []).length} 张 | 段落: ${flow.filter(b => b.type === 'para').length}`);
console.log(`顺序: ${seq}`);
console.log('图片位置明细:');
(article.image_plan || []).forEach((img, i) => {
  const at = flow.findIndex((b) => b.type === 'figure' && b.imageIndex === i);
  const parasBefore = flow.slice(0, at).filter((b) => b.type === 'para').length;
  console.log(`  图${i + 1} position="${img.position}" 插入在第 ${parasBefore} 段之后`);
});
