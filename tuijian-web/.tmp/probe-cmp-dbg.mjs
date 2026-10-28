import {openBrowser, measure} from './cdp.mjs';
const {session, close} = await openBrowser();
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  await measure(session, 'http://localhost:5173/result/b081e220-517b-4241-ac8e-0d5bb2861a71', {
    width: 1680, height: 1050, settle: 2600, ready: '.rs-top',
    init: ["localStorage.setItem('tuijian_user','演示账号')"],
  });
  await session.evaluate(`document.querySelector('.rs-main-btn').click()`);
  await sleep(3200);
  await session.evaluate(`[...document.querySelectorAll('.wb-tabs button')].find(b => b.textContent.includes('修改')).click()`);
  await sleep(1200);
  await session.evaluate(`[...document.querySelectorAll('.wb-scope button')].find(b => b.textContent.includes('整篇')).click()`);
  await sleep(600);
  await session.evaluate(`[...document.querySelectorAll('.wb-chip-row .wb-chip')].find(b => b.textContent.includes('短一点'))?.click()`);
  await sleep(400);
  await session.evaluate(`document.querySelector('.wb-btn-primary').click()`);
  await sleep(12000);
  console.log('__cmp:', await session.evaluate(`JSON.stringify(window.__cmp)`));
  console.log('frames/state:', await session.evaluate(`JSON.stringify({f: document.querySelectorAll('.wb-cmp-pane iframe').length, s: [...document.querySelectorAll('.wb-cmp-pane .wb-state')].map(p => p.textContent), err: document.querySelector('.wb-error')?.textContent || ''})`));
} finally {
  close();
}
