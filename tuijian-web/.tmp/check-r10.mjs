import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 90) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const base = 'http://localhost:5173';
const opts = await (await fetch(base + '/api/compose-options')).json();
const products = (await (await fetch(base + '/api/products')).json()).products;
const audiences = (await (await fetch(base + '/api/audiences')).json()).audiences;
const compose = JSON.stringify({productId: products[0].id, audienceId: audiences[0].id, platformId: 'zhihu', task: opts.tasks[0], format: opts.formats[0], topicIds: [], recommendedTopics: [], hotTopics: [], extra: '', materialIncludedIds: [], materialExcludedIds: []});
const init = ["localStorage.setItem('tuijian_user','演示账号')", `sessionStorage.setItem('tuijian_compose', ${JSON.stringify(compose)})`];
try {
  await measure(session, `${base}/create/topic`, {width: 1440, height: 1100, settle: 2200, ready: '.block', init});
  const first = await waitFor(`document.querySelectorAll('.topic-card').length >= 4 ? document.querySelectorAll('.topic-card').length : 0`, 120);
  console.log('选题数:', first, await session.evaluate(`[...document.querySelectorAll('.topic-card .style-name')].map(n => n.textContent)`));
  console.log('标题:', await session.evaluate(`document.querySelector('.block-head h2')?.textContent`), '| 其他要求在选题页:', await session.evaluate(`!!document.querySelector('.extra')`));
  await shot('.tmp/shots/r10-topics.png');

  // 换一批
  await session.evaluate(`document.querySelector('.insight-refresh').click()`);
  await sleep(1500);
  await waitFor(`document.querySelector('.insight-refresh')?.textContent.includes('换一批') ? 1 : 0`, 120);
  console.log('换一批后:', await session.evaluate(`[...document.querySelectorAll('.topic-card .style-name')].map(n => n.textContent).slice(0, 3)`));

  // 热点搜索
  await session.evaluate(`(() => { const i = document.querySelector('.insight-search input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '双11 轻薄本'); i.dispatchEvent(new Event('input', {bubbles: true})); })()`);
  await sleep(300);
  await session.evaluate(`document.querySelector('.insight-search button').click()`);
  const hot = await waitFor(`document.querySelectorAll('.hot-card').length || 0`, 150);
  console.log('热点条数:', hot, '｜来源提示:', await session.evaluate(`document.querySelector('.insight-note')?.textContent?.slice(0, 40)`));
  await session.evaluate(`document.querySelector('.hot-card').click()`);
  await sleep(400);
  console.log('已选热点:', await session.evaluate(`[...document.querySelectorAll('.hot-chip')].map(c => c.textContent.trim())`));
  await shot('.tmp/shots/r10-hot.png');

  // 组合面板
  console.log('组合行:', await session.evaluate(`[...document.querySelectorAll('.sheet-rows li')].map(li => li.innerText.replace(/\\n/g, ' ').slice(0, 30))`));

  // 提需求页
  await measure(session, `${base}/create/discovery`, {width: 1440, height: 1000, settle: 1800, ready: '.req-tabs', init});
  console.log('需求页 tabs:', await session.evaluate(`[...document.querySelectorAll('.req-tabs button')].map(b => b.textContent.trim())`), '｜文本框:', await session.evaluate(`!!document.querySelector('.req-extra .extra')`));
  await session.evaluate(`[...document.querySelectorAll('.req-tabs button')].find(b => b.textContent.includes('自己写')).click()`);
  await sleep(400);
  await session.evaluate(`(() => { const t = document.querySelector('.req-extra .extra'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, '不要写价格，多写场景'); t.dispatchEvent(new Event('input', {bubbles: true})); })()`);
  await sleep(400);
  console.log('写入其他要求:', await session.evaluate(`document.querySelector('.req-count')?.textContent`));
  await shot('.tmp/shots/r10-discovery.png');
} finally {
  close();
}
