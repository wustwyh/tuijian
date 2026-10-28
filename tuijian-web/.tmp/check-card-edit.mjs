import {openBrowser, measure} from './cdp.mjs';
import {writeFileSync} from 'node:fs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (expr, sec = 60) => {
  for (let i = 0; i < sec; i++) { const v = await session.evaluate(expr); if (v) return v; await sleep(1000); }
  return null;
};
try {
  const id = '4c0c91ef-2809-4034-9b88-f10cba7ce63d';
  const r = await measure(session, `http://localhost:5173/result/${id}`, {
    width: 1440, height: 1000, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3000);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  console.log('卡片数:', await session.evaluate(`document.querySelectorAll('.xhs-card').length`),
    '｜可点块:', await session.evaluate(`document.querySelectorAll('.edit-hit').length`));
  const picked = await session.evaluate(`(() => {
    const card = document.querySelector('.wb .xhs-card.text');
    const hit = card?.querySelector('.edit-hit');
    if (!hit) return 'none';
    hit.click();
    return hit.textContent.slice(0, 30);
  })()`);
  const kw = await waitFor(`document.querySelectorAll('.wb-chips .wb-chip').length >= 3 ? document.querySelectorAll('.wb-chips .wb-chip').length : 0`, 45);
  console.log('点卡片文字:', picked, '｜关键词:', kw);
  const before = await session.evaluate(`document.querySelector('.wb .xhs-card.text .xhs-body')?.innerText.slice(0, 40)`);
  await session.evaluate(`document.querySelectorAll('.wb-chips .wb-chip')[0].click()`);
  const req = await waitFor(`document.querySelector('.wb-requirement p')?.textContent || ''`, 60);
  await sleep(1200);
  const after = await session.evaluate(`document.querySelector('.wb .xhs-card.text .xhs-body')?.innerText.slice(0, 40)`);
  console.log('需求:', String(req).slice(0, 50));
  console.log('卡片文字变化:', before !== after);
  console.log('前:', before);
  console.log('后:', after);
  console.log('页面报错:', JSON.stringify(r.errors));
  await session.evaluate(`document.querySelector('.wb-close').click()`);
  await sleep(400);
} finally {
  close();
}
