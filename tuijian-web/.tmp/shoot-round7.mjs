import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
const base = 'http://localhost:5173';
const opts = await (await fetch(base + '/api/compose-options')).json();
const products = (await (await fetch(base + '/api/products')).json()).products;
const audiences = (await (await fetch(base + '/api/audiences')).json()).audiences;
const init = [`localStorage.setItem('tuijian_user','演示账号')`];
try {
  // 提需求步骤（有对话）
  const compose = JSON.stringify({productId: products[0].id, audienceId: audiences[0]?.id || null, platformId: 'xhs', task: opts.tasks[0], format: opts.formats[0], topicIds: [opts.topics[0].id], extra: '', materialIncludedIds: [], materialExcludedIds: []});
  await measure(session, `${base}/create/discovery`, {
    width: 1440, height: 1000, settle: 2400, ready: '.dc',
    init: [...init, `sessionStorage.setItem('tuijian_compose', ${JSON.stringify(compose)})`, `sessionStorage.removeItem('tuijian_discovery_v3')`],
  });
  await session.evaluate(`document.querySelector('.dc-start').click()`);
  for (let i = 0; i < 60; i++) { if (await session.evaluate(`!!document.querySelector('.dc-question h4')`)) break; await sleep(1000); }
  await session.evaluate(`[...document.querySelectorAll('.dc-option')].find(b => !b.disabled)?.click()`);
  for (let i = 0; i < 60; i++) { if (await session.evaluate(`document.querySelectorAll('.dc-question').length >= 2`)) break; await sleep(1000); }
  await shot('.tmp/shots/step-discovery.png');

  // 平台选择
  await measure(session, `${base}/create/platform`, {width: 1440, height: 1150, settle: 1800, ready: '.pf-preview', init});
  await shot('.tmp/shots/step-platform.png');

  // 结果页（公众号）
  await measure(session, `${base}/result/b081e220-517b-4241-ac8e-0d5bb2861a71`, {width: 1440, height: 1050, settle: 3000, ready: '#r-article', init});
  await shot('.tmp/shots/result-wechat-new.png');

  // 工作台：图片面板
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  await session.evaluate(`document.querySelectorAll('.wb .article-shot.edit-hit')[0].click()`);
  await sleep(900);
  await shot('.tmp/shots/wb-image-panel.png');

  // 小红书手机版翻页
  await measure(session, `${base}/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d`, {width: 390, height: 844, settle: 2600, ready: '#r-article', init});
  await shot('.tmp/shots/result-xhs-mobile.png');
} finally {
  close();
}
