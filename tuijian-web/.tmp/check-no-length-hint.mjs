import {buildPublishHtml} from '../src/publish-html.js';
import {platformSpec} from '../src/platform-layout.js';
import {readFileSync} from 'node:fs';

const job = await (await fetch('http://localhost:5173/api/generations/b081e220-517b-4241-ac8e-0d5bb2861a71')).json();
const spec = platformSpec(job.summary.platformId || job.summary.platform);
const html = buildPublishHtml({article: job.result.article, loaded: [], spec, generatedTime: '2026-10-24 12:00'});
const bad = ['篇幅提示', 'plat-warn', '建议上限', '超出「'];
console.log('spec:', spec?.id, spec?.layout, '| 长度', html.length);
console.log('残留提示:', bad.filter(w => html.includes(w)).join(',') || '无');
console.log('正文是否完整:', html.includes(job.result.article.body.slice(20, 40).replace(/\n/g, '')) || html.includes('全文'));
// 朋友圈也要看一眼（150 字卡内提示已删）
const mhtml = buildPublishHtml({article: job.result.article, loaded: [], spec: platformSpec('moments'), generatedTime: '2026-10-24 12:00'});
console.log('朋友圈提示残留:', mhtml.includes('篇幅') || mhtml.includes('卡内按朋友圈') ? '仍在' : '已移除');
