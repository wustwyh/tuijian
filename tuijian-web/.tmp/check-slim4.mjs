import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async out => {
  const cap = await session.send('Page.captureScreenshot', {format: 'png', captureBeyondViewport: false});
  writeFileSync(out, Buffer.from(cap.data, 'base64'));
};
try {
  const r = await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1440, height: 950, settle: 2300, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  console.log('错误:', JSON.stringify(r.errors));
  // 顶部打开工作台
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(2200);
  console.log('工作台:', await session.evaluate(`JSON.stringify({open: !!document.querySelector('.wb'), tab: [...document.querySelectorAll('.wb-tabs button')].find(b=>b.className.includes('is-on'))?.textContent.trim()})`));
  await session.evaluate(`document.querySelector('.wb-close')?.click()`);
  await sleep(600);
  // 更多 → 复制
  await session.evaluate(`document.querySelector('.rs-more > summary').click()`);
  await sleep(300);
  await session.evaluate(`[...document.querySelectorAll('.rs-more-menu button')].find(b=>b.textContent.includes('复制')).click()`);
  await sleep(600);
  console.log('复制提示:', await session.evaluate(`document.querySelector('.rs-notice')?.textContent || '(无)'`));
  // 折叠块全开一遍，确认没有渲染报错
  await session.evaluate(`document.querySelectorAll('.rs-fold > summary').forEach(s => s.click())`);
  await sleep(700);
  console.log('全展开:', await session.evaluate(`JSON.stringify({
    open: [...document.querySelectorAll('.rs-fold')].map(d => d.open),
    docH: document.documentElement.scrollHeight,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`));
  await shot('.tmp/shots/result-slim-expanded.png');
  // 核验展开 + 待确认
  await session.evaluate(`document.querySelector('.rs-review .rs-toggle').click()`);
  await sleep(500);
  await shot('.tmp/shots/result-slim-checks.png');
  console.log('核验行:', await session.evaluate(`document.querySelectorAll('.verification-row').length`), '｜待确认:', await session.evaluate(`document.querySelectorAll('.verification-questions li').length`));
  console.log('错误(最终):', JSON.stringify(r.errors));
} finally {
  close();
}
