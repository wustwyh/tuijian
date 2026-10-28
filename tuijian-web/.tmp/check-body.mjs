import {buildPublishHtml} from '../src/publish-html.js';
import {platformSpec} from '../src/platform-layout.js';
const job = await (await fetch('http://localhost:5173/api/generations/b081e220-517b-4241-ac8e-0d5bb2861a71')).json();
const html = buildPublishHtml({article: job.result.article, loaded: [], spec: platformSpec('wechat'), generatedTime: '2026-10-24 12:00'});
const plain = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
const body = String(job.result.article.body).replace(/\s+/g, '');
const tail = body.slice(-40);
console.log('正文末段在 HTML 里:', plain.includes(tail), '| tail:', tail.slice(0, 20));
console.log('标题在 HTML 里:', plain.includes(String(job.result.article.title).slice(0, 12)));
