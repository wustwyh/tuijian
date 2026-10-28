import {planXhsCards} from '../src/card-deck.js';

const id = process.argv[2];
const res = await fetch(`http://localhost:5173/api/generations/${id}`, { cache: 'no-store' });
if (!res.ok) {
  console.log('读取失败', res.status, await res.text());
  process.exit(1);
}
const data = await res.json();
const job = data.job || data;
const article = job.result?.article;
if (!article) {
  console.log('该记录没有成稿', Object.keys(job));
  process.exit(0);
}
const cards = planXhsCards(article);
const byType = cards.reduce((acc, c) => ((acc[c.type] = (acc[c.type] || 0) + 1), acc), {});
console.log('平台     :', job.summary?.platform, '| platformId:', job.summary?.platformId);
console.log('产品     :', job.summary?.product);
console.log('标题     :', article.title);
console.log('正文长度 :', String(article.body || '').replace(/\s/g, '').length, '字');
console.log('图片数   :', (article.image_plan || []).length);
console.log('卡片总数 :', cards.length, JSON.stringify(byType));
console.log('卡片序列 :', cards.map((c) => (c.type === 'image' ? `图${c.imageIndex + 1}` : c.type)).join(' → '));
