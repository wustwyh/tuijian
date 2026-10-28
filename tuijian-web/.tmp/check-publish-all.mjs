import {writeFileSync} from 'node:fs';
import {openBrowser, measure} from './cdp.mjs';
import {buildPublishDoc} from '../src/export.js';
import {platformSpec} from '../src/platform-layout.js';

const rawFetch = globalThis.fetch;
globalThis.fetch = (input, init) => rawFetch(typeof input === 'string' && input.startsWith('/') ? 'http://localhost:5173' + input : input, init);

const base = 'http://localhost:5173';
const job = await (await fetch(`${base}/api/generations/b081e220-517b-4241-ac8e-0d5bb2861a71`)).json();
const cases = {wechat: 'article', news: 'news', zhihu: 'qa', weibo: 'feed', store: 'poster', moments: 'moment', business: 'doc', xhs: 'card'};
const out = {};
for (const [pid, kind] of Object.entries(cases)) {
  const spec = platformSpec(pid);
  const withSpec = {...job, summary: {...job.summary, platformId: pid, platform: spec.label}};
  const html = await buildPublishDoc(withSpec);
  const path = `E:/codes/创业/10.18黑客松/tuijian-web/.tmp/pub-${kind}.html`;
  writeFileSync(path, html);
  out[kind] = 'file:///' + path.replace(/\\/g, '/');
}
const {session, close} = await openBrowser();
try {
  for (const [kind, url] of Object.entries(out)) {
    await measure(session, url, {width: 1280, height: 900, settle: 1400});
    const info = await session.evaluate(`JSON.stringify({
      w: Math.round(document.body.firstElementChild?.getBoundingClientRect().width || document.body.getBoundingClientRect().width),
      fig: [...document.querySelectorAll('figure img')].slice(0, 2).map(i => [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)]),
      grid: [...document.querySelectorAll('.grid img')].slice(0, 2).map(i => [Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)]),
      cards: document.querySelectorAll('.card').length,
      poster: document.querySelector('.page') ? [Math.round(document.querySelector('.page').getBoundingClientRect().width), Math.round(document.querySelector('.page').getBoundingClientRect().height)] : null,
    })`);
    console.log(kind.padEnd(8), info);
  }
  // 小红书导出稿的手机端翻页
  await measure(session, out.card, {width: 390, height: 844, settle: 1400});
  console.log('xhs@390 初始:', await session.evaluate(`JSON.stringify({
    visible: [...document.querySelectorAll('.card')].filter(c => getComputedStyle(c).display !== 'none').length,
    nav: getComputedStyle(document.querySelector('.nav')).display,
    idx: document.querySelector('.nav-idx')?.textContent,
  })`));
  await session.evaluate(`document.querySelectorAll('.nav button')[1].click()`);
  await new Promise(r => setTimeout(r, 300));
  console.log('xhs@390 下一张:', await session.evaluate(`JSON.stringify({
    visible: [...document.querySelectorAll('.card')].filter(c => getComputedStyle(c).display !== 'none').length,
    idx: document.querySelector('.nav-idx')?.textContent,
  })`));
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('.tmp/shots/pub-xhs-mobile.png', Buffer.from(cap.data, 'base64'));
} finally {
  close();
}
