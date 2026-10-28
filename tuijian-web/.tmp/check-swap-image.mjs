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
  const before = await session.evaluate(`document.querySelectorAll('.article-shot img')[0]?.src`);
  await session.evaluate(`document.querySelectorAll('.article-shot.edit-hit')[0].click()`);
  await sleep(900);
  await session.evaluate(`[...document.querySelectorAll('.wb-panel-image .wb-chip')].find(c => c.textContent.includes('换一张图')).click()`);
  await sleep(700);
  const picked = await session.evaluate(`(() => {
    const thumbs = [...document.querySelectorAll('.wb-thumb')];
    const cur = document.querySelectorAll('.article-shot img')[0]?.src;
    const other = thumbs.find(t => t.querySelector('img')?.src !== cur);
    if (!other) return {found: false, count: thumbs.length};
    const src = other.querySelector('img').src;
    other.click();
    return {found: true, src: src.slice(-20)};
  })()`);
  await sleep(900);
  const after = await session.evaluate(`document.querySelectorAll('.article-shot img')[0]?.src`);
  console.log('候选:', picked, '｜换成功:', before !== after); console.log('前:', before); console.log('后:', after);
  console.log('脏状态:', await session.evaluate(`document.querySelector('.wb-save')?.textContent.trim()`));
  await session.evaluate(`document.querySelector('.wb-close').click()`);
  await sleep(500);
} finally {
  close();
}
