// 把真实任务导出的 HTML 落地成文件，供 headless Chrome 截图肉眼验收。
import {buildPublishHtml} from '../src/publish-html.js';
import {platformSpec} from '../src/platform-layout.js';
import {writeFileSync, mkdirSync} from 'node:fs';

const base = 'http://localhost:5173';
const jobs = {
  store: '20edc028-0fa6-4d41-aa3c-1e14cdb8041d',
  moments: '4e0ca6eb-fef7-4d99-bf34-d7ff117dc4f7',
  xhs: '46a530bc-3019-478a-8b37-09696ada0872',
  xhs5: 'edd82c5c-2281-4942-881e-fe6dd67eba1a',
  zhihu: '304f1716-7c44-4035-878a-96a349fbfc16',
  wechat: '598058b7-ce0b-46d6-94b2-467a111e96fb',
  weibo: '3594e12d-14cb-4367-b4cd-6d1b05f64c5d',
  business: '2fd68911-a442-4d55-b074-9fc8c2e39003',
};

mkdirSync(new URL('./shots/', import.meta.url), {recursive: true});

// 新闻稿没有现成任务，用知乎的成稿套 news 版式，专门验版式而不是内容。
const newsFrom = {url: `${base}/api/generations/304f1716-7c44-4035-878a-96a349fbfc16`, spec: 'news', name: 'news'};

for (const [name, id] of Object.entries({...jobs, [newsFrom.name]: newsFrom.url.split('/').pop()})) {
  const r = await fetch(`${base}/api/generations/${id}`, {cache: 'no-store'});
  const job = await r.json();
  const article = job.result?.article;
  if (!article) { console.log(`${name}: 无成稿`); continue; }
  const spec = platformSpec(name === 'news' ? 'news' : (job.summary?.platformId || job.summary?.platform));
  const loaded = await Promise.all((article.image_plan || []).map(async (img) => {
    const ir = await fetch(base + img.url);
    if (!ir.ok) return null;
    return { img, mime: ir.headers.get('content-type') || 'image/jpeg', bytes: new Uint8Array(await ir.arrayBuffer()) };
  }));
  const good = loaded.filter(Boolean);
  const html = buildPublishHtml({ article, loaded: good, spec, generatedTime: '2026/10/21 23:30:00' });
  writeFileSync(new URL(`./shots/${name}.html`, import.meta.url), html);
  console.log(`${name} ${spec.label} layout=${spec.layout} 图=${good.length}/${(article.image_plan || []).length} 正文字数=${article.body.replace(/\s/g, '').length}`);
}
