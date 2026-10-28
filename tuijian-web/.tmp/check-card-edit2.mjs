import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 60) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
try {
  await measure(session, 'http://localhost:5173/result/4c0c91ef-2809-4034-9b88-f10cba7ce63d', {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  const picked = await session.evaluate(`(() => {
    const cards = [...document.querySelectorAll('.wb .xhs-card.text')];
    const card = cards[2];
    const hit = card?.querySelector('.edit-hit');
    if (!hit) return 'none';
    hit.click();
    return card.innerText.slice(0, 24);
  })()`);
  const kw = await waitFor(`document.querySelectorAll('.wb-chips .wb-chip').length >= 3 ? document.querySelectorAll('.wb-chips .wb-chip').length : 0`, 45);
  const before = await session.evaluate(`document.querySelectorAll('.wb .xhs-card.text')[2]?.innerText.slice(0, 30)`);
  await session.evaluate(`document.querySelectorAll('.wb-chips .wb-chip')[0].click()`);
  await waitFor(`document.querySelector('.wb-requirement p')?.textContent || ''`, 60);
  await sleep(1500);
  const after = await session.evaluate(`document.querySelectorAll('.wb .xhs-card.text')[2]?.innerText.slice(0, 30)`);
  console.log('第3张文字卡:', picked, '｜关键词:', kw);
  console.log('改前:', before);
  console.log('改后:', after);
  console.log('变化:', before !== after, '｜脏:', await session.evaluate(`document.querySelector('.wb-save')?.textContent.trim()`));
  await session.evaluate(`document.querySelector('.wb-close').click()`);
  await sleep(400);
} finally {
  close();
}
