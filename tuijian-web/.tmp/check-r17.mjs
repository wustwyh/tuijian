import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async n => {
  const c = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync('.tmp/shots/' + n, Buffer.from(c.data, 'base64'));
};
try {
  // 1) 结果页：点配图看详情
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await sleep(800);
  console.log('缩略图:', await session.evaluate(`document.querySelectorAll('.rs-thumb').length`));
  await session.evaluate(`document.querySelector('.rs-thumb').click()`);
  await sleep(700);
  console.log('详情:', await session.evaluate(`JSON.stringify({
    open: !!document.querySelector('.rs-img-card'),
    rows: [...document.querySelectorAll('.rs-img-rows p')].map(p => p.querySelector('em').textContent + '=' + p.querySelector('span').textContent.slice(0, 26)),
    links: [...document.querySelectorAll('.rs-img-links a')].map(a => a.textContent),
  })`));
  await shot('r17-img-detail.png');
  await session.evaluate(`document.querySelector('.rs-img-mask').click()`);
  await sleep(400);
  console.log('关闭后:', await session.evaluate(`!!document.querySelector('.rs-img-card')`));

  // 2) 小红书：文字卡是否装多段
  await measure(session, 'http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1600);
  console.log('卡片:', await session.evaluate(`JSON.stringify({
    total: document.querySelectorAll('.wb .xhs-card').length,
    text: document.querySelectorAll('.wb .xhs-card.text').length,
    paras: [...document.querySelectorAll('.wb .xhs-card.text')].map(c => c.querySelectorAll('.xhs-body p, .xhs-body .source-text > div').length),
    counts: [...document.querySelectorAll('.wb .xhs-count')].map(c => c.textContent),
  })`));
  await shot('r17-xhs-filled.png');
} finally {
  close();
}
