import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(2800);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1000);
  console.log('图片块数:', await session.evaluate(`document.querySelectorAll('.article-shot').length`));
  console.log('图注块数:', await session.evaluate(`document.querySelectorAll('.article-caption').length`));
  console.log('前:', await session.evaluate(`[...document.querySelectorAll('.article-shot img')].map(i => i.src.slice(-8)).join(',')`));
  // 点第 2 个图片块
  await session.evaluate(`document.querySelectorAll('.article-shot.edit-hit')[1].click()`);
  await sleep(900);
  console.log('选中的块:', await session.evaluate(`document.querySelector('.wb-panel-head em')?.textContent`));
  await session.evaluate(`[...document.querySelectorAll('.wb-panel-image .wb-chip')].find(c => c.textContent.includes('换一张图')).click()`);
  await sleep(700);
  console.log('候选数:', await session.evaluate(`document.querySelectorAll('.wb-thumb').length`));
  const swapped = await session.evaluate(`(() => {
    const thumbs = [...document.querySelectorAll('.wb-thumb')];
    const srcs = [...document.querySelectorAll('.article-shot img')].map(i => i.src);
    const other = thumbs.find(t => !srcs.includes(t.querySelector('img')?.src));
    if (!other) return 'no-different-thumb';
    other.click();
    return 'clicked';
  })()`);
  await sleep(900);
  console.log('换图:', swapped, '｜后:', await session.evaluate(`[...document.querySelectorAll('.article-shot img')].map(i => i.src.slice(-8)).join(',')`));
  await session.evaluate(`document.querySelector('.wb-close').click()`);
  await sleep(400);
} finally {
  close();
}
